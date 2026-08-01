/**
 * Barillet du sous-chemin `@pierre/partage/parent` — lot L2-H.
 *
 * Chargé en **chunk différé** côté client (contrat § 4.7) : le dashboard n'existe qu'une fois
 * le code parent saisi, et rien de ce dossier n'a de raison d'entrer dans le bundle initial de
 * 250 Ko que l'enfant télécharge.
 */

export type {
  CodeExport,
  ConfusionAgregee,
  CouvertureRegion,
  DecisionRelecture,
  EntreeRelecture,
  OuvertureParent,
  PointLatence,
  ResumeDashboard,
  StatutRelecture,
  VerrouParent,
} from './types.js';

export { CODES_EXPORT, ENTETE_JETON_PARENT } from './types.js';

export {
  DUREE_VERROU_MS,
  ECART_ALERTE_COUVERTURE,
  ECHECS_AVANT_VERROU,
  LIMITE_TOP_CONFUSIONS,
  agregerConfusions,
  agregerLatences,
  croiserCouverture,
  jourEnNombre,
  mediane,
  quartiles,
  tendance,
} from './indicateurs.js';
