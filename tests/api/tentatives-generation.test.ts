import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Profil, ReponseTentative } from '@pierre/partage';
import { CHEMINS_API } from '@pierre/partage';
import { ENTETE_JETON_PARENT } from '@pierre/partage/parent';
import { monterApplication } from '../configuration/preparation.js';
import type { ApplicationDeTest } from '../configuration/preparation.js';

let contexte: ApplicationDeTest;
let profil: Profil;
let entetes: Record<string, string>;
beforeEach(async () => {
  contexte = await monterApplication();
  const creation = await contexte.application.inject({ method: 'POST', url: '/api/profils', payload: { prenom: 'Alma' } });
  expect(creation.statusCode).toBe(201);
  profil = creation.json<Profil>();
  const porte = await contexte.application.inject({ method: 'POST', url: '/api/parent/definir', payload: { code: '4271' } });
  expect(porte.statusCode).toBe(200);
  entetes = { [ENTETE_JETON_PARENT]: porte.json<{ jeton: string }>().jeton };
});
afterEach(async () => { await contexte.fermer(); });

function charge(generationProgression?: number) {
  return {
    cleIdempotence: 'cle-generation-stable', profil: profil.id,
    ...(generationProgression === undefined ? {} : { generationProgression }),
    noeud: 'clairiere-01', exercice: 'clairiere-ecole-01', moteur: 'colorie', habillage: 'clairiere.ecole',
    graine: 20260801, demarreLe: '2026-09-01T08:00:00.000Z', termineLe: '2026-09-01T08:00:42.000Z',
    resume: { reussi: true, nbErreurs: 0, aideUtilisee: 'aucune', dureeMs: 42000, etapes: [] }
  };
}
const envoyer = (generation?: number) => contexte.application.inject({
  method: 'POST', url: '/api/tentatives', payload: charge(generation)
});
async function reinitialiser(portee: 'complete' | 'progression') {
  const reponse = await contexte.application.inject({
    method: 'POST', url: `/api/parent/${profil.id}/reinitialiser`, headers: entetes,
    payload: { portee, confirmation: profil.prenom }
  });
  expect(reponse.statusCode).toBe(200);
}
async function acquis() {
  const progression = await contexte.application.inject({ method: 'GET', url: CHEMINS_API.progression(profil.id) });
  expect(progression.statusCode).toBe(200);
  return progression.json<unknown[]>();
}

describe('une tentative différée appartient à une génération précise de progression', () => {
  it('crée à zéro et incrémente chaque portée de reset sans changer de joueur', async () => {
    expect(profil.generationProgression).toBe(0);
    await reinitialiser('progression');
    const premiere = await contexte.application.inject({ method: 'GET', url: `/api/profils/${profil.id}` });
    expect(premiere.json<Profil>()).toMatchObject({ id: profil.id, prenom: profil.prenom, generationProgression: 1 });
    await reinitialiser('complete');
    const seconde = await contexte.application.inject({ method: 'GET', url: `/api/profils/${profil.id}` });
    expect(seconde.json<Profil>().generationProgression).toBe(2);
  });

  it('un ACK perdu est rejouable une fois, mais plus après la remise à zéro', async () => {
    const premiere = await envoyer(0);
    expect(premiere.statusCode).toBe(201);
    const reprise = await envoyer(0);
    expect(reprise.statusCode).toBe(200);
    expect(reprise.json<ReponseTentative>()).toMatchObject({ deja: true,
      gainCascade: { paliersFranchis: [], recompenses: [] } });
    expect((await acquis()).length).toBe(1);
    await reinitialiser('progression');
    const perimee = await envoyer(0);
    expect(perimee.statusCode).toBe(409);
    expect(perimee.json()).toMatchObject({ code: 'generation-progression-perimee' });
    expect(await acquis()).toEqual([]);
    expect(contexte.base.prepare('SELECT COUNT(*) AS n FROM tentatives').get()).toEqual({ n: 0 });
    const neuve = await envoyer(1);
    expect(neuve.statusCode).toBe(201);
    expect(neuve.json<ReponseTentative>().gainCascade.etat.etoilesTotal).toBe(1);
  });

  it('vérifie la génération avant une clé déjà connue', async () => {
    expect((await envoyer(0)).statusCode).toBe(201);
    // Simule une ancienne génération avec la clé d'une tentative qui existe toujours.
    const perimee = await envoyer(1);
    expect(perimee.statusCode).toBe(409);
    expect(perimee.json()).toMatchObject({ code: 'generation-progression-perimee' });
    expect(contexte.base.prepare('SELECT COUNT(*) AS n FROM tentatives').get()).toEqual({ n: 1 });
  });

  it('refuse une tentative conservée pour un profil supprimé', async () => {
    const suppression = await contexte.application.inject({
      method: 'DELETE', url: CHEMINS_API.parentSupprimerProfil(profil.id), headers: entetes,
      payload: { confirmation: profil.prenom }
    });
    expect(suppression.statusCode).toBe(200);
    expect((await envoyer(0)).statusCode).toBe(404);
    expect(contexte.base.prepare('SELECT COUNT(*) AS n FROM tentatives').get()).toEqual({ n: 0 });
  });

  it('garde les anciens clients sans marqueur compatibles', async () => {
    expect((await envoyer()).statusCode).toBe(201);
    expect((await envoyer()).json<ReponseTentative>().deja).toBe(true);
  });

  it.each([-1, 0.5, '0', null])('refuse une génération mal formée (%s)', async (generation) => {
    const reponse = await contexte.application.inject({ method: 'POST', url: '/api/tentatives',
      payload: { ...charge(), generationProgression: generation } });
    expect(reponse.statusCode).toBe(400);
    expect(await acquis()).toEqual([]);
  });
});
