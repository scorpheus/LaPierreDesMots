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

/**
 * ════════════════════════════════════════════════════════════════════════════════════════
 * TAPER UNE RÉGION LÀ OÙ ELLE EST VRAIMENT — et non au centre de sa boîte.
 *
 * `locator.click()` vise le centre de la BOÎTE ENGLOBANTE et refuse d'agir si un autre
 * élément l'occupe. Sur un décor de coloriage, ce point n'appartient très souvent pas à la
 * région : `toit-ecole` est un triangle PERCÉ par l'horloge (`fill-rule="evenodd"`), et le
 * centre de sa boîte, (270 ; 222,5), tombe pile dans ce trou — donc sur `horloge-ecole`, qui
 * est dessinée par-dessus. Le test attendait 90 s puis abandonnait.
 *
 * CE N'EST PAS UN DÉFAUT DU PRODUIT, et le contrat gelé le dit à la lettre (§ 5.2) :
 *   « 1. Si le point tombe dans une région coloriable, c'est elle. »
 * C'est le POINT qui décide, jamais l'élément qu'on croit viser. Un doigt posé sur l'horloge
 * peint l'horloge, et c'est exactement ce qu'il doit faire. L'assertion fautive était
 * l'assertion implicite de `locator.click()` : « cliquer l'élément X agit sur la région X ».
 *
 * On demande donc au navigateur un point qui est À LA FOIS dans le remplissage de la région
 * (`isPointInFill`, qui respecte `fill-rule`) et au-dessus d'elle dans l'empilement
 * (`elementFromPoint`). C'est le geste réel de l'enfant, et l'assertion en sort RENFORCÉE :
 * elle vérifie toujours que c'est bien cette région-là qui devient peinte.
 * ════════════════════════════════════════════════════════════════════════════════════════
 */
async function pointDeTap(page: Page, region: string): Promise<{ x: number; y: number }> {
  const resultat = await page.evaluate((identifiant) => {
    const element = document.querySelector(
      `[data-region-svg="${identifiant}"]`
    ) as SVGGeometryElement | null;
    if (element === null) return { point: null, diagnostic: 'aucun élément ne porte cet id' };
    if (typeof element.isPointInFill !== 'function') {
      return { point: null, diagnostic: 'isPointInFill indisponible sur cet élément' };
    }
    const matrice = element.getScreenCTM();
    if (matrice === null) return { point: null, diagnostic: 'getScreenCTM() est null' };

    const boite = element.getBBox();
    let dansLeRemplissage = 0;
    const couvreurs = new Set<string>();
    // Balayage régulier de la boîte : 21 × 21 pas suffisent pour toute forme de ce décor.
    const PAS = 21;
    for (let ligne = 1; ligne <= PAS; ligne += 1) {
      for (let colonne = 1; colonne <= PAS; colonne += 1) {
        const dans = new DOMPoint(
          boite.x + (boite.width * colonne) / (PAS + 1),
          boite.y + (boite.height * ligne) / (PAS + 1)
        );
        if (!element.isPointInFill(dans)) continue;
        dansLeRemplissage += 1;
        const ecran = dans.matrixTransform(matrice);
        const dessus = document.elementFromPoint(ecran.x, ecran.y);
        if (dessus === element) return { point: { x: ecran.x, y: ecran.y }, diagnostic: '' };
        couvreurs.add(
          dessus === null
            ? 'hors de la fenêtre'
            : (dessus.getAttribute('data-region-svg') ??
              `${dessus.tagName}#${dessus.getAttribute('id') ?? '(sans id)'}`)
        );
      }
    }
    return {
      point: null,
      diagnostic:
        `${String(dansLeRemplissage)} point(s) dans le remplissage, aucun au-dessus ; ` +
        `recouvert par : ${[...couvreurs].join(', ') || '(rien)'} ; ` +
        `boîte ${boite.x},${boite.y} ${boite.width}×${boite.height} ; ` +
        `rect écran ${JSON.stringify(element.getBoundingClientRect())} ; ` +
        `fenêtre ${String(window.innerWidth)}×${String(window.innerHeight)} ` +
        `défilement ${String(window.scrollX)},${String(window.scrollY)}`
    };
  }, region);

  if (resultat.point === null) {
    throw new Error(
      `aucun point de « ${region} » n'est à la fois dans son remplissage et au-dessus d'elle : ` +
        `aucun doigt ne peut l’atteindre. ${resultat.diagnostic}`
    );
  }
  return resultat.point;
}

/**
 * Un tap réel, au doigt, sur un point qui appartient vraiment à la région.
 *
 * On amène d'abord la région dans la fenêtre. `locator.click()` le faisait pour nous ;
 * `page.mouse.click()`, non — il vise des coordonnées de fenêtre, sans rien savoir de la
 * page. Le godet, cliqué juste avant, est SOUS la scène : le clic y avait fait défiler de
 * 690 px, et la région visée se retrouvait à `y = −195`, au-dessus du bord haut. Les 169
 * points du toit étaient bien dans son remplissage, et tous « hors de la fenêtre ».
 */
async function taperLaRegion(page: Page, region: string): Promise<void> {
  await page.locator(`[data-region-svg="${region}"]`).scrollIntoViewIfNeeded();
  const point = await pointDeTap(page, region);
  await page.mouse.click(point.x, point.y);
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
      await taperLaRegion(page, cible.region);

      // La DERNIÈRE cible termine l'exercice : le passage à la consigne suivante — et à la
      // récompense — est automatique (contrat § 5.3, « aucune action valider ni suivant »).
      // `EcranNoeud` est alors démonté aussitôt et la région disparaît du DOM : exiger
      // `data-peinte="oui"` sur un élément qui n'existe plus faisait échouer le parcours
      // *parce qu'il avait réussi*. On attend donc l'un des deux états, et aucun des deux
      // n'est complaisant : « cette région est peinte », ou « la récompense est là ».
      // Ce que la dernière cible a produit est vérifié juste après la boucle — récompense,
      // `data-fin="reussite"`, et les trois étoiles acquises.
      await expect
        .poll(async () =>
          (await page.locator('[data-ecran="recompense"]').count()) > 0
            ? 'recompense'
            : ((await region.getAttribute('data-peinte')) ?? 'absente')
        )
        .toMatch(/^(oui|recompense)$/);

      if ((await page.locator('[data-ecran="noeud"]').count()) > 0) {
        await expect(region).toHaveAttribute('data-couleur', cible.couleur);
      }
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
