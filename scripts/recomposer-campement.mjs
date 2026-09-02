/**
 * Publie l’illustration V6 validée et vérifie que ses zones tactiles utilisent sa géométrie.
 *
 * Le nom historique de la commande est conservé pour les habitudes du dépôt. Elle ne redessine
 * plus le campement : le SVG était un blockout. L’asset approuvé et le document déclaratif sont
 * contrôlés directement, sans dépendance envers un brouillon ignoré ni réécriture implicite.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const CIBLE = join(RACINE, 'contenu', 'assets', 'campement', 'campement-v6.png');
const DOCUMENT = join(RACINE, 'contenu', 'monde', 'campement.json');

function dimensionsPng(chemin) {
  const image = readFileSync(chemin);
  if (image.subarray(1, 4).toString('ascii') !== 'PNG') {
    throw new Error(`Le décor n’est pas un PNG : ${chemin}`);
  }
  return [image.readUInt32BE(16), image.readUInt32BE(20)];
}

const document = JSON.parse(readFileSync(DOCUMENT, 'utf8'));
const [largeur, hauteur] = dimensionsPng(CIBLE);
if (document.scene?.fichier !== 'assets/campement/campement-v6.png') {
  throw new Error('campement.json ne désigne pas l’illustration V6 publiée.');
}
if (document.scene?.viewBox !== `0 0 ${String(largeur)} ${String(hauteur)}`) {
  throw new Error('Le viewBox du campement ne correspond pas aux dimensions du PNG.');
}
if (!Array.isArray(document.points) || document.points.length < 25) {
  throw new Error('Le campement a perdu son minimum de 25 interactions.');
}
for (const point of document.points) {
  const [x, y, w, h] = point.zone ?? [];
  if (![x, y, w, h].every(Number.isFinite) || x < 0 || y < 0 || x + w > largeur || y + h > hauteur) {
    throw new Error(`Zone hors de l’illustration : ${String(point.id)}.`);
  }
}

console.log(`Campement V6 publié : ${String(largeur)} × ${String(hauteur)}, ${String(document.points.length)} zones vérifiées.`);
