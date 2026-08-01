/**
 * Fixture de contenu du moteur `libre` — SOURCE UNIQUE.
 *
 * Extraite de `tests/composants/MoteurLibre.test.tsx` à l'intégration de la campagne v2, sans
 * en changer une valeur. Motif : deux suites en ont besoin, et une fixture recopiée est deux
 * fixtures qui divergent.
 *
 *   - `tests/composants/MoteurLibre.test.tsx` monte le composant dessus, et **valide cette
 *     fixture par le schéma que le moteur publie** — un contenu inexprimable ne prouve rien ;
 *   - `tests/unitaires/moteurs-reducteurs.test.ts` fait passer le réducteur pur par toutes
 *     ses branches d'action.
 *
 * La validation par schéma reste chez l'appelant : c'est elle qui empêche cette fixture de
 * dériver vers un contenu qu'aucun exercice réel ne pourrait avoir.
 */
import type { ContenuLibre } from '@partage/moteurs/libre/types';

export const contenuLibre: ContenuLibre = {
  regions: ['chaudron-ventre', 'anse', 'flamme'],
  nuancierAutorise: ['rouge', 'orange', 'jaune'],
  competence: 'libre.aucune',
};
