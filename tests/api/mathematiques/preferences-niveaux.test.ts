import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { reinitialiserProfil } from '@pierre/partage/base';
import { horlogeDeTest, monterApplication, type ApplicationDeTest } from '../../configuration/preparation.js';

describe('choix de niveau de la vallée', () => {
  let contexte: ApplicationDeTest;
  let profil: string;
  let autreProfil: string;

  beforeEach(async () => {
    contexte = await monterApplication();
    const creer = async (prenom: string): Promise<string> => {
      const reponse = await contexte.application.inject({ method: 'POST', url: '/api/profils', payload: { prenom } });
      return reponse.json<{ id: string }>().id;
    };
    profil = await creer('Alma');
    autreProfil = await creer('Lila');
  });
  afterEach(async () => { await contexte.fermer(); });

  const lire = async (application: ApplicationDeTest, id: string) =>
    application.application.inject({ method: 'GET', url: `/api/mathematiques/etat?profilId=${id}` });

  it('conserve le choix par profil, génération et famille sans écrire une tentative', async () => {
    const commande = { profilId: profil, generationMaths: 0, famille: 'MAT-PON-01',
      niveau: 'exploration', revisionAttendue: 0, cleGeste: 'niveau-pon-01' };
    const premier = await contexte.application.inject({ method: 'PUT', url: '/api/mathematiques/niveaux', payload: commande });
    expect(premier.statusCode).toBe(200);
    expect(premier.json()).toMatchObject({ ok: true, valeur: { niveau: 'exploration', revision: 1 } });
    const reemission = await contexte.application.inject({ method: 'PUT', url: '/api/mathematiques/niveaux', payload: commande });
    expect(reemission.json()).toEqual(premier.json());
    const courant = (await lire(contexte, profil)).json();
    expect(courant).toMatchObject({ ok: true, valeur: {
      preferencesNiveaux: {
        'MAT-PON-01': { niveau: 'exploration', revision: 1 },
        'MAT-PON-02': { niveau: 'decouverte', revision: 0 },
      }, tentatives: [],
    } });
    expect((await lire(contexte, autreProfil)).json()).toMatchObject({ ok: true, valeur: {
      preferencesNiveaux: { 'MAT-PON-01': { niveau: 'decouverte', revision: 0 } },
    } });
    expect(contexte.base.prepare('SELECT COUNT(*) AS n FROM tentatives_maths').get()).toEqual({ n: 0 });
    const conflit = await contexte.application.inject({ method: 'PUT', url: '/api/mathematiques/niveaux',
      payload: { ...commande, niveau: 'defi', cleGeste: 'niveau-stale' } });
    expect(conflit.statusCode).toBe(409);
    contexte.base.prepare('UPDATE profils SET generation_maths = 1 WHERE id = ?').run(profil);
    expect((await lire(contexte, profil)).json()).toMatchObject({ ok: true, valeur: {
      generationMaths: 1, preferencesNiveaux: { 'MAT-PON-01': { niveau: 'decouverte', revision: 0 } },
    } });
    const ancienne = await contexte.application.inject({ method: 'PUT', url: '/api/mathematiques/niveaux', payload: commande });
    expect(ancienne.statusCode).toBe(409);
  });

  it('refuse les familles et niveaux inconnus', async () => {
    for (const choix of [
      { famille: 'MAT-FAUX-01', niveau: 'exploration' },
      { famille: 'MAT-PON-01', niveau: 'magique' },
    ]) {
      const reponse = await contexte.application.inject({ method: 'PUT', url: '/api/mathematiques/niveaux',
        payload: { profilId: profil, generationMaths: 0, revisionAttendue: 0,
          cleGeste: 'niveau-invalide', ...choix } });
      expect(reponse.statusCode).toBe(400);
    }
  });

  it('efface ce choix avec la remise à zéro maths et conserve celui des autres profils', async () => {
    const choix = (profilId: string, cleGeste: string) => contexte.application.inject({
      method: 'PUT', url: '/api/mathematiques/niveaux', payload: {
        profilId, generationMaths: 0, famille: 'MAT-JAR-01', niveau: 'defi',
        revisionAttendue: 0, cleGeste,
      },
    });
    expect((await choix(profil, 'choix-alma')).statusCode).toBe(200);
    expect((await choix(autreProfil, 'choix-lila')).statusCode).toBe(200);
    await reinitialiserProfil(contexte.baseAsync, profil, 'maths', horlogeDeTest());
    expect((await lire(contexte, profil)).json()).toMatchObject({ ok: true, valeur: {
      generationMaths: 1, preferencesNiveaux: { 'MAT-JAR-01': { niveau: 'decouverte', revision: 0 } },
    } });
    expect((await lire(contexte, autreProfil)).json()).toMatchObject({ ok: true, valeur: {
      generationMaths: 0, preferencesNiveaux: { 'MAT-JAR-01': { niveau: 'defi', revision: 1 } },
    } });
    expect(contexte.base.prepare('SELECT COUNT(*) AS n FROM preferences_niveaux_maths WHERE profil_id = ?').get(profil))
      .toEqual({ n: 0 });
  });

  it('garde exactement le projet suspendu pendant le libre au nouveau niveau', async () => {
    const projet = await contexte.application.inject({ method: 'POST', url: '/api/mathematiques/projets', payload: {
      profilId: profil, generationMaths: 0, cleGeste: 'projet-avant-niveau',
      projetId: 'MAT-PON-P01', niveaux: ['decouverte', 'decouverte', 'decouverte'], graine: 17,
    } });
    expect(projet.statusCode).toBe(200);
    const courante = projet.json<{ valeur: { reprise: { instance: { id: string; famille: string }; revision: number } } }>().valeur.reprise;
    const choix = await contexte.application.inject({ method: 'PUT', url: '/api/mathematiques/niveaux', payload: {
      profilId: profil, generationMaths: 0, famille: courante.instance.famille,
      niveau: 'exploration', revisionAttendue: 0, cleGeste: 'niveau-pendant-projet',
    } });
    expect(choix.statusCode).toBe(200);
    const pause = await contexte.application.inject({ method: 'POST',
      url: `/api/mathematiques/parties/${courante.instance.id}/pause`, payload: {
        profilId: profil, generationMaths: 0, instanceId: courante.instance.id,
        revisionAttendue: courante.revision, cleGeste: 'pause-avant-libre',
      } });
    expect(pause.statusCode).toBe(200);
    const suspendue = pause.json<{ valeur: { reprise: unknown } }>().valeur.reprise;
    const libre = await contexte.application.inject({ method: 'POST', url: '/api/mathematiques/parties', payload: {
      profilId: profil, generationMaths: 0, famille: courante.instance.famille,
      niveau: 'exploration', graine: 19, cleGeste: 'libre-apres-pause',
    } });
    expect(libre.statusCode).toBe(200);
    expect((await lire(contexte, profil)).json()).toMatchObject({ ok: true, valeur: {
      reprise: { instance: { niveau: 'exploration' }, projet: null },
      projetSuspendu: suspendue, tentatives: [],
    } });
    expect(contexte.base.prepare('SELECT COUNT(*) AS n FROM tentatives_maths').get()).toEqual({ n: 0 });
  });
});
