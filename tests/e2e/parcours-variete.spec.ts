/**
 * R13, mesurée dans l'application réelle — lot L2-E, sous-groupe E4.
 *
 * R13 (v2 § 15) : « Une sortie complète ne rejoue jamais deux fois le même habillage. »
 *
 * C'est la moitié visible de la promesse de variété. L'autre moitié — R12 — se mesure hors
 * ligne dans `tests/unitaires/moteurs-couverture.test.ts`, parce qu'elle porte sur le
 * CATALOGUE et non sur un parcours.
 *
 * Deux règles de l'annexe T § 6 gouvernent chaque ligne de ce fichier :
 *   • on attend un ÉTAT, jamais une durée — aucun `waitForTimeout` ici ;
 *   • on ne cible QUE les attributs `data-*` du contrat (§ 7), ici `data-moteur` et
 *     `data-habillage`, tous deux portés par la racine de chaque moteur et possédés par L2-E.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * ⚠ CE QUE CE FICHIER NE PEUT PAS ENCORE FAIRE, ET POURQUOI C'EST ÉCRIT ICI PLUTÔT QUE TU.
 *
 * Une « sortie » est composée par `POST /api/profils/:id/sortie` (L2-D, § 5.3), et les nœuds
 * qu'elle enchaîne n'existent que si des `contenu/exercices/**` citent les onze moteurs de F5.
 * Or le § 3.5 du contrat gelé n'attribue **aucun** fichier d'exercice à L2-E, ni à personne
 * d'autre pour ces moteurs : les 33 habillages sont là, les exercices qui les feraient jouer,
 * non. Le parcours ci-dessous itère donc sur les nœuds RÉELLEMENT présents, et le premier cas
 * échoue tant que la sortie n'en compte pas au moins deux — ce qui est le signalement, pas un
 * contournement. Défaut consigné dans `Docs/questions-en-attente.md` et dans le rapport de lot.
 * ────────────────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8'),
) as Record<string, unknown>;

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

/** Longueur minimale d'une sortie pour que R13 ait un sens : deux nœuds, au moins. */
const NOEUDS_MINIMUM = 2;

/**
 * `window.__test`, vu depuis les tests — surface du contrat v1 § 7.1, redéclarée ici parce
 * que `client/src/types-globaux.d.ts` n'est pas dans le périmètre de compilation de
 * Playwright. Toute divergence avec le contrat serait un défaut de ce fichier.
 */
interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

async function preparer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => '__test' in window);
  await page.evaluate(
    async ([fixture, graine, instant]) => {
      const fenetre = window as unknown as FenetreTest;
      fenetre.__test.figerHorloge(instant as string);
      fenetre.__test.graine(graine as number);
      fenetre.__test.sauterAnimations();
      await fenetre.__test.chargerProfil(fixture);
    },
    [fixtureProfil, GRAINE, INSTANT] as const,
  );
}

/** Les nœuds réellement livrés, lus sur disque : le test ne fabrique pas son parcours. */
function noeudsDuDepot(): readonly string[] {
  const dossier = fileURLToPath(new URL('contenu/noeuds', RACINE));
  return readdirSync(dossier)
    .filter((nom) => nom.endsWith('.json'))
    .map((nom) => nom.replace(/\.json$/, ''))
    .sort();
}

test.describe('variété d’une sortie', () => {
  test('R13 — une sortie ne rejoue jamais deux fois le même habillage', async ({ page }) => {
    await preparer(page);

    const noeuds = noeudsDuDepot();
    expect(
      noeuds.length,
      'Une sortie de moins de deux nœuds ne peut pas prouver R13. Cause mesurée : le § 3.5 ' +
        'du contrat gelé ne confie les `contenu/exercices/**` des onze moteurs de F5 à aucun ' +
        'lot, donc aucun nœud ne les joue.',
    ).toBeGreaterThanOrEqual(NOEUDS_MINIMUM);

    const vus: string[] = [];
    for (const noeud of noeuds) {
      await page.evaluate(async (identifiant) => {
        const fenetre = window as unknown as FenetreTest;
        await fenetre.__test.allerAuNoeud(identifiant);
      }, noeud);

      const racine = page.locator('[data-moteur]');
      await expect(racine).toHaveCount(1);
      const habillage = await racine.getAttribute('data-habillage');
      expect(habillage, `le nœud ${noeud} ne déclare aucun habillage`).not.toBeNull();
      vus.push(habillage ?? '');
    }

    expect(new Set(vus).size, `habillages joués dans l’ordre : ${vus.join(', ')}`).toBe(vus.length);
  });

  test('aucun nœud de la sortie n’affiche d’écran d’échec', async ({ page }) => {
    // R14, la même assertion que `cassecou`, mais sur le chemin nominal : si un moteur neuf
    // émettait `data-etat="echec"` dès l'ouverture, personne ne le verrait avant l'enfant.
    await preparer(page);
    for (const noeud of noeudsDuDepot()) {
      await page.evaluate(async (identifiant) => {
        const fenetre = window as unknown as FenetreTest;
        await fenetre.__test.allerAuNoeud(identifiant);
      }, noeud);
      await expect(page.locator('[data-moteur]')).toHaveCount(1);
      await expect(page.locator('[data-etat="echec"]')).toHaveCount(0);
    }
  });

  test('chaque moteur ouvert propose une réécoute gratuite (R15)', async ({ page }) => {
    // « Aucune consigne n'existe uniquement à l'écrit » : le bouton doit être là, sur chaque
    // moteur, sans condition. C'est la seule prise mécanique qu'on ait sur R15 tant que les
    // clips de voix n'existent pas (§ 8, n° 1).
    await preparer(page);
    for (const noeud of noeudsDuDepot()) {
      await page.evaluate(async (identifiant) => {
        const fenetre = window as unknown as FenetreTest;
        await fenetre.__test.allerAuNoeud(identifiant);
      }, noeud);
      await expect(page.locator('[data-moteur]')).toHaveCount(1);
      await expect(page.locator('[data-action="ecouter"]')).toHaveCount(1);
    }
  });
});
