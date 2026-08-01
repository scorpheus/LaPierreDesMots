/**
 * Barillet du sous-chemin `@pierre/partage/monde` — lot L2-F.
 *
 * Ce sous-chemin est **chargé par le client** (contrat des features v2 § 4.7) : la carte et le
 * campement calculent leur état à l'écran. Il ne doit donc contenir que de la logique pure —
 * aucun Ajv, aucun accès disque, aucune dépendance lourde. Le référentiel arrive en argument,
 * lu par le serveur ou par un `fetch` d'asset ; ce module ne l'ouvre jamais lui-même.
 *
 * Les seize TYPES du § 4.5 passent aussi par `@pierre/partage` (L2-D les réexporte). Les neuf
 * VALEURS, elles, n'y passent pas : convention C1, le barillet racine n'accueille aucune valeur.
 */

export type {
  CodeGrapheme, IdPointInteraction, CodeObjetCampement,
  CodeStadeGobi, StadeGobi, FormeGobi, EtatGobi, EtatAnimationGobi,
  CodeReaction, PointInteraction, ObjetCampement, AuditCampement,
  EtatRegion, EtatCarte, Compagnon, EtatMonde,
} from './types.js';

export type { DocumentStadesGobi, FormeDeclaree } from './gobi.js';
export {
  ajouterForme, formesDuDocument, gobiInitial, prochainStade, stadeApresFormes, stadesDuDocument,
} from './gobi.js';

export type { DocumentCampement, ObjetDeclare } from './campement.js';
export {
  R11_ANIMATIONS_UNIQUES_MIN, R11_POINTS_MIN, R11_REPLIQUES_MIN,
  auditerCampement, campementDuDocument, objetsDuDocument, pointsDuDocument, sceneDuDocument,
} from './campement.js';

export type { DefinitionRegion, DocumentRegions, EtatAfficheRegion } from './carte.js';
export {
  appliquerEclat, carteInitiale, etatAfficheRegion, ouvrirCeQuiDoitLEtre, paralleleDuDocument,
  recalculerRecoloration, regionsDuDocument, regionsOuvertes,
} from './carte.js';

export type { DefinitionCompagnon } from './compagnons.js';
export {
  compagnonDeLaRegion, compagnonParRegion, compagnonsDuDocument, compagnonsDuProfil,
  moteursFavorises,
} from './compagnons.js';
