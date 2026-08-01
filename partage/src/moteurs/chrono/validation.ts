/**
 * Validation du moteur `chrono` — lot L2-E. Fonction pure.
 */

import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { ContenuChrono, EtatChrono, IdVignette, MotifRefusChrono } from './types.js';

export const REFUS_CHRONO_COMPTE_ERREUR: Readonly<Record<MotifRefusChrono, boolean>> = {
  'vignette-hors-ordre': true,
  'vignette-deja-numerotee': false,
  'vignette-inconnue': false,
};

/** Ordre : `p_devinette` vaut 1/n!, calculé au BKT depuis le nombre de vignettes (D13). */
export function modeReponseChrono(_contenu: ContenuChrono): ModeReponse {
  return 'ordre';
}

export interface DecisionChrono {
  readonly acceptee: boolean;
  readonly motif: MotifRefusChrono | null;
  readonly compteErreur: boolean;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  readonly confusion: ConfusionObservee | null;
  readonly acquis: readonly [string, string] | null;
}

const REFUS = (
  motif: MotifRefusChrono,
  confusion: ConfusionObservee | null = null,
): DecisionChrono => ({
  acceptee: false,
  motif,
  compteErreur: REFUS_CHRONO_COMPTE_ERREUR[motif],
  etapeSatisfaite: false,
  exerciceTermine: false,
  confusion,
  acquis: null,
});

export function evaluerChrono(etat: EtatChrono, vignette: IdVignette): DecisionChrono {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined || etat.termineMs !== null) return REFUS('vignette-hors-ordre');

  const declaree = etat.vignettes.find((v) => v.id === vignette);
  if (declaree === undefined) return REFUS('vignette-inconnue');
  if (etat.acquis[vignette] !== undefined) return REFUS('vignette-deja-numerotee');

  const attendue = etape.restantes[0];
  if (attendue === undefined) return REFUS('vignette-hors-ordre');

  if (attendue !== vignette) {
    const cible = etat.vignettes.find((v) => v.id === attendue);
    // Une inversion chronologique n'est PAS une confusion miroir : `axe` reste `null`, et
    // c'est délibéré. Renseigner un axe ici ferait entrer du bruit dans le top 10 de D23.
    const confusion: ConfusionObservee | null =
      cible === undefined
        ? null
        : {
            attendu: cible.libelle,
            rendu: declaree.libelle,
            axe: null,
            competence: etat.competence,
          };
    return REFUS('vignette-hors-ordre', confusion);
  }

  const etapeSatisfaite = etape.restantes.length === 1;
  return {
    acceptee: true,
    motif: null,
    compteErreur: false,
    etapeSatisfaite,
    exerciceTermine: etapeSatisfaite && etat.indexEtape === etat.etapes.length - 1,
    confusion: null,
    // Le numéro attribué : total moins ce qu'il reste, plus un.
    acquis: [vignette, String(etape.restantes.length)],
  };
}
