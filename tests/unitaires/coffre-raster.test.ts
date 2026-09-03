import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RACINE_DEPOT, lireJson } from '../configuration/preparation.js';

interface VerrouCoffre {
  readonly empreintesSha256: Readonly<Record<string, string>>;
}

const VERROU = lireJson<VerrouCoffre>('production/coffre-raster.lock.json');
const ENTREES = Object.entries(VERROU.empreintesSha256);

describe('la collection raster du coffre', () => {
  it('verrouille exactement les 37 images livrées', () => {
    expect(ENTREES).toHaveLength(37);
    expect(ENTREES.filter(([chemin]) => chemin.startsWith('formes/'))).toHaveLength(25);
    expect(ENTREES.filter(([chemin]) => chemin.startsWith('eclats/'))).toHaveLength(6);
    expect(ENTREES.filter(([chemin]) => chemin.startsWith('objets/'))).toHaveLength(6);
  });

  it('remesure chaque empreinte au lieu de croire le verrou', () => {
    for (const [relatif, attendue] of ENTREES) {
      const fichier = readFileSync(join(RACINE_DEPOT, 'contenu', 'assets', 'coffre', relatif));
      const mesuree = createHash('sha256').update(fichier).digest('hex');
      expect(mesuree, relatif).toBe(attendue);
    }
  });

  it('impose un PNG RGBA 256 × 256 à toutes les pièces', () => {
    for (const [relatif] of ENTREES) {
      const png = readFileSync(join(RACINE_DEPOT, 'contenu', 'assets', 'coffre', relatif));
      expect(png.subarray(0, 8), relatif).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(png.readUInt32BE(16), `${relatif} largeur`).toBe(256);
      expect(png.readUInt32BE(20), `${relatif} hauteur`).toBe(256);
      expect(png[25], `${relatif} type de couleur PNG`).toBe(6);
    }
  });
});
