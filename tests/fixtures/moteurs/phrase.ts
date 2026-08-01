/**
 * Fixture de contenu du moteur `phrase` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurPhrase.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurPhrase.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuPhrase } from '@partage/moteurs/phrase/types';

export const contenuPhrase: ContenuPhrase = {
  consignes: [
    {
      id: 'c1',
      texte: 'Remets les mots dans l’ordre.',
      forme: 'imperative',
      audio: null,
      phrase: 'Le loup dort.',
      ordre: ['etiq-le', 'etiq-loup', 'etiq-dort'],
      motsCles: ['remets', 'mots', 'ordre'],
    },
  ],
  etiquettes: [
    { id: 'etiq-le', mot: 'Le', intrus: false },
    { id: 'etiq-loup', mot: 'loup', intrus: false },
    { id: 'etiq-dort', mot: 'dort.', intrus: false },
  ],
  competence: 'comp.phrase.ordre',
};
