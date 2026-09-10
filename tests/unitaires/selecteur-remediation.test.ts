import { describe, expect, it } from 'vitest';
import { creerAlea } from '@pierre/partage';
import type { Competence, EntreeSelecteur, EtatMaitrise, NoeudCandidat } from '@pierre/partage';
import { composerSortie } from '@partage/pedagogie/selecteur.js';
import { lireParametresPedagogie } from '@partage/pedagogie/parametres.js';
import { INSTANT_DE_REFERENCE, lireJson } from '../configuration/preparation.js';

const parametres = lireParametresPedagogie(lireJson('contenu/referentiel/parametres-pedagogie.json'));
const competences: readonly Competence[] = [
  { code: 'gph.voyelle', libelle: 'voyelles', famille: 'gph', prerequis: [] },
  { code: 'syl.cv', libelle: 'syllabes ouvertes', famille: 'syl', prerequis: ['gph.voyelle'] },
  { code: 'syl.cvc', libelle: 'syllabes fermées', famille: 'syl', prerequis: ['syl.cv'] },
  { code: 'gph.sons', libelle: 'sons proches', famille: 'gph', prerequis: ['syl.cvc'] },
  { code: 'gph.miroir', libelle: 'miroirs', famille: 'gph', prerequis: [] },
];
const candidats: readonly NoeudCandidat[] = [
  ['voyelle1', 'clairiere', 'gph.voyelle'], ['voyelle2', 'clairiere', 'gph.voyelle'],
  ['cv1', 'clairiere', 'syl.cv'], ['cv2', 'clairiere', 'syl.cv'],
  ['cvc1', 'galeries', 'syl.cvc'], ['cvc2', 'galeries', 'syl.cvc'],
  ['miroir1', 'galeries', 'gph.miroir'], ['miroir2', 'galeries', 'gph.miroir'],
  ['sons1', 'galeries', 'gph.sons'], ['sons2', 'galeries', 'gph.sons'],
].map(([noeud, region, competence]) => ({ noeud: noeud!, region: region!,
  competences: [competence!], habillage: noeud!, difficulte: 1, temps: 'developpement' }));
const acquis = ['cvc1', 'cvc2', 'miroir1', 'miroir2'];
function entree(maitrises: readonly EtatMaitrise[]): EntreeSelecteur {
  return { profil: 'profil-test', region: 'galeries', compagnon: null, maitrises,
    revisionsDues: [], noeudsDisponibles: candidats, noeudsTermines: acquis,
    competences, maintenant: INSTANT_DE_REFERENCE };
}
function maitrise(competence: string, p: number): EtatMaitrise {
  return { competence, p, nbTentatives: 6, joursDistincts: [], nbTentativesFaibleDevinette: 0, acquiseLe: null };
}
describe('une région bloquée travaille les prérequis qui peuvent la débloquer', () => {
  it('ouvre la compétence principale sans ouvrir prématurément sa secondaire comme objectif', () => {
    const donnees = entree([]);
    const plan = composerSortie({ ...donnees, region: 'clairiere',
      noeudsDisponibles: [
        { ...candidats[0]!, competences: ['gph.voyelle', 'syl.cv'] },
        { ...candidats[1]!, competences: ['gph.voyelle', 'syl.cv'] },
        candidats[2]!, candidats[3]!
      ]
    }, parametres, creerAlea(17));
    expect(plan.etapes.map((etape) => etape.noeud).sort()).toEqual(['voyelle1', 'voyelle2']);
    expect(plan.etapes.every((etape) => etape.competences[0] === 'gph.voyelle')).toBe(true);
    expect(donnees.maitrises).toEqual([]);
  });
  it('sort de la boucle miroir puis reprend exactement les nouveautés après maîtrise', () => {
    const etapes = [
      { maitrises: [maitrise('syl.cvc', 0.456)], attendus: ['voyelle1', 'voyelle2'], region: 'clairiere' },
      { maitrises: [maitrise('gph.voyelle', 0.9), maitrise('syl.cvc', 0.456)], attendus: ['cv1', 'cv2'], region: 'clairiere' },
      { maitrises: [maitrise('gph.voyelle', 0.9), maitrise('syl.cv', 0.9), maitrise('syl.cvc', 0.456)], attendus: ['cvc1', 'cvc2'], region: 'galeries' },
      { maitrises: [maitrise('gph.voyelle', 0.9), maitrise('syl.cv', 0.9), maitrise('syl.cvc', 0.9)], attendus: ['sons1', 'sons2'], region: 'galeries' },
    ];
    for (const etape of etapes) {
      const donnees = entree(etape.maitrises);
      const plan = composerSortie(donnees, parametres, creerAlea(17));
      expect(plan.etapes.map((etape) => etape.noeud).sort()).toEqual(etape.attendus);
      expect(plan.region).toBe(etape.region);
      expect(donnees.noeudsTermines).toEqual(acquis);
      expect(plan.etapes.flatMap((etape) => etape.competences)).not.toContain('gph.miroir');
    }
  });
});
