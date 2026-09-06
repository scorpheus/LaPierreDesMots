import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SpriteCompagnon } from '@client/composants/SpriteCompagnon';
import { urlAsset } from '@client/api/client';
import type { CodeCompagnon } from '@pierre/partage';

vi.mock('@client/api/client', () => ({
  urlAsset: vi.fn((chemin: string) => `/ressource-de-test/${chemin}`),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each(['filou', 'bulle', 'roc', 'plume'])('rend le portrait déclaré de %s par le port de ressources', (nom) => {
  const asset = `assets/compagnons/${nom}.png`;
  const vue = render(<SpriteCompagnon code={nom as CodeCompagnon} assetStatique={asset} />);
  const image = vue.container.querySelector('img');
  expect(urlAsset).toHaveBeenCalledWith(asset);
  expect(image).not.toBeNull();
  expect(image?.getAttribute('src')).toBe(`/ressource-de-test/${asset}`);
  expect(image?.getAttribute('data-portrait-compagnon')).toBe(nom);
  expect(image?.getAttribute('draggable')).toBe('false');
});
