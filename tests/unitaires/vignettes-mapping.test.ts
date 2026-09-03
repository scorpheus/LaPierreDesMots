import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const racine = resolve(import.meta.dirname, '../..');

const planches = {
  'galeries-frise': ['vignette-pot', 'vignette-bol', 'vignette-panier', 'vignette-tas', 'vignette-dos', 'vignette-dame', 'vignette-four', 'vignette-verre', 'vignette-sac', 'vignette-zebre'],
  'volcan-fresque': ['vignette-cour', 'vignette-ruche', 'vignette-mouche', 'vignette-danse', 'vignette-quille', 'vignette-sac', 'vignette-joue', 'vignette-montagne', 'vignette-ligne', 'vignette-champignon'],
  'cite-pellicule-01': ['vignette-plage', 'vignette-seau', 'vignette-sable', 'vignette-petit', 'vignette-grand', 'vignette-montre', 'vignette-plume', 'vignette-caillou', 'vignette-danse'],
  'cite-pellicule-02': ['vignette-maison', 'vignette-cahier', 'vignette-papa', 'vignette-table', 'vignette-compte', 'vignette-dessin', 'vignette-sac', 'vignette-jardin', 'vignette-lit'],
  'cite-vitrail': ['vignette-nuage', 'vignette-pluie', 'vignette-riviere', 'vignette-lac', 'vignette-grand', 'vignette-soleil', 'vignette-petit', 'vignette-gros', 'vignette-jardin']
} as const;

const exercices: Record<string, string> = {
  'galeries-frise': 'contenu/exercices/galeries/frise-chrono-01.json',
  'volcan-fresque': 'contenu/exercices/volcan/fresque-chrono-01.json',
  'cite-pellicule-01': 'contenu/exercices/cite-des-histoires/pellicule-chrono-01.json',
  'cite-pellicule-02': 'contenu/exercices/cite-des-histoires/pellicule-chrono-02.json',
  'cite-vitrail': 'contenu/exercices/cite-des-histoires/vitrail-chrono-01.json'
};

function dimensionsPng(chemin: string): [number, number] {
  const octets = readFileSync(chemin);
  expect(octets.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return [octets.readUInt32BE(16), octets.readUInt32BE(20)];
}

describe('mapping des vignettes storyboard', () => {
  for (const [planche, ids] of Object.entries(planches)) {
    it(`${planche} conserve l’ordre JSON et des cellules 4:3`, () => {
      const contenu = JSON.parse(readFileSync(resolve(racine, exercices[planche]), 'utf8')) as { jeu: { contenu: { vignettes: { id: string; asset: string }[] } } };
      expect(contenu.jeu.contenu.vignettes.map((vignette) => vignette.id)).toEqual(ids);
      for (const vignette of contenu.jeu.contenu.vignettes) {
        expect(vignette.asset).toBe(`assets/vignettes/${planche}/${vignette.id}.png`);
        const [largeur, hauteur] = dimensionsPng(resolve(racine, 'contenu', vignette.asset));
        expect(largeur / hauteur).toBeCloseTo(4 / 3, 5);
      }
    });
  }
});
