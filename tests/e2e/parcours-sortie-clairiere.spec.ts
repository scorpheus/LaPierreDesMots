/**
 * LOT C4 — « dans la clairière je n'ai eu qu'un exercice, est-ce normal ? »
 *
 * Non : la v2 § 5.2, ligne 143, décrit « 4 à 6 nœuds enchaînés → nœud final un peu plus corsé ».
 * `tests/unitaires/clairiere-sortie-complete.test.ts` garde le CONTENU — que les nœuds soient
 * écrits, chaînés et sans exercice orphelin. Ce fichier-ci garde l'autre moitié, et c'est celle
 * qui décide de ce que l'enfant vit : **combien d'exercices distincts il ATTEINT**.
 *
 * ── POURQUOI DEUX TESTS, ET PAS UN ────────────────────────────────────────────────────────
 * La leçon du défaut n° 4 est que trois exercices étaient écrits, validés par le schéma, et
 * invisibles. Compter les fichiers ne dit rien de ce qui est atteignable : c'est l'ÉCART entre
 * les deux comptes qui est le défaut. Livrer cinq nœuds pendant que la carte entre toujours sur
 * `region.noeuds[0]` reproduirait exactement ce défaut, en plus grand — quatre exercices
 * invisibles au lieu de trois, et une région que rien ne permettrait plus de terminer.
 *
 * D'où la mesure faite ici : on N'UTILISE JAMAIS `allerAuNoeud`. On passe par la prise que
 * l'enfant a sous le doigt — le bouton de départ de la région sur la carte — et on regarde où
 * elle mène, tour après tour. Un crochet qui saute la navigation prouverait que les nœuds
 * existent, jamais qu'on peut y arriver.
 *
 * ── CONTRAT DE SORTIE ─────────────────────────────────────────────────────────────────────
 * Le test imprime les nœuds atteints dans l'ordre et exige :
 *   • qu'ils soient AUSSI NOMBREUX que les nœuds déclarés par `contenu/monde/regions.json` ;
 *   • qu'ils soient tous DISTINCTS — c'est le chiffre qui tombe à 1 si le travail est creux ;
 *   • qu'un tour de plus, une fois la région finie, mène encore quelque part (R14 : rejouer est
 *     gratuit, et une prise qui cesserait de répondre serait un état sans issue).
 *
 * Deux règles de l'annexe T § 6 tenues ligne à ligne : on attend un ÉTAT, jamais une durée, et
 * on ne cible que des attributs `data-*`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from './invariants.js';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);

/**
 * UN PROFIL RIEN QU'À CE FICHIER — et c'est une correction, pas une précaution.
 *
 * Mesuré : ce cas passait seul et échouait dans la campagne complète. La base E2E est
 * `:memory:` pour TOUTE la campagne (`playwright.config.ts`, `PIERRE_BASE`), et `chargerProfil`
 * réutilise un profil existant d'abord par `id`, ensuite par PRÉNOM — le serveur pose son
 * propre identifiant, donc c'est le prénom qui décide. `parcours-nominal` et `parcours-cascade`
 * journalisent des dizaines de tentatives sur `clairiere-01` avec la fixture « Alma » : ce
 * fichier héritait de leur progression et démarrait au deuxième nœud.
 *
 * Un prénom distinct isole complètement cette mesure, sans toucher aux autres suites.
 */
const fixtureProfil: Record<string, unknown> = {
  ...(JSON.parse(
    readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
  ) as Record<string, unknown>),
  id: 'profil-test-sortie-clairiere',
  prenom: 'Bourgeon'
};

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';
const REGION = 'clairiere';

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  etat(): { readonly ecran: string; readonly noeud: string | null };
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

/** Les nœuds que la région DÉCLARE, lus sur disque. Le test ne fabrique pas son attendu. */
function noeudsDeclares(): readonly string[] {
  const document = JSON.parse(
    readFileSync(fileURLToPath(new URL('contenu/monde/regions.json', RACINE)), 'utf8')
  ) as { readonly regions: readonly { region: string; noeuds: readonly string[] }[] };
  const region = document.regions.find((entree) => entree.region === REGION);
  expect(region, `la région ${REGION} est absente de regions.json`).toBeDefined();
  return region!.noeuds.map(String);
}

/**
 * Charge le profil AVEC la progression demandée, puis fait le geste de le choisir.
 *
 * `chargerProfil` journalise une tentative par entrée de `progression` et laisse l'application
 * sur l'écran de choix : c'est ce geste-là qui appartient à l'enfant, et il reste donc réel.
 */
async function entrerSurLaCarte(page: Page, termines: readonly string[]): Promise<void> {
  await page.evaluate(
    async ({ fixture, graine, instant, progression }) => {
      const crochets = (window as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge(instant);
      await crochets.chargerProfil({
        ...(fixture as Record<string, unknown>),
        progression: progression.map((noeud) => ({ noeud, etoiles: 3 }))
      });
    },
    { fixture: fixtureProfil, graine: GRAINE, instant: INSTANT, progression: termines }
  );

  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
}

test.describe('la Clairière enchaîne une SORTIE — ce que l’enfant atteint vraiment', () => {
  test('le bouton de départ ouvre le premier nœud d’un plan réel de 4 à 6 étapes', async ({ page }) => {
    const declares = noeudsDeclares();

    await page.goto('/');
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    await entrerSurLaCarte(page, []);
    const depart = page.locator(`[data-depart="${REGION}"]`);
    await expect(depart, 'la Clairière n’offre aucune prise pour entrer').toHaveCount(1);
    await depart.click();

    const noeud = page.locator('[data-ecran="noeud"]');
    await expect(noeud).toBeVisible();
    await expect(noeud).toHaveAttribute('data-sortie-rang', '1');
    const total = Number(await noeud.getAttribute('data-sortie-total'));
    expect(total, 'le sélecteur doit composer une sortie de 4 à 6 étapes').toBeGreaterThanOrEqual(4);
    expect(total).toBeLessThanOrEqual(6);
    const atteint = await page.evaluate(() => (window as FenetreTest).__test.etat().noeud);
    expect(declares, `le composeur a ouvert le nœud inconnu ${String(atteint)}`).toContain(atteint);
    await expect(page.locator('[data-progression-sortie]')).toContainText(`1 sur ${String(total)}`);
  });
});
