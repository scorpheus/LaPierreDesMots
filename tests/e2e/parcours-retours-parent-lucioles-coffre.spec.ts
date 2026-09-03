import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from './invariants.js';
import { choisirLeProfil, entrerDansLeNoeud, preparer } from './qa-outils.js';

const DOSSIER = resolve(process.cwd(), 'bac-a-sable', 'captures-retours-parent');

test.describe('retours parent — lucioles et coffre', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await preparer(page);
    mkdirSync(DOSSIER, { recursive: true });
  });

  test('les lucioles montrent le mot utile, grand et sans phrase parasite', async ({ page }) => {
    await entrerDansLeNoeud(page, 'clairiere-02');

    const lucioles = page.locator('.cible-luciole');
    await expect(lucioles).toHaveCount(3);
    const libelles = await lucioles.allTextContents();
    expect(libelles.map((texte) => texte.trim())).toEqual(
      expect.arrayContaining(['rouge', 'gris', 'bleu'])
    );
    expect(libelles.join(' ')).not.toMatch(/luciole qui porte|deuxième luciole/iu);
    await expect(page.locator('[data-consigne="c1"]')).toHaveText(
      'Lis le mot. Retrouve ensuite la luciole qui porte ce mot.'
    );
    await expect(page.locator('[data-plateau="etape-eclair"]')).not.toContainText('rouge');

    for (const luciole of await lucioles.all()) {
      const boite = await luciole.boundingBox();
      expect(boite?.width ?? 0).toBeGreaterThanOrEqual(112);
      expect(boite?.height ?? 0).toBeGreaterThanOrEqual(80);
    }

    await page.screenshot({
      path: resolve(DOSSIER, 'lucioles-mots-1920x1080.png'),
      scale: 'css'
    });
  });

  test('le coffre rend ses collections lisibles et sa fiche centrée', async ({ page }) => {
    await choisirLeProfil(page);
    await page.locator('[data-vers="campement"]').click();
    await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
    await page.locator('[data-vers="coffre"]').click();
    await expect(page.locator('[data-ecran="coffre"]')).toBeVisible();

    await expect(page.locator('[data-progression-reste="oui"]')).toHaveCount(3);
    const premiereCase = page.locator('[data-case-etagere]').first();
    const boiteCase = await premiereCase.boundingBox();
    expect(boiteCase?.width ?? 0).toBeGreaterThanOrEqual(144);
    expect(boiteCase?.height ?? 0).toBeGreaterThanOrEqual(144);

    await page.screenshot({
      path: resolve(DOSSIER, 'coffre-collections-1920x1080.png'),
      scale: 'css'
    });

    await premiereCase.click();
    const fiche = page.locator('[data-fiche-modal="oui"]');
    await expect(fiche).toBeVisible();
    const visuel = fiche.locator('[data-fiche-visuel="oui"]');
    await expect(visuel).toBeVisible();
    const dessin = visuel.locator('img, svg').first();
    const boiteDessin = await dessin.boundingBox();
    expect(boiteDessin?.width ?? 0).toBeGreaterThanOrEqual(128);
    expect(boiteDessin?.height ?? 0).toBeGreaterThanOrEqual(128);
    await page.screenshot({
      path: resolve(DOSSIER, 'coffre-fiche-1920x1080.png'),
      scale: 'css'
    });
  });
});
