/**
 * Accessibilité et tailles de cible — T5, annexe T § 5, contrat gelé § 8.1 et § 10.
 *
 * Deux mesures, toutes deux automatisables donc automatisées :
 *
 * 1. **axe-core sur les 4 écrans** — contraste, ordre de focus, rôles, libellés. Seules les
 *    violations `serious` et `critical` bloquent : une règle `minor` d'axe sur une application
 *    sans clavier ni lecteur d'écran ferait du bruit sans porter de risque pour l'enfant.
 *    Les violations mineures sont quand même listées dans le rapport.
 * 2. **R16, la règle maison de taille de cible** — tout élément portant `data-godet` ou
 *    `data-region-svg` présente une boîte d'au moins 64 × 64 px CSS (contrat § 10, dernier
 *    paragraphe). C'est ici que la règle est mesurée sur le rendu RÉEL ; le contrôle 6 de
 *    `test:contenu` n'en est que l'approximation statique, faite avant même que le navigateur
 *    n'existe.
 *
 * Le budget de bundle et l'absence de `window.__test` en production sont vérifiés par
 * `scripts/verifier-bundle.mjs`, que `npm run test:qualite` enchaîne après ce fichier.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const NOEUD = 'clairiere-01';
const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

/** R16 : tout élément interactif ≥ 64 × 64 px, avec 24 px de tolérance de dépôt. */
const CIBLE_MINIMALE_PX = 64;

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  repondre(action: unknown): Promise<void>;
  etat(): { readonly etatMoteur: unknown };
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

interface EtatColorieLu {
  readonly indexConsigne: number;
  readonly consignes: ReadonlyArray<{
    readonly ciblesRestantes: ReadonlyArray<{ readonly region: string; readonly couleur: string }>;
  }>;
}

async function preparer(page: Page): Promise<void> {
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
}

async function ouvrirLeNoeud(page: Page): Promise<void> {
  await page.evaluate(async (noeud) => (window as FenetreTest).__test.allerAuNoeud(noeud), NOEUD);
  await expect(page.locator('[data-test-pret="oui"]')).toBeVisible();
}

async function terminerLExercice(page: Page): Promise<void> {
  for (let tour = 0; tour < 64; tour += 1) {
    const etat = (await page.evaluate(
      () => (window as FenetreTest).__test.etat().etatMoteur
    )) as EtatColorieLu;
    const cible = etat.consignes[etat.indexConsigne]?.ciblesRestantes[0];
    if (!cible) break;
    await page.evaluate(
      async (action) => (window as FenetreTest).__test.repondre(action),
      { type: 'choisirCouleur', couleur: cible.couleur } as Record<string, unknown>
    );
    await page.evaluate(
      async (action) => (window as FenetreTest).__test.repondre(action),
      { type: 'peindre', region: cible.region } as Record<string, unknown>
    );
  }
  await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
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
    // Visible dans le rapport sans bloquer la chaîne.
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

test.describe('axe-core sur les quatre écrans', () => {
  test('écran des profils', async ({ page }) => {
    await preparer(page);
    await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
    await auditerA11y(page, 'profils');
  });

  test('écran de la carte', async ({ page }) => {
    await preparer(page);
    await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
    await auditerA11y(page, 'carte');
  });

  test('écran du nœud', async ({ page }) => {
    await preparer(page);
    await ouvrirLeNoeud(page);
    await auditerA11y(page, 'noeud');
  });

  test('écran de récompense', async ({ page }) => {
    await preparer(page);
    await ouvrirLeNoeud(page);
    await terminerLExercice(page);
    await auditerA11y(page, 'recompense');
  });
});

test.describe('R16 — tailles de cible sur le rendu réel', () => {
  test('chaque godet du nuancier fait au moins 64 × 64 px CSS', async ({ page }) => {
    await preparer(page);
    await ouvrirLeNoeud(page);

    const godets = page.locator('[data-godet]');
    const nb = await godets.count();
    expect(nb, 'le nuancier doit être rendu').toBeGreaterThan(0);

    const trop: string[] = [];
    for (let i = 0; i < nb; i += 1) {
      const element = godets.nth(i);
      const boite = await element.boundingBox();
      const couleur = await element.getAttribute('data-godet');
      if (!boite || boite.width < CIBLE_MINIMALE_PX || boite.height < CIBLE_MINIMALE_PX) {
        trop.push(`${couleur} : ${Math.round(boite?.width ?? 0)}×${Math.round(boite?.height ?? 0)}`);
      }
    }
    expect(trop, `godets sous ${CIBLE_MINIMALE_PX} px`).toEqual([]);
  });

  test('chaque région coloriable fait au moins 64 × 64 px CSS', async ({ page }) => {
    await preparer(page);
    await ouvrirLeNoeud(page);

    const regions = page.locator('[data-region-svg]');
    const nb = await regions.count();
    expect(nb, 'la scène doit être rendue').toBeGreaterThan(0);

    const trop: string[] = [];
    for (let i = 0; i < nb; i += 1) {
      const element = regions.nth(i);
      const boite = await element.boundingBox();
      const id = await element.getAttribute('data-region-svg');
      if (!boite || boite.width < CIBLE_MINIMALE_PX || boite.height < CIBLE_MINIMALE_PX) {
        trop.push(`${id} : ${Math.round(boite?.width ?? 0)}×${Math.round(boite?.height ?? 0)}`);
      }
    }
    expect(trop, `régions sous ${CIBLE_MINIMALE_PX} px — R16, contrat § 10`).toEqual([]);
  });

  test('chaque bouton visible fait au moins 64 × 64 px CSS', async ({ page }) => {
    await preparer(page);
    await ouvrirLeNoeud(page);

    const boutons = page.locator('button:visible, [role="button"]:visible');
    const nb = await boutons.count();
    const trop: string[] = [];
    for (let i = 0; i < nb; i += 1) {
      const element = boutons.nth(i);
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
