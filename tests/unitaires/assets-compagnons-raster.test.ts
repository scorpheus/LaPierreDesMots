import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { decoderPng } from '../../scripts/sprites/png.mjs';

const COMPAGNONS = ['filou', 'bulle', 'roc', 'plume'] as const;
const EMPREINTES = {
  filou: 'D3024E046D3CCEF452A80F45C0DB7762A01E7D41C4BB2C408AD8F6193FC7F731',
  bulle: '4C3F051496FE1C9C40660FF36D9C33B1B61C7305725C72093A37276BE0F538EA',
  roc: '40D7BD92460C9F7F26354DD0755F7FA1B5F5BF372B1FB30E009044C364FDA601',
  plume: '86C63A2BE826A961D0B8B09A75723C2B45B09997E2FEED34BE09F22BCA289A58'
} as const;

describe('les portraits raster validés des compagnons', () => {
  it.each(COMPAGNONS)('%s est un PNG détouré, entier et non vide', (code) => {
    const chemin = join(process.cwd(), 'contenu', 'assets', 'compagnons', `${code}.png`);
    const image = decoderPng(readFileSync(chemin));
    const alphas = Array.from(
      { length: image.largeur * image.hauteur },
      (_, index) => image.pixels[index * 4 + 3] ?? 0
    );

    expect([image.largeur, image.hauteur]).toEqual([1086, 1448]);
    const minimum = alphas.reduce((courant, alpha) => Math.min(courant, alpha), 255);
    const maximum = alphas.reduce((courant, alpha) => Math.max(courant, alpha), 0);
    expect(minimum, 'le fond blanc est encore opaque').toBe(0);
    expect(maximum, 'le personnage a disparu pendant le détourage').toBe(255);
    expect(alphas.filter((alpha) => alpha > 0).length).toBeGreaterThan(alphas.length * 0.08);
    expect(createHash('sha256').update(image.pixels).digest('hex').toUpperCase()).toBe(
      EMPREINTES[code]
    );
  });
});
