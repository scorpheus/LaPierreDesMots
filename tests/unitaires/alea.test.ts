/**
 * `Alea` — déterminisme. Annexe T § 2.1.
 *
 * C'est le socle du déterminisme de toute la suite : si ce fichier passe, `test:rejeu`, les
 * captures visuelles et le bot casse-cou sont rejouables. S'il échoue, plus rien d'autre
 * n'est interprétable.
 *
 * Les propriétés sont testées avec `fast-check` plutôt que par exemples : une suite d'exemples
 * ne dirait rien de la 4 000ᵉ valeur, qui est justement celle que le test du singe consomme.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { creerAlea, graineParDefaut } from '@pierre/partage';

/** Consomme `n` valeurs successives. */
function suite(graine: number, n: number): number[] {
  const alea = creerAlea(graine);
  return Array.from({ length: n }, () => alea.flottant());
}

describe('creerAlea', () => {
  it('rend exactement la même suite pour la même graine', () => {
    expect(suite(42, 64)).toEqual(suite(42, 64));
  });

  it('rend une suite différente pour une graine différente', () => {
    expect(suite(42, 16)).not.toEqual(suite(43, 16));
  });

  it('ne dépend d’aucun état global : deux instances entrelacées ne se perturbent pas', () => {
    const a = creerAlea(7);
    const b = creerAlea(7);
    const entrelace: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      entrelace.push(a.flottant());
      b.flottant();
    }
    expect(entrelace).toEqual(suite(7, 20));
  });

  it('reste dans [0, 1) quelle que soit la graine — propriété, pas exemple', () => {
    fc.assert(
      fc.property(fc.integer({ min: -2_147_483_648, max: 2_147_483_647 }), (graine) => {
        const alea = creerAlea(graine);
        for (let i = 0; i < 100; i += 1) {
          const valeur = alea.flottant();
          if (!Number.isFinite(valeur) || valeur < 0 || valeur >= 1) return false;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  it('ne se fige pas sur une constante : 1 000 tirages donnent au moins 900 valeurs distinctes', () => {
    // Un générateur qui rendrait toujours la même valeur passerait les tests précédents.
    // Ce seuil attrape le cas ; mulberry32 rend en pratique 1 000 valeurs distinctes.
    const distinctes = new Set(suite(graineParDefaut(), 1_000));
    expect(distinctes.size).toBeGreaterThanOrEqual(900);
  });

  it('graineParDefaut rend un entier utilisable comme graine', () => {
    const graine = graineParDefaut();
    expect(Number.isInteger(graine)).toBe(true);
    expect(() => creerAlea(graine)).not.toThrow();
  });
});
