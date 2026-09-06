/**
 * Le bot casse-cou — R14, la règle de non-échec, traduite en mécanique.
 *
 * Annexe T § T3 : « un bot qui répond systématiquement faux […]. Assertions : aucun élément
 * `[data-etat="echec"]` n'apparaît jamais, aucune étoile déjà acquise n'est retirée, chaque
 * sortie se termine sur `[data-fin="reussite"]`, et l'aide se déclenche automatiquement au
 * 2ᵉ essai. »
 *
 * C'est **le seul principe des specs qu'il serait catastrophique de casser sans s'en
 * apercevoir** (contrat § 10). Ce fichier ne doit jamais être assoupli : si une assertion
 * gêne, c'est la conception qui a bougé, et cela passe par le journal des décisions.
 *
 * Le profil de départ porte volontairement **trois étoiles déjà acquises** sur le nœud : le
 * bot va tout rater ; on vérifie qu'aucune ne lui est reprise.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from './invariants.js';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureBase = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const NOEUD = 'clairiere-01';
const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

/** Nombre de réponses fausses consécutives — contrat § 1.7, annexe T § T3. */
const REPONSES_FAUSSES = 40;

/** Le profil du bot : il a DÉJÀ trois étoiles sur ce nœud. */
const fixtureAcquise = {
  ...fixtureBase,
  id: 'profil-test-cassecou',
  prenom: 'Casse-cou',
  progression: [{ noeud: NOEUD, etoiles: 3 }]
};

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

interface EtatColorieLu {
  readonly indexConsigne: number;
  readonly consignes: ReadonlyArray<{
    readonly ciblesRestantes: ReadonlyArray<{ readonly region: string; readonly couleur: string }>;
    readonly nbErreurs: number;
    readonly aideDemandee: string;
  }>;
  readonly niveauAide: string;
  readonly remplissages: Readonly<Record<string, string>>;
}

async function etatMoteur(page: Page): Promise<EtatColorieLu> {
  return (await page.evaluate(
    () => (window as FenetreTest).__test.etat().etatMoteur
  )) as EtatColorieLu;
}

async function repondre(page: Page, action: unknown): Promise<void> {
  await page.evaluate(
    async (a) => (window as FenetreTest).__test.repondre(a),
    action as Record<string, unknown>
  );
}

/** Vérifie, à cet instant précis, les trois invariants de R14 côté interface. */
async function verifierNonEchec(page: Page): Promise<void> {
  expect(await page.locator('[data-etat="echec"]').count(), 'R14 : aucun état d’échec').toBe(0);
  // `data-fin` n'a qu'une valeur légale — contrat § 10 : « `reussite` — et rien d'autre ».
  const fins = await page.locator('[data-fin]').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-fin'))
  );
  for (const fin of fins) expect(fin).toBe('reussite');
}

test.describe('casse-cou — le bot qui répond toujours faux', () => {
  test.slow();

  // Retour parent R15 (retours-de-jeu.md) : proposée automatiquement ≠ demandée.
  // Les deux scénarios gardent les 40 erreurs et tous les invariants R14 ; celui avec
  // demande explicite conserve la preuve d'une seule étoile pour cette tentative.
  for (const demanderAide of [false, true]) {
  test(`${REPONSES_FAUSSES} réponses fausses sans échec — aide ${demanderAide ? 'demandée' : 'automatique seulement'}`, async ({
    page
  }) => {
    const erreursConsole: string[] = [];
    page.on('pageerror', (erreur) => erreursConsole.push(String(erreur)));

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
      { fixture: fixtureAcquise, graine: GRAINE, instant: INSTANT }
    );

    // Les étoiles déjà acquises, avant que le bot ne touche à quoi que ce soit.
    const profils = (await (await page.request.get('/api/profils')).json()) as Array<{
      id: string;
      prenom: string;
    }>;
    const profil = profils.find((p) => p.prenom === fixtureAcquise.prenom);
    expect(profil, 'le profil du bot doit exister côté serveur').toBeDefined();
    const progressionAvant = (await (
      await page.request.get(`/api/profils/${profil!.id}/progression`)
    ).json()) as Array<Record<string, unknown>>;
    const etoilesAvant = Number(
      progressionAvant.find((n) => JSON.stringify(n).includes(NOEUD))?.['etoiles'] ?? 0
    );
    expect(etoilesAvant, 'la fixture installe bien trois étoiles acquises').toBe(3);

    await page.evaluate(
      async (noeud) => (window as FenetreTest).__test.allerAuNoeud(noeud),
      NOEUD
    );
    await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
    await expect(page.locator('[data-test-pret="oui"]')).toBeVisible();

    // Le nuancier tel qu'il est vraiment rendu : le bot n'invente pas de couleur.
    const nuancier = await page
      .locator('[data-godet]')
      .evaluateAll((elements) => elements.map((e) => e.getAttribute('data-godet') ?? ''));
    expect(nuancier.length).toBeGreaterThan(1);

    const racineNoeud = page.locator('[data-ecran="noeud"]');
    await expect(racineNoeud).toHaveAttribute('data-aide', 'aucune');

    let aideVueApres2eEssai: string | null = null;

    for (let essai = 1; essai <= REPONSES_FAUSSES; essai += 1) {
      const etat = await etatMoteur(page);
      const cible = etat.consignes[etat.indexConsigne]?.ciblesRestantes[0];
      expect(cible, 'le bot doit toujours avoir une cible à rater').toBeDefined();

      // Bonne région, MAUVAISE couleur : un refus qui compte comme erreur (contrat § 5.5).
      const fausse = nuancier.find((c) => c !== cible!.couleur)!;
      await repondre(page, { type: 'choisirCouleur', couleur: fausse });
      await repondre(page, { type: 'peindre', region: cible!.region });

      // La région n'est PAS peinte, et rien ne ressemble à un échec.
      await expect(page.locator(`[data-region-svg="${cible!.region}"]`)).toHaveAttribute(
        'data-peinte',
        'non'
      );
      await verifierNonEchec(page);

      if (essai === 2) {
        aideVueApres2eEssai = await racineNoeud.getAttribute('data-aide');
      }
    }

    // L'aide s'est déclenchée toute seule au 2ᵉ essai — annexe T § T3.
    expect(aideVueApres2eEssai, 'l’aide doit être proposée dès le 2ᵉ essai raté').toBe('indice');
    await expect(racineNoeud).toHaveAttribute('data-aide', 'demonstration');

    const avantDemande = await etatMoteur(page);
    expect(avantDemande.consignes[avantDemande.indexConsigne]!.aideDemandee).toBe('aucune');
    if (demanderAide) {
      // Tenir l'appui révèle le rétrécissement invisible dans une capture au repos.
      const boutonAide = page.locator('[data-action="aide"]');
      const cadre = await boutonAide.boundingBox();
      expect(cadre).not.toBeNull();
      await page.mouse.move(cadre!.x + cadre!.width / 2, cadre!.y + cadre!.height / 2);
      await page.mouse.down();
      try {
        await expect(boutonAide).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 3)');
        const cadreAppuye = await boutonAide.boundingBox();
        expect(cadreAppuye!.width).toBeGreaterThanOrEqual(64);
        expect(cadreAppuye!.height).toBeGreaterThanOrEqual(64);
        // Sortir avant de relâcher : seule la demande tactile ci-dessous doit compter.
        await page.mouse.move(0, 0);
      } finally {
        await page.mouse.up();
      }
      await page.locator('[data-action="aide"]').tap();
      await expect.poll(async () => {
        const etat = await etatMoteur(page);
        return etat.consignes[etat.indexConsigne]!.aideDemandee;
      }).toBe('indice');
      // Demander après le palier automatique ne doit pas faire régresser l'aide affichée.
      await expect(racineNoeud).toHaveAttribute('data-aide', 'demonstration');
    }

    // Aucune étoile n'a été retirée pendant la débâcle.
    const progressionPendant = (await (
      await page.request.get(`/api/profils/${profil!.id}/progression`)
    ).json()) as Array<Record<string, unknown>>;
    expect(
      Number(progressionPendant.find((n) => JSON.stringify(n).includes(NOEUD))?.['etoiles'] ?? 0),
      'un acquis n’est jamais repris — contrat § 6.3'
    ).toBe(3);

    // Puis le bot finit — parce qu'il n'existe aucun chemin où l'on échoue.
    for (let tour = 0; tour < 64; tour += 1) {
      if (await page.locator('[data-ecran="recompense"]').isVisible()) break;
      const etat = await etatMoteur(page);
      const cible = etat.consignes[etat.indexConsigne]?.ciblesRestantes[0];
      if (!cible) break;
      await repondre(page, { type: 'choisirCouleur', couleur: cible.couleur });
      await repondre(page, { type: 'peindre', region: cible.region });
      await verifierNonEchec(page);
    }

    await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
    await expect(page.locator('[data-fin="reussite"]')).toBeVisible();

    // La première étoile est acquise malgré 40 erreurs — c'est R14, littéralement.
    await expect(page.locator('[data-etoile="1"]')).toHaveAttribute('data-acquise', 'oui');
    // R15 du suivi parent : seule l'aide volontaire compte pour la deuxième étoile.
    await expect(page.locator('[data-etoile="2"]')).toHaveAttribute('data-acquise', demanderAide ? 'non' : 'oui');
    await expect(page.locator('[data-etoile="3"]')).toHaveAttribute('data-acquise', 'non');

    // Et le score déjà acquis n'a toujours pas bougé.
    const progressionApres = (await (
      await page.request.get(`/api/profils/${profil!.id}/progression`)
    ).json()) as Array<Record<string, unknown>>;
    expect(
      Number(progressionApres.find((n) => JSON.stringify(n).includes(NOEUD))?.['etoiles'] ?? 0)
    ).toBe(3);

    expect(erreursConsole, 'aucune exception non capturée pendant la débâcle').toEqual([]);
  });
  }

  test('aucune couleur rouge et aucune secousse ne signalent le refus — v2 § 8', async ({
    page
  }) => {
    await page.goto('/');
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    await page.evaluate(async ({ fixture, graine, instant }) => {
      const crochets = (window as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge(instant);
      await crochets.chargerProfil(fixture);
    }, { fixture: fixtureAcquise, graine: GRAINE, instant: INSTANT });
    await page.evaluate(
      async (noeud) => (window as FenetreTest).__test.allerAuNoeud(noeud),
      NOEUD
    );
    await expect(page.locator('[data-test-pret="oui"]')).toBeVisible();

    const etat = await etatMoteur(page);
    const cible = etat.consignes[etat.indexConsigne]!.ciblesRestantes[0]!;
    const nuancier = await page
      .locator('[data-godet]')
      .evaluateAll((elements) => elements.map((e) => e.getAttribute('data-godet') ?? ''));
    await repondre(page, {
      type: 'choisirCouleur',
      couleur: nuancier.find((c) => c !== cible.couleur)
    });
    await repondre(page, { type: 'peindre', region: cible.region });

    // « L'erreur n'a pas de couleur dédiée, elle est un mouvement, pas une teinte. »
    const region = page.locator(`[data-region-svg="${cible.region}"]`);
    await expect(region).toHaveAttribute('data-peinte', 'non');
    await expect(region).not.toHaveAttribute('data-couleur', /.+/);
    expect(await page.locator('[data-etat="echec"]').count()).toBe(0);
  });
});
