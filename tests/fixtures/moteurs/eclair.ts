/**
 * Fixture de contenu du moteur `eclair` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurEclair.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurEclair.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuEclair } from '@partage/moteurs/eclair/types';

export const contenuEclair: ContenuEclair = {
  consignes: [
    {
      id: 'c1',
      texte: 'Quel mot as-tu vu ?',
      mot: 'roue',
      forme: 'imperative',
      audio: null,
      expositionMs: 400,
      options: ['opt-roue', 'opt-rue'],
      reponse: 'opt-roue',
      motsCles: ['quel', 'mot'],
    },
  ],
  options: [
    { id: 'opt-roue', libelle: 'roue', bonne: true, confusionAvec: null },
    { id: 'opt-rue', libelle: 'rue', bonne: false, confusionAvec: 'roue' },
  ],
  competence: 'gph.ou',
};
