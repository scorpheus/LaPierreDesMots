/**
 * Validation du moteur `assemble` — lot L2-E. Fonction pure.
 */

import { axeDeLaPaire } from '../../pedagogie/miroir.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { ContenuAssemble, EtatAssemble, IdBloc, MotifRefusAssemble } from './types.js';

export const REFUS_ASSEMBLE_COMPTE_ERREUR: Readonly<Record<MotifRefusAssemble, boolean>> = {
  'bloc-hors-ordre': true,
  'bloc-intrus': true,
  'bloc-deja-pose': false,
  'bloc-inconnu': false,
};

/**
 * `ordre` : `p_devinette` vaut 1/n! et se CALCULE depuis le nombre de blocs, jamais tabulé
 * (D13). Le moteur déclare le mode ; c'est le BKT qui fait le calcul.
 */
export function modeReponseAssemble(_contenu: ContenuAssemble): ModeReponse {
  return 'ordre';
}

export interface DecisionAssemble {
  readonly acceptee: boolean;
  readonly motif: MotifRefusAssemble | null;
  readonly compteErreur: boolean;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  readonly confusion: ConfusionObservee | null;
  readonly acquis: readonly [string, string] | null;
}

const REFUS = (
  motif: MotifRefusAssemble,
  confusion: ConfusionObservee | null = null,
): DecisionAssemble => ({
  acceptee: false,
  motif,
  compteErreur: REFUS_ASSEMBLE_COMPTE_ERREUR[motif],
  etapeSatisfaite: false,
  exerciceTermine: false,
  confusion,
  acquis: null,
});

export function evaluerAssemble(etat: EtatAssemble, bloc: IdBloc): DecisionAssemble {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined || etat.termineMs !== null) return REFUS('bloc-hors-ordre');

  const declare = etat.blocs.find((b) => b.id === bloc);
  if (declare === undefined) return REFUS('bloc-inconnu');
  if (etat.acquis[bloc] !== undefined) return REFUS('bloc-deja-pose');

  const attendu = etape.restantes[0];
  if (attendu === undefined) return REFUS('bloc-hors-ordre');

  if (attendu !== bloc) {
    const cibleAttendue = etat.blocs.find((b) => b.id === attendu);
    const confusion: ConfusionObservee | null =
      cibleAttendue === undefined
        ? null
        : {
            attendu: cibleAttendue.libelle,
            rendu: declare.libelle,
            axe: axeDeLaPaire(cibleAttendue.libelle, declare.libelle),
            competence: etat.competence,
          };
    return REFUS(declare.intrus ? 'bloc-intrus' : 'bloc-hors-ordre', confusion);
  }

  const restantes = etape.restantes.slice(1);
  const etapeSatisfaite = restantes.length === 0;
  return {
    acceptee: true,
    motif: null,
    compteErreur: false,
    etapeSatisfaite,
    exerciceTermine: etapeSatisfaite && etat.indexEtape === etat.etapes.length - 1,
    confusion: null,
    acquis: [bloc, String(etape.restantes.length)],
  };
}
