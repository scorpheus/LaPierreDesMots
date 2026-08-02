/**
 * La séquence d'ouverture, dans le vrai navigateur — D35, lot N4, annexe T § T3.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LES QUATRE PROPRIÉTÉS, ET POURQUOI CHACUNE A BESOIN DE L'APPLICATION ENTIÈRE
 *
 *  1. **VUE UNE FOIS** — le serveur enregistre `ouverture_vue`. Le test composant ne peut rien
 *     en dire : il n'a pas de base. Ici, le POST part vraiment, la migration 007 a vraiment
 *     tourné, et `GET` relit vraiment.
 *  2. **SAUTABLE** — la sortie répond au PREMIER tap, dans un vrai navigateur tactile, sur le
 *     gabarit de la Galaxy Tab S10 FE. C'est le contrat de sortie de N4.
 *  3. **REJOUABLE** — on y revient, et on y revient encore. D35 point 3 : « un enfant qui n'a
 *     pas suivi la première fois doit pouvoir y revenir SEUL ».
 *  4. **JAMAIS SUR LE CHEMIN OBLIGATOIRE** — c'est la propriété que D46 exige et que N4 a
 *     tranchée : depuis l'écran de profils, on atteint la carte SANS jamais traverser
 *     l'ouverture. Le test le prouve par l'absence, ce qu'aucune revue de code ne fait bien.
 *
 * Deux règles de l'annexe T § 6 gouvernent chaque ligne :
 *   • on attend un ÉTAT, jamais une durée — aucun `waitForTimeout` ici ;
 *   • on ne cible QUE des attributs `data-*`.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const sequence = JSON.parse(
  readFileSync(fileURLToPath(new URL('contenu/monde/ouverture.json', RACINE)), 'utf8')
) as { readonly tableaux: readonly { readonly code: string; readonly texte: string }[] };

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

/**
 * Démarrage propre.
 *
 * `profil` permet de substituer la fixture par un profil RÉELLEMENT créé en base — le cas
 * « VUE UNE FOIS » en a besoin, parce qu'il interroge le serveur sur ce profil. Par défaut la
 * fixture suffit : les autres cas ne parlent qu'au client.
 */
async function preparer(page: Page, profil: unknown = fixtureProfil): Promise<void> {
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
    { fixture: profil, graine: GRAINE, instant: INSTANT }
  );
}

/** Le chemin de l'enfant : je choisis mon profil, je vois la carte. */
async function allerALaCarte(page: Page): Promise<void> {
  await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
  await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
}

test.describe('la séquence d’ouverture', () => {
  test('D46 — elle n’est JAMAIS sur le chemin obligatoire vers le jeu', async ({ page }) => {
    await preparer(page);
    await expect(page.locator('[data-ecran="profils"]')).toBeVisible();

    // Le tap qui choisit le profil. Un seul, et il mène au monde.
    await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();

    // La preuve par l'ABSENCE : aucun écran d'ouverture ne s'est interposé.
    // « Aucun écran intermédiaire obligatoire, nulle part » (D46, point 3).
    await expect(page.locator('[data-ecran="ouverture"]')).toHaveCount(0);
  });

  test('D35 — elle est trouvable depuis la carte, en un tap, et nommée', async ({ page }) => {
    await preparer(page);
    await allerALaCarte(page);

    const entree = page.locator('[data-vers="ouverture"]');
    await expect(entree).toBeVisible();
    await entree.click();
    await expect(page.locator('[data-ecran="ouverture"]')).toBeVisible();
  });

  test('elle commence par le premier tableau du récit et porte son texte entier', async ({
    page
  }) => {
    await preparer(page);
    await allerALaCarte(page);
    await page.locator('[data-vers="ouverture"]').click();

    const ecran = page.locator('[data-ecran="ouverture"]');
    await expect(ecran).toHaveAttribute('data-tableau-courant', sequence.tableaux[0]!.code);
    await expect(page.locator(`[data-texte-tableau="${sequence.tableaux[0]!.code}"]`)).toHaveText(
      sequence.tableaux[0]!.texte
    );
  });

  test('SAUTABLE — la sortie est là au premier rendu et répond au premier tap', async ({
    page
  }) => {
    await preparer(page);
    await allerALaCarte(page);
    await page.locator('[data-vers="ouverture"]').click();

    const ouverture = page.locator('[data-ecran="ouverture"]');
    await expect(ouverture).toBeVisible();
    // La donnée est opposable : `passableDesMs` vient de `contenu/monde/ouverture.json`, gelé
    // à 0 par `contenu/schemas/ouverture.schema.json`.
    await expect(ouverture).toHaveAttribute('data-passable-des-ms', '0');

    await page.locator('[data-passer="ouverture"]').click();
    // Elle rend la main sur le monde, jamais sur un écran vide.
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  });

  test('VUE EN ENTIER — les cinq tableaux s’enchaînent au tap, puis rendent la main', async ({
    page
  }) => {
    await preparer(page);
    await allerALaCarte(page);
    await page.locator('[data-vers="ouverture"]').click();

    const ouverture = page.locator('[data-ecran="ouverture"]');
    for (const tableau of sequence.tableaux) {
      await expect(ouverture).toHaveAttribute('data-tableau-courant', tableau.code);
      await page.locator('[data-suite="ouverture"]').click();
    }
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  });

  test('REJOUABLE — on y revient, et elle repart du début', async ({ page }) => {
    await preparer(page);
    await allerALaCarte(page);

    for (let passage = 1; passage <= 3; passage += 1) {
      await page.locator('[data-vers="ouverture"]').click();
      await expect(page.locator('[data-ecran="ouverture"]')).toHaveAttribute(
        'data-tableau-courant',
        sequence.tableaux[0]!.code
      );
      await page.locator('[data-passer="ouverture"]').click();
      await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
    }
  });

  test('VUE UNE FOIS — le serveur retient le passage, et le premier l’emporte (R14)', async ({
    page,
    request
  }) => {
    // ── LE PROFIL DOIT EXISTER CÔTÉ SERVEUR, et il n'existait pas ─────────────────────────
    // Corrigé à l'intégration de la campagne N. Ce cas partait de `fixtureProfil['id']`,
    // c'est-à-dire `profil-test-enfant`, un identifiant qui ne vit que dans le fichier de
    // fixture. `window.__test.chargerProfil()` l'injecte dans le MAGASIN du client et
    // n'écrit rien en base — c'est sa raison d'être. La base de la suite E2E est
    // `:memory:`, donc vide ; mesuré sur un serveur neuf :
    //
    //     $ curl -s http://127.0.0.1:8097/api/profils   ->   []
    //
    // Les trois appels partaient donc sur un profil inconnu et le serveur répondait, à
    // juste titre, `{ code: 'introuvable', message: 'Profil inconnu : profil-test-enfant' }`.
    // Ce n'était pas un défaut du produit : `ouverture_vue` référence `profils(id)`, et en
    // usage réel le profil est créé par `POST /api/profils` avant de jouer. C'était la
    // PRÉMISSE du test qui était fausse.
    //
    // On crée donc le profil comme l'application le fait, et on suit l'identifiant que le
    // serveur attribue — jamais un littéral, qui redeviendrait faux au premier changement
    // de schéma d'identifiants.
    const creation = await request.post('/api/profils', {
      data: { prenom: String(fixtureProfil['prenom']) }
    });
    expect(creation.status(), 'le profil de la séquence doit être créé côté serveur').toBe(201);
    const profil = String(((await creation.json()) as { readonly id: unknown }).id);

    await preparer(page, { ...fixtureProfil, id: profil });
    await allerALaCarte(page);

    const avant = await (await request.get(`/api/profils/${profil}/ouverture`)).json();
    expect(avant).toMatchObject({ vue: false, nbRejeux: 0 });

    // Premier passage : l'enfant regarde le récit en entier.
    await page.locator('[data-vers="ouverture"]').click();
    for (let rang = 0; rang < sequence.tableaux.length; rang += 1) {
      await page.locator('[data-suite="ouverture"]').click();
    }
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();

    await expect
      .poll(async () => (await request.get(`/api/profils/${profil}/ouverture`)).json())
      .toMatchObject({ vue: true, passee: false, nbRejeux: 0 });

    // Second passage : il le saute. « L'a-t-il vue ? » reste OUI — un acquis n'est jamais
    // repris, et c'est ce que le parent lira.
    await page.locator('[data-vers="ouverture"]').click();
    await page.locator('[data-passer="ouverture"]').click();
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();

    await expect
      .poll(async () => (await request.get(`/api/profils/${profil}/ouverture`)).json())
      .toMatchObject({ vue: true, passee: false, nbRejeux: 1 });
  });

  test('AUCUN ÉTAT SANS ISSUE — même décors coupés, la séquence se quitte', async ({ page }) => {
    // Les SVG de l'ouverture ne répondent plus. Le récit doit rester lisible et sortable :
    // « le décor est optionnel, pas le récit ». C'est le scénario d'un asset non déployé —
    // exactement l'état du dépôt tant que N7 n'a pas rendu le graphisme définitif.
    await page.route('**/api/contenu/assets/habillages/ouverture/**', (route) =>
      route.fulfill({ status: 404, body: '' })
    );

    await preparer(page);
    await allerALaCarte(page);
    await page.locator('[data-vers="ouverture"]').click();

    await expect(page.locator('[data-ecran="ouverture"]')).toBeVisible();
    await expect(page.locator(`[data-texte-tableau="${sequence.tableaux[0]!.code}"]`)).toBeVisible();
    await page.locator('[data-passer="ouverture"]').click();
    await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  });
});
