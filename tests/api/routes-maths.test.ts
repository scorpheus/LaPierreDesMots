import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { monterApplication } from '../configuration/preparation.js';
import type { ApplicationDeTest } from '../configuration/preparation.js';

describe('routes de la vallée', () => {
  let contexte: ApplicationDeTest;
  let profil: string;
  beforeEach(async () => {
    contexte = await monterApplication();
    const reponse = await contexte.application.inject({ method: 'POST', url: '/api/profils', payload: { prenom: 'Essai maths' } });
    profil = reponse.json<{ id: string }>().id;
  });
  afterEach(async () => { await contexte.fermer(); });

  it('ouvre une partie sur profil neuf, persiste et refuse un autre profil', async () => {
    const etat = await contexte.application.inject({ method: 'GET', url: `/api/mathematiques/etat?profilId=${profil}` });
    expect(etat.statusCode).toBe(200);
    expect(etat.json()).toMatchObject({ ok: true, valeur: { generationMaths: 0, reprise: null, tentatives: [] } });
    const cree = await contexte.application.inject({ method: 'POST', url: '/api/mathematiques/parties', payload: {
      profilId: profil, generationMaths: 0, famille: 'MAT-PON-03', niveau: 'decouverte', graine: 17, cleGeste: 'creation-test',
    } });
    expect(cree.statusCode).toBe(200);
    const partie = cree.json<{ valeur: { reprise: { instance: { id: string } } } }>().valeur.reprise;
    const relue = await contexte.application.inject({ method: 'GET', url: `/api/mathematiques/parties/${partie.instance.id}?profilId=${profil}` });
    expect(relue.json()).toMatchObject({ ok: true, valeur: partie });
    const interdit = await contexte.application.inject({ method: 'GET', url: `/api/mathematiques/parties/${partie.instance.id}?profilId=autre` });
    expect(interdit.statusCode).toBe(404);
  });

  it('refuse les corps incomplets et protège le bilan parent', async () => {
    for (const payload of [{}, { profilId: profil }, { profilId: profil, generationMaths: 0, famille: 'MAT-PON-01', niveau: 'invente', graine: 1, cleGeste: 'x' }]) {
      const reponse = await contexte.application.inject({ method: 'POST', url: '/api/mathematiques/parties', payload });
      expect(reponse.statusCode).toBe(400);
    }
    const bilan = await contexte.application.inject({ method: 'GET', url: `/api/parent/${profil}/mathematiques` });
    expect(bilan.statusCode).toBe(401);
  });
});
