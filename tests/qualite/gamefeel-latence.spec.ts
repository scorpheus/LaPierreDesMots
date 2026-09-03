/**
 * La latence et l'absence de feu d'artifice générique — MESURÉES, jamais affirmées.
 *
 * Contrat des features v2 § 10.4 :
 *   • « Délai médian appui → première mutation du DOM » — échoue au-dessus de **100 ms** ;
 *   • « Nombre de particules émises au pic, compté sur le canevas » — doit rester à **0**.
 *
 * Les deux viennent de la v2 § 8 : « une réponse visible en moins de 100 ms sur tout appui,
 * même si le traitement prend plus longtemps ». Ce sont les deux
 * seules affirmations de game feel que rien d'autre ne peut vérifier — un œil humain ne
 * distingue pas 90 ms de 140 ms, et personne ne compte quatorze points à l'écran.
 *
 * MÉTHODE — et elle est choisie pour ne PAS pouvoir se flatter.
 *
 * L'observateur de mutations est restreint au SEUL attribut `data-appui` de la racine du
 * nœud, et n'enregistre que son passage à `oui`. Un observateur large aurait attrapé
 * n'importe quelle mutation — un battement d'horloge, un rendu de scène — et aurait rendu un
 * délai flatteur qui ne mesurerait rien. Ici, ce qui est chronométré est exactement ce que la
 * v2 promet : entre le doigt et la première marque visible à l'écran.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// LE HARNAIS D’ISOLATION (lot P1) : un serveur neuf par cas — base `:memory:` vierge, `Alea`
// rembobiné, port réservé par le noyau. C’est lui qui remplace le `webServer` unique de
// `playwright.config.ts`, et c’est lui qui rend `fullyParallel` légitime.
import { expect, test } from '../harnais-serveur.js';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8')
) as Record<string, unknown>;

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';
const NOEUD = 'clairiere-01';

/** Seuil de la v2 § 8, cité. Ce n'est pas un réglage de ce fichier. */
const LATENCE_MAX_MS = 100;
/** Nombre d'appuis mesurés. Une médiane sur vingt points est stable ; sur trois, non. */
const APPUIS = 20;

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  repondre(action: unknown): Promise<void>;
  etat(): { readonly ecran: string; readonly etatMoteur: unknown };
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & {
  __test: CrochetsTest;
  __latences?: number[];
};

async function preparer(page: Page, avecAnimations: boolean): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
  await page.evaluate(
    async ({ fixture, graine, instant, calme }) => {
      const crochets = (window as FenetreTest).__test;
      // On ne coupe les animations que quand la mesure ne porte PAS sur elles : couper puis
      // compter des particules reviendrait à mesurer un détecteur qu'on a d'abord débranché.
      if (calme) {
        crochets.sauterAnimations();
      }
      crochets.graine(graine);
      crochets.figerHorloge(instant);
      await crochets.chargerProfil(fixture);
    },
    { fixture: fixtureProfil, graine: GRAINE, instant: INSTANT, calme: !avecAnimations }
  );
  await page.evaluate(async (noeud) => {
    await (window as FenetreTest).__test.allerAuNoeud(noeud);
  }, NOEUD);
  await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
  await expect(page.locator('[data-test-pret="oui"]')).toBeVisible();
}

function mediane(valeurs: readonly number[]): number {
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  if (triees.length % 2 === 1) {
    return triees[milieu] ?? Number.NaN;
  }
  return ((triees[milieu - 1] ?? Number.NaN) + (triees[milieu] ?? Number.NaN)) / 2;
}

test.describe('game feel — la règle des 100 ms', () => {
  test('le délai médian appui → première mutation du DOM est sous 100 ms', async ({ page }) => {
    await preparer(page, false);

    // Instrumentation, dans la page. `performance.now()` et non `Date.now()` : la règle ESLint
    // maison interdit la seconde, et c'est une durée d'animation, pas un instant du jeu.
    await page.evaluate(() => {
      const fenetre = window as FenetreTest;
      fenetre.__latences = [];
      const racine = document.querySelector('[data-ecran="noeud"]');
      if (racine === null) {
        throw new Error('racine du nœud absente : rien à observer.');
      }
      let depart: number | null = null;
      window.addEventListener(
        'pointerdown',
        () => {
          depart = performance.now();
        },
        // En capture : on veut l'instant de l'ÉVÉNEMENT, pas celui où l'application a fini
        // de le traiter.
        true
      );
      const observateur = new MutationObserver(() => {
        if (depart !== null && racine.getAttribute('data-appui') === 'oui') {
          fenetre.__latences?.push(performance.now() - depart);
          depart = null;
        }
      });
      observateur.observe(racine, { attributes: true, attributeFilter: ['data-appui'] });
    });

    // Vingt appuis réels, au doigt, à des points différents de la scène.
    const boite = await page.locator('[data-ecran="noeud"]').boundingBox();
    expect(boite, 'la scène doit avoir une boîte mesurable').not.toBeNull();
    for (let appui = 0; appui < APPUIS; appui += 1) {
      const x = boite!.x + boite!.width * (0.2 + 0.03 * (appui % 20));
      const y = boite!.y + boite!.height * 0.6;
      // ─────────────────────────────────────────────────────────────────────────────────
      // ON ATTEND QUE LA MARQUE SOIT RETOMBÉE AVANT DE RAPPUYER.
      //
      // `data-appui` retombe à `non` 120 ms après l'appui (`DUREE_APPUI_MS`). Le sondage
      // ci-dessous ne repartait que sur le COMPTE des mesures : dès qu'une mesure était
      // enregistrée, l'appui suivant partait — souvent dans la fenêtre des 120 ms, alors que
      // l'attribut valait encore `oui`. React n'écrit alors aucune valeur nouvelle, le
      // `MutationObserver` ne voit rien, et le sondage attendait une mesure qui ne viendrait
      // jamais. Mesuré, sortie citée :
      //
      //   Error: page.waitForFunction: Test timeout of 90000ms exceeded.
      //
      // Ce n'est pas une attente arbitraire (annexe T § 6, `waitForTimeout` interdit) : on
      // attend un ÉTAT du DOM, celui qui rend l'appui suivant mesurable. La mesure en sort
      // plus juste, pas plus indulgente — chaque latence part d'une marque retombée.
      // ─────────────────────────────────────────────────────────────────────────────────
      await expect(page.locator('[data-ecran="noeud"][data-appui="non"]')).toHaveCount(1);

      await page.mouse.click(x, y);
      // On attend un ÉTAT — la mesure enregistrée — jamais une durée (annexe T § 6).
      await page.waitForFunction(
        (attendu) => ((window as FenetreTest).__latences?.length ?? 0) >= attendu,
        appui + 1
      );
    }

    const latences = await page.evaluate(() => (window as FenetreTest).__latences ?? []);
    expect(latences).toHaveLength(APPUIS);

    const mediane_ = mediane(latences);
    const pire = Math.max(...latences);
    // La sortie chiffrée est IMPRIMÉE : le rapport de lot cite ces nombres, il ne les invente pas.
    console.log(
      `[L2-A] latence appui → DOM : médiane ${mediane_.toFixed(2)} ms, pire ${pire.toFixed(2)} ms, ` +
        `sur ${String(latences.length)} appuis (seuil ${String(LATENCE_MAX_MS)} ms)`
    );

    expect(mediane_).toBeLessThan(LATENCE_MAX_MS);
    // Le pire cas a droit à une marge : c'est une machine partagée, pas la tablette. Mais il
    // reste borné — un pic à 500 ms se verrait à l'œil nu et doit faire échouer.
    expect(pire).toBeLessThan(LATENCE_MAX_MS * 3);
  });
});

test.describe('game feel — aucune gerbe générique', () => {
  // On lève `reducedMotion: 'reduce'` de `playwright.config.ts` POUR CE BLOC SEULEMENT.
  // Sans cela, la couche de particules est absente du DOM par conception (v2 § 8) et le
  // chiffre du contrat de sortie serait mesuré sur un détecteur débranché.
  test.use({ reducedMotion: 'no-preference' });

  test('une longue série ne déclenche aucun feu d’artifice', async ({ page }) => {
    await preparer(page, true);

    const canevas = page.locator('[data-particules-couche="oui"]');
    await expect(canevas).toBeAttached();

    let pic = 0;

    // Neuf bonnes réponses de suite : le canevas doit rester vide à chaque image.
    for (let geste = 0; geste < 9; geste += 1) {
      const fait = await page.evaluate(async () => {
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
        if (crochets.etat().ecran !== 'noeud') {
          return false;
        }
        const moteur = crochets.etat().etatMoteur as EtatColorieLu | null;
        const cible = moteur?.consignes[moteur.indexConsigne]?.ciblesRestantes[0];
        if (cible === undefined) {
          return false;
        }
        await crochets.repondre({ type: 'choisirCouleur', couleur: cible.couleur });
        await crochets.repondre({ type: 'peindre', region: cible.region });
        return true;
      });
      if (!fait) {
        break;
      }

      // On échantillonne le compteur pendant que la gerbe vit. `data-particules` est écrit à
      // chaque frame par `gamefeel/particules.ts` : c'est le canevas lui-même qui compte.
      for (let echantillon = 0; echantillon < 12; echantillon += 1) {
        const lu = Number((await canevas.getAttribute('data-particules')) ?? '0');
        pic = Math.max(pic, lu);
        await page.evaluate(
          async () => new Promise<void>((resoudre) => requestAnimationFrame(() => { resoudre(); }))
        );
      }
    }

    expect(pic).toBe(0);
  });
});
