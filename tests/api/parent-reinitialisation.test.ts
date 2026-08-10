/**
 * `POST /api/parent/:profil/reinitialiser` — lot H2. Annexe T § T2.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER GARDE, ET POURQUOI IL SÈME LES 17 TABLES À LA MAIN
 *
 * Une remise à zéro se juge sur les **objets**, pas sur les occurrences (D48). Semer le profil
 * en jouant des tentatives par l'API ne remplirait que les six ou sept tables qu'une partie
 * nominale touche ; les dix autres seraient « vertes » sans avoir jamais porté une ligne. Le
 * défaut de cette campagne est né exactement là : d'un état qu'aucun test n'a jamais produit.
 *
 * D'où la forme retenue :
 *
 *   1. `SEMEURS` pose UNE ligne dans CHAQUE table porteuse de `profil_id`, à la main, en SQL ;
 *   2. **le premier cas du fichier vérifie que `SEMEURS` couvre exactement les tables que le
 *      schéma déclare.** Une migration future qui ajoute une table porteuse de `profil_id`
 *      fait échouer ce cas — avec le nom de la table manquante — au lieu de laisser passer
 *      une remise à zéro incomplète.
 *
 * C'est la seule façon connue d'avoir un test qui ne périme pas en même temps que le schéma.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENTETE_JETON_PARENT } from '@partage/parent/types';
import { TABLES_CONSERVEES_PAR_PROGRESSION } from '@partage/parent/reinitialisation';

import { INSTANT_DE_REFERENCE, monterApplication } from '../configuration/preparation.js';

import type { DatabaseSync } from 'node:sqlite';
import type { ApplicationDeTest } from '../configuration/preparation.js';

const CODE = '4271';
const PRENOM = 'Ezékiel';

let contexte: ApplicationDeTest;

beforeEach(async () => {
  contexte = await monterApplication();
});

afterEach(async () => {
  await contexte.fermer();
});

async function jeton(): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/parent/definir',
    payload: { code: CODE }
  });
  expect(reponse.statusCode).toBe(200);
  return (reponse.json() as { jeton: string }).jeton;
}

async function creerProfil(prenom = PRENOM): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/profils',
    payload: { prenom, avatar: { forme: 'rond' }, paletteVariante: 'clairiere' }
  });
  expect(reponse.statusCode).toBe(201);
  return (reponse.json() as { id: string }).id;
}

// ───────────────────────────────────────────────────────────────────── les semeurs

/**
 * Une ligne par table porteuse de `profil_id`, écrite en SQL direct.
 *
 * SQL direct et non API : plusieurs de ces tables n'ont aucune route d'écriture (rien ne
 * pose un `point_visite` ou un `essai_typographie` depuis le réseau), et attendre qu'elles en
 * aient une pour tester la remise à zéro reviendrait à ne jamais la tester.
 */
type Semeur = (base: DatabaseSync, profil: string, marque: string) => void;

const SEMEURS: Readonly<Record<string, Semeur>> = {
  campement: (b, p) =>
    b.prepare('INSERT INTO campement VALUES (?, ?, ?)').run(p, 'tapis', INSTANT_DE_REFERENCE),
  compagnons: (b, p) =>
    b.prepare('INSERT INTO compagnons VALUES (?, ?, ?)').run(p, 'filou', INSTANT_DE_REFERENCE),
  essais_typographie: (b, p, m) =>
    b
      .prepare('INSERT INTO essais_typographie VALUES (?, ?, ?, ?, ?, ?)')
      .run(`ess-${m}`, p, 'cvc', '[]', INSTANT_DE_REFERENCE, null),
  etagere_rang: (b, p) =>
    b.prepare('INSERT INTO etagere_rang VALUES (?, ?, ?)').run(p, 'ou', 1),
  etapes_tentative: (b, p, m) =>
    b
      .prepare(
        `INSERT INTO etapes_tentative
           (id, tentative_id, profil_id, rang, identifiant, competence, mode_reponse,
            reussi, nb_erreurs, aide_utilisee, duree_ms, latence_ms, nb_elements,
            conf_attendu, conf_rendu, conf_axe, journalise_le)
         VALUES (?, ?, ?, 0, 'et-1', 'cvc', 'choix', 1, 0, 'aucune', 4000, 1800, NULL,
                 NULL, NULL, NULL, ?)`
      )
      .run(`etp-${m}`, `tnt-${m}`, p, INSTANT_DE_REFERENCE),
  formes_gobi: (b, p) =>
    b.prepare('INSERT INTO formes_gobi VALUES (?, ?, ?)').run(p, 'a', INSTANT_DE_REFERENCE),
  items_leitner: (b, p) =>
    b
      .prepare('INSERT INTO items_leitner VALUES (?, ?, ?, ?, ?, ?)')
      .run(p, 'mot:chat', 2, INSTANT_DE_REFERENCE, INSTANT_DE_REFERENCE, 3),
  maitrise_competence: (b, p) =>
    b
      .prepare('INSERT INTO maitrise_competence VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(p, 'cvc', 0.7, 5, '[]', 0, null),
  ouverture_vue: (b, p) =>
    b.prepare('INSERT INTO ouverture_vue VALUES (?, ?, ?, ?)').run(p, INSTANT_DE_REFERENCE, 0, 1),
  points_visites: (b, p) =>
    b
      .prepare('INSERT INTO points_visites VALUES (?, ?, ?, ?)')
      .run(p, 'chaudron', 4, INSTANT_DE_REFERENCE),
  progression_cascade: (b, p) =>
    b.prepare('INSERT INTO progression_cascade VALUES (?, ?, ?, ?, ?, ?, ?)').run(p, 7, 2, 1, 0, 0, null),
  progression_noeud: (b, p) =>
    b
      .prepare('INSERT INTO progression_noeud VALUES (?, ?, ?, ?, ?)')
      .run(p, 'clairiere-01', 3, 1, INSTANT_DE_REFERENCE),
  progression_region: (b, p) =>
    b
      .prepare('INSERT INTO progression_region VALUES (?, ?, ?, ?, ?)')
      .run(p, 'clairiere', 1, 1, INSTANT_DE_REFERENCE),
  reglages_lecture: (b, p) =>
    b
      .prepare('INSERT INTO reglages_lecture VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(p, 'andika', 24, 0.06, 0.3, 1.6, 1, 0, 0, 'parchemin', INSTANT_DE_REFERENCE),
  sorties: (b, p, m) =>
    b
      .prepare('INSERT INTO sorties VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(`srt-${m}`, p, 'clairiere', null, '{}', INSTANT_DE_REFERENCE, null),
  stade_gobi: (b, p) =>
    b.prepare('INSERT INTO stade_gobi VALUES (?, ?, ?, ?)').run(p, 'eveille', 2, INSTANT_DE_REFERENCE),
  tentatives: (b, p, m) =>
    b
      .prepare(
        `INSERT INTO tentatives
           (id, cle_idempotence, profil_id, noeud_id, exercice_id, moteur, habillage, graine,
            demarre_le, termine_le, duree_ms, reussi, nb_erreurs, aide_utilisee, etoiles,
            detail_json)
         VALUES (?, ?, ?, 'clairiere-01', 'clairiere-ecole-01', 'colorie', 'clairiere.ecole',
                 1, ?, ?, 60000, 1, 0, 'aucune', 3, '{}')`
      )
      .run(`tnt-${m}`, `cle-${m}`, p, INSTANT_DE_REFERENCE, INSTANT_DE_REFERENCE)
};

/**
 * Sème une ligne dans chaque table porteuse de `profil_id`. `tentatives` d'abord — c'est la
 * seule référencée par une clé étrangère (`etapes_tentative`).
 *
 * `marque` distingue les clés primaires GLOBALES (`tentatives.id`, `etapes_tentative.id`,
 * `sorties.id`, `essais_typographie.id`) : elles ne sont pas préfixées par le profil, deux
 * semis avec la même marque se heurteraient.
 */
function semer(base: DatabaseSync, profil: string, marque = '1'): void {
  SEMEURS['tentatives']?.(base, profil, marque);
  for (const [table, poser] of Object.entries(SEMEURS)) {
    if (table !== 'tentatives') {
      poser(base, profil, marque);
    }
  }
}

function compter(base: DatabaseSync, table: string, profil: string): number {
  return Number(
    (
      base.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE profil_id = ?`).get(profil) as unknown as {
        n: number;
      }
    ).n
  );
}

async function reinitialiser(
  profil: string,
  corps: Record<string, unknown>,
  entetes: Record<string, string>
) {
  return contexte.application.inject({
    method: 'POST',
    url: `/api/parent/${profil}/reinitialiser`,
    payload: corps,
    headers: entetes
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('l’inventaire des tables à remettre à zéro', () => {
  // LE CAS QUI EMPÊCHE CE FICHIER DE PÉRIMER. Il compare la liste que le SCHÉMA déclare à
  // celle que le fixture couvre : ni l'une ni l'autre n'est écrite deux fois.
  it('les semeurs couvrent EXACTEMENT les tables porteuses de `profil_id`', async () => {
    const { tablesPorteusesDeProfil } = await import('@pierre/partage/base');
    const declarees = [...(await tablesPorteusesDeProfil(contexte.baseAsync))].sort();
    const semees = Object.keys(SEMEURS).sort();

    expect(
      declarees.filter((t) => !semees.includes(t)),
      'tables du schéma qu’aucun semeur ne remplit — ajoute-les à SEMEURS'
    ).toEqual([]);
    expect(
      semees.filter((t) => !declarees.includes(t)),
      'semeurs qui visent une table disparue du schéma'
    ).toEqual([]);

    // CHIFFRE DU LOT, mesuré et non affirmé : 17 tables portent `profil_id`, 5 n'en portent
    // pas (code_parent, profils, relecture_contenu, schema_migrations, verrou_parent).
    expect(declarees.length).toBe(17);
  });
});

describe('POST /api/parent/:profil/reinitialiser — les gardes', () => {
  it('refuse sans jeton parent', async () => {
    const profil = await creerProfil();
    const reponse = await contexte.application.inject({
      method: 'POST',
      url: `/api/parent/${profil}/reinitialiser`,
      payload: { portee: 'complete', confirmation: PRENOM }
    });
    expect(reponse.statusCode).toBe(401);
  });

  it('refuse une portée absente ou inconnue — aucune valeur par défaut', async () => {
    const profil = await creerProfil();
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    for (const corps of [
      { confirmation: PRENOM },
      { portee: 'tout', confirmation: PRENOM },
      { portee: '', confirmation: PRENOM }
    ]) {
      const reponse = await reinitialiser(profil, corps, entetes);
      expect(reponse.statusCode, JSON.stringify(corps)).toBe(400);
    }
  });

  it('refuse tant que le prénom de l’enfant n’est pas retapé — 409, et RIEN n’est effacé', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    for (const confirmation of [undefined, '', 'oui', 'Alma', '   ']) {
      const reponse = await reinitialiser(profil, { portee: 'complete', confirmation }, entetes);
      expect(reponse.statusCode, String(confirmation)).toBe(409);
    }

    // La garde n'est pas décorative : la base est intacte après cinq refus.
    expect(compter(contexte.base, 'tentatives', profil)).toBe(1);
    expect(compter(contexte.base, 'progression_noeud', profil)).toBe(1);
  });

  it('accepte le prénom sans accent et sans casse — un parent qui a raison n’est pas puni', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    const reponse = await reinitialiser(
      profil,
      { portee: 'complete', confirmation: '  ezekiel ' },
      entetes
    );
    expect(reponse.statusCode).toBe(200);
  });

  it('répond 404 sur un profil inconnu, sans rien effacer ailleurs', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    const reponse = await reinitialiser(
      'prf-inexistant',
      { portee: 'complete', confirmation: PRENOM },
      entetes
    );
    expect(reponse.statusCode).toBe(404);
    expect(compter(contexte.base, 'tentatives', profil)).toBe(1);
  });
});

describe('POST /api/parent/:profil/reinitialiser — portée « complete »', () => {
  it('LE TEST QUI GARDE LE RISQUE : les 17 tables sont vidées, aucune exceptée', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    const { tablesPorteusesDeProfil } = await import('@pierre/partage/base');
    const tables = await tablesPorteusesDeProfil(contexte.baseAsync);

    // On mesure AVANT : un test qui ne prouve pas que la base était pleine ne prouve rien.
    const avant = tables.map((t) => [t, compter(contexte.base, t, profil)] as const);
    expect(
      avant.filter(([, n]) => n === 0).map(([t]) => t),
      'tables restées vides après le semis'
    ).toEqual([]);

    const reponse = await reinitialiser(
      profil,
      { portee: 'complete', confirmation: PRENOM },
      entetes
    );
    expect(reponse.statusCode).toBe(200);

    const apres = tables.map((t) => [t, compter(contexte.base, t, profil)] as const);
    expect(
      apres.filter(([, n]) => n > 0).map(([t]) => t),
      'tables encore peuplées APRÈS une remise à zéro complète'
    ).toEqual([]);
  });

  it('le rapport compte ce qui a disparu, table par table, et jamais un simple « ok »', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    const reponse = await reinitialiser(
      profil,
      { portee: 'complete', confirmation: PRENOM },
      entetes
    );
    const rapport = reponse.json() as {
      portee: string;
      prenom: string;
      lignesEffaceesTotal: number;
      lignes: { table: string; lignesEffacees: number }[];
      tablesConservees: string[];
    };

    expect(rapport.portee).toBe('complete');
    expect(rapport.prenom).toBe(PRENOM);
    expect(rapport.lignes).toHaveLength(17);
    // Une ligne semée par table : le total EST le nombre de tables.
    expect(rapport.lignesEffaceesTotal).toBe(17);
    expect(rapport.tablesConservees).toEqual([]);
  });

  it('le profil lui-même survit — on remet à zéro, on ne supprime pas un enfant', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    await reinitialiser(profil, { portee: 'complete', confirmation: PRENOM }, entetes);

    const apres = await contexte.application.inject({ method: 'GET', url: `/api/profils/${profil}` });
    expect(apres.statusCode).toBe(200);
    const lu = apres.json() as { prenom: string; avatar: { forme?: string } };
    expect(lu.prenom).toBe(PRENOM);
    expect(lu.avatar.forme).toBe('rond');
  });

  it('les tables SANS `profil_id` ne sont jamais touchées — le code du foyer survit', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    await reinitialiser(profil, { portee: 'complete', confirmation: PRENOM }, entetes);

    // Le code parent est toujours là : sans lui, le parent serait enfermé dehors (§ 7.3).
    const etat = await contexte.application.inject({ method: 'GET', url: '/api/parent/etat' });
    expect((etat.json() as { codeDefini: boolean }).codeDefini).toBe(true);

    const migrations = contexte.base
      .prepare('SELECT COUNT(*) AS n FROM schema_migrations')
      .get() as unknown as { n: number };
    expect(Number(migrations.n)).toBeGreaterThan(0);
  });

  it('n’efface QUE le profil visé — un frère garde tout', async () => {
    const vise = await creerProfil('Ezékiel');
    const frere = await creerProfil('Alma');
    semer(contexte.base, vise, 'vise');
    semer(contexte.base, frere, 'frere');
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    await reinitialiser(vise, { portee: 'complete', confirmation: 'Ezékiel' }, entetes);

    expect(compter(contexte.base, 'tentatives', vise)).toBe(0);
    expect(compter(contexte.base, 'tentatives', frere)).toBe(1);
    expect(compter(contexte.base, 'progression_noeud', frere)).toBe(1);
    expect(compter(contexte.base, 'reglages_lecture', frere)).toBe(1);
  });
});

describe('POST /api/parent/:profil/reinitialiser — portée « progression »', () => {
  it('garde les réglages de lecture et l’essai qui les a produits, efface tout le reste', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    const reponse = await reinitialiser(
      profil,
      { portee: 'progression', confirmation: PRENOM },
      entetes
    );
    expect(reponse.statusCode).toBe(200);

    const { tablesPorteusesDeProfil } = await import('@pierre/partage/base');
    const restantes = (await tablesPorteusesDeProfil(contexte.baseAsync)).filter(
      (table) => compter(contexte.base, table, profil) > 0
    );
    expect([...restantes].sort()).toEqual([...TABLES_CONSERVEES_PAR_PROGRESSION].sort());

    const rapport = reponse.json() as { tablesConservees: string[]; lignes: unknown[] };
    expect([...rapport.tablesConservees].sort()).toEqual([...TABLES_CONSERVEES_PAR_PROGRESSION].sort());
    expect(rapport.lignes).toHaveLength(15);
  });

  it('les réglages restent lisibles par la route de lecture, inchangés', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    await reinitialiser(profil, { portee: 'progression', confirmation: PRENOM }, entetes);

    const reglages = await contexte.application.inject({
      method: 'GET',
      url: `/api/profils/${profil}/reglages`
    });
    expect(reglages.statusCode).toBe(200);
    const lus = reglages.json() as { corpsPx: number; police: string };
    expect(lus.corpsPx).toBe(24);
    expect(lus.police).toBe('andika');
  });
});

describe('l’aperçu, avant de confirmer', () => {
  it('dit ce qui SERAIT effacé, sans rien effacer, et sans exiger le prénom', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    const reponse = await reinitialiser(profil, { portee: 'complete', apercu: true }, entetes);
    expect(reponse.statusCode).toBe(200);

    const apercu = reponse.json() as {
      lignes: { table: string; lignesEffacees: number }[];
      pertes: string[];
    };
    expect(apercu.lignes).toHaveLength(17);
    expect(apercu.pertes.length).toBeGreaterThan(0);
    // Le mot du contrat : la portée complète annonce la perte des réglages de lecture.
    expect(apercu.pertes.join(' ')).toContain('réglages de lecture');

    // RIEN n'a bougé : c'est tout l'intérêt d'un aperçu.
    expect(compter(contexte.base, 'tentatives', profil)).toBe(1);
    expect(compter(contexte.base, 'progression_region', profil)).toBe(1);
  });
});

describe('l’invariant du journal, après remise à zéro', () => {
  /**
   * LE CAS QUI JUSTIFIE D'EFFACER `tentatives`, POURTANT APPEND-ONLY.
   *
   * Si le journal survivait à la remise à zéro, le premier recalcul venu — celui du lot H1 —
   * rendrait au profil tout ce qu'on vient de lui retirer, et la remise à zéro serait annulée
   * par la réparation. Le seul état cohérent est : journal vide, projections vides.
   */
  it('un recalcul complet après remise à zéro ne ressuscite rien', async () => {
    const profil = await creerProfil();
    semer(contexte.base, profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    await reinitialiser(profil, { portee: 'complete', confirmation: PRENOM }, entetes);

    const { recalculerToutesLesProgressions } = await import('@pierre/partage/base');
    await recalculerToutesLesProgressions(contexte.baseAsync);

    expect(compter(contexte.base, 'progression_noeud', profil)).toBe(0);
    expect(compter(contexte.base, 'tentatives', profil)).toBe(0);
  });
});
