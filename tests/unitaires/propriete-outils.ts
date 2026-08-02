/**
 * Outillage COMMUN aux tests de propriété du lot Q3 — pilotage des quatorze moteurs.
 *
 * Ce fichier n'est pas une suite : `vitest.config.ts` ne collecte que
 * `tests/unitaires/**\/*.test.ts`. Il existe parce que **deux** suites de propriété doivent
 * jouer un moteur pour de vrai — `propriete-tentative-coherente.test.ts` et
 * `propriete-sortie-jouee.test.ts` — et qu'un pilote recopié dans deux fichiers, ce sont deux
 * pilotes qui divergent.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * CE QU'IL APPORTE, ET QUI N'EXISTAIT PAS
 *
 * `tests/unitaires/moteurs-reducteurs.test.ts` fait passer chaque réducteur par une **rafale
 * écrite à la main** de six actions, identique pour les quatorze. C'est ce qui permet
 * d'atteindre les gardes ; ce n'est pas ce qui explore l'espace des séquences. Ici, la
 * séquence est ENGENDRÉE : longueur, nature et charge utile de chaque action sont tirées, et
 * les cibles sont puisées dans les identifiants du contenu réel — donc tantôt valides,
 * tantôt non, dans un ordre que personne n'a prévu.
 *
 * LA CIBLE EST PUISÉE DANS LE CONTENU, jamais inventée : un bot qui ne tape que des
 * identifiants faux ne visite que les branches de refus, et une suite qui ne visite que les
 * refus déclare « aucun écran d'échec » sans avoir jamais vu une réussite.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * SOURCES QUI FONT FOI, LUES ET JAMAIS RECALCULÉES :
 *   · le registre des moteurs (`moteursEnregistres()`) — la population auditée ;
 *   · `partage/src/moteurs/<code>/types.ts` — l'union d'actions de chaque moteur, lue sur
 *     disque et comparée à la table de ce fichier. C'est l'audit **par objet** de D48 : on
 *     n'énumère pas les actions qu'on a pensé à écrire, on énumère celles que le moteur
 *     DÉCLARE, et on exige l'écart nul ;
 *   · les fixtures de `tests/fixtures/moteurs/` et les exercices livrés de
 *     `contenu/exercices/` — le contenu réel, jamais un faux décor.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import fc from 'fast-check';

import { creerAlea, creerHorlogeFigee, obtenirMoteur } from '@pierre/partage';
import type {
  ContexteMoteur, Habillage, MoteurQuelconque, NiveauAide, ResumeTentative,
} from '@pierre/partage';

import {
  GRAINE_DE_TEST, INSTANT_DE_REFERENCE, RACINE_DEPOT, lireJson,
} from '../configuration/preparation.js';

import { contenuAssemble } from '../fixtures/moteurs/assemble.js';
import { contenuAttrape } from '../fixtures/moteurs/attrape.js';
import { contenuChemin } from '../fixtures/moteurs/chemin.js';
import { contenuChrono } from '../fixtures/moteurs/chrono.js';
import { contenuEclair } from '../fixtures/moteurs/eclair.js';
import { contenuGrave } from '../fixtures/moteurs/grave.js';
import { contenuHistoire } from '../fixtures/moteurs/histoire.js';
import { contenuLibre } from '../fixtures/moteurs/libre.js';
import { contenuPaires } from '../fixtures/moteurs/paires.js';
import { contenuPhrase } from '../fixtures/moteurs/phrase.js';
import { contenuTri } from '../fixtures/moteurs/tri.js';

/**
 * La graine de TOUTES les propriétés de ce lot. Fixée, jamais tirée de l'horloge.
 *
 * `fast-check` prend sinon `Date.now()` pour graine : la suite explorerait un espace
 * différent à chaque exécution et un échec ne serait pas rejouable. Une QA non déterministe
 * est une QA qu'on finit par ignorer — c'est aussi la règle 3 du lot, et elle vaut pour les
 * tests autant que pour le jeu.
 */
export const GRAINE_PROPRIETE = 20260802;

/** Le budget de cas de chaque propriété du lot. Contrat : au moins mille. */
export const NB_CAS = 1000;

/** Les réglages passés tels quels à `fc.assert` — graine fixe, cas comptés, échec rejouable. */
export function reglages(nbCas: number = NB_CAS): Parameters<typeof fc.assert>[1] {
  return { numRuns: nbCas, seed: GRAINE_PROPRIETE, verbose: true };
}

/** Le rang des trois paliers d'aide. Une valeur hors table est une régression, pas un cas. */
export const RANG_AIDE: Readonly<Record<NiveauAide, number>> = {
  aucune: 0,
  indice: 1,
  demonstration: 2,
};

export function rangAide(niveau: NiveauAide): number {
  const rang = RANG_AIDE[niveau];
  if (rang === undefined) {
    throw new Error(`Palier d'aide inconnu : « ${String(niveau)} ». La table doit être revue.`);
  }
  return rang;
}

// ───────────────────────────────────────────────────────── la table des quatorze moteurs

const HABILLAGE_CLAIRIERE = 'contenu/habillages/clairiere/ecole.habillage.json';
const HABILLAGE_PLACE = 'contenu/habillages/clairiere/ecole-place.habillage.json';
const HABILLAGE_TRACE = 'contenu/habillages/galeries/tracer-cristal.habillage.json';

interface ExerciceLu {
  readonly jeu: { readonly contenu: unknown };
}

function contenuDeLExercice(chemin: string): unknown {
  return lireJson<ExerciceLu>(chemin).jeu.contenu;
}

/**
 * Une action engendrée, telle que le pilote la comprend.
 *
 * `avancerMs` n'est pas une action du moteur : c'est l'ordre donné à l'HORLOGE avant le
 * battement suivant. Sans lui, aucune séquence engendrée n'atteindrait les seuils
 * d'inactivité, de relecture automatique et d'indice différé (D49) — les branches où un
 * défaut ne se voit pas à l'écran.
 */
export type ActionEngendree =
  | { readonly kind: 'moteur'; readonly action: Record<string, unknown> }
  | { readonly kind: 'temps'; readonly avancerMs: number };

export interface CasMoteurPropriete {
  readonly code: string;
  readonly contenu: unknown;
  readonly habillage: string;
  /** Les types d'action que ce moteur déclare, hors socle commun. Audités contre la source. */
  readonly actionsPropres: readonly string[];
  /** Fabrique les actions propres du moteur à partir des pools tirés du contenu. */
  readonly arbitraireActionsPropres: (pool: PoolCibles) => fc.Arbitrary<Record<string, unknown>>;
}

/** Les cibles disponibles pour un moteur : identifiants du contenu, couleurs de l'habillage. */
export interface PoolCibles {
  readonly identifiants: readonly string[];
  readonly couleurs: readonly string[];
}

/** Le socle commun imposé aux quatorze par le contrat des features v2 § 4.8. */
const SOCLE_COMMUN = ['ecouterConsigne', 'demanderAide', 'battementHorloge'] as const;

/** Un identifiant tiré du contenu, ou un identifiant qui n'existe nulle part. */
function arbCible(pool: PoolCibles): fc.Arbitrary<string> {
  return fc.oneof(
    { weight: 4, arbitrary: fc.constantFrom(...pool.identifiants) },
    { weight: 1, arbitrary: fc.constantFrom('cible-qui-nexiste-pas', '', 'é', '../..') },
  );
}

function arbCouleur(pool: PoolCibles): fc.Arbitrary<string> {
  return pool.couleurs.length === 0
    ? fc.constant('couleur-absente')
    : fc.oneof(
        { weight: 4, arbitrary: fc.constantFrom(...pool.couleurs) },
        { weight: 1, arbitrary: fc.constant('couleur-absente') },
      );
}

/** Un point dans le `viewBox`, et parfois franchement dehors. */
const arbPoint: fc.Arbitrary<readonly [number, number]> = fc.tuple(
  fc.integer({ min: -40, max: 240 }),
  fc.integer({ min: -40, max: 240 }),
);

const arbEchantillon = fc
  .tuple(arbPoint, fc.integer({ min: 0, max: 60_000 }))
  .map(([point, instantMs]) => ({ point, instantMs }));

export const CAS_MOTEURS: readonly CasMoteurPropriete[] = [
  {
    code: 'attrape',
    contenu: contenuAttrape,
    habillage: 'contenu/habillages/clairiere/lucioles.habillage.json',
    actionsPropres: ['toucher'],
    arbitraireActionsPropres: (p) => arbCible(p).map((cible) => ({ type: 'toucher', cible })),
  },
  {
    code: 'tri',
    contenu: contenuTri,
    habillage: 'contenu/habillages/clairiere/paniers.habillage.json',
    actionsPropres: ['saisir', 'deposer'],
    arbitraireActionsPropres: (p) =>
      fc.oneof(
        arbCible(p).map((element) => ({ type: 'saisir', element })),
        fc
          .tuple(arbCible(p), arbCible(p))
          .map(([element, receptacle]) => ({ type: 'deposer', element, receptacle })),
      ),
  },
  {
    code: 'assemble',
    contenu: contenuAssemble,
    habillage: 'contenu/habillages/clairiere/collier.habillage.json',
    actionsPropres: ['poser'],
    arbitraireActionsPropres: (p) => arbCible(p).map((bloc) => ({ type: 'poser', bloc })),
  },
  {
    code: 'chemin',
    contenu: contenuChemin,
    habillage: 'contenu/habillages/clairiere/lianes.habillage.json',
    actionsPropres: ['avancer'],
    arbitraireActionsPropres: (p) =>
      arbCible(p).map((caseVisee) => ({ type: 'avancer', caseVisee })),
  },
  {
    code: 'eclair',
    contenu: contenuEclair,
    habillage: 'contenu/habillages/clairiere/luciole.habillage.json',
    actionsPropres: ['repondre', 'finExposition', 'revoirEclair'],
    arbitraireActionsPropres: (p) =>
      fc.oneof(
        arbCible(p).map((option) => ({ type: 'repondre', option })),
        fc.constant({ type: 'finExposition' }),
        fc.constant({ type: 'revoirEclair' }),
      ),
  },
  {
    code: 'paires',
    contenu: contenuPaires,
    habillage: 'contenu/habillages/cite-des-histoires/cartes.habillage.json',
    actionsPropres: ['retourner'],
    arbitraireActionsPropres: (p) => arbCible(p).map((carte) => ({ type: 'retourner', carte })),
  },
  {
    code: 'phrase',
    contenu: contenuPhrase,
    habillage: 'contenu/habillages/clairiere/guirlande.habillage.json',
    actionsPropres: ['placer'],
    arbitraireActionsPropres: (p) =>
      arbCible(p).map((etiquette) => ({ type: 'placer', etiquette })),
  },
  {
    code: 'histoire',
    contenu: contenuHistoire,
    habillage: 'contenu/habillages/clairiere/veillee.habillage.json',
    actionsPropres: ['repondre', 'basculerRecit'],
    arbitraireActionsPropres: (p) =>
      fc.oneof(
        arbCible(p).map((option) => ({ type: 'repondre', option })),
        fc.constant({ type: 'basculerRecit' }),
      ),
  },
  {
    code: 'chrono',
    contenu: contenuChrono,
    habillage: 'contenu/habillages/cite-des-histoires/pellicule.habillage.json',
    actionsPropres: ['numeroter'],
    arbitraireActionsPropres: (p) =>
      arbCible(p).map((vignette) => ({ type: 'numeroter', vignette })),
  },
  {
    code: 'grave',
    contenu: contenuGrave,
    habillage: 'contenu/habillages/foret-muette/buee.habillage.json',
    actionsPropres: ['graver'],
    arbitraireActionsPropres: (p) => arbCible(p).map((lettre) => ({ type: 'graver', lettre })),
  },
  {
    code: 'libre',
    contenu: contenuLibre,
    habillage: 'contenu/habillages/campement/page-blanche.habillage.json',
    actionsPropres: ['choisirCouleur', 'colorier', 'terminer'],
    arbitraireActionsPropres: (p) =>
      fc.oneof(
        arbCouleur(p).map((couleur) => ({ type: 'choisirCouleur', couleur })),
        arbCible(p).map((region) => ({ type: 'colorier', region })),
        fc.constant({ type: 'terminer' }),
      ),
  },
  {
    code: 'colorie',
    contenu: contenuDeLExercice('contenu/exercices/clairiere/ecole-01.json'),
    habillage: HABILLAGE_CLAIRIERE,
    actionsPropres: ['choisirCouleur', 'peindre'],
    arbitraireActionsPropres: (p) =>
      fc.oneof(
        arbCouleur(p).map((couleur) => ({ type: 'choisirCouleur', couleur })),
        arbCible(p).map((region) => ({ type: 'peindre', region })),
      ),
  },
  {
    code: 'place',
    contenu: contenuDeLExercice('contenu/exercices/clairiere/ecole-02-place.json'),
    habillage: HABILLAGE_PLACE,
    actionsPropres: ['saisir', 'glisser', 'deposer', 'abandonner'],
    arbitraireActionsPropres: (p) =>
      fc.oneof(
        arbCible(p).map((element) => ({ type: 'saisir', element })),
        arbPoint.map((point) => ({ type: 'glisser', point })),
        arbPoint.map((point) => ({ type: 'deposer', point })),
        fc.constant({ type: 'abandonner' }),
      ),
  },
  {
    code: 'trace',
    contenu: contenuDeLExercice('contenu/exercices/galeries/miroir-bd-01.json'),
    habillage: HABILLAGE_TRACE,
    actionsPropres: ['commencerGeste', 'prolongerGeste', 'terminerGeste'],
    arbitraireActionsPropres: () =>
      fc.oneof(
        arbEchantillon.map((echantillon) => ({ type: 'commencerGeste', echantillon })),
        arbEchantillon.map((echantillon) => ({ type: 'prolongerGeste', echantillon })),
        fc.constant({ type: 'terminerGeste' }),
      ),
  },
];

// ────────────────────────────────────────────── l'audit des actions, PAR OBJET (D48)

/**
 * Les types d'action que le moteur DÉCLARE dans sa source.
 *
 * Mesuré, jamais affirmé : on lit `partage/src/moteurs/<code>/types.ts` et on relève chaque
 * `readonly type: '…'`. C'est le seul endroit du dépôt où l'union d'actions existe en toutes
 * lettres — et donc la seule population qu'un audit puisse prendre pour référence. Recenser
 * les actions qu'on a pensé à écrire dans la table ci-dessus reviendrait à compter les
 * occurrences au lieu des objets, ce que D48 condamne.
 */
export function actionsDeclarees(code: string): readonly string[] {
  const source = readFileSync(
    join(RACINE_DEPOT, 'partage', 'src', 'moteurs', code, 'types.ts'),
    'utf8',
  );
  const trouves = [...source.matchAll(/readonly type: '([^']+)'/g)].map((m) => m[1] as string);
  return [...new Set(trouves)].sort();
}

/** Les actions que la table de ce fichier prétend couvrir, socle commun inclus. */
export function actionsCouvertes(cas: CasMoteurPropriete): readonly string[] {
  return [...new Set([...cas.actionsPropres, ...SOCLE_COMMUN])].sort();
}

// ──────────────────────────────────────────────────────────────── le pilote

/** Toutes les chaînes d'un contenu, à plat — la réserve d'identifiants plausibles. */
export function chainesDe(valeur: unknown, vues: Set<string> = new Set()): readonly string[] {
  if (typeof valeur === 'string') {
    if (valeur.length > 0 && valeur.length <= 40) vues.add(valeur);
    return [...vues];
  }
  if (Array.isArray(valeur)) {
    for (const item of valeur) chainesDe(item, vues);
    return [...vues];
  }
  if (valeur !== null && typeof valeur === 'object') {
    for (const item of Object.values(valeur)) chainesDe(item, vues);
    return [...vues];
  }
  return [...vues];
}

const POOLS = new Map<string, PoolCibles>();

export function poolDe(cas: CasMoteurPropriete): PoolCibles {
  const deja = POOLS.get(cas.code);
  if (deja !== undefined) return deja;
  const habillage = lireJson<Habillage>(cas.habillage);
  const regions = habillage.scene.calques.flatMap((calque) =>
    calque.regions.map((region) => String(region.id)),
  );
  const pool: PoolCibles = {
    identifiants: [...new Set([...chainesDe(cas.contenu), ...regions])],
    couleurs: [...habillage.palette.nuancier].map(String),
  };
  POOLS.set(cas.code, pool);
  return pool;
}

/** L'arbitraire de séquence : des actions du moteur, mêlées d'ordres donnés à l'horloge. */
export function arbSequence(
  cas: CasMoteurPropriete,
  longueurMax = 40,
): fc.Arbitrary<readonly ActionEngendree[]> {
  const pool = poolDe(cas);
  const propres = cas.arbitraireActionsPropres(pool);
  const socle = fc.constantFrom(...SOCLE_COMMUN).map((type) => ({ type }));
  const inconnue = fc.constant({ type: 'action-qui-nexiste-pas' });
  const moteur: fc.Arbitrary<ActionEngendree> = fc
    .oneof(
      { weight: 6, arbitrary: propres },
      { weight: 3, arbitrary: socle },
      { weight: 1, arbitrary: inconnue },
    )
    .map((action) => ({ kind: 'moteur' as const, action: action as Record<string, unknown> }));
  const temps: fc.Arbitrary<ActionEngendree> = fc
    .integer({ min: 0, max: 90_000 })
    .map((avancerMs) => ({ kind: 'temps' as const, avancerMs }));
  return fc.array(
    fc.oneof({ weight: 5, arbitrary: moteur }, { weight: 1, arbitrary: temps }),
    { maxLength: longueurMax },
  );
}

/**
 * L'action PRINCIPALE de chaque moteur, et le champ qui porte sa cible.
 *
 * Elle sert à une seule propriété, et il faut dire exactement laquelle : « suivre l'aide de
 * Gobi ne coûte jamais une erreur ». On demande l'aide, on lit `aideProposee().cible`, et on
 * joue cette cible avec l'action principale du moteur.
 *
 * ⚠ CE QUE CETTE TABLE NE PRÉTEND PAS. Elle ne prétend PAS que suivre l'aide fait progresser.
 * Mesuré le 2026-08-02 sur les quatorze : jouer la cible de l'aide n'ajoute **aucune** erreur
 * (0 sur 12 moteurs où la cible est jouable), mais ne fait avancer que quatre d'entre eux. La
 * raison est lisible dans la réponse elle-même — au palier `indice`, le code rendu est
 * `relire-consigne`, dont la cible désigne ce qu'il faut SURLIGNER, pas ce qu'il faut jouer.
 * En conclure « le guidage est faux » serait juger un écart à un point de fonctionnement
 * supposé. On garde donc la propriété qui est vraie et opposable — CLAUDE.md, règle non
 * négociable : « l'aide de Gobi ne coûte rien et n'est jamais présentée comme un échec » —
 * et on laisse la question du guidage à `questions-en-attente.md`.
 *
 * `null` = la cible de l'aide n'est pas jouable par une action à un seul champ. Trois cas,
 * tous mesurés et nommés, jamais devinés : `colorie` et `libre` rendent `cible: null` (rien
 * à désigner), `trace` rend un identifiant de TRAIT, qui se joue par un geste et non par une
 * cible. Ces trois-là sont exclus de la propriété, comptés, et imprimés.
 */
export const ACTION_PRINCIPALE: Readonly<
  Record<string, { readonly type: string; readonly champ: string } | null>
> = {
  attrape: { type: 'toucher', champ: 'cible' },
  tri: { type: 'saisir', champ: 'element' },
  assemble: { type: 'poser', champ: 'bloc' },
  chemin: { type: 'avancer', champ: 'caseVisee' },
  eclair: { type: 'repondre', champ: 'option' },
  paires: { type: 'retourner', champ: 'carte' },
  phrase: { type: 'placer', champ: 'etiquette' },
  histoire: { type: 'repondre', champ: 'option' },
  chrono: { type: 'numeroter', champ: 'vignette' },
  grave: { type: 'graver', champ: 'lettre' },
  place: { type: 'saisir', champ: 'element' },
  libre: null,
  colorie: null,
  trace: null,
};

export interface MoteurMonte {
  readonly moteur: MoteurQuelconque;
  readonly etatInitial: unknown;
  readonly contexte: ContexteMoteur;
}

/** Monte le moteur sur son contenu réel, une horloge figée neuve et un `Alea` de graine fixe. */
export function monter(cas: CasMoteurPropriete, graine: number = GRAINE_DE_TEST): MoteurMonte {
  const moteur = obtenirMoteur(cas.code as never);
  const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
  const alea = creerAlea(graine);
  const habillage = lireJson<Habillage>(cas.habillage);
  const etatInitial = moteur.creerEtat({
    contenu: cas.contenu as never,
    habillage,
    alea,
    horloge,
  });
  return { moteur, etatInitial, contexte: { alea, horloge } };
}

export function reduire(
  moteur: MoteurQuelconque,
  etat: unknown,
  action: unknown,
  contexte: ContexteMoteur,
): unknown {
  return (moteur.reduire as (e: unknown, a: unknown, c: ContexteMoteur) => unknown)(
    etat,
    action,
    contexte,
  );
}

export function resumeDe(moteur: MoteurQuelconque, etat: unknown): ResumeTentative {
  return moteur.resume(etat as never);
}

/**
 * Joue la séquence et rend l'état final ainsi que **l'observation à chaque pas**.
 *
 * Les observations sont ce qui permet d'asserter la MONOTONIE : un test qui ne regarde que
 * l'état final ne verrait jamais un compteur qui redescend puis remonte.
 */
export interface Observation {
  readonly nbErreurs: number;
  readonly rangAide: number;
  readonly avancement: number;
  readonly termine: boolean;
  readonly etapeCourante: number;
  readonly etapesTotal: number;
  readonly reussi: boolean;
  readonly dureeMs: number;
}

export function jouer(
  cas: CasMoteurPropriete,
  sequence: readonly ActionEngendree[],
  graine: number = GRAINE_DE_TEST,
): { readonly etatFinal: unknown; readonly observations: readonly Observation[] } {
  const { moteur, etatInitial, contexte } = monter(cas, graine);
  const observations: Observation[] = [observer(moteur, etatInitial)];
  let courant = etatInitial;
  for (const pas of sequence) {
    if (pas.kind === 'temps') {
      contexte.horloge.avancer({ millisecondes: pas.avancerMs });
      continue;
    }
    courant = reduire(moteur, courant, pas.action, contexte);
    observations.push(observer(moteur, courant));
  }
  return { etatFinal: courant, observations };
}

function observer(moteur: MoteurQuelconque, etat: unknown): Observation {
  const resume = resumeDe(moteur, etat);
  const progression = moteur.progression(etat as never);
  return {
    nbErreurs: resume.nbErreurs,
    rangAide: rangAide(resume.aideUtilisee),
    avancement: progression.avancement,
    termine: progression.termine,
    etapeCourante: progression.etapeCourante,
    etapesTotal: progression.etapesTotal,
    reussi: resume.reussi,
    dureeMs: resume.dureeMs,
  };
}
