/**
 * Le rendu du moteur `assemble` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `assemble` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionAssemble, ContenuAssemble, EtatAssemble } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurAssemble } from './MoteurAssemble.js';

export const renduAssemble: MoteurRendu<ContenuAssemble, EtatAssemble, ActionAssemble> = {
  code: 'assemble',
  Composant: MoteurAssemble,
};

export { MoteurAssemble } from './MoteurAssemble.js';
