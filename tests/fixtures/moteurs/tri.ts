/**
 * Fixture de contenu du moteur `tri` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurTri.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurTri.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuTri } from '@partage/moteurs/tri/types';

export const contenuTri: ContenuTri = {
  consignes: [
    {
      id: 'c1',
      texte: 'Range les mots dans le bon panier.',
      forme: 'imperative',
      audio: null,
      aRanger: ['mot-loup'],
      motsCles: ['range', 'mots', 'panier'],
    },
  ],
  receptacles: [
    {
      id: 'panier-ou',
      libelle: 'le panier « ou »',
      critere: 'j’entends [u]',
      zone: [
        [40, 300],
        [400, 300],
        [400, 560],
        [40, 560],
      ],
    },
    {
      id: 'panier-on',
      libelle: 'le panier « on »',
      critere: 'j’entends [ɔ̃]',
      zone: [
        [520, 300],
        [900, 300],
        [900, 560],
        [520, 560],
      ],
    },
  ],
  elements: [
    {
      id: 'mot-loup',
      libelle: 'loup',
      asset: null,
      receptacleAttendu: 'panier-ou',
      confusionAvec: 'long',
    },
    // Le schéma exige au moins deux éléments, et il a raison : un tri à un seul élément
    // n'oppose aucun choix, donc n'exerce aucune lecture.
    {
      id: 'mot-long',
      libelle: 'long',
      asset: null,
      receptacleAttendu: 'panier-on',
      confusionAvec: 'loup',
    },
  ],
  competence: 'gph.ou',
};
