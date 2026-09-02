import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
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
    centroide: [300, 250],
    surface: 24_000,
    couleurMasque: '#1248A0',
  },
  {
    id: 'mousse-de-couleurs',
    libelle: 'la mousse de couleurs',
    centroide: [340, 140],
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
    const prises = container.querySelectorAll('[data-cible-frappe="oui"]');
    expect(prises).toHaveLength(2);
    for (const prise of prises) {
      expect(prise.getAttribute('role')).toBe('button');
      expect(prise.getAttribute('aria-label')).toBeTruthy();
    }
    fireEvent.click(prises[0]!);
    expect(colorier).toHaveBeenCalledWith(
      'ventre-du-chaudron',
      expect.objectContaining({ clientX: expect.any(Number), clientY: expect.any(Number) }),
    );
    cleanup();
  });
});
