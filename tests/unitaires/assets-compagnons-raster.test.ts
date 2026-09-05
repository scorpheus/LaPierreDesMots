import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { decoderPng } from '../../scripts/sprites/png.mjs';
import { urlAssetAutonome } from '@client/base/depot-contenu-autonome';

const COMPAGNONS = ['filou', 'bulle', 'roc', 'plume'] as const;
const EMPREINTES = {
  filou: 'CD87961EDB6C37C479CB5EA91C8BA2D4FAAFE3BE9969F528A735D2AC18B18961',
  bulle: 'A19CD952912D833BB1AE3EC33E8643077C0C7DB92B6DE4C61248E79941C698F3',
  roc: '7BCF9A9659D44E6838792DE6781F8185F5EFB8252649A071AEE09B9767FD5108',
  plume: 'B40E79DD6425D319650EB3C55194A97C25796B51AF4089BE0906D0135018F90B'
} as const;
const DIMENSIONS = {
  filou: [422, 596],
  bulle: [454, 598],
  roc: [426, 582],
  plume: [432, 589]
} as const;
const VERSIONS = { filou: 'v4', bulle: 'v3', roc: 'v3', plume: 'v3' } as const;

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

    expect([image.largeur, image.hauteur]).toEqual(DIMENSIONS[code]);
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
        generation: { resolution: DIMENSIONS[code] },
      });
      expect(urlAssetAutonome(relatif), `${code} absent de l’APK`).not.toBeNull();
    }
  });
});
