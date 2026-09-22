import { expect, test } from './invariants.js';
import { choisirLeProfil, preparer } from './qa-outils.js';

for (const format of [{ width: 1536, height: 1200 }, { width: 360, height: 640 }]) {
  test(`les six cartouches restent à l’intérieur du parchemin en ${format.width}×${format.height}`, async ({ page }) => {
    await page.setViewportSize(format);
    await preparer(page);
    await choisirLeProfil(page);
    const carte = page.locator('[data-parchemin] > svg');
    await expect(carte.locator('[data-region] rect')).toHaveCount(6);
    const coupes = await carte.evaluate((svg) => {
      const contour = svg.querySelector<SVGPathElement>(':scope > path')!;
      return [...svg.querySelectorAll<SVGRectElement>('[data-region] rect')].flatMap((cartouche) => {
        const boite = cartouche.getBBox();
        // Les deux traits sont centrés sur leur chemin : réserver leurs demi-épaisseurs.
        const marge = (Number.parseFloat(getComputedStyle(contour).strokeWidth)
          + Number.parseFloat(getComputedStyle(cartouche).strokeWidth)) / 2;
        const coins = [
          [boite.x - marge, boite.y - marge],
          [boite.x + boite.width + marge, boite.y - marge],
          [boite.x - marge, boite.y + boite.height + marge],
          [boite.x + boite.width + marge, boite.y + boite.height + marge],
        ];
        return coins.every(([x, y]) => contour.isPointInFill(new DOMPoint(x, y)))
          ? [] : [cartouche.closest('[data-region]')!.getAttribute('data-region')];
      });
    });
    expect(coupes, 'le bord du papier ne doit recouvrir aucun cartouche').toEqual([]);
  });
}
