/**
 * Validation du moteur `attrape` — lot L2-E.
 *
 * Fonction pure : elle ne construit aucun état, `reduire` s'en sert pour le faire.
 */

import { axeDeLaPaire } from '../../pedagogie/miroir.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type {
  ContenuAttrape,
  EtatAttrape,
  IdCibleAttrape,
  MotifRefusAttrape,
} from './types.js';

/** R16 : la tolérance de tap est de 24 px. Le rendu l'applique, la logique la déclare. */
export const TOLERANCE_ATTRAPE_PX = 24;

/**
 * Un seul motif sur quatre est une erreur de LECTURE. Même raisonnement qu'au contrat
 * v1 § 5.5 : `cible-deja-attrapee` est le double-tap et `cible-inconnue` un geste manqué —
 * un geste ne coûte rien. `cible-hors-consigne` est une bonne lecture au mauvais moment.
 */
export const REFUS_ATTRAPE_COMPTE_ERREUR: Readonly<Record<MotifRefusAttrape, boolean>> = {
  'cible-intruse': true,
  'cible-hors-consigne': false,
  'cible-deja-attrapee': false,
  'cible-inconnue': false,
};

/**
 * `p_devinette` dépend du NOMBRE d'options offertes, jamais d'une valeur globale (D13).
 * On le DÉRIVE du contenu au lieu de le tabuler : deux cibles, c'est un vrai/faux déguisé.
 */
export function modeReponseAttrape(contenu: ContenuAttrape): ModeReponse {
  const nb = contenu.cibles.length;
  if (nb <= 2) return 'vrai-faux';
  if (nb === 3) return 'qcm-3';
  return 'qcm-4';
}

export interface DecisionAttrape {
  readonly acceptee: boolean;
  readonly motif: MotifRefusAttrape | null;
  readonly compteErreur: boolean;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  /** Renseignée quand le contenu déclare la confusion que cet intrus provoque (D23). */
  readonly confusion: ConfusionObservee | null;
  /**
   * Ce que l'acceptation inscrit définitivement : `[clé, valeur]`. La clé est aussi ce qui
   * sort de `restantes`. Forme commune aux onze moteurs, pour que leur réducteur soit
   * littéralement le même fichier à onze noms près (§ 4.8, « un motif appliqué onze fois »).
   */
  readonly acquis: readonly [string, string] | null;
}

const REFUS = (
  motif: MotifRefusAttrape,
  confusion: ConfusionObservee | null = null,
): DecisionAttrape => ({
  acceptee: false,
  motif,
  compteErreur: REFUS_ATTRAPE_COMPTE_ERREUR[motif],
  etapeSatisfaite: false,
  exerciceTermine: false,
  confusion,
  acquis: null,
});

/** Ne lit QUE l'état : celui-ci embarque le catalogue des cibles (voir `EtatAttrape`). */
export function evaluerAttrape(etat: EtatAttrape, cible: IdCibleAttrape): DecisionAttrape {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined || etat.termineMs !== null) return REFUS('cible-hors-consigne');

  const declaree = etat.cibles.find((c) => c.id === cible);
  if (declaree === undefined) return REFUS('cible-inconnue');
  if (etat.acquis[cible] !== undefined) return REFUS('cible-deja-attrapee');

  if (!declaree.bonne) {
    const attendu = etape.restantes[0];
    const cibleAttendue =
      attendu === undefined ? null : etat.cibles.find((c) => c.id === attendu);
    const confusion: ConfusionObservee | null =
      declaree.confusionAvec === null || cibleAttendue === null || cibleAttendue === undefined
        ? null
        : {
            attendu: cibleAttendue.libelle,
            rendu: declaree.libelle,
            // L'axe vient de `axeDeLaPaire`, jamais d'une supposition : `null` quand les deux
            // formes ne sont pas une paire miroir connue. Annoncer un axe faux fausserait
            // l'indicateur le plus important du dashboard (D23).
            axe: axeDeLaPaire(cibleAttendue.libelle, declaree.libelle),
            competence: etat.competence,
          };
    return REFUS('cible-intruse', confusion);
  }

  if (!etape.restantes.includes(cible)) return REFUS('cible-hors-consigne');

  const restantes = etape.restantes.filter((c) => c !== cible);
  const etapeSatisfaite = restantes.length === 0;
  return {
    acceptee: true,
    motif: null,
    compteErreur: false,
    etapeSatisfaite,
    exerciceTermine: etapeSatisfaite && etat.indexEtape === etat.etapes.length - 1,
    confusion: null,
    acquis: [cible, 'attrapee'],
  };
}
