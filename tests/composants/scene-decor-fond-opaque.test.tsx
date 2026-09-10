import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Habillage } from '@pierre/partage';
import { SceneDecor } from '@client/habillages/SceneDecor';
import { lireJson } from '../configuration/preparation.js';

vi.mock('@client/api/client', () => ({ urlAsset: (chemin: string) => `/paquet/${chemin}` }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('retire le fond opaque devant le PNG chargé et le restaure en cas de panne', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(
    readFileSync(join(process.cwd(), 'contenu', url.slice('/paquet/'.length)), 'utf8'),
  )));
  const habillage = lireJson<Habillage>('contenu/habillages/marais-jumeau/grenouilles.habillage.json');
  const { container } = render(<SceneDecor habillage={habillage} allumees={[]} derniere={null} animationsDesactivees />);
  await waitFor(() => expect(container.querySelector('[data-decor-raster]')).not.toBeNull());
  const image = container.querySelector('[data-decor-raster]')!;
  // Le SVG injecté peut être remplacé au rendu : mesurer le nœud actuellement affiché.
  const fondCourant = (): Element => {
    const fond = container.querySelector('#calque-fond');
    expect(fond?.isConnected).toBe(true);
    return fond!;
  };
  expect(image.getAttribute('src')).toBe('/paquet/assets/decors/exercices/marais-grenouilles.png');
  expect(getComputedStyle(fondCourant()).display).not.toBe('none');
  fireEvent.load(image);
  expect(getComputedStyle(fondCourant()).display).toBe('none');
  expect(getComputedStyle(container.querySelector('#calque-zones')!).display).not.toBe('none');
  fireEvent.error(image);
  expect(getComputedStyle(fondCourant()).display).not.toBe('none');
  expect(container.querySelector('svg image')?.getAttribute('href')).toBe(image.getAttribute('src'));
});
