/**
 * L'étagère des formes — D44, lot N6, contrat de finition v3 § 4.6 et § 5.11.
 *
 * **LA PROPRIÉTÉ QUI FAIT TOUT, et que ce fichier mesure sur chaque cas :**
 * `cases.length === nbTotal`, TOUJOURS. Une case non gagnée n'est pas absente de la liste,
 * elle y est avec `obtenue: false`. Un composant ne peut donc pas « oublier » de rendre le
 * vide — il n'a pas de liste où le vide serait absent.
 *
 * Le catalogue vient du DISQUE (`contenu/monde/gobi-stades.json`), jamais d'une maquette :
 * une étagère qui passerait sur des données de test et pas sur les vraies ne prouverait rien.
 * C'est la même discipline que `campement-audit.test.ts`.
 *
 * Ce que ce fichier refuse de laisser passer, et qui n'est PAS évident :
 *   • une forme gagnée que le catalogue ne déclare pas serait silencieusement effacée de
 *     l'étagère — « un acquis n'est jamais repris » (R14) l'interdit ;
 *   • un rang qui bouge quand une forme arrive ferait perdre le repérage visuel qui est tout
 *     l'intérêt de l'album (D44, et le commentaire de `008_etagere.sql`).
 */
import { describe, expect, it } from 'vitest';

import { construireEtagere } from '@partage/monde/etagere.js';
import type { CatalogueFormes } from '@partage/monde/etagere.js';
import { formesDuDocument } from '@partage/monde/gobi.js';
import type { FormeGobi } from '@partage/monde/types.js';

import { INSTANT_DE_REFERENCE, lireJson } from '../configuration/preparation.js';

const DOCUMENT: unknown = lireJson('contenu/monde/gobi-stades.json');

/** Le catalogue RÉEL. `formesDuDocument` est la seule lecture de ce fichier (aucune copie, C5). */
const CATALOGUE: CatalogueFormes = { formes: formesDuDocument(DOCUMENT) };

/** Fabrique une forme gagnée à partir d'un graphème du catalogue. */
function gagnee(grapheme: string, quand: string = INSTANT_DE_REFERENCE): FormeGobi {
  const declaree = CATALOGUE.formes.find((forme) => forme.grapheme === grapheme);
  return {
    grapheme,
    libelle: declaree?.libelle ?? `Gobi-${grapheme.toUpperCase()}`,
    cristal: declaree?.cristal ?? 'assets/gobi/cristal-base.svg',
    obtenueLe: quand
  };
}

describe('le catalogue réel de `contenu/monde/gobi-stades.json`', () => {
  it('déclare au moins une forme, sans quoi l’étagère ne mesurerait rien', () => {
    console.log(`[N6] catalogue de formes déclarées : ${String(CATALOGUE.formes.length)}`);
    expect(CATALOGUE.formes.length).toBeGreaterThan(0);
  });

  it('ne déclare aucun graphème en double — deux cases pour la même chose n’ont pas de sens', () => {
    const graphemes = CATALOGUE.formes.map((forme) => forme.grapheme);
    expect(new Set(graphemes).size).toBe(graphemes.length);
  });

  it('donne à chaque forme un cristal, jamais un corps complet (D20)', () => {
    const sansCristal = CATALOGUE.formes.filter((forme) => forme.cristal === '');
    expect(sansCristal.map((forme) => forme.grapheme)).toEqual([]);
  });
});

describe('construireEtagere — `cases.length === nbTotal`, toujours', () => {
  it('rend TOUTES les cases quand aucune forme n’est gagnée', () => {
    const etagere = construireEtagere(CATALOGUE, []);
    expect(etagere.cases).toHaveLength(CATALOGUE.formes.length);
    expect(etagere.nbTotal).toBe(CATALOGUE.formes.length);
    expect(etagere.cases.length).toBe(etagere.nbTotal);
    expect(etagere.nbObtenues).toBe(0);
  });

  it('n’en cache aucune quand quelques-unes sont gagnées', () => {
    const etagere = construireEtagere(CATALOGUE, [gagnee('a'), gagnee('i'), gagnee('ou')]);
    expect(etagere.cases.length).toBe(etagere.nbTotal);
    expect(etagere.nbTotal).toBe(CATALOGUE.formes.length);
    expect(etagere.nbObtenues).toBe(3);
  });

  it('n’en cache aucune quand TOUTES sont gagnées', () => {
    const toutes = CATALOGUE.formes.map((forme) => gagnee(forme.grapheme));
    const etagere = construireEtagere(CATALOGUE, toutes);
    expect(etagere.cases.length).toBe(etagere.nbTotal);
    expect(etagere.nbObtenues).toBe(etagere.nbTotal);
    expect(etagere.cases.filter((une) => !une.obtenue)).toEqual([]);
  });

  it('tient l’égalité `cases.length === nbTotal` sur les 26 sous-collections croissantes', () => {
    // Une par une, du vide au complet. Aucune longueur n'est jamais différente de `nbTotal`.
    const ecarts: string[] = [];
    for (let combien = 0; combien <= CATALOGUE.formes.length; combien += 1) {
      const formes = CATALOGUE.formes.slice(0, combien).map((forme) => gagnee(forme.grapheme));
      const etagere = construireEtagere(CATALOGUE, formes);
      if (etagere.cases.length !== etagere.nbTotal || etagere.nbObtenues !== combien) {
        ecarts.push(
          `${String(combien)} gagnée(s) → cases=${String(etagere.cases.length)} ` +
            `nbTotal=${String(etagere.nbTotal)} nbObtenues=${String(etagere.nbObtenues)}`
        );
      }
    }
    console.log(
      `[N6] étagère : ${String(CATALOGUE.formes.length + 1)} sous-collections vérifiées, ` +
        `${String(ecarts.length)} écart(s)`
    );
    expect(ecarts).toEqual([]);
  });

  it('compte `nbObtenues` sur les cases elles-mêmes, jamais sur la liste d’entrée', () => {
    // Deux fois la même forme : une seule case obtenue, pas deux.
    const etagere = construireEtagere(CATALOGUE, [gagnee('a'), gagnee('a')]);
    expect(etagere.nbObtenues).toBe(1);
    expect(etagere.cases.filter((une) => une.obtenue)).toHaveLength(1);
  });
});

describe('le rang — une case ne se déplace jamais (D44)', () => {
  it('numérote de 1 à `nbTotal`, sans trou ni doublon', () => {
    const etagere = construireEtagere(CATALOGUE, []);
    expect(etagere.cases.map((une) => une.rang)).toEqual(
      Array.from({ length: etagere.nbTotal }, (_, index) => index + 1)
    );
  });

  it('ne déplace AUCUNE case quand une forme arrive', () => {
    const avant = construireEtagere(CATALOGUE, [gagnee('a')]);
    const apres = construireEtagere(CATALOGUE, [gagnee('a'), gagnee('ch')]);
    const rangs = (cases: readonly { rang: number; grapheme: string }[]): string =>
      cases.map((une) => `${String(une.rang)}:${une.grapheme}`).join(' ');
    expect(rangs(apres.cases)).toBe(rangs(avant.cases));
  });

  it('suit l’ordre du catalogue, et non l’ordre d’obtention', () => {
    // La dernière forme du catalogue est gagnée EN PREMIER : elle reste en dernière case.
    const derniere = CATALOGUE.formes[CATALOGUE.formes.length - 1]!;
    const etagere = construireEtagere(CATALOGUE, [gagnee(derniere.grapheme)]);
    expect(etagere.cases[etagere.nbTotal - 1]?.grapheme).toBe(derniere.grapheme);
    expect(etagere.cases[etagere.nbTotal - 1]?.obtenue).toBe(true);
    expect(etagere.cases[0]?.obtenue).toBe(false);
  });
});

describe('ce que l’étagère refuse de perdre — R14, « un acquis n’est jamais repris »', () => {
  it('garde une forme gagnée que le catalogue ne déclare PAS, au lieu de l’effacer', () => {
    const inconnue: FormeGobi = {
      grapheme: 'euil',
      libelle: 'Gobi-EUIL',
      cristal: 'assets/gobi/cristal-base.svg',
      obtenueLe: INSTANT_DE_REFERENCE
    };
    const etagere = construireEtagere(CATALOGUE, [inconnue]);
    expect(etagere.nbTotal).toBe(CATALOGUE.formes.length + 1);
    expect(etagere.cases.length).toBe(etagere.nbTotal);
    const posee = etagere.cases.find((une) => une.grapheme === 'euil');
    expect(posee?.obtenue).toBe(true);
    expect(posee?.rang).toBe(etagere.nbTotal);
  });

  it('range les formes hors catalogue de façon déterministe, jamais au hasard', () => {
    const orphelines: readonly FormeGobi[] = [
      { grapheme: 'zz', libelle: 'Z', cristal: 'c.svg', obtenueLe: '2026-09-02T08:00:00.000Z' },
      { grapheme: 'aa', libelle: 'A', cristal: 'c.svg', obtenueLe: '2026-09-01T08:00:00.000Z' }
    ];
    const premier = construireEtagere(CATALOGUE, orphelines);
    const second = construireEtagere(CATALOGUE, [...orphelines].reverse());
    expect(premier.cases.map((une) => une.grapheme)).toEqual(
      second.cases.map((une) => une.grapheme)
    );
    // La plus ancienne d'abord : l'album se remplit dans l'ordre du temps.
    expect(premier.cases[premier.nbTotal - 2]?.grapheme).toBe('aa');
    expect(premier.cases[premier.nbTotal - 1]?.grapheme).toBe('zz');
  });

  it('porte la date d’obtention sur les cases gagnées, et `null` sur les autres', () => {
    const etagere = construireEtagere(CATALOGUE, [gagnee('a', '2026-09-03T10:00:00.000Z')]);
    const pleine = etagere.cases.find((une) => une.grapheme === 'a');
    expect(pleine?.obtenueLe).toBe('2026-09-03T10:00:00.000Z');
    for (const vide of etagere.cases.filter((une) => !une.obtenue)) {
      expect(vide.obtenueLe).toBeNull();
    }
  });
});

describe('le cas dégénéré — un catalogue vide ne fabrique jamais de fausse étagère', () => {
  it('rend une étagère vide plutôt que de lever, et l’égalité tient encore', () => {
    const etagere = construireEtagere({ formes: [] }, []);
    expect(etagere.cases).toEqual([]);
    expect(etagere.nbTotal).toBe(0);
    expect(etagere.cases.length).toBe(etagere.nbTotal);
  });

  it('montre quand même les formes gagnées quand le catalogue est vide', () => {
    const etagere = construireEtagere({ formes: [] }, [gagnee('a')]);
    expect(etagere.nbTotal).toBe(1);
    expect(etagere.cases[0]?.obtenue).toBe(true);
  });

  it('ne fabrique pas deux cases pour un catalogue qui répète un graphème', () => {
    const double: CatalogueFormes = {
      formes: [
        { grapheme: 'a', libelle: 'Gobi-A', cristal: 'c.svg' },
        { grapheme: 'a', libelle: 'Gobi-A bis', cristal: 'c2.svg' }
      ]
    };
    const etagere = construireEtagere(double, []);
    expect(etagere.nbTotal).toBe(1);
    expect(etagere.cases[0]?.libelle).toBe('Gobi-A');
  });
});
