/**
 * Les types de la pédagogie — lot L2-D, contrat des features v2 § 4.4.
 *
 * Ce fichier est reproduit **à la lettre** depuis le contrat gelé : sept autres lots écrivent
 * contre ces signatures. C'est le lot où un défaut ne se voit pas à l'écran (annexe T § 1) :
 * « un ajustement du BKT ou du Leitner ne casse rien visiblement, et la progression est devenue
 * absurde. Personne ne le voit avant trois semaines. »
 *
 * Aucune VALEUR ici : ce fichier ne porte que des types, il disparaît à la compilation.
 */

import type {
  CodeCompetence, CodeRegion, Horodatage, IdHabillage, IdNoeud, IdProfil,
} from '../identifiants.js';

// ------------------------------------------------------------------ modes de réponse (D13)

/**
 * Le mode de réponse d'un item. **C'est lui, et lui seul, qui fixe `p_devinette`** (D13) —
 * jamais une valeur globale. Sans ce paramètre, une série de vrai/faux répondus au hasard fait
 * MONTER la maîtrise estimée et le sélecteur cesse de proposer une compétence non acquise :
 * c'est nommément la « régression pédagogique silencieuse » de l'annexe T § 1.
 */
export type ModeReponse =
  | 'vrai-faux'    // 0,50 — le format dominant des niveaux 1 à 3 du corpus réel
  | 'qcm-3'        // 0,33 — niveaux 3 et 4
  | 'qcm-4'        // 0,25
  | 'place'        // 0,05
  | 'colorie'      // 0,02
  | 'trace'        // le geste : on ne trace pas une lettre par hasard
  | 'saisie'       // 0,01
  | 'ordre'        // 1/n! — CALCULÉ depuis le nombre d'éléments, jamais tabulé
  | 'appariement'; // 1/n!

// ------------------------------------------------------------------ confusions (D23)

/**
 * Les deux axes de confusion miroir. **Ne jamais traiter `b/d/p/q` en bloc** : ce sont deux
 * mécanismes différents, et un enfant peut être gêné par un axe et pas par l'autre
 * (D23, conséquence 1). Le contenu des Galeries, le journal et le dashboard les séparent.
 */
export type AxeMiroir = 'gauche-droite' | 'haut-bas';

export interface PaireMiroir {
  readonly a: string;
  readonly b: string;
  readonly axe: AxeMiroir;
}

/**
 * Une confusion observée, telle qu'un moteur la journalise. Elle porte **toujours** son axe
 * quand elle en a un : une confusion sans axe est agrégeable, une confusion dont l'axe est
 * perdu ne l'est plus.
 */
export interface ConfusionObservee {
  /** Ce que l'enfant devait reconnaître ou produire. */
  readonly attendu: string;
  /** Ce qu'il a rendu. */
  readonly rendu: string;
  /** `null` quand la confusion n'est pas une confusion miroir. */
  readonly axe: AxeMiroir | null;
  readonly competence: CodeCompetence;
}

// ------------------------------------------------------------------ BKT (v2 § 12.2 + D13)

export interface ParametresBkt {
  readonly pInit: number;
  readonly pTransit: number;
  readonly pGlissement: number;
  /**
   * Par mode de réponse. `null` pour `ordre` et `appariement` : leur valeur est **calculée**
   * (`1/n!`) et ne peut pas être tabulée sans connaître le nombre d'éléments.
   */
  readonly pDevinette: Readonly<Record<ModeReponse, number | null>>;
  /** Une tentative avec aide de Gobi pèse 0,4 (v2 § 12.2). */
  readonly poidsAvecAide: number;
}

export interface CritereAcquis {
  readonly seuilP: number;
  readonly tentativesMin: number;
  readonly joursDistinctsMin: number;
  /**
   * **La clause de D13, qui compte autant que les valeurs.** Un item à forte devinette ne
   * suffit jamais seul à établir une maîtrise : il faut au moins deux tentatives à
   * `p_devinette <= seuilFaibleDevinette` avant tout acquis. Sans elle, une série de vrai/faux
   * chanceux fait franchir le seuil.
   */
  readonly tentativesFaibleDevinetteMin: number;
  readonly seuilFaibleDevinette: number;
}

export interface EtatMaitrise {
  readonly competence: CodeCompetence;
  /** Probabilité de maîtrise, dans [0, 1] — invariant vérifié par propriété. */
  readonly p: number;
  readonly nbTentatives: number;
  /** Dates ISO `YYYY-MM-DD`, distinctes, triées. */
  readonly joursDistincts: readonly string[];
  readonly nbTentativesFaibleDevinette: number;
  /** **Ne repasse JAMAIS à `null`.** Un acquis n'est jamais repris (v2 § 5.4, R14). */
  readonly acquiseLe: Horodatage | null;
}

export interface ObservationTentative {
  readonly competence: CodeCompetence;
  readonly reussi: boolean;
  readonly modeReponse: ModeReponse;
  /** Nombre d'éléments, pour `ordre` et `appariement`. `null` pour les autres modes. */
  readonly nbElements: number | null;
  readonly avecAide: boolean;
  readonly instant: Horodatage;
}

// ------------------------------------------------------------------ Leitner (v2 § 12.2)

export type NumeroBoite = 1 | 2 | 3 | 4 | 5;
export type IdItemLeitner = string;

export interface ParametresLeitner {
  /** J+1 / J+3 / J+7 / J+16 / J+35, dans cet ordre, indexés par boîte. */
  readonly delaisJours: readonly [number, number, number, number, number];
  readonly boiteApresEchec: NumeroBoite;
}

export interface ItemLeitner {
  readonly item: IdItemLeitner;
  readonly boite: NumeroBoite;
  readonly derniereRevueLe: Horodatage;
  readonly echeanceLe: Horodatage;
  readonly nbRevues: number;
}

// ------------------------------------------------------------------ sélecteur (v2 § 5.2)

/** Les cinq rôles du trajet de sortie de la v2 § 5.2, dans l'ordre. */
export type RoleNoeudSortie =
  | 'echauffement'          // réussite quasi certaine, TOUJOURS en ouverture
  | 'competence-en-cours'
  | 'revision'              // SRS — au nœud 3, jamais en ouverture ni en clôture
  | 'nouveaute'
  | 'synthese';             // défi de synthèse, TOUJOURS en clôture, TOUJOURS réussi

export type CodeCompagnon = 'filou' | 'bulle' | 'roc' | 'plume';

export interface EtapeSortie {
  /** Rang dans la sortie, à partir de 1. */
  readonly rang: number;
  readonly role: RoleNoeudSortie;
  readonly noeud: IdNoeud;
  readonly habillage: IdHabillage;
  readonly competences: readonly CodeCompetence[];
  /** Items Leitner injectés dans cette étape. Vide sauf au rang de révision. */
  readonly revisions: readonly IdItemLeitner[];
}

export interface PlanSortie {
  readonly profil: IdProfil;
  readonly region: CodeRegion;
  readonly compagnon: CodeCompagnon | null;
  readonly etapes: readonly EtapeSortie[];
  readonly composeeLe: Horodatage;
}

export interface ContraintesSelecteur {
  readonly nbNoeudsMin: number;
  readonly nbNoeudsMax: number;
  /** v2 § 12.1 : aucune compétence dont un prérequis est sous ce seuil. */
  readonly seuilPrerequis: number;
  /** R13 : jamais deux fois le même habillage dans une sortie. */
  readonly habillageUniqueParSortie: boolean;
  /** v2 § 12.2 : rang réservé aux révisions dues. */
  readonly rangRevision: number;
}

export interface EntreeSelecteur {
  readonly profil: IdProfil;
  readonly region: CodeRegion;
  readonly compagnon: CodeCompagnon | null;
  readonly maitrises: readonly EtatMaitrise[];
  readonly revisionsDues: readonly ItemLeitner[];
  readonly noeudsDisponibles: readonly NoeudCandidat[];
  readonly competences: readonly import('../contenu/types.js').Competence[];
  readonly maintenant: Horodatage;
}

export interface NoeudCandidat {
  readonly noeud: IdNoeud;
  readonly habillage: IdHabillage;
  readonly region: CodeRegion;
  readonly competences: readonly CodeCompetence[];
  readonly difficulte: number;
  readonly temps: import('../contenu/types.js').TempsNoeud;
}

/** Tout le paramétrage pédagogique, tel qu'il est lu depuis les données (C2). */
export interface ParametresPedagogie {
  readonly bkt: ParametresBkt;
  readonly acquis: CritereAcquis;
  readonly leitner: ParametresLeitner;
  readonly selecteur: ContraintesSelecteur;
}
