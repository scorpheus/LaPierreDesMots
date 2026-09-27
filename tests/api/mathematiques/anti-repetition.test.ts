import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { ouvrirBase } from '@serveur/base/connexion';
import { appliquerMigrations } from '@serveur/base/migrations';
import { creerBaseNodeSqlite } from '@serveur/base/adaptateur-node-sqlite';
import type { Base } from '@pierre/partage/base';
import { creerAlea } from '@pierre/partage';
import type { Alea } from '@partage/alea';
import { choisirPontSansRepetition, genererPont } from '@partage/mathematiques/jeux/ponts/index';
import { creerPartieMaths } from '@partage/base/services/mathematiques';
import { representationMaths } from '@partage/mathematiques/index';
import { DOSSIER_MIGRATIONS, horlogeDeTest } from '../../configuration/preparation.js';

const PROFIL = 'profil-anti-repetition';
const INSTANT = '2026-09-01T08:00:00.000Z';
const horloge = horlogeDeTest();
let sqlite: DatabaseSync;
let base: Base;

beforeEach(async () => {
  sqlite = ouvrirBase(':memory:');
  base = creerBaseNodeSqlite(sqlite);
  await appliquerMigrations(base, DOSSIER_MIGRATIONS, horloge);
  sqlite.prepare(`INSERT INTO profils
    (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
    VALUES (?, 'Alma', '{}', 'clairiere', ?, ?)`).run(PROFIL, INSTANT, INSTANT);
});

afterEach(() => sqlite.close());

describe('anti-répétition durable des parties libres', () => {
  it('varie le patron présenté quand le même problème des six faces doit se répéter', async () => {
    const presentations: string[] = [];
    for (let rang = 0; rang < 8; rang += 1) {
      const partie = await creerPartieMaths(base, horloge, { profilId: PROFIL,
        generationMaths: 0, famille: 'MAT-CHA-02', niveau: 'decouverte',
        graine: 42, cleGeste: `patron-${rang}` });
      const presentation = representationMaths(partie.reprise.instance);
      expect(presentations.slice(-5)).not.toContain(presentation);
      presentations.push(presentation);
    }
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives_maths').get()).toEqual({ n: 0 });
  });
  it('choisit une autre signature avec la même graine et garde la graine effectivement retenue', async () => {
    const demande = { profilId: PROFIL, generationMaths: 0, famille: 'MAT-PON-01' as const,
      niveau: 'decouverte' as const, graine: 42, cleGeste: 'libre-1' };
    const premiere = await creerPartieMaths(base, horloge, demande);
    const deuxieme = await creerPartieMaths(base, horloge, { ...demande, cleGeste: 'libre-2' });
    expect(deuxieme.deja).toBe(false);
    expect(deuxieme.reprise.instance.signature).not.toBe(premiere.reprise.instance.signature);
    expect(deuxieme.reprise.signaturesRecentes['MAT-PON-01']).toEqual([
      premiere.reprise.instance.signature, deuxieme.reprise.instance.signature,
    ]);
    const ligne = sqlite.prepare(`SELECT graine, version_modele, version_generateur,
      signature, instance_json FROM instances_maths WHERE id = ?`).get(deuxieme.reprise.instance.id) as {
      graine: number; version_modele: number; version_generateur: number;
      signature: string; instance_json: string;
    };
    expect(ligne.graine).toBe(deuxieme.reprise.instance.graine);
    expect(ligne.version_modele).toBe(deuxieme.reprise.instance.versionModele);
    expect(ligne.version_generateur).toBe(deuxieme.reprise.instance.versionGenerateur);
    expect(ligne.signature).toBe(deuxieme.reprise.instance.signature);
    expect(JSON.parse(ligne.instance_json)).toEqual(deuxieme.reprise.instance);
    expect(await creerPartieMaths(base, horloge, demande)).toEqual({ deja: true, reprise: premiere.reprise });
  });

  it('borne l’historique aux cinq dernières signatures du même niveau', async () => {
    const demande = { profilId: PROFIL, generationMaths: 0, famille: 'MAT-PON-01' as const,
      niveau: 'decouverte' as const, graine: 13 };
    const signatures: string[] = [];
    for (let rang = 0; rang < 7; rang += 1) {
      const resultat = await creerPartieMaths(base, horloge,
        { ...demande, cleGeste: `libre-${String(rang)}` });
      signatures.push(resultat.reprise.instance.signature);
      expect(resultat.reprise.signaturesRecentes['MAT-PON-01']).toEqual(signatures.slice(-5));
    }
    const autreNiveau = await creerPartieMaths(base, horloge,
      { ...demande, niveau: 'exploration', cleGeste: 'autre-niveau' });
    expect(autreNiveau.reprise.signaturesRecentes['MAT-PON-01'])
      .toEqual([autreNiveau.reprise.instance.signature]);
  });

  it('arrête la recherche après douze candidats quand la répétition est inévitable', () => {
    const signature = genererPont('MAT-PON-01', 'decouverte', creerAlea(42)).signature;
    let tirages = 0;
    const alea = { graine: 42, entier: () => { tirages += 1; return 42; } } as Alea;
    const choix = choisirPontSansRepetition('MAT-PON-01', 'decouverte', alea, [signature]);
    expect(tirages).toBe(12);
    expect(choix.repetitionInevitable).toBe(true);
    expect(choix.instance.signature).toBe(signature);
  });
});
