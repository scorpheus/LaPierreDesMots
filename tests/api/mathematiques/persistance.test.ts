import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { ouvrirBase } from '@serveur/base/connexion';
import { appliquerMigrations } from '@serveur/base/migrations';
import { creerBaseNodeSqlite } from '@serveur/base/adaptateur-node-sqlite';
import type { Base } from '@pierre/partage/base';
import { temoinsPont } from '@partage/mathematiques/jeux/ponts/index';
import { estInstancePont, estInstanceHorloge, creerInstanceMaths, proposerAideMaths, validerMaths } from '@partage/mathematiques/index';
import type { GesteMaths, RepriseMaths } from '@partage/mathematiques/types';
import {
  creerPartieMaths, creerProjetMaths, lireBilanParentMaths, lireEtatMaths,
  lirePartieMaths, manipulerPartieMaths,
  mettreEnPausePartieMaths, reconstruireProjectionsMaths, terminerPartieMaths
} from '@partage/base/services/mathematiques';
import { DOSSIER_MIGRATIONS, horlogeDeTest } from '../../configuration/preparation.js';

const PROFIL = 'profil-maths-synthetique';
const INSTANT = '2026-09-01T08:00:00.000Z';

let sqlite: DatabaseSync;
let base: Base;
const horloge = horlogeDeTest();

function placementsResolus(reprise: RepriseMaths): Readonly<Record<string, number | string>> {
  if (!estInstancePont(reprise.instance)) throw new Error('Instance effectivement créée incompatible.');
  const temoin = temoinsPont(reprise.instance)[0];
  if (temoin === undefined) throw new Error('Aucune solution pour l’instance effectivement créée.');
  return temoin.placements;
}

const demande = { profilId: PROFIL, generationMaths: 0, famille: 'MAT-PON-03' as const,
  niveau: 'decouverte' as const, graine: 42, cleGeste: 'creer-1' };

beforeEach(async () => {
  sqlite = ouvrirBase(':memory:');
  base = creerBaseNodeSqlite(sqlite);
  await appliquerMigrations(base, DOSSIER_MIGRATIONS, horloge);
  sqlite.prepare(`INSERT INTO profils
    (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
    VALUES (?, 'Alma', '{}', 'clairiere', ?, ?)`).run(PROFIL, INSTANT, INSTANT);
});

afterEach(() => sqlite.close());

describe('journal et reprise mathématiques', () => {
  it('reprend et termine une instance du générateur précédent sans changer ses horaires', async () => {
    const ancienne = JSON.parse(readFileSync(new URL('../../fixtures/mathematiques/horloge-trajets-generateur-v1.json', import.meta.url), 'utf8')) as unknown;
    if (!estInstanceHorloge(ancienne) || ancienne.famille !== 'MAT-HOR-03') throw new Error('Fixture historique incompatible.');
    const commande = { ...demande, famille: 'MAT-HOR-03' as const, niveau: 'exploration' as const, graine: ancienne.graine, cleGeste: 'ancienne-horloge' };
    const nouvelle = creerInstanceMaths(commande);
    expect(nouvelle.versionGenerateur).toBe(2);
    expect(nouvelle.parametres).not.toEqual(ancienne.parametres);
    const creee = await creerPartieMaths(base, horloge, commande);
    const historique = { ...ancienne, id: creee.reprise.instance.id };
    // Ce jeu de données synthétique représente les octets exportés par la version précédente.
    sqlite.prepare(`UPDATE instances_maths SET instance_json = ?, version_generateur = 1,
      graine = ?, signature = ? WHERE id = ?`).run(JSON.stringify(historique), historique.graine, historique.signature, historique.id);
    let reprise = (await lirePartieMaths(base, PROFIL, historique.id))!;
    expect(reprise.instance).toEqual(historique);
    expect(reprise.etat).toEqual(ancienne.etatInitial);
    for (let rang = 0; rang < 10; rang += 1) {
      if (validerMaths(historique, reprise.etat).statut === 'correcte') break;
      const geste = proposerAideMaths(historique, 'demonstration', reprise.etat).gestePropose;
      expect(geste).not.toBeNull();
      reprise = (await manipulerPartieMaths(base, horloge, { profilId: PROFIL,
        generationMaths: 0, instanceId: historique.id, revisionAttendue: reprise.revision,
        cleGeste: `ancienne-horloge-${rang}`, geste: geste! })).reprise;
    }
    const resultat = await terminerPartieMaths(base, horloge, { profilId: PROFIL,
      generationMaths: 0, instanceId: historique.id, revisionAttendue: reprise.revision,
      cleGeste: 'ancienne-horloge-fin', reponse: { famille: historique.famille, valeur: reprise.etat } });
    expect(resultat.validation.statut).toBe('correcte');
    expect(resultat.tentative?.definition?.versionGenerateur).toBe(1);
    expect((await lirePartieMaths(base, PROFIL, historique.id))?.instance).toEqual(historique);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives').get()).toEqual({ n: 0 });
  });
  it('enregistre une instance avant de la rendre et distingue deux parties de même graine', async () => {
    const premiere = await creerPartieMaths(base, horloge, demande);
    expect(premiere.deja).toBe(false);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM instances_maths').get()).toEqual({ n: 1 });
    expect((await lirePartieMaths(base, PROFIL, premiere.reprise.instance.id))?.instance).toEqual(premiere.reprise.instance);
    expect((await creerPartieMaths(base, horloge, demande)).deja).toBe(true);
    const seconde = await creerPartieMaths(base, horloge, { ...demande, cleGeste: 'creer-2' });
    expect(seconde.reprise.instance.id).not.toBe(premiere.reprise.instance.id);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM instances_maths').get()).toEqual({ n: 2 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives').get()).toEqual({ n: 0 });
  });

  it('conserve le dernier geste confirmé et refuse une clé réutilisée avec un autre contenu', async () => {
    const creee = await creerPartieMaths(base, horloge, demande);
    const instanceId = creee.reprise.instance.id;
    const ecriture = { profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: 0, cleGeste: 'geste-1',
      geste: { type: 'placer' as const, objetId: 'module-a', position: 0 } };
    const premiere = await manipulerPartieMaths(base, horloge, ecriture);
    expect(premiere.reprise.revision).toBe(1);
    expect((await manipulerPartieMaths(base, horloge, ecriture)).deja).toBe(true);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM actions_maths').get()).toEqual({ n: 1 });
    await expect(manipulerPartieMaths(base, horloge, {
      ...ecriture, geste: { type: 'retirer', objetId: 'module-a' }
    })).rejects.toMatchObject({ code: 'conflit' });
    await expect(manipulerPartieMaths(base, horloge, { ...ecriture, cleGeste: 'geste-2' }))
      .rejects.toMatchObject({ code: 'conflit' });
    expect((await lirePartieMaths(base, PROFIL, instanceId))?.revision).toBe(1);
  });

  it('refuse de rejouer un état ou un accusé dont la version est inconnue', async () => {
    const creee = await creerPartieMaths(base, horloge, demande);
    const instanceId = creee.reprise.instance.id;
    const commande = { profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: 0, cleGeste: 'version-geste',
      geste: { type: 'placer' as const, objetId: 'module-a', position: 0 } };
    await manipulerPartieMaths(base, horloge, commande);
    sqlite.prepare('UPDATE actions_maths SET version_action = 99 WHERE instance_id = ?')
      .run(instanceId);
    await expect(manipulerPartieMaths(base, horloge, commande))
      .rejects.toMatchObject({ code: 'instance-incompatible' });
    sqlite.prepare('UPDATE reprises_maths SET version_etat = 99 WHERE instance_id = ?')
      .run(instanceId);
    await expect(lirePartieMaths(base, PROFIL, instanceId))
      .rejects.toMatchObject({ code: 'instance-incompatible' });
  });

  it('reprend après pause et refuse les écritures de l’ancienne génération', async () => {
    const creee = await creerPartieMaths(base, horloge, demande);
    const instanceId = creee.reprise.instance.id;
    const pause = await mettreEnPausePartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: 0, cleGeste: 'pause-1'
    });
    expect(pause.reprise.revision).toBe(1);
    expect((await lireEtatMaths(base, PROFIL)).reprise?.instance.id).toBe(instanceId);
    expect((await mettreEnPausePartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: 0, cleGeste: 'pause-1'
    })).deja).toBe(true);
    const reprise = await manipulerPartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: 1, cleGeste: 'reprendre-1',
      geste: { type: 'placer', objetId: 'module-a', position: 0 }
    });
    expect(reprise.reprise.revision).toBe(2);
    expect(sqlite.prepare('SELECT statut FROM reprises_maths WHERE instance_id = ?').get(instanceId))
      .toEqual({ statut: 'active' });
    sqlite.prepare('UPDATE profils SET generation_maths = 1 WHERE id = ?').run(PROFIL);
    await expect(manipulerPartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: 2, cleGeste: 'ancien-geste',
      geste: { type: 'placer', objetId: 'module-a', position: 0 }
    })).rejects.toMatchObject({ code: 'conflit', raison: 'generation-maths-perimee' });
    await expect(mettreEnPausePartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: 0, cleGeste: 'pause-1'
    })).rejects.toMatchObject({ code: 'conflit', raison: 'generation-maths-perimee' });
    expect((await lireEtatMaths(base, PROFIL)).generationMaths).toBe(1);
    expect((await lireEtatMaths(base, PROFIL)).reprise).toBeNull();
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM actions_maths').get()).toEqual({ n: 2 });
  });

  it('valide depuis l’état durable, conclut une fois et ne crédite jamais la lecture', async () => {
    sqlite.prepare(`INSERT INTO tentatives
      (id, cle_idempotence, profil_id, noeud_id, exercice_id, moteur, habillage, graine,
       demarre_le, termine_le, duree_ms, reussi, nb_erreurs, aide_utilisee, etoiles, detail_json)
      VALUES ('lecture-temoin', 'lecture-temoin', ?, 'lecture-noeud', 'lecture-exercice',
        'attrape', 'clairiere', 1, ?, ?, 100, 1, 0, 'aucune', 3, '{}')`)
      .run(PROFIL, INSTANT, INSTANT);
    sqlite.prepare(`INSERT INTO progression_noeud
      (profil_id, noeud_id, etoiles, nb_tentatives, dernier_le)
      VALUES (?, 'lecture-noeud', 3, 1, ?)`).run(PROFIL, INSTANT);
    const lectureAvant = {
      tentatives: sqlite.prepare('SELECT * FROM tentatives WHERE profil_id = ?').all(PROFIL),
      progression: sqlite.prepare('SELECT * FROM progression_noeud WHERE profil_id = ?').all(PROFIL),
    };
    const creee = await creerPartieMaths(base, horloge, demande);
    const instanceId = creee.reprise.instance.id;
    const terminer = { profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: 0, cleGeste: 'fin-1',
      reponse: { famille: 'MAT-PON-03' as const, valeur: { reussi: true, etoiles: 3 } } };
    const incomplete = await terminerPartieMaths(base, horloge, terminer);
    expect(incomplete.validation.statut).toBe('incomplete');
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives_maths').get()).toEqual({ n: 0 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives').get()).toEqual({ n: 1 });
    const rejeu = await terminerPartieMaths(base, horloge, terminer);
    expect(rejeu.deja).toBe(true);
    expect(rejeu.validation.statut).toBe('incomplete');

    const solution = placementsResolus(creee.reprise);
    let revision = incomplete.reprise.revision;
    for (const [objetId, position] of Object.entries(solution)) {
      const action = await manipulerPartieMaths(base, horloge, {
        profilId: PROFIL, generationMaths: 0, instanceId, revisionAttendue: revision,
        cleGeste: `poser-${objetId}`, geste: { type: 'placer', objetId, position: Number(position) }
      });
      revision = action.reprise.revision;
    }
    const conclusion = await terminerPartieMaths(base, horloge, {
      ...terminer, revisionAttendue: revision, cleGeste: 'fin-2',
      reponse: { famille: 'MAT-PON-03', valeur: { reussi: false, etoiles: 0 } }
    });
    expect(conclusion.validation.statut).toBe('correcte');
    expect(conclusion.tentative?.etoiles).toBe(3);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives_maths').get()).toEqual({ n: 1 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives').get()).toEqual({ n: 1 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM formes_gobi').get()).toEqual({ n: 0 });
    expect(sqlite.prepare('SELECT * FROM tentatives WHERE profil_id = ?').all(PROFIL))
      .toEqual(lectureAvant.tentatives);
    expect(sqlite.prepare('SELECT * FROM progression_noeud WHERE profil_id = ?').all(PROFIL))
      .toEqual(lectureAvant.progression);
    const double = await terminerPartieMaths(base, horloge, {
      ...terminer, revisionAttendue: revision, cleGeste: 'fin-2',
      reponse: { famille: 'MAT-PON-03', valeur: { reussi: false, etoiles: 0 } }
    });
    expect(double.deja).toBe(true);
    await expect(terminerPartieMaths(base, horloge, {
      ...terminer, revisionAttendue: conclusion.reprise.revision, cleGeste: 'fin-3'
    })).rejects.toMatchObject({ code: 'conflit' });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives_maths').get()).toEqual({ n: 1 });

    sqlite.prepare('DELETE FROM progression_maths WHERE profil_id = ?').run(PROFIL);
    await reconstruireProjectionsMaths(base, PROFIL);
    expect((await lireEtatMaths(base, PROFIL)).progression).toMatchObject([
      { famille: 'MAT-PON-03', niveau: 'decouverte', etoiles: 3, nbTentatives: 1 }
    ]);
    expect(await lireBilanParentMaths(base, PROFIL)).toMatchObject([
      { famille: 'MAT-PON-03', niveau: 'decouverte', statut: 'reussi-seul',
        occasions: 1, reussites: 1, erreursValidees: 0, aides: 0 }
    ]);
  });

  it('reconstruit les projections maths depuis le journal sans créer de gain lecture', async () => {
    const creee = await creerPartieMaths(base, horloge, demande);
    const instanceId = creee.reprise.instance.id;
    expect((await lireEtatMaths(base, PROFIL)).generationMaths).toBe(0);
    expect((await lireEtatMaths(base, PROFIL)).reprise?.instance.id).toBe(instanceId);
    await reconstruireProjectionsMaths(base, PROFIL);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM progression_maths').get()).toEqual({ n: 0 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM recompenses_maths').get()).toEqual({ n: 0 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM progression_noeud').get()).toEqual({ n: 0 });
  });

  it('garde une erreur validée et l’aide dans le bilan sans fabriquer de tentative ratée', async () => {
    const creee = await creerPartieMaths(base, horloge, demande);
    const instanceId = creee.reprise.instance.id;
    const solution = placementsResolus(creee.reprise);
    const [premier, second] = Object.entries(solution);
    if (premier === undefined || second === undefined) throw new Error('Deux modules attendus.');
    const pose = await manipulerPartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: 0, cleGeste: 'premier-module',
      geste: { type: 'placer', objetId: premier[0], position: Number(premier[1]) }
    });
    const erreur = await terminerPartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: pose.reprise.revision, cleGeste: 'essai-inexact',
      reponse: { famille: 'MAT-PON-03', valeur: { reussi: true } }
    });
    expect(erreur.validation.statut).toBe('incorrecte');
    expect(erreur.reprise.erreursValidees).toBe(1);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives_maths').get()).toEqual({ n: 0 });
    expect(await lireBilanParentMaths(base, PROFIL)).toMatchObject([
      { statut: 'essaye', erreursValidees: 1, aides: 0 }
    ]);
    const aide = await manipulerPartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: erreur.reprise.revision, cleGeste: 'aide-1',
      geste: { type: 'aide', niveau: 'indice' }
    });
    const pose2 = await manipulerPartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: aide.reprise.revision, cleGeste: 'second-module',
      geste: { type: 'placer', objetId: second[0], position: Number(second[1]) }
    });
    const fin = await terminerPartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: pose2.reprise.revision, cleGeste: 'fin-aidee',
      reponse: { famille: 'MAT-PON-03', valeur: { reussi: false } }
    });
    expect(fin.validation.statut).toBe('correcte');
    expect(fin.tentative?.etoiles).toBe(1);
    expect(await lireBilanParentMaths(base, PROFIL)).toMatchObject([
      { statut: 'reussi-avec-aide', occasions: 1, reussites: 1,
        erreursValidees: 1, aides: 1 }
    ]);
  });

  it('annule conclusion, action et projection si le stockage échoue au milieu', async () => {
    const creee = await creerPartieMaths(base, horloge, demande);
    const instanceId = creee.reprise.instance.id;
    let revision = 0;
    for (const [objetId, position] of Object.entries(placementsResolus(creee.reprise))) {
      const action = await manipulerPartieMaths(base, horloge, {
        profilId: PROFIL, generationMaths: 0, instanceId, revisionAttendue: revision,
        cleGeste: `poser-${objetId}`, geste: { type: 'placer', objetId, position: Number(position) }
      });
      revision = action.reprise.revision;
    }
    const actionsAvant = sqlite.prepare('SELECT COUNT(*) AS n FROM actions_maths').get();
    sqlite.exec(`CREATE TRIGGER refuser_tentative_maths BEFORE INSERT ON tentatives_maths
      BEGIN SELECT RAISE(ABORT, 'stockage indisponible'); END;`);
    await expect(terminerPartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: revision, cleGeste: 'fin-refusee',
      reponse: { famille: 'MAT-PON-03', valeur: {} }
    })).rejects.toThrow('stockage indisponible');
    expect((await lirePartieMaths(base, PROFIL, instanceId))?.revision).toBe(revision);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM actions_maths').get()).toEqual(actionsAvant);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives_maths').get()).toEqual({ n: 0 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM progression_maths').get()).toEqual({ n: 0 });
  });

  it('attribue le souvenir une seule fois après les trois étapes liées, puis le reconstruit', async () => {
    const commande = { profilId: PROFIL, generationMaths: 0, projetId: 'MAT-PON-P01' as const,
      niveaux: ['decouverte', 'decouverte', 'decouverte'] as const,
      graine: 42, cleGeste: 'creer-projet-1' };
    const creation = await creerProjetMaths(base, horloge, commande);
    expect(creation.deja).toBe(false);
    expect((await creerProjetMaths(base, horloge, commande)).deja).toBe(true);
    await expect(creerProjetMaths(base, horloge, { ...commande, graine: 43 }))
      .rejects.toMatchObject({ code: 'conflit', raison: 'cle-reutilisee' });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM sessions_projets_maths').get()).toEqual({ n: 1 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM instances_maths').get()).toEqual({ n: 3 });
    expect((await lireEtatMaths(base, PROFIL)).projets).toMatchObject([
      { projetId: 'MAT-PON-P01', etapesTerminees: 0, nombreEtapes: 3 }
    ]);
    const plan = creation.reprise.projet!.plan;
    await expect(mettreEnPausePartieMaths(base, horloge, {
      profilId: PROFIL, generationMaths: 0, instanceId: plan[0]!.instanceId,
      revisionAttendue: 0, cleGeste: commande.cleGeste
    })).rejects.toMatchObject({ code: 'conflit', raison: 'cle-reutilisee' });
    await expect(lirePartieMaths(base, PROFIL, plan[1]!.instanceId))
      .rejects.toMatchObject({ code: 'conflit' });

    let reprise = creation.reprise;
    for (const etape of [0, 1, 2]) {
      const instanceEtape = reprise.instance;
      if (!estInstancePont(instanceEtape)) throw new Error('Instance de pont incompatible.');
      const instanceId = instanceEtape.id;
      if (etape === 1) {
        const pause = await mettreEnPausePartieMaths(base, horloge, {
          profilId: PROFIL, generationMaths: 0, instanceId,
          revisionAttendue: 0, cleGeste: 'pause-projet'
        });
        reprise = pause.reprise;
        await creerPartieMaths(base, horloge, { ...demande, cleGeste: 'libre-pendant-projet' });
        expect((await lireEtatMaths(base, PROFIL)).projetSuspendu?.instance.id).toBe(instanceId);
        expect((await lireEtatMaths(base, PROFIL)).projetSuspendu?.projet?.suspendu).toBe(true);
      }
      const temoin = temoinsPont(instanceEtape)[0]!;
      const gestes: GesteMaths[] = instanceEtape.famille === 'MAT-PON-01'
        ? [
          { type: 'aligner-regle', origine: Number(temoin.placements.regle) },
          { type: 'lire-longueur', valeur: Number(temoin.objets.longueurLue) },
          ...Object.keys(temoin.placements).filter((id) => id !== 'regle')
            .map((objetId): GesteMaths => ({ type: 'choisir', objetId }))
        ]
        : instanceEtape.famille === 'MAT-PON-02'
          ? Object.entries(temoin.placements).map(([id, position]): GesteMaths => ({
            type: 'placer-borne', valeur: Number(id.slice('borne:'.length)), position: Number(position)
          }))
          : Object.entries(temoin.placements).map(([objetId, position]): GesteMaths => ({
            type: 'placer', objetId, position: Number(position)
          }));
      let revision = reprise.revision;
      for (const [rang, geste] of gestes.entries()) {
        const resultat = await manipulerPartieMaths(base, horloge, {
          profilId: PROFIL, generationMaths: 0, instanceId,
          revisionAttendue: revision, cleGeste: `projet-${etape}-geste-${rang}`, geste
        });
        revision = resultat.reprise.revision;
      }
      const fin = await terminerPartieMaths(base, horloge, {
        profilId: PROFIL, generationMaths: 0, instanceId,
        revisionAttendue: revision, cleGeste: `projet-${etape}-fin`,
        reponse: { famille: instanceEtape.famille, valeur: { reussi: false } }
      });
      expect(fin.validation.statut).toBe('correcte');
      expect(fin.recompenses).toHaveLength(etape === 2 ? 1 : 0);
      expect((await terminerPartieMaths(base, horloge, {
        profilId: PROFIL, generationMaths: 0, instanceId,
        revisionAttendue: revision, cleGeste: `projet-${etape}-fin`,
        reponse: { famille: instanceEtape.famille, valeur: { reussi: false } }
      })).deja).toBe(true);
      expect((await lireEtatMaths(base, PROFIL)).projets[0]?.etapesTerminees).toBe(etape + 1);
      if (etape < 2) {
        expect(fin.prochaineReprise?.instance.id).toBe(plan[etape + 1]!.instanceId);
        expect(fin.prochaineReprise?.projet?.etoilesEtapes).toHaveLength(etape + 1);
        reprise = fin.prochaineReprise!;
      } else {
        expect(fin.prochaineReprise).toBeNull();
      }
    }
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM recompenses_maths').get()).toEqual({ n: 1 });
    // Fixture d'une ancienne version éditoriale : le recalcul doit lire le cadeau figé.
    sqlite.prepare("UPDATE sessions_projets_maths SET cadeau_id = 'souvenir-historique-ponts' WHERE id = ?")
      .run(creation.sessionId);
    sqlite.prepare('DELETE FROM recompenses_maths WHERE profil_id = ?').run(PROFIL);
    await reconstruireProjectionsMaths(base, PROFIL);
    expect((await lireEtatMaths(base, PROFIL)).recompenses).toMatchObject([
      { projetId: 'MAT-PON-P01', cadeauId: 'souvenir-historique-ponts', categorie: 'souvenir' }
    ]);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM tentatives').get()).toEqual({ n: 0 });
  });
});
