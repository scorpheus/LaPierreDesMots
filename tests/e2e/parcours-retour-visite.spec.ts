import { test, expect } from './invariants.js';
import { recettesDEcrans } from './qa-outils.js';

test('le retour à la visite est proposé seulement pendant une excursion', async ({ page }) => {
  const visite = recettesDEcrans().find((recette) => recette.attendu === 'visite-parent');
  expect(visite, 'la visite possède une recette publique').toBeDefined();
  await visite!.aller(page);
  await expect(page.locator('[data-ecran="visite-parent"]')).toBeVisible();
  await expect(page.locator('[data-retour-visite]'), 'aucun retour vers la page déjà courante').toHaveCount(0);
  await page.locator('[data-visite-ecran="carte"]').click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  await page.locator('[data-retour-visite]').click();
  await expect(page.locator('[data-ecran="visite-parent"]')).toBeVisible();
  await expect(page.locator('[data-retour-visite]')).toHaveCount(0);
});
