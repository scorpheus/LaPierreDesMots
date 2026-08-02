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
 * Ce fichier dérive son inventaire du CODE (`recettesDEcrans()` de `qa-outils.ts`). **Un écran
 * ajouté est audité sans que personne n'y pense.** C'est la seule chose qu'il apporte, et c'est
 * la raison pour laquelle il ne remplace pas les trois autres : eux vérifient des propriétés
 * fines par écran, lui garantit qu'aucun écran n'échappe au balayage.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUI A ÉTÉ CORRIGÉ ICI, ET C'ÉTAIT LE MÊME MENSONGE QUE DANS LA QA ───────────────────
 * Ce fichier faisait `page.goto(chemin)` pour chacune des routes de `CHEMINS`, puis lançait
 * axe-core. Or le routeur monte `createMemoryHistory` : un `goto` recharge l'application sur
 * `/`. Mesuré, les huit routes déclarées rendaient toutes `data-ecran=profils`.
 *
 * **Il auditait donc l'écran des profils sept fois** et publiait « 7 route(s) déclarée(s)
 * auditée(s) ». Le campement, le coffre, le dashboard, la galerie et l'ouverture n'ont jamais
 * vu passer axe-core, alors que le rapport disait le contraire — et c'est exactement le genre
 * de constat rassurant qui laisse un défaut d'accessibilité vivre des mois.
 *
 * Les écrans sont désormais atteints par les MÊMES recettes que la QA des parcours : en
 * tapant, comme l'enfant. Un seul inventaire, une seule façon d'y arriver, et la couverture
 * d'axe-core suit automatiquement celle de la QA.
 *
 * Le seuil est celui des trois fichiers existants, repris sans le rediscuter : les violations
 * `serious` et `critical` sont bloquantes ; les mineures sont imprimées, pas opposées.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { ecransDeclares, recettesDEcrans } from '../e2e/qa-outils.js';

const ECRANS = recettesDEcrans();
const ECRANS_DECLARES = ecransDeclares();

/** Les niveaux qui bloquent — mêmes que `a11y-parent.spec.ts` et `a11y-galerie.spec.ts`. */
const BLOQUANTS = new Set(['serious', 'critical']);

test.describe('QA a11y — chaque écran atteignable du site', () => {
  test.slow();

  const audites = new Set<string>();

  for (const ecran of ECRANS) {
    test(`« ${ecran.nom} » n’a aucune violation serious ni critical`, async ({ page }) => {
      await ecran.aller(page);
      // On VÉRIFIE qu'on est bien arrivé : auditer une page qui n'est pas celle qu'on croit
      // rendrait zéro violation pour la pire des raisons.
      await expect(
        page.locator(`[data-ecran="${ecran.attendu}"]`),
        `la recette « ${ecran.nom} » devait mener à data-ecran="${ecran.attendu}"`,
      ).toBeVisible();
      audites.add(ecran.attendu);

      const resultat = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const bloquantes = resultat.violations.filter((v) => BLOQUANTS.has(String(v.impact)));
      const mineures = resultat.violations.filter((v) => !BLOQUANTS.has(String(v.impact)));

      if (mineures.length > 0) {
        console.log(
          `[a11y ${ecran.nom}] ${String(mineures.length)} violation(s) mineure(s) : ` +
            mineures.map((v) => v.id).join(', '),
        );
      }

      expect(
        bloquantes.map((v) => `${v.id} (${String(v.impact)}) × ${String(v.nodes.length)}`),
        `violations bloquantes sur « ${ecran.nom} »`,
      ).toEqual([]);
    });
  }

  /**
   * CONTRAT DE SORTIE — le même que celui de la QA des parcours, et pour la même raison :
   * un audit qui ne dit pas ce qu'il a couvert ne prouve rien.
   */
  test('CONTRAT DE SORTIE a11y : les écrans audités, nommés', () => {
    const declares = [...ECRANS_DECLARES].sort();
    console.log(
      `[a11y] ${String(ECRANS.length)} recette(s) d'écran auditée(s) · ` +
        `${String(declares.length)} écran(s) déclaré(s) dans client/src`,
    );
    expect(ECRANS.length, 'l’inventaire des écrans est vide : rien n’aurait été audité')
      .toBeGreaterThanOrEqual(10);
  });
});
