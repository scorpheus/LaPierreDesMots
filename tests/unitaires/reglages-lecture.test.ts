/**
 * Réglages de lecture — lot L2-B, annexe T § T1.
 *
 * La règle que ces cas défendent tient en une ligne, et elle vient de R14 autant que de D19 :
 * **une valeur hors bornes est RAMENÉE, jamais rejetée.** Un enfant de 7 ans qui pousse un
 * curseur au bout ne doit pas se retrouver devant une erreur ; un enregistrement corrompu ne
 * doit pas rendre un profil injouable.
 *
 * Le second point mesuré ici est plus discret et compte autant : `variablesCss` est le SEUL
 * endroit qui nomme les variables CSS de lecture. Si un nom changeait sans que la feuille de
 * style suive, la zone de lecture retomberait silencieusement sur des valeurs par défaut et
 * personne ne le verrait — c'est exactement le mode d'échec « détecteur qui déclare un poids
 * qu'il n'applique jamais ».
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  BORNES_REGLAGES,
  POLICES,
  REGLAGES_PAR_DEFAUT,
  normaliserReglages,
  variablesCss,
} from '@pierre/partage/lecture';
import type { BorneReglage, ReglagesLecture } from '@pierre/partage/lecture';

const CHAMPS_NUMERIQUES = ['corpsPx', 'interlettrageEm', 'espacementMotsEm', 'interligne'] as const;
type ChampNumerique = (typeof CHAMPS_NUMERIQUES)[number];

function borne(champ: ChampNumerique): BorneReglage {
  return BORNES_REGLAGES[champ];
}

describe('les bornes elles-mêmes', () => {
  it('encadrent le corps entre 16 et 40 px — v2 § 9.3, cité à la lettre', () => {
    expect(BORNES_REGLAGES.corpsPx.min).toBe(16);
    expect(BORNES_REGLAGES.corpsPx.max).toBe(40);
  });

  for (const champ of CHAMPS_NUMERIQUES) {
    it(`« ${champ} » a un défaut dans ses propres bornes et un pas exploitable`, () => {
      const b = borne(champ);
      expect(b.min).toBeLessThan(b.max);
      expect(b.defaut).toBeGreaterThanOrEqual(b.min);
      expect(b.defaut).toBeLessThanOrEqual(b.max);
      expect(b.pas).toBeGreaterThan(0);
      expect(b.pas).toBeLessThanOrEqual(b.max - b.min);
    });
  }

  it('part sur Andika, la police par défaut de toute zone de lecture (v2 § 9.3)', () => {
    expect(REGLAGES_PAR_DEFAUT.police).toBe('andika');
  });

  it('propose exactement les cinq polices de D19, Andika en tête', () => {
    expect([...POLICES]).toEqual([
      'andika',
      'opendyslexic',
      'luciole',
      'belle-allure',
      'verdana',
    ]);
  });

  it('part sur un interlettrage strictement au-dessus de zéro — Q1, PLACEHOLDER', () => {
    // D19 : l'espacement est « probablement le vrai levier ». Partir à 0 reviendrait à ne pas
    // le tester du tout. Partir au maximum contredirait la nuance Frontiers 2020.
    expect(REGLAGES_PAR_DEFAUT.interlettrageEm).toBeGreaterThan(0);
    expect(REGLAGES_PAR_DEFAUT.interlettrageEm).toBeLessThan(
      BORNES_REGLAGES.interlettrageEm.max,
    );
  });
});

describe('normaliserReglages — ramène, ne rejette jamais', () => {
  it('rend les défauts sur un objet vide', () => {
    expect(normaliserReglages({})).toEqual(REGLAGES_PAR_DEFAUT);
  });

  for (const champ of CHAMPS_NUMERIQUES) {
    it(`ramène « ${champ} » au minimum quand la valeur est trop basse`, () => {
      const resultat = normaliserReglages({ [champ]: borne(champ).min - 1000 });
      expect(resultat[champ]).toBe(borne(champ).min);
    });

    it(`ramène « ${champ} » au maximum quand la valeur est trop haute`, () => {
      const resultat = normaliserReglages({ [champ]: borne(champ).max + 1000 });
      expect(resultat[champ]).toBe(borne(champ).max);
    });

    it(`rend le défaut de « ${champ} » sur NaN, Infinity et une valeur non numérique`, () => {
      // `Infinity` rend le DÉFAUT et non le maximum : ce n'est pas « une valeur trop grande »,
      // c'est l'absence de valeur mesurable. La ramener au maximum imposerait à l'enfant le
      // réglage le plus extrême sur une donnée corrompue.
      expect(normaliserReglages({ [champ]: Number.NaN })[champ]).toBe(borne(champ).defaut);
      expect(normaliserReglages({ [champ]: Number.POSITIVE_INFINITY })[champ]).toBe(
        borne(champ).defaut,
      );
      expect(
        normaliserReglages({ [champ]: 'grand' } as unknown as Partial<ReglagesLecture>)[champ],
      ).toBe(borne(champ).defaut);
    });
  }

  it('rend Andika sur une police inconnue, au lieu de lever', () => {
    const resultat = normaliserReglages({
      police: 'comic-sans',
    } as unknown as Partial<ReglagesLecture>);
    expect(resultat.police).toBe('andika');
  });

  it('rend « parchemin » sur un fond inconnu', () => {
    const resultat = normaliserReglages({
      fond: 'arc-en-ciel',
    } as unknown as Partial<ReglagesLecture>);
    expect(resultat.fond).toBe('parchemin');
  });

  it('conserve une valeur déjà dans les bornes, au bit près', () => {
    const voulu: ReglagesLecture = {
      police: 'luciole',
      corpsPx: 32,
      interlettrageEm: 0.11,
      espacementMotsEm: 0.24,
      interligne: 2,
      colorationSyllabique: false,
      surlignageLigneCourante: true,
      regleDeLecture: true,
      fond: 'sombre',
    };
    expect(normaliserReglages(voulu)).toEqual(voulu);
  });

  it('ne lève JAMAIS et rend toujours des valeurs dans les bornes, quelle que soit l’entrée', () => {
    const valeurQuelconque = fc.oneof(
      fc.double({ noDefaultInfinity: false, noNaN: false }),
      fc.string(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
    );
    fc.assert(
      fc.property(
        fc.record(
          {
            police: valeurQuelconque,
            corpsPx: valeurQuelconque,
            interlettrageEm: valeurQuelconque,
            espacementMotsEm: valeurQuelconque,
            interligne: valeurQuelconque,
            colorationSyllabique: valeurQuelconque,
            surlignageLigneCourante: valeurQuelconque,
            regleDeLecture: valeurQuelconque,
            fond: valeurQuelconque,
          },
          { requiredKeys: [] },
        ),
        (bruts) => {
          const resultat = normaliserReglages(bruts as Partial<ReglagesLecture>);
          if (!POLICES.includes(resultat.police)) {
            return false;
          }
          if (resultat.fond !== 'parchemin' && resultat.fond !== 'sombre') {
            return false;
          }
          return CHAMPS_NUMERIQUES.every((champ) => {
            const valeur = resultat[champ];
            const b = borne(champ);
            return Number.isFinite(valeur) && valeur >= b.min && valeur <= b.max;
          });
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('est idempotente : normaliser deux fois ne change plus rien', () => {
    fc.assert(
      fc.property(
        fc.record(
          {
            corpsPx: fc.double({ min: -500, max: 500, noNaN: true }),
            interlettrageEm: fc.double({ min: -5, max: 5, noNaN: true }),
            espacementMotsEm: fc.double({ min: -5, max: 5, noNaN: true }),
            interligne: fc.double({ min: -5, max: 10, noNaN: true }),
          },
          { requiredKeys: [] },
        ),
        (bruts) => {
          const une = normaliserReglages(bruts);
          const deux = normaliserReglages(une);
          return JSON.stringify(une) === JSON.stringify(deux);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('variablesCss — le seul endroit qui nomme les variables de lecture', () => {
  const variables = variablesCss(REGLAGES_PAR_DEFAUT);

  it('rend les cinq mesures et les deux couleurs, et rien d’autre', () => {
    expect(Object.keys(variables).sort()).toEqual([
      '--lecture-corps',
      '--lecture-encre',
      '--lecture-espacement-mots',
      '--lecture-fond',
      '--lecture-interlettrage',
      '--lecture-interligne',
    ]);
  });

  it('porte les unités que le CSS attend', () => {
    expect(variables['--lecture-corps']).toBe('24px');
    expect(variables['--lecture-interlettrage']).toBe('0.06em');
    expect(variables['--lecture-espacement-mots']).toBe('0.08em');
    // L'interligne est un multiple, donc SANS unité : `line-height: 1.6`, jamais `1.6px`.
    expect(variables['--lecture-interligne']).toBe('1.6');
  });

  it('inverse encre et fond en mode sombre, sans jamais employer le noir pur', () => {
    const sombre = variablesCss({ ...REGLAGES_PAR_DEFAUT, fond: 'sombre' });
    expect(sombre['--lecture-fond']).toBe('var(--trait)');
    expect(sombre['--lecture-encre']).toBe('var(--parchemin)');
    expect(sombre['--lecture-fond']).not.toContain('#000');
  });

  it('n’écrit jamais de traîne de virgule flottante dans une variable CSS', () => {
    // `0.06 * 3` vaut `0.18000000000000002` en binaire : illisible dans une capture T4.
    const bavard = variablesCss({ ...REGLAGES_PAR_DEFAUT, interlettrageEm: 0.06 * 3 });
    expect(bavard['--lecture-interlettrage']).toBe('0.18em');
  });

  it('rend une valeur CSS finie pour tout réglage normalisé', () => {
    fc.assert(
      fc.property(
        fc.record({
          corpsPx: fc.double({ min: -1000, max: 1000, noNaN: true }),
          interlettrageEm: fc.double({ min: -10, max: 10, noNaN: true }),
          espacementMotsEm: fc.double({ min: -10, max: 10, noNaN: true }),
          interligne: fc.double({ min: -10, max: 10, noNaN: true }),
        }),
        (bruts) => {
          const rendus = variablesCss(normaliserReglages(bruts));
          const mesures = [
            rendus['--lecture-corps'],
            rendus['--lecture-interlettrage'],
            rendus['--lecture-espacement-mots'],
            rendus['--lecture-interligne'],
          ];
          // Ni chaîne vide, ni `NaN`, ni notation exponentielle : `1e-7px` est une valeur CSS
          // valide que personne ne saurait relire dans une capture de référence.
          return mesures.every(
            (valeur) =>
              valeur !== undefined && valeur !== '' && !valeur.includes('NaN') &&
              !/\d[eE][+-]?\d/u.test(valeur),
          );
        },
      ),
      { numRuns: 300 },
    );
  });
});
