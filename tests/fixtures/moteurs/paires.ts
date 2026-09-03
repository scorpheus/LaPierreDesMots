/**
 * Fixture de contenu du moteur `paires` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurPaires.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurPaires.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuPaires } from '@partage/moteurs/paires/types';

export const contenuPaires: ContenuPaires = {
  consignes: [
    {
      id: 'c1',
      texte: 'Retrouve le mot et son image.',
      forme: 'imperative',
      audio: null,
      aApparier: ['paire-loup'],
      motsCles: ['retrouve', 'mot', 'image'],
    },
  ],
  cartes: [
    { id: 'carte-mot-loup', libelle: 'loup', face: 'mot', asset: null, paire: 'paire-loup' },
    { id: 'carte-img-loup', libelle: 'un loup', face: 'image', asset: 'assets/cartes/loup.png', paire: 'paire-loup' },
    { id: 'carte-mot-roue', libelle: 'roue', face: 'mot', asset: null, paire: 'paire-roue' },
    { id: 'carte-img-roue', libelle: 'une roue', face: 'image', asset: null, paire: 'paire-roue' },
  ],
  competence: 'lex.mot.image',
};
