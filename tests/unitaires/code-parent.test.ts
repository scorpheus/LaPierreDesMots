/**
 * Le code parent et son verrou — contrat des features v2 § 4.6, lot L2-H, v2 § 11.
 *
 * « Zone parent protégée par un code à 4 chiffres, `scrypt`, verrouillage temporaire après
 * 5 échecs. » Trois propriétés sont gardées ici, et aucune n'est décorative :
 *
 * 1. **`scrypt`, pas un stockage en clair.** Le code ne se retrouve jamais dans l'empreinte.
 * 2. **Comparaison à temps constant.** Un code à 4 chiffres est déjà faible ; une fuite par le
 *    temps de réponse le rendrait trivial à retrouver chiffre par chiffre.
 * 3. **Le verrou tient après 5 échecs, et il expire.** C'est le contrat de sortie du lot :
 *    le nombre d'échecs avant verrou est MESURÉ, jamais affirmé.
 *
 * L'horloge n'est jamais lue ici : les instants sont passés en argument, ce qui rend le test
 * de l'expiration possible sans attendre un quart d'heure (annexe T § 2.2).
 */
import { describe, expect, it } from 'vitest';

import { DUREE_VERROU_MS, ECHECS_AVANT_VERROU } from '@partage/parent/indicateurs';
import {
  VERROU_VIERGE,
  appliquerEchec,
  deriverCode,
  estVerrouille,
  selNeuf,
  verifierCode
} from '@serveur/services/code-parent';

import type { VerrouParent } from '@partage/parent/types';

const INSTANT = '2026-09-01T08:00:00.000Z';

describe('deriverCode / verifierCode — scrypt', () => {
  it('ne stocke jamais le code en clair dans l’empreinte', () => {
    const sel = selNeuf();
    const empreinte = deriverCode('1234', sel);
    expect(empreinte.includes(Buffer.from('1234', 'utf8'))).toBe(false);
    expect(empreinte.length).toBeGreaterThanOrEqual(32);
  });

  it('rend la même empreinte pour le même code et le même sel', () => {
    const sel = selNeuf();
    expect(deriverCode('4271', sel).equals(deriverCode('4271', sel))).toBe(true);
  });

  it('rend une empreinte différente pour le même code sur deux sels', () => {
    expect(deriverCode('4271', selNeuf()).equals(deriverCode('4271', selNeuf()))).toBe(false);
  });

  it('accepte le bon code et refuse tous les autres', () => {
    const sel = selNeuf();
    const empreinte = deriverCode('4271', sel);
    expect(verifierCode('4271', sel, empreinte)).toBe(true);
    for (const faux of ['4270', '1427', '0000', '9999', '427', '42710', '']) {
      expect(verifierCode(faux, sel, empreinte)).toBe(false);
    }
  });

  it('refuse une empreinte de longueur différente sans jeter — `timingSafeEqual` en jetterait', () => {
    const sel = selNeuf();
    expect(verifierCode('4271', sel, Buffer.alloc(3))).toBe(false);
  });

  it('rend deux sels distincts sur deux appels : le sel n’est pas dérivé de la graine', () => {
    expect(selNeuf().equals(selNeuf())).toBe(false);
  });
});

describe('appliquerEchec — table des 5 échecs (v2 § 11)', () => {
  it('CONTRAT DE SORTIE : le verrou se ferme au 5ᵉ échec, pas avant', () => {
    let verrou: VerrouParent = VERROU_VIERGE;
    const franchissements: number[] = [];

    for (let essai = 1; essai <= 7; essai += 1) {
      verrou = appliquerEchec(verrou, INSTANT);
      if (verrou.verrouilleJusqua !== null) {
        franchissements.push(essai);
      }
    }

    // Le premier essai qui ferme le verrou est le 5ᵉ — mesuré, pas affirmé.
    expect(franchissements[0]).toBe(ECHECS_AVANT_VERROU);
    expect(franchissements[0]).toBe(5);
  });

  it('compte les échecs un par un', () => {
    let verrou: VerrouParent = VERROU_VIERGE;
    for (let essai = 1; essai <= 4; essai += 1) {
      verrou = appliquerEchec(verrou, INSTANT);
      expect(verrou.nbEchecs).toBe(essai);
      expect(verrou.verrouilleJusqua).toBeNull();
    }
  });

  it('n’écrit jamais un verrou dans le passé', () => {
    let verrou: VerrouParent = VERROU_VIERGE;
    for (let essai = 1; essai <= 5; essai += 1) {
      verrou = appliquerEchec(verrou, INSTANT);
    }
    expect(Date.parse(String(verrou.verrouilleJusqua))).toBe(Date.parse(INSTANT) + DUREE_VERROU_MS);
  });

  it('rend un horodatage ISO en UTC, lisible par `Date.parse`', () => {
    let verrou: VerrouParent = VERROU_VIERGE;
    for (let essai = 1; essai <= 5; essai += 1) {
      verrou = appliquerEchec(verrou, INSTANT);
    }
    expect(String(verrou.verrouilleJusqua)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
  });

  it('franchit un changement de jour, de mois et d’année sans se tromper', () => {
    const table: ReadonlyArray<readonly [string, string]> = [
      ['2026-09-01T23:50:00.000Z', '2026-09-02T00:05:00.000Z'],
      ['2026-09-30T23:50:00.000Z', '2026-10-01T00:05:00.000Z'],
      ['2026-12-31T23:50:00.000Z', '2027-01-01T00:05:00.000Z'],
      ['2028-02-28T23:50:00.000Z', '2028-02-29T00:05:00.000Z']
    ];
    for (const [depart, attendu] of table) {
      let verrou: VerrouParent = VERROU_VIERGE;
      for (let essai = 1; essai <= 5; essai += 1) {
        verrou = appliquerEchec(verrou, depart);
      }
      expect(verrou.verrouilleJusqua).toBe(attendu);
    }
  });
});

describe('estVerrouille', () => {
  const verrouille: VerrouParent = {
    nbEchecs: 5,
    verrouilleJusqua: '2026-09-01T08:15:00.000Z'
  };

  it('est fermé avant l’échéance', () => {
    expect(estVerrouille(verrouille, '2026-09-01T08:14:59.999Z')).toBe(true);
  });

  it('s’ouvre À l’échéance — un verrou de 15 minutes dure 15 minutes, pas plus', () => {
    expect(estVerrouille(verrouille, '2026-09-01T08:15:00.000Z')).toBe(false);
    expect(estVerrouille(verrouille, '2026-09-01T08:15:00.001Z')).toBe(false);
  });

  it('est ouvert quand aucun verrou n’est posé', () => {
    expect(estVerrouille(VERROU_VIERGE, INSTANT)).toBe(false);
    expect(estVerrouille({ nbEchecs: 4, verrouilleJusqua: null }, INSTANT)).toBe(false);
  });

  it('reste ouvert plutôt que de bloquer le parent sur un horodatage illisible', () => {
    expect(estVerrouille({ nbEchecs: 5, verrouilleJusqua: 'jamais' }, INSTANT)).toBe(false);
  });
});
