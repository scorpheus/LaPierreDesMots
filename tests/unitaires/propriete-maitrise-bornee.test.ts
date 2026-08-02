/**
 * PROPRIÉTÉ 2 — quelle que soit la séquence, la MAÎTRISE reste dans [0, 1], et une tentative
 * avec aide pèse STRICTEMENT moins qu'une tentative sans aide.
 *
 * Lot Q3. C'est la zone où « un ajustement du BKT ne casse rien visiblement, et la progression
 * est devenue absurde. Personne ne le voit avant trois semaines » (annexe T § 1).
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER AJOUTE À `bkt.test.ts`, QUI COUVRE DÉJÀ P2 ET P3
 *
 * `tests/unitaires/bkt.test.ts` prouve les deux propriétés — et bien. Mais il les prouve
 * **sur un seul jeu de paramètres et sur sept modes de réponse sur neuf** :
 *
 *   · ses observations sont tirées de `MODES_TABULES` et forcent `nbElements: null` ; les
 *     deux modes CALCULÉS de D13, `ordre` et `appariement`, dont `p_devinette` vaut `1/n!`,
 *     n'entrent dans aucune séquence ;
 *   · ses paramètres sont ceux de `contenu/referentiel/parametres-pedagogie.json`. Or « `p`
 *     reste dans [0, 1] » n'est pas une propriété des valeurs livrées, c'est une propriété
 *     de la FONCTION : elle doit tenir pour tout paramétrage exprimable, sinon un réglage
 *     du fichier de données — qui n'est pas du code, qui ne passe par aucune revue de code —
 *     pourrait faire sortir la maîtrise de son domaine sans qu'un test bouge.
 *
 * Ici : paramètres engendrés dans tout leur domaine, les NEUF modes, `1000` cas par
 * propriété, graine fixée.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *
 * SOURCE QUI FAIT FOI, LUE ET JAMAIS RECALCULÉE : `contenu/referentiel/parametres-pedagogie.json`
 * pour le paramétrage RÉEL, qui sert de témoin à côté des paramétrages engendrés.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { estAcquise, etatMaitriseInitial, mettreAJourMaitrise, pDevinette } from '@partage/pedagogie/bkt.js';
import { lireParametresPedagogie } from '@partage/pedagogie/parametres.js';
import type {
  CritereAcquis, EtatMaitrise, ModeReponse, ObservationTentative, ParametresBkt,
} from '@pierre/partage';

import { lireJson } from '../configuration/preparation.js';
import { NB_CAS, reglages } from './propriete-outils.js';

const PARAMETRES_REELS = lireParametresPedagogie(
  lireJson('contenu/referentiel/parametres-pedagogie.json'),
);

/** Les neuf modes de `ModeReponse`. Les deux derniers sont les modes CALCULÉS de D13. */
const MODES_TABULES: readonly ModeReponse[] = [
  'vrai-faux', 'qcm-3', 'qcm-4', 'place', 'colorie', 'trace', 'saisie',
];
const MODES_CALCULES: readonly ModeReponse[] = ['ordre', 'appariement'];
const TOUS_LES_MODES: readonly ModeReponse[] = [...MODES_TABULES, ...MODES_CALCULES];

const COMPETENCE = 'gph.a';

/** Un instant ISO 8601 UTC, sans jamais construire de `Date` (règle non négociable). */
function instantAuJour(jour: number, heure: number): string {
  const j = String((jour % 28) + 1).padStart(2, '0');
  const h = String(heure % 24).padStart(2, '0');
  return `2026-09-${j}T${h}:00:00Z`;
}

const arbProbabilite = fc.double({ min: 0, max: 1, noNaN: true });

/**
 * Un paramétrage BKT engendré dans TOUT son domaine.
 *
 * La table `pDevinette` respecte la forme des données : une valeur pour chacun des sept modes
 * tabulés, `null` pour les deux calculés — c'est D13, et `pDevinette()` s'appuie dessus pour
 * décider s'il faut lire la table ou calculer `1/n!`.
 */
const arbParametres: fc.Arbitrary<ParametresBkt> = fc
  .record({
    pInit: arbProbabilite,
    pTransit: arbProbabilite,
    pGlissement: arbProbabilite,
    poidsAvecAide: fc.double({ min: 0.01, max: 0.99, noNaN: true }),
    devinettes: fc.array(arbProbabilite, {
      minLength: MODES_TABULES.length,
      maxLength: MODES_TABULES.length,
    }),
  })
  .map((brut): ParametresBkt => {
    const table: Record<string, number | null> = {};
    for (const [index, mode] of MODES_TABULES.entries()) {
      table[mode] = brut.devinettes[index] as number;
    }
    for (const mode of MODES_CALCULES) table[mode] = null;
    return {
      pInit: brut.pInit,
      pTransit: brut.pTransit,
      pGlissement: brut.pGlissement,
      poidsAvecAide: brut.poidsAvecAide,
      pDevinette: table as ParametresBkt['pDevinette'],
    };
  });

/** Une observation sur les NEUF modes. `nbElements` est chiffré dès que le mode le calcule. */
const arbObservation: fc.Arbitrary<ObservationTentative> = fc
  .record({
    reussi: fc.boolean(),
    mode: fc.constantFrom(...TOUS_LES_MODES),
    nbElements: fc.integer({ min: 2, max: 8 }),
    avecAide: fc.boolean(),
    jour: fc.integer({ min: 0, max: 60 }),
    heure: fc.integer({ min: 0, max: 23 }),
  })
  .map(
    (brut): ObservationTentative => ({
      competence: COMPETENCE,
      reussi: brut.reussi,
      modeReponse: brut.mode,
      // Chiffré pour tous : la table ci-dessus rend `null` pour `ordre` et `appariement`, donc
      // ces deux-là EXIGENT le nombre. Le fournir aux sept autres est sans effet — la branche
      // tabulée rend avant de le lire —, et cela évite de faire lever le générateur.
      nbElements: brut.nbElements,
      avecAide: brut.avecAide,
      instant: instantAuJour(brut.jour, brut.heure),
    }),
  );

const arbCritere: fc.Arbitrary<CritereAcquis> = fc.record({
  seuilP: arbProbabilite,
  tentativesMin: fc.integer({ min: 0, max: 20 }),
  joursDistinctsMin: fc.integer({ min: 0, max: 10 }),
  tentativesFaibleDevinetteMin: fc.integer({ min: 0, max: 10 }),
  seuilFaibleDevinette: arbProbabilite,
});

const CRITERE_REEL = PARAMETRES_REELS.acquis;

// ═══════════════════════════════════════════════════════════ M1 — le domaine de `p`

describe('M1 — `p` reste dans [0, 1], pour TOUT paramétrage et TOUTE séquence', () => {
  it(`${String(NB_CAS)} séquences, paramètres engendrés, les neuf modes de réponse`, () => {
    let observationsVues = 0;
    const modesVus = new Set<string>();
    fc.assert(
      fc.property(
        arbParametres,
        arbCritere,
        fc.array(arbObservation, { maxLength: 60 }),
        (params, critere, observations) => {
          let etat = etatMaitriseInitial(COMPETENCE, params);
          expect(etat.p, 'l’état initial sort déjà du domaine').toBeGreaterThanOrEqual(0);
          expect(etat.p).toBeLessThanOrEqual(1);

          for (const [rang, observation] of observations.entries()) {
            etat = mettreAJourMaitrise(etat, observation, params, critere);
            observationsVues += 1;
            modesVus.add(observation.modeReponse);
            const ou = `mode=${observation.modeReponse} rang=${String(rang)}`;
            expect(Number.isNaN(etat.p), `${ou} : p est NaN`).toBe(false);
            expect(Number.isFinite(etat.p), `${ou} : p n’est pas fini`).toBe(true);
            expect(etat.p, `${ou} : p < 0`).toBeGreaterThanOrEqual(0);
            expect(etat.p, `${ou} : p > 1`).toBeLessThanOrEqual(1);
          }
        },
      ),
      reglages(),
    );
    // Sans ces planchers, une séquence toujours vide rendrait la propriété verte par vacuité,
    // et un générateur qui n'aurait tiré que `vrai-faux` la rendrait verte par étroitesse.
    expect(observationsVues, 'presque aucune observation appliquée').toBeGreaterThan(NB_CAS * 3);
    expect([...modesVus].sort(), 'les neuf modes n’ont pas tous été joués').toEqual(
      [...TOUS_LES_MODES].sort(),
    );
  });

  it('`pDevinette` reste elle-même dans [0, 1], y compris sur les modes CALCULÉS (D13)', () => {
    fc.assert(
      fc.property(arbParametres, arbObservation, (params, observation) => {
        const p = pDevinette(params, observation);
        expect(Number.isFinite(p), `${observation.modeReponse} : p_devinette non finie`).toBe(true);
        expect(p, `${observation.modeReponse} : p_devinette < 0`).toBeGreaterThanOrEqual(0);
        expect(p, `${observation.modeReponse} : p_devinette > 1`).toBeLessThanOrEqual(1);
      }),
      reglages(),
    );
  });
});

// ═════════════════════════════════════ M2 — l'aide pèse STRICTEMENT moins

describe('M2 — une tentative AVEC aide déplace `p` strictement moins qu’une SANS aide', () => {
  /**
   * v2 § 12.2 : « une tentative avec aide de Gobi pèse 0,4 ». Le poids porte sur le
   * DÉPLACEMENT de `p`, pas sur la vraisemblance — c'est ce qui rend la propriété vérifiable
   * exactement, et `bkt.ts` le dit en toutes lettres.
   *
   * L'assertion mord dans les deux sens :
   *   · l'aide ne déplace JAMAIS plus que l'absence d'aide (sinon demander de l'aide
   *     rapporterait, et le sélecteur croirait à une maîtrise qui n'existe pas) ;
   *   · quand il y a quelque chose à déplacer, elle déplace STRICTEMENT moins. Un `poids`
   *     ramené à 1 par mégarde ferait tomber ce cas-là et lui seul.
   *   · le SENS du déplacement est le même : l'aide n'est pas une punition (R14).
   */
  it(`${String(NB_CAS)} états et observations engendrés — jamais autant, jamais davantage`, () => {
    let stricts = 0;
    let compares = 0;
    fc.assert(
      fc.property(
        arbParametres,
        arbCritere,
        arbObservation,
        arbProbabilite,
        (params, critere, observation, pDepart) => {
          const depart: EtatMaitrise = {
            competence: COMPETENCE,
            p: pDepart,
            nbTentatives: 3,
            joursDistincts: ['2026-09-01', '2026-09-02'],
            nbTentativesFaibleDevinette: 1,
            acquiseLe: null,
          };
          const sans = mettreAJourMaitrise(
            depart, { ...observation, avecAide: false }, params, critere,
          );
          const avec = mettreAJourMaitrise(
            depart, { ...observation, avecAide: true }, params, critere,
          );
          const dSans = sans.p - depart.p;
          const dAvec = avec.p - depart.p;
          compares += 1;

          expect(
            Math.abs(dAvec),
            `l’aide a déplacé p de ${String(dAvec)} contre ${String(dSans)} sans aide : ` +
              'demander de l’aide rapporterait',
          ).toBeLessThanOrEqual(Math.abs(dSans) + 1e-12);

          if (Math.abs(dSans) > 1e-9) {
            stricts += 1;
            expect(
              Math.abs(dAvec),
              'le poids de l’aide ne pèse plus : le déplacement est identique',
            ).toBeLessThan(Math.abs(dSans));
            expect(
              Math.sign(dAvec),
              'l’aide a changé le SENS du déplacement — elle serait une punition (R14)',
            ).toBe(Math.sign(dSans));
          }
        },
      ),
      reglages(),
    );
    console.log(
      `[Q3-P2] comparaisons aide/sans-aide = ${String(compares)} · ` +
        `dont déplacement non nul = ${String(stricts)}`,
    );
    // C'EST CE PLANCHER QUI EMPÊCHE LA PROPRIÉTÉ D'ÊTRE CREUSE. Si le déplacement était nul
    // partout — `pTransit` à zéro, `p` collée à une borne — la comparaison stricte ne serait
    // jamais évaluée et le cas resterait vert avec un poids d'aide cassé.
    expect(stricts, 'aucun déplacement non nul : la comparaison stricte n’a jamais tourné')
      .toBeGreaterThan(NB_CAS / 10);
  });

  it('sur les paramètres RÉELS du référentiel, le rapport des déplacements vaut `poidsAvecAide`', () => {
    // Le témoin : la propriété générique ci-dessus vaut pour tout paramétrage ; celle-ci
    // vérifie que les données livrées appliquent bien le poids qu'elles déclarent.
    const poids = PARAMETRES_REELS.bkt.poidsAvecAide;
    expect(poids, 'un poids hors de (0, 1) rendrait la propriété M2 fausse').toBeGreaterThan(0);
    expect(poids).toBeLessThan(1);
    fc.assert(
      fc.property(
        fc.constantFrom(...MODES_TABULES),
        fc.boolean(),
        arbProbabilite,
        (mode, reussi, pDepart) => {
          const depart: EtatMaitrise = {
            competence: COMPETENCE, p: pDepart, nbTentatives: 2,
            joursDistincts: ['2026-09-01'], nbTentativesFaibleDevinette: 1, acquiseLe: null,
          };
          const base = {
            competence: COMPETENCE, reussi, modeReponse: mode, nbElements: null,
            instant: '2026-09-03T08:00:00Z',
          } as const;
          const sans = mettreAJourMaitrise(
            depart, { ...base, avecAide: false }, PARAMETRES_REELS.bkt, CRITERE_REEL,
          );
          const avec = mettreAJourMaitrise(
            depart, { ...base, avecAide: true }, PARAMETRES_REELS.bkt, CRITERE_REEL,
          );
          const dSans = sans.p - depart.p;
          const dAvec = avec.p - depart.p;
          if (Math.abs(dSans) > 1e-9) {
            expect(dAvec / dSans, 'le rapport des déplacements n’est plus `poidsAvecAide`')
              .toBeCloseTo(poids, 9);
          }
        },
      ),
      reglages(),
    );
  });
});

// ══════════════════════════════════ M3 — les compteurs restent cohérents

describe('M3 — les compteurs de `EtatMaitrise` restent cohérents entre eux', () => {
  it('nbTentatives suit la séquence, les jours sont triés et uniques, rien ne décroît', () => {
    fc.assert(
      fc.property(
        arbParametres,
        arbCritere,
        fc.array(arbObservation, { maxLength: 50 }),
        (params, critere, observations) => {
          let etat = etatMaitriseInitial(COMPETENCE, params);
          let tentativesPrec = -1;
          let faiblesPrec = -1;
          let joursPrec = -1;

          for (const observation of observations) {
            etat = mettreAJourMaitrise(etat, observation, params, critere);

            expect(etat.nbTentatives, 'nbTentatives a décru').toBeGreaterThan(tentativesPrec);
            tentativesPrec = etat.nbTentatives;

            expect(etat.nbTentativesFaibleDevinette, 'le compteur à faible devinette a décru')
              .toBeGreaterThanOrEqual(faiblesPrec);
            faiblesPrec = etat.nbTentativesFaibleDevinette;

            expect(
              etat.nbTentativesFaibleDevinette,
              'plus de tentatives à faible devinette que de tentatives',
            ).toBeLessThanOrEqual(etat.nbTentatives);

            expect(etat.joursDistincts.length, 'le nombre de jours a décru')
              .toBeGreaterThanOrEqual(joursPrec);
            joursPrec = etat.joursDistincts.length;

            expect(
              etat.joursDistincts.length,
              'plus de jours distincts que de tentatives : un jour a été compté deux fois',
            ).toBeLessThanOrEqual(etat.nbTentatives);

            const tries = [...etat.joursDistincts].sort();
            expect(etat.joursDistincts, 'les jours ne sont plus triés').toEqual(tries);
            expect(new Set(etat.joursDistincts).size, 'un jour figure deux fois').toBe(
              etat.joursDistincts.length,
            );
          }
          expect(etat.nbTentatives, 'nbTentatives ne suit pas la séquence').toBe(
            observations.length,
          );
        },
      ),
      reglages(),
    );
  });

  it('R14 — `acquiseLe`, une fois posé, ne repasse JAMAIS à `null`', () => {
    const POSE = '2026-09-01T08:00:00Z';
    fc.assert(
      fc.property(
        arbParametres,
        arbCritere,
        fc.array(arbObservation, { maxLength: 40 }),
        (params, critere, observations) => {
          let etat: EtatMaitrise = { ...etatMaitriseInitial(COMPETENCE, params), acquiseLe: POSE };
          for (const observation of observations) {
            etat = mettreAJourMaitrise(etat, observation, params, critere);
            expect(etat.acquiseLe, 'un acquis a été repris — R14').toBe(POSE);
          }
        },
      ),
      reglages(),
    );
  });

  it('la fonction est PURE : l’état d’entrée n’est jamais modifié', () => {
    fc.assert(
      fc.property(arbParametres, arbCritere, arbObservation, (params, critere, observation) => {
        const depart = etatMaitriseInitial(COMPETENCE, params);
        const temoin = structuredClone(depart);
        mettreAJourMaitrise(depart, observation, params, critere);
        expect(depart, 'l’état d’entrée a été MUTÉ').toEqual(temoin);
      }),
      reglages(),
    );
  });
});

// ═════════════════════════ M4 — `estAcquise` est bien la conjonction des quatre

describe('M4 — `estAcquise` est exactement la conjonction des QUATRE conditions (D13)', () => {
  it('coïncide avec la conjonction, sur des états et des critères engendrés', () => {
    let acquis = 0;
    let refuses = 0;
    fc.assert(
      fc.property(
        arbParametres,
        arbCritere,
        fc.array(arbObservation, { maxLength: 40 }),
        (params, critere, observations) => {
          let etat = etatMaitriseInitial(COMPETENCE, params);
          for (const observation of observations) {
            etat = mettreAJourMaitrise(etat, observation, params, critere);
          }
          const attendu =
            etat.p >= critere.seuilP &&
            etat.nbTentatives >= critere.tentativesMin &&
            etat.joursDistincts.length >= critere.joursDistinctsMin &&
            etat.nbTentativesFaibleDevinette >= critere.tentativesFaibleDevinetteMin;
          expect(estAcquise(etat, critere), 'estAcquise diverge de la conjonction').toBe(attendu);
          if (attendu) acquis += 1;
          else refuses += 1;
        },
      ),
      reglages(),
    );
    console.log(`[Q3-P2] estAcquise : acquis=${String(acquis)} refusés=${String(refuses)}`);
    // Les deux issues doivent avoir été VUES : une propriété qui ne rencontrerait jamais
    // qu'un seul verdict ne compare rien du tout.
    expect(acquis, 'aucun état acquis rencontré').toBeGreaterThan(0);
    expect(refuses, 'aucun état refusé rencontré').toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════ CONTRAT DE SORTIE

describe('CONTRAT DE SORTIE — la propriété 2 a bien tourné, et sur quoi', () => {
  it('imprime modes, propriétés, cas — et échoue si l’un est creux', () => {
    console.log(
      [
        `[Q3-P2] modes de réponse couverts ..... ${String(TOUS_LES_MODES.length)} / 9`,
        `[Q3-P2]   dont modes CALCULÉS (D13) ... ${MODES_CALCULES.join(', ')}`,
        `[Q3-P2] propriétés de ce fichier ...... 8`,
        `[Q3-P2] cas engendrés par propriété ... ${String(NB_CAS)}`,
        `[Q3-P2] paramétrage : ENGENDRÉ sur tout le domaine + témoin sur le référentiel réel`,
      ].join('\n'),
    );
    expect(TOUS_LES_MODES.length, 'les neuf modes de D13 ne sont pas tous là').toBe(9);
    expect(new Set(TOUS_LES_MODES).size, 'un mode figure deux fois').toBe(9);
    expect(NB_CAS, 'moins de mille cas par propriété').toBeGreaterThanOrEqual(1000);
    expect(
      PARAMETRES_REELS.bkt.pDevinette['ordre'],
      'D13 : `ordre` doit rester non tabulé dans les données',
    ).toBeNull();
  });
});
