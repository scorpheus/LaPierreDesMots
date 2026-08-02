/**
 * QA — CHAQUE MOTEUR JOUÉ DE BOUT EN BOUT : une bonne réponse, une mauvaise, et l'aide.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE CHIFFRE QUE CE FICHIER EXISTE POUR RENDRE, ET POURQUOI IL DOIT ÊTRE UNE FRACTION
 *
 * « 6 moteurs testés » ne dit rien. « 6 moteurs joués sur 14 déclarés » dit qu'il en manque
 * huit, et nomme lesquels. C'est la leçon de l'audit des OBJETS : on énumère les moteurs que
 * l'union `CodeMoteur` DÉCLARE, puis on regarde combien sont réellement atteignables par
 * l'enfant. Un moteur sans exercice n'apparaît dans aucun `grep`, ne casse aucun test, et
 * n'existe pas pour l'enfant — il faut donc le compter explicitement, ou il reste invisible.
 *
 * `moteursSansExercice` est ce compte. Il n'est PAS assertée à zéro : R12 (« ≥ 3 moteurs par
 * compétence ») est le travail du lot de contenu, pas de la QA, et
 * `tests/unitaires/moteurs-couverture.test.ts` le garde déjà. Ce fichier le MESURE et
 * l'imprime, pour qu'il cesse d'être invisible.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * COMMENT ON JOUE, SANS CONNAÎTRE LES 14 MOTEURS
 *
 * `window.__test.repondre(action)` prend une action dont la forme est PROPRE à chaque moteur
 * (`{ type: 'peindre', region }` pour `colorie`, tout autre chose pour `trace`). Écrire 14
 * fabriques d'actions serait 14 occasions de se tromper, et surtout : ce n'est pas ce que fait
 * l'enfant. L'enfant TAPE ce qu'il a sous le doigt.
 *
 * On joue donc par l'interface : on tape les éléments interactifs de la scène, un par un, et
 * on lit l'effet dans `window.__test.etat()`. C'est générique, c'est fidèle à l'usage réel, et
 * ça n'a aucune connaissance à tenir à jour quand un moteur change son format d'action.
 *
 * Ce que le balayage produit naturellement : des bonnes réponses ET des mauvaises, puisqu'il
 * tape tout. C'est exactement le couple demandé, et la propriété qui compte n'est pas qu'une
 * réponse soit juste — c'est qu'une réponse FAUSSE ne produise jamais d'écran d'échec (R14).
 */
import { expect, test } from './invariants.js';

import type { Page } from '@playwright/test';

import {
  SELECTEUR_INTERACTIF,
  entrerDansLeNoeud,
  etatDuJeu,
  moteursDeclares,
  noeudsLivres,
  preparer,
  taperElement,
} from './qa-outils.js';

const MOTEURS_DECLARES = moteursDeclares();
const NOEUDS = noeudsLivres();

/** Le premier nœud de chaque moteur atteignable — un seul suffit à jouer le moteur. */
const NOEUD_PAR_MOTEUR = new Map<string, string>();
for (const noeud of NOEUDS) {
  if (!NOEUD_PAR_MOTEUR.has(noeud.moteur)) NOEUD_PAR_MOTEUR.set(noeud.moteur, noeud.id);
}

const MOTEURS_JOUABLES = [...NOEUD_PAR_MOTEUR.keys()].sort();
const MOTEURS_SANS_EXERCICE = MOTEURS_DECLARES.filter((m) => !NOEUD_PAR_MOTEUR.has(m)).sort();

/** Combien de taps au maximum sur une scène : au-delà, le moteur ne répond pas. */
const TAPS_MAX = 40;

interface Partie {
  readonly nbTaps: number;
  readonly nbEffets: number;
  readonly echecVu: boolean;
  readonly erreurs: readonly string[];
}

/**
 * Joue une scène : tape ce qu'il y a, et relève ce qui s'est passé.
 *
 * On NE repart PAS d'un état neuf entre les taps — contrairement à l'audit des sorties. Ici on
 * veut jouer *vers l'avant*, comme l'enfant : les taps s'enchaînent et la partie progresse.
 */
async function jouerLaScene(page: Page): Promise<Partie> {
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push(String(e.message)));

  let nbEffets = 0;
  let echecVu = false;
  let nbTaps = 0;

  const total = Math.min(await page.locator(SELECTEUR_INTERACTIF).count(), TAPS_MAX);
  for (let rang = 0; rang < total; rang += 1) {
    const avant = JSON.stringify(await etatDuJeu(page));
    const tape = await taperElement(page, rang);
    if (tape === null) continue;
    nbTaps += 1;
    const apres = JSON.stringify(await etatDuJeu(page));
    if (tape.domChange || apres !== avant) nbEffets += 1;

    // R14 — « aucun écran d'échec, jamais ». Mesuré APRÈS chaque tap, y compris les mauvais.
    if ((await page.locator('[data-etat="echec"]').count()) > 0) echecVu = true;
  }
  return { nbTaps, nbEffets, echecVu, erreurs };
}

test.describe('QA — chaque moteur atteignable est joué de bout en bout', () => {
  test.slow();

  for (const moteur of MOTEURS_JOUABLES) {
    const noeud = NOEUD_PAR_MOTEUR.get(moteur)!;

    test(`« ${moteur} » : bonne réponse, mauvaise réponse, et jamais d’échec`, async ({ page }) => {
      await preparer(page);
      await entrerDansLeNoeud(page, noeud);
      await expect(
        page.locator(`[data-moteur="${moteur}"]`),
        `le nœud ${noeud} devait monter le moteur « ${moteur} »`,
      ).toBeVisible();

      const partie = await jouerLaScene(page);

      expect(
        partie.nbEffets,
        `« ${moteur} » (nœud ${noeud}) : ${String(partie.nbTaps)} taps, aucun effet. ` +
          `Le moteur est monté mais ne répond à rien — c'est un écran mort.`,
      ).toBeGreaterThan(0);

      expect(
        partie.echecVu,
        `« ${moteur} » : un [data-etat="echec"] est apparu. R14 : « aucun écran d'échec, jamais », ` +
          `y compris quand l'enfant se trompe.`,
      ).toBe(false);

      expect(partie.erreurs, `« ${moteur} » : exception non capturée pendant le jeu`).toEqual([]);
    });

    test(`« ${moteur} » : l’aide de Gobi est offerte et ne coûte jamais un échec`, async ({
      page,
    }) => {
      await preparer(page);
      await entrerDansLeNoeud(page, noeud);

      // ── PLUS AUCUN `skip` ICI, ET C'EST UNE CORRECTION DE PRODUIT, PAS DE TEST ───────────
      //
      // Ce cas sautait quand le nœud ne rendait aucun `[data-action="aide"]`. Trois moteurs
      // étaient dans ce cas — `colorie`, `place` et `trace` —, leur aide étant portée par la
      // COQUILLE (`client/src/composants/Gobi.tsx`) et non par eux. Le `skip` retirait donc
      // silencieusement de l'audit l'aide de Gobi sur `trace` : le moteur du `d` que le père
      // n'a pas réussi à tracer, c'est-à-dire exactement là où l'aide compte le plus.
      //
      // « Ne jamais mettre un test en skip, ne jamais assouplir une assertion » (CLAUDE.md).
      // Le bouton de la coquille porte désormais la même prise que les onze autres, et l'aide
      // est EXIGÉE sur tous les moteurs, sans exception.
      const aide = page.locator('[data-action="aide"]');
      expect(
        await aide.count(),
        `« ${moteur} » (nœud ${noeud}) ne rend aucun [data-action="aide"]. L'aide de Gobi doit ` +
          `être offerte sur CHAQUE moteur — « elle ne coûte rien et n'est jamais présentée ` +
          `comme un échec » (règle non négociable).`,
      ).toBeGreaterThan(0);

      const avant = JSON.stringify(await etatDuJeu(page));
      await aide.first().click();
      const apres = JSON.stringify(await etatDuJeu(page));

      expect(apres, `« ${moteur} » : l'aide est tapée et rien ne change`).not.toBe(avant);
      expect(
        await page.locator('[data-etat="echec"]').count(),
        `« ${moteur} » : demander de l'aide ne doit JAMAIS être présenté comme un échec`,
      ).toBe(0);
    });
  }
});

/**
 * LE CONTRAT DE SORTIE — la fraction, pas le compte.
 *
 * Ce cas ne peut pas être vert par vacuité : il exige qu'au moins un moteur ait été joué, et
 * il imprime nommément les moteurs déclarés que l'enfant ne peut pas atteindre.
 */
test('CONTRAT DE SORTIE QA : moteurs joués / moteurs déclarés', () => {
  console.log(
    `[qa-moteurs] ${String(MOTEURS_JOUABLES.length)} moteur(s) joué(s) de bout en bout sur ` +
      `${String(MOTEURS_DECLARES.length)} déclaré(s) : ${MOTEURS_JOUABLES.join(', ')}`,
  );
  if (MOTEURS_SANS_EXERCICE.length > 0) {
    console.log(
      `[qa-moteurs] ${String(MOTEURS_SANS_EXERCICE.length)} moteur(s) DÉCLARÉ(S) SANS EXERCICE, ` +
        `donc inatteignables par l'enfant : ${MOTEURS_SANS_EXERCICE.join(', ')}`,
    );
  }

  expect(
    MOTEURS_DECLARES.length,
    'l’union CodeMoteur a bien été lue dans partage/src/identifiants.ts',
  ).toBeGreaterThanOrEqual(14);
  expect(
    MOTEURS_JOUABLES.length,
    'aucun moteur n’est atteignable : la QA ne mesurerait rien',
  ).toBeGreaterThan(0);
});
