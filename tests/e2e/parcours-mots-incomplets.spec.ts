import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud, etatDuJeu, deuxImages,
  fixtureProfil, noeudsLivres, preparer, choisirLeProfil } from './qa-outils.js';
import { jouerProchainGesteDom, toucherPrise } from './gestes-dom.js';

const fiches = noeudsLivres().filter((noeud) => noeud.moteur === 'grave');
const dossier = resolve('bac-a-sable/compagnon-mots-incomplets-2026-09-05');

async function attendreImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('img')].map((image) => image.decode()));
    await Promise.all([...document.querySelectorAll('svg image')].map(async (element) => {
      const image = new Image(); image.src = element.getAttribute('href')!; await image.decode();
    }));
  });
  await deuxImages(page);
}

for (const format of [{ width: 720, height: 1017 }, { width: 1080, height: 670 },
  { width: 390, height: 700 }, { width: 844, height: 340 }]) {
  for (const fiche of fiches) {
    test(`${fiche.id} : mots complets et clavier centré en ${format.width}×${format.height}`, async ({ page }) => {
      await page.setViewportSize(format);
      await appliquerReglagesLectureReels(page, 'MotsAuDoigt');
      await entrerDansLeNoeud(page, fiche.id, 'MotsAuDoigt');
      await attendreImages(page);
      const moteur = page.locator('[data-moteur="grave"]');
      await expect(page.locator('[data-consigne]:visible')).toContainText('Touche les lettres pour compléter le mot.');
      const consignes = await page.request.get(`/api/contenu/noeuds/${fiche.id}`)
        .then(async (reponse) => {
          expect(reponse.ok()).toBe(true);
          return (await reponse.json()).exercice.jeu.contenu.consignes as {
            id: string; mot: string; trous: { id: string; position: number; attendu: string }[];
          }[];
        });
      for (const [rang, consigne] of consignes.entries()) {
        await expect(moteur).toHaveAttribute('data-etape', consigne.id);
        // L'oracle indépendant sélectionne les positions absentes, puis lit les vrais glyphes.
        const absentes = new Set(consigne.trous.flatMap((trou) =>
          [...trou.attendu].map((_, index) => trou.position + index)));
        const attendu = [...consigne.mot].map((lettre, index) => absentes.has(index) ? '_' : lettre).join('');
        const mot = moteur.locator('[data-mot-central]');
        await expect.poll(async () => (await mot.locator('.syllabe').allTextContents()).join('')).toBe(attendu);
        await expect(moteur.locator('[data-plateau="etape-grave"]')).toContainText(`Modèle : ${consigne.mot}`);
        await mot.scrollIntoViewIfNeeded();
        const mesures = await moteur.evaluate((element) => {
          const mot = element.querySelector('[data-mot-central]')!.getBoundingClientRect();
          const clavier = element.querySelector('[data-plateau="clavier"]')!.getBoundingClientRect();
          const touches = [...element.querySelectorAll('[data-lettre]')].map((touche) => touche.getBoundingClientRect());
          const gauche = Math.min(...touches.map((r) => r.left));
          const droite = Math.max(...touches.map((r) => r.right));
          return { separes: mot.bottom <= clavier.top, decalage: Math.abs((gauche + droite) / 2 - (mot.left + mot.right) / 2),
            deborde: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        expect(mesures.separes).toBe(true);
        expect(mesures.decalage).toBeLessThanOrEqual(2);
        expect(mesures.deborde).toBe(false);
        if (rang === 0 && format.width === 720) {
          await page.screenshot({ path: resolve(dossier, `${fiche.id}-tablette.png`), scale: 'css' });
        }
        for (const trou of consigne.trous) await toucherPrise(moteur.locator(`[data-lettre="${trou.attendu}"]`));
      }
      await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
    });
  }
}

test('Roc choisi sur la carte accompagne les gestes réels puis la récompense', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1017 });
  await preparer(page);
  // Préparation d'un profil de TEST qui a rallié Roc ; aucune réponse du parcours n'est injectée.
  const progression = noeudsLivres().filter((noeud) => noeud.progression && /^(clairiere|galeries)-/.test(noeud.id))
    .map((noeud) => ({ noeud: noeud.id, etoiles: 3 }));
  await page.evaluate(async ({ fixture, progression }) => {
    const crochets = (window as unknown as { __test: { chargerProfil(f: unknown): Promise<void> } }).__test;
    await crochets.chargerProfil({ ...fixture, progression });
  }, { fixture: fixtureProfil, progression });
  await choisirLeProfil(page);
  await toucherPrise(page.locator('[data-depart="marais-jumeau"]'));
  await toucherPrise(page.locator('[data-choisir-compagnon="roc"]'));
  await expect(page.locator('[data-choisir-compagnon="roc"]')).toHaveAttribute('aria-pressed', 'true');
  await toucherPrise(page.locator('[data-confirmer-depart]'));
  await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
  await expect(page.locator('[data-action="aide"]')).toContainText('Roc');
  await page.evaluate(() => {
    (window as unknown as { __test: { repondre: () => never } }).__test.repondre = () => {
      throw new Error('Seuls les touchers réels sont autorisés dans ce parcours.');
    };
  });
  for (let tour = 0; tour < 100; tour += 1) {
    if (await page.locator('[data-ecran="recompense"]').count() > 0) break;
    const courant = await etatDuJeu(page);
    if ((courant.etatMoteur as { termineMs: number | null }).termineMs !== null) break;
    await jouerProchainGesteDom(page, String(courant.moteur), tour);
  }
  const resultat = page.locator('[data-compagnon-recompense="roc"]');
  await expect(resultat).toBeVisible();
  await expect(resultat.locator('[data-compagnon-sprite="roc"]')).toBeVisible();
  await expect(page.locator('[data-scene-recompense="gobi-joie"]')).toHaveCount(0);
  await attendreImages(page);
  await page.screenshot({ path: resolve(dossier, 'roc-resultat-tablette.png'), scale: 'css' });
});
