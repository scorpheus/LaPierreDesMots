/**
 * Protocole A/B de D19 — lot L2-B, annexe T § T1.
 *
 * Ce que ces cas défendent, et pourquoi ça vaut la peine d'être défendu :
 *
 *  1. **L'alternance est déterministe et STRICTEMENT contrebalancée.** Sur `n` sessions, chaque
 *     bras est servi `n/2` fois à une unité près. Un tirage aléatoire, même équiprobable, ne le
 *     garantit pas — et sur UN seul enfant, une série de six sessions déséquilibrée suffit à
 *     rendre la comparaison illisible. C'est l'écart entre randomiser et contrebalancer.
 *  2. **On ne nomme pas de favori sur trop peu de mesures.** « Ne jamais conclure sur un bras à
 *     trois tentatives » (contrat § 4.2). C'est ce que le `null` protège, et c'est le seul
 *     endroit du lot où une conclusion trop rapide changerait ce que l'enfant voit à l'écran.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  TENTATIVES_MIN_PAR_BRAS,
  brasDeSession,
  comparer,
} from '@pierre/partage/lecture';
import type {
  ConfigurationBras,
  EssaiTypographie,
  ResultatBras,
} from '@pierre/partage/lecture';

import { INSTANT_DE_REFERENCE } from '../configuration/preparation.js';

const BRAS_A: ConfigurationBras = { police: 'andika', interlettrageEm: 0.06 };
const BRAS_B: ConfigurationBras = { police: 'opendyslexic', interlettrageEm: 0.12 };

function essai(id = 'ess-001'): EssaiTypographie {
  return {
    id,
    profil: 'prf-test',
    competence: 'comp.consigne.simple',
    bras: [BRAS_A, BRAS_B],
    ouvertLe: INSTANT_DE_REFERENCE,
    clotureLe: null,
  };
}

function resultat(
  configuration: ConfigurationBras,
  nbTentatives: number,
  latenceMedianeMs: number,
  tauxErreur = 0.1,
): ResultatBras {
  return { configuration, nbTentatives, latenceMedianeMs, tauxErreur };
}

describe('brasDeSession — déterminisme', () => {
  it('rend deux fois le même bras pour le même essai et le même numéro de session', () => {
    const e = essai();
    for (let session = 0; session < 20; session += 1) {
      expect(brasDeSession(e, session)).toEqual(brasDeSession(e, session));
    }
  });

  it('alterne à chaque session', () => {
    const e = essai();
    for (let session = 0; session < 20; session += 1) {
      expect(brasDeSession(e, session)).not.toEqual(brasDeSession(e, session + 1));
    }
  });

  it('rend toujours l’un des deux bras déclarés, jamais un troisième', () => {
    const e = essai();
    fc.assert(
      fc.property(fc.integer(), (session) => {
        const choisi = brasDeSession(e, session);
        return choisi === e.bras[0] || choisi === e.bras[1];
      }),
      { numRuns: 500 },
    );
  });

  it('ne lève pas sur un numéro de session négatif, non entier ou non fini', () => {
    const e = essai();
    expect(() => brasDeSession(e, -3)).not.toThrow();
    expect(() => brasDeSession(e, 2.7)).not.toThrow();
    expect(() => brasDeSession(e, Number.NaN)).not.toThrow();
    expect(brasDeSession(e, Number.NaN)).toEqual(brasDeSession(e, 0));
  });

  it('deux essais distincts ne servent pas forcément le même bras à la même session', () => {
    // Sans décalage par essai, deux comparaisons ouvertes en parallèle seraient corrélées :
    // l'une renseignerait sur l'autre, et aucune des deux ne mesurerait plus rien seule.
    const identifiants = Array.from({ length: 40 }, (_, rang) => `ess-${String(rang).padStart(3, '0')}`);
    const premiers = identifiants.map((id) => brasDeSession(essai(id), 0));
    const versA = premiers.filter((bras) => bras === BRAS_A).length;
    expect(versA).toBeGreaterThan(0);
    expect(versA).toBeLessThan(identifiants.length);
  });
});

describe('brasDeSession — équilibre des deux bras', () => {
  it('sert les deux bras à une unité près, sur toute longueur de série', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12 }),
        fc.integer({ min: 1, max: 400 }),
        (identifiant, nbSessions) => {
          const e = essai(identifiant);
          let versA = 0;
          for (let session = 0; session < nbSessions; session += 1) {
            if (brasDeSession(e, session) === e.bras[0]) {
              versA += 1;
            }
          }
          const versB = nbSessions - versA;
          return Math.abs(versA - versB) <= 1;
        },
      ),
      { numRuns: 300 },
    );
  });

  it('sert exactement 50 / 50 sur 200 sessions — deux bras comparables', () => {
    const e = essai();
    let versA = 0;
    for (let session = 0; session < 200; session += 1) {
      if (brasDeSession(e, session) === e.bras[0]) {
        versA += 1;
      }
    }
    expect(versA).toBe(100);
  });
});

describe('comparer — ne conclut pas trop tôt', () => {
  it('rend `brasFavorable: null` tant qu’un bras n’a pas assez de mesures', () => {
    const e = essai();
    const sousLeSeuil = comparer(e, [
      resultat(BRAS_A, TENTATIVES_MIN_PAR_BRAS - 1, 900),
      resultat(BRAS_B, TENTATIVES_MIN_PAR_BRAS + 50, 4000),
    ]);
    expect(sousLeSeuil.brasFavorable).toBeNull();
  });

  it('rend `null` sur les deux bras vides — le cas du premier jour', () => {
    const e = essai();
    expect(comparer(e, [resultat(BRAS_A, 0, 0), resultat(BRAS_B, 0, 0)]).brasFavorable).toBeNull();
  });

  it('nomme le bras à la latence médiane la plus basse — l’indicateur de D18', () => {
    const e = essai();
    const comparaison = comparer(e, [
      resultat(BRAS_A, TENTATIVES_MIN_PAR_BRAS, 1800, 0.3),
      resultat(BRAS_B, TENTATIVES_MIN_PAR_BRAS, 1200, 0.4),
    ]);
    // La latence prime : le bras B gagne malgré un taux d'erreur plus élevé.
    expect(comparaison.brasFavorable).toEqual(BRAS_B);
  });

  it('ne départage par le taux d’erreur qu’à latence strictement égale', () => {
    const e = essai();
    const comparaison = comparer(e, [
      resultat(BRAS_A, TENTATIVES_MIN_PAR_BRAS, 1500, 0.1),
      resultat(BRAS_B, TENTATIVES_MIN_PAR_BRAS, 1500, 0.4),
    ]);
    expect(comparaison.brasFavorable).toEqual(BRAS_A);
  });

  it('rend `null` à égalité parfaite, au lieu de désigner le premier bras', () => {
    const e = essai();
    const comparaison = comparer(e, [
      resultat(BRAS_A, TENTATIVES_MIN_PAR_BRAS, 1500, 0.2),
      resultat(BRAS_B, TENTATIVES_MIN_PAR_BRAS, 1500, 0.2),
    ]);
    expect(comparaison.brasFavorable).toBeNull();
  });

  it('reporte l’essai et les deux résultats sans les altérer', () => {
    const e = essai();
    const resultats: readonly [ResultatBras, ResultatBras] = [
      resultat(BRAS_A, 30, 1400),
      resultat(BRAS_B, 30, 1600),
    ];
    const comparaison = comparer(e, resultats);
    expect(comparaison.essai).toBe(e);
    expect(comparaison.resultats).toBe(resultats);
  });

  it('ne nomme JAMAIS un favori sous le seuil, quelles que soient les mesures', () => {
    const e = essai();
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: TENTATIVES_MIN_PAR_BRAS - 1 }),
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 5000 }),
        (petitCompte, latenceA, latenceB) => {
          const comparaison = comparer(e, [
            resultat(BRAS_A, petitCompte, latenceA),
            resultat(BRAS_B, 10_000, latenceB),
          ]);
          return comparaison.brasFavorable === null;
        },
      ),
      { numRuns: 300 },
    );
  });
});
