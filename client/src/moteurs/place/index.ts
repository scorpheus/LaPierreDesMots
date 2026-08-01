/**
 * Le rendu du moteur `place` — entrée de `registreRendu` (L2-E). Lot L2-C.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (contrat v1 § 4.5). Un habillage `place`
 * neuf n'ajoute aucune entrée, aucun fichier, aucune ligne.
 */

import type { ActionPlace, ContenuPlace, EtatPlace } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurPlace } from './MoteurPlace.js';

export const renduPlace: MoteurRendu<ContenuPlace, EtatPlace, ActionPlace> = {
  code: 'place',
  Composant: MoteurPlace,
};

export { MoteurPlace } from './MoteurPlace.js';
export { ScenePlace, VIEWBOX_PAR_DEFAUT } from './ScenePlace.js';
export type { ProprietesScenePlace } from './ScenePlace.js';
export { Reserve, CIBLE_MINIMALE_PX } from './Reserve.js';
export type { ProprietesReserve } from './Reserve.js';
