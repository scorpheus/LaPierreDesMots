// Aimantation des dépôts — v2 § 8 et R16 (lot L2-A).
//
// « Aucune coordination fine exigée : pas de glisser précis, pas de timing serré, tolérance de
// 24 px sur toutes les cibles de dépôt » (v2 § 8). L'aimantation est la traduction gestuelle de
// cette règle : les 24 derniers pixels sont franchis par le jeu, pas par le doigt.
//
// Fichier pur : ni DOM, ni React. Les moteurs `place`, `assemble`, `tri`, `chemin` et `paires`
// s'en servent par `ServicesJeu` ou directement ; aucun ne réimplante la loi.

/** v2 § 8 et R16 : aimantation sur les 24 derniers pixels. */
export const AIMANTATION_PX = 24;

/**
 * `overshoot` de 8 % — v2 § 8.
 *
 * Il n'est PAS appliqué à la position finale rendue par `aimanter` : un dépôt se pose
 * exactement sur sa cible, sinon la scène dériverait d'un dépôt à l'autre. Le dépassement est
 * une propriété de l'ANIMATION, et c'est `ressort.ts` qui le consomme pour construire ses
 * images-clés. Une seule constante, un seul endroit qui la déclare.
 */
export const OVERSHOOT = 0.08;

export interface ResultatAimantation {
  readonly position: readonly [number, number];
  readonly aimante: boolean;
  readonly distancePx: number;
}

/**
 * Rend la position à laquelle l'élément doit se poser.
 *
 * Sous le seuil, la cible ; au-delà, le point du doigt inchangé. `distancePx` est toujours
 * renseignée, y compris quand rien n'est aimanté : c'est elle qui permet à un moteur de
 * décider si le geste comptait comme une tentative de dépôt.
 *
 * Le seuil est un paramètre facultatif plutôt qu'une constante enfouie : un habillage ou une
 * cible particulièrement petite peut l'élargir, jamais le réduire sous R16.
 */
export function aimanter(
  point: readonly [number, number],
  cible: readonly [number, number],
  seuilPx: number = AIMANTATION_PX
): ResultatAimantation {
  const dx = cible[0] - point[0];
  const dy = cible[1] - point[1];
  const distancePx = Math.sqrt(dx * dx + dy * dy);
  const seuil = Math.max(0, seuilPx);

  if (distancePx <= seuil) {
    return { position: [cible[0], cible[1]], aimante: true, distancePx };
  }
  return { position: [point[0], point[1]], aimante: false, distancePx };
}
