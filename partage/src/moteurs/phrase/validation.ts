/**
 * Validation du moteur `phrase` — lot L2-E. Fonction pure.
 */

import { axeDeLaPaire } from '../../pedagogie/miroir.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { ContenuPhrase, EtatPhrase, IdEtiquette, MotifRefusPhrase } from './types.js';

export const REFUS_PHRASE_COMPTE_ERREUR: Readonly<Record<MotifRefusPhrase, boolean>> = {
  'etiquette-hors-ordre': true,
  'etiquette-intruse': true,
  'etiquette-deja-placee': false,
  'etiquette-inconnue': false,
};

/** Ordre : `p_devinette` vaut 1/n!, calculé au BKT depuis le nombre d'étiquettes (D13). */
export function modeReponsePhrase(_contenu: ContenuPhrase): ModeReponse {
  return 'ordre';
}

export interface DecisionPhrase {
  readonly acceptee: boolean;
  readonly motif: MotifRefusPhrase | null;
  readonly compteErreur: boolean;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  readonly confusion: ConfusionObservee | null;
  readonly acquis: readonly [string, string] | null;
}

const REFUS = (
  motif: MotifRefusPhrase,
  confusion: ConfusionObservee | null = null,
): DecisionPhrase => ({
  acceptee: false,
  motif,
  compteErreur: REFUS_PHRASE_COMPTE_ERREUR[motif],
  etapeSatisfaite: false,
  exerciceTermine: false,
  confusion,
  acquis: null,
});

export function evaluerPhrase(etat: EtatPhrase, etiquette: IdEtiquette): DecisionPhrase {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined || etat.termineMs !== null) return REFUS('etiquette-hors-ordre');

  const declaree = etat.etiquettes.find((e) => e.id === etiquette);
  if (declaree === undefined) return REFUS('etiquette-inconnue');
  if (etat.acquis[etiquette] !== undefined) return REFUS('etiquette-deja-placee');

  const attendue = etape.restantes[0];
  if (attendue === undefined) return REFUS('etiquette-hors-ordre');

  if (attendue !== etiquette) {
    const cible = etat.etiquettes.find((e) => e.id === attendue);
    const confusion: ConfusionObservee | null =
      cible === undefined
        ? null
        : {
            attendu: cible.mot,
            rendu: declaree.mot,
            axe: axeDeLaPaire(cible.mot, declaree.mot),
            competence: etat.competence,
          };
    return REFUS(declaree.intrus ? 'etiquette-intruse' : 'etiquette-hors-ordre', confusion);
  }

  const etapeSatisfaite = etape.restantes.length === 1;
  return {
    acceptee: true,
    motif: null,
    compteErreur: false,
    etapeSatisfaite,
    exerciceTermine: etapeSatisfaite && etat.indexEtape === etat.etapes.length - 1,
    confusion: null,
    acquis: [etiquette, String(etape.restantes.length)],
  };
}
