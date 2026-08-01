/**
 * Rééchantillonnage du geste — lot L2-C.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.3.
 *
 * POURQUOI CE FICHIER EXISTE, et pourquoi il n'est pas une optimisation.
 * `PointerEvent` produit des échantillons à la cadence du matériel, pas à celle du geste :
 * un doigt lent rend deux cents points, un doigt rapide en rend douze. Or
 * `couvertureOrientee` compte des points du modèle atteints par des points du geste. Sans
 * rééchantillonnage, un enfant rapide couvrirait moins bien le modèle qu'un enfant lent
 * **pour exactement le même tracé** — et le moteur mesurerait la vitesse au lieu de mesurer
 * la forme. C'est précisément ce que D23 interdit : l'exercice porte sur l'orientation et le
 * sens, jamais sur la vitesse ni sur la propreté.
 *
 * Aucun `Date.now` : les instants viennent des échantillons, qui les tiennent de l'hôte, qui
 * les tient de `Horloge`.
 */

import type { EchantillonGeste, Point } from '@pierre/partage';

/**
 * Pas d'échantillonnage par défaut, en unités `viewBox`.
 *
 * Les modèles de `contenu/modeles-lettres/minuscules.json` portent 9 points par trait sur un
 * `viewBox` de 100 × 160, soit environ 10 unités entre deux points consécutifs. Un pas de 5
 * garantit au moins un échantillon de geste entre deux points de modèle, sans gonfler la
 * liste. PLACEHOLDER — à valider sur l'appareil réel (Galaxy Tab S10 FE).
 */
export const PAS_ECHANTILLONNAGE = 5;

function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Rééchantillonne un geste à pas constant.
 *
 * Le premier et le dernier échantillon sont TOUJOURS conservés : le premier porte le point
 * de départ, que `evaluerTrait` compare à `trait.depart` ; le dernier ferme le tracé. Les
 * perdre changerait le verdict.
 *
 * Un pas nul ou négatif rend le geste inchangé plutôt que de boucler sans fin : un paramètre
 * absurde ne doit pas figer la tablette dans la main de l'enfant.
 */
export function reechantillonner(
  geste: readonly EchantillonGeste[],
  pasPx: number,
): readonly EchantillonGeste[] {
  if (geste.length < 2 || pasPx <= 0) return geste;

  const premier = geste[0];
  const dernier = geste[geste.length - 1];
  if (premier === undefined || dernier === undefined) return geste;

  // Longueurs cumulées le long de la polyligne.
  const cumul: number[] = [0];
  for (let i = 1; i < geste.length; i += 1) {
    const a = geste[i - 1];
    const b = geste[i];
    if (a === undefined || b === undefined) return geste;
    cumul.push((cumul[i - 1] ?? 0) + distance(a.point, b.point));
  }
  const total = cumul[cumul.length - 1] ?? 0;
  if (total === 0) return [premier, dernier];

  const nbPas = Math.max(1, Math.round(total / pasPx));
  const sortie: EchantillonGeste[] = [];

  let segment = 0;
  for (let i = 0; i <= nbPas; i += 1) {
    const cible = (total * i) / nbPas;
    while (segment < cumul.length - 2 && (cumul[segment + 1] ?? 0) < cible) segment += 1;

    const a = geste[segment];
    const b = geste[segment + 1];
    const debut = cumul[segment] ?? 0;
    const fin = cumul[segment + 1] ?? debut;
    if (a === undefined || b === undefined) break;

    const longueur = fin - debut;
    const fraction = longueur === 0 ? 0 : (cible - debut) / longueur;

    sortie.push({
      point: [
        a.point[0] + (b.point[0] - a.point[0]) * fraction,
        a.point[1] + (b.point[1] - a.point[1]) * fraction,
      ],
      // L'instant est interpolé, pas inventé : il sert à la latence de reconnaissance (D18),
      // qui ne lit de toute façon que le PREMIER échantillon.
      instantMs: Math.round(a.instantMs + (b.instantMs - a.instantMs) * fraction),
    });
  }

  return sortie;
}
