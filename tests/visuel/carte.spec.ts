/**
 * La carte du monde, en images — T4, annexe T § 4. Lot L2-F.
 *
 * « Région grise → région colorée, et ça reste après rechargement. » C'est la mécanique
 * signature du jeu (v2 § 3.2) photographiée sur l'écran signature (v2 § 9.4).
 *
 * TROIS CAPTURES, et l'ordre raconte l'histoire :
 *   1. `carte-voilee`  — un profil neuf : une région ouverte, cinq voilées de Grisaille ;
 *   2. `carte-eclat`   — après avoir terminé le seul nœud livré : la Clairière porte son Éclat,
 *                        deux régions se sont ouvertes, le chemin d'encre a avancé ;
 *   3. la persistance  — la même page RECHARGÉE rend exactement le même état.
 *
 * **L'assertion précède toujours la capture** : une image de référence ne prouve rien toute
 * seule, et `data-region-etat` est la seule prise du contrat § 7. Aucun `waitForTimeout` :
 * on attend un état.
 *
 * ⚠ Les trois images de référence n'existent pas encore. Elles se produisent en un passage
 * `npm run test:visuel -- --maj`, à faire par l'orchestrateur : un agent ne met jamais à jour
 * une référence de sa propre initiative (CLAUDE.md), mais en créer une qui n'existe pas n'est
 * pas une mise à jour.
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

/** Le geste de l'enfant : choisir son profil. Il emmène à la carte. */
async function ouvrirLaCarte(page: Page): Promise<void> {
  await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  // La carte est prête quand ses six régions portent leur état — jamais après une durée.
  await expect(page.locator('[data-region-etat]')).toHaveCount(6);
}

/** Termine l'unique nœud livré de la Clairière, cible par cible. */
async function terminerLeNoeud(page: Page): Promise<void> {
  await page.evaluate(async (noeud) => (window as FenetreTest).__test.allerAuNoeud(noeud), NOEUD);
  await expect(page.locator('[data-test-pret="oui"]')).toBeVisible();

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

/** Compte les régions dans chacun des trois états d'affichage. */
async function comptes(page: Page): Promise<Record<string, number>> {
  return {
    voilee: await page.locator('[data-region-etat="voilee"]').count(),
    ouverte: await page.locator('[data-region-etat="ouverte"]').count(),
    terminee: await page.locator('[data-region-etat="terminee"]').count()
  };
}

test.describe('la carte du monde', () => {
  // D38 — « Les deux régions sont ouvertes d'emblée », qui amende la v2 § 3.3
  // (`Docs/journal-des-decisions.md:740`). Ce cas exigeait « une ouverte, cinq voilées » :
  // il décrivait la règle abrogée. Le total reste vérifié à six par la somme des trois
  // comptes — c'est ce qui empêche de rendre le cas vert en perdant une région en route.
  test('un profil neuf : DEUX régions ouvertes, quatre voilées de Grisaille (D38)', async ({
    page
  }) => {
    await preparer(page);
    await ouvrirLaCarte(page);

    expect(await comptes(page)).toEqual({ voilee: 4, ouverte: 2, terminee: 0 });
    // Le voile est bien posé, et il n'intercepte pas le tap : la région reste atteignable.
    expect(await page.locator('[data-voile="grisaille"]').count()).toBeGreaterThan(0);

    await expect(page.locator('[data-ecran="carte"]')).toHaveScreenshot('carte-voilee.png');
  });

  test('après l’Éclat : la Clairière est terminée et deux régions s’ouvrent', async ({ page }) => {
    await preparer(page);
    await terminerLeNoeud(page);

    // On revient à la carte comme l'enfant le ferait : en rechargeant la borne et en
    // rechoisissant son profil. Ce détour prouve du même coup que rien n'a été perdu.
    await page.reload();
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    await preparer(page);
    await ouvrirLaCarte(page);

    await expect(page.locator('[data-region="clairiere"]')).toHaveAttribute(
      'data-region-etat',
      'terminee'
    );
    // D38 : la Clairière close, la fenêtre de deux régions glisse sur les suivantes.
    expect(await comptes(page)).toEqual({ voilee: 3, ouverte: 2, terminee: 1 });
    // Le chemin d'encre a avancé : une dérivée de la progression, jamais un état à part.
    const avancement = await page
      .locator('[data-chemin="encre"]')
      .getAttribute('data-chemin-avancement');
    expect(Number(avancement)).toBeGreaterThan(0);

    await expect(page.locator('[data-ecran="carte"]')).toHaveScreenshot('carte-eclat.png');
  });

  test('et ça reste : un second rechargement ne reprend rien (R14)', async ({ page }) => {
    await preparer(page);
    await terminerLeNoeud(page);

    await page.reload();
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    await preparer(page);
    await ouvrirLaCarte(page);
    const premier = await comptes(page);

    await page.reload();
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    await preparer(page);
    await ouvrirLaCarte(page);

    expect(await comptes(page)).toEqual(premier);
    await expect(page.locator('[data-region="clairiere"]')).toHaveAttribute(
      'data-region-etat',
      'terminee'
    );
  });
});
