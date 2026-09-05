import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { decoderPng, encoderPng } from '../sprites/png.mjs';

const [, , sourceBrute, destinationBrute, quadrantBrut] = process.argv;

if (sourceBrute === undefined || destinationBrute === undefined) {
  throw new Error(
    'Usage : node scripts/images/detourer-fond-clair-connecte.mjs source.png destination.png [quadrant]',
  );
}

const source = resolve(sourceBrute);
const destination = resolve(destinationBrute);
const racine = resolve(process.cwd());
const racineBrouillons = resolve(racine, 'contenu', 'brouillons') + '\\';
const racineAssets = resolve(racine, 'contenu', 'assets') + '\\';
const referenceCompagnons = resolve(
  racine,
  'production',
  'personnages',
  'reference-compagnons-validee-2026-09-04.png',
);

if (
  (!source.startsWith(racineBrouillons) && source !== referenceCompagnons)
  || !destination.startsWith(racineAssets)
) {
  throw new Error(
    'Le détourage part uniquement de contenu/brouillons/ ou de la référence validée des compagnons, vers contenu/assets/.',
  );
}

const quadrants = {
  'haut-gauche': [0, 0],
  'haut-droit': [1, 0],
  'bas-gauche': [0, 1],
  'bas-droit': [1, 1],
};

function extraireQuadrant(imageSource, quadrant) {
  const position = quadrants[quadrant];
  if (position === undefined) {
    throw new Error(`Quadrant inconnu : ${String(quadrant)}.`);
  }
  if (imageSource.largeur % 2 !== 0 || imageSource.hauteur % 2 !== 0) {
    throw new Error('La planche de référence doit se partager en quatre quadrants entiers.');
  }
  const largeurQuadrant = imageSource.largeur / 2;
  const hauteurQuadrant = imageSource.hauteur / 2;
  const pixelsQuadrant = new Uint8Array(largeurQuadrant * hauteurQuadrant * 4);
  const [colonne, ligne] = position;
  for (let y = 0; y < hauteurQuadrant; y += 1) {
    const sourceDebut = (
      ((ligne * hauteurQuadrant + y) * imageSource.largeur + colonne * largeurQuadrant) * 4
    );
    pixelsQuadrant.set(
      imageSource.pixels.subarray(sourceDebut, sourceDebut + largeurQuadrant * 4),
      y * largeurQuadrant * 4,
    );
  }
  return { largeur: largeurQuadrant, hauteur: hauteurQuadrant, pixels: pixelsQuadrant };
}

const imageLue = decoderPng(await readFile(source));
if (source === referenceCompagnons && quadrantBrut === undefined) {
  throw new Error('Un quadrant est obligatoire avec la planche validée des compagnons.');
}
const image = quadrantBrut === undefined ? imageLue : extraireQuadrant(imageLue, quadrantBrut);
const { largeur, hauteur, pixels } = image;
const visites = new Uint8Array(largeur * hauteur);
const file = new Int32Array(largeur * hauteur);
let debut = 0;
let fin = 0;

function candidat(index) {
  const decalage = index * 4;
  const rouge = pixels[decalage] ?? 0;
  const vert = pixels[decalage + 1] ?? 0;
  const bleu = pixels[decalage + 2] ?? 0;
  const minimum = Math.min(rouge, vert, bleu);
  const maximum = Math.max(rouge, vert, bleu);
  return minimum >= 205 && maximum - minimum <= 45;
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

let sommeRouge = 0;
let sommeVert = 0;
let sommeBleu = 0;
let echantillons = 0;
for (let index = 0; index < visites.length; index += 1) {
  if (visites[index] === 0) continue;
  const decalage = index * 4;
  sommeRouge += pixels[decalage] ?? 0;
  sommeVert += pixels[decalage + 1] ?? 0;
  sommeBleu += pixels[decalage + 2] ?? 0;
  echantillons += 1;
}
const fond = [sommeRouge, sommeVert, sommeBleu].map((somme) => somme / echantillons);

function toucheLeFond(index) {
  const x = index % largeur;
  const y = Math.floor(index / largeur);
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const voisinX = x + dx;
      const voisinY = y + dy;
      if (
        voisinX >= 0 && voisinX < largeur && voisinY >= 0 && voisinY < hauteur
        && visites[voisinY * largeur + voisinX] === 1
      ) return true;
    }
  }
  return false;
}

let transparents = 0;
let transitions = 0;
for (let index = 0; index < visites.length; index += 1) {
  const decalage = index * 4;
  if (visites[index] === 1) {
    pixels[decalage] = 0;
    pixels[decalage + 1] = 0;
    pixels[decalage + 2] = 0;
    pixels[decalage + 3] = 0;
    transparents += 1;
    continue;
  }
  if (!toucheLeFond(index)) continue;

  const distance = Math.hypot(
    (pixels[decalage] ?? 0) - (fond[0] ?? 0),
    (pixels[decalage + 1] ?? 0) - (fond[1] ?? 0),
    (pixels[decalage + 2] ?? 0) - (fond[2] ?? 0),
  );
  const alpha = Math.max(0, Math.min(255, Math.round(((distance - 6) / 58) * 255)));
  if (alpha >= 255) continue;

  pixels[decalage + 3] = alpha;
  if (alpha === 0) {
    pixels[decalage] = 0;
    pixels[decalage + 1] = 0;
    pixels[decalage + 2] = 0;
    transparents += 1;
    continue;
  }

  const facteur = alpha / 255;
  for (let canal = 0; canal < 3; canal += 1) {
    pixels[decalage + canal] = Math.max(
      0,
      Math.min(
        255,
        Math.round(((pixels[decalage + canal] ?? 0) - (fond[canal] ?? 0) * (1 - facteur)) / facteur),
      ),
    );
  }
  transitions += 1;
}

// Le quart de planche contient volontairement beaucoup d'air autour du personnage. Le retirer
// ici permet au même fichier de rester lisible dans une petite carte comme dans une grande fiche,
// sans agrandissement CSS fragile ni redessin de l'illustration validée.
const marge = 24;
let gauche = largeur;
let haut = hauteur;
let droite = -1;
let bas = -1;
for (let y = 0; y < hauteur; y += 1) {
  for (let x = 0; x < largeur; x += 1) {
    if ((pixels[(y * largeur + x) * 4 + 3] ?? 0) <= 8) continue;
    gauche = Math.min(gauche, x);
    haut = Math.min(haut, y);
    droite = Math.max(droite, x);
    bas = Math.max(bas, y);
  }
}
if (droite < gauche || bas < haut) {
  throw new Error('Le détourage ne contient plus aucun pixel visible.');
}

gauche = Math.max(0, gauche - marge);
haut = Math.max(0, haut - marge);
droite = Math.min(largeur - 1, droite + marge);
bas = Math.min(hauteur - 1, bas + marge);
const largeurCadree = droite - gauche + 1;
const hauteurCadree = bas - haut + 1;
const pixelsCadres = new Uint8Array(largeurCadree * hauteurCadree * 4);
for (let y = 0; y < hauteurCadree; y += 1) {
  const sourceDebut = ((haut + y) * largeur + gauche) * 4;
  const destinationDebut = y * largeurCadree * 4;
  pixelsCadres.set(
    pixels.subarray(sourceDebut, sourceDebut + largeurCadree * 4),
    destinationDebut,
  );
}

await mkdir(dirname(destination), { recursive: true });
await writeFile(
  destination,
  encoderPng({ largeur: largeurCadree, hauteur: hauteurCadree, pixels: pixelsCadres }),
);
process.stdout.write(
  `${sourceBrute} -> ${destinationBrute} : ${String(largeurCadree)}x${String(hauteurCadree)}, `
  + `${String(transparents)} transparents, ${String(transitions)} pixels de transition.\n`,
);
