/**
 * La séquence d'ouverture — D35. Elle porte le sens de tout le mécanisme de recoloration :
 * sans elle, le gris est une tristesse ; avec elle, c'est un travail qui attend l'enfant.
 *
 * Tout ce fichier est PUR : des types, aucune valeur, aucune horloge, aucun aléa, aucun DOM.
 */

import type { CheminAsset } from '../identifiants.js';
import type { CleAudio } from '../voix/manifeste.js';

export type CodeTableauOuverture =
  | 'pierre'      // la Pierre se brise
  | 'grisaille'   // ce qui n'a plus de nom perd ses couleurs
  | 'noms'        // toi, tu sais encore lire les noms
  | 'habitants'   // les habitants t'attendent
  | 'appel';      // viens

export interface TableauOuverture {
  readonly code: CodeTableauOuverture;
  /** Relu par `enonceUnePerte` : il dit ce que l'enfant peut rendre, jamais ce qui manque. */
  readonly texte: string;
  readonly cleAudio: CleAudio;
  readonly dureeMs: number;
  readonly asset: CheminAsset;
}

export interface SequenceOuverture {
  readonly tableaux: readonly TableauOuverture[];
  /**
   * **Vaut 0.** D35, point 3 : « passable au tap dès la première seconde ». Le champ existe
   * pour que la valeur soit une donnée relue en revue, et non un `0` perdu dans du JSX.
   */
  readonly passableDesMs: number;
}

/**
 * AJOUT N4 — ce que le serveur sait de la séquence pour un profil.
 *
 * Signalé au rapport comme addition au § 5.8 : le contrat gelé décrit les deux routes
 * `GET`/`POST /api/profils/:id/ouverture` au § 8 et leur donne une réponse
 * (`{ vue, nbRejeux }`) sans nommer le type. Sans lui, le client et le serveur décriraient
 * chacun la même forme — c'est exactement la duplication que la convention C5 interdit.
 *
 * **`vue` n'est jamais une note.** La séquence n'est pas un exercice, rien n'y est évalué
 * (migration `007_ouverture.sql`). `passee` sert au PARENT, pour qu'il sache si l'enfant a
 * regardé le récit ou l'a sauté ; l'enfant n'en voit jamais rien, et rien ne change pour lui.
 */
export interface EtatOuverture {
  readonly vue: boolean;
  readonly passee: boolean;
  readonly nbRejeux: number;
}
