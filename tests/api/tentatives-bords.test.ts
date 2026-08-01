/**
 * Les bords de `POST /api/tentatives` — écrit à l'intégration de la campagne v2.
 *
 * L'annexe T § 7 exige ≥ 80 % sur `serveur/routes/` ; la zone mesurait **78,29 % de branches**
 * après la campagne, et les branches manquantes étaient toutes du même genre : les gardes qui
 * lisent un corps mal formé. Or c'est exactement là que le journal peut se corrompre en
 * silence — et « le journal fait foi » : tout indicateur du dashboard, tout état pédagogique
 * s'en recalcule (CLAUDE.md).
 *
 * Le fil rouge de ces cas : **une valeur absurde ne devient jamais une valeur inventée.**
 * `latenceMs` reste `null` quand elle est illisible, jamais `0` — un zéro ferait plonger la
 * médiane du dashboard et raconterait un enfant fulgurant là où rien n'a été mesuré (D18).
 */
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { INSTANT_DE_REFERENCE, monterApplication } from '../configuration/preparation.js';

import type { ApplicationDeTest } from '../configuration/preparation.js';

let contexte: ApplicationDeTest;

beforeEach(async () => {
  contexte = await monterApplication();
});

afterEach(async () => {
  await contexte.fermer();
});

async function creerProfil(prenom = 'Alma'): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/profils',
    payload: { prenom, paletteVariante: 'clairiere' }
  });
  expect(reponse.statusCode).toBe(201);
  return (reponse.json() as { id: string }).id;
}

function cleIdempotence(profil: string, noeud: string, demarreLe: string, graine: number): string {
  return createHash('sha256')
    .update([profil, noeud, demarreLe, String(graine)].join('|'))
    .digest('hex');
}

function corpsDeBase(profil: string, etapes: readonly unknown[], graine = 20260801) {
  return {
    cleIdempotence: cleIdempotence(profil, 'clairiere-01', INSTANT_DE_REFERENCE, graine),
    profil,
    noeud: 'clairiere-01',
    exercice: 'clairiere-ecole-01',
    moteur: 'colorie',
    habillage: 'clairiere.ecole',
    graine,
    demarreLe: INSTANT_DE_REFERENCE,
    termineLe: '2026-09-01T08:01:00Z',
    resume: { reussi: true, nbErreurs: 0, aideUtilisee: 'aucune', dureeMs: 60_000, etapes }
  };
}

async function envoyer(corps: unknown) {
  return contexte.application.inject({ method: 'POST', url: '/api/tentatives', payload: corps });
}

/** Relit les étapes telles que le serveur les a réellement journalisées. */
function etapesJournalisees(): readonly Record<string, unknown>[] {
  const ligne = contexte.base.prepare('SELECT detail_json FROM tentatives').get() as
    | { detail_json: string }
    | undefined;
  if (ligne === undefined) return [];
  const detail = JSON.parse(ligne.detail_json) as { etapes?: Record<string, unknown>[] };
  return detail.etapes ?? [];
}

describe('POST /api/tentatives — les corps mal formés', () => {
  it('refuse un corps JSON valide qui n’est pas un objet', async () => {
    // `null` est du JSON parfaitement valide : Fastify l'accepte et le passe à la route. C'est
    // la route qui doit le refuser, et en 400 — pas en 500 ni en 415.
    const reponse = await contexte.application.inject({
      method: 'POST',
      url: '/api/tentatives',
      headers: { 'content-type': 'application/json' },
      body: 'null'
    });
    expect(reponse.statusCode).toBe(400);
    expect((reponse.json() as { code: string }).code).toBe('invalide');
  });

  it('refuse une graine absente ou non numérique — le rejeu en dépend', async () => {
    const profil = await creerProfil();
    const corps = { ...corpsDeBase(profil, []), graine: 'pas-un-nombre' };
    const reponse = await envoyer(corps);
    expect(reponse.statusCode).toBe(400);
    expect((reponse.json() as { message: string }).message).toContain('graine');
  });

  it('refuse un `resume` qui n’est pas un objet', async () => {
    const profil = await creerProfil();
    const corps = { ...corpsDeBase(profil, []), resume: 'trois etoiles' };
    const reponse = await envoyer(corps);
    expect(reponse.statusCode).toBe(400);
    expect((reponse.json() as { message: string }).message).toContain('resume');
  });

  it('refuse une étape sans `modeReponse` — c’est lui qui fixe p_devinette (D13)', async () => {
    const profil = await creerProfil();
    const reponse = await envoyer(
      corpsDeBase(profil, [{ identifiant: 'c1', nbErreurs: 0, dureeMs: 1000 }])
    );
    expect(reponse.statusCode).toBe(400);
    expect((reponse.json() as { message: string }).message).toContain('modeReponse');
  });

  it('refuse une étape dont le `modeReponse` n’est pas du vocabulaire fermé', async () => {
    const profil = await creerProfil();
    const reponse = await envoyer(
      corpsDeBase(profil, [{ identifiant: 'c1', modeReponse: 'a-vue-de-nez' }])
    );
    expect(reponse.statusCode).toBe(400);
  });
});

describe('POST /api/tentatives — ce qui est ignoré plutôt que refusé', () => {
  it('ignore une étape qui n’est pas un objet, et une étape sans identifiant', async () => {
    const profil = await creerProfil();
    const reponse = await envoyer(
      corpsDeBase(profil, [
        42,
        null,
        { identifiant: '   ', modeReponse: 'colorie' },
        { identifiant: 'c1', modeReponse: 'colorie', dureeMs: 900 }
      ])
    );
    expect(reponse.statusCode).toBe(201);
    const etapes = etapesJournalisees();
    expect(etapes).toHaveLength(1);
    expect(etapes[0]?.['identifiant']).toBe('c1');
  });

  it('un `etapes` qui n’est pas un tableau vaut « aucune étape », jamais une erreur', async () => {
    const profil = await creerProfil();
    const corps = corpsDeBase(profil, []) as unknown as { resume: { etapes: unknown } };
    corps.resume.etapes = 'pas un tableau';
    const reponse = await envoyer(corps);
    expect(reponse.statusCode).toBe(201);
    expect(etapesJournalisees()).toHaveLength(0);
  });
});

describe('POST /api/tentatives — les valeurs illisibles ne deviennent pas des chiffres', () => {
  it('`latenceMs` illisible reste `null`, jamais `0` — D18', async () => {
    const profil = await creerProfil();
    const reponse = await envoyer(
      corpsDeBase(profil, [
        { identifiant: 'c1', modeReponse: 'colorie', latenceMs: 'vite' },
        { identifiant: 'c2', modeReponse: 'colorie', latenceMs: Number.NaN },
        { identifiant: 'c3', modeReponse: 'colorie' },
        { identifiant: 'c4', modeReponse: 'colorie', latenceMs: 1234.7 }
      ])
    );
    expect(reponse.statusCode).toBe(201);
    const etapes = etapesJournalisees();
    expect(etapes.map((e) => e['latenceMs'])).toEqual([null, null, null, 1234]);
  });

  it('les compteurs négatifs ou illisibles retombent à zéro, jamais en dessous', async () => {
    const profil = await creerProfil();
    const reponse = await envoyer(
      corpsDeBase(profil, [
        {
          identifiant: 'c1',
          modeReponse: 'colorie',
          nbErreurs: -5,
          nbEcoutes: 'beaucoup',
          dureeMs: -1,
          aideUtilisee: 'un-palier-invente'
        }
      ])
    );
    expect(reponse.statusCode).toBe(201);
    const etape = etapesJournalisees()[0];
    expect(etape?.['nbErreurs']).toBe(0);
    expect(etape?.['nbEcoutes']).toBe(0);
    expect(etape?.['dureeMs']).toBe(0);
    // Un palier d'aide inconnu retombe sur `aucune` : jamais sur une valeur inventée.
    expect(etape?.['aideUtilisee']).toBe('aucune');
  });

  it('une confusion mal formée n’est pas journalisée — le top 10 ne ment pas', async () => {
    const profil = await creerProfil();
    const reponse = await envoyer(
      corpsDeBase(profil, [
        { identifiant: 'c1', modeReponse: 'colorie', confusion: 'b pour d' },
        { identifiant: 'c2', modeReponse: 'colorie', confusion: { attendu: 'b' } }
      ])
    );
    expect(reponse.statusCode).toBe(201);
    for (const etape of etapesJournalisees()) {
      expect(etape['confusion'], `étape ${String(etape['identifiant'])}`).toBeNull();
    }
  });
});
