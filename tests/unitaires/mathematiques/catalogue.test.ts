import { describe, expect, it } from 'vitest';
import { CATALOGUE_MATHS, PROJETS_MATHS, domaineMaths } from '../../../partage/src/mathematiques/index.js';

describe('catalogue maths V1', () => {
  it('déclare 18 familles et 54 domaines locaux sans identifiant orphelin', () => {
    const familles = CATALOGUE_MATHS.map((f) => f.id);
    expect(familles).toHaveLength(18);
    expect(new Set(familles).size).toBe(18);
    for (const famille of CATALOGUE_MATHS) {
      for (const niveau of ['decouverte', 'exploration', 'defi'] as const) {
        const domaine = domaineMaths(famille.id, niveau);
        expect(domaine.bornes.length).toBeGreaterThan(0);
        expect(domaine.operation.length).toBeGreaterThan(0);
        expect(domaine.contraintes.length).toBeGreaterThan(0);
        expect(domaine.exclusions.length).toBeGreaterThan(0);
        expect(domaine.outilNeutre.length).toBeGreaterThan(0);
      }
    }
    expect(PROJETS_MATHS).toHaveLength(18);
    expect(new Set(PROJETS_MATHS.map((p) => p.id)).size).toBe(18);
    for (const projet of PROJETS_MATHS) {
      expect(projet.etapes).toHaveLength(3);
      for (const famille of projet.etapes) expect(familles).toContain(famille);
      expect(projet.variablesTransmises.length).toBeGreaterThan(0);
    }
  });
});
