import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud } from './qa-outils.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

for (const format of [{ width: 1920, height: 904 }, { width: 1366, height: 768 }]) {
  test(`phrase PC sans recouvrement ${format.width}`, async ({ page }) => {
    await page.setViewportSize(format);
    await appliquerReglagesLectureReels(page, 'PhrasePC');
    await entrerDansLeNoeud(page, 'marais-jumeau-07', 'PhrasePC');
    await attendreGeometrieStable(page);
    const moteur = await page.locator('[data-moteur="phrase"]').boundingBox();
    const gobi = await page.locator('main > .gobi').boundingBox();
    expect(moteur!.y + moteur!.height).toBeLessThanOrEqual(gobi!.y);
    expect(gobi!.y + gobi!.height).toBeLessThanOrEqual(format.height);
    const aide = page.locator('[data-action="aide"]');
    expect(await aide.evaluate(e => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); })).toBe(true);
  });
}
