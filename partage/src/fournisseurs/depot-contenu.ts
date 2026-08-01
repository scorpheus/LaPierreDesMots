/**
 * Accès au contenu, derrière une interface — annexe T § 2.3.
 *
 * Deux implantations : `serveur/src/services/depot-contenu-disque.ts` (lot L-C) lit `contenu/`
 * sur le disque, `DepotContenuMemoire` (`@pierre/partage/factices`) sert des fixtures. Aucun
 * autre code n'ouvre un fichier de contenu : c'est ce qui permet à toute la suite de tests de
 * tourner sans système de fichiers.
 *
 * ⚠ **Le contrat gelé nomme `DepotContenu` (§ 11.1) sans en donner les membres.** Les noms
 * ci-dessous sont ceux que le lot L-C a effectivement écrits dans son implantation et dans
 * `serveur/src/routes/contenu.ts` : `chargerExercice`, `chargerNoeud`, `chargerHabillage`,
 * `listerNoeuds`, `listerExercices`, `lireAsset`. Aligner l'interface sur eux évite de faire
 * réécrire un fichier d'un autre lot pour une divergence que le contrat n'a jamais tranchée.
 * Signalé au rapport : c'est un trou du contrat, pas une préférence.
 *
 * Deux conséquences de forme, elles aussi reprises de L-C :
 * - une ressource absente rend `null`, elle ne lève pas — le serveur en fait un 404 sans
 *   attraper d'exception ;
 * - `lireAsset` rend des **octets**, parce qu'un SVG part tel quel sur le réseau et qu'un jour
 *   un asset ne sera pas du texte.
 */

import type {
  CheminAsset,
  IdExercice,
  IdHabillage,
  IdNoeud,
} from '../identifiants.js';
import type { Competence, Exercice, Noeud } from '../contenu/types.js';
import type { Habillage } from '../moteurs/types.js';

export interface DepotContenu {
  /** `null` si l'identifiant n'existe pas. */
  chargerExercice(id: IdExercice): Promise<Exercice | null>;
  /** `null` si l'identifiant n'existe pas. */
  chargerNoeud(id: IdNoeud): Promise<Noeud | null>;
  /** `null` si l'identifiant n'existe pas. */
  chargerHabillage(id: IdHabillage): Promise<Habillage | null>;
  listerNoeuds(): Promise<readonly Noeud[]>;
  listerExercices(): Promise<readonly Exercice[]>;
  /** Octets de l'asset, `null` s'il est absent. C'est le contrôle 3 de `test:contenu`. */
  lireAsset(chemin: CheminAsset): Promise<Uint8Array | null>;
  /**
   * Facultatif : tous les dépôts n'ont pas le référentiel sous la main. Déclaré ici pour que
   * la capacité existe, optionnel pour ne rien casser chez qui ne l'expose pas.
   */
  listerCompetences?(): Promise<readonly Competence[]>;
}
