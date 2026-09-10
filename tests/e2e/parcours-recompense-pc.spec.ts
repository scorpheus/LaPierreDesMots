import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, jouerJusquALaRecompense } from './qa-outils.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

for (const [width, height] of [[1366, 768], [1366, 900], [1920, 900]] as const) {
  test(`récompense entière à zoom normal PC ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await appliquerReglagesLectureReels(page, 'RecompensePC');
    await jouerJusquALaRecompense(page, 'clairiere-01', 'RecompensePC');
    await attendreGeometrieStable(page);
    const debordements = await page.locator('.recompense-scene, .actions-recompense, .recompense-detail-etoiles, .cascade-recompense').evaluateAll(elements => elements.filter(e => {
      const r = e.getBoundingClientRect(); return r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth;
    }).map(e => e.className));
    expect(debordements).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
    await expect(page.locator('[data-recompense="etoile"]')).toBeVisible();
    if (width === 1920) await page.screenshot({ path: 'bac-a-sable/corrections-2026-09-09/recompense-pc.png' });
  });
}
