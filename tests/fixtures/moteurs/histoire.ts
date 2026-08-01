/**
 * Fixture de contenu du moteur `histoire` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurHistoire.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurHistoire.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuHistoire } from '@partage/moteurs/histoire/types';

export const contenuHistoire: ContenuHistoire = {
  titre: 'Le loup et la lune',
  recit:
    'Le loup sort la nuit. Il regarde la lune. Il n’a pas peur du noir, mais il ' +
    'préfère rentrer avant le jour.',
  audioRecit: null,
  questions: [
    {
      id: 'c1',
      texte: 'Le loup sort la nuit.',
      audio: null,
      options: ['opt-vrai', 'opt-faux'],
      reponse: 'opt-vrai',
      motsCles: ['loup', 'nuit'],
    },
  ],
  options: [
    { id: 'opt-vrai', libelle: 'vrai', confusionAvec: null },
    { id: 'opt-faux', libelle: 'faux', confusionAvec: 'vrai' },
  ],
  competence: 'comp.texte.court',
};
