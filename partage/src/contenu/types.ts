/**
 * Les types du contenu : exercice, nœud, compétence.
 *
 * Ils décrivent exactement ce que les schémas JSON du contrat § 9.2 et § 9.6 valident. Le lot
 * L-F **produit des données** conformes à ces types ; le lien n'est pas vérifié par le
 * compilateur mais par `test:contenu` (contrat § 11.3).
 */

import type {
  CodeCompetence,
  CodeMoteur,
  CodeRegion,
  IdExercice,
  IdHabillage,
  IdNoeud,
} from '../identifiants.js';
import type { CodeAideGobi } from '../moteurs/types.js';

/** Les sept familles du référentiel, préfixes des codes de compétence. */
export type FamilleCompetence = 'gph' | 'syl' | 'mot.outil' | 'lex' | 'flu' | 'comp' | 'enc';

export interface Competence {
  readonly code: CodeCompetence;
  readonly libelle: string;
  readonly famille: FamilleCompetence;
  readonly prerequis: readonly CodeCompetence[];
}

/** Les quatre temps d'un nœud, méthode Nintendo — v2 § 5.3. */
export type TempsNoeud = 'presentation' | 'developpement' | 'retournement' | 'maitrise';

export interface Noeud {
  readonly id: IdNoeud;
  readonly region: CodeRegion;
  /** Rang du nœud dans sa région, à partir de 1. */
  readonly ordre: number;
  readonly exercice: IdExercice;
  readonly prerequis: readonly IdNoeud[];
  readonly temps: TempsNoeud;
  /**
   * `false` réserve une fiche technique à une activité libre : elle reste chargeable par son
   * écran dédié, mais ne peut ni composer une sortie, ni compter dans la carte ou le journal.
   * Absent vaut `true`, afin de ne pas changer les nœuds pédagogiques déjà validés.
   */
  readonly progression?: boolean;
}

/** D'où vient la fiche papier dont l'exercice est tiré. Absente pour un contenu original. */
export interface OrigineExercice {
  readonly source: string;
  /** Niveau du cahier d'origine, 1 à 7. */
  readonly niveau: number;
  /** Numéro de fiche dans le niveau, 1 à 15. */
  readonly fiche: number;
}

/** Quels critères d'étoiles cet exercice évalue (contrat § 5.7, v2 § 6.2). */
export interface BaremeEtoiles {
  readonly sansAide: boolean;
  readonly sansErreur: boolean;
}

export interface BlocJeu {
  readonly moteur: CodeMoteur;
  readonly habillage: IdHabillage;
  readonly noeud: IdNoeud;
  readonly etoiles: BaremeEtoiles;
  readonly aideGobi: readonly CodeAideGobi[];
  /**
   * Bloc propre au moteur, `true` (n'importe quoi) pour le schéma d'enveloppe. Il est validé
   * en second temps par `moteur.schemaContenu` — contrat § 9.1. `ContenuColorie` en v1.
   */
  readonly contenu: unknown;
}

export interface Exercice {
  readonly id: IdExercice;
  readonly version: number;
  readonly titre: string;
  readonly origine?: OrigineExercice;
  readonly competences: readonly CodeCompetence[];
  /** 1 à 5. */
  readonly difficulte: number;
  readonly jeu: BlocJeu;
}
