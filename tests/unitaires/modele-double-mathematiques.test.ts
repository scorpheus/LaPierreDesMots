import { describe, expect, it } from 'vitest';
import type { EtatMaths, RepriseMaths, ResultatApiMaths, ResultatProjetMaths } from '@pierre/partage/mathematiques';
import { creerDoubleDeReseau } from '../modele/serveur-double.js';

describe('double de réseau de l’explorateur', () => {
  it('sert chaque motif déclaré et conserve une vraie instance de projet entre gestes et pause', async () => {
    const double = creerDoubleDeReseau();
    expect(double.motifsSansGestionnaire()).toEqual([]);
    const lire = async (chemin: string): Promise<ResultatApiMaths<EtatMaths>> =>
      await (await double.fetch(chemin)).json() as ResultatApiMaths<EtatMaths>;
    const debut = await lire('/api/mathematiques/etat?profilId=profil-1');
    expect(debut).toMatchObject({ ok: true, valeur: { generationMaths: 0, reprise: null,
      tentatives: [], recompenses: [] } });
    expect(await (await double.fetch('/api/profils/profil-1/reprise-lecture')).json()).toBeNull();

    const creation = await double.fetch('/api/mathematiques/projets', {
      method: 'POST', body: JSON.stringify({ profilId: 'profil-1', generationMaths: 0,
        cleGeste: 'projet-test', projetId: 'MAT-PON-P01', niveaux: ['decouverte', 'decouverte', 'decouverte'],
        graine: 42 }),
    });
    const projet = await creation.json() as ResultatApiMaths<ResultatProjetMaths>;
    expect(projet.ok).toBe(true);
    if (!projet.ok) return;
    const premiere = projet.valeur.reprise;
    expect(premiere.instance.famille).toBe('MAT-PON-01');
    expect(premiere.projet?.plan.map((etape) => etape.famille)).toEqual([
      'MAT-PON-01', 'MAT-PON-03', 'MAT-PON-02',
    ]);
    const action = await double.fetch(`/api/mathematiques/parties/${premiere.instance.id}/actions`, {
      method: 'POST', body: JSON.stringify({ profilId: 'profil-1', generationMaths: 0,
        instanceId: premiere.instance.id, revisionAttendue: 0, cleGeste: 'aide-test',
        geste: { type: 'aide', niveau: 'indice' } }),
    });
    expect((await action.json() as ResultatApiMaths<{ reprise: RepriseMaths }>)).toMatchObject({
      ok: true, valeur: { reprise: { revision: 1, aide: 'indice', instance: { id: premiere.instance.id } } },
    });
    const pause = await double.fetch(`/api/mathematiques/parties/${premiere.instance.id}/pause`, {
      method: 'POST', body: JSON.stringify({ profilId: 'profil-1', generationMaths: 0,
        instanceId: premiere.instance.id, revisionAttendue: 1, cleGeste: 'pause-test' }),
    });
    expect((await pause.json() as ResultatApiMaths<{ reprise: RepriseMaths }>)).toMatchObject({
      ok: true, valeur: { reprise: { revision: 2, aide: 'indice', projet: { suspendu: true } } },
    });
    expect(await lire('/api/mathematiques/etat?profilId=profil-1')).toMatchObject({
      ok: true, valeur: { reprise: null, projetSuspendu: { instance: { id: premiere.instance.id } } },
    });
    expect(double.journal().appelsSansGestionnaire).toEqual([]);
  });
});
