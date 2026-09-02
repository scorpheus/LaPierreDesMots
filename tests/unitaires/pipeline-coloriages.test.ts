import { describe, expect, it } from 'vitest';

// @ts-expect-error — module JavaScript volontairement autonome, utilisé par le script réel.
import { encoderPng, decoderPng } from '../../scripts/sprites/png.mjs';
// @ts-expect-error — module JavaScript volontairement autonome : le test vise la source exécutée.
import {
  analyserColoriage,
  creerSvgHybride,
  produireColoriage,
} from '../../scripts/coloriages/pipeline.mjs';

function imageBlanche(largeur: number, hauteur: number): Uint8Array {
  const pixels = new Uint8Array(largeur * hauteur * 4);
  pixels.fill(255);
  return pixels;
}

function noircir(
  pixels: Uint8Array,
  largeur: number,
  x: number,
  y: number,
): void {
  const index = (y * largeur + x) * 4;
  pixels[index] = 0;
  pixels[index + 1] = 0;
  pixels[index + 2] = 0;
  pixels[index + 3] = 255;
}

describe('pipeline mécanique des coloriages raster', () => {
  it('distingue l’extérieur d’une région réellement fermée', () => {
    const largeur = 9;
    const hauteur = 7;
    const pixels = imageBlanche(largeur, hauteur);

    for (let x = 1; x <= 5; x += 1) {
      noircir(pixels, largeur, x, 1);
      noircir(pixels, largeur, x, 5);
    }
    for (let y = 1; y <= 5; y += 1) {
      noircir(pixels, largeur, 1, y);
      noircir(pixels, largeur, 5, y);
    }

    const resultat = analyserColoriage({ largeur, hauteur, pixels }, {
      seuilEncre: 200,
      aireMinimale: 1,
    });

    expect(resultat.rapport.dimensions).toEqual({ largeur, hauteur });
    expect(resultat.rapport.nombreRegionsFermees).toBe(1);
    expect(resultat.rapport.composantes).toEqual(expect.arrayContaining([
      expect.objectContaining({ fermee: false, coloriable: false }),
      expect.objectContaining({
        index: 1,
        rgb: [0, 0, 1],
        aire: 9,
        centroide: { x: 3, y: 3 },
        fermeture: 'fermee',
        fermee: true,
        coloriable: true,
      }),
    ]));

    const interieur = (3 * largeur + 3) * 4;
    const exterieur = 4;
    expect([...resultat.masque.pixels.slice(interieur, interieur + 4)]).toEqual([0, 0, 1, 255]);
    expect([...resultat.masque.pixels.slice(exterieur, exterieur + 4)]).toEqual([0, 0, 0, 0]);
  });

  it('ne déclare pas coloriable une poche ouverte ni une poussière fermée', () => {
    const largeur = 8;
    const hauteur = 6;
    const pixels = imageBlanche(largeur, hauteur);

    // Un U ouvert : le blanc intérieur communique avec l’extérieur.
    for (let y = 1; y <= 4; y += 1) noircir(pixels, largeur, 1, y);
    for (let x = 1; x <= 4; x += 1) noircir(pixels, largeur, x, 4);
    for (let y = 2; y <= 4; y += 1) noircir(pixels, largeur, 4, y);

    // Un unique pixel blanc encerclé, fermé mais sous le seuil d’aire.
    for (let y = 1; y <= 3; y += 1) {
      for (let x = 5; x <= 7; x += 1) noircir(pixels, largeur, x, y);
    }
    pixels[(2 * largeur + 6) * 4] = 255;
    pixels[(2 * largeur + 6) * 4 + 1] = 255;
    pixels[(2 * largeur + 6) * 4 + 2] = 255;

    const resultat = analyserColoriage({ largeur, hauteur, pixels }, { aireMinimale: 2 });
    expect(resultat.rapport.nombreRegionsFermees).toBe(1);
    expect(resultat.rapport.nombreRegionsColoriables).toBe(0);
    expect(resultat.rapport.composantes).toContainEqual(expect.objectContaining({
      aire: 1,
      fermee: true,
      coloriable: false,
      raisonExclusion: 'aire-inferieure-au-seuil',
    }));
  });

  it('produit un PNG relisible et place les aplats avant le trait dans le SVG', () => {
    const largeur = 5;
    const hauteur = 5;
    const pixels = imageBlanche(largeur, hauteur);
    for (let x = 0; x < largeur; x += 1) {
      noircir(pixels, largeur, x, 0);
      noircir(pixels, largeur, x, 4);
    }
    for (let y = 0; y < hauteur; y += 1) {
      noircir(pixels, largeur, 0, y);
      noircir(pixels, largeur, 4, y);
    }

    const resultat = analyserColoriage({ largeur, hauteur, pixels }, { aireMinimale: 1 });
    const relu = decoderPng(encoderPng(resultat.masque));
    expect(relu.largeur).toBe(largeur);
    expect(relu.hauteur).toBe(hauteur);
    expect(relu.pixels).toEqual(resultat.masque.pixels);

    const svg = creerSvgHybride(resultat, 'trait-transparent.png');
    expect(svg).toContain('data-region-index="1"');
    expect(svg).toContain('class="zone-coloriable"');
    expect(svg).toContain('data-rgb-masque="0,0,1"');
    expect(svg).toContain('fill="#d6d6d6"');
    expect(svg.indexOf('id="aplats-coloriables"')).toBeLessThan(svg.indexOf('id="trait"'));
    expect(svg).toContain('href="trait-transparent.png"');
  });

  it('refuse toute écriture sans destination explicitement fournie', async () => {
    await expect(produireColoriage({ source: 'image-inexistante.png' })).rejects.toThrow(
      'destination explicite',
    );
  });
});
