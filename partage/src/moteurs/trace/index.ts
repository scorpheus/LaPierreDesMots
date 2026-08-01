/**
 * Surface du moteur `trace` — lot L2-C.
 *
 * ⚠ FICHIER ABSENT DU § 3.3 DU CONTRAT GELÉ, ET POURTANT EXIGÉ NOMMÉMENT PAR LUI —
 * même situation que `place/index.ts`, même motif : le § 4.7 écrit
 * `export type { ContenuTrace, … } from './moteurs/trace/index.js';` et le § 5.1 nomme
 * `./trace/index.js` comme chemin d'import de `moteurTrace`. Signalé au rapport.
 */

export type {
  IdTrait,
  CasseLettre,
  TraitLettre,
  ModeleLettre,
  ContenuTrace,
  EchantillonGeste,
  EtatTrait,
  EtatTrace,
  RefusTrace,
  ActionTrace,
} from './types.js';

export type { MotifRefusTrace, DecisionTrait } from './validation.js';
export {
  TOLERANCE_TRACE_PX,
  COUVERTURE_MINIMALE,
  REFUS_TRACE_COMPTE_ERREUR,
  couvertureOrientee,
  refleterPoints,
  evaluerTrait,
  sensRespecte,
  axeConfondu,
} from './validation.js';

export { SCHEMA_CONTENU_TRACE } from './schema-contenu.js';
export { moteurTrace } from './moteur.js';
