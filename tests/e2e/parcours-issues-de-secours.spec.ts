/**
 * REPRODUCTION DU DÉFAUT n° 1 — « dans le deuxième monde les galeries, il n'y a pas de bouton
 * retour ».
 *
 * C'est la règle 3 de la campagne, et la plus grave : **AUCUN ÉTAT SANS ISSUE.** « Le blocage
 * sans issue est le pire bug possible sur une appli d'enfant : il ne saura pas le décrire, il
 * arrêtera simplement de jouer. » Le père vient d'en rencontrer un.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI `singe.spec.ts` NE L'A PAS VU, et pourquoi ce fichier existe à côté de lui.
 *
 * `tests/e2e/singe.spec.ts` mesure `document.querySelectorAll(SELECTEUR_INTERACTIF).length > 0`
 * — « au moins un élément interactif est présent ». Sur l'écran de nœud, cette mesure vaut
 * bien plus que zéro : il y a le bouton « Écouter », le bouton d'aide de Gobi, la scène de
 * tracé, les régions coloriables. Le singe est donc vert, et l'écran est pourtant une
 * impasse.
 *
 * **Compter les éléments interactifs n'est pas compter les SORTIES.** C'est l'audit des
 * occurrences au lieu de l'audit des objets. Ce fichier audite les objets : pour chaque écran
 * atteignable, il ESSAIE chaque élément interactif, un par un, depuis un état neuf, et
 * regarde si l'un d'eux fait changer d'écran. Un écran dont aucun élément ne mène ailleurs
 * est une impasse, quel que soit le nombre de choses qu'on peut y taper.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Aucune attente de durée (annexe T § 6) : après chaque tap on attend DEUX IMAGES RENDUES,
 * ce qui est un état du navigateur, pas un délai. Les navigations du routeur sont des mises à
 * jour d'état React ; deux frames suffisent et la mesure ne dépend d'aucune horloge.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);

function lire<T>(chemin: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(chemin, RACINE)), 'utf8')) as T;
}

const fixtureProfil = lire<Record<string, unknown>>('tests/fixtures/profils/enfant.json');

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

/**
 * Le même sélecteur que `singe.spec.ts`, mot pour mot : on audite exactement la population
 * d'éléments que la suite de robustesse déclare « interactifs ». Le désaccord entre les deux
 * fichiers ne doit pas venir de ce qu'ils regardent, mais de ce qu'ils en concluent.
 */
const SELECTEUR_INTERACTIF = [
  'button:not([disabled])',
  '[role="button"]',
  'a[href]',
  'input',
  'select',
  '[data-godet]',
  '[data-region-svg]',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

/** Au-delà, on ne cherche plus : un écran qui n'a pas de sortie dans ses 60 premiers taps n'en a pas. */
const ELEMENTS_MAX_AUDITES = 60;

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

/** Où l'on se trouve : le code d'écran et le chemin du routeur, ensemble. */
async function positionne(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      `${document.querySelector('[data-ecran]')?.getAttribute('data-ecran') ?? 'aucun'}@${
        window.location.pathname
      }`
  );
}

/** Attend un ÉTAT — deux images rendues —, jamais une durée. */
async function deuxImages(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resoudre) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resoudre();
          });
        });
      })
  );
}

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

/** Une recette pour atteindre un écran depuis un démarrage propre. */
interface EcranAtteignable {
  readonly nom: string;
  readonly aller: (page: Page) => Promise<void>;
}

async function choisirLeProfil(page: Page): Promise<void> {
  await page.getByText(String(fixtureProfil['prenom']), { exact: false }).first().click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
}

async function entrerDansLeNoeud(page: Page, noeud: string): Promise<void> {
  await choisirLeProfil(page);
  await page.evaluate(async (id) => (window as FenetreTest).__test.allerAuNoeud(id), noeud);
  await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
}

/**
 * TOUS les écrans que l'enfant peut atteindre sans code parent.
 *
 * L'écran `recompense` n'est pas dans cette liste : il n'est atteignable qu'en terminant un
 * exercice, ce que `parcours-nominal` et `parcours-trace` font déjà, et ses deux boutons
 * (« rejouer », « retour carte ») y sont vérifiés. La zone parent en est absente aussi : son
 * verrou est un état SERVEUR partagé par toute la campagne, et l'y toucher rendrait cet audit
 * dépendant de l'ordre des fichiers.
 */
const ECRANS: readonly EcranAtteignable[] = [
  {
    nom: 'profils',
    aller: async (page) => {
      await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
    }
  },
  {
    nom: 'reglages-lecture',
    // L'identifiant du profil est attribué par le serveur, jamais celui de la fixture : on
    // vise l'attribut, pas sa valeur.
    aller: async (page) => {
      await page.locator('[data-reglages-lecture]').first().click();
      await expect(page.locator('[data-ecran="reglages-lecture"]')).toBeVisible();
    }
  },
  {
    nom: 'code-parent',
    aller: async (page) => {
      await page.locator('[data-acces-parent="oui"]').click();
      await expect(page.locator('[data-ecran="code-parent"]')).toBeVisible();
    }
  },
  { nom: 'carte', aller: choisirLeProfil },
  {
    nom: 'campement',
    aller: async (page) => {
      await choisirLeProfil(page);
      await page.locator('[data-vers="campement"]').click();
      await expect(page.locator('[data-ecran="campement"]')).toBeVisible();
    }
  },
  {
    nom: 'coffre',
    aller: async (page) => {
      await choisirLeProfil(page);
      await page.locator('[data-vers="campement"]').click();
      await page.locator('[data-vers="coffre"]').click();
      await expect(page.locator('[data-ecran="coffre"]')).toBeVisible();
    }
  },
  {
    // Le nœud de la Clairière — moteur `colorie`.
    nom: 'noeud/clairiere-01 (colorie)',
    aller: async (page) => {
      await entrerDansLeNoeud(page, 'clairiere-01');
      await expect(page.locator('[data-test-pret="oui"]')).toBeVisible();
    }
  },
  {
    // ── L'ÉCRAN OÙ LE PÈRE S'EST TROUVÉ BLOQUÉ. Moteur `trace`, la lettre `d`.
    nom: 'noeud/galeries-01 (trace)',
    aller: async (page) => {
      await entrerDansLeNoeud(page, 'galeries-01');
      await expect(page.locator('[data-moteur="trace"]')).toBeVisible();
    }
  }
];

/**
 * Cherche une SORTIE : un élément interactif dont le tap change d'écran.
 *
 * Chaque tentative repart d'un état neuf — sinon le premier tap modifierait la page et les
 * suivants ne viseraient plus les mêmes éléments.
 */
async function chercherUneSortie(
  page: Page,
  ecran: EcranAtteignable
): Promise<{ trouvee: string | null; nbInteractifs: number; depart: string }> {
  await preparer(page);
  await ecran.aller(page);
  const depart = await positionne(page);
  const nbInteractifs = await page.locator(SELECTEUR_INTERACTIF).count();
  const aTenter = Math.min(nbInteractifs, ELEMENTS_MAX_AUDITES);

  for (let rang = 0; rang < aTenter; rang += 1) {
    if (rang > 0) {
      await preparer(page);
      await ecran.aller(page);
    }

    const decrit = await page.evaluate(
      ({ selecteur, index }) => {
        const cible = document.querySelectorAll(selecteur)[index];
        if (cible === undefined) return null;
        const element = cible as HTMLElement;
        const nom =
          element.getAttribute('aria-label') ??
          element.getAttribute('data-region-svg') ??
          (element.textContent ?? '').trim().slice(0, 40);
        // `dispatchEvent` et non `.click()` : les éléments SVG (`[data-region-svg]`,
        // `[role="button"]` sur un `<circle>`) n'exposent pas tous la méthode `click`, et
        // l'audit doit couvrir EXACTEMENT la population que `singe.spec.ts` déclare
        // interactive — sinon les deux fichiers ne parlent pas de la même chose.
        element.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
        );
        return `${element.tagName.toLowerCase()} « ${nom} »`;
      },
      { selecteur: SELECTEUR_INTERACTIF, index: rang }
    );
    if (decrit === null) continue;

    await deuxImages(page);
    if ((await positionne(page)) !== depart) {
      return { trouvee: decrit, nbInteractifs, depart };
    }
  }

  return { trouvee: null, nbInteractifs, depart };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// DEUX CHOIX D'ORGANISATION, tous deux MESURÉS, tous deux contre-intuitifs.
//
// 1. `describe` SIMPLE, surtout pas `describe.serial`. Un audit doit rendre TOUS ses écrans,
//    y compris après une impasse. Avec `.serial`, la première impasse annulait les suivants —
//    sortie citée : « 1 failed, 2 did not run », et le contrat de sortie n'a jamais donné son
//    compte.
//
// 2. Le contrat de sortie REFAIT l'audit, il ne réutilise pas ce que les cas précédents ont
//    mesuré. Un tableau au niveau du module semblait suffire (workers: 1, fullyParallel:
//    false) : il ne suffit pas. Playwright redémarre le processus travailleur après un cas en
//    échec, et l'état du module repart à zéro. Sortie citée : « [issues] 0 écrans audités,
//    0 sans issue » alors que deux impasses venaient d'être trouvées. Un relevé qui se vide
//    juste quand il y a quelque chose à relever est pire qu'un audit refait : il annonce zéro
//    défaut.
// ═══════════════════════════════════════════════════════════════════════════════════════════
test.describe('aucun état sans issue', () => {
  test.slow();

  for (const ecran of ECRANS) {
    test(`l’écran « ${ecran.nom} » a au moins une sortie`, async ({ page }) => {
      const { trouvee, nbInteractifs, depart } = await chercherUneSortie(page, ecran);
      expect(
        trouvee,
        `${depart} : ${String(nbInteractifs)} éléments interactifs, aucun ne mène ailleurs`
      ).not.toBeNull();
    });
  }

  test('CONTRAT DE SORTIE : écrans audités, et écrans sans issue', async ({ page }) => {
    const releve: { ecran: string; nbInteractifs: number; sortie: string | null }[] = [];
    for (const ecran of ECRANS) {
      const { trouvee, nbInteractifs } = await chercherUneSortie(page, ecran);
      releve.push({ ecran: ecran.nom, nbInteractifs, sortie: trouvee });
    }
    const sansIssue = releve.filter((r) => r.sortie === null);
    // Le chiffre du contrat de sortie doit rester lisible dans la sortie de la campagne.
    console.log(
      `[issues] ${String(releve.length)} écrans audités, ${String(sansIssue.length)} sans issue` +
        (sansIssue.length === 0
          ? ''
          : ` : ${sansIssue
              .map((r) => `${r.ecran} (${String(r.nbInteractifs)} interactifs)`)
              .join(', ')}`)
    );
    expect(releve.length, 'tous les écrans de la liste ont été audités').toBe(ECRANS.length);
    expect(sansIssue.map((r) => r.ecran)).toEqual([]);
  });
});
