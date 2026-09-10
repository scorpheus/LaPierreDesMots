import { describe, expect, it } from 'vitest';
import type { ModeleLettre } from '@partage/moteurs/trace/index';
import { lireJson } from '../configuration/preparation.js';

const modeles = lireJson<{ lettres: ModeleLettre[] }>('contenu/modeles-lettres/minuscules.json');

describe('tracé demandé par le parent le 9 septembre 2026', () => {
  it('d minuscule : barre descendante puis panse côté gauche sans changer sa forme', () => {
    const d = modeles.lettres.find((lettre) => lettre.lettre === 'd')!;
    expect(d.traits.map((trait) => trait.id)).toEqual(['d-hampe', 'd-panse']);
    expect(d.traits.map((trait) => trait.ordre)).toEqual([1, 2]);
    expect(d.traits[0]!.depart).toEqual([70, 20]);
    expect(d.traits[0]!.arrivee).toEqual([70, 100]);
    const panse = d.traits[1]!;
    expect(panse.depart).toEqual([70, 60]);
    expect(panse.arrivee).toEqual([70, 100]);
    expect(panse.points.every((point, index) => point[0] <= 70 &&
      (index === 0 || point[1] >= panse.points[index - 1]![1]))).toBe(true);
  });
  it('b : barre descendante puis panse du milieu vers le bas sans remontée', () => {
    const b = modeles.lettres.find((lettre) => lettre.lettre === 'b')!;
    expect(b.traits.map((trait) => trait.id)).toEqual(['b-hampe', 'b-panse']);
    const panse = b.traits[1]!;
    expect(panse.depart).toEqual([30, 60]);
    expect(panse.arrivee).toEqual([30, 100]);
    expect(panse.points.every((point, index) => index === 0 || point[1] >= panse.points[index - 1]![1])).toBe(true);
    expect(b.traits[0]!.depart).toEqual([30, 20]);
    expect(b.traits[0]!.arrivee).toEqual([30, 100]);
  });
});
