/**
 * Depot du journal `tentatives` — APPEND-ONLY.
 *
 * Aucune fonction de ce fichier n'emet d'UPDATE ni de DELETE contre `tentatives`. C'est la table
 * qui fait foi (CLAUDE.md) : tout le reste — `progression_noeud`, et demain le BKT et le Leitner —
 * se recalcule depuis elle. La modifier retroactivement rendrait le test de rejeu (annexe T § T2)
 * ininterpretable.
 *
 * IDEMPOTENCE (annexe T § T2, contrat § 6.3) : « rejouer deux fois la meme tentative (reseau
 * capricieux, double tap) ne double pas le score ». La cle est portee par la colonne UNIQUE
 * `cle_idempotence` ; un second envoi rend la tentative deja enregistree, sans rien inserer et
 * sans toucher a la progression.
 */

import { createHash } from 'node:crypto';

import type { DatabaseSync } from 'node:sqlite';

import type {
  CodeMoteur,
  Horloge,
  Horodatage,
  IdExercice,
  IdNoeud,
  IdProfil,
  IdTentative,
  NiveauAide,
  NombreEtoiles,
  ResumeTentative,
  Tentative
} from '@pierre/partage';
import { calculerEtoiles } from '@pierre/partage';

import { dansTransaction } from '../base/connexion.js';
import { toucherProfil } from './profils.js';
import { appliquerTentativeALaProgression } from './progression.js';

/** Les trois paliers de la v2 § 5.4, tels que la contrainte CHECK de la table les accepte. */
const NIVEAUX_AIDE: readonly string[] = ['aucune', 'indice', 'demonstration'];

interface LigneTentative {
  readonly id: string;
  readonly cle_idempotence: string;
  readonly profil_id: string;
  readonly noeud_id: string;
  readonly exercice_id: string;
  readonly moteur: string;
  readonly habillage: string;
  readonly graine: number;
  readonly demarre_le: string;
  readonly termine_le: string;
  readonly duree_ms: number;
  readonly reussi: number;
  readonly nb_erreurs: number;
  readonly aide_utilisee: string;
  readonly etoiles: number;
  readonly detail_json: string;
}

/**
 * Charge utile acceptee par `POST /api/tentatives`, apres validation d'execution.
 *
 * Le corps HTTP est une entree NON FIABLE : il est valide a l'execution, jamais suppose conforme
 * a `TentativeAEnregistrer` par la seule vertu du typage.
 */
export interface TentativeValidee {
  readonly cleIdempotence: string;
  readonly profil: string;
  readonly noeud: string;
  readonly exercice: string;
  readonly moteur: string;
  readonly habillage: string;
  readonly graine: number;
  readonly demarreLe: string;
  readonly termineLe: string;
  readonly resume: ResumeTentative;
}

export interface ResultatEnregistrement {
  /** `true` si la tentative etait deja au journal : rien n'a ete insere. */
  readonly deja: boolean;
  readonly tentative: Tentative;
}

const CHAMPS = `id, cle_idempotence, profil_id, noeud_id, exercice_id, moteur, habillage, graine,
  demarre_le, termine_le, duree_ms, reussi, nb_erreurs, aide_utilisee, etoiles, detail_json`;

/**
 * Cle d'idempotence de repli, formule du contrat § 6.3 :
 * `sha256(profil_id | noeud_id | demarre_le | graine)`.
 *
 * Le client la calcule normalement lui-meme. Quand il ne l'envoie pas, le serveur la derive au
 * lieu de refuser : une tentative reellement jouee ne doit jamais etre perdue pour un champ
 * manquant (annexe T § T2, « aucune tentative perdue »). Le serveur ne la RECALCULE jamais pour
 * la comparer a celle du client : deux facons de concatener suffiraient a casser l'idempotence.
 */
export function deriverCleIdempotence(
  profilId: string,
  noeudId: string,
  demarreLe: string,
  graine: number
): string {
  const matiere = `${profilId}|${noeudId}|${demarreLe}|${String(graine)}`;
  return createHash('sha256').update(matiere, 'utf8').digest('hex');
}

/** Identifiant de tentative, derive de la cle : deux envois identiques donnent le meme `id`. */
function deriverIdentifiant(cleIdempotence: string): string {
  return `tnt-${createHash('sha256').update(`tentative|${cleIdempotence}`, 'utf8').digest('hex').slice(0, 16)}`;
}

function versTentative(ligne: LigneTentative): Tentative {
  let resume: ResumeTentative;
  try {
    resume = JSON.parse(String(ligne.detail_json)) as ResumeTentative;
  } catch {
    resume = {
      reussi: Number(ligne.reussi) === 1,
      nbErreurs: Number(ligne.nb_erreurs),
      aideUtilisee: String(ligne.aide_utilisee) as NiveauAide,
      dureeMs: Number(ligne.duree_ms),
      etapes: []
    };
  }

  return {
    id: String(ligne.id) as IdTentative,
    cleIdempotence: String(ligne.cle_idempotence),
    profil: String(ligne.profil_id) as IdProfil,
    noeud: String(ligne.noeud_id) as IdNoeud,
    exercice: String(ligne.exercice_id) as IdExercice,
    moteur: String(ligne.moteur) as CodeMoteur,
    habillage: String(ligne.habillage),
    graine: Number(ligne.graine),
    demarreLe: String(ligne.demarre_le) as Horodatage,
    termineLe: String(ligne.termine_le) as Horodatage,
    etoiles: Number(ligne.etoiles) as NombreEtoiles,
    // `reussi`, `nbErreurs`, `aideUtilisee` et `dureeMs` vivent dans `resume` et nulle part
    // ailleurs (contrat, `ResumeTentative`). Les colonnes SQL du meme nom restent — elles
    // servent l'agregation en base — mais les exposer aussi a plat sur l'objet ferait deux
    // sources de verite pour la meme grandeur.
    resume
  };
}

function lireParCle(base: DatabaseSync, cle: string): Tentative | null {
  const ligne = base
    .prepare(`SELECT ${CHAMPS} FROM tentatives WHERE cle_idempotence = ?`)
    .get(cle) as unknown as LigneTentative | undefined;
  return ligne === undefined ? null : versTentative(ligne);
}

/** Journal complet d'un profil, dans l'ordre ou il s'est ecrit. */
export function listerTentatives(base: DatabaseSync, profilId: string): readonly Tentative[] {
  const lignes = base
    .prepare(`SELECT ${CHAMPS} FROM tentatives WHERE profil_id = ? ORDER BY termine_le, id`)
    .all(profilId) as unknown as LigneTentative[];
  return lignes.map(versTentative);
}

export function compterTentatives(base: DatabaseSync, profilId: string): number {
  const ligne = base
    .prepare('SELECT COUNT(*) AS n FROM tentatives WHERE profil_id = ?')
    .get(profilId) as unknown as { n: number };
  return Number(ligne.n);
}

/**
 * Ecrit une tentative au journal, ou constate qu'elle y est deja.
 *
 * L'insertion et la mise a jour de la projection se font dans UNE transaction : il n'existe
 * aucun instant ou le journal porte une tentative que la progression ignore.
 *
 * `demarre_le` et `termine_le` viennent du CLIENT, qui seul connait la duree reellement vecue par
 * l'enfant ; `horloge` ne sert qu'a dater le dernier acces du profil, cote serveur.
 */
export function enregistrerTentative(
  base: DatabaseSync,
  validee: TentativeValidee,
  horloge: Horloge
): ResultatEnregistrement {
  // Le bareme vit uniquement dans `calculerEtoiles` (contrat § 5.7) : le serveur ne le rejoue
  // pas. Le bornage a [0, 3] n'est pas un second bareme, c'est le respect de la contrainte CHECK
  // de la colonne — une tentative reellement jouee ne doit pas etre perdue sur un 500.
  const etoiles = Math.min(3, Math.max(0, Math.trunc(Number(calculerEtoiles(validee.resume)))));
  const aideUtilisee = NIVEAUX_AIDE.includes(validee.resume.aideUtilisee)
    ? validee.resume.aideUtilisee
    : 'aucune';

  return dansTransaction(base, () => {
    const dejaLa = lireParCle(base, validee.cleIdempotence);
    if (dejaLa !== null) {
      return { deja: true, tentative: dejaLa };
    }

    try {
      base
        .prepare(
          `INSERT INTO tentatives (${CHAMPS})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          deriverIdentifiant(validee.cleIdempotence),
          validee.cleIdempotence,
          validee.profil,
          validee.noeud,
          validee.exercice,
          validee.moteur,
          validee.habillage,
          Math.trunc(validee.graine),
          validee.demarreLe,
          validee.termineLe,
          Math.max(0, Math.trunc(validee.resume.dureeMs)),
          validee.resume.reussi ? 1 : 0,
          Math.max(0, Math.trunc(validee.resume.nbErreurs)),
          aideUtilisee,
          etoiles,
          JSON.stringify(validee.resume)
        );
    } catch (erreur) {
      // Ceinture et bretelles. `BEGIN IMMEDIATE` serialise deja les ecrivains, donc le
      // « je lis puis j'insere » ci-dessus est atomique. Si la contrainte UNIQUE parle quand
      // meme, c'est qu'un autre processus a gagne la course : sa tentative fait foi, la notre
      // est le doublon que l'idempotence doit absorber — pas une erreur a remonter a l'enfant.
      const concurrente = lireParCle(base, validee.cleIdempotence);
      if (concurrente !== null) {
        return { deja: true, tentative: concurrente };
      }
      throw erreur;
    }

    appliquerTentativeALaProgression(
      base,
      validee.profil,
      validee.noeud,
      etoiles,
      validee.termineLe
    );

    toucherProfil(base, validee.profil, horloge);

    const inseree = lireParCle(base, validee.cleIdempotence);
    if (inseree === null) {
      throw new Error("La tentative vient d'etre inseree et reste introuvable.");
    }
    return { deja: false, tentative: inseree };
  });
}
