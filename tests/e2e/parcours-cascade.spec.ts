/**
 * La cascade de récompenses, de bout en bout — D25, annexe T § T3 (lot L2-A).
 *
 * On joue le nœud, encore et encore, et on vérifie que les TROIS paliers de D25 sont
 * réellement franchis : l'étoile à chaque réussite, le tampon spécial toutes les cinq étoiles,
 * l'image tous les dix tampons. Cinquante et une étoiles séparent le premier tap du palier
 * rare ; ce test les joue vraiment, il ne les simule pas.
 *
 * Deux règles de l'annexe T § 6 gouvernent chaque ligne :
 *   • on attend un ÉTAT, jamais une durée — aucun `waitForTimeout` ici ;
 *   • on ne cible que des attributs `data-*` du contrat.
 *
 * ⚠ `data-recompense` est une ADDITION au § 7 du contrat des features v2, signalée au rapport
 * de L2-A. `data-palier` y est réservé aux JAUGES ; le réemployer pour les récompenses
 * obtenues ferait compter quatre « jauges » là où l'écran en montre trois.
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
const NOEUD = 'clairiere-01';

/**
 * Nombre maximal de nœuds joués avant d'abandonner.
 *
 * Dérivé, pas deviné : 3 étoiles par nœud, 5 étoiles par tampon, 10 tampons par image, donc
 * 50 / 3 = 17 nœuds pour l'image. La marge de trois nœuds couvre le cas où l'exercice ne
 * donnerait pas trois étoiles.
 */
const NOEUDS_MAX = 20;

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  repondre(action: unknown): Promise<void>;
  etat(): {
    readonly ecran: string;
    readonly etatMoteur: unknown;
  };
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

/**
 * Joue le nœud entier au clavier du magasin, jusqu'à l'écran de récompense.
 *
 * On passe par `repondre` et non par des taps réels : `parcours-nominal` prouve déjà que le
 * doigt marche, et ce test-ci en joue vingt de suite. Ce qu'il vérifie est la CASCADE, pas la
 * géométrie du décor.
 */
async function jouerLeNoeudEntier(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const crochets = (window as FenetreTest).__test;
    interface EtatColorieLu {
      readonly indexConsigne: number;
      readonly consignes: ReadonlyArray<{
        readonly ciblesRestantes: ReadonlyArray<{ readonly region: string; readonly couleur: string }>;
      }>;
    }
    // Borne de sécurité : 4 consignes, 9 cibles, 2 actions par cible. 64 est trois fois trop.
    for (let tour = 0; tour < 64; tour += 1) {
      const etat = crochets.etat();
      if (etat.ecran === 'recompense') {
        return;
      }
      const moteur = etat.etatMoteur as EtatColorieLu | null;
      const cible = moteur?.consignes[moteur.indexConsigne]?.ciblesRestantes[0];
      if (cible === undefined) {
        return;
      }
      await crochets.repondre({ type: 'choisirCouleur', couleur: cible.couleur });
      await crochets.repondre({ type: 'peindre', region: cible.region });
    }
  });
  await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
}

test.describe('la cascade de D25', () => {
  test('les trois paliers sont franchis, et aucun écran d’échec n’apparaît jamais', async ({
    page
  }) => {
    await preparer(page);

    // Les seuils sont CHARGÉS AU DÉMARRAGE, en données (convention C2). On attend leur
    // arrivée par leur seule conséquence visible : la jauge dans la barre de consigne.
    await page.evaluate(async (noeud) => {
      await (window as FenetreTest).__test.allerAuNoeud(noeud);
    }, NOEUD);
    await expect(page.locator('[data-ecran="noeud"] [data-palier="intermediaire"]')).toBeVisible();

    // Au départ, il reste cinq étoiles avant le premier tampon. Le nombre vient des données,
    // pas d'une constante de ce fichier : on lit ce que la jauge affiche.
    const jaugeDepart = page.locator('[data-ecran="noeud"] [data-palier="intermediaire"]');
    const restantDepart = Number(await jaugeDepart.getAttribute('data-restant'));
    expect(restantDepart).toBeGreaterThan(0);

    const paliersVus = new Set<string>();

    for (let noeudJoue = 0; noeudJoue < NOEUDS_MAX; noeudJoue += 1) {
      if (noeudJoue > 0) {
        await page.evaluate(async (noeud) => {
          await (window as FenetreTest).__test.allerAuNoeud(noeud);
        }, NOEUD);
        await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
      }

      await jouerLeNoeudEntier(page);

      // ── R14, à chaque tour : aucun écran d'échec, la fin est toujours une réussite.
      expect(await page.locator('[data-etat="echec"]').count()).toBe(0);
      await expect(page.locator('[data-fin="reussite"]')).toBeVisible();

      for (const marque of await page.locator('[data-recompense]').all()) {
        const palier = await marque.getAttribute('data-recompense');
        if (palier !== null) {
          paliersVus.add(palier);
        }
      }

      // ── les trois jauges sont TOUJOURS là, et `data-restant` n'est jamais négatif
      const jauges = page.locator('[data-ecran="recompense"] [data-palier]');
      await expect(jauges).toHaveCount(3);
      for (const jauge of await jauges.all()) {
        expect(Number(await jauge.getAttribute('data-restant'))).toBeGreaterThanOrEqual(0);
      }

      if (paliersVus.has('etoile') && paliersVus.has('intermediaire') && paliersVus.has('rare')) {
        break;
      }
    }

    // ── LE cœur du test : les trois paliers de D25, réellement franchis.
    expect([...paliersVus].sort()).toEqual(['etoile', 'intermediaire', 'rare']);
  });

  test('la jauge montre le VIDE restant, et il DÉCROÎT quand on joue (D25, point 3)', async ({
    page
  }) => {
    await preparer(page);
    await page.evaluate(async (noeud) => {
      await (window as FenetreTest).__test.allerAuNoeud(noeud);
    }, NOEUD);

    const jauge = page.locator('[data-ecran="noeud"] [data-palier="intermediaire"]');
    await expect(jauge).toBeVisible();
    const avant = Number(await jauge.getAttribute('data-restant'));

    await jouerLeNoeudEntier(page);
    await page.evaluate(async (noeud) => {
      await (window as FenetreTest).__test.allerAuNoeud(noeud);
    }, NOEUD);
    await expect(jauge).toBeVisible();
    const apres = Number(await jauge.getAttribute('data-restant'));

    // Trois étoiles gagnées : il reste STRICTEMENT moins à parcourir. Une jauge qui
    // n'afficherait que l'acquis passerait toutes les assertions de forme et échouerait ici.
    expect(apres).toBeLessThan(avant);
    expect(apres).toBeGreaterThanOrEqual(0);
  });

  test('la série est visible, et elle repart de zéro à chaque nœud', async ({ page }) => {
    await preparer(page);
    await page.evaluate(async (noeud) => {
      await (window as FenetreTest).__test.allerAuNoeud(noeud);
    }, NOEUD);

    const racine = page.locator('[data-ecran="noeud"]');
    await expect(racine).toHaveAttribute('data-serie', '0');

    // Une seule bonne réponse : la série vaut 1.
    await page.evaluate(async () => {
      const crochets = (window as FenetreTest).__test;
      interface EtatColorieLu {
        readonly indexConsigne: number;
        readonly consignes: ReadonlyArray<{
          readonly ciblesRestantes: ReadonlyArray<{
            readonly region: string;
            readonly couleur: string;
          }>;
        }>;
      }
      const moteur = crochets.etat().etatMoteur as EtatColorieLu;
      const cible = moteur.consignes[moteur.indexConsigne]?.ciblesRestantes[0];
      if (cible === undefined) {
        throw new Error('le nœud de test ne porte aucune cible : la fixture a changé.');
      }
      await crochets.repondre({ type: 'choisirCouleur', couleur: cible.couleur });
      await crochets.repondre({ type: 'peindre', region: cible.region });
    });
    await expect(racine).toHaveAttribute('data-serie', '1');

    // Nouveau nœud : la hauteur du son repart de la tonique (v2 § 8).
    await page.evaluate(async (noeud) => {
      await (window as FenetreTest).__test.allerAuNoeud(noeud);
    }, NOEUD);
    await expect(racine).toHaveAttribute('data-serie', '0');
  });
});
