import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const racine = join(process.cwd(), 'contenu');
const dossierDecors = join(racine, 'assets', 'decors', 'exercices');

function fichiersDans(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = join(dossier, entree.name);
    return entree.isDirectory() ? fichiersDans(chemin) : [chemin];
  });
}

describe('décors illustrés des exercices', () => {
  it('publie les 48 maîtres validés en 1536 × 1024', () => {
    const decors = readdirSync(dossierDecors).filter((nom) => nom.endsWith('.png'));
    expect(decors).toHaveLength(48);
    for (const nom of decors) {
      const octets = readFileSync(join(dossierDecors, nom));
      expect(octets.subarray(0, 8).toString('hex'), nom).toBe('89504e470d0a1a0a');
      expect(octets.readUInt32BE(16), nom).toBe(1536);
      expect(octets.readUInt32BE(20), nom).toBe(1024);
    }
  });

  it('branche chacun des 48 maîtres dans un SVG réellement servi', () => {
    const corpsSvg = fichiersDans(join(racine, 'habillages'))
      .filter((chemin) => chemin.endsWith('.svg'))
      .map((chemin) => readFileSync(chemin, 'utf8'))
      .join('\n');
    const decors = readdirSync(dossierDecors).filter((nom) => nom.endsWith('.png'));
    for (const nom of decors) {
      expect(corpsSvg, nom).toContain(`/assets/decors/exercices/${nom}`);
    }
  });
});
