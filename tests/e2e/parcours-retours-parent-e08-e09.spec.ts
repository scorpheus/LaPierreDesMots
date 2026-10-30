/**
 * Retours du parent du 9 octobre 2026 — E08 (`clairiere-08`, chemin) points 2 à 5, et E09
 * (`clairiere-09`, histoire) mise en page. Docs/tableau-retours.md, lignes E08, E09, T19.
 * Détail : Docs/socle-questions-et-lecture-2026-10-09.md.
 *
 * Tout est MESURÉ après rendu (boîtes et styles calculés, polices chargées), aux réglages de
 * lecture réels de la tablette (Andika 27 px, interligne 2).
 */
import type { Page } from '@playwright/test';

import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud } from './qa-outils.js';

/** Le bleu « lagon » de la palette, celui de l'indice de Gobi (chemin.css). */
const LAGON = 'rgb(47, 168, 224)';

async function ouvrir(page: Page, noeud: string, largeur: number, hauteur: number): Promise<void> {
  await page.setViewportSize({ width: largeur, height: hauteur });
  await appliquerReglagesLectureReels(page, 'Retours');
  await entrerDansLeNoeud(page, noeud, 'Retours');
  await page.evaluate(async () => document.fonts.ready);
}

test.describe('E08 — les lianes des voyelles (chemin)', () => {
  test('2) la notice du haut : thème question, une seule taille de police', async ({ page }) => {
    await ouvrir(page, 'clairiere-08', 1280, 720);
    const notice = page.locator('[data-message-chemin="oui"]');
    await expect(notice).toHaveAttribute('data-theme-role', 'question');
    const tailles = await notice.evaluate((n) => [...new Set([n, ...n.querySelectorAll('*')]
      .filter((e) => e.getBoundingClientRect().width > 0 && e.closest('.sr-only') === null
        && [...e.childNodes].some((t) => t.nodeType === Node.TEXT_NODE && /\p{L}/u.test(t.textContent ?? '')))
      .map((e) => getComputedStyle(e).fontSize))]);
    expect(tailles, 'une seule taille de police dans la notice').toHaveLength(1);
  });

  test('3) la case de départ n’est ni grisée ni transparente, et dit « Départ »', async ({ page }) => {
    await ouvrir(page, 'clairiere-08', 1280, 720);
    const depart = page.locator('[data-case="depart-arbre"]');
    await expect(depart).toHaveAttribute('data-pion', 'oui');
    expect(await depart.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
    await expect(depart.locator('[data-depart="oui"]')).toBeVisible();
    await expect(depart.locator('[data-depart="oui"]')).toHaveText('Départ');
  });

  test('4) aucune mise en valeur ne désigne la réponse : la lettre n’a pas la couleur de l’indice', async ({ page }) => {
    await ouvrir(page, 'clairiere-08', 1280, 720);
    // À l'ouverture, les quatre premiers choix sont habillés à l'identique.
    const styles = await page.locator('[data-case][data-atteignable="oui"]').evaluateAll((cases) => cases.map((c) => {
      const s = getComputedStyle(c);
      return [s.backgroundColor, s.borderColor, s.boxShadow, s.color, s.opacity].join(' | ');
    }));
    expect(styles.length).toBe(4);
    expect(new Set(styles).size, 'les choix possibles se ressemblent tous').toBe(1);
    // La marque de la lettre cible n'est pas du bleu de l'indice (« une case possible brille en
    // bleu ») : sinon « a » bleu + « chat » bleu se lit comme une règle de couleur.
    const marque = await page.locator('[data-grapheme-repere]').evaluate((e) => {
      const s = getComputedStyle(e);
      return [s.color, s.textDecorationColor, s.backgroundColor];
    });
    expect(marque).not.toContain(LAGON);
  });

  test('5) changer de lettre et revenir au départ se voit nettement', async ({ page }) => {
    await ouvrir(page, 'clairiere-08', 1280, 720);
    const notice = page.locator('[data-message-chemin="oui"]');
    await expect(notice).toHaveAttribute('data-nouvelle-etape', 'non');
    for (const c of ['case-chat', 'case-papa', 'case-lac']) await page.locator(`[data-case="${c}"]`).click();
    await expect(page.locator('[data-regle-courte]')).toHaveText('Avec la lettre i');
    await expect(page.locator('[data-case="depart-arbre"]')).toHaveAttribute('data-pion', 'oui');
    // Le cadre de la notice s'allume (comme le repère d'étape), le texte ne bouge pas.
    await expect(notice).toHaveAttribute('data-nouvelle-etape', 'oui');
    await expect(page.locator('[data-case="depart-arbre"] [data-depart="oui"]')).toBeVisible();
    // Il reste allumé jusqu'au toucher suivant.
    await page.locator('[data-case="case-lit"]').click();
    await expect(notice).toHaveAttribute('data-nouvelle-etape', 'non');
  });
});

for (const [largeur, hauteur] of [[1280, 720], [800, 1100]] as const) {
  test(`E09 — la veillée (histoire) en ${String(largeur)}×${String(hauteur)} : récit centré pleine largeur, question au thème, réponses à côté de la question`, async ({ page }) => {
    await ouvrir(page, 'clairiere-09', largeur, hauteur);
    const m = await page.evaluate(() => {
      const boite = (s: string): DOMRect => document.querySelector(s)!.getBoundingClientRect();
      const scene = boite('[data-moteur="histoire"] .disposition-moteur__scene');
      const recit = boite('[data-plateau="recit"]');
      const question = boite('[data-plateau="etape-histoire"]');
      const options = [...document.querySelectorAll('[data-option]')].map((o) => o.getBoundingClientRect());
      const decor = boite('.histoire__decor');
      const corps = getComputedStyle(document.querySelector('[data-plateau="recit"] .ligne-lecture')!).fontSize;
      return {
        recitLargeur: recit.width / scene.width,
        recitCentrage: Math.abs((recit.left - scene.left) - (scene.right - recit.right)),
        questionRole: document.querySelector('[data-plateau="etape-histoire"]')!.getAttribute('data-theme-role'),
        ecartQuestionOptions: Math.min(...options.map((o) => o.top)) - question.bottom,
        optionsSurLeDecor: options.filter((o) => o.left < decor.right && o.right > decor.left && o.top < decor.bottom && o.bottom > decor.top).length,
        corps,
      };
    });
    expect(m.recitLargeur, 'le récit prend toute la largeur utile').toBeGreaterThan(0.95);
    expect(m.recitCentrage, 'le récit est centré').toBeLessThanOrEqual(2);
    expect(m.corps, 'la taille de lecture du profil n’est jamais réduite').toBe('27px');
    expect(m.questionRole).toBe('question');
    // Les réponses suivent la question, juste dessous, et jamais sur le dessin.
    expect(m.ecartQuestionOptions).toBeGreaterThanOrEqual(0);
    expect(m.ecartQuestionOptions).toBeLessThan(40);
    expect(m.optionsSurLeDecor).toBe(0);
  });
}
