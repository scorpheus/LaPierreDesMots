/**
 * Le contrôle BLOQUANT des régions fermées — lot N7, contrat de finition v3 § 4.7.
 *
 * « Un trait interrompu d'un pixel fait fuiter le remplissage sur toute l'image »
 * (CLAUDE.md, annexe P § 3.2). C'est la vérification bloquante de la chaîne image.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER AJOUTE, ET QUI N'EXISTAIT PAS — mesuré, pas supposé
 *
 * Deux contrôles couvraient déjà une part du risque, et ils restent en place :
 *   • `validerSceneSvg` (`partage/src/contenu/validation.ts:371`) juge les `<path>` des
 *     calques de rôle `coloriable`, **et exempte explicitement les calques `trait` et
 *     `fond`** — « le trait est fait de segments ouverts par construction ». L'exemption est
 *     juste tant que le calque de trait n'est pas rempli ; rien ne le vérifiait.
 *   • `cheminsRemplisNonFermes` (`scripts/svg-remplissage.mjs`) juge les SVG sans habillage
 *     sur la seule fermeture syntaxique, en tenant la pile des `fill` des `<g>`.
 *
 * Quatre trous restaient, et ce sont les quatre règles ajoutées ici :
 *
 *   1. `trait-rempli` — un élément d'un calque de rôle `trait` qui porte un `fill` effectif
 *      autre que `none`. C'est le cas que `validerSceneSvg` ne peut pas voir, puisqu'il ne
 *      regarde pas ce calque. Un calque de trait rempli peint par-dessus tout le dessin.
 *   2. `region-non-declaree` — un élément identifié d'un calque `coloriable` que l'habillage
 *      ne déclare pas. Il est dessiné, il n'est jamais recolorié, et il ne compte pas dans le
 *      pourcentage de recoloration : un trou silencieux dans la barre de progression. C'est
 *      la règle « auditer les OBJETS, jamais les occurrences » appliquée au décor — on
 *      énumère les objets qui DEVRAIENT porter la propriété, pas les occurrences d'un mot.
 *   3. `surface-divergente` — la `surface` déclarée par l'habillage et celle mesurée sur la
 *      géométrie diffèrent de plus de `TOLERANCE_SURFACE`. La surface donne son rayon de
 *      visée à `regionSousLeDoigt` (`partage/src/moteurs/colorie/validation.ts:64`).
 *   4. `centroide-hors-region` — le centroïde déclaré ne tombe pas dans la région qu'il
 *      désigne. C'est lui qui reçoit le tap au clavier et qui donne son origine au balayage
 *      de recoloration : « une valeur périmée ferait peindre la région voisine ».
 *
 * Les règles 1 et 2 et la fermeture sont **bloquantes** partout. Les règles 3 et 4 sont
 * bloquantes en mode `strict` seulement : les 37 habillages livrés avant ce lot portent des
 * centroïdes posés à la main, et rendre le dépôt rouge pour des fichiers qu'aucun lot ne
 * possède ferait ignorer le contrôle — ce qui est exactement la façon dont un contrôle meurt.
 * En mode ordinaire elles sont COMPTÉES et IMPRIMÉES, jamais tues.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * TOUT EST PUR ET INJECTÉ. `estCheminFerme` arrive en argument, comme dans
 * `scripts/svg-remplissage.mjs` : la règle de fermeture est celle du paquet `partage`, elle
 * n'est pas réimplantée ici. Deux implantations de la même règle finissent par diverger.
 *
 * Usage : `node scripts/verifier-regions-fermees.mjs [--strict] [chemin…]`
 * Code de sortie 1 dès la première anomalie bloquante. Aucune écriture, aucun réseau.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// ────────────────────────────────────────────────────────────────────────────── constantes

/** Écart relatif toléré entre la surface déclarée et la surface mesurée. */
export const TOLERANCE_SURFACE = 0.02;

/** Les règles bloquantes en toutes circonstances. */
export const REGLES_BLOQUANTES = Object.freeze([
  'chemin-ouvert',
  'trait-rempli',
  'region-declaree-absente',
  'region-non-declaree',
]);

/** Les règles de métrologie : bloquantes en `strict`, comptées et imprimées sinon. */
export const REGLES_METROLOGIE = Object.freeze([
  'surface-divergente',
  'centroide-hors-region',
  'mesure-impossible',
]);

/** Les balises qui dessinent une forme fermée d'office. Elles ne peuvent pas fuiter. */
const BALISES_FERMEES = new Set(['circle', 'rect', 'ellipse', 'polygon']);

// ──────────────────────────────────────────────────────────────────────── géométrie exacte

/**
 * Découpe un attribut `d` en anneaux polygonaux (listes de sommets absolus).
 *
 * **Rend `null` dès qu'une commande non polygonale apparaît** (`A`, `C`, `Q`, `S`, `T`, ou
 * une forme relative). Le doute penche vers l'aveu : une mesure approchée d'un arc donnerait
 * une surface fausse de quelques pourcents, et c'est précisément la grandeur qu'on compare à
 * `TOLERANCE_SURFACE`. Un `null` devient `mesure-impossible`, qui se voit ; une mesure
 * approchée devient un écart qu'on impute au dessin.
 *
 * @param {string} d
 * @returns {Array<Array<readonly [number, number]>> | null}
 */
export function polygonesDuChemin(d) {
  const jetons = d.trim().match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  if (jetons === null) return null;

  const anneaux = [];
  let courant = null;
  let i = 0;

  while (i < jetons.length) {
    const commande = jetons[i];
    if (!/^[A-Za-z]$/.test(commande)) return null;
    i += 1;

    if (commande === 'Z' || commande === 'z') {
      if (courant === null || courant.length < 3) return null;
      anneaux.push(courant);
      courant = null;
      continue;
    }
    if (commande !== 'M' && commande !== 'L' && commande !== 'H' && commande !== 'V') {
      return null; // arc, courbe, ou commande relative : hors du domaine polygonal.
    }

    // Une commande peut porter plusieurs paires (`M x,y x,y` = un M puis des L implicites).
    let premier = true;
    while (i < jetons.length && !/^[A-Za-z]$/.test(jetons[i])) {
      if (commande === 'H' || commande === 'V') {
        if (courant === null) return null;
        const precedent = courant[courant.length - 1];
        const n = Number(jetons[i]);
        i += 1;
        courant.push(commande === 'H' ? [n, precedent[1]] : [precedent[0], n]);
        continue;
      }
      if (i + 1 >= jetons.length) return null;
      const point = [Number(jetons[i]), Number(jetons[i + 1])];
      i += 2;
      if (commande === 'M' && premier) {
        if (courant !== null) return null; // un `M` qui coupe un anneau non refermé.
        courant = [point];
      } else {
        if (courant === null) return null;
        courant.push(point);
      }
      premier = false;
    }
  }

  if (courant !== null) return null; // dernier anneau non refermé.
  return anneaux.length === 0 ? null : anneaux;
}

/**
 * Aire signée d'un anneau (formule du lacet).
 *
 * CONVENTION, contrôlée par `tests/unitaires/regions-fermees.test.ts` : en coordonnées SVG
 * l'axe `y` descend, donc l'aire signée est **positive pour un parcours horaire à l'écran**.
 *
 * @param {ReadonlyArray<readonly [number, number]>} anneau
 * @returns {number}
 */
export function aireSignee(anneau) {
  let somme = 0;
  for (let i = 0; i < anneau.length; i += 1) {
    const [x1, y1] = anneau[i];
    const [x2, y2] = anneau[(i + 1) % anneau.length];
    somme += x1 * y2 - x2 * y1;
  }
  return somme / 2;
}

/** Centroïde d'un anneau simple. */
function centroideAnneau(anneau) {
  const aire = aireSignee(anneau);
  if (Math.abs(aire) < 1e-9) {
    // Anneau dégénéré : on rend la moyenne des sommets plutôt qu'une division par zéro.
    const n = anneau.length;
    return [
      anneau.reduce((t, [x]) => t + x, 0) / n,
      anneau.reduce((t, [, y]) => t + y, 0) / n,
    ];
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < anneau.length; i += 1) {
    const [x1, y1] = anneau[i];
    const [x2, y2] = anneau[(i + 1) % anneau.length];
    const croix = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * croix;
    cy += (y1 + y2) * croix;
  }
  return [cx / (6 * aire), cy / (6 * aire)];
}

/**
 * Un point est-il dans un anneau ? Lancer de rayon, règle pair-impair.
 *
 * @param {ReadonlyArray<readonly [number, number]>} anneau
 * @param {readonly [number, number]} point
 */
export function pointDansAnneau(anneau, [px, py]) {
  let dedans = false;
  for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i, i += 1) {
    const [xi, yi] = anneau[i];
    const [xj, yj] = anneau[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      dedans = !dedans;
    }
  }
  return dedans;
}

/**
 * Un point est-il dans la région, TROUS COMPRIS (règle `evenodd`) ?
 *
 * @param {ReadonlyArray<ReadonlyArray<readonly [number, number]>>} anneaux
 * @param {readonly [number, number]} point
 */
export function pointDansRegion(anneaux, point) {
  let croisements = 0;
  for (const anneau of anneaux) if (pointDansAnneau(anneau, point)) croisements += 1;
  return croisements % 2 === 1;
}

/** Rectangle englobant d'un anneau : `[xmin, ymin, xmax, ymax]`. */
function boite(anneau) {
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;
  for (const [x, y] of anneau) {
    if (x < xmin) xmin = x;
    if (y < ymin) ymin = y;
    if (x > xmax) xmax = x;
    if (y > ymax) ymax = y;
  }
  return [xmin, ymin, xmax, ymax];
}

/**
 * Surface et centroïde d'une région polygonale à trous, sous la règle `evenodd`.
 *
 * Un anneau contenu dans un nombre IMPAIR d'autres anneaux est un trou : sa contribution est
 * soustraite.
 *
 * ── LE PIÈGE, MESURÉ ICI PLUTÔT QUE SUPPOSÉ ────────────────────────────────────────────────
 * La première écriture testait l'inclusion sur le CENTROÏDE de chaque anneau. Sur un carré de
 * 10 × 10 percé d'un carré de 4 × 4 **centré**, les deux anneaux ont le même centroïde (5, 5) :
 * le trou contenait donc l'extérieur autant que l'inverse, les deux étaient déclarés trous, et
 * la mesure rendait 116 au lieu de 84 — soit 38 % d'erreur sur la grandeur qu'on compare
 * ensuite à 2 %. Le cas est resté dans la suite (« un trou `evenodd` se SOUSTRAIT ») pour que
 * personne ne réintroduise la version courte.
 *
 * L'inclusion est donc jugée sur DEUX conditions conjointes, et l'aire du rectangle englobant
 * est celle qui casse la symétrie : un trou est toujours plus petit que ce qui le perce.
 * Le représentant du test de point est le milieu entre le premier sommet et le centroïde de
 * l'anneau — un point franchement intérieur, jamais posé sur une arête partagée.
 * ───────────────────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} d
 * @returns {{ surface: number, centroide: readonly [number, number] } | null}
 */
export function mesureDeRegion(d) {
  const anneaux = polygonesDuChemin(d);
  if (anneaux === null) return null;

  const centres = anneaux.map(centroideAnneau);
  const boites = anneaux.map(boite);
  const airesBoite = boites.map(([x0, y0, x1, y1]) => (x1 - x0) * (y1 - y0));
  const representants = anneaux.map((anneau, i) => [
    (anneau[0][0] + centres[i][0]) / 2,
    (anneau[0][1] + centres[i][1]) / 2,
  ]);

  let surface = 0;
  let mx = 0;
  let my = 0;

  for (let i = 0; i < anneaux.length; i += 1) {
    let englobants = 0;
    for (let j = 0; j < anneaux.length; j += 1) {
      if (j === i) continue;
      if (airesBoite[j] <= airesBoite[i]) continue;
      if (pointDansAnneau(anneaux[j], representants[i])) englobants += 1;
    }
    const signe = englobants % 2 === 0 ? 1 : -1;
    const aire = Math.abs(aireSignee(anneaux[i])) * signe;
    surface += aire;
    mx += centres[i][0] * aire;
    my += centres[i][1] * aire;
  }

  if (Math.abs(surface) < 1e-9) return null;
  return { surface, centroide: [mx / surface, my / surface] };
}

/** Distance d'un point au segment `[a, b]`. */
function distanceAuSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const carre = dx * dx + dy * dy;
  const t = carre === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / carre));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distance d'un point au bord le plus proche de la région, tous anneaux confondus. */
function distanceAuBord(anneaux, point) {
  let minimum = Infinity;
  for (const anneau of anneaux) {
    for (let i = 0; i < anneau.length; i += 1) {
      const d = distanceAuSegment(point, anneau[i], anneau[(i + 1) % anneau.length]);
      if (d < minimum) minimum = d;
    }
  }
  return minimum;
}

/** Finesse de la recherche du point représentatif. 64 × 64 sur le rectangle englobant. */
const PAS_RECHERCHE = 64;

/**
 * UN POINT QUI EST VRAIMENT DANS LA RÉGION — et le plus loin possible de son bord.
 *
 * ── POURQUOI LE CENTROÏDE D'AIRE NE SUFFIT PAS. Mesuré sur le décor v2 de ce lot même ──────
 * Le centroïde d'aire d'une forme percée tombe volontiers DANS le trou. Trois régions sur
 * trente et une le faisaient à la première génération :
 *
 *   toit-ecole  centroïde d'aire [215, 233.5] → dans le trou de l'horloge (centre 215,232)
 *   mur-ecole   centroïde d'aire [215, 336.6] → dans l'embrasure de la porte
 *   corde       centroïde d'aire [70, 575]    → au milieu de la boucle, c'est-à-dire dans le vide
 *
 * Ce n'est pas un détail de calcul. Ce centroïde est ce que `SceneSvg` emploie pour peindre
 * AU CLAVIER (`peindreAuClavier`) et comme origine du balayage radial de recoloration : posé
 * dans un trou, il fait démarrer la couleur hors de la forme. Et `regionSousLeDoigt` en fait
 * le centre du disque de visée : un centre hors de l'encre décale toute la tolérance.
 *
 * On cherche donc le point INTÉRIEUR le plus éloigné du bord — le point où le doigt a le plus
 * de marge. Recherche par grille plutôt qu'analytiquement : une grille de 64 × 64 sur le
 * rectangle englobant est exacte à ~1 % de la diagonale, largement sous la tolérance de visée
 * de 24 px, et elle ne peut pas rendre un point faux — seulement, à la limite, un point
 * légèrement moins central.
 * ───────────────────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} d
 * @returns {{ point: readonly [number, number], marge: number } | null}
 */
export function pointRepresentatif(d) {
  const anneaux = polygonesDuChemin(d);
  if (anneaux === null) return null;

  // Le centroïde d'aire est un CANDIDAT, jamais un raccourci. Mesuré sur le `banc` du décor
  // v2 (une assise et deux pieds) : son centroïde d'aire tombe bien dans l'assise, mais à
  // 1,2 unité du bord inférieur — techniquement dedans, inutilisable comme point de visée.
  // Une sortie anticipée sur « il est dedans » aurait rendu ce point-là.
  const mesure = mesureDeRegion(d);
  let meilleur = null;
  let meilleureMarge = -1;
  if (mesure !== null && pointDansRegion(anneaux, mesure.centroide)) {
    meilleur = mesure.centroide;
    meilleureMarge = distanceAuBord(anneaux, mesure.centroide);
  }

  const points = anneaux.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);

  for (let i = 1; i < PAS_RECHERCHE; i += 1) {
    for (let j = 1; j < PAS_RECHERCHE; j += 1) {
      const candidat = [
        x0 + ((x1 - x0) * i) / PAS_RECHERCHE,
        y0 + ((y1 - y0) * j) / PAS_RECHERCHE,
      ];
      if (!pointDansRegion(anneaux, candidat)) continue;
      const marge = distanceAuBord(anneaux, candidat);
      if (marge > meilleureMarge) {
        meilleureMarge = marge;
        meilleur = candidat;
      }
    }
  }
  return meilleur === null ? null : { point: meilleur, marge: meilleureMarge };
}

// ─────────────────────────────────────────────────────────────── lecture structurelle du SVG

function attribut(balise, nom) {
  const trouve = new RegExp(`\\b${nom}\\s*=\\s*"([^"]*)"`).exec(balise);
  return trouve === null ? null : trouve[1].trim();
}

/**
 * Les éléments dessinés d'un SVG, avec leur calque et leur `fill` EFFECTIF.
 *
 * Le `fill` s'hérite du `<g>` parent : c'est la nuance qui décide, et l'omettre produirait
 * cinq faux positifs sur `carte-monde.svg` (le chemin d'encre, ouvert par nature, dans un
 * groupe `fill="none"`). Sans `fill` nulle part, la valeur SVG par défaut est `black` : le
 * tracé est rempli, donc contrôlé. **Le doute penche vers le contrôle.**
 *
 * @param {string} texteSvg
 * @returns {Array<{ balise: string, id: string|null, d: string|null, fill: string, calque: string|null }>}
 */
export function elementsDessines(texteSvg) {
  const sortie = [];
  const pileFill = [];
  const pileCalque = [];

  for (const balise of texteSvg.match(/<\/?[a-zA-Z][^>]*>/g) ?? []) {
    if (/^<g\b/.test(balise)) {
      const propre = attribut(balise, 'fill');
      pileFill.push(propre ?? pileFill[pileFill.length - 1] ?? null);
      pileCalque.push(attribut(balise, 'id') ?? pileCalque[pileCalque.length - 1] ?? null);
      if (/\/>$/.test(balise)) {
        pileFill.pop();
        pileCalque.pop();
      }
      continue;
    }
    if (/^<\/g\b/.test(balise)) {
      pileFill.pop();
      pileCalque.pop();
      continue;
    }

    const nom = /^<([a-zA-Z]+)/.exec(balise)?.[1] ?? '';
    if (nom !== 'path' && !BALISES_FERMEES.has(nom)) continue;

    sortie.push({
      balise: nom,
      id: attribut(balise, 'id'),
      d: attribut(balise, 'd'),
      fill: attribut(balise, 'fill') ?? pileFill[pileFill.length - 1] ?? 'black',
      calque: pileCalque[pileCalque.length - 1] ?? null,
    });
  }
  return sortie;
}

// ─────────────────────────────────────────────────────────────────────────────── l'audit

/**
 * Audite UN fichier SVG, avec son habillage quand il en a un.
 *
 * @param {{
 *   chemin: string,
 *   texteSvg: string,
 *   habillage?: unknown,
 *   estCheminFerme: (d: string) => boolean,
 * }} entree
 * @returns {{ chemin: string, nbElements: number, nbRegionsDeclarees: number, anomalies: Array<{regle: string, ou: string, message: string}> }}
 */
export function auditerSvg({ chemin, texteSvg, habillage, estCheminFerme }) {
  const anomalies = [];
  const ajouter = (regle, ou, message) => anomalies.push({ regle, ou, message });

  const elements = elementsDessines(texteSvg);

  /** Rôle de chaque calque déclaré par l'habillage : `coloriable`, `trait`, `fond`. */
  const roles = new Map();
  /** Régions déclarées, par `id`, tous calques coloriables confondus. */
  const declarees = new Map();
  if (habillage != null && typeof habillage === 'object') {
    for (const calque of habillage.scene?.calques ?? []) {
      roles.set(calque.id, calque.role);
      if (calque.role !== 'coloriable') continue;
      for (const region of calque.regions ?? []) declarees.set(region.id, { region, calque });
    }
  }

  const vus = new Set();

  for (const element of elements) {
    const ou = `${chemin}#${element.id ?? `<${element.balise}> sans id`}`;
    const role = element.calque === null ? null : roles.get(element.calque) ?? null;
    const rempli = element.fill !== 'none' && element.fill !== '';

    // ── règle 1 : un calque de TRAIT ne se remplit jamais.
    if (role === 'trait' && rempli) {
      ajouter(
        'trait-rempli',
        ou,
        `Calque de trait « ${element.calque} » rempli (fill="${element.fill}"). Le trait est ` +
          'fait de segments ouverts par construction : rempli, il peint par-dessus le dessin. ' +
          '`validerSceneSvg` exempte ce calque et ne peut pas voir ce cas.'
      );
    }

    // ── la fermeture, sur tout tracé rempli, quel que soit son calque.
    if (element.d !== null && rempli && !estCheminFerme(element.d)) {
      ajouter(
        'chemin-ouvert',
        ou,
        'Chemin rempli non refermé : un trait interrompu fait fuiter le remplissage sur ' +
          'toute l’image (annexe P § 3.2).'
      );
    }

    if (element.id === null) continue;
    vus.add(element.id);

    // ── règle 2 : un élément identifié d'un calque coloriable que l'habillage ignore.
    if (role === 'coloriable' && !declarees.has(element.id)) {
      ajouter(
        'region-non-declaree',
        ou,
        `« ${element.id} » est dessiné dans un calque coloriable et absent de l’habillage : ` +
          'il ne sera jamais recolorié et ne compte pas dans le pourcentage de recoloration.'
      );
    }

    // ── règles 3 et 4 : la métrologie de visée.
    const declaree = declarees.get(element.id);
    if (declaree === undefined || element.d === null) continue;

    const mesure = mesureDeRegion(element.d);
    if (mesure === null) {
      ajouter(
        'mesure-impossible',
        ou,
        'Géométrie non polygonale (arc ou courbe) : la surface et le centroïde déclarés ne ' +
          'peuvent pas être recalculés, donc pas opposés à la donnée.'
      );
      continue;
    }

    const surfaceMesuree = Math.abs(mesure.surface);
    const surfaceDeclaree = Number(declaree.region.surface);
    const ecart =
      surfaceMesuree === 0 ? 1 : Math.abs(surfaceDeclaree - surfaceMesuree) / surfaceMesuree;
    if (ecart > TOLERANCE_SURFACE) {
      ajouter(
        'surface-divergente',
        ou,
        `surface déclarée ${surfaceDeclaree.toFixed(1)}, mesurée ${surfaceMesuree.toFixed(1)} ` +
          `(écart ${(ecart * 100).toFixed(1)} %). Elle donne son rayon de visée à ` +
          '`regionSousLeDoigt`.'
      );
    }

    const anneaux = polygonesDuChemin(element.d);
    const centre = declaree.region.centroide;
    if (anneaux !== null && Array.isArray(centre) && !pointDansRegion(anneaux, centre)) {
      ajouter(
        'centroide-hors-region',
        ou,
        `centroïde déclaré [${String(centre[0])}, ${String(centre[1])}] hors de la région. ` +
          'Il reçoit le tap au clavier et donne son origine au balayage de recoloration : ' +
          'une valeur périmée fait peindre la région voisine.'
      );
    }
  }

  // ── règle « région déclarée absente », énumérée sur les OBJETS que l'habillage promet.
  for (const [id] of declarees) {
    if (vus.has(id)) continue;
    ajouter(
      'region-declaree-absente',
      `${chemin}#${id}`,
      `Région « ${id} » déclarée par l’habillage et absente du SVG : la consigne qui la ` +
        'nomme devient injouable.'
    );
  }

  return {
    chemin,
    nbElements: elements.length,
    nbRegionsDeclarees: declarees.size,
    anomalies,
  };
}

// ────────────────────────────────────────────────────────────────── parcours du dépôt

/** Tous les fichiers d'un dossier, récursivement, filtrés par suffixe. */
export function fichiersSous(racine, suffixe) {
  const sortie = [];
  const pile = [racine];
  while (pile.length > 0) {
    const dossier = pile.pop();
    let entrees;
    try {
      entrees = readdirSync(dossier, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entree of entrees) {
      const chemin = join(dossier, entree.name);
      if (entree.isDirectory()) pile.push(chemin);
      else if (entree.name.endsWith(suffixe)) sortie.push(chemin);
    }
  }
  return sortie.sort();
}

/**
 * Le rapport complet sur `contenu/`.
 *
 * Les SVG sont indexés par leur chemin RELATIF À `contenu/`, qui est aussi la forme sous
 * laquelle les habillages les citent (`scene.fichier` vaut `habillages/clairiere/ecole.svg`) :
 * l'appariement se fait sur cette chaîne, jamais sur une convention de nommage.
 *
 * @param {{ racine: string, estCheminFerme: (d: string) => boolean }} entree
 */
export function verifierRegionsFermees({ racine, estCheminFerme }) {
  const dossierContenu = join(racine, 'contenu');

  /** `habillages/clairiere/ecole.svg` → l'habillage qui le déclare. */
  const parFichier = new Map();
  for (const chemin of fichiersSous(dossierContenu, '.habillage.json')) {
    const habillage = JSON.parse(readFileSync(chemin, 'utf8'));
    const fichier = habillage?.scene?.fichier;
    if (typeof fichier === 'string') parFichier.set(fichier.split('/').join(sep), habillage);
  }

  const rapports = [];
  for (const chemin of fichiersSous(dossierContenu, '.svg')) {
    const relatifAuContenu = relative(dossierContenu, chemin);
    rapports.push(
      auditerSvg({
        chemin: relative(racine, chemin).split(sep).join('/'),
        texteSvg: readFileSync(chemin, 'utf8'),
        habillage: parFichier.get(relatifAuContenu),
        estCheminFerme,
      })
    );
  }

  const anomalies = rapports.flatMap((r) => r.anomalies);
  return {
    nbSvg: rapports.length,
    nbElements: rapports.reduce((t, r) => t + r.nbElements, 0),
    nbRegionsDeclarees: rapports.reduce((t, r) => t + r.nbRegionsDeclarees, 0),
    nbHabillagesApparies: parFichier.size,
    rapports,
    anomalies,
    bloquantes: anomalies.filter((a) => REGLES_BLOQUANTES.includes(a.regle)),
    metrologie: anomalies.filter((a) => REGLES_METROLOGIE.includes(a.regle)),
  };
}

// ─────────────────────────────────────────────────────────────────────────── ligne de commande

/* c8 ignore start — le corps CLI n'est pas atteint par les tests unitaires. */
if (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].split(sep).join('/'))) {
  const strict = process.argv.includes('--strict');
  const racine = process.cwd();

  let estCheminFerme;
  try {
    ({ estCheminFerme } = await import('@pierre/partage/validation'));
  } catch (erreur) {
    console.error(
      '`@pierre/partage/validation` est introuvable ou non construit. Lancer ' +
        '`npm install` puis `npm run typescript`. Détail : ' +
        (erreur instanceof Error ? erreur.message : String(erreur))
    );
    process.exit(1);
  }

  const rapport = verifierRegionsFermees({ racine, estCheminFerme });
  const fatales = strict ? rapport.anomalies : rapport.bloquantes;

  console.log(
    `verifier-regions-fermees — ${String(rapport.nbSvg)} SVG, ` +
      `${String(rapport.nbElements)} élément(s) dessiné(s), ` +
      `${String(rapport.nbRegionsDeclarees)} région(s) déclarée(s) par ` +
      `${String(rapport.nbHabillagesApparies)} habillage(s)`
  );
  for (const a of rapport.anomalies) console.log(`  ${a.regle} — ${a.ou} : ${a.message}`);
  console.log(
    `  → ${String(rapport.bloquantes.length)} bloquante(s), ` +
      `${String(rapport.metrologie.length)} de métrologie` +
      (strict ? ' (mode --strict : les deux sont bloquantes)' : '')
  );

  if (rapport.nbSvg === 0) {
    console.error('Aucun SVG trouvé : ce n’est pas une réussite, c’est une absence.');
    process.exit(1);
  }
  process.exit(fatales.length === 0 ? 0 : 1);
}
/* c8 ignore stop */
