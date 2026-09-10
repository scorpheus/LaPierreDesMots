import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud, noeudsLivres } from './qa-outils.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

const NOEUDS_SEIZE_CARTES = [
  'cite-des-histoires-02',
  'cite-des-histoires-12',
  'volcan-12',
] as const;

for (const [width, height] of [[1366, 768], [1366, 912], [1920, 912]] as const) {
  test(`paires PC : cartes équilibrées et images lisibles en ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await appliquerReglagesLectureReels(page, 'PairesPC');
    const noeud = noeudsLivres().find(n => n.moteur === 'paires' && n.id.startsWith('marais'))!;
    await entrerDansLeNoeud(page, noeud.id, 'PairesPC');
    await attendreGeometrieStable(page);
    const cartes = await page.locator('[data-carte]').evaluateAll(elements => elements.map(e => e.getBoundingClientRect().toJSON()));
    expect(cartes.length).toBe(12);
    expect(Math.max(...cartes.map(c => c.width)) - Math.min(...cartes.map(c => c.width))).toBeLessThan(2);
    const image = await page.locator('[data-illustration-carte]').first().boundingBox();
    expect(image!.width).toBeGreaterThanOrEqual(height === 912 ? 192 : 168);
    const plateau = await page.locator('[data-plateau="cartes"]').boundingBox();
    expect(Math.abs(plateau!.x + plateau!.width / 2 - width / 2)).toBeLessThan(2);
    expect(cartes.every(c => c.y >= 0 && c.y + c.height <= height)).toBe(true);
  });
}

for (const noeud of NOEUDS_SEIZE_CARTES) {
  for (const [width, height] of [[1920, 1080], [1920, 1200]] as const) {
    test(`paires PC : les 16 cartes de ${noeud} tiennent en ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const prenom = `Paires16-${noeud}-${String(height)}`;
      await appliquerReglagesLectureReels(page, prenom);
      await entrerDansLeNoeud(page, noeud, prenom);
      await attendreGeometrieStable(page);

      const cartes = await page.locator('[data-carte]').evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().toJSON()),
      );
      expect(cartes).toHaveLength(16);
      expect(
        cartes.filter((carte) =>
          carte.top < 0 || carte.left < 0 || carte.right > width || carte.bottom > height
        ),
      ).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        height,
      );
    });
  }
}
