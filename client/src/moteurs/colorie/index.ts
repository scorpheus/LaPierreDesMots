/**
 * Le rendu du moteur `colorie` — seule entrée de `registreRendu` (L-D). Lot L-E.
 *
 * `registreRendu` est indexé par MOTEUR, jamais par habillage : c'est ici que se vérifie
 * la promesse « zéro ligne de code par habillage » (contrat § 4.5). Un habillage neuf
 * n'ajoute aucune entrée, aucun fichier, aucune ligne.
 */

import type { ActionColorie, ContenuColorie, EtatColorie } from '@pierre/partage';
import type { MoteurRendu } from '../types.js';
import { MoteurColorie } from './MoteurColorie.js';

export const renduColorie: MoteurRendu<ContenuColorie, EtatColorie, ActionColorie> = {
  code: 'colorie',
  Composant: MoteurColorie
};

export { jouerRecoloration, COURBE_RECOLORATION, PARTICULES_MAX } from './recoloration.js';
export type { OptionsRecoloration } from './recoloration.js';

// `SCENE_BOUCHON`, `VIEWBOX_BOUCHON` et `RegionBouchon` ont disparu avec la cour d'école
// codée en dur dans le moteur ; `estCheminFerme` a rejoint `@pierre/partage/validation`,
// seul endroit d'où `scripts/test-contenu.mjs` peut l'appeler. Aucun de ces quatre symboles
// ne figurait au contrat § 11.2, qui n'ouvre ici que `renduColorie` et `jouerRecoloration` :
// ce retrait rapproche le fichier de sa surface gelée.
export { VIEWBOX_PAR_DEFAUT, SceneSvg } from './SceneSvg.js';
export type { ProprietesSceneSvg } from './SceneSvg.js';

export { PaletteConsigne } from './PaletteConsigne.js';
export type { ProprietesPaletteConsigne } from './PaletteConsigne.js';

export { MoteurColorie } from './MoteurColorie.js';
