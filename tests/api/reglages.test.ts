/**
 * Routes des réglages de lecture — lot L2-B, annexe T § T2, contrat des features v2 § 5.3.
 *
 * `fastify.inject()`, base `:memory:`, horloge figée, **aucun port ouvert**.
 *
 * DEUX PROPRIÉTÉS SONT DÉFENDUES ICI, ET ELLES NE SE RESSEMBLENT PAS.
 *
 *  1. **L'étanchéité entre profils** (v2 § 11). Deux enfants, deux jeux de réglages, aucune
 *     fuite de l'un vers l'autre. C'est la propriété que le contrat demande à ce fichier.
 *  2. **« Ramené, jamais rejeté. »** Le serveur ne répond JAMAIS 400 sur une valeur hors
 *     bornes : il la ramène. Un `PUT` qui refuserait `corpsPx: 999` laisserait l'écran de
 *     réglages dans un état que l'enfant ne peut pas défaire.
 *
 * Le premier cas ci-dessous vérifie que les routes sont BRANCHÉES. Il est là exprès : L2-B
 * écrit `serveur/src/routes/reglages.ts`, mais c'est L2-H qui l'enregistre dans
 * `serveur/src/application.ts` (contrat § 5.1). Un travail écrit et non branché serait
 * silencieusement absent — ce cas est ce qui rend l'absence bruyante.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REGLAGES_PAR_DEFAUT, BORNES_REGLAGES } from '@pierre/partage/lecture';
import type { ReglagesLecture } from '@pierre/partage/lecture';

import { monterApplication } from '../configuration/preparation.js';
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
    payload: { prenom, avatar: {}, paletteVariante: 'clairiere' },
  });
  expect(reponse.statusCode).toBe(201);
  return (reponse.json() as { id: string }).id;
}

function chemin(id: string): string {
  return `/api/profils/${id}/reglages`;
}

async function lire(id: string): Promise<ReglagesLecture> {
  const reponse = await contexte.application.inject({ method: 'GET', url: chemin(id) });
  expect(reponse.statusCode).toBe(200);
  return reponse.json() as ReglagesLecture;
}

async function ecrire(
  id: string,
  delta: Partial<ReglagesLecture> | unknown,
): Promise<{ statut: number; corps: unknown }> {
  const reponse = await contexte.application.inject({
    method: 'PUT',
    url: chemin(id),
    payload: delta as Record<string, unknown>,
  });
  return { statut: reponse.statusCode, corps: reponse.json() };
}

describe('les routes sont branchées', () => {
  it('`GET /api/profils/:id/reglages` répond — sinon L2-H ne l’a pas enregistrée', async () => {
    const id = await creerProfil();
    const reponse = await contexte.application.inject({ method: 'GET', url: chemin(id) });
    expect(
      reponse.statusCode,
      'Route absente : `enregistrerRoutesReglages` (serveur/src/routes/reglages.ts, L2-B) ' +
        'n’est pas appelée depuis `serveur/src/application.ts` (L2-H). Contrat § 5.1.',
    ).toBe(200);
  });

  it('les tables de la migration 002 existent', () => {
    const tables = contexte.base
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as unknown as { name: string }[];
    const noms = tables.map((ligne) => String(ligne.name));
    expect(noms).toContain('reglages_lecture');
    expect(noms).toContain('essais_typographie');
  });
});

describe('GET /api/profils/:id/reglages', () => {
  it('rend les défauts sur un profil neuf, jamais une erreur', async () => {
    const id = await creerProfil();
    expect(await lire(id)).toEqual(REGLAGES_PAR_DEFAUT);
  });

  it('répond 404 sur un profil inconnu', async () => {
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: chemin('prf-qui-n-existe-pas'),
    });
    expect(reponse.statusCode).toBe(404);
  });
});

describe('PUT /api/profils/:id/reglages — ramène, ne rejette jamais', () => {
  it('enregistre un réglage et le relit à l’identique', async () => {
    const id = await creerProfil();
    const { statut, corps } = await ecrire(id, { police: 'luciole', corpsPx: 32 });
    expect(statut).toBe(200);
    expect((corps as ReglagesLecture).police).toBe('luciole');
    expect((corps as ReglagesLecture).corpsPx).toBe(32);

    const relu = await lire(id);
    expect(relu.police).toBe('luciole');
    expect(relu.corpsPx).toBe(32);
  });

  it('applique un DELTA : un champ absent du corps n’est pas remis au défaut', async () => {
    const id = await creerProfil();
    await ecrire(id, { police: 'luciole' });
    await ecrire(id, { corpsPx: 30 });
    const relu = await lire(id);
    expect(relu.police).toBe('luciole');
    expect(relu.corpsPx).toBe(30);
  });

  it('RAMÈNE une valeur trop grande au lieu de répondre 400', async () => {
    const id = await creerProfil();
    const { statut, corps } = await ecrire(id, { corpsPx: 999 });
    expect(statut).toBe(200);
    expect((corps as ReglagesLecture).corpsPx).toBe(BORNES_REGLAGES.corpsPx.max);
  });

  it('RAMÈNE une valeur trop petite, et une valeur négative', async () => {
    const id = await creerProfil();
    expect(((await ecrire(id, { corpsPx: 2 })).corps as ReglagesLecture).corpsPx).toBe(
      BORNES_REGLAGES.corpsPx.min,
    );
    expect(
      ((await ecrire(id, { interlettrageEm: -5 })).corps as ReglagesLecture).interlettrageEm,
    ).toBe(BORNES_REGLAGES.interlettrageEm.min);
  });

  it('rend Andika sur une police inconnue, sans erreur', async () => {
    const id = await creerProfil();
    const { statut, corps } = await ecrire(id, { police: 'comic-sans' });
    expect(statut).toBe(200);
    expect((corps as ReglagesLecture).police).toBe('andika');
  });

  it('refuse un corps qui n’est PAS un objet — la seule erreur possible ici', async () => {
    const id = await creerProfil();
    const reponse = await contexte.application.inject({
      method: 'PUT',
      url: chemin(id),
      headers: { 'content-type': 'application/json' },
      payload: '"une chaine"',
    });
    expect(reponse.statusCode).toBe(400);
  });

  it('est idempotent : deux `PUT` identiques rendent le même état', async () => {
    const id = await creerProfil();
    const un = (await ecrire(id, { police: 'opendyslexic', interligne: 2 })).corps;
    const deux = (await ecrire(id, { police: 'opendyslexic', interligne: 2 })).corps;
    expect(deux).toEqual(un);
  });

  it('horodate avec l’horloge injectée, jamais avec l’heure réelle', async () => {
    const id = await creerProfil();
    await ecrire(id, { corpsPx: 28 });
    const ligne = contexte.base
      .prepare('SELECT modifie_le FROM reglages_lecture WHERE profil_id = ?')
      .get(id) as unknown as { modifie_le: string };
    expect(String(ligne.modifie_le)).toContain('2026-09-01');
  });

  it('répond 404 sur un profil inconnu', async () => {
    const reponse = await contexte.application.inject({
      method: 'PUT',
      url: chemin('prf-inconnu'),
      payload: { corpsPx: 20 },
    });
    expect(reponse.statusCode).toBe(404);
  });
});

describe('étanchéité entre profils — v2 § 11', () => {
  it('les réglages d’un profil n’apparaissent JAMAIS chez l’autre', async () => {
    const alma = await creerProfil('Alma');
    const noe = await creerProfil('Noé');

    await ecrire(alma, {
      police: 'opendyslexic',
      corpsPx: 40,
      interlettrageEm: 0.15,
      fond: 'sombre',
    });

    const deAlma = await lire(alma);
    const deNoe = await lire(noe);

    expect(deAlma.police).toBe('opendyslexic');
    expect(deAlma.corpsPx).toBe(40);
    expect(deAlma.fond).toBe('sombre');

    // Noé n'a rien touché : il lit avec les défauts, au bit près.
    expect(deNoe).toEqual(REGLAGES_PAR_DEFAUT);
  });

  it('écrire chez l’un n’écrase pas la ligne de l’autre', async () => {
    const alma = await creerProfil('Alma');
    const noe = await creerProfil('Noé');

    await ecrire(alma, { corpsPx: 18 });
    await ecrire(noe, { corpsPx: 40 });

    expect((await lire(alma)).corpsPx).toBe(18);
    expect((await lire(noe)).corpsPx).toBe(40);

    const lignes = contexte.base
      .prepare('SELECT COUNT(*) AS n FROM reglages_lecture')
      .get() as unknown as { n: number };
    expect(Number(lignes.n)).toBe(2);
  });
});

describe('GET /api/profils/:id/essai-typographie', () => {
  it('rend `null` tant qu’aucun essai n’est ouvert — ce n’est pas une erreur', async () => {
    const id = await creerProfil();
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/profils/${id}/essai-typographie`,
    });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json()).toBeNull();
  });

  it('répond 404 sur un profil inconnu', async () => {
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: '/api/profils/prf-inconnu/essai-typographie',
    });
    expect(reponse.statusCode).toBe(404);
  });
});
