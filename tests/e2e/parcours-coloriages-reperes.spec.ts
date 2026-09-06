/** Touchers sur les OBJETS relevés sur le PNG, jamais sur le centre calculé par le moteur. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './invariants.js';
import { choisirLeProfil, preparer, etatDuJeu, deuxImages } from './qa-outils.js';
import { decoderPng } from '../../scripts/sprites/png.mjs';
import reperes from '../fixtures/coloriages-reperes.json' with { type: 'json' };

interface EtatColoriage {
  readonly indexConsigne: number;
  readonly remplissages: Readonly<Record<string, string>>;
  readonly consignes: readonly { readonly ciblesRestantes: readonly { readonly region: string; readonly couleur: string }[] }[];
}

async function ouvrir(page: Page, noeud: string): Promise<void> {
  await page.evaluate(async (id) => {
    const fenetre = window as Window & { __test: { allerAuNoeud(id: string): Promise<void>; sauterAnimations(): void } };
    fenetre.__test.sauterAnimations();
    await fenetre.__test.allerAuNoeud(id);
  }, noeud);
  await expect(page.locator('[data-moteur="colorie"]')).toBeVisible();
  await expect(page.locator('[data-fond-illustre]')).toHaveCount(1);
  await page.locator('[data-fond-illustre]').evaluate(async (element) => {
    const image = new Image(); image.src = element.getAttribute('href')!;
    await Promise.all([document.fonts.ready, image.decode()]);
  });
  await deuxImages(page);
}

/** Conversion de coordonnées raster indépendantes ; aucune lecture des chemins coloriables. */
async function pointEcran(page: Page, relatif: readonly number[], dimensions: readonly number[]): Promise<{ x: number; y: number }> {
  return page.locator('svg.pierre-scene').evaluate((element, donnees) => {
    const svg = element as SVGSVGElement;
    const fond = svg.querySelector('image') as SVGImageElement;
    const facteur = Math.min(fond.width.baseVal.value / donnees.dimensions[0]!, fond.height.baseVal.value / donnees.dimensions[1]!);
    const largeur = donnees.dimensions[0]! * facteur, hauteur = donnees.dimensions[1]! * facteur;
    const x = fond.x.baseVal.value + (fond.width.baseVal.value - largeur) / 2 + donnees.relatif[0]! * largeur;
    const y = fond.y.baseVal.value + (fond.height.baseVal.value - hauteur) / 2 + donnees.relatif[1]! * hauteur;
    const point = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!);
    return { x: point.x, y: point.y };
  }, { relatif, dimensions });
}

async function etat(page: Page): Promise<EtatColoriage> {
  return (await etatDuJeu(page)).etatMoteur as EtatColoriage;
}

for (const format of [{ width: 720, height: 1017 }, { width: 1080, height: 670 }, { width: 390, height: 700 }, { width: 844, height: 340 }]) {
  for (const scene of reperes) {
    test(`${scene.noeud} : tous les objets au doigt en ${format.width}×${format.height}`, async ({ page }) => {
      await page.setViewportSize(format);
      await preparer(page, 'ReperesColoriage');
      await choisirLeProfil(page, 'ReperesColoriage');
      await ouvrir(page, scene.noeud);
      if (format.width === 720) await page.screenshot({ path: resolve('bac-a-sable/coloriages-locaux-2026-09-05', `${scene.noeud}-tablette-debut.png`), scale: 'css' });
      const octets = readFileSync(resolve(scene.image));
      const dimensions = [octets.readUInt32BE(16), octets.readUInt32BE(20)];
      for (const cible of scene.cibles) {
        const avant = await etat(page);
        const attendue = avant.consignes[avant.indexConsigne]!.ciblesRestantes.find(r => r.region === cible.region);
        expect(attendue, `La consigne doit proposer ${cible.objet}`).toBeDefined();
        await page.locator(`[data-godet="${attendue!.couleur}"]`).tap();
        await page.locator('svg.pierre-scene').scrollIntoViewIfNeeded();
        const point = await pointEcran(page, cible.interieur, dimensions);
        const sousDoigt = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-region-source]')?.getAttribute('data-region-source'), point);
        expect(sousDoigt, `${cible.objet} doit être visible et non recouvert`).toBe(cible.region);
        await page.touchscreen.tap(point.x, point.y);
        await expect.poll(async () => (await etat(page)).remplissages[cible.region]).toBe(attendue!.couleur);
      }
      if (format.width === 720) await page.screenshot({ path: resolve('bac-a-sable/coloriages-locaux-2026-09-05', `${scene.noeud}-tablette-fini.png`), scale: 'css' });
    });
  }
}

test('la loupe se déplace sans peindre et le noir assombrit réellement le motif', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1017 });
  await preparer(page, 'LoupeReelle');
  await choisirLeProfil(page, 'LoupeReelle');
  await ouvrir(page, 'foret-muette-08');
  await page.locator('[data-godet="brun"]').tap();
  await page.getByRole('button', { name: 'Voir en grand' }).tap();
  const fenetre = page.locator('[data-loupe-fenetre]');
  const cadre = await fenetre.boundingBox();
  expect(cadre).not.toBeNull();
  expect(await fenetre.evaluate(e => e.scrollWidth)).toBeGreaterThan(cadre!.width);
  const session = await page.context().newCDPSession(page);
  const x = cadre!.x + cadre!.width * .75, y = cadre!.y + Math.min(cadre!.height * .5, 150);
  const depart = await etat(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 12; i++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - i * 12, y }] });
    await deuxImages(page);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
  expect((await etat(page)).remplissages).toEqual(depart.remplissages);
  await expect.poll(() => fenetre.evaluate(e => e.scrollLeft)).toBeGreaterThan(20);
  // Mettre l'objet raster dans le cadre ; on ne lit pas de centroïde de masque.
  await fenetre.evaluate(e => e.scrollTo({ left: e.scrollWidth * .51 - e.clientWidth / 2, top: e.scrollHeight * .56 - e.clientHeight / 2 }));
  const tapisAgrandi = await pointEcran(page, [.51, .56], [1536, 1024]);
  await page.touchscreen.tap(tapisAgrandi.x, tapisAgrandi.y);
  await expect.poll(async () => (await etat(page)).indexConsigne).toBe(1);
  await page.getByRole('button', { name: 'Voir tout', exact: true }).tap();
  expect((await etat(page)).remplissages['gland-du-tapis']).toBe('brun');
  const chat = await pointEcran(page, [.842, .48], [1536, 1024]);
  const luminosite = async (): Promise<number> => {
    const png = decoderPng(await page.screenshot({ clip: { x: Math.round(chat.x) - 2, y: Math.round(chat.y) - 2, width: 5, height: 5 }, scale: 'css' }));
    let somme = 0;
    for (let i = 0; i < png.pixels.length; i += 4) somme += (png.pixels[i]! + png.pixels[i + 1]! + png.pixels[i + 2]!) / 3;
    return somme / (png.largeur * png.hauteur);
  };
  const avantNoir = await luminosite();
  await page.locator('[data-godet="noir"]').tap();
  await page.touchscreen.tap(chat.x, chat.y);
  await expect.poll(async () => (await etat(page)).remplissages['feuille-du-tapis-un']).toBe('noir');
  await expect.poll(luminosite).toBeLessThan(avantNoir - 8);
});
