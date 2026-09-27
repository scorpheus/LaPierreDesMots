import { describe, expect, it } from 'vitest';
import { estPorteeReinitialisation, porteeEfface, pertesDeLaPortee } from '@partage/parent/reinitialisation';

describe('remise à zéro par domaine — Vallée §9.3', () => {
  it('isole journal, reprise et cadeaux des maths', () => {
    expect(estPorteeReinitialisation('maths')).toBe(true);
    for (const table of ['sessions_projets_maths', 'instances_maths', 'actions_maths',
      'reprises_maths', 'tentatives_maths', 'progression_maths', 'progression_projets_maths',
      'recompenses_maths', 'preferences_niveaux_maths']) {
      expect(porteeEfface('maths', table)).toBe(true);
      expect(porteeEfface('lecture', table)).toBe(false);
    }
    for (const table of ['tentatives', 'reprises_lecture', 'formes_gobi', 'compagnons', 'campement']) {
      expect(porteeEfface('maths', table)).toBe(false);
      expect(porteeEfface('lecture', table)).toBe(true);
    }
    expect(porteeEfface('lecture', 'reglages_lecture')).toBe(false);
    expect(porteeEfface('maths', 'reglages_lecture')).toBe(false);
  });
  it('bloque une table non classifiée au lieu de la perdre silencieusement', () => {
    for (const portee of ['complete', 'progression', 'lecture', 'maths'] as const) {
      expect(() => porteeEfface(portee, 'table_non_classee')).toThrow(/class/i);
    }
  });
  it('nomme les pertes des deux domaines pour la portée historique', () => {
    expect(pertesDeLaPortee('progression').join(' ')).toMatch(/math/i);
    expect(pertesDeLaPortee('maths').join(' ')).not.toMatch(/formes de Gobi/);
  });
});
