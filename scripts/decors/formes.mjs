/**
 * LA TROUSSE DE DESSIN DES DÉCORS — lot M6, contrat du monde v4 § 2 (M6).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI UNE TROUSSE PLUTÔT QUE CINQUANTE-TROIS FICHIERS ÉCRITS À LA MAIN
 *
 * Le contrat tranche l'arbitrage de production : « les décors se dessinent à la main, en SVG »
 * (v4 § 2, M6). Il le tranche pour trois raisons mesurées — `potrace` absent, porte technique
 * de l'annexe P inadaptée aux scènes ouvertes, et surtout : **un décor doit porter des `id` de
 * région stables, fermés, à centroïde et surface EXACTS**. Une trace raster ne donne ni l'un ni
 * l'autre.
 *
 * Dessiner à la main ne veut pas dire taper 460 chaînes `d` au clavier. Ça veut dire que la
 * GÉOMÉTRIE est décidée ici, sommet par sommet, par un auteur — et non devinée par un modèle.
 * Ce fichier porte les silhouettes ; `decors.mjs` les pose dans les scènes ; l'émetteur
 * `scripts/dessiner-decors.mjs` mesure ce qui est sorti et REFUSE d'écrire si la mesure est
 * mauvaise. Le dessin reste manuel, la métrologie devient exacte, et le même houppier lobé
 * ne se retape pas trente fois avec trente coquilles possibles.
 *
 * ── TROIS RÈGLES QUE CHAQUE FORME D'ICI RESPECTE PAR CONSTRUCTION ─────────────────────────
 *  1. **Tout est polygonal.** Aucune commande `A`, `C`, `Q` : `polygonesDuChemin` rend `null`
 *     dès qu'elle en voit une, et une région non mesurable est une région dont la surface
 *     déclarée n'est opposable à rien. Les cercles sont des polygones à 18 sommets.
 *  2. **Tout anneau est fermé.** Les fonctions rendent une liste de sommets ; l'émetteur pose
 *     le `Z`. Il n'existe donc aucun chemin par lequel un anneau ouvert puisse sortir d'ici —
 *     « un trait interrompu d'un pixel fait fuiter le remplissage sur toute l'image ».
 *  3. **Aucun aléatoire.** Pas de `Math.random` : les irrégularités (lobes, dents, ondes) sont
 *     des fonctions trigonométriques ou des suites arithmétiques. Deux exécutions rendent le
 *     même octet, et un décor se rejoue.
 *
 * ── LA RÈGLE DE DESSIN QUI VIENT DE `decor-reconnaissable.test.ts`, ET QUI COMMANDE TOUT ───
 * « Un disque parfait se lit *ballon* ». La mesure existe déjà : `rondeur` = plus petit rayon
 * sur plus grand rayon depuis le centroïde, seuil 0,85 pour un houppier. `lobe()` porte donc
 * un paramètre `creux` dont la valeur EST la rondeur obtenue : `creux = 0,78` rend un houppier
 * mesuré à 0,78. Ce n'est pas une coïncidence commode, c'est la définition de la fonction.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */

const TAU = Math.PI * 2;

// ═════════════════════════════════════════════════════════════════ primitives géométriques

/** Rectangle, coin haut-gauche. */
export function rect(x, y, w, h) {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/** Trapèze centré sur `cx`, largeur `wHaut` en haut, `wBas` en bas. */
export function trapeze(cx, y, wHaut, wBas, h) {
  return [
    [cx - wHaut / 2, y],
    [cx + wHaut / 2, y],
    [cx + wBas / 2, y + h],
    [cx - wBas / 2, y + h],
  ];
}

/** Triangle isocèle, pointe en haut, base à `yBas`. */
export function triangle(cx, yBas, w, h) {
  return [
    [cx, yBas - h],
    [cx + w / 2, yBas],
    [cx - w / 2, yBas],
  ];
}

/** Ellipse polygonale. `n` sommets : 18 par défaut, assez pour lire « rond » à 960 px. */
export function ellipse(cx, cy, rx, ry, n = 18, phase = 0) {
  const points = [];
  for (let i = 0; i < n; i += 1) {
    const a = phase + (TAU * i) / n;
    points.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return points;
}

/**
 * Masse LOBÉE — houppier, buisson, nuage, mousse, flaque, fumée, géode.
 *
 * `creux` est le rapport du plus petit au plus grand rayon, c'est-à-dire EXACTEMENT la
 * `rondeur` que mesure `decor-reconnaissable.test.ts`. En dessous de 0,85, la forme cesse de
 * se lire « ballon ». Défaut 0,78 — REVU APRÈS AVOIR REGARDÉ LES PLANCHES : à 0,72 les
 * houppiers et les buissons se lisaient « étoile » plutôt que « feuillage », un défaut qu'on
 * ne voit pas dans les chiffres et qui saute aux yeux sur une planche-contact. 0,78 reste
 * franchement sous le seuil de 0,85.
 */
export function lobe(cx, cy, r, lobes, creux = 0.78, n = 44, phase = 0, aplat = 1) {
  const points = [];
  for (let i = 0; i < n; i += 1) {
    const a = phase + (TAU * i) / n;
    const k = r * (creux + (1 - creux) * (0.5 + 0.5 * Math.cos(lobes * (a - phase))));
    points.push([cx + k * Math.cos(a), cy + k * aplat * Math.sin(a)]);
  }
  return points;
}

/** Étoile à `branches` pointes. Pointe du haut par défaut. */
export function etoile(cx, cy, rExt, rInt, branches, phase = -Math.PI / 2) {
  const points = [];
  for (let i = 0; i < branches * 2; i += 1) {
    const a = phase + (Math.PI * i) / branches;
    const r = i % 2 === 0 ? rExt : rInt;
    points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return points;
}

/** Goutte : pointe en haut à `yPointe`, ventre rond en bas. Stalactite, larme, gouttes. */
export function goutte(cx, yPointe, rx, h, n = 16) {
  const cy = yPointe + h - rx;
  const points = [[cx, yPointe]];
  const a0 = -Math.PI / 3;
  const a1 = Math.PI + Math.PI / 3;
  for (let i = 0; i <= n; i += 1) {
    const a = a0 + ((a1 - a0) * i) / n;
    points.push([cx + rx * Math.cos(a), cy + rx * Math.sin(a)]);
  }
  return points;
}

/** Arche : pieds droits, sommet arrondi. Bouche de grotte, porte, voûte, tunnel. */
export function arche(cx, yBas, w, h, n = 14) {
  const rx = w / 2;
  const hMur = Math.max(h - rx, 0);
  const points = [
    [cx - rx, yBas],
    [cx - rx, yBas - hMur],
  ];
  for (let i = 1; i < n; i += 1) {
    const a = Math.PI + (Math.PI * i) / n;
    points.push([cx + rx * Math.cos(a), yBas - hMur + rx * Math.sin(a)]);
  }
  points.push([cx + rx, yBas - hMur], [cx + rx, yBas]);
  return points;
}

/** Croissant ouvert vers la droite — la lune. */
export function croissant(cx, cy, r, ecart, n = 18) {
  const points = [];
  for (let i = 0; i <= n; i += 1) {
    const a = Math.PI / 2 + (Math.PI * i) / n;
    points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const r2 = r * 0.94;
  for (let i = n; i >= 0; i -= 1) {
    const a = Math.PI / 2 + (Math.PI * i) / n;
    points.push([cx + ecart + r2 * Math.cos(a), cy + r2 * Math.sin(a)]);
  }
  return points;
}

/**
 * RUBAN — une polyligne épaissie, rendue comme un polygone fermé.
 *
 * C'est la forme des objets longs : liane, corde, fil, rail, veine, ruisseau, coulée, chemin
 * d'encre, bande de pellicule. Le contour est calculé par la normale au segment ; sur des
 * courbes douces (celles qu'on dessine ici) l'offset ne se recoupe pas.
 */
export function ruban(points, ep) {
  const gauche = [];
  const droite = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * (ep / 2);
    const ny = (dx / L) * (ep / 2);
    gauche.push([points[i][0] + nx, points[i][1] + ny]);
    droite.push([points[i][0] - nx, points[i][1] - ny]);
  }
  return [...gauche, ...droite.reverse()];
}

/** Polyligne sinusoïdale : le haut d'une eau, d'une brume, d'une dune. */
export function onde(x0, x1, y, amp, ondes, n = 36, phase = 0) {
  const points = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    points.push([x0 + (x1 - x0) * t, y + amp * Math.sin(TAU * ondes * t + phase)]);
  }
  return points;
}

/** Bandeau à bord supérieur ondulé et bord inférieur droit. Eau, sol, ciel, brume. */
export function bandeau(x0, x1, yHaut, yBas, amp, ondes, phase = 0) {
  return [
    ...onde(x0, x1, yHaut, amp, ondes, 36, phase),
    [x1, yBas],
    [x0, yBas],
  ];
}

/**
 * TOUFFES — une bande dentelée. Herbe, flammes, roseaux, cimes, dents d'une scie.
 *
 * La hauteur des dents varie par une suite arithmétique modulo 5 : irrégulier à l'œil, exact
 * à la reproduction, aucun tirage aléatoire.
 */
export function touffes(x0, x1, yBas, h, nb, base = 12) {
  const points = [];
  const w = (x1 - x0) / nb;
  for (let i = 0; i < nb; i += 1) {
    const x = x0 + i * w;
    const s = h * (0.55 + 0.45 * (((i * 3) % 5) / 4));
    points.push(
      [x, yBas],
      [x + w * 0.2, yBas - s * 0.55],
      [x + w * 0.42, yBas - s],
      [x + w * 0.58, yBas - s],
      [x + w * 0.8, yBas - s * 0.55]
    );
  }
  points.push([x1, yBas], [x1, yBas + base], [x0, yBas + base]);
  return points;
}

/**
 * FLAMMES — des langues de feu, penchées et de hauteurs inégales.
 *
 * Séparée de `touffes` après avoir REGARDÉ la planche de la Clairière : le feu de veillée,
 * dessiné avec des dents symétriques, se lisait « peigne » ou « scie », jamais « feu ». Une
 * flamme n'est pas un triangle : elle monte plus vite d'un côté qu'de l'autre et retombe.
 */
export function flammes(x0, x1, yBas, h, nb, base = 14) {
  const points = [];
  const w = (x1 - x0) / nb;
  for (let i = 0; i < nb; i += 1) {
    const x = x0 + i * w;
    const s = h * (0.5 + 0.5 * (((i * 2) % 3) / 2));
    points.push(
      [x, yBas],
      [x + w * 0.12, yBas - s * 0.38],
      [x + w * 0.34, yBas - s * 0.6],
      [x + w * 0.46, yBas - s],
      [x + w * 0.64, yBas - s * 0.56],
      [x + w * 0.84, yBas - s * 0.3]
    );
  }
  points.push([x1, yBas], [x1, yBas + base], [x0, yBas + base]);
  return points;
}

/** Éclair de foudre. */
export function foudre(x, y, w, h) {
  return [
    [x + w * 0.58, y],
    [x + w * 0.06, y + h * 0.56],
    [x + w * 0.42, y + h * 0.56],
    [x + w * 0.14, y + h],
    [x + w, y + h * 0.38],
    [x + w * 0.6, y + h * 0.38],
    [x + w * 0.96, y],
  ];
}

/** Cristal facetté : pointe haute, épaules, base biseautée. La forme signature des Galeries. */
export function cristal(cx, yPointe, w, h, epaule = 0.28) {
  const r = w / 2;
  return [
    [cx, yPointe],
    [cx + r, yPointe + h * epaule],
    [cx + r * 0.78, yPointe + h * 0.86],
    [cx, yPointe + h],
    [cx - r * 0.78, yPointe + h * 0.86],
    [cx - r, yPointe + h * epaule],
  ];
}

/** Losange. Vitrail, écaille, panneau tourné. */
export function losange(cx, cy, rx, ry) {
  return [
    [cx, cy - ry],
    [cx + rx, cy],
    [cx, cy + ry],
    [cx - rx, cy],
  ];
}

/** Anneau : deux ellipses concentriques. Deux anneaux → `evenodd` creuse le trou. */
export function anneau(cx, cy, rExt, rInt, n = 18) {
  return [ellipse(cx, cy, rExt, rExt, n), ellipse(cx, cy, rInt, rInt, n)];
}

// ═══════════════════════════════════════════════════════════ silhouettes reconnaissables

/**
 * Les contours dessinés dans le carré unité (`0 → 1` en `x` comme en `y`, `y` vers le bas),
 * posés ensuite par `poser()`. **C'est ici qu'est le dessin à la main.**
 *
 * Chacune est choisie pour ce qu'un enfant de sept ans y reconnaît d'un coup d'œil, et le
 * critère est toujours le même : **quel signe rend l'objet identifiable sans légende ?** Une
 * grenouille, ce sont deux yeux au-dessus de la ligne du crâne et deux pattes repliées ; un
 * hibou, deux aigrettes et un corps en poire ; un poisson, une queue fourchue.
 */
const CONTOURS = {
  poisson: [
    [0.0, 0.1], [0.26, 0.4], [0.44, 0.2], [0.72, 0.22], [0.94, 0.42], [1.0, 0.5],
    [0.94, 0.58], [0.72, 0.78], [0.44, 0.8], [0.26, 0.6], [0.0, 0.9],
  ],
  poissonPlat: [
    [0.0, 0.26], [0.24, 0.42], [0.42, 0.3], [0.74, 0.34], [1.0, 0.5],
    [0.74, 0.66], [0.42, 0.7], [0.24, 0.58], [0.0, 0.74],
  ],
  // Deux bosses d'yeux AU-DESSUS de la ligne du crâne, un corps large, deux pattes qui
  // dépassent de chaque côté. Redessinée après la planche : la première version était trop
  // découpée et se lisait « tache ».
  grenouille: [
    [0.22, 0.34], [0.24, 0.2], [0.32, 0.14], [0.4, 0.2], [0.42, 0.28], [0.58, 0.28],
    [0.6, 0.2], [0.68, 0.14], [0.76, 0.2], [0.78, 0.34], [0.88, 0.42], [0.98, 0.56],
    [1.0, 0.7], [0.9, 0.74], [0.84, 0.62], [0.8, 0.78], [0.7, 0.9], [0.56, 0.94],
    [0.44, 0.94], [0.3, 0.9], [0.2, 0.78], [0.16, 0.62], [0.1, 0.74], [0.0, 0.7],
    [0.02, 0.56], [0.12, 0.42],
  ],
  hibou: [
    [0.2, 0.1], [0.34, 0.26], [0.66, 0.26], [0.8, 0.1], [0.88, 0.38], [0.94, 0.66],
    [0.78, 0.9], [0.6, 0.94], [0.58, 1.0], [0.5, 0.92], [0.42, 1.0], [0.4, 0.94],
    [0.22, 0.9], [0.06, 0.66], [0.12, 0.38],
  ],
  renard: [
    [0.0, 0.5], [0.08, 0.34], [0.16, 0.44], [0.24, 0.28], [0.32, 0.44], [0.46, 0.46],
    [0.6, 0.44], [0.72, 0.32], [0.8, 0.44], [0.92, 0.22], [1.0, 0.44], [0.92, 0.6],
    [0.82, 0.64], [0.8, 0.96], [0.7, 0.96], [0.68, 0.7], [0.44, 0.72], [0.42, 0.96],
    [0.32, 0.96], [0.32, 0.68], [0.14, 0.62], [0.06, 0.62],
  ],
  ecureuil: [
    [0.34, 0.22], [0.4, 0.1], [0.46, 0.2], [0.56, 0.2], [0.62, 0.1], [0.68, 0.24],
    [0.74, 0.42], [0.78, 0.66], [0.86, 0.86], [0.86, 0.96], [0.5, 0.96], [0.46, 0.86],
    [0.34, 0.9], [0.16, 0.8], [0.06, 0.56], [0.1, 0.3], [0.24, 0.16], [0.3, 0.34],
  ],
  // Un insecte : tête en haut, corps effilé au centre, QUATRE ailes larges. Redessinée après
  // la planche : la première version, trop fine, se lisait « croix » à la taille où l'enfant
  // la voit — et une luciole qui ressemble à une croix ne s'attrape pas.
  libellule: [
    [0.5, 0.0], [0.58, 0.06], [0.58, 0.16], [0.74, 0.1], [0.96, 0.16], [1.0, 0.3],
    [0.8, 0.34], [0.6, 0.32], [0.6, 0.4], [0.82, 0.44], [0.98, 0.56], [0.9, 0.68],
    [0.7, 0.6], [0.58, 0.52], [0.56, 0.8], [0.52, 1.0], [0.48, 1.0], [0.44, 0.8],
    [0.42, 0.52], [0.3, 0.6], [0.1, 0.68], [0.02, 0.56], [0.18, 0.44], [0.4, 0.4],
    [0.4, 0.32], [0.2, 0.34], [0.0, 0.3], [0.04, 0.16], [0.26, 0.1], [0.42, 0.16],
    [0.42, 0.06],
  ],
  // Une coquille Saint-Jacques : charnière en bas, éventail qui s'ouvre vers le haut, bord
  // supérieur FESTONNÉ. Redessinée après la planche : des festons de 0,28 d'amplitude
  // faisaient une couronne ; ils sont maintenant à 0,10, et l'objet se lit « coquillage ».
  coquillage: [
    [0.5, 1.0], [0.32, 0.94], [0.16, 0.82], [0.05, 0.62], [0.0, 0.4], [0.08, 0.3],
    [0.14, 0.36], [0.22, 0.24], [0.3, 0.32], [0.4, 0.2], [0.5, 0.3], [0.6, 0.2],
    [0.7, 0.32], [0.78, 0.24], [0.86, 0.36], [0.92, 0.3], [1.0, 0.4], [0.95, 0.62],
    [0.84, 0.82], [0.68, 0.94],
  ],
  nenuphar: [
    [0.5, 0.5], [0.62, 0.06], [0.84, 0.14], [0.98, 0.4], [0.94, 0.7], [0.74, 0.92],
    [0.44, 0.98], [0.16, 0.86], [0.02, 0.6], [0.08, 0.3], [0.3, 0.1], [0.44, 0.06],
  ],
  champignon: [
    [0.5, 0.06], [0.74, 0.14], [0.92, 0.34], [1.0, 0.5], [0.68, 0.54], [0.66, 0.86],
    [0.72, 0.96], [0.28, 0.96], [0.34, 0.86], [0.32, 0.54], [0.0, 0.5], [0.08, 0.34],
    [0.26, 0.14],
  ],
  gland: [
    [0.5, 0.0], [0.74, 0.06], [0.9, 0.2], [0.9, 0.34], [0.82, 0.42], [0.8, 0.7],
    [0.62, 0.96], [0.38, 0.96], [0.2, 0.7], [0.18, 0.42], [0.1, 0.34], [0.1, 0.2],
    [0.26, 0.06],
  ],
  // Une feuille : pointe en haut, PÉTIOLE en bas, bord dentelé. Redessinée après la planche :
  // la première version, symétrique et profondément découpée, se lisait « étoile ». Une
  // feuille se reconnaît d'abord à sa pointe et à sa queue.
  feuilleDentee: [
    [0.5, 0.0], [0.6, 0.06], [0.7, 0.16], [0.78, 0.2], [0.84, 0.3], [0.9, 0.36],
    [0.88, 0.46], [0.92, 0.56], [0.86, 0.64], [0.84, 0.76], [0.74, 0.82], [0.64, 0.9],
    [0.54, 0.94], [0.54, 1.0], [0.46, 1.0], [0.46, 0.94], [0.36, 0.9], [0.26, 0.82],
    [0.16, 0.76], [0.14, 0.64], [0.08, 0.56], [0.12, 0.46], [0.1, 0.36], [0.16, 0.3],
    [0.22, 0.2], [0.3, 0.16], [0.4, 0.06],
  ],
  // LA LUCIOLE n'est pas une libellule, et le décor `clairiere.lucioles` en porte trois :
  // une tête, deux ailes courtes, et surtout un ABDOMEN ÉLARGI au bout — c'est la lueur, et
  // c'est le seul signe qui distingue une luciole d'un insecte quelconque à la taille où
  // l'enfant la voit. Ajoutée après la planche, où les trois se lisaient « astérisque ».
  luciole: [
    [0.42, 0.1], [0.56, 0.06], [0.66, 0.14], [0.66, 0.24],
    [0.86, 0.16], [1.0, 0.26], [0.92, 0.36], [0.72, 0.34],
    [0.78, 0.48], [0.76, 0.66], [0.64, 0.82],
    [0.72, 0.9], [0.64, 1.0], [0.36, 1.0], [0.28, 0.9], [0.36, 0.82],
    [0.24, 0.66], [0.22, 0.48],
    [0.28, 0.34], [0.08, 0.36], [0.0, 0.26], [0.14, 0.16], [0.34, 0.24], [0.34, 0.14],
  ],
  marmite: [
    [0.14, 0.24], [0.26, 0.24], [0.26, 0.14], [0.74, 0.14], [0.74, 0.24], [0.86, 0.24],
    [0.94, 0.3], [0.88, 0.36], [0.82, 0.74], [0.66, 0.94], [0.34, 0.94], [0.18, 0.74],
    [0.12, 0.36], [0.06, 0.3],
  ],
  tente: [
    [0.5, 0.0], [1.0, 0.94], [0.72, 0.94], [0.62, 0.44], [0.5, 0.66], [0.38, 0.44],
    [0.28, 0.94], [0.0, 0.94],
  ],
  barque: [
    [0.0, 0.28], [1.0, 0.28], [0.9, 0.42], [0.86, 0.86], [0.14, 0.86], [0.1, 0.42],
  ],
  panier: [
    [0.06, 0.32], [0.2, 0.32], [0.22, 0.16], [0.5, 0.04], [0.78, 0.16], [0.8, 0.32],
    [0.94, 0.32], [0.84, 0.96], [0.16, 0.96],
    [0.32, 0.32], [0.68, 0.32], [0.66, 0.22], [0.5, 0.16], [0.34, 0.22],
  ],
  pomme: [
    [0.5, 0.16], [0.54, 0.02], [0.66, 0.0], [0.6, 0.14], [0.82, 0.16], [1.0, 0.42],
    [0.94, 0.78], [0.72, 0.98], [0.5, 0.88], [0.28, 0.98], [0.06, 0.78], [0.0, 0.42],
    [0.18, 0.16], [0.4, 0.16],
  ],
  poire: [
    [0.5, 0.0], [0.6, 0.06], [0.58, 0.2], [0.72, 0.34], [0.86, 0.58], [0.84, 0.82],
    [0.62, 0.98], [0.38, 0.98], [0.16, 0.82], [0.14, 0.58], [0.28, 0.34], [0.42, 0.2],
    [0.4, 0.06],
  ],
  livre: [
    [0.06, 0.16], [0.48, 0.06], [0.52, 0.06], [0.94, 0.16], [0.94, 0.88], [0.52, 0.8],
    [0.48, 0.8], [0.06, 0.88],
  ],
  tour: [
    [0.5, 0.0], [0.86, 0.2], [0.78, 0.2], [0.78, 0.3], [0.86, 0.3], [0.86, 1.0],
    [0.14, 1.0], [0.14, 0.3], [0.22, 0.3], [0.22, 0.2], [0.14, 0.2],
  ],
  lanterne: [
    [0.36, 0.0], [0.64, 0.0], [0.56, 0.12], [0.78, 0.2], [0.86, 0.34], [0.8, 0.76],
    [0.9, 0.86], [0.9, 0.96], [0.1, 0.96], [0.1, 0.86], [0.2, 0.76], [0.14, 0.34],
    [0.22, 0.2], [0.44, 0.12],
  ],
  enclume: [
    [0.06, 0.1], [0.94, 0.1], [0.94, 0.26], [0.72, 0.34], [0.66, 0.62], [0.82, 0.78],
    [0.86, 0.96], [0.14, 0.96], [0.18, 0.78], [0.34, 0.62], [0.28, 0.34], [0.06, 0.26],
  ],
  wagon: [
    [0.04, 0.2], [0.96, 0.2], [0.86, 0.72], [0.14, 0.72],
  ],
  locomotive: [
    [0.06, 0.34], [0.2, 0.34], [0.2, 0.12], [0.34, 0.12], [0.34, 0.34], [0.62, 0.34],
    [0.68, 0.14], [0.94, 0.14], [1.0, 0.4], [1.0, 0.78], [0.06, 0.78],
  ],
  cloche: [
    [0.5, 0.02], [0.68, 0.12], [0.78, 0.36], [0.84, 0.72], [0.94, 0.86], [0.06, 0.86],
    [0.16, 0.72], [0.22, 0.36], [0.32, 0.12],
  ],
  burin: [
    [0.34, 0.0], [0.66, 0.0], [0.68, 0.62], [0.6, 0.74], [0.56, 1.0], [0.44, 1.0],
    [0.4, 0.74], [0.32, 0.62],
  ],
  marteau: [
    [0.1, 0.06], [0.72, 0.06], [0.9, 0.16], [0.9, 0.36], [0.72, 0.46], [0.58, 0.46],
    [0.56, 1.0], [0.4, 1.0], [0.42, 0.46], [0.1, 0.46],
  ],
  echelle: [
    [0.0, 0.0], [0.22, 0.0], [0.22, 0.16], [0.78, 0.16], [0.78, 0.0], [1.0, 0.0],
    [1.0, 1.0], [0.78, 1.0], [0.78, 0.84], [0.22, 0.84], [0.22, 1.0], [0.0, 1.0],
    [0.0, 0.66], [0.22, 0.66], [0.22, 0.56], [0.0, 0.56], [0.0, 0.44], [0.22, 0.44],
    [0.22, 0.34], [0.0, 0.34],
  ],
  pupitre: [
    [0.0, 0.34], [1.0, 0.06], [1.0, 0.2], [0.56, 0.38], [0.6, 1.0], [0.4, 1.0],
    [0.44, 0.38], [0.0, 0.48],
  ],
  silhouetteEnfant: [
    [0.5, 0.0], [0.66, 0.1], [0.66, 0.24], [0.86, 0.3], [1.0, 0.56], [0.88, 0.6],
    [0.74, 0.44], [0.72, 0.7], [0.66, 1.0], [0.54, 1.0], [0.5, 0.76], [0.46, 1.0],
    [0.34, 1.0], [0.28, 0.7], [0.26, 0.44], [0.12, 0.6], [0.0, 0.56], [0.14, 0.3],
    [0.34, 0.24], [0.34, 0.1],
  ],
  bougie: [
    [0.5, 0.0], [0.62, 0.14], [0.58, 0.26], [0.5, 0.32], [0.42, 0.26], [0.38, 0.14],
    [0.44, 0.34], [0.7, 0.34], [0.7, 0.94], [0.3, 0.94], [0.3, 0.34], [0.56, 0.34],
  ],
  torche: [
    [0.5, 0.0], [0.68, 0.16], [0.62, 0.3], [0.74, 0.28], [0.62, 0.44], [0.66, 1.0],
    [0.34, 1.0], [0.38, 0.44], [0.26, 0.28], [0.38, 0.3], [0.32, 0.16],
  ],
  fanion: [
    [0.0, 0.0], [1.0, 0.0], [0.5, 1.0],
  ],
  banniere: [
    [0.0, 0.0], [1.0, 0.0], [1.0, 0.84], [0.72, 0.68], [0.5, 1.0], [0.28, 0.68],
    [0.0, 0.84],
  ],
  enseigne: [
    [0.08, 0.0], [0.92, 0.0], [1.0, 0.16], [1.0, 0.72], [0.92, 0.88], [0.56, 0.88],
    [0.5, 1.0], [0.44, 0.88], [0.08, 0.88], [0.0, 0.72], [0.0, 0.16],
  ],
  pont: [
    [0.0, 0.68], [0.1, 0.4], [0.3, 0.2], [0.5, 0.14], [0.7, 0.2], [0.9, 0.4],
    [1.0, 0.68], [0.86, 0.68], [0.76, 0.46], [0.6, 0.32], [0.4, 0.32], [0.24, 0.46],
    [0.14, 0.68],
  ],
  souche: [
    [0.1, 0.24], [0.3, 0.14], [0.5, 0.2], [0.72, 0.12], [0.9, 0.24], [0.94, 0.86],
    [0.78, 0.96], [0.5, 0.9], [0.22, 0.96], [0.06, 0.86],
    [0.3, 0.34], [0.7, 0.34], [0.7, 0.56], [0.3, 0.56],
  ],
  geode: [
    [0.5, 0.0], [0.78, 0.1], [0.96, 0.34], [0.94, 0.68], [0.72, 0.92], [0.4, 0.98],
    [0.12, 0.82], [0.02, 0.52], [0.14, 0.2],
    [0.5, 0.24], [0.72, 0.42], [0.66, 0.72], [0.36, 0.76], [0.24, 0.46],
  ],
  // ── LES OBJETS QUE LE CONTENU DE M2 NOMME ────────────────────────────────────────────────
  // Ajoutés après coup, et le motif mérite d'être écrit : les quatre décors `colorie` neufs
  // sont servis par des exercices que M2 écrit en parallèle, et un exercice de coloriage sur
  // le graphème `eau` a besoin de régions qui S'APPELLENT `seau`, `chapeau`, `drapeau`,
  // `oiseau`, `tableau`, `rideau`, `feu`. Le nom de la région EST le mot à lire. Les objets
  // ci-dessous existent donc parce que la pédagogie les demande, pas parce que la scène en
  // avait besoin — et c'est le bon ordre.
  arbre: [
    [0.5, 0.0], [0.66, 0.04], [0.78, 0.14], [0.86, 0.26], [0.84, 0.38], [0.94, 0.44],
    [0.86, 0.54], [0.72, 0.6], [0.58, 0.62], [0.56, 1.0], [0.44, 1.0], [0.42, 0.62],
    [0.28, 0.6], [0.14, 0.54], [0.06, 0.44], [0.16, 0.38], [0.14, 0.26], [0.22, 0.14],
    [0.34, 0.04],
  ],
  oiseau: [
    [0.0, 0.22], [0.12, 0.14], [0.24, 0.16], [0.28, 0.06], [0.36, 0.16], [0.52, 0.26],
    [0.68, 0.36], [0.84, 0.34], [1.0, 0.44], [0.86, 0.52], [0.7, 0.56], [0.56, 0.62],
    [0.58, 0.8], [0.5, 0.82], [0.44, 0.66], [0.34, 0.68], [0.32, 0.84], [0.24, 0.82],
    [0.26, 0.62], [0.14, 0.5], [0.06, 0.36],
  ],
  poule: [
    [0.36, 0.1], [0.42, 0.02], [0.48, 0.1], [0.54, 0.02], [0.6, 0.12], [0.7, 0.18],
    [0.6, 0.24], [0.5, 0.22], [0.76, 0.34], [0.92, 0.48], [1.0, 0.36], [0.98, 0.56],
    [0.86, 0.72], [0.68, 0.84], [0.7, 0.96], [0.62, 0.96], [0.56, 0.86], [0.44, 0.86],
    [0.38, 0.96], [0.3, 0.96], [0.32, 0.82], [0.16, 0.7], [0.08, 0.52], [0.14, 0.34],
    [0.26, 0.2],
  ],
  souris: [
    [0.2, 0.34], [0.16, 0.18], [0.26, 0.08], [0.38, 0.16], [0.4, 0.28], [0.56, 0.26],
    [0.58, 0.12], [0.7, 0.06], [0.8, 0.16], [0.76, 0.32], [0.88, 0.44], [0.94, 0.62],
    [0.88, 0.8], [0.74, 0.9], [1.0, 0.92], [0.98, 1.0], [0.62, 0.96], [0.44, 0.94],
    [0.26, 0.86], [0.14, 0.7], [0.1, 0.5],
  ],
  chat: [
    [0.26, 0.26], [0.24, 0.06], [0.38, 0.16], [0.58, 0.16], [0.72, 0.06], [0.7, 0.26],
    [0.78, 0.4], [0.76, 0.6], [0.82, 0.78], [0.94, 0.86], [1.0, 0.98], [0.8, 0.98],
    [0.66, 0.88], [0.6, 0.96], [0.36, 0.96], [0.28, 0.86], [0.22, 0.62], [0.18, 0.42],
  ],
  nid: [
    [0.0, 0.44], [0.1, 0.34], [0.2, 0.42], [0.28, 0.3], [0.4, 0.4], [0.5, 0.28],
    [0.6, 0.4], [0.72, 0.3], [0.8, 0.42], [0.9, 0.34], [1.0, 0.44], [0.92, 0.72],
    [0.72, 0.92], [0.5, 0.98], [0.28, 0.92], [0.08, 0.72],
  ],
  mouche: [
    [0.44, 0.1], [0.56, 0.1], [0.62, 0.22], [0.86, 0.1], [1.0, 0.24], [0.9, 0.42],
    [0.68, 0.4], [0.72, 0.66], [0.6, 0.86], [0.5, 0.94], [0.4, 0.86], [0.28, 0.66],
    [0.32, 0.4], [0.1, 0.42], [0.0, 0.24], [0.14, 0.1], [0.38, 0.22],
  ],
  chapeau: [
    [0.28, 0.56], [0.3, 0.24], [0.36, 0.12], [0.5, 0.06], [0.64, 0.12], [0.7, 0.24],
    [0.72, 0.56], [0.92, 0.6], [1.0, 0.74], [0.86, 0.86], [0.5, 0.92], [0.14, 0.86],
    [0.0, 0.74], [0.08, 0.6],
  ],
  drapeau: [
    [0.0, 0.0], [0.1, 0.0], [0.1, 0.3], [0.3, 0.16], [0.56, 0.28], [0.8, 0.14],
    [1.0, 0.26], [1.0, 0.62], [0.8, 0.5], [0.56, 0.64], [0.3, 0.52], [0.1, 0.66],
    [0.1, 1.0], [0.0, 1.0],
  ],
  vitreCarreaux: [
    [0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0],
    [0.08, 0.08], [0.46, 0.08], [0.46, 0.46], [0.08, 0.46],
    [0.54, 0.08], [0.92, 0.08], [0.92, 0.46], [0.54, 0.46],
    [0.08, 0.54], [0.46, 0.54], [0.46, 0.92], [0.08, 0.92],
    [0.54, 0.54], [0.92, 0.54], [0.92, 0.92], [0.54, 0.92],
  ],
};

/**
 * Les contours à trous : la liste dit, pour chaque silhouette, où commencent les anneaux
 * intérieurs. `evenodd` les soustrait, et `mesureDeRegion` fait de même — la surface déclarée
 * est donc celle de la matière, jamais celle de l'enveloppe.
 */
const COUPURES = {
  panier: [9],
  souche: [10],
  geode: [9],
  vitreCarreaux: [4, 8, 12, 16],
};

/**
 * Pose une silhouette du carré unité dans la boîte `(x, y, w, h)`.
 * Rend un TABLEAU D'ANNEAUX : un seul pour la plupart, plusieurs pour les formes à trous.
 */
export function poser(nom, x, y, w, h, { miroir = false } = {}) {
  const contour = CONTOURS[nom];
  if (contour === undefined) throw new Error(`silhouette inconnue : ${nom}`);
  const place = contour.map(([u, v]) => [x + (miroir ? 1 - u : u) * w, y + v * h]);
  const coupures = COUPURES[nom] ?? [];
  if (coupures.length === 0) return [place];
  const bornes = [0, ...coupures, place.length];
  const anneaux = [];
  for (let i = 0; i < bornes.length - 1; i += 1) {
    anneaux.push(place.slice(bornes[i], bornes[i + 1]));
  }
  return anneaux;
}

/** Les noms disponibles — sert au contrôle « toute silhouette citée existe ». */
export const SILHOUETTES = Object.freeze(Object.keys(CONTOURS));
