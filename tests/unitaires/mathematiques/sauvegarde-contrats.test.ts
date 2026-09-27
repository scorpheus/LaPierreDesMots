import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { ouvrirBase } from '@serveur/base/connexion';
import { appliquerMigrations, listerMigrations } from '@serveur/base/migrations';
import { creerBaseNodeSqlite } from '@serveur/base/adaptateur-node-sqlite';
import { appliquerMigrations as appliquerFichiers } from '@partage/base/migrations';
import { DOSSIER_MIGRATIONS, horlogeDeTest } from '../../configuration/preparation.js';
import { verifierIntegriteEtTables } from '@client/base/validation-sauvegarde-sqlite';

const TABLES_VALLEE = [
  'reprises_lecture', 'sessions_projets_maths', 'instances_maths', 'reprises_maths',
  'actions_maths', 'tentatives_maths', 'progression_maths',
  'progression_projets_maths', 'recompenses_maths', 'preferences_niveaux_maths',
];
let sqlite: DatabaseSync;
function verifier(cible = sqlite): void {
  verifierIntegriteEtTables({
    selectValue: (sql) => { const ligne = cible.prepare(sql).get(); return ligne === undefined ? undefined : Object.values(ligne)[0]; },
    selectValues: (sql) => cible.prepare(sql).all().map((ligne) => Object.values(ligne)[0]),
  });
}

beforeEach(async () => {
  sqlite = ouvrirBase(':memory:');
  await appliquerMigrations(creerBaseNodeSqlite(sqlite), DOSSIER_MIGRATIONS, horlogeDeTest());
});
afterEach(() => sqlite.close());

describe('contrat des sauvegardes SQLite PWA v14', () => {
  it('fait passer une base v12 à v14 sans réécrire la tentative de lecture', async () => {
    const ancienne = ouvrirBase(':memory:');
    try {
      const base = creerBaseNodeSqlite(ancienne);
      const fichiers = listerMigrations(DOSSIER_MIGRATIONS);
      await appliquerFichiers(base, fichiers.filter((fichier) => fichier.version <= 12),
        horlogeDeTest().maintenant());
      ancienne.prepare(`INSERT INTO profils
        (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
        VALUES ('profil-v12', 'Alma', '{}', 'clairiere', '2026-09-01', '2026-09-01')`).run();
      ancienne.prepare(`INSERT INTO tentatives
        (id, cle_idempotence, profil_id, noeud_id, exercice_id, moteur, habillage,
         graine, demarre_le, termine_le, duree_ms, reussi, nb_erreurs, aide_utilisee,
         etoiles, detail_json)
        VALUES ('lecture-v12', 'lecture-v12', 'profil-v12', 'clairiere-01',
          'exercice-v12', 'attrape', 'clairiere', 1, '2026-09-01', '2026-09-01',
          100, 1, 0, 'aucune', 3, '{}')`).run();
      const lectureAvant = ancienne.prepare('SELECT * FROM tentatives').all();
      await appliquerFichiers(base, fichiers, horlogeDeTest().maintenant());
      expect(() => verifier(ancienne)).not.toThrow();
      expect(ancienne.prepare('SELECT * FROM tentatives').all()).toEqual(lectureAvant);
      expect(ancienne.prepare(`SELECT generation_progression, generation_maths
        FROM profils WHERE id = 'profil-v12'`).get())
        .toEqual({ generation_progression: 0, generation_maths: 0 });
      for (const table of TABLES_VALLEE) {
        if (table === 'reprises_lecture') continue;
        expect(ancienne.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get()).toEqual({ n: 0 });
      }
    } finally { ancienne.close(); }
  });

  it('accepte puis migre une sauvegarde v13 sans préférence', async () => {
    const ancienne = ouvrirBase(':memory:');
    try {
      const base = creerBaseNodeSqlite(ancienne);
      const fichiers = listerMigrations(DOSSIER_MIGRATIONS);
      await appliquerFichiers(base, fichiers.filter((fichier) => fichier.version <= 13),
        horlogeDeTest().maintenant());
      expect(() => verifier(ancienne)).not.toThrow();
      await appliquerFichiers(base, fichiers, horlogeDeTest().maintenant());
      expect(() => verifier(ancienne)).not.toThrow();
      expect(ancienne.prepare('SELECT COUNT(*) AS n FROM preferences_niveaux_maths').get()).toEqual({ n: 0 });
    } finally { ancienne.close(); }
  });

  it('refuse une v14 amputée de n’importe quelle table de la vallée', () => {
    expect(() => verifier()).not.toThrow();
    for (const table of TABLES_VALLEE) {
      sqlite.exec('BEGIN;');
      try {
        sqlite.exec(`DROP TABLE "${table}";`);
        expect(() => verifier()).toThrow('tables absentes');
      } finally { sqlite.exec('ROLLBACK;'); }
    }
  });

  it('détecte les clés étrangères cassées même quand integrity_check répond ok', () => {
    sqlite.exec('PRAGMA foreign_keys = OFF;');
    sqlite.prepare(`INSERT INTO profils
      (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
      VALUES ('profil-orphan', 'Alma', '{}', 'clairiere', '2026-09-01', '2026-09-01')`).run();
    sqlite.prepare(`INSERT INTO tentatives_maths
      (id, instance_id, profil_id, generation_maths, cle_geste, empreinte_requete,
       famille, niveau, session_projet_id, projet_id, projet_etape, nb_erreurs,
       aide_utilisee, etoiles, solution_json, notions_json, contexte_json, termine_le)
      VALUES ('tma-orphan', 'instance-absente', 'profil-orphan', 0, 'fin-orphan',
        'empreinte', 'MAT-PON-03', 'decouverte', NULL, NULL, NULL, 0,
        'aucune', 3, '{}', '[]', '{}', '2026-09-01')`).run();
    sqlite.exec('PRAGMA foreign_keys = ON;');
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).not.toEqual([]);
    expect(() => verifier()).toThrow('profil ou la partie est absent');
  });
  it('refuse une génération manquante et une version future avant import', () => {
    for (const colonne of ['generation_progression', 'generation_maths']) {
      sqlite.exec('BEGIN;');
      try {
        sqlite.exec(`ALTER TABLE profils DROP COLUMN "${colonne}";`);
        expect(() => verifier()).toThrow('génération');
      } finally { sqlite.exec('ROLLBACK;'); }
    }
    sqlite.exec('UPDATE schema_migrations SET version = 15 WHERE version = 14;');
    expect(() => verifier()).toThrow('Version de sauvegarde');
  });
});
