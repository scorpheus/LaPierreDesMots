/**
 * Le rendu du moteur `phrase` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `phrase` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionPhrase, ContenuPhrase, EtatPhrase } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurPhrase } from './MoteurPhrase.js';

export const renduPhrase: MoteurRendu<ContenuPhrase, EtatPhrase, ActionPhrase> = {
  code: 'phrase',
  Composant: MoteurPhrase,
};

export { MoteurPhrase } from './MoteurPhrase.js';
