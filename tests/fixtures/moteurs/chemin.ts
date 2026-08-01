/**
 * Fixture de contenu du moteur `chemin` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurChemin.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurChemin.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuChemin } from '@partage/moteurs/chemin/types';

export const contenuChemin: ContenuChemin = {
  consignes: [
    {
      id: 'c1',
      texte: 'Suis les cases où tu entends [u].',
      forme: 'imperative',
      audio: null,
      depart: 'case-depart',
      parcours: ['case-loup', 'case-roue'],
      motsCles: ['suis', 'cases'],
    },
  ],
  cases: [
    {
      id: 'case-depart',
      libelle: 'départ',
      position: [80, 300],
      voisines: ['case-loup', 'case-long'],
      confusionAvec: null,
    },
    {
      id: 'case-loup',
      libelle: 'loup',
      position: [300, 200],
      voisines: ['case-depart', 'case-roue'],
      confusionAvec: null,
    },
    {
      id: 'case-long',
      libelle: 'long',
      position: [300, 420],
      voisines: ['case-depart'],
      confusionAvec: 'loup',
    },
    {
      id: 'case-roue',
      libelle: 'roue',
      position: [560, 200],
      voisines: ['case-loup'],
      confusionAvec: null,
    },
  ],
  competence: 'gph.ou',
};
