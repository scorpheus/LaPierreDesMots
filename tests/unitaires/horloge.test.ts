/**
 * `Horloge` — `figer` et `avancer`. Annexe T § 2.2 et § 8.1.
 *
 * Sans horloge injectée, les seuils d'inactivité de `colorie` (contrat § 5.6 : 20 s, 45 s,
 * 30 s) ne seraient testables qu'en attendant vraiment 95 secondes. C'est ce fichier qui rend
 * `tests/unitaires/colorie-validation.test.ts` possible.
 */
import { describe, expect, it } from 'vitest';

import { creerHorloge, creerHorlogeFigee } from '@pierre/partage';

import { INSTANT_DE_REFERENCE } from '../configuration/preparation.js';

describe('creerHorlogeFigee', () => {
  it('rend toujours le même instant tant qu’on ne l’avance pas', () => {
    const h = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    const premier = h.maintenant();
    const second = h.maintenant();
    expect(second).toBe(premier);
    expect(String(premier)).toContain('2026-09-01');
  });

  it('avance de 7 jours sans attendre une semaine', () => {
    const h = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    const avant = h.maintenantMs();
    h.avancer({ jours: 7 });
    expect(h.maintenantMs() - avant).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('cumule les avancées, sans dérive', () => {
    const h = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    const depart = h.maintenantMs();
    for (let i = 0; i < 10; i += 1) h.avancer({ secondes: 3 });
    expect(h.maintenantMs() - depart).toBe(30_000);
  });

  it('avance des durées composées', () => {
    const h = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    const depart = h.maintenantMs();
    h.avancer({ jours: 1, heures: 2, minutes: 3, secondes: 4 });
    const attendu = ((24 + 2) * 60 * 60 + 3 * 60 + 4) * 1000;
    expect(h.maintenantMs() - depart).toBe(attendu);
  });

  it('se refige sur un instant arbitraire', () => {
    const h = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    h.avancer({ jours: 35 });
    h.figer(INSTANT_DE_REFERENCE);
    expect(String(h.maintenant())).toContain('2026-09-01');
  });

  it('deux horloges figées sont indépendantes', () => {
    const a = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    const b = creerHorlogeFigee(INSTANT_DE_REFERENCE);
    a.avancer({ jours: 1 });
    expect(a.maintenantMs()).not.toBe(b.maintenantMs());
  });
});

describe('creerHorloge', () => {
  it('rend un horodatage croissant, jamais décroissant', () => {
    const h = creerHorloge();
    const premier = h.maintenantMs();
    const second = h.maintenantMs();
    expect(second).toBeGreaterThanOrEqual(premier);
  });
});
