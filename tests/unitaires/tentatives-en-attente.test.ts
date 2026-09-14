import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Profil, ReponseTentative, TentativeAEnregistrer } from '@pierre/partage';
import { creerFileTentatives } from '@client/api/tentatives-en-attente';
import { ErreurReseau } from '@client/api/commun';

const charge: TentativeAEnregistrer = {
  cleIdempotence: 'cle-stable', profil: 'profil-isole' as TentativeAEnregistrer['profil'],
  generationProgression: 0, noeud: 'clairiere-01' as TentativeAEnregistrer['noeud'],
  exercice: 'clairiere-ecole-01' as TentativeAEnregistrer['exercice'], moteur: 'colorie',
  habillage: 'clairiere.ecole' as TentativeAEnregistrer['habillage'], graine: 1,
  demarreLe: '2026-09-01T08:00:00Z' as TentativeAEnregistrer['demarreLe'],
  termineLe: '2026-09-01T08:00:42Z' as TentativeAEnregistrer['termineLe'],
  resume: { reussi: true, nbErreurs: 0, aideUtilisee: 'aucune', dureeMs: 42000, etapes: [] }
};
const profil = { id: charge.profil, generationProgression: 0 } as Profil;
function reponse(tentative = charge, deja = false): ReponseTentative {
  return {
    tentative: { ...tentative, id: 'tentative-isolee' as ReponseTentative['tentative']['id'], etoiles: 3 },
    deja, progression: { noeud: tentative.noeud, etoiles: 3, nbTentatives: 1, dernierLe: tentative.termineLe },
    gainCascade: { etat: { etoilesTotal: 1, etoilesDepuisIntermediaire: 1, intermediairesTotal: 0,
      intermediairesDepuisRare: 0, raresTotal: 0, dernierPalierLe: null },
    paliersFranchis: [], recompenses: [], jauges: [] }
  };
}
function stockageMemoire() {
  const donnees = new Map<string, string>();
  return {
    get length() { return donnees.size; },
    key: (rang: number) => [...donnees.keys()][rang] ?? null,
    getItem: (cle: string) => donnees.get(cle) ?? null,
    setItem: (cle: string, valeur: string) => { donnees.set(cle, valeur); },
    removeItem: (cle: string) => { donnees.delete(cle); }
  };
}
function differer<T>() {
  let resoudre!: (valeur: T) => void;
  const promesse = new Promise<T>((resolution) => { resoudre = resolution; });
  return { promesse, resoudre };
}
const prefixe = 'essai-attente:';
afterEach(() => { vi.restoreAllMocks(); });

describe('boîte durable des tentatives réellement terminées', () => {
  it('ne transforme pas une partie inachevée en tentative récupérable', async () => {
    const reserve = stockageMemoire();
    const envoyer = vi.fn();
    const file = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    await expect(file.enregistrer({ ...charge, resume: { ...charge.resume, reussi: false } }))
      .rejects.toThrow('terminée');
    expect(file.lire()).toEqual([]);
    expect(envoyer).not.toHaveBeenCalled();
  });

  it('conserve avant le transport et reprend la même charge après rejet et nouveau chargement', async () => {
    const reserve = stockageMemoire();
    const envoyer = vi.fn().mockRejectedValueOnce(new Error('Réseau absent')).mockResolvedValue(reponse());
    const premiere = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    const resultat = premiere.enregistrer(charge);
    expect(JSON.parse(reserve.getItem(prefixe + charge.cleIdempotence)!)).toEqual(charge);
    expect(envoyer).not.toHaveBeenCalled();
    await expect(resultat).rejects.toThrow('Réseau absent');
    expect(premiere.lire()).toEqual([charge]);
    const rechargee = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    expect(await rechargee.reprendre(profil)).toBe(1);
    expect(envoyer.mock.calls.map((arguments_) => arguments_[0])).toEqual([charge, charge]);
    expect(rechargee.lire()).toEqual([]);
  });

  it('un ACK perdu ne crée qu’un acquis et ne remet pas de cadeau au rejeu', async () => {
    const reserve = stockageMemoire();
    const journal = new Set<string>();
    let gains = 0;
    let ackPerdu = true;
    const envoyer = vi.fn(async (tentative: TentativeAEnregistrer) => {
      const deja = journal.has(tentative.cleIdempotence);
      if (!deja) { journal.add(tentative.cleIdempotence); gains += 1; }
      if (ackPerdu) { ackPerdu = false; throw new Error('ACK perdu'); }
      return reponse(tentative, deja);
    });
    const file = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    await expect(file.enregistrer(charge)).rejects.toThrow('ACK perdu');
    const rechargee = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    const ack = await rechargee.enregistrer(rechargee.lire()[0]!);
    expect(ack.deja).toBe(true);
    expect(ack.gainCascade.recompenses).toEqual([]);
    expect(gains).toBe(1);
    expect([...journal]).toEqual([charge.cleIdempotence]);
    expect(rechargee.lire()).toEqual([]);
  });

  it('fusionne les doubles appels en vol, mais refuse une autre charge sous la même clé', async () => {
    const reserve = stockageMemoire();
    const attente = differer<ReponseTentative>();
    const envoyer = vi.fn(() => attente.promesse);
    const file = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    const premier = file.enregistrer(charge);
    const doublon = file.enregistrer(charge);
    expect(doublon).toBe(premier);
    await expect(file.enregistrer({ ...charge, graine: 2 })).rejects.toThrow('conservée');
    await Promise.resolve();
    expect(envoyer).toHaveBeenCalledTimes(1);
    attente.resoudre(reponse());
    await premier;
    expect(file.lire()).toEqual([]);
  });

  it('ne transmet rien et ne promet aucun acquis quand le stockage refuse l’écriture', async () => {
    const reserve = stockageMemoire();
    vi.spyOn(reserve, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    const envoyer = vi.fn();
    const file = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    await expect(file.enregistrer(charge)).rejects.toThrow('sans fermer la page');
    expect(envoyer).not.toHaveBeenCalled();
    expect(file.lire()).toEqual([]);
  });

  it('un nettoyage refusé après ACK reste un simple rejeu idempotent', async () => {
    const reserve = stockageMemoire();
    const suppression = vi.spyOn(reserve, 'removeItem').mockImplementationOnce(() => { throw new Error('Stockage occupé'); });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const envoyer = vi.fn().mockResolvedValueOnce(reponse()).mockResolvedValue(reponse(charge, true));
    const file = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    expect((await file.enregistrer(charge)).deja).toBe(false);
    expect(file.lire()).toEqual([charge]);
    suppression.mockRestore();
    const rechargee = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    expect((await rechargee.enregistrer(charge)).deja).toBe(true);
    expect(rechargee.lire()).toEqual([]);
  });

  it('garde une réponse incohérente en attente au lieu de confirmer le mauvais exercice', async () => {
    const reserve = stockageMemoire();
    const envoyer = vi.fn().mockResolvedValue(reponse({ ...charge, noeud: 'clairiere-02' as typeof charge.noeud }));
    const file = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    await expect(file.enregistrer(charge)).rejects.toThrow('ne correspond pas');
    expect(file.lire()).toEqual([charge]);
  });

  it('conserve le résultat réel si une clé déjà connue accuse un autre bilan', async () => {
    const reserve = stockageMemoire();
    const envoyer = vi.fn().mockResolvedValue(reponse({ ...charge,
      resume: { ...charge.resume, nbErreurs: 2, aideUtilisee: 'indice' } }, true));
    const file = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    const { cleIdempotence: _cle, ...terminee } = charge;
    file.conserver(terminee);
    await expect(file.enregistrer(charge)).rejects.toThrow('ne correspond pas');
    expect(file.lire()).toEqual([charge]);
    expect(file.lirePreparations()).toHaveLength(1);
  });

  it('ne reprend pas un autre joueur et retire la génération effacée sans envoi', async () => {
    const reserve = stockageMemoire();
    const envoyer = vi.fn().mockRejectedValue(new Error('Absent'));
    const file = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    await expect(file.enregistrer(charge)).rejects.toThrow();
    envoyer.mockClear();
    expect(await file.reprendre({ ...profil, id: 'autre' as Profil['id'] })).toBe(0);
    expect(file.lire()).toEqual([charge]);
    expect(await file.reprendre({ ...profil, generationProgression: 1 })).toBe(0);
    expect(envoyer).not.toHaveBeenCalled();
    expect(file.lire()).toEqual([]);
  });

  it.each([
    new ErreurReseau(409, '/api/tentatives', 'Reset', { code: 'generation-progression-perimee' }),
    new ErreurReseau(404, '/api/tentatives', 'Profil supprimé')
  ])('retire le refus définitif confirmé par le serveur (%s)', async (refus) => {
    const reserve = stockageMemoire();
    const envoyer = vi.fn().mockRejectedValueOnce(new Error('Absent')).mockRejectedValue(refus);
    const file = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    await expect(file.enregistrer(charge)).rejects.toThrow('Absent');
    expect(await file.reprendre(profil)).toBe(0);
    expect(file.lire()).toEqual([]);
  });
});

describe('frontière export/import et attente durable', () => {
  async function preparer() {
    const reserve = stockageMemoire();
    const envoyer = vi.fn().mockRejectedValueOnce(new Error('Absent')).mockResolvedValue(reponse());
    const file = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    await expect(file.enregistrer(charge)).rejects.toThrow('Absent');
    return { reserve, envoyer, file };
  }

  it('vide les attentes avant export et rend une panne explicite', async () => {
    const { file, envoyer } = await preparer();
    envoyer.mockRejectedValueOnce(new Error('Toujours absent'));
    await expect(file.vider()).rejects.toThrow('Toujours absent');
    expect(file.lire()).toEqual([charge]);
    await file.vider();
    expect(file.lire()).toEqual([]);
  });

  it('un import refusé conserve les attentes et autorise ensuite leur reprise', async () => {
    const { file } = await preparer();
    await expect(file.remplacerDonnees(async () => { throw new Error('Sauvegarde invalide'); }))
      .rejects.toThrow('Sauvegarde invalide');
    expect(file.lire()).toEqual([charge]);
    expect(file.messageSuspension()).toBeNull();
    expect(await file.reprendre(profil)).toBe(1);
  });

  it('un import réussi retire les anciennes attentes seulement après le remplacement', async () => {
    const { file, envoyer } = await preparer();
    envoyer.mockClear();
    const attente = differer<string>();
    const operation = file.remplacerDonnees(() => attente.promesse);
    expect(file.lire()).toEqual([charge]);
    await expect(file.reprendre(profil)).rejects.toThrow('Réimporte');
    attente.resoudre('base-restauree');
    expect(await operation).toBe('base-restauree');
    expect(file.lire()).toEqual([]);
    expect(file.messageSuspension()).toBeNull();
    expect(envoyer).not.toHaveBeenCalled();
  });

  it('après une fermeture pendant import, garde les attentes isolées et donne une issue parent', async () => {
    const { reserve, envoyer, file } = await preparer();
    void file.remplacerDonnees(() => new Promise(() => undefined));
    const rechargee = creerFileTentatives({ prefixe, stockage: () => reserve, envoyer });
    expect(rechargee.lire()).toEqual([charge]);
    await expect(rechargee.reprendre(profil)).rejects.toThrow('Réimporte');
    await expect(rechargee.vider()).rejects.toThrow('Réimporte');
    await expect(rechargee.remplacerDonnees(async () => 'nouvel-import')).resolves.toBe('nouvel-import');
    expect(rechargee.lire()).toEqual([]);
    expect(rechargee.messageSuspension()).toBeNull();
  });
});
