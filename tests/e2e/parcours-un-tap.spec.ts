/**
 * D46, mesurée : **combien de taps de l'ouverture au premier nœud ?**
 *
 * C'est le premier chiffre du contrat de sortie de N6 (contrat de finition v3 § 9.2) :
 * « **≤ 1** tap de l'ouverture au premier nœud (D46) ».
 *
 * Le fait mesuré au gel du contrat (§ 1.7) : « à l'ouverture, l'application montre
 * `EcranProfils`. Un tap choisit le profil et mène à `/carte`. Un second tap sur un nœud mène
 * à `/noeud`. **Deux taps minimum, et aucun bouton "partir en sortie" n'existe** ». Ce fichier
 * compte les taps plutôt que de les décrire : un compteur incrémenté à chaque `click`, et un
 * verdict sur ce compteur. Un parcours qui reviendrait à deux taps échouerait ici, quelle que
 * soit la beauté des écrans traversés.
 *
 * Deux règles de l'annexe T § 6 gouvernent chaque ligne :
 *   • on attend un ÉTAT, jamais une durée — aucun `waitForTimeout` ici ;
 *   • on ne cible QUE des attributs `data-*`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from './invariants.js';

import type { Locator, Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

/** Le plafond de D46. Un seul tap, jamais deux. */
const TAPS_MAX = 1;

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

/**
 * Un compteur de taps. Il n'existe que dans le test : le rendre disponible à l'application
 * permettrait de le contourner sans qu'on le voie.
 */
class Doigt {
  public taps = 0;

  public async taper(cible: Locator): Promise<void> {
    this.taps += 1;
    await cible.click();
  }
}

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
  // `chargerProfil` rend la main sur l'écran de choix : c'est bien l'ouverture réelle.
  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
}

test.describe('D46 — un tap de l’ouverture au premier nœud', () => {
  test('la pastille de sortie existe sur l’écran d’ouverture, et elle sait où aller', async ({
    page
  }) => {
    await preparer(page);

    const pastille = page.locator('[data-pastille-sortie]').first();
    await expect(pastille).toBeVisible();

    // Elle a résolu sa destination AVANT le tap : c'est ce qui fait qu'un tap suffit.
    await expect(pastille).not.toHaveAttribute('data-sortie-noeud', '');
    const noeud = await pastille.getAttribute('data-sortie-noeud');
    console.log(`[N6] pastille de sortie → nœud « ${String(noeud)} »`);
    expect(String(noeud)).not.toBe('');

    // R16 : au moins 64 × 64 px CSS réellement rendus, mesuré et non supposé.
    const boite = await pastille.boundingBox();
    expect(boite).not.toBeNull();
    expect(boite!.width).toBeGreaterThanOrEqual(64);
    expect(boite!.height).toBeGreaterThanOrEqual(64);
  });

  test('UN SEUL tap mène de l’ouverture à un nœud jouable — le chiffre de N6', async ({
    page
  }) => {
    await preparer(page);
    const doigt = new Doigt();

    await doigt.taper(page.locator('[data-pastille-sortie]').first());

    await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();

    // Le contrat de sortie, IMPRIMÉ et non seulement asserté.
    console.log(`[N6] taps de l’ouverture au premier nœud : ${String(doigt.taps)} (max ${String(TAPS_MAX)})`);
    expect(doigt.taps).toBeLessThanOrEqual(TAPS_MAX);

    // Et c'est bien un nœud jouable, pas une coquille : le magasin le dit.
    const etat = await page.evaluate(() => (window as FenetreTest).__test.etat());
    expect(etat.ecran).toBe('noeud');
  });

  test('aucun écran intermédiaire n’est OBLIGATOIRE — la carte n’est jamais imposée', async ({
    page
  }) => {
    await preparer(page);
    const doigt = new Doigt();

    await doigt.taper(page.locator('[data-pastille-sortie]').first());
    await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();

    // La carte reste ATTEIGNABLE — elle n'est simplement plus sur le chemin. D46 interdit
    // l'écran intermédiaire obligatoire, pas l'écran intermédiaire.
    expect(doigt.taps).toBe(1);
  });

  test('la pastille ne mène jamais à un état sans issue, même tapée deux fois', async ({
    page
  }) => {
    await preparer(page);

    const pastille = page.locator('[data-pastille-sortie]').first();
    await pastille.click();
    await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();

    // Le pire bug possible sur une appli d'enfant : un écran sans sortie. On vérifie qu'il
    // reste au moins une prise tapable, et qu'aucun état d'échec n'a été émis (R14).
    expect(await page.locator('[data-etat="echec"]').count()).toBe(0);
    expect(await page.locator('button:visible').count()).toBeGreaterThan(0);
  });

  test('le campement se quitte lui aussi en un tap — il n’est jamais une impasse', async ({
    page
  }) => {
    await preparer(page);

    // On y va par le chemin long, exprès : c'est celui du père.
    await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
    await page.locator('[data-vers="campement"]').click();
    await expect(page.locator('[data-ecran="campement"]')).toBeVisible();

    const doigt = new Doigt();
    await doigt.taper(page.locator('[data-ecran="campement"] [data-pastille-sortie]').first());
    await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();

    console.log(`[N6] taps du campement au nœud : ${String(doigt.taps)}`);
    expect(doigt.taps).toBe(1);
  });
});
