import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud } from './qa-outils.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

// Retour du parent du 9 oct. (tableau, T09) : avec l'aide de Gobi et une erreur, les trois lignes
// du détail des étoiles sont les plus longues, et l'écran « Bravo » débordait en 1280×720.
// Mesure d'origine : 757 px pour 720 (bac-a-sable/socle/recompense-diagnostic.spec.ts).
for (const [width, height] of [[1280, 720], [1100, 700], [1366, 768], [800, 1100]] as const) {
  test(`récompense avec aide et erreur entière sans défilement ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await appliquerReglagesLectureReels(page, 'RecompenseAide');
    await entrerDansLeNoeud(page, 'clairiere-01', 'RecompenseAide');
    await page.evaluate(async () => {
      interface Crochets { repondre(a: unknown): Promise<void>; etat(): { ecran: string; etatMoteur: unknown } }
      interface EtatColorieLu { readonly indexConsigne: number; readonly consignes: ReadonlyArray<{
        readonly ciblesRestantes: ReadonlyArray<{ readonly region: string; readonly couleur: string }> }> }
      const crochets = (window as unknown as { __test: Crochets }).__test;
      await crochets.repondre({ type: 'demanderAide' });
      let erreurFaite = false;
      // Borne de sécurité, jamais une attente.
      for (let tour = 0; tour < 200; tour += 1) {
        const etat = crochets.etat();
        if (etat.ecran === 'recompense') return;
        const moteur = etat.etatMoteur as EtatColorieLu | null;
        const cible = moteur?.consignes[moteur.indexConsigne]?.ciblesRestantes[0];
        if (cible === undefined) return;
        if (!erreurFaite) {
          erreurFaite = true;
          await crochets.repondre({ type: 'choisirCouleur', couleur: cible.couleur === 'rouge' ? 'bleu' : 'rouge' });
          await crochets.repondre({ type: 'peindre', region: cible.region });
        }
        await crochets.repondre({ type: 'choisirCouleur', couleur: cible.couleur });
        await crochets.repondre({ type: 'peindre', region: cible.region });
      }
    });
    await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
    await expect(page.locator('[data-etoile-detail="2"]')).toHaveAttribute('data-acquise', 'non');
    await expect(page.locator('[data-etoile-detail="3"]')).toHaveAttribute('data-acquise', 'non');
    await attendreGeometrieStable(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
  });
}
