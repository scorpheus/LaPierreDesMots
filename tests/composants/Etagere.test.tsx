/**
 * L'étagère RENDUE — D44, lot N6, contrat de finition v3 § 4.6.
 *
 * `etagere.test.ts` prouve que le MODÈLE porte toujours ses cases vides ; ce fichier-ci prouve
 * que l'ÉCRAN les dessine. Un composant qui filtrerait `cases.filter(c => c.obtenue)` passerait
 * le premier test et tomberait sur celui-là — et c'est exactement le défaut que D44 nomme :
 * « les emplacements non gagnés sont EN CREUX et VISIBLES ».
 * Leur petite silhouette reste donc visible, mais leur fiche en couleur demeure secrète.
 *
 * Le catalogue vient du disque réel, jamais d'une maquette.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { construireEtagere, formesDuDocument } from '@pierre/partage/monde';
import type { FormeGobi } from '@pierre/partage';
import { Etagere } from '@client/monde/Etagere';

import { INSTANT_DE_REFERENCE, lireJson } from '../configuration/preparation.js';

const CATALOGUE = { formes: formesDuDocument(lireJson('contenu/monde/gobi-stades.json')) };

function gagnee(grapheme: string): FormeGobi {
  const declaree = CATALOGUE.formes.find((forme) => forme.grapheme === grapheme)!;
  return { ...declaree, obtenueLe: INSTANT_DE_REFERENCE };
}

function monter(formes: readonly FormeGobi[] = []): ReturnType<typeof construireEtagere> {
  const etagere = construireEtagere(CATALOGUE, formes);
  render(<Etagere etagere={etagere} />);
  return etagere;
}

afterEach(cleanup);

describe('l’étagère montre TOUTES ses cases, gagnées ou non', () => {
  it('rend exactement `nbTotal` cases quand l’enfant n’a rien gagné', () => {
    const etagere = monter([]);
    const cases = document.querySelectorAll('[data-case-etagere]');
    console.log(
      `[N6] étagère montée : ${String(cases.length)} case(s) pour nbTotal=` +
        `${String(etagere.nbTotal)}, ${String(etagere.nbObtenues)} obtenue(s)`
    );
    expect(cases).toHaveLength(etagere.nbTotal);
    expect(etagere.nbTotal).toBeGreaterThan(0);
  });

  it('rend exactement `nbTotal` cases quand l’enfant en a gagné deux', () => {
    const etagere = monter([gagnee('a'), gagnee('ou')]);
    expect(document.querySelectorAll('[data-case-etagere]')).toHaveLength(etagere.nbTotal);
    expect(document.querySelectorAll('[data-obtenue="oui"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-obtenue="non"]')).toHaveLength(etagere.nbTotal - 2);
  });

  it('rend une case par graphème du modèle, dans le même ordre', () => {
    const etagere = monter([gagnee('i')]);
    const rendus = [...document.querySelectorAll('[data-case-etagere]')].map((element) =>
      element.getAttribute('data-case-etagere')
    );
    expect(rendus).toEqual(etagere.cases.map((une) => une.grapheme));
  });

  it('numérote les cases de 1 à `nbTotal`, sans trou', () => {
    const etagere = monter([]);
    const rangs = [...document.querySelectorAll('[data-case-etagere]')].map((element) =>
      Number(element.getAttribute('data-rang'))
    );
    expect(rangs).toEqual(Array.from({ length: etagere.nbTotal }, (_, index) => index + 1));
  });
});

describe('une case vide est EN CREUX, jamais cachée ni cadenassée', () => {
  it('n’applique `display: none` ni `visibility: hidden` à aucune case', () => {
    monter([gagnee('a')]);
    for (const une of document.querySelectorAll<HTMLElement>('[data-case-etagere]')) {
      expect(une.style.display).not.toBe('none');
      expect(une.style.visibility).not.toBe('hidden');
      expect(une.hasAttribute('hidden')).toBe(false);
    }
  });

  it('laisse les cases vides visibles — opacité non nulle, jamais transparentes', () => {
    monter([]);
    const vides = [...document.querySelectorAll<HTMLElement>('[data-obtenue="non"]')];
    expect(vides.length).toBeGreaterThan(0);
    for (const vide of vides) {
      expect(Number(vide.style.opacity || '1')).toBeGreaterThan(0.25);
    }
  });

  it('ne pose aucun cadenas et aucun état d’échec — R14', () => {
    monter([]);
    expect(document.querySelectorAll('[data-verrou]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
    expect(document.body.textContent).not.toContain('🔒');
  });

  it('publie le compte sur la racine : le VIDE restant se lit sans compter les vignettes', () => {
    const etagere = monter([gagnee('a'), gagnee('e'), gagnee('i')]);
    const racine = document.querySelector('[data-etagere="oui"]');
    expect(racine?.getAttribute('data-cases-total')).toBe(String(etagere.nbTotal));
    expect(racine?.getAttribute('data-cases-obtenues')).toBe('3');
    expect(racine?.getAttribute('data-cases-vides')).toBe(String(etagere.nbTotal - 3));
  });
});

describe('l’étagère garde secrètes les formes qui ne sont pas encore gagnées', () => {
  it('garde les `li` comme enfants directs et ne rend consultables que les formes acquises', () => {
    monter([gagnee('a')]);
    const dansLEtagere = document.querySelector('[data-etagere="oui"]');
    const liste = dansLEtagere?.querySelector('ul');
    expect(liste).not.toBeNull();
    expect([...liste!.children].every((enfant) => enfant.tagName === 'LI')).toBe(true);
    expect([...liste!.children].every((enfant) => !enfant.hasAttribute('role'))).toBe(true);
    expect(liste?.querySelectorAll('[data-consultable="oui"]')).toHaveLength(1);
    expect(liste?.querySelectorAll('[data-consultable="non"]')).toHaveLength(
      (liste?.children.length ?? 0) - 1
    );
  });

  it('une case vide reste visible mais ne révèle aucune fiche en couleur', () => {
    monter([]);
    const vide = document.querySelector<HTMLElement>('[data-obtenue="non"]');
    expect(vide).not.toBeNull();
    fireEvent.click(vide!);
    expect(vide?.tagName).not.toBe('BUTTON');
    expect(document.querySelector('[data-fiche-case]')).toBeNull();
  });

  it('une forme gagnée ouvre toujours sa fiche complète', () => {
    monter([gagnee('a')]);
    const gagneeA = document.querySelector<HTMLButtonElement>(
      '[data-case-etagere="a"][data-consultable="oui"]'
    );
    expect(gagneeA?.tagName).toBe('BUTTON');
    fireEvent.click(gagneeA!);
    expect(document.querySelector('[data-fiche-case="a"]')).not.toBeNull();
  });

  it('reste un écran plein même sans aucune forme — jamais de page vide', () => {
    const etagere = monter([]);
    expect(document.querySelectorAll('[data-case-etagere]')).toHaveLength(etagere.nbTotal);
    expect(document.querySelector('[data-etagere="oui"]')).not.toBeNull();
  });
});
