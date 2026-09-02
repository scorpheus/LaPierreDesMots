import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Modules Node sans déclaration TypeScript : le test exerce leur API de production réelle.
// @ts-expect-error module JavaScript volontairement autonome
import { encoderPng, decoderPng } from '../../scripts/sprites/png.mjs';
// @ts-expect-error module JavaScript volontairement autonome
import { normaliserPlanche } from '../../scripts/sprites/normaliser-planche.mjs';

const dossier = resolve('bac-a-sable', `test-pipeline-sprites-${process.pid}`);

function fixturePlanche(celluleVide = -1) {
  const largeur = 803;
  const hauteur = 405;
  const pixels = new Uint8Array(largeur * hauteur * 4);
  for (let index = 0; index < largeur * hauteur; index += 1) {
    pixels.set([255, 0, 255, 255], index * 4);
  }
  for (let cellule = 0; cellule < 8; cellule += 1) {
    if (cellule === celluleVide) continue;
    const colonne = cellule % 4;
    const ligne = Math.floor(cellule / 4);
    const x0 = Math.round((colonne * largeur) / 4);
    const x1 = Math.round(((colonne + 1) * largeur) / 4);
    const y0 = Math.round((ligne * hauteur) / 2);
    const y1 = Math.round(((ligne + 1) * hauteur) / 2);
    const largeurForme = cellule === 0 ? 112 : 52 + (cellule % 3) * 5;
    const hauteurForme = 70 + (cellule % 2) * 8;
    const gauche = Math.floor((x0 + x1 - largeurForme) / 2) + (cellule % 2 === 0 ? -5 : 6);
    const haut = Math.floor((y0 + y1 - hauteurForme) / 2) + (cellule % 3) - 1;
    for (let y = haut; y < haut + hauteurForme; y += 1) {
      for (let x = gauche; x < gauche + largeurForme; x += 1) {
        const index = (y * largeur + x) * 4;
        const bord = x === gauche || y === haut || x === gauche + largeurForme - 1 || y === haut + hauteurForme - 1;
        pixels.set(bord ? [255, 90, 220, 255] : [30 + cellule * 12, 120, 240, 255], index);
      }
    }
  }
  return { largeur, hauteur, pixels };
}

beforeAll(async () => {
  await mkdir(dossier, { recursive: true });
});

afterAll(async () => {
  const cible = resolve(dossier);
  const racineAutorisee = `${resolve('bac-a-sable')}\\`;
  if (!cible.startsWith(racineAutorisee)) throw new Error(`Refus de supprimer hors du bac à sable : ${cible}`);
  await rm(cible, { recursive: true, force: true });
});

describe('pipeline déterministe des sprites de décor', () => {
  it('récupère huit cases irrégulières, retire le fond et impose une ancre commune', async () => {
    const entree = join(dossier, 'source.png');
    const sortie = join(dossier, 'finale.png');
    const contact = join(dossier, 'contact.png');
    const rapport = join(dossier, 'rapport.json');
    await writeFile(entree, encoderPng(fixturePlanche()));

    const resultat = await normaliserPlanche({
      entree,
      sortie,
      contact,
      rapport,
      largeurCellule: 96,
      hauteurCellule: 104,
      marge: 8,
      ancre: 'bas-centre',
      seuilFond: 24,
      plume: 30
    });

    expect(resultat.ok).toBe(true);
    expect(resultat.cellules).toHaveLength(8);
    expect(resultat.cellules.every((cellule: { nonVide: boolean }) => cellule.nonVide)).toBe(true);
    expect(resultat.cellules.every((cellule: { debordements: number }) => cellule.debordements === 0)).toBe(true);
    expect(resultat.cellules.every((cellule: { composantesRattachees: number }) => cellule.composantesRattachees >= 1)).toBe(true);
    expect(resultat.stabilite.ecartTypeAncreCibleX).toBe(0);
    expect(resultat.stabilite.ecartTypeAncreCibleY).toBe(0);
    expect(resultat.stabilite.ecartRasterMaximal).toBeLessThanOrEqual(0.5);

    const image = decoderPng(await readFile(sortie));
    expect([image.largeur, image.hauteur]).toEqual([384, 208]);
    expect(image.pixels[3]).toBe(0);
    const plancheContact = decoderPng(await readFile(contact));
    expect(plancheContact.largeur).toBeGreaterThan(image.largeur);
    expect(JSON.parse(await readFile(rapport, 'utf8')).ok).toBe(true);
  });

  it('refuse explicitement une planche dont une des huit cellules est vide', async () => {
    const entree = join(dossier, 'source-incomplete.png');
    const rapport = join(dossier, 'rapport-incomplet.json');
    await writeFile(entree, encoderPng(fixturePlanche(6)));
    const resultat = await normaliserPlanche({
      entree,
      sortie: join(dossier, 'ne-doit-pas-exister.png'),
      contact: join(dossier, 'contact-incomplet.png'),
      rapport,
      largeurCellule: 64,
      hauteurCellule: 64
    });
    expect(resultat.ok).toBe(false);
    expect(resultat.erreurs[0]).toContain('7 composantes');
    expect(resultat.cellules).toHaveLength(0);
  });
});
