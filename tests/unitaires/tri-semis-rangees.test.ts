/**
 * Le semis de `tri` (client/src/moteurs/tri/semis.ts) ne pose jamais plus de quatre mots sur une
 * même rangée : décision du parent du 30 oct. (contrat du socle § 12), d'après sa photo tablette
 * où six mots en corps 27 formaient un ruban à 800 px.
 */
import { describe, expect, it } from 'vitest';

import {
  MOTS_PAR_RANGEE_MAX,
  alignementTolere,
  semerEnQuinconce,
} from '../../client/src/moteurs/tri/semis.js';

const mot = (largeur: number): { x: number; y: number; largeur: number; hauteur: number } => ({
  x: 0,
  y: 0,
  largeur,
  hauteur: 64,
});

describe('le semis de tri — quatre mots par rangée au plus', () => {
  it('douze mots qui tiendraient sur deux rangées de six en prennent trois de quatre', () => {
    const boites = Array.from({ length: 12 }, () => mot(90));
    // 2 rangées de haut seulement s'il en faut : 6 × 90 + 5 × 12 = 600 px tiendraient en largeur.
    const resultat = semerEnQuinconce(boites, { xMin: 0, yMin: 0, xMax: 760, yMax: 3 * (64 + 12) });
    expect(resultat.tient).toBe(true);
    expect(resultat.rangees).toBeGreaterThanOrEqual(3);
    const parRangee = new Map<number, number>();
    const tranche = (3 * (64 + 12)) / resultat.rangees;
    for (const [, y] of resultat.points) {
      const r = Math.floor(y / tranche);
      parRangee.set(r, (parRangee.get(r) ?? 0) + 1);
    }
    expect(Math.max(...parRangee.values())).toBeLessThanOrEqual(MOTS_PAR_RANGEE_MAX);
  });

  it('sans la hauteur de trois rangées, le semis renonce (la grille prend le relais)', () => {
    const boites = Array.from({ length: 12 }, () => mot(90));
    const resultat = semerEnQuinconce(boites, { xMin: 0, yMin: 0, xMax: 760, yMax: 2 * (64 + 12) });
    expect(resultat.tient).toBe(false);
  });

  it('l’alignement toléré sur le décor ne dépasse jamais quatre', () => {
    expect(alignementTolere(6)).toBe(2);
    expect(alignementTolere(12)).toBe(4);
    expect(alignementTolere(14)).toBe(MOTS_PAR_RANGEE_MAX);
  });
});
