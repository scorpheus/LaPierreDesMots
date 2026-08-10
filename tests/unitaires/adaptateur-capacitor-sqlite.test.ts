/**
 * L'adaptateur `Base` sur `@capacitor-community/sqlite` — Lot 3 du portage Android
 * (Docs/addendum-portage-android.md § 3-4).
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER PEUT ET NE PEUT PAS PROUVER
 *
 * Il n'existe ni émulateur Android ni tablette dans cet environnement : le vrai plugin natif
 * `@capacitor-community/sqlite` ne peut pas tourner ici. Ce test ne rejoue donc pas le plugin —
 * il pose une fausse `SQLiteDBConnection`, de la MÊME FORME que celle du plugin (mêmes méthodes
 * async, mêmes signatures), mais adossée à `node:sqlite` (le même moteur SQLite que le serveur).
 * Ce que ça prouve : `creerBaseCapacitorSqlite` implémente correctement le contrat `Base` —
 * verrou, transactions, mise en forme des résultats — sur une forme d'API async équivalente à
 * celle du plugin réel. Ce que ça NE prouve PAS : que le plugin natif Android se comporte
 * exactement comme cette façade. Cette seconde preuve n'existe que sur appareil (Lot 5).
 * ═════════════════════════════════════════════════════════════════════════════════════════
 */
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import { appliquerMigrations, creerProfil, enregistrerTentative, lireProfil, listerProfils } from '@pierre/partage/base';
import type { Base } from '@pierre/partage/base';

import { creerBaseCapacitorSqlite } from '@client/base/adaptateur-capacitor-sqlite';

import { DOSSIER_MIGRATIONS, horlogeDeTest } from '../configuration/preparation.js';

/**
 * Une `SQLiteDBConnection` de la forme du plugin, adossée à `node:sqlite`. Seules les méthodes
 * que `creerBaseCapacitorSqlite` appelle réellement sont implémentées.
 */
function creerFausseConnexionCapacitor(): {
  readonly db: DatabaseSync;
  readonly connexion: Parameters<typeof creerBaseCapacitorSqlite>[0];
} {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  const connexion = {
    execute: (statements: string) => {
      db.exec(statements);
      return Promise.resolve({ changes: { changes: 0 } });
    },
    run: (sql: string, valeurs: unknown[] = []) => {
      const resultat = db.prepare(sql).run(...(valeurs as never[]));
      return Promise.resolve({
        changes: { changes: Number(resultat.changes), lastId: Number(resultat.lastInsertRowid) }
      });
    },
    query: (sql: string, valeurs: unknown[] = []) => {
      const lignes = db.prepare(sql).all(...(valeurs as never[]));
      return Promise.resolve({ values: lignes });
    },
    beginTransaction: () => {
      db.exec('BEGIN IMMEDIATE;');
      return Promise.resolve({ changes: { changes: 0 } });
    },
    commitTransaction: () => {
      db.exec('COMMIT;');
      return Promise.resolve({ changes: { changes: 0 } });
    },
    rollbackTransaction: () => {
      db.exec('ROLLBACK;');
      return Promise.resolve({ changes: { changes: 0 } });
    }
  } as unknown as Parameters<typeof creerBaseCapacitorSqlite>[0];

  return { db, connexion };
}

async function migrer(base: Base): Promise<void> {
  const { listerMigrations } = await import('@serveur/base/migrations');
  const fichiers = listerMigrations(DOSSIER_MIGRATIONS);
  await appliquerMigrations(base, fichiers, horlogeDeTest().maintenant());
}

describe('adaptateur Capacitor SQLite — conformité au contrat Base', () => {
  it('applique les mêmes migrations que le serveur, sans erreur', async () => {
    const { connexion } = creerFausseConnexionCapacitor();
    const base = creerBaseCapacitorSqlite(connexion);
    await expect(migrer(base)).resolves.not.toThrow();
  });

  it('écrit et relit un profil — même comportement que `creerBaseNodeSqlite`', async () => {
    const { connexion } = creerFausseConnexionCapacitor();
    const base = creerBaseCapacitorSqlite(connexion);
    await migrer(base);

    const horloge = horlogeDeTest();
    const cree = await creerProfil(
      base,
      { prenom: 'Alma', avatar: {} as never, paletteVariante: 'clairiere' },
      horloge
    );
    const relu = await lireProfil(base, cree.id);
    expect(relu).toEqual(cree);
    expect(await listerProfils(base)).toEqual([cree]);
  });

  it('une transaction annulée ne laisse AUCUNE trace — le rollback tient', async () => {
    const { connexion, db } = creerFausseConnexionCapacitor();
    const base = creerBaseCapacitorSqlite(connexion);
    await migrer(base);

    await expect(
      base.transaction(async () => {
        await base.lancer(
          `INSERT INTO profils (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
           VALUES ('p1', 'Test', '{}', 'clairiere', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z')`
        );
        throw new Error('échec délibéré, après une écriture réelle');
      })
    ).rejects.toThrow('échec délibéré');

    const compte = db.prepare('SELECT COUNT(*) AS n FROM profils').get() as { n: number };
    expect(Number(compte.n)).toBe(0);
  });

  it('les appels imbriqués DANS une transaction ne bloquent pas — le verrou est réentrant', async () => {
    const { connexion } = creerFausseConnexionCapacitor();
    const base = creerBaseCapacitorSqlite(connexion);
    await migrer(base);

    const horloge = horlogeDeTest();
    // `enregistrerTentative` ouvre sa propre transaction et, à l'intérieur, rappelle `base.*`
    // à de nombreuses reprises (lecture du profil, écriture de la progression, etc.) — un
    // verrou non réentrant se bloquerait ici indéfiniment (le test échouerait par timeout).
    const profil = await creerProfil(
      base,
      { prenom: 'Alma', avatar: {} as never, paletteVariante: 'clairiere' },
      horloge
    );

    const seuils = { etoilesParIntermediaire: 3, intermediairesParRare: 2, natureIntermediaire: 'forme-gobi', natureRare: 'zone-recoloriee' } as const;
    const referentiel = {
      regions: [], ouvertesEnParallele: 2, stades: [], formes: [], compagnons: [],
      campement: { scene: { fichier: '', viewBox: '0 0 1 1' }, points: [], objets: [] }
    } as never;

    const resultat = await enregistrerTentative(
      base,
      {
        cleIdempotence: 'cle-test-reentrance',
        profil: profil.id,
        noeud: 'clairiere-01',
        exercice: 'clairiere-ecole-01',
        moteur: 'colorie',
        habillage: 'clairiere.ecole',
        graine: 1,
        demarreLe: '2026-09-01T08:00:00Z',
        termineLe: '2026-09-01T08:01:00Z',
        resume: { reussi: true, nbErreurs: 0, aideUtilisee: 'aucune', dureeMs: 60_000, etapes: [] }
      },
      horloge,
      seuils,
      referentiel
    );
    expect(resultat.deja).toBe(false);
    expect(resultat.tentative.profil).toBe(profil.id);
  });
});
