import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

import {
  indexerRegionsDuMasque,
  regionAuPixel,
} from '@client/moteurs/libre/raster-indexe';
import type { RegionColoriable } from '@pierre/partage';
import { SceneLibre } from '@client/moteurs/libre/SceneLibre';

const REGIONS = [
  {
    id: 'ventre-du-chaudron',
    libelle: 'le ventre du chaudron',
    // Reproduction de `galeries-12` : les deux prises de 96 px se chevauchent.
    centroide: [460, 302],
    surface: 24_000,
    couleurMasque: '#1248A0',
  },
  {
    id: 'mousse-de-couleurs',
    libelle: 'la mousse de couleurs',
    centroide: [454, 308],
    surface: 8_000,
    couleurMasque: '#EA3290',
  },
] as const satisfies readonly RegionColoriable[];

const HABILLAGE_RASTER = {
  id: 'campement.chaudron-raster',
  moteurs: ['libre'],
  libelle: 'Le chaudron à couleurs',
  region: 'clairiere',
  scene: {
    fichier: 'habillages/campement/chaudron.svg',
    viewBox: '0 0 600 400',
    rasterIndexe: {
      fond: 'habillages/campement/chaudron-fond.png',
      trait: 'habillages/campement/chaudron-trait.png',
      masque: 'habillages/campement/chaudron-masque.png',
      largeur: 1200,
      hauteur: 800,
    },
    calques: [{ id: 'zones', role: 'coloriable', regions: REGIONS }],
  },
  palette: { jetons: {}, nuancier: ['rouge'] },
  timings: {
    appuiMs: 60,
    relachementMs: 120,
    refusMs: 0,
    recolorationMs: 300,
    interEtoilesMs: 180,
  },
  sons: { ambiance: null, effets: {} },
} as const;

describe('contrat du coloriage raster indexé', () => {
  it('retrouve une région depuis la couleur RGB exacte de son masque', () => {
    const index = indexerRegionsDuMasque(REGIONS);
    expect(regionAuPixel(index, 0x12, 0x48, 0xa0, 255)).toBe('ventre-du-chaudron');
    expect(regionAuPixel(index, 0xea, 0x32, 0x90, 255)).toBe('mousse-de-couleurs');
  });

  it('ignore le fond transparent et les couleurs parasites', () => {
    const index = indexerRegionsDuMasque(REGIONS);
    expect(regionAuPixel(index, 0x12, 0x48, 0xa0, 0)).toBeNull();
    expect(regionAuPixel(index, 0, 0, 0, 255)).toBeNull();
  });

  it('refuse deux régions portant la même couleur de masque', () => {
    expect(() =>
      indexerRegionsDuMasque([
        ...REGIONS,
        { ...REGIONS[1], id: 'doublon', couleurMasque: '#1248A0' },
      ]),
    ).toThrow(/couleur de masque.*déjà attribuée/iu);
  });

  it('refuse une région sans couleur de masque dans un décor raster', () => {
    expect(() =>
      indexerRegionsDuMasque([
        {
          id: 'sans-index',
          libelle: 'une région sans index',
          centroide: [10, 10],
          surface: 100,
        },
      ]),
    ).toThrow(/sans couleur de masque/iu);
  });

  it('est décrit par le schéma de contenu et exige un index pour chaque région', () => {
    const schema = JSON.parse(
      readFileSync(join(process.cwd(), 'contenu/schemas/habillage.schema.json'), 'utf8'),
    ) as object;
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const valider = ajv.compile(schema);
    expect(valider(HABILLAGE_RASTER), JSON.stringify(valider.errors)).toBe(true);

    const sansIndex = structuredClone(HABILLAGE_RASTER) as unknown as {
      scene: { calques: Array<{ regions: Array<{ couleurMasque?: string }> }> };
    };
    delete sansIndex.scene.calques[0]!.regions[0]!.couleurMasque;
    expect(valider(sansIndex)).toBe(false);
  });

  it('rend les trois couches raster et conserve des prises accessibles', () => {
    const colorier = vi.fn();
    const { container } = render(
      <SceneLibre
        habillage={HABILLAGE_RASTER}
        regionsOffertes={['ventre-du-chaudron', 'mousse-de-couleurs']}
        remplissages={{}}
        animationsDesactivees
        onColorier={colorier}
      />,
    );

    expect(container.querySelector('[data-decor="raster-indexe"]')).not.toBeNull();
    expect(container.querySelector('[data-raster-couche="fond"]')).not.toBeNull();
    expect(container.querySelector('[data-raster-couche="couleurs"]')).not.toBeNull();
    expect(container.querySelector('[data-raster-couche="trait"]')).not.toBeNull();
    const scene = container.querySelector('[data-scene-libre="campement.chaudron-raster"]');
    expect(scene?.getAttribute('role')).toBe('group');
    expect(scene?.getAttribute('aria-label')).toBe('Le chaudron à couleurs');
    expect(container.querySelector('[aria-label="Zones à colorier"]')).not.toBeNull();
    const prises = container.querySelectorAll('[data-cible-frappe="oui"]');
    expect(prises).toHaveLength(2);
    for (const prise of prises) {
      expect(prise.getAttribute('role')).toBe('button');
      expect(prise.getAttribute('aria-label')).toBeTruthy();
      expect((prise as SVGElement).style.pointerEvents).toBe('none');
    }
    fireEvent.click(prises[0]!);
    expect(colorier).toHaveBeenCalledWith(
      'ventre-du-chaudron',
      expect.objectContaining({ clientX: expect.any(Number), clientY: expect.any(Number) }),
    );
    colorier.mockClear();
    fireEvent.keyDown(prises[1]!, { key: 'Enter' });
    expect(colorier).toHaveBeenCalledWith('mousse-de-couleurs', { clientX: 0, clientY: 0 });
    colorier.mockClear();
    fireEvent.keyDown(prises[0]!, { key: 'Échap' });
    expect(colorier).not.toHaveBeenCalled();
    cleanup();
  });

  it('attend le masque puis nomme deux pixels voisins depuis le canvas, jamais depuis les cercles', async () => {
    class ImageChargee {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_url: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', ImageChargee);

    const largeur = HABILLAGE_RASTER.scene.rasterIndexe.largeur;
    const hauteur = HABILLAGE_RASTER.scene.rasterIndexe.hauteur;
    const pixels = new Uint8ClampedArray(largeur * hauteur * 4);
    const poserPixel = (x: number, y: number, rgb: readonly [number, number, number]): void => {
      const index = (y * largeur + x) * 4;
      pixels[index] = rgb[0];
      pixels[index + 1] = rgb[1];
      pixels[index + 2] = rgb[2];
      pixels[index + 3] = 255;
    };
    poserPixel(460, 302, [0x12, 0x48, 0xa0]);
    poserPixel(454, 308, [0xea, 0x32, 0x90]);

    const contexte = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: pixels, width: largeur, height: hauteur } as ImageData)),
      createImageData: vi.fn((l: number, h: number) => ({
        data: new Uint8ClampedArray(l * h * 4),
        width: l,
        height: h,
      } as ImageData)),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (() => contexte) as typeof HTMLCanvasElement.prototype.getContext,
    );

    const colorier = vi.fn();
    const { container } = render(
      <SceneLibre
        habillage={HABILLAGE_RASTER}
        regionsOffertes={['ventre-du-chaudron', 'mousse-de-couleurs']}
        remplissages={{}}
        animationsDesactivees
        onColorier={colorier}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('[data-masque-raster="pret"]')).not.toBeNull();
    });
    const canvas = container.querySelector<HTMLCanvasElement>('[data-raster-couche="couleurs"]');
    expect(canvas).not.toBeNull();
    Object.defineProperty(canvas!, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 600,
        bottom: 400,
        width: 600,
        height: 400,
        toJSON: () => ({}),
      }),
    });

    fireEvent.click(canvas!, { clientX: 230, clientY: 151 });
    expect(colorier).toHaveBeenLastCalledWith(
      'ventre-du-chaudron',
      expect.objectContaining({ clientX: 230, clientY: 151 }),
    );
    fireEvent.click(canvas!, { clientX: 227, clientY: 154 });
    expect(colorier).toHaveBeenLastCalledWith(
      'mousse-de-couleurs',
      expect.objectContaining({ clientX: 227, clientY: 154 }),
    );
  });

  it('revient au décor SVG jouable dès qu’une des couches raster ne charge pas', async () => {
    class ImageEnEchec {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_url: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal('Image', ImageEnEchec);
    const colorier = vi.fn();
    const { container } = render(
      <SceneLibre
        habillage={HABILLAGE_RASTER}
        regionsOffertes={['ventre-du-chaudron', 'mousse-de-couleurs']}
        remplissages={{}}
        animationsDesactivees
        onColorier={colorier}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('[data-decor="raster-indexe"]')).toBeNull();
      expect(container.querySelector('[data-decor="repli"]')).not.toBeNull();
    });
    const prise = container.querySelector('[data-region-svg="ventre-du-chaudron"]');
    expect(prise?.getAttribute('role')).toBe('button');
    fireEvent.click(prise!);
    expect(colorier).toHaveBeenCalledWith(
      'ventre-du-chaudron',
      expect.objectContaining({ clientX: expect.any(Number), clientY: expect.any(Number) }),
    );
    vi.unstubAllGlobals();
    cleanup();
  });
});
