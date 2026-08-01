/**
 * Fixture de contenu du moteur `grave` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurGrave.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurGrave.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuGrave } from '@partage/moteurs/grave/types';

export const contenuGrave: ContenuGrave = {
  consignes: [
    {
      id: 'c1',
      texte: 'Grave la lettre qui manque.',
      forme: 'imperative',
      audio: null,
      mot: 'bal',
      trous: [{ id: 'trou-un', position: 0, attendu: 'b' }],
      motsCles: ['grave', 'lettre'],
    },
  ],
  clavier: ['b', 'd', 'p'],
  competence: 'gph.b.d',
};
