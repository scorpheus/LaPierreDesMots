/**
 * `normaliserTexte` / `comparerNormalise` — annexe T § T1, contrat § 0.
 *
 * « Le texte destiné à l'enfant utilise l'apostrophe typographique `’`. La comparaison passe
 * par `normaliserTexte`. » Ce fichier est la traduction mécanique de cette phrase : le jour où
 * quelqu'un tape `'` au lieu de `’` dans un contenu, rien ne doit casser en jeu.
 *
 * Tests par tables : les cas limites de l'annexe T sont énumérés, pas illustrés.
 */
import { describe, expect, it } from 'vitest';

import { comparerNormalise, normaliserTexte } from '@pierre/partage';

describe('normaliserTexte', () => {
  const cas: ReadonlyArray<readonly [libelle: string, entree: string, attendu: string]> = [
    ['casse', 'MAÎTRESSE', 'maitresse'],
    ['accents aigus et graves', 'école élève à côté', 'ecole eleve a cote'],
    ['tréma et circonflexe', 'maïs forêt Noël', 'mais foret noel'],
    ['cédille', 'garçon leçon', 'garcon lecon'],
    ['ligature œ', 'cœur et sœur', 'coeur et soeur'],
    ['apostrophe typographique', 'l’école', "l'ecole"],
    ['apostrophe droite', "l'école", "l'ecole"],
    ['espaces multiples', 'le    toit   rouge', 'le toit rouge'],
    ['espaces de bord', '   le ciel   ', 'le ciel'],
    ['tabulation et retour ligne', 'le\tciel\nbleu', 'le ciel bleu'],
    ['espace insécable', 'le ciel bleu', 'le ciel bleu'],
    ['chaîne vide', '', ''],
    ['espaces seuls', '     ', ''],
    ['déjà normalisé', "l'ecole", "l'ecole"]
  ];

  it.each(cas)('%s : « %s » → « %s »', (_libelle, entree, attendu) => {
    expect(normaliserTexte(entree)).toBe(attendu);
  });

  it('est idempotente : normaliser deux fois ne change rien', () => {
    for (const [, entree] of cas) {
      const une = normaliserTexte(entree);
      expect(normaliserTexte(une)).toBe(une);
    }
  });
});

describe('comparerNormalise', () => {
  const equivalents: ReadonlyArray<readonly [string, string]> = [
    ['L’école', "l'ecole"],
    ['LE  TOIT', 'le toit'],
    ['Maîtresse', 'maitresse'],
    ['  garçon ', 'GARCON'],
    ['', '   ']
  ];

  it.each(equivalents)('« %s » vaut « %s »', (a, b) => {
    expect(comparerNormalise(a, b)).toBe(true);
  });

  const distincts: ReadonlyArray<readonly [string, string]> = [
    ['le toit', 'la toit'],
    ['bleu', 'blue'],
    ['ecole', 'ecoles'],
    ['rouge', '']
  ];

  it.each(distincts)('« %s » ne vaut pas « %s »', (a, b) => {
    expect(comparerNormalise(a, b)).toBe(false);
  });

  it('est symétrique', () => {
    for (const [a, b] of [...equivalents, ...distincts]) {
      expect(comparerNormalise(a, b)).toBe(comparerNormalise(b, a));
    }
  });
});
