/** Des repères lus sur les objets du PNG, indépendants des centres des masques. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { polygonesDuChemin, pointDansRegion } from '../../scripts/verifier-regions-fermees.mjs';
import reperes from '../fixtures/coloriages-reperes.json';

interface FicheColoriage {
  readonly jeu?: { readonly moteur: string; readonly noeud: string; readonly contenu: {
    readonly consignes: readonly { readonly cibles: readonly { readonly region: string }[] }[];
  } };
}

it('chaque coloriage livré possède tous ses repères visuels indépendants', () => {
  const fiches = readdirSync('contenu/exercices', { recursive: true })
    .map(String).filter(nom => nom.endsWith('.json'))
    .map(nom => JSON.parse(readFileSync(resolve('contenu/exercices', nom), 'utf8')) as FicheColoriage)
    .filter(fiche => fiche.jeu?.moteur === 'colorie');
  expect(fiches.length).toBeGreaterThan(0);
  expect(reperes.map(r => r.noeud).sort()).toEqual(fiches.map(f => f.jeu!.noeud).sort());
  for (const fiche of fiches) {
    const points = reperes.find(r => r.noeud === fiche.jeu!.noeud);
    expect(points!.cibles.map(c => c.region).sort()).toEqual(fiche.jeu!.contenu.consignes.flatMap(c => c.cibles.map(cible => cible.region)).sort());
  }
});

describe('les masques correspondent aux objets de l’illustration revue', () => {
  for (const scene of reperes) {
    const habillage = JSON.parse(readFileSync(resolve(scene.habillage), 'utf8'));
    const svg = readFileSync(resolve('contenu', habillage.scene.fichier), 'utf8');
    const [, , largeur, hauteur] = habillage.scene.viewBox.split(/\s+/u).map(Number) as number[];
    it(`${scene.noeud} garde l'image examinée et le ratio sans recadrage`, () => {
      const octets = readFileSync(resolve(scene.image));
      expect(createHash('sha256').update(octets).digest('hex')).toBe(scene.empreinteImage);
      expect(largeur! / hauteur!).toBeCloseTo(octets.readUInt32BE(16) / octets.readUInt32BE(20), 2);
      expect(svg).toContain(scene.image.replace('contenu/', ''));
      expect(svg).toMatch(/preserveAspectRatio="xMidYMid meet"/u);
    });
    for (const cible of scene.cibles) {
      it(`${scene.noeud} peint ${cible.objet}, pas le sol à côté`, () => {
        const element = new RegExp(`<path\\b[^>]*\\bid="${cible.region}"[^>]*>`, 'u').exec(svg)?.[0];
        expect(element, cible.region).toBeDefined();
        const chemin = /\bd="([^"]+)"/u.exec(element!)?.[1];
        expect(chemin).toBeDefined();
        const polygones = polygonesDuChemin(chemin!);
        expect(polygones).not.toBeNull();
        expect(pointDansRegion(polygones!, [cible.interieur[0]! * largeur!, cible.interieur[1]! * hauteur!])).toBe(true);
        expect(pointDansRegion(polygones!, [cible.exterieur[0]! * largeur!, cible.exterieur[1]! * hauteur!])).toBe(false);
      });
    }
  }
});
