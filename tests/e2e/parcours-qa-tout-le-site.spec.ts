/**
 * QA — TOUT LE SITE. Demande du père, verbatim : « il faudrait que tu code des qa pour tester
 * tout le site ».
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CETTE SUITE GARDE, ET QU'AUCUNE AUTRE NE GARDAIT
 *
 * Le père a rencontré un état sans issue dans Les Galeries alors que **23 parcours E2E
 * passaient au vert**. Ce n'est pas une malchance, c'est une propriété de ces 23 parcours :
 * chacun suit un chemin choisi d'avance. Un chemin heureux ne visite jamais l'écran auquel
 * personne n'a pensé — et c'est précisément celui qui n'a pas de bouton retour.
 *
 * Cette suite ne suit aucun chemin. Elle ÉNUMÈRE, depuis le code lui-même :
 *   • toute route déclarée dans `CHEMINS` (`client/src/routeur.tsx`) est visitée ;
 *   • tout écran visité doit avoir une sortie, des cibles ≥ 64 px, et aucun élément mort.
 *
 * Conséquence opposable : **une route ajoutée demain est auditée demain**, sans que personne
 * ne pense à l'inscrire ici. C'est la différence entre auditer les objets et auditer les
 * occurrences, et c'est la seule raison pour laquelle cette suite vaut mieux que les 23
 * parcours qui l'ont précédée.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * LES SIX DÉFAUTS DU PÈRE, ET QUI LES GARDE ICI :
 *   n° 1 « pas de bouton retour dans les galeries »  → « a au moins une sortie », sur CHAQUE écran
 *   n° 4 « je n'ai eu qu'un exercice dans la clairière » → « la sortie enchaîne 4 à 6 nœuds »
 *   n° 6 « c'est quoi le code pour l'espace parent »  → « la zone parent », plus bas
 * Les défauts n° 2 (bouton écouter), n° 3 (le `d`) et n° 5 (graphisme) sont gardés par
 * `parcours-qa-moteurs.spec.ts` et par les suites unitaires de leurs lots.
 *
 * Aucune attente de durée (annexe T § 6) : on attend un état, jamais un délai.
 */
import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import {
  CIBLE_MINIMALE_PX,
  SELECTEUR_INTERACTIF,
  cheminsDuRouteur,
  choisirLeProfil,
  ciblesTropPetites,
  entrerDansLeNoeud,
  etatDuJeu,
  noeudsLivres,
  positionne,
  preparer,
  taperElement,
} from './qa-outils.js';

import type { EcranQA } from './qa-outils.js';

/** Au-delà, on ne cherche plus : un écran sans sortie dans ses 60 premiers taps n'en a pas. */
const ELEMENTS_MAX_AUDITES = 60;

const CHEMINS = cheminsDuRouteur();
const NOEUDS = noeudsLivres();

/**
 * L'inventaire des écrans — DÉRIVÉ, pas recopié.
 *
 * Deux familles, et elles ne se recouvrent pas :
 *   • celles que le routeur expose par une URL : engendrées depuis `CHEMINS`, donc exhaustives
 *     par construction ;
 *   • celles que seul l'état du magasin fait apparaître (`profils`, `carte`, `noeud`) : elles
 *     n'ont pas d'URL propre et demandent une recette d'interaction.
 */
const ECRANS_PAR_URL: readonly EcranQA[] = [...CHEMINS].map(([cle, chemin]) => ({
  nom: `${cle} (${chemin})`,
  cleChemin: cle,
  aller: async (page: Page) => {
    await page.goto(chemin);
    // On n'exige PAS un `data-ecran` nommé : la QA ne doit pas connaître par cœur le nom
    // interne de chaque écran, sinon elle redevient une liste écrite à la main. On exige
    // qu'un écran soit rendu — c'est-à-dire que la route ne mène pas à une page blanche.
    await expect(
      page.locator('[data-ecran]'),
      `la route ${chemin} ne rend aucun écran — page blanche`,
    ).toBeVisible();
  },
}));

const ECRANS_PAR_INTERACTION: readonly EcranQA[] = [
  {
    nom: 'profils (racine)',
    cleChemin: null,
    aller: async (page) => {
      await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
    },
  },
  {
    nom: 'carte',
    cleChemin: null,
    aller: choisirLeProfil,
  },
  ...NOEUDS.map((noeud) => ({
    nom: `noeud/${noeud.id} (moteur ${noeud.moteur})`,
    cleChemin: null,
    aller: async (page: Page) => {
      await entrerDansLeNoeud(page, noeud.id);
    },
  })),
];

const ECRANS: readonly EcranQA[] = [...ECRANS_PAR_INTERACTION, ...ECRANS_PAR_URL];

/**
 * Cherche une SORTIE : un élément interactif dont le tap change d'écran.
 *
 * Chaque tentative repart d'un état neuf — sinon le premier tap modifierait la page et les
 * suivants ne viseraient plus les mêmes éléments. C'est la mécanique de
 * `parcours-issues-de-secours.spec.ts`, reprise telle quelle pour que les deux fichiers
 * concluent sur la même mesure.
 */
async function chercherUneSortie(
  page: Page,
  ecran: EcranQA,
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
    const tape = await taperElement(page, rang);
    if (tape === null) continue;
    if ((await positionne(page)) !== depart) {
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
      await preparer(page);
      await ecran.aller(page);
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
 * « Un bouton qui ne fait rien est un bug » — c'est le défaut n° 2 du père, énoncé en général.
 *
 * Un élément est VIVANT si son tap change quelque chose d'observable : le DOM, l'écran, ou
 * l'état du jeu. Les trois sont mesurés, parce qu'un seul ne suffit pas — le bouton « écouter »
 * ne change pas d'écran, et une réponse de moteur ne change pas toujours le DOM visible.
 */
test.describe('QA — aucun élément interactif mort', () => {
  test.slow();

  for (const ecran of ECRANS) {
    test(`« ${ecran.nom} » : tout élément tapable produit un effet`, async ({ page }) => {
      await preparer(page);
      await ecran.aller(page);
      const nbInteractifs = Math.min(
        await page.locator(SELECTEUR_INTERACTIF).count(),
        ELEMENTS_MAX_AUDITES,
      );
      const morts: string[] = [];

      for (let rang = 0; rang < nbInteractifs; rang += 1) {
        await preparer(page);
        await ecran.aller(page);
        const avantEcran = await positionne(page);
        const avantEtat = JSON.stringify(await etatDuJeu(page));

        const tape = await taperElement(page, rang);
        if (tape === null) continue;

        const apresEcran = await positionne(page);
        const apresEtat = JSON.stringify(await etatDuJeu(page));
        const vivant = tape.domChange || apresEcran !== avantEcran || apresEtat !== avantEtat;
        if (!vivant) morts.push(tape.description);
      }

      expect(
        morts,
        `${ecran.nom} : ces éléments se tapent et ne produisent rien — ` +
          `c'est ce que le père a vécu avec le bouton « écouter »`,
      ).toEqual([]);
    });
  }
});

// ═══════════════════════════════════════════ 4. LE PARCOURS COMPLET, ET LES DEUX RÉGIONS

test.describe('QA — le parcours complet', () => {
  test.slow();

  test('la Clairière enchaîne une SORTIE de 4 à 6 nœuds, pas un exercice isolé', () => {
    // Défaut n° 4 du père : « dans la clairiere je n ai eu qu un exercice, est-ce normal ? ».
    // La réponse tenue par ce cas : non. R13 demande 4 à 6 nœuds par sortie.
    const clairiere = NOEUDS.filter((n) => n.region === 'clairiere');
    expect(
      clairiere.length,
      `la Clairière livre ${String(clairiere.length)} nœud(s) ; R13 en demande 4 à 6`,
    ).toBeGreaterThanOrEqual(4);
    expect(clairiere.length).toBeLessThanOrEqual(6);
  });

  test('les deux régions livrées sont atteignables, ET le retour fonctionne', async ({ page }) => {
    // Le défaut n° 1 du père était précisément un aller sans retour, dans la seconde région.
    const regions = [...new Set(NOEUDS.map((n) => n.region))];
    expect(regions.length, 'deux régions sont livrées').toBeGreaterThanOrEqual(2);

    for (const region of regions) {
      const noeud = NOEUDS.find((n) => n.region === region)!;
      await preparer(page);
      await entrerDansLeNoeud(page, noeud.id);
      const dansLeNoeud = await positionne(page);

      // Le retour : on cherche une sortie et on l'emprunte réellement.
      const { trouvee } = await chercherUneSortie(page, {
        nom: region,
        cleChemin: null,
        aller: async (p) => {
          await entrerDansLeNoeud(p, noeud.id);
        },
      });
      expect(
        trouvee,
        `région « ${region} » : entrée dans ${dansLeNoeud}, aucun retour possible`,
      ).not.toBeNull();
    }
  });
});

// ═════════════════════════════════════════════════════════════════ 5. CONTRAT DE SORTIE

/**
 * Le chiffre qui échoue si le travail est creux.
 *
 * Il ne suffit pas que « rien n'ait échoué » : une suite qui n'auditerait AUCUN écran serait
 * verte elle aussi. On imprime donc combien d'écrans ont été réellement visités, et on exige
 * que toute route déclarée le soit — c'est le témoin qui empêche cette suite de mentir.
 */
test('CONTRAT DE SORTIE QA : écrans couverts, routes couvertes, moteurs atteignables', async ({
  page,
}) => {
  test.slow();
  const routesVisitees: string[] = [];
  for (const ecran of ECRANS_PAR_URL) {
    await preparer(page);
    await ecran.aller(page);
    routesVisitees.push(ecran.cleChemin!);
  }

  const moteursAtteignables = [...new Set(NOEUDS.map((n) => n.moteur))];
  console.log(
    `[qa] ${String(ECRANS.length)} écrans audités · ` +
      `${String(routesVisitees.length)}/${String(CHEMINS.size)} routes de CHEMINS visitées · ` +
      `${String(NOEUDS.length)} nœuds livrés · ` +
      `${String(moteursAtteignables.length)} moteur(s) atteignable(s) : ${moteursAtteignables.join(', ')}`,
  );

  expect(
    routesVisitees.sort(),
    'toute route déclarée dans CHEMINS est visitée par la QA',
  ).toEqual([...CHEMINS.keys()].sort());
  expect(ECRANS.length, 'la QA audite au moins les 6 routes et les nœuds livrés').toBeGreaterThan(6);
});
