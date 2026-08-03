/**
 * Engendre `client/src/monde/rallumage.gen.ts` — la LOI du rallumage par paliers.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI UNE TABLE MESURÉE, ET PAS UNE FORMULE
 *
 * Le voile se retire par un halo qui grandit depuis l'ancre du marqueur. La promesse tenue est :
 * **chaque exercice rallume la même part du TERRITOIRE**. Il n'existe aucune formule fermée qui
 * donne le rayon correspondant à une part donnée d'un polygone quelconque — la silhouette est
 * concave, l'ancre n'est pas son centre, et chaque région a sa forme.
 *
 * La première tentative posait `rayon = R·√(k/N)`, ce qui donne une aire de DISQUE constante.
 * Mesuré, et c'est ce qui a fait écrire ce fichier :
 *
 *     clairiere          palier 1 = 19,5 %   palier 12 = 0,0 %
 *     galeries           palier 1 = 23,3 %   palier 14 = 0,0 %
 *     foret-muette       palier 1 = 24,1 %   palier 12 = 0,0 %
 *     cite-des-histoires palier 1 = 15,5 %   palier 14 = 0,0 %
 *
 * Le disque couvrait tout le territoire bien avant le dernier palier : **les huit derniers
 * exercices de la Clairière ne rallumaient rien.** C'est-à-dire exactement le défaut qu'on
 * corrigeait — une réussite sans récompense visible — déplacé de la première moitié du parcours
 * vers la seconde.
 *
 * ── CE QUE CE SCRIPT MESURE ───────────────────────────────────────────────────────────────────
 * Pour chaque région : la distance de l'ancre à chaque point INTÉRIEUR de la silhouette, sur une
 * grille au pas de 1 unité `viewBox`. Puis les QUANTILES de cette distribution. Le quantile à
 * 25 % est, par définition, le rayon qui contient le quart du territoire.
 *
 * On émet des quantiles et non des rayons par palier : le nombre de nœuds d'une région CHANGE à
 * mesure que le contenu s'écrit. Une table indexée par palier serait fausse au prochain exercice
 * ajouté, en silence. Une table de quantiles répond juste pour n'importe quel N.
 *
 * Relancer après toute retouche de `carte-monde-v3.svg` ou de la table `ANCRES` :
 *     node scripts/generer-rallumage.mjs
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { readFileSync, writeFileSync } from 'node:fs';

const CARTE = 'contenu/habillages/carte/carte-monde-v3.svg';
const SORTIE = 'client/src/monde/rallumage.gen.ts';

/**
 * Les ancres, reprises de `client/src/ecrans/EcranCarte.tsx`.
 *
 * Elles y sont la SOURCE : ce script les recopie, il ne les invente pas. Un écart entre les deux
 * ferait naître le halo hors du territoire — d'où le contrôle de cohérence en fin de script, qui
 * refuse d'écrire si une ancre tombe hors de sa silhouette.
 */
const ANCRES = {
  clairiere: [190, 640],
  galeries: [450, 460],
  'marais-jumeau': [240, 240],
  'foret-muette': [620, 150],
  volcan: [900, 340],
  'cite-des-histoires': [1020, 630]
};

/** 21 quantiles : 0 %, 5 %, … 100 %. Assez fin pour interpoler sans table pesante. */
const NB_QUANTILES = 21;
const PAS_GRILLE = 1;

const svg = readFileSync(CARTE, 'utf8');

function sommets(code) {
  const trouve = new RegExp(`<path id="${code}"[^>]*\\sd="([^"]+)"`, 'u').exec(svg);
  if (trouve === null) throw new Error(`silhouette introuvable : ${code}`);
  const nombres = (trouve[1].match(/-?\d+(?:\.\d+)?/gu) ?? []).map(Number);
  const points = [];
  for (let index = 0; index + 1 < nombres.length; index += 2) {
    points.push([nombres[index], nombres[index + 1]]);
  }
  if (points.length < 3) throw new Error(`silhouette dégénérée : ${code}`);
  return points;
}

function dansLePolygone(x, y, points) {
  let dedans = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

const lignes = [];
const resume = [];

for (const [code, [ax, ay]] of Object.entries(ANCRES)) {
  const points = sommets(code);
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);

  if (!dansLePolygone(ax, ay, points)) {
    // CONTRAT DE SORTIE : plutôt refuser d'écrire que d'émettre une table fausse. Un halo qui
    // naît hors du territoire ne rallume rien, et rien ne le signalerait.
    throw new Error(
      `l'ancre de ${code} (${String(ax)}, ${String(ay)}) tombe HORS de sa silhouette — ` +
        `la table serait fausse, aucun fichier écrit`
    );
  }

  const distances = [];
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += PAS_GRILLE) {
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += PAS_GRILLE) {
      if (dansLePolygone(x, y, points)) distances.push(Math.hypot(x - ax, y - ay));
    }
  }
  distances.sort((gauche, droite) => gauche - droite);

  const quantiles = [];
  for (let rang = 0; rang < NB_QUANTILES; rang += 1) {
    const part = rang / (NB_QUANTILES - 1);
    const index = Math.min(distances.length - 1, Math.round(part * (distances.length - 1)));
    quantiles.push(Number(distances[index].toFixed(1)));
  }
  // Le dernier quantile est le point le plus lointain du territoire. On l'arrondit à l'unité
  // SUPÉRIEURE : à part exactement 1, le voile doit être parti en entier, jamais à un pixel près.
  quantiles[NB_QUANTILES - 1] = Math.ceil(quantiles[NB_QUANTILES - 1]) + 1;

  lignes.push(`  '${code}': [${quantiles.join(', ')}]`);
  resume.push(`${code.padEnd(20)} ${String(distances.length).padStart(6)} pts · ` +
    `médiane ${String(quantiles[10])} · portée ${String(quantiles[NB_QUANTILES - 1])}`);
}

const fichier = `// ⚠ FICHIER ENGENDRÉ — ne pas éditer à la main.
// Produit par \`node scripts/generer-rallumage.mjs\` depuis
// \`${CARTE}\` et la table \`ANCRES\` de \`client/src/ecrans/EcranCarte.tsx\`.
//
// QUANTILES DE DISTANCE À L'ANCRE, par région. Indice \`i\` sur ${String(NB_QUANTILES)} valeurs
// ⇒ part de territoire \`i / ${String(NB_QUANTILES - 1)}\`. Le quantile à 25 % EST le rayon qui
// contient le quart du territoire : c'est ce qui rend « chaque exercice rallume la même part »
// vrai par construction, là où \`R·√(k/N)\` le rendait faux (palier 1 à 19,5 %, palier 12 à 0 %).
//
// Mesuré sur une grille au pas de ${String(PAS_GRILLE)} unité :
${resume.map((ligne) => `//   ${ligne}`).join('\n')}

export const QUANTILES_RALLUMAGE: Readonly<Record<string, readonly number[]>> = {
${lignes.join(',\n')}
};

export const NB_QUANTILES_RALLUMAGE = ${String(NB_QUANTILES)};
`;

writeFileSync(SORTIE, fichier, 'utf8');
console.log(resume.join('\n'));
console.log(`\n✅ ${SORTIE} écrit — ${String(Object.keys(ANCRES).length)} régions.`);
