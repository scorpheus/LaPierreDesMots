/**
 * Géométrie plane du socle commun des moteurs — lot L2-C.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.1.
 *
 * Tout ce fichier est PUR : aucune horloge, aucun aléa, aucun DOM, aucun `Math.random`.
 * Les coordonnées sont TOUJOURS celles du `viewBox` de la scène, jamais des pixels CSS :
 * c'est la couche de rendu qui convertit, une seule fois, au moment du geste.
 *
 * Onze moteurs de L2-E importent ces cinq fonctions. Aucune n'a le droit de lever : un
 * polygone dégénéré rend un résultat neutre (`false`, `0`, `null`), jamais une exception —
 * un décor mal formé ne doit pas produire d'écran d'échec (R14).
 */

export type Point = readonly [number, number];
export type Polygone = readonly Point[];

/** Distance euclidienne. `Math.hypot` évite le dépassement sur les grands `viewBox`. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Vrai si `point` est sur le segment `[a, b]`, à `epsilon` près.
 *
 * Séparé du lancer de rayon parce que c'est LUI qui tient la promesse « un point sur
 * l'arête est DEDANS ». Sans ce test, un doigt qui tombe pile sur la bordure d'une zone
 * serait rendu à `null` une fois sur deux selon la parité des croisements — et l'enfant
 * verrait son dépôt ignoré sans comprendre pourquoi.
 */
function surLeSegment(point: Point, a: Point, b: Point, epsilon: number): boolean {
  const produitVectoriel = (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]);
  const longueur = distance(a, b);
  if (longueur === 0) return distance(point, a) <= epsilon;
  if (Math.abs(produitVectoriel) / longueur > epsilon) return false;
  const produitScalaire =
    (point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1]);
  return produitScalaire >= -epsilon && produitScalaire <= longueur * longueur + epsilon;
}

/**
 * Lancer de rayon horizontal, robuste aux sommets. Un point sur l'arête est DEDANS.
 *
 * La robustesse aux sommets vient de la comparaison asymétrique `(yi > y) !== (yj > y)` :
 * un sommet traversé n'est compté qu'une fois, sur l'arête dont il est l'extrémité
 * supérieure. Sans cela, un tap à la hauteur exacte d'un sommet compterait deux
 * croisements et le point serait déclaré dehors.
 *
 * Un polygone de moins de 3 points n'a pas d'intérieur : `false`, sans lever.
 */
export function pointDansPolygone(point: Point, polygone: Polygone, epsilon = 1e-9): boolean {
  if (polygone.length < 3) return false;

  const [x, y] = point;
  let dedans = false;

  for (let i = 0, j = polygone.length - 1; i < polygone.length; j = i, i += 1) {
    const sommetI = polygone[i];
    const sommetJ = polygone[j];
    if (sommetI === undefined || sommetJ === undefined) continue;

    if (surLeSegment(point, sommetJ, sommetI, epsilon)) return true;

    const [xi, yi] = sommetI;
    const [xj, yj] = sommetJ;
    if (yi > y !== yj > y) {
      const abscisseCroisement = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (x < abscisseCroisement) dedans = !dedans;
    }
  }

  return dedans;
}

/**
 * Aire ALGÉBRIQUE en valeur absolue (formule du lacet). Toujours positive : l'orientation
 * du polygone dans le SVG n'a pas à être connue de l'appelant.
 */
export function aire(polygone: Polygone): number {
  if (polygone.length < 3) return 0;
  let somme = 0;
  for (let i = 0, j = polygone.length - 1; i < polygone.length; j = i, i += 1) {
    const sommetI = polygone[i];
    const sommetJ = polygone[j];
    if (sommetI === undefined || sommetJ === undefined) continue;
    somme += sommetJ[0] * sommetI[1] - sommetI[0] * sommetJ[1];
  }
  return Math.abs(somme) / 2;
}

/**
 * Centroïde de la SURFACE, pas moyenne des sommets.
 *
 * La différence compte : sur une zone en L, la moyenne des sommets tombe hors de la zone,
 * et l'aide « montre la cible » désignerait un endroit vide. Repli sur la moyenne des
 * sommets quand l'aire est nulle (polygone dégénéré ou aplati).
 */
export function centroide(polygone: Polygone): Point {
  if (polygone.length === 0) return [0, 0];
  if (polygone.length < 3) {
    const sommeX = polygone.reduce((s, p) => s + p[0], 0);
    const sommeY = polygone.reduce((s, p) => s + p[1], 0);
    return [sommeX / polygone.length, sommeY / polygone.length];
  }

  let deuxAires = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = polygone.length - 1; i < polygone.length; j = i, i += 1) {
    const sommetI = polygone[i];
    const sommetJ = polygone[j];
    if (sommetI === undefined || sommetJ === undefined) continue;
    const croix = sommetJ[0] * sommetI[1] - sommetI[0] * sommetJ[1];
    deuxAires += croix;
    cx += (sommetJ[0] + sommetI[0]) * croix;
    cy += (sommetJ[1] + sommetI[1]) * croix;
  }

  if (deuxAires === 0) {
    const sommeX = polygone.reduce((s, p) => s + p[0], 0);
    const sommeY = polygone.reduce((s, p) => s + p[1], 0);
    return [sommeX / polygone.length, sommeY / polygone.length];
  }

  return [cx / (3 * deuxAires), cy / (3 * deuxAires)];
}

/**
 * Index du plus proche candidat sous `tolerance`, ou `null`.
 *
 * `null` n'est JAMAIS un refus : c'est « on ignore ». Un doigt qui glisse hors du dessin
 * ne coûte rien (contrat v1 § 5.5, transposé). Départage déterministe à égalité stricte :
 * le premier dans l'ordre de déclaration — l'aléa n'a rien à faire ici.
 */
export function plusProcheSousTolerance(
  point: Point,
  candidats: readonly Point[],
  tolerance: number,
): number | null {
  let meilleur: number | null = null;
  let meilleureDistance = Number.POSITIVE_INFINITY;

  for (const [index, candidat] of candidats.entries()) {
    const d = distance(point, candidat);
    if (d < meilleureDistance) {
      meilleureDistance = d;
      meilleur = index;
    }
  }

  if (meilleur === null || meilleureDistance > tolerance) return null;
  return meilleur;
}
