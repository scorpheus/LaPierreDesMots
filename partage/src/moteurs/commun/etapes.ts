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
  /**
   * Le palier que Gobi MONTRE. Il monte tout seul après un délai d'inactivité ou des erreurs
   * — c'est le compagnon qui propose, et il doit continuer à le faire (D26, D28).
   */
  readonly niveauAide: NiveauAide;
  /**
   * ═══════════════════════════════════════════════════════════════════════════════════════
   * Le palier que l'enfant a RÉCLAMÉ. C'est LUI qui compte, et lui seul — R15.
   *
   * LE DÉFAUT, trouvé en jouant : « ça met, tu n'as que deux étoiles parce que Gobi a aidé,
   * alors que c'est pas vrai, on l'a fait sans ». Mesuré dans `commun/delais.ts` :
   *
   *     indiceMs : 45 000     →  45 s d'INACTIVITÉ et le palier monte tout seul
   *     erreursAvantIndice : 2
   *
   * `niveauAide` servait aux DEUX usages : ce que Gobi montre, et ce que le journal retient.
   * Un enfant qui réfléchit plus de quarante-cinq secondes était donc enregistré comme aidé —
   * une étoile en moins, un BKT et un Leitner nourris d'une information fausse. Et depuis
   * R11, la porte « Prêt ? » ajoute encore du temps de lecture avant le premier geste.
   *
   * « L'aide de Gobi ne coûte rien et n'est jamais présentée comme un échec ; elle change
   * seulement le nombre d'étoiles » suppose un CHOIX. Une proposition spontanée n'en est pas
   * un — la punir revient à punir la lenteur, c'est-à-dire exactement l'enfant que ce jeu
   * vise (D14).
   * ═══════════════════════════════════════════════════════════════════════════════════════
   */
  readonly aideDemandee: NiveauAide;
  readonly nbEcoutes: number;
  readonly debutMs: number;
  readonly finMs: number | null;
  /** Instant de la PREMIÈRE action de l'enfant sur cette étape — origine de la latence. */
  readonly premiereActionMs: number | null;
  readonly modeReponse: ModeReponse;
  /**
   * ─────────────────────────────────────────────────────────────────────────────────────
   * REQUIS, ET NON FACULTATIF — correctif du lot A1 (Q-I14).
   *
   * Les modes `ordre` et `appariement` calculent `p_devinette = 1/n!` depuis ce nombre
   * (D13), et `pDevinette` LÈVE quand il manque. L'appel part de `alimenterPedagogie`,
   * DANS la transaction qui vient d'insérer la tentative : la transaction est annulée, la
   * route rend 500, et **la tentative est perdue** — écran de récompense compris.
   *
   * Le champ était facultatif sur `ResumeEtape` et absent d'ici. Résultat mesuré le
   * 2026-08-02 : **aucun** des quatorze moteurs ne le posait, alors que quatre en avaient
   * besoin — `assemble`, `chrono`, `paires`, `phrase`. Q-I14 n'en signalait qu'un et le
   * commentaire de `../types.ts` en désignait deux autres : chercher les OCCURRENCES de
   * `nbElements` ne trouve que les moteurs qui n'ont pas le défaut.
   *
   * Le rendre requis ici met l'obligation là où le compilateur la voit : les treize moteurs
   * qui passent par `resumeDepuisEtapes` doivent désormais RÉPONDRE — un nombre, ou `null`
   * assumé. L'oubli ne compile plus, au lieu de ne se voir qu'en 500 devant l'enfant.
   * ─────────────────────────────────────────────────────────────────────────────────────
   *
   * `null` pour les sept modes dont `p_devinette` est tabulée. Jamais un défaut inventé.
   */
  readonly nbElements: number | null;
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
    // R15 — ce que l'enfant a DEMANDÉ, jamais ce que Gobi a proposé de lui-même.
    aideUtilisee: etape.aideDemandee,
    nbEcoutes: etape.nbEcoutes,
    dureeMs: Math.max(0, fin - etape.debutMs),
    modeReponse: etape.modeReponse,
    latenceMs: latenceDe(etape),
    // Transporté tel quel : ce nombre n'est connu QUE du moteur, et le serveur refuse de
    // l'inventer (D13). Le recopier ici est le seul lien entre les deux.
    nbElements: etape.nbElements,
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
    if (RANG_AIDE[etape.aideDemandee] > RANG_AIDE[aideUtilisee]) aideUtilisee = etape.aideDemandee;
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
