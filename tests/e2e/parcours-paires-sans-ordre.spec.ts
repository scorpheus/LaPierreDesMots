/** Une paire correcte visible sur le plateau doit fonctionner, quel que soit son groupe JSON. */
import { expect, test } from './invariants.js';
import { choisirLeProfil, preparer } from './qa-outils.js';

test('le sapin du marais est accepté avant les paires du premier groupe', async ({ page }) => {
  await preparer(page, 'PairesSansOrdre');
  await choisirLeProfil(page, 'PairesSansOrdre');
  await page.evaluate(async () => {
    const crochets = (window as Window & {
      __test?: { allerAuNoeud(noeud: string): Promise<void>; sauterAnimations(): void };
    }).__test;
    if (crochets === undefined) throw new Error('crochets __test absents');
    crochets.sauterAnimations();
    await crochets.allerAuNoeud('marais-jumeau-05');
  });

  const mot = page.locator('[data-carte="mot-sapin"]');
  const image = page.locator('[data-carte="image-sapin"]');
  await expect(mot).toBeVisible();
  await expect(image).toBeVisible();
  await expect(page.locator('[data-cartouche-paires="etape"]')).toContainText('0 / 6 paires');

  await image.click();
  await mot.click();

  await expect(image).toHaveAttribute('data-appariee', 'oui');
  await expect(mot).toHaveAttribute('data-appariee', 'oui');
  await expect(page.locator('[data-cartouche-paires="etape"]')).toContainText('1 / 6 paires');
  await expect(page.locator('[data-moteur="paires"]')).not.toContainText(
    'On garde cette carte pour une autre fois.',
  );
});
