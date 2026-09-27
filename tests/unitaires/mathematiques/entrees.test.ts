import { describe, expect, it } from 'vitest';
import { creerInstanceMaths, decoderGesteMaths, estFamilleMaths, estGesteMaths, estGraineMaths, estNiveauMaths, estInstancePont } from '../../../partage/src/mathematiques/index.js';

describe('entrées de maths non fiables', () => {
  it('refuse les gestes inconnus et les nombres non sérialisables avant le service', () => {
    for (const geste of [
      null, {}, { type: 'placer-piece', objetId: '', position: 0 },
      { type: 'placer-piece', objetId: 'module-a', position: Number.NaN },
      { type: 'placer-borne', valeur: 10, position: Infinity },
      { type: 'montrer-encadrement', inferieure: 20, superieure: 10 },
      { type: 'aide', niveau: 'solution-auto' },
      { type: 'inconnu' },
    ]) {
      expect(estGesteMaths(geste)).toBe(false);
      expect(() => decoderGesteMaths(geste)).toThrow();
    }
    expect(decoderGesteMaths({ type: 'placer-piece', objetId: 'module-a', position: 0 }))
      .toEqual({ type: 'placer-piece', objetId: 'module-a', position: 0 });
  });

  it('ferme famille, niveau et graine à la création', () => {
    expect(estFamilleMaths('MAT-PON-01')).toBe(true);
    expect(estFamilleMaths('MAT-PON-99')).toBe(false);
    expect(estNiveauMaths('decouverte')).toBe(true);
    expect(estNiveauMaths('facile')).toBe(false);
    expect(estGraineMaths(0xffff_ffff)).toBe(true);
    expect(estGraineMaths(-1)).toBe(false);
    expect(estGraineMaths(0x1_0000_0000)).toBe(false);
    const base = { profilId: 'p', generationMaths: 0, cleGeste: 'cle', famille: 'MAT-PON-01', niveau: 'decouverte', graine: 1 } as const;
    expect(() => creerInstanceMaths({ ...base, graine: -1 })).toThrow();
    expect(() => creerInstanceMaths({ ...base, niveau: 'facile' as never })).toThrow();
    expect(creerInstanceMaths(base).famille).toBe('MAT-PON-01');
    const instance = creerInstanceMaths(base);
    expect(estInstancePont(instance)).toBe(true);
    expect(estInstancePont({ ...instance, versionModele: 2 })).toBe(false);
    expect(estInstancePont({ ...instance, parametres: {} })).toBe(false);
  });
});
