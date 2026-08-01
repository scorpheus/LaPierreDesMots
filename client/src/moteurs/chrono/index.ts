/**
 * Le rendu du moteur `chrono` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `chrono` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionChrono, ContenuChrono, EtatChrono } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurChrono } from './MoteurChrono.js';

export const renduChrono: MoteurRendu<ContenuChrono, EtatChrono, ActionChrono> = {
  code: 'chrono',
  Composant: MoteurChrono,
};

export { MoteurChrono } from './MoteurChrono.js';
