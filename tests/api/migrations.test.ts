/**
 * Migrations SQLite — annexe T § T2, contrat gelé § 6.1.
 *
 * Trois propriétés du mécanisme, dans l'ordre où elles comptent :
 *
 * 1. Une base vierge reçoit **toutes** les migrations du dossier, dans l'ordre, et rien d'autre.
 * 2. Ré-appliquer est un non-événement : aucune migration n'est rejouée.
 * 3. **Une migration déjà appliquée dont l'empreinte a changé est une erreur BLOQUANTE**,
 *    pas un avertissement. C'est le point le plus facile à laisser filer et le plus coûteux :
 *    une migration modifiée après coup rend deux installations silencieusement différentes.
 *
 * Le troisième cas travaille sur une **copie** du dossier de migrations, dans
 * `tests/rapports/artefacts/` : L-G ne touche jamais aux fichiers de L-C.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * MODIFICATION DE TEST À L'INTÉGRATION — assumée et motivée (CLAUDE.md, boucle de travail,
 * point 4 : « corriger le code, jamais le test, SAUF si le test contredit les specs »).
 *
 * La version v1 écrivait en dur `expect(rapport.appliquees).toEqual([1])` et
 * `expect(lignes).toHaveLength(1)` : le dépôt ne portait alors qu'une migration. Le contrat
 * des features v2 § 6 en ajoute cinq — « Migrations SQL — 002 à 006, à la suite de
 * `001_socle.sql` » —, écrites par cinq lots distincts. Le nombre 1 est donc devenu une
 * **contradiction avec le plan gelé**, pas un défaut du code. Mesuré, sortie citée :
 *
 *   $ ls -1 serveur/migrations/
 *   001_socle.sql  002_lecture.sql  003_pedagogie.sql
 *   004_cascade.sql  005_monde.sql  006_parent.sql
 *
 * Aucune assertion n'est assouplie : la valeur attendue est désormais **lue sur disque** au
 * lieu d'être recopiée. Le test devient du même coup plus strict qu'avant — il exige que
 * `appliquees` soit exactement la liste des fichiers présents, dans l'ordre croissant, et
 * que chaque ligne de suivi porte une empreinte sha256 valide. Il n'a plus à être retouché
 * à la migration 007, et une migration ajoutée sans être appliquée le fait échouer.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appliquerMigrations } from '@serveur/base/migrations';
import { ouvrirBase } from '@serveur/base/connexion';

import type { DatabaseSync } from 'node:sqlite';

import {
  DOSSIER_MIGRATIONS,
  RACINE_DEPOT,
  horlogeDeTest
} from '../configuration/preparation.js';

// `RACINE_DEPOT` est un chemin système, pas une URL : `new URL(…)` levait « Invalid URL »
// et faisait échouer ce fichier entier au chargement, avant tout cas de test.
// Séparateur final conservé : `appliquerMigrations` et la ligne 138 concatènent directement.
const DOSSIER_TEMPORAIRE =
  join(RACINE_DEPOT, 'tests', 'rapports', 'artefacts', 'migrations-copie') + sep;

/**
 * Les versions attendues, **lues sur disque** et jamais recopiées. `001_socle.sql` → 1.
 * Un dossier vide rendrait le fichier entier trivialement vert : on l'interdit d'emblée.
 */
function migrationsSurDisque(
  dossier: string
): ReadonlyArray<{ readonly version: number; readonly nom: string }> {
  const trouvees = readdirSync(dossier)
    .map((fichier) => /^(\d{3})_([a-z0-9-]+)\.sql$/.exec(fichier))
    .filter((c): c is RegExpExecArray => c !== null)
    .map((c) => ({ version: Number.parseInt(c[1]!, 10), nom: c[2]! }))
    .sort((a, b) => a.version - b.version);
  if (trouvees.length === 0) throw new Error(`aucune migration dans ${dossier}`);
  return trouvees;
}

const MIGRATIONS_ATTENDUES = migrationsSurDisque(DOSSIER_MIGRATIONS);
const VERSIONS_ATTENDUES = MIGRATIONS_ATTENDUES.map((m) => m.version);
const DERNIERE_VERSION = VERSIONS_ATTENDUES[VERSIONS_ATTENDUES.length - 1]!;

let base: DatabaseSync;

beforeEach(() => {
  base = ouvrirBase(':memory:');
});

afterEach(() => {
  base.close();
  rmSync(DOSSIER_TEMPORAIRE, { recursive: true, force: true });
});

function tables(connexion: DatabaseSync): string[] {
  const lignes = connexion
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as Array<{ name: string }>;
  return lignes.map((l) => l.name);
}

describe('appliquerMigrations', () => {
  it('applique toutes les migrations du dossier et crée les trois tables du socle — contrat § 6.2', () => {
    const rapport = appliquerMigrations(base, DOSSIER_MIGRATIONS, horlogeDeTest());

    expect(rapport.appliquees).toEqual(VERSIONS_ATTENDUES);
    expect(rapport.versionCourante).toBe(DERNIERE_VERSION);
    for (const table of ['profils', 'tentatives', 'progression_noeud']) {
      expect(tables(base)).toContain(table);
    }
  });

  it('crée la table de suivi elle-même — jamais une migration ne s’en charge', () => {
    appliquerMigrations(base, DOSSIER_MIGRATIONS, horlogeDeTest());
    expect(tables(base)).toContain('schema_migrations');

    const lignes = base
      .prepare('SELECT version, nom, empreinte FROM schema_migrations ORDER BY version')
      .all() as Array<{
      version: number;
      nom: string;
      empreinte: string;
    }>;
    // Version ET nom, comparés aux fichiers réellement présents : une migration renommée ou
    // sautée se voit ici, pas seulement une migration manquante.
    expect(lignes.map((l) => ({ version: l.version, nom: l.nom }))).toEqual([
      ...MIGRATIONS_ATTENDUES
    ]);
    // sha256 en hexadécimal : 64 caractères — sur CHAQUE ligne, pas seulement la première.
    for (const ligne of lignes) {
      expect(ligne.empreinte, `empreinte de la migration ${ligne.version}`).toMatch(
        /^[0-9a-f]{64}$/
      );
    }
  });

  it('horodate avec l’horloge injectée, jamais avec l’heure réelle', () => {
    appliquerMigrations(base, DOSSIER_MIGRATIONS, horlogeDeTest());
    const ligne = base.prepare('SELECT applique_le FROM schema_migrations').get() as {
      applique_le: string;
    };
    expect(ligne.applique_le).toContain('2026-09-01');
  });

  it('est idempotente : la seconde application n’applique rien', () => {
    appliquerMigrations(base, DOSSIER_MIGRATIONS, horlogeDeTest());
    const second = appliquerMigrations(base, DOSSIER_MIGRATIONS, horlogeDeTest());

    expect(second.appliquees).toEqual([]);
    expect(second.versionCourante).toBe(DERNIERE_VERSION);
  });

  it('pose les contraintes du socle : `foreign_keys` refuse une tentative orpheline', () => {
    appliquerMigrations(base, DOSSIER_MIGRATIONS, horlogeDeTest());
    expect(() =>
      base
        .prepare(
          `INSERT INTO tentatives (id, cle_idempotence, profil_id, noeud_id, exercice_id,
             moteur, habillage, graine, demarre_le, termine_le, duree_ms, reussi,
             nb_erreurs, aide_utilisee, etoiles, detail_json)
           VALUES ('t1','k1','profil-fantome','n1','e1','colorie','h1',1,
             '2026-09-01T08:00:00Z','2026-09-01T08:01:00Z',1000,1,0,'aucune',3,'{}')`
        )
        .run()
    ).toThrow();
  });

  it('refuse une étoile hors bornes — la contrainte CHECK est bien posée', () => {
    appliquerMigrations(base, DOSSIER_MIGRATIONS, horlogeDeTest());
    base
      .prepare(
        `INSERT INTO profils (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
         VALUES ('p1','Alma','{}','clairiere','2026-09-01T08:00:00Z','2026-09-01T08:00:00Z')`
      )
      .run();
    expect(() =>
      base
        .prepare(
          `INSERT INTO progression_noeud (profil_id, noeud_id, etoiles, nb_tentatives, dernier_le)
           VALUES ('p1','clairiere-01',7,1,'2026-09-01T08:00:00Z')`
        )
        .run()
    ).toThrow();
  });
});

describe('une migration modifiée après coup est une erreur bloquante — contrat § 6.1', () => {
  it('lève, et n’applique rien de plus', () => {
    mkdirSync(DOSSIER_TEMPORAIRE, { recursive: true });
    cpSync(DOSSIER_MIGRATIONS, DOSSIER_TEMPORAIRE, { recursive: true });

    const horloge = horlogeDeTest();
    const premier = appliquerMigrations(base, DOSSIER_TEMPORAIRE, horloge);
    expect(premier.appliquees).toEqual(VERSIONS_ATTENDUES);

    // On altère la copie : un commentaire suffit, l'empreinte est un sha256 du fichier.
    const fichier = `${DOSSIER_TEMPORAIRE}001_socle.sql`;
    const contenu = readFileSync(fichier, 'utf8');
    writeFileSync(fichier, `${contenu}\n-- altération après application\n`, 'utf8');

    expect(() => appliquerMigrations(base, DOSSIER_TEMPORAIRE, horloge)).toThrow();
  });
});
