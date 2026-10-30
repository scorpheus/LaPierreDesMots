import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud } from './qa-outils.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

for (const format of [{ width: 1920, height: 904 }, { width: 1366, height: 768 }]) {
  test(`phrase PC sans recouvrement ${format.width}`, async ({ page }) => {
    await page.setViewportSize(format);
    await appliquerReglagesLectureReels(page, 'PhrasePC');
    await entrerDansLeNoeud(page, 'marais-jumeau-07', 'PhrasePC');
    await attendreGeometrieStable(page);
    // Retour parent : les blocs de la phrase recouvraient Filou. Gobi a désormais sa propre zone
    // (à côté en paysage, dessous en portrait) : on exige qu'aucune boîte ne recouvre l'autre,
    // quelle que soit leur position relative, et que le guide soit entier à l'écran.
    const moteur = (await page.locator('[data-moteur="phrase"]').boundingBox())!;
    const gobi = (await page.locator('main > .gobi').boundingBox())!;
    const recouvrement = {
      largeur: Math.min(moteur.x + moteur.width, gobi.x + gobi.width) - Math.max(moteur.x, gobi.x),
      hauteur: Math.min(moteur.y + moteur.height, gobi.y + gobi.height) - Math.max(moteur.y, gobi.y),
    };
    expect(recouvrement.largeur <= 0 || recouvrement.hauteur <= 0, `le moteur ne recouvre pas Gobi : ${JSON.stringify(recouvrement)}`).toBe(true);
    expect(gobi.y).toBeGreaterThanOrEqual(0);
    expect(gobi.x + gobi.width).toBeLessThanOrEqual(format.width);
    expect(gobi.y + gobi.height).toBeLessThanOrEqual(format.height);
    const aide = page.locator('[data-action="aide"]');
    expect(await aide.evaluate(e => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); })).toBe(true);
  });
}
