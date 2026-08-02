/**
 * PROPRIÉTÉ 4 — quelle que soit la composition, une sortie ne rejoue jamais deux fois le même
 * habillage (R13) et **se termine toujours sur une réussite**.
 *
 * Lot Q3.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER AJOUTE À `selecteur.test.ts` ET À `sortie-variete.test.ts`
 *
 * `selecteur.test.ts` prouve P9 à P12 sur 200 sorties simulées. Ce sont de vraies propriétés,
 * et elles tiennent. Mais elles s'arrêtent à la STRUCTURE du plan : « la dernière étape porte
 * le rôle `synthese` ». Personne ne joue cette étape. « Toute session se termine sur une
 * réussite » (CLAUDE.md, règle non négociable) reste donc une intention sur le rôle, pas une
 * mesure sur ce qui arrive à l'enfant.
 *
 * Ce fichier ferme l'écart en trois points :
 *
 *   1. **la sortie est JOUÉE.** Chaque étape du plan reçoit un moteur réel et une séquence
 *      d'actions engendrée ; on lit son `resume()` et ses étoiles. L'assertion porte sur la
 *      clôture : à la fin de la dernière étape, `reussi` est vrai et l'enfant a au moins une
 *      étoile. C'est la traduction mécanique de la règle, et non plus sa paraphrase ;
 *   2. **la sortie RACCOURCIE tient la même promesse.** `raccourcirSortie` existe pour
 *      écourter quand l'attention chute — c'est-à-dire au pire moment. Quel que soit le rang
 *      d'arrêt, le plan tronqué doit conserver sa clôture, ses rangs contigus et l'unicité de
 *      ses habillages ;
 *   3. **mille cas par propriété au lieu de deux cents**, graine fixée.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *
 * SOURCE QUI FAIT FOI, LUE ET JAMAIS RECALCULÉE :
 * `contenu/referentiel/parametres-pedagogie.json` — bornes de longueur, seuil de prérequis,
 * rang de révision, unicité d'habillage. Aucune de ces valeurs n'est réécrite ici.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ErreurPierre, calculerEtoiles, creerAlea, initialiserRegistreMoteurs } from '@pierre/partage';
import { composerSortie, raccourcirSortie } from '@partage/pedagogie/selecteur.js';
import { lireParametresPedagogie } from '@partage/pedagogie/parametres.js';
import type {
  Competence, EntreeSelecteur, EtatMaitrise, ItemLeitner, NoeudCandidat, ParametresPedagogie,
  PlanSortie,
} from '@pierre/partage';

import { INSTANT_DE_REFERENCE, lireJson } from '../configuration/preparation.js';
import { CAS_MOTEURS, NB_CAS, arbSequence, jouer, monter, reglages, resumeDe } from './propriete-outils.js';

initialiserRegistreMoteurs();

const PARAMETRES: ParametresPedagogie = lireParametresPedagogie(
  lireJson('contenu/referentiel/parametres-pedagogie.json'),
);
const CONTRAINTES = PARAMETRES.selecteur;

/** Un référentiel court, mais avec une VRAIE chaîne de prérequis. */
const COMPETENCES: readonly Competence[] = [
  { code: 'gph.a', libelle: 'a', famille: 'gph', prerequis: [] },
  { code: 'gph.ou', libelle: 'ou', famille: 'gph', prerequis: ['gph.a'] },
  { code: 'syl.cv', libelle: 'consonne-voyelle', famille: 'syl', prerequis: ['gph.a', 'gph.ou'] },
  { code: 'mot.outil.le', libelle: 'le', famille: 'mot.outil', prerequis: [] },
];
const CODES = COMPETENCES.map((c) => c.code);

/**
 * ⚠ LE VIVIER PORTE DES HABILLAGES QUI SE RÉPÈTENT, ET C'EST LE POINT.
 *
 * Première écriture de ce fichier : le vivier était engendré par
 * `fc.uniqueArray(..., { selector: (c) => c.habillage })`, comme dans `selecteur.test.ts`.
 * Tous les candidats portaient donc un habillage DISTINCT, et « jamais deux fois le même
 * habillage » était vrai par construction du générateur, jamais par le code testé.
 *
 * Mesuré au banc de mutation : en court-circuitant la déduplication par habillage de
 * `composerSortie`, la propriété restait **verte** (`MQ9 SURVIT`). Elle ne gardait rien.
 *
 * Ici l'habillage est tiré dans un vivier de **six**, pour une quarantaine de nœuds : les
 * collisions sont la règle, exactement comme sur le contenu réel — Les Galeries portent cinq
 * habillages pour six nœuds, et c'est précisément là que le lot N8 a trouvé un exercice
 * livré, validé, et jamais servi. C'est la seule forme sous laquelle R13 se teste.
 */
const NB_HABILLAGES = 6;

const arbCandidat: fc.Arbitrary<NoeudCandidat> = fc
  .record({
    indice: fc.integer({ min: 0, max: 39 }),
    habillage: fc.integer({ min: 0, max: NB_HABILLAGES - 1 }),
    competences: fc.uniqueArray(fc.constantFrom(...CODES), { minLength: 1, maxLength: 3 }),
    difficulte: fc.integer({ min: 1, max: 5 }),
    temps: fc.constantFrom(
      'presentation' as const, 'developpement' as const,
      'retournement' as const, 'maitrise' as const,
    ),
  })
  .map((brut) => ({
    noeud: `clairiere-${String(brut.indice).padStart(2, '0')}`,
    habillage: `clairiere.h${String(brut.habillage)}`,
    region: 'clairiere' as const,
    competences: brut.competences,
    difficulte: brut.difficulte,
    temps: brut.temps,
  }));

/**
 * Deux nœuds SOCLE, toujours éligibles : sans eux, une entrée sur deux est refusée parce que
 * le tirage a mis toutes les maîtrises sous le seuil, et « mille sorties » n'en simule que la
 * moitié. Le motif est celui de `selecteur.test.ts`, et il est repris ici pour la même raison.
 */
const SOCLE: readonly NoeudCandidat[] = [
  {
    noeud: 'clairiere-socle-a', habillage: 'clairiere.socle-a', region: 'clairiere',
    competences: ['gph.a'], difficulte: 1, temps: 'presentation',
  },
  {
    noeud: 'clairiere-socle-b', habillage: 'clairiere.socle-b', region: 'clairiere',
    competences: ['mot.outil.le'], difficulte: 5, temps: 'maitrise',
  },
];

const arbEntree: fc.Arbitrary<EntreeSelecteur> = fc
  .record({
    // Unicité par NŒUD, jamais par habillage : deux nœuds peuvent — et doivent — partager
    // un habillage, sinon R13 n'est jamais mise à l'épreuve.
    candidats: fc.uniqueArray(arbCandidat, {
      selector: (c) => c.noeud,
      minLength: 4,
      maxLength: 24,
    }),
    maitrises: fc
      .array(fc.double({ min: 0, max: 1, noNaN: true }), {
        minLength: CODES.length,
        maxLength: CODES.length,
      })
      .map((valeurs): readonly EtatMaitrise[] =>
        CODES.map((code, i) => ({
          competence: code,
          p: valeurs[i] as number,
          nbTentatives: 5,
          joursDistincts: ['2026-08-01', '2026-08-02', '2026-08-03'],
          nbTentativesFaibleDevinette: 2,
          acquiseLe: null,
        })),
      ),
    revisions: fc
      .uniqueArray(fc.constantFrom(...CODES), { maxLength: 4 })
      .map((items): readonly ItemLeitner[] =>
        items.map((item) => ({
          item, boite: 2, derniereRevueLe: INSTANT_DE_REFERENCE,
          echeanceLe: INSTANT_DE_REFERENCE, nbRevues: 1,
        })),
      ),
    compagnon: fc.constantFrom('filou' as const, 'bulle' as const, null),
  })
  .map((brut) => ({
    profil: 'profil-test',
    region: 'clairiere' as const,
    compagnon: brut.compagnon,
    maitrises: brut.maitrises,
    revisionsDues: brut.revisions,
    noeudsDisponibles: [...brut.candidats, ...SOCLE],
    competences: COMPETENCES,
    maintenant: INSTANT_DE_REFERENCE,
  }));

const arbGraine = fc.integer({ min: 0, max: 2 ** 31 - 1 });

/** Compose, ou rend `null` quand le vivier ne permet pas deux nœuds distincts. */
function composerOuNull(entree: EntreeSelecteur, graine: number): PlanSortie | null {
  try {
    return composerSortie(entree, PARAMETRES, creerAlea(graine));
  } catch (erreur) {
    if (ErreurPierre.porteLeCode(erreur, 'contenu-invalide')) return null;
    throw erreur;
  }
}

// ═══════════════════════════ S1 — R13 et la clôture, sur mille sorties

describe('S1 — R13 et la forme du trajet, sur mille sorties engendrées', () => {
  it('jamais deux fois le même habillage, ouverture `echauffement`, clôture `synthese`', () => {
    let sorties = 0;
    let refus = 0;
    let viviersAvecCollision = 0;
    const longueurs = new Set<number>();

    fc.assert(
      fc.property(arbEntree, arbGraine, (entree, graine) => {
        const habillagesDuVivier = entree.noeudsDisponibles.map((n) => n.habillage);
        if (new Set(habillagesDuVivier).size < habillagesDuVivier.length) {
          viviersAvecCollision += 1;
        }
        const plan = composerOuNull(entree, graine);
        if (plan === null) {
          refus += 1;
          return;
        }
        sorties += 1;
        longueurs.add(plan.etapes.length);
        const premiere = plan.etapes[0];
        const derniere = plan.etapes[plan.etapes.length - 1];

        expect(plan.etapes.length, 'une sortie sans ouverture ni clôture').toBeGreaterThanOrEqual(2);
        expect(premiere?.role, 'l’ouverture n’est plus un échauffement (v2 § 5.2)').toBe(
          'echauffement',
        );
        expect(
          derniere?.role,
          'la clôture n’est plus une synthèse : la sortie ne finirait pas sur une victoire',
        ).toBe('synthese');

        // R13 — l'habillage, pas le nœud : c'est l'habillage qui porte la promesse de variété.
        const habillages = plan.etapes.map((etape) => etape.habillage);
        expect(new Set(habillages).size, `R13 violée : ${habillages.join(', ')}`).toBe(
          habillages.length,
        );

        // Les rangs sont contigus à partir de 1 — sinon le journal devient illisible.
        expect(plan.etapes.map((e) => e.rang)).toEqual(
          plan.etapes.map((_, index) => index + 1),
        );

        // Les révisions ne se posent qu'au rang de révision, jamais en ouverture ni en clôture.
        for (const etape of plan.etapes) {
          if (etape.revisions.length > 0) {
            expect(etape.rang, 'une révision hors du rang de révision').toBe(
              CONTRAINTES.rangRevision,
            );
            expect(etape.rang, 'une révision en ouverture').not.toBe(1);
            expect(etape.rang, 'une révision en clôture').not.toBe(plan.etapes.length);
          }
        }
      }),
      reglages(),
    );

    console.log(
      `[Q3-P4] sorties composées=${String(sorties)} · refus=${String(refus)} · ` +
        `viviers à habillages en collision=${String(viviersAvecCollision)} · ` +
        `longueurs rencontrées=${[...longueurs].sort((a, b) => a - b).join(',')}`,
    );
    expect(sorties, 'presque aucune sortie composée : la propriété serait vide').toBeGreaterThan(
      NB_CAS / 2,
    );
    // CE PLANCHER EST CELUI QUI DONNE SES DENTS À R13. Si le générateur revenait à des
    // habillages tous distincts, l'unicité serait vraie par construction et la propriété ne
    // garderait plus rien — mesuré au banc de mutation, c'était le cas de la première version
    // de ce fichier.
    expect(
      viviersAvecCollision,
      'aucun vivier ne porte deux nœuds de même habillage : R13 serait vraie par construction',
    ).toBeGreaterThan(NB_CAS / 2);
    // D46 — « le jeu doit être bon en 5 minutes comme en 30 » : la longueur VARIE. Une seule
    // longueur rencontrée signifierait que le tirage de `nbNoeudsDeLaSortie` ne sert plus.
    expect(longueurs.size, 'toutes les sorties ont la même longueur').toBeGreaterThan(1);
  });
});

// ═══════════════════ S2 — la sortie raccourcie tient la même promesse

describe('S2 — quel que soit le rang d’arrêt, la sortie garde sa clôture', () => {
  /**
   * `raccourcirSortie` sert quand l'attention chute : c'est-à-dire au moment où l'enfant est
   * le plus près de finir sur un échec. La propriété doit donc tenir sur TOUS les rangs, y
   * compris les rangs absurdes — négatif, zéro, au-delà de la longueur.
   */
  it('rang d’arrêt engendré, clôture conservée, rangs contigus, R13 tenue', () => {
    let tronquees = 0;
    fc.assert(
      fc.property(
        arbEntree,
        arbGraine,
        fc.integer({ min: -5, max: 12 }),
        (entree, graine, rangAtteint) => {
          const plan = composerOuNull(entree, graine);
          if (plan === null) return;
          const court = raccourcirSortie(plan, rangAtteint);

          expect(court.etapes.length, 'une sortie raccourcie jusqu’au vide').toBeGreaterThanOrEqual(
            1,
          );
          expect(
            court.etapes.length,
            'la sortie raccourcie est plus longue que l’originale',
          ).toBeLessThanOrEqual(plan.etapes.length);
          if (court.etapes.length < plan.etapes.length) tronquees += 1;

          const cloture = court.etapes[court.etapes.length - 1];
          const clotureOriginale = plan.etapes[plan.etapes.length - 1];
          expect(
            cloture?.role,
            'la sortie écourtée ne finit plus sur une synthèse — donc plus sur une victoire',
          ).toBe('synthese');
          expect(
            cloture?.noeud,
            'la clôture a changé de nœud en cours de troncature',
          ).toBe(clotureOriginale?.noeud);

          expect(
            court.etapes.map((e) => e.rang),
            'les rangs ne sont plus contigus : le journal deviendrait illisible',
          ).toEqual(court.etapes.map((_, index) => index + 1));

          const habillages = court.etapes.map((e) => e.habillage);
          expect(new Set(habillages).size, 'R13 violée après troncature').toBe(habillages.length);
        },
      ),
      reglages(),
    );
    console.log(`[Q3-P4] sorties réellement tronquées = ${String(tronquees)}`);
    // Sans ce plancher, un `raccourcirSortie` devenu l'identité rendrait ce cas vert.
    expect(tronquees, 'aucune sortie n’a été réellement tronquée').toBeGreaterThan(NB_CAS / 10);
  });
});

// ══════════════════ S3 — la sortie est JOUÉE, et elle se termine sur une réussite

describe('S3 — la sortie JOUÉE se termine toujours sur une réussite', () => {
  /**
   * CLAUDE.md, règle non négociable : « Aucun écran d'échec, jamais. […] Toute session se
   * termine sur une réussite. »
   *
   * On compose un plan, on donne à chaque étape un moteur réel, on la joue avec une séquence
   * d'actions engendrée — y compris la séquence VIDE, qui est le cas de l'enfant qui pose la
   * tablette — et on lit ce que l'écran de récompense lirait : `resume()` et `calculerEtoiles`.
   *
   * L'assertion porte sur toutes les étapes ET nommément sur la clôture. La séquence courte
   * est assumée : cette propriété monte un moteur par étape et coûte cent fois une propriété
   * pure. Ce qu'elle prouve n'existe nulle part ailleurs dans le dépôt.
   */
  it('chaque étape jouée rend `reussi` et au moins une étoile, clôture comprise', () => {
    let etapesJouees = 0;
    let sortiesJouees = 0;
    const etoilesVues = new Map<number, number>();

    fc.assert(
      fc.property(
        arbEntree,
        arbGraine,
        fc.array(fc.integer({ min: 0, max: CAS_MOTEURS.length - 1 }), {
          minLength: 6,
          maxLength: 6,
        }),
        (entree, graine, choixMoteurs) => {
          const plan = composerOuNull(entree, graine);
          if (plan === null) return;
          sortiesJouees += 1;

          for (const [index, etape] of plan.etapes.entries()) {
            const cas = CAS_MOTEURS[
              (choixMoteurs[index % choixMoteurs.length] as number) % CAS_MOTEURS.length
            ] as (typeof CAS_MOTEURS)[number];

            // La séquence est engendrée à partir de la graine de la sortie : reproductible,
            // et différente d'une étape à l'autre.
            const sequence = fc.sample(arbSequence(cas, 6), {
              numRuns: 1,
              seed: graine + index,
            })[0] as Parameters<typeof jouer>[1];

            const { etatFinal } = jouer(cas, sequence);
            const { moteur } = monter(cas);
            const resume = resumeDe(moteur, etatFinal);
            const etoiles = calculerEtoiles(resume);
            etapesJouees += 1;
            etoilesVues.set(etoiles, (etoilesVues.get(etoiles) ?? 0) + 1);

            const ou = `sortie · rang ${String(etape.rang)} (${etape.role}) · moteur ${cas.code}`;
            expect(resume.reussi, `${ou} : R14 violée en pleine sortie`).toBe(true);
            expect(
              etoiles,
              `${ou} : zéro étoile — l’enfant terminerait la sortie sur un échec`,
            ).toBeGreaterThanOrEqual(1);

            if (index === plan.etapes.length - 1) {
              expect(etape.role, `${ou} : la clôture n’est pas une synthèse`).toBe('synthese');
              expect(
                resume.reussi,
                `${ou} : LA CLÔTURE de la sortie n’est pas une réussite. « Toute session se ` +
                  'termine sur une réussite » — CLAUDE.md, règle non négociable.',
              ).toBe(true);
            }
          }
        },
      ),
      reglages(),
    );

    console.log(
      `[Q3-P4] sorties jouées=${String(sortiesJouees)} · étapes jouées=${String(etapesJouees)} · ` +
        `étoiles=${JSON.stringify([...etoilesVues].sort((a, b) => a[0] - b[0]))}`,
    );
    expect(sortiesJouees, 'aucune sortie jouée').toBeGreaterThan(50);
    expect(etapesJouees, 'aucune étape jouée').toBeGreaterThan(150);
    expect(etoilesVues.get(0) ?? 0, 'une étape jouée a rendu ZÉRO étoile').toBe(0);
  });
});

// ══════════════════════════════════════════════════════ CONTRAT DE SORTIE

describe('CONTRAT DE SORTIE — la propriété 4 a bien tourné, et sur quoi', () => {
  it('imprime contraintes et propriétés — et échoue si les données sont creuses', () => {
    console.log(
      [
        `[Q3-P4] nbNoeuds ..................... ${String(CONTRAINTES.nbNoeudsMin)} à ${String(CONTRAINTES.nbNoeudsMax)}`,
        `[Q3-P4] rang de révision ............. ${String(CONTRAINTES.rangRevision)}`,
        `[Q3-P4] habillage unique par sortie .. ${String(CONTRAINTES.habillageUniqueParSortie)}`,
        `[Q3-P4] seuil de prérequis ........... ${String(CONTRAINTES.seuilPrerequis)}`,
        `[Q3-P4] propriétés de ce fichier ..... 3`,
        `[Q3-P4] cas engendrés par propriété .. ${String(NB_CAS)}`,
      ].join('\n'),
    );
    // R13 est une contrainte de DONNÉES : si le drapeau tombait à `false`, la propriété S1
    // resterait verte par construction et personne ne le verrait. On l'assert ici.
    expect(
      CONTRAINTES.habillageUniqueParSortie,
      'R13 a été désactivée dans les données : la promesse de variété tombe',
    ).toBe(true);
    expect(CONTRAINTES.nbNoeudsMin, 'une sortie sans ouverture ni clôture').toBeGreaterThanOrEqual(2);
    expect(CONTRAINTES.nbNoeudsMax).toBeGreaterThanOrEqual(CONTRAINTES.nbNoeudsMin);
    expect(CONTRAINTES.rangRevision, 'une révision en ouverture').toBeGreaterThan(1);
  });
});
