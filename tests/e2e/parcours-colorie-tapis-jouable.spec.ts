import { resolve } from 'node:path';

import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud } from './qa-outils.js';

const ETAPES = [
  { region: 'gland-du-tapis', texte: 'le tapis', couleur: 'brun', point: [0.51, 0.56] },
  { region: 'feuille-du-tapis-un', texte: 'le chat', couleur: 'noir', point: [0.842, 0.48] },
  { region: 'feuille-du-tapis-deux', texte: 'le bol', couleur: 'violet', point: [0.282, 0.842] },
  { region: 'feuille-du-tapis-trois', texte: 'le sac', couleur: 'vert', point: [0.2, 0.66] },
  { region: 'feuille-haute', texte: 'le pot', couleur: 'rouge', point: [0.853, 0.76] },
  { region: 'feuille-basse', texte: 'le ballon', couleur: 'jaune', point: [0.64, 0.802] },
  { region: 'feuille-du-tapis-quatre', texte: 'le banc', couleur: 'orange', point: [0.23, 0.36] },
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

    // Le SVG peut avoir des marges : sa boîte DOM n'est pas celle du dessin.
    const point = await scene.evaluate((element, relatif) => {
      const svg = element as SVGSVGElement;
      const ecran = new DOMPoint(relatif[0] * 960, relatif[1] * 640).matrixTransform(svg.getScreenCTM()!);
      return { x: ecran.x, y: ecran.y };
    }, etape.point);
    await page.mouse.click(point.x, point.y);

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
