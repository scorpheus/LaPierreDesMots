/**
 * Le rendu du moteur `attrape` — lot L2-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie la
 * promesse « zéro ligne de code par habillage » (v2 § 7, contrat v1 § 4.5). Les trois
 * habillages de `attrape` n'ajoutent ni entrée, ni fichier, ni ligne.
 */

import type { ActionAttrape, ContenuAttrape, EtatAttrape } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurAttrape } from './MoteurAttrape.js';

export const renduAttrape: MoteurRendu<ContenuAttrape, EtatAttrape, ActionAttrape> = {
  code: 'attrape',
  Composant: MoteurAttrape,
};

export { MoteurAttrape } from './MoteurAttrape.js';
