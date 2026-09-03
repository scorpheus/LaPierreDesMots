/**
 * Recette courte des six exercices de coloriage : elle passe par le vrai godet et par le centre
 * de la prise rendue dans Chromium. La campagne logique injecte les actions dans le magasin ;
 * elle ne peut donc pas détecter une prise décalée, invisible ou un calque resté à opacité zéro.
 */
import type { Page } from '@playwright/test';
import { resolve } from 'node:path';

import { expect, test } from './invariants.js';
import { choisirLeProfil, etatDuJeu, preparer } from './qa-outils.js';

const NOEUDS_COLORIE = [
  'clairiere-01',
  'clairiere-10',
  'marais-jumeau-08',
  'foret-muette-08',
  'volcan-08',
  'cite-des-histoires-10',
] as const;

interface EtatColorieMinimal {
  readonly indexConsigne: number;
  readonly consignes: readonly {
    readonly ciblesRestantes: readonly { readonly region: string; readonly couleur: string }[];
  }[];
}

async function ouvrirNoeud(page: Page, id: string): Promise<void> {
  await page.evaluate(async (identifiant) => {
    const crochets = (window as Window & {
      __test?: { allerAuNoeud(noeud: string): Promise<void>; sauterAnimations(): void };
    }).__test;
    if (crochets === undefined) throw new Error('crochets __test absents');
    crochets.sauterAnimations();
    await crochets.allerAuNoeud(identifiant);
  }, id);
  await expect(page.locator('[data-moteur="colorie"]')).toBeVisible();
}

test('les six coloriages montrent leur prise et appliquent la couleur par un vrai tap', async ({ page }) => {
  await preparer(page, 'ColoriagesReels');
  await choisirLeProfil(page, 'ColoriagesReels');

  for (const noeud of NOEUDS_COLORIE) {
    await ouvrirNoeud(page, noeud);
    const fond = page.locator('[data-fond-illustre]');
    await expect(fond).toBeVisible();
    const hrefFond = await fond.getAttribute('href');
    expect(hrefFond, `${noeud} doit référencer un raster`).toBeTruthy();
    await page.waitForFunction(
      (suffixe) => performance.getEntriesByType('resource').some((entree) => entree.name.endsWith(suffixe)),
      hrefFond,
    );
    const etat = (await etatDuJeu(page)).etatMoteur as EtatColorieMinimal;
    const cible = etat.consignes[etat.indexConsigne]?.ciblesRestantes[0];
    expect(cible, `${noeud} doit exposer une cible courante`).toBeDefined();

    const prise = page.locator(
      `[data-calque="prises"] [data-region-svg="${cible!.region}"]`,
    );
    await expect(prise).toBeVisible();
    await expect(prise).toHaveAttribute('data-active', 'oui');
    await expect(page.locator('#calque-zones')).toHaveAttribute('opacity', '1');
    const regionVisible = page.locator(`[data-region-source="${cible!.region}"]`);
    await expect(regionVisible).toHaveCSS('opacity', '0');

    if (process.env['PIERRE_CAPTURE_COLORIAGES'] === '1') {
      await page.screenshot({
        path: resolve(process.cwd(), 'bac-a-sable', `coloriage-${noeud}-cible.png`),
        fullPage: false,
        scale: 'css',
      });
    }

    await page.locator(`[data-godet="${cible!.couleur}"]`).click();
    const boite = await prise.boundingBox();
    expect(boite, `${noeud}/${cible!.region} doit avoir une boîte tactile`).not.toBeNull();
    await page.mouse.click(boite!.x + boite!.width / 2, boite!.y + boite!.height / 2);

    await expect(
      regionVisible,
    ).toHaveAttribute('data-couleur', cible!.couleur);
    await expect(regionVisible).toHaveCSS('opacity', '0.92');
    if (noeud === 'marais-jumeau-08' && process.env['PIERRE_CAPTURE_COLORIAGES'] === '1') {
      await page.screenshot({
        path: resolve(process.cwd(), 'bac-a-sable', 'coloriage-marais-jumeau-08-colore.png'),
        fullPage: false,
        scale: 'css',
      });
    }
  }
});
