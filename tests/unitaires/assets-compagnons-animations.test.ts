import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { decoderPng } from '../../scripts/sprites/png.mjs';

const ATLAS = {
  filou: 'filou-8.png',
  roc: 'roc-8.png',
  plume: 'plume-8-v2.png',
  bulle: 'bulle-8.png'
} as const;

describe('atlas normalisés des compagnons validés', () => {
  it.each(Object.entries(ATLAS))('%s contient 8 cellules 4×2 de 256 px', (code, fichier) => {
    const image = decoderPng(
      readFileSync(join(process.cwd(), 'contenu', 'assets', 'compagnons', 'animations', fichier))
    );
    expect([image.largeur, image.hauteur], code).toEqual([1024, 512]);
    expect(image.pixels.some((_, index) => index % 4 === 3 && image.pixels[index] === 0), code)
      .toBe(true);
  });

  it('utilise la version v2 corrigée de Plume', () => {
    expect(ATLAS.plume).toBe('plume-8-v2.png');
  });

  it('anime par positions de fond et coupe les atlas en mode calme', () => {
    const css = readFileSync(join(process.cwd(), 'client', 'src', 'styles', 'global.css'), 'utf8');
    expect(css).toContain('compagnon-sprite-huit-poses 2.6s steps(1, end)');
    expect(css).toContain('background-size: 400% 200%');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("html[data-animations='desactivees'] .compagnon-sprite");
  });
});
