/**
 * Le rendu du moteur `libre` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `libre` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionLibre, ContenuLibre, EtatLibre } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurLibre } from './MoteurLibre.js';

export const renduLibre: MoteurRendu<ContenuLibre, EtatLibre, ActionLibre> = {
  code: 'libre',
  Composant: MoteurLibre,
};

export { MoteurLibre } from './MoteurLibre.js';
