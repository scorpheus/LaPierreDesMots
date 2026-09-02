import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decoderPng, encoderPng } from './png.mjs';

const COLONNES = 4;
const LIGNES = 2;
const NB_CELLULES = COLONNES * LIGNES;

function mediane(valeurs) {
  const triees = [...valeurs].sort((a, b) => a - b);
  return triees[Math.floor(triees.length / 2)];
}

function couleurDeFond(image) {
  const rouges = [];
  const verts = [];
  const bleus = [];
  const profondeur = Math.max(1, Math.min(8, Math.floor(Math.min(image.largeur, image.hauteur) / 20)));
  const coins = [
    [0, 0],
    [image.largeur - profondeur, 0],
    [0, image.hauteur - profondeur],
    [image.largeur - profondeur, image.hauteur - profondeur]
  ];
  for (const [x0, y0] of coins) {
    for (let y = y0; y < y0 + profondeur; y += 1) {
      for (let x = x0; x < x0 + profondeur; x += 1) {
        const index = (y * image.largeur + x) * 4;
        if (image.pixels[index + 3] > 0) {
          rouges.push(image.pixels[index]);
          verts.push(image.pixels[index + 1]);
          bleus.push(image.pixels[index + 2]);
        }
      }
    }
  }
  return [mediane(rouges), mediane(verts), mediane(bleus)];
}

function couleurHex(couleur) {
  return `#${couleur.map((canal) => canal.toString(16).padStart(2, '0')).join('')}`;
}

function lireCouleurHex(texte) {
  const propre = texte.replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(propre)) throw new Error(`Couleur invalide : ${texte}.`);
  return [0, 2, 4].map((position) => Number.parseInt(propre.slice(position, position + 2), 16));
}

function distanceCouleur(pixels, index, fond) {
  return Math.hypot(
    pixels[index] - fond[0],
    pixels[index + 1] - fond[1],
    pixels[index + 2] - fond[2]
  );
}

function extraireCellule(image, x0, y0, largeur, hauteur, fond, seuilFond, plume) {
  const pixels = new Uint8Array(largeur * hauteur * 4);
  let minX = largeur;
  let minY = hauteur;
  let maxX = -1;
  let maxY = -1;
  let pixelsVisibles = 0;
  for (let y = 0; y < hauteur; y += 1) {
    for (let x = 0; x < largeur; x += 1) {
      const source = ((y0 + y) * image.largeur + x0 + x) * 4;
      const destination = (y * largeur + x) * 4;
      const distance = distanceCouleur(image.pixels, source, fond);
      const facteur = Math.max(0, Math.min(1, (distance - seuilFond) / Math.max(1, plume)));
      const alpha = Math.round(image.pixels[source + 3] * facteur);
      pixels[destination + 3] = alpha;
      if (alpha > 0) {
        // Décontamination déterministe : on retire le fond estimé du mélange semi-transparent.
        const opacite = Math.max(alpha / 255, 1 / 255);
        for (let canal = 0; canal < 3; canal += 1) {
          const valeur = (image.pixels[source + canal] - fond[canal] * (1 - opacite)) / opacite;
          pixels[destination + canal] = Math.round(Math.max(0, Math.min(255, valeur)));
        }
      }
      if (alpha >= 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        pixelsVisibles += 1;
      }
    }
  }
  const cadre = maxX >= minX ? { x: minX, y: minY, largeur: maxX - minX + 1, hauteur: maxY - minY + 1 } : null;
  return { largeur, hauteur, pixels, cadre, pixelsVisibles };
}

function detecterComposantes(image) {
  const etiquettes = new Int32Array(image.largeur * image.hauteur);
  const file = new Int32Array(image.largeur * image.hauteur);
  const composantes = [];
  let etiquette = 0;
  for (let depart = 0; depart < etiquettes.length; depart += 1) {
    if (etiquettes[depart] !== 0 || image.pixels[depart * 4 + 3] < 8) continue;
    etiquette += 1;
    let lecture = 0;
    let ecriture = 1;
    file[0] = depart;
    etiquettes[depart] = etiquette;
    let minX = image.largeur;
    let minY = image.hauteur;
    let maxX = -1;
    let maxY = -1;
    let sommeX = 0;
    let sommeY = 0;
    while (lecture < ecriture) {
      const courant = file[lecture];
      lecture += 1;
      const x = courant % image.largeur;
      const y = Math.floor(courant / image.largeur);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      sommeX += x;
      sommeY += y;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const voisinX = x + dx;
          const voisinY = y + dy;
          if (voisinX < 0 || voisinX >= image.largeur || voisinY < 0 || voisinY >= image.hauteur) continue;
          const voisin = voisinY * image.largeur + voisinX;
          if (etiquettes[voisin] !== 0 || image.pixels[voisin * 4 + 3] < 8) continue;
          etiquettes[voisin] = etiquette;
          file[ecriture] = voisin;
          ecriture += 1;
        }
      }
    }
    composantes.push({
      etiquette,
      pixels: ecriture,
      cadre: { x: minX, y: minY, largeur: maxX - minX + 1, hauteur: maxY - minY + 1 },
      centre: { x: sommeX / ecriture, y: sommeY / ecriture }
    });
  }
  return { etiquettes, composantes };
}

function distanceNormalisee(a, b, largeurCase, hauteurCase) {
  return Math.hypot((a.x - b.x) / largeurCase, (a.y - b.y) / hauteurCase);
}

function regrouperHuitPoses(image) {
  const { etiquettes, composantes } = detecterComposantes(image);
  if (composantes.length < NB_CELLULES) {
    throw new Error(`Seulement ${composantes.length} composantes détectées ; huit poses séparées sont requises.`);
  }
  const principales = [...composantes]
    .sort((a, b) => b.pixels - a.pixels)
    .slice(0, NB_CELLULES);
  const ordonneesVerticalement = [...principales].sort((a, b) => a.centre.y - b.centre.y);
  const groupes = [
    ...ordonneesVerticalement.slice(0, COLONNES).sort((a, b) => a.centre.x - b.centre.x),
    ...ordonneesVerticalement.slice(COLONNES).sort((a, b) => a.centre.x - b.centre.x)
  ].map((principale) => ({ principale, etiquettes: [principale.etiquette] }));
  const etiquettesPrincipales = new Set(principales.map(({ etiquette: valeur }) => valeur));
  const largeurCase = image.largeur / COLONNES;
  const hauteurCase = image.hauteur / LIGNES;
  for (const composante of composantes) {
    if (etiquettesPrincipales.has(composante.etiquette) || composante.pixels < 2) continue;
    let meilleur = 0;
    let distance = Number.POSITIVE_INFINITY;
    groupes.forEach((groupe, index) => {
      const candidate = distanceNormalisee(composante.centre, groupe.principale.centre, largeurCase, hauteurCase);
      if (candidate < distance) {
        distance = candidate;
        meilleur = index;
      }
    });
    // Un petit élément isolé très loin des huit poses est plus probablement du bruit de fond.
    if (distance <= 0.72) groupes[meilleur].etiquettes.push(composante.etiquette);
  }

  const groupeParEtiquette = new Int16Array(composantes.length + 1);
  groupeParEtiquette.fill(-1);
  groupes.forEach((groupe, index) => groupe.etiquettes.forEach((valeur) => { groupeParEtiquette[valeur] = index; }));
  return groupes.map((groupe, index) => {
    const membres = composantes.filter(({ etiquette: valeur }) => groupeParEtiquette[valeur] === index);
    const minX = Math.min(...membres.map(({ cadre }) => cadre.x));
    const minY = Math.min(...membres.map(({ cadre }) => cadre.y));
    const maxX = Math.max(...membres.map(({ cadre }) => cadre.x + cadre.largeur - 1));
    const maxY = Math.max(...membres.map(({ cadre }) => cadre.y + cadre.hauteur - 1));
    const largeur = maxX - minX + 1;
    const hauteur = maxY - minY + 1;
    const pixels = new Uint8Array(largeur * hauteur * 4);
    let pixelsVisibles = 0;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const sourcePixel = y * image.largeur + x;
        const etiquettePixel = etiquettes[sourcePixel];
        if (etiquettePixel === 0 || groupeParEtiquette[etiquettePixel] !== index) continue;
        const source = sourcePixel * 4;
        const destination = ((y - minY) * largeur + x - minX) * 4;
        pixels.set(image.pixels.subarray(source, source + 4), destination);
        pixelsVisibles += 1;
      }
    }
    const toucheBordSource = minX === 0 || minY === 0 || maxX === image.largeur - 1 || maxY === image.hauteur - 1;
    return {
      index,
      origine: { x: minX, y: minY, largeur, hauteur },
      image: { largeur, hauteur, pixels, cadre: { x: 0, y: 0, largeur, hauteur }, pixelsVisibles },
      toucheBordSource,
      composantesRattachees: membres.length
    };
  });
}

function pixelPremultiplie(cellule, x, y) {
  const borneX = Math.max(0, Math.min(cellule.largeur - 1, x));
  const borneY = Math.max(0, Math.min(cellule.hauteur - 1, y));
  const index = (borneY * cellule.largeur + borneX) * 4;
  const alpha = cellule.pixels[index + 3] / 255;
  return [
    cellule.pixels[index] * alpha,
    cellule.pixels[index + 1] * alpha,
    cellule.pixels[index + 2] * alpha,
    cellule.pixels[index + 3]
  ];
}

function echantillonnerBilineaire(cellule, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const dx = x - x0;
  const dy = y - y0;
  const p00 = pixelPremultiplie(cellule, x0, y0);
  const p10 = pixelPremultiplie(cellule, x0 + 1, y0);
  const p01 = pixelPremultiplie(cellule, x0, y0 + 1);
  const p11 = pixelPremultiplie(cellule, x0 + 1, y0 + 1);
  const canaux = [0, 0, 0, 0];
  for (let canal = 0; canal < 4; canal += 1) {
    const haut = p00[canal] * (1 - dx) + p10[canal] * dx;
    const bas = p01[canal] * (1 - dx) + p11[canal] * dx;
    canaux[canal] = haut * (1 - dy) + bas * dy;
  }
  const alpha = canaux[3];
  if (alpha <= 0.5) return [0, 0, 0, 0];
  return [
    Math.round(Math.max(0, Math.min(255, canaux[0] / (alpha / 255)))),
    Math.round(Math.max(0, Math.min(255, canaux[1] / (alpha / 255)))),
    Math.round(Math.max(0, Math.min(255, canaux[2] / (alpha / 255)))),
    Math.round(Math.max(0, Math.min(255, alpha)))
  ];
}

function redimensionnerEtPlacer(cellule, cadre, largeurCible, hauteurCible, echelle, marge, ancre) {
  const pixels = new Uint8Array(largeurCible * hauteurCible * 4);
  const largeur = Math.max(1, Math.round(cadre.largeur * echelle));
  const hauteur = Math.max(1, Math.round(cadre.hauteur * echelle));
  const destinationX = Math.round((largeurCible - largeur) / 2);
  const destinationY = ancre === 'bas-centre'
    ? hauteurCible - marge - hauteur
    : Math.round((hauteurCible - hauteur) / 2);
  let debordements = 0;
  let pixelsVisibles = 0;
  for (let y = 0; y < hauteur; y += 1) {
    for (let x = 0; x < largeur; x += 1) {
      const sourceX = cadre.x + (x + 0.5) / echelle - 0.5;
      const sourceY = cadre.y + (y + 0.5) / echelle - 0.5;
      const pixel = echantillonnerBilineaire(cellule, sourceX, sourceY);
      if (pixel[3] < 2) continue;
      const finalX = destinationX + x;
      const finalY = destinationY + y;
      if (finalX < 0 || finalX >= largeurCible || finalY < 0 || finalY >= hauteurCible) {
        debordements += 1;
        continue;
      }
      const destination = (finalY * largeurCible + finalX) * 4;
      pixels.set(pixel, destination);
      pixelsVisibles += 1;
    }
  }
  return {
    largeur: largeurCible,
    hauteur: hauteurCible,
    pixels,
    cadre: { x: destinationX, y: destinationY, largeur, hauteur },
    ancreCible: {
      x: largeurCible / 2,
      y: ancre === 'bas-centre' ? hauteurCible - marge : hauteurCible / 2
    },
    ancreRaster: {
      x: destinationX + largeur / 2,
      y: ancre === 'bas-centre' ? destinationY + hauteur : destinationY + hauteur / 2
    },
    debordements,
    pixelsVisibles
  };
}

function copier(dest, largeurDest, src, x0, y0) {
  for (let y = 0; y < src.hauteur; y += 1) {
    for (let x = 0; x < src.largeur; x += 1) {
      const source = (y * src.largeur + x) * 4;
      if (src.pixels[source + 3] === 0) continue;
      const destination = ((y0 + y) * largeurDest + x0 + x) * 4;
      dest.set(src.pixels.subarray(source, source + 4), destination);
    }
  }
}

function creerPlancheContact(atlas, largeurCellule, hauteurCellule) {
  const gouttiere = 12;
  const largeur = COLONNES * largeurCellule + (COLONNES + 1) * gouttiere;
  const hauteur = LIGNES * hauteurCellule + (LIGNES + 1) * gouttiere;
  const pixels = new Uint8Array(largeur * hauteur * 4);
  for (let y = 0; y < hauteur; y += 1) {
    for (let x = 0; x < largeur; x += 1) {
      const clair = (Math.floor(x / 12) + Math.floor(y / 12)) % 2 === 0;
      const index = (y * largeur + x) * 4;
      pixels.set(clair ? [236, 239, 242, 255] : [207, 213, 219, 255], index);
    }
  }
  for (let ligne = 0; ligne < LIGNES; ligne += 1) {
    for (let colonne = 0; colonne < COLONNES; colonne += 1) {
      const cellule = { largeur: largeurCellule, hauteur: hauteurCellule, pixels: new Uint8Array(largeurCellule * hauteurCellule * 4) };
      for (let y = 0; y < hauteurCellule; y += 1) {
        const source = ((ligne * hauteurCellule + y) * atlas.largeur + colonne * largeurCellule) * 4;
        cellule.pixels.set(atlas.pixels.subarray(source, source + largeurCellule * 4), y * largeurCellule * 4);
      }
      copier(pixels, largeur, cellule, gouttiere + colonne * (largeurCellule + gouttiere), gouttiere + ligne * (hauteurCellule + gouttiere));
    }
  }
  return { largeur, hauteur, pixels };
}

function ecartType(valeurs) {
  const moyenne = valeurs.reduce((somme, valeur) => somme + valeur, 0) / valeurs.length;
  const variance = valeurs.reduce((somme, valeur) => somme + (valeur - moyenne) ** 2, 0) / valeurs.length;
  return Math.sqrt(variance);
}

export async function normaliserPlanche(options) {
  const {
    entree,
    sortie,
    contact,
    rapport,
    largeurCellule = 256,
    hauteurCellule = 256,
    marge = 12,
    ancre = 'centre',
    seuilFond = 32,
    plume = 32,
    fond: fondForce
  } = options;
  if (!['centre', 'bas-centre'].includes(ancre)) throw new Error(`Ancre inconnue : ${ancre}.`);
  if (marge < 1 || marge * 2 >= Math.min(largeurCellule, hauteurCellule)) throw new Error('Marge incompatible avec la taille de cellule.');

  const source = decoderPng(await readFile(entree));
  const fond = fondForce ? lireCouleurHex(fondForce) : couleurDeFond(source);
  const sourceSansFond = extraireCellule(source, 0, 0, source.largeur, source.hauteur, fond, seuilFond, plume);
  let cellules;
  try {
    cellules = regrouperHuitPoses(sourceSansFond);
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    const resultat = {
      version: 1,
      ok: false,
      erreurs: [message],
      avertissements: [],
      source: { chemin: resolve(entree), largeur: source.largeur, hauteur: source.hauteur, fond: couleurHex(fond) },
      configuration: { colonnes: COLONNES, lignes: LIGNES, largeurCellule, hauteurCellule, marge, ancre, seuilFond, plume },
      cellules: []
    };
    await mkdir(dirname(rapport), { recursive: true });
    await writeFile(rapport, `${JSON.stringify(resultat, null, 2)}\n`, 'utf8');
    return resultat;
  }

  const vides = cellules.filter(({ image }) => image.cadre === null).map(({ index }) => index);
  if (vides.length > 0) {
    const resultat = {
      version: 1,
      ok: false,
      erreurs: [`Cellules vides : ${vides.join(', ')}.`],
      avertissements: [],
      source: { chemin: resolve(entree), largeur: source.largeur, hauteur: source.hauteur, fond: couleurHex(fond) },
      configuration: { colonnes: COLONNES, lignes: LIGNES, largeurCellule, hauteurCellule, marge, ancre, seuilFond, plume },
      cellules: cellules.map(({ index, origine, image }) => ({ index, origine, nonVide: image.cadre !== null, cadreSource: image.cadre }))
    };
    await mkdir(dirname(rapport), { recursive: true });
    await writeFile(rapport, `${JSON.stringify(resultat, null, 2)}\n`, 'utf8');
    return resultat;
  }

  const largeurMax = Math.max(...cellules.map(({ image }) => image.cadre.largeur));
  const hauteurMax = Math.max(...cellules.map(({ image }) => image.cadre.hauteur));
  const echelle = Math.min((largeurCellule - 2 * marge) / largeurMax, (hauteurCellule - 2 * marge) / hauteurMax);
  const normalisees = cellules.map(({ image }) => redimensionnerEtPlacer(image, image.cadre, largeurCellule, hauteurCellule, echelle, marge, ancre));
  const atlas = { largeur: COLONNES * largeurCellule, hauteur: LIGNES * hauteurCellule, pixels: new Uint8Array(COLONNES * largeurCellule * LIGNES * hauteurCellule * 4) };
  normalisees.forEach((cellule, index) => {
    copier(atlas.pixels, atlas.largeur, cellule, (index % COLONNES) * largeurCellule, Math.floor(index / COLONNES) * hauteurCellule);
  });

  const debordements = normalisees.reduce((somme, cellule) => somme + cellule.debordements, 0);
  const rapportsCellules = cellules.map(({ index, origine, image, toucheBordSource, composantesRattachees }, position) => ({
    index,
    origine,
    nonVide: true,
    pixelsVisiblesSource: image.pixelsVisibles,
    cadreSource: image.cadre,
    composantesRattachees,
    toucheBordSource,
    echelleCommune: Number(echelle.toFixed(6)),
    cadreFinal: normalisees[position].cadre,
    ancreCible: normalisees[position].ancreCible,
    ancreRaster: normalisees[position].ancreRaster,
    ecartAncreRaster: {
      x: Number((normalisees[position].ancreRaster.x - normalisees[position].ancreCible.x).toFixed(3)),
      y: Number((normalisees[position].ancreRaster.y - normalisees[position].ancreCible.y).toFixed(3))
    },
    pixelsVisiblesFinaux: normalisees[position].pixelsVisibles,
    debordements: normalisees[position].debordements
  }));
  const largeursSource = cellules.map(({ image }) => image.cadre.largeur);
  const hauteursSource = cellules.map(({ image }) => image.cadre.hauteur);
  const ratioLargeur = Math.max(...largeursSource) / Math.min(...largeursSource);
  const ratioHauteur = Math.max(...hauteursSource) / Math.min(...hauteursSource);
  const avertissements = [];
  if (ratioLargeur > 1.35 && ratioHauteur > 1.35) {
    avertissements.push('La taille apparente varie de plus de 35 % sur les deux axes entre les images sources ; la planche finale conserve ces variations avec une échelle commune.');
  }
  const cellulesCoupees = cellules.filter(({ toucheBordSource }) => toucheBordSource).map(({ index }) => index);
  if (cellulesCoupees.length > 0) {
    avertissements.push(`Des poses touchent le bord de l'image source (${cellulesCoupees.join(', ')}) ; une inspection visuelle est requise.`);
  }
  const resultat = {
    version: 1,
    ok: debordements === 0,
    erreurs: debordements === 0 ? [] : [`${debordements} pixels débordent de leur cellule finale.`],
    avertissements,
    source: { chemin: resolve(entree), largeur: source.largeur, hauteur: source.hauteur, fond: couleurHex(fond) },
    sortie: { chemin: resolve(sortie), largeur: atlas.largeur, hauteur: atlas.hauteur, contact: resolve(contact) },
    configuration: { colonnes: COLONNES, lignes: LIGNES, largeurCellule, hauteurCellule, marge, ancre, seuilFond, plume },
    stabilite: {
      echelleCommune: Number(echelle.toFixed(6)),
      ratioLargeurSource: Number(ratioLargeur.toFixed(4)),
      ratioHauteurSource: Number(ratioHauteur.toFixed(4)),
      ecartTypeAncreCibleX: Number(ecartType(normalisees.map(({ ancreCible: point }) => point.x)).toFixed(6)),
      ecartTypeAncreCibleY: Number(ecartType(normalisees.map(({ ancreCible: point }) => point.y)).toFixed(6)),
      ecartTypeAncreRasterX: Number(ecartType(normalisees.map(({ ancreRaster: point }) => point.x)).toFixed(6)),
      ecartTypeAncreRasterY: Number(ecartType(normalisees.map(({ ancreRaster: point }) => point.y)).toFixed(6)),
      ecartRasterMaximal: Number(Math.max(...normalisees.flatMap(({ ancreCible, ancreRaster }) => [
        Math.abs(ancreRaster.x - ancreCible.x),
        Math.abs(ancreRaster.y - ancreCible.y)
      ])).toFixed(3))
    },
    cellules: rapportsCellules
  };

  await Promise.all([sortie, contact, rapport].map((chemin) => mkdir(dirname(chemin), { recursive: true })));
  await Promise.all([
    writeFile(sortie, encoderPng(atlas)),
    writeFile(contact, encoderPng(creerPlancheContact(atlas, largeurCellule, hauteurCellule))),
    writeFile(rapport, `${JSON.stringify(resultat, null, 2)}\n`, 'utf8')
  ]);
  return resultat;
}

function argumentsCli(argv) {
  const valeurs = {};
  for (let index = 0; index < argv.length; index += 2) {
    const cle = argv[index];
    const valeur = argv[index + 1];
    if (!cle?.startsWith('--') || valeur === undefined) throw new Error(`Argument incomplet : ${cle ?? ''}.`);
    valeurs[cle.slice(2)] = valeur;
  }
  for (const requis of ['entree', 'sortie', 'contact', 'rapport']) {
    if (!valeurs[requis]) throw new Error(`Argument requis manquant : --${requis}.`);
  }
  return {
    ...valeurs,
    largeurCellule: valeurs['largeur-cellule'] ? Number(valeurs['largeur-cellule']) : undefined,
    hauteurCellule: valeurs['hauteur-cellule'] ? Number(valeurs['hauteur-cellule']) : undefined,
    marge: valeurs.marge ? Number(valeurs.marge) : undefined,
    seuilFond: valeurs['seuil-fond'] ? Number(valeurs['seuil-fond']) : undefined,
    plume: valeurs.plume ? Number(valeurs.plume) : undefined
  };
}

const executeDirectement = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executeDirectement) {
  try {
    const resultat = await normaliserPlanche(argumentsCli(process.argv.slice(2)));
    console.log(resultat.ok ? 'Planche normalisée : 8 cellules valides.' : `Planche refusée : ${resultat.erreurs.join(' ')}`);
    process.exitCode = resultat.ok ? 0 : 1;
  } catch (erreur) {
    console.error(erreur instanceof Error ? erreur.message : erreur);
    process.exitCode = 1;
  }
}
