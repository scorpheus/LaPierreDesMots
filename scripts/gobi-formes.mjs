#!/usr/bin/env node
/**
 * Les 25 cristaux de graphème — lot M5, contrat du monde v4 § M5.
 *
 * ── CE QU'ILS ÉTAIENT, MESURÉ ───────────────────────────────────────────────────────────────
 *
 * L'inventaire du contrat v4 § 1.2 les range parmi les bouchons, et il a raison :
 * « `formes/*.svg` — 25 fichiers, 893 à 958 octets, 3 `<path>` chacun. **Bouchons.** Le même
 * cristal à trois facettes, dont seuls la silhouette et la teinte varient. Rien n'y évoque le
 * graphème. » D44 dit pourquoi c'est grave : *deux formes identiques ne se collectionneraient
 * pas*. Une collection dont les pièces se ressemblent n'est pas une collection, c'est un compteur.
 *
 * ── POURQUOI LE VECTEUR, ET NON UNE TRACE DU PNG ────────────────────────────────────────────
 *
 * Les 25 PNG existent : `production/personnages/gobi/formes/*.png`, produits par inpainting
 * régional depuis la canonique (`scripts/decliner-gobi.mjs --formes`). Ils sont la trace de
 * production et le témoin de ce à quoi le cristal doit ressembler. **Ils ne sont pas
 * vectorisables ici**, et ce n'est pas un manque de courage — c'est mesuré ailleurs :
 *
 *   — `potrace` est ABSENT de `outils/bin/` (CLAUDE.md, environnement § 3, et le contrat v4
 *     § 2 le remesure) ; le contrat l'a d'ailleurs retiré du chemin pour les décors de M6 ;
 *   — le guide § 5.1 MESURE l'extraction de trait depuis une image en couleur : **0/12** à la
 *     porte technique, 11/12 fuites, 165 composantes d'encre contre 57. « Le trait obtenu n'est
 *     pas le trait du dessin, c'est la carte de ses contrastes. »
 *
 * Le cristal est en outre monté à **24 à 64 px** dans la bulle d'aide : ce qui s'y lit, c'est
 * une SILHOUETTE, pas une texture. C'est exactement l'arbitrage que M6 rend pour les décors,
 * sur les mêmes deux faits mesurés, et il vaut ici pour la même raison.
 *
 * ── CE QUI REND LE RÉSULTAT VÉRIFIABLE PLUTÔT QUE JOLI ──────────────────────────────────────
 *
 * Chaque silhouette est déclarée en POLYGONES, pas en courbes. Conséquence : ce script la
 * rastérise lui-même, à 160², règle pair-impair comprise, et **calcule le recouvrement des 300
 * paires**. Le contrat de sortie de M5 exige « 0 paire au-dessus de 0,90 » ; ici ce n'est pas
 * une affirmation, c'est une sortie de commande, et le script REFUSE D'ÉCRIRE si le plafond est
 * franchi (convention C6 : un générateur refuse plutôt que d'émettre du faux).
 *
 * Les teintes viennent **exclusivement** de `production/personnages/gobi/gobi.lock.json`, dont
 * la palette est échantillonnée sur les pixels de la canonique. Aucune n'est choisie à la main.
 *
 * Usage :
 *   node scripts/gobi-formes.mjs             écrit les 25 SVG
 *   node scripts/gobi-formes.mjs --verifier  n'écrit rien : mesure et rend le tableau
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER = 'contenu/assets/gobi/formes';
const COTE = 64;
const TRAME = 160;
const PLAFOND_RECOUVREMENT = 0.9;

// ------------------------------------------------------------------- fabriques de silhouette

/** Un anneau régulier à `n` sommets — un cristal taillé, jamais un disque parfait. */
function facette(cx, cy, rayon, sommets = 8, phase = -Math.PI / 2, aplati = 1) {
  return Array.from({ length: sommets }, (_, index) => {
    const angle = phase + (2 * Math.PI * index) / sommets;
    return [
      Number((cx + rayon * Math.cos(angle)).toFixed(2)),
      Number((cy + rayon * aplati * Math.sin(angle)).toFixed(2))
    ];
  });
}

/** Un prisme : pointe, deux épaules, deux pieds. La forme de base d'un cristal de la canonique. */
function prisme(cx, sommet, pied, demiLargeur, epaule = 0.22, penche = 0) {
  const hauteur = pied - sommet;
  const yEpaule = sommet + hauteur * epaule;
  const decale = penche * hauteur;
  return [
    [cx + decale, sommet],
    [cx + decale * 0.6 + demiLargeur, yEpaule],
    [cx + demiLargeur * 0.86, pied],
    [cx - demiLargeur * 0.86, pied],
    [cx + decale * 0.6 - demiLargeur, yEpaule]
  ].map(([x, y]) => [Number(x.toFixed(2)), Number(y.toFixed(2))]);
}

/** Une polyligne épaissie — la seule façon honnête de décrire un zigzag ou une vague. */
function ruban(points, demiEpaisseur) {
  const gauche = [];
  const droite = [];
  for (let index = 0; index < points.length; index += 1) {
    const avant = points[Math.max(0, index - 1)];
    const apres = points[Math.min(points.length - 1, index + 1)];
    const dx = apres[0] - avant[0];
    const dy = apres[1] - avant[1];
    const norme = Math.hypot(dx, dy) || 1;
    const nx = (-dy / norme) * demiEpaisseur;
    const ny = (dx / norme) * demiEpaisseur;
    gauche.push([points[index][0] + nx, points[index][1] + ny]);
    droite.push([points[index][0] - nx, points[index][1] - ny]);
  }
  return [...gauche, ...droite.reverse()].map(([x, y]) => [
    Number(x.toFixed(2)),
    Number(y.toFixed(2))
  ]);
}

/** Une spirale plate, décrite comme un ruban dont le rayon croît. */
function spirale(cx, cy, rayonDepart, croissance, tours, demiEpaisseur) {
  const points = [];
  const pas = 0.25;
  for (let angle = 0; angle <= tours * 2 * Math.PI; angle += pas) {
    const rayon = rayonDepart + croissance * angle;
    points.push([cx + rayon * Math.cos(angle), cy + rayon * Math.sin(angle)]);
  }
  return ruban(points, demiEpaisseur);
}

// --------------------------------------------------------------------------- les 25 formes

/**
 * **UNE GÉOMÉTRIE PAR GRAPHÈME, ET LE GRAPHÈME LA MOTIVE.**
 *
 * `anneaux` : chaque forme est une liste de contours ; un contour intérieur creuse (pair-impair),
 * ce qui donne un `o` réellement percé et un `gn` réellement noué.
 * `teinte` : `clair`, `bleu` ou `rose` — les trois seules teintes de cristal mesurées sur la
 * canonique. Elles ne distinguent pas les formes, la silhouette s'en charge : deux teintes d'un
 * même pentagone se recouvriraient à 1,00 quoi qu'on en dise.
 */
export const FORMES = {
  a: { teinte: 'clair', quoi: 'une goutte large dont la pointe se recourbe',
    anneaux: [[[[40, 6], [46, 14], [52, 28], [50, 44], [38, 55], [22, 53], [13, 40], [15, 24], [26, 13]]]] },
  e: { teinte: 'bleu', quoi: 'un ruban qui s enroule vers la gauche',
    anneaux: [[ruban([[46, 8], [30, 20], [20, 34], [24, 48], [16, 57]], 5)]] },
  i: { teinte: 'clair', quoi: 'une aiguille fine surmontee d un point detache',
    anneaux: [[prisme(32, 18, 58, 5)], [facette(32, 8, 6, 4)]] },
  o: { teinte: 'bleu', quoi: 'un anneau ferme, creux en son centre',
    anneaux: [[facette(32, 32, 25, 10), facette(32, 32, 11, 10)]] },
  u: { teinte: 'rose', quoi: 'deux dents jointes par le bas, une coupe',
    anneaux: [[[[12, 8], [23, 8], [25, 40], [39, 40], [41, 8], [52, 8], [52, 46], [44, 57], [20, 57], [12, 46]]]] },
  b: { teinte: 'clair', quoi: 'une fleche droite, sa boule au pied a droite',
    anneaux: [[prisme(27, 5, 57, 6)], [facette(43, 45, 12, 8)]] },
  d: { teinte: 'clair', quoi: 'une fleche droite, sa boule au pied a gauche',
    anneaux: [[prisme(37, 5, 57, 6)], [facette(21, 45, 12, 8)]] },
  p: { teinte: 'bleu', quoi: 'une pointe vers le bas, sa boule en haut a droite',
    anneaux: [[[[22, 8], [33, 8], [34, 44], [28, 58], [22, 44]]], [facette(44, 19, 12, 8)]] },
  q: { teinte: 'bleu', quoi: 'une pointe vers le bas, sa boule en haut a gauche',
    anneaux: [[[[31, 8], [42, 8], [42, 44], [36, 58], [30, 44]]], [facette(20, 19, 12, 8)]] },
  t: { teinte: 'clair', quoi: 'un mat barre d un eclat couche',
    anneaux: [[prisme(32, 4, 58, 6)], [[[6, 26], [20, 20], [44, 20], [58, 26], [44, 32], [20, 32]]]] },
  on: { teinte: 'bleu', quoi: 'deux cristaux fondus en une arche',
    anneaux: [[[[5, 57], [5, 33], [14, 16], [32, 8], [50, 16], [59, 33], [59, 57], [46, 57], [46, 35], [40, 25], [24, 25], [18, 35], [18, 57]]]] },
  an: { teinte: 'rose', quoi: 'un large triangle entaille sur son flanc gauche',
    anneaux: [[[[34, 4], [57, 52], [57, 58], [9, 58], [9, 51], [21, 31], [29, 38], [24, 20]]]] },
  // PENCHÉ FRANCHEMENT, et son petit compagnon posé bas à gauche : à 0,18 de pente il se
  // confondait avec `d` (mesuré, iou 0,616), qui est droit avec sa boule au pied.
  in: { teinte: 'clair', quoi: 'un cristal nettement penche, un tout petit a son flanc',
    anneaux: [[prisme(30, 6, 54, 6, 0.22, 0.34)], [facette(13, 50, 8, 6)]] },
  ou: { teinte: 'bleu', quoi: 'deux domes cote a cote qui se touchent',
    anneaux: [[facette(21, 36, 16, 9, -Math.PI / 2, 1)], [facette(44, 36, 16, 9, -Math.PI / 2, 1)]] },
  oi: { teinte: 'rose', quoi: 'un dome traverse par une longue aiguille',
    anneaux: [[facette(30, 41, 17, 9)], [ruban([[48, 5], [18, 57]], 5)]] },
  s: { teinte: 'bleu', quoi: 'une vague de glace repliee en S',
    anneaux: [[ruban([[48, 8], [26, 14], [24, 26], [40, 34], [40, 48], [16, 56]], 5)]] },
  x: { teinte: 'clair', quoi: 'deux eclats croises en leur milieu',
    anneaux: [[ruban([[10, 5], [54, 57]], 5)], [ruban([[54, 5], [10, 57]], 5)]] },
  er: { teinte: 'rose', quoi: 'un cristal enroule en spirale plate',
    anneaux: [[spirale(30, 34, 4, 2.4, 1.75, 4)]] },
  ent: { teinte: 'bleu', quoi: 'trois eclats en eventail sur une meme base',
    anneaux: [[ruban([[8, 12], [31, 52]], 5)], [ruban([[32, 4], [32, 56]], 5)], [ruban([[56, 12], [33, 52]], 5)]] },
  ez: { teinte: 'clair', quoi: 'un cristal plie en zigzag',
    anneaux: [[ruban([[10, 8], [48, 24], [14, 40], [52, 56]], 5)]] },
  eau: { teinte: 'bleu', quoi: 'trois cretes arrondies en file, une vague',
    anneaux: [[[[5, 57], [5, 41], [14, 24], [22, 41], [32, 20], [42, 41], [50, 24], [59, 41], [59, 57]]]] },
  ill: { teinte: 'clair', quoi: 'trois aiguilles de meme hauteur, paralleles',
    anneaux: [[prisme(15, 8, 58, 5)], [prisme(32, 8, 58, 5)], [prisme(49, 8, 58, 5)]] },
  gn: { teinte: 'rose', quoi: 'deux anneaux enlaces, un noeud',
    anneaux: [[facette(23, 24, 16, 8), facette(23, 24, 7, 8)], [facette(41, 42, 16, 8), facette(41, 42, 7, 8)]] },
  // L'ÉVENTAIL PIVOTE PAR LE BAS, il ne remplit pas le bas du cadre. Première rédaction : un
  // demi-disque large posé sur le sol — MESURÉ contre `eau` et `an`, il les recouvrait à 0,95
  // et 0,93 (intersection sur la plus petite). Trois « larges taches basses » dans une
  // collection de 25, c'est trois fois la même pièce. La base a été réduite à un pivot.
  ph: { teinte: 'bleu', quoi: 'un eventail ouvert vers le haut sur un pivot etroit',
    anneaux: [[[[32, 58], [26, 50], [6, 26], [13, 17], [32, 9], [51, 17], [58, 26], [38, 50]]]] },
  ch: { teinte: 'clair', quoi: 'deux eclats qui se rejoignent en pointe, un chevron',
    anneaux: [[[[32, 4], [58, 44], [58, 58], [47, 58], [32, 27], [17, 58], [6, 58], [6, 44]]]] }
};

// ------------------------------------------------------------------- rastérisation et mesure

/** Point dans un contour — lancer de rayon, règle pair-impair. */
function dansContour(contour, x, y) {
  let dedans = false;
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i, i += 1) {
    const [xi, yi] = contour[i];
    const [xj, yj] = contour[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      dedans = !dedans;
    }
  }
  return dedans;
}

/** Un masque booléen de TRAME² : un pixel est dedans s'il l'est dans au moins un anneau. */
export function rasteriser(forme) {
  const masque = new Uint8Array(TRAME * TRAME);
  let aire = 0;
  for (let ligne = 0; ligne < TRAME; ligne += 1) {
    const y = ((ligne + 0.5) * COTE) / TRAME;
    for (let colonne = 0; colonne < TRAME; colonne += 1) {
      const x = ((colonne + 0.5) * COTE) / TRAME;
      const dedans = forme.anneaux.some((anneau) =>
        anneau.reduce((etat, contour) => (dansContour(contour, x, y) ? !etat : etat), false)
      );
      if (dedans) {
        masque[ligne * TRAME + colonne] = 1;
        aire += 1;
      }
    }
  }
  return { masque, aire };
}

/** Le recouvrement de deux silhouettes : intersection sur union, et intersection sur la plus petite. */
export function recouvrement(a, b) {
  let intersection = 0;
  let union = 0;
  for (let index = 0; index < a.masque.length; index += 1) {
    const gauche = a.masque[index];
    const droite = b.masque[index];
    if (gauche && droite) intersection += 1;
    if (gauche || droite) union += 1;
  }
  return {
    iou: union === 0 ? 0 : intersection / union,
    surPlusPetite: Math.min(a.aire, b.aire) === 0 ? 0 : intersection / Math.min(a.aire, b.aire)
  };
}

// ------------------------------------------------------------------------------- écriture SVG

const chemin = (contour) =>
  `M${contour.map(([x, y]) => `${String(x)},${String(y)}`).join(' L')} Z`;

/** La boîte englobante d'un anneau — sert d'axe de taille, jamais choisi à la main. */
function boite(anneau) {
  const points = anneau.flat();
  return {
    x0: Math.min(...points.map((point) => point[0])),
    x1: Math.max(...points.map((point) => point[0])),
    y0: Math.min(...points.map((point) => point[1])),
    y1: Math.max(...points.map((point) => point[1]))
  };
}

/**
 * Sutherland–Hodgman contre un demi-plan vertical `x ≥ seuil`.
 *
 * C'est ce qui remplace la facette-triangle de la première rédaction. **Regardée rastérisée,
 * elle ne faisait pas lire « cristal » : un petit coin sombre posé sur un aplat lit « galet ».**
 * Ce qui fait le cristal sur la canonique, c'est que la pierre est TAILLÉE — deux faces qui se
 * partagent la silhouette selon une arête. Découper le contour lui-même le donne pour toutes
 * les silhouettes, y compris les anneaux percés : chaque contour est découpé séparément et
 * l'ensemble est rendu en pair-impair, donc le trou du `o` reste un trou.
 */
function decouper(contour, seuil) {
  const sortie = [];
  for (let index = 0; index < contour.length; index += 1) {
    const courant = contour[index];
    const precedent = contour[(index - 1 + contour.length) % contour.length];
    const dedansCourant = courant[0] >= seuil;
    const dedansPrecedent = precedent[0] >= seuil;
    if (dedansCourant !== dedansPrecedent) {
      const part = (seuil - precedent[0]) / (courant[0] - precedent[0]);
      sortie.push([seuil, precedent[1] + part * (courant[1] - precedent[1])]);
    }
    if (dedansCourant) {
      sortie.push(courant);
    }
  }
  return sortie.map(([x, y]) => [Number(x.toFixed(2)), Number(y.toFixed(2))]);
}

/**
 * Le dessin d'un cristal : la silhouette, sa face d'ombre taillée le long de l'arête, et
 * l'éclat blanc que toute pierre facettée porte sur son arête vive.
 *
 * L'arête tombe à 55 % de la largeur et non à 50 % : sur la canonique la lumière vient de la
 * gauche, la face claire est donc la plus large. Un partage exactement médian se lit comme un
 * défaut de symétrie ; décalé, il se lit comme un éclairage.
 */
function dessiner(forme, palette) {
  const teintes = {
    clair: palette.cristalClair,
    bleu: palette.cristalBleu,
    rose: palette.cristalRose
  };
  const face = teintes[forme.teinte];
  const silhouettes = [];
  const ombres = [];
  const eclats = [];

  for (const anneau of forme.anneaux) {
    silhouettes.push(
      `<path class="cristal-face" d="${anneau.map((contour) => chemin(contour)).join(' ')}" ` +
        `fill-rule="evenodd" fill="${face}" stroke="${palette.trait}" stroke-width="3" ` +
        'stroke-linejoin="round"/>'
    );

    const cadre = boite(anneau);
    const arete = Number((cadre.x0 + (cadre.x1 - cadre.x0) * 0.55).toFixed(2));
    const taillees = anneau
      .map((contour) => decouper(contour, arete))
      .filter((contour) => contour.length >= 3);
    if (taillees.length > 0) {
      ombres.push(
        `<path class="cristal-ombre" d="${taillees.map((contour) => chemin(contour)).join(' ')}" ` +
          `fill-rule="evenodd" fill="${palette.cristalBleuOmbre}" stroke="none" opacity="0.75"/>`
      );
    }
    // L'éclat suit l'arête, sur les 55 % supérieurs de la hauteur : c'est là que la lumière
    // frappe une pierre debout, et c'est ce qu'on voit sur les cristaux de la canonique.
    const hautEclat = Number((cadre.y0 + (cadre.y1 - cadre.y0) * 0.14).toFixed(2));
    const basEclat = Number((cadre.y0 + (cadre.y1 - cadre.y0) * 0.62).toFixed(2));
    eclats.push(
      `<path class="cristal-eclat" d="M${String(arete)},${String(hautEclat)} ` +
        `L${String(arete)},${String(basEclat)}" stroke="#FFFFFF" stroke-width="2.4" ` +
        'stroke-linecap="round" opacity="0.85" fill="none"/>'
    );
  }
  return [...silhouettes, ...ombres, ...eclats];
}

function rendreSvg(grapheme, libelle, forme, palette, mesure) {
  const morceaux = dessiner(forme, palette).map((ligne) => `    ${ligne}`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(COTE)} ${String(COTE)}" width="${String(COTE)}" height="${String(COTE)}" role="img" aria-label="${libelle}">
  <title>${libelle}</title>
  <desc>Le cristal du grapheme « ${grapheme} » — ${libelle} : ${forme.quoi}. C est LUI qui porte la declinaison, jamais le corps (D20, D36). Sa SILHOUETTE lui est propre et elle est mesuree : le recouvrement avec les 24 autres cristaux ne depasse pas ${mesure.pire.toFixed(2)} (plafond ${String(PLAFOND_RECOUVREMENT)}), sans quoi scripts/gobi-formes.mjs refuse d ecrire — deux formes identiques ne se collectionneraient pas (D44). Les teintes viennent de la palette mesuree sur les pixels de la canonique et consignee dans production/personnages/gobi/gobi.lock.json ; aucune n est choisie a la main. Le temoin de production est production/personnages/gobi/formes/${grapheme}.png, obtenu par inpainting regional sous masque depuis la canonique — profondeur de chaine 1 (D32). Le viewBox fait ${String(COTE)} unites, ce qui est la cible tapable minimale de R16.</desc>
  <g id="cristal">
${morceaux}
  </g>
</svg>
`;
}

// ------------------------------------------------------------------------------- programme

function principal(arguments_) {
  const verrou = JSON.parse(
    readFileSync(join(RACINE, 'production/personnages/gobi/gobi.lock.json'), 'utf8')
  );
  const palette = verrou.canonique.palette;
  const document = JSON.parse(readFileSync(join(RACINE, 'contenu/monde/gobi-stades.json'), 'utf8'));

  const declares = document.formes.map((entree) => entree.grapheme);
  const dessines = Object.keys(FORMES);
  const manquants = declares.filter((code) => !dessines.includes(code));
  const surnumeraires = dessines.filter((code) => !declares.includes(code));
  if (manquants.length > 0 || surnumeraires.length > 0) {
    throw new Error(
      'REFUS — la table de dessin diverge de contenu/monde/gobi-stades.json.\n' +
        `  declares sans dessin : ${manquants.join(', ') || '—'}\n` +
        `  dessines sans declaration : ${surnumeraires.join(', ') || '—'}`
    );
  }

  const trames = new Map(declares.map((code) => [code, rasteriser(FORMES[code])]));
  const vides = declares.filter((code) => trames.get(code).aire < 300);
  if (vides.length > 0) {
    throw new Error(`REFUS — silhouette quasi vide : ${vides.join(', ')}.`);
  }

  const paires = [];
  const pire = new Map(declares.map((code) => [code, 0]));
  for (let i = 0; i < declares.length; i += 1) {
    for (let j = i + 1; j < declares.length; j += 1) {
      const mesure = recouvrement(trames.get(declares[i]), trames.get(declares[j]));
      paires.push({ a: declares[i], b: declares[j], ...mesure });
      pire.set(declares[i], Math.max(pire.get(declares[i]), mesure.iou));
      pire.set(declares[j], Math.max(pire.get(declares[j]), mesure.iou));
    }
  }
  paires.sort((gauche, droite) => droite.iou - gauche.iou);
  const franchies = paires.filter((paire) => paire.iou > PLAFOND_RECOUVREMENT);

  console.log(`formes = ${String(declares.length)} · paires mesurees = ${String(paires.length)} (trame ${String(TRAME)}²)`);
  console.log('les 6 paires les plus proches :');
  for (const paire of paires.slice(0, 6)) {
    console.log(
      `  ${paire.a.padEnd(4)}/${paire.b.padEnd(4)} iou=${paire.iou.toFixed(3)} ` +
        `intersection/plus-petite=${paire.surPlusPetite.toFixed(3)}`
    );
  }
  console.log(
    `paires dont le recouvrement depasse ${String(PLAFOND_RECOUVREMENT)} = ${String(franchies.length)}`
  );

  if (franchies.length > 0) {
    throw new Error(
      `REFUS — ${String(franchies.length)} paire(s) au-dessus du plafond : ` +
        `${franchies.map((paire) => `${paire.a}/${paire.b}`).join(', ')}. ` +
        'On n ecrit pas 25 fichiers dont deux se confondent (D44).'
    );
  }

  if (arguments_.includes('--verifier')) {
    let ecarts = 0;
    for (const entree of document.formes) {
      const attendu = rendreSvg(entree.grapheme, entree.libelle, FORMES[entree.grapheme], palette, {
        pire: pire.get(entree.grapheme)
      });
      if (readFileSync(join(RACINE, `contenu/${entree.cristal}`), 'utf8') !== attendu) {
        console.error(`  divergent : ${entree.cristal}`);
        ecarts += 1;
      }
    }
    console.log(`SVG compares = ${String(document.formes.length)} · divergents = ${String(ecarts)}`);
    process.exitCode = ecarts === 0 ? 0 : 1;
    return;
  }

  let octets = 0;
  for (const entree of document.formes) {
    const svg = rendreSvg(entree.grapheme, entree.libelle, FORMES[entree.grapheme], palette, {
      pire: pire.get(entree.grapheme)
    });
    writeFileSync(join(RACINE, `contenu/${entree.cristal}`), svg, 'utf8');
    octets += Buffer.byteLength(svg, 'utf8');
  }
  console.log(
    `${String(document.formes.length)} SVG ecrits dans ${DOSSIER}/ · ` +
      `${String(octets)} octets au total, moyenne ${String(Math.round(octets / document.formes.length))} o ` +
      '(les bouchons faisaient 893 a 958 o)'
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    principal(process.argv.slice(2));
  } catch (erreur) {
    console.error(String(erreur.message ?? erreur));
    process.exitCode = 1;
  }
}
