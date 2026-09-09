/**
 * La cascade de récompenses, de bout en bout — D25, annexe T § T3 (lot L2-A).
 *
 * La fixture prépare la frontière du palier rare avec des exercices DISTINCTS réussis.
 * L'E2E joue le dernier exercice, vérifie les trois paliers puis le rejeu sans nouveau crédit.
 * Le trajet métier des cinquante exercices est couvert au niveau API ; cette recette prouve
 * le franchissement et son rendu dans le navigateur.
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
import { noeudsLivres } from './qa-outils.js';
import type { ReponseTentative } from '@pierre/partage';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';
const NOEUD = 'clairiere-01';

const seuils = JSON.parse(readFileSync(fileURLToPath(new URL(
  'contenu/referentiel/parametres-recompenses.json', RACINE,
)), 'utf8')) as { etoilesParIntermediaire: number; intermediairesParRare: number };
const CREDITS_POUR_IMAGE = seuils.etoilesParIntermediaire * seuils.intermediairesParRare;

/**
 * Un instant distinct par tentative : l'idempotence doit absorber un DOUBLE ENVOI, pas deux
 * parties réellement rejouées. Les valeurs restent déterministes et passent toutes par
 * l'Horloge injectée ; aucune attente ni horloge système n'entre dans le scénario.
 */
function instantDuTour(tour: number): string {
  return `2026-09-01T08:00:${String(tour).padStart(2, '0')}Z`;
}

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

async function preparer(page: Page, progression: readonly { noeud: string; etoiles: number }[] = []): Promise<void> {
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
    { fixture: { ...fixtureProfil, progression }, graine: GRAINE, instant: INSTANT }
  );
}

/** Joue le moteur puis attend l'ACK de sa tentative et son application dans la récompense. */
async function jouerLeNoeudEntier(page: Page): Promise<ReponseTentative> {
  const accuseReception = page.waitForResponse((reponse) =>
    reponse.request().method() === 'POST' && new URL(reponse.url()).pathname === '/api/tentatives');
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
  const reponse = await accuseReception;
  expect(reponse.ok(), 'la réussite a reçu son ACK serveur').toBe(true);
  const resultat = await reponse.json() as ReponseTentative;
  for (const jauge of resultat.gainCascade.jauges) {
    await expect(page.locator('[data-ecran="recompense"] [data-palier="' + jauge.palier + '"]'))
      .toHaveAttribute('data-restant', String(jauge.restant));
  }
  await expect(page.locator('[data-action="voir-carte"]')).toBeEnabled();
  return resultat;
}

test.describe('la cascade de D25', () => {
  test('les trois paliers sont franchis, et aucun écran d’échec n’apparaît jamais', async ({
    page
  }) => {
    const precedents = noeudsLivres().filter((noeud) => noeud.progression && noeud.id !== NOEUD)
      .slice(0, CREDITS_POUR_IMAGE - 1).map((noeud) => ({ noeud: noeud.id, etoiles: 3 }));
    expect(precedents).toHaveLength(CREDITS_POUR_IMAGE - 1);
    expect(new Set(precedents.map((ligne) => ligne.noeud)).size).toBe(precedents.length);
    await preparer(page, precedents);
    await page.evaluate(async (noeud) => (window as FenetreTest).__test.allerAuNoeud(noeud), NOEUD);
    await expect(page.locator('[data-ecran="noeud"] [data-palier="intermediaire"]'))
      .toHaveAttribute('data-restant', '1');
    const premier = await jouerLeNoeudEntier(page);
    expect(premier.deja).toBe(false);
    expect(premier.gainCascade.etat.etoilesTotal).toBe(CREDITS_POUR_IMAGE);
    expect(premier.gainCascade.paliersFranchis).toEqual(['etoile', 'intermediaire', 'rare']);
    await expect(page.locator('[data-fin="reussite"]')).toBeVisible();
    expect(await page.locator('[data-etat="echec"]').count()).toBe(0);
    await expect.poll(async () => (await page.locator('[data-recompense]').evaluateAll((marques) =>
      marques.map((marque) => marque.getAttribute('data-recompense')))).sort())
      .toEqual(['etoile', 'intermediaire', 'rare']);
    const jauges = page.locator('[data-ecran="recompense"] [data-palier]');
    await expect(jauges).toHaveCount(3);
    for (const jauge of await jauges.all()) expect(Number(await jauge.getAttribute('data-restant'))).toBeGreaterThanOrEqual(0);

    await page.evaluate(async ({ noeud, instant }) => {
      const crochets = (window as FenetreTest).__test;
      crochets.figerHorloge(instant);
      await crochets.allerAuNoeud(noeud);
    }, { noeud: NOEUD, instant: instantDuTour(1) });
    const rejeu = await jouerLeNoeudEntier(page);
    expect(rejeu.deja, 'une nouvelle tentative réelle, pas un renvoi idempotent').toBe(false);
    expect(rejeu.gainCascade.etat, 'rejouer le même exercice ne fait pas avancer la cascade').toEqual(premier.gainCascade.etat);
    expect(rejeu.gainCascade.paliersFranchis).toEqual([]);
    expect(rejeu.gainCascade.recompenses).toEqual([]);
    await expect(page.locator('[data-fin="reussite"]')).toBeVisible();
    expect(await page.locator('[data-etat="echec"]').count()).toBe(0);
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

    // Un exercice inédit gagné : exactement un crédit de moins avant le palier. Une jauge qui
    // n'afficherait que l'acquis passerait toutes les assertions de forme et échouerait ici.
    expect(apres).toBe(avant - 1);
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
