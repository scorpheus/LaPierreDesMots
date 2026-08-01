// Contexte React des `ServicesJeu` — contrat technique v1 § 1.4.
//
// Un seul point d'injection pour tout le client : `Alea`, `Horloge`, `FournisseurVoix`,
// `FournisseurAudio`. C'est la traduction côté client de la testabilité en L0 (annexe T § 2) —
// aucun composant ne construit son propre aléatoire ni sa propre horloge, donc `graine(n)` et
// `figerHorloge(instant)` de `window.__test` ont prise sur TOUT le jeu, pas sur une partie.
//
// Fichier `.ts` (imposé par § 1.4) : le fournisseur est donc écrit avec `createElement`,
// pas en JSX. C'est la seule raison de cette forme.
import { createContext, createElement, useContext, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { creerAlea, creerHorloge, graineParDefaut } from '@pierre/partage';
import type { Alea, Horloge } from '@pierre/partage';
import type { ServicesJeu } from '../moteurs/types.js';
import { creerAudioTone } from '../services/audio-tone.js';
import { creerVoixNavigateur } from '../services/voix-navigateur.js';
import type { EtatMagasin, MagasinJeu } from './magasin.js';

// ------------------------------------------------------------------ adaptations de contrat
//
// Le contrat gèle les NOMS de `creerAlea`, `creerHorloge`, `graineParDefaut` et `Horloge`
// (§ 11.1) mais pas leurs signatures ni les membres de `Horloge`. Les quatre adaptations
// ci-dessous sont les SEULS endroits du client qui en dépendent : si L-B a retenu d'autres
// noms, c'est ici et nulle part ailleurs qu'on reprend. Signalé au rapport du lot L-D.

const creerAleaAdapte = creerAlea as unknown as (graine: number) => Alea;
const creerHorlogeAdaptee = creerHorloge as unknown as () => Horloge;

/** Graine par défaut, que `graineParDefaut` soit une constante ou une fonction. */
export function resoudreGraineParDefaut(): number {
  const brut: unknown = graineParDefaut;
  if (typeof brut === 'number' && Number.isFinite(brut)) {
    return brut;
  }
  if (typeof brut === 'function') {
    const valeur: unknown = (brut as () => unknown)();
    if (typeof valeur === 'number' && Number.isFinite(valeur)) {
      return valeur;
    }
  }
  return 1;
}

/**
 * Horodatage ISO courant, lu SUR L'HORLOGE INJECTÉE.
 * `Date.now()` et `new Date()` sont interdits hors de `horloge.ts` (règle ESLint maison) :
 * ce repli ne les emploie donc pas et rend une valeur d'époque plutôt qu'une heure inventée.
 */
export function maintenantIso(horloge: Horloge): string {
  const membres = horloge as unknown as Record<string, unknown>;
  for (const nom of ['maintenant', 'instant', 'iso', 'horodatage', 'now']) {
    const methode = membres[nom];
    if (typeof methode === 'function') {
      const valeur: unknown = (methode as () => unknown).call(horloge);
      if (typeof valeur === 'string') {
        return valeur;
      }
    }
  }
  console.warn("[horloge] aucune lecture d'horodatage trouvée sur l'horloge injectée.");
  return '1970-01-01T00:00:00.000Z';
}

/** Fige l'horloge injectée, si elle sait le faire. Utilisé par `window.__test`. */
export function figerHorloge(horloge: Horloge, instant: string): void {
  const membres = horloge as unknown as Record<string, unknown>;
  const methode = membres['figer'];
  if (typeof methode === 'function') {
    (methode as (valeur: string) => void).call(horloge, instant);
    return;
  }
  console.warn('[horloge] `figer` absent : l’horloge injectée ne peut pas être figée.');
}

// ------------------------------------------------------------------ construction

/** Les services réels du navigateur. Les tests substituent les leurs. */
export function creerServicesParDefaut(graine = resoudreGraineParDefaut()): ServicesJeu {
  return {
    alea: creerAleaAdapte(graine),
    horloge: creerHorlogeAdaptee(),
    voix: creerVoixNavigateur(),
    audio: creerAudioTone()
  };
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
