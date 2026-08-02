/**
 * Accessibilité de la galerie parent et de l'écran de définition du code — T5, annexe T § 5,
 * lot N5, contrat de finition v3 § 4.5.
 *
 * `tests/qualite/a11y-parent.spec.ts` couvre les deux écrans de L2-H (le pavé du code et le
 * dashboard) et n'est PAS réattribué : les sélecteurs des écrans neufs de N5 vivent ici.
 *
 * Deux règles, et chacune a sa raison propre sur ces écrans-là :
 *
 * • **axe-core, violations `serious` et `critical` bloquantes.** La galerie est le seul écran
 *   du projet qui porte deux TABLEAUX de croisement. Un tableau sans en-têtes de ligne
 *   correctement associés n'est pas lisible au lecteur d'écran, et c'est précisément le genre
 *   de défaut qu'un coup d'œil ne voit pas.
 * • **R16, cibles ≥ 64 px.** Le parent lance un exercice depuis la tablette, debout, pour le
 *   montrer à l'enfant. Les boutons « Lancer » et les onglets sont des cibles comme les autres.
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

async function ouvrirLaPorte(page: Page): Promise<void> {
  await preparer(page);
  await page.locator('[data-acces-parent="oui"]').click();
  await expect(page.locator('[data-parent="code"]')).toBeVisible();
}

async function ouvrirLaGalerie(page: Page): Promise<void> {
  await ouvrirLaPorte(page);
  for (const chiffre of CODE) {
    await page.locator(`[data-touche="${chiffre}"]`).click();
  }
  await page.locator('[data-valider="code-parent"]').click();
  await expect(page.locator('[data-parent="dashboard"]')).toBeVisible();
  await page.locator('[data-onglet-parent="galerie"]').click();
  await expect(page.locator('[data-indicateur="galerie"]')).toBeVisible();
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

test.describe('axe-core sur les écrans neufs de N5', () => {
  test('la porte parent, quel que soit son mode', async ({ page }) => {
    await ouvrirLaPorte(page);
    const mode = (await page.locator('[data-parent="code"]').getAttribute('data-parent-mode')) ?? '';
    await auditerA11y(page, `porte parent (${mode})`);
  });

  test('la galerie d’exercices, tableaux compris', async ({ page }) => {
    await ouvrirLaGalerie(page);
    await auditerA11y(page, 'galerie parent');
  });
});

test.describe('R16 — la galerie se manipule avec le pouce', () => {
  test('chaque bouton « Lancer » fait au moins 64 × 64 px CSS', async ({ page }) => {
    await ouvrirLaGalerie(page);

    const boutons = page.locator('[data-galerie-lancer]');
    const nb = await boutons.count();
    expect(nb, 'une galerie vide ne prouverait rien sur R16').toBeGreaterThan(0);

    // Les cibles fautives sont NOMMÉES avec leurs dimensions : « 3 trop petites » n'aide
    // personne à corriger le bon bouton.
    const tropPetites: string[] = [];
    for (let rang = 0; rang < nb; rang += 1) {
      const bouton = boutons.nth(rang);
      const boite = await bouton.boundingBox();
      const id = (await bouton.getAttribute('data-galerie-lancer')) ?? '?';
      if (boite === null) {
        tropPetites.push(`${id} — invisible`);
        continue;
      }
      if (boite.width < CIBLE_MINIMALE_PX || boite.height < CIBLE_MINIMALE_PX) {
        tropPetites.push(
          `${id} — ${String(Math.round(boite.width))} × ${String(Math.round(boite.height))} px`
        );
      }
    }
    expect(tropPetites, `cibles sous ${String(CIBLE_MINIMALE_PX)} px`).toEqual([]);
  });

  /**
   * Les onglets sont NOMMÉS, plus comptés — et le cas en devient plus strict.
   *
   * Il affirmait `count() === 2`. Le lot H2 a livré un troisième onglet, « le profil » (ce que
   * l'enfant a réellement fait, et la remise à zéro) : le cas est donc devenu rouge sur un ajout
   * légitime, sans rien dire de ce qui avait changé.
   *
   * Un compte ne dit jamais LAQUELLE manque le jour où l'une disparaît — c'est le motif déjà
   * retenu dans `parcours-audit-tout-le-site.spec.ts` pour les départs de la carte. On exige donc
   * la LISTE exacte, dans l'ordre du rendu. Rien n'est assoupli : `toEqual` sur trois noms est
   * plus contraignant que `toBe(2)`, et la mesure R16 qui suit est inchangée.
   */
  test('les onglets de la zone parent aussi', async ({ page }) => {
    await ouvrirLaGalerie(page);

    const onglets = page.locator('[data-onglet-parent]');
    const nb = await onglets.count();
    const codes = await onglets.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-onglet-parent') ?? '?')
    );
    expect(codes, 'les onglets déclarés par EcranDashboard').toEqual([
      'suivi',
      'galerie',
      'profil'
    ]);

    const tropPetits: string[] = [];
    for (let rang = 0; rang < nb; rang += 1) {
      const onglet = onglets.nth(rang);
      const boite = await onglet.boundingBox();
      const code = (await onglet.getAttribute('data-onglet-parent')) ?? '?';
      if (boite === null || boite.height < CIBLE_MINIMALE_PX) {
        tropPetits.push(`${code} — ${boite === null ? 'invisible' : String(Math.round(boite.height))} px`);
      }
    }
    expect(tropPetits, `onglets sous ${String(CIBLE_MINIMALE_PX)} px de haut`).toEqual([]);
  });
});
