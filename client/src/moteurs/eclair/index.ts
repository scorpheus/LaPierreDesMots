/**
 * Le rendu du moteur `eclair` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `eclair` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionEclair, ContenuEclair, EtatEclair } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurEclair } from './MoteurEclair.js';

export const renduEclair: MoteurRendu<ContenuEclair, EtatEclair, ActionEclair> = {
  code: 'eclair',
  Composant: MoteurEclair,
};

export { MoteurEclair } from './MoteurEclair.js';
