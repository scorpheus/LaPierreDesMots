/** Les replis compacts sont géométriques : les tester sans navigateur rend chaque collision lisible. */
import { describe, expect, it } from 'vitest';

import {
  composerGrilleCompacteChemin,
  derivationImposeGrilleChemin,
} from '@client/moteurs/chemin/MoteurChemin.js';
import { composerCartesPaires } from '@client/moteurs/paires/composition.js';

interface Rectangle {
  readonly gauche: number;
  readonly haut: number;
  readonly droite: number;
  readonly bas: number;
}

function rectangles(cases: readonly { x: number; y: number; largeur: number; hauteur: number }[]): readonly Rectangle[] {
  return cases.map((c) => ({
    gauche: c.x - c.largeur / 2,
    haut: c.y - c.hauteur / 2,
    droite: c.x + c.largeur / 2,
    bas: c.y + c.hauteur / 2,
  }));
}

function seChevauchent(a: Rectangle, b: Rectangle): boolean {
  return a.gauche < b.droite && b.gauche < a.droite && a.haut < b.bas && b.haut < a.bas;
}

function attendreAucuneCollision(cases: readonly { x: number; y: number; largeur: number; hauteur: number }[]): void {
  const cadres = rectangles(cases);
  for (let gauche = 0; gauche < cadres.length; gauche += 1) {
    for (let droite = gauche + 1; droite < cadres.length; droite += 1) {
      expect(seChevauchent(cadres[gauche]!, cadres[droite]!)).toBe(false);
    }
  }
}

describe('grilles compactes des moteurs posés', () => {
  it('impose le repli sur un cadre large dès que la dérivation se chevauche', () => {
    const diagnostic = { chevauchements: 1, horsBornes: 0, deborde: false };
    expect(derivationImposeGrilleChemin(diagnostic)).toBe(true);
  });

  it('ne confond pas une dérivation saine avec le repli de densité des petits écrans', () => {
    const diagnostic = { chevauchements: 0, horsBornes: 0, deborde: false };
    expect(derivationImposeGrilleChemin(diagnostic)).toBe(false);
  });

  it('paires — réserve les colonnes aux formes sans trier les identifiants de paire', () => {
    const cartes = [
      { id: 'a', face: 'image', asset: 'a.png', paire: '1' },
      { id: 'b', face: 'mot', asset: null, paire: '2' },
      { id: 'c', face: 'mot', asset: null, paire: '1' },
      { id: 'd', face: 'image', asset: 'd.png', paire: '2' },
    ];
    const composition = composerCartesPaires(cartes);
    expect(composition.mixte).toBe(true);
    expect(composition.cartes.map((carte) => carte.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(cartes.map((carte) => carte.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('paires — une image absente reste un texte et chaque carte reste présente', () => {
    const cartes = [
      { face: 'image', asset: null }, { face: 'mot', asset: null },
      { face: 'image', asset: 'c.png' },
    ];
    expect(composerCartesPaires(cartes)).toEqual({ cartes, mixte: false });
    expect(composerCartesPaires(cartes.slice(0, 2))).toEqual({ cartes: cartes.slice(0, 2), mixte: false });
  });

  it('chemin — douze cases narratives gardent leurs centres distincts pour les liaisons SVG', () => {
    const grille = composerGrilleCompacteChemin(
      Array.from({ length: 12 }, (_, rang) => ({ largeur: rang % 2 === 0 ? 620 : 340, hauteur: 104 })),
      640,
    );
    expect(grille.cases).toHaveLength(12);
    expect(grille.hauteur).toBeGreaterThan(640);
    attendreAucuneCollision(grille.cases);
  });

  it('chemin — le repli large à 1 100 px conserve les cases et leurs liaisons sans intersection', () => {
    const grille = composerGrilleCompacteChemin(
      Array.from({ length: 12 }, (_, rang) => ({ largeur: rang % 2 === 0 ? 620 : 340, hauteur: 108 })),
      1100,
    );
    expect(grille.hauteur).toBeGreaterThan(700);
    attendreAucuneCollision(grille.cases);
  });
});
