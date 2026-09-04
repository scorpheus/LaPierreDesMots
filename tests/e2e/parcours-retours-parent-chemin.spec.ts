import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from './invariants.js';
import { entrerDansLeNoeud, preparer } from './qa-outils.js';

const DOSSIER = resolve(process.cwd(), 'bac-a-sable', 'captures-retours-parent');

test.describe('retours parent — chemin de la Clairière', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await preparer(page);
    mkdirSync(DOSSIER, { recursive: true });
  });

  test('sépare un prolongement jouable d’une ancienne case', async ({ page }) => {
    await entrerDansLeNoeud(page, 'clairiere-08');

    await expect(page.locator('[data-case="depart-arbre"]')).toHaveAttribute('data-pion', 'oui');
    await page.locator('[data-case="case-chat"]').click();

    await expect(page.locator('[data-case="depart-arbre"]')).toBeDisabled();
    await expect(page.locator('[data-case="depart-arbre"]')).toHaveAttribute('data-atteignable', 'non');
    await expect(page.locator('[data-case="case-papa"]')).toHaveAttribute('data-atteignable', 'oui');
    // Deux choix restent réellement ouverts depuis « chat » : « papa » et le leurre « lit ».
    // Le retour vers « l’arbre », lui, ne doit plus être présenté comme une possibilité.
    await expect(page.locator('[data-trait-actif="oui"]')).toHaveCount(2);
    await expect(page.locator('[data-message-chemin="oui"]')).toContainText(
      'Suis le chemin des mots avec la lettre a.'
    );

    await page.locator('[data-action="aide"]').click();
    await expect(page.locator('[data-case="case-papa"]')).toHaveAttribute('data-aide-cible', 'oui');
    await expect(page.locator('[data-message-chemin="oui"]')).toContainText(
      'Indice : une case possible brille en bleu.',
    );

    await page.screenshot({
      path: resolve(DOSSIER, 'chemin-lisible-1920x1080.png'),
      scale: 'css'
    });
  });
});
