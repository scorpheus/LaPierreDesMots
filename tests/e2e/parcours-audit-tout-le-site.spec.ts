/**
 * QA — TOUT LE SITE. Demande du père, verbatim : « la qa est extremement important pour tester
 * tout les cas de jeu et tenter de tout realiser ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CETTE SUITE GARDE, ET QU'AUCUNE AUTRE NE GARDAIT
 *
 * Le père a rencontré un état sans issue dans Les Galeries alors que **23 parcours E2E
 * passaient au vert**. Ce n'est pas une malchance, c'est une propriété de ces 23 parcours :
 * chacun suit un chemin choisi d'avance. Un chemin heureux ne visite jamais l'écran auquel
 * personne n'a pensé — et c'est précisément celui qui n'a pas de bouton retour.
 *
 * Cette suite ne suit aucun chemin choisi d'avance. Elle ÉNUMÈRE les écrans depuis le code
 * (`ecransDeclares()` lit les `data-ecran="…"` de `client/src/**`), les atteint par une
 * recette d'interaction RÉELLE, et exige de chacun :
 *   • une sortie ;
 *   • des cibles ≥ 64 px (R16) ;
 *   • aucun élément interactif mort.
 *
 * Puis elle compare **écrans déclarés** et **écrans visités**, et échoue si l'écart n'est pas
 * nul — dans les DEUX SENS. C'est le seul dispositif qui empêche une QA de mentir sur sa
 * couverture, et c'est la demande explicite du père.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI LES RECETTES SONT ÉCRITES À LA MAIN, ET POURQUOI CE N'EST PAS LA FAIBLESSE
 *    QU'ON CROIT ─────────────────────────────────────────────────────────────────────────
 * Une liste écrite à la main prend du retard sur le code. C'est vrai de l'INVENTAIRE, et
 * l'inventaire est donc dérivé. Ce n'est pas vrai des RECETTES : une recette ne peut pas être
 * dérivée, parce que « comment un enfant arrive-t-il ici » n'est écrit nulle part dans le
 * code. Le dispositif du § 5 rend l'oubli impossible malgré tout — un écran déclaré sans
 * recette fait échouer la suite, en le NOMMANT. La liste ne peut donc pas prendre du retard
 * en silence, et c'est tout ce qu'on lui demande.
 *
 * LES SIX DÉFAUTS DU PÈRE, ET QUI LES GARDE ICI :
 *   n° 1 « pas de bouton retour dans les galeries »  → « a au moins une sortie », sur CHAQUE écran
 *   n° 4 « je n'ai eu qu'un exercice dans la clairière » → « les deux régions, dans les deux sens »
 *   n° 6 « c'est quoi le code pour l'espace parent »  → `parcours-qa-parent.spec.ts`
 * Les défauts n° 2 (bouton écouter), n° 3 (le `d`) et n° 5 (graphisme) sont gardés par
 * `parcours-qa-moteurs.spec.ts`, `parcours-qa-ductus.spec.ts` et les suites de leurs lots.
 *
 * Aucune attente de durée (annexe T § 6) : on attend un état, jamais un délai.
 */
import { expect, test } from './invariants.js';
import { auditerInteractions, empreintesCouleurs, repererCommandes, taperCommandeReperee, valeursFormulaires } from './audit-interactions.js';

import type { Page } from '@playwright/test';

import { readdirSync } from 'node:fs';

import {
  CIBLE_MINIMALE_PX,
  cheminDepot,
  SELECTEUR_INTERACTIF,
  choisirLeProfil,
  ciblesTropPetites,
  ecranCourant,
  deuxImages,
  ecransDeclares,
  entrerDansLeNoeud,
  etatDuJeu,
  lireTexte,
  noeudsLivres,
  recettesDEcrans,
  preparer,
  taperElement,
} from './qa-outils.js';

import type { EcranQA } from './qa-outils.js';

/** Au-delà, on ne cherche plus : un écran sans sortie dans ses 60 premiers taps n'en a pas. */
const ELEMENTS_MAX_AUDITES = 60;

const NOEUDS = noeudsLivres();
const ECRANS_DECLARES = ecransDeclares();
const ECRANS = recettesDEcrans();

/** Amène la page sur l'écran de la recette, et VÉRIFIE qu'on y est bien arrivé. */
async function allerSur(page: Page, ecran: EcranQA): Promise<void> {
  await ecran.aller(page);
  await expect(
    page.locator(`[data-ecran="${ecran.attendu}"]`),
    `la recette « ${ecran.nom} » devait mener à data-ecran="${ecran.attendu}"`,
  ).toBeVisible();
}

/**
 * Cherche une SORTIE : un élément interactif dont le tap change d'écran.
 *
 * ── DEUX PASSES, POUR LA MÊME RAISON QUE L'AUDIT DES ÉLÉMENTS MORTS ────────────────────────
 *   Passe A — en avant, sans recharger : on tape 0, 1, 2 … et on s'arrête DÈS que l'écran
 *             change. Sur un écran qui a une sortie, c'est une seule mise en place, et la
 *             réponse arrive en quelques taps.
 *   Passe B — à froid, élément par élément : n'est atteinte que si la passe A n'a rien trouvé,
 *             c'est-à-dire au bord de l'échec. Elle existe parce qu'un tap peut en masquer un
 *             autre — un panneau qui se replie, une liste qui se réordonne —, et on ne veut
 *             pas déclarer « aucune sortie » sans avoir essayé chaque prise isolément.
 *
 * Le verdict est identique à celui d'un balayage à froid intégral ; le coût ne l'est pas. La
 * version précédente rechargeait l'écran une fois par élément, y compris sur les écrans dont
 * la sortie est le premier bouton.
 */
async function chercherUneSortie(
  page: Page,
  ecran: EcranQA,
): Promise<{ trouvee: string | null; nbInteractifs: number; depart: string }> {
  await allerSur(page, ecran);
  const depart = await ecranCourant(page);
  const nbInteractifs = await page.locator(SELECTEUR_INTERACTIF).count();
  const aTenter = Math.min(nbInteractifs, ELEMENTS_MAX_AUDITES);

  // Passe A — en avant.
  for (let rang = 0; rang < aTenter; rang += 1) {
    const tape = await taperElement(page, rang);
    if (tape === null) continue;
    if ((await ecranCourant(page)) !== depart) {
      return { trouvee: tape.description, nbInteractifs, depart };
    }
  }

  // Passe B — à froid, seulement si la passe A n'a rien trouvé.
  for (let rang = 0; rang < aTenter; rang += 1) {
    await allerSur(page, ecran);
    const tape = await taperElement(page, rang);
    if (tape === null) continue;
    if ((await ecranCourant(page)) !== depart) {
      return { trouvee: tape.description, nbInteractifs, depart };
    }
  }
  return { trouvee: null, nbInteractifs, depart };
}

// ═══════════════════════════════════════════════════════════════ 1. AUCUN ÉTAT SANS ISSUE

test.describe('QA — chaque écran du site a une sortie', () => {
  test.slow();

  for (const ecran of ECRANS) {
    test(`« ${ecran.nom} » a au moins une sortie`, async ({ page }) => {
      const { trouvee, nbInteractifs, depart } = await chercherUneSortie(page, ecran);
      expect(
        trouvee,
        `${depart} : ${String(nbInteractifs)} éléments interactifs, aucun ne mène ailleurs. ` +
          `C'est le défaut n° 1 du père, sur un autre écran.`,
      ).not.toBeNull();
    });
  }
});

// ═══════════════════════════════════════════════════════════ 2. R16 — LES CIBLES DU DOIGT

test.describe('QA — R16 : aucune cible sous 64 px', () => {
  test.slow();

  for (const ecran of ECRANS) {
    test(`« ${ecran.nom} » n’offre que des cibles ≥ ${String(CIBLE_MINIMALE_PX)} px`, async ({
      page,
    }) => {
      await allerSur(page, ecran);
      const petites = await ciblesTropPetites(page);
      expect(
        petites.map((c) => `${c.description} ${String(c.largeur)}×${String(c.hauteur)}`),
        'R16 : « cibles ≥ 64 px, aucune coordination fine exigée »',
      ).toEqual([]);
    });
  }
});

// ═════════════════════════════════════════════════ 3. AUCUN ÉLÉMENT INTERACTIF MORT

/**
 * Balayage de réactions observables, sans promesse de justesse métier ni de hit-testing.
 * Chaque commande initiale conserve un repère DOM ; sa disparition ou son remplacement
 * reste non vérifié. La seconde passe rétablit l'écran après une navigation d'amorçage.
 * Les parcours spécifiques restent responsables de l'effet métier attendu.
 */
test.describe('QA — réactions des commandes inventoriées', () => {
  test.slow();

  for (const ecran of ECRANS) {
    test(`« ${ecran.nom} » : chaque commande inventoriée est observée`, async ({ page, serveurIsole }) => {
      let inventaire: string[] = [];
      const verdicts = await auditerInteractions({
        async restaurer() {
          if (ecran.attendu === 'dashboard') {
            // Valider un brouillon retire son bouton Rejeter : une simple navigation
            // ne remet pas les données à neuf pour explorer cette autre branche.
            await page.goto('/');
            await serveurIsole.reinitialiser();
          }
          await allerSur(page, ecran);
          if (ecran.attendu === 'dashboard') {
            await expect(page.locator('[data-indicateur="reglages"]')).toBeVisible();
            await expect(page.locator('[data-indicateur="relecture"]')).toBeVisible();
          }
          if (ecran.attendu === 'chaudron') {
            // Le main existe pendant le chargement du paquet, avant les couleurs et prises.
            await expect(page.locator('[data-ecran="chaudron"] [data-moteur="libre"]')).toBeVisible();
          }
          // Le repli SVG précède l'illustration chargée ; inventorier ses cercles
          // reviendrait à demander ensuite des commandes qui n'ont jamais été livrées.
          for (const scene of await page.locator('svg[data-decor]').all()) {
            await expect(scene).toHaveAttribute('data-decor', 'habillage');
          }
          for (const scene of await page.locator('[data-masque-raster]').all()) {
            await expect(scene).toHaveAttribute('data-masque-raster', 'pret');
          }
          inventaire = await repererCommandes(page, SELECTEUR_INTERACTIF);
        },
        ecran: () => ecranCourant(page),
        async inventorier() { return inventaire; },
        async taper(cible) {
          const avantEcran = await ecranCourant(page);
          const avantEtat = JSON.stringify(await etatDuJeu(page));
          const avantCouleurs = await empreintesCouleurs(page);
          const avantFormulaires = await valeursFormulaires(page);
          const [, reperes] = JSON.parse(cible) as [string, [string, string][]];
          const codeExport = reperes.find(([nom]) => nom === 'data-export')?.[1];
          const telechargement = codeExport !== undefined &&
            await page.locator(`[data-export="${codeExport}"]`).count() === 1
            ? page.waitForEvent('download') : null;
          const observation = await taperCommandeReperee(page, cible);
          if (observation === null) return null;
          if (telechargement !== null) {
            const fichier = await telechargement;
            expect(fichier.suggestedFilename()).toBe(`pierre-${codeExport}.csv`);
            expect(await fichier.failure()).toBeNull();
          }
          await deuxImages(page);
          const apresDom = await page.evaluate(() => document.body.innerHTML);
          const apresCouleurs = await empreintesCouleurs(page);
          const apresFormulaires = await valeursFormulaires(page);
          return {
            cible,
            effet: telechargement !== null || observation.avantDom !== apresDom ||
              JSON.stringify(apresCouleurs) !== JSON.stringify(avantCouleurs) ||
              JSON.stringify(apresFormulaires) !== JSON.stringify(avantFormulaires) ||
              await ecranCourant(page) !== avantEcran ||
              JSON.stringify(await etatDuJeu(page)) !== avantEtat,
          };
        },
      });
      expect(verdicts.length, 'inventaire de commandes vide').toBeGreaterThan(0);
      expect(
        verdicts.filter((verdict) => verdict.statut !== 'observe'),
        `${ecran.nom} : commandes muettes ou non vérifiées ; un signal DOM ne prouve pas la justesse métier`,
      ).toEqual([]);
    });
  }
});
// ═══════════════════════════════════════════ 4. LES DEUX RÉGIONS, DANS LES DEUX SENS

test.describe('QA — le parcours complet et les deux régions', () => {
  test.slow();

  test('la Clairière enchaîne une SORTIE de 4 à 6 nœuds, pas un exercice isolé', () => {
    // Défaut n° 4 du père : « dans la clairiere je n ai eu qu un exercice, est-ce normal ? ».
    // La réponse tenue par ce cas : non. R13 demande 4 à 6 nœuds par sortie.
    const clairiere = NOEUDS.filter((n) => n.region === 'clairiere');
    expect(
      clairiere.length,
      `la Clairière livre ${String(clairiere.length)} nœud(s) ; R13 en demande 4 à 6`,
    ).toBeGreaterThanOrEqual(4);
  });

  test('D38 — les deux régions sont proposées AU DÉPART, sur un profil neuf', async ({ page }) => {
    // Un prénom PROPRE : « profil neuf » doit l'être vraiment. Les audits qui précèdent dans
    // ce fichier tapent tout ce qu'ils trouvent sur les douze écrans de nœud et terminent donc
    // des exercices ; sans profil vierge, les Galeries seraient déjà closes ici.
    const PRENOM = 'Iris';
    await preparer(page, PRENOM);
    await choisirLeProfil(page, PRENOM);
    const departs = await page
      .locator('[data-depart]')
      .evaluateAll((noeuds) => noeuds.map((e) => e.getAttribute('data-depart') ?? ''));
    // D38 : « Les deux régions sont ouvertes d'emblée. » Nommées, pas comptées : un
    // `toHaveLength(2)` ne dirait pas LAQUELLE manque le jour où l'une disparaît.
    expect(departs, `départs offerts : ${departs.join(', ')}`).toContain('clairiere');
    expect(departs, `départs offerts : ${departs.join(', ')}`).toContain('galeries');
  });

  test('on passe d’une région à l’autre DANS LES DEUX SENS, et on en revient', async ({ page }) => {
    // Le défaut n° 1 du père était précisément un aller sans retour, dans la seconde région.
    const regions = [...new Set(NOEUDS.map((n) => n.region))];
    expect(regions.length, 'deux régions sont livrées').toBeGreaterThanOrEqual(2);

    // Même raison qu'au cas précédent : un profil vierge, pour que les deux régions soient
    // réellement ouvertes au moment où l'on essaie de passer de l'une à l'autre.
    const PRENOM = 'Lior';
    // Aller : carte → région A → carte → région B → carte. Chaque retour est EMPRUNTÉ, pas
    // seulement constaté present.
    for (const region of [...regions, ...[...regions].reverse()]) {
      const noeud = NOEUDS.find((n) => n.region === region)!;
      await preparer(page, PRENOM);
      await entrerDansLeNoeud(page, noeud.id, PRENOM);
      await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();

      await page.locator('[data-vers="carte"]').click();
      await expect(
        page.locator('[data-ecran="carte"]'),
        `région « ${region} » : entrée dans ${noeud.id}, pas de retour vers la carte`,
      ).toBeVisible();
    }
  });
});

// ═════════════════════════════════════════════════════════════════ 5. CONTRAT DE SORTIE

/**
 * LE CHIFFRE QUI ÉCHOUE SI LE TRAVAIL EST CREUX — et la demande explicite du père :
 * « un test qui compte les écrans atteignables et les compare aux écrans visités, et qui
 * ÉCHOUE si l'écart n'est pas nul. C'est la seule façon qu'une QA ne mente pas sur sa
 * couverture. »
 *
 * L'écart est vérifié DANS LES DEUX SENS, et les deux comptent :
 *   • déclaré mais non visité  → un écran a échappé à l'audit. C'est le trou par lequel le
 *     défaut du père est passé ;
 *   • visité mais non déclaré  → la recette a atterri ailleurs que prévu, ou un `data-ecran`
 *     a été renommé sans que l'inventaire suive.
 *
 * Ce cas ne peut pas être vert par vacuité : `ecransDeclares()` lève si le motif ne trouve
 * rien, et le plancher ci-dessous refuse un inventaire ridicule.
 */
test('CONTRAT DE SORTIE QA : écrans déclarés = écrans visités, écart nul', () => {
  /**
   * Les trois blocs précédents exécutent déjà `allerSur` pour CHACUNE des 89 recettes et
   * vérifient l'écran obtenu. Le projet Playwright `couverture` dépend du projet `parcours` :
   * ce contrat ne peut donc démarrer qu'après ces visites réelles réussies.
   *
   * Les rejouer une quatrième fois ici ne renforçait aucune assertion. Cela formait au
   * contraire un test monolithique de plusieurs minutes : son garde-fou global expirait au
   * milieu d'une recette innocente et fermait la page, puis les recettes restantes semblaient
   * toutes cassées. On agrège ici les destinations des recettes DÉJÀ validées. Un écran ajouté
   * au code sans recette reste détecté, et une recette qui n'atteint pas sa destination reste
   * rouge dans le projet préalable.
   */
  const visites = new Set(ECRANS.map((ecran) => ecran.attendu));
  const declares = [...ECRANS_DECLARES].sort();
  const couverts = [...visites].sort();
  const jamaisVisites = declares.filter((e) => !visites.has(e));
  const horsInventaire = couverts.filter((e) => !ECRANS_DECLARES.includes(e));

  console.log(
    `[qa] ${String(declares.length)} écran(s) déclaré(s) · ` +
      `${String(couverts.length)} couvert(s) · ${String(ECRANS.length)} recette(s) · ` +
      `${String(NOEUDS.length)} nœud(s) livré(s)`,
  );
  console.log(`[qa] déclarés : ${declares.join(', ')}`);
  console.log(`[qa] couverts : ${couverts.join(', ')}`);
  console.log(`[qa] écart    : ${String(jamaisVisites.length)}`);

  /**
   * L'ÉCART DOIT ÊTRE NUL — mais un écran peut être DÉFENSIF, c'est-à-dire déclaré dans le
   * code sans qu'aucun parcours puisse l'atteindre. `chargement` est le seul du dépôt : les
   * deux branches qui le rendent sont court-circuitées (mesures citées dans
   * `tests/composants/EcranChargement.test.tsx`).
   *
   * On ne l'EXEMPTE pas — une couverture qui s'accorde des dérogations ne prouve plus rien.
   * On exige qu'il soit couvert AILLEURS, et on le VÉRIFIE : le fichier de composant doit
   * exister et nommer l'écran. Un écran qui ne serait ni atteint par un parcours ni couvert
   * par un test de composant fait échouer ce cas, en le nommant.
   */
  const couvertParUnTestDeComposant = (ecran: string): boolean => {
    for (const fichier of readdirSync(cheminDepot('tests/composants'))) {
      if (!/\.tsx?$/.test(fichier)) continue;
      if (lireTexte(`tests/composants/${fichier}`).includes(`data-ecran="${ecran}"`)) return true;
    }
    return false;
  };

  const orphelins = jamaisVisites.filter((e) => !couvertParUnTestDeComposant(e));
  expect(
    orphelins,
    'écrans que l’application sait rendre, qu’aucun parcours n’atteint, et qu’aucun test de ' +
      'composant ne couvre : chacun est un endroit où le défaut du père pourrait se cacher. ' +
      'Ajouter sa recette dans ECRANS, ou un test de composant, ou retirer l’écran s’il est mort.',
  ).toEqual([]);

  // Le renvoi vers un test de composant reste l'EXCEPTION. S'il en fallait plus d'un, c'est
  // que la QA aurait cessé de parcourir le site et se contenterait de monter des fragments.
  expect(
    jamaisVisites.length,
    'trop d’écrans échappent aux parcours — la QA cesserait de mesurer le site réel',
  ).toBeLessThanOrEqual(1);
  console.log(
    `[qa] écrans défensifs, couverts par un test de composant : ` +
      `${jamaisVisites.length === 0 ? '(aucun)' : jamaisVisites.join(', ')}`,
  );
  expect(
    horsInventaire,
    'écrans couverts qui ne figurent dans aucun `data-ecran` du source — inventaire désaccordé',
  ).toEqual([]);

  // Planchers : sans eux, « 0 écart » resterait vrai sur un inventaire vide.
  expect(declares.length, 'inventaire des écrans anormalement pauvre').toBeGreaterThanOrEqual(10);
  expect(NOEUDS.length, 'aucun nœud livré').toBeGreaterThanOrEqual(8);
});
