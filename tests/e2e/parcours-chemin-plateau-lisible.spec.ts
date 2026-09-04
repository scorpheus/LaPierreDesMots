import { resolve } from 'node:path';

import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud } from './qa-outils.js';

test('marais-jumeau-04 — le chemin reste lisible sur la tablette réelle', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1100 });
  const prenom = 'CheminTablette';
  await appliquerReglagesLectureReels(page, prenom);
  await entrerDansLeNoeud(page, 'marais-jumeau-04', prenom);

  const moteur = page.locator('[data-moteur="chemin"]');
  const panneau = moteur.locator('[data-message-chemin="oui"]');
  const plateau = moteur.locator('[data-plateau="cases"]');
  await expect(moteur).toBeVisible();
  await expect(panneau).toBeVisible();
  await expect(plateau).toBeVisible();
  await expect(panneau).toContainText('À chercher maintenant');
  await expect(panneau).not.toContainText('Gobi te montre');
  await expect(moteur.getByText('Déjà fait')).toHaveCount(0);

  const composition = await moteur.evaluate((racine) => {
    const boite = (selecteur: string): DOMRect => {
      const element = racine.querySelector(selecteur);
      if (element === null) throw new Error(`sélecteur absent : ${selecteur}`);
      return element.getBoundingClientRect();
    };
    const cadre = racine.getBoundingClientRect();
    const panneauRect = boite('[data-message-chemin="oui"]');
    const plateauRect = boite('[data-plateau="cases"]');
    const cases = [...racine.querySelectorAll<HTMLElement>('[data-case]')]
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    const recouvre = (a: DOMRect, b: DOMRect): boolean =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    let chevauchements = 0;
    for (let i = 0; i < cases.length; i += 1) {
      for (let j = i + 1; j < cases.length; j += 1) {
        if (recouvre(cases[i]!, cases[j]!)) chevauchements += 1;
      }
    }
    return {
      largeurCadre: cadre.width,
      largeurPanneau: panneauRect.width,
      hauteurPanneau: panneauRect.height,
      panneauDansCadre: panneauRect.left >= cadre.left && panneauRect.right <= cadre.right,
      plateauSousPanneau: plateauRect.top >= panneauRect.bottom - 1,
      chevauchements,
    };
  });

  expect(composition.largeurPanneau, 'la règle variable doit employer toute la largeur utile')
    .toBeGreaterThanOrEqual(composition.largeurCadre - 24);
  expect(composition.hauteurPanneau, 'la règle ne doit plus former la grande bulle de la photo')
    .toBeLessThanOrEqual(300);
  expect(composition.panneauDansCadre, 'le panneau doit rester dans le moteur').toBe(true);
  expect(composition.plateauSousPanneau, 'le plateau doit commencer sous le panneau').toBe(true);
  expect(composition.chevauchements, 'les mots du chemin ne doivent pas se recouvrir').toBe(0);

  const caseActuelle = moteur.locator('[data-statut-chemin="actuelle"]');
  await expect(caseActuelle).toHaveCount(1);
  await expect(moteur.locator('[data-statut-chemin="possible"]')).not.toHaveCount(0);

  await page.locator('[data-action="aide"]').click();
  const cibleAide = moteur.locator('[data-case][data-aide-cible="oui"]');
  await expect(cibleAide).toHaveCount(1);
  await expect(panneau).toContainText('une case possible brille en bleu');
  await cibleAide.click();
  await expect(moteur.locator('[data-statut-chemin="parcourue"]')).not.toHaveCount(0);
  await expect(moteur.getByText('Déjà fait')).toHaveCount(0);

  if (process.env['PIERRE_CAPTURE_RESPONSIVE'] === '1') {
    await page.screenshot({
      path: resolve('bac-a-sable', 'chemin-tablette-portrait-apres.png'),
      fullPage: false,
      scale: 'css',
    });
  }
});
