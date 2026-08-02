/**
 * LES GALERIES s'enchaînent aussi — lot N8, D38.
 *
 * D38 : « les DEUX régions (Clairière, Galeries) sont ouvertes dès le départ ». Mesuré au
 * démarrage de N8 : `tests/e2e/parcours-sortie-clairiere.spec.ts` garde la Clairière de bout
 * en bout — et **rien ne gardait la seconde région**. Les Galeries n'avaient que deux nœuds,
 * portaient les deux seuls exercices `trace` du dépôt, et aucun parcours ne prouvait qu'on
 * pouvait y entrer ni en sortir. Une région ouverte que personne ne traverse n'est pas
 * ouverte, elle est dessinée.
 *
 * Ce fichier ne double pas le précédent : il change de région, et il ajoute la mesure que la
 * Clairière ne fait pas — **la longueur d'une sortie, telle que l'application la sert**.
 *
 * ── DEUX RÈGLES DE L'ANNEXE T § 6, TENUES LIGNE À LIGNE ───────────────────────────────────
 *   • on attend un ÉTAT, jamais une durée : aucun `waitForTimeout` ;
 *   • on ne cible que des attributs `data-*`, jamais une classe ni un texte de mise en page.
 *
 * ── ET UNE RÈGLE DE MÉTHODE ───────────────────────────────────────────────────────────────
 * On n'emprunte JAMAIS un crochet de navigation pour arriver sur un nœud. On passe par la
 * prise que l'enfant a sous le doigt — le bouton de départ de la région. Un test qui saute la
 * navigation prouve que les nœuds existent ; il ne prouve pas qu'on peut y arriver, et c'est
 * exactement l'écart qui a produit le défaut n° 4 (« je n'ai eu qu'un exercice »).
 *
 * ── CONTRAT DE SORTIE ─────────────────────────────────────────────────────────────────────
 * Le test imprime les nœuds atteints dans l'ordre et exige :
 *   • que les SIX nœuds déclarés par `contenu/monde/regions.json` soient tous atteignables ;
 *   • qu'aucun exercice livré des Galeries ne reste invisible ;
 *   • qu'une fois la région terminée, la carte offre encore une prise (R14, aucun état sans
 *     issue).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);

/**
 * UN PROFIL RIEN QU'À CE FICHIER — même correction que `parcours-sortie-clairiere.spec.ts`.
 *
 * La base E2E est `:memory:` pour TOUTE la campagne et `chargerProfil` réutilise un profil
 * existant par identifiant puis par PRÉNOM. Un prénom partagé ferait hériter ce cas de la
 * progression journalisée par les autres suites, et la mesure démarrerait au deuxième nœud.
 */
const fixtureProfil: Record<string, unknown> = {
  ...(JSON.parse(
    readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8'),
  ) as Record<string, unknown>),
  id: 'profil-test-sortie-galeries',
  prenom: 'Silex',
};

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';
const REGION = 'galeries';

/** v2 § 5.2, ligne 143 : « 4 à 6 nœuds enchaînés ». */
const NOEUDS_MIN = 4;
const NOEUDS_MAX = 6;

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
    readFileSync(fileURLToPath(new URL('contenu/monde/regions.json', RACINE)), 'utf8'),
  ) as { readonly regions: readonly { region: string; noeuds: readonly string[] }[] };
  const region = document.regions.find((entree) => entree.region === REGION);
  expect(region, `la région ${REGION} est absente de regions.json`).toBeDefined();
  return region!.noeuds.map(String);
}

/** Les exercices que chaque nœud fait jouer — pour dire, à l'échec, CE QUI est resté invisible. */
function exerciceParNoeud(): ReadonlyMap<string, string> {
  const dossier = fileURLToPath(new URL('contenu/noeuds', RACINE));
  const table = new Map<string, string>();
  for (const fichier of readdirSync(dossier).filter((nom) => nom.endsWith('.json'))) {
    const noeud = JSON.parse(readFileSync(`${dossier}/${fichier}`, 'utf8')) as {
      id: string;
      region: string;
      exercice: string;
    };
    if (String(noeud.region) === REGION) table.set(String(noeud.id), String(noeud.exercice));
  }
  return table;
}

async function entrerSurLaCarte(page: Page, termines: readonly string[]): Promise<void> {
  await page.evaluate(
    async ({ fixture, graine, instant, progression }) => {
      const crochets = (window as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge(instant);
      await crochets.chargerProfil({
        ...(fixture as Record<string, unknown>),
        progression: progression.map((noeud) => ({ noeud, etoiles: 3 })),
      });
    },
    { fixture: fixtureProfil, graine: GRAINE, instant: INSTANT, progression: termines },
  );

  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
}

test.describe('Les Galeries sont une région JOUABLE, pas seulement ouverte (D38)', () => {
  test('la région déclare de 4 à 6 nœuds, comme une sortie', () => {
    const declares = noeudsDeclares();
    expect(
      declares.length,
      `${REGION} déclare ${String(declares.length)} nœud(s) : ${declares.join(', ')}`,
    ).toBeGreaterThanOrEqual(NOEUDS_MIN);
    expect(declares.length).toBeLessThanOrEqual(NOEUDS_MAX);
  });

  test('regions.json ne cite que des nœuds réellement livrés, et les cite tous', () => {
    // C'est cette liste qui fait le pourcentage de recoloration : un nœud fantôme rendrait la
    // région à jamais incomplète, un nœud oublié la déclarerait finie trop tôt.
    const declares = [...noeudsDeclares()].sort();
    const livres = [...exerciceParNoeud().keys()].sort();
    expect(declares).toEqual(livres);
  });

  test('le bouton de départ mène à un nœud différent après chaque réussite', async ({ page }) => {
    const declares = noeudsDeclares();
    const exercices = exerciceParNoeud();

    await page.goto('/');
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);

    const atteints: string[] = [];

    for (let tour = 0; tour < declares.length; tour += 1) {
      await entrerSurLaCarte(page, atteints);

      const depart = page.locator(`[data-depart="${REGION}"]`);
      await expect(
        depart,
        `tour ${String(tour + 1)} — déjà terminés : [${atteints.join(', ')}] — Les Galeries ` +
          'n’offrent aucune prise pour entrer, alors que D38 les ouvre dès le départ',
      ).toHaveCount(1);

      await expect(depart).toHaveAttribute(
        'data-etape',
        `${String(tour + 1)}/${String(declares.length)}`,
      );

      await depart.click();

      await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
      const noeud = await page.evaluate(() => (window as FenetreTest).__test.etat().noeud);
      expect(noeud, `le tour ${String(tour + 1)} n’a ouvert aucun nœud`).not.toBeNull();
      atteints.push(String(noeud));

      await page.goto('/');
      await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    }

    // ── Région terminée : reste-t-il une prise ? (R14, aucun état sans issue)
    await entrerSurLaCarte(page, atteints);
    const departs = await page
      .locator('[data-depart]')
      .evaluateAll((noeuds) => noeuds.map((element) => element.getAttribute('data-depart') ?? ''));
    console.log(`[sortie ${REGION}] région terminée — départs offerts : ${departs.join(', ')}`);
    expect(
      departs.length,
      'région terminée et plus AUCUN départ sur la carte : état sans issue',
    ).toBeGreaterThan(0);

    // ── CONTRAT DE SORTIE : les deux comptes, et leur écart.
    const distincts = new Set(atteints);
    console.log(
      `[sortie ${REGION}] ${String(distincts.size)} nœud(s) atteint(s) sur ` +
        `${String(declares.length)} déclaré(s) — ` +
        atteints.map((n) => `${n} → ${exercices.get(n) ?? '(exercice inconnu)'}`).join(' · '),
    );

    const jamaisAtteints = declares.filter((noeud) => !distincts.has(noeud));
    expect(
      jamaisAtteints.map((noeud) => `${noeud} (${exercices.get(noeud) ?? '?'})`),
      'des nœuds des Galeries sont écrits, validés, et l’enfant ne peut PAS y arriver',
    ).toEqual([]);

    expect(
      distincts.size,
      `nœuds atteints dans l’ordre : ${atteints.join(', ')}`,
    ).toBe(declares.length);
  });

  test('on entre dans Les Galeries SANS avoir terminé la Clairière (D38)', async ({ page }) => {
    // La promesse de D38 n'est pas « les deux régions existent », c'est « les deux sont
    // ouvertes DÈS LE DÉPART ». Un enfant qui bloque sur une région doit pouvoir aller jouer
    // l'autre : c'est aussi la garantie qu'aucune session ne se termine sans réussite (R14).
    await page.goto('/');
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    await entrerSurLaCarte(page, []);

    const departs = await page
      .locator('[data-depart]')
      .evaluateAll((noeuds) => noeuds.map((element) => element.getAttribute('data-depart') ?? ''));
    console.log(`[sortie ${REGION}] profil neuf — départs offerts : ${departs.join(', ')}`);
    expect(departs, 'aucune progression, et Les Galeries ne sont pas proposées').toContain(REGION);
  });
});
