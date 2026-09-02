import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { decoderPng } from '../../scripts/sprites/png.mjs';
import { urlAssetAutonome } from '@client/base/depot-contenu-autonome';

const COMPAGNONS = ['filou', 'bulle', 'roc', 'plume'] as const;
const EMPREINTES = {
  filou: 'D3024E046D3CCEF452A80F45C0DB7762A01E7D41C4BB2C408AD8F6193FC7F731',
  bulle: '4C3F051496FE1C9C40660FF36D9C33B1B61C7305725C72093A37276BE0F538EA',
  roc: '40D7BD92460C9F7F26354DD0755F7FA1B5F5BF372B1FB30E009044C364FDA601',
  plume: '86C63A2BE826A961D0B8B09A75723C2B45B09997E2FEED34BE09F22BCA289A58'
} as const;
const VERSIONS = { filou: 'v3', bulle: 'v2', roc: 'v2', plume: 'v2' } as const;

interface EntreeVerrou {
  readonly id: string;
  readonly fichier: string;
  readonly empreinte: string;
  readonly generation: { readonly resolution: readonly [number, number] };
  readonly valide_par: string;
}

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
    const bord = [
      ...Array.from({ length: image.largeur }, (_, x) => x),
      ...Array.from({ length: image.largeur }, (_, x) => (image.hauteur - 1) * image.largeur + x),
      ...Array.from({ length: image.hauteur }, (_, y) => y * image.largeur),
      ...Array.from({ length: image.hauteur }, (_, y) => y * image.largeur + image.largeur - 1),
    ];
    expect(bord.every((index) => alphas[index] === 0), 'le détourage touche encore le cadre').toBe(true);
    expect(
      alphas.some((alpha) => alpha > 0 && alpha < 255),
      'le bord détouré a perdu son anticrénelage',
    ).toBe(true);
    expect(createHash('sha256').update(image.pixels).digest('hex').toUpperCase()).toBe(
      EMPREINTES[code]
    );
  });

  it('croise le référentiel, le verrou de production et le paquet autonome', () => {
    const document = JSON.parse(
      readFileSync(join(process.cwd(), 'contenu', 'monde', 'compagnons.json'), 'utf8'),
    ) as { compagnons: readonly { code: string; asset: string }[] };
    const verrou = JSON.parse(
      readFileSync(join(process.cwd(), 'production', 'assets.lock.json'), 'utf8'),
    ) as { assets: readonly EntreeVerrou[] };

    expect(document.compagnons.map(({ code }) => code).sort()).toEqual([...COMPAGNONS].sort());
    for (const code of COMPAGNONS) {
      const relatif = `assets/compagnons/${code}.png`;
      const references = document.compagnons.filter((compagnon) => compagnon.code === code);
      const entrees = verrou.assets.filter(
        (candidate) => candidate.id === `compagnon.${code}.${VERSIONS[code]}`,
      );
      expect(references, `${code} absent ou doublé dans le référentiel`).toHaveLength(1);
      expect(references[0]?.asset).toBe(relatif);
      expect(entrees, `${code} absent ou doublé dans le verrou`).toHaveLength(1);
      expect(entrees[0]).toMatchObject({
        fichier: `contenu/${relatif}`,
        empreinte: `sha256:${EMPREINTES[code]}`,
        valide_par: 'parent',
        generation: { resolution: [1086, 1448] },
      });
      expect(urlAssetAutonome(relatif), `${code} absent de l’APK`).not.toBeNull();
    }
  });
});
