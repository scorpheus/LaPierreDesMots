/**
 * L'interface `Moteur` et le type `Habillage` — contrat technique v1 § 4.1.
 *
 * Ce fichier est reproduit **à la lettre** depuis le contrat gelé : sept lots écrivent contre
 * ces signatures. Voir en particulier la note sur la syntaxe de méthode de `Moteur`.
 */

import type { Alea } from '../alea.js';
import type { Horloge } from '../horloge.js';
import type { CheminAsset, CodeMoteur, CodeRegion, IdHabillage, IdRegionSvg } from '../identifiants.js';
import type { CouleurColoriage, JetonCouleur } from '../palette.js';
import type { CodeEffet } from '../fournisseurs/audio.js';
import type { ConfusionObservee, ModeReponse } from '../pedagogie/types.js';

/** Un schéma JSON 2020-12, transporté sans être typé plus finement. */
export type SchemaJson = Record<string, unknown>;

/** Les trois paliers de la v2 § 5.4. `indice` = Gobi parle ; `demonstration` = la cible s'anime. */
export type NiveauAide = 'aucune' | 'indice' | 'demonstration';

export type CodeAideGobi =
  | 'relire-consigne'
  | 'souffle-syllabe'
  | 'surligne-graphene'
  | 'montre-cible'
  | 'montre-couleur';

export interface AideProposee {
  readonly niveau: Exclude<NiveauAide, 'aucune'>;
  readonly code: CodeAideGobi;
  /** Identifiant de l'élément à surligner ou animer (une `IdRegionSvg` pour `colorie`). */
  readonly cible: string | null;
  /** Texte à faire dire par la voix. Jamais affiché seul (R15). */
  readonly texte: string | null;
}

export interface CapacitesMoteur {
  /** `true` si les étapes se jouent dans l'ordre du contenu. */
  readonly ordreEtapesImpose: boolean;
  /** `true` si le moteur recolorie le décor pendant qu'on joue. */
  readonly recolorieLeDecor: boolean;
  readonly nbEtapesMax: number;
}

export interface ProgressionMoteur {
  /** 0 à 1 inclus. */
  readonly avancement: number;
  readonly termine: boolean;
  /** Index 0-based de l'étape en cours. */
  readonly etapeCourante: number;
  readonly etapesTotal: number;
}

export interface ResumeEtape {
  readonly identifiant: string;
  readonly nbErreurs: number;
  readonly aideUtilisee: NiveauAide;
  readonly nbEcoutes: number;
  readonly dureeMs: number;
  /** Le mode de réponse de cette étape — c'est lui qui fixe `p_devinette` (D13). */
  readonly modeReponse: ModeReponse;
  /**
   * Latence de reconnaissance : de l'apparition de l'item à la bonne réponse.
   * **C'est l'indicateur principal du dashboard** (D18, v2 § 12.3). `null` quand l'étape n'a
   * pas de point d'apparition net (un coloriage libre, par exemple).
   */
  readonly latenceMs: number | null;
  /** La confusion observée, avec son AXE quand il y en a un (D23). `null` si aucune. */
  readonly confusion: ConfusionObservee | null;
  /**
   * ─────────────────────────────────────────────────────────────────────────────────────
   * AJOUT SIGNALÉ AU CONTRAT GELÉ (§ 4.4) — champ FACULTATIF, donc sans effet sur les lots
   * qui ne le posent pas.
   *
   * Les modes `ordre` et `appariement` calculent `p_devinette = 1/n!` depuis le nombre
   * d'éléments (D13). Ce nombre n'est connu QUE du moteur — `chrono` et `paires` (L2-E) —, et
   * `ResumeEtape` tel que le contrat le fige ne le transporte pas. Sans lui, `pDevinette`
   * lève sur ces deux modes et deux moteurs sur treize cessent d'alimenter le BKT, en
   * silence. Le champ est donc ajouté ici plutôt qu'une valeur par défaut inventée au
   * serveur — « refuser plutôt qu'émettre du faux ».
   * ─────────────────────────────────────────────────────────────────────────────────────
   */
  readonly nbElements?: number | null;
}

export interface ResumeTentative {
  /** Toujours `true` à la fin : règle de non-échec (v2 § 5.4, R14). */
  readonly reussi: boolean;
  readonly nbErreurs: number;
  readonly aideUtilisee: NiveauAide;
  readonly dureeMs: number;
  readonly etapes: readonly ResumeEtape[];
}

export interface EntreeMoteur<C> {
  readonly contenu: C;
  readonly habillage: Habillage;
  readonly alea: Alea;
  readonly horloge: Horloge;
}

export interface ContexteMoteur {
  readonly alea: Alea;
  readonly horloge: Horloge;
}

/**
 * Le contrat entre une mécanique, son habillage déclaratif et son contenu JSON.
 *
 * IMPORTANT — les cinq membres ci-dessous sont déclarés en **syntaxe de méthode**
 * (`creerEtat(...)`, pas `creerEtat: (...) => ...`). TypeScript compare alors leurs
 * paramètres de façon bivariante, ce qui rend `Moteur<ContenuColorie, EtatColorie,
 * ActionColorie>` assignable à `MoteurQuelconque`. Déclaré en propriété-fonction, le
 * registre ne compile plus. Ne pas changer la forme.
 */
export interface Moteur<C, E, A> {
  readonly code: CodeMoteur;
  readonly version: number;
  readonly capacites: CapacitesMoteur;
  /** Schéma du bloc `jeu.contenu`. Validation en deux temps, § 9.1. */
  readonly schemaContenu: SchemaJson;

  creerEtat(entree: EntreeMoteur<C>): E;
  reduire(etat: E, action: A, contexte: ContexteMoteur): E;
  progression(etat: E): ProgressionMoteur;
  aideProposee(etat: E): AideProposee | null;
  resume(etat: E): ResumeTentative;
}

export type MoteurQuelconque = Moteur<unknown, unknown, unknown>;

// ---------------------------------------------------------------- habillage

export type RoleCalque = 'fond' | 'decor' | 'coloriable' | 'trait' | 'animation';

export interface RegionColoriable {
  /** `id` du `<path>` dans le SVG. */
  readonly id: IdRegionSvg;
  /** « le toit de l'école » — sert à l'aide vocale et au libellé a11y. */
  readonly libelle: string;
  /** Centroïde en coordonnées `viewBox`, pour la tolérance de tap (§ 5.2). */
  readonly centroide: readonly [number, number];
  /** Aire en unités `viewBox`, contrôlée contre R16. */
  readonly surface: number;
}

export interface CalqueHabillage {
  /** `id` du `<g>` dans le SVG. */
  readonly id: string;
  readonly role: RoleCalque;
  readonly regions: readonly RegionColoriable[];
}

export interface SceneHabillage {
  readonly fichier: CheminAsset;
  readonly viewBox: string;
  readonly calques: readonly CalqueHabillage[];
}

export interface VariantePalette {
  /** Surcharges des jetons v2 § 9.2. `trait` et `parchemin` ne se surchargent jamais. */
  readonly jetons: Partial<Record<JetonCouleur, string>>;
  /** Les couleurs offertes à l'enfant par cet habillage. */
  readonly nuancier: readonly CouleurColoriage[];
}

export interface TimingsHabillage {
  readonly appuiMs: number;
  readonly relachementMs: number;
  readonly refusMs: number;
  readonly recolorationMs: number;
  readonly interEtoilesMs: number;
}

export interface SonsHabillage {
  readonly ambiance: string | null;
  readonly effets: Partial<Record<CodeEffet, string>>;
}

/**
 * Un habillage est **entièrement déclaratif** : un SVG en calques plus ce JSON.
 * Ajouter un habillage ne doit demander aucune ligne de code (v2 § 7).
 */
export interface Habillage {
  readonly id: IdHabillage;
  /** Moteurs déclarés compatibles. `test:contenu` vérifie l'appartenance. */
  readonly moteurs: readonly CodeMoteur[];
  readonly libelle: string;
  readonly region: CodeRegion;
  readonly scene: SceneHabillage;
  readonly palette: VariantePalette;
  readonly timings: TimingsHabillage;
  readonly sons: SonsHabillage;
}
