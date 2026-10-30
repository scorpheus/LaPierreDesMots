/**
 * Retour du parent du 12 oct. 2026 (tableau, E16, galeries-04) : « les mots sont dans l'ordre et
 * pas mélangés », alors que le même exercice ailleurs (E12) les mélange. Même moteur : le réducteur
 * mélange bien `etat.elements` (Alea), mais l'écran rendait `contenu.elements`, l'ordre du fichier —
 * tous les « b » puis tous les « d ». Invisible sur le décor (positions dérivées), flagrant dès que
 * le repli en grille range les mots en flux : l'ordre du fichier donne la réponse.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { moteurTri } from '@partage/moteurs/tri/moteur';
import { MoteurTri } from '@client/moteurs/tri/MoteurTri';
import type { ContenuTri } from '@partage/moteurs/tri/types';
import type { Exercice, Habillage } from '@pierre/partage';
import type { ServicesJeu } from '@client/moteurs/types';

import { aleaDeTest, horlogeDeTest, lireJson, servicesDeTest } from '../configuration/preparation.js';

const habillage = lireJson<Habillage>('contenu/habillages/galeries/grottes.habillage.json');
const contenu = lireJson<Exercice>('contenu/exercices/galeries/grottes-bd-01.json').jeu.contenu as ContenuTri;

const services: ServicesJeu = {
  ...servicesDeTest(),
  haptique: { vibrer(): void {}, disponible: false },
  retour: {
    async depotCorrect(): Promise<void> {},
    async depotRefuse(): Promise<void> {},
    async palierFranchi(): Promise<void> {},
    reinitialiserSerie(): void {},
    animationsDesactivees: true,
  },
};

afterEach(() => {
  cleanup();
});

describe('tri — les mots se présentent dans l’ordre mélangé du moteur (E16)', () => {
  it('l’ordre rendu est celui de l’état, pas celui du fichier', () => {
    const etat = moteurTri.creerEtat({ contenu, habillage, alea: aleaDeTest(), horloge: horlogeDeTest() });
    const ordreEtat = etat.elements.map((e) => e.id);
    const ordreFichier = contenu.elements.map((e) => e.id);
    // Garde de la mesure : si le mélange rendait l'ordre du fichier, ce test ne prouverait rien.
    expect(ordreEtat).not.toEqual(ordreFichier);

    const { container } = render(
      <MoteurTri contenu={contenu} habillage={habillage} etat={etat} emettre={() => {}} services={services} animationsDesactivees />,
    );
    const ordreRendu = [...container.querySelectorAll('.tri-mots [data-element]')].map((n) => n.getAttribute('data-element'));
    expect(ordreRendu).toEqual(ordreEtat);
  });
});

describe('tri — aucune fente jaune (E25)', () => {
  // Retour du parent du 12 oct. (E25) : « les trois premiers mots, les cases sont jaunes […] autant
  // le mettre blanc partout, c'est un reste d'avant ». Les fentes de l'étape courante s'allumaient
  // en jaune, alors que tri n'affiche plus d'étapes (E03) et accepte tout mot dans son bon panier.
  it('aucune fente n’est marquée comme la prochaine attendue', () => {
    const etat = moteurTri.creerEtat({ contenu, habillage, alea: aleaDeTest(), horloge: horlogeDeTest() });
    const { container } = render(
      <MoteurTri contenu={contenu} habillage={habillage} etat={etat} emettre={() => {}} services={services} animationsDesactivees />,
    );
    expect(container.querySelectorAll('[data-fente]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-fente][data-prochaine="oui"]').length).toBe(0);
  });
});
