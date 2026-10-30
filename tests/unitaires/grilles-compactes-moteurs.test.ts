/** Les replis compacts sont géométriques : les tester sans navigateur rend chaque collision lisible. */
import { describe, expect, it } from 'vitest';

import {
  derivationImposeGrilleChemin,
} from '@client/moteurs/chemin/MoteurChemin.js';
import { composerCartesPaires } from '@client/moteurs/paires/composition.js';

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

  // La grille ESTIMÉE de chemin (`composerGrilleCompacteChemin`) est retirée le 30 oct. 2026 :
  // le moteur mesure ses cases après rendu (socle du 9 oct.). L'absence de recouvrement se juge
  // désormais sur le DOM, par la garde `tests/qualite/socle-activite.spec.ts` (S8, S10).
});
