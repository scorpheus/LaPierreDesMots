/**
 * Validation du moteur `paires` — lot L2-E. Fonction pure.
 *
 * Elle n'est appelée qu'au SECOND tap : le premier ne juge rien, il retourne. C'est traité
 * dans `moteur.ts`, et c'est ce qui rend « retourner une carte » gratuit.
 */

import { axeDeLaPaire } from '../../pedagogie/miroir.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { ContenuPaires, EtatPaires, IdCarte, MotifRefusPaires } from './types.js';

export const REFUS_PAIRES_COMPTE_ERREUR: Readonly<Record<MotifRefusPaires, boolean>> = {
  'paire-fausse': true,
  'paire-hors-consigne': false,
  'carte-deja-appariee': false,
  'meme-carte': false,
  'carte-inconnue': false,
};

/** Appariement : `p_devinette` vaut 1/n! et se calcule au BKT, jamais ici (D13). */
export function modeReponsePaires(_contenu: ContenuPaires): ModeReponse {
  return 'appariement';
}

export interface DecisionPaires {
  readonly acceptee: boolean;
  readonly motif: MotifRefusPaires | null;
  readonly compteErreur: boolean;
  readonly etapeSatisfaite: boolean;
  readonly exerciceTermine: boolean;
  readonly confusion: ConfusionObservee | null;
  readonly acquis: readonly [string, string] | null;
}

const REFUS = (
  motif: MotifRefusPaires,
  confusion: ConfusionObservee | null = null,
): DecisionPaires => ({
  acceptee: false,
  motif,
  compteErreur: REFUS_PAIRES_COMPTE_ERREUR[motif],
  etapeSatisfaite: false,
  exerciceTermine: false,
  confusion,
  acquis: null,
});

/** `premiere` est la carte déjà retournée, `seconde` celle que l'enfant vient de taper. */
export function evaluerPaires(
  etat: EtatPaires,
  premiere: IdCarte,
  seconde: IdCarte,
): DecisionPaires {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined || etat.termineMs !== null) return REFUS('paire-hors-consigne');
  if (premiere === seconde) return REFUS('meme-carte');

  const a = etat.cartes.find((c) => c.id === premiere);
  const b = etat.cartes.find((c) => c.id === seconde);
  if (a === undefined || b === undefined) return REFUS('carte-inconnue');
  if (etat.acquis[a.paire] !== undefined || etat.acquis[b.paire] !== undefined) {
    return REFUS('carte-deja-appariee');
  }

  if (a.paire !== b.paire) {
    return REFUS('paire-fausse', {
      attendu: a.libelle,
      rendu: b.libelle,
      axe: axeDeLaPaire(a.libelle, b.libelle),
      competence: etat.competence,
    });
  }
  if (!etape.restantes.includes(a.paire)) return REFUS('paire-hors-consigne');

  const etapeSatisfaite = etape.restantes.length === 1;
  return {
    acceptee: true,
    motif: null,
    compteErreur: false,
    etapeSatisfaite,
    exerciceTermine: etapeSatisfaite && etat.indexEtape === etat.etapes.length - 1,
    confusion: null,
    acquis: [a.paire, 'appariee'],
  };
}
