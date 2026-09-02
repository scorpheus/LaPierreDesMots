import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyserColoriage, rgbDeIndex } from './pipeline.mjs';
import { decoderPng, encoderPng } from '../sprites/png.mjs';

const RACINE = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SOURCE = 'contenu/brouillons/campement/coloriage-chaudron-v3-organique.png';
const EMPREINTE_SOURCE = '7F05618925D644E7914D2E0C69BEB7CF642B3C8F4E9A7A4C695AE102ABA9F1F5';
const SORTIES = Object.freeze({
  fond: 'contenu/habillages/campement/chaudron-fond.png',
  trait: 'contenu/habillages/campement/chaudron-trait.png',
  masque: 'contenu/habillages/campement/chaudron-masque.png',
  rapport: 'production/coloriages/chaudron-raster.rapport.json',
});

/**
 * Les index sont ceux du flood-fill déterministe de la source parent validée. Ils sont figés
 * avec son SHA-256 : si un pixel change, le script refuse avant de pouvoir attribuer un mauvais
 * nom à une région. Les petites pupilles et nervures restent du trait, pas des micro-cibles.
 */
export const REGIONS_CHAUDRON = Object.freeze([
  { source: 8, id: 'rebord-du-chaudron', libelle: 'le rebord du chaudron' },
  { source: 23, id: 'mousse-de-couleurs', libelle: 'la mousse de couleurs' },
  { source: 31, id: 'ventre-du-chaudron', libelle: 'le ventre du chaudron' },
  { source: 15, id: 'godet-gauche', libelle: 'le godet de gauche' },
  { source: 13, id: 'godet-du-milieu', libelle: 'le godet du milieu' },
  { source: 18, id: 'godet-droit', libelle: 'le godet de droite' },
  { source: 22, id: 'godet-devant', libelle: 'le godet de devant' },
  { source: 29, id: 'grenouille', libelle: 'la grenouille' },
  { source: 5, id: 'feuille-gauche', libelle: 'la feuille de gauche' },
  { source: 3, id: 'grande-feuille-droite', libelle: 'la grande feuille de droite' },
  { source: 26, id: 'feuille-droite', libelle: 'la feuille de droite' },
  { source: 30, id: 'chapeau-lanterne', libelle: 'le chapeau de la lanterne' },
  { source: 43, id: 'verre-lanterne', libelle: 'le verre de la lanterne' },
  { source: 64, id: 'socle-lanterne', libelle: 'le socle de la lanterne' },
  { source: 56, id: 'chapeau-champignon-gauche', libelle: 'le champignon de gauche' },
  { source: 71, id: 'pied-champignon-gauche', libelle: 'le pied du champignon de gauche' },
  { source: 65, id: 'chapeau-champignon-droit', libelle: 'le champignon de droite' },
  { source: 74, id: 'pied-champignon-droit', libelle: 'le pied du champignon de droite' },
  { source: 60, id: 'feuille-tombee', libelle: 'la feuille tombée' },
  { source: 53, id: 'caillou-gauche', libelle: 'le caillou de gauche' },
  { source: 61, id: 'caillou-droit', libelle: 'le caillou de droite' },
]);

function sha256(tampon) {
  return createHash('sha256').update(tampon).digest('hex').toUpperCase();
}

function hexa(rgb) {
  return `#${rgb.map((canal) => canal.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export async function construireChaudronRaster() {
  const tamponSource = await readFile(resolve(RACINE, SOURCE));
  const empreinte = sha256(tamponSource);
  if (empreinte !== EMPREINTE_SOURCE) {
    throw new Error(`Le brouillon validé a changé : ${empreinte}, attendu ${EMPREINTE_SOURCE}.`);
  }

  const image = decoderPng(tamponSource);
  if (image.largeur !== 1536 || image.hauteur !== 1024) {
    throw new Error(`Dimensions source inattendues : ${image.largeur} × ${image.hauteur}.`);
  }
  const analyse = analyserColoriage(image, { seuilEncre: 200, aireMinimale: 16 });
  const composantes = new Map(
    analyse.rapport.composantes.map((composante) => [composante.index, composante]),
  );
  const regionParComposante = new Map();
  const regions = REGIONS_CHAUDRON.map((definition, position) => {
    const composante = composantes.get(definition.source);
    if (composante === undefined || !composante.coloriable || composante.aire < 1000) {
      throw new Error(`La région « ${definition.id} » ne correspond plus à une zone fermée suffisante.`);
    }
    const index = position + 1;
    regionParComposante.set(definition.source, index);
    return {
      id: definition.id,
      libelle: definition.libelle,
      centroide: [
        Math.round(composante.centroide.x * 625) / 1000,
        Math.round(composante.centroide.y * 625) / 1000,
      ],
      surface: Math.round(composante.aire * 0.390625 * 10) / 10,
      couleurMasque: hexa(rgbDeIndex(index)),
      sourceFloodFill: definition.source,
      pixels: composante.aire,
    };
  });

  const pixelsMasque = new Uint8Array(image.largeur * image.hauteur * 4);
  for (let position = 0; position < analyse.etiquettes.length; position += 1) {
    const numero = analyse.etiquettes[position];
    if (numero < 0) continue;
    const indexSource = analyse.indexParComposante[numero];
    const indexPublie = regionParComposante.get(indexSource);
    if (indexPublie === undefined) continue;
    const rgb = rgbDeIndex(indexPublie);
    pixelsMasque.set([rgb[0], rgb[1], rgb[2], 255], position * 4);
  }

  const pixelsFond = new Uint8Array(image.largeur * image.hauteur * 4);
  const pixelsTrait = new Uint8Array(image.largeur * image.hauteur * 4);
  for (let position = 0; position < image.largeur * image.hauteur; position += 1) {
    const pixel = position * 4;
    pixelsFond.set([255, 255, 255, 255], pixel);
    pixelsTrait.set([
      10,
      43,
      104,
      Math.min(255, Math.round((analyse.trait.pixels[pixel + 3] ?? 0) * 1.2)),
    ], pixel);
  }
  const fond = encoderPng({ largeur: image.largeur, hauteur: image.hauteur, pixels: pixelsFond });
  const trait = encoderPng({ largeur: image.largeur, hauteur: image.hauteur, pixels: pixelsTrait });
  const masque = encoderPng({ largeur: image.largeur, hauteur: image.hauteur, pixels: pixelsMasque });
  return {
    tampons: { fond, trait, masque },
    rapport: {
      version: 1,
      source: SOURCE,
      empreinteSourceFichier: `sha256:${empreinte}`,
      methode: 'flood-fill-4-voisins puis sélection sémantique parent validée',
      seuilEncre: 200,
      dimensions: { largeur: image.largeur, hauteur: image.hauteur },
      nombreRegions: regions.length,
      pixelsMasque: regions.reduce((total, region) => total + region.pixels, 0),
      regions,
      sorties: SORTIES,
      empreintesFichiers: {
        fond: `sha256:${sha256(fond)}`,
        trait: `sha256:${sha256(trait)}`,
        masque: `sha256:${sha256(masque)}`,
      },
    },
  };
}

export async function publierChaudronRaster() {
  const production = await construireChaudronRaster();
  for (const chemin of Object.values(SORTIES)) {
    await mkdir(dirname(resolve(RACINE, chemin)), { recursive: true });
  }
  await Promise.all([
    writeFile(resolve(RACINE, SORTIES.fond), production.tampons.fond),
    writeFile(resolve(RACINE, SORTIES.trait), production.tampons.trait),
    writeFile(resolve(RACINE, SORTIES.masque), production.tampons.masque),
    writeFile(resolve(RACINE, SORTIES.rapport), `${JSON.stringify(production.rapport, null, 2)}\n`, 'utf8'),
  ]);
  return production.rapport;
}

const estLanceDirectement = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (estLanceDirectement) {
  publierChaudronRaster()
    .then((rapport) => process.stdout.write(
      `${rapport.nombreRegions} régions, ${rapport.pixelsMasque} pixels indexés — ${SORTIES.rapport}\n`,
    ))
    .catch((erreur) => {
      process.stderr.write(`${erreur instanceof Error ? erreur.message : String(erreur)}\n`);
      process.exitCode = 1;
    });
}
