/**
 * Code parent a 4 chiffres — contrat des features v2 § 4.6, v2 § 11.
 *
 * « Zone parent protegee par un code a 4 chiffres, `scrypt`, verrouillage temporaire apres
 * 5 echecs. »
 *
 * Le sel est propre au depot et vit en base, jamais dans le code. La comparaison est a temps
 * constant (`timingSafeEqual`) : un code a 4 chiffres est deja faible, une fuite par le temps de
 * reponse le rendrait trivial — on retrouverait le code chiffre par chiffre.
 *
 * DEUX POINTS DE CONCEPTION, ecrits ici pour qu'on ne les defasse pas par confort :
 *
 * 1. **Le sel vient de `randomBytes`, jamais de `Alea`.** `Alea` est ensemence par
 *    `ATELIER_GRAINE`, dont la valeur par defaut est la MEME sur toutes les installations : un
 *    sel qui en descendrait serait identique partout, ce qui est exactement ce qu'un sel doit
 *    empecher. `randomBytes` n'est pas `Math.random` et n'entre dans aucun rejeu : aucune sortie
 *    de test ne depend de sa valeur.
 * 2. **Aucune lecture d'horloge ici.** Les instants arrivent en argument. C'est ce qui permet de
 *    verifier l'expiration du verrou sans attendre un quart d'heure (annexe T § 2.2).
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import type { Horodatage } from '@pierre/partage';
import type { VerrouParent } from '@pierre/partage/parent';

import { DUREE_VERROU_MS, ECHECS_AVANT_VERROU } from '@pierre/partage/parent';

/** Longueur du sel, en octets. 16 est la recommandation usuelle pour `scrypt`. */
const OCTETS_SEL = 16;

/** Longueur de l'empreinte derivee, en octets. */
const OCTETS_EMPREINTE = 64;

/**
 * Cout de `scrypt`. `N = 2^14` tient en ~16 Mo et coute quelques dizaines de millisecondes sur
 * le PC du salon : assez pour rendre une attaque hors ligne penible, assez peu pour que le
 * parent n'attende pas. Les 10 000 codes possibles restent enumerables — c'est la limite
 * assumee d'un code a 4 chiffres (v2 § 11), et c'est le VERROU qui la couvre, pas `scrypt`.
 */
const COUT_SCRYPT = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

/** Un verrou neuf : aucun echec, aucune echeance. */
export const VERROU_VIERGE: VerrouParent = { nbEchecs: 0, verrouilleJusqua: null };

/** Un sel neuf, imprevisible. A stocker en base a cote de l'empreinte. */
export function selNeuf(): Buffer {
  return randomBytes(OCTETS_SEL);
}

export function deriverCode(code: string, sel: Buffer): Buffer {
  return scryptSync(code, sel, OCTETS_EMPREINTE, COUT_SCRYPT);
}

/**
 * Comparaison a temps constant.
 *
 * `timingSafeEqual` JETTE quand les deux tampons n'ont pas la meme longueur : on garde donc le
 * test de longueur avant, et on rend `false` — une empreinte de longueur inattendue est un
 * refus, pas une erreur 500 qui apprendrait quelque chose a l'appelant.
 */
export function verifierCode(code: string, sel: Buffer, empreinte: Buffer): boolean {
  const candidate = deriverCode(code, sel);
  if (candidate.length !== empreinte.length) {
    return false;
  }
  return timingSafeEqual(candidate, empreinte);
}

/** Vrai tant que l'echeance n'est pas atteinte. Un horodatage illisible n'enferme personne. */
export function estVerrouille(verrou: VerrouParent, maintenant: string): boolean {
  if (verrou.verrouilleJusqua === null) {
    return false;
  }
  const echeance = Date.parse(verrou.verrouilleJusqua);
  const instant = Date.parse(maintenant);
  if (Number.isNaN(echeance) || Number.isNaN(instant)) {
    // Le parent n'est jamais enferme par une donnee abimee : on ouvre.
    return false;
  }
  return instant < echeance;
}

/**
 * Un echec de plus. Le verrou se ferme AU 5e echec (v2 § 11), pas au 4e ni au 6e.
 *
 * Le compteur ne se remet pas a zero tout seul : c'est `POST /api/parent/ouvrir` qui le remet,
 * apres un code juste. Un compteur qui s'oublierait ferait du verrou une formalite.
 */
export function appliquerEchec(verrou: VerrouParent, maintenant: string): VerrouParent {
  const nbEchecs = verrou.nbEchecs + 1;
  if (nbEchecs < ECHECS_AVANT_VERROU) {
    return { nbEchecs, verrouilleJusqua: null };
  }
  const instant = Date.parse(maintenant);
  if (Number.isNaN(instant)) {
    return { nbEchecs, verrouilleJusqua: verrou.verrouilleJusqua };
  }
  return { nbEchecs, verrouilleJusqua: isoDepuisMs(instant + DUREE_VERROU_MS) };
}

// ─────────────────────────────────────────────────────────── ISO sans `Date`, exprès

/**
 * Instant ISO 8601 UTC depuis un nombre de millisecondes.
 *
 * `new Date(ms).toISOString()` serait plus court et est INTERDIT partout hors de
 * `partage/src/horloge.ts` (regle ESLint maison). L'algorithme *civil-from-days* de Howard
 * Hinnant rend le meme resultat en arithmetique entiere, annees bissextiles comprises.
 */
export function isoDepuisMs(ms: number): Horodatage {
  const millisecondesParJour = 86_400_000;
  const jours = Math.floor(ms / millisecondesParJour);
  const dansLeJour = ms - jours * millisecondesParJour;

  const heure = Math.floor(dansLeJour / 3_600_000);
  const minute = Math.floor((dansLeJour % 3_600_000) / 60_000);
  const seconde = Math.floor((dansLeJour % 60_000) / 1_000);
  const milli = dansLeJour % 1_000;

  const z = jours + 719_468;
  const ere = Math.floor(z / 146_097);
  const jourDansEre = z - ere * 146_097;
  const anneeDansEre = Math.floor(
    (jourDansEre -
      Math.floor(jourDansEre / 1_460) +
      Math.floor(jourDansEre / 36_524) -
      Math.floor(jourDansEre / 146_096)) /
      365
  );
  const anneeCivile = anneeDansEre + ere * 400;
  const jourDansAnnee =
    jourDansEre -
    (365 * anneeDansEre + Math.floor(anneeDansEre / 4) - Math.floor(anneeDansEre / 100));
  const moisDecale = Math.floor((5 * jourDansAnnee + 2) / 153);
  const quantieme = jourDansAnnee - Math.floor((153 * moisDecale + 2) / 5) + 1;
  const mois = moisDecale < 10 ? moisDecale + 3 : moisDecale - 9;
  const annee = anneeCivile + (mois <= 2 ? 1 : 0);

  const deux = (valeur: number): string => String(valeur).padStart(2, '0');
  const trois = (valeur: number): string => String(valeur).padStart(3, '0');

  return (
    `${String(annee).padStart(4, '0')}-${deux(mois)}-${deux(quantieme)}` +
    `T${deux(heure)}:${deux(minute)}:${deux(seconde)}.${trois(milli)}Z`
  );
}
