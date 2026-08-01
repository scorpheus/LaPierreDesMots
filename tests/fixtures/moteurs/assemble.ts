/**
 * Fixture de contenu du moteur `assemble` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurAssemble.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurAssemble.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuAssemble } from '@partage/moteurs/assemble/types';

export const contenuAssemble: ContenuAssemble = {
  consignes: [
    {
      id: 'c1',
      texte: 'Assemble le mot « tapis ».',
      forme: 'imperative',
      audio: null,
      mot: 'tapis',
      solution: ['bloc-ta', 'bloc-pis'],
      motsCles: ['assemble', 'mot'],
    },
  ],
  blocs: [
    { id: 'bloc-ta', libelle: 'ta', intrus: false, confusionAvec: null },
    { id: 'bloc-pis', libelle: 'pis', intrus: false, confusionAvec: null },
    { id: 'bloc-bis', libelle: 'bis', intrus: true, confusionAvec: 'pis' },
  ],
  competence: 'syl.simple',
};
