/**
 * R11 mesurée de bout en bout, dans le vrai navigateur — annexe T § 4 (« R11 25 interactions au
 * campement : comptage DOM `[data-interaction="libre"]`, ≥ 10 animations uniques, ≥ 6 répliques,
 * niveau T3 »). Lot L2-F.
 *
 * Ce fichier est le SEUL des trois qui mesure R11 sur l'application entière : le référentiel
 * servi par le vrai serveur, le décor chargé par le réseau local, le monde lu par la route de
 * L2-H. `campement-audit.test.ts` prouve le fichier, `EcranCampement.test.tsx` prouve le
 * composant, celui-ci prouve l'écran que l'enfant touchera.
 *
 * Deux règles de l'annexe T § 6 gouvernent chaque ligne :
 *   • on attend un ÉTAT, jamais une durée — aucun `waitForTimeout` ici ;
 *   • on ne cible QUE les attributs `data-*` du contrat § 7.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from './invariants.js';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

/** Les trois seuils de R11, recopiés du référentiel `partage/src/monde/campement.ts`. */
const R11_POINTS_MIN = 25;
const R11_ANIMATIONS_UNIQUES_MIN = 10;
const R11_REPLIQUES_MIN = 6;

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  repondre(action: unknown): Promise<void>;
  etat(): { readonly ecran: string };
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

/** Installe le profil et neutralise les trois sources de non-déterminisme (annexe T § 2.4). */
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

/** Le chemin de l'enfant : je choisis mon profil, je vois la carte, je vais au campement. */
async function allerAuCampement(page: Page): Promise<void> {
  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  await page.locator('[data-vers="campement"]').click();
  await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  // Le décor est chargé quand les points sont posés : on attend l'ÉTAT, pas une durée.
  await expect(page.locator('[data-interaction="libre"]').first()).toBeVisible();
}

test.describe('parcours campement — R11', () => {
  test('le campement offre au moins 25 interactions gratuites, 10 animations, 6 répliques', async ({
    page
  }) => {
    await preparer(page);
    await allerAuCampement(page);

    const points = await page.locator('[data-interaction="libre"]').count();
    const uniques = await page.locator('[data-animation-unique="oui"]').count();
    const repliques = await page.locator('[data-replique="oui"]').count();

    // Contrat de sortie de L2-F : les trois comptes sont IMPRIMÉS, pas seulement assertés.
    console.log(
      `[L2-F] E2E campement : points=${String(points)} animationsUniques=${String(uniques)} ` +
        `repliques=${String(repliques)}`
    );

    expect(points).toBeGreaterThanOrEqual(R11_POINTS_MIN);
    expect(uniques).toBeGreaterThanOrEqual(R11_ANIMATIONS_UNIQUES_MIN);
    expect(repliques).toBeGreaterThanOrEqual(R11_REPLIQUES_MIN);
  });

  test('chaque point tapé réagit, et aucun ne peut être raté — R14, R16', async ({ page }) => {
    await preparer(page);
    await allerAuCampement(page);

    const points = page.locator('[data-interaction="libre"]');
    const total = await points.count();

    for (let rang = 0; rang < total; rang += 1) {
      const point = points.nth(rang);

      // R16 : au moins 64 × 64 px CSS réellement rendus, mesuré et non supposé.
      const boite = await point.boundingBox();
      expect(boite, 'chaque point doit avoir une boîte rendue').not.toBeNull();
      expect(boite!.width).toBeGreaterThanOrEqual(64);
      expect(boite!.height).toBeGreaterThanOrEqual(64);

      await point.click();
      await expect(point).toHaveAttribute('data-reaction', 'reagit');
      // Jamais désactivé : on peut y revenir sans fin, sans coût.
      await expect(point).toBeEnabled();
    }

    // R14, la traduction mécanique : rien ne peut échouer au campement.
    expect(await page.locator('[data-etat="echec"]').count()).toBe(0);
  });

  test('Gobi porte son stade au campement, et la jauge montre le vide restant', async ({
    page
  }) => {
    await preparer(page);
    await allerAuCampement(page);

    const gobi = page.locator('[data-stade-gobi]');
    await expect(gobi.first()).toBeVisible();
    // Un profil neuf part de l'œuf. Le stade ne recule jamais ensuite (D28).
    await expect(gobi.first()).toHaveAttribute('data-stade-gobi', 'oeuf');

    const jauge = page.locator('[data-prochain-stade]');
    await expect(jauge).toBeVisible();
    const restantes = await jauge.getAttribute('data-formes-restantes');
    expect(Number(restantes)).toBeGreaterThan(0);
  });

  test('le coffre s’ouvre depuis le campement et n’enlève jamais rien', async ({ page }) => {
    await preparer(page);
    await allerAuCampement(page);

    await page.locator('[data-vers="coffre"]').click();
    await expect(page.locator('[data-ecran="coffre"]')).toBeVisible();

    // Les trois collections sont TOUJOURS montrées, y compris en creux : rien n'est caché.
    await expect(page.locator('[data-collection-titre="formes"]')).toBeVisible();
    await expect(page.locator('[data-collection-titre="eclats"]')).toBeVisible();
    await expect(page.locator('[data-collection-titre="objets"]')).toBeVisible();
    expect(await page.locator('[data-collection="eclat"]').count()).toBe(6);

    await page.locator('[data-vers="campement"]').click();
    await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
  });

  /**
   * ── CE CAS A CHANGÉ AVEC R25, ET SA PROPRIÉTÉ N'A PAS BOUGÉ ──────────────────────────────
   *
   * Il exigeait qu'après le tap on soit ENCORE au campement (`[data-chaudron="oui"]` visible).
   * C'était juste tant que le chaudron ne menait nulle part : `surOuvrirChaudron` n'était fourni
   * par aucun hôte et le composant retombait sur « Le chaudron mijote encore ».
   *
   * Le père a tranché : « le chaudron devrait fonctionner directement ». Rester sur place est
   * donc devenu le DÉFAUT, pas la garantie. Ce que ce cas protégeait — « une sortie de secours,
   * jamais un échec » — est intact et vérifié ci-dessous ; c'est la destination qui a changé.
   *
   * Le détail (le moteur atteint, l'absence de mot d'échec, la déclaration du contenu) vit dans
   * `parcours-chaudron.spec.ts`, qui a été vu ROUGE 4/4 avant la correction.
   */
  test('le chaudron reste une sortie de secours, jamais un échec', async ({ page }) => {
    await preparer(page);
    await allerAuCampement(page);

    await page.locator('[data-chaudron-entree="oui"]').click();

    // Il MÈNE quelque part — c'est R25.
    await expect(
      page.locator('[data-ecran="noeud"]'),
      'le chaudron ne mène nulle part : c’est le défaut que R25 a corrigé'
    ).toBeVisible();

    // Et il reste une sortie de secours — c'est la propriété d'origine, inchangée.
    expect(await page.locator('[data-etat="echec"]').count()).toBe(0);
  });

  test('aucun appel sortant depuis le campement — R10, R4', async ({ page }) => {
    const sortants: string[] = [];
    await page.route('**/*', async (route) => {
      const cible = new URL(route.request().url());
      if (cible.hostname !== '127.0.0.1' && cible.hostname !== 'localhost') {
        sortants.push(cible.href);
        await route.abort();
        return;
      }
      await route.continue();
    });

    await preparer(page);
    await allerAuCampement(page);

    expect(sortants, 'liste blanche vide : aucune requête hors du serveur local').toEqual([]);
  });
});
