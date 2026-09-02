/**
 * La V5 validée est désormais le décor lui-même, pas une consigne donnée à un SVG de blockout.
 * Ces gardes échouent si l’application revient au dessin provisoire ou si les zones tactiles
 * cessent de correspondre aux dimensions natives de l’illustration.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { campementDuDocument } from '@partage/monde/campement.js';
import { lireJson } from '../configuration/preparation.js';

const DOCUMENT = campementDuDocument(lireJson('contenu/monde/campement.json'));
const IMAGE = readFileSync('contenu/assets/campement/campement-v5.png');

function dimensionsPng(image: Buffer): readonly [number, number] {
  expect(image.subarray(1, 4).toString('ascii')).toBe('PNG');
  return [image.readUInt32BE(16), image.readUInt32BE(20)];
}

describe('campement V5 — l’illustration validée est la scène', () => {
  it('sert le PNG validé à sa résolution native', () => {
    expect(DOCUMENT.scene.fichier).toBe('assets/campement/campement-v5.png');
    expect(DOCUMENT.scene.viewBox).toBe('0 0 1586 992');
    expect(dimensionsPng(IMAGE)).toEqual([1586, 992]);
    expect(IMAGE.byteLength).toBeGreaterThan(2_000_000);
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
