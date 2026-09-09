import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EcranRecompense } from '@client/ecrans/EcranRecompense';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { servicesDeTest } from '../configuration/preparation.js';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';

const api = vi.hoisted(() => ({ enregistrer: vi.fn(), lirePaquet: vi.fn() }));
vi.mock('@client/api/client', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  calculerCleIdempotence: () => Promise.resolve('cle-tentative-stable'),
  enregistrerTentative: api.enregistrer,
  lirePaquetNoeud: api.lirePaquet,
  lireMonde: () => Promise.resolve(null),
  lireProgression: () => Promise.resolve([])
}));

const gain = {
  etat: { etoilesTotal: 3, etoilesDepuisIntermediaire: 3, intermediairesTotal: 0,
    intermediairesDepuisRare: 0, raresTotal: 0, dernierPalierLe: null },
  paliersFranchis: [], recompenses: [], jauges: []
};

function differer<T>() {
  let resoudre!: (valeur: T) => void;
  const promesse = new Promise<T>((resolution) => { resoudre = resolution; });
  return { promesse, resoudre };
}

function monter(etat: Partial<Record<string, unknown>> = {}) {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  const services = { ...base, haptique, retour: creerRetourSensoriel({
    audio: base.audio, haptique, animationsDesactivees: true, emettreParticules: () => undefined
  }) };
  const magasin = creerMagasin(services);
  magasin.setState({
    ecran: 'recompense', profil: { id: 'prf-1', prenom: 'Alma' },
    paquet: { noeud: { id: 'clairiere-01' },
      exercice: { id: 'ex-01', jeu: { moteur: 'colorie' } },
      habillage: { id: 'ecole', timings: {} } },
    resume: { reussi: true, nbErreurs: 0, aideUtilisee: false, dureeMs: 42000 },
    etoiles: 3, journalise: true, tentativeEnvoyee: false,
    demarreLe: '2026-09-01T08:00:00.000Z', termineLe: '2026-09-01T08:00:42.000Z',
    ...etat
  } as never);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>
    <FournisseurJeu valeur={{ services, magasin }}><EcranRecompense /></FournisseurJeu>
  </QueryClientProvider>);
  return { magasin, client };
}

beforeEach(() => { api.enregistrer.mockReset(); api.lirePaquet.mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('la réussite reste sauvegardable jusqu’à son accusé de réception', () => {
  it('conserve le cadeau accusé si seule la lecture des caches doit être retentée', async () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const gainAvecCadeau = { ...gain, paliersFranchis: ['intermediaire'],
      recompenses: [{ palier: 'intermediaire', nature: 'forme-gobi', reference: 'ou',
        asset: 'assets/gobi/cristal-ou.svg', region: null }] };
    api.enregistrer.mockResolvedValueOnce({ gainCascade: gainAvecCadeau })
      .mockResolvedValue({ gainCascade: gain });
    const { magasin, client } = monter();
    const invalidation = vi.spyOn(client, 'invalidateQueries')
      .mockRejectedValueOnce(new Error('lecture du monde interrompue'))
      .mockResolvedValue(undefined);
    await waitFor(() => expect(avertissement).toHaveBeenCalled());
    expect(magasin.getState().tentativeEnvoyee).toBe(false);
    fireEvent.click(document.querySelector('[data-action="voir-carte"]')!);
    await waitFor(() => expect(magasin.getState().ecran).toBe('carte'));
    expect(invalidation).toHaveBeenCalledTimes(4);
    expect(api.enregistrer).toHaveBeenCalledTimes(1);
    expect(magasin.getState().dernierGain).toEqual(gainAvecCadeau);
  });

  it('une réponse du prochain exercice ne relance rien après le retour à la carte', async () => {
    api.enregistrer.mockResolvedValue({ gainCascade: gain });
    const lecture = differer<unknown>();
    api.lirePaquet.mockReturnValue(lecture.promesse);
    const { magasin } = monter({ sortie: { compagnon: null, etapes: [
      { noeud: 'clairiere-01' }, { noeud: 'clairiere-02' }
    ] } });
    await waitFor(() => expect(magasin.getState().tentativeEnvoyee).toBe(true));
    const demarrer = vi.spyOn(magasin.getState(), 'demarrerNoeud');
    fireEvent.click(document.querySelector('[data-action="exercice-suivant"]')!);
    expect(api.lirePaquet).toHaveBeenCalledWith('clairiere-02');
    fireEvent.click(document.querySelector('[data-action="voir-carte"]')!);
    expect(magasin.getState().ecran).toBe('carte');
    await act(async () => { lecture.resoudre(magasin.getState().paquet); });
    expect(demarrer).not.toHaveBeenCalled();
    expect(magasin.getState().ecran).toBe('carte');
  });

  it('attend le journal et les caches avant de rendre la carte accessible', async () => {
    const envoi = differer<{ gainCascade: typeof gain }>();
    const caches = differer<void>();
    api.enregistrer.mockReturnValue(envoi.promesse);
    const { magasin, client } = monter();
    vi.spyOn(client, 'invalidateQueries').mockReturnValue(caches.promesse);
    await waitFor(() => expect(api.enregistrer).toHaveBeenCalledTimes(1));
    expect(magasin.getState().tentativeEnvoyee).toBe(false);
    fireEvent.click(document.querySelector('[data-action="voir-carte"]')!);
    expect(magasin.getState().ecran).toBe('recompense');
    await act(async () => { envoi.resoudre({ gainCascade: gain }); });
    fireEvent.click(document.querySelector('[data-action="voir-carte"]')!);
    expect(magasin.getState().ecran).toBe('recompense');
    await act(async () => { caches.resoudre(); });
    await waitFor(() => expect(magasin.getState().tentativeEnvoyee).toBe(true));
    fireEvent.click(document.querySelector('[data-action="voir-carte"]')!);
    await waitFor(() => expect(magasin.getState().ecran).toBe('carte'));
  });

  it('un tap après une panne renvoie exactement la même tentative puis rejoint la carte', async () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    api.enregistrer.mockRejectedValueOnce(new Error('réseau absent'))
      .mockResolvedValueOnce({ gainCascade: gain });
    const { magasin } = monter();
    await waitFor(() => expect(avertissement).toHaveBeenCalled());
    expect(magasin.getState().tentativeEnvoyee).toBe(false);
    expect(document.querySelector('[data-fin="reussite"]')).not.toBeNull();
    fireEvent.click(document.querySelector('[data-action="voir-carte"]')!);
    await waitFor(() => expect(api.enregistrer).toHaveBeenCalledTimes(2));
    expect(api.enregistrer.mock.calls[1]?.[0]).toEqual(api.enregistrer.mock.calls[0]?.[0]);
    await waitFor(() => expect(magasin.getState().ecran).toBe('carte'));
    expect(magasin.getState().tentativeEnvoyee).toBe(true);
  });

  it('ne remet aucun gain de l’ancien profil au nouveau profil', async () => {
    const envoi = differer<{ gainCascade: typeof gain }>();
    api.enregistrer.mockReturnValue(envoi.promesse);
    const { magasin } = monter();
    await waitFor(() => expect(api.enregistrer).toHaveBeenCalledTimes(1));
    act(() => magasin.setState({ profil: { id: 'prf-2', prenom: 'Léo' },
      ecran: 'carte', paquet: null, resume: null, tentativeEnvoyee: false } as never));
    await act(async () => { envoi.resoudre({ gainCascade: gain }); });
    expect(magasin.getState().dernierGain).toBeNull();
    expect(magasin.getState().tentativeEnvoyee).toBe(false);
    expect(magasin.getState().ecran).toBe('carte');
  });

  it('ne valide pas une nouvelle tentative du même profil avec la réponse précédente', async () => {
    const envoi = differer<{ gainCascade: typeof gain }>();
    api.enregistrer.mockReturnValue(envoi.promesse);
    const { magasin } = monter();
    await waitFor(() => expect(api.enregistrer).toHaveBeenCalledTimes(1));
    act(() => magasin.setState({ ecran: 'noeud',
      demarreLe: '2026-09-01T08:01:00.000Z', tentativeEnvoyee: false }));
    await act(async () => { envoi.resoudre({ gainCascade: gain }); });
    expect(magasin.getState().dernierGain).toBeNull();
    expect(magasin.getState().tentativeEnvoyee).toBe(false);
    expect(magasin.getState().ecran).toBe('noeud');
  });
});
