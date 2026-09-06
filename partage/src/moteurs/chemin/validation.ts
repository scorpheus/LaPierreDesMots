/**
 * Validation du moteur `chemin` — lot L2-E. Fonction pure.
 */

import { axeDeLaPaire } from '../../pedagogie/miroir.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { ContenuChemin, EtatChemin, IdCase, MotifRefusChemin } from './types.js';

export const REFUS_CHEMIN_COMPTE_ERREUR: Readonly<Record<MotifRefusChemin, boolean>> = {
  'case-hors-parcours': true,
  'case-non-adjacente': false,
  'case-deja-franchie': false,
  'case-inconnue': false,
};

/**
 * `p_devinette` se DÉRIVE du branchement réel du plateau : le nombre maximal de voisines est
 * le nombre d'options que l'enfant a devant lui à chaque pas (D13). Une valeur tabulée
 * mentirait sur un plateau en couloir, où il n'y a qu'un seul choix possible.
 */
export function modeReponseChemin(contenu: ContenuChemin): ModeReponse {
  const branchement = contenu.cases.reduce((max, c) => Math.max(max, c.voisines.length), 0);
  if (branchement <= 2) return 'vrai-faux';
  if (branchement === 3) return 'qcm-3';
  return 'qcm-4';
}

export interface DecisionChemin {
  readonly acceptee: boolean;
  readonly motif: MotifRefusChemin | null;
  readonly compteErreur: boolean;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  readonly confusion: ConfusionObservee | null;
  readonly acquis: readonly [string, string] | null;
}

const REFUS = (
  motif: MotifRefusChemin,
  confusion: ConfusionObservee | null = null,
): DecisionChemin => ({
  acceptee: false,
  motif,
  compteErreur: REFUS_CHEMIN_COMPTE_ERREUR[motif],
  etapeSatisfaite: false,
  exerciceTermine: false,
  confusion,
  acquis: null,
});

export function evaluerChemin(etat: EtatChemin, caseVisee: IdCase): DecisionChemin {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined || etat.termineMs !== null) return REFUS('case-non-adjacente');

  const declaree = etat.cases.find((c) => c.id === caseVisee);
  if (declaree === undefined) return REFUS('case-inconnue');
  if (etat.visiteesEtape.includes(caseVisee)) return REFUS('case-deja-franchie');

  const courante = etat.cases.find((c) => c.id === etat.position);
  if (courante === undefined || !courante.voisines.includes(caseVisee)) {
    // Hors de portée : le pion ne bouge pas, rien n'est compté, aucun son de refus.
    return REFUS('case-non-adjacente');
  }

  const attendue = etape.restantes[0];
  if (attendue === undefined) return REFUS('case-hors-parcours');

  if (attendue !== caseVisee) {
    const cible = etat.cases.find((c) => c.id === attendue);
    const confusion: ConfusionObservee | null =
      cible === undefined
        ? null
        : {
            attendu: cible.libelle,
            rendu: declaree.libelle,
            axe: axeDeLaPaire(cible.libelle, declaree.libelle),
            competence: etat.competence,
          };
    return REFUS('case-hors-parcours', confusion);
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
    acquis: [caseVisee, String(etape.restantes.length)],
  };
}
