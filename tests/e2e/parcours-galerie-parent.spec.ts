/**
 * La galerie parent de bout en bout — D34, lot N5, contrat de finition v3 § 4.5 et § 9.2.
 *
 * TROIS PROPRIÉTÉS, ET CE FICHIER LES GARDE TOUTES LES TROIS :
 *
 *   1. **Invisible côté enfant.** Aucun écran du monde de l'enfant ne mène à la galerie
 *      autrement que par la porte à code. Mesuré en comptant les déclencheurs, pas en le
 *      croyant.
 *   2. **Tout exercice lançable.** Le nombre de boutons « Lancer » est égal au nombre de
 *      fiches, et il est > 0. Un catalogue filtré, vide, ou rendu sans ses boutons se voit.
 *   3. **Rien de journalisé.** Chaque bouton de lancement porte `data-journalise="non"`.
 *      Le compte des lignes de `tentatives` est mesuré, lui, par
 *      `tests/unitaires/galerie-non-journalisee.test.ts`, qui porte le témoin qui donne son
 *      sens au zéro. Ici on garde la moitié que seul un navigateur peut voir : le drapeau
 *      arrive bien jusqu'au DOM.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * CE FICHIER EST AUSSI LE PREMIER À TRAVERSER LA PORTE PARENT RÉPARÉE.
 *
 * `playwright.config.ts` lance UN serveur pour toute la campagne, base `:memory:`, et les
 * fichiers de `tests/e2e/` passent dans l'ordre alphabétique : `parcours-galerie-parent`
 * précède `parcours-issues-de-secours`, `parcours-nominal` et les deux `parcours-parent`.
 * C'est donc ici que le code du foyer est posé pour la première fois, par l'écran de
 * définition — exactement comme un parent le ferait. Le préambule ne suppose pourtant RIEN
 * de cet ordre : il traite les deux cas, code posé ou non. Un test qui dépend de l'ordre des
 * fichiers est un test qui cassera au premier renommage.
 * ─────────────────────────────────────────────────────────────────────────────────────────
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
const CODE = '4271';

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

/** Tape les quatre chiffres et valide. Le pavé est le même en définition et en ouverture. */
async function taperCode(page: Page, code: string): Promise<void> {
  for (const chiffre of code) {
    await page.locator(`[data-touche="${chiffre}"]`).click();
  }
  await page.locator('[data-valider="code-parent"]').click();
}

/**
 * Ouvre la zone parent depuis le monde de l'enfant, quel que soit l'état de la porte.
 *
 * Le même geste — quatre chiffres, un tap — pose le code s'il n'existe pas et l'entre s'il
 * existe. C'est la propriété d'écran qui compte pour le parent : il n'a pas à savoir dans
 * quel cas il est.
 */
async function ouvrirLeSuivi(page: Page): Promise<void> {
  await preparer(page);
  await page.locator('[data-acces-parent="oui"]').click();
  await expect(page.locator('[data-parent="code"]')).toBeVisible();
  await taperCode(page, CODE);
  await expect(page.locator('[data-parent="dashboard"]')).toBeVisible();
}

async function ouvrirLaGalerie(page: Page): Promise<void> {
  await ouvrirLeSuivi(page);
  await page.locator('[data-onglet-parent="galerie"]').click();
  await expect(page.locator('[data-indicateur="galerie"]')).toBeVisible();
}

// ══════════════════════════════════════════════════════════ 1. la porte, réparée

test.describe('la porte parent — le code se CHOISIT, il ne se pose plus tout seul', () => {
  test('le premier passage propose de choisir un code, et le dit', async ({ page }) => {
    await preparer(page);
    await page.locator('[data-acces-parent="oui"]').click();

    const porte = page.locator('[data-parent="code"]');
    await expect(porte).toBeVisible();

    // Le mode est LISIBLE dans le DOM : « definition » au premier passage, « ouverture »
    // ensuite. C'est le seul attribut neuf de cette porte, et il porte tout le défaut du
    // contrat § 1.8 : sans lui, les deux situations se rendaient à l'identique.
    const mode = await porte.getAttribute('data-parent-mode');
    expect(
      ['definition', 'ouverture'],
      'la porte doit dire dans quel mode elle est'
    ).toContain(mode ?? '');

    if (mode === 'definition') {
      // En définition, les chiffres se voient : un code mal tapé qu'on ne voit pas
      // enfermerait le parent dehors de sa propre maison (contrat § 7.3).
      await expect(page.locator('[data-code-en-clair="oui"]')).toBeVisible();
      await expect(page.locator('[data-definir="code-parent"]')).toBeVisible();
    }

    await taperCode(page, CODE);
    await expect(page.locator('[data-parent="dashboard"]')).toBeVisible();
  });

  test('une fois le code posé, la porte passe en mode ouverture et y reste', async ({ page }) => {
    await ouvrirLeSuivi(page);
    await preparer(page);
    await page.locator('[data-acces-parent="oui"]').click();
    await expect(page.locator('[data-parent="code"][data-parent-mode="ouverture"]')).toBeVisible();
  });

  test('AUCUN ÉTAT SANS ISSUE : la porte offre toujours un retour au jeu', async ({ page }) => {
    await preparer(page);
    await page.locator('[data-acces-parent="oui"]').click();
    await expect(page.locator('[data-parent="code"]')).toBeVisible();
    await page.getByRole('button', { name: 'Retour au jeu' }).click();
    await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  });
});

// ═════════════════════════════════════════════════ 2. la galerie, et ses trois propriétés

test.describe('la galerie d’exercices — D34', () => {
  test('CONTRAT — chaque fiche est lançable, et aucun lancement n’est journalisé', async ({
    page
  }) => {
    await ouvrirLaGalerie(page);

    const fiches = page.locator('[data-galerie-exercice]');
    const boutons = page.locator('[data-galerie-lancer]');

    const nbFiches = await fiches.count();
    const nbBoutons = await boutons.count();
    const totalAnnonce = Number(
      (await page.locator('[data-indicateur="galerie"]').getAttribute('data-galerie-total')) ?? '0'
    );

    // Les TROIS comptes, jamais un seul : le catalogue annoncé, les fiches rendues, les
    // boutons offerts. Un écart entre deux quelconques d'entre eux est un exercice qu'un
    // parent voit et ne peut pas lancer — ou l'inverse.
    expect(nbFiches, 'une galerie vide rendrait tout ce test creux').toBeGreaterThan(0);
    expect(nbFiches, 'fiches rendues vs catalogue annoncé').toBe(totalAnnonce);
    expect(nbBoutons, '100 % des exercices lançables').toBe(nbFiches);

    // Et chacun de ces boutons porte le drapeau. C'est la seule preuve, VISIBLE DU DEHORS,
    // que `LANCEMENT_PARENT` traverse tout le chemin jusqu'au DOM.
    const drapeaux: string[] = [];
    for (let rang = 0; rang < nbBoutons; rang += 1) {
      drapeaux.push((await boutons.nth(rang).getAttribute('data-journalise')) ?? '');
    }
    expect(
      drapeaux.filter((valeur) => valeur !== 'non'),
      'aucun bouton de la galerie ne doit journaliser'
    ).toEqual([]);
  });

  test('chaque fiche montre moteur, décor, compétences et état de validation', async ({ page }) => {
    await ouvrirLaGalerie(page);

    const fiches = page.locator('[data-galerie-exercice]');
    const nb = await fiches.count();
    expect(nb).toBeGreaterThan(0);

    const sansMoteur: string[] = [];
    const sansHabillage: string[] = [];
    const sansStatut: string[] = [];
    for (let rang = 0; rang < nb; rang += 1) {
      const fiche = fiches.nth(rang);
      const id = (await fiche.getAttribute('data-galerie-exercice')) ?? '?';
      if (((await fiche.getAttribute('data-galerie-moteur')) ?? '') === '') sansMoteur.push(id);
      if (((await fiche.getAttribute('data-galerie-habillage')) ?? '') === '') sansHabillage.push(id);
      if (((await fiche.getAttribute('data-galerie-statut')) ?? '') === '') sansStatut.push(id);
    }

    // Les exercices fautifs sont NOMMÉS, jamais comptés : « 3 fiches incomplètes » n'aide
    // personne à ouvrir le bon fichier.
    expect(sansMoteur, 'exercices sans moteur').toEqual([]);
    expect(sansHabillage, 'exercices sans habillage').toEqual([]);
    expect(sansStatut, 'exercices sans état de validation').toEqual([]);
  });

  test('R12 et R13 sont lisibles à l’œil — c’est le bénéfice que D34 achète', async ({ page }) => {
    await ouvrirLaGalerie(page);

    const parCompetence = page.locator('[data-galerie-competence]');
    const parMoteur = page.locator('[data-galerie-moteur-ligne]');

    expect(
      await parCompetence.count(),
      'le croisement compétence × moteurs doit être rendu (R12)'
    ).toBeGreaterThan(0);
    expect(
      await parMoteur.count(),
      'le croisement moteur × habillages doit être rendu (R13)'
    ).toBeGreaterThan(0);

    // Le tableau ne MENT pas : chaque ligne annonce un compte, et il est ≥ 1 partout — une
    // compétence indexée sans aucun moteur serait une clé orpheline.
    const nb = await parCompetence.count();
    for (let rang = 0; rang < nb; rang += 1) {
      const compte = Number(
        (await parCompetence.nth(rang).getAttribute('data-galerie-nb-moteurs')) ?? '0'
      );
      expect(compte, 'une compétence indexée est travaillée par au moins un jeu').toBeGreaterThan(0);
    }
  });

  test('AUCUN ÉTAT SANS ISSUE : on revient toujours au suivi, puis au jeu', async ({ page }) => {
    await ouvrirLaGalerie(page);
    await page.locator('[data-onglet-parent="suivi"]').click();
    await expect(page.locator('[data-indicateur="confusions"]')).toBeVisible();
    await page.getByRole('button', { name: 'Fermer l’espace parent' }).click();
    await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  });
});

// ══════════════════════════════════════════════ 3. invisible côté enfant, mesuré

test.describe('la galerie est invisible côté enfant — D34, propriété n° 3', () => {
  test('aucun écran du jeu ne porte un déclencheur de galerie', async ({ page }) => {
    await preparer(page);

    // L'écran des profils, puis la carte, puis le campement : les trois écrans que l'enfant
    // traverse. On compte les déclencheurs de galerie sur chacun — le compte doit valoir 0.
    const compter = async (): Promise<number> =>
      (await page.locator('[data-indicateur="galerie"], [data-onglet-parent="galerie"]').count()) +
      (await page.locator('[data-galerie-lancer]').count());

    expect(await compter(), 'écran des profils').toBe(0);

    await page.locator('[data-profil]').first().click();
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
    expect(await compter(), 'carte du monde').toBe(0);

    await page.locator('[data-vers="campement"]').click();
    await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
    expect(await compter(), 'campement').toBe(0);
  });

  test('la route de la galerie exige le jeton parent, même appelée directement', async ({
    request
  }) => {
    // Le seul chemin qui compte vraiment : un enfant qui taperait l'URL. Le serveur refuse,
    // et c'est là que ça se joue — une galerie protégée seulement par l'absence de bouton
    // n'est pas protégée.
    const reponse = await request.get('/api/parent/nimporte-quel-profil/galerie');
    expect(reponse.status()).toBe(401);
  });
});
