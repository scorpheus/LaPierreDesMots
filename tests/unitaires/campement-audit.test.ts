/**
 * R11 **mesurée sur le fichier réel**, jamais affirmée — v2 § 2 et § 3.4, annexe T § 197.
 *
 * Ce fichier porte le premier chiffre du contrat de sortie de L2-F (§ 10.4) :
 *
 *   « `auditerCampement(...)` sur `campement.json` réel : les trois comptes → échoue si
 *     `conforme === false` (R11 : 25 / 10 / 6). »
 *
 * Le fichier de contenu est lu SUR DISQUE. Aucun point n'est fabriqué pour la circonstance :
 * un audit qui passerait sur des données de test et pas sur les vraies ne prouverait rien.
 * « Un décor où le clic ne fait rien est un décor raté. »
 */
import { describe, expect, it } from 'vitest';

import {
  R11_ANIMATIONS_UNIQUES_MIN,
  R11_POINTS_MIN,
  R11_REPLIQUES_MIN,
  auditerCampement,
  pointsDuDocument
} from '@partage/monde/campement.js';
import type { PointInteraction } from '@partage/monde/types.js';

import { lireJson } from '../configuration/preparation.js';

const DOCUMENT: unknown = lireJson('contenu/monde/campement.json');
const POINTS: readonly PointInteraction[] = pointsDuDocument(DOCUMENT);

/** Un point minimal, à décliner. Sert aux cas de refus, jamais au verdict R11. */
function point(surcharges: Partial<PointInteraction> & { readonly id: string }): PointInteraction {
  return {
    libelle: surcharges.id,
    reaction: 'son',
    animationUnique: false,
    replique: null,
    zone: [0, 0, 96, 96],
    ...surcharges
  };
}

describe('R11 sur `contenu/monde/campement.json` — le fichier réel', () => {
  it('rend `conforme: true` et aucun manque', () => {
    const audit = auditerCampement(POINTS);
    console.log(
      `[L2-F] campement : points=${String(audit.nbPoints)} ` +
        `animationsUniques=${String(audit.nbAnimationsUniques)} ` +
        `repliques=${String(audit.nbRepliques)} conforme=${String(audit.conforme)}`
    );
    expect(audit.manques).toEqual([]);
    expect(audit.conforme).toBe(true);
  });

  it('tient les trois seuils, chacun nommé', () => {
    const audit = auditerCampement(POINTS);
    expect(audit.nbPoints).toBeGreaterThanOrEqual(R11_POINTS_MIN);
    expect(audit.nbAnimationsUniques).toBeGreaterThanOrEqual(R11_ANIMATIONS_UNIQUES_MIN);
    expect(audit.nbRepliques).toBeGreaterThanOrEqual(R11_REPLIQUES_MIN);
  });

  it('n’a aucun identifiant en double — deux points homonymes n’en font qu’un', () => {
    expect(new Set(POINTS.map((p) => p.id)).size).toBe(POINTS.length);
  });

  it('offre à chaque point une boîte d’au moins 64 unités de côté (R16)', () => {
    const trop_petits = POINTS.filter(({ zone }) => zone[2] < 64 || zone[3] < 64);
    expect(trop_petits.map((p) => p.id)).toEqual([]);
  });

  it('ne fait réagir aucun point par `aucune` — un point muet n’est pas une interaction', () => {
    expect(POINTS.filter((p) => p.reaction === 'aucune').map((p) => p.id)).toEqual([]);
  });
});

describe('auditerCampement — ce que la fonction refuse de compter', () => {
  it('ne compte pas deux fois un identifiant répété', () => {
    const audit = auditerCampement([point({ id: 'feu' }), point({ id: 'feu' })]);
    expect(audit.nbPoints).toBe(1);
  });

  it('ne compte pas une animation « unique » sur un point qui ne réagit à rien', () => {
    const audit = auditerCampement([
      point({ id: 'menteur', animationUnique: true, reaction: 'aucune' })
    ]);
    expect(audit.nbAnimationsUniques).toBe(0);
  });

  it('ne compte pas six fois le même clip de réplique partagé par six points', () => {
    const points = Array.from({ length: 6 }, (_, index) =>
      point({ id: `p${String(index)}`, reaction: 'replique', replique: 'audio/commun.opus' })
    );
    expect(auditerCampement(points).nbRepliques).toBe(1);
  });

  it('nomme les trois manques sur un campement vide, et ne dit jamais « conforme »', () => {
    const audit = auditerCampement([]);
    expect(audit.conforme).toBe(false);
    expect(audit.manques).toHaveLength(3);
    expect(audit.manques.join(' ')).toContain(String(R11_POINTS_MIN));
    expect(audit.manques.join(' ')).toContain(String(R11_ANIMATIONS_UNIQUES_MIN));
    expect(audit.manques.join(' ')).toContain(String(R11_REPLIQUES_MIN));
  });
});

describe('pointsDuDocument', () => {
  it('refuse un document sans points plutôt que de rendre une liste vide silencieuse', () => {
    expect(() => pointsDuDocument({})).toThrow();
  });

  it('refuse une zone qui n’est pas une boîte à quatre nombres', () => {
    expect(() =>
      pointsDuDocument({ points: [{ id: 'x', libelle: 'x', reaction: 'son', zone: [1, 2] }] })
    ).toThrow(/zone/u);
  });
});
