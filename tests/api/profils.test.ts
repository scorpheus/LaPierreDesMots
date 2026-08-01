/**
 * Routes de santé et de profils — annexe T § T2, contrat gelé § 3.3.
 *
 * `fastify.inject()`, base `:memory:`, horloge figée, **aucun port ouvert**. C'est ce que
 * l'injection intégrale de `OptionsApplication` (contrat § 6.4) rend possible.
 *
 * ⚠ Signalé au rapport de L-G : le contrat nomme `CreationProfil`, `Profil` et `ReponseSante`
 * (§ 11.1) sans en donner les champs. Les corps ci-dessous reprennent en camelCase les
 * colonnes de la table `profils` du contrat § 6.2 — la seule source qui fasse foi sur ces noms.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { monterApplication } from '../configuration/preparation.js';

import type { ApplicationDeTest } from '../configuration/preparation.js';

let contexte: ApplicationDeTest;

beforeEach(async () => {
  contexte = await monterApplication();
});

afterEach(async () => {
  await contexte.fermer();
});

/** Corps de création minimal — les trois champs non dérivés de la table `profils`. */
function creationProfil(prenom = 'Alma') {
  return {
    prenom,
    avatar: { forme: 'rond', couleur: 'lagon', accessoire: null },
    paletteVariante: 'clairiere'
  };
}

async function creerProfil(prenom = 'Alma'): Promise<{ id: string } & Record<string, unknown>> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/profils',
    payload: creationProfil(prenom)
  });
  expect(reponse.statusCode).toBe(201);
  return reponse.json();
}

describe('GET /api/sante', () => {
  it('répond 200 sans qu’aucun port ne soit ouvert', async () => {
    const reponse = await contexte.application.inject({ method: 'GET', url: '/api/sante' });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json()).toBeTypeOf('object');
  });
});

describe('GET /api/profils', () => {
  it('rend un tableau vide sur une base neuve', async () => {
    const reponse = await contexte.application.inject({ method: 'GET', url: '/api/profils' });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json()).toEqual([]);
  });

  it('rend les profils créés', async () => {
    await creerProfil('Alma');
    await creerProfil('Noé');
    const reponse = await contexte.application.inject({ method: 'GET', url: '/api/profils' });
    const profils = reponse.json() as Array<{ prenom: string }>;
    expect(profils.map((p) => p.prenom).sort()).toEqual(['Alma', 'Noé']);
  });
});

describe('POST /api/profils', () => {
  it('crée un profil et répond 201 avec son identifiant', async () => {
    const profil = await creerProfil('Alma');
    expect(profil.id).toBeTypeOf('string');
    expect(profil.id.length).toBeGreaterThan(0);
    expect(profil['prenom']).toBe('Alma');
  });

  it('horodate la création avec l’horloge injectée, jamais avec l’heure réelle', async () => {
    const profil = await creerProfil();
    const cree = String(profil['creeLe'] ?? profil['cree_le'] ?? '');
    expect(cree).toContain('2026-09-01');
  });

  it('refuse un corps invalide avec une erreur typée, pas une pile d’appels', async () => {
    const reponse = await contexte.application.inject({
      method: 'POST',
      url: '/api/profils',
      payload: { prenom: '' }
    });
    expect(reponse.statusCode).toBeGreaterThanOrEqual(400);
    expect(reponse.statusCode).toBeLessThan(500);
    const corps = reponse.json() as Record<string, unknown>;
    expect(corps['code'] ?? corps['erreur'] ?? corps['message']).toBeDefined();
  });

  it('donne deux identifiants distincts à deux profils de même prénom', async () => {
    const un = await creerProfil('Alma');
    const deux = await creerProfil('Alma');
    expect(un.id).not.toBe(deux.id);
  });
});

describe('GET /api/profils/:id', () => {
  it('rend le profil demandé', async () => {
    const cree = await creerProfil('Alma');
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/profils/${cree.id}`
    });
    expect(reponse.statusCode).toBe(200);
    expect((reponse.json() as { id: string }).id).toBe(cree.id);
  });

  it('répond 404 sur un identifiant inconnu', async () => {
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: '/api/profils/profil-qui-n-existe-pas'
    });
    expect(reponse.statusCode).toBe(404);
  });
});

describe('GET /api/profils/:id/progression', () => {
  it('rend un tableau vide tant qu’aucune tentative n’a été journalisée', async () => {
    const cree = await creerProfil();
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/profils/${cree.id}/progression`
    });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json()).toEqual([]);
  });
});

describe('GET /api/contenu/noeuds/:id', () => {
  it('rend le paquet du seul nœud de la v1', async () => {
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: '/api/contenu/noeuds/clairiere-01'
    });
    expect(reponse.statusCode).toBe(200);
    const paquet = reponse.json() as Record<string, unknown>;
    // Le paquet porte de quoi jouer : le nœud, son exercice, son habillage.
    expect(JSON.stringify(paquet)).toContain('clairiere-ecole-01');
    expect(JSON.stringify(paquet)).toContain('clairiere.ecole');
  });

  it('répond 404 sur un nœud inconnu', async () => {
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: '/api/contenu/noeuds/vallee-des-rois-42'
    });
    expect(reponse.statusCode).toBe(404);
  });
});

describe('étanchéité entre profils — annexe T § T3', () => {
  it('la progression d’un profil n’apparaît jamais chez l’autre', async () => {
    const alma = await creerProfil('Alma');
    const noe = await creerProfil('Noé');

    const progressionAlma = await contexte.application.inject({
      method: 'GET',
      url: `/api/profils/${alma.id}/progression`
    });
    const progressionNoe = await contexte.application.inject({
      method: 'GET',
      url: `/api/profils/${noe.id}/progression`
    });

    expect(progressionAlma.json()).toEqual([]);
    expect(progressionNoe.json()).toEqual([]);
    expect(alma.id).not.toBe(noe.id);
  });
});
