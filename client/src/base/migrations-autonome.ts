/**
 * Migrations SQL embarquées au build — mode autonome uniquement (Lot 3/5 du portage Android,
 * Docs/addendum-portage-android.md § 6). Le serveur LIT `serveur/migrations/*.sql` sur disque
 * via `node:fs` (`serveur/src/base/migrations.ts`) ; l'app autonome n'a pas de disque serveur à
 * lire, les 10 fichiers sont donc EMBARQUÉS dans le bundle par Vite (`import.meta.glob`, mode
 * `--mode autonome` du Lot 5 seulement — voir aussi `client/vite.config.ts` quand ce mode
 * existera). Le mode LAN ne référence jamais ce fichier.
 */

import { appliquerMigrations, hacherSha256Hex } from '@pierre/partage/base';
import type { Base, FichierMigration, RapportMigration } from '@pierre/partage/base';

/** Les 10 fichiers `NNN_nom.sql`, lus en texte brut à la compilation (`?raw`). */
const SOURCES_BRUTES = import.meta.glob('../../../serveur/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

/** `001_socle.sql` : trois chiffres, un souligne, un nom en minuscules. */
const MOTIF_FICHIER = /^(\d{3})_([a-z0-9-]+)\.sql$/;

/**
 * Les migrations, triées et hachées — même empreinte (sha256, fins de ligne normalisées en LF)
 * que `serveur/src/base/migrations.ts`, pour que le contrat reste identique des deux côtés même
 * si les deux bases ne se comparent jamais entre elles.
 */
async function migrationsEmbarquees(): Promise<readonly FichierMigration[]> {
  const brutes: { readonly version: number; readonly nom: string; readonly sql: string }[] = [];
  for (const [chemin, sql] of Object.entries(SOURCES_BRUTES)) {
    const nomFichier = chemin.split('/').at(-1) ?? '';
    const correspondance = MOTIF_FICHIER.exec(nomFichier);
    if (correspondance === null) {
      continue;
    }
    brutes.push({
      version: Number.parseInt(correspondance[1]!, 10),
      nom: correspondance[2]!,
      sql
    });
  }
  brutes.sort((a, b) => a.version - b.version);

  const fichiers: FichierMigration[] = [];
  for (const brute of brutes) {
    fichiers.push({
      version: brute.version,
      nom: brute.nom,
      sql: brute.sql,
      empreinte: await hacherSha256Hex(brute.sql.replace(/\r\n/g, '\n'))
    });
  }
  return fichiers;
}

/**
 * Applique les migrations embarquées à la base autonome. Lève si le bundle n'en contient
 * aucune : un build sans migrations embarquées est un build cassé, pas une base neuve.
 */
export async function migrerBaseAutonome(base: Base, horodatageIso: string): Promise<RapportMigration> {
  const fichiers = await migrationsEmbarquees();
  if (fichiers.length === 0) {
    throw new Error('Aucune migration embarquée : le build autonome est incomplet.');
  }
  return appliquerMigrations(base, fichiers, horodatageIso);
}
