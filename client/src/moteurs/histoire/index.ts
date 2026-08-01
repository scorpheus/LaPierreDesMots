/**
 * Le rendu du moteur `histoire` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `histoire` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionHistoire, ContenuHistoire, EtatHistoire } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurHistoire } from './MoteurHistoire.js';

export const renduHistoire: MoteurRendu<ContenuHistoire, EtatHistoire, ActionHistoire> = {
  code: 'histoire',
  Composant: MoteurHistoire,
};

export { MoteurHistoire } from './MoteurHistoire.js';
