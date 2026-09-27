import { describe, expect, it } from 'vitest';
import { creerBarriereActivites } from '@client/api/barriere-activites';

describe('barrière des écritures avant sauvegarde', () => {
  it('attend le geste durable et refuse une nouvelle écriture pendant l’export', async () => {
    const barriere = creerBarriereActivites();
    let acquitter!: () => void;
    const ordre: string[] = [];
    const geste = barriere.ecrire('geste', async () => { await new Promise<void>((resoudre) => { acquitter = resoudre; }); ordre.push('geste'); });
    const exporte = barriere.proteger(async () => { ordre.push('export'); });
    await expect(barriere.ecrire('autre', async () => undefined)).rejects.toThrow('sauvegarde');
    acquitter();
    await Promise.all([geste, exporte]);
    expect(ordre).toEqual(['geste', 'export']);
  });
  it('refuse un export après erreur jusqu’à la réémission réussie de ce geste', async () => {
    const barriere = creerBarriereActivites();
    await expect(barriere.ecrire('geste', async () => { throw new Error('Stockage'); })).rejects.toThrow('Stockage');
    await expect(barriere.proteger(async () => 1)).rejects.toThrow('confirm');
    await barriere.ecrire('geste', async () => undefined);
    expect(await barriere.proteger(async () => 2)).toBe(2);
  });
  it('traite stockage résolu comme non confirmé, puis libère un refus déterministe', async () => {
    const barriere = creerBarriereActivites();
    const options = { nonConfirmee: (resultat: { ok: boolean; erreur?: { code: string } }) =>
      !resultat.ok && resultat.erreur?.code === 'stockage' };
    const stockage = await barriere.ecrire('maths:profil:geste', async () =>
      ({ ok: false, erreur: { code: 'stockage' } }), options);
    expect(stockage).toMatchObject({ ok: false, erreur: { code: 'stockage' } });
    await expect(barriere.proteger(async () => 'export')).rejects.toThrow('confirm');
    await barriere.ecrire('maths:profil:geste', async () =>
      ({ ok: false, erreur: { code: 'conflit' } }), options);
    expect(await barriere.proteger(async () => 'export')).toBe('export');
    await barriere.ecrire('maths:profil:autre', async () =>
      ({ ok: false, erreur: { code: 'requete-invalide' } }), options);
    expect(await barriere.proteger(async () => 'export')).toBe('export');
  });

  it('attend le classement stockage d’un geste en vol avant de décider l’export', async () => {
    const barriere = creerBarriereActivites();
    let acquitter!: () => void;
    const geste = barriere.ecrire('maths:profil:geste', async () => {
      await new Promise<void>((resoudre) => { acquitter = resoudre; });
      return { ok: false, erreur: { code: 'stockage' } };
    }, { nonConfirmee: (resultat) => !resultat.ok && resultat.erreur.code === 'stockage' });
    const exporte = barriere.proteger(async () => 'export');
    const verdict = expect(exporte).rejects.toThrow('confirm');
    await Promise.resolve();
    acquitter();
    await geste;
    await verdict;
  });

  it('ferme la barrière avant la préparation, laisse son écriture lecture finir puis exporte', async () => {
    const barriere = creerBarriereActivites();
    const ordre: string[] = [];
    let finirLecture!: () => void;
    let finirPreparation!: () => void;
    let finirExport!: () => void;
    let signalerExport!: () => void;
    const preparationFinie = new Promise<void>((resoudre) => { finirPreparation = resoudre; });
    const exportCommence = new Promise<void>((resoudre) => { signalerExport = resoudre; });
    const exporte = barriere.proteger(async () => {
      ordre.push('export');
      signalerExport();
      await new Promise<void>((resoudre) => { finirExport = resoudre; });
    }, () => {
      ordre.push('préparation');
      return preparationFinie;
    });
    await expect(barriere.ecrire('maths:profil:geste', async () => undefined)).rejects.toThrow('sauvegarde');
    const lecture = barriere.ecrire('lecture:profil:noeud:0', async () => {
      await new Promise<void>((resoudre) => { finirLecture = resoudre; });
      ordre.push('lecture');
    });
    await Promise.resolve();
    finirPreparation();
    await preparationFinie;
    await expect(barriere.ecrire('lecture:profil:autre:0', async () => undefined)).rejects.toThrow('sauvegarde');
    expect(ordre).toEqual(['préparation']);
    finirLecture();
    await lecture;
    await exportCommence;
    expect(ordre).toEqual(['préparation', 'lecture', 'export']);
    finirExport();
    await exporte;
  });
});
