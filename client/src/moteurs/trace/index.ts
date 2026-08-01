/**
 * Le rendu du moteur `trace` — entrée de `registreRendu` (L2-E). Lot L2-C.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage (contrat v1 § 4.5).
 */

import type { ActionTrace, ContenuTrace, EtatTrace } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurTrace } from './MoteurTrace.js';

export const renduTrace: MoteurRendu<ContenuTrace, EtatTrace, ActionTrace> = {
  // ÉCART AU CONTRAT GELÉ n° 3 — SOLDÉ à l'intégration : `'trace'` est entré dans l'union
  // `CodeMoteur`, le transtypage provisoire est retiré.
  code: 'trace',
  Composant: MoteurTrace,
};

export { MoteurTrace } from './MoteurTrace.js';
export { GuidageLettre } from './GuidageLettre.js';
export type { ProprietesGuidageLettre } from './GuidageLettre.js';
export { reechantillonner, PAS_ECHANTILLONNAGE } from './echantillonnage.js';
