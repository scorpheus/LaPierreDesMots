/**
 * L'étape générique et ses trois projections — lot L2-C.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.1. **Importé par L2-E** : aucun moteur ne
 * recalcule sa progression ni son résumé.
 *
 * DÉPENDANCE INVERSÉE ASSUMÉE (§ 5.2) — ce fichier importe `ModeReponse` et
 * `ConfusionObservee` de `../../pedagogie/types.js`, écrit par **L2-D**, et construit un
 * `ResumeEtape` dans sa forme ÉTENDUE par L2-D (`modeReponse`, `latenceMs`, `confusion`).
 * Tant que L2-D n'a pas rendu, ce fichier ne compile pas : c'est voulu, l'oubli ne compile
 * pas au lieu de ne se voir qu'à l'exécution.
 *
 * `reussi` vaut **toujours `true`**. Ce n'est pas un défaut de conception, c'est R14 :
 * `false` est structurellement inatteignable pour tout moteur de ce projet.
 */

import type { NiveauAide, ProgressionMoteur, ResumeEtape, ResumeTentative } from '../types.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import { RANG_AIDE } from './aide.js';

/** L'étape générique : ce que tout moteur sait dire de l'une de ses étapes. */
export interface EtapeGenerique {
  readonly identifiant: string;
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  readonly nbEcoutes: number;
  readonly debutMs: number;
  readonly finMs: number | null;
  /** Instant de la PREMIÈRE action de l'enfant sur cette étape — origine de la latence. */
  readonly premiereActionMs: number | null;
  readonly modeReponse: ModeReponse;
  readonly confusion: ConfusionObservee | null;
}

/**
 * Avancement mesuré sur les étapes CLOSES (`finMs !== null`), pas sur l'index courant.
 *
 * La nuance compte pour `place` : une consigne à trois dépôts reste ouverte tant que le
 * troisième n'est pas posé, et l'index n'a pas bougé. Compter l'index ferait bondir la
 * jauge d'un tiers de barre à chaque changement de consigne, sans rien dire des dépôts.
 */
export function progressionDepuisEtapes(
  etapes: readonly EtapeGenerique[],
  indexCourant: number,
): ProgressionMoteur {
  const etapesTotal = etapes.length;
  const closes = etapes.filter((e) => e.finMs !== null).length;
  return {
    avancement: etapesTotal === 0 ? 1 : Math.min(1, closes / etapesTotal),
    termine: etapesTotal > 0 && closes === etapesTotal,
    etapeCourante: Math.max(0, Math.min(indexCourant, etapesTotal - 1)),
    etapesTotal,
  };
}

/**
 * La latence de reconnaissance de D18 : du moment où l'étape s'ouvre au moment où
 * l'enfant agit pour la PREMIÈRE fois.
 *
 * `null` quand l'enfant n'a rien fait — et `null` n'est pas zéro. Une étape sans action
 * qui compterait `0 ms` ferait plonger la médiane du dashboard et raconterait un enfant
 * fulgurant là où il n'a rien touché. C'est l'indicateur principal du projet : il ne
 * s'invente pas.
 */
function latenceDe(etape: EtapeGenerique): number | null {
  if (etape.premiereActionMs === null) return null;
  return Math.max(0, etape.premiereActionMs - etape.debutMs);
}

export function resumeEtapeDepuis(etape: EtapeGenerique, finMs: number): ResumeEtape {
  const fin = etape.finMs ?? finMs;
  return {
    identifiant: etape.identifiant,
    nbErreurs: etape.nbErreurs,
    aideUtilisee: etape.niveauAide,
    nbEcoutes: etape.nbEcoutes,
    dureeMs: Math.max(0, fin - etape.debutMs),
    modeReponse: etape.modeReponse,
    latenceMs: latenceDe(etape),
    confusion: etape.confusion,
  };
}

/**
 * `reussi` vaut **toujours `true`** (R14). `aideUtilisee` est le palier le PLUS HAUT
 * atteint sur l'ensemble des étapes : une aide obtenue à l'étape 1 compte pour la
 * tentative entière, exactement comme `calculerEtoiles` l'attend (contrat v1 § 5.7).
 */
export function resumeDepuisEtapes(
  etapes: readonly EtapeGenerique[],
  debutMs: number,
  finMs: number,
): ResumeTentative {
  let aideUtilisee: NiveauAide = 'aucune';
  for (const etape of etapes) {
    if (RANG_AIDE[etape.niveauAide] > RANG_AIDE[aideUtilisee]) aideUtilisee = etape.niveauAide;
  }

  return {
    // TOUJOURS `true` : écrire `false` ici serait le seul endroit du dépôt d'où un écran
    // d'échec pourrait naître.
    reussi: true,
    nbErreurs: etapes.reduce((somme, e) => somme + e.nbErreurs, 0),
    aideUtilisee,
    dureeMs: Math.max(0, finMs - debutMs),
    etapes: etapes.map((e) => resumeEtapeDepuis(e, finMs)),
  };
}
