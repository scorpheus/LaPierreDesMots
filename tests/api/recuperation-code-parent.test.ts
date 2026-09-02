import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, describe, expect, it } from 'vitest';

import { RACINE_DEPOT } from '../configuration/preparation.js';

const SQL = readFileSync(
  join(RACINE_DEPOT, 'serveur', 'migrations', '011_recuperer-code-parent-implicite.sql'),
  'utf8',
);

let base: DatabaseSync | null = null;

function preparer(definiPar: string): DatabaseSync {
  base = new DatabaseSync(':memory:');
  base.exec(`
    CREATE TABLE code_parent (
      id INTEGER PRIMARY KEY,
      sel BLOB NOT NULL,
      empreinte BLOB NOT NULL,
      cree_le TEXT NOT NULL,
      modifie_le TEXT NOT NULL,
      defini_par TEXT NOT NULL
    ) STRICT;
    CREATE TABLE verrou_parent (
      id INTEGER PRIMARY KEY,
      nb_echecs INTEGER NOT NULL,
      verrouille_jusqua TEXT
    ) STRICT;
    INSERT INTO code_parent VALUES (
      1, X'01', X'02', '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z', '${definiPar}'
    );
    INSERT INTO verrou_parent VALUES (1, 6, '2026-09-02T20:08:05.795Z');
  `);
  return base;
}

afterEach(() => {
  base?.close();
  base = null;
});

describe('migration 011 — récupération du code parent hérité', () => {
  it('retire seulement le code posé implicitement et rouvre immédiatement la porte', () => {
    const db = preparer('ouverture-implicite');
    db.exec(SQL);

    expect(db.prepare('SELECT COUNT(*) AS n FROM code_parent').get()?.['n']).toBe(0);
    expect(db.prepare('SELECT nb_echecs, verrouille_jusqua FROM verrou_parent').get()).toEqual({
      nb_echecs: 0,
      verrouille_jusqua: null,
    });
  });

  it('conserve un code choisi explicitement et son verrou de sécurité', () => {
    const db = preparer('ecran-definition');
    db.exec(SQL);

    expect(db.prepare('SELECT defini_par FROM code_parent').get()?.['defini_par']).toBe(
      'ecran-definition',
    );
    expect(db.prepare('SELECT nb_echecs FROM verrou_parent').get()?.['nb_echecs']).toBe(6);
  });
});
