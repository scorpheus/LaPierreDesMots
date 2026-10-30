/**
 * Le moteur `assemble` — pose PAR CASE (contrat Docs/assemble-pose-par-case-2026-10-12.md § 5).
 *
 * Retour du parent, tableau E19 : « le *che*, si je le mets à la deuxième position avant de
 * mettre le *mar*, ça devrait fonctionner ». Le verdict porte sur la case, l'ordre est libre.
 */
import { describe, expect, it } from 'vitest';

import { moteurAssemble } from '@partage/moteurs/assemble/moteur';
import type { ActionAssemble, ContenuAssemble, EtatAssemble } from '@partage/moteurs/assemble/types';
import type { Habillage } from '@pierre/partage';

import { aleaDeTest, horlogeDeTest } from '../configuration/preparation.js';

const contenu: ContenuAssemble = {
  consignes: [
    {
      id: 'c1', texte: 'Assemble « marche ».', forme: 'imperative', audio: null, mot: 'marche',
      solution: ['bloc-mar', 'bloc-che'], motsCles: ['assemble'],
    },
    {
      id: 'c2', texte: 'Assemble « jardin ».', forme: 'imperative', audio: null, mot: 'jardin',
      solution: ['bloc-jar', 'bloc-din'], motsCles: ['assemble'],
    },
  ],
  blocs: [
    { id: 'bloc-mar', libelle: 'mar', intrus: false, confusionAvec: null },
    { id: 'bloc-che', libelle: 'che', intrus: false, confusionAvec: null },
    { id: 'bloc-jar', libelle: 'jar', intrus: false, confusionAvec: null },
    { id: 'bloc-din', libelle: 'din', intrus: false, confusionAvec: null },
    { id: 'bloc-mer', libelle: 'mer', intrus: true, confusionAvec: 'mar' },
  ],
  competence: 'syl.cvc',
};

const horloge = horlogeDeTest();
const alea = aleaDeTest();

function neuf(): EtatAssemble {
  return moteurAssemble.creerEtat({ contenu, habillage: {} as Habillage, alea, horloge });
}

function jouer(etat: EtatAssemble, ...actions: ActionAssemble[]): EtatAssemble {
  return actions.reduce((e, a) => moteurAssemble.reduire(e, a, { alea, horloge }), etat);
}

describe('assemble — pose par case', () => {
  it('che en case 2 puis mar en case 1 : étape finie, 0 erreur', () => {
    const e1 = jouer(neuf(), { type: 'poser', bloc: 'bloc-che', case: 1 });
    expect(e1.dernierRefus).toBeNull();
    expect(e1.etapes[0]?.nbErreurs).toBe(0);
    expect(e1.etapes[0]?.restantes).toEqual(['bloc-mar']);
    expect(e1.acquis['bloc-che']).toBe('2');
    const e2 = jouer(e1, { type: 'poser', bloc: 'bloc-mar', case: 0 });
    expect(e2.etapes[0]?.nbErreurs).toBe(0);
    expect(e2.etapes[0]?.finMs).not.toBeNull();
    expect(e2.indexEtape).toBe(1);
    expect(e2.acquis['bloc-mar']).toBe('1');
  });

  it('restantes garde l’ordre de la solution : restantes[0] est le bloc de la première case vide', () => {
    const e = jouer(neuf(), { type: 'poser', bloc: 'bloc-mar', case: 0 });
    expect(e.etapes[0]?.restantes[0]).toBe('bloc-che');
    const e2 = jouer(neuf(), { type: 'poser', bloc: 'bloc-che', case: 1 });
    expect(e2.etapes[0]?.restantes[0]).toBe('bloc-mar');
  });

  it('mauvais bloc dans une case libre : refus + 1 erreur, confusion à CE rang', () => {
    const e = jouer(neuf(), { type: 'poser', bloc: 'bloc-che', case: 0 });
    expect(e.dernierRefus?.motif).toBe('bloc-hors-ordre');
    expect(e.etapes[0]?.nbErreurs).toBe(1);
    expect(e.etapes[0]?.confusion?.attendu).toBe('mar');
    expect(e.etapes[0]?.confusion?.rendu).toBe('che');
    expect(e.acquis['bloc-che']).toBeUndefined();
    // La confusion se lit au rang visé, pas au rang suivant.
    const f = jouer(neuf(), { type: 'poser', bloc: 'bloc-mar', case: 1 });
    expect(f.etapes[0]?.confusion?.attendu).toBe('che');
    expect(f.etapes[0]?.nbErreurs).toBe(1);
  });

  it('bloc intrus dans une case : refus bloc-intrus + 1 erreur', () => {
    const e = jouer(neuf(), { type: 'poser', bloc: 'bloc-mer', case: 0 });
    expect(e.dernierRefus?.motif).toBe('bloc-intrus');
    expect(e.etapes[0]?.nbErreurs).toBe(1);
  });

  it('case occupée : refus case-occupee SANS erreur', () => {
    const e = jouer(
      neuf(),
      { type: 'poser', bloc: 'bloc-mar', case: 0 },
      { type: 'poser', bloc: 'bloc-che', case: 0 },
    );
    expect(e.dernierRefus?.motif).toBe('case-occupee');
    expect(e.etapes[0]?.nbErreurs).toBe(0);
    expect(e.acquis['bloc-che']).toBeUndefined();
    expect(e.etapes[0]?.restantes).toEqual(['bloc-che']);
  });

  it('case hors de la solution : refus bienveillant, jamais d’exception', () => {
    const e = jouer(neuf(), { type: 'poser', bloc: 'bloc-mar', case: 7 });
    expect(e.dernierRefus).not.toBeNull();
    expect(e.acquis['bloc-mar']).toBeUndefined();
  });

  it('poser SANS case : comportement d’avant, à l’identique', () => {
    const faux = jouer(neuf(), { type: 'poser', bloc: 'bloc-che' });
    expect(faux.dernierRefus?.motif).toBe('bloc-hors-ordre');
    expect(faux.etapes[0]?.nbErreurs).toBe(1);
    const bon = jouer(neuf(), { type: 'poser', bloc: 'bloc-mar' }, { type: 'poser', bloc: 'bloc-che' });
    expect(bon.etapes[0]?.finMs).not.toBeNull();
    expect(bon.etapes[0]?.nbErreurs).toBe(0);
    expect(bon.acquis['bloc-mar']).toBe('2');
    expect(bon.acquis['bloc-che']).toBe('1');
  });

  it('modeReponse reste « ordre » et nbElements est inchangé', () => {
    const e = jouer(neuf(), { type: 'poser', bloc: 'bloc-che', case: 1 });
    expect(e.etapes[0]?.modeReponse).toBe('ordre');
    expect(e.etapes[0]?.nbElements).toBe(2);
  });
});
