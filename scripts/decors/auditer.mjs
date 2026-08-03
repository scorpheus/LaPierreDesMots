/**
 * LE CONTRAT DE SORTIE DE M6, RECALCULÉ SUR LE DISQUE — contrat du monde v4 § 2 (M6).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * Ce script ne sait RIEN de `decors.mjs`. Il relit les fichiers livrés — les `.svg` et les
 * `.habillage.json` de `contenu/habillages/` — et recalcule chaque chiffre du contrat depuis
 * la géométrie. C'est délibéré : un audit qui interrogerait la structure en mémoire du
 * générateur ne mesurerait que la cohérence du générateur avec lui-même, jamais celle du
 * dépôt. Si l'émetteur écrivait mal, ce script le dirait.
 *
 * Il applique la règle « auditer les OBJETS, jamais les occurrences » : il énumère les décors
 * qui DEVRAIENT porter la propriété (tous les habillages déclarés), pas les fichiers qui la
 * portent déjà.
 *
 * Le campement (3 habillages) appartient à M8 et la carte à M7 : ils sont comptés à part,
 * jamais confondus avec les 53 de M6, et jamais tus.
 *
 * Usage : node scripts/decors/auditer.mjs
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  fichiersSous,
  mesureDeRegion,
  pointDansRegion,
  polygonesDuChemin,
  elementsDessines,
} from '../verifier-regions-fermees.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HABILLAGES = join(RACINE, 'contenu', 'habillages');

/** Les six régions du monde, dans l'ordre de la progression phonologique. */
const REGIONS = ['clairiere', 'galeries', 'marais-jumeau', 'foret-muette', 'volcan', 'cite-des-histoires'];
/** Ce que M6 ne possède pas — v4 § 4.4. */
const HORS_M6 = new Set(['campement', 'carte', 'ouverture']);
/**
 * Les DEUX décors livrés par le lot N7 et que M6 ne réécrit pas : `ecole-v2.svg` (31 régions)
 * et `grottes-v2.svg` (6). Ils comptent dans le total des habillages d'une région, jamais dans
 * les contrôles d'unicité de M6 — et il faut le dire plutôt que de les fondre dans la masse :
 * `ecole-v2` porte QUATRE arbres volontairement identiques et deux fenêtres identiques, ce qui
 * est juste pour une cour d'école et faux pour un décor où l'enfant doit désigner « la
 * deuxième ». Les compter dans les paires de M6 rendrait le chiffre de M6 illisible.
 */
const DE_N7 = new Set(['clairiere.ecole', 'galeries.grottes']);

const relatif = (p) => relative(RACINE, p).split(sep).join('/');

// ─────────────────────────────────────────────────────── 1. les habillages et leurs SVG
const habillages = fichiersSous(HABILLAGES, '.habillage.json').map((chemin) => ({
  chemin,
  json: JSON.parse(readFileSync(chemin, 'utf8')),
  dossier: relatif(chemin).split('/')[2],
}));
const deMaRegion = habillages.filter((h) => !HORS_M6.has(h.dossier));
const aMoi = deMaRegion.filter((h) => !DE_N7.has(h.json.id));

const svgServis = new Map();
for (const h of habillages) {
  svgServis.set(join(RACINE, 'contenu', ...h.json.scene.fichier.split('/')), h);
}

// ─────────────────────────────────────────────────── 2. la mesure, décor par décor
let bouchonsServis = 0;
let bouchonsToutes = 0;
let paresSurface = 0;
let paresSilhouette = 0;
let ecartSurfaceMax = 0;
let centroidesHorsRegion = 0;
let regionsTotales = 0;
let nonPolygonales = 0;
let margeMinimale = Infinity;
let margeQui = '';
const parRegion = Object.fromEntries(REGIONS.map((r) => [r, { habillages: 0, regions: 0, moteurs: new Set() }]));

const silhouette = (d) => {
  const points = polygonesDuChemin(d).flat();
  const x0 = Math.min(...points.map(([x]) => x));
  const y0 = Math.min(...points.map(([, y]) => y));
  return [...new Set(points.map(([x, y]) => `${(x - x0).toFixed(1)},${(y - y0).toFixed(1)}`))].sort().join(' ');
};
const distanceAuBord = (anneaux, [px, py]) => {
  let min = Infinity;
  for (const a of anneaux) {
    for (let i = 0; i < a.length; i += 1) {
      const [ax, ay] = a[i];
      const [bx, by] = a[(i + 1) % a.length];
      const dx = bx - ax;
      const dy = by - ay;
      const c = dx * dx + dy * dy;
      const t = c === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / c));
      min = Math.min(min, Math.hypot(px - (ax + t * dx), py - (ay + t * dy)));
    }
  }
  return min;
};

for (const chemin of fichiersSous(HABILLAGES, '.svg')) {
  const octets = statSync(chemin).size;
  if (octets < 1000) {
    bouchonsToutes += 1;
    if (svgServis.has(chemin)) bouchonsServis += 1;
  }
}

for (const h of deMaRegion) {
  const mien = !DE_N7.has(h.json.id);
  const cheminSvg = join(RACINE, 'contenu', ...h.json.scene.fichier.split('/'));
  const texte = readFileSync(cheminSvg, 'utf8');
  const traces = new Map();
  for (const e of elementsDessines(texte)) if (e.id !== null && e.d !== null) traces.set(e.id, e.d);

  const declarees = h.json.scene.calques.filter((c) => c.role === 'coloriable').flatMap((c) => c.regions);
  const compte = parRegion[h.json.region];
  compte.habillages += 1;
  compte.regions += declarees.length;
  for (const m of h.json.moteurs) compte.moteurs.add(m);
  if (mien) regionsTotales += declarees.length;

  const silVues = new Map();
  const surVues = new Map();
  for (const region of declarees) {
    const d = traces.get(region.id);
    const anneaux = polygonesDuChemin(d);
    if (anneaux === null) { nonPolygonales += 1; continue; }
    const mesure = mesureDeRegion(d);
    const surface = Math.abs(mesure.surface);

    if (mien) {
      ecartSurfaceMax = Math.max(ecartSurfaceMax, Math.abs(surface - Number(region.surface)));
      if (!pointDansRegion(anneaux, region.centroide)) centroidesHorsRegion += 1;
      const marge = distanceAuBord(anneaux, region.centroide);
      if (marge < margeMinimale) { margeMinimale = marge; margeQui = `${h.json.id}#${region.id}`; }
    }
    if (!mien) continue; // ecole-v2 et grottes-v2 sont à N7 : mesurés, jamais imputés à M6.
    const s = silhouette(d);
    if (silVues.has(s)) paresSilhouette += 1;
    silVues.set(s, region.id);
    const k = Math.round(surface);
    if (surVues.has(k)) paresSurface += 1;
    surVues.set(k, region.id);
  }
}

// ────────────────────────────────────────────────────────────────────────── le rapport
const l = (nom, valeur) => console.log(`${nom.padEnd(62)}= ${String(valeur)}`);

console.log('── CONTRAT DE SORTIE DE M6, recalculé sur le disque ───────────────────────────');
l('SVG servis par un habillage et pesant moins de 1000 octets', `${String(bouchonsServis)}   (etait 39)`);
l('SVG sous 1000 octets dans tout contenu/habillages/', `${String(bouchonsToutes)}   (dont campement, M8)`);
l('habillages ecrits par M6 (SVG + .habillage.json)', aMoi.length);
l('habillages de N7 mesures mais NON reecrits (ecole-v2, grottes-v2)', deMaRegion.length - aMoi.length);
l('habillages declares en tout (M6 + campement de M8)', habillages.length);
l('regions coloriables declarees par les decors de M6', regionsTotales);
l('regions non polygonales (arc ou courbe)', nonPolygonales);
l('paires de regions de meme surface dans un meme decor', paresSurface);
l('paires de regions de meme silhouette dans un meme decor', paresSilhouette);
l('ecart max entre surface declaree et surface recalculee', `${ecartSurfaceMax.toFixed(3)} u²`);
l('centroides declares tombant hors de leur region', centroidesHorsRegion);
l('marge minimale entre un centroide et son bord', `${margeMinimale.toFixed(1)} u  (${margeQui})`);
console.log('');
console.log('habillages · regions · moteurs distincts, par region du monde :');
for (const r of REGIONS) {
  const c = parRegion[r];
  console.log(
    `  ${r.padEnd(20)} ${String(c.habillages).padStart(2)} habillage(s)   ` +
      `${String(c.regions).padStart(3)} region(s)   ${String(c.moteurs.size).padStart(2)} moteur(s) : ` +
      [...c.moteurs].sort().join(', ')
  );
}
