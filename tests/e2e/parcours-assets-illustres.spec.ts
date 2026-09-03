/** Recette courte des trois chemins d'images ajoutés au jeu : décor, carte et vignette. */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from './invariants.js';
import { entrerDansLeNoeud, preparer } from './qa-outils.js';

const dossierCaptures = resolve(process.cwd(), 'bac-a-sable', 'captures-integration-images');

async function imageChargee(locator: ReturnType<import('@playwright/test').Page['locator']>): Promise<boolean> {
  return locator.evaluate((element) => {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  });
}

test.describe('assets illustrés intégrés', () => {
  test.beforeAll(() => mkdirSync(dossierCaptures, { recursive: true }));

  test('le décor raster remplace le blockout sans retirer les interactions', async ({ page }) => {
    await preparer(page);
    await entrerDansLeNoeud(page, 'clairiere-07');
    await expect(page.locator('[data-fond-illustre]')).toHaveCount(1);
    expect(await page.locator('[data-moteur="assemble"] button').count()).toBeGreaterThan(0);
    await page.screenshot({ path: resolve(dossierCaptures, '01-decor-collier.png') });
  });

  test('les cartes image chargent leur PNG sans révéler leur mot', async ({ page }) => {
    await preparer(page);
    await entrerDansLeNoeud(page, 'foret-muette-02');
    const images = page.locator('img[data-illustration-carte="oui"]');
    expect(await images.count()).toBeGreaterThan(0);
    expect(await imageChargee(images.first())).toBe(true);
    await page.screenshot({ path: resolve(dossierCaptures, '02-cartes-bestiaire.png') });
  });

  test('les vignettes narratives chargent image et légende', async ({ page }) => {
    await preparer(page);
    await entrerDansLeNoeud(page, 'galeries-09');
    const images = page.locator('img[data-illustration-vignette="oui"]');
    expect(await images.count()).toBeGreaterThan(0);
    expect(await imageChargee(images.first())).toBe(true);
    await page.screenshot({ path: resolve(dossierCaptures, '03-vignettes-frise.png') });
  });
});
