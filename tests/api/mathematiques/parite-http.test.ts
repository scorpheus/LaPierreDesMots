import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { creerApiMathematiques } from '@partage/base/services/api-mathematiques';
import { reinitialiserProfil } from '@partage/base/services/reinitialisation-profil';
import { horlogeDeTest, monterApplication } from '../../configuration/preparation.js';
import type { ApplicationDeTest } from '../../configuration/preparation.js';

const PROFIL = 'profil-parite-maths';
const INSTANT = '2026-09-01T08:00:00.000Z';
let local: ApplicationDeTest;
let http: ApplicationDeTest;
const horloge = horlogeDeTest();

beforeEach(async () => {
  local = await monterApplication();
  http = await monterApplication();
  for (const contexte of [local, http]) {
    contexte.base.prepare(`INSERT INTO profils
      (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
      VALUES (?, 'Alma', '{}', 'clairiere', ?, ?)`).run(PROFIL, INSTANT, INSTANT);
  }
});
afterEach(async () => { await Promise.all([local.fermer(), http.fermer()]); });

describe('mêmes transitions maths sur le port local et HTTP', () => {
  it('garde projet, pause, réémission et génération identiques', async () => {
    const api = creerApiMathematiques(async () => local.baseAsync, horloge);
    const creation = { profilId: PROFIL, generationMaths: 0,
      cleGeste: 'projet-parite', projetId: 'MAT-PON-P01' as const,
      niveaux: ['decouverte', 'decouverte', 'decouverte'] as const, graine: 42 };
    const locale = await api.creerProjet(creation);
    const distante = await http.application.inject({
      method: 'POST', url: '/api/mathematiques/projets', payload: creation,
    });
    expect(distante.statusCode).toBe(200);
    expect(distante.json()).toEqual(locale);
    if (!locale.ok) throw new Error('Création locale refusée.');
    const instanceId = locale.valeur.reprise.instance.id;
    const pause = { profilId: PROFIL, generationMaths: 0, instanceId,
      revisionAttendue: 0, cleGeste: 'pause-parite' };
    const pauseLocale = await api.pause(pause);
    const pauseDistante = await http.application.inject({
      method: 'POST', url: `/api/mathematiques/parties/${instanceId}/pause`, payload: pause,
    });
    expect(pauseDistante.statusCode).toBe(200);
    expect(pauseDistante.json()).toEqual(pauseLocale);
    expect((await http.application.inject({
      method: 'GET', url: `/api/mathematiques/etat?profilId=${PROFIL}`,
    })).json()).toEqual(await api.lireEtat(PROFIL));
    expect((await http.application.inject({
      method: 'POST', url: `/api/mathematiques/parties/${instanceId}/pause`, payload: pause,
    })).json()).toEqual(await api.pause(pause));

    await Promise.all([
      reinitialiserProfil(local.baseAsync, PROFIL, 'maths', horloge),
      reinitialiserProfil(http.baseAsync, PROFIL, 'maths', horloge),
    ]);
    const ancienLocal = await api.pause(pause);
    const ancienHttp = await http.application.inject({
      method: 'POST', url: `/api/mathematiques/parties/${instanceId}/pause`, payload: pause,
    });
    expect(ancienHttp.statusCode).toBe(409);
    expect(ancienHttp.json()).toEqual(ancienLocal);
    expect((await api.lireEtat(PROFIL)).ok).toBe(true);
    expect((await http.application.inject({
      method: 'GET', url: `/api/mathematiques/etat?profilId=${PROFIL}`,
    })).json()).toEqual(await api.lireEtat(PROFIL));
  });
});
