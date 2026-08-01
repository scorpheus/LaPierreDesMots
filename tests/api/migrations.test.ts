/**
 * Migrations SQLite — annexe T § T2, contrat gelé § 6.1.
 *
 * Trois propriétés du mécanisme, dans l'ordre où elles comptent :
 *
 * 1. Une base vierge reçoit `001_socle.sql` et rien d'autre.
 * 2. Ré-appliquer est un non-événement : aucune migration n'est rejouée.
 * 3. **Une migration déjà appliquée dont l'empreinte a changé est une erreur BLOQUANTE**,
 *    pas un avertissement. C'est le point le plus facile à laisser filer et le plus coûteux :
 *    une migration modifiée après coup rend deux installations silencieusement différentes.
 *
 * Le troisième cas travaille sur une **copie** du dossier de migrations, dans
 * `tests/rapports/artefacts/` : L-G ne touche jamais aux fichiers de L-C.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  it('crée les trois tables du socle sur une base vierge — contrat § 6.2', () => {
    const rapport = appliquerMigrations(base, DOSSIER_MIGRATIONS, horlogeDeTest());

    expect(rapport.appliquees).toEqual([1]);
    expect(rapport.versionCourante).toBe(1);
    for (const table of ['profils', 'tentatives', 'progression_noeud']) {
      expect(tables(base)).toContain(table);
    }
  });

  it('crée la table de suivi elle-même — jamais une migration ne s’en charge', () => {
    appliquerMigrations(base, DOSSIER_MIGRATIONS, horlogeDeTest());
    expect(tables(base)).toContain('schema_migrations');

    const lignes = base.prepare('SELECT version, nom, empreinte FROM schema_migrations').all() as Array<{
      version: number;
      nom: string;
      empreinte: string;
    }>;
    expect(lignes).toHaveLength(1);
    expect(lignes[0]!.version).toBe(1);
    // sha256 en hexadécimal : 64 caractères.
    expect(lignes[0]!.empreinte).toMatch(/^[0-9a-f]{64}$/);
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
    expect(second.versionCourante).toBe(1);
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
    expect(premier.appliquees).toEqual([1]);

    // On altère la copie : un commentaire suffit, l'empreinte est un sha256 du fichier.
    const fichier = `${DOSSIER_TEMPORAIRE}001_socle.sql`;
    const contenu = readFileSync(fichier, 'utf8');
    writeFileSync(fichier, `${contenu}\n-- altération après application\n`, 'utf8');

    expect(() => appliquerMigrations(base, DOSSIER_TEMPORAIRE, horloge)).toThrow();
  });
});
