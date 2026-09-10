import { expect, test } from './invariants.js';
import { entrerDansLeNoeud, preparer } from './qa-outils.js';

test('tri — le décor des grenouilles est décodé et découvert derrière les mots', async ({ page }) => {
  await preparer(page, 'DecorGrenouilles');
  await entrerDansLeNoeud(page, 'marais-jumeau-11', 'DecorGrenouilles');
  const scene = page.locator('[data-moteur="tri"] [data-scene-decor]');
  const image = scene.locator('[data-decor-raster]');
  await expect.poll(() => image.evaluate((element) => {
    const illustration = element as HTMLImageElement;
    return illustration.complete && illustration.naturalWidth > 0;
  })).toBe(true);
  await expect(image).toHaveAttribute('src', /marais-grenouilles\.png$/u);
  await expect(scene.locator('#calque-fond')).toHaveCSS('display', 'none');
  await expect(scene.locator('#calque-zones')).not.toHaveCSS('display', 'none');
  await expect(image).toBeVisible();
  expect(await scene.locator('[data-region-svg]').evaluateAll((regions) =>
    regions.every((region) => getComputedStyle(region).fill === 'rgba(0, 0, 0, 0)'),
  )).toBe(true);
});
