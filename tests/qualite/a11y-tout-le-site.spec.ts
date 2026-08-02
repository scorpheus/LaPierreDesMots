/**
 * QA — AUDIT D'ACCESSIBILITÉ SUR CHAQUE ÉCRAN, pas seulement sur l'accueil.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER S'AJOUTE À `a11y.spec.ts`, `a11y-parent.spec.ts` ET `a11y-galerie.spec.ts`
 *
 * Les trois fichiers existants auditent un écran chacun, nommément. Ils sont bons et ils
 * restent — mais ils partagent la faiblesse de toute liste écrite à la main : l'écran ajouté
 * demain n'y est pas, et personne ne s'en apercevra.
 *
 * Ce fichier dérive son inventaire de la table `CHEMINS` du routeur (voir `qa-outils.ts`).
 * **Une route ajoutée est auditée sans que personne n'y pense.** C'est la seule chose qu'il
 * apporte, et c'est la raison pour laquelle il ne remplace pas les trois autres : eux
 * vérifient des propriétés fines par écran, lui garantit qu'aucun écran n'échappe au balayage.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Le seuil est celui des trois fichiers existants, repris sans le rediscuter : les violations
 * `serious` et `critical` sont bloquantes ; les mineures sont imprimées, pas opposées.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { cheminsDuRouteur, preparer } from '../e2e/qa-outils.js';

const CHEMINS = cheminsDuRouteur();

/** Les niveaux qui bloquent — mêmes que `a11y-parent.spec.ts` et `a11y-galerie.spec.ts`. */
const BLOQUANTS = new Set(['serious', 'critical']);

test.describe('QA a11y — chaque route déclarée du site', () => {
  test.slow();

  for (const [cle, chemin] of CHEMINS) {
    test(`« ${cle} » (${chemin}) n’a aucune violation serious ni critical`, async ({ page }) => {
      await preparer(page);
      await page.goto(chemin);
      // Un écran doit être rendu : auditer une page blanche ne rendrait aucune violation et
      // le cas serait vert pour la pire des raisons.
      await expect(
        page.locator('[data-ecran]'),
        `la route ${chemin} ne rend aucun écran — l'audit a11y porterait sur du vide`,
      ).toBeVisible();

      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const bloquantes = resultat.violations.filter((v) => BLOQUANTS.has(String(v.impact)));
      const mineures = resultat.violations.filter((v) => !BLOQUANTS.has(String(v.impact)));

      if (mineures.length > 0) {
        console.log(
          `[a11y ${cle}] ${String(mineures.length)} violation(s) mineure(s) : ` +
            mineures.map((v) => v.id).join(', '),
        );
      }

      expect(
        bloquantes.map((v) => `${v.id} (${String(v.impact)}) × ${String(v.nodes.length)}`),
        `violations bloquantes sur ${chemin}`,
      ).toEqual([]);
    });
  }

  test('CONTRAT DE SORTIE : toutes les routes de CHEMINS ont été auditées', () => {
    console.log(`[a11y] ${String(CHEMINS.size)} route(s) déclarée(s) auditée(s)`);
    expect(CHEMINS.size, 'l’inventaire des routes est vide : rien n’aurait été audité').toBeGreaterThan(
      0,
    );
  });
});
