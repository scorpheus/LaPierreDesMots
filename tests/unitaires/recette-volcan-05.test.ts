import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('recette volcan-05', () => {
  it('déclare la compétence gn réellement travaillée par la troisième consigne', () => {
    const chemin = resolve('contenu/exercices/volcan/coulee-chemin-01.json');
    const contenu = JSON.parse(readFileSync(chemin, 'utf8')) as {
      jeu: { contenu: { competence: string } };
    };
    expect(contenu.jeu.contenu.competence).toBe('gph.rare.gn');
  });
});
