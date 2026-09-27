import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { ouvrirBase } from '@serveur/base/connexion';
import { appliquerMigrations } from '@serveur/base/migrations';
import { creerBaseNodeSqlite } from '@serveur/base/adaptateur-node-sqlite';
import type { Base } from '@pierre/partage/base';
import {
  CATALOGUE_MATHS, FETE_MATHS, PROJETS_MATHS, creerInstancesProjetMaths,
  estInstanceMaths, proposerAideMaths, validerMaths,
} from '@partage/mathematiques/index';
import type {
  FamilleMaths, NiveauMaths, ProjetMathsId, RepriseMaths,
} from '@partage/mathematiques/types';
import {
  creerPartieMaths, creerProjetMaths, lireEtatMaths, lirePartieMaths,
  manipulerPartieMaths, reconstruireProjectionsMaths, terminerPartieMaths,
  type ResultatValidationMaths,
} from '@partage/base/services/mathematiques';
import { DOSSIER_MIGRATIONS, horlogeDeTest } from '../../configuration/preparation.js';

const PROFIL = 'profil-vallee-complete';
const AUTRE_PROFIL = 'profil-vallee-autre';
const INSTANT = '2026-09-01T08:00:00.000Z';
const NIVEAUX: readonly NiveauMaths[] = ['decouverte', 'exploration', 'defi'];
const MAX_GESTES = 128;
const horloge = horlogeDeTest();
let sqlite: DatabaseSync;
let base: Base;

function compter(table: 'instances_maths' | 'sessions_projets_maths' | 'tentatives_maths' |
  'progression_maths' | 'progression_projets_maths' | 'recompenses_maths' |
  'tentatives' | 'progression_noeud' | 'formes_gobi', profilId = PROFIL): number {
  const ligne = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE profil_id = ?`).get(profilId) as { n: number };
  return Number(ligne.n);
}

function niveauCompatible(projetId: ProjetMathsId, graine: number): readonly [NiveauMaths, NiveauMaths, NiveauMaths] {
  for (const a of NIVEAUX) for (const b of NIVEAUX) for (const c of NIVEAUX) {
    const choix = [a, b, c] as const;
    try {
      const probe = creerInstancesProjetMaths({ profilId: PROFIL, generationMaths: 0,
        cleGeste: `probe-${projetId}`, projetId, niveaux: choix, graine,
        sessionId: `probe-${projetId}` });
      if (probe.etapes.length === 3) return choix;
    } catch {
      // Le générateur déclare ce tuple incompatible ; le prochain est essayé.
    }
  }
  throw new Error(`Aucun tuple de niveaux compatible pour ${projetId}.`);
}

/** Les propositions d'aide pilotent seulement le test ; tous les gestes traversent l'API durable. */
async function accomplir(repriseInitiale: RepriseMaths, cle: string): Promise<ResultatValidationMaths> {
  let reprise = repriseInitiale;
  for (let rang = 0; rang < MAX_GESTES; rang += 1) {
    if (!estInstanceMaths(reprise.instance)) throw new Error(`${cle} : instance non reprise par le registre.`);
    const validation = validerMaths(reprise.instance, reprise.etat);
    if (validation.statut === 'correcte') {
      const resultat = await terminerPartieMaths(base, horloge, {
        profilId: PROFIL, generationMaths: 0, instanceId: reprise.instance.id,
        revisionAttendue: reprise.revision, cleGeste: `${cle}-fin`,
        reponse: { famille: reprise.instance.famille, valeur: {} },
      });
      expect(resultat.validation.statut, `${cle} : validation du service`).toBe('correcte');
      expect(resultat.tentative?.instanceId, `${cle} : journal de l'instance`).toBe(reprise.instance.id);
      return resultat;
    }
    const geste = proposerAideMaths(reprise.instance, 'demonstration', reprise.etat).gestePropose;
    if (geste === null) {
      throw new Error(`${cle} (${reprise.instance.famille}/${reprise.instance.niveau}) : ` +
        `aide sans geste après ${rang} actions ; état ${validation.statut} — ${validation.raison}`);
    }
    const suivante = await manipulerPartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId: reprise.instance.id,
      revisionAttendue: reprise.revision, cleGeste: `${cle}-geste-${rang}`, geste,
    });
    if (JSON.stringify(suivante.reprise.etat) === JSON.stringify(reprise.etat)) {
      throw new Error(`${cle} (${reprise.instance.famille}/${reprise.instance.niveau}) : ` +
        `geste ${rang} sans effet : ${JSON.stringify(geste)}`);
    }
    reprise = suivante.reprise;
  }
  const statut = estInstanceMaths(reprise.instance) ? validerMaths(reprise.instance, reprise.etat).statut : 'instance inconnue';
  throw new Error(`${cle} (${reprise.instance.famille}/${reprise.instance.niveau}) : ` +
    `plus de ${MAX_GESTES} gestes ; état ${statut}`);
}

async function acheverProjet(projetId: ProjetMathsId, graine: number, cle: string,
  niveaux = niveauCompatible(projetId, graine)): Promise<{ sessionId: string; tentatives: readonly string[] }> {
  const avantInstances = compter('instances_maths');
  const avantTentatives = compter('tentatives_maths');
  const avantCadeaux = compter('recompenses_maths');
  const cadeauExistant = sqlite.prepare(`SELECT COUNT(*) AS n FROM recompenses_maths
    WHERE profil_id = ? AND projet_id = ?`).get(PROFIL, projetId) as { n: number };
  const dejaAcheve = (await lireEtatMaths(base, PROFIL)).projets
    .some((p) => p.projetId === projetId && p.termineLe !== null);
  const creation = await creerProjetMaths(base, horloge, {
    profilId: PROFIL, generationMaths: 0, cleGeste: `${cle}-creation`, projetId, niveaux, graine,
  });
  expect(creation.deja, `${projetId} créé une seule fois`).toBe(false);
  expect(compter('instances_maths') - avantInstances, `${projetId} : trois instances figées`).toBe(3);
  expect(creation.reprise.projet?.plan.map((e) => e.niveau)).toEqual(niveaux);
  const plan = creation.reprise.projet!.plan;
  expect(plan.map((e) => e.famille)).toEqual(
    projetId === FETE_MATHS.id ? FETE_MATHS.etapes : PROJETS_MATHS.find((p) => p.id === projetId)?.etapes,
  );
  await expect(lirePartieMaths(base, PROFIL, plan[1]!.instanceId))
    .rejects.toMatchObject({ code: 'conflit' });
  let reprise = creation.reprise;
  const tentatives: string[] = [];
  for (let rang = 0; rang < 3; rang += 1) {
    expect(reprise.instance.id, `${projetId} : ordre de l'étape ${rang}`).toBe(plan[rang]!.instanceId);
    const fin = await accomplir(reprise, `${cle}-etape-${rang}`);
    tentatives.push(fin.tentative!.id);
    expect(fin.tentative?.projetId).toBe(projetId);
    expect(compter('tentatives_maths') - avantTentatives).toBe(rang + 1);
    const journal = sqlite.prepare(`SELECT projet_etape AS rang, session_projet_id AS sessionId,
      famille, niveau FROM tentatives_maths WHERE instance_id = ?`).get(plan[rang]!.instanceId) as
      { rang: number; sessionId: string; famille: FamilleMaths; niveau: NiveauMaths };
    expect(journal).toEqual({ rang, sessionId: creation.sessionId,
      famille: plan[rang]!.famille, niveau: plan[rang]!.niveau });
    expect((await lireEtatMaths(base, PROFIL)).projets.find((p) => p.projetId === projetId)?.etapesTerminees)
      .toBe(dejaAcheve ? 3 : rang + 1);
    if (rang < 2) {
      expect(compter('recompenses_maths')).toBe(avantCadeaux);
      expect(fin.prochaineReprise?.instance.id).toBe(plan[rang + 1]!.instanceId);
      reprise = fin.prochaineReprise!;
    } else {
      expect(fin.prochaineReprise).toBeNull();
    }
  }
  const categorie = projetId === 'MAT-FET-P01' ? 'fete' :
    projetId.endsWith('P01') ? 'souvenir' : projetId.endsWith('P03') ? 'objet' : null;
  const cadeaux = sqlite.prepare(`SELECT projet_id AS projetId, categorie
    FROM recompenses_maths WHERE profil_id = ? AND projet_id = ?`).all(PROFIL, projetId) as
    { projetId: string; categorie: string }[];
  expect(cadeaux, `${projetId} : catégorie et attribution unique`).toEqual(
    categorie === null ? [] : [{ projetId, categorie }],
  );
  expect(compter('recompenses_maths') - avantCadeaux)
    .toBe(categorie === null || cadeauExistant.n > 0 ? 0 : 1);
  return { sessionId: creation.sessionId, tentatives };
}

beforeEach(async () => {
  sqlite = ouvrirBase(':memory:');
  base = creerBaseNodeSqlite(sqlite);
  await appliquerMigrations(base, DOSSIER_MIGRATIONS, horloge);
  for (const [id, prenom] of [[PROFIL, 'Alma'], [AUTRE_PROFIL, 'Noé']] as const) {
    sqlite.prepare(`INSERT INTO profils
      (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
      VALUES (?, ?, '{}', 'clairiere', ?, ?)`).run(id, prenom, INSTANT, INSTANT);
  }
});
afterEach(() => sqlite.close());

describe('vallée complète sur la base SQL partagée', () => {
  it('conserve le premier cadeau acquis quand deux sessions finissent au même instant', async () => {
    const sessions = [];
    for (const cle of ['egalite-a', 'egalite-b']) sessions.push(await creerProjetMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, projetId: 'MAT-PON-P01',
      niveaux: ['decouverte', 'decouverte', 'decouverte'], graine: 17, cleGeste: cle,
    }));
    // L'ordre des identifiants contredit volontairement l'ordre réel des réussites.
    sessions.sort((a, b) => b.sessionId.localeCompare(a.sessionId));
    for (const [rang, session] of sessions.entries()) {
      let reprise = await lirePartieMaths(base, PROFIL, session.reprise.instance.id);
      for (let etape = 0; etape < 3; etape += 1) {
        const fin = await accomplir(reprise, `egalite-${rang}-${etape}`);
        if (fin.prochaineReprise) reprise = fin.prochaineReprise;
      }
      if (rang === 0) {
        // Ancienne définition éditoriale, dans cette base synthétique uniquement.
        sqlite.prepare("UPDATE sessions_projets_maths SET cadeau_id = 'souvenir-historique' WHERE id = ?")
          .run(session.sessionId);
        await reconstruireProjectionsMaths(base, PROFIL);
      }
      expect((await lireEtatMaths(base, PROFIL)).recompenses).toMatchObject([
        { cadeauId: 'souvenir-historique', categorie: 'souvenir' },
      ]);
    }
    sqlite.prepare('DELETE FROM recompenses_maths WHERE profil_id = ?').run(PROFIL);
    await reconstruireProjectionsMaths(base, PROFIL);
    expect((await lireEtatMaths(base, PROFIL)).recompenses).toMatchObject([{ cadeauId: 'souvenir-historique' }]);
  });

  it('accomplit 18 familles × 3 niveaux, 18 projets et la fête sans crédit de lecture ni double cadeau', async () => {
    expect(CATALOGUE_MATHS).toHaveLength(18);
    expect(PROJETS_MATHS).toHaveLength(18);
    expect(new Set(CATALOGUE_MATHS.map((f) => f.id)).size).toBe(18);
    expect(new Set(PROJETS_MATHS.map((p) => p.id)).size).toBe(18);
    const fete = { profilId: PROFIL, generationMaths: 0, projetId: FETE_MATHS.id,
      niveaux: ['decouverte', 'decouverte', 'decouverte'] as const, graine: 19,
      cleGeste: 'fete-avant-projets' };
    await expect(creerProjetMaths(base, horloge, fete)).rejects.toMatchObject({ code: 'requete-invalide' });

    let libres = 0;
    const impasses: string[] = [];
    for (const famille of CATALOGUE_MATHS) {
      for (const niveau of NIVEAUX) {
        const cle = `libre-${famille.id}-${niveau}`;
        const creation = await creerPartieMaths(base, horloge, {
          profilId: PROFIL, generationMaths: 0, famille: famille.id, niveau,
          graine: 100 + libres, cleGeste: `${cle}-creation`,
        });
        expect(creation.reprise.instance.famille).toBe(famille.id);
        expect(creation.reprise.instance.niveau).toBe(niveau);
        try {
          const fin = await accomplir(creation.reprise, cle);
          expect(fin.tentative?.projetId).toBeNull();
          libres += 1;
        } catch (cause) { impasses.push(cause instanceof Error ? cause.message : String(cause)); }
        expect(compter('tentatives_maths')).toBe(libres);
      }
    }
    expect(impasses, 'toutes les familles doivent avoir un chemin de réussite guidée').toEqual([]);
    expect(libres).toBe(54);
    expect(compter('instances_maths')).toBe(54);
    expect(compter('sessions_projets_maths')).toBe(0);
    expect(compter('recompenses_maths')).toBe(0);
    expect(compter('tentatives')).toBe(0);
    expect(compter('progression_noeud')).toBe(0);
    expect(compter('formes_gobi')).toBe(0);

    let projetsAcheves = 0;
    for (const [rang, trame] of PROJETS_MATHS.entries()) {
      await acheverProjet(trame.id, 300 + rang, `projet-${trame.id}`);
      projetsAcheves += 1;
      expect(compter('sessions_projets_maths')).toBe(projetsAcheves);
      expect(compter('tentatives_maths')).toBe(54 + projetsAcheves * 3);
      expect(compter('recompenses_maths')).toBe(PROJETS_MATHS.slice(0, projetsAcheves)
        .filter((p) => p.id.endsWith('P01') || p.id.endsWith('P03')).length);
      if (projetsAcheves === 17) {
        await expect(creerProjetMaths(base, horloge, { ...fete, cleGeste: 'fete-apres-dix-sept' }))
          .rejects.toMatchObject({ code: 'requete-invalide' });
      }
    }
    expect(compter('recompenses_maths')).toBe(12);
    await acheverProjet(FETE_MATHS.id, 719, 'fete-complete', fete.niveaux);
    expect(compter('sessions_projets_maths')).toBe(19);
    expect(compter('tentatives_maths')).toBe(111);
    expect(compter('recompenses_maths')).toBe(13);

    const cadeauxAvantRejeu = sqlite.prepare(`SELECT projet_id, cadeau_id, categorie, attribue_le
      FROM recompenses_maths WHERE profil_id = ? ORDER BY projet_id`).all(PROFIL);
    await acheverProjet(PROJETS_MATHS[0]!.id, 905, 'rejeu-premier-projet');
    expect(compter('tentatives_maths')).toBe(114);
    expect(compter('recompenses_maths')).toBe(13);
    expect(sqlite.prepare(`SELECT projet_id, cadeau_id, categorie, attribue_le
      FROM recompenses_maths WHERE profil_id = ? ORDER BY projet_id`).all(PROFIL)).toEqual(cadeauxAvantRejeu);

    const avant = await lireEtatMaths(base, PROFIL);
    expect(avant.projets).toHaveLength(19);
    expect(avant.projets.every((p) => p.etapesTerminees === 3 && p.termineLe !== null)).toBe(true);
    expect(avant.recompenses).toHaveLength(13);
    expect(avant.tentatives).toHaveLength(114);
    expect(compter('progression_maths')).toBeGreaterThan(0);
    sqlite.prepare('DELETE FROM progression_maths WHERE profil_id = ?').run(PROFIL);
    sqlite.prepare('DELETE FROM progression_projets_maths WHERE profil_id = ?').run(PROFIL);
    sqlite.prepare('DELETE FROM recompenses_maths WHERE profil_id = ?').run(PROFIL);
    await reconstruireProjectionsMaths(base, PROFIL);
    const apres = await lireEtatMaths(base, PROFIL);
    expect(apres.progression).toEqual(avant.progression);
    expect(apres.projets).toEqual(avant.projets);
    expect(apres.recompenses).toEqual(avant.recompenses);
    expect(apres.tentatives).toEqual(avant.tentatives);
    expect(compter('tentatives')).toBe(0);
    expect(compter('progression_noeud')).toBe(0);
    expect(compter('formes_gobi')).toBe(0);

    const autre = await lireEtatMaths(base, AUTRE_PROFIL);
    expect(autre.tentatives).toEqual([]);
    expect(autre.projets).toEqual([]);
    expect(autre.recompenses).toEqual([]);
    expect(await lirePartieMaths(base, AUTRE_PROFIL, avant.tentatives[0]!.instanceId)).toBeNull();
    await expect(creerProjetMaths(base, horloge, { ...fete, profilId: AUTRE_PROFIL,
      cleGeste: 'fete-autre-profil' })).rejects.toMatchObject({ code: 'requete-invalide' });
  });
});
