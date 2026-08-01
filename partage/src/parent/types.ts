/**
 * Types du dashboard parent — contrat des features v2 § 4.6 (lot L2-H).
 *
 * Les huit types du contrat gelé sont repris à la lettre. Ils sont effacés à la compilation,
 * ce qui est la condition posée par C1 pour que le barillet `@pierre/partage` (possédé par
 * L2-D) puisse les réexporter sans peser sur le budget de 250 Ko.
 *
 * S'y ajoutent **un en-tête HTTP et deux formes de corps** qui n'appartiennent qu'à la zone
 * parent. Ils sont ici et non dans `api/contrats.ts` pour une raison de frontière : le barillet
 * racine n'accueille que des types (C1) et il appartient à L2-D. Une valeur posée là dépendrait
 * d'un autre lot pour atteindre le client. Par le sous-chemin `@pierre/partage/parent` — chargé
 * en chunk différé, jamais dans le bundle de l'enfant — elle n'en dépend pas.
 */

import type { CodeCompetence, CodeRegion, Horodatage, IdExercice } from '../identifiants.js';
import type { AxeMiroir } from '../pedagogie/types.js';

/**
 * Un point de la courbe de latence de reconnaissance.
 * **C'est l'indicateur principal du dashboard** (D18, conséquence 2) : « la lenteur est une
 * donnée à suivre, pas un défaut à corriger de front ». Médiane et quartiles, jamais la
 * moyenne : une seule session distraite déplace une moyenne et ne dit rien.
 */
export interface PointLatence {
  readonly jour: string;
  readonly competence: CodeCompetence;
  readonly medianeMs: number;
  readonly q1Ms: number;
  readonly q3Ms: number;
  readonly nbMesures: number;
}

/**
 * Une ligne du top 10 des confusions.
 *
 * **`axe` n'est jamais `null` dans cette table, et une ligne n'agrège jamais deux axes** (D23).
 * Une confusion sans axe identifiable n'entre pas au top 10 : elle serait ininterprétable, et
 * la mélanger aux autres détruirait précisément l'information que D23 demande de produire.
 */
export interface ConfusionAgregee {
  readonly attendu: string;
  readonly rendu: string;
  readonly axe: AxeMiroir;
  readonly nbOccurrences: number;
  readonly latenceMedianeMs: number;
  /** Pente sur 14 jours. Négative = **la courbe descend**, c'est ce qu'on veut voir (D23). */
  readonly tendance14j: number;
  /** Ce que « travailler ça » injectera en priorité dans la prochaine sortie (v2 § 14). */
  readonly competences: readonly CodeCompetence[];
}

/** Une région de la carte, annotée par la maîtrise RÉELLE — repère le colorié mal acquis. */
export interface CouvertureRegion {
  readonly region: CodeRegion;
  readonly pourcentageColorie: number;
  readonly maitriseMoyenne: number;
  readonly competencesAcquises: number;
  readonly competencesTotal: number;
  /** Vrai quand `pourcentageColorie` dépasse nettement `maitriseMoyenne` : le drapeau utile. */
  readonly colorieMaisFragile: boolean;
}

export type StatutRelecture = 'en-attente' | 'valide' | 'rejete';

export interface EntreeRelecture {
  readonly exercice: IdExercice;
  readonly chemin: string;
  readonly statut: StatutRelecture;
  readonly deposeeLe: Horodatage;
  readonly traiteeLe: Horodatage | null;
  readonly motif: string | null;
}

export interface VerrouParent {
  readonly nbEchecs: number;
  readonly verrouilleJusqua: Horodatage | null;
}

export interface ResumeDashboard {
  readonly latences: readonly PointLatence[];
  readonly confusions: readonly ConfusionAgregee[];
  readonly couverture: readonly CouvertureRegion[];
  readonly relecture: readonly EntreeRelecture[];
}

export type CodeExport = 'tentatives' | 'etapes' | 'maitrise' | 'confusions' | 'latences';

/** Les cinq exports, dans l'ordre où le dashboard les propose. */
export const CODES_EXPORT: readonly CodeExport[] = [
  'tentatives',
  'etapes',
  'maitrise',
  'confusions',
  'latences',
];

/**
 * En-tête qui porte le jeton de la zone parent.
 *
 * **Un en-tête, jamais un paramètre d'URL** : les URL passent dans les journaux du serveur et
 * dans l'historique du navigateur. `Authorization: Bearer <jeton>` est accepté en repli, pour
 * qu'un outil de diagnostic générique fonctionne sans configuration.
 */
export const ENTETE_JETON_PARENT = 'x-jeton-parent';

/** Réponse de `POST /api/parent/ouvrir` quand le code est juste. */
export interface OuvertureParent {
  readonly jeton: string;
  /** Instant d'expiration du jeton, ISO 8601 UTC. */
  readonly expireLe: Horodatage;
}

/** Corps de `POST /api/parent/relecture/:exercice`. Aucun autre statut n'est acceptable :
 *  « en-attente » est l'état de départ, pas une décision. */
export interface DecisionRelecture {
  readonly statut: 'valide' | 'rejete';
  readonly motif?: string;
}
