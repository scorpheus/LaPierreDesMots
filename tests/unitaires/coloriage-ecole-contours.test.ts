/** Repères supplémentaires observés sur le PNG : un point par objet était insuffisant. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pointDansRegion, polygonesDuChemin } from '../../scripts/verifier-regions-fermees.mjs';

const svg = readFileSync('contenu/habillages/clairiere/ecole-v2.svg', 'utf8');
function contient(id: string, x: number, y: number): boolean {
  const element = new RegExp(`<path\\b[^>]*\\bid="${id}"[^>]*>`, 'u').exec(svg)?.[0];
  expect(element).toBeDefined();
  const d = /\bd="([^"]+)"/u.exec(element!)?.[1];
  expect(d).toBeDefined();
  const echelle = 922 / 1536;
  return pointDansRegion(polygonesDuChemin(d!)!, [x * echelle, y * echelle + (615 - 1024 * echelle) / 2]);
}

describe('les couleurs restent sur la porte et le bois du banc', () => {
  it('la porte ne peint pas le visage de la maîtresse', () => {
    expect(contient('porte-ecole', 658, 300)).toBe(false);
    expect(contient('porte-ecole', 704, 322)).toBe(true);
  });
  it('le banc comprend son assise, pas seulement son dossier', () => {
    expect(contient('banc', 300, 660)).toBe(true);
  });
  it('le banc ne peint pas la terre au-dessus du dossier', () => {
    expect(contient('banc', 160, 574)).toBe(false);
  });
});
