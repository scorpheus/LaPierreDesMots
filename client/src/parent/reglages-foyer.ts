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
   * Gobi parle-t-il ? Bouton « Écouter », répliques du campement, consignes des maths : c'est
   * l'interrupteur de TOUTE parole (`services/voix-reglee.ts`). Le nom du champ est gardé pour
   * relire les réglages déjà posés sur les appareils.
   *
   * **Par défaut `false`** — décision du parent du 9 oct. 2026, après l'avoir observé avec son
   * fils : « il faut que faire écouter, ou en tout cas parler, ce soit par défaut à false ». C'est
   * un jeu de LECTURE : la voix ne doit pas lire à la place de l'enfant. Le parent la rallume dans
   * sa zone, protégée par le code. Cela révise R15 (« aucune consigne uniquement à l'écrit ») :
   * la consigne reste audible dès que le parent allume la voix ; proposition de mise à jour de la
   * v2 § 5.4 consignée dans `Docs/tableau-retours.md` (T18), le document de référence n'est pas
   * modifié sans validation.
   *
   * Rallumé, il ne fait PAS réapparaître un bouton muet : D42 prime (voir `BoutonEcouter.tsx`).
   */
  readonly boutonEcouter: boolean;
}

export const REGLAGES_FOYER_PAR_DEFAUT: ReglagesFoyer = {
  volumeEffets: 0.8,
  volumeVoix: 1,
  animationsCalmes: false,
  boutonEcouter: false
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
 * `boutonEcouter` se lit `=== true` : un enregistrement qui ne porte pas le champ prend le
 * défaut, et le défaut est désormais « parole éteinte » (décision du parent du 9 oct. 2026).
 * Seul un « oui » explicite du parent allume la voix.
 */
export function normaliserReglagesFoyer(bruts: Partial<ReglagesFoyer> | null): ReglagesFoyer {
  if (bruts === null) {
    return REGLAGES_FOYER_PAR_DEFAUT;
  }
  return {
    volumeEffets: borner(bruts.volumeEffets, REGLAGES_FOYER_PAR_DEFAUT.volumeEffets),
    volumeVoix: borner(bruts.volumeVoix, REGLAGES_FOYER_PAR_DEFAUT.volumeVoix),
    animationsCalmes: bruts.animationsCalmes === true,
    boutonEcouter: bruts.boutonEcouter === true
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
