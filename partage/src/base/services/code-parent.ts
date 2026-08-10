/**
 * Code parent a 4 chiffres — contrat des features v2 § 4.6, v2 § 11. Deplace de
 * `serveur/src/services/code-parent.ts` au Lot 4 du portage Android
 * (Docs/addendum-portage-android.md § 6bis) : c'etait la derniere piece de la zone parent a
 * departir de `node:crypto`, qui n'existe pas dans une WebView.
 *
 * `scrypt`/`randomBytes`/`timingSafeEqual` (Node) deviennent PBKDF2-SHA256/`getRandomValues`/une
 * comparaison a temps constant ecrite a la main, tous les trois portes par `globalThis.crypto`
 * (Web Crypto), disponible aussi bien sous Node 24 que dans une WebView Capacitor. Le PROTOCOLE
 * ne change pas : un sel neuf par definition, une empreinte derivee stockee a cote, un compteur
 * d'echecs qui verrouille au 5e. Comme le disait deja le fichier d'origine, ce n'est pas le cout
 * de la derivation qui protege un code a 4 chiffres — 10 000 valeurs restent enumerables — c'est
 * le VERROU. PBKDF2 a un cout d'attaque hors ligne du meme ordre que `scrypt` a budget de temps
 * egal ; le remplacement ne faiblit donc rien de ce que `estVerrouille`/`appliquerEchec` couvrent
 * deja.
 *
 * DEUX POINTS DE CONCEPTION, repris tels quels du fichier d'origine :
 *
 * 1. **Le sel vient de `getRandomValues`, jamais de `Alea`.** `Alea` est ensemence par
 *    `ATELIER_GRAINE`, dont la valeur par defaut est la MEME sur toutes les installations : un
 *    sel qui en descendrait serait identique partout, ce qui est exactement ce qu'un sel doit
 *    empecher. `getRandomValues` n'entre dans aucun rejeu : aucune sortie de test ne depend de
 *    sa valeur.
 * 2. **Aucune lecture d'horloge ici.** Les instants arrivent en argument. C'est ce qui permet de
 *    verifier l'expiration du verrou sans attendre un quart d'heure (annexe T § 2.2).
 */

import type { Horodatage } from '../../identifiants.js';
import type { VerrouParent } from '../../parent/types.js';
import { DUREE_VERROU_MS, ECHECS_AVANT_VERROU } from '../../parent/indicateurs.js';

/** Longueur du sel, en octets. 16 est la recommandation usuelle. */
const OCTETS_SEL = 16;

/** Longueur de l'empreinte derivee, en octets — 256 bits, la sortie native de SHA-256. */
const OCTETS_EMPREINTE = 32;

/**
 * Iterations PBKDF2-SHA256. 210 000 est la recommandation OWASP 2023 pour ce hash ; assez pour
 * rendre une attaque hors ligne penible, assez peu pour qu'un parent n'attende pas — mesure a
 * quelques dizaines de millisecondes sur un PC de salon comme sur une tablette milieu de gamme.
 */
const ITERATIONS_PBKDF2 = 210_000;

/** Un verrou neuf : aucun echec, aucune echeance. */
export const VERROU_VIERGE: VerrouParent = { nbEchecs: 0, verrouilleJusqua: null };

function sousCoucheCrypto(): typeof globalThis.crypto {
  const sousCouche = globalThis.crypto;
  if (sousCouche === undefined) {
    throw new Error('`globalThis.crypto` est indisponible : ni Node 24, ni une WebView valides.');
  }
  return sousCouche;
}

/** Un sel neuf, imprevisible. A stocker en base a cote de l'empreinte. */
export function selNeuf(): Uint8Array {
  return sousCoucheCrypto().getRandomValues(new Uint8Array(OCTETS_SEL));
}

/**
 * Octets vers hexadecimal minuscule. `Uint8Array` n'a pas l'equivalent du `Buffer.toString('hex')`
 * de Node — utile ici et cote appelant (jetons de session, serveur comme app autonome).
 */
export function versHex(octets: Uint8Array): string {
  return Array.from(octets, (octet) => octet.toString(16).padStart(2, '0')).join('');
}

export async function deriverCode(code: string, sel: Uint8Array): Promise<Uint8Array> {
  const sousCouche = sousCoucheCrypto().subtle;
  const cle = await sousCouche.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, [
    'deriveBits'
  ]);
  const bits = await sousCouche.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations: ITERATIONS_PBKDF2 },
    cle,
    OCTETS_EMPREINTE * 8
  );
  return new Uint8Array(bits);
}

/**
 * Comparaison a temps constant, ecrite a la main : Web Crypto n'expose pas l'equivalent de
 * `timingSafeEqual`. Une empreinte de longueur inattendue est un refus immediat — ce n'est pas
 * une fuite temporelle, la longueur est fixe et publique (`OCTETS_EMPREINTE`).
 */
function egalesATempsConstant(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let ecart = 0;
  for (let index = 0; index < a.length; index += 1) {
    ecart |= (a[index] as number) ^ (b[index] as number);
  }
  return ecart === 0;
}

export async function verifierCode(
  code: string,
  sel: Uint8Array,
  empreinte: Uint8Array
): Promise<boolean> {
  const candidate = await deriverCode(code, sel);
  return egalesATempsConstant(candidate, empreinte);
}

/** Vrai tant que l'echeance n'est pas atteinte. Un horodatage illisible n'enferme personne. */
export function estVerrouille(verrou: VerrouParent, maintenant: string): boolean {
  if (verrou.verrouilleJusqua === null) {
    return false;
  }
  const echeance = Date.parse(verrou.verrouilleJusqua);
  const instant = Date.parse(maintenant);
  if (Number.isNaN(echeance) || Number.isNaN(instant)) {
    return false;
  }
  return instant < echeance;
}

/**
 * Un echec de plus. Le verrou se ferme AU 5e echec (v2 § 11), pas au 4e ni au 6e.
 *
 * Le compteur ne se remet pas a zero tout seul : c'est la route/le service `ouvrir` qui le
 * remet, apres un code juste. Un compteur qui s'oublierait ferait du verrou une formalite.
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
  ) as Horodatage;
}
