/**
 * Les agrégations pures du dashboard parent — contrat des features v2 § 4.6, lot L2-H.
 *
 * Ce fichier garde trois décisions, et une seule d'entre elles est un calcul :
 *
 * 1. **D18** — la latence de reconnaissance est l'indicateur principal, et elle se lit en
 *    **médiane et quartiles**, jamais en moyenne. Une médiane interpolée inventerait une
 *    valeur qu'aucune session n'a produite : on vérifie donc que les trois quartiles rendus
 *    sont des mesures RÉELLEMENT observées.
 * 2. **D23** — aucune ligne du top 10 n'agrège deux axes, et une confusion sans axe est
 *    ÉCARTÉE, jamais rangée avec les autres. C'est le contrat de sortie du lot : la fonction
 *    rend le nombre d'écartées pour que le silence ne passe pas pour un zéro.
 * 3. **v2 § 14** — la carte de couverture croise le colorié et la maîtrise réelle, pour
 *    repérer une région coloriée mais mal acquise.
 *
 * Les données sont fabriquées ici : ce sont des agrégations pures, sans contenu de jeu.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  DUREE_VERROU_MS,
  ECHECS_AVANT_VERROU,
  agregerConfusions,
  agregerLatences,
  croiserCouverture,
  mediane,
  quartiles,
  tendance
} from '@partage/parent/indicateurs';

import type { ConfusionObservee } from '@partage/pedagogie/types';

// ─────────────────────────────────────────────────────────────────── médiane et quartiles

describe('mediane', () => {
  it('rend la valeur du milieu sur un nombre impair de mesures', () => {
    expect(mediane([300, 100, 200])).toBe(200);
  });

  it('rend une valeur RÉELLEMENT observée sur un nombre pair — jamais une interpolation', () => {
    // La moyenne des deux valeurs centrales vaudrait 250 : personne n'a jamais mis 250 ms.
    expect(mediane([100, 200, 300, 400])).toBe(200);
  });

  it('ne dépend pas de l’ordre d’arrivée des mesures', () => {
    expect(mediane([9, 1, 7, 3, 5])).toBe(mediane([5, 3, 7, 1, 9]));
  });

  it('rend 0 sur une série vide plutôt qu’un NaN qui contaminerait la courbe', () => {
    expect(mediane([])).toBe(0);
  });

  it('propriété : la médiane est toujours l’une des mesures fournies', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 5000 }), { minLength: 1 }), (valeurs) => {
        expect(valeurs).toContain(mediane(valeurs));
      })
    );
  });
});

describe('quartiles', () => {
  it('rend q1 ≤ médiane ≤ q3, et la médiane est celle de `mediane`', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 5000 }), { minLength: 1 }), (valeurs) => {
        const [q1, med, q3] = quartiles(valeurs);
        expect(q1).toBeLessThanOrEqual(med);
        expect(med).toBeLessThanOrEqual(q3);
        expect(med).toBe(mediane(valeurs));
      })
    );
  });

  it('rend trois valeurs observées, jamais interpolées', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 5000 }), { minLength: 1 }), (valeurs) => {
        for (const q of quartiles(valeurs)) {
          expect(valeurs).toContain(q);
        }
      })
    );
  });

  // Méthode du rang le plus proche : index = ceil(p × n), en base 1. Sur 1..8 cela donne les
  // 2ᵉ, 4ᵉ et 6ᵉ mesures. Les méthodes interpolées rendraient 2,5 / 4,5 / 6,5 — trois valeurs
  // que personne n'a mesurées, et c'est précisément ce que D18 interdit de montrer au parent.
  it('sur 1..8, rend [2, 4, 6] par rang le plus proche', () => {
    expect(quartiles([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([2, 4, 6]);
  });
});

// ────────────────────────────────────────────────────────────────────── courbe de latence

describe('agregerLatences', () => {
  const mesures = [
    { jour: '2026-09-01', competence: 'gph.b', ms: 900 },
    { jour: '2026-09-01', competence: 'gph.b', ms: 1100 },
    { jour: '2026-09-01', competence: 'gph.b', ms: 1500 },
    { jour: '2026-09-01', competence: 'gph.d', ms: 700 },
    { jour: '2026-09-02', competence: 'gph.b', ms: 800 }
  ];

  it('rend un point par couple (jour, compétence)', () => {
    const points = agregerLatences(mesures);
    expect(points).toHaveLength(3);
    expect(points.map((p) => `${p.jour}/${p.competence}`)).toEqual([
      '2026-09-01/gph.b',
      '2026-09-01/gph.d',
      '2026-09-02/gph.b'
    ]);
  });

  it('porte le nombre de mesures, pour qu’un point à une seule mesure se voie', () => {
    const points = agregerLatences(mesures);
    expect(points[0]?.nbMesures).toBe(3);
    expect(points[1]?.nbMesures).toBe(1);
  });

  it('rend médiane et quartiles, jamais une moyenne', () => {
    const points = agregerLatences(mesures);
    // Moyenne de 900/1100/1500 = 1166,7 — ce n'est pas ce qu'on veut lire.
    expect(points[0]?.medianeMs).toBe(1100);
    expect(points[0]?.q1Ms).toBe(900);
    expect(points[0]?.q3Ms).toBe(1500);
  });

  it('rend une liste vide sans mesure, et non un point à zéro', () => {
    expect(agregerLatences([])).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────── top 10 des confusions (D23)

function observation(
  attendu: string,
  rendu: string,
  axe: ConfusionObservee['axe'],
  jour: string,
  latenceMs = 1000,
  competence = 'gph.b'
): ConfusionObservee & { readonly jour: string; readonly latenceMs: number } {
  return { attendu, rendu, axe, competence, jour, latenceMs };
}

describe('agregerConfusions — D23', () => {
  it('agrège par (attendu, rendu, axe) et compte les occurrences', () => {
    const { top } = agregerConfusions([
      observation('b', 'd', 'gauche-droite', '2026-09-01'),
      observation('b', 'd', 'gauche-droite', '2026-09-02'),
      observation('b', 'p', 'haut-bas', '2026-09-01')
    ]);
    expect(top).toHaveLength(2);
    expect(top[0]).toMatchObject({ attendu: 'b', rendu: 'd', axe: 'gauche-droite', nbOccurrences: 2 });
    expect(top[1]).toMatchObject({ attendu: 'b', rendu: 'p', axe: 'haut-bas', nbOccurrences: 1 });
  });

  it('AUCUNE ligne n’agrège deux axes — b/d et b/p restent séparés', () => {
    const { top } = agregerConfusions([
      observation('b', 'd', 'gauche-droite', '2026-09-01'),
      observation('b', 'p', 'haut-bas', '2026-09-01')
    ]);
    const axes = new Set(top.map((ligne) => ligne.axe));
    expect(axes.size).toBe(2);
    for (const ligne of top) {
      expect(ligne.axe === 'gauche-droite' || ligne.axe === 'haut-bas').toBe(true);
    }
  });

  it('ÉCARTE les confusions sans axe et les compte à part — le silence ne passe pas pour zéro', () => {
    const { top, ecartees } = agregerConfusions([
      observation('b', 'd', 'gauche-droite', '2026-09-01'),
      observation('m', 'n', null, '2026-09-01'),
      observation('ou', 'on', null, '2026-09-01')
    ]);
    expect(top).toHaveLength(1);
    expect(ecartees).toBe(2);
  });

  it('CONTRAT DE SORTIE : aucune ligne du top n’a d’axe nul, quelles que soient les entrées', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            attendu: fc.constantFrom('b', 'd', 'p', 'q', 'm'),
            rendu: fc.constantFrom('b', 'd', 'p', 'q', 'n'),
            axe: fc.constantFrom('gauche-droite' as const, 'haut-bas' as const, null),
            jour: fc.constantFrom('2026-09-01', '2026-09-02', '2026-09-03'),
            latenceMs: fc.integer({ min: 100, max: 6000 }),
            competence: fc.constantFrom('gph.b', 'gph.p')
          }),
          { maxLength: 60 }
        ),
        (observations) => {
          const { top, ecartees } = agregerConfusions(observations);
          expect(top.filter((ligne) => ligne.axe === null)).toEqual([]);
          expect(ecartees).toBe(observations.filter((o) => o.axe === null).length);
        }
      )
    );
  });

  it('classe par nombre d’occurrences décroissant et plafonne à la limite demandée', () => {
    const observations = [
      ...Array.from({ length: 5 }, () => observation('b', 'd', 'gauche-droite', '2026-09-01')),
      ...Array.from({ length: 3 }, () => observation('p', 'q', 'gauche-droite', '2026-09-01')),
      ...Array.from({ length: 1 }, () => observation('b', 'p', 'haut-bas', '2026-09-01'))
    ];
    const { top } = agregerConfusions(observations, 2);
    expect(top.map((l) => l.nbOccurrences)).toEqual([5, 3]);
  });

  it('porte la latence médiane de la confusion et ses compétences, sans doublon', () => {
    const { top } = agregerConfusions([
      observation('b', 'd', 'gauche-droite', '2026-09-01', 800, 'gph.b'),
      observation('b', 'd', 'gauche-droite', '2026-09-01', 1200, 'gph.d'),
      observation('b', 'd', 'gauche-droite', '2026-09-02', 4000, 'gph.b')
    ]);
    expect(top[0]?.latenceMedianeMs).toBe(1200);
    expect(top[0]?.competences).toEqual(['gph.b', 'gph.d']);
  });

  it('rend une tendance NÉGATIVE quand la confusion recule — c’est ce qu’on veut voir', () => {
    const observations = [
      ...Array.from({ length: 6 }, () => observation('b', 'd', 'gauche-droite', '2026-09-01')),
      ...Array.from({ length: 3 }, () => observation('b', 'd', 'gauche-droite', '2026-09-02')),
      ...Array.from({ length: 1 }, () => observation('b', 'd', 'gauche-droite', '2026-09-03'))
    ];
    const { top } = agregerConfusions(observations);
    expect(top[0]?.tendance14j).toBeLessThan(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────── tendance

describe('tendance', () => {
  it('rend 0 sous trois points : deux points font toujours une droite, jamais une tendance', () => {
    expect(tendance([])).toBe(0);
    expect(tendance([{ jour: '2026-09-01', valeur: 5 }])).toBe(0);
    expect(
      tendance([
        { jour: '2026-09-01', valeur: 5 },
        { jour: '2026-09-02', valeur: 1 }
      ])
    ).toBe(0);
  });

  it('rend une pente par JOUR CALENDAIRE, pas par rang — un trou de 10 jours compte', () => {
    const serree = tendance([
      { jour: '2026-09-01', valeur: 0 },
      { jour: '2026-09-02', valeur: 1 },
      { jour: '2026-09-03', valeur: 2 }
    ]);
    const espacee = tendance([
      { jour: '2026-09-01', valeur: 0 },
      { jour: '2026-09-11', valeur: 1 },
      { jour: '2026-09-21', valeur: 2 }
    ]);
    expect(serree).toBeCloseTo(1, 10);
    expect(espacee).toBeCloseTo(0.1, 10);
  });

  it('rend 0 sur une série plate', () => {
    expect(
      tendance([
        { jour: '2026-09-01', valeur: 3 },
        { jour: '2026-09-02', valeur: 3 },
        { jour: '2026-09-03', valeur: 3 }
      ])
    ).toBeCloseTo(0, 10);
  });

  it('franchit un changement de mois et une année bissextile sans se tromper de distance', () => {
    expect(
      tendance([
        { jour: '2028-02-28', valeur: 0 },
        { jour: '2028-02-29', valeur: 1 },
        { jour: '2028-03-01', valeur: 2 }
      ])
    ).toBeCloseTo(1, 10);
  });
});

// ────────────────────────────────────────────────────────────────── carte de couverture

describe('croiserCouverture', () => {
  it('lève le drapeau quand une région est bien coloriée et mal acquise', () => {
    const couverture = croiserCouverture(
      [{ region: 'clairiere', pourcentage: 0.9 }],
      [
        { region: 'clairiere', p: 0.3, acquise: false },
        { region: 'clairiere', p: 0.5, acquise: false }
      ]
    );
    expect(couverture).toHaveLength(1);
    expect(couverture[0]).toMatchObject({
      region: 'clairiere',
      pourcentageColorie: 0.9,
      maitriseMoyenne: 0.4,
      competencesAcquises: 0,
      competencesTotal: 2,
      colorieMaisFragile: true
    });
  });

  it('ne lève aucun drapeau quand la maîtrise suit le coloriage', () => {
    const couverture = croiserCouverture(
      [{ region: 'clairiere', pourcentage: 0.8 }],
      [
        { region: 'clairiere', p: 0.9, acquise: true },
        { region: 'clairiere', p: 0.7, acquise: true }
      ]
    );
    expect(couverture[0]?.colorieMaisFragile).toBe(false);
    expect(couverture[0]?.competencesAcquises).toBe(2);
  });

  it('respecte l’écart d’alerte qu’on lui passe', () => {
    const entree = [{ region: 'clairiere' as const, pourcentage: 0.6 }];
    const maitrise = [{ region: 'clairiere', p: 0.4, acquise: false }];
    expect(croiserCouverture(entree, maitrise, 0.1)[0]?.colorieMaisFragile).toBe(true);
    expect(croiserCouverture(entree, maitrise, 0.5)[0]?.colorieMaisFragile).toBe(false);
  });

  it('rend une région sans compétence mesurée sans jamais la déclarer fragile', () => {
    const couverture = croiserCouverture([{ region: 'volcan', pourcentage: 0 }], []);
    expect(couverture[0]).toMatchObject({
      region: 'volcan',
      maitriseMoyenne: 0,
      competencesTotal: 0,
      colorieMaisFragile: false
    });
  });

  it('rend les régions dans l’ordre de la progression phonologique (v2 § 3.3)', () => {
    const couverture = croiserCouverture(
      [
        { region: 'volcan', pourcentage: 0.1 },
        { region: 'clairiere', pourcentage: 0.2 },
        { region: 'galeries', pourcentage: 0.3 }
      ],
      []
    );
    expect(couverture.map((c) => c.region)).toEqual(['clairiere', 'galeries', 'volcan']);
  });

  it('ignore une région inconnue plutôt que de la faire entrer dans la carte', () => {
    const couverture = croiserCouverture([{ region: 'atlantide', pourcentage: 1 }], []);
    expect(couverture).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────── constantes du verrou

describe('constantes du verrou parent', () => {
  it('exige exactement 5 échecs avant verrouillage (v2 § 11)', () => {
    expect(ECHECS_AVANT_VERROU).toBe(5);
  });

  it('verrouille 15 minutes — PLACEHOLDER Q6, valeur exportée et non enfouie', () => {
    expect(DUREE_VERROU_MS).toBe(15 * 60 * 1000);
  });
});

