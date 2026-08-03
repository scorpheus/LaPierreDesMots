#!/usr/bin/env node
/**
 * Les 15 dessins de Gobi — lot M5, contrat du monde v4 § M5.
 *
 * ── CE QUE CE SCRIPT REFAIT, ET CE QU'IL NE TOUCHE PAS ──────────────────────────────────────
 *
 * Le contrat demande « 5 SVG dérivés de la canonique » et « 10 SVG dérivés de la canonique »
 * là où l'inventaire trouvait « une transposition à la main, correcte, plus pauvre que le PNG ».
 * **Rastérisés et regardés côte à côte avec la canonique, deux écarts seulement expliquent
 * l'essentiel de cet écart de richesse, et ce sont les deux que ce script corrige :**
 *
 *   1. **Les bras étaient deux traits ronds.** Un `<path>` épais à bout arrondi, doublé d'un
 *      second plus fin pour simuler un contour. La canonique porte des bras courts et
 *      arrondis terminés par une PATTE plus large que le bras, avec ses encoches de doigts.
 *      Un bâton ne tend rien et ne montre rien — or D24 pose que Gobi « peut montrer, tendre,
 *      applaudir », et c'est le geste qui porte les cinq états de l'addendum § A.2.
 *   2. **Les cristaux étaient de petits pentagones à une facette.** Sur la canonique ce sont
 *      des prismes trapus, taillés en deux faces le long d'une arête vive, avec un éclat
 *      blanc. C'est la même correction que les 25 cristaux de graphème ont reçue, et pour la
 *      même raison mesurée : un aplat avec un coin sombre se lit « galet », pas « cristal ».
 *
 * **Le reste n'est PAS touché, et c'est délibéré.** `gobi-corps` — ombre au sol, pieds,
 * fourrure dentelée, ventre, cœur de Pierre — et `gobi-visage` sont fidèles à la canonique et
 * déjà mesurés conformes par `tests/unitaires/gobi-assets.test.ts`. Les réécrire, c'est risquer
 * de faire glisser le personnage pour rien. **On corrige ce qu'on a vu être faux, pas tout ce
 * qu'on pourrait rouvrir.**
 *
 * ── LES QUATRE INVARIANTS, QUI SONT ICI DES INVARIANTS DE CONSTRUCTION ──────────────────────
 *
 * `gobi-assets.test.ts` mesure quatre choses, et ce script ne peut PAS les rompre :
 *   — `gobi-corps` identique dans les 15 : il n'est jamais réécrit ;
 *   — d'un stade à l'autre, seule la parure change : la parure est indexée par le STADE, les
 *     bras des dix stades sont une seule et même pose partagée ;
 *   — d'une animation à l'autre, la parure ne change pas : les cinq reçoivent la MÊME parure ;
 *   — deux stades n'ont jamais la même parure, deux animations jamais le même geste : les deux
 *     sont remesurés ici avant écriture, et le script refuse plutôt que d'émettre du faux.
 *
 * Usage :
 *   node scripts/gobi-assets.mjs             réécrit les deux groupes dans les 15 SVG
 *   node scripts/gobi-assets.mjs --verifier  n'écrit rien : compare et rend les mesures
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ANIMATIONS = ['repos', 'joie', 'aide', 'hesitation', 'apparition'];

/** Nombre de cristaux par rang de stade — D43, et c'est une progression MONOTONE. */
const CRISTAUX_PAR_RANG = [1, 1, 1, 2, 3, 5, 6, 7, 8, 9];

/** Hauteur du plus grand cristal, par rang. L'œuf bourgeonne, le Gardien couronne. */
const HAUTEUR_PAR_RANG = [20, 25, 42, 40, 44, 44, 46, 46, 48, 48];

/** La parure que portent les cinq états d'animation : celle de la canonique, 7 cristaux. */
const CRISTAUX_ANIMATION = 7;
const HAUTEUR_ANIMATION = 46;

const arrondi = (valeur) => Number(valeur.toFixed(2));
const point = ([x, y]) => `${String(arrondi(x))},${String(arrondi(y))}`;
const polygone = (points) => `M${points.map((p) => point(p)).join(' L')} Z`;

// ------------------------------------------------------------------------------- la parure

/**
 * Un cristal posé sur la calotte du crâne, incliné selon sa position.
 *
 * Le cristal n'est pas posé à la verticale puis translaté : il est construit dans le repère
 * du RAYON de la tête, donc il pousse **hors** du crâne. C'est ce qui distingue une couronne
 * d'une rangée de piquets, et c'est ce que fait la canonique.
 */
function cristal(anglePose, angleAxe, hauteur, largeur, teintes, palette) {
  const CENTRE = [100, 116];
  const RAYON = 57;
  const ux = Math.sin(angleAxe);
  const uy = -Math.cos(angleAxe);
  const px = Math.cos(angleAxe);
  const py = Math.sin(angleAxe);
  const base = [CENTRE[0] + RAYON * Math.sin(anglePose), CENTRE[1] - RAYON * Math.cos(anglePose)];
  const vers = (le, tr) => [base[0] + le * ux + tr * px, base[1] + le * uy + tr * py];

  const sommet = vers(hauteur, 0);
  const epauleD = vers(hauteur * 0.7, largeur / 2);
  const piedD = vers(-hauteur * 0.06, largeur * 0.4);
  const piedG = vers(-hauteur * 0.06, -largeur * 0.4);
  const epauleG = vers(hauteur * 0.7, -largeur / 2);
  const axeBas = vers(-hauteur * 0.06, 0);

  return [
    `<path d="${polygone([sommet, epauleD, piedD, piedG, epauleG])}" fill="${teintes.face}" ` +
      `stroke="${palette.trait}" stroke-width="2.6" stroke-linejoin="round"/>`,
    `<path d="${polygone([sommet, epauleD, piedD, axeBas])}" fill="${palette.cristalBleuOmbre}" ` +
      'stroke="none" opacity="0.75"/>',
    `<path d="M${point(vers(hauteur * 0.78, -largeur * 0.12))} ` +
      `L${point(vers(hauteur * 0.24, -largeur * 0.18))}" stroke="#FFFFFF" stroke-width="2" ` +
      'stroke-linecap="round" opacity="0.85" fill="none"/>'
  ].join('');
}

/**
 * La couronne complète.
 *
 * Les hauteurs sont inégales — c'est le point de validation « couronne de 5 à 7 cristaux
 * facettés **de tailles inégales** » du verrou de la canonique. L'inégalité est déterministe
 * (aucun `Math.random` nulle part, règle dure de CLAUDE.md) : elle vient du rang du cristal.
 */
function parure(nombre, hauteurMax, palette) {
  // OUVERTURE PLAFONNÉE À 0,78 rad — 45° de part et d'autre. Première rédaction : 1,02 rad.
  // Rastérisée et regardée, la couronne à 7 et 9 cristaux s'ouvrait jusqu'à l'horizontale, et
  // deux choses cassaient : elle lisait « coiffe de plumes » et non « couronne de cristal », et
  // les cristaux des bords MORDAIENT SUR LES SOURCILS. Un ornement qui recouvre le visage coûte
  // ce que le visage porte — et le visage de Gobi est ce qui rassure un enfant qui déchiffre.
  const ouverture = nombre === 1 ? 0 : Math.min(0.78, 0.1 * nombre);
  const morceaux = [];
  for (let index = 0; index < nombre; index += 1) {
    const part = nombre === 1 ? 0 : (2 * index) / (nombre - 1) - 1;
    const anglePose = part * ouverture;
    // L'AXE suit le rayon À MOITIÉ SEULEMENT. Plein rayon, les cristaux des bords partent à
    // plat ; à la verticale stricte, la couronne est une rangée de piquets. La canonique tient
    // l'entre-deux : les cristaux s'écartent, sans jamais cesser de monter.
    const angleAxe = anglePose * 0.5;
    const decroissance = 1 - 0.38 * Math.abs(part);
    const inegalite = index % 3 === 1 ? 0.86 : index % 3 === 2 ? 1.04 : 1;
    const hauteur = hauteurMax * decroissance * inegalite;
    const largeur = 17 - 3 * Math.abs(part);
    // Le cristal ROSE au centre est celui de la canonique ; il n'apparaît qu'à partir du
    // moment où la couronne a un centre, c'est-à-dire à 5 cristaux et plus.
    const face =
      nombre >= 5 && index === Math.floor(nombre / 2)
        ? palette.cristalRose
        : index % 2 === 0
          ? palette.cristalBleu
          : palette.cristalClair;
    morceaux.push(`\n    ${cristal(anglePose, angleAxe, hauteur, largeur, { face }, palette)}`);
  }
  return `<g id="gobi-parure">${morceaux.join('')}\n  </g>`;
}

// --------------------------------------------------------------------------------- les bras

/**
 * Un bras : un membre court qui s'évase en PATTE arrondie, avec ses deux encoches de doigts.
 *
 * La patte est plus large que l'épaule (D24 : « deux bras courts et robustes »), et son bout
 * est un demi-tour de cercle réel, pas un `stroke-linecap`. C'est cette largeur-là qui fait
 * qu'un bras tendu se lit comme une main ouverte vers l'enfant, et non comme un bâton.
 */
function bras(epaule, patte, largeurEpaule, largeurPatte) {
  const dx = patte[0] - epaule[0];
  const dy = patte[1] - epaule[1];
  const norme = Math.hypot(dx, dy) || 1;
  const ux = dx / norme;
  const uy = dy / norme;
  const px = -uy;
  const py = ux;
  const rayon = largeurPatte / 2;

  const contour = [
    [epaule[0] + (largeurEpaule / 2) * px, epaule[1] + (largeurEpaule / 2) * py],
    [patte[0] + rayon * px, patte[1] + rayon * py]
  ];
  for (let pas = 1; pas < 8; pas += 1) {
    const angle = (Math.PI * pas) / 8;
    const cx = Math.cos(angle);
    const sx = Math.sin(angle);
    contour.push([patte[0] + rayon * (cx * px + sx * ux), patte[1] + rayon * (cx * py + sx * uy)]);
  }
  contour.push([patte[0] - rayon * px, patte[1] - rayon * py]);
  contour.push([epaule[0] - (largeurEpaule / 2) * px, epaule[1] - (largeurEpaule / 2) * py]);

  const doigt = (decalage) =>
    `M${point([patte[0] + decalage * px + rayon * 0.42 * ux, patte[1] + decalage * py + rayon * 0.42 * uy])} ` +
    `L${point([patte[0] + decalage * px - rayon * 0.32 * ux, patte[1] + decalage * py - rayon * 0.32 * uy])}`;

  return (
    `<path d="${polygone(contour)}" fill="#FFDDA8" stroke="#4B2207" stroke-width="3" ` +
    'stroke-linejoin="round"/>' +
    `<path d="${doigt(rayon * 0.34)} ${doigt(-rayon * 0.34)}" stroke="#4B2207" stroke-width="2" ` +
    'stroke-linecap="round" fill="none"/>'
  );
}

function groupeBras(gauche, droite) {
  return (
    '<g id="gobi-bras">\n    ' +
    bras(gauche.epaule, gauche.patte, gauche.epaisseur, gauche.patteLargeur) +
    '\n    ' +
    bras(droite.epaule, droite.patte, droite.epaisseur, droite.patteLargeur) +
    '\n  </g>'
  );
}

const membre = (epaule, patte, epaisseur = 13, patteLargeur = 19) => ({
  epaule,
  patte,
  epaisseur,
  patteLargeur
});

/** La pose des DIX stades — celle de la canonique : bras ouverts, pattes tournées vers l'enfant. */
const POSE_STADE = groupeBras(membre([60, 120], [30, 96]), membre([140, 120], [170, 96]));

/**
 * Les cinq gestes. Chacun décrit CE QU'ON VOIT — un bras qui descend, une patte près de la
 * joue —, jamais ce que Gobi ressent (D27, et le piège 6 du skill `generer-asset` : le mot
 * « determined » a suffi à produire un visage fâché).
 */
const POSE_ANIMATION = {
  repos: groupeBras(membre([58, 122], [42, 152]), membre([142, 122], [158, 152])),
  joie: groupeBras(membre([60, 116], [34, 62]), membre([140, 116], [166, 62])),
  aide: groupeBras(membre([58, 118], [20, 110], 13, 25), membre([142, 122], [158, 152])),
  hesitation: groupeBras(membre([62, 118], [70, 84]), membre([142, 124], [160, 154])),
  apparition: groupeBras(membre([58, 122], [32, 134]), membre([142, 122], [168, 134]))
};

// -------------------------------------------------------------------------- remplacement sûr

/** Les bornes d'un groupe SVG, imbrications comptées. */
function bornes(svg, identifiant) {
  const debut = svg.indexOf(`<g id="${identifiant}"`);
  if (debut === -1) {
    throw new Error(`Groupe #${identifiant} absent.`);
  }
  let profondeur = 0;
  for (let index = debut; index < svg.length; index += 1) {
    if (svg.startsWith('<g', index)) {
      profondeur += 1;
    } else if (svg.startsWith('</g>', index)) {
      profondeur -= 1;
      if (profondeur === 0) {
        return [debut, index + 4];
      }
    }
  }
  throw new Error(`Groupe #${identifiant} non fermé.`);
}

function remplacer(svg, identifiant, contenu) {
  const [debut, fin] = bornes(svg, identifiant);
  return svg.slice(0, debut) + contenu + svg.slice(fin);
}

const extraire = (svg, identifiant) => {
  const [debut, fin] = bornes(svg, identifiant);
  return svg.slice(debut, fin);
};

// ------------------------------------------------------------------------------- programme

function principal(arguments_) {
  const verrou = JSON.parse(
    readFileSync(join(RACINE, 'production/personnages/gobi/gobi.lock.json'), 'utf8')
  );
  const palette = verrou.canonique.palette;
  const document = JSON.parse(readFileSync(join(RACINE, 'contenu/monde/gobi-stades.json'), 'utf8'));

  if (document.stades.length !== CRISTAUX_PAR_RANG.length) {
    throw new Error(
      `REFUS — ${String(document.stades.length)} stades déclarés pour ` +
        `${String(CRISTAUX_PAR_RANG.length)} parures prévues.`
    );
  }
  // La progression du nombre de cristaux DOIT être monotone : un stade qui en porterait moins
  // que le précédent serait un acquis repris à l'écran, ce que R14 interdit.
  for (let rang = 1; rang < CRISTAUX_PAR_RANG.length; rang += 1) {
    if (CRISTAUX_PAR_RANG[rang] < CRISTAUX_PAR_RANG[rang - 1]) {
      throw new Error('REFUS — la progression des cristaux n’est pas monotone (R14).');
    }
  }

  const sorties = [];

  for (const stade of document.stades) {
    const chemin = `contenu/${stade.asset}`;
    const svg = readFileSync(join(RACINE, chemin), 'utf8');
    const nombre = CRISTAUX_PAR_RANG[stade.rang - 1];
    let neuf = remplacer(svg, 'gobi-parure', parure(nombre, HAUTEUR_PAR_RANG[stade.rang - 1], palette));
    neuf = remplacer(neuf, 'gobi-bras', POSE_STADE);
    sorties.push({ chemin, svg: neuf, famille: 'stade', code: stade.code, cristaux: nombre });
  }

  for (const code of ANIMATIONS) {
    const chemin = `contenu/assets/gobi/animation/${code}.svg`;
    const svg = readFileSync(join(RACINE, chemin), 'utf8');
    let neuf = remplacer(svg, 'gobi-parure', parure(CRISTAUX_ANIMATION, HAUTEUR_ANIMATION, palette));
    neuf = remplacer(neuf, 'gobi-bras', POSE_ANIMATION[code]);
    sorties.push({ chemin, svg: neuf, famille: 'animation', code, cristaux: CRISTAUX_ANIMATION });
  }

  // ─── ON REMESURE SA PROPRE SORTIE AVANT DE L'ÉCRIRE (convention C6) ───
  const corps = new Set(sorties.map((sortie) => extraire(sortie.svg, 'gobi-corps')));
  if (corps.size !== 1) {
    throw new Error(`REFUS — ${String(corps.size)} corps distincts sur 15. D20/D28 rompu.`);
  }
  const stades = sorties.filter((sortie) => sortie.famille === 'stade');
  const animations = sorties.filter((sortie) => sortie.famille === 'animation');

  const paruresStade = new Set(stades.map((sortie) => extraire(sortie.svg, 'gobi-parure')));
  if (paruresStade.size !== stades.length) {
    throw new Error('REFUS — deux stades portent la même parure : deux stades invisibles.');
  }
  const brasStade = new Set(stades.map((sortie) => extraire(sortie.svg, 'gobi-bras')));
  if (brasStade.size !== 1) {
    throw new Error('REFUS — les bras varient d’un stade à l’autre.');
  }
  const parureAnimation = new Set(animations.map((sortie) => extraire(sortie.svg, 'gobi-parure')));
  if (parureAnimation.size !== 1) {
    throw new Error('REFUS — la parure varie d’une animation à l’autre.');
  }
  const gestes = new Set(animations.map((sortie) => extraire(sortie.svg, 'gobi-bras')));
  if (gestes.size !== animations.length) {
    throw new Error('REFUS — deux animations portent le même geste.');
  }

  console.log(
    `corps distincts = 1 / 15 (${String([...corps][0].length)} o) · ` +
      `parures de stade distinctes = ${String(paruresStade.size)} / 10 · ` +
      `poses de stade = ${String(brasStade.size)} · ` +
      `parures d animation = ${String(parureAnimation.size)} · ` +
      `gestes distincts = ${String(gestes.size)} / 5`
  );
  console.log(
    `cristaux par stade : ${stades.map((sortie) => String(sortie.cristaux)).join(', ')} (monotone)`
  );

  if (arguments_.includes('--verifier')) {
    const divergents = sorties.filter(
      (sortie) => readFileSync(join(RACINE, sortie.chemin), 'utf8') !== sortie.svg
    );
    console.log(`SVG compares = 15 · divergents = ${String(divergents.length)}`);
    process.exitCode = divergents.length === 0 ? 0 : 1;
    return;
  }

  for (const sortie of sorties) {
    writeFileSync(join(RACINE, sortie.chemin), sortie.svg, 'utf8');
  }
  console.log('15 SVG réécrits : gobi-parure et gobi-bras seulement, gobi-corps et gobi-visage intacts');
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    principal(process.argv.slice(2));
  } catch (erreur) {
    console.error(String(erreur.message ?? erreur));
    process.exitCode = 1;
  }
}
