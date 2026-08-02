/**
 * Les dix stades de Gobi — D43, lot N3, contrat de finition v3 § 4.3 et § 9.2.
 *
 * D43 remplace le placeholder à cinq stades : « Gobi évolue en 8 à 10 stades, à petits pas.
 * Chaque stade est un changement discret — un cristal de plus, une teinte qui glisse.
 * Progression très fréquente et toujours visible, au prix d'aucun moment spectaculaire. »
 *
 * CE QUE CE FICHIER GARANTIT, et que `gobi-evolution.test.ts` ne garantissait pas :
 *
 *   1. le NOMBRE de stades tient dans la fourchette de D43 — un jour où quelqu'un en retirerait
 *      trois « pour simplifier », la décision se défendrait toute seule ;
 *   2. les pas sont PETITS — aucun palier ne demande plus du quart de la collection, sinon
 *      « progression très fréquente » serait un mot et non une propriété ;
 *   3. l'irréversibilité vaut sur les DIX rangs, pas seulement sur les cinq d'origine ;
 *   4. les cinq codes de la v1 sont CONSERVÉS aux rangs 1, 3, 5, 7 et 10 (§ 4.3 : « les cinq
 *      séries deviennent des stades, pas cinq échecs »). Une renumérotation silencieuse
 *      invaliderait les états déjà écrits en base — `stade_gobi.stade_code` n'a aucune
 *      contrainte `CHECK` (§ 1.9), donc rien d'autre ne le verrait.
 *
 * Les valeurs viennent TOUTES de la donnée (`contenu/monde/gobi-stades.json`, convention C2).
 * Aucun seuil n'est recopié ici : un seuil recopié serait une seconde source de vérité.
 */
import { describe, expect, it } from 'vitest';

import { formesDuDocument, stadeApresFormes, stadesDuDocument } from '@partage/monde/gobi.js';
import type { CodeStadeGobi, EtatGobi, FormeGobi, StadeGobi } from '@partage/monde/types.js';

import { GRAINE_DE_TEST, aleaDeTest, lireJson } from '../configuration/preparation.js';

const DOCUMENT: unknown = lireJson('contenu/monde/gobi-stades.json');
const STADES: readonly StadeGobi[] = stadesDuDocument(DOCUMENT);
const FORMES = formesDuDocument(DOCUMENT);

/** Les cinq codes de la v1 et le rang auquel § 4.3 les reconduit. */
const CODES_CONSERVES: ReadonlyArray<readonly [CodeStadeGobi, number]> = [
  ['oeuf', 1],
  ['boule', 3],
  ['crete', 5],
  ['equipe', 7],
  ['gardien', 10]
];

function etat(nbFormes: number, stade: CodeStadeGobi = 'oeuf'): EtatGobi {
  const formes: FormeGobi[] = Array.from({ length: nbFormes }, (_, index) => ({
    grapheme: `g${String(index)}`,
    libelle: `graphème ${String(index)}`,
    cristal: 'assets/gobi/cristal-base.svg',
    obtenueLe: '2026-09-01T08:00:00.000Z'
  }));
  return { stade, formes, formeActive: null };
}

describe('la table des stades applique D43', () => {
  it('déclare entre 8 et 10 stades — le placeholder à 5 est clos', () => {
    console.log(`[N3] stades=${String(STADES.length)} formes=${String(FORMES.length)}`);
    expect(STADES.length).toBeGreaterThanOrEqual(8);
    expect(STADES.length).toBeLessThanOrEqual(10);
  });

  it('numérote les rangs 1..n sans trou et sans doublon', () => {
    expect(STADES.map((stade) => stade.rang))
      .toEqual(Array.from({ length: STADES.length }, (_, index) => index + 1));
    expect(new Set(STADES.map((stade) => stade.code)).size).toBe(STADES.length);
  });

  it('exige des seuils strictement croissants, à partir de zéro', () => {
    const requises = STADES.map((stade) => stade.formesRequises);
    expect(requises[0]).toBe(0);
    for (let index = 1; index < requises.length; index += 1) {
      expect(requises[index]).toBeGreaterThan(requises[index - 1]!);
    }
  });

  it('avance À PETITS PAS : aucun palier ne demande plus du quart de la collection', () => {
    const plafond = Math.ceil(FORMES.length / 4);
    const pas = STADES.slice(1).map(
      (stade, index) => stade.formesRequises - STADES[index]!.formesRequises
    );
    console.log(`[N3] pas=${pas.join(',')} pasMax=${String(Math.max(...pas))} plafond=${String(plafond)}`);
    expect(Math.max(...pas)).toBeLessThanOrEqual(plafond);
  });

  it('atteint le dernier stade quand la collection est complète, jamais avant ni après', () => {
    expect(STADES[STADES.length - 1]!.formesRequises).toBe(FORMES.length);
  });

  it('conserve les cinq codes de la v1 aux rangs 1, 3, 5, 7 et 10 (§ 4.3)', () => {
    for (const [code, rang] of CODES_CONSERVES) {
      const stade = STADES.find((candidat) => candidat.code === code);
      expect(stade, `le code « ${code} » a disparu de la table`).toBeDefined();
      expect(stade!.rang, `le code « ${code} » a changé de rang`).toBe(rang);
    }
  });

  it('donne à chaque stade un libellé, et aucun libellé n’est un code brut', () => {
    for (const stade of STADES) {
      expect(stade.libelle.length).toBeGreaterThan(2);
      expect(stade.libelle).not.toBe(stade.code);
    }
  });
});

describe('l’irréversibilité vaut sur les DIX rangs (D28, D43, R14)', () => {
  it('monte exactement au stade dont le seuil est atteint, pour les 10', () => {
    for (const stade of STADES) {
      expect(stadeApresFormes(etat(stade.formesRequises), STADES)).toBe(stade.code);
    }
  });

  it('ne redescend depuis AUCUN des 10 stades, même collection vidée', () => {
    for (const stade of STADES) {
      expect(stadeApresFormes(etat(0, stade.code), STADES)).toBe(stade.code);
    }
  });

  it('ne décroît sur aucune des 10 000 séquences, et voit le rang le plus haut', () => {
    const alea = aleaDeTest(GRAINE_DE_TEST);
    const rangMaximal = STADES.length;
    let decroissances = 0;
    let rangMaximalObserve = 0;

    for (let essai = 0; essai < 10_000; essai += 1) {
      let courant = etat(0);
      let rangPrecedent = 1;
      for (let pas = 0; pas < 14; pas += 1) {
        // Un pas sur trois RETIRE des formes : c'est ce qui rend le test opposable.
        const delta = alea.flottant() < 0.34 ? -alea.entier(0, 6) : alea.entier(0, 6);
        const stade = stadeApresFormes(courant, STADES);
        courant = { ...etat(Math.max(0, courant.formes.length + delta)), stade };
        const rang = STADES.find((candidat) => candidat.code === stadeApresFormes(courant, STADES))!.rang;
        if (rang < rangPrecedent) {
          decroissances += 1;
        }
        rangPrecedent = rang;
        rangMaximalObserve = Math.max(rangMaximalObserve, rang);
      }
    }

    console.log(
      `[N3] sequences=10000 decroissances=${String(decroissances)} ` +
        `rangMax=${String(rangMaximalObserve)}/${String(rangMaximal)}`
    );
    expect(decroissances).toBe(0);
    // Un test où le sommet ne serait jamais atteint serait creux.
    expect(rangMaximalObserve).toBe(rangMaximal);
  });
});
