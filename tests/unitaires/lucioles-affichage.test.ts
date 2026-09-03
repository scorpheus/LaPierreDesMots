import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

type ExerciceLuciole = {
  jeu: { moteur: string; contenu: { consignes: { texte: string }[]; cibles?: { id: string; libelle: string }[]; options?: { id: string; libelle: string }[] } };
};

function lire(chemin: string): ExerciceLuciole {
  return JSON.parse(readFileSync(chemin, 'utf8')) as ExerciceLuciole;
}

describe('lot A — mots visibles sur les lucioles', () => {
  it('attrape affiche seulement le mot utile, sans description de la luciole', () => {
    const exercice = lire('contenu/exercices/clairiere/lucioles-attrape-01.json');
    const cibles = exercice.jeu.contenu.cibles ?? [];
    expect(cibles.length).toBeGreaterThan(0);
    for (const cible of cibles) {
      expect(cible.libelle).not.toMatch(/luciole|porte|deuxième/i);
      expect(cible.libelle).toMatch(/^(bleu|vert|rouge|jaune|rose|brun)$/);
    }
  });

  it('la consigne attrape est courte et donne le mot à lire', () => {
    const exercice = lire('contenu/exercices/clairiere/lucioles-attrape-01.json');
    for (const consigne of exercice.jeu.contenu.consignes) {
      expect(consigne.texte).toMatch(/^Attrape (la|les) luciole(s?) avec le mot « .+ ».?$/);
      expect(consigne.texte).not.toMatch(/qui porte|où tu lis le mot/i);
    }
  });

  it('les options éclair portent elles aussi le mot seul', () => {
    const exercice = lire('contenu/exercices/clairiere/luciole-couleurs-01.json');
    const options = exercice.jeu.contenu.options ?? [];
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.libelle).not.toMatch(/luciole|porte/i);
      expect(option.libelle.length).toBeLessThanOrEqual(6);
    }
  });
});
