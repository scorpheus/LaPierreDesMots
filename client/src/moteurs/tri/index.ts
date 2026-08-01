/**
 * Le rendu du moteur `tri` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `tri` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionTri, ContenuTri, EtatTri } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurTri } from './MoteurTri.js';

export const renduTri: MoteurRendu<ContenuTri, EtatTri, ActionTri> = {
  code: 'tri',
  Composant: MoteurTri,
};

export { MoteurTri } from './MoteurTri.js';
