/**
 * Validation du moteur `eclair` — lot L2-E. Fonction pure.
 */

import { axeDeLaPaire } from '../../pedagogie/miroir.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { ContenuEclair, EtatEclair, IdOptionEclair, MotifRefusEclair } from './types.js';

export const REFUS_ECLAIR_COMPTE_ERREUR: Readonly<Record<MotifRefusEclair, boolean>> = {
  'option-fausse': true,
  'option-hors-consigne': false,
  'option-deja-choisie': false,
  'option-inconnue': false,
};

/**
 * `p_devinette` se DÉRIVE du nombre d'options réellement offertes (D13). Deux options, c'est
 * un vrai/faux : une valeur globale ferait monter la maîtrise estimée sur du hasard, ce que
 * l'annexe T § 1 nomme la régression pédagogique silencieuse.
 */
export function modeReponseEclair(contenu: ContenuEclair, indexEtape: number): ModeReponse {
  const consigne = contenu.consignes[indexEtape];
  const nb = consigne === undefined ? contenu.options.length : consigne.options.length;
  if (nb <= 2) return 'vrai-faux';
  if (nb === 3) return 'qcm-3';
  return 'qcm-4';
}

/**
 * La latence de reconnaissance (D18) : du moment où le mot disparaît au premier geste.
 * `null` quand l'un des deux instants manque — un indicateur inventé vaut moins que rien.
 */
export function latenceReconnaissanceMs(
  finExpositionMs: number | null,
  premiereActionMs: number | null,
): number | null {
  if (finExpositionMs === null || premiereActionMs === null) return null;
  return Math.max(0, premiereActionMs - finExpositionMs);
}

export interface DecisionEclair {
  readonly acceptee: boolean;
  readonly motif: MotifRefusEclair | null;
  readonly compteErreur: boolean;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  readonly confusion: ConfusionObservee | null;
  readonly acquis: readonly [string, string] | null;
}

const REFUS = (
  motif: MotifRefusEclair,
  confusion: ConfusionObservee | null = null,
): DecisionEclair => ({
  acceptee: false,
  motif,
  compteErreur: REFUS_ECLAIR_COMPTE_ERREUR[motif],
  etapeSatisfaite: false,
  exerciceTermine: false,
  confusion,
  acquis: null,
});

export function evaluerEclair(etat: EtatEclair, option: IdOptionEclair): DecisionEclair {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined || etat.termineMs !== null) return REFUS('option-hors-consigne');

  const declaree = etat.options.find((o) => o.id === option);
  if (declaree === undefined) return REFUS('option-inconnue');
  if (etat.acquis[option] !== undefined) return REFUS('option-deja-choisie');

  const attendue = etape.restantes[0];
  if (attendue === undefined) return REFUS('option-hors-consigne');

  if (attendue !== option) {
    const cible = etat.options.find((o) => o.id === attendue);
    const confusion: ConfusionObservee | null =
      cible === undefined
        ? null
        : {
            attendu: cible.libelle,
            rendu: declaree.libelle,
            axe: axeDeLaPaire(cible.libelle, declaree.libelle),
            competence: etat.competence,
          };
    return REFUS('option-fausse', confusion);
  }

  const etapeSatisfaite = etape.restantes.length === 1;
  return {
    acceptee: true,
    motif: null,
    compteErreur: false,
    etapeSatisfaite,
    exerciceTermine: etapeSatisfaite && etat.indexEtape === etat.etapes.length - 1,
    confusion: null,
    acquis: [option, 'juste'],
  };
}
