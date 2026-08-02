/**
 * Les types du monde — carte, campement, Gobi. Lot L2-F, contrat des features v2 § 4.5.
 *
 * Ce fichier est recopié À LA LETTRE du contrat gelé : les seize types ci-dessous sont ceux que
 * `partage/src/index.ts` (L2-D) réexporte, et que L2-A, L2-D et L2-H importent. Aucun type n'y
 * est ajouté, aucune VALEUR n'y vit — les valeurs du lot sont dans `gobi.ts`, `campement.ts`,
 * `carte.ts` et `compagnons.ts` (convention C1 : le barillet n'accueille que des types).
 */

import type {
  CheminAsset, CodeRegion, Horodatage, IdNoeud,
} from '../identifiants.js';
import type { CodeCompagnon } from '../pedagogie/types.js';

export type CodeGrapheme = string;
export type IdPointInteraction = string;
export type CodeObjetCampement = string;

// ------------------------------------------------------------------ Gobi (D20, D24, D28)

/**
 * MODIFIÉ N3 — 5 → 10 stades (D43 : « 8 à 10 stades, à petits pas »). Clôt la question Q3.
 *
 * Chaque stade est un changement discret — un cristal de plus, une teinte qui glisse. Le
 * CRISTAL porte l'évolution ; le CORPS ne change jamais (D28, D36).
 *
 * Les cinq codes de la v1 sont CONSERVÉS aux rangs 1, 3, 5, 7 et 10 : les assets existants
 * restent valides, et les cinq séries de production deviennent cinq stades, pas cinq échecs.
 * Ce n'est pas seulement une politesse envers le passé — `stade_gobi.stade_code` n'a aucune
 * contrainte `CHECK` en base, donc renuméroter un code déjà écrit passerait inaperçu.
 */
export type CodeStadeGobi =
  | 'oeuf'            // 1
  | 'fissure'         // 2
  | 'boule'           // 3
  | 'premier-cristal' // 4
  | 'crete'           // 5
  | 'couronne'        // 6
  | 'equipe'          // 7
  | 'besace'          // 8
  | 'veilleur'        // 9
  | 'gardien';        // 10

export interface StadeGobi {
  readonly code: CodeStadeGobi;
  /** Rang, à partir de 1, strictement croissant. C'est lui qui rend l'évolution comparable. */
  readonly rang: number;
  readonly libelle: string;
  /** Nombre de formes (graphèmes maîtrisés) requis pour l'atteindre. */
  readonly formesRequises: number;
  readonly asset: CheminAsset;
}

/**
 * Une forme de Gobi. **Le corps ne change jamais, le cristal porte les déclinaisons** (D20,
 * fiche-personnage § 3) : c'est la règle qui rend 25 variantes productibles de façon cohérente
 * et la collection lisible d'un coup d'œil.
 */
export interface FormeGobi {
  readonly grapheme: CodeGrapheme;
  readonly libelle: string;
  /** Le CRISTAL seul. Jamais un corps complet : sinon la série se disloque. */
  readonly cristal: CheminAsset;
  readonly obtenueLe: Horodatage;
}

export interface EtatGobi {
  readonly stade: CodeStadeGobi;
  readonly formes: readonly FormeGobi[];
  /** La forme portée en ce moment. `null` = crête de base. */
  readonly formeActive: CodeGrapheme | null;
}

/** Les 5 états d'animation de l'addendum § A.2 et de la fiche § 4. */
export type EtatAnimationGobi = 'repos' | 'joie' | 'aide' | 'hesitation' | 'apparition';

// ------------------------------------------------------------------ campement (R11)

export type CodeReaction = 'animation' | 'replique' | 'son' | 'aucune';

export interface PointInteraction {
  readonly id: IdPointInteraction;
  readonly libelle: string;
  readonly reaction: CodeReaction;
  /** Vrai si l'animation n'est portée que par ce point. R11 en exige **au moins 10**. */
  readonly animationUnique: boolean;
  /** Clip de réplique vocale. R11 en exige **au moins 6**. `null` sinon. */
  readonly replique: CheminAsset | null;
  /** Boîte tapable, en unités `viewBox`. Contrôlée contre la règle des 64 px (R16). */
  readonly zone: readonly [number, number, number, number];
}

export interface ObjetCampement {
  readonly code: CodeObjetCampement;
  readonly libelle: string;
  readonly asset: CheminAsset;
  /** La région dont le retour l'a rapporté. */
  readonly region: CodeRegion;
  readonly placeLe: Horodatage | null;
}

export interface AuditCampement {
  readonly nbPoints: number;
  readonly nbAnimationsUniques: number;
  readonly nbRepliques: number;
  /** `nbPoints >= 25 && nbAnimationsUniques >= 10 && nbRepliques >= 6`. */
  readonly conforme: boolean;
  /** Ce qui manque, nommé. Vide quand `conforme`. */
  readonly manques: readonly string[];
}

// ------------------------------------------------------------------ carte (v2 § 3.3, § 9.4)

export interface EtatRegion {
  readonly region: CodeRegion;
  readonly ordre: number;
  readonly ouverte: boolean;
  /** 0 à 1. Le VIDE restant est ce que la carte donne à voir (D25, point 3). */
  readonly pourcentageColorie: number;
  readonly eclatObtenuLe: Horodatage | null;
  readonly compagnon: CodeCompagnon | null;
  readonly noeuds: readonly IdNoeud[];
}

export interface EtatCarte {
  readonly regions: readonly EtatRegion[];
  /** v2 § 3.3 : deux régions restent ouvertes en parallèle **dès la troisième**. */
  readonly ouvertesEnParallele: number;
}

export interface Compagnon {
  readonly code: CodeCompagnon;
  readonly libelle: string;
  readonly valeur: string;
  readonly domaine: string;
  readonly region: CodeRegion;
  readonly asset: CheminAsset;
  readonly rallieLe: Horodatage | null;
}

export interface EtatMonde {
  readonly carte: EtatCarte;
  readonly gobi: EtatGobi;
  readonly compagnons: readonly Compagnon[];
  readonly campement: readonly ObjetCampement[];
}
