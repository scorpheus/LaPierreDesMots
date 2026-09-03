/**
 * L'ordre consommé par la carte et la pastille est le tableau `region.noeuds`.
 * Chaque nœud porte aussi `ordre` : si les deux divergent, la QA valide une progression
 * pédagogique que l'enfant ne voit jamais. Ce garde compare les OBJETS, pas les comptes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RACINE = process.cwd();

interface RegionLue {
  readonly region: string;
  readonly noeuds: readonly string[];
}

interface NoeudLu {
  readonly id: string;
  readonly ordre: number;
  readonly progression?: boolean;
}

const monde = JSON.parse(
  readFileSync(join(RACINE, 'contenu', 'monde', 'regions.json'), 'utf8'),
) as { readonly regions: readonly RegionLue[] };

describe('ordre des nœuds réellement servi', () => {
  it.each(monde.regions.map((region) => [region.region, region] as const))(
    '%s — le tableau suit exactement `noeud.ordre`',
    (_code, region) => {
      const servis = region.noeuds.map((id) =>
        JSON.parse(
          readFileSync(join(RACINE, 'contenu', 'noeuds', `${id}.json`), 'utf8'),
        ) as NoeudLu,
      ).filter((noeud) => noeud.progression !== false);
      const message = servis.map((noeud, index) =>
          `${String(index + 1)} servi → ${noeud.id} déclare ordre ${String(noeud.ordre)}`,
        ).join(' · ');
      const ordresAttendus = region.region === 'galeries'
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]
        : Array.from({ length: servis.length }, (_, index) => index + 1);
      expect(servis.map((noeud) => noeud.ordre), message).toEqual(ordresAttendus);
      expect(new Set(servis.map((noeud) => noeud.id)).size).toBe(servis.length);
    },
  );
});
