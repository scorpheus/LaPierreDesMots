/**
 * Régression issue de la recette parent du 3 septembre : « Le toit de l'école est rouge »
 * montrait encore la maquette SVG. Les contrôles précédents ne vérifiaient qu'un échantillon
 * de trois images, et les gestes génériques étaient injectés dans le DOM : ils ne pouvaient
 * ni voir l'absence du raster, ni un hit-test réellement bloqué.
 *
 * Cette recette ne regarde pas une capture : elle vérifie le contrat observable qui rend une
 * illustration utile à l'enfant : fond raster effectivement monté, scène entièrement dans la
 * fenêtre à deux formats usuels, puis vraie sélection de couleur et vrai tap sur le toit.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

import { expect, test } from './invariants.js';
import { entrerDansLeNoeud, etatDuJeu, preparer } from './qa-outils.js';

const NOEUD_ECOLE_MOTS_OUTILS = 'clairiere-10';
const NOEUD_ECOLE_CONSIGNES = 'clairiere-01';
const DOSSIER_CAPTURES = resolve(process.cwd(), 'bac-a-sable', 'captures-cadrage-exercices');
const FORMATS = [
  { nom: 'tablette 16:10', largeur: 1920, hauteur: 1200 },
  { nom: 'écran 16:9', largeur: 1920, hauteur: 1080 },
] as const;

interface MesureScene {
  readonly gauche: number;
  readonly haut: number;
  readonly droite: number;
  readonly bas: number;
  readonly largeurFenetre: number;
  readonly hauteurFenetre: number;
}

async function sceneDansLaFenetre(page: Page): Promise<MesureScene> {
  return page.locator('[data-moteur="colorie"] svg[data-habillage="clairiere.ecole"]').evaluate(
    (scene) => {
      const boite = scene.getBoundingClientRect();
      return {
        gauche: boite.left,
        haut: boite.top,
        droite: boite.right,
        bas: boite.bottom,
        largeurFenetre: window.innerWidth,
        hauteurFenetre: window.innerHeight,
      };
    },
  );
}

function estEntiere(mesure: MesureScene): boolean {
  const marge = 1;
  return (
    mesure.gauche >= -marge &&
    mesure.haut >= -marge &&
    mesure.droite <= mesure.largeurFenetre + marge &&
    mesure.bas <= mesure.hauteurFenetre + marge
  );
}

test.describe('régression Clairière — décor, cadrage et vrai geste de coloriage', () => {
  for (const format of FORMATS) {
    test(`« ${format.nom} » : l'école entière reste visible`, async ({ page }) => {
      await page.setViewportSize({ width: format.largeur, height: format.hauteur });
      await preparer(page);
      await entrerDansLeNoeud(page, NOEUD_ECOLE_MOTS_OUTILS);

      const scene = page.locator('[data-moteur="colorie"] svg[data-habillage="clairiere.ecole"]');
      await expect(scene).toHaveAttribute('data-decor', 'habillage');

      // Un SVG d'interaction reste nécessaire au coloriage, mais son fond doit être la belle
      // illustration raster publiée, et non la maquette géométrique qu'il recouvre.
      const fondRaster = scene.locator('[data-fond-illustre]');
      await expect(fondRaster, 'le fond raster de la cour doit être monté dans le SVG jouable').toHaveCount(1);
      await expect(fondRaster).toHaveAttribute('href', /ecole\.png/u);

      expect(
        estEntiere(await sceneDansLaFenetre(page)),
        'à cette résolution, le dessin ne doit pas être rogné ni demander de défilement pour voir son contenu',
      ).toBe(true);

      mkdirSync(DOSSIER_CAPTURES, { recursive: true });
      await page.screenshot({
        path: resolve(DOSSIER_CAPTURES, `ecole-${format.largeur}x${format.hauteur}.png`),
        scale: 'css',
      });
    });
  }

  test('une vraie couleur puis un vrai tap peignent le toit', async ({ page }) => {
    await preparer(page);
    await entrerDansLeNoeud(page, NOEUD_ECOLE_MOTS_OUTILS);

    const rouge = page.getByRole('button', { name: 'rouge' });
    await rouge.click({ timeout: 3_000 });

    // Ce cercle transparent est la prise réellement destinée au doigt. Ne pas utiliser
    // dispatchEvent : il contournerait précisément le hit-test qui a déjà laissé passer le
    // défaut des paniers de tri.
    const toit = page.locator(
      '[data-moteur="colorie"] [data-calque="prises"] [data-region-svg="toit-ecole"]',
    );
    await toit.click({ timeout: 3_000 });
    await expect(toit).toHaveAttribute('data-peinte', 'oui');

    const etat = await etatDuJeu(page);
    expect(etat.etatMoteur).toMatchObject({
      remplissages: { 'toit-ecole': 'rouge' },
    });
  });

  test('le pull devient bleu localement sans recolorer toute l’image', async ({ page }) => {
    await preparer(page);
    await entrerDansLeNoeud(page, NOEUD_ECOLE_CONSIGNES);

    const scene = page.locator('[data-moteur="colorie"] svg[data-habillage="clairiere.ecole"]');
    await expect(scene).toHaveAttribute('data-decor', 'habillage');
    expect(await scene.evaluate((element) => getComputedStyle(element).filter)).toBe('none');

    const prisePull = scene.locator('[data-calque="prises"] [data-region-svg="pull-maitresse"]');
    const formePull = scene.locator('[data-region-source="pull-maitresse"]');
    await expect(formePull).toHaveCSS('opacity', '0.92');

    await page.getByRole('button', { name: 'bleu' }).click();
    await prisePull.click();

    await expect(prisePull).toHaveAttribute('data-peinte', 'oui');
    await expect(formePull).toHaveAttribute('fill', '#2FA8E0');
    await expect(scene.locator('[data-region-source="banc"]')).toHaveCSS('opacity', '0');

    mkdirSync(DOSSIER_CAPTURES, { recursive: true });
    await page.screenshot({
      path: resolve(DOSSIER_CAPTURES, 'ecole-pull-bleu-1920x1080.png'),
      scale: 'css',
    });
  });
});
