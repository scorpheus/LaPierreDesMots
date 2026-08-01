/**
 * Validation du moteur `grave` — lot L2-E. Fonction pure.
 */

import { axeDeLaPaire } from '../../pedagogie/miroir.js';
import { comparerNormalise } from '../../texte.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { ContenuGrave, EtatGrave, MotifRefusGrave } from './types.js';

export const REFUS_GRAVE_COMPTE_ERREUR: Readonly<Record<MotifRefusGrave, boolean>> = {
  'lettre-fausse': true,
  'trous-remplis': false,
  'lettre-hors-clavier': false,
};

/** Saisie : `p_devinette` est le plus bas du référentiel (0,01 en D13). */
export function modeReponseGrave(_contenu: ContenuGrave): ModeReponse {
  return 'saisie';
}

export interface DecisionGrave {
  readonly acceptee: boolean;
  readonly motif: MotifRefusGrave | null;
  readonly compteErreur: boolean;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  readonly confusion: ConfusionObservee | null;
  readonly acquis: readonly [string, string] | null;
}

const REFUS = (
  motif: MotifRefusGrave,
  confusion: ConfusionObservee | null = null,
): DecisionGrave => ({
  acceptee: false,
  motif,
  compteErreur: REFUS_GRAVE_COMPTE_ERREUR[motif],
  etapeSatisfaite: false,
  exerciceTermine: false,
  confusion,
  acquis: null,
});

export function evaluerGrave(etat: EtatGrave, lettre: string): DecisionGrave {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined || etat.termineMs !== null) return REFUS('trous-remplis');
  if (!etat.clavier.includes(lettre)) return REFUS('lettre-hors-clavier');

  const idTrou = etape.restantes[0];
  if (idTrou === undefined) return REFUS('trous-remplis');
  const trou = etat.trous.find((t) => t.id === idTrou);
  if (trou === undefined) return REFUS('trous-remplis');

  // `comparerNormalise` : la casse et les diacritiques ne sont pas ce qu'on évalue ici.
  if (!comparerNormalise(trou.attendu, lettre)) {
    return REFUS('lettre-fausse', {
      attendu: trou.attendu,
      rendu: lettre,
      // LE point qui rend ce moteur utile : `b` gravé pour `d` est une confusion
      // gauche-droite, `b` pour `p` une confusion haut-bas. Jamais les deux en bloc (D23).
      axe: axeDeLaPaire(trou.attendu, lettre),
      competence: etat.competence,
    });
  }

  const etapeSatisfaite = etape.restantes.length === 1;
  return {
    acceptee: true,
    motif: null,
    compteErreur: false,
    etapeSatisfaite,
    exerciceTermine: etapeSatisfaite && etat.indexEtape === etat.etapes.length - 1,
    confusion: null,
    acquis: [idTrou, lettre],
  };
}
