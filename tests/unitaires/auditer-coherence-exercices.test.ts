import { describe, expect, it } from 'vitest';

import { auditerExercice } from '../../scripts/qa/auditer-coherence-exercices.mjs';
import * as audit from '../../scripts/qa/auditer-coherence-exercices.mjs';

const exerciceTriSain = {
  jeu: {
    moteur: 'tri',
    contenu: {
      consignes: [{ id: 'c1', aRanger: ['mot-chat', 'mot-riz'] }],
      receptacles: [{ id: 'panier-a' }, { id: 'panier-i' }],
      elements: [
        { id: 'mot-chat', receptacleAttendu: 'panier-a' },
        { id: 'mot-riz', receptacleAttendu: 'panier-i' },
      ],
    },
  },
};

describe('auditer-coherence-exercices', () => {
  it('rapporte la cause et les chemins des incohérences sans les confondre avec une suite vide', () => {
    const rapport = audit.resumerAudit({ exercices: 76, problemes: [
      { chemin: 'contenu/exercices/temoin.json/consignes/c1', regle: 'cible-eclair-revelee', message: 'La consigne révèle le mot.' },
    ] });
    expect(rapport).toMatchObject({
      etape: 'qa:coherence', statut: 'echec', total: 76, echecs: 1,
      cause: '1 incohérence(s) dans les 76 exercices publiés.',
      details: [{ ou: 'contenu/exercices/temoin.json/consignes/c1', message: '[cible-eclair-revelee] La consigne révèle le mot.' }],
    });
    expect(audit.resumerAudit({ exercices: 76, problemes: [] })).toMatchObject({
      statut: 'reussite', total: 76, echecs: 0, details: [],
    });
  });

  it('laisse passer un tri cohérent : toute bonne réponse reste disponible sans ordre imposé', () => {
    expect(auditerExercice(exerciceTriSain)).toEqual([]);
  });

  it('attrape une cible éclair révélée et une réponse absente du choix', () => {
    const exercice = {
      jeu: {
        moteur: 'eclair',
        contenu: {
          options: [{ id: 'mot-lac' }, { id: 'mot-lit' }],
          consignes: [{
            id: 'c1', mot: 'lac', texte: 'Touche le mot « lac ».',
            options: ['mot-lac', 'mot-lit'], reponse: 'mot-invente',
          }],
        },
      },
    };
    expect(auditerExercice(exercice).map((p) => p.regle)).toEqual([
      'reponse-inconnue',
      'cible-eclair-revelee',
    ]);
  });

  it('attrape une solution qui ne recompose pas le mot et un chemin interrompu', () => {
    const assemble = {
      jeu: { moteur: 'assemble', contenu: {
        blocs: [{ id: 'bloc-ba', libelle: 'ba' }, { id: 'bloc-te', libelle: 'te' }],
        consignes: [{ id: 'c1', mot: 'bateau', solution: ['bloc-ba', 'bloc-te'] }],
      } },
    };
    const chemin = {
      jeu: { moteur: 'chemin', contenu: {
        cases: [{ id: 'depart', voisines: ['a'] }, { id: 'a', voisines: [] }, { id: 'b', voisines: [] }],
        consignes: [{ id: 'c1', depart: 'depart', parcours: ['a', 'b'] }],
      } },
    };
    expect(auditerExercice(assemble).map((p) => p.regle)).toContain('mot-mal-recompose');
    expect(auditerExercice(chemin).map((p) => p.regle)).toContain('parcours-non-continu');
  });

  it('refuse la formulation abstraite « son de … » et accepte le mot-repère explicite', () => {
    const abstraite = { jeu: { moteur: 'tri', contenu: {
      consignes: [{ id: 'c1', texte: 'Range les mots où tu entends le son de gant.', aRanger: [] }],
      receptacles: [], elements: [],
    } } };
    const explicite = { jeu: { moteur: 'tri', contenu: {
      consignes: [{ id: 'c1', texte: 'Range les mots où tu entends le même son que dans « gant ».', aRanger: [] }],
      receptacles: [], elements: [],
    } } };
    expect(auditerExercice(abstraite).map((p) => p.regle)).toContain('formulation-son-abstraite');
    expect(auditerExercice(explicite).map((p) => p.regle)).not.toContain('formulation-son-abstraite');
  });

  it('contrôle aussi les critères visibles des paniers, y compris la négation', () => {
    const fiche = { jeu: { moteur: 'tri', contenu: {
      consignes: [], elements: [],
      receptacles: [{ id: 'gauche', critere: 'le son de pont' }, { id: 'droite', critere: 'pas le son de fille' }],
    } } };
    expect(auditerExercice(fiche).map((p) => p.chemin)).toEqual([
      'exercice.json/receptacles/gauche/critere', 'exercice.json/receptacles/droite/critere',
    ]);
    fiche.jeu.contenu.receptacles[0]!.critere = 'le même son que dans « pont »';
    fiche.jeu.contenu.receptacles[1]!.critere = 'pas le même son que dans « fille »';
    expect(auditerExercice(fiche)).toEqual([]);
  });

  it('attrape une paire incomplète, un trou mal placé et une chronologie qui cite une vignette absente', () => {
    const paires = { jeu: { moteur: 'paires', contenu: {
      cartes: [{ id: 'mot-lac', paire: 'lac' }], consignes: [{ id: 'c1', aApparier: ['lac'] }],
    } } };
    const grave = { jeu: { moteur: 'grave', contenu: {
      clavier: ['ou'], consignes: [{ id: 'c1', mot: 'loup', trous: [{ id: 't1', position: 0, attendu: 'ou' }] }],
    } } };
    const chrono = { jeu: { moteur: 'chrono', contenu: {
      vignettes: [{ id: 'v1' }], consignes: [{ id: 'c1', ordre: ['v1', 'v2'] }],
    } } };
    expect(auditerExercice(paires).map((p) => p.regle)).toContain('paire-incomplete');
    expect(auditerExercice(grave).map((p) => p.regle)).toContain('trou-mal-positionne');
    expect(auditerExercice(chrono).map((p) => p.regle)).toContain('reference-inconnue');
  });

  it('attrape une vignette de chronologie dont le sujet contredit le récit', () => {
    const chrono = { jeu: { moteur: 'chrono', contenu: {
      vignettes: [{ id: 'v1', libelle: 'Une mouche se pose.' }],
      consignes: [{ id: 'c1', recit: 'Une abeille se pose.', ordre: ['v1'] }],
    } } };
    expect(auditerExercice(chrono).map((p) => p.regle)).toContain('chronologie-sujet-incoherent');
  });
});
