/**
 * Les choix d'une même cible pédagogique restent libres : on ne transforme jamais l'ordre
 * d'un JSON ou d'un plateau en réponse cachée. Ces cas sont volontairement au niveau des
 * moteurs purs : ils empêchent une interface future de masquer une règle invalide.
 */
import { describe, expect, it } from 'vitest';

import { moteurPaires } from '@partage/moteurs/paires/moteur';
import { moteurTri } from '@partage/moteurs/tri/moteur';
import type { ContenuPaires } from '@partage/moteurs/paires/types';
import type { ContenuTri } from '@partage/moteurs/tri/types';
import type { Habillage } from '@pierre/partage';

import { aleaDeTest, horlogeDeTest, lireJson } from '../configuration/preparation.js';
import { contenuPaires } from '../fixtures/moteurs/paires.js';
import { contenuTri } from '../fixtures/moteurs/tri.js';

const habillage = lireJson<Habillage>('contenu/habillages/clairiere/lianes.habillage.json');

describe('liberté de choix dans la cible courante', () => {
  it('paires accepte une paire correcte d’un groupe ultérieur avant la première', () => {
    const contenu: ContenuPaires = {
      ...contenuPaires,
      consignes: [
        contenuPaires.consignes[0]!,
        { ...contenuPaires.consignes[0]!, id: 'c2', aApparier: ['paire-roue'] },
      ],
    };
    const alea = aleaDeTest();
    const horloge = horlogeDeTest();
    let etat = moteurPaires.creerEtat({ contenu, habillage, alea, horloge });

    etat = moteurPaires.reduire(etat, { type: 'retourner', carte: 'carte-img-roue' }, { alea, horloge });
    etat = moteurPaires.reduire(etat, { type: 'retourner', carte: 'carte-mot-roue' }, { alea, horloge });

    expect(etat.acquis['paire-roue']).toBe('appariee');
    expect(etat.dernierRefus).toBeNull();
  });

  it('tri accepte les éléments valides de la cible courante dans l’ordre choisi par l’enfant', () => {
    const contenu: ContenuTri = {
      ...contenuTri,
      consignes: [{ ...contenuTri.consignes[0]!, aRanger: ['mot-loup', 'mot-long'] }],
    };
    const alea = aleaDeTest();
    const horloge = horlogeDeTest();
    let etat = moteurTri.creerEtat({ contenu, habillage, alea, horloge });

    etat = moteurTri.reduire(etat, { type: 'deposer', element: 'mot-long', receptacle: 'panier-on' }, { alea, horloge });
    expect(etat.acquis['mot-long']).toBe('panier-on');
    expect(etat.etapes[0]?.restantes).toEqual(['mot-loup']);

    etat = moteurTri.reduire(etat, { type: 'deposer', element: 'mot-loup', receptacle: 'panier-ou' }, { alea, horloge });
    expect(etat.termineMs).not.toBeNull();
  });

});
