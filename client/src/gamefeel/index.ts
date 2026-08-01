// Surface du dossier `gamefeel/` — lot L2-A.
//
// Un seul point d'entrée pour les cinq modules, pour que la règle « aucun composant n'appelle
// l'audio ni la vibration directement » soit lisible au niveau des imports : ce qu'on importe
// ici, c'est `RetourSensoriel`, jamais un fournisseur.

export type { RetourSensoriel, OptionsDepot, OptionsRetour } from './retour.js';
export { creerRetourSensoriel } from './retour.js';

export type { OptionsHaptique } from './haptique-navigateur.js';
export { creerHaptiqueNavigateur, creerHaptiqueMuette } from './haptique-navigateur.js';

export type { OptionsParticules } from './particules.js';
export {
  PARTICULES_MAX,
  ATTRIBUT_COMPTE,
  COULEUR_PARTICULES,
  DUREE_PARTICULES_MS,
  emettreParticules,
  enregistrerCanevas,
  emettreSurCanevasCourant
} from './particules.js';

export { PLAFOND_DEMI_TONS, demiTonsDeSerie } from './serie.js';

export type { ResultatAimantation } from './aimantation.js';
export { AIMANTATION_PX, OVERSHOOT, aimanter } from './aimantation.js';

export type { ImagesCles, TransitionRessort } from './ressort.js';
export {
  RESSORT,
  DUREES,
  ECHELLE_APPUI,
  ECHELLE_RELACHEMENT,
  OSCILLATION_REFUS_PX,
  COURBE_RECOLORATION,
  transitionRessort,
  imagesClesAppui,
  imagesClesRelachement,
  imagesClesDepot,
  imagesClesRefus
} from './ressort.js';
