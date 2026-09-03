import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from './invariants.js';
import { entrerDansLeNoeud, preparer } from './qa-outils.js';

const DOSSIER = resolve(process.cwd(), 'bac-a-sable', 'captures-commandes-galeries');

test.describe('commandes lisibles des Galeries', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await preparer(page);
    mkdirSync(DOSSIER, { recursive: true });
  });

  test('éclair : voir et revoir restent dans le panneau du mot sans réduire le décor', async ({ page }) => {
    await entrerDansLeNoeud(page, 'galeries-03');
    const decor = page.locator('[data-moteur="eclair"] [data-decor-svg]');
    const avant = await decor.boundingBox();
    const panneau = page.locator('[data-plateau="eclair"]');
    await expect(panneau.locator('[data-action="pret"]')).toBeVisible();
    await panneau.locator('[data-action="pret"]').click();
    await expect(panneau).toHaveAttribute('data-visible', 'oui');
    await expect(panneau.locator('[data-action="revoir"]')).toBeVisible();
    expect(await decor.boundingBox()).toEqual(avant);
    await page.screenshot({ path: resolve(DOSSIER, 'eclair-1920x1080.png'), scale: 'css' });
  });

  test('grave : le mot incomplet est grand, centré et séparé du clavier', async ({ page }) => {
    await entrerDansLeNoeud(page, 'galeries-05');
    const mot = page.locator('[data-mot-central="oui"]');
    await expect(mot).toBeVisible();
    await expect(mot).toHaveAttribute('data-corps-minimal', '48');
    await expect(page.locator('[data-plateau="mot"] [data-lecture="oui"]')).toHaveCount(0);
    const boite = await mot.boundingBox();
    expect(boite?.x ?? 0).toBeGreaterThan(400);
    expect(boite?.width ?? 0).toBeGreaterThanOrEqual(192);
    await page.screenshot({ path: resolve(DOSSIER, 'grave-1920x1080.png'), scale: 'css' });
  });
});
