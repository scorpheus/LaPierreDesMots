/**
 * Le cadrage ne doit pas dépendre du moteur : sur un écran 16:9, `slice` rognait le haut ou
 * les côtés des illustrations et pouvait cacher l'objet nommé par la consigne. Un exemple par
 * moteur suffit ici : ces composants partagent ensuite le même contrat `SceneDecor`.
 */
import { expect, test } from './invariants.js';
import { entrerDansLeNoeud, noeudsLivres, preparer } from './qa-outils.js';

const MOTEURS_SCENE_DECOR = [
  'assemble',
  'attrape',
  'chemin',
  'chrono',
  'eclair',
  'grave',
  'histoire',
  'paires',
  'phrase',
  'tri',
] as const;

const TEMOINS = MOTEURS_SCENE_DECOR.map((moteur) => {
  const noeud = noeudsLivres().find((candidat) => candidat.moteur === moteur);
  if (noeud === undefined) throw new Error(`aucun nœud livré pour le moteur ${moteur}`);
  return { moteur, noeud: noeud.id };
});

test.describe('cadrage entier des décors sur écran 1920×1080', () => {
  for (const temoin of TEMOINS) {
    test(`${temoin.moteur} : le décor utilise le mode contenir`, async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await preparer(page);
      await entrerDansLeNoeud(page, temoin.noeud);

      const decor = page.locator(`[data-moteur="${temoin.moteur}"] [data-decor-svg]`);
      await expect(decor).toBeVisible();
      await expect(decor).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
      await expect(page.locator(`[data-moteur="${temoin.moteur}"] [data-fond-illustre]`)).toHaveCount(1);
    });
  }
});
