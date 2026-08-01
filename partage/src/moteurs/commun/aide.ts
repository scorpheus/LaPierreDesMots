/**
 * L'escalade d'aide, commune aux treize moteurs — lot L2-C.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.1. **Importé par L2-E**, qui ne réimplante
 * jamais cette règle (§ 4.8, règle 4).
 *
 * Tout ce fichier est PUR : le temps entre par `maintenantMs`, jamais par `Date.now`.
 *
 * INVARIANT DUR, opposable en revue : `niveauAideSuivant` est **monotone croissante**.
 * Elle ne rend jamais un niveau inférieur à `etat.niveauAide`. Une aide obtenue n'est
 * jamais retirée (contrat v1 § 5.6, R14). Un moteur qui régresse le niveau d'aide viole
 * R14 — et c'est `tests/unitaires/place-validation.test.ts` qui le prouve par propriété.
 */

import type { AideProposee, NiveauAide } from '../types.js';
import type { DelaisAide } from './delais.js';

/** Le minimum qu'un état de moteur doit exposer pour que l'escalade d'aide s'applique. */
export interface EtatAidable {
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  readonly debutMs: number;
  readonly derniereActionMs: number;
  /** Instant du passage à `indice`, `null` tant qu'il n'a pas eu lieu. */
  readonly instantIndiceMs: number | null;
}

/**
 * Rang ordinal des trois paliers. C'est LUI qui rend la monotonie vérifiable : « le niveau
 * ne décroît jamais » se lit `RANG_AIDE[apres] >= RANG_AIDE[avant]`, et se teste.
 */
export const RANG_AIDE: Readonly<Record<NiveauAide, number>> = {
  aucune: 0,
  indice: 1,
  demonstration: 2,
};

/** Le plus haut des deux paliers. Seule façon d'écrire une progression d'aide. */
export function aideLaPlusHaute(a: NiveauAide, b: NiveauAide): NiveauAide {
  return RANG_AIDE[a] >= RANG_AIDE[b] ? a : b;
}

/**
 * Le niveau d'aide qui s'impose à cet instant.
 *
 * Deux voies vers chaque palier, exactement comme en v1 § 5.6 : le nombre d'erreurs OU
 * l'inactivité. La voie « erreurs » est immédiate — une 2ᵉ erreur donne l'indice tout de
 * suite, sans attendre le battement suivant.
 *
 * Le compte des 30 s de la démonstration part de l'INSTANT DE L'INDICE
 * (`instantIndiceMs`), pas de la dernière action : sans cela, un enfant qui reçoit son
 * indice puis pose un doigt au hasard repousserait indéfiniment la démonstration que la
 * v2 § 5.4 lui promet.
 */
export function niveauAideSuivant(
  etat: EtatAidable,
  maintenantMs: number,
  delais: DelaisAide,
): NiveauAide {
  const inactiviteMs = maintenantMs - etat.derniereActionMs;
  const courant = etat.niveauAide;

  const depuisIndiceMs =
    etat.instantIndiceMs === null ? Number.NEGATIVE_INFINITY : maintenantMs - etat.instantIndiceMs;

  if (
    RANG_AIDE[courant] < RANG_AIDE.demonstration &&
    (etat.nbErreurs >= delais.erreursAvantDemonstration ||
      (RANG_AIDE[courant] >= RANG_AIDE.indice && depuisIndiceMs >= delais.demonstrationMs))
  ) {
    return 'demonstration';
  }

  if (
    RANG_AIDE[courant] < RANG_AIDE.indice &&
    (etat.nbErreurs >= delais.erreursAvantIndice || inactiviteMs >= delais.indiceMs)
  ) {
    return 'indice';
  }

  // Le repli est le niveau COURANT, jamais `aucune` : c'est ici que se joue la monotonie.
  return courant;
}

/**
 * Vrai après `relectureMs` d'inactivité. Ne change JAMAIS `niveauAide` : c'est gratuit (R15).
 *
 * Prédicat BRUT, sans mémoire : il redevient vrai à chaque battement tant que l'inactivité
 * dure. C'est à l'appelant d'appliquer son quota — les moteurs de ce lot relisent quand
 * `nbEcoutes` est en retard sur `⌊inactivité / relectureMs⌋`, exactement comme `colorie`
 * (contrat v1 § 5.8). Sans ce quota, l'hôte battant à la seconde ferait reparler Gobi
 * vingt-cinq fois entre la 20ᵉ et la 45ᵉ seconde.
 */
export function doitRelire(
  etat: EtatAidable,
  maintenantMs: number,
  delais: DelaisAide,
): boolean {
  return maintenantMs - etat.derniereActionMs >= delais.relectureMs;
}

/**
 * Nombre de relectures dues depuis la dernière action. Le quota que `doitRelire` ne porte
 * pas : `relecturesDues(...) > nbEcoutes` est la condition exacte utilisée par `place` et
 * `trace`, et par les onze moteurs de L2-E.
 */
export function relecturesDues(
  etat: EtatAidable,
  maintenantMs: number,
  delais: DelaisAide,
): number {
  if (delais.relectureMs <= 0) return 0;
  return Math.floor(Math.max(0, maintenantMs - etat.derniereActionMs) / delais.relectureMs);
}

/**
 * L'aide à proposer, ou `null` si le niveau courant n'appelle rien de nouveau.
 *
 * `indice` → Gobi relit et souffle. `demonstration` → la cible s'anime. Le `texte` n'est
 * JAMAIS affiché seul (R15) : il est dit par `FournisseurVoix`, et l'écrit ne le remplace
 * pas.
 */
export function construireAide(
  niveau: NiveauAide,
  cible: string | null,
  texte: string | null,
): AideProposee | null {
  if (niveau === 'aucune') return null;
  if (niveau === 'indice') {
    return { niveau: 'indice', code: 'relire-consigne', cible, texte };
  }
  return { niveau: 'demonstration', code: 'montre-cible', cible, texte };
}
