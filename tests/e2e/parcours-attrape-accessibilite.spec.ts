import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud, noeudsLivres, deuxImages } from './qa-outils.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

const fiches = noeudsLivres().filter((fiche) => fiche.moteur === 'attrape');
for (const format of [{ width: 720, height: 1017 }, { width: 1080, height: 670 },
  { width: 390, height: 700 }, { width: 844, height: 340 }, { width: 1920, height: 1200 }]) {
  for (const fiche of fiches) {
    test(`${fiche.id} — toute la grille accessible sans sous-scroll en ${format.width}×${format.height}`, async ({ page }) => {
      await page.setViewportSize(format);
      await appliquerReglagesLectureReels(page, 'AttrapeAccessible');
      await entrerDansLeNoeud(page, fiche.id, 'AttrapeAccessible');
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('img')].map((image) => image.decode()));
      });
      await attendreGeometrieStable(page);
      const moteur = page.locator('[data-moteur="attrape"]');
      const reponse = await page.request.get(`/api/contenu/noeuds/${fiche.id}`);
      const cibles = (await reponse.json()).exercice.jeu.contenu.cibles as { id: string }[];
      await expect(moteur.locator('[data-cible]')).toHaveCount(cibles.length);
      const sousScrolls = await moteur.evaluate((element) => {
        const resultat: string[] = [];
        let parent: HTMLElement | null = element;
        while (parent !== null && parent !== document.body) {
          if (/auto|scroll/u.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 1) {
            resultat.push(parent.outerHTML.slice(0, 180));
          }
          parent = parent.parentElement;
        }
        return resultat;
      });
      expect(sousScrolls, 'seul le document peut défiler').toEqual([]);
      for (const cible of cibles) {
        const bouton = moteur.locator(`[data-cible="${cible.id}"]`);
        await bouton.scrollIntoViewIfNeeded();
        await deuxImages(page);
        const mesure = await bouton.evaluate((element) => {
          const r = element.getBoundingClientRect();
          const x = (r.left + r.right) / 2;
          const y = (r.top + r.bottom) / 2;
          const points = [[x, r.top + 8], [x, r.bottom - 8], [r.left + 8, y], [r.right - 8, y]].map(([px, py]) => ({
            touche: element.contains(document.elementFromPoint(px!, py!)),
            sousDoigt: document.elementFromPoint(px!, py!)?.outerHTML.slice(0, 180),
          }));
          return { cadre: r.toJSON(), points, accessible:
            r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1 && points.every((point) => point.touche) };
        });
        expect(mesure.accessible, `${cible.id} entièrement visible et touchable, pas derrière Gobi : ${JSON.stringify(mesure)}`).toBe(true);
      }
    });
  }
}
