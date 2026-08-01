/**
 * Validation du moteur `histoire` — lot L2-E. Fonction pure.
 */

import { axeDeLaPaire } from '../../pedagogie/miroir.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type {
  ContenuHistoire,
  EtatHistoire,
  IdOptionHistoire,
  MotifRefusHistoire,
} from './types.js';

export const REFUS_HISTOIRE_COMPTE_ERREUR: Readonly<Record<MotifRefusHistoire, boolean>> = {
  'option-fausse': true,
  'option-hors-question': false,
  'question-deja-repondue': false,
  'option-inconnue': false,
};

/**
 * **Le mode se déduit du nombre d'options de CHAQUE question**, pas de l'exercice (D13).
 * Un exercice mêlant deux vrai/faux et deux QCM à trois options a deux `p_devinette`
 * différents ; les confondre est précisément ce que D13 interdit.
 */
export function modeReponseHistoire(contenu: ContenuHistoire, indexEtape: number): ModeReponse {
  const question = contenu.questions[indexEtape];
  const nb = question === undefined ? 2 : question.options.length;
  if (nb <= 2) return 'vrai-faux';
  if (nb === 3) return 'qcm-3';
  return 'qcm-4';
}

export interface DecisionHistoire {
  readonly acceptee: boolean;
  readonly motif: MotifRefusHistoire | null;
  readonly compteErreur: boolean;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  readonly confusion: ConfusionObservee | null;
  readonly acquis: readonly [string, string] | null;
}

const REFUS = (
  motif: MotifRefusHistoire,
  confusion: ConfusionObservee | null = null,
): DecisionHistoire => ({
  acceptee: false,
  motif,
  compteErreur: REFUS_HISTOIRE_COMPTE_ERREUR[motif],
  etapeSatisfaite: false,
  exerciceTermine: false,
  confusion,
  acquis: null,
});

export function evaluerHistoire(etat: EtatHistoire, option: IdOptionHistoire): DecisionHistoire {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined || etat.termineMs !== null) return REFUS('option-hors-question');

  const declaree = etat.options.find((o) => o.id === option);
  if (declaree === undefined) return REFUS('option-inconnue');
  if (etat.acquis[option] !== undefined) return REFUS('question-deja-repondue');

  const attendue = etape.restantes[0];
  if (attendue === undefined) return REFUS('option-hors-question');

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
