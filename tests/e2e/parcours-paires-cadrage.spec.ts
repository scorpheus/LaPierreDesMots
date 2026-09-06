import { resolve } from 'node:path';
import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, choisirLeProfil, etatDuJeu, noeudsLivres } from './qa-outils.js';
import type { PlanSortie, EtatPaires } from '@pierre/partage';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

test.use({ isMobile: true, hasTouch: true });
const fiches = noeudsLivres().filter((fiche) => fiche.moteur === 'paires');
const formats = [
  { width: 800, height: 1100 }, { width: 720, height: 1017 },
  { width: 1100, height: 700 }, { width: 1017, height: 640 },
];

for (const format of formats) for (const fiche of fiches) {
  test(`${fiche.id} — plateau entier sans scroll en ${format.width}×${format.height}`, async ({ page }) => {
    await page.setViewportSize(format);
    await appliquerReglagesLectureReels(page, 'PairesCadrees');
    // Fixture de navigation : ouvrir le plateau demandé dans une vraie sortie, avec son
    // en-tête « Exercice 1 sur … ». Aucun changement du DOM ni de l'état de jeu après rendu.
    await page.route('**/api/profils/*/sortie', async (route) => {
      const reponse = await route.fetch();
      const plan = await reponse.json() as PlanSortie;
      await route.fulfill({ response: reponse, json: { ...plan,
        etapes: plan.etapes.map((etape) => ({ ...etape, noeud: fiche.id })),
      } });
    });
    await choisirLeProfil(page, 'PairesCadrees');
    await page.locator('[data-depart="clairiere"]').click();
    await page.locator('[data-confirmer-depart]').click();
    await expect(page.locator('[data-ecran="noeud"]')).toHaveAttribute('data-test-pret', 'oui');
    await expect(page.locator('[data-progression-sortie]')).toContainText('Exercice 1 sur');
    await expect(page.getByText('Trouve les paires.', { exact: true })).toHaveCount(1);
    await expect(page.locator('[data-moteur="paires"]')).toBeVisible();
    await attendreGeometrieStable(page);
    await test.info().attach('composition', { contentType: 'application/json', body: JSON.stringify(await page.locator('main, .barre-consigne, .scene-noeud, [data-cartouche-paires], [data-plateau], .gobi, .gobi-bulle').evaluateAll((elements) => elements.map((element) => ({
      nom: element.className || element.getAttribute('data-plateau') || element.tagName,
      rectangle: element.getBoundingClientRect().toJSON(),
      police: getComputedStyle(element).fontSize,
    })))) });
    const mesurerDefauts = () => page.locator('[data-carte], [data-action="aide"], [data-vers="carte"]').evaluateAll((prises) => {
      const resultat: string[] = [];
      for (const prise of prises) {
        const r = prise.getBoundingClientRect();
        const nom = prise.getAttribute('aria-label') ?? prise.textContent;
        if (r.top < 0 || r.left < 0 || r.bottom > document.documentElement.clientHeight + 1 || r.right > document.documentElement.clientWidth + 1) {
          resultat.push(`${nom} hors écran : ${JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height })}`);
        }
        if (r.width < 64 || r.height < 64) resultat.push(`${nom} trop petit pour le doigt`);
        if (prise.scrollWidth > prise.clientWidth + 1 || prise.scrollHeight > prise.clientHeight + 1) resultat.push(`${nom} tronqué`);
        if (!prise.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))) resultat.push(`${nom} masqué`);
      }
      return resultat;
    });
    expect(await mesurerDefauts(), 'toutes les cartes et les commandes doivent être présentes ensemble, sans scrollIntoView').toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight)).toBeLessThanOrEqual(1);
    await expect(page.locator('[data-carte]')).toHaveCount(((await etatDuJeu(page)).etatMoteur as EtatPaires).cartes.length);
    const geometrie = () => page.locator('[data-carte]').evaluateAll((cartes) => cartes.map((carte) => carte.getBoundingClientRect().toJSON()));
    const avant = await geometrie();
    await expect(page.locator('[data-carte]').first()).toHaveCSS('font-size', '27px');
    const cible = avant[0]!;
    await page.touchscreen.tap(cible.x + cible.width / 2, cible.y + cible.height / 2);
    await expect(page.locator('[data-carte]').first()).toHaveAttribute('data-retournee', 'oui');
    await attendreGeometrieStable(page);
    expect(await geometrie(), 'sélectionner ne déplace ni ne grossit les cartes').toEqual(avant);
    if (fiche.id === 'cite-des-histoires-02') {
      await page.screenshot({ path: resolve(`bac-a-sable/paires-plein-ecran-2026-09-06/paires-${format.width}x${format.height}.png`), scale: 'css' });
    }
    const etat = (await etatDuJeu(page)).etatMoteur as EtatPaires;
    const carte = etat.cartes.find((candidate) => candidate.id === etat.carteRetournee)!;
    const partenaire = etat.cartes.find((candidate) => candidate.paire === carte.paire && candidate.id !== carte.id)!;
    const cadrePartenaire = (await page.locator(`[data-carte="${partenaire.id}"]`).boundingBox())!;
    await page.touchscreen.tap(cadrePartenaire.x + cadrePartenaire.width / 2, cadrePartenaire.y + cadrePartenaire.height / 2);
    await expect(page.locator('[data-appariee="oui"]')).toHaveCount(2);
    await attendreGeometrieStable(page);
    expect(await geometrie(), 'trouver une paire conserve ses deux cartes à la même place').toEqual(avant);
    expect(await mesurerDefauts()).toEqual([]);
    const rotation = formats[(formats.indexOf(format) + 2) % formats.length]!;
    await page.setViewportSize(rotation);
    await attendreGeometrieStable(page);
    expect(await mesurerDefauts(), 'le changement d’orientation ne masque aucune carte').toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight)).toBeLessThanOrEqual(1);
    await expect(page.locator('[data-appariee="oui"]')).toHaveCount(2);
    await page.setViewportSize(format);
    await attendreGeometrieStable(page);
    expect(await geometrie(), 'revenir au format initial retrouve les mêmes positions').toEqual(avant);
  });
}
