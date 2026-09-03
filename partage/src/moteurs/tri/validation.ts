/**
 * Validation du moteur `tri` — lot L2-E. Fonction pure : elle ne construit aucun état.
 */

import { axeDeLaPaire } from '../../pedagogie/miroir.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { ContenuTri, EtatTri, IdElementTri, IdReceptacle, MotifRefusTri } from './types.js';

/** R16, sans exception : 24 px de tolérance sur toute zone de dépôt. */
export const TOLERANCE_TRI_PX = 24;

/**
 * Un motif sur cinq compte comme erreur de lecture. `element-deja-range` est le double-tap,
 * `element-inconnu` et `receptacle-inconnu` sont des gestes manqués : un geste ne coûte rien
 * (contrat v1 § 5.5).
 */
export const REFUS_TRI_COMPTE_ERREUR: Readonly<Record<MotifRefusTri, boolean>> = {
  'mauvais-receptacle': true,
  'element-hors-consigne': false,
  'element-deja-range': false,
  'element-inconnu': false,
  'receptacle-inconnu': false,
};

/**
 * `p_devinette` se DÉRIVE du nombre de réceptacles (D13) : deux réceptacles, c'est un
 * vrai/faux déguisé, et l'enfant a une chance sur deux en tapant au hasard.
 */
export function modeReponseTri(contenu: ContenuTri): ModeReponse {
  return contenu.receptacles.length <= 2 ? 'vrai-faux' : 'qcm-3';
}

export interface DecisionTri {
  readonly acceptee: boolean;
  readonly motif: MotifRefusTri | null;
  readonly compteErreur: boolean;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  readonly confusion: ConfusionObservee | null;
  /** `[clé, valeur]` inscrit définitivement ; la clé sort aussi de `restantes`. */
  readonly acquis: readonly [string, string] | null;
}

const REFUS = (motif: MotifRefusTri, confusion: ConfusionObservee | null = null): DecisionTri => ({
  acceptee: false,
  motif,
  compteErreur: REFUS_TRI_COMPTE_ERREUR[motif],
  etapeSatisfaite: false,
  exerciceTermine: false,
  confusion,
  acquis: null,
});

export function evaluerTri(
  etat: EtatTri,
  element: IdElementTri,
  receptacle: IdReceptacle,
): DecisionTri {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined || etat.termineMs !== null) return REFUS('element-hors-consigne');

  const declare = etat.elements.find((e) => e.id === element);
  if (declare === undefined) return REFUS('element-inconnu');
  if (!etat.receptacles.some((r) => r.id === receptacle)) return REFUS('receptacle-inconnu');
  if (etat.acquis[element] !== undefined) return REFUS('element-deja-range');
  if (declare.receptacleAttendu !== receptacle) {
    const confusion: ConfusionObservee | null =
      declare.confusionAvec === null
        ? null
        : {
            attendu: declare.libelle,
            rendu: declare.confusionAvec,
            // L'axe vient de `axeDeLaPaire`, jamais d'une supposition : `null` quand les deux
            // formes ne sont pas une paire miroir connue. Annoncer un axe faux fausserait
            // l'indicateur le plus important du dashboard (D23).
            axe: axeDeLaPaire(declare.libelle, declare.confusionAvec),
            competence: etat.competence,
          };
    return REFUS('mauvais-receptacle', confusion);
  }

  const restantes = etape.restantes.filter((e) => e !== element);
  const etapeSatisfaite = restantes.length === 0;
  return {
    acceptee: true,
    motif: null,
    compteErreur: false,
    etapeSatisfaite,
    exerciceTermine: etapeSatisfaite && etat.indexEtape === etat.etapes.length - 1,
    confusion: null,
    acquis: [element, receptacle],
  };
}
