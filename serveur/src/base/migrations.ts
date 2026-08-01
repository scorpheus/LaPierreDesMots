/**
 * Applique les migrations SQL numerotees de `serveur/migrations/`.
 *
 * Contrat § 6.1 :
 * - fichiers `NNN_nom.sql`, `NNN` sur trois chiffres, appliques dans l'ordre lexical ;
 * - chacun dans une transaction ;
 * - la table de suivi est creee par le runner, jamais par une migration ;
 * - une migration deja appliquee dont l'empreinte a change est une **erreur bloquante**.
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import type { Horloge } from '@pierre/partage';

import { horodatage } from '../configuration.js';
import { dansTransaction } from './connexion.js';

export interface RapportMigration {
  readonly appliquees: readonly number[];
  readonly versionCourante: number;
}

/** `001_socle.sql` : trois chiffres, un souligne, un nom en minuscules. */
const MOTIF_FICHIER = /^(\d{3})_([a-z0-9-]+)\.sql$/;

const SQL_TABLE_SUIVI = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  nom         TEXT NOT NULL,
  empreinte   TEXT NOT NULL,
  applique_le TEXT NOT NULL
) STRICT;
`;

interface FichierMigration {
  readonly version: number;
  readonly nom: string;
  readonly chemin: string;
  readonly sql: string;
  readonly empreinte: string;
}

interface LigneSuivi {
  readonly version: number;
  readonly nom: string;
  readonly empreinte: string;
}

/**
 * Empreinte du contenu, fins de ligne normalisees en LF avant hachage.
 *
 * Sans cette normalisation, un depot clone sous Windows avec `core.autocrlf = true` (le defaut,
 * contrat § 0) verrait toutes ses migrations declarees modifiees des le premier demarrage, alors
 * qu'aucun caractere utile n'a bouge. On hache ce que la migration DIT, pas comment git l'a
 * ecrite sur ce disque-la.
 */
function empreinteDe(sql: string): string {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

/** Lit et trie les migrations du dossier. Un fichier hors motif est ignore en silence. */
export function listerMigrations(dossier: string): readonly FichierMigration[] {
  const entrees = readdirSync(dossier, { withFileTypes: true });
  const fichiers: FichierMigration[] = [];

  for (const entree of entrees) {
    if (!entree.isFile()) {
      continue;
    }
    const correspondance = MOTIF_FICHIER.exec(entree.name);
    if (correspondance === null) {
      continue;
    }
    const versionTexte = correspondance[1] ?? '';
    const nom = correspondance[2] ?? '';
    const chemin = path.join(dossier, entree.name);
    const sql = readFileSync(chemin, 'utf8');
    fichiers.push({
      version: Number.parseInt(versionTexte, 10),
      nom,
      chemin,
      sql,
      empreinte: empreinteDe(sql)
    });
  }

  fichiers.sort((a, b) => a.version - b.version);

  for (let i = 1; i < fichiers.length; i += 1) {
    const precedent = fichiers[i - 1];
    const courant = fichiers[i];
    if (precedent !== undefined && courant !== undefined && precedent.version === courant.version) {
      throw new Error(
        `Deux migrations portent la version ${String(courant.version)} : ` +
          `${precedent.chemin} et ${courant.chemin}.`
      );
    }
  }

  return fichiers;
}

/**
 * Applique tout ce qui manque et rend la liste des versions effectivement appliquees.
 *
 * Idempotent : un second appel sur la meme base rend `{ appliquees: [], versionCourante: N }`.
 */
export function appliquerMigrations(
  base: DatabaseSync,
  dossier: string,
  horloge: Horloge
): RapportMigration {
  base.exec(SQL_TABLE_SUIVI);

  const deja = new Map<number, LigneSuivi>();
  const lignes = base
    .prepare('SELECT version, nom, empreinte FROM schema_migrations ORDER BY version')
    .all() as unknown as LigneSuivi[];
  for (const ligne of lignes) {
    deja.set(Number(ligne.version), ligne);
  }

  const fichiers = listerMigrations(dossier);
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

    dansTransaction(base, () => {
      base.exec(fichier.sql);
      base
        .prepare(
          'INSERT INTO schema_migrations (version, nom, empreinte, applique_le) VALUES (?, ?, ?, ?)'
        )
        .run(fichier.version, fichier.nom, fichier.empreinte, String(horodatage(horloge)));
    });

    appliquees.push(fichier.version);
  }

  const derniere = fichiers.at(-1);

  return {
    appliquees,
    versionCourante: derniere === undefined ? 0 : derniere.version
  };
}
