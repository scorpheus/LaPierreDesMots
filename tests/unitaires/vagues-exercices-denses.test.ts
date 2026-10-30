/**
 * Décision du parent du 30 oct. (Docs/contrat-socle-activite.md § 12, point 1) : un exercice dense
 * se découpe en étapes plus courtes. Loi pure du découpage en vagues de consignes contiguës.
 */
import { describe, expect, it } from 'vitest';

import { decouperEnVagues, vagueDeLEtape } from '../../client/src/moteurs/commun/vagues.js';

describe('découper en vagues', () => {
  it('une seule vague : tout l’exercice, comme avant', () => {
    expect(decouperEnVagues([2, 2, 2, 2, 2], 1)).toEqual([[0, 1, 2, 3, 4]]);
  });

  it('cite-des-histoires-08 (cinq consignes de deux mots) en deux vagues : 6 puis 4 mots', () => {
    const vagues = decouperEnVagues([2, 2, 2, 2, 2], 2);
    expect(vagues).toEqual([[0, 1, 2], [3, 4]]);
  });

  it('chaque consigne est dans exactement une vague, dans l’ordre, et aucune vague n’est vide', () => {
    for (const tailles of [[2, 2, 2, 2, 2], [4, 4, 4], [6, 6], [1, 5, 1, 5], [3, 3, 3, 3, 1, 1, 1], [2]]) {
      for (let nombre = 1; nombre <= tailles.length + 2; nombre += 1) {
        const vagues = decouperEnVagues(tailles, nombre);
        expect(vagues.flat()).toEqual(tailles.map((_, i) => i));
        expect(vagues.every((v) => v.length > 0)).toBe(true);
        expect(vagues.length).toBe(Math.min(nombre, tailles.length));
      }
    }
  });

  it('les vagues sont équilibrées en éléments, pas en consignes', () => {
    const vagues = decouperEnVagues([1, 1, 1, 1, 6], 2);
    expect(vagues).toEqual([[0, 1, 2, 3], [4]]);
  });

  it('la vague montrée est celle de l’étape en cours, la dernière une fois l’exercice fini', () => {
    const vagues = decouperEnVagues([2, 2, 2, 2, 2], 2);
    expect(vagueDeLEtape(vagues, 0)).toBe(0);
    expect(vagueDeLEtape(vagues, 2)).toBe(0);
    expect(vagueDeLEtape(vagues, 3)).toBe(1);
    expect(vagueDeLEtape(vagues, 5)).toBe(1);
  });
});
