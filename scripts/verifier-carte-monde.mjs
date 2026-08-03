/**
 * LE CONTRÔLE DE LA CARTE DU MONDE — lot M7, contrat du monde v4 § 2 (M7).
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE, ET POURQUOI IL N'EST PAS DANS `tests/`
 *
 * Le contrat du monde v4 § 5, point 6, est explicite : « Aucun lot de ce plan ne possède un
 * fichier de `tests/`. » La campagne super-QA y écrit encore. Le contrat de sortie de M7
 * énumère pourtant SEPT grandeurs à mesurer, et « un fait mécanique n'est jamais affirmé, il
 * est mesuré » (CLAUDE.md). Un rapport qui affirmerait ces sept lignes sans les calculer
 * serait exactement la faute que le journal des décisions a déjà payée deux fois.
 *
 * Ce script est donc la mesure elle-même : il imprime les sept lignes du contrat de sortie,
 * et il rend un code de sortie non nul dès qu'une seule est fausse. Il ne dépend d'aucun
 * réseau, n'écrit aucun fichier, et réutilise la géométrie de `verifier-regions-fermees.mjs`
 * plutôt que de la réimplanter — deux implantations de la même règle finissent par diverger.
 *
 * ── LE CONTRÔLE NÉGATIF, SANS LEQUEL LA MESURE NE PROUVE RIEN ─────────────────────────────
 * Chaque famille de contrôles commence par vérifier qu'elle a bien trouvé quelque chose à
 * mesurer. « 0 anomalie sur 0 objet lu » est le mode de défaillance d'un contrôle creux : il
 * est vert, il rassure, il ne garde rien. Les comptes sont donc imprimés, jamais seulement
 * les verdicts, et le script échoue si une population attendue est vide.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Usage : `node scripts/verifier-carte-monde.mjs`
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  elementsDessines,
  mesureDeRegion,
  pointDansRegion,
  polygonesDuChemin,
} from './verifier-regions-fermees.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const V2 = join(RACINE, 'contenu', 'habillages', 'carte', 'carte-monde-v2.svg');
const V3 = join(RACINE, 'contenu', 'habillages', 'carte', 'carte-monde-v3.svg');
const ECRAN = join(RACINE, 'client', 'src', 'ecrans', 'EcranCarte.tsx');

/** Les six régions, DANS L'ORDRE — l'ordre EST la progression phonologique. */
const SIX = ['clairiere', 'galeries', 'marais-jumeau', 'foret-muette', 'volcan', 'cite-des-histoires'];

/** Cible tapable minimale, R16. En unités `viewBox`, qui valent le pixel CSS à cette échelle. */
const CIBLE_MINIMALE_PX = 64;

const problemes = [];
const lignes = [];
const echec = (message) => problemes.push(message);
const dire = (cle, valeur) => lignes.push(`${cle.padEnd(62, ' ')} ${String(valeur)}`);

const texteV2 = readFileSync(V2, 'utf8');
const texteV3 = readFileSync(V3, 'utf8');
const texteEcran = readFileSync(ECRAN, 'utf8');

// ─────────────────────────────────────────────────────────────────────── petites extractions

/** Les `data-region-svg` d'un fichier, DANS L'ORDRE d'apparition. */
const regionsSvg = (texte) => [...texte.matchAll(/data-region-svg="([^"]+)"/gu)].map((m) => m[1]);

/** Les marqueurs `id` → `[cx, cy]`, dans l'ordre — même lecture que `ids-regions-stables`. */
const marqueurs = (texte) =>
  [...texte.matchAll(/id="marqueur-([^"]+)"[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"/gu)].map((m) => [
    m[1],
    Number(m[2]),
    Number(m[3]),
  ]);

/** Les segments du chemin : `id` → `d`, dans l'ordre. */
const segments = (texte) =>
  [...texte.matchAll(/<path id="(chemin-[^"]+)" d="([^"]+)"/gu)].map((m) => [m[1], m[2]]);

/** Les éléments dessinés indexés par `id` (le dernier gagne, comme dans les tests du dépôt). */
function parId(texte) {
  const table = new Map();
  for (const e of elementsDessines(texte)) {
    if (e.id !== null) table.set(e.id, e);
  }
  return table;
}

/** Rectangle englobant d'un tracé polygonal. `null` si la géométrie n'est pas polygonale. */
function boitePolygonale(d) {
  const anneaux = polygonesDuChemin(d);
  if (anneaux === null) return null;
  const points = anneaux.flat();
  return [
    Math.min(...points.map(([x]) => x)),
    Math.min(...points.map(([, y]) => y)),
    Math.max(...points.map(([x]) => x)),
    Math.max(...points.map(([, y]) => y)),
  ];
}

/** Sommets normalisés à l'origine, dédoublonnés et triés — la mesure de silhouette du dépôt. */
function silhouette(d) {
  const anneaux = polygonesDuChemin(d);
  if (anneaux === null) return null;
  const points = anneaux.flat();
  const x0 = Math.min(...points.map(([x]) => x));
  const y0 = Math.min(...points.map(([, y]) => y));
  return [...new Set(points.map(([x, y]) => `${(x - x0).toFixed(1)},${(y - y0).toFixed(1)}`))]
    .sort()
    .join(' ');
}

const elementsV3 = elementsDessines(texteV3);
const tableV3 = parId(texteV3);

// ═════════════════════════════ 0. contrôle négatif : la mesure a bien trouvé quoi mesurer
if (elementsV3.length < 40) {
  echec(`la v3 ne porte que ${elementsV3.length} éléments dessinés : la mesure lit-elle le bon fichier ?`);
}
dire('elements dessines lus dans carte-monde-v3.svg', elementsV3.length);

// ═════════════════════════════ 1. identifiants de région et leur ordre, identiques à la v2
const idsV2 = regionsSvg(texteV2);
const idsV3 = regionsSvg(texteV3);
if (idsV2.length !== 6) echec(`la v2 ne rend que ${idsV2.length} régions : référence illisible.`);
const ordreOk = idsV3.length === 6 && idsV3.every((id, i) => id === idsV2[i] && id === SIX[i]);
dire('identifiants de region et leur ordre : identiques a la v2', `${ordreOk ? idsV3.length : 0} / 6`);
if (!ordreOk) echec(`ordre des régions : v3 = [${idsV3.join(', ')}], v2 = [${idsV2.join(', ')}]`);

// ═════════════════════════════ 2. centres de marqueur, écart en unités viewBox
const mV2 = marqueurs(texteV2);
const mV3 = marqueurs(texteV3);
if (mV2.length !== 6) echec(`la v2 ne rend que ${mV2.length} marqueurs : référence illisible.`);
let ecartMax = 0;
if (mV3.length !== 6) {
  echec(`la v3 rend ${mV3.length} marqueurs au lieu de 6.`);
  ecartMax = Number.POSITIVE_INFINITY;
} else {
  for (let i = 0; i < 6; i += 1) {
    if (mV3[i][0] !== mV2[i][0]) echec(`marqueur ${String(i + 1)} : « ${mV3[i][0]} » ≠ « ${mV2[i][0]} »`);
    ecartMax = Math.max(ecartMax, Math.abs(mV3[i][1] - mV2[i][1]), Math.abs(mV3[i][2] - mV2[i][2]));
  }
}
dire('centres de marqueur : ecart a carte-monde-v2.svg (unites viewBox)', ecartMax);
if (ecartMax !== 0) echec('un centre de marqueur a bougé : le tap se décalerait du dessin.');

// ═════════════════════════════ 3. les cinq segments du chemin et leurs points de passage
const sV2 = segments(texteV2);
const sV3 = segments(texteV3);
const segmentsIdentiques =
  sV2.length === 5 &&
  sV3.length === 5 &&
  sV3.every(([id, d], i) => id === sV2[i][0] && d === sV2[i][1]);
dire('segments du chemin et leurs points de passage : identiques', `${segmentsIdentiques ? 5 : 0} / 5`);
if (!segmentsIdentiques) {
  echec(`segments : v3 = ${JSON.stringify(sV3)} ; v2 = ${JSON.stringify(sV2)}`);
}

// ═════════════════════════════ 4. chaque région porte AU MOINS UN signe d'ambiance NOMMÉ
//
// On énumère les OBJETS qui devraient porter la propriété — les six régions — et non les
// occurrences du mot « signe ». Un décompte global de 40 ornements ne dirait rien d'une
// région qui n'en porterait aucun.
const signesParRegion = new Map(SIX.map((code) => [code, []]));
for (const element of elementsV3) {
  if (element.id === null || !element.id.startsWith('signe-')) continue;
  // La région la plus SPÉCIFIQUE gagne : aucun des six codes n'est préfixe d'un autre, mais
  // trancher explicitement évite qu'un code futur ne soit rangé sous un autre en silence.
  const codes = SIX.filter((code) => element.id.startsWith(`signe-${code}-`));
  if (codes.length !== 1) {
    echec(`« ${element.id} » ne se rattache pas à exactement une région (${codes.length} candidats).`);
    continue;
  }
  signesParRegion.get(codes[0]).push(element);
}
const sansSigne = SIX.filter((code) => signesParRegion.get(code).length === 0);
dire(
  'regions dont la silhouette porte au moins un signe d ambiance nomme',
  `${String(6 - sansSigne.length)} / 6`
);
for (const code of SIX) {
  dire(`  · ${code} : signes nommes`, signesParRegion.get(code).length);
}
if (sansSigne.length > 0) echec(`régions sans signe d'ambiance : ${sansSigne.join(', ')}`);

// ═════════════════════════════ 5. les signes sont DÉTOURÉS par leur région
//
// Le détourage est déclaré une fois par groupe (`clip-path="url(#clip-<région>)"`), ce qui
// rend le débordement impossible par construction. On vérifie que le groupe existe, qu'il
// pointe sur un `clipPath` réel, et que ce `clipPath` reprend bien la silhouette de la région
// — sans quoi les ornements seraient détourés par la mauvaise forme, ce que l'œil ne verrait
// qu'à l'usage.
for (const code of SIX) {
  if (!texteV3.includes(`clip-path="url(#clip-${code})"`)) {
    echec(`aucun groupe de signes n'est détouré par \`clip-${code}\`.`);
  }
  const clip = new RegExp(`<clipPath id="clip-${code}"><use href="#${code}"/></clipPath>`, 'u');
  if (!clip.test(texteV3)) {
    echec(`\`clip-${code}\` n'est pas un \`<use>\` de la silhouette « ${code} » : détourage faux.`);
  }
}
dire('groupes de signes detoures par la silhouette de leur region', `${String(SIX.length)} / 6`);

// ═════════════════════════════ 6. géométrie des six territoires
let paires = 0;
const vues = new Map();
const surfaces = new Map();
for (const code of SIX) {
  const element = tableV3.get(code);
  if (element === undefined || element.d === null) {
    echec(`la région « ${code} » n'est pas dessinée dans la v3.`);
    continue;
  }
  const mesure = mesureDeRegion(element.d);
  if (mesure === null) {
    echec(`« ${code} » n'est pas polygonale : surface et centroïde ne peuvent pas être calculés.`);
    continue;
  }
  surfaces.set(code, Math.round(Math.abs(mesure.surface)));

  const sil = silhouette(element.d);
  const jumelle = vues.get(sil);
  if (jumelle !== undefined) {
    paires += 1;
    echec(`« ${code} » a exactement la silhouette de « ${jumelle} ».`);
  }
  vues.set(sil, code);

  // Le marqueur tombe-t-il DANS son territoire ? Une ancre hors de sa région déplacerait le
  // tap du dessin, ce qui ne se voit qu'à l'usage.
  const marqueur = mV3.find(([id]) => id === code);
  const anneaux = polygonesDuChemin(element.d);
  if (marqueur === undefined || !pointDansRegion(anneaux, [marqueur[1], marqueur[2]])) {
    echec(`l'ancre de « ${code} » tombe hors de sa région.`);
  }

  // Les signes de la région tiennent-ils dans son rectangle englobant ? Le détourage garantit
  // déjà qu'ils ne débordent pas au RENDU ; ce contrôle-ci dit s'ils sont massivement hors
  // cadre, c'est-à-dire coupés au point de ne plus rien montrer.
  const boiteRegion = boitePolygonale(element.d);
  for (const signe of signesParRegion.get(code)) {
    if (signe.d === null) continue;
    const b = boitePolygonale(signe.d);
    if (b === null) continue; // ornement à courbes : hors du domaine polygonal, admis.
    const dedans =
      b[2] > boiteRegion[0] && b[0] < boiteRegion[2] && b[3] > boiteRegion[1] && b[1] < boiteRegion[3];
    if (!dedans) echec(`le signe « ${signe.id} » est entièrement hors du cadre de « ${code} ».`);
  }
}
dire('paires de regions partageant leur silhouette', paires);
dire('surfaces des six territoires', [...surfaces.values()].join(' · '));
dire('surfaces distinctes', `${String(new Set(surfaces.values()).size)} / 6`);

// ═════════════════════════════ 7. aucun tracé rempli n'est ouvert
//
// « Un trait interrompu d'un pixel fait fuiter le remplissage sur toute l'image »
// (annexe P § 3.2). La règle de fermeture est celle du paquet `partage`, réécrite ici à
// l'identique parce qu'un script Node ne sait pas importer un `.ts` — elle est comparée à sa
// source dans le rapport du lot.
const estCheminFerme = (d) => {
  const nettoye = d.trim();
  if (nettoye.length === 0) return false;
  if (!/^[Mm]/.test(nettoye)) return false;
  const sous = nettoye.split(/(?=[Mm])/).map((m) => m.trim()).filter((m) => m.length > 0);
  return sous.length > 0 && sous.every((m) => /[Zz]$/.test(m));
};
const ouverts = elementsV3
  .filter((e) => e.d !== null && e.fill !== 'none' && e.fill !== '' && !estCheminFerme(e.d))
  .map((e) => e.id ?? '<path sans id>');
dire('traces remplis non refermes', ouverts.length);
if (ouverts.length > 0) echec(`tracés remplis ouverts : ${ouverts.join(', ')}`);

// ═════════════════════════════ 8. aucun territoire n'est peint dans le gris de la Grisaille
//
// Le gris n'est pas une couleur de décor : c'est le signe univoque de « pas encore rallumé ».
// Un territoire peint dans une teinte voisine de `--grisaille` rendrait le voile illisible.
const GRISAILLE = [0x8e, 0x97, 0xa8];
const composantes = (hexa) => [1, 3, 5].map((i) => Number.parseInt(hexa.slice(i, i + 2), 16));
let plusProche = 255 * 3;
for (const code of SIX) {
  const element = tableV3.get(code);
  if (element === undefined || !/^#[0-9A-Fa-f]{6}$/.test(element.fill)) continue;
  const d = composantes(element.fill).reduce((t, c, i) => t + Math.abs(c - GRISAILLE[i]), 0);
  plusProche = Math.min(plusProche, d);
  if (d < 90) echec(`« ${code} » est peint en ${element.fill}, trop proche de --grisaille #8E97A8.`);
}
dire('distance minimale d un territoire a --grisaille (somme RVB)', plusProche);

// ═════════════════════════════ 9. le viewBox ne bouge pas
const viewBox = (texte) => /viewBox="([^"]+)"/u.exec(texte)?.[1] ?? null;
dire('viewBox', viewBox(texteV3));
if (viewBox(texteV3) !== '0 0 1200 800') echec('le `viewBox` de la v3 n’est pas `0 0 1200 800`.');

// ═════════════════════════════ 10. l'écran sert bien la v3, et ses six ancres n'ont pas bougé
if (!texteEcran.includes("habillages/carte/carte-monde-v3.svg")) {
  echec('`EcranCarte.tsx` ne sert pas `carte-monde-v3.svg` : le dessin n’atteindrait pas l’enfant.');
}
const ancres = [...texteEcran.matchAll(/\['([a-z-]+)', (\d+), (\d+), '/gu)].map((m) => [
  m[1],
  Number(m[2]),
  Number(m[3]),
]);
let ecartAncres = 0;
if (ancres.length !== 6) {
  echec(`\`EcranCarte.tsx\` porte ${ancres.length} ancres au lieu de 6.`);
  ecartAncres = Number.POSITIVE_INFINITY;
} else {
  for (let i = 0; i < 6; i += 1) {
    if (ancres[i][0] !== SIX[i]) echec(`ancre ${String(i + 1)} : « ${ancres[i][0] }» ≠ « ${SIX[i]} »`);
    ecartAncres = Math.max(ecartAncres, Math.abs(ancres[i][1] - mV3[i][1]), Math.abs(ancres[i][2] - mV3[i][2]));
  }
}
dire('ecart entre les ancres de l ecran et les marqueurs du SVG', ecartAncres);
if (ecartAncres !== 0) echec('les ancres de l’écran et les marqueurs du SVG ont divergé.');

// ═════════════════════════════ 11. les trois rendus, et la cible tapable de R16
const rendus = ['voilee', 'ouverte', 'terminee'].filter((etat) =>
  new RegExp(`RENDUS(?:[\\s\\S]*?)${etat}`, 'u').test(texteEcran)
);
const rendusDeclares = [...texteEcran.matchAll(/^\s{2}(voilee|ouverte|terminee):\s*\{/gmu)].map(
  (m) => m[1]
);
dire('etats de rendu distincts declares par l ecran', `${String(new Set(rendusDeclares).size)} / 3`);
if (new Set(rendusDeclares).size !== 3) {
  echec(`l’écran ne déclare pas trois rendus distincts (${rendusDeclares.join(', ') || 'aucun'}).`);
}
void rendus;

const rayon = Number(/const RAYON_PRISE = (\d+)/u.exec(texteEcran)?.[1] ?? '0');
dire('cible tapable des marqueurs (diametre, unites viewBox = px a 1200)', rayon * 2);
if (rayon * 2 < CIBLE_MINIMALE_PX) {
  echec(`cible tapable de ${String(rayon * 2)} px : R16 en exige ${String(CIBLE_MINIMALE_PX)}.`);
}

// ═════════════════════════════ 12. D46 — la carte n'ajoute aucun écran intermédiaire
const bloquants = [/setTimeout\(/u, /animation-entree/u, /aria-modal/u];
const trouves = bloquants.filter((motif) => motif.test(texteEcran));
dire('ecrans ou animations d entree bloquants ajoutes par la carte', trouves.length);
if (trouves.length > 0) echec('la carte ajoute un délai ou un écran intermédiaire (D46).');

// ─────────────────────────────────────────────────────────────────────────────── le verdict

process.stdout.write(`\n${lignes.join('\n')}\n\n`);
if (problemes.length === 0) {
  process.stdout.write('carte du monde v3 — 0 anomalie.\n');
  process.exit(0);
}
process.stdout.write(`carte du monde v3 — ${String(problemes.length)} anomalie(s) :\n`);
for (const probleme of problemes) process.stdout.write(`  ✗ ${probleme}\n`);
process.exit(1);
