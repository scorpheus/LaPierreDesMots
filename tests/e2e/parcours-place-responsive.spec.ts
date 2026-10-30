import { resolve } from 'node:path';

import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud } from './qa-outils.js';

test('clairiere-04 — le repère d’étape ne masque jamais la zone place active sur tablette', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1100 });
  const prenom = 'PlaceResponsive';
  await appliquerReglagesLectureReels(page, prenom);
  await entrerDansLeNoeud(page, 'clairiere-04', prenom);

  const moteur = page.locator('[data-moteur="place"]');
  await expect(moteur).toBeVisible();
  // T10 (9 octobre) : l'étape de `place` est dans le repère commun, dans la barre de consigne,
  // au-dessus de la scène — plus « sous le dessin ». Refait sans perdre ce qui est gardé : le
  // repère ne recouvre jamais la zone active, la scène garde sa hauteur, les objets suivent.
  const mesurer = (zoneActive: string) => page.evaluate((zoneAttendue) => {
    const element = (selecteur: string): Element => {
      const trouve = document.querySelector(selecteur);
      if (trouve === null) throw new Error(`sélecteur absent: ${selecteur}`);
      return trouve;
    };
    const rect = (selecteur: string): DOMRect => element(selecteur).getBoundingClientRect();
    const recouvre = (a: DOMRect, b: DOMRect): number =>
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const cartouche = rect('[data-repere-etape="place"]');
    const scene = rect('[data-scene="place"]');
    const reserve = rect('[data-reserve="place"]');
    const cible = rect(`[data-zone-cible="${zoneAttendue}"]`);
    return {
      recouvrementCartoucheCible: recouvre(cartouche, cible),
      espaceScene: scene.height,
      cartoucheDansLaBarre: element('[data-repere-etape="place"]').closest('.barre-consigne') !== null,
      cartoucheAuDessusScene: cartouche.bottom <= scene.top + 1,
      reserveSousCartouche: reserve.top >= cartouche.bottom - 1,
    };
  }, zoneActive);

  const mesure = await mesurer('ciel');

  expect(mesure.recouvrementCartoucheCible, 'le cartouche ne doit pas recouvrir la cible active').toBe(0);
  expect(mesure.espaceScene, 'la scène doit utiliser l’espace vertical restant').toBeGreaterThanOrEqual(260);
  expect(mesure.cartoucheDansLaBarre, 'l’étape est dans la barre de consigne (T10)').toBe(true);
  expect(mesure.cartoucheAuDessusScene, 'l’étape est en haut, au-dessus du dessin (T10)').toBe(true);
  expect(mesure.reserveSousCartouche, 'les objets à choisir doivent suivre l’étape').toBe(true);

  // Le second cas réel de la fiche remet en jeu une zone haute (le toit) après le soleil.
  await moteur.locator('[data-element="soleil"]').click();
  await moteur.locator('[data-zone-cible="ciel"]').click();
  await expect(moteur).toHaveAttribute('data-consigne', 'c2');
  const apresSoleil = await mesurer('a-cote-du-banc');
  expect(apresSoleil.recouvrementCartoucheCible, 'après le soleil, le cartouche reste séparé de la cible').toBe(0);

  await moteur.locator('[data-element="ballon"]').click();
  await moteur.locator('[data-zone-cible="a-cote-du-banc"]').click();
  await expect(moteur).toHaveAttribute('data-consigne', 'c3');
  const avantOiseau = await mesurer('toit-ecole');
  expect(avantOiseau.recouvrementCartoucheCible, 'avant l’oiseau, le cartouche reste séparé du toit').toBe(0);

  if (process.env['PIERRE_CAPTURE_RESPONSIVE'] === '1') {
    await page.screenshot({
      path: resolve('bac-a-sable', 'place-maitresse-tablette-apres.png'),
      fullPage: false,
      scale: 'css',
    });
  }
});
