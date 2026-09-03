/**
 * `POST /api/profils/:id/sortie` — structure d'une sortie composée. Lot L2-D, v2 § 5.2.
 *
 * Ce que ce fichier garde, et qu'aucun test unitaire ne garde : que le CHEMIN COMPLET tienne —
 * le contenu réel du dépôt, les maîtrises lues en base, les révisions dues à l'heure de
 * l'horloge, le plan archivé. Le sélecteur peut être parfait et la sortie vide si la route lui
 * passe un vivier mal construit.
 *
 * Le dépôt de contenu est monté ici, avec plusieurs nœuds : `monterApplication()` de L-G n'en
 * sert qu'un, et une sortie d'un seul nœud n'existe pas.
 */
import { join, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  RACINE_DEPOT, aleaDeTest, horlogeDeTest, lireJson,
} from '../configuration/preparation.js';

import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import type { Competence, Exercice, Noeud, PlanSortie, TempsNoeud } from '@pierre/partage';
import type { Base } from '@pierre/partage/base';

const DOSSIER_MIGRATIONS = join(RACINE_DEPOT, 'serveur', 'migrations') + sep;

const TEMPS: readonly TempsNoeud[] = [
  'presentation', 'developpement', 'retournement', 'maitrise', 'developpement', 'maitrise',
];

/** Six nœuds de la Clairière, six habillages distincts : de quoi composer une sortie pleine. */
function contenuDeTest(): { exercices: Exercice[]; noeuds: Noeud[] } {
  const exercices: Exercice[] = [];
  const noeuds: Noeud[] = [];
  for (let i = 1; i <= 6; i += 1) {
    const rang = String(i).padStart(2, '0');
    exercices.push({
      id: `clairiere-ex-${rang}`,
      version: 1,
      titre: `Exercice ${rang}`,
      // Toutes tirent `comp.consigne.simple`, qui n'a aucun prérequis : le vivier est donc
      // éligible dès le premier jour, avant qu'aucune maîtrise n'existe.
      competences: ['comp.consigne.simple'],
      difficulte: i,
      jeu: {
        moteur: 'colorie',
        habillage: `clairiere.h${rang}`,
        noeud: `clairiere-${rang}`,
        etoiles: { sansAide: true, sansErreur: true },
        aideGobi: ['relire-consigne'],
        contenu: {},
      },
    });
    noeuds.push({
      id: `clairiere-${rang}`,
      region: 'clairiere',
      ordre: i,
      exercice: `clairiere-ex-${rang}`,
      prerequis: [],
      temps: TEMPS[i - 1] as TempsNoeud,
    });
  }
  return { exercices, noeuds };
}

interface Harnais {
  readonly application: FastifyInstance;
  readonly base: DatabaseSync;
  readonly baseAsync: Base;
  fermer(): Promise<void>;
}

let contexte: Harnais;

async function monter(): Promise<Harnais> {
  const [
    { construireApplication },
    { ouvrirBase },
    { appliquerMigrations },
    { creerBaseNodeSqlite },
    factices
  ] = await Promise.all([
    import('@serveur/application'),
    import('@serveur/base/connexion'),
    import('@serveur/base/migrations'),
    import('@serveur/base/adaptateur-node-sqlite'),
    import('@pierre/partage/factices'),
  ]);

  const base = ouvrirBase(':memory:');
  const baseAsync = creerBaseNodeSqlite(base);
  const horloge = horlogeDeTest();
  await appliquerMigrations(baseAsync, DOSSIER_MIGRATIONS, horloge);

  const { exercices, noeuds } = contenuDeTest();
  const contenu = new factices.DepotContenuMemoire({
    exercices,
    noeuds,
    habillages: [],
    competences: lireJson<Competence[]>('contenu/referentiel/competences.json'),
  });

  const application = construireApplication({
    base: baseAsync, contenu, horloge, alea: aleaDeTest(), racineClient: null,
  });
  await application.ready();

  return {
    application,
    base,
    baseAsync,
    async fermer() {
      await application.close();
      base.close();
    },
  };
}

beforeEach(async () => {
  contexte = await monter();
});

afterEach(async () => {
  await contexte.fermer();
});

async function creerProfil(prenom = 'Alma'): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/profils',
    payload: {
      prenom,
      avatar: { forme: 'rond', couleur: 'lagon', accessoire: null },
      paletteVariante: 'clairiere',
    },
  });
  expect(reponse.statusCode).toBe(201);
  return (reponse.json() as { id: string }).id;
}

async function composer(profil: string, corps: Record<string, unknown> = { region: 'clairiere' }) {
  return contexte.application.inject({
    method: 'POST',
    url: `/api/profils/${profil}/sortie`,
    payload: corps,
  });
}

describe('structure d’une sortie composée', () => {
  it('rend 201 et un plan qui ouvre sur un échauffement et clôt sur une synthèse', async () => {
    const profil = await creerProfil();
    contexte.base
      .prepare('INSERT INTO compagnons (profil_id, code, rallie_le) VALUES (?, ?, ?)')
      .run(profil, 'filou', '2026-09-01T08:00:00.000Z');
    const reponse = await composer(profil, { region: 'clairiere', compagnon: 'filou' });
    expect(reponse.statusCode).toBe(201);

    const plan = reponse.json() as PlanSortie;
    expect(plan.profil).toBe(profil);
    expect(plan.region).toBe('clairiere');
    expect(plan.compagnon).toBe('filou');
    expect(plan.etapes.length).toBeGreaterThanOrEqual(4);
    expect(plan.etapes[0]?.role).toBe('echauffement');
    expect(plan.etapes[plan.etapes.length - 1]?.role).toBe('synthese');
    expect(plan.etapes.map((e) => e.rang)).toEqual(plan.etapes.map((_, i) => i + 1));
  });

  it('ne rejoue jamais deux fois le même habillage (R13)', async () => {
    const profil = await creerProfil();
    const plan = (await composer(profil)).json() as PlanSortie;
    const habillages = plan.etapes.map((e) => e.habillage);
    expect(new Set(habillages).size).toBe(habillages.length);
    // Les habillages viennent bien de l'EXERCICE, pas d'un identifiant inventé par la route.
    for (const habillage of habillages) {
      expect(habillage).toMatch(/^clairiere\.h\d{2}$/);
    }
  });

  it('archive le plan dans `sorties` — la seule trace de ce qui a été PROPOSÉ', async () => {
    const profil = await creerProfil();
    const plan = (await composer(profil)).json() as PlanSortie;

    const ligne = contexte.base
      .prepare('SELECT profil_id, region, plan_json FROM sorties WHERE profil_id = ?')
      .get(profil) as unknown as { profil_id: string; region: string; plan_json: string };
    expect(ligne.region).toBe('clairiere');
    expect(JSON.parse(String(ligne.plan_json))).toEqual(plan);
  });

  it('ignore un compagnon inconnu plutôt que de le recopier tel quel', async () => {
    const profil = await creerProfil();
    const plan = (await composer(profil, { region: 'clairiere', compagnon: 'dragon' }))
      .json() as PlanSortie;
    expect(plan.compagnon).toBeNull();
  });

  it('ne laisse pas partir avec un compagnon que ce profil n’a pas encore rallié', async () => {
    const profil = await creerProfil();
    const plan = (await composer(profil, { region: 'clairiere', compagnon: 'filou' }))
      .json() as PlanSortie;
    expect(plan.compagnon).toBeNull();
  });
});

describe('les révisions dues entrent au rang de révision, et nulle part ailleurs (P12)', () => {
  it('injecte l’item dû au rang 3', async () => {
    const profil = await creerProfil();

    // Un item Leitner déjà dû : échéance à l'instant figé de l'application.
    const { appliquerRevue } = await import('@pierre/partage/base');
    const { chargerParametresPedagogie } = await import('@serveur/referentiels/pedagogie');
    const parametres = chargerParametresPedagogie();
    await appliquerRevue(contexte.baseAsync, profil, 'gph.a', false, parametres, '2026-08-01T08:00:00.000Z');

    const plan = (await composer(profil)).json() as PlanSortie;
    const porteuses = plan.etapes.filter((e) => e.revisions.length > 0);
    expect(porteuses).toHaveLength(1);
    expect(porteuses[0]?.rang).toBe(parametres.selecteur.rangRevision);
    expect(porteuses[0]?.role).toBe('revision');
    expect(porteuses[0]?.revisions).toContain('gph.a');
  });

  it('ne porte aucune révision quand aucune n’est due', async () => {
    const profil = await creerProfil();
    const plan = (await composer(profil)).json() as PlanSortie;
    expect(plan.etapes.every((e) => e.revisions.length === 0)).toBe(true);
  });
});

describe('refus — la route dit ce qui manque au lieu d’inventer', () => {
  it('404 sur un profil inconnu', async () => {
    const reponse = await composer('profil-fantome');
    expect(reponse.statusCode).toBe(404);
  });

  it('400 quand la région manque', async () => {
    const profil = await creerProfil();
    expect((await composer(profil, {})).statusCode).toBe(400);
    expect((await composer(profil, { region: '   ' })).statusCode).toBe(400);
  });

  it('409 quand la région n’a pas de quoi composer, jamais un plan vide', async () => {
    const profil = await creerProfil();
    const reponse = await composer(profil, { region: 'volcan' });
    expect(reponse.statusCode).toBe(409);
    const corps = reponse.json() as { code: string; message: string };
    expect(corps.code).toBe('conflit');
    expect(corps.message).toContain('volcan');
  });
});

describe('déterminisme et étanchéité', () => {
  it('deux compositions de la même entrée rendent le même plan', async () => {
    const profil = await creerProfil();
    const un = (await composer(profil)).json() as PlanSortie;

    // Une application neuve, même graine, même contenu : le plan doit être identique.
    await contexte.fermer();
    contexte = await monter();
    const memeProfil = await creerProfil();
    const deux = (await composer(memeProfil)).json() as PlanSortie;

    expect(deux.etapes.map((e) => e.noeud)).toEqual(un.etapes.map((e) => e.noeud));
    expect(deux.etapes.map((e) => e.role)).toEqual(un.etapes.map((e) => e.role));
  });

  it('la sortie d’un profil n’apparaît jamais chez l’autre', async () => {
    const alma = await creerProfil('Alma');
    const bruno = await creerProfil('Bruno');
    await composer(alma);

    const ligne = contexte.base
      .prepare('SELECT COUNT(*) AS n FROM sorties WHERE profil_id = ?')
      .get(bruno) as unknown as { n: number };
    expect(Number(ligne.n)).toBe(0);
  });
});
