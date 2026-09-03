/**
 * Régression vécue : les tests qui déclenchaient directement les événements validaient le
 * réducteur, mais pas le doigt. La couche plein écran des réceptacles passait devant les mots et
 * interceptait le hit-test du navigateur. Cette recette utilise donc de vrais `locator.click()`.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

import { expect, test } from './invariants.js';

import { deuxImages, entrerDansLeNoeud, etatDuJeu, noeudsLivres, preparer } from './qa-outils.js';

const NOEUDS_TRI = noeudsLivres().filter((noeud) => noeud.moteur === 'tri');
const DOSSIER_CAPTURES = resolve(process.cwd(), 'bac-a-sable', 'captures-correction-tri');

async function elementsHorsIllustration(page: Page): Promise<string[]> {
  return page.locator('[data-moteur="tri"]').evaluate((racine) => {
    const svg = racine.querySelector<SVGSVGElement>('[data-decor-svg]');
    if (svg === null) return ['décor absent'];
    const cadre = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const echelle = Math.min(cadre.width / vb.width, cadre.height / vb.height);
    const largeur = vb.width * echelle;
    const hauteur = vb.height * echelle;
    const decor = {
      left: cadre.left + (cadre.width - largeur) / 2,
      right: cadre.left + (cadre.width + largeur) / 2,
      top: cadre.top + (cadre.height - hauteur) / 2,
      bottom: cadre.top + (cadre.height + hauteur) / 2,
    };
    return [...racine.querySelectorAll<HTMLElement>('[data-element]')]
      .filter((element) => {
        const boite = element.getBoundingClientRect();
        const x = boite.left + boite.width / 2;
        const y = boite.top + boite.height / 2;
        return x < decor.left || x > decor.right || y < decor.top || y > decor.bottom;
      })
      .map((element) => element.getAttribute('data-element') ?? '?');
  });
}

test.describe('tri — le doigt atteint les mots et les paniers restent compacts', () => {
  for (const noeud of NOEUDS_TRI) {
    test(`${noeud.id} : un vrai tap prend un mot`, async ({ page }) => {
      await preparer(page);
      await entrerDansLeNoeud(page, noeud.id);

      const mot = page.locator('[data-moteur="tri"] [data-element][data-range="non"]').first();
      await expect(mot).toBeVisible();
      // Un blocage de hit-test doit tomber vite : ce n'est pas une attente de contenu lent.
      await mot.click({ timeout: 3_000 });

      await expect(mot).toHaveAttribute('data-saisi', 'oui');
      await expect(page.locator('[data-consigne-geste]')).toHaveAttribute(
        'data-consigne-geste',
        'deposer',
      );

      const idMot = await mot.getAttribute('data-element');
      const motStable = page.locator(`[data-element="${String(idMot)}"]`);
      const etat = await etatDuJeu(page);
      const moteur = etat.etatMoteur as {
        elements: readonly { id: string; receptacleAttendu: string }[];
      };
      const receptacle = moteur.elements.find((element) => element.id === idMot)?.receptacleAttendu;
      expect(receptacle).toBeTruthy();
      await page.locator(`[data-receptacle="${String(receptacle)}"]`).click({ timeout: 3_000 });
      await expect(motStable).toHaveAttribute('data-range', 'oui');
    });
  }

  test('clairiere-03 : les paniers ne mangent pas la moitié du décor', async ({ page }) => {
    mkdirSync(DOSSIER_CAPTURES, { recursive: true });
    await preparer(page);
    await entrerDansLeNoeud(page, 'clairiere-03');
    await expect(page.locator('[data-fond-illustre]')).toHaveCount(1);
    await expect(page.locator('[data-decor-svg="clairiere.paniers"]')).toHaveAttribute(
      'preserveAspectRatio',
      'xMidYMid meet',
    );
    await expect.poll(() => elementsHorsIllustration(page)).toEqual([]);
    await deuxImages(page);

    const hauteurs = await page.locator('[data-receptacle]').evaluateAll((paniers) =>
      paniers.map((panier) => panier.getBoundingClientRect().height),
    );
    expect(hauteurs.length).toBe(2);
    expect(
      Math.max(...hauteurs),
      'un panier de tri doit rester une cible compacte superposée au dessin, pas un panneau',
    ).toBeLessThanOrEqual(180);

    await page.screenshot({
      path: resolve(DOSSIER_CAPTURES, 'clairiere-03-tablette.png'),
      scale: 'css',
    });

    // Même proportion que la capture envoyée par le parent : le responsive ne doit pas recréer
    // les immenses panneaux sur un écran plus large et moins haut.
    await page.setViewportSize({ width: 1906, height: 890 });
    await expect(page.locator('[data-moteur="tri"]')).toBeVisible();
    await expect.poll(() => elementsHorsIllustration(page)).toEqual([]);
    const hauteursLarges = await page.locator('[data-receptacle]').evaluateAll((paniers) =>
      paniers.map((panier) => panier.getBoundingClientRect().height),
    );
    expect(Math.max(...hauteursLarges)).toBeLessThanOrEqual(180);
    await page.screenshot({
      path: resolve(DOSSIER_CAPTURES, 'clairiere-03-ecran-large.png'),
      scale: 'css',
    });
  });

  test('clairiere-03 : tous les mots de couleur annoncés sont acceptés dans le panier gauche', async ({ page }) => {
    await preparer(page);
    await entrerDansLeNoeud(page, 'clairiere-03');

    for (const libelle of ['rouge', 'rose', 'vert']) {
      const mot = page.getByRole('button', { name: libelle, exact: true });
      await mot.click({ timeout: 3_000 });
      await page.locator('[data-receptacle="panier-des-couleurs"]').click({ timeout: 3_000 });
      await expect(mot, `« ${libelle} » est un mot de couleur, quel que soit son ordre`).toHaveAttribute(
        'data-range',
        'oui',
      );
    }
  });
});
