import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AideProposee, CodeAideGobi, Exercice } from '@pierre/partage';
import { resoudreAideDeGobi } from '@client/composants/aide-de-gobi';

import { RACINE_DEPOT } from '../configuration/preparation.js';

function exercice(chemin: string): Exercice {
  return JSON.parse(readFileSync(join(RACINE_DEPOT, chemin), 'utf8')) as Exercice;
}

function aide(code: CodeAideGobi): AideProposee {
  return { niveau: 'indice', code, cible: 'cible-de-test', texte: null };
}

describe('l’aide de Gobi est une stratégie, jamais la consigne rejouée', () => {
  const cas = [
    ['attrape', 'contenu/exercices/clairiere/lucioles-attrape-01.json'],
    ['tri', 'contenu/exercices/clairiere/paniers-voyelles-01.json'],
    ['assemble', 'contenu/exercices/clairiere/collier-syllabes-01.json'],
    ['chemin', 'contenu/exercices/clairiere/lianes-voyelles-01.json'],
    ['eclair', 'contenu/exercices/clairiere/luciole-couleurs-01.json'],
    ['paires', 'contenu/exercices/galeries/echos-paires-01.json'],
    ['phrase', 'contenu/exercices/clairiere/guirlande-phrase-01.json'],
    ['histoire', 'contenu/exercices/clairiere/veillee-histoire-01.json'],
    ['chrono', 'contenu/exercices/galeries/frise-chrono-01.json'],
    ['grave', 'contenu/exercices/foret-muette/buee-grave-01.json'],
    ['libre', 'contenu/exercices/galeries/paroi-libre-01.json'],
    ['colorie', 'contenu/exercices/clairiere/ecole-01.json'],
    ['place', 'contenu/exercices/clairiere/ecole-02-place.json'],
    ['trace', 'contenu/exercices/galeries/miroir-bd-01.json']
  ] as const;

  it.each(cas)('%s : aide et consigne ne se confondent pas sur un exercice réellement livré', (
    moteur,
    chemin,
  ) => {
    const lu = exercice(chemin);
    expect(lu.jeu.moteur).toBe(moteur);
    const contenu = lu.jeu.contenu as { readonly consignes?: readonly { readonly id: string; readonly texte: string }[]; readonly questions?: readonly { readonly id: string; readonly texte: string }[]; readonly consigne?: string; readonly consigneId?: string };
    const etape = contenu.consignes?.[0] ?? contenu.questions?.[0] ?? {
      id: contenu.consigneId ?? 'c1',
      texte: contenu.consigne ?? lu.titre
    };
    const code = lu.jeu.aideGobi[0]!;

    const resolue = resoudreAideDeGobi(aide(code), etape, lu.id);

    expect(resolue.source).toBe('strategie');
    expect(resolue.texte).not.toBe(etape.texte);
    expect(resolue.cle).toBe(`aide-gobi/${code}`);
  });

  it('couvre les cinq stratégies déclarables avec leur clé Gobi dédiée', () => {
    const etape = { id: 'c1', texte: 'Range les syllabes pour écrire le mot.' };
    for (const code of [
      'relire-consigne',
      'souffle-syllabe',
      'surligne-graphene',
      'montre-cible',
      'montre-couleur'
    ] as const) {
      const resolue = resoudreAideDeGobi(aide(code), etape, 'galeries-stalagmites-assemble-01');
      expect(resolue.texte, code).not.toBe(etape.texte);
      expect(resolue.cle, code).toBe(`aide-gobi/${code}`);
    }
  });

  it('conserve un conseil déjà rédigé sans préfixe maladroit ni double point', () => {
    const conseil: AideProposee = {
      niveau: 'indice',
      code: 'relire-consigne',
      cible: 'zone-ciel',
      texte: 'Cherche un soleil. Pose-le dans le ciel.',
    };
    expect(resoudreAideDeGobi(conseil, null, null).texte).toBe(
      'Cherche un soleil. Pose-le dans le ciel.',
    );
  });
});
