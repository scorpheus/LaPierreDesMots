import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud } from './qa-outils.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

for (const format of [
  { nom: 'PC', width: 1366, height: 768 },
  { nom: 'tablette', width: 800, height: 1100 },
]) {
  test(`assemble — refus sans rétrécir le décor sur ${format.nom}`, async ({ page }) => {
    await page.setViewportSize({ width: format.width, height: format.height });
    await appliquerReglagesLectureReels(page, 'SyllabesStables');
    await entrerDansLeNoeud(page, 'galeries-07', 'SyllabesStables');
    const moteur = page.locator('[data-moteur="assemble"]');
    await expect(moteur).toBeVisible();
    await attendreGeometrieStable(page);
    const mesurer = () => moteur.locator('[data-decor-svg]').evaluate((element) => {
      const matrice = (element as SVGSVGElement).getScreenCTM()!;
      return [matrice.a, matrice.d, matrice.e, matrice.f];
    });
    const avant = await mesurer();
    await moteur.locator('[data-bloc="bloc-din"]').click();
    await expect(moteur.locator('[data-refus-texte="oui"] [data-message-refus="oui"]')).toHaveText(
      'On cherche la syllabe qui vient à cette place-là.',
    );
    await attendreGeometrieStable(page);
    expect(await mesurer(), 'le décor garde son échelle et sa position après le refus').toEqual(avant);
    await expect(moteur.locator('[data-fentes="mot"]')).toHaveAttribute('data-restantes', '2');
    await moteur.locator('[data-bloc="bloc-jar"]').click();
    await expect(moteur.locator('[data-fentes="mot"]')).toHaveAttribute('data-restantes', '1');
    await expect(moteur.locator('[data-bloc="bloc-jar"]')).toBeHidden();
    await expect(moteur.locator('[data-bloc="bloc-din"]')).toBeVisible();
    await expect(moteur.locator('[data-refus-texte="non"]')).toBeVisible();
    await attendreGeometrieStable(page);
    expect(await mesurer(), 'la reprise ne redimensionne pas le décor').toEqual(avant);
  });
}
