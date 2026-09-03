import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const racine = process.cwd();
const fichier = join(racine, 'contenu', 'exercices', 'volcan', 'etoiles-filantes-attrape-02.json');

describe('cibles illustrées du moteur attrape', () => {
  it('branche les cartes volcaniques disponibles sans inventer de fichier', () => {
    const exercice = JSON.parse(readFileSync(fichier, 'utf8')) as {
      jeu: { contenu: { cibles: Array<{ id: string; asset: string | null }> } };
    };
    const cibles = exercice.jeu.contenu.cibles;
    const illustrees = cibles.filter((cible) => cible.asset !== null);

    expect(illustrees.map((cible) => cible.id)).toEqual([
      'etoile-cheval',
      'etoile-cochon',
      'etoile-vache',
      'etoile-quille',
      'etoile-queue',
      'etoile-musique',
      'etoile-phare',
      'etoile-dauphin',
    ]);
    for (const cible of illustrees) {
      expect(existsSync(join(racine, 'contenu', cible.asset!)), cible.asset).toBe(true);
    }
  });
});
