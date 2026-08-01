/**
 * Le rendu du moteur `grave` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `grave` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionGrave, ContenuGrave, EtatGrave } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurGrave } from './MoteurGrave.js';

export const renduGrave: MoteurRendu<ContenuGrave, EtatGrave, ActionGrave> = {
  code: 'grave',
  Composant: MoteurGrave,
};

export { MoteurGrave } from './MoteurGrave.js';
