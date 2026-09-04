import { resolve } from 'node:path';

import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud } from './qa-outils.js';

const ETAPES = [
  { region: 'gland-du-tapis', texte: 'centre du tapis', couleur: 'brun', point: [480, 391] },
  { region: 'feuille-du-tapis-un', texte: 'haut à gauche', couleur: 'noir', point: [310, 324] },
  { region: 'feuille-du-tapis-deux', texte: 'haut, au milieu', couleur: 'violet', point: [500, 324] },
  { region: 'feuille-du-tapis-trois', texte: 'haut à droite', couleur: 'vert', point: [700, 324] },
  { region: 'feuille-haute', texte: 'feuille de gauche', couleur: 'rouge', point: [252, 386] },
  { region: 'feuille-basse', texte: 'bas, au milieu', couleur: 'jaune', point: [490, 463] },
  { region: 'feuille-du-tapis-quatre', texte: 'feuille de droite', couleur: 'orange', point: [755, 386] },
] as const;

test('foret-muette-08 — les sept objets visibles du tapis se colorient sur tablette', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1100 });
  const prenom = 'TapisJouable';
  await appliquerReglagesLectureReels(page, prenom);
  await entrerDansLeNoeud(page, 'foret-muette-08', prenom);

  const moteur = page.locator('[data-moteur="colorie"]');
  const scene = moteur.locator('svg.pierre-scene');
  await expect(moteur).toBeVisible();
  await expect(scene.locator('[data-fond-illustre]')).toBeVisible();
  await expect(scene).toHaveAttribute('data-habillage', 'foret.tapis');

  if (process.env['PIERRE_CAPTURE_TAPIS'] === '1') {
    await page.screenshot({
      path: resolve('bac-a-sable', 'tapis-colorie-tablette-avant.png'),
      fullPage: false,
      scale: 'css',
    });
  }

  for (const [index, etape] of ETAPES.entries()) {
    await expect(moteur.locator('[data-cible-colorie]')).toContainText(etape.texte);
    const prise = scene.locator(`[data-region-svg="${etape.region}"]`);
    await expect(prise).toHaveAttribute('data-active', 'oui');
    await moteur.locator(`[data-godet="${etape.couleur}"]`).click();

    const boite = await scene.boundingBox();
    expect(boite, 'la scène du tapis doit avoir une boîte mesurable').not.toBeNull();
    const x = boite!.x + (etape.point[0] / 960) * boite!.width;
    const y = boite!.y + (etape.point[1] / 600) * boite!.height;
    await page.mouse.click(x, y);

    if (index === ETAPES.length - 1) {
      await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
      break;
    }
    const forme = scene.locator(`[data-region-source="${etape.region}"]`);
    await expect(forme).toHaveAttribute('data-couleur', etape.couleur);
    await expect(forme).toHaveCSS('opacity', '0.92');
    if (index === ETAPES.length - 2 && process.env['PIERRE_CAPTURE_TAPIS'] === '1') {
      await page.screenshot({
        path: resolve('bac-a-sable', 'tapis-colorie-tablette-six-couleurs.png'),
        fullPage: false,
        scale: 'css',
      });
    }
  }

  if (process.env['PIERRE_CAPTURE_TAPIS'] === '1') {
    await page.screenshot({
      path: resolve('bac-a-sable', 'tapis-colorie-tablette-recompense.png'),
      fullPage: false,
      scale: 'css',
    });
  }
});
