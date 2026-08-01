/**
 * Le rendu du moteur `chemin` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `chemin` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionChemin, ContenuChemin, EtatChemin } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurChemin } from './MoteurChemin.js';

export const renduChemin: MoteurRendu<ContenuChemin, EtatChemin, ActionChemin> = {
  code: 'chemin',
  Composant: MoteurChemin,
};

export { MoteurChemin } from './MoteurChemin.js';
