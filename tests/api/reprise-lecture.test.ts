import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { ouvrirBase } from '@serveur/base/connexion';
import { appliquerMigrations } from '@serveur/base/migrations';
import { creerBaseNodeSqlite } from '@serveur/base/adaptateur-node-sqlite';
import type { Base } from '@pierre/partage/base';
import type { Exercice, Habillage, Noeud } from '@pierre/partage';
import type { InstantaneRepriseLecture } from '@pierre/partage/reprise-lecture';
import { ecrireRepriseLecture, effacerRepriseLecture, lireRepriseLecture } from
  '@partage/base/depots/reprise-lecture';
import { CHEMIN_EXERCICE_ECOLE, CHEMIN_NOEUD_CLAIRIERE, DOSSIER_MIGRATIONS,
  habillageEcole, horlogeDeTest, lireJson } from '../configuration/preparation.js';

const PROFIL = 'profil-reprise-synthetique' as InstantaneRepriseLecture['profil'];
const INSTANT = '2026-09-26T10:00:00.000Z';
const horloge = horlogeDeTest(INSTANT);
let sqlite: DatabaseSync;
let base: Base;

function instantane(): InstantaneRepriseLecture {
  const exercice = lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE);
  const noeud = lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE);
  const habillage: Habillage = habillageEcole();
  return {
    versionContrat: 1, profil: PROFIL, generationProgression: 0, revision: 0,
    sortie: null, rangSortie: null, paquet: { exercice, noeud, habillage },
    codeMoteur: exercice.jeu.moteur, versionMoteur: 1, graine: 17,
    etatMoteur: { indexConsigne: 0, remplissages: {}, nbErreurs: 0, niveauAide: 'aucune' },
    demarreLe: INSTANT, journalise: true, serie: 0,
    resume: null, etoiles: null, termineLe: null, tentativeEnvoyee: false,
    erreurConservation: null, suspenduLeMs: 1_790_416_800_000,
  };
}

beforeEach(async () => {
  sqlite = ouvrirBase(':memory:');
  base = creerBaseNodeSqlite(sqlite);
  await appliquerMigrations(base, DOSSIER_MIGRATIONS, horloge);
  sqlite.prepare(`INSERT INTO profils
    (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
    VALUES (?, 'Alma', '{}', 'clairiere', ?, ?)`).run(PROFIL, INSTANT, INSTANT);
});

afterEach(() => sqlite.close());

describe('dépôt de reprise lecture', () => {
  it('écrit puis relit le paquet et le moteur avec une révision, sans doubler une réémission', async () => {
    const premiere = instantane();
    expect(await ecrireRepriseLecture(base, horloge, premiere, null)).toBe(1);
    expect(await lireRepriseLecture(base, PROFIL)).toEqual({ ...premiere, revision: 1 });
    expect(await ecrireRepriseLecture(base, horloge, premiere, null)).toBe(1);
    const actualise = { ...premiere, revision: 1, etatMoteur: { ...premiere.etatMoteur as object,
      remplissages: { toit: 'bleu' } } };
    expect(await ecrireRepriseLecture(base, horloge, actualise, 1)).toBe(2);
    expect(await lireRepriseLecture(base, PROFIL)).toEqual({ ...actualise, revision: 2 });
    expect(sqlite.prepare('SELECT revision FROM reprises_lecture WHERE profil_id = ?').get(PROFIL))
      .toEqual({ revision: 2 });
  });

  it('rejette un geste concurrent et une ancienne génération, même réémis à l’identique', async () => {
    const premiere = instantane();
    await ecrireRepriseLecture(base, horloge, premiere, null);
    await expect(ecrireRepriseLecture(base, horloge, { ...premiere,
      etatMoteur: { indexConsigne: 1 } }, null))
      .rejects.toMatchObject({ code: 'revision-conflictuelle' });
    sqlite.prepare('UPDATE profils SET generation_progression = 1 WHERE id = ?').run(PROFIL);
    await expect(ecrireRepriseLecture(base, horloge, premiere, null))
      .rejects.toMatchObject({ code: 'generation-perimee' });
    await expect(lireRepriseLecture(base, PROFIL))
      .rejects.toMatchObject({ code: 'generation-perimee' });
  });

  it('rejette une enveloppe malformée et un JSON corrompu en base', async () => {
    await expect(ecrireRepriseLecture(base, horloge, { ...instantane(), paquet: {} }, null))
      .rejects.toThrow('Enveloppe de reprise lecture invalide');
    await expect(ecrireRepriseLecture(base, horloge, { ...instantane(), etatMoteur: new Map() }, null))
      .rejects.toThrow();
    await ecrireRepriseLecture(base, horloge, instantane(), null);
    sqlite.prepare("UPDATE reprises_lecture SET instantane_json = '{}' WHERE profil_id = ?").run(PROFIL);
    await expect(lireRepriseLecture(base, PROFIL))
      .rejects.toMatchObject({ code: 'instantane-corrompu' });
  });

  it('n’efface que la révision de la génération courante', async () => {
    await ecrireRepriseLecture(base, horloge, instantane(), null);
    await expect(effacerRepriseLecture(base, PROFIL, 0, 0))
      .rejects.toMatchObject({ code: 'revision-conflictuelle' });
    await effacerRepriseLecture(base, PROFIL, 0, 1);
    expect(await lireRepriseLecture(base, PROFIL)).toBeNull();
    await effacerRepriseLecture(base, PROFIL, 0, 1);
  });
});
