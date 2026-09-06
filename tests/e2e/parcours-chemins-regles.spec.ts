import { resolve } from 'node:path';
import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud, noeudsLivres, deuxImages } from './qa-outils.js';
import { toucherPrise } from './gestes-dom.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

const fiches = noeudsLivres().filter((n) => n.moteur === 'chemin');
const dossier = resolve('bac-a-sable/attrape-chemins-2026-09-05');
for (const format of [{ width: 720, height: 1017 }, { width: 1080, height: 670 },
  { width: 390, height: 700 }, { width: 844, height: 340 }]) {
  for (const fiche of fiches) {
    test(`${fiche.id} — changements de règle et vrais touchers en ${format.width}×${format.height}`, async ({ page }) => {
      await page.setViewportSize(format);
      await appliquerReglagesLectureReels(page, 'CheminsAuDoigt');
      await entrerDansLeNoeud(page, fiche.id, 'CheminsAuDoigt');
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('img')].map((image) => image.decode()));
        await Promise.all([...document.querySelectorAll('svg image')].map(async (element) => {
          const image = new Image(); image.src = element.getAttribute('href')!; await image.decode();
        }));
        (window as unknown as { __test: { repondre: () => never } }).__test.repondre = () => {
          throw new Error('Les réponses doivent venir du toucher natif.');
        };
      });
      const reponse = await page.request.get(`/api/contenu/noeuds/${fiche.id}`);
      expect(reponse.ok()).toBe(true);
      const contenu = (await reponse.json()).exercice.jeu.contenu as {
        consignes: { id: string; depart: string; parcours: string[] }[];
      };
      const moteur = page.locator('[data-moteur="chemin"]');
      for (const [rang, consigne] of contenu.consignes.entries()) {
        await expect(moteur).toHaveAttribute('data-etape', consigne.id);
        const annonce = moteur.locator('[data-annonce="chemin"]');
        await annonce.scrollIntoViewIfNeeded();
        await expect(annonce).toContainText(`${rang + 1} / ${contenu.consignes.length}`);
        if (rang > 0) await expect(annonce).toContainText('Nouveau chemin');
        await expect(moteur.locator('[data-franchie="oui"]')).toHaveCount(0);
        if (fiche.id === 'galeries-08' && rang === 0) {
          await expect(moteur.locator('[data-case="pierre-robe"]')).toHaveCount(0);
        }
        if (fiche.id === 'volcan-05' && rang === 1) {
          for (const mot of ['montagne', 'ligne', 'signe', 'agneau']) {
            await expect(moteur.locator(`[data-case="case-${mot}"]`)).toHaveCount(0);
          }
          await expect(moteur.locator('[data-regle-courte]')).toHaveText('Pas le son de « fille »');
          await expect(moteur.locator('[data-grapheme-repere]')).toHaveText('ill');
        }
        await deuxImages(page);
        const panneau = moteur.locator('[data-message-chemin]');
        const avantAide = (await panneau.boundingBox())!.height;
        await toucherPrise(page.locator('[data-action="aide"]'));
        await expect(moteur.locator('[data-retour-chemin]')).toContainText('brille en bleu');
        await deuxImages(page);
        expect(Math.abs((await panneau.boundingBox())!.height - avantAide), 'aide sans rétrécir le plateau').toBeLessThanOrEqual(1);
        await annonce.scrollIntoViewIfNeeded();
        const geometrie = await moteur.evaluate((element) => {
          const panneau = element.querySelector('[data-message-chemin]')!.getBoundingClientRect();
          const plateau = element.querySelector('[data-plateau="cases"]')!.getBoundingClientRect();
          const cases = [...element.querySelectorAll('[data-case]')].map((c) => c.getBoundingClientRect());
          return { separes: panneau.bottom <= plateau.top + 1,
            deborde: document.documentElement.scrollWidth > innerWidth + 1,
            casesSousPanneau: cases.every((c) => c.top >= panneau.bottom - 1) };
        });
        expect(geometrie).toEqual({ separes: true, deborde: false, casesSousPanneau: true });
        if (format.width === 720 && ['volcan-05', 'galeries-08'].includes(fiche.id) && rang < 2) {
          await page.screenshot({ path: resolve(dossier, `${fiche.id}-chemin-${rang + 1}-tablette.png`), scale: 'css' });
        }
        for (const id of consigne.parcours) {
          const cible = moteur.locator(`[data-case="${id}"]`);
          await expect(cible).toHaveAttribute('data-atteignable', 'oui');
          await toucherPrise(page.locator('[data-action="aide"]'));
          await expect(cible).toHaveAttribute('data-aide-cible', 'oui');
          await toucherPrise(cible);
          await expect(moteur.locator('[data-aide-cible="oui"]')).toHaveCount(0);
        }
      }
      await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
    });
  }
}

test('volcan-01 — Attrape mélange les mots du catalogue', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1017 });
  await appliquerReglagesLectureReels(page, 'AttrapeMelange');
  await entrerDansLeNoeud(page, 'volcan-01', 'AttrapeMelange');
  const moteur = page.locator('[data-moteur="attrape"]');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('img')].map((image) => image.decode()));
  });
  const reponse = await page.request.get('/api/contenu/noeuds/volcan-01');
  const cibles = (await reponse.json()).exercice.jeu.contenu.cibles as { id: string }[];
  const ordreVisible = await moteur.locator('[data-cible]').evaluateAll((elements) => elements
    .map((e) => ({ id: e.getAttribute('data-cible'), r: e.getBoundingClientRect() }))
    .sort((a, b) => Math.abs(a.r.top - b.r.top) > 20 ? a.r.top - b.r.top : a.r.left - b.r.left)
    .map((c) => c.id));
  expect([...ordreVisible].sort()).toEqual(cibles.map((c) => c.id).sort());
  expect(ordreVisible).not.toEqual(cibles.map((c) => c.id));
  await deuxImages(page);
  await page.screenshot({ path: resolve(dossier, 'attrape-volcan-tablette.png'), scale: 'css' });
});

for (const format of [{ width: 720, height: 1017 }, { width: 1920, height: 1200 }]) {
  test(`volcan-09 — cheval et cochon mélangés, dessins contenus en ${format.width}×${format.height}`, async ({ page }) => {
    await page.setViewportSize(format);
    await appliquerReglagesLectureReels(page, 'AttrapeDessins');
    await entrerDansLeNoeud(page, 'volcan-09', 'AttrapeDessins');
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll('img')].map((image) => image.decode()));
    });
    await attendreGeometrieStable(page);
    const moteur = page.locator('[data-moteur="attrape"]');
    const reponse = await page.request.get('/api/contenu/noeuds/volcan-09');
    const cibles = (await reponse.json()).exercice.jeu.contenu.cibles as { id: string }[];
    await expect(moteur.locator('[data-cible]')).toHaveCount(14);
    const mesures = await moteur.locator('[data-cible]').evaluateAll((elements) => elements
      .map((element) => {
        const r = element.getBoundingClientRect();
        return { id: element.getAttribute('data-cible'), haut: r.top, bas: r.bottom, gauche: r.left, droite: r.right };
      }));
    const ordre = mesures.map((m) => m.id);
    expect([...ordre].sort()).toEqual(cibles.map((c) => c.id).sort());
    expect(ordre).not.toEqual(cibles.map((c) => c.id));
    expect(mesures.every((m) => m.gauche >= 0 && m.droite <= format.width)).toBe(true);
    expect(await moteur.evaluate((element) =>
      /auto|scroll/u.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 1),
    'la page défile, jamais une grille imbriquée sous le pied de page').toBe(false);
    if (format.width === 1920) {
      expect(mesures.every((m) => m.haut >= 0 && m.bas <= format.height), 'toutes les images accessibles sans débordement sur grand écran').toBe(true);
    }
    await page.screenshot({ path: resolve(dossier, `attrape-volcan-09-${format.width}.png`), scale: 'css', fullPage: true });
  });
}
