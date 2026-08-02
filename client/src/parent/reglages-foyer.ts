// Les réglages du foyer — la source unique, hors React et hors écran.
//
// POURQUOI CE FICHIER EXISTE, alors que `ReglagesParent.tsx` portait déjà ces réglages.
//
// Le père a demandé « une option pour activer ou désactiver du côté parent le bouton écouter ».
// Un réglage posé dans la zone parent doit donc être lu **dans le monde de l'enfant**, par
// `client/src/composants/BoutonEcouter.tsx`. Si ce composant importait `ReglagesParent.tsx`, il
// tirerait tout l'écran parent — `<input type="range">`, libellés, mise en page — dans le
// chemin critique du bundle de l'enfant, dont le budget est de 250 Ko gzip (CLAUDE.md,
// « cibles de performance »). Ce module est donc une **feuille** : aucune dépendance à React
// autre que `useSyncExternalStore`, aucun JSX, rien qui ne serve à lire ou écrire un réglage.
//
// `ReglagesParent.tsx` s'appuie dessus et **ré-exporte** les trois noms publics qu'il portait
// (`ReglagesFoyer`, `REGLAGES_FOYER_PAR_DEFAUT`, `lireReglagesFoyer`) : aucun appelant existant
// n'est touché.
//
// PLACEHOLDER — conservé de `ReglagesParent.tsx`, et non rouvert ici : le contrat gelé
// n'accorde aucune route pour persister ces réglages (les 12 routes du § 5.3 n'en portent
// aucune), donc on stocke sur l'appareil, dans `localStorage`. Conséquence à connaître : le
// réglage vaut **par appareil**, pas par profil. Question consignée dans
// `Docs/questions-en-attente.md` (Q-R4).
import { useSyncExternalStore } from 'react';

/** Clé unique dans `localStorage`. Inchangée : les réglages déjà posés sont relus tels quels. */
export const CLE_STOCKAGE_FOYER = 'pierre.reglages-parent';

export interface ReglagesFoyer {
  /** Volume des effets sonores, de 0 à 1. */
  readonly volumeEffets: number;
  /** Volume des voix et consignes, de 0 à 1. R15 : jamais coupé à zéro par défaut. */
  readonly volumeVoix: number;
  /** Animations calmes : le décor bouge moins, le texte ne bouge jamais (v2 § 9.3). */
  readonly animationsCalmes: boolean;
  /**
   * Le bouton « Écouter » est-il proposé à l'enfant ?
   *
   * **Par défaut `true`**, et ce défaut n'est pas un choix de confort : R15 (« aucune consigne
   * n'existe uniquement à l'écrit ») est une règle non négociable, elle doit donc tenir sans
   * que personne ait à toucher un réglage. L'éteindre est un geste **délibéré du parent**, pris
   * dans la zone protégée par le code — l'enfant ne peut pas se le retirer, ni se le rendre.
   *
   * Ce réglage n'a JAMAIS l'effet inverse : le remettre à `true` ne fait pas réapparaître un
   * bouton muet, parce que D42 prime (voir `BoutonEcouter.tsx`).
   */
  readonly boutonEcouter: boolean;
}

export const REGLAGES_FOYER_PAR_DEFAUT: ReglagesFoyer = {
  volumeEffets: 0.8,
  volumeVoix: 1,
  animationsCalmes: false,
  boutonEcouter: true
};

function borner(valeur: unknown, defaut: number): number {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
    return defaut;
  }
  // Hors bornes, on RAMÈNE, on ne rejette jamais : un réglage refusé bloquerait l'écran.
  return Math.min(1, Math.max(0, valeur));
}

/**
 * Ramène un enregistrement quelconque à des réglages valides.
 *
 * `boutonEcouter` se lit `!== false` et non `=== true` : un enregistrement **écrit avant
 * l'existence de ce réglage** ne porte pas le champ, et un foyer déjà installé ne doit pas
 * perdre son bouton « Écouter » à la mise à jour. Le silence vaut le défaut, et le défaut est
 * R15.
 */
export function normaliserReglagesFoyer(bruts: Partial<ReglagesFoyer> | null): ReglagesFoyer {
  if (bruts === null) {
    return REGLAGES_FOYER_PAR_DEFAUT;
  }
  return {
    volumeEffets: borner(bruts.volumeEffets, REGLAGES_FOYER_PAR_DEFAUT.volumeEffets),
    volumeVoix: borner(bruts.volumeVoix, REGLAGES_FOYER_PAR_DEFAUT.volumeVoix),
    animationsCalmes: bruts.animationsCalmes === true,
    boutonEcouter: bruts.boutonEcouter !== false
  };
}

// ─────────────────────────────────────────────────────────────────────── l'état vivant
//
// Un cache de module, et non une relecture de `localStorage` à chaque rendu : `useSyncExternalStore`
// exige un instantané **stable par identité** — relire et re-analyser le JSON à chaque appel
// rendrait un objet neuf à chaque fois, et React boucherait en rendus infinis.

let cache: ReglagesFoyer | null = null;
const abonnes = new Set<() => void>();

function relireDuStockage(): ReglagesFoyer {
  try {
    const brut = globalThis.localStorage?.getItem(CLE_STOCKAGE_FOYER);
    if (brut === null || brut === undefined) {
      return REGLAGES_FOYER_PAR_DEFAUT;
    }
    return normaliserReglagesFoyer(JSON.parse(brut) as Partial<ReglagesFoyer>);
  } catch {
    // Un stockage abîmé ne doit fermer ni la zone parent ni le jeu : on repart des défauts.
    return REGLAGES_FOYER_PAR_DEFAUT;
  }
}

function prevenir(): void {
  for (const abonne of abonnes) {
    abonne();
  }
}

/** Les réglages courants. Instantané stable : deux appels sans écriture rendent le même objet. */
export function lireReglagesFoyer(): ReglagesFoyer {
  cache ??= relireDuStockage();
  return cache;
}

/** Écrit, persiste, et prévient tout de suite l'enfant : le jeu n'attend aucun rechargement. */
export function ecrireReglagesFoyer(voulus: Partial<ReglagesFoyer>): ReglagesFoyer {
  const complets = normaliserReglagesFoyer({ ...lireReglagesFoyer(), ...voulus });
  cache = complets;
  try {
    globalThis.localStorage?.setItem(CLE_STOCKAGE_FOYER, JSON.stringify(complets));
  } catch {
    // Mode privé, quota plein : le réglage vaut pour la session et c'est déjà utile.
  }
  prevenir();
  return complets;
}

/**
 * Oublie l'instantané et prévient les abonnés.
 *
 * Sert à deux choses, toutes deux réelles : l'événement `storage` d'un autre onglet, et la
 * remise à zéro entre deux cas de test. Ce n'est PAS un crochet réservé aux tests.
 */
export function oublierReglagesFoyer(): void {
  cache = null;
  prevenir();
}

export function abonnerReglagesFoyer(abonne: () => void): () => void {
  abonnes.add(abonne);
  return (): void => {
    abonnes.delete(abonne);
  };
}

// Le parent peut ouvrir sa zone dans un second onglet de la même tablette : le jeu doit voir
// le changement sans qu'on le recharge.
globalThis.addEventListener?.('storage', (evenement: Event): void => {
  const cle = (evenement as StorageEvent).key;
  if (cle === null || cle === CLE_STOCKAGE_FOYER) {
    oublierReglagesFoyer();
  }
});

/** Les réglages du foyer, réactifs. Tout composant qui les lit se re-rend au changement. */
export function useReglagesFoyer(): ReglagesFoyer {
  return useSyncExternalStore(
    abonnerReglagesFoyer,
    lireReglagesFoyer,
    // Instantané « serveur » : sans DOM il n'y a pas de `localStorage`, donc les défauts.
    () => REGLAGES_FOYER_PAR_DEFAUT
  );
}
