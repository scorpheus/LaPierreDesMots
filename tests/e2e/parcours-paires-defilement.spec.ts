import { resolve } from 'node:path';
import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud, noeudsLivres, etatDuJeu } from './qa-outils.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';
import { balayerAuDoigt } from './gestes-defilement.js';

test.use({ isMobile: true, hasTouch: true });
const fiches = noeudsLivres().filter((fiche) => fiche.moteur === 'paires');
const formats = [{ width: 800, height: 1100 }, { width: 1100, height: 700 },
  { width: 360, height: 640 }, { width: 640, height: 360 }, { width: 1920, height: 1200 }];

test('une grande phrase glissée vers une petite image ne dilate pas le viewport mobile', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1100 });
  await appliquerReglagesLectureReels(page, 'PairesBord');
  await entrerDansLeNoeud(page, 'cite-des-histoires-02', 'PairesBord');
  await attendreGeometrieStable(page);
  const source = page.locator('[data-carte][data-face="mot"]').first();
  const cible = page.locator('[data-carte][data-face="image"]').last();
  const a = (await source.boundingBox())!;
  const b = (await cible.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 });
  await expect(source).toHaveAttribute('data-retournee', 'oui');
  const debordement = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.mouse.up();
  expect(debordement, 'le carton déplacé ne doit pas agrandir la page ni déclencher un auto-scroll horizontal').toBeLessThanOrEqual(1);
});

test('une carte acquise ne reprend pas une carte glissée et conserve le choix en cours', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1100 });
  await appliquerReglagesLectureReels(page, 'PairesAcquises');
  await entrerDansLeNoeud(page, 'foret-muette-02', 'PairesAcquises');
  await attendreGeometrieStable(page);
  const etat = (await etatDuJeu(page)).etatMoteur as { cartes: { id: string; paire: string }[]; dernierRefus: unknown };
  const premiere = etat.cartes[0]!;
  const paire = etat.cartes.filter((carte) => carte.paire === premiere.paire);
  for (const carte of paire) await page.locator(`[data-carte="${carte.id}"]`).tap();
  await expect(page.locator('[data-appariee="oui"]')).toHaveCount(2);
  const neuve = etat.cartes.find((carte) => carte.paire !== premiere.paire)!;
  const source = page.locator(`[data-carte="${neuve.id}"]`);
  const cible = page.locator(`[data-carte="${premiere.id}"]`);
  const a = (await source.boundingBox())!;
  const b = (await cible.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 });
  await expect(source).toHaveAttribute('data-retournee', 'oui');
  await page.mouse.up();
  await expect(source, 'ignorer le dépôt sur une carte acquise, sans annuler la sélection').toHaveAttribute('data-retournee', 'oui');
  expect(((await etatDuJeu(page)).etatMoteur as typeof etat).dernierRefus).toEqual(etat.dernierRefus);
  await expect(page.locator('[data-appariee="oui"]')).toHaveCount(2);
});

test('le geste de défilement respecte un vrai blocage tactile, contrairement à scrollIntoView', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1100 });
  await page.setContent('<!DOCTYPE html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><button style="display:block;width:100%;height:2400px;touch-action:none">Carte longue</button></body>');
  const cdp = await page.context().newCDPSession(page);
  await balayerAuDoigt(page, cdp, 400, 800, 400);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.locator('button').evaluate((bouton) => { bouton.style.touchAction = 'manipulation'; });
  await balayerAuDoigt(page, cdp, 400, 800, 400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await cdp.detach();
});

for (const format of formats) for (const fiche of fiches) {
  test(`${fiche.id} — dernières cartes accessibles par balayage tactile en ${format.width}×${format.height}`, async ({ page }) => {
    await page.setViewportSize(format);
    await appliquerReglagesLectureReels(page, 'PairesDefilables');
    await entrerDansLeNoeud(page, fiche.id, 'PairesDefilables');
    await attendreGeometrieStable(page);
    const moteur = page.locator('[data-moteur="paires"]');
    const cartes = moteur.locator('[data-carte]');
    const derniere = cartes.last();
    const avant = (await etatDuJeu(page)).etatMoteur as { carteRetournee: string | null; dernierRefus: unknown };
    expect(avant.carteRetournee).toBeNull();
    const cdp = await page.context().newCDPSession(page);
    let gestes = 0;
    while ((await derniere.boundingBox())!.y + (await derniere.boundingBox())!.height > format.height - 12) {
      expect(gestes, 'la fin de la grille doit être atteignable, sans boucle').toBeLessThan(40);
      const depart = await cartes.evaluateAll((boutons) => {
        for (const bouton of boutons) {
          const r = bouton.getBoundingClientRect();
          const haut = Math.max(r.top + 8, 160);
          const bas = Math.min(r.bottom - 8, innerHeight - 32);
          if (bas - haut < 20) continue;
          const x = (r.left + r.right) / 2;
          const y = (haut + bas) / 2;
          if (bouton.contains(document.elementFromPoint(x, y))) return { x, y };
        }
        return null;
      });
      expect(depart, 'le doigt commence sur une carte réellement visible').not.toBeNull();
      const scrollAvant = await page.evaluate(() => scrollY);
      await balayerAuDoigt(page, cdp, depart!.x, depart!.y, Math.min(400, depart!.y - 32));
      await expect.poll(() => page.evaluate(() => scrollY), {
        message: 'un balayage depuis la carte doit déplacer la PAGE, sans scroll forcé par Playwright',
        timeout: 2_000,
      }).toBeGreaterThan(scrollAvant + 1);
      await attendreGeometrieStable(page);
      await expect(moteur.locator('[data-retournee="oui"]'), 'défiler ne sélectionne pas une carte').toHaveCount(0);
      expect(((await etatDuJeu(page)).etatMoteur as typeof avant).dernierRefus).toEqual(avant.dernierRefus);
      gestes += 1;
    }
    const sousScroll = await moteur.evaluate((element) => {
      const resultat = [];
      for (let parent: HTMLElement | null = element; parent !== null && parent !== document.body; parent = parent.parentElement) {
        if (/auto|scroll/u.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 1) {
          resultat.push(parent.outerHTML.slice(0, 180));
        }
      }
      return resultat;
    });
    expect(sousScroll, 'le document porte toute la grille, pas un sous-scroll').toEqual([]);
    const r = (await derniere.boundingBox())!;
    await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    await expect(derniere, 'la dernière carte devient sélectionnée au vrai tap').toHaveAttribute('data-retournee', 'oui');
    const aide = page.locator('[data-action="aide"]');
    const cadreAide = (await aide.boundingBox())!;
    if (cadreAide.y + cadreAide.height > format.height) {
      const scrollAvant = await page.evaluate(() => scrollY);
      await balayerAuDoigt(page, cdp, r.x + r.width / 2, r.y + r.height / 2,
        Math.min(400, r.y + r.height / 2 - 32));
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollAvant);
      await attendreGeometrieStable(page);
    }
    const aideAccessible = await aide.evaluate((bouton) => {
      const r = bouton.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight &&
        bouton.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    });
    expect(aideAccessible, 'le compagnon reste accessible après la dernière rangée').toBe(true);
    await expect(derniere, 'défiler depuis une carte choisie ne change pas le choix').toHaveAttribute('data-retournee', 'oui');
    if (fiche.id === 'cite-des-histoires-02' && format.width === 800) {
      await page.screenshot({ path: resolve('bac-a-sable/paires-defilement-2026-09-05/derniere-carte-tablette.png'), scale: 'css' });
      await page.screenshot({ path: resolve('bac-a-sable/paires-defilement-2026-09-05/grille-complete-tablette.png'), fullPage: true, scale: 'css' });
    }
    await cdp.detach();
  });
}

for (const mode of ['souris', 'maintien tactile'] as const) {
  test(`paires — le glisser intentionnel reste disponible par ${mode}`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1200 });
    await appliquerReglagesLectureReels(page, 'PairesGlisser');
    await entrerDansLeNoeud(page, 'foret-muette-02', 'PairesGlisser');
    await attendreGeometrieStable(page);
    const etat = (await etatDuJeu(page)).etatMoteur as { cartes: { id: string; paire: string }[]; dernierRefus: unknown };
    const visibles = await page.locator('[data-carte]').evaluateAll((cartes) => cartes.filter((carte) => {
      const r = carte.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    }).map((carte) => carte.getAttribute('data-carte')));
    const paire = etat.cartes.map((carte) => etat.cartes.filter((autre) =>
      autre.paire === carte.paire && visibles.includes(autre.id))).find((cartes) => cartes.length === 2);
    expect(paire, 'une vraie paire complète doit être disponible sur ce grand écran').toBeDefined();
    const source = page.locator(`[data-carte="${paire![0]!.id}"]`);
    const cible = page.locator(`[data-carte="${paire![1]!.id}"]`);
    const a = (await source.boundingBox())!;
    const b = (await cible.boundingBox())!;
    const x = a.x + a.width / 2;
    const y = a.y + a.height / 2;
    if (mode === 'souris') {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 });
      await page.mouse.up();
    } else {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      // L'état du capteur donne le signal : aucune attente arbitraire du délai de maintien.
      await expect(source).toHaveAttribute('data-retournee', 'oui');
      for (let pas = 1; pas <= 16; pas += 1) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
          x: x + (b.x + b.width / 2 - x) * pas / 16,
          y: y + (b.y + b.height / 2 - y) * pas / 16,
        }] });
        await page.evaluate(() => new Promise<void>((resoudre) => requestAnimationFrame(() => resoudre())));
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    }
    await expect(source).toHaveAttribute('data-appariee', 'oui');
    await expect(cible).toHaveAttribute('data-appariee', 'oui');
    expect(((await etatDuJeu(page)).etatMoteur as typeof etat).dernierRefus).toEqual(etat.dernierRefus);
  });
}
