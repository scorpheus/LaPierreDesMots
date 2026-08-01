/**
 * Le journal des tentatives — append-only.
 *
 * « Le journal fait foi » (CLAUDE.md) : aucune ligne n'est jamais modifiée ni supprimée, et
 * toute progression se **recalcule** depuis lui. La table `tentatives` du contrat § 6.2 est la
 * traduction en SQL de ces deux types.
 */

import type {
  CodeMoteur,
  Horodatage,
  IdExercice,
  IdHabillage,
  IdNoeud,
  IdProfil,
  IdTentative,
} from '../identifiants.js';
import type { ResumeTentative } from '../moteurs/types.js';

/** 0 à 3. `0` n'est atteint qu'en cas de tentative non terminée : le jeu n'en produit pas. */
export type NombreEtoiles = 0 | 1 | 2 | 3;

/**
 * Ce que le client envoie à `POST /api/tentatives`.
 *
 * `cleIdempotence` vaut `sha256(profil | noeud | demarreLe | graine)` et est calculée par le
 * client : un envoi rejoué renvoie 200 avec `deja = true` et n'insère rien (contrat § 6.3).
 */
export interface TentativeAEnregistrer {
  readonly cleIdempotence: string;
  readonly profil: IdProfil;
  readonly noeud: IdNoeud;
  readonly exercice: IdExercice;
  readonly moteur: CodeMoteur;
  readonly habillage: IdHabillage;
  /** La graine de l'`Alea` de la partie : c'est elle qui rend la tentative rejouable. */
  readonly graine: number;
  readonly demarreLe: Horodatage;
  readonly termineLe: Horodatage;
  /** Le résumé rendu par le moteur. Il porte `reussi`, `nbErreurs`, `aideUtilisee`, les étapes. */
  readonly resume: ResumeTentative;
}

/** Une ligne du journal, telle que le serveur la relit. */
export interface Tentative extends TentativeAEnregistrer {
  readonly id: IdTentative;
  /** Dérivée du résumé par `calculerEtoiles`, jamais envoyée par le client. */
  readonly etoiles: NombreEtoiles;
}
