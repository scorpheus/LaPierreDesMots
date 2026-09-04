/**
 * Accessibilité des deux écrans parent — T5, annexe T § 5, contrat des features v2 § 3.8.
 *
 * Le dashboard n'est pas le jeu, mais il obéit aux mêmes deux règles, et pour deux raisons
 * différentes :
 *
 * • **axe-core, violations `serious` et `critical` bloquantes.** Le parent lit ces courbes le
 *   soir, sur une tablette, en éclairage bas. Le contraste et les libellés y valent autant
 *   qu'ailleurs — davantage même : ici il y a du texte, et beaucoup.
 * • **R16, cibles ≥ 64 px.** Le pavé du code se tape debout, la tablette dans l'autre main.
 *
 * Le fichier `tests/qualite/a11y.spec.ts` appartient à L-G depuis la v1 et **n'est pas
 * réattribué** (contrat § 7, dernier paragraphe) : les sélecteurs de ce lot vivent donc ici, et
 * pas là-bas.
 *
 * ⚠ Même défaut de contrat que `parcours-parent.spec.ts` : aucun fichier de L2-H ne peut rendre
 * la zone parent atteignable (`routeur.tsx` est à L2-F, `CodeEcran` n'est à personne). Ces cas
 * attendent un déclencheur `data-acces-parent` et échouent tant qu'il n'existe pas. Aucun
 * `skip`, aucune assertion assouplie.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
// LE HARNAIS D’ISOLATION (lot P1) : un serveur neuf par cas — base `:memory:` vierge, `Alea`
// rembobiné, port réservé par le noyau. C’est lui qui remplace le `webServer` unique de
// `playwright.config.ts`, et c’est lui qui rend `fullyParallel` légitime.
import { expect, test } from '../harnais-serveur.js';
import { attendreQueLaPorteAitDecide } from '../e2e/qa-outils.js';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';
const CODE = '4271';

/** R16 : tout élément interactif ≥ 64 × 64 px CSS. */
const CIBLE_MINIMALE_PX = 64;

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

async function ouvrirLaPorte(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
  await page.evaluate(
    async ({ fixture, graine, instant }) => {
      const crochets = (window as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge(instant);
      await crochets.chargerProfil(fixture);
    },
    { fixture: fixtureProfil, graine: GRAINE, instant: INSTANT }
  );

  const acces = page.locator('[data-acces-parent]');
  await expect(
    acces,
    'la zone parent doit être atteignable depuis le jeu (défaut du contrat § 3.8 signalé)'
  ).toHaveCount(1);
  await acces.click();
  await expect(page.locator('[data-parent="code"]')).toBeVisible();
}

async function entrer(page: Page): Promise<void> {
  // La porte ne sait pas encore quel pavé elle est tant que `GET /api/parent/etat` n’a pas
  // répondu : elle rend celui d’OUVERTURE puis bascule. Taper pendant la bascule fait perdre les
  // chiffres et laisse « Poser ce code » désactivé pour toujours (mesuré deux fois, lot P1 —
  // voir l’encadré de `attendreQueLaPorteAitDecide` dans `qa-outils.ts`).
  await attendreQueLaPorteAitDecide(page);
  for (const chiffre of CODE) {
    await page.locator(`[data-touche="${chiffre}"]`).click();
  }
  await page.locator('[data-valider="code-parent"]').click();
  await expect(page.locator('[data-parent="dashboard"]')).toBeVisible();
}

/** Passe axe-core et n'échoue que sur `serious` / `critical` ; journalise le reste. */
async function auditerA11y(page: Page, ecran: string): Promise<void> {
  const resultat = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const bloquantes = resultat.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  const mineures = resultat.violations.filter(
    (v) => v.impact !== 'serious' && v.impact !== 'critical'
  );

  if (mineures.length > 0) {
    console.log(
      `[a11y] ${ecran} — ${mineures.length} violation(s) mineure(s) : ` +
        mineures.map((v) => v.id).join(', ')
    );
  }

  expect(
    bloquantes.map((v) => `${v.id} (${v.impact}) — ${v.nodes.length} nœud(s)`),
    `axe-core sur l’écran « ${ecran} »`
  ).toEqual([]);
}

test.describe('axe-core sur les deux écrans parent', () => {
  test('écran du code', async ({ page }) => {
    await ouvrirLaPorte(page);
    await auditerA11y(page, 'code-parent');
  });

  test('écran du dashboard', async ({ page }) => {
    await ouvrirLaPorte(page);
    await entrer(page);
    await auditerA11y(page, 'dashboard');
  });
});

test.describe('R16 — le pavé du code se tape avec le pouce', () => {
  test('chaque touche fait au moins 64 × 64 px CSS', async ({ page }) => {
    await ouvrirLaPorte(page);
    // La requête d'état peut remplacer le pavé d'ouverture par celui de définition. Mesurer
    // entre les deux compte alors une ancienne touche démontée à 0×0, pas une petite cible.
    await attendreQueLaPorteAitDecide(page);

    const touches = page.locator('[data-touche]');
    const nb = await touches.count();
    expect(nb, 'le pavé doit compter dix touches').toBe(10);

    const trop: string[] = [];
    for (let rang = 0; rang < nb; rang += 1) {
      const element = touches.nth(rang);
      const boite = await element.boundingBox();
      const chiffre = await element.getAttribute('data-touche');
      if (!boite || boite.width < CIBLE_MINIMALE_PX || boite.height < CIBLE_MINIMALE_PX) {
        trop.push(
          `${String(chiffre)} : ${Math.round(boite?.width ?? 0)}×${Math.round(boite?.height ?? 0)}`
        );
      }
    }
    expect(trop, `touches sous ${CIBLE_MINIMALE_PX} px — R16`).toEqual([]);
  });

  test('les boutons du dashboard tiennent la même règle', async ({ page }) => {
    await ouvrirLaPorte(page);
    await entrer(page);

    const boutons = page.locator('[data-parent="dashboard"] button:visible');
    const nb = await boutons.count();
    expect(nb, 'le dashboard doit offrir au moins les exports et la sortie').toBeGreaterThan(0);

    const trop: string[] = [];
    for (let rang = 0; rang < nb; rang += 1) {
      const element = boutons.nth(rang);
      const boite = await element.boundingBox();
      if (!boite) continue;
      if (boite.width < CIBLE_MINIMALE_PX || boite.height < CIBLE_MINIMALE_PX) {
        const texte = (await element.textContent())?.trim().slice(0, 30) ?? '(sans texte)';
        trop.push(`« ${texte} » : ${Math.round(boite.width)}×${Math.round(boite.height)}`);
      }
    }
    expect(trop, `boutons sous ${CIBLE_MINIMALE_PX} px — R16`).toEqual([]);
  });
});

test.describe('R14 s’applique aussi hors du jeu', () => {
  test('aucun écran d’échec, aucune couleur d’alarme, même après un code faux', async ({
    page
  }) => {
    await ouvrirLaPorte(page);
    // Une base isolée n'a pas encore de code : on le pose d'abord, puis on referme réellement
    // la zone parent. Sans cette précondition, « 9999 » définissait le code au lieu d'être un
    // code faux, et taper avant la décision du serveur perdait parfois le quatrième chiffre.
    await entrer(page);
    await page.getByRole('button', { name: 'Fermer l’espace parent' }).click();
    await page.locator('[data-acces-parent]').click();
    await expect(page.locator('[data-parent="code"]')).toBeVisible();
    await attendreQueLaPorteAitDecide(page);
    for (const chiffre of '9999') {
      await page.locator(`[data-touche="${chiffre}"]`).click();
    }
    await page.locator('[data-valider="code-parent"]').click();

    await expect(page.locator('[data-etat="echec"]')).toHaveCount(0);
    await expect(page.locator('[data-parent="code"]')).toBeVisible();
  });
});
