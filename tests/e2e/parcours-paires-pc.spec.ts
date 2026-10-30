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
    // Le plateau est centré dans la scène du moteur (Gobi a sa colonne à côté) et non tassé en
    // haut : on compare le centre de la grille des cartes réellement occupée à celui de la scène.
    const centres = await page.evaluate(() => {
      const scene = document.querySelector('.disposition-moteur__scene')!.getBoundingClientRect();
      const cartes = [...document.querySelectorAll('[data-carte]')].map((c) => c.getBoundingClientRect());
      const gauche = Math.min(...cartes.map((c) => c.left)); const droite = Math.max(...cartes.map((c) => c.right));
      const haut = Math.min(...cartes.map((c) => c.top)); const bas = Math.max(...cartes.map((c) => c.bottom));
      return { dx: (gauche + droite) / 2 - (scene.left + scene.right) / 2, dy: (haut + bas) / 2 - (scene.top + scene.bottom) / 2 };
    });
    expect(Math.abs(centres.dx), 'cartes centrées horizontalement dans la scène').toBeLessThan(2);
    expect(Math.abs(centres.dy), 'cartes centrées verticalement dans la scène').toBeLessThan(2);
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
