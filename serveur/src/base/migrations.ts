/**
 * Lecture des migrations SQL sur DISQUE, et application via le runner partagé.
 *
 * `node:fs` est SERVEUR-SEUL (Docs/addendum-portage-android.md § 3) : la lecture des fichiers
 * `NNN_nom.sql` reste ici, la logique d'application (idempotence, empreintes, table de suivi)
 * est partagée avec l'app Android autonome via `@pierre/partage/base` — celle-ci reçoit ses
 * migrations déjà lues (embarquées au build) plutôt que de les lire sur un disque qu'elle n'a
 * pas.
 *
 * Contrat § 6.1, inchangé :
 * - fichiers `NNN_nom.sql`, `NNN` sur trois chiffres, appliques dans l'ordre lexical ;
 * - une migration deja appliquee dont l'empreinte a change est une erreur bloquante.
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type { Horloge } from '@pierre/partage';
import type { Base, FichierMigration, RapportMigration } from '@pierre/partage/base';
import { appliquerMigrations as appliquerMigrationsPartagees } from '@pierre/partage/base';

/** `001_socle.sql` : trois chiffres, un souligne, un nom en minuscules. */
const MOTIF_FICHIER = /^(\d{3})_([a-z0-9-]+)\.sql$/;

interface FichierMigrationLocal extends FichierMigration {
  readonly chemin: string;
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
export function listerMigrations(dossier: string): readonly FichierMigrationLocal[] {
  const entrees = readdirSync(dossier, { withFileTypes: true });
  const fichiers: FichierMigrationLocal[] = [];

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

/** Lit le dossier de migrations et les applique. Voir `appliquerMigrations` (partagée) pour le contrat. */
export async function appliquerMigrations(
  base: Base,
  dossier: string,
  horloge: Horloge
): Promise<RapportMigration> {
  const fichiers = listerMigrations(dossier);
  return appliquerMigrationsPartagees(base, fichiers, horloge.maintenant());
}
