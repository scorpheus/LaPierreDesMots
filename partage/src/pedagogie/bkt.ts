/**
 * BKT — *Bayesian Knowledge Tracing* simplifié par (profil, compétence). Lot L2-D.
 *
 * v2 § 12.2 pour les trois paramètres classiques, D13 pour le quatrième — `p_devinette`, fixée
 * **par mode de réponse** — et pour la clause des deux tentatives à faible devinette.
 *
 * Toutes les fonctions sont PURES : même entrée, même sortie, aucun effet de bord, aucune
 * lecture d'horloge. C'est ce qui rend `test:rejeu` interprétable (annexe T § T2).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * ÉCART SIGNALÉ AU CONTRAT GELÉ (§ 4.4) — `mettreAJourMaitrise` prend un QUATRIÈME paramètre.
 *
 * Le contrat déclare `mettreAJourMaitrise(etat, observation, params: ParametresBkt)`. Or
 * `EtatMaitrise.nbTentativesFaibleDevinette` ne peut pas être tenu à jour sans
 * `CritereAcquis.seuilFaibleDevinette`, qui n'est PAS dans `ParametresBkt`. Sans ce seuil, le
 * compteur reste à zéro et la clause de D13 — « au moins deux tentatives à p_devinette ≤ 0,10 »
 * — ne serait jamais satisfaite : plus aucune compétence ne deviendrait acquise, en silence.
 *
 * Le paramètre est donc **requis** et non facultatif : l'oubli ne compile pas, au lieu de ne se
 * voir qu'au bout de trois semaines dans une courbe. Aucun autre lot n'appelle cette fonction
 * (§ 5.1 : L2-H n'importe que `EtatMaitrise` et `estAcquise`, dont les signatures sont
 * inchangées), la portée de l'écart est donc entièrement interne à L2-D.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */

import { ErreurPierre } from '../erreurs.js';
import type { CodeCompetence } from '../identifiants.js';
import type {
  CritereAcquis, EtatMaitrise, ObservationTentative, ParametresBkt,
} from './types.js';

/** Les deux modes dont `p_devinette` est calculée en `1/n!` et jamais tabulée (D13). */
const MODES_CALCULES = new Set<string>(['ordre', 'appariement']);

/** Ordonner ou apparier demande au moins deux éléments ; en dessous il n'y a pas de hasard. */
const ELEMENTS_MIN = 2;

/**
 * Le jour civil d'un horodatage, `YYYY-MM-DD`.
 *
 * Découpage de la chaîne ISO plutôt que `new Date(...)` : la règle ESLint maison interdit la
 * construction d'une `Date` hors de `horloge.ts`, et un `Horodatage` est par définition ISO 8601
 * **en UTC** (`identifiants.ts`). Une chaîne qui n'a pas cette forme est un refus, jamais un
 * jour deviné.
 */
function jourDe(instant: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(instant)) {
    throw new ErreurPierre(
      'argument-invalide',
      `Horodatage ISO 8601 UTC attendu, reçu « ${instant} ».`,
      { instant }
    );
  }
  return instant.slice(0, 10);
}

function factorielle(n: number): number {
  let produit = 1;
  for (let i = 2; i <= n; i += 1) {
    produit *= i;
  }
  return produit;
}

function borner(valeur: number): number {
  if (!Number.isFinite(valeur)) {
    return 0;
  }
  return Math.min(1, Math.max(0, valeur));
}

export function etatMaitriseInitial(
  competence: CodeCompetence,
  params: ParametresBkt,
): EtatMaitrise {
  return {
    competence,
    p: borner(params.pInit),
    nbTentatives: 0,
    joursDistincts: [],
    nbTentativesFaibleDevinette: 0,
    acquiseLe: null,
  };
}

/**
 * `p_devinette` effective pour une observation.
 *
 * Pour `ordre` et `appariement`, rend `1 / n!` calculé depuis `observation.nbElements` — et
 * LÈVE `ErreurPierre('argument-invalide')` si `nbElements` est `null` pour ces deux modes.
 * Rendre une valeur par défaut silencieuse serait exactement le défaut que D13 combat.
 */
export function pDevinette(params: ParametresBkt, observation: ObservationTentative): number {
  const tabulee = params.pDevinette[observation.modeReponse];
  if (tabulee !== null && tabulee !== undefined && !MODES_CALCULES.has(observation.modeReponse)) {
    return borner(tabulee);
  }

  const n = observation.nbElements;
  if (n === null || !Number.isInteger(n) || n < ELEMENTS_MIN) {
    throw new ErreurPierre(
      'argument-invalide',
      `Le mode « ${observation.modeReponse} » calcule p_devinette en 1/n! : ` +
        `« nbElements » doit être un entier >= ${String(ELEMENTS_MIN)}, reçu ${String(n)}.`,
      { modeReponse: observation.modeReponse, nbElements: n }
    );
  }
  return borner(1 / factorielle(n));
}

/**
 * Fonction PURE. Quatre propriétés opposables, prouvées par `fast-check` :
 *
 *  - **P1** une suite de réussites fait croître `p` de façon monotone ;
 *  - **P2** `p` reste dans `[0, 1]` quelle que soit la séquence ;
 *  - **P3** une tentative avec aide fait moins bouger `p` qu'une tentative sans aide,
 *    strictement — jamais autant, jamais davantage ;
 *  - **P4** `acquiseLe`, une fois posé, n'est jamais effacé.
 *
 * L'aide de Gobi pèse `poidsAvecAide` (v2 § 12.2). Le poids porte sur le **déplacement** de `p`,
 * pas sur la vraisemblance : `p' = p + poids × (p_bayes − p)`. C'est ce qui donne P3 exactement
 * — le déplacement avec aide vaut `poids` fois le déplacement sans aide, dans le même sens —
 * là où pondérer la vraisemblance donnerait un rapport qui dépend de `p` et rendrait la
 * propriété invérifiable.
 *
 * `acquiseLe` n'est jamais POSÉ ici : c'est le dépôt (`serveur/src/depots/maitrise.ts`) qui le
 * pose, parce que lui seul connaît l'instant à inscrire et applique `COALESCE(ancien, nouveau)`.
 * Ici il est seulement **reconduit**, jamais effacé.
 */
export function mettreAJourMaitrise(
  etat: EtatMaitrise,
  observation: ObservationTentative,
  params: ParametresBkt,
  critere: CritereAcquis,
): EtatMaitrise {
  const devinette = pDevinette(params, observation);
  const glissement = borner(params.pGlissement);
  const p = borner(etat.p);

  // Étape bayésienne : probabilité a posteriori de maîtrise, sachant la réponse observée.
  let posterieur: number;
  if (observation.reussi) {
    const numerateur = p * (1 - glissement);
    const denominateur = numerateur + (1 - p) * devinette;
    posterieur = denominateur > 0 ? numerateur / denominateur : p;
  } else {
    const numerateur = p * glissement;
    const denominateur = numerateur + (1 - p) * (1 - devinette);
    posterieur = denominateur > 0 ? numerateur / denominateur : p;
  }

  // Étape d'apprentissage : la chance de passer de « non su » à « su » pendant la tentative.
  const apprentissage = posterieur + (1 - posterieur) * borner(params.pTransit);

  const poids = observation.avecAide ? borner(params.poidsAvecAide) : 1;
  const pSuivant = borner(p + poids * (apprentissage - p));

  const jour = jourDe(observation.instant);
  const joursDistincts = etat.joursDistincts.includes(jour)
    ? etat.joursDistincts
    : [...etat.joursDistincts, jour].sort();

  const faibleDevinette = devinette <= critere.seuilFaibleDevinette;

  return {
    competence: etat.competence,
    p: pSuivant,
    nbTentatives: etat.nbTentatives + 1,
    joursDistincts,
    nbTentativesFaibleDevinette: etat.nbTentativesFaibleDevinette + (faibleDevinette ? 1 : 0),
    // P4 — reconduit tel quel. Jamais remis à `null`, jamais réécrit (R14).
    acquiseLe: etat.acquiseLe,
  };
}

/**
 * **P5** — le critère complet de D13 : `p >= seuilP`, ET `>= tentativesMin` tentatives, ET
 * `>= joursDistinctsMin` jours distincts, ET **`>= tentativesFaibleDevinetteMin` tentatives à
 * `p_devinette <= seuilFaibleDevinette`**. Les quatre, pas trois.
 *
 * La quatrième est celle qu'on oublie, et c'est elle qui empêche une série de vrai/faux
 * chanceux (`p_devinette = 0,50`) d'établir à elle seule une maîtrise.
 */
export function estAcquise(etat: EtatMaitrise, critere: CritereAcquis): boolean {
  return (
    etat.p >= critere.seuilP &&
    etat.nbTentatives >= critere.tentativesMin &&
    etat.joursDistincts.length >= critere.joursDistinctsMin &&
    etat.nbTentativesFaibleDevinette >= critere.tentativesFaibleDevinetteMin
  );
}
