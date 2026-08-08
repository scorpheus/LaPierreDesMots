/**
 * Depot du journal `etapes_tentative` — APPEND-ONLY. Lot L2-D.
 *
 * Ce journal est le grain fin de `tentatives` : une ligne par etape jouee. Il porte les deux
 * informations que la tentative agregee perd et que le dashboard reclame :
 *
 * - la **latence de reconnaissance** (D18, v2 § 12.3) — l'indicateur principal ;
 * - la **confusion avec son AXE** (D23) — jamais `b/d/p/q` en bloc.
 *
 * Aucune fonction de ce fichier n'emet d'UPDATE ni de DELETE. C'est de lui que se recalculent
 * `maitrise_competence` et `items_leitner` : si on pouvait le reecrire, le recalcul cesserait
 * d'etre une preuve et le rejeu (annexe T § T2) deviendrait ininterpretable.
 *
 * Porté sur le contrat `Base` — Docs/addendum-portage-android.md § 4.
 */

import type { AxeMiroir, ModeReponse, NiveauAide } from '../../pedagogie/types.js';
import type { ConfusionObservee } from '../../pedagogie/types.js';
import type { Horodatage } from '../../identifiants.js';
import { hacherSha256Hex } from '../hachage.js';
import type { Base } from '../contrat.js';

/** Une etape a inscrire au journal. Toutes les colonnes NOT NULL sont ici obligatoires. */
export interface EtapeAJournaliser {
  readonly tentativeId: string;
  readonly profilId: string;
  /** Rang de l'etape dans la tentative, a partir de 0. */
  readonly rang: number;
  readonly identifiant: string;
  readonly competence: string;
  readonly modeReponse: ModeReponse;
  /**
   * Reussi au sens PEDAGOGIQUE : du premier coup. Ce n'est pas `ResumeTentative.reussi`, qui
   * vaut toujours `true` par R14 — une etape finit toujours par aboutir. Ce qui informe le BKT,
   * c'est de savoir si elle a abouti SANS erreur.
   */
  readonly reussi: boolean;
  readonly nbErreurs: number;
  readonly aideUtilisee: NiveauAide;
  readonly dureeMs: number;
  readonly latenceMs: number | null;
  /** Nombre d'elements, pour les modes `ordre` et `appariement`. `null` ailleurs. */
  readonly nbElements: number | null;
  readonly confusion: ConfusionObservee | null;
}

/** Une ligne relue du journal, telle que le recalcul et le dashboard la consomment. */
export interface EtapeJournalisee extends EtapeAJournaliser {
  readonly id: string;
  readonly journaliseLe: Horodatage;
}

interface LigneEtape {
  readonly id: string;
  readonly tentative_id: string;
  readonly profil_id: string;
  readonly rang: number;
  readonly identifiant: string;
  readonly competence: string;
  readonly mode_reponse: string;
  readonly reussi: number;
  readonly nb_erreurs: number;
  readonly aide_utilisee: string;
  readonly duree_ms: number;
  readonly latence_ms: number | null;
  readonly nb_elements: number | null;
  readonly conf_attendu: string | null;
  readonly conf_rendu: string | null;
  readonly conf_axe: string | null;
  readonly journalise_le: string;
}

const CHAMPS = `id, tentative_id, profil_id, rang, identifiant, competence, mode_reponse,
  reussi, nb_erreurs, aide_utilisee, duree_ms, latence_ms, nb_elements,
  conf_attendu, conf_rendu, conf_axe, journalise_le`;

/**
 * Identifiant derive de (tentative, rang, **competence**) : rejouer le meme envoi ne cree pas
 * une seconde ligne, il retombe sur la meme cle primaire. L'idempotence de
 * `POST /api/tentatives` se propage ainsi au journal fin sans qu'il ait a la connaitre.
 *
 * **La competence entre dans la matiere depuis l'arbitrage Q-INT-4** : une reussite est
 * desormais imputee a TOUTES les competences declarees par l'exercice, donc un meme rang
 * produit plusieurs lignes. Sans elle, l'insertion se fait en `INSERT OR IGNORE` sur la meme
 * cle primaire et **toutes les competences sauf la premiere seraient silencieusement
 * avalees** — le defaut aurait survecu a son propre correctif, sans rien afficher.
 */
async function deriverIdentifiant(tentativeId: string, rang: number, competence: string): Promise<string> {
  const empreinte = await hacherSha256Hex(`etape|${tentativeId}|${String(rang)}|${competence}`);
  return `etp-${empreinte.slice(0, 16)}`;
}

function versEtape(ligne: LigneEtape): EtapeJournalisee {
  const attendu = ligne.conf_attendu;
  const rendu = ligne.conf_rendu;
  const confusion: ConfusionObservee | null =
    attendu === null || rendu === null
      ? null
      : {
          attendu: String(attendu),
          rendu: String(rendu),
          axe: ligne.conf_axe === null ? null : (String(ligne.conf_axe) as AxeMiroir),
          competence: String(ligne.competence)
        };

  return {
    id: String(ligne.id),
    tentativeId: String(ligne.tentative_id),
    profilId: String(ligne.profil_id),
    rang: Number(ligne.rang),
    identifiant: String(ligne.identifiant),
    competence: String(ligne.competence),
    modeReponse: String(ligne.mode_reponse) as ModeReponse,
    reussi: Number(ligne.reussi) === 1,
    nbErreurs: Number(ligne.nb_erreurs),
    aideUtilisee: String(ligne.aide_utilisee) as NiveauAide,
    dureeMs: Number(ligne.duree_ms),
    latenceMs: ligne.latence_ms === null ? null : Number(ligne.latence_ms),
    nbElements: ligne.nb_elements === null ? null : Number(ligne.nb_elements),
    confusion,
    journaliseLe: String(ligne.journalise_le) as Horodatage
  };
}

/**
 * Inscrit les etapes d'une tentative. A appeler dans la MEME transaction que l'insertion de la
 * tentative : il n'existe aucun instant ou le journal porte une tentative dont les etapes
 * manquent.
 *
 * Rend le nombre de lignes reellement inserees — zero quand la tentative avait deja ete
 * journalisee (rejeu d'un envoi).
 */
export async function journaliserEtapes(
  base: Base,
  etapes: readonly EtapeAJournaliser[],
  journaliseLe: string
): Promise<number> {
  if (etapes.length === 0) {
    return 0;
  }

  const sql = `INSERT OR IGNORE INTO etapes_tentative (${CHAMPS})
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  let inserees = 0;
  for (const etape of etapes) {
    const identifiant = await deriverIdentifiant(etape.tentativeId, etape.rang, etape.competence);
    const resultat = await base.lancer(sql, [
      identifiant,
      etape.tentativeId,
      etape.profilId,
      Math.max(0, Math.trunc(etape.rang)),
      etape.identifiant,
      etape.competence,
      etape.modeReponse,
      etape.reussi ? 1 : 0,
      Math.max(0, Math.trunc(etape.nbErreurs)),
      etape.aideUtilisee,
      Math.max(0, Math.trunc(etape.dureeMs)),
      etape.latenceMs === null ? null : Math.max(0, Math.trunc(etape.latenceMs)),
      etape.nbElements === null ? null : Math.max(2, Math.trunc(etape.nbElements)),
      etape.confusion === null ? null : etape.confusion.attendu,
      etape.confusion === null ? null : etape.confusion.rendu,
      etape.confusion === null ? null : etape.confusion.axe,
      journaliseLe
    ]);
    inserees += resultat.changements;
  }
  return inserees;
}

/**
 * Le journal fin d'un profil, DANS L'ORDRE OU IL S'EST ECRIT.
 *
 * L'ordre est celui du recalcul : `journalise_le`, puis la tentative, puis le rang. Trier
 * autrement donnerait un BKT different du chemin incremental, et l'egalite des deux est
 * precisement ce que verifie `tests/api/pedagogie.test.ts`.
 */
export async function listerEtapes(base: Base, profilId: string): Promise<readonly EtapeJournalisee[]> {
  const lignes = await base.lignes<LigneEtape>(
    `SELECT ${CHAMPS} FROM etapes_tentative
     WHERE profil_id = ?
     ORDER BY journalise_le, tentative_id, rang`,
    [profilId]
  );
  return lignes.map(versEtape);
}

export async function compterEtapes(base: Base, profilId: string): Promise<number> {
  const ligne = await base.uneLigne<{ n: number }>(
    'SELECT COUNT(*) AS n FROM etapes_tentative WHERE profil_id = ?',
    [profilId]
  );
  return Number(ligne?.n ?? 0);
}

/**
 * Combien d'etapes portent une confusion, et combien de celles-ci portent un AXE.
 *
 * Sert de contrat de sortie : un moteur qui journaliserait `confusion: null` partout rendrait
 * le top 10 du dashboard vide sans que personne ne s'en apercoive (contrat § 11, dernier
 * risque). Le chiffre se mesure, il ne s'affirme pas.
 */
export async function compterConfusions(
  base: Base,
  profilId: string
): Promise<{ readonly avecConfusion: number; readonly avecAxe: number }> {
  const ligne = await base.uneLigne<{ avec_confusion: number | null; avec_axe: number | null }>(
    `SELECT
       SUM(CASE WHEN conf_attendu IS NOT NULL THEN 1 ELSE 0 END) AS avec_confusion,
       SUM(CASE WHEN conf_axe IS NOT NULL THEN 1 ELSE 0 END)     AS avec_axe
     FROM etapes_tentative WHERE profil_id = ?`,
    [profilId]
  );
  return {
    avecConfusion: Number(ligne?.avec_confusion ?? 0),
    avecAxe: Number(ligne?.avec_axe ?? 0)
  };
}
