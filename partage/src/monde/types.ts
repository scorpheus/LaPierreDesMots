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
 * Les stades d'évolution. **PLACEHOLDER assumé** : D28 laisse ouvert « combien de stades ».
 * Cinq est retenu parce que les cinq séries de production existantes deviennent alors cinq
 * stades plutôt que cinq échecs (D28, point 1). À valider — voir § 9, question Q3.
 */
export type CodeStadeGobi = 'oeuf' | 'boule' | 'crete' | 'equipe' | 'gardien';

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
