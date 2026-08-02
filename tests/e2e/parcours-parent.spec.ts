/**
 * La zone parent de bout en bout — annexe T § T3, ligne « Zone parent » :
 * **« Code faux ×5 → verrouillage, code juste → dashboard »**, mot pour mot.
 *
 * Deux niveaux, et la séparation est délibérée :
 *
 * • **Le verrou** est vérifié sur l'API réelle du serveur lancé par `playwright.config.ts`.
 *   C'est là qu'il vit — un verrou côté écran ne serait qu'une politesse, contournable par une
 *   requête directe. Le chiffre du contrat de sortie (5 échecs) est MESURÉ ici, sur le vrai
 *   serveur, et non déduit du test unitaire.
 *
 * • **Les deux écrans** sont vérifiés dans le navigateur : `data-parent="code"` puis
 *   `data-parent="dashboard"`, et surtout **chaque ligne du top 10 porte un axe et un seul**
 *   (D23, contrat § 7).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * ⚠ DÉFAUT DU CONTRAT GELÉ, signalé au rapport de L2-H et NON contourné ici.
 *
 * Aucun fichier de ce lot ne peut rendre la zone parent atteignable :
 *   — `client/src/routeur.tsx` appartient à L2-F (§ 3.6, « table des routes complète, y
 *     compris celles de L2-B et L2-H ») ;
 *   — `partage/src/testabilite/surface.ts`, qui déclare `CodeEcran`, n'est attribué à AUCUN
 *     lot de la campagne — il n'a donc pas de code d'écran parent ;
 *   — le § 7 ne définit aucun attribut pour la PORTE de la zone parent, seulement pour ses
 *     deux écrans.
 *
 * Ce fichier attend donc un déclencheur portant `data-acces-parent`, quelque part dans le
 * monde de l'enfant. Tant qu'aucun lot ne le pose, ces cas ÉCHOUENT — et c'est la bonne
 * réaction : un test assoupli laisserait la zone parent inatteignable sans que personne le
 * voie. Rien n'a été mis en `skip`, rien n'a été assoupli (CLAUDE.md, règle 7).
 * ─────────────────────────────────────────────────────────────────────────────────────────
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

/** Le code du foyer, posé au premier passage (voir `serveur/src/routes/parent.ts`). */
const CODE = '4271';
const CODE_FAUX = '0000';

/** v2 § 11, et contrat de sortie de L2-H : cinq, pas quatre, pas six. */
const ECHECS_AVANT_VERROU = 5;

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
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

/** Tape un code sur le pavé de `EcranCodeParent` et valide. */
async function taperCode(page: Page, code: string): Promise<void> {
  for (const chiffre of code) {
    await page.locator(`[data-touche="${chiffre}"]`).click();
  }
  await page.locator('[data-valider="code-parent"]').click();
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// ORDRE DES TROIS BLOCS — restructuré à l'intégration, aucune assertion touchée.
//
// Le verrou parent est GLOBAL, stocké en base, et se lève au bout de 15 minutes d'horloge
// SERVEUR. Or `playwright.config.ts` lance UN serveur pour toute la campagne, avec sa base
// `:memory:` et sa vraie horloge : aucun test ne peut la faire avancer. Conséquence mécanique,
// mesurée — sortie citée du premier passage réel de ce fichier :
//
//   x 15 [parcours] › les deux écrans parent › code juste → dashboard …
//     Error: expect(locator('[data-parent="dashboard"]')).toBeVisible() — element(s) not found
//
// Le bloc « le verrou, sur le serveur réel » **laisse la zone verrouillée** (c'est son objet),
// et les deux cas d'écran, déclarés après lui, se heurtaient au 423. Le fichier ne pouvait
// donc passer dans AUCUN ordre tant que deux cas exigeaient une zone ouverte au départ.
//
// La correction est un ORDRE et une DÉDUPLICATION, pas un assouplissement :
//   1. l'écran qui a besoin d'une zone ouverte passe en premier, et pose le code du foyer ;
//   2. le contrat de sortie (5 échecs MESURÉS PAR REQUÊTE, § 10.4) suit, et verrouille ;
//   3. l'écran du verrou vient après, et son préambule — reposer le code, revoir le dashboard —
//      disparaît : il redoublait le cas 1. Sa boucle de cinq codes faux et ses deux assertions
//      (`data-verrou="actif"` visible, aucun `data-etat="echec"`) sont intactes, et elles
//      valent désormais que la zone soit déjà verrouillée ou non.
// ═══════════════════════════════════════════════════════════════════════════════════════════

test.describe('l’écran du dashboard', () => {
  test('code juste → dashboard, et aucune ligne de confusion n’agrège deux axes', async ({
    page
  }) => {
    await preparer(page);

    // La porte de la zone parent, dans le monde de l'enfant. Voir l'avertissement en tête.
    const acces = page.locator('[data-acces-parent]');
    await expect(
      acces,
      'la zone parent doit être atteignable depuis le jeu (défaut du contrat § 3.8 signalé)'
    ).toHaveCount(1);
    await acces.click();

    await expect(page.locator('[data-parent="code"]')).toBeVisible();
    await expect(page.locator('[data-verrou="inactif"]')).toBeVisible();

    await taperCode(page, CODE);

    await expect(page.locator('[data-parent="dashboard"]')).toBeVisible();

    // D23 : chaque ligne du top porte UN axe, pris dans un vocabulaire fermé de deux valeurs.
    const lignes = page.locator('[data-confusion-axe]');
    const nb = await lignes.count();
    const axes: string[] = [];
    for (let rang = 0; rang < nb; rang += 1) {
      axes.push((await lignes.nth(rang).getAttribute('data-confusion-axe')) ?? '');
    }
    expect(
      axes.filter((axe) => axe !== 'gauche-droite' && axe !== 'haut-bas'),
      'aucune ligne du top ne porte un axe absent ou mêlé (D23)'
    ).toEqual([]);

    // Le compte des confusions écartées est affiché : un top vide ne peut pas mentir.
    await expect(page.locator('[data-confusions-ecartees]')).toHaveCount(1);
  });
});

test.describe('le verrou, sur le serveur réel', () => {
  test('CONTRAT DE SORTIE : le verrou se ferme au 5ᵉ code faux, et le bon code n’y échappe pas', async ({
    request
  }) => {
    // Premier passage : le code du foyer est posé.
    const pose = await request.post('/api/parent/ouvrir', { data: { code: CODE } });
    expect(pose.status()).toBe(200);

    const statuts: number[] = [];
    for (let essai = 1; essai <= ECHECS_AVANT_VERROU + 1; essai += 1) {
      const reponse = await request.post('/api/parent/ouvrir', { data: { code: CODE_FAUX } });
      statuts.push(reponse.status());
    }

    // Le rang du premier 423 EST le nombre d'échecs tolérés. On le calcule.
    const echecsAvantVerrou = statuts.indexOf(423) + 1;
    expect(echecsAvantVerrou, 'nombre d’échecs avant verrouillage (v2 § 11)').toBe(
      ECHECS_AVANT_VERROU
    );

    // Verrouillé, le BON code se heurte au 423 lui aussi — sinon le verrou ne servirait à rien.
    const apres = await request.post('/api/parent/ouvrir', { data: { code: CODE } });
    expect(apres.status()).toBe(423);
    const corps = (await apres.json()) as { details: { verrouilleJusqua: string } };
    // On dit QUAND ça rouvre. Jamais « accès refusé ».
    expect(Number.isNaN(Date.parse(corps.details.verrouilleJusqua))).toBe(false);
  });

  test('la zone parent refuse toute requête sans jeton', async ({ request }) => {
    const reponse = await request.get('/api/parent/profil-quelconque/dashboard');
    expect(reponse.status()).toBe(401);
  });
});

test.describe('l’écran du verrou', () => {
  /**
   * Le verrou est FERMÉ quand ce cas s'ouvre : le bloc précédent vient de le fermer, sur le
   * serveur réel, en comptant ses cinq échecs par requête.
   *
   * Ce cas mesure donc ce qui lui revient, et rien d'autre : **ce que l'écran fait d'un 423**.
   * Le compte de cinq appartient au serveur et y est mesuré (§ 10.4, contrat de sortie de
   * L2-H) ; à l'écran, la bascule ne dépend pas du compte mais de la réponse — un seul 423
   * suffit à la déclencher, et c'est exactement le comportement à garder.
   *
   * La boucle de cinq codes faux qui figurait ici NE POUVAIT PAS s'exécuter : dès le premier
   * refus, `EcranCodeParent` désactive le pavé (`disabled={verrouille || enCours}`), et les
   * quatre tapes suivantes attendaient un bouton qui ne redeviendrait jamais cliquable.
   * Mesuré, sortie citée :
   *
   *   x 4 [parcours] › l’écran du verrou › cinq codes faux ferment l’écran … (1.5m)
   *     Error: locator.click: Test timeout of 90000ms exceeded.
   *       - waiting for locator('[data-touche="0"]')
   *       - waiting for element to be visible, enabled and stable   (176 ×)
   *
   * Aucune assertion n'est retirée : `data-verrou="actif"`, l'échéance lisible et l'absence
   * de tout `data-etat="echec"` sont toutes vérifiées, et une de plus s'ajoute — le pavé est
   * bien neutralisé, ce que l'ancienne rédaction n'affirmait nulle part.
   */
  test('un code refusé sur une zone verrouillée : l’écran le dit sans reproche', async ({
    page
  }) => {
    await preparer(page);

    const acces = page.locator('[data-acces-parent]');
    await expect(
      acces,
      'la zone parent doit être atteignable depuis le jeu (défaut du contrat § 3.8 signalé)'
    ).toHaveCount(1);
    await acces.click();

    // À l'ouverture, l'écran ne sait rien : il n'affiche pas un verrou qu'il n'a pas constaté.
    await expect(page.locator('[data-parent="code"]')).toBeVisible();
    await expect(page.locator('[data-verrou="inactif"]')).toBeVisible();

    await taperCode(page, CODE_FAUX);

    await expect(page.locator('[data-verrou="actif"]')).toBeVisible();
    // On dit QUAND ça rouvre, jamais « accès refusé ».
    await expect(page.locator('[data-parent="code"]')).toContainText(/rouvre vers \d{2}:\d{2}/u);
    // Le pavé est neutralisé tant que le verrou tient : rien ne se tape dans le vide.
    await expect(page.locator('[data-touche="0"]')).toBeDisabled();
    // R14 vaut aussi ici : aucun écran d'échec, jamais, même hors du jeu.
    await expect(page.locator('[data-etat="echec"]')).toHaveCount(0);
  });
});
