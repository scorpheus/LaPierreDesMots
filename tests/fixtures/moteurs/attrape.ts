/**
 * Fixture de contenu du moteur `attrape` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurAttrape.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurAttrape.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuAttrape } from '@partage/moteurs/attrape/types';

export const contenuAttrape: ContenuAttrape = {
  consignes: [
    {
      id: 'c1',
      texte: 'Attrape la lettre « b ».',
      forme: 'imperative',
      audio: null,
      aAttraper: ['lettre-b'],
      motsCles: ['attrape', 'lettre'],
    },
    {
      id: 'c2',
      texte: 'Attrape la lettre « p ».',
      forme: 'imperative',
      audio: null,
      aAttraper: ['lettre-p'],
      motsCles: ['attrape', 'lettre'],
    },
  ],
  cibles: [
    {
      id: 'lettre-b',
      libelle: 'b',
      bonne: true,
      asset: null,
      depart: [100, 100],
      taille: [140, 140],
      confusionAvec: null,
    },
    {
      id: 'lettre-p',
      libelle: 'p',
      bonne: true,
      asset: null,
      depart: [400, 100],
      taille: [140, 140],
      confusionAvec: null,
    },
    {
      id: 'lettre-d',
      libelle: 'd',
      bonne: false,
      asset: null,
      depart: [700, 100],
      taille: [140, 140],
      confusionAvec: 'b',
    },
  ],
  competence: 'gph.b.d',
};
