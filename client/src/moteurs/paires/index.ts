/**
 * Le rendu du moteur `paires` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `paires` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionPaires, ContenuPaires, EtatPaires } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurPaires } from './MoteurPaires.js';

export const renduPaires: MoteurRendu<ContenuPaires, EtatPaires, ActionPaires> = {
  code: 'paires',
  Composant: MoteurPaires,
};

export { MoteurPaires } from './MoteurPaires.js';
