import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { decoderPng, encoderPng } from '../sprites/png.mjs';

const [, , sourceBrute, destinationBrute] = process.argv;

if (sourceBrute === undefined || destinationBrute === undefined) {
  throw new Error('Usage : node scripts/images/detourer-fond-blanc.mjs source.png destination.png');
}

const source = resolve(sourceBrute);
const destination = resolve(destinationBrute);
const racine = resolve(process.cwd());
const racineBrouillons = resolve(racine, 'contenu', 'brouillons') + '\\';
const racineAssets = resolve(racine, 'contenu', 'assets') + '\\';

if (!source.startsWith(racineBrouillons) || !destination.startsWith(racineAssets)) {
  throw new Error('Le détourage va uniquement de contenu/brouillons/ vers contenu/assets/.');
}

const image = decoderPng(await readFile(source));
const { largeur, hauteur, pixels } = image;
const visites = new Uint8Array(largeur * hauteur);
const file = new Int32Array(largeur * hauteur);
let debut = 0;
let fin = 0;

function candidat(index) {
  const decalage = index * 4;
  const rouge = pixels[decalage];
  const vert = pixels[decalage + 1];
  const bleu = pixels[decalage + 2];
  const minimum = Math.min(rouge, vert, bleu);
  const maximum = Math.max(rouge, vert, bleu);
  return minimum >= 210 && maximum - minimum <= 38;
}

function ajouter(index) {
  if (visites[index] === 0 && candidat(index)) {
    visites[index] = 1;
    file[fin] = index;
    fin += 1;
  }
}

for (let x = 0; x < largeur; x += 1) {
  ajouter(x);
  ajouter((hauteur - 1) * largeur + x);
}
for (let y = 1; y < hauteur - 1; y += 1) {
  ajouter(y * largeur);
  ajouter(y * largeur + largeur - 1);
}

while (debut < fin) {
  const index = file[debut];
  debut += 1;
  const x = index % largeur;
  const y = Math.floor(index / largeur);
  if (x > 0) ajouter(index - 1);
  if (x + 1 < largeur) ajouter(index + 1);
  if (y > 0) ajouter(index - largeur);
  if (y + 1 < hauteur) ajouter(index + largeur);
}

let transparents = 0;
let transition = 0;
for (let index = 0; index < visites.length; index += 1) {
  if (visites[index] === 0) continue;
  const decalage = index * 4;
  const minimum = Math.min(pixels[decalage], pixels[decalage + 1], pixels[decalage + 2]);
  const alpha = Math.max(0, Math.min(255, Math.round(((250 - minimum) / 40) * 255)));
  pixels[decalage + 3] = alpha;
  if (alpha === 0) {
    pixels[decalage] = 0;
    pixels[decalage + 1] = 0;
    pixels[decalage + 2] = 0;
    transparents += 1;
  } else if (alpha < 255) {
    const facteur = alpha / 255;
    for (let canal = 0; canal < 3; canal += 1) {
      pixels[decalage + canal] = Math.max(
        0,
        Math.min(255, Math.round((pixels[decalage + canal] - 255 * (1 - facteur)) / facteur))
      );
    }
    transition += 1;
  }
}

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, encoderPng(image));
process.stdout.write(
  `${sourceBrute} -> ${destinationBrute} : ${largeur}x${hauteur}, ` +
    `${String(transparents)} transparents, ${String(transition)} pixels de transition.\n`
);
