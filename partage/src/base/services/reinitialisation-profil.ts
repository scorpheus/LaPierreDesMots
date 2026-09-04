/**
 * Remise à zéro d'un profil — lot H2. Déplacé de `serveur/src/services/` au Lot 2 du portage
 * Android (Docs/addendum-portage-android.md § 6bis) : c'est un geste que le parent doit pouvoir
 * faire aussi bien depuis le serveur LAN que depuis l'app autonome sur la tablette.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI LES TABLES SONT DÉCOUVERTES ET NON ÉNUMÉRÉES
 *
 * D48 : « auditer une propriété, c'est énumérer les OBJETS qui devraient la porter, pas les
 * occurrences de l'attribut ». Une liste de tables écrite à la main dans ce fichier serait une
 * liste d'occurrences : elle décrirait le schéma du jour où on l'a écrite. Une migration
 * ajoutant une table porteuse de `profil_id` la laisserait derrière, et le profil « remis à
 * zéro » garderait une projection périmée — **exactement le défaut que cette campagne
 * corrige**. On ne peut pas réparer un état périmé par un mécanisme qui périme.
 *
 * `tablesPorteusesDeProfil` interroge donc `sqlite_master` puis `PRAGMA table_info` : la
 * réponse vient du schéma réel, à l'instant où on efface.
 *
 * Mesuré le 2026-08-02 sur `donnees/pierre.db` (9 migrations appliquées) :
 *
 *     AVEC profil_id (17) : campement, compagnons, essais_typographie, etagere_rang,
 *                           etapes_tentative, formes_gobi, items_leitner,
 *                           maitrise_competence, ouverture_vue, points_visites,
 *                           progression_cascade, progression_noeud, progression_region,
 *                           reglages_lecture, sorties, stade_gobi, tentatives
 *     SANS profil_id  (5) : code_parent, profils, relecture_contenu, schema_migrations,
 *                           verrou_parent
 *
 * Les cinq sans `profil_id` ne sont jamais touchées, et il le faut : effacer `code_parent`
 * enfermerait le parent dehors (contrat de finition v3 § 7.3), effacer `schema_migrations`
 * rejouerait les migrations sur une base déjà migrée.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EFFACE `tentatives`, QUI EST APPEND-ONLY
 *
 * `001_socle.sql` porte en toutes lettres : « Journal append-only. Aucun UPDATE, aucun DELETE
 * n'est jamais écrit contre cette table. » Ce fichier en écrit un. L'exception est délibérée
 * et bornée :
 *
 * — la règle append-only gouverne **le chemin de jeu**. Elle existe pour qu'aucune mécanique
 *   ne puisse réviser l'histoire de l'enfant à son insu, et pour que tout indicateur reste
 *   recalculable depuis le journal ;
 * — une remise à zéro n'est pas une mécanique de jeu : c'est un geste d'administration,
 *   demandé par un adulte, derrière un code à quatre chiffres, confirmé en retapant le prénom
 *   de l'enfant ;
 * — surtout, **l'épargner serait pire**. Un journal conservé face à des projections effacées
 *   rendrait le premier recalcul venu — celui du lot H1 — au profil tout ce qu'on vient de
 *   lui retirer. La remise à zéro serait annulée par la réparation. Le seul état cohérent
 *   après une remise à zéro est : journal vide, projections vides.
 *
 * L'invariant est donc préservé, pas rompu : après passage ici, tout indicateur recalculé
 * depuis le journal vaut ce que la base porte. C'est ce qu'assied
 * `tests/api/parent-reinitialisation.test.ts`.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 */

import type { Horloge } from '../../horloge.js';
import type { IdProfil } from '../../identifiants.js';
import type {
  LigneRapportReinitialisation,
  PorteeReinitialisation,
  RapportReinitialisation
} from '../../parent/reinitialisation.js';
import {
  TABLES_CONSERVEES_PAR_PROGRESSION,
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

/**
 * Les tables du schéma qui portent une colonne `profil_id`, triées par nom.
 *
 * **Découvertes, jamais énumérées** — voir l'en-tête. Le tri par nom rend l'ordre stable d'une
 * machine à l'autre, donc le rapport comparable d'une exécution à l'autre.
 *
 * `sqlite_%` est écarté : ce sont les tables internes de SQLite, dont `sqlite_sequence`.
 * Aucune ne porte `profil_id`, mais les nommer dans une requête `DELETE` échouerait sur
 * certaines et masquerait le vrai travail derrière une erreur.
 */
export async function tablesPorteusesDeProfil(base: Base): Promise<readonly string[]> {
  const tables = await base.lignes<LigneTable>(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`
  );

  const porteuses: string[] = [];
  for (const table of tables) {
    const nom = String(table.name);
    // `PRAGMA table_info(?)` n'accepte pas de paramètre lié en SQLite ; le nom vient de
    // `sqlite_master`, donc du schéma lui-même, et non d'une entrée réseau.
    const colonnes = await base.lignes<LigneColonne>(`PRAGMA table_info(${nom})`);
    if (colonnes.some((colonne) => String(colonne.name) === 'profil_id')) {
      porteuses.push(nom);
    }
  }
  return porteuses;
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
      `SELECT COUNT(*) AS n FROM ${table} WHERE profil_id = ?`,
      [profilId]
    );
    lignes.push({ table, lignesEffacees: Number(compte?.n ?? 0) });
  }
  return lignes;
}

/**
 * Efface les données du profil selon la portée, en une seule transaction.
 *
 * `PRAGMA defer_foreign_keys = ON` plutôt qu'un ordre de suppression calculé : `etapes_tentative`
 * référence `tentatives`, et une table ajoutée demain référencera autre chose. Différer le
 * contrôle des clés étrangères jusqu'au `COMMIT` rend l'ordre indifférent tout en gardant la
 * garantie — si l'effacement laissait une référence pendante, le `COMMIT` échouerait et la
 * transaction serait annulée en entier. Le pragma est **local à la transaction** : SQLite le
 * remet à zéro au `COMMIT` comme au `ROLLBACK`.
 *
 * Le rapport compte AVANT d'effacer : `changes()` n'est pas lisible table par table à travers
 * `node:sqlite` sans requête supplémentaire, et un `SELECT COUNT(*)` préalable dans la même
 * transaction dit exactement la même chose.
 *
 * Lève si le profil n'existe pas — on n'efface jamais « dans le vide » en rendant un rapport
 * vert : le parent croirait avoir remis à zéro un profil qu'il vient de mal désigner.
 */
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

  const lignes = await base.transaction(async (transaction) => {
    await transaction.executer('PRAGMA defer_foreign_keys = ON;');

    const comptes: LigneRapportReinitialisation[] = [];
    for (const table of await tablesPorteusesDeProfil(transaction)) {
      if (!porteeEfface(portee, table)) {
        continue;
      }
      const compte = await transaction.uneLigne<{ readonly n: number }>(
        `SELECT COUNT(*) AS n FROM ${table} WHERE profil_id = ?`,
        [profilId]
      );
      await transaction.lancer(`DELETE FROM ${table} WHERE profil_id = ?`, [profilId]);
      comptes.push({ table, lignesEffacees: Number(compte?.n ?? 0) });
    }

    // `dernier_acces_le` est touché dans la même transaction : le profil vient d'être
    // manipulé, et l'écran d'état doit le dire. `prenom` et `avatar_json` ne bougent JAMAIS —
    // les deux portées les conservent, c'est l'enfant qui reste.
    await transaction.lancer('UPDATE profils SET dernier_acces_le = ? WHERE id = ?', [effectueLe, profilId]);

    return comptes;
  });

  return {
    profil: profilId as IdProfil,
    prenom: profil.prenom,
    portee,
    effectueLe: effectueLe as RapportReinitialisation['effectueLe'],
    lignes,
    lignesEffaceesTotal: totalLignesEffacees(lignes),
    tablesConservees: portee === 'complete' ? [] : TABLES_CONSERVEES_PAR_PROGRESSION
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

/**
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * SUPPRIMER UN PROFIL — R29, demandé par le père le 2026-08-03.
 *
 * « tu as créé plein de comptes de joueurs qui s'appellent Mesure, déjà il faudrait les enlever.
 * Et dans l'espace des parents, il faudrait pouvoir les supprimer en fait, supprimer un compte. »
 *
 * Le besoin est né d'un dégât que j'ai causé : **six profils « Mesure » écrits dans sa vraie
 * base** par mes sondes de mise en page, qui pointaient sur le serveur de jeu au lieu d'une base
 * jetable. Un outil de mesure qui écrit dans les données du joueur n'est pas un outil de mesure.
 *
 * ── POURQUOI CE N'EST PAS UNE ROUTE DE PLUS, MAIS LA MÊME AVEC UNE LIGNE EN FIN ────────────────
 * Supprimer = remettre à zéro en portée `complete`, puis retirer la ligne de `profils`. Réécrire
 * une seconde énumération de tables aurait créé la pire dette possible : deux listes qui doivent
 * rester d'accord, dont l'une ne se voit qu'au moment d'un effacement.
 *
 * `tablesPorteusesDeProfil` DÉCOUVRE les tables par le schéma. Une table ajoutée demain avec une
 * colonne `profil_id` est vidée toute seule, par les deux chemins à la fois. C'est la seule forme
 * qui ne pourrit pas.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
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

  // La portée `complete` d'abord — elle vide TOUTES les tables porteuses de `profil_id`, y
  // compris celles que la portée `progression` conserve (prénom, avatar, réglages de lecture).
  const rapport = await reinitialiserProfil(base, profilId, 'complete', horloge);

  await base.transaction(async (transaction) => {
    await transaction.executer('PRAGMA defer_foreign_keys = ON;');
    await transaction.lancer('DELETE FROM profils WHERE id = ?', [profilId]);
  });

  return {
    profil: profilId as IdProfil,
    prenom: profil.prenom,
    effectueLe: rapport.effectueLe,
    lignes: rapport.lignes,
    lignesEffaceesTotal: rapport.lignesEffaceesTotal,
    // ── LE CONTRAT DE SORTIE : ON RELIT, ON NE CROIT PAS ────────────────────────────────────
    // `lireProfil` doit maintenant rendre `null`. Un service qui se contenterait d'annoncer
    // « supprimé » parce qu'il a exécuté un DELETE est un service qui s'auto-certifie — et
    // c'est exactement le mode de défaillance « le champ déclaré, jamais affecté ».
    profilRetire: (await lireProfil(base, profilId)) === null
  };
}
