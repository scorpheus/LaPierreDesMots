/**
 * Captures de référence du nœud `colorie` — T4, annexe T § 4, contrat gelé § 8.1.
 *
 * Le contrat décrit la v1 comme « deux captures : scène entièrement grise, scène terminée ».
 * Ce fichier en produit **trois**, et l'écart est délibéré : dès que la dernière cible est
 * peinte, l'exercice s'achève et l'application passe à l'écran de récompense (contrat § 5.3,
 * « le passage est automatique, il n'existe aucune action valider »). Une capture prise à cet
 * instant photographierait une transition, donc serait instable. On capture donc :
 *
 *   1. `noeud-gris`        la scène entièrement grise, à l'ouverture ;
 *   2. `noeud-colorie`     la scène à une cible de la fin — c'est elle qui montre qu'une zone
 *                          grise est devenue colorée et qu'aucun contour n'a disparu ;
 *   3. `recompense-etoiles` l'écran de récompense, une fois l'exercice terminé.
 *
 * Stabilisation avant capture — annexe T § 4, dans cet ordre : animations à 0, graine fixée,
 * horloge figée, profil de fixture, puis `[data-test-pret="oui"]` qui vaut `document.fonts.ready`
 * résolu (contrat § 10) et « remplace toute attente de durée ». Aucun `waitForTimeout` ici.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// LE HARNAIS D’ISOLATION (lot P1) : un serveur neuf par cas — base `:memory:` vierge, `Alea`
// rembobiné, port réservé par le noyau. C’est lui qui remplace le `webServer` unique de
// `playwright.config.ts`, et c’est lui qui rend `fullyParallel` légitime.
import { expect, test } from '../harnais-serveur.js';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const NOEUD = 'clairiere-01';
const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

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

async function ouvrirLeNoeud(page: Page): Promise<void> {
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
  await page.evaluate(async (noeud) => (window as FenetreTest).__test.allerAuNoeud(noeud), NOEUD);
  await expect(page.locator('[data-test-pret="oui"]')).toBeVisible();
}

async function lireEtat(page: Page): Promise<EtatColorieLu> {
  return (await page.evaluate(
    () => (window as FenetreTest).__test.etat().etatMoteur
  )) as EtatColorieLu;
}

async function peindre(page: Page, region: string, couleur: string): Promise<void> {
  await page.evaluate(
    async (action) => (window as FenetreTest).__test.repondre(action),
    { type: 'choisirCouleur', couleur } as Record<string, unknown>
  );
  await page.evaluate(
    async (action) => (window as FenetreTest).__test.repondre(action),
    { type: 'peindre', region } as Record<string, unknown>
  );
}

/** Nombre total de cibles de l'exercice, lu depuis l'état initial du moteur. */
function nombreDeCibles(etat: EtatColorieLu): number {
  return etat.consignes.reduce((total, c) => total + c.ciblesRestantes.length, 0);
}

test.describe('captures du nœud colorie', () => {
  test('la scène est entièrement grise à l’ouverture', async ({ page }) => {
    await ouvrirLeNoeud(page);

    // L'assertion précède la capture : une image de référence ne prouve rien toute seule.
    expect(await page.locator('[data-region-svg][data-peinte="oui"]').count()).toBe(0);
    expect(await page.locator('[data-region-svg][data-peinte="non"]').count()).toBeGreaterThan(0);

    await expect(page.locator('[data-ecran="noeud"]')).toHaveScreenshot('noeud-gris.png');
  });

  test('la scène coloriée, à une cible de la fin', async ({ page }) => {
    await ouvrirLeNoeud(page);
    const total = nombreDeCibles(await lireEtat(page));
    expect(total).toBeGreaterThan(1);

    for (let peintes = 0; peintes < total - 1; peintes += 1) {
      const etat = await lireEtat(page);
      const cible = etat.consignes[etat.indexConsigne]?.ciblesRestantes[0];
      if (!cible) break;
      await peindre(page, cible.region, cible.couleur);
    }

    await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
    expect(await page.locator('[data-region-svg][data-peinte="oui"]').count()).toBe(total - 1);

    await expect(page.locator('[data-ecran="noeud"]')).toHaveScreenshot('noeud-colorie.png');
  });

  test('l’écran de récompense, exercice terminé', async ({ page }) => {
    await ouvrirLeNoeud(page);

    for (let tour = 0; tour < 64; tour += 1) {
      const etat = await lireEtat(page);
      const cible = etat.consignes[etat.indexConsigne]?.ciblesRestantes[0];
      if (!cible) break;
      await peindre(page, cible.region, cible.couleur);
    }

    await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
    await expect(page.locator('[data-fin="reussite"]')).toBeVisible();
    await expect(page.locator('[data-ecran="recompense"]')).toHaveScreenshot(
      'recompense-etoiles.png'
    );
  });
});
