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
 */

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import type { Horodatage, IdExercice } from '@pierre/partage';
// Sous-chemin `./parent` et non le barillet racine : les types de la zone parent y vivent, et
// le barillet appartient a L2-D. Une frontiere qui depend d'un lot tiers est une frontiere qui
// casse — contrat § 4.7 et § 5.1.
import type { EntreeRelecture, StatutRelecture, VerrouParent } from '@pierre/partage/parent';

import { VERROU_VIERGE } from '../services/code-parent.js';

// ───────────────────────────────────────────────────────────────────── le code du foyer

export interface CodeParentStocke {
  readonly sel: Buffer;
  readonly empreinte: Buffer;
}

interface LigneCode {
  readonly sel: Uint8Array;
  readonly empreinte: Uint8Array;
}

/** Rend `null` tant qu'aucun code n'a ete pose. Le premier acces le posera. */
export function lireCodeParent(base: DatabaseSync): CodeParentStocke | null {
  const ligne = base
    .prepare('SELECT sel, empreinte FROM code_parent WHERE id = 1')
    .get() as unknown as LigneCode | undefined;
  if (ligne === undefined) {
    return null;
  }
  return { sel: Buffer.from(ligne.sel), empreinte: Buffer.from(ligne.empreinte) };
}

/** Pose ou remplace le code du foyer. `cree_le` n'est ecrit qu'a la premiere pose. */
export function ecrireCodeParent(
  base: DatabaseSync,
  sel: Buffer,
  empreinte: Buffer,
  maintenant: Horodatage
): void {
  base
    .prepare(
      `INSERT INTO code_parent (id, sel, empreinte, cree_le, modifie_le)
       VALUES (1, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         sel        = excluded.sel,
         empreinte  = excluded.empreinte,
         modifie_le = excluded.modifie_le`
    )
    .run(sel, empreinte, String(maintenant), String(maintenant));
}

// ───────────────────────────────────────────────────────────────────────────── le verrou

interface LigneVerrou {
  readonly nb_echecs: number;
  readonly verrouille_jusqua: string | null;
}

export function lireVerrou(base: DatabaseSync): VerrouParent {
  const ligne = base
    .prepare('SELECT nb_echecs, verrouille_jusqua FROM verrou_parent WHERE id = 1')
    .get() as unknown as LigneVerrou | undefined;
  if (ligne === undefined) {
    return VERROU_VIERGE;
  }
  return {
    nbEchecs: Number(ligne.nb_echecs),
    verrouilleJusqua: ligne.verrouille_jusqua === null ? null : String(ligne.verrouille_jusqua)
  };
}

export function ecrireVerrou(base: DatabaseSync, verrou: VerrouParent): void {
  base
    .prepare(
      `INSERT INTO verrou_parent (id, nb_echecs, verrouille_jusqua)
       VALUES (1, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         nb_echecs         = excluded.nb_echecs,
         verrouille_jusqua = excluded.verrouille_jusqua`
    )
    .run(verrou.nbEchecs, verrou.verrouilleJusqua);
}

/** Apres un code juste : le compteur repart de zero, l'echeance tombe. */
export function reinitialiserVerrou(base: DatabaseSync): void {
  ecrireVerrou(base, VERROU_VIERGE);
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
export function listerRelecture(base: DatabaseSync): readonly EntreeRelecture[] {
  const lignes = base
    .prepare(
      `SELECT exercice_id, chemin, statut, deposee_le, traitee_le, motif
       FROM relecture_contenu
       ORDER BY (statut = 'en-attente') DESC, deposee_le DESC, exercice_id ASC`
    )
    .all() as unknown as LigneRelecture[];
  return lignes.map(versEntree);
}

export function lireEntreeRelecture(
  base: DatabaseSync,
  exercice: string
): EntreeRelecture | null {
  const ligne = base
    .prepare(
      `SELECT exercice_id, chemin, statut, deposee_le, traitee_le, motif
       FROM relecture_contenu WHERE exercice_id = ?`
    )
    .get(exercice) as unknown as LigneRelecture | undefined;
  return ligne === undefined ? null : versEntree(ligne);
}

/**
 * Tranche une entree. Rend `null` si l'exercice n'est pas dans la file : on ne valide pas un
 * contenu dont personne n'a vu le brouillon.
 */
export function trancherRelecture(
  base: DatabaseSync,
  exercice: string,
  statut: StatutRelecture,
  motif: string | null,
  maintenant: Horodatage
): EntreeRelecture | null {
  const resultat = base
    .prepare(
      `UPDATE relecture_contenu
       SET statut = ?, traitee_le = ?, motif = ?
       WHERE exercice_id = ?`
    )
    .run(statut, String(maintenant), motif, exercice);

  if (Number(resultat.changes) === 0) {
    return null;
  }
  return lireEntreeRelecture(base, exercice);
}

/**
 * Aligne la file sur ce que `contenu/brouillons/` porte reellement.
 *
 * C'est la frontiere L2-G → L2-H du contrat § 5.1 : « les brouillons alimentent la file de
 * relecture du dashboard ». Elle est de FICHIERS, pas de symboles — d'ou ce balayage.
 *
 * Trois choix, chacun pour une raison :
 * - le dossier peut etre absent (il est ignore par git) : c'est un cas normal, pas une erreur ;
 * - `ON CONFLICT DO NOTHING` : une entree deja tranchee n'est jamais rouverte ;
 * - l'identifiant d'exercice est le champ `id` du brouillon quand il en a un, sinon le nom du
 *   fichier. On ne devine jamais : un brouillon sans identifiant lisible garde son chemin pour
 *   nom, ce qui reste tracable a l'oeil.
 *
 * Rend le nombre d'entrees NOUVELLES, pour que l'appelant puisse le mesurer.
 */
export function synchroniserBrouillons(
  base: DatabaseSync,
  racineBrouillons: string,
  maintenant: Horodatage
): number {
  const fichiers = fichiersJson(racineBrouillons);
  if (fichiers.length === 0) {
    return 0;
  }

  const insertion = base.prepare(
    `INSERT INTO relecture_contenu (exercice_id, chemin, statut, deposee_le, traitee_le, motif)
     VALUES (?, ?, 'en-attente', ?, NULL, NULL)
     ON CONFLICT (exercice_id) DO NOTHING`
  );

  let nouvelles = 0;
  for (const fichier of fichiers) {
    const relatif = path.relative(racineBrouillons, fichier).split(path.sep).join('/');
    const identifiant = path.basename(fichier, '.json');
    const resultat = insertion.run(identifiant, `contenu/brouillons/${relatif}`, String(maintenant));
    nouvelles += Number(resultat.changes);
  }
  return nouvelles;
}

/** Balayage recursif, tolerant a l'absence du dossier. Les manifestes ne sont pas des exercices. */
function fichiersJson(racine: string): readonly string[] {
  let entrees: readonly string[];
  try {
    if (!statSync(racine).isDirectory()) {
      return [];
    }
    entrees = readdirSync(racine);
  } catch {
    return [];
  }

  const trouves: string[] = [];
  for (const nom of [...entrees].sort()) {
    const complet = path.join(racine, nom);
    let estDossier = false;
    try {
      estDossier = statSync(complet).isDirectory();
    } catch {
      continue;
    }
    if (estDossier) {
      trouves.push(...fichiersJson(complet));
    } else if (nom.endsWith('.json') && nom !== 'manifeste.json') {
      trouves.push(complet);
    }
  }
  return trouves;
}
