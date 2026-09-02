import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decoderPng, encoderPng } from '../sprites/png.mjs';

const NOMS_SORTIE = Object.freeze({
  masque: 'masque-regions.png',
  rapport: 'rapport-regions.json',
  trait: 'trait-transparent.png',
  svg: 'decor-hybride.svg',
});

function entierDansIntervalle(valeur, minimum, maximum, nom) {
  if (!Number.isInteger(valeur) || valeur < minimum || valeur > maximum) {
    throw new Error(`${nom} doit être un entier compris entre ${minimum} et ${maximum}.`);
  }
  return valeur;
}

function luminanceSurBlanc(pixels, decalage) {
  const alpha = pixels[decalage + 3] / 255;
  const luminance = (
    0.2126 * pixels[decalage]
    + 0.7152 * pixels[decalage + 1]
    + 0.0722 * pixels[decalage + 2]
  );
  return luminance * alpha + 255 * (1 - alpha);
}

/** Encode l'index entier d'une région sur 24 bits, sans collision avec l'index nul. */
export function rgbDeIndex(index) {
  entierDansIntervalle(index, 1, 0xffffff, 'L’index de région');
  return [(index >>> 16) & 0xff, (index >>> 8) & 0xff, index & 0xff];
}

function verifierImage(image) {
  if (
    image === null
    || !Number.isInteger(image.largeur)
    || !Number.isInteger(image.hauteur)
    || image.largeur <= 0
    || image.hauteur <= 0
    || image.pixels?.length !== image.largeur * image.hauteur * 4
  ) {
    throw new Error('L’image RGBA ne correspond pas aux dimensions annoncées.');
  }
}

function arrondirCentroide(valeur) {
  return Math.round(valeur * 1000) / 1000;
}

/**
 * Détecte mécaniquement les composantes du papier par flood-fill à quatre voisins.
 * Une composante qui touche un bord est ouverte ; les autres sont fermées. Le masque
 * RGBA porte l'index 24 bits des seules régions fermées assez grandes.
 */
export function analyserColoriage(image, options = {}) {
  verifierImage(image);
  const seuilEncre = entierDansIntervalle(options.seuilEncre ?? 200, 0, 254, 'Le seuil d’encre');
  const aireMinimale = entierDansIntervalle(
    options.aireMinimale ?? 16,
    1,
    Number.MAX_SAFE_INTEGER,
    'L’aire minimale',
  );
  const { largeur, hauteur, pixels } = image;
  const nombrePixels = largeur * hauteur;
  const encre = new Uint8Array(nombrePixels);
  const etiquettes = new Int32Array(nombrePixels);
  etiquettes.fill(-1);

  let pixelsEncre = 0;
  for (let position = 0; position < nombrePixels; position += 1) {
    if (luminanceSurBlanc(pixels, position * 4) <= seuilEncre) {
      encre[position] = 1;
      etiquettes[position] = -2;
      pixelsEncre += 1;
    }
  }

  const file = new Int32Array(nombrePixels);
  const mesures = [];
  for (let depart = 0; depart < nombrePixels; depart += 1) {
    if (etiquettes[depart] !== -1) continue;
    const numero = mesures.length;
    let lecture = 0;
    let ecriture = 1;
    let aire = 0;
    let sommeX = 0;
    let sommeY = 0;
    let minX = largeur;
    let minY = hauteur;
    let maxX = -1;
    let maxY = -1;
    let toucheBord = false;
    file[0] = depart;
    etiquettes[depart] = numero;

    while (lecture < ecriture) {
      const position = file[lecture];
      lecture += 1;
      const x = position % largeur;
      const y = Math.floor(position / largeur);
      aire += 1;
      sommeX += x;
      sommeY += y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      toucheBord ||= x === 0 || y === 0 || x === largeur - 1 || y === hauteur - 1;

      const voisins = [];
      if (x > 0) voisins.push(position - 1);
      if (x + 1 < largeur) voisins.push(position + 1);
      if (y > 0) voisins.push(position - largeur);
      if (y + 1 < hauteur) voisins.push(position + largeur);
      for (const voisin of voisins) {
        if (etiquettes[voisin] !== -1 || encre[voisin] === 1) continue;
        etiquettes[voisin] = numero;
        file[ecriture] = voisin;
        ecriture += 1;
      }
    }

    mesures.push({
      aire,
      sommeX,
      sommeY,
      minX,
      minY,
      maxX,
      maxY,
      fermee: !toucheBord,
    });
  }

  const indexParComposante = new Uint32Array(mesures.length);
  let prochainIndex = 1;
  const composantes = mesures.map((mesure, numero) => {
    const coloriable = mesure.fermee && mesure.aire >= aireMinimale;
    const index = coloriable ? prochainIndex : null;
    if (coloriable) {
      if (prochainIndex > 0xffffff) {
        throw new Error('Le coloriage contient plus de 16 777 215 régions coloriables.');
      }
      indexParComposante[numero] = prochainIndex;
      prochainIndex += 1;
    }
    return {
      composante: numero,
      index,
      rgb: index === null ? null : rgbDeIndex(index),
      aire: mesure.aire,
      dimensions: {
        x: mesure.minX,
        y: mesure.minY,
        largeur: mesure.maxX - mesure.minX + 1,
        hauteur: mesure.maxY - mesure.minY + 1,
      },
      centroide: {
        x: arrondirCentroide(mesure.sommeX / mesure.aire),
        y: arrondirCentroide(mesure.sommeY / mesure.aire),
      },
      fermeture: mesure.fermee ? 'fermee' : 'ouverte',
      fermee: mesure.fermee,
      coloriable,
      raisonExclusion: coloriable
        ? null
        : mesure.fermee ? 'aire-inferieure-au-seuil' : 'touche-le-bord',
    };
  });

  const pixelsMasque = new Uint8Array(nombrePixels * 4);
  const pixelsTrait = new Uint8Array(nombrePixels * 4);
  for (let position = 0; position < nombrePixels; position += 1) {
    const destination = position * 4;
    const numero = etiquettes[position];
    if (numero >= 0) {
      const index = indexParComposante[numero];
      if (index !== 0) {
        const rgb = rgbDeIndex(index);
        pixelsMasque[destination] = rgb[0];
        pixelsMasque[destination + 1] = rgb[1];
        pixelsMasque[destination + 2] = rgb[2];
        pixelsMasque[destination + 3] = 255;
      }
    }
    pixelsTrait[destination] = 0;
    pixelsTrait[destination + 1] = 0;
    pixelsTrait[destination + 2] = 0;
    pixelsTrait[destination + 3] = Math.round(255 - luminanceSurBlanc(pixels, destination));
  }

  return {
    rapport: {
      version: 1,
      methode: 'flood-fill-4-voisins',
      codageMasque: 'index-rgb-24-bits-transparent-hors-region',
      dimensions: { largeur, hauteur },
      seuilEncre,
      aireMinimale,
      pixelsEncre,
      nombreRegionsFermees: composantes.filter(({ fermee }) => fermee).length,
      nombreRegionsColoriables: prochainIndex - 1,
      composantes,
    },
    masque: { largeur, hauteur, pixels: pixelsMasque },
    trait: { largeur, hauteur, pixels: pixelsTrait },
    etiquettes,
    indexParComposante,
  };
}

function echapperXml(texte) {
  return texte
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function rectanglesDesRegions(resultat) {
  const { largeur, hauteur } = resultat.rapport.dimensions;
  const termines = [];
  const actifs = new Map();
  for (let y = 0; y < hauteur; y += 1) {
    const vus = new Set();
    let x = 0;
    while (x < largeur) {
      const numero = resultat.etiquettes[y * largeur + x];
      const index = numero >= 0 ? resultat.indexParComposante[numero] : 0;
      if (index === 0) {
        x += 1;
        continue;
      }
      const debut = x;
      while (
        x + 1 < largeur
        && resultat.etiquettes[y * largeur + x + 1] === numero
      ) x += 1;
      const fin = x + 1;
      const cle = `${index}:${debut}:${fin}`;
      vus.add(cle);
      const precedent = actifs.get(cle);
      if (precedent === undefined) {
        actifs.set(cle, { index, x: debut, y, largeur: fin - debut, hauteur: 1 });
      } else {
        precedent.hauteur += 1;
      }
      x += 1;
    }
    for (const [cle, rectangle] of actifs) {
      if (vus.has(cle)) continue;
      termines.push(rectangle);
      actifs.delete(cle);
    }
  }
  termines.push(...actifs.values());
  return termines;
}

/** Construit une enveloppe SVG dont les aplats précèdent toujours le calque de trait. */
export function creerSvgHybride(resultat, nomTrait = NOMS_SORTIE.trait) {
  const { largeur, hauteur } = resultat.rapport.dimensions;
  const parRegion = new Map();
  for (const rectangle of rectanglesDesRegions(resultat)) {
    const liste = parRegion.get(rectangle.index) ?? [];
    liste.push(rectangle);
    parRegion.set(rectangle.index, liste);
  }

  const chemins = [...parRegion].map(([index, rectangles]) => {
    const rgb = rgbDeIndex(index);
    const d = rectangles.map((rectangle) => (
      `M${rectangle.x} ${rectangle.y}h${rectangle.largeur}v${rectangle.hauteur}`
      + `h-${rectangle.largeur}Z`
    )).join('');
    return `    <path id="region-${index}" class="zone-coloriable" data-region-index="${index}" data-rgb-masque="${rgb.join(',')}" fill="#d6d6d6" d="${d}"/>`;
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}" viewBox="0 0 ${largeur} ${hauteur}">`,
    '  <g id="aplats-coloriables">',
    chemins,
    '  </g>',
    `  <image id="trait" href="${echapperXml(nomTrait)}" x="0" y="0" width="${largeur}" height="${hauteur}"/>`,
    '</svg>',
    '',
  ].join('\n');
}

/**
 * Écrit les quatre artefacts dans un dossier obligatoirement fourni par l'appelant.
 * Aucun chemin implicite, temporaire ou de production n'est choisi par le script.
 */
export async function produireColoriage({
  source,
  destination,
  seuilEncre = 200,
  aireMinimale = 16,
  avecSvg = true,
} = {}) {
  if (typeof destination !== 'string' || destination.trim() === '') {
    throw new Error('Une destination explicite est obligatoire ; aucune sortie par défaut n’existe.');
  }
  if (typeof source !== 'string' || source.trim() === '') {
    throw new Error('Une source PNG explicite est obligatoire.');
  }

  const dossier = resolve(destination);
  const entree = resolve(source);
  const chemins = Object.fromEntries(
    Object.entries(NOMS_SORTIE).map(([cle, nom]) => [cle, resolve(dossier, nom)]),
  );
  if (Object.values(chemins).includes(entree)) {
    throw new Error('La source ne peut pas être écrasée par un artefact de sortie.');
  }

  const image = decoderPng(await readFile(entree));
  const resultat = analyserColoriage(image, { seuilEncre, aireMinimale });
  const rapport = {
    ...resultat.rapport,
    source: basename(entree),
    sorties: {
      masque: NOMS_SORTIE.masque,
      trait: NOMS_SORTIE.trait,
      svg: avecSvg ? NOMS_SORTIE.svg : null,
    },
  };

  await mkdir(dossier, { recursive: true });
  await Promise.all([
    writeFile(chemins.masque, encoderPng(resultat.masque)),
    writeFile(chemins.trait, encoderPng(resultat.trait)),
    writeFile(chemins.rapport, `${JSON.stringify(rapport, null, 2)}\n`, 'utf8'),
    ...(avecSvg
      ? [writeFile(chemins.svg, creerSvgHybride(resultat, NOMS_SORTIE.trait), 'utf8')]
      : []),
  ]);
  return { rapport, chemins: { ...chemins, svg: avecSvg ? chemins.svg : null } };
}

function aide() {
  return [
    'Usage : node scripts/coloriages/pipeline.mjs SOURCE.png --sortie DOSSIER [options]',
    '',
    'Options :',
    '  --sortie DOSSIER       destination obligatoire de tous les artefacts',
    '  --seuil-encre N        luminance maximale considérée comme trait (défaut : 200)',
    '  --aire-minimale N      aire minimale d’une région coloriable (défaut : 16)',
    '  --sans-svg             ne pas produire l’enveloppe SVG hybride',
  ].join('\n');
}

async function principal(argumentsCli) {
  if (argumentsCli.includes('--aide') || argumentsCli.includes('-h')) {
    process.stdout.write(`${aide()}\n`);
    return;
  }
  const valeurs = new Map();
  const positionnels = [];
  const optionsAvecValeur = new Set(['--sortie', '--seuil-encre', '--aire-minimale']);
  for (let position = 0; position < argumentsCli.length; position += 1) {
    const argument = argumentsCli[position];
    if (optionsAvecValeur.has(argument)) {
      const valeur = argumentsCli[position + 1];
      if (valeur === undefined || valeur.startsWith('--')) {
        throw new Error(`L’option ${argument} attend une valeur.\n\n${aide()}`);
      }
      valeurs.set(argument, valeur);
      position += 1;
    } else if (argument === '--sans-svg') {
      // Option booléenne traitée lors de l'appel.
    } else if (argument.startsWith('-')) {
      throw new Error(`Option inconnue : ${argument}.\n\n${aide()}`);
    } else {
      positionnels.push(argument);
    }
  }
  if (positionnels.length > 1) {
    throw new Error(`Une seule source PNG est acceptée.\n\n${aide()}`);
  }
  const source = positionnels[0];
  const destination = valeurs.get('--sortie');
  const seuilBrut = valeurs.get('--seuil-encre');
  const aireBrute = valeurs.get('--aire-minimale');
  const sortie = await produireColoriage({
    source,
    destination,
    seuilEncre: seuilBrut === undefined ? 200 : Number(seuilBrut),
    aireMinimale: aireBrute === undefined ? 16 : Number(aireBrute),
    avecSvg: !argumentsCli.includes('--sans-svg'),
  });
  process.stdout.write(
    `${sortie.rapport.nombreRegionsColoriables} région(s) coloriable(s) — rapport : ${sortie.chemins.rapport}\n`,
  );
}

const estLanceDirectement = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (estLanceDirectement) {
  principal(process.argv.slice(2)).catch((erreur) => {
    process.stderr.write(`${erreur instanceof Error ? erreur.message : String(erreur)}\n`);
    process.exitCode = 1;
  });
}
