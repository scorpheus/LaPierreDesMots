/**
 * Recompose le campement en îlots naturels à partir des trente objets vectoriels historiques.
 *
 * La source archivée conserve les dessins détaillés. L'émetteur retire leurs bandes de sol
 * artificielles, déplace les groupes complets et écrit les mêmes boîtes dans campement.json.
 * Le décor et les prises tactiles ne peuvent donc pas dériver entre deux exécutions.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVG = join(RACINE, 'contenu', 'habillages', 'campement', 'campement.svg');
const DOCUMENT = join(RACINE, 'contenu', 'monde', 'campement.json');
const SOURCE = join(RACINE, 'production', 'archives', 'campement-grille-v4.svg');

/** [x, y, côté] — hiérarchie et placement éditorial de la V5. */
const DISPOSITION = {
  tente: [430, 130, 250],
  feu: [535, 410, 130],
  carte: [85, 190, 145],
  coffre: [145, 505, 125],
  'mur-des-noms': [15, 350, 120],
  chaudron: [335, 390, 115],
  lunette: [845, 245, 135],
  'hamac-de-gobi': [970, 170, 145],
  banniere: [300, 35, 110],
  carillon: [720, 95, 95],
  marmite: [735, 445, 82],
  'tas-de-bois': [865, 440, 95],
  seau: [785, 555, 76],
  lanterne: [685, 270, 76],
  'corde-a-linge': [135, 55, 150],
  tabouret: [455, 565, 80],
  'panier-de-pommes': [970, 510, 100],
  'sac-de-graines': [1080, 450, 80],
  'bocal-de-lucioles': [700, 590, 78],
  'livre-ouvert': [520, 600, 115],
  'plume-et-encrier': [640, 675, 70],
  'galets-empiles': [95, 650, 72],
  champignon: [25, 695, 64],
  buisson: [1080, 285, 100],
  'fleur-bleue': [1105, 610, 70],
  papillon: [275, 255, 68],
  escargot: [920, 690, 64],
  grenouille: [1020, 665, 72],
  'pierre-gravee': [45, 520, 88],
  'etoile-filante': [1080, 55, 80],
};

const DECOR = `  <g id="calque-fond">
    <path d="M0,0 L1200,0 L1200,800 L0,800 Z" fill="#BFE2F2"/>
    <path d="M0,225 L145,105 L260,210 L390,70 L535,220 L690,95 L850,225 L1010,115 L1200,230 L1200,430 L0,430 Z" fill="#76979A"/>
    <path d="M0,270 L95,165 L170,260 L280,135 L355,270 L465,155 L555,270 L665,145 L755,275 L870,150 L955,270 L1070,145 L1200,260 L1200,470 L0,470 Z" fill="#466F68"/>
    <path d="M0,305 C170,260 300,300 420,285 C600,265 740,305 900,275 C1030,250 1120,270 1200,300 L1200,800 L0,800 Z" fill="#769B66"/>
    <path d="M535,260 C605,335 680,405 720,520 C755,625 735,710 690,800 L390,800 C455,710 500,640 505,550 C510,440 470,350 440,285 Z" fill="#C7AD7F"/>
    <path d="M0,660 C190,620 335,675 480,650 C690,615 830,675 1010,640 C1095,625 1155,635 1200,650 L1200,800 L0,800 Z" fill="#577C50"/>
  </g>
  <g id="calque-decor" fill="#355B4E" stroke="#1B2440" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <path d="M0,0 L125,0 L112,170 L95,325 L48,430 L0,455 Z" fill="#31574D"/>
    <path d="M1200,0 L1080,0 L1095,170 L1110,315 L1160,435 L1200,455 Z" fill="#31574D"/>
    <path d="M0,0 L250,0 L205,45 L118,70 L45,110 L0,125 Z"/>
    <path d="M1200,0 L950,0 L995,45 L1082,70 L1155,110 L1200,125 Z"/>
    <path d="M340,505 L700,505 L745,625 L675,715 L390,715 L315,620 Z" fill="#617F91" stroke="#314354"/>
    <path d="M355,520 L688,520 L715,605 L660,685 L405,685 L345,605 Z" fill="#7896A5" stroke="none"/>
    <path d="M50,770 C160,720 245,750 325,790 L50,800 Z" fill="#355B4E"/>
    <path d="M875,790 C970,735 1085,735 1200,775 L1200,800 Z" fill="#355B4E"/>
    <path d="M410,285 C470,260 520,265 565,290" fill="none" stroke="#FFF6E3" stroke-width="5" stroke-dasharray="9 13" opacity=".55"/>
  </g>`;

if (!existsSync(SOURCE)) copyFileSync(SVG, SOURCE);
const document = JSON.parse(readFileSync(DOCUMENT, 'utf8'));
const source = readFileSync(SOURCE, 'utf8');

const attendus = new Set(document.points.map((point) => point.id));
if (attendus.size !== Object.keys(DISPOSITION).length) {
  throw new Error(`Disposition incomplète : ${String(Object.keys(DISPOSITION).length)} / ${String(attendus.size)}.`);
}

let sortie = source
  .replace('<svg ', '<svg data-direction="campement-v5-enfant" data-composition="ilots-naturels" ')
  .replace(
    /<desc>[\s\S]*?<\/desc>/u,
    '<desc>Le repaire forestier V5 destiné aux enfants de 7 ans : trente objets vectoriels en îlots naturels autour d’une grande tente-cabane. Chaque groupe objet porte l’identifiant du point tactile correspondant et s’anime réellement au toucher.</desc>',
  );

const debutFond = sortie.indexOf('  <g id="calque-fond">');
const debutPoints = sortie.indexOf('  <g id="calque-points"');
if (debutFond < 0 || debutPoints < 0) throw new Error('Calques du campement source introuvables.');
sortie = `${sortie.slice(0, debutFond)}${DECOR}\n${sortie.slice(debutPoints)}`;

for (const [index, point] of document.points.entries()) {
  // La source archivée est la grille historique 10 × 3, pas le JSON éventuellement déjà réécrit.
  const ancien = [20 + (index % 10) * 120, 30 + Math.floor(index / 10) * 220, 96, 96];
  const nouveau = DISPOSITION[point.id];
  if (ancien === undefined || nouveau === undefined) throw new Error(`Point sans disposition : ${point.id}`);
  const [ancienX, ancienY, ancienL, ancienH] = ancien;
  const [x, y, cote] = nouveau;
  const echelle = cote / Math.max(ancienL, ancienH);
  const dx = x - ancienX * echelle;
  const dy = y - ancienY * echelle;
  const motif = new RegExp(`<g id="objet-${point.id}">([\\s\\S]*?)<\\/g>`, 'u');
  const trouve = sortie.match(motif);
  if (trouve === null) throw new Error(`Groupe SVG introuvable : objet-${point.id}`);
  const corpsSansPlaque = trouve[1].replace(/^\s*<path(?![^>]*\sid=)[^>]*\/>\s*/u, '\n');
  // Le placement reste sur un parent immobile : l'animation CSS de l'objet
  // peut alors utiliser transform sans écraser sa translation dans la scène.
  const transforme =
    `<g id="placement-${point.id}" ` +
    `transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)}) scale(${echelle.toFixed(5)})">` +
    `<g id="objet-${point.id}" data-objet-campement="${point.id}">` +
    `${corpsSansPlaque}</g></g>`;
  sortie = sortie.replace(motif, transforme);
  point.zone = [x, y, cote, cote];
}

document.$commentaire =
  'Campement V5 : 30 points conservés, recomposés en îlots naturels par scripts/recomposer-campement.mjs. Les zones suivent les groupes SVG et les objets complets sont animés dans le DOM.';

writeFileSync(SVG, sortie, 'utf8');
writeFileSync(DOCUMENT, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log('Campement V5 écrit : 30 groupes, 30 zones, composition en îlots naturels.');
