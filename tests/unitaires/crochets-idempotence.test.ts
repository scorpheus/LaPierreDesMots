/** Le chargement répété d'une fixture doit être stable sans fusionner deux entrées distinctes. */
import { describe, expect, it } from 'vitest';

import { horodatageEntreeFixture } from '@client/testabilite/crochets.js';

describe('horodatage des entrées de progression du crochet', () => {
  it('est déterministe, distinct par rang et reste un ISO UTC valide', () => {
    const base = '2026-09-01T08:00:00Z';
    const premier = horodatageEntreeFixture(base, 0);
    const second = horodatageEntreeFixture(base, 1);
    expect(premier).toBe('2026-09-01T08:00:00.000Z');
    expect(second).toBe('2026-09-01T08:00:00.001Z');
    expect(new Set([premier, second])).toHaveLength(2);
  });

  it('remplace les millisecondes existantes au lieu de produire un horodatage mal formé', () => {
    expect(horodatageEntreeFixture('2026-09-01T08:00:00.742Z', 9)).toBe(
      '2026-09-01T08:00:00.009Z',
    );
  });
});
