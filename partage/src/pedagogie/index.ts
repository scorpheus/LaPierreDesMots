/**
 * Barillet du sous-chemin `@pierre/partage/pedagogie` — lot L2-D.
 *
 * **Ce sous-chemin est SERVEUR** (contrat des features v2 § 4.7) : BKT, Leitner et sélecteur
 * sont décidés au serveur, et les faire entrer dans le bundle client ferait sauter le budget de
 * 250 Ko gzip (v2 § 13.5). Le seul morceau de pédagogie dont le client a besoin en jeu — la
 * table des paires miroir — a son propre sous-chemin, `@pierre/partage/miroir`, précisément
 * pour qu'il n'entraîne pas le reste derrière lui.
 *
 * L2-H importe d'ici `EtatMaitrise` et `estAcquise` (la carte de couverture croise la maîtrise
 * réelle) ; L2-F y prend `CodeCompagnon`. Les moteurs, eux, prennent `ModeReponse`,
 * `AxeMiroir` et `ConfusionObservee` en import RELATIF (`../../pedagogie/types.js`), parce
 * qu'ils vivent dans le même paquet.
 */

export type {
  ModeReponse, AxeMiroir, PaireMiroir, ConfusionObservee,
  ParametresBkt, CritereAcquis, EtatMaitrise, ObservationTentative,
  NumeroBoite, IdItemLeitner, ParametresLeitner, ItemLeitner,
  RoleNoeudSortie, CodeCompagnon, EtapeSortie, PlanSortie,
  ContraintesSelecteur, EntreeSelecteur, NoeudCandidat, ParametresPedagogie,
} from './types.js';

export { PAIRES_MIROIR, axeDeLaPaire, pairesDeLAxe } from './miroir.js';

export { estAcquise, etatMaitriseInitial, mettreAJourMaitrise, pDevinette } from './bkt.js';

export {
  delaiDeBoite, estDue, itemLeitnerInitial, itemsDus, promouvoir, retrograder,
} from './leitner.js';

export { composerSortie, raccourcirSortie } from './selecteur.js';

export { empreinteParametres, lireParametresPedagogie } from './parametres.js';
