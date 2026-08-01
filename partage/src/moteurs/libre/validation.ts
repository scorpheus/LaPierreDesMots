/**
 * Validation du moteur `libre` — lot L2-E.
 *
 * **Il n'y en a pas, et c'est le contrat** (§ 4.8) : « `libre` est le seul moteur sans
 * consigne et sans validation : il ne peut pas être raté, c'est sa raison d'être. »
 *
 * Ce fichier existe quand même, pour trois raisons opposables :
 *   1. le § 3.5.1 l'énumère, et un lot ne crée ni ne supprime de fichier de son propre chef ;
 *   2. `REFUS_LIBRE_COMPTE_ERREUR` sur un `Record<never, boolean>` rend l'absence de refus
 *      vérifiable par le compilateur, au lieu de la laisser à une note de bas de page ;
 *   3. `evaluerLibre` donne au réducteur la même forme qu'aux dix autres moteurs.
 */

import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { ContenuLibre, EtatLibre, MotifRefusLibre } from './types.js';
import type { IdRegionSvg } from '../../identifiants.js';
import type { CouleurColoriage } from '../../palette.js';

/**
 * La table des refus, **vide par construction**. `Record<never, boolean>` n'admet aucune clé :
 * ajouter un motif de refus à `libre` ne compilerait pas tant que ce type reste `never`.
 */
export const REFUS_LIBRE_COMPTE_ERREUR: Readonly<Record<MotifRefusLibre, boolean>> = {};

/**
 * Le geste du coloriage libre. Ce n'est pas une réponse : le journal en a besoin d'un, et
 * `colorie` (0,02 en D13) est le mode qui décrit le mieux ce qui se passe à l'écran.
 * Aucune compétence n'étant évaluée, ce mode ne nourrit jamais le BKT.
 */
export function modeReponseLibre(_contenu: ContenuLibre): ModeReponse {
  return 'colorie';
}

export interface DecisionLibre {
  /** **Toujours `true`.** Il n'existe aucun chemin qui rende `false`. */
  readonly acceptee: true;
  readonly motif: null;
  readonly compteErreur: false;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  readonly confusion: ConfusionObservee | null;
  readonly acquis: readonly [string, string] | null;
}

/**
 * Accepte tout ce que le décor porte. Une région inconnue est **ignorée** — pas refusée :
 * ignorer ne fait pas de bruit, refuser en ferait.
 */
export function evaluerLibre(
  etat: EtatLibre,
  region: IdRegionSvg,
  couleur: CouleurColoriage | null,
): DecisionLibre {
  const connue = etat.regions.includes(region) && couleur !== null;
  return {
    acceptee: true,
    motif: null,
    compteErreur: false,
    etapeSatisfaite: false,
    exerciceTermine: false,
    confusion: null,
    acquis: connue ? [region, couleur] : null,
  };
}
