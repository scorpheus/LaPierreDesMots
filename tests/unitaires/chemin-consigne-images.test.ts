import { expect, it } from 'vitest';
import { auditerExercice } from '../../scripts/qa/auditer-coherence-exercices.mjs';

it('la QA refuse de promettre des images sur un chemin qui ne porte que du texte', () => {
  const fiche = { jeu: { moteur: 'chemin', contenu: {
    cases: [{ id: 'a', libelle: 'Le lapin dort.', voisines: ['b'] },
      { id: 'b', libelle: 'Le lapin court.', voisines: ['a'] }],
    consignes: [{ id: 'c1', depart: 'a', parcours: ['b'], texte: "Marche sur les images dans l'ordre de l'histoire." }],
  } } };
  expect(auditerExercice(fiche).map((p: { regle: string }) => p.regle)).toContain('chemin-images-absentes');
  fiche.jeu.contenu.consignes[0]!.texte = "Marche sur les phrases dans l'ordre de l'histoire.";
  expect(auditerExercice(fiche)).toEqual([]);
});
