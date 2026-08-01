// Hauteur montante selon la série en cours — v2 § 8, D26 (lot L2-A).
//
// « 2ᵉ bonne réponse = un demi-ton plus haut, comme les pièces de Mario. C'est le détail le
// plus rentable de toute la liste » (v2 § 8, repris en D26). C'est la seule raison d'être de
// ce fichier, et il tient en une fonction.
//
// Aucune dépendance : ni DOM, ni audio, ni React. `tests/unitaires/gamefeel-serie.test.ts`
// tourne donc en environnement `node`.

/**
 * Plafond par défaut : une octave.
 *
 * PLACEHOLDER — à valider (question Q5 du contrat des features v2 § 9). Au-delà de douze
 * demi-tons, le son devient strident sur le haut-parleur d'une tablette, et une récompense qui
 * agresse cesse d'être une récompense. Le jour où cette valeur bouge, elle passe en donnée à
 * côté des seuils de la cascade.
 */
export const PLAFOND_DEMI_TONS = 12;

/**
 * Demi-tons ajoutés au son de réussite pour une série donnée.
 *
 * La série commence à 1 (première bonne réponse), qui ne transpose rien : `demiTonsDeSerie(1)`
 * vaut 0. La deuxième monte d'un demi-ton, la troisième de deux, et ainsi de suite jusqu'au
 * plafond. Une série nulle ou négative — c'est-à-dire une série qu'on vient de réinitialiser —
 * rend 0 : on repart de la tonique, jamais d'une note qui sonnerait comme une punition.
 *
 * La fonction est **monotone croissante et plafonnée**, et `gamefeel-serie.test.ts` le prouve
 * par propriété : c'est ce qui garantit qu'aucune série ne peut faire sonner faux.
 */
export function demiTonsDeSerie(serie: number, plafond: number = PLAFOND_DEMI_TONS): number {
  const plancherPlafond = Math.max(0, Math.trunc(plafond));
  if (!Number.isFinite(serie) || serie <= 1) {
    return 0;
  }
  return Math.min(Math.trunc(serie) - 1, plancherPlafond);
}
