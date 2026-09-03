/**
 * Fixture de contenu du moteur `chrono` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurChrono.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurChrono.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuChrono } from '@partage/moteurs/chrono/types';

export const contenuChrono: ContenuChrono = {
  consignes: [
    {
      id: 'c1',
      texte: 'Numérote les images dans l’ordre.',
      forme: 'imperative',
      audio: null,
      recit: 'Le loup se réveille, puis il sort, puis il regarde la lune.',
      ordre: ['vig-reveil', 'vig-sortie', 'vig-lune'],
      motsCles: ['numérote', 'images', 'ordre'],
    },
  ],
  vignettes: [
    { id: 'vig-reveil', libelle: 'il se réveille', asset: 'assets/vignettes/reveil.png', taille: [200, 160] },
    { id: 'vig-sortie', libelle: 'il sort', asset: null, taille: [200, 160] },
    { id: 'vig-lune', libelle: 'il regarde la lune', asset: null, taille: [200, 160] },
  ],
  competence: 'comp.chronologie',
};
