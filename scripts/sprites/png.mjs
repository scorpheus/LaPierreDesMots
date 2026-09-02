import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE_PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const tableCrc = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let valeur = n;
    for (let bit = 0; bit < 8; bit += 1) {
      valeur = (valeur & 1) === 1 ? 0xedb88320 ^ (valeur >>> 1) : valeur >>> 1;
    }
    table[n] = valeur >>> 0;
  }
  return table;
})();

function crc32(tampon) {
  let crc = 0xffffffff;
  for (const octet of tampon) {
    crc = tableCrc[(crc ^ octet) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function paquet(type, donnees) {
  const nom = Buffer.from(type, 'ascii');
  const resultat = Buffer.allocUnsafe(12 + donnees.length);
  resultat.writeUInt32BE(donnees.length, 0);
  nom.copy(resultat, 4);
  donnees.copy(resultat, 8);
  resultat.writeUInt32BE(crc32(Buffer.concat([nom, donnees])), 8 + donnees.length);
  return resultat;
}

function paeth(a, b, c) {
  const prediction = a + b - c;
  const da = Math.abs(prediction - a);
  const db = Math.abs(prediction - b);
  const dc = Math.abs(prediction - c);
  if (da <= db && da <= dc) return a;
  return db <= dc ? b : c;
}

/** Décode les PNG 8 bits non entrelacés RGB, RGBA ou niveaux de gris. */
export function decoderPng(tampon) {
  if (!tampon.subarray(0, 8).equals(SIGNATURE_PNG)) {
    throw new Error('Le fichier n\'est pas un PNG valide.');
  }

  let largeur;
  let hauteur;
  let profondeur;
  let typeCouleur;
  let entrelacement;
  const blocsImage = [];
  let position = 8;
  while (position < tampon.length) {
    const longueur = tampon.readUInt32BE(position);
    const type = tampon.toString('ascii', position + 4, position + 8);
    const donnees = tampon.subarray(position + 8, position + 8 + longueur);
    if (type === 'IHDR') {
      largeur = donnees.readUInt32BE(0);
      hauteur = donnees.readUInt32BE(4);
      profondeur = donnees[8];
      typeCouleur = donnees[9];
      entrelacement = donnees[12];
    } else if (type === 'IDAT') {
      blocsImage.push(donnees);
    } else if (type === 'IEND') {
      break;
    }
    position += longueur + 12;
  }

  if (!largeur || !hauteur || profondeur !== 8 || entrelacement !== 0) {
    throw new Error('PNG non pris en charge : il faut une image 8 bits non entrelacée.');
  }
  const canaux = typeCouleur === 6 ? 4 : typeCouleur === 2 ? 3 : typeCouleur === 0 ? 1 : 0;
  if (canaux === 0) {
    throw new Error(`PNG non pris en charge : type de couleur ${typeCouleur}.`);
  }

  const brut = inflateSync(Buffer.concat(blocsImage));
  const pas = largeur * canaux;
  const attendu = hauteur * (pas + 1);
  if (brut.length !== attendu) {
    throw new Error(`PNG tronqué : ${brut.length} octets décompressés, ${attendu} attendus.`);
  }

  const lignes = Buffer.allocUnsafe(hauteur * pas);
  let lecture = 0;
  for (let y = 0; y < hauteur; y += 1) {
    const filtre = brut[lecture];
    lecture += 1;
    const debut = y * pas;
    const precedent = debut - pas;
    for (let x = 0; x < pas; x += 1) {
      const valeur = brut[lecture + x];
      const gauche = x >= canaux ? lignes[debut + x - canaux] : 0;
      const haut = y > 0 ? lignes[precedent + x] : 0;
      const hautGauche = y > 0 && x >= canaux ? lignes[precedent + x - canaux] : 0;
      if (filtre === 0) lignes[debut + x] = valeur;
      else if (filtre === 1) lignes[debut + x] = (valeur + gauche) & 0xff;
      else if (filtre === 2) lignes[debut + x] = (valeur + haut) & 0xff;
      else if (filtre === 3) lignes[debut + x] = (valeur + Math.floor((gauche + haut) / 2)) & 0xff;
      else if (filtre === 4) lignes[debut + x] = (valeur + paeth(gauche, haut, hautGauche)) & 0xff;
      else throw new Error(`Filtre PNG inconnu : ${filtre}.`);
    }
    lecture += pas;
  }

  const pixels = new Uint8Array(largeur * hauteur * 4);
  for (let index = 0, destination = 0; index < lignes.length; index += canaux, destination += 4) {
    if (canaux === 1) {
      pixels[destination] = lignes[index];
      pixels[destination + 1] = lignes[index];
      pixels[destination + 2] = lignes[index];
      pixels[destination + 3] = 255;
    } else {
      pixels[destination] = lignes[index];
      pixels[destination + 1] = lignes[index + 1];
      pixels[destination + 2] = lignes[index + 2];
      pixels[destination + 3] = canaux === 4 ? lignes[index + 3] : 255;
    }
  }
  return { largeur, hauteur, pixels };
}

/** Encode une image RGBA en PNG 8 bits non entrelacé. */
export function encoderPng({ largeur, hauteur, pixels }) {
  if (pixels.length !== largeur * hauteur * 4) {
    throw new Error('Le tampon RGBA ne correspond pas aux dimensions annoncées.');
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const brut = Buffer.allocUnsafe(hauteur * (largeur * 4 + 1));
  for (let y = 0; y < hauteur; y += 1) {
    const destination = y * (largeur * 4 + 1);
    brut[destination] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * largeur * 4, largeur * 4).copy(brut, destination + 1);
  }
  return Buffer.concat([
    SIGNATURE_PNG,
    paquet('IHDR', ihdr),
    paquet('IDAT', deflateSync(brut, { level: 9 })),
    paquet('IEND', Buffer.alloc(0))
  ]);
}
