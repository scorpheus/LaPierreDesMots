/**
 * Barillet du sous-chemin `@pierre/partage/recompenses` — lot L2-A.
 *
 * C'est ici que passent les VALEURS de la cascade (C1 : le barillet `@pierre/partage` ne
 * réexporte que des types, jamais une constante). Le sous-chemin est **chargé par le client**
 * (§ 4.7) : la jauge se calcule à l'écran, et le coffre de L2-F affiche les mêmes jauges que
 * l'écran de récompense. Il reste donc léger — aucune dépendance, Ajv exclu.
 */

export type {
  CodePalier,
  NatureRecompense,
  SeuilsCascade,
  EtatCascade,
  JaugePalier,
  RecompenseObtenue,
  GainCascade,
} from './types.js';

export { ETAT_CASCADE_VIDE, appliquerEtoiles, jaugesDe } from './cascade.js';
export { lireSeuilsCascade } from './parametres.js';
