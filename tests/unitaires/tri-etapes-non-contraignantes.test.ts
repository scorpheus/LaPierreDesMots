/**
 * E03 — LES ÉTAPES DE `tri` NE CONTRAIGNENT RIEN : mesure, sur le contenu réel.
 *
 * Le parent (Docs/tableau-retours.md, E03) : « Étape 1 sur 2 : mets les mots de couleur dans le
 * panier de gauche », mais on peut ranger les deux sortes de mots en même temps.
 *
 * Ce fichier mesure ce que fait le réducteur (`partage/src/moteurs/tri/`), sans le changer :
 * `evaluerTri` n'exige que le BON PANIER, jamais l'étape courante, et `avancerEtapes` retire un
 * mot rangé en avance des étapes à venir. D'où la décision T10/E03 : `tri` n'affiche plus de
 * repère « Étape n sur N » (MoteurTri.tsx). Si un jour le réducteur imposait l'étape, ce test
 * rougirait, et le repère serait à rétablir.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Habillage } from '@pierre/partage';
import { moteurTri } from '@partage/moteurs/tri/moteur';
import type { ContenuTri } from '@partage/moteurs/tri/types';

import { aleaDeTest, horlogeDeTest, lireJson } from '../configuration/preparation.js';

const exercice = JSON.parse(
  readFileSync(join(process.cwd(), 'contenu/exercices/clairiere/paniers-couleurs-01.json'), 'utf8'),
) as { readonly id: string; readonly jeu: { readonly habillage: string; readonly contenu: ContenuTri } };

describe('E03 — tri clairiere-paniers-couleurs-01', () => {
  it('pendant l’étape 1, un mot de l’étape 2 posé dans SON panier est accepté', () => {
    const contenu = exercice.jeu.contenu;
    const habillage = lireJson<Habillage>(
      `contenu/habillages/clairiere/${exercice.jeu.habillage.split('.')[1] ?? exercice.jeu.habillage}.habillage.json`,
    );
    const alea = aleaDeTest();
    const horloge = horlogeDeTest();
    let etat = moteurTri.creerEtat({ contenu, habillage, alea, horloge });
    expect(etat.etapes).toHaveLength(2);
    expect(etat.indexEtape).toBe(0);

    const motEtape2 = etat.etapes[1]!.restantes[0]!;
    const panier = etat.elements.find((e) => e.id === motEtape2)!.receptacleAttendu;
    console.log(`[E03] étape 1 en cours ; on range « ${motEtape2} » (étape 2) dans « ${panier} »`);
    etat = moteurTri.reduire(etat, { type: 'deposer', element: motEtape2, receptacle: panier }, { alea, horloge });

    expect(etat.dernierRefus).toBeNull();
    expect(etat.acquis[motEtape2]).toBe(panier);
    expect(etat.indexEtape).toBe(0);
    expect(etat.etapes[1]!.restantes).not.toContain(motEtape2);
  });

  it('les deux sortes de mots, rangées en alternance, finissent l’exercice sans un refus', () => {
    const contenu = exercice.jeu.contenu;
    const habillage = lireJson<Habillage>(
      `contenu/habillages/clairiere/${exercice.jeu.habillage.split('.')[1] ?? exercice.jeu.habillage}.habillage.json`,
    );
    const alea = aleaDeTest();
    const horloge = horlogeDeTest();
    let etat = moteurTri.creerEtat({ contenu, habillage, alea, horloge });
    const a = [...etat.etapes[0]!.restantes];
    const b = [...etat.etapes[1]!.restantes];
    const alterne: string[] = [];
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      if (b[i] !== undefined) alterne.push(b[i]!);
      if (a[i] !== undefined) alterne.push(a[i]!);
    }
    let refus = 0;
    for (const id of alterne) {
      const panier = etat.elements.find((e) => e.id === id)!.receptacleAttendu;
      etat = moteurTri.reduire(etat, { type: 'deposer', element: id, receptacle: panier }, { alea, horloge });
      if (etat.dernierRefus !== null) refus += 1;
    }
    expect(refus).toBe(0);
    expect(etat.termineMs).not.toBeNull();
  });
});
