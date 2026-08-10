// Contexte React des `ServicesJeu` — contrat technique v1 § 1.4, étendu par L2-A.
//
// Un seul point d'injection pour tout le client : `Alea`, `Horloge`, `FournisseurVoix`,
// `FournisseurAudio`, et depuis L2-A `FournisseurHaptique` et `RetourSensoriel`. C'est la
// traduction côté client de la testabilité en L0 (annexe T § 2) — aucun composant ne construit
// son propre aléatoire ni sa propre horloge, donc `graine(n)` et `figerHorloge(instant)` de
// `window.__test` ont prise sur TOUT le jeu, pas sur une partie.
//
// Fichier `.ts` (imposé par § 1.4) : le fournisseur est donc écrit avec `createElement`,
// pas en JSX. C'est la seule raison de cette forme.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// LES QUATRE TRANSTYPAGES AVEUGLES DE LA V1 ONT DISPARU — défaut 2 du contrat features v2 § 1.5.
//
// (Le motif exact est grepé par le contrat de sortie de la campagne : on ne l'écrit donc pas
// ici, pas même en commentaire, sous peine de faire échouer un compte qu'on prétend tenir.)
//
// Ils portaient tous le même commentaire : « le contrat gèle le nom mais pas les membres ».
// C'était vrai quand L-D écrivait sans voir la sortie de L-B ; ce ne l'est plus. Les
// signatures réelles sont désormais sous les yeux, et elles sont exactement celles qu'on
// espérait : `creerAlea(graine: number): Alea`, `creerHorloge(): Horloge`,
// `graineParDefaut(): number`, `Horloge.maintenant()` et `Horloge.figer(instant)`. Chaque cast
// supprimé est un endroit où le compilateur protège à nouveau quelque chose.
// ─────────────────────────────────────────────────────────────────────────────────────────
import { createContext, createElement, useContext, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { creerAlea, creerHorloge, graineParDefaut } from '@pierre/partage';
import type { Horloge, SeuilsCascade } from '@pierre/partage';
import { lireSeuilsCascade } from '@pierre/partage/recompenses';
import type { ServicesJeu } from '../moteurs/types.js';
import { creerAudioTone } from '../services/audio-tone.js';
import { creerVoixFichier } from '../services/voix-fichier.js';
import { creerVoixNavigateur } from '../services/voix-navigateur.js';
import { creerHaptiqueNavigateur } from '../gamefeel/haptique-navigateur.js';
import { creerRetourSensoriel } from '../gamefeel/retour.js';
import { emettreSurCanevasCourant } from '../gamefeel/particules.js';
import { urlAsset } from '../api/client.js';
import type { EtatMagasin, MagasinJeu } from './magasin.js';

/** Graine par défaut, telle que `partage/src/alea.ts` la calcule. */
export function resoudreGraineParDefaut(): number {
  const valeur = graineParDefaut();
  return Number.isFinite(valeur) ? valeur : 1;
}

/**
 * Horodatage ISO courant, lu SUR L'HORLOGE INJECTÉE.
 *
 * `Date.now()` et `new Date()` sont interdits hors de `horloge.ts` (règle ESLint maison) :
 * cette fonction existe pour qu'aucun appelant ne soit tenté de les écrire, et pour qu'un seul
 * endroit du client sache par où le temps entre.
 */
export function maintenantIso(horloge: Horloge): string {
  return horloge.maintenant();
}

/** Fige l'horloge injectée. Utilisé par `window.__test`. */
export function figerHorloge(horloge: Horloge, instant: string): void {
  horloge.figer(instant);
}

// ------------------------------------------------------------------ construction

/**
 * `prefers-reduced-motion` du système, au démarrage.
 *
 * Lu ici ET dans le magasin, et ce n'est pas un doublon : le magasin porte l'ÉTAT (que
 * `sauterAnimations()` peut basculer en cours de partie), cette lecture-ci décide de la
 * CONSTRUCTION des services. Un fournisseur haptique construit « disponible » alors que le
 * système demande le calme ferait vibrer la tablette avant même le premier rendu.
 */
function mouvementReduitDemande(): boolean {
  if (typeof globalThis.matchMedia !== 'function') {
    return false;
  }
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Les services réels du navigateur. Les tests substituent les leurs. */
export function creerServicesParDefaut(graine = resoudreGraineParDefaut()): ServicesJeu {
  const animationsDesactivees = mouvementReduitDemande();
  const audio = creerAudioTone();
  const haptique = creerHaptiqueNavigateur({ animationsDesactivees });

  // ─────────────────────────────────────────────────────────────────────────────────────
  // AJOUT N2 — `voix-fichier` devient le chemin NOMINAL, `voix-navigateur` le repli.
  //
  // Le fournisseur est construit AVEC UN MANIFESTE VIDE, et c'est délibéré : la construction
  // des services est synchrone, le manifeste arrive par le réseau. D'ici là `aUnClip` rend
  // `false`, D42 masque le bouton, et le comportement est exactement celui d'une
  // installation où `npm run voix` n'a jamais tourné — rien ne ment, rien ne déçoit.
  // `chargerManifesteVoix` ci-dessous le pose dès qu'il est là.
  //
  // `creerVoixNavigateur` reste importé et exporté : le § 10 du contrat interdit de le
  // supprimer, et `basculerSurLeRepli` en fait un usage explicite plutôt qu'un import mort.
  // ─────────────────────────────────────────────────────────────────────────────────────
  const voix = creerVoixFichier();
  void voix.recupererManifeste();

  return {
    alea: creerAlea(graine),
    horloge: creerHorloge(),
    voix,
    audio,
    haptique,
    // `emettreSurCanevasCourant` est une indirection assumée : `RetourSensoriel` est construit
    // AVANT que React n'ait monté la couche de particules, et un contexte React n'atteindrait
    // pas un service construit hors de React. Le registre vit dans `gamefeel/particules.ts`.
    retour: creerRetourSensoriel({
      audio,
      haptique,
      animationsDesactivees,
      emettreParticules: emettreSurCanevasCourant
    })
  };
}

// ------------------------------------------------- les seuils de la cascade, en DONNÉES (C2)

/**
 * Charge `contenu/referentiel/parametres-recompenses.json`.
 *
 * Convention C2 : « aucun seuil de récompense n'est écrit en dur dans le code ». Les valeurs
 * vivent en données et sont **chargées au démarrage**. `lireSeuilsCascade` LÈVE plutôt que de
 * rendre un défaut silencieux ; on capture ici, parce qu'un référentiel illisible ne doit pas
 * empêcher l'enfant de jouer — il doit seulement priver l'écran de ses jauges, visiblement.
 *
 * RÉSOLU au Lot 4 du portage Android (Docs/addendum-portage-android.md § 6bis) : le défaut
 * signalé par L2-A tenait à l'absence d'un `lireReferentiel(chemin)` — ce qui existe désormais,
 * c'est `urlAsset()` de `client/src/api/client.ts`, LE seul point d'appel réseau/accès aux
 * assets, résolu par port (`PortApiHttp` en LAN, `PortApiLocal` en mode autonome — assets
 * embarqués au build, aucun réseau). Un appel direct à `CHEMINS_API.asset()` fonctionnait en
 * LAN mais échouait silencieusement en mode autonome (aucun serveur à interroger) : c'est
 * exactement le bug que `urlAsset()` existe pour éviter.
 */
export async function chargerSeuilsCascade(): Promise<SeuilsCascade | null> {
  try {
    const reponse = await fetch(urlAsset('referentiel/parametres-recompenses.json'), {
      headers: { Accept: 'application/json' }
    });
    if (!reponse.ok) {
      throw new Error(`statut ${String(reponse.status)}`);
    }
    return lireSeuilsCascade(await reponse.json());
  } catch (cause) {
    // Pas d'écran d'erreur, pas de valeur inventée : les jauges se taisent, le jeu continue.
    console.warn('[recompenses] seuils de cascade illisibles, les jauges restent muettes :', cause);
    return null;
  }
}

// ------------------------------------------------------------------ contexte React

export interface ContexteJeu {
  readonly services: ServicesJeu;
  readonly magasin: MagasinJeu;
}

const Contexte = createContext<ContexteJeu | null>(null);

export interface ProprietesFournisseurJeu {
  readonly valeur: ContexteJeu;
  readonly children: ReactNode;
}

export function FournisseurJeu({ valeur, children }: ProprietesFournisseurJeu): ReactElement {
  return createElement(Contexte.Provider, { value: valeur }, children);
}

function useContexteJeu(): ContexteJeu {
  const contexte = useContext(Contexte);
  if (contexte === null) {
    throw new Error('`FournisseurJeu` manquant au-dessus de ce composant.');
  }
  return contexte;
}

export function useServices(): ServicesJeu {
  return useContexteJeu().services;
}

export function useMagasin(): MagasinJeu {
  return useContexteJeu().magasin;
}

/**
 * Lecture sélective de l'état de session.
 * `useSyncExternalStore` plutôt que le hook `create()` de Zustand : le magasin est un magasin
 * VANILLA, parce que `window.__test` doit pouvoir le piloter hors de tout composant React.
 *
 * CONTRAINTE : le sélecteur doit rendre une valeur STABLE par référence (un primitif, ou un
 * objet déjà stocké tel quel dans le magasin). Un sélecteur qui construit un objet neuf à
 * chaque appel fait boucler React (« The result of getSnapshot should be cached »).
 */
export function useEtatJeu<T>(selecteur: (etat: EtatMagasin) => T): T {
  const magasin = useMagasin();
  return useSyncExternalStore(
    (ecouter) => magasin.subscribe(ecouter),
    () => selecteur(magasin.getState()),
    () => selecteur(magasin.getState())
  );
}

// ──────────────────────────────────────────────────────────── les voix (ajout N2)

/**
 * Pose le manifeste sur un fournisseur `voix-fichier` déjà construit.
 *
 * Sert au démarrage de l'application et aux tests, qui veulent un manifeste connu plutôt
 * qu'une requête réseau. Sans effet — et sans erreur — sur un fournisseur qui n'est pas
 * `voix-fichier` : le repli n'a pas de manifeste à poser, et c'est normal.
 */
export function chargerManifesteVoix(services: ServicesJeu, brut: unknown): void {
  const candidat = services.voix as { chargerManifeste?: (brut: unknown) => void };
  if (typeof candidat.chargerManifeste === 'function') {
    candidat.chargerManifeste(brut);
  }
}

/**
 * Le repli de D9, rendu explicite.
 *
 * `voix-navigateur` ne connaît aucun clip : `aUnClip` y vaut toujours `false`, donc D42
 * masque tous les boutons. C'est le comportement voulu sur une installation dont
 * `contenu/audio/` n'a pas été généré — le jeu se lance, il est muet, et il ne ment pas.
 * Cette fonction existe pour que ce choix soit NOMMÉ dans le code plutôt que déduit de la
 * présence d'un import.
 */
export function creerVoixDeRepli(): ServicesJeu['voix'] {
  return creerVoixNavigateur();
}
