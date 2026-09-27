/**
 * Remise à zéro partagée par le LAN et la PWA. Le schéma réel est inventorié, puis chaque
 * table doit avoir une classification explicite. Une migration oubliée bloque l'aperçu et
 * l'effacement avant toute suppression (Vallée des Nombres, § 9.3).
 *
 * La purge parentale est l'exception administrative aux journaux append-only du jeu :
 * journal et projections d'un même domaine disparaissent ensemble, dans une transaction.
 */

import type { Horloge } from '../../horloge.js';
import type { IdProfil } from '../../identifiants.js';
import type {
  LigneRapportReinitialisation,
  PorteeReinitialisation,
  RapportReinitialisation
} from '../../parent/reinitialisation.js';
import {
  TABLES_PAR_DOMAINE,
  porteeEfface,
  totalLignesEffacees
} from '../../parent/reinitialisation.js';
import { lireProfil } from '../depots/profils.js';
import type { Base } from '../contrat.js';

/** Une ligne de `sqlite_master`. */
interface LigneTable {
  readonly name: string;
}

/** Une ligne de `PRAGMA table_info`. */
interface LigneColonne {
  readonly name: string;
}

interface LigneCleEtrangere {
  readonly table: string;
}

function nomSql(nom: string): string {
  return `"${nom.replaceAll('"', '""')}"`;
}

/**
 * Les tables du schéma qui portent `profil_id`, triées par nom. L'inventaire contrôle aussi
 * les tables partagées sans cette colonne : aucune table inconnue ne passe sous silence.
 *
 * Le préfixe `sqlite_` est écarté : ce sont les tables internes, dont `sqlite_sequence`.
 * Aucune ne porte `profil_id`, mais les nommer dans une requête `DELETE` échouerait sur
 * certaines et masquerait le vrai travail derrière une erreur.
 */
export async function tablesPorteusesDeProfil(base: Base): Promise<readonly string[]> {
  const tables = await base.lignes<LigneTable>(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT GLOB 'sqlite_*'
     ORDER BY name`
  );

  const porteuses: string[] = [];
  for (const table of tables) {
    const nom = String(table.name);
    // `PRAGMA table_info(?)` n'accepte pas de paramètre lié en SQLite ; le nom vient de
    // `sqlite_master`, donc du schéma lui-même, et non d'une entrée réseau.
    if (!Object.hasOwn(TABLES_PAR_DOMAINE, nom)) {
      throw new Error(`Table non classifiée pour la remise à zéro : ${nom}`);
    }
    const colonnes = await base.lignes<LigneColonne>(`PRAGMA table_info(${nomSql(nom)})`);
    const porteProfil = colonnes.some((colonne) => String(colonne.name) === 'profil_id');
    if (porteProfil && TABLES_PAR_DOMAINE[nom] === 'partage') {
      throw new Error(`Table classifiée comme partagée mais portant profil_id : ${nom}`);
    }
    if (!porteProfil && TABLES_PAR_DOMAINE[nom] !== 'partage') {
      throw new Error(`Table classifiée par domaine sans profil_id : ${nom}`);
    }
    if (porteProfil) {
      porteuses.push(nom);
    }
  }
  return porteuses;
}

/** Enfants avant parents : les FK font l'ordre, pas le nom alphabétique. */
async function ordonnerSuppressions(base: Base, tables: readonly string[]): Promise<readonly string[]> {
  const ensemble = new Set(tables);
  const parents = new Map<string, Set<string>>();
  const enfantsRestants = new Map<string, number>(
    tables.map((table): [string, number] => [table, 0]));
  for (const table of tables) {
    const references = await base.lignes<LigneCleEtrangere>(
      `PRAGMA foreign_key_list(${nomSql(table)})`);
    const cibles = new Set(references.map((ligne) => ligne.table)
      .filter((parent) => parent !== table && ensemble.has(parent)));
    parents.set(table, cibles);
    for (const parent of cibles) {
      enfantsRestants.set(parent, enfantsRestants.get(parent)! + 1);
    }
  }
  const ordonnees: string[] = [];
  const disponibles = tables.filter((table) => enfantsRestants.get(table) === 0).sort();
  while (disponibles.length > 0) {
    const enfant = disponibles.shift()!;
    ordonnees.push(enfant);
    for (const parent of parents.get(enfant) ?? []) {
      const restant = enfantsRestants.get(parent)! - 1;
      enfantsRestants.set(parent, restant);
      if (restant === 0) {
        disponibles.push(parent);
        disponibles.sort();
      }
    }
  }
  if (ordonnees.length !== tables.length) {
    throw new Error('Dépendance circulaire entre tables de profil à remettre à zéro.');
  }
  return ordonnees;
}

/** Ce qu'une remise à zéro effacerait, table par table, SANS rien effacer. */
export async function previsualiserReinitialisation(
  base: Base,
  profilId: string,
  portee: PorteeReinitialisation
): Promise<readonly LigneRapportReinitialisation[]> {
  const tables = (await tablesPorteusesDeProfil(base)).filter((table) => porteeEfface(portee, table));
  const lignes: LigneRapportReinitialisation[] = [];
  for (const table of tables) {
    const compte = await base.uneLigne<{ readonly n: number }>(
      `SELECT COUNT(*) AS n FROM ${nomSql(table)} WHERE profil_id = ?`,
      [profilId]
    );
    lignes.push({ table, lignesEffacees: Number(compte?.n ?? 0) });
  }
  return lignes;
}

interface BilanPurge {
  readonly lignes: readonly LigneRapportReinitialisation[];
  readonly tablesConservees: readonly string[];
}

/** Inventaire, comptes, puis purge et générations dans la transaction de l'appelant. */
async function purgerProfilDansTransaction(
  transaction: Base, profilId: string, portee: PorteeReinitialisation, effectueLe: string,
): Promise<BilanPurge> {
  const tables = await tablesPorteusesDeProfil(transaction);
  const aEffacer = tables.filter((table) => porteeEfface(portee, table));
  const tablesConservees = tables.filter((table) => !porteeEfface(portee, table));
  const lignes: LigneRapportReinitialisation[] = [];
  // Compter toutes les tables avant toute suppression : les cascades ne faussent pas le rapport.
  for (const table of aEffacer) {
    const compte = await transaction.uneLigne<{ readonly n: number }>(
      `SELECT COUNT(*) AS n FROM ${nomSql(table)} WHERE profil_id = ?`, [profilId]);
    lignes.push({ table, lignesEffacees: Number(compte?.n ?? 0) });
  }
  const ordre = await ordonnerSuppressions(transaction, aEffacer);
  for (const table of ordre) {
    await transaction.lancer(`DELETE FROM ${nomSql(table)} WHERE profil_id = ?`, [profilId]);
  }
  const miseAJour = await transaction.lancer(
    `UPDATE profils SET dernier_acces_le = ?,
     generation_progression = generation_progression + ?,
     generation_maths = generation_maths + ? WHERE id = ?`,
    [effectueLe, portee === 'maths' ? 0 : 1, portee === 'lecture' ? 0 : 1, profilId],
  );
  if (miseAJour.changements !== 1) throw new Error(`Profil inconnu : ${profilId}`);
  return { lignes, tablesConservees };
}

/** Efface le domaine choisi, et conserve le profil et les autres domaines. */
export async function reinitialiserProfil(
  base: Base,
  profilId: string,
  portee: PorteeReinitialisation,
  horloge: Horloge
): Promise<RapportReinitialisation> {
  const profil = await lireProfil(base, profilId);
  if (profil === null) {
    throw new Error(`Profil inconnu : ${profilId}`);
  }

  const effectueLe = String(horloge.maintenant());

  const { lignes, tablesConservees } = await base.transaction((transaction) =>
    purgerProfilDansTransaction(transaction, profilId, portee, effectueLe));

  return {
    profil: profilId as IdProfil,
    prenom: profil.prenom,
    portee,
    effectueLe: effectueLe as RapportReinitialisation['effectueLe'],
    lignes,
    lignesEffaceesTotal: totalLignesEffacees(lignes),
    tablesConservees
  };
}

/**
 * Le contrôle de vacuité, exécuté APRÈS l'effacement — le contrat de sortie du service.
 *
 * Il ne fait pas confiance au rapport qu'on vient de produire : il relit la base et compte ce
 * qui reste. Un service qui se contenterait de son propre compte rendu serait un service qui
 * s'auto-certifie ; c'est précisément la défaillance qu'un « détecteur qui déclare un poids
 * qu'il n'applique jamais » produit.
 *
 * Rend les tables qui portent ENCORE des lignes pour ce profil et qui n'auraient pas dû. Vide
 * = la remise à zéro a tenu.
 */
export async function tablesNonVidees(
  base: Base,
  profilId: string,
  portee: PorteeReinitialisation
): Promise<readonly LigneRapportReinitialisation[]> {
  return (await previsualiserReinitialisation(base, profilId, portee)).filter(
    (ligne) => ligne.lignesEffacees > 0
  );
}

/** Supprimer un profil reprend exactement la purge complète, dans la même transaction. */
export interface RapportSuppression {
  readonly profil: IdProfil;
  readonly prenom: string;
  readonly effectueLe: string;
  readonly lignes: readonly LigneRapportReinitialisation[];
  readonly lignesEffaceesTotal: number;
  /** Vrai quand la ligne de `profils` a bien disparu — RELU en base, jamais supposé. */
  readonly profilRetire: boolean;
}

export async function supprimerProfil(
  base: Base,
  profilId: string,
  horloge: Horloge
): Promise<RapportSuppression> {
  const profil = await lireProfil(base, profilId);
  if (profil === null) {
    // Comme `reinitialiserProfil` : on n'efface jamais « dans le vide » en rendant un rapport
    // vert. Le parent croirait avoir supprimé un compte qu'il vient de mal désigner.
    throw new Error(`Profil inconnu : ${profilId}`);
  }

  const effectueLe = String(horloge.maintenant());
  const bilan = await base.transaction(async (transaction) => {
    const purge = await purgerProfilDansTransaction(transaction, profilId, 'complete', effectueLe);
    const retrait = await transaction.lancer('DELETE FROM profils WHERE id = ?', [profilId]);
    if (retrait.changements !== 1) throw new Error(`Profil inconnu : ${profilId}`);
    return purge;
  });

  return {
    profil: profilId as IdProfil,
    prenom: profil.prenom,
    effectueLe,
    lignes: bilan.lignes,
    lignesEffaceesTotal: totalLignesEffacees(bilan.lignes),
    // ── LE CONTRAT DE SORTIE : ON RELIT, ON NE CROIT PAS ────────────────────────────────────
    // `lireProfil` doit maintenant rendre `null`. Un service qui se contenterait d'annoncer
    // « supprimé » parce qu'il a exécuté un DELETE est un service qui s'auto-certifie — et
    // c'est exactement le mode de défaillance « le champ déclaré, jamais affecté ».
    profilRetire: (await lireProfil(base, profilId)) === null
  };
}
