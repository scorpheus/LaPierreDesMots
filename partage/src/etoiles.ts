/**
 * Le barème d'étoiles — v2 § 6.2, repris sans variante par le contrat § 5.7.
 *
 * - ★ le nœud est terminé — **toujours acquise**
 * - ★★ terminé sans que Gobi n'intervienne
 * - ★★★ terminé sans erreur
 *
 * **C'est le seul endroit du dépôt où ce barème existe.** Un moteur qui compterait ses étoiles
 * lui-même créerait une seconde source de vérité, et le dashboard parent cesserait d'être
 * recalculable depuis le journal.
 */

import type { BaremeEtoiles } from './contenu/types.js';
import type { NombreEtoiles } from './journal/types.js';
import type { ResumeTentative } from './moteurs/types.js';

/** Par défaut, les deux critères sont évalués. */
const BAREME_COMPLET: BaremeEtoiles = { sansAide: true, sansErreur: true };

/**
 * Le compte est **additif**, pas cumulatif : `1 + (sans aide) + (sans erreur)`. Une tentative
 * aidée mais sans faute vaut donc **deux** étoiles, pas une.
 *
 * Arbitrage, parce que ni la v2 § 6.2 ni le contrat § 5.7 ne disent si la troisième étoile
 * suppose la deuxième :
 *
 * 1. Le contrat § 10 fait porter `data-etoile` (`1` `2` `3`) **et** `data-acquise`
 *    (`oui` `non`) à *chaque* étoile. Un état par étoile n'a de sens que si la troisième peut
 *    être acquise sans la deuxième — sur une échelle, les étoiles manquantes seraient
 *    toujours les dernières et un seul nombre suffirait.
 * 2. « L'aide de Gobi ne coûte rien et n'est jamais présentée comme un échec » (CLAUDE.md) :
 *    faire retomber au minimum un enfant qui a demandé de l'aide et n'a fait aucune faute
 *    punirait exactement le geste que les specs veulent rendre gratuit.
 * 3. `tests/unitaires/etoiles.test.ts` (lot L-G) encode déjà cette lecture par table.
 *
 * `bareme` dit quels critères l'exercice évalue (`jeu.etoiles` du contenu). Un critère non
 * évalué est acquis d'office : un exercice qui ne compte pas les erreurs ne doit pas priver
 * l'enfant de sa troisième étoile.
 */
export function calculerEtoiles(
  resume: ResumeTentative,
  bareme: BaremeEtoiles = BAREME_COMPLET,
): NombreEtoiles {
  if (!resume.reussi) {
    return 0;
  }
  const sansAide = !bareme.sansAide || resume.aideUtilisee === 'aucune';
  const sansErreur = !bareme.sansErreur || resume.nbErreurs === 0;
  if (sansAide && sansErreur) {
    return 3;
  }
  // La première étoile est toujours acquise (R14) ; la seconde récompense le critère tenu.
  return sansAide || sansErreur ? 2 : 1;
}
