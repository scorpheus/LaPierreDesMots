/**
 * La V6 validée est désormais le décor lui-même, pas une consigne donnée à un SVG de blockout.
 * Ces gardes échouent si l’application revient au dessin provisoire ou si les zones tactiles
 * cessent de correspondre aux dimensions natives de l’illustration.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { campementDuDocument } from '@partage/monde/campement.js';
import { lireJson } from '../configuration/preparation.js';
// @ts-expect-error — décodeur JavaScript autonome partagé avec les pipelines d’assets.
import { decoderPng } from '../../scripts/sprites/png.mjs';

const DOCUMENT = campementDuDocument(lireJson('contenu/monde/campement.json'));
const IMAGE = readFileSync('contenu/assets/campement/campement-v6.png');
const FEU = readFileSync('contenu/assets/campement/animations/feu.png');
const PAPILLON = readFileSync('contenu/assets/campement/animations/papillon.png');
const STYLES = readFileSync('client/src/styles/global.css', 'utf8');

function dimensionsPng(image: Buffer): readonly [number, number] {
  expect(image.subarray(1, 4).toString('ascii')).toBe('PNG');
  return [image.readUInt32BE(16), image.readUInt32BE(20)];
}

function mesurerCellules(image: Buffer) {
  const { largeur, hauteur, pixels } = decoderPng(image);
  const largeurCellule = largeur / 4;
  const hauteurCellule = hauteur / 2;
  return Array.from({ length: 8 }, (_, index) => {
    const colonne = index % 4;
    const ligne = Math.floor(index / 4);
    let opaques = 0;
    let transparents = 0;
    let minX = largeurCellule;
    let minY = hauteurCellule;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < hauteurCellule; y += 1) {
      for (let x = 0; x < largeurCellule; x += 1) {
        const alpha = pixels[
          (((ligne * hauteurCellule + y) * largeur + colonne * largeurCellule + x) * 4) + 3
        ];
        if (alpha > 8) {
          opaques += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        } else {
          transparents += 1;
        }
      }
    }
    return { opaques, transparents, minX, minY, maxX, maxY };
  });
}

describe('campement V6 — le fond et ses objets animés sont réellement séparés', () => {
  it('sert le PNG validé à sa résolution native', () => {
    expect(DOCUMENT.scene.fichier).toBe('assets/campement/campement-v6.png');
    expect(DOCUMENT.scene.viewBox).toBe('0 0 1586 992');
    expect(dimensionsPng(IMAGE)).toEqual([1586, 992]);
    expect(IMAGE.byteLength).toBeGreaterThan(100_000);
  });

  it('livre deux planches normalisées de huit poses, sans les étirer', () => {
    expect(dimensionsPng(FEU)).toEqual([1024, 512]);
    expect(dimensionsPng(PAPILLON)).toEqual([1024, 512]);

    for (const [nom, image] of [['feu', FEU], ['papillon', PAPILLON]] as const) {
      const cellules = mesurerCellules(image);
      expect(cellules, `${nom} doit contenir huit cellules`).toHaveLength(8);
      for (const [index, cellule] of cellules.entries()) {
        expect(cellule.opaques, `${nom} pose ${String(index + 1)} vide`).toBeGreaterThan(1_000);
        expect(cellule.transparents, `${nom} pose ${String(index + 1)} sans alpha`).toBeGreaterThan(1_000);
        expect(cellule.minX, `${nom} pose ${String(index + 1)} touche le bord gauche`).toBeGreaterThan(0);
        expect(cellule.minY, `${nom} pose ${String(index + 1)} touche le bord haut`).toBeGreaterThan(0);
        expect(cellule.maxX, `${nom} pose ${String(index + 1)} touche le bord droit`).toBeLessThan(255);
        expect(cellule.maxY, `${nom} pose ${String(index + 1)} touche le bord bas`).toBeLessThan(255);
      }
    }

    const basesDuFeu = mesurerCellules(FEU).map(({ maxY }) => maxY);
    expect(new Set(basesDuFeu).size, 'le feu sauterait verticalement entre deux poses').toBe(1);
  });

  it('intègre les objets sans transparence artificielle ni raccord de boucle brutal', () => {
    const regleFeu = STYLES.match(/\.campement-sprite--feu\s*\{(?<corps>[^}]*)\}/)?.groups?.corps;
    const reglePapillon = STYLES.match(/\.campement-sprite--papillon\s*\{(?<corps>[^}]*)\}/)?.groups?.corps;
    expect(regleFeu).toBeDefined();
    expect(reglePapillon).toBeDefined();
    for (const regle of [regleFeu, reglePapillon]) {
      expect(regle).not.toContain('opacity:');
      expect(regle).not.toContain('mix-blend-mode:');
      expect(regle).toContain('infinite alternate');
    }
  });

  it('conserve trente prises, toutes contenues dans l’image', () => {
    expect(DOCUMENT.points).toHaveLength(30);
    for (const point of DOCUMENT.points) {
      const [x, y, largeur, hauteur] = point.zone;
      expect(x, point.id).toBeGreaterThanOrEqual(0);
      expect(y, point.id).toBeGreaterThanOrEqual(0);
      expect(x + largeur, point.id).toBeLessThanOrEqual(1586);
      expect(y + hauteur, point.id).toBeLessThanOrEqual(992);
    }
  });

  it('compose un lieu irrégulier et hiérarchisé, pas une grille de boutons', () => {
    const xs = new Set(DOCUMENT.points.map((point) => point.zone[0]));
    const ys = new Set(DOCUMENT.points.map((point) => point.zone[1]));
    const tailles = new Set(DOCUMENT.points.map((point) => `${point.zone[2]}x${point.zone[3]}`));
    const tente = DOCUMENT.points.find((point) => point.id === 'tente')!;
    const escargot = DOCUMENT.points.find((point) => point.id === 'escargot')!;

    expect(xs.size).toBeGreaterThanOrEqual(20);
    expect(ys.size).toBeGreaterThanOrEqual(18);
    expect(tailles.size).toBeGreaterThanOrEqual(12);
    expect(tente.zone[2] * tente.zone[3]).toBeGreaterThan(escargot.zone[2] * escargot.zone[3] * 8);
  });

  it('laisse le centre de chaque prise accessible au doigt', () => {
    const interceptions: string[] = [];
    for (const [index, point] of DOCUMENT.points.entries()) {
      const [x, y, largeur, hauteur] = point.zone;
      const centreX = x + largeur / 2;
      const centreY = y + hauteur / 2;
      for (const autre of DOCUMENT.points.slice(index + 1)) {
        const [autreX, autreY, autreLargeur, autreHauteur] = autre.zone;
        if (
          centreX >= autreX && centreX <= autreX + autreLargeur &&
          centreY >= autreY && centreY <= autreY + autreHauteur
        ) {
          interceptions.push(`${point.id} → ${autre.id}`);
        }
      }
    }
    expect(interceptions, 'une prise rend le centre d’une autre impossible à toucher').toEqual([]);
  });
});
