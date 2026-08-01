/**
 * Le parcours de la v1, de bout en bout — annexe T § T3, contrat gelé § 8.1.
 *
 * On arrive, on choisit un profil, on joue LE nœud `colorie` avec les doigts (pas avec
 * `repondre`), une zone grise devient colorée, on obtient trois étoiles, et **ça reste après
 * rechargement**.
 *
 * Deux règles de l'annexe T § 6 gouvernent chaque ligne de ce fichier :
 *   • on attend un ÉTAT, jamais une durée — aucun `waitForTimeout` ici ;
 *   • on ne cible QUE les attributs `data-*` du contrat § 10.
 *
 * La navigation carte → nœud passe par `window.__test.allerAuNoeud()` et non par un clic : le
 * contrat § 10 ne définit aucun attribut de nœud sur la carte, et L-G s'interdit d'en inventer
 * un. Point signalé dans le rapport de L-G.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';
const NOEUD = 'clairiere-01';

/**
 * `window.__test`, vu depuis les tests. C'est la surface du contrat § 7.1, redéclarée ici
 * parce que `client/src/types-globaux.d.ts` (L-D) n'est pas dans le périmètre de compilation
 * de Playwright. Toute divergence avec le contrat serait un défaut de ce fichier.
 */
interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  repondre(action: unknown): Promise<void>;
  etat(): {
    readonly ecran: string;
    readonly etatMoteur: unknown;
    readonly aide: { readonly niveau: string } | null;
  };
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

/** Forme minimale de l'état du moteur `colorie` telle que la lit ce test. */
interface EtatColorieLu {
  readonly indexConsigne: number;
  readonly consignes: ReadonlyArray<{
    readonly id: string;
    readonly ciblesRestantes: ReadonlyArray<{ readonly region: string; readonly couleur: string }>;
  }>;
  readonly remplissages: Readonly<Record<string, string>>;
}

/**
 * Installe le profil de fixture et neutralise les trois sources de non-déterminisme
 * (animations, hasard, temps) — annexe T § 2.4.
 */
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

async function etatMoteur(page: Page): Promise<EtatColorieLu> {
  return (await page.evaluate(
    () => (window as FenetreTest).__test.etat().etatMoteur
  )) as EtatColorieLu;
}

async function entrerDansLeNoeud(page: Page): Promise<void> {
  await page.evaluate(
    async (noeud) => (window as FenetreTest).__test.allerAuNoeud(noeud),
    NOEUD
  );
  await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
  await expect(page.locator('[data-test-pret="oui"]')).toBeVisible();
}

test.describe('parcours nominal', () => {
  test('un profil, un nœud, une scène coloriée, trois étoiles, et ça reste', async ({ page }) => {
    await preparer(page);

    // ── on arrive sur l'écran des profils, et le profil chargé y est visible
    await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
    const carteProfil = page.getByText(String(fixtureProfil['prenom']), { exact: false }).first();
    await expect(carteProfil).toBeVisible();

    // ── on choisit le profil du doigt
    await carteProfil.click();
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();

    // ── on entre dans le nœud
    await entrerDansLeNoeud(page);

    // ── la scène est entièrement grise au départ
    const nbRegions = await page.locator('[data-region-svg]').count();
    expect(nbRegions).toBeGreaterThan(0);
    expect(await page.locator('[data-region-svg][data-peinte="oui"]').count()).toBe(0);

    // ── on peint, du doigt, en suivant les consignes
    let premiereRegionPeinte: string | null = null;
    for (let tour = 0; tour < 64; tour += 1) {
      if (await page.locator('[data-ecran="recompense"]').isVisible()) break;
      const etat = await etatMoteur(page);
      const cible = etat.consignes[etat.indexConsigne]?.ciblesRestantes[0];
      if (!cible) break;

      const godet = page.locator(`[data-godet="${cible.couleur}"]`);
      await godet.click();
      await expect(godet).toHaveAttribute('data-choisie', 'oui');

      const region = page.locator(`[data-region-svg="${cible.region}"]`);
      await region.click();
      await expect(region).toHaveAttribute('data-peinte', 'oui');
      await expect(region).toHaveAttribute('data-couleur', cible.couleur);
      premiereRegionPeinte ??= cible.region;

      // Aucun échec n'apparaît jamais, même en jouant juste — R14.
      expect(await page.locator('[data-etat="echec"]').count()).toBe(0);
    }

    expect(premiereRegionPeinte, 'au moins une zone grise doit être devenue colorée').not.toBeNull();

    // ── récompense : trois étoiles, aucune erreur, aucune aide
    await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
    await expect(page.locator('[data-fin="reussite"]')).toBeVisible();
    for (const rang of ['1', '2', '3']) {
      await expect(page.locator(`[data-etoile="${rang}"]`)).toHaveAttribute('data-acquise', 'oui');
    }

    // ── ça reste après rechargement : le journal fait foi
    await page.reload();
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);

    const profils = await page.request.get('/api/profils');
    expect(profils.ok()).toBe(true);
    const liste = (await profils.json()) as Array<{ id: string; prenom: string }>;
    const profil = liste.find((p) => p.prenom === fixtureProfil['prenom']);
    expect(profil, 'le profil doit survivre au rechargement').toBeDefined();

    const progression = await page.request.get(`/api/profils/${profil!.id}/progression`);
    expect(progression.ok()).toBe(true);
    const noeuds = (await progression.json()) as Array<Record<string, unknown>>;
    const entree = noeuds.find((n) => JSON.stringify(n).includes(NOEUD));
    expect(entree, 'la progression du nœud joué doit persister').toBeDefined();
    expect(entree!['etoiles']).toBe(3);
  });

  test('la consigne active est lisible et réécoutable sans coût — R15', async ({ page }) => {
    await preparer(page);
    await entrerDansLeNoeud(page);

    const courante = page.locator('[data-consigne-etat="courante"]');
    await expect(courante).toHaveCount(1);
    await expect(courante).toBeVisible();

    // Réécouter ne fait pas bouger le niveau d'aide.
    const racine = page.locator('[data-ecran="noeud"]');
    await expect(racine).toHaveAttribute('data-aide', 'aucune');
    await page.evaluate(async () =>
      (window as FenetreTest).__test.repondre({ type: 'ecouterConsigne' })
    );
    await page.evaluate(async () =>
      (window as FenetreTest).__test.repondre({ type: 'ecouterConsigne' })
    );
    await expect(racine).toHaveAttribute('data-aide', 'aucune');
  });

  test('aucun appel sortant — R10, R4', async ({ page }) => {
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
    await entrerDansLeNoeud(page);

    expect(sortants, 'liste blanche vide : aucune requête hors du serveur local').toEqual([]);
  });
});
