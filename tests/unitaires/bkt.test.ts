/**
 * BKT — propriétés P1 à P5 du contrat des features v2 § 4.4. Lot L2-D.
 *
 * Tests de PROPRIÉTÉ, pas d'exemple, et c'est le seul choix défendable ici : « un ajustement du
 * BKT ne casse rien visiblement, et la progression est devenue absurde. Personne ne le voit
 * avant trois semaines » (annexe T § 1). Un test d'exemple prouve qu'une valeur vaut ce qu'on
 * vient d'écrire ; une propriété prouve qu'aucune séquence de tentatives ne la met en défaut.
 *
 * Les paramètres viennent du FICHIER RÉEL, jamais d'une copie inventée pour le test : si une
 * recalibration future rendait une propriété fausse, c'est ici qu'elle doit tomber.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ErreurPierre } from '@pierre/partage';
import { estAcquise, etatMaitriseInitial, mettreAJourMaitrise, pDevinette } from '@partage/pedagogie/bkt.js';
import { lireParametresPedagogie } from '@partage/pedagogie/parametres.js';

import { lireJson } from '../configuration/preparation.js';

import type { EtatMaitrise, ModeReponse, ObservationTentative } from '@pierre/partage';

const PARAMETRES = lireParametresPedagogie(
  lireJson('contenu/referentiel/parametres-pedagogie.json')
);
const BKT = PARAMETRES.bkt;
const ACQUIS = PARAMETRES.acquis;

const COMPETENCE = 'gph.a';

/** Les 7 modes tabulés. `ordre` et `appariement` sont traités à part : ils exigent `nbElements`. */
const MODES_TABULES: readonly ModeReponse[] = [
  'vrai-faux', 'qcm-3', 'qcm-4', 'place', 'colorie', 'trace', 'saisie',
];
const MODES_CALCULES: readonly ModeReponse[] = ['ordre', 'appariement'];

/** Un instant ISO à J+`jour`, heure fixe : le BKT ne dépend que du JOUR, pas de l'heure. */
function instantAuJour(jour: number): string {
  const jourDuMois = String((jour % 28) + 1).padStart(2, '0');
  const mois = String((Math.floor(jour / 28) % 12) + 1).padStart(2, '0');
  return `2026-${mois}-${jourDuMois}T09:00:00.000Z`;
}

const arbObservation = fc.record({
  competence: fc.constant(COMPETENCE),
  reussi: fc.boolean(),
  modeReponse: fc.constantFrom(...MODES_TABULES),
  nbElements: fc.constant(null),
  avecAide: fc.boolean(),
  instant: fc.integer({ min: 0, max: 60 }).map(instantAuJour),
}) as fc.Arbitrary<ObservationTentative>;

function appliquer(
  etat: EtatMaitrise,
  observations: readonly ObservationTentative[]
): EtatMaitrise {
  return observations.reduce((courant, obs) => mettreAJourMaitrise(courant, obs, BKT, ACQUIS), etat);
}

// ───────────────────────────────────────────────────────────── p_devinette (D13)

describe('pDevinette — c’est le MODE qui la fixe, jamais une valeur globale (D13)', () => {
  it('rend la valeur tabulée du mode, telle qu’elle est déclarée en données', () => {
    for (const mode of MODES_TABULES) {
      const attendu = BKT.pDevinette[mode];
      expect(attendu).not.toBeNull();
      const observation: ObservationTentative = {
        competence: COMPETENCE, reussi: true, modeReponse: mode,
        nbElements: null, avecAide: false, instant: instantAuJour(0),
      };
      expect(pDevinette(BKT, observation)).toBeCloseTo(attendu as number, 10);
    }
  });

  it('distingue les 7 modes tabulés — un BKT qui rend la même valeur partout est creux', () => {
    const valeurs = new Set(
      MODES_TABULES.map((mode) =>
        pDevinette(BKT, {
          competence: COMPETENCE, reussi: true, modeReponse: mode,
          nbElements: null, avecAide: false, instant: instantAuJour(0),
        })
      )
    );
    // `colorie` et `trace` partagent volontairement 0,02 : 7 modes, 6 valeurs distinctes.
    expect(valeurs.size).toBeGreaterThanOrEqual(6);
  });

  it('calcule 1/n! pour `ordre` et `appariement`, jamais une valeur tabulée', () => {
    const factorielle = (n: number): number => (n <= 1 ? 1 : n * factorielle(n - 1));
    fc.assert(
      fc.property(
        fc.constantFrom(...MODES_CALCULES),
        fc.integer({ min: 2, max: 8 }),
        (mode, n) => {
          const p = pDevinette(BKT, {
            competence: COMPETENCE, reussi: true, modeReponse: mode,
            nbElements: n, avecAide: false, instant: instantAuJour(0),
          });
          expect(p).toBeCloseTo(1 / factorielle(n), 12);
        }
      )
    );
  });

  it('LÈVE `argument-invalide` si `nbElements` manque pour `ordre` ou `appariement`', () => {
    for (const mode of MODES_CALCULES) {
      let leve: unknown = null;
      try {
        pDevinette(BKT, {
          competence: COMPETENCE, reussi: true, modeReponse: mode,
          nbElements: null, avecAide: false, instant: instantAuJour(0),
        });
      } catch (erreur) {
        leve = erreur;
      }
      expect(ErreurPierre.porteLeCode(leve, 'argument-invalide')).toBe(true);
    }
  });

  it('refuse `nbElements < 2` : ordonner un seul élément n’est pas une devinette', () => {
    for (const n of [0, 1, -3, 2.5]) {
      let leve: unknown = null;
      try {
        pDevinette(BKT, {
          competence: COMPETENCE, reussi: true, modeReponse: 'ordre',
          nbElements: n, avecAide: false, instant: instantAuJour(0),
        });
      } catch (erreur) {
        leve = erreur;
      }
      expect(ErreurPierre.porteLeCode(leve, 'argument-invalide')).toBe(true);
    }
  });

  it('rend toujours une probabilité dans [0, 1]', () => {
    fc.assert(
      fc.property(arbObservation, (observation) => {
        const p = pDevinette(BKT, observation);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      })
    );
  });
});

// ───────────────────────────────────────────────────────────── P1

describe('P1 — une suite de réussites fait croître `p` de façon monotone', () => {
  it('croît strictement à chaque réussite, pour les 7 modes tabulés', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MODES_TABULES),
        fc.boolean(),
        fc.integer({ min: 1, max: 30 }),
        (mode, avecAide, nb) => {
          let etat = etatMaitriseInitial(COMPETENCE, BKT);
          for (let i = 0; i < nb; i += 1) {
            const suivant = mettreAJourMaitrise(
              etat,
              {
                competence: COMPETENCE, reussi: true, modeReponse: mode,
                nbElements: null, avecAide, instant: instantAuJour(i),
              },
              BKT,
              ACQUIS
            );
            // Monotone toujours ; STRICTEMENT croissante tant que `p` n'a pas atteint 1.
            // `p` tend vers 1 sans jamais le dépasser : arrivé à 1 en double précision, il y
            // reste, et exiger une croissance stricte y serait exiger p > 1.
            expect(suivant.p).toBeGreaterThanOrEqual(etat.p);
            if (etat.p < 1) {
              expect(suivant.p).toBeGreaterThan(etat.p);
            }
            etat = suivant;
          }
        }
      )
    );
  });

  it('un échec ne fait jamais monter `p` autant qu’une réussite', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MODES_TABULES), (mode) => {
        const depart = etatMaitriseInitial(COMPETENCE, BKT);
        const commun = {
          competence: COMPETENCE, modeReponse: mode, nbElements: null,
          avecAide: false, instant: instantAuJour(0),
        } as const;
        const reussi = mettreAJourMaitrise(depart, { ...commun, reussi: true }, BKT, ACQUIS);
        const rate = mettreAJourMaitrise(depart, { ...commun, reussi: false }, BKT, ACQUIS);
        expect(rate.p).toBeLessThan(reussi.p);
      })
    );
  });
});

// ───────────────────────────────────────────────────────────── P2

describe('P2 — `p` reste dans [0, 1] quelle que soit la séquence', () => {
  it('sur des séquences arbitraires de 0 à 60 observations', () => {
    fc.assert(
      fc.property(fc.array(arbObservation, { maxLength: 60 }), (observations) => {
        let etat = etatMaitriseInitial(COMPETENCE, BKT);
        for (const observation of observations) {
          etat = mettreAJourMaitrise(etat, observation, BKT, ACQUIS);
          expect(Number.isFinite(etat.p)).toBe(true);
          expect(etat.p).toBeGreaterThanOrEqual(0);
          expect(etat.p).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 300 }
    );
  });

  it('les compteurs ne décroissent jamais, et `nbTentatives` suit exactement le nombre d’observations', () => {
    fc.assert(
      fc.property(fc.array(arbObservation, { maxLength: 40 }), (observations) => {
        let etat = etatMaitriseInitial(COMPETENCE, BKT);
        for (const observation of observations) {
          const suivant = mettreAJourMaitrise(etat, observation, BKT, ACQUIS);
          expect(suivant.nbTentatives).toBe(etat.nbTentatives + 1);
          expect(suivant.joursDistincts.length).toBeGreaterThanOrEqual(
            etat.joursDistincts.length
          );
          expect(suivant.nbTentativesFaibleDevinette).toBeGreaterThanOrEqual(
            etat.nbTentativesFaibleDevinette
          );
          etat = suivant;
        }
        expect(etat.nbTentatives).toBe(observations.length);
      })
    );
  });

  it('`joursDistincts` reste trié, sans doublon, et compte les jours et non les tentatives', () => {
    fc.assert(
      fc.property(fc.array(arbObservation, { minLength: 1, maxLength: 40 }), (observations) => {
        const etat = appliquer(etatMaitriseInitial(COMPETENCE, BKT), observations);
        const attendus = [...new Set(observations.map((o) => o.instant.slice(0, 10)))].sort();
        expect([...etat.joursDistincts]).toEqual(attendus);
      })
    );
  });

  it('l’état d’entrée n’est jamais modifié : la fonction est pure', () => {
    const depart = etatMaitriseInitial(COMPETENCE, BKT);
    const copie = structuredClone(depart);
    mettreAJourMaitrise(depart, {
      competence: COMPETENCE, reussi: true, modeReponse: 'colorie',
      nbElements: null, avecAide: false, instant: instantAuJour(0),
    }, BKT, ACQUIS);
    expect(depart).toEqual(copie);
  });
});

// ───────────────────────────────────────────────────────────── P3

describe('P3 — une tentative avec aide fait moins bouger `p` qu’une sans aide', () => {
  it('strictement moins, jamais autant, jamais davantage', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MODES_TABULES),
        fc.boolean(),
        fc.array(arbObservation, { maxLength: 12 }),
        (mode, reussi, prefixe) => {
          const depart = appliquer(etatMaitriseInitial(COMPETENCE, BKT), prefixe);
          const commun = {
            competence: COMPETENCE, reussi, modeReponse: mode,
            nbElements: null, instant: instantAuJour(50),
          } as const;
          const sans = mettreAJourMaitrise(depart, { ...commun, avecAide: false }, BKT, ACQUIS);
          const avec = mettreAJourMaitrise(depart, { ...commun, avecAide: true }, BKT, ACQUIS);

          const deltaSans = Math.abs(sans.p - depart.p);
          const deltaAvec = Math.abs(avec.p - depart.p);

          // Proportionnalité exacte : le poids de D13/v2 § 12.2 est un poids sur le DÉPLACEMENT.
          expect(deltaAvec).toBeCloseTo(BKT.poidsAvecAide * deltaSans, 12);
          if (deltaSans > 1e-12) {
            expect(deltaAvec).toBeLessThan(deltaSans);
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  it('l’aide ne change jamais le SENS du déplacement — elle n’est pas une punition (R14)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MODES_TABULES), fc.boolean(), (mode, reussi) => {
        const depart = etatMaitriseInitial(COMPETENCE, BKT);
        const commun = {
          competence: COMPETENCE, reussi, modeReponse: mode,
          nbElements: null, instant: instantAuJour(0),
        } as const;
        const sans = mettreAJourMaitrise(depart, { ...commun, avecAide: false }, BKT, ACQUIS);
        const avec = mettreAJourMaitrise(depart, { ...commun, avecAide: true }, BKT, ACQUIS);
        expect(Math.sign(sans.p - depart.p)).toBe(Math.sign(avec.p - depart.p));
      })
    );
  });
});

// ───────────────────────────────────────────────────────────── P4

describe('P4 — `acquiseLe`, une fois posé, n’est jamais effacé (R14)', () => {
  it('survit à n’importe quelle séquence, y compris une série d’échecs', () => {
    fc.assert(
      fc.property(fc.array(arbObservation, { maxLength: 40 }), (observations) => {
        const acquisLe = '2026-09-01T08:00:00.000Z';
        const depart: EtatMaitrise = {
          ...etatMaitriseInitial(COMPETENCE, BKT),
          acquiseLe: acquisLe,
        };
        const etat = appliquer(depart, observations);
        expect(etat.acquiseLe).toBe(acquisLe);
      })
    );
  });

  it('n’invente jamais un `acquiseLe` : le poser est la responsabilité du dépôt', () => {
    const etat = appliquer(
      etatMaitriseInitial(COMPETENCE, BKT),
      Array.from({ length: 30 }, (_, i) => ({
        competence: COMPETENCE, reussi: true, modeReponse: 'saisie' as const,
        nbElements: null, avecAide: false, instant: instantAuJour(i),
      }))
    );
    expect(etat.acquiseLe).toBeNull();
    // …mais l'état atteint DOIT satisfaire le critère : sinon le dépôt ne poserait jamais rien.
    expect(estAcquise(etat, ACQUIS)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────── P5

describe('P5 — le critère complet de D13 : les QUATRE conditions, pas trois', () => {
  /** Le critère réécrit à la main, à partir de l'état : c'est lui qui fait foi dans ce test. */
  function critereALaMain(etat: EtatMaitrise): boolean {
    return (
      etat.p >= ACQUIS.seuilP &&
      etat.nbTentatives >= ACQUIS.tentativesMin &&
      etat.joursDistincts.length >= ACQUIS.joursDistinctsMin &&
      etat.nbTentativesFaibleDevinette >= ACQUIS.tentativesFaibleDevinetteMin
    );
  }

  it('coïncide avec la conjonction des quatre conditions, sur des séquences arbitraires', () => {
    fc.assert(
      fc.property(fc.array(arbObservation, { maxLength: 60 }), (observations) => {
        const etat = appliquer(etatMaitriseInitial(COMPETENCE, BKT), observations);
        expect(estAcquise(etat, ACQUIS)).toBe(critereALaMain(etat));
      }),
      { numRuns: 300 }
    );
  });

  it('LA CLAUSE DE D13 : une série de vrai/faux chanceux n’acquiert JAMAIS', () => {
    // 40 réussites en vrai/faux, sur 40 jours distincts, sans aide. `p` franchit le seuil,
    // le nombre de tentatives et de jours aussi — et pourtant rien n'est acquis, parce que
    // `p_devinette = 0,50 > seuilFaibleDevinette`. C'est exactement le défaut que D13 nomme.
    const etat = appliquer(
      etatMaitriseInitial(COMPETENCE, BKT),
      Array.from({ length: 40 }, (_, i) => ({
        competence: COMPETENCE, reussi: true, modeReponse: 'vrai-faux' as const,
        nbElements: null, avecAide: false, instant: instantAuJour(i),
      }))
    );

    expect(etat.p).toBeGreaterThanOrEqual(ACQUIS.seuilP);
    expect(etat.nbTentatives).toBeGreaterThanOrEqual(ACQUIS.tentativesMin);
    expect(etat.joursDistincts.length).toBeGreaterThanOrEqual(ACQUIS.joursDistinctsMin);
    expect(etat.nbTentativesFaibleDevinette).toBe(0);
    expect(estAcquise(etat, ACQUIS)).toBe(false);
  });

  it('les mêmes tentatives, plus deux à faible devinette, acquièrent', () => {
    let etat = appliquer(
      etatMaitriseInitial(COMPETENCE, BKT),
      Array.from({ length: 40 }, (_, i) => ({
        competence: COMPETENCE, reussi: true, modeReponse: 'vrai-faux' as const,
        nbElements: null, avecAide: false, instant: instantAuJour(i),
      }))
    );
    expect(estAcquise(etat, ACQUIS)).toBe(false);

    for (let i = 0; i < ACQUIS.tentativesFaibleDevinetteMin; i += 1) {
      etat = mettreAJourMaitrise(
        etat,
        {
          competence: COMPETENCE, reussi: true, modeReponse: 'saisie',
          nbElements: null, avecAide: false, instant: instantAuJour(41 + i),
        },
        BKT,
        ACQUIS
      );
    }
    expect(etat.nbTentativesFaibleDevinette).toBe(ACQUIS.tentativesFaibleDevinetteMin);
    expect(estAcquise(etat, ACQUIS)).toBe(true);
  });

  it('trois jours distincts sont exigés : 40 tentatives le même jour n’acquièrent pas', () => {
    const etat = appliquer(
      etatMaitriseInitial(COMPETENCE, BKT),
      Array.from({ length: 40 }, () => ({
        competence: COMPETENCE, reussi: true, modeReponse: 'saisie' as const,
        nbElements: null, avecAide: false, instant: instantAuJour(0),
      }))
    );
    expect(etat.p).toBeGreaterThanOrEqual(ACQUIS.seuilP);
    expect(etat.joursDistincts).toHaveLength(1);
    expect(estAcquise(etat, ACQUIS)).toBe(false);
  });

  it('l’état initial n’est jamais acquis', () => {
    expect(estAcquise(etatMaitriseInitial(COMPETENCE, BKT), ACQUIS)).toBe(false);
  });
});

describe('etatMaitriseInitial', () => {
  it('part de `pInit`, sans tentative, sans jour, sans acquis', () => {
    const etat = etatMaitriseInitial(COMPETENCE, BKT);
    expect(etat).toEqual({
      competence: COMPETENCE,
      p: BKT.pInit,
      nbTentatives: 0,
      joursDistincts: [],
      nbTentativesFaibleDevinette: 0,
      acquiseLe: null,
    });
  });
});

// ───────────────────────────────────────────────────── branches défensives

/**
 * Les chemins que le fichier de paramètres réel n'atteint jamais, parce que
 * `lireParametresPedagogie` les refuse en amont.
 *
 * Ils ne sont pas décoratifs : le jour où quelqu'un appellera le BKT avec des paramètres
 * construits à la main — un script d'analyse, une simulation de recalibration — c'est ce
 * comportement-là qu'il obtiendra. Une division par zéro silencieuse y produirait un `NaN` qui
 * se propagerait dans toute la projection.
 */
describe('branches défensives — paramètres hors domaine', () => {
  const bktBrise = (surcharge: Partial<typeof BKT>) => ({ ...BKT, ...surcharge });

  it('borne un `pInit` non fini à 0 plutôt que de propager un NaN', () => {
    const etat = etatMaitriseInitial(COMPETENCE, bktBrise({ pInit: Number.NaN }));
    expect(etat.p).toBe(0);
  });

  it('ne rend jamais NaN quand la vraisemblance est nulle des deux côtés', () => {
    const params = bktBrise({
      pInit: 0,
      pTransit: 0,
      pGlissement: 0,
      pDevinette: { ...BKT.pDevinette, colorie: 0 },
    });
    for (const reussi of [true, false]) {
      const etat = mettreAJourMaitrise(
        etatMaitriseInitial(COMPETENCE, params),
        {
          competence: COMPETENCE, reussi, modeReponse: 'colorie',
          nbElements: null, avecAide: false, instant: instantAuJour(0),
        },
        params,
        ACQUIS
      );
      expect(Number.isFinite(etat.p)).toBe(true);
      expect(etat.p).toBe(0);
    }
  });

  it('traite un mode absent de la table comme un mode calculé, et l’exige donc chiffré', () => {
    const sansColorie = { ...BKT.pDevinette } as Record<string, number | null>;
    delete sansColorie['colorie'];
    const params = bktBrise({
      pDevinette: sansColorie as (typeof BKT)['pDevinette'],
    });
    const observation: ObservationTentative = {
      competence: COMPETENCE, reussi: true, modeReponse: 'colorie',
      nbElements: null, avecAide: false, instant: instantAuJour(0),
    };
    let leve: unknown = null;
    try {
      pDevinette(params, observation);
    } catch (erreur) {
      leve = erreur;
    }
    expect(ErreurPierre.porteLeCode(leve, 'argument-invalide')).toBe(true);
    // …et avec `nbElements`, il rend bien 1/n!.
    expect(pDevinette(params, { ...observation, nbElements: 3 })).toBeCloseTo(1 / 6, 12);
  });

  it('ignore une valeur tabulée pour `ordre` : elle serait fausse dès que n change', () => {
    const params = bktBrise({
      pDevinette: { ...BKT.pDevinette, ordre: 0.5 },
    });
    expect(
      pDevinette(params, {
        competence: COMPETENCE, reussi: true, modeReponse: 'ordre',
        nbElements: 3, avecAide: false, instant: instantAuJour(0),
      })
    ).toBeCloseTo(1 / 6, 12);
  });

  it('LÈVE sur un horodatage qui n’est pas de l’ISO 8601 UTC', () => {
    for (const instant of ['01/09/2026', '2026-09-01', 'hier', '']) {
      let leve: unknown = null;
      try {
        mettreAJourMaitrise(
          etatMaitriseInitial(COMPETENCE, BKT),
          {
            competence: COMPETENCE, reussi: true, modeReponse: 'colorie',
            nbElements: null, avecAide: false, instant,
          },
          BKT,
          ACQUIS
        );
      } catch (erreur) {
        leve = erreur;
      }
      expect(ErreurPierre.porteLeCode(leve, 'argument-invalide')).toBe(true);
    }
  });
});
