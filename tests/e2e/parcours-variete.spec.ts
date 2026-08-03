/**
 * R13, mesurée dans l'application réelle — lot L2-E, sous-groupe E4.
 *
 * R13 (v2 § 15) : « Une sortie complète ne rejoue jamais deux fois le même habillage. »
 *
 * C'est la moitié visible de la promesse de variété. L'autre moitié — R12 — se mesure hors
 * ligne dans `tests/unitaires/moteurs-couverture.test.ts`, parce qu'elle porte sur le
 * CATALOGUE et non sur un parcours.
 *
 * Deux règles de l'annexe T § 6 gouvernent chaque ligne de ce fichier :
 *   • on attend un ÉTAT, jamais une durée — aucun `waitForTimeout` ici ;
 *   • on ne cible QUE les attributs `data-*` du contrat (§ 7), ici `data-moteur` et
 *     `data-habillage`, tous deux portés par la racine de chaque moteur et possédés par L2-E.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * ⚠ CE QUE CE FICHIER NE PEUT PAS ENCORE FAIRE, ET POURQUOI C'EST ÉCRIT ICI PLUTÔT QUE TU.
 *
 * Une « sortie » est composée par `POST /api/profils/:id/sortie` (L2-D, § 5.3), et les nœuds
 * qu'elle enchaîne n'existent que si des `contenu/exercices/**` citent les onze moteurs de F5.
 * Or le § 3.5 du contrat gelé n'attribue **aucun** fichier d'exercice à L2-E, ni à personne
 * d'autre pour ces moteurs : les 33 habillages sont là, les exercices qui les feraient jouer,
 * non. Le parcours ci-dessous itère donc sur les nœuds RÉELLEMENT présents, et le premier cas
 * échoue tant que la sortie n'en compte pas au moins deux — ce qui est le signalement, pas un
 * contournement. Défaut consigné dans `Docs/questions-en-attente.md` et dans le rapport de lot.
 * ────────────────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from './invariants.js';

import type { Page } from '@playwright/test';

const RACINE = new URL('../../', import.meta.url);
const fixtureProfil = JSON.parse(
  readFileSync(fileURLToPath(new URL('tests/fixtures/profils/enfant.json', RACINE)), 'utf8'),
) as Record<string, unknown>;

const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);
const INSTANT = '2026-09-01T08:00:00Z';

/** Longueur minimale d'une sortie pour que R13 ait un sens : deux nœuds, au moins. */
const NOEUDS_MINIMUM = 2;

/**
 * La longueur MAXIMALE d'une sortie, lue dans `contenu/referentiel/parametres-pedagogie.json`
 * — jamais un littéral : c'est la valeur que `composerSortie` tire réellement (convention C2).
 * C'est aussi le nombre de décors distincts qu'une région doit porter pour qu'une sortie de
 * longueur maximale n'en répète aucun.
 */
const NOEUDS_MAX_PAR_SORTIE = (
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL('contenu/referentiel/parametres-pedagogie.json', RACINE)),
      'utf8',
    ),
  ) as { selecteur: { nbNoeudsMax: number } }
).selecteur.nbNoeudsMax;

/**
 * `window.__test`, vu depuis les tests — surface du contrat v1 § 7.1, redéclarée ici parce
 * que `client/src/types-globaux.d.ts` n'est pas dans le périmètre de compilation de
 * Playwright. Toute divergence avec le contrat serait un défaut de ce fichier.
 */
interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  allerAuNoeud(id: string): Promise<void>;
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

async function preparer(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => '__test' in window);
  await page.evaluate(
    async ([fixture, graine, instant]) => {
      const fenetre = window as unknown as FenetreTest;
      fenetre.__test.figerHorloge(instant as string);
      fenetre.__test.graine(graine as number);
      fenetre.__test.sauterAnimations();
      await fenetre.__test.chargerProfil(fixture);
    },
    [fixtureProfil, GRAINE, INSTANT] as const,
  );
}

/** Les nœuds réellement livrés, lus sur disque : le test ne fabrique pas son parcours. */
function noeudsDuDepot(): readonly string[] {
  const dossier = fileURLToPath(new URL('contenu/noeuds', RACINE));
  return readdirSync(dossier)
    .filter((nom) => nom.endsWith('.json'))
    .map((nom) => nom.replace(/\.json$/, ''))
    .sort();
}

function lireJsonDuDepot(cheminRelatif: string): Record<string, unknown> {
  return JSON.parse(readFileSync(fileURLToPath(new URL(cheminRelatif, RACINE)), 'utf8')) as Record<
    string,
    unknown
  >;
}

/**
 * Le nœud propose-t-il une consigne AUDIBLE ?
 *
 * On lit le contenu livré, jamais l'écran : c'est le disque qui dit si un clip existe, et
 * l'écran qui doit s'y conformer. L'inverse — déduire de l'écran ce que le contenu porte —
 * rendrait le test tautologique.
 *
 * ADAPTÉ PAR N2 : la source de vérité est le MANIFESTE, plus le champ `audio` des exercices.
 * Voir le bloc de commentaire dans le corps de la fonction — l'oracle a changé, la propriété
 * mesurée n'a pas bougé d'un mot.
 */
function consigneAvecAudio(noeud: string): boolean {
  const idExercice = lireJsonDuDepot(`contenu/noeuds/${noeud}.json`)['exercice'];
  if (typeof idExercice !== 'string') {
    return false;
  }

  // ══════════════════════════════════════════════════════════════════════════════════════
  // ORACLE CHANGÉ PAR LE LOT N2 — et si on ne l'avait pas changé, ce cas aurait CESSÉ
  // D'ARMER en silence, ce qui est le pire état pour une assertion.
  //
  // La version d'origine lisait le champ `audio` des fichiers d'exercice. Le contrat de
  // finition v3 § 4.2 interdit à N2 de toucher aux exercices — « la résolution passe par la
  // clé du manifeste, jamais par le champ `audio` du JSON » — donc ce champ restera `null`
  // pour toujours. Le commentaire ci-dessus promettait que « le jour où les voix arrivent,
  // ce cas redevient la prise sur R15 TOUT SEUL » : il ne le redevenait pas, il regardait
  // au mauvais endroit.
  //
  // On lit donc `contenu/audio/manifeste.json`, qui est « la SEULE source de vérité sur
  // l'existence d'un clip » (§ 5.4), et on y cherche la clé `<idExercice>/<idConsigne>` —
  // exactement celle que `EcranNoeud.tsx` passe au bouton. Le test reste non tautologique :
  // c'est toujours le DISQUE qui dit ce qui existe, et l'écran qui doit s'y conformer.
  // ══════════════════════════════════════════════════════════════════════════════════════
  let clips: readonly { readonly cle?: unknown; readonly rendu?: unknown }[] = [];
  try {
    const manifeste = lireJsonDuDepot('contenu/audio/manifeste.json');
    const liste = manifeste['clips'];
    if (Array.isArray(liste)) {
      clips = liste as readonly { readonly cle?: unknown; readonly rendu?: unknown }[];
    }
  } catch {
    // Aucun manifeste : `npm run voix` n'a pas tourné. Aucun nœud n'est audible, et D42
    // masque partout — c'est un état valide, pas une erreur.
    return false;
  }

  return clips.some(
    (clip) =>
      clip.rendu === 'normal' &&
      typeof clip.cle === 'string' &&
      clip.cle.startsWith(`${idExercice}/`),
  );
}

test.describe('variété d’une sortie', () => {
  /**
   * ── CE CAS A ÉTÉ RECADRÉ, ET IL FAUT DIRE EXACTEMENT SUR QUOI ────────────────────────────
   *
   * Il montait TOUS les nœuds du dépôt et exigeait que les habillages soient tous distincts :
   * `new Set(vus).size === vus.length`. C'était juste tant que le dépôt tenait dans une sortie
   * — 18 nœuds pour 18 décors. Les lots de contenu ont livré 76 nœuds pour 55 décors, et la
   * marche complète en répète forcément : **R13 parle d'une SORTIE — 4 à 6 nœuds —, jamais du
   * catalogue.** Exiger 76 décors distincts, c'était exiger un décor par nœud, ce qu'aucune
   * règle ne demande et ce que le sélecteur n'a jamais promis.
   *
   * R13 n'est pas abandonnée, elle est prouvée LÀ OÙ ELLE VIT :
   * `tests/unitaires/sortie-variete.test.ts` compose 60 sorties RÉELLES par région avec le
   * vrai `composerSortie` et exige 0 habillage répété. C'est plus fort qu'une marche linéaire,
   * puisque c'est le plan que l'enfant reçoit vraiment.
   *
   * Ce que cette recette garde, et qu'aucune suite hors ligne ne peut donner :
   *   1. **chaque nœud livré MONTE dans l'application réelle** et affiche son décor — c'est la
   *      seule preuve que le câblage contenu → moteur → habillage tient à l'écran ;
   *   2. **chaque région porte assez de décors DISTINCTS pour une sortie de longueur maximale**,
   *      la condition de données sans laquelle R13 serait tenue par appauvrissement — une
   *      région de douze nœuds sur cinq décors ne servirait jamais plus de cinq nœuds.
   */
  test('chaque nœud monte avec son décor, et chaque région en porte assez pour une sortie entière', async ({
    page,
  }) => {
    await preparer(page);

    const noeuds = noeudsDuDepot();
    expect(
      noeuds.length,
      'Une sortie de moins de deux nœuds ne peut pas prouver quoi que ce soit.',
    ).toBeGreaterThanOrEqual(NOEUDS_MINIMUM);

    const vus: string[] = [];
    const parRegion = new Map<string, Set<string>>();
    for (const noeud of noeuds) {
      await page.evaluate(async (identifiant) => {
        const fenetre = window as unknown as FenetreTest;
        await fenetre.__test.allerAuNoeud(identifiant);
      }, noeud);

      const racine = page.locator('[data-moteur]');
      await expect(racine).toHaveCount(1);
      const habillage = await racine.getAttribute('data-habillage');
      expect(habillage, `le nœud ${noeud} ne déclare aucun habillage`).not.toBeNull();
      vus.push(habillage ?? '');

      const region = String(lireJsonDuDepot(`contenu/noeuds/${noeud}.json`)['region']);
      const decors = parRegion.get(region) ?? new Set<string>();
      decors.add(habillage ?? '');
      parRegion.set(region, decors);
    }

    // Chaque nœud livré a bien été monté, et chacun a rendu un décor non vide.
    expect(vus.length, 'des nœuds livrés que l’application n’a pas montés').toBe(noeuds.length);
    expect(
      vus.filter((habillage) => habillage === ''),
      'un nœud a monté sans décor',
    ).toEqual([]);

    // La condition de données de R13, région par région, avec le compte imprimé.
    const pauvres: string[] = [];
    for (const [region, decors] of parRegion) {
      if (decors.size < NOEUDS_MAX_PAR_SORTIE) {
        pauvres.push(`${region} : ${String(decors.size)} décor(s) — ${[...decors].sort().join(', ')}`);
      }
    }
    expect(
      pauvres,
      `décors distincts par région : ${[...parRegion.entries()]
        .map(([region, decors]) => `${region}=${String(decors.size)}`)
        .sort()
        .join(' · ')}`,
    ).toEqual([]);
    expect(parRegion.size, 'aucune région parcourue').toBeGreaterThan(0);
  });

  test('aucun nœud de la sortie n’affiche d’écran d’échec', async ({ page }) => {
    // R14, la même assertion que `cassecou`, mais sur le chemin nominal : si un moteur neuf
    // émettait `data-etat="echec"` dès l'ouverture, personne ne le verrait avant l'enfant.
    await preparer(page);
    for (const noeud of noeudsDuDepot()) {
      await page.evaluate(async (identifiant) => {
        const fenetre = window as unknown as FenetreTest;
        await fenetre.__test.allerAuNoeud(identifiant);
      }, noeud);
      await expect(page.locator('[data-moteur]')).toHaveCount(1);
      await expect(page.locator('[data-etat="echec"]')).toHaveCount(0);
    }
  });

  test('aucun bouton « écouter » muet, et un bouton dès qu’un clip existe (D42, R15)', async ({
    page,
  }) => {
    // ════════════════════════════════════════════════════════════════════════════════════
    // CE CAS A ÉTÉ RÉÉCRIT PARCE QU'IL CONTREDISAIT UNE DÉCISION, PAS PARCE QU'IL GÊNAIT.
    //
    // Il assertionnait auparavant « le bouton doit être là, sur chaque moteur, SANS
    // CONDITION », et se déclarait « la seule prise mécanique sur R15 tant que les clips
    // n'existent pas ». **D42** (`Docs/journal-des-decisions.md`, 2026-08-02) a tranché
    // l'inverse, et sur le fait constaté par le père — il a tapé ce bouton et n'a rien eu :
    //
    //   « Le bouton « écouter » est masqué tant qu'aucun audio n'existe pour la consigne.
    //     Rien ne ment, rien ne déçoit — un bouton qui ne répond pas casse la confiance plus
    //     sûrement qu'un bouton absent. Conséquence à ne pas oublier : R15 reste visiblement
    //     non satisfaite. »
    //
    // Un bouton présent partout n'était donc plus une prise sur R15 : c'était la mesure d'un
    // décor. La prise est déplacée, pas relâchée, et elle est double :
    //
    //   • **aujourd'hui** — aucun bouton de la coquille n'est offert sans savoir quoi jouer.
    //     `data-clip` porte la clé du clip ; `data-clip="null"` est donc, littéralement, le
    //     bouton que le père a tapé. On en exige ZÉRO.
    //   • **le jour où les voix arrivent (D41)** — dès qu'une consigne porte un audio, le
    //     bouton est exigé. Ce cas redevient la prise sur R15 **tout seul**, sans que
    //     personne ne le rouvre : c'est le contenu sur disque qui arme l'assertion.
    //
    // La dette elle-même est chiffrée ailleurs, et reste rouge :
    // `tests/unitaires/consignes-audibles.test.ts`.
    // ════════════════════════════════════════════════════════════════════════════════════
    await preparer(page);

    const noeuds = noeudsDuDepot();
    let noeudsAvecAudio = 0;

    for (const noeud of noeuds) {
      await page.evaluate(async (identifiant) => {
        const fenetre = window as unknown as FenetreTest;
        await fenetre.__test.allerAuNoeud(identifiant);
      }, noeud);
      await expect(page.locator('[data-moteur]')).toHaveCount(1);

      // Le refus de D42, mesuré sur le DOM et non sur la parole du composant.
      await expect(
        page.locator('[data-action="ecouter"][data-clip="null"]'),
        `le nœud ${noeud} offre un bouton « Écouter » qui ne peut rien jouer (D42)`,
      ).toHaveCount(0);

      if (consigneAvecAudio(noeud)) {
        noeudsAvecAudio += 1;
        await expect(
          page.locator('[data-action="ecouter"]'),
          `le nœud ${noeud} a un clip et ne propose pas de réécoute (R15)`,
        ).not.toHaveCount(0);
      }
    }

    // CONTRAT DE SORTIE — le chiffre qui empêche ce cas d'être vert à vide. Tant qu'il vaut
    // zéro, la moitié « R15 » ci-dessus n'a rien assertionné, et la ligne le dit à voix haute
    // au lieu de laisser croire que la règle est tenue.
    console.info(
      `[écouter] ${String(noeuds.length)} nœuds audités, ${String(noeudsAvecAudio)} avec audio ` +
        `— R15 reste non satisfaite tant que ce second chiffre vaut 0 (D42, D41).`,
    );
  });
});
