/**
 * Surface du moteur `place` — lot L2-C.
 *
 * ⚠ FICHIER ABSENT DU § 3.3 DU CONTRAT GELÉ, ET POURTANT EXIGÉ NOMMÉMENT PAR LUI.
 *
 * Le § 4.7 (additions au barillet, possédé par L2-D) écrit textuellement :
 *   `export type { ContenuPlace, … } from './moteurs/place/index.js';`
 * et le § 5.1 (frontière « L2-C → E ») nomme `./place/index.js` comme chemin d'import de
 * `moteurPlace`. Le § 3.3 ne le liste pas : c'est une omission de listage, pas une décision
 * — sans ce fichier, **le barillet de L2-D ne compile pas** et toute la campagne s'arrête.
 *
 * Le fichier est donc créé, et le rapport de lot le signale comme défaut du contrat, à
 * corriger en un seul endroit (§ 0).
 */

export type {
  IdElement,
  IdZoneCible,
  RelationSpatiale,
  ElementPlacable,
  ZoneCible,
  DepotAttendu,
  ConsignePlace,
  ContenuPlace,
  RefusPlace,
  EtatConsignePlace,
  EtatPlace,
  ActionPlace,
} from './types.js';

export type { MotifRefusPlace, DecisionDepot, SourceZonesPlace } from './validation.js';
export {
  TOLERANCE_DEPOT_PX,
  REFUS_PLACE_COMPTE_ERREUR,
  LEXIQUE_RELATIONS,
  zoneSousLeDoigt,
  evaluerDepot,
  relationDeConsigne,
} from './validation.js';

export { SCHEMA_CONTENU_PLACE } from './schema-contenu.js';
export { moteurPlace, niveauAideGlobal } from './moteur.js';
