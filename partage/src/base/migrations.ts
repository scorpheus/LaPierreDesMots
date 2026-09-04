/**
 * Application des migrations SQL — logique pure, partagée entre le serveur (qui lit les
 * fichiers `serveur/migrations/*.sql` via `node:fs`) et l'app Android autonome (qui les reçoit
 * embarquées au build). Ce fichier ne touche jamais le disque : il reçoit des migrations déjà
 * lues et un `Base` déjà ouvert.
 *
 * Contrat § 6.1, inchangé par le portage :
 * - fichiers `NNN_nom.sql`, `NNN` sur trois chiffres, appliqués dans l'ordre lexical ;
 * - chacun dans une transaction ;
 * - la table de suivi est créée par le runner, jamais par une migration ;
 * - une migration déjà appliquée dont l'empreinte a changé est une erreur bloquante.
 */

import type { Base } from './contrat.js';

export interface RapportMigration {
  readonly appliquees: readonly number[];
  readonly versionCourante: number;
}

/** Une migration déjà chargée en mémoire — le chargement (disque ou bundle) est du ressort de l'appelant. */
export interface FichierMigration {
  readonly version: number;
  readonly nom: string;
  readonly sql: string;
  readonly empreinte: string;
}

interface LigneSuivi {
  readonly version: number;
  readonly nom: string;
  readonly empreinte: string;
}

const SQL_TABLE_SUIVI = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  nom         TEXT NOT NULL,
  empreinte   TEXT NOT NULL,
  applique_le TEXT NOT NULL
) STRICT;
`;

/**
 * Applique tout ce qui manque et rend la liste des versions effectivement appliquées.
 *
 * Idempotent : un second appel sur la même base rend `{ appliquees: [], versionCourante: N }`.
 * `fichiers` doit être trié par version croissante et sans doublon — c'est la responsabilité du
 * chargeur (`listerMigrations` côté serveur, l'équivalent bundlé côté autonome).
 */
export async function appliquerMigrations(
  base: Base,
  fichiers: readonly FichierMigration[],
  horodatageIso: string
): Promise<RapportMigration> {
  await base.executer(SQL_TABLE_SUIVI);

  const deja = new Map<number, LigneSuivi>();
  const lignes = await base.lignes<LigneSuivi>(
    'SELECT version, nom, empreinte FROM schema_migrations ORDER BY version'
  );
  for (const ligne of lignes) {
    deja.set(Number(ligne.version), ligne);
  }

  const appliquees: number[] = [];

  for (const fichier of fichiers) {
    const enregistree = deja.get(fichier.version);

    if (enregistree !== undefined) {
      if (String(enregistree.empreinte) !== fichier.empreinte) {
        throw new Error(
          `Migration ${String(fichier.version)} (${fichier.nom}) modifiee apres coup : ` +
            `empreinte en base ${String(enregistree.empreinte)}, empreinte du fichier ${fichier.empreinte}. ` +
            `Une migration appliquee ne se reecrit pas — il en faut une nouvelle.`
        );
      }
      continue;
    }

    await base.transaction(async (transaction) => {
      await transaction.executer(fichier.sql);
      await transaction.lancer(
        'INSERT INTO schema_migrations (version, nom, empreinte, applique_le) VALUES (?, ?, ?, ?)',
        [fichier.version, fichier.nom, fichier.empreinte, horodatageIso]
      );
    });

    appliquees.push(fichier.version);
  }

  const derniere = fichiers.at(-1);

  return {
    appliquees,
    versionCourante: derniere === undefined ? 0 : derniere.version
  };
}
