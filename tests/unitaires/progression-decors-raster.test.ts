import { describe, expect, it } from 'vitest';

import { grisailleDuRaster } from '@client/habillages/SceneDecor';

describe('progression des décors raster', () => {
  it('part en gris, rend progressivement la couleur et finit sans filtre', () => {
    expect(grisailleDuRaster(0, 4)).toBe(1);
    expect(grisailleDuRaster(1, 4)).toBe(0.75);
    expect(grisailleDuRaster(4, 4)).toBe(0);
  });

  it('borne les valeurs et ne grise pas une scène sans région', () => {
    expect(grisailleDuRaster(-2, 4)).toBe(1);
    expect(grisailleDuRaster(8, 4)).toBe(0);
    expect(grisailleDuRaster(0, 0)).toBe(0);
  });
});
