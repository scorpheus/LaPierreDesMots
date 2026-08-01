/**
 * Surface du socle commun des moteurs — lot L2-C.
 *
 * C'est le point d'import unique des onze moteurs de L2-E (contrat gelé § 5.1, ligne
 * « L2-C → E ») : `import { … } from '../commun/index.js'`. Un moteur qui importe un
 * sous-fichier directement contourne cette surface et se prive de la garantie que le socle
 * ne bougera pas sous lui.
 *
 * Chemin relatif, jamais un sous-chemin de paquet : `commun/` est INTERNE à `partage/` et
 * n'a pas d'entrée dans `partage/package.json` (§ 4.7). C1 est respectée sans effort — les
 * seules valeurs exportées ici sont les fonctions du socle, qui entrent de toute façon dans
 * le bundle par les moteurs eux-mêmes.
 */

export type { DelaisAide } from './delais.js';
export { DELAIS_AIDE_PAR_DEFAUT } from './delais.js';

export type { EtatAidable } from './aide.js';
export {
  RANG_AIDE,
  aideLaPlusHaute,
  niveauAideSuivant,
  doitRelire,
  relecturesDues,
  construireAide,
} from './aide.js';

export type { EtapeGenerique } from './etapes.js';
export { progressionDepuisEtapes, resumeEtapeDepuis, resumeDepuisEtapes } from './etapes.js';

export type { Point, Polygone } from './geometrie.js';
export {
  distance,
  pointDansPolygone,
  centroide,
  aire,
  plusProcheSousTolerance,
} from './geometrie.js';
