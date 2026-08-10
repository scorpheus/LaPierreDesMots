/**
 * Depot de la zone parent : le code, le verrou, la file de relecture.
 *
 * Trois tables de `006_parent.sql`, et trois regles qui ne sont pas dans le SQL :
 *
 * 1. **`code_parent` et `verrou_parent` n'ont qu'une ligne** (`CHECK (id = 1)`) : c'est une zone
 *    parent, pas un compte. Le foyer en a un, pas un par enfant.
 * 2. **Le verrou n'est jamais lu depuis le code appelant.** `lireVerrou` rend toujours un
 *    `VerrouParent` valide, meme quand la ligne n'existe pas encore : le parent ne doit pas
 *    tomber sur une erreur au tout premier essai.
 * 3. **La file de relecture ne recree jamais une entree deja tranchee.** Un brouillon rejete
 *    puis re-detecte sur le disque reste rejete — sinon le parent le reverrait a chaque
 *    demarrage, et la file cesserait d'etre une file.
 *
 * Porté sur le contrat `Base` — Docs/addendum-portage-android.md § 4. `synchroniserBrouillons`
 * (balayage de `contenu/brouillons/` sur disque) reste SERVEUR-SEUL — voir
 * `serveur/src/referentiels/brouillons.ts` — c'est un geste d'auteur PC, pas un besoin de
 * l'app Android autonome, et il aurait entraîné `node:fs` dans le bundle partagé.
 */

import type { Horodatage, IdExercice } from '../../identifiants.js';
import type { EntreeRelecture, StatutRelecture, VerrouParent } from '../../parent/types.js';
import type { Base } from '../contrat.js';

/** Un verrou neuf : aucun echec, aucune echeance. */
const VERROU_VIERGE: VerrouParent = { nbEchecs: 0, verrouilleJusqua: null };

// ───────────────────────────────────────────────────────────────────── le code du foyer

export interface CodeParentStocke {
  readonly sel: Uint8Array;
  readonly empreinte: Uint8Array;
}

interface LigneCode {
  readonly sel: Uint8Array;
  readonly empreinte: Uint8Array;
}

/**
 * Comment le code du foyer a ete pose — colonne `defini_par` de la migration 009.
 *
 * `ouverture-implicite` est la valeur des bases anterieures a N5 : elle est CONSERVEE plutot
 * que devinee, pour que le dashboard puisse un jour proposer au parent de redefinir un code
 * qu'il n'a jamais choisi. On ne detruit jamais un code existant — le parent serait enferme
 * dehors (contrat de finition v3 § 7.3).
 */
export type OrigineCodeParent = 'ouverture-implicite' | 'ecran-definition' | 'redefinition';

/** Rend `null` tant qu'aucun code n'a ete pose. Seule `POST /api/parent/definir` le pose. */
export async function lireCodeParent(base: Base): Promise<CodeParentStocke | null> {
  const ligne = await base.uneLigne<LigneCode>('SELECT sel, empreinte FROM code_parent WHERE id = 1');
  if (ligne === undefined) {
    return null;
  }
  return { sel: ligne.sel, empreinte: ligne.empreinte };
}

/**
 * AJOUT N5 — la question qui manquait : distinguer « personne n'a encore choisi de code » de
 * « le code tape est faux ». Elle ne lit ni le sel ni l'empreinte : la reponse est un booleen.
 */
export async function codeEstDefini(base: Base): Promise<boolean> {
  const ligne = await base.uneLigne<{ present: number }>('SELECT 1 AS present FROM code_parent WHERE id = 1');
  return ligne !== undefined;
}

/**
 * Pose ou remplace le code du foyer. `cree_le` n'est ecrit qu'a la premiere pose.
 *
 * `origine` est exige a l'appel, sans valeur par defaut : une valeur par defaut serait une
 * occurrence qu'aucune recherche textuelle ne trouve, et la colonne `defini_par` existe
 * justement pour que personne ne puisse poser un code sans dire d'ou il vient.
 */
export async function ecrireCodeParent(
  base: Base,
  sel: Uint8Array,
  empreinte: Uint8Array,
  maintenant: Horodatage,
  origine: OrigineCodeParent
): Promise<void> {
  await base.lancer(
    `INSERT INTO code_parent (id, sel, empreinte, cree_le, modifie_le, defini_par)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       sel        = excluded.sel,
       empreinte  = excluded.empreinte,
       modifie_le = excluded.modifie_le,
       defini_par = excluded.defini_par`,
    [sel, empreinte, String(maintenant), String(maintenant), origine]
  );
}

// ───────────────────────────────────────────────────────────────────────────── le verrou

interface LigneVerrou {
  readonly nb_echecs: number;
  readonly verrouille_jusqua: string | null;
}

export async function lireVerrou(base: Base): Promise<VerrouParent> {
  const ligne = await base.uneLigne<LigneVerrou>(
    'SELECT nb_echecs, verrouille_jusqua FROM verrou_parent WHERE id = 1'
  );
  if (ligne === undefined) {
    return VERROU_VIERGE;
  }
  return {
    nbEchecs: Number(ligne.nb_echecs),
    verrouilleJusqua: ligne.verrouille_jusqua === null ? null : String(ligne.verrouille_jusqua)
  };
}

export async function ecrireVerrou(base: Base, verrou: VerrouParent): Promise<void> {
  await base.lancer(
    `INSERT INTO verrou_parent (id, nb_echecs, verrouille_jusqua)
     VALUES (1, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       nb_echecs         = excluded.nb_echecs,
       verrouille_jusqua = excluded.verrouille_jusqua`,
    [verrou.nbEchecs, verrou.verrouilleJusqua]
  );
}

/** Apres un code juste : le compteur repart de zero, l'echeance tombe. */
export async function reinitialiserVerrou(base: Base): Promise<void> {
  await ecrireVerrou(base, VERROU_VIERGE);
}

// ────────────────────────────────────────────────────────────────── file de relecture

interface LigneRelecture {
  readonly exercice_id: string;
  readonly chemin: string;
  readonly statut: string;
  readonly deposee_le: string;
  readonly traitee_le: string | null;
  readonly motif: string | null;
}

function versEntree(ligne: LigneRelecture): EntreeRelecture {
  return {
    exercice: String(ligne.exercice_id) as IdExercice,
    chemin: String(ligne.chemin),
    statut: String(ligne.statut) as StatutRelecture,
    deposeeLe: String(ligne.deposee_le) as Horodatage,
    traiteeLe: ligne.traitee_le === null ? null : (String(ligne.traitee_le) as Horodatage),
    motif: ligne.motif === null ? null : String(ligne.motif)
  };
}

/** La file entiere : en attente d'abord, puis les decisions, les plus recentes en tete. */
export async function listerRelecture(base: Base): Promise<readonly EntreeRelecture[]> {
  const lignes = await base.lignes<LigneRelecture>(
    `SELECT exercice_id, chemin, statut, deposee_le, traitee_le, motif
     FROM relecture_contenu
     ORDER BY (statut = 'en-attente') DESC, deposee_le DESC, exercice_id ASC`
  );
  return lignes.map(versEntree);
}

export async function lireEntreeRelecture(base: Base, exercice: string): Promise<EntreeRelecture | null> {
  const ligne = await base.uneLigne<LigneRelecture>(
    `SELECT exercice_id, chemin, statut, deposee_le, traitee_le, motif
     FROM relecture_contenu WHERE exercice_id = ?`,
    [exercice]
  );
  return ligne === undefined ? null : versEntree(ligne);
}

/**
 * Tranche une entree. Rend `null` si l'exercice n'est pas dans la file : on ne valide pas un
 * contenu dont personne n'a vu le brouillon.
 */
export async function trancherRelecture(
  base: Base,
  exercice: string,
  statut: StatutRelecture,
  motif: string | null,
  maintenant: Horodatage
): Promise<EntreeRelecture | null> {
  const resultat = await base.lancer(
    `UPDATE relecture_contenu
     SET statut = ?, traitee_le = ?, motif = ?
     WHERE exercice_id = ?`,
    [statut, String(maintenant), motif, exercice]
  );

  if (resultat.changements === 0) {
    return null;
  }
  return lireEntreeRelecture(base, exercice);
}
