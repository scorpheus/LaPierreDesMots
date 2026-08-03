/**
 * Pédagogie côté serveur — idempotence, et **recalcul identique à l'incrémental**. Lot L2-D.
 *
 * C'est le test T2 « Recalculs » de l'annexe T § T2 appliqué au BKT et au Leitner. Il porte le
 * seul filet contre la régression pédagogique silencieuse : deux chemins écrivent la même
 * projection — un incrémental à chaque tentative, un intégral qui rejoue tout le journal — et
 * ils doivent rendre **exactement** le même état. S'ils divergent, la progression est devenue
 * fausse et personne ne le verrait à l'écran avant trois semaines (annexe T § 1).
 *
 * L'application est montée ici plutôt que par `monterApplication()` : ce lot a besoin d'un dépôt
 * de contenu à lui (plusieurs nœuds), et `tests/configuration/preparation.ts` appartient à L-G.
 */
import { createHash } from 'node:crypto';
import { join, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  GRAINE_DE_TEST,
  INSTANT_DE_REFERENCE,
  RACINE_DEPOT,
  aleaDeTest,
  horlogeDeTest,
  lireJson,
} from '../configuration/preparation.js';

import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import type {
  Competence, EtatMaitrise, Exercice, Habillage, ItemLeitner, ModeReponse, Noeud,
} from '@pierre/partage';

const DOSSIER_MIGRATIONS = join(RACINE_DEPOT, 'serveur', 'migrations') + sep;

interface Harnais {
  readonly application: FastifyInstance;
  readonly base: DatabaseSync;
  fermer(): Promise<void>;
}

let contexte: Harnais;

async function monter(): Promise<Harnais> {
  const [{ construireApplication }, { ouvrirBase }, { appliquerMigrations }, factices] =
    await Promise.all([
      import('@serveur/application'),
      import('@serveur/base/connexion'),
      import('@serveur/base/migrations'),
      import('@pierre/partage/factices'),
    ]);

  const base = ouvrirBase(':memory:');
  const horloge = horlogeDeTest();
  appliquerMigrations(base, DOSSIER_MIGRATIONS, horloge);

  const contenu = new factices.DepotContenuMemoire({
    exercices: [lireJson<Exercice>('contenu/exercices/clairiere/ecole-01.json')],
    noeuds: [lireJson<Noeud>('contenu/noeuds/clairiere-01.json')],
    habillages: [lireJson<Habillage>('contenu/habillages/clairiere/ecole.habillage.json')],
    competences: lireJson<Competence[]>('contenu/referentiel/competences.json'),
  });

  const application = construireApplication({
    base,
    contenu,
    horloge,
    alea: aleaDeTest(),
    racineClient: null,
  });
  await application.ready();

  return {
    application,
    base,
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

interface OptionsEtape {
  readonly identifiant: string;
  readonly modeReponse: ModeReponse;
  readonly nbErreurs?: number;
  readonly aideUtilisee?: 'aucune' | 'indice' | 'demonstration';
  readonly latenceMs?: number | null;
  readonly nbElements?: number | null;
  readonly confusion?: {
    attendu: string; rendu: string; axe: string | null; competence: string;
  } | null;
}

function etape(options: OptionsEtape) {
  return {
    identifiant: options.identifiant,
    nbErreurs: options.nbErreurs ?? 0,
    aideUtilisee: options.aideUtilisee ?? 'aucune',
    nbEcoutes: 0,
    dureeMs: 4_000,
    modeReponse: options.modeReponse,
    latenceMs: options.latenceMs === undefined ? 1_800 : options.latenceMs,
    nbElements: options.nbElements ?? null,
    confusion: options.confusion ?? null,
  };
}

/** `sha256(profil | noeud | demarreLe | graine)` — contrat v1 § 6.3, calculée par le client. */
function cleIdempotence(profil: string, noeud: string, demarreLe: string, graine: number) {
  return createHash('sha256')
    .update([profil, noeud, demarreLe, String(graine)].join('|'))
    .digest('hex');
}

async function envoyerTentative(
  profilId: string,
  etapes: readonly ReturnType<typeof etape>[],
  jour = 1
) {
  const demarreLe = `2026-09-0${String(jour)}T08:00:00.000Z`;
  const termineLe = `2026-09-0${String(jour)}T08:05:00.000Z`;
  return contexte.application.inject({
    method: 'POST',
    url: '/api/tentatives',
    payload: {
      cleIdempotence: cleIdempotence(profilId, 'clairiere-01', demarreLe, GRAINE_DE_TEST),
      profil: profilId,
      noeud: 'clairiere-01',
      exercice: 'clairiere-ecole-01',
      moteur: 'colorie',
      habillage: 'clairiere.ecole',
      graine: GRAINE_DE_TEST,
      demarreLe,
      termineLe,
      resume: {
        reussi: true,
        nbErreurs: etapes.reduce((n, e) => n + e.nbErreurs, 0),
        aideUtilisee: 'aucune',
        dureeMs: 60_000,
        etapes,
      },
    },
  });
}

async function lireMaitrise(profilId: string): Promise<readonly EtatMaitrise[]> {
  const reponse = await contexte.application.inject({
    method: 'GET',
    url: `/api/profils/${profilId}/maitrise`,
  });
  expect(reponse.statusCode).toBe(200);
  return reponse.json() as readonly EtatMaitrise[];
}

// ───────────────────────────────────────────── le journal fin est réellement alimenté

describe('POST /api/tentatives alimente le journal d’étapes', () => {
  it('inscrit une ligne par étape, avec sa latence et sa confusion', async () => {
    const profil = await creerProfil();
    const reponse = await envoyerTentative(profil, [
      etape({ identifiant: 'toit-ecole', modeReponse: 'colorie', latenceMs: 2_400 }),
      etape({
        identifiant: 'porte-ecole',
        modeReponse: 'colorie',
        nbErreurs: 1,
        confusion: {
          attendu: 'b', rendu: 'd', axe: 'gauche-droite', competence: 'comp.consigne.simple',
        },
      }),
    ]);
    expect(reponse.statusCode).toBe(201);

    const { compterEtapes, compterConfusions, listerEtapes } = await import('@serveur/depots/etapes');

    // Depuis Q-INT-4, une étape produit une ligne PAR compétence déclarée. On ne peut donc plus
    // désigner « la deuxième étape » par `etapes[1]` : cet index tombe désormais sur la seconde
    // COMPÉTENCE de la première étape. On cherche par rang, qui identifie l'étape elle-même.
    const etapes = listerEtapes(contexte.base, profil);
    const rangs = new Set(etapes.map((ligne) => ligne.rang));
    expect(rangs.size, 'deux étapes envoyées, deux rangs journalisés').toBe(2);
    expect(compterEtapes(contexte.base, profil)).toBeGreaterThanOrEqual(rangs.size);

    const premiere = etapes.filter((ligne) => ligne.rang === 0);
    const seconde = etapes.filter((ligne) => ligne.rang === 1);
    expect(premiere[0]?.latenceMs).toBe(2_400);
    expect(premiere.every((ligne) => ligne.confusion === null)).toBe(true);
    expect(seconde.some((ligne) => ligne.confusion?.axe === 'gauche-droite')).toBe(true);

    // D23 : une confusion journalisée porte son AXE. Un moteur qui rendrait `null` partout
    // viderait le top 10 du dashboard sans que personne ne s'en aperçoive.
    const comptes = compterConfusions(contexte.base, profil);
    expect(comptes.avecConfusion).toBe(1);
    expect(comptes.avecAxe).toBe(1);
  });

  it('refuse en 400 une étape sans `modeReponse` — c’est lui qui fixe p_devinette (D13)', async () => {
    const profil = await creerProfil();
    const reponse = await contexte.application.inject({
      method: 'POST',
      url: '/api/tentatives',
      payload: {
        profil, noeud: 'clairiere-01', exercice: 'clairiere-ecole-01', moteur: 'colorie',
        habillage: 'clairiere.ecole', graine: GRAINE_DE_TEST,
        demarreLe: INSTANT_DE_REFERENCE, termineLe: INSTANT_DE_REFERENCE,
        resume: {
          reussi: true, nbErreurs: 0, aideUtilisee: 'aucune', dureeMs: 1_000,
          etapes: [{ identifiant: 'toit-ecole', nbErreurs: 0, aideUtilisee: 'aucune', nbEcoutes: 0, dureeMs: 10 }],
        },
      },
    });
    expect(reponse.statusCode).toBe(400);
    expect((reponse.json() as { message: string }).message).toContain('modeReponse');
  });

  it('refuse aussi un `modeReponse` inconnu, plutôt que de le remplacer par un défaut', async () => {
    const profil = await creerProfil();
    const reponse = await contexte.application.inject({
      method: 'POST',
      url: '/api/tentatives',
      payload: {
        profil, noeud: 'clairiere-01', exercice: 'clairiere-ecole-01', moteur: 'colorie',
        habillage: 'clairiere.ecole', graine: GRAINE_DE_TEST,
        demarreLe: INSTANT_DE_REFERENCE, termineLe: INSTANT_DE_REFERENCE,
        resume: {
          reussi: true, nbErreurs: 0, aideUtilisee: 'aucune', dureeMs: 1_000,
          etapes: [{ identifiant: 'x', nbErreurs: 0, aideUtilisee: 'aucune', nbEcoutes: 0, dureeMs: 10, modeReponse: 'devinette' }],
        },
      },
    });
    expect(reponse.statusCode).toBe(400);
  });
});

// ───────────────────────────────────────────── idempotence

describe('idempotence de la mise à jour', () => {
  it('rejouer le même envoi ne double ni les étapes, ni les tentatives du BKT', async () => {
    const profil = await creerProfil();
    const etapes = [
      etape({ identifiant: 'toit-ecole', modeReponse: 'colorie' }),
      etape({ identifiant: 'porte-ecole', modeReponse: 'colorie' }),
    ];

    const premier = await envoyerTentative(profil, etapes);
    expect(premier.statusCode).toBe(201);

    // Ce que le premier envoi a produit fait référence : c'est sa NON-CROISSANCE qu'on garde.
    const { compterEtapes: compterApresPremier } = await import('@serveur/depots/etapes');
    const etapesApresPremier = compterApresPremier(contexte.base, profil);
    expect(etapesApresPremier).toBeGreaterThan(0);
    const apresPremier = await lireMaitrise(profil);

    const second = await envoyerTentative(profil, etapes);
    expect(second.statusCode).toBe(200);
    expect((second.json() as { deja: boolean }).deja).toBe(true);

    const { compterEtapes } = await import('@serveur/depots/etapes');
    // L'idempotence se mesure par l'ABSENCE de croissance, pas par un nombre fixe : le second
    // envoi ne doit rien ajouter, quel que soit le nombre de lignes que le premier a produit
    // (Q-INT-4 : une ligne par compétence déclarée).
    expect(compterEtapes(contexte.base, profil)).toBe(etapesApresPremier);
    expect(await lireMaitrise(profil)).toEqual(apresPremier);
  });
});

// ───────────────────────────────────────────── recalcul == incrémental

describe('le recalcul intégral rend exactement l’incrémental (annexe T § T2)', () => {
  it('sur trois jours, tous modes de réponse confondus', async () => {
    const profil = await creerProfil();

    await envoyerTentative(profil, [
      etape({ identifiant: 'toit-ecole', modeReponse: 'colorie' }),
      etape({ identifiant: 'porte-ecole', modeReponse: 'vrai-faux', nbErreurs: 1 }),
    ], 1);
    await envoyerTentative(profil, [
      etape({ identifiant: 'toit-ecole', modeReponse: 'saisie' }),
      etape({ identifiant: 'mur-ecole', modeReponse: 'ordre', nbElements: 4 }),
    ], 2);
    await envoyerTentative(profil, [
      etape({ identifiant: 'toit-ecole', modeReponse: 'colorie', aideUtilisee: 'indice' }),
      etape({ identifiant: 'porte-ecole', modeReponse: 'qcm-3' }),
    ], 3);

    const incremental = await lireMaitrise(profil);
    expect(incremental.length).toBeGreaterThan(0);
    expect(incremental[0]?.nbTentatives).toBe(6);

    const { chargerParametresPedagogie, recalculerMaitrise } = await import('@serveur/depots/maitrise');
    const { lireItems, recalculerLeitner } = await import('@serveur/depots/leitner');

    const parametres = chargerParametresPedagogie();
    const leitnerAvant = lireItems(contexte.base, profil);
    expect(leitnerAvant.length).toBe(3);

    const recalcule = recalculerMaitrise(contexte.base, profil, parametres);
    expect(recalcule).toEqual(incremental);

    const leitnerApres = recalculerLeitner(contexte.base, profil, parametres);
    expect(leitnerApres).toEqual(leitnerAvant);
  });

  it('recalculer deux fois de suite ne change rien', async () => {
    const profil = await creerProfil();
    await envoyerTentative(profil, [etape({ identifiant: 'toit-ecole', modeReponse: 'colorie' })], 1);

    const { chargerParametresPedagogie, recalculerMaitrise } = await import('@serveur/depots/maitrise');
    const parametres = chargerParametresPedagogie();
    const une = recalculerMaitrise(contexte.base, profil, parametres);
    const deux = recalculerMaitrise(contexte.base, profil, parametres);
    expect(deux).toEqual(une);
  });

  it('`ordre` traverse la chaîne : sans `nbElements`, le recalcul lèverait — il ne lève pas', async () => {
    const profil = await creerProfil();
    await envoyerTentative(profil, [
      etape({ identifiant: 'frise', modeReponse: 'ordre', nbElements: 5 }),
    ], 1);

    const { listerEtapes } = await import('@serveur/depots/etapes');
    expect(listerEtapes(contexte.base, profil)[0]?.nbElements).toBe(5);

    const { chargerParametresPedagogie, recalculerMaitrise } = await import('@serveur/depots/maitrise');
    expect(() =>
      recalculerMaitrise(contexte.base, profil, chargerParametresPedagogie())
    ).not.toThrow();
  });
});

// ───────────────────────────────────────────── un acquis n'est jamais repris

describe('un acquis n’est jamais repris (R14)', () => {
  it('`acquiseLe` posé à la main ne redescend pas, même après une série d’échecs', async () => {
    const profil = await creerProfil();
    await envoyerTentative(profil, [etape({ identifiant: 'toit-ecole', modeReponse: 'colorie' })], 1);

    // On force l'acquis en base, puis on tente la régression par le chemin nominal.
    contexte.base
      .prepare(
        `UPDATE maitrise_competence SET acquise_le = ? WHERE profil_id = ? AND competence = ?`
      )
      .run(INSTANT_DE_REFERENCE, profil, 'comp.consigne.simple');

    await envoyerTentative(profil, [
      etape({ identifiant: 'porte-ecole', modeReponse: 'colorie', nbErreurs: 3 }),
      etape({ identifiant: 'mur-ecole', modeReponse: 'colorie', nbErreurs: 5 }),
    ], 2);

    const apres = await lireMaitrise(profil);
    const cible = apres.find((m) => m.competence === 'comp.consigne.simple');
    expect(cible?.acquiseLe).toBe(INSTANT_DE_REFERENCE);
  });
});

// ───────────────────────────────────────────── révisions

describe('GET /api/profils/:id/revisions', () => {
  it('ne rend que les items dus, et rien avant leur échéance', async () => {
    const profil = await creerProfil();
    await envoyerTentative(profil, [
      etape({ identifiant: 'toit-ecole', modeReponse: 'colorie' }),
    ], 1);

    // L'horloge de l'application est figée à l'instant de référence : l'item promu en boîte 2
    // revient à J+3, il n'est donc pas dû tout de suite.
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/profils/${profil}/revisions`,
    });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json() as ItemLeitner[]).toEqual([]);

    const { lireItems } = await import('@serveur/depots/leitner');
    const items = lireItems(contexte.base, profil);
    expect(items).toHaveLength(1);
    expect(items[0]?.boite).toBe(2);
  });
});

// ───────────────────────────────────────────── étanchéité

describe('étanchéité stricte entre profils (v2 § 11)', () => {
  it('la maîtrise d’un profil n’apparaît jamais chez l’autre', async () => {
    const alma = await creerProfil('Alma');
    const bruno = await creerProfil('Bruno');

    await envoyerTentative(alma, [etape({ identifiant: 'toit-ecole', modeReponse: 'colorie' })], 1);

    expect((await lireMaitrise(alma)).length).toBeGreaterThan(0);
    expect(await lireMaitrise(bruno)).toEqual([]);

    const { compterEtapes } = await import('@serveur/depots/etapes');
    expect(compterEtapes(contexte.base, bruno)).toBe(0);
  });

  it('rend 404 sur un profil inconnu, jamais une liste vide', async () => {
    for (const chemin of ['maitrise', 'revisions']) {
      const reponse = await contexte.application.inject({
        method: 'GET',
        url: `/api/profils/profil-fantome/${chemin}`,
      });
      expect(reponse.statusCode).toBe(404);
    }
  });
});
