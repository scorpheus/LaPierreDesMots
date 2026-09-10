import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercice, Habillage, Noeud, Profil } from '@pierre/partage';
import type { PlanSortie } from '@pierre/partage/pedagogie';
import type { PaquetNoeudAttendu } from '@client/api/client';

const api = vi.hoisted(() => ({ composer: vi.fn(), paquet: vi.fn(), enregistrer: vi.fn() }));
vi.mock('@client/api/client', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  composerSortie: api.composer,
  lirePaquetNoeud: api.paquet,
  enregistrerTentative: api.enregistrer,
}));

const { EcranRecompense } = await import('@client/ecrans/EcranRecompense');
const { creerMagasin } = await import('@client/etat/magasin');
const { FournisseurJeu } = await import('@client/etat/services');
const { creerHaptiqueMuette } = await import('@client/gamefeel/haptique-navigateur');
const { creerRetourSensoriel } = await import('@client/gamefeel/retour');
const { lireJson, servicesDeTest, habillageEcole, CHEMIN_EXERCICE_ECOLE, CHEMIN_NOEUD_CLAIRIERE } =
  await import('../configuration/preparation.js');

const profil = lireJson<Profil>('tests/fixtures/profils/enfant.json');
const paquetPrecedent = {
  noeud: lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE),
  exercice: lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE),
  habillage: habillageEcole(),
};
const paquetGaleries: PaquetNoeudAttendu = {
  noeud: lireJson<Noeud>('contenu/noeuds/galeries-01.json'),
  exercice: lireJson<Exercice>('contenu/exercices/galeries/miroir-bd-01.json'),
  habillage: lireJson<Habillage>('contenu/habillages/galeries/tracer-cristal.habillage.json'),
};
const preparation = {
  profil: profil.id, region: 'clairiere', regionObjectif: 'galeries', compagnon: null,
  composeeLe: '2026-09-01T08:00:00.000Z',
  etapes: [{ rang: 1, role: 'revision', noeud: paquetPrecedent.noeud.id,
    habillage: paquetPrecedent.habillage.id, competences: [], revisions: [] }],
} as PlanSortie;
const destination = {
  profil: profil.id, region: 'galeries', compagnon: null,
  composeeLe: '2026-09-01T08:00:00.000Z',
  etapes: [
    { rang: 1, role: 'echauffement', noeud: paquetGaleries.noeud.id,
      habillage: paquetGaleries.habillage.id, competences: [], revisions: [] },
    { rang: 2, role: 'revision', noeud: 'galeries-02', habillage: 'tracer-cristal',
      competences: [], revisions: [] },
  ],
} as PlanSortie;

function monter() {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  const services = { ...base, haptique, retour: creerRetourSensoriel({
    audio: base.audio, haptique, animationsDesactivees: true, emettreParticules: () => undefined,
  }) };
  const magasin = creerMagasin(services);
  magasin.setState({ profil, ecran: 'recompense', paquet: paquetPrecedent,
    sortie: preparation, journalise: false, tentativeEnvoyee: true, etoiles: 2 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const progression = [{ noeud: paquetPrecedent.noeud.id, etoiles: 2 }];
  client.setQueryData(['progression', profil.id], progression);
  client.setQueryData(['monde', String(profil.id)], {
    carte: { regions: [] }, gobi: { stade: 'oeuf', formes: [], formeActive: null },
    compagnons: [], campement: [],
  });
  client.setQueryData(['monde', 'stades'], []);
  client.setQueryData(['monde', 'regions'], []);
  render(<QueryClientProvider client={client}>
    <FournisseurJeu valeur={{ services, magasin }}><EcranRecompense /></FournisseurJeu>
  </QueryClientProvider>);
  return { magasin, client, progression };
}

beforeEach(() => { api.composer.mockReset(); api.paquet.mockReset(); api.enregistrer.mockReset(); });
afterEach(cleanup);

describe('la sortie de préparation reprend sa destination pédagogique', () => {
  it('On y va compose les Galeries, installe le plan exact et démarre son premier exercice sans acquis supplémentaire', async () => {
    api.composer.mockResolvedValue(destination);
    api.paquet.mockResolvedValue(paquetGaleries);
    const { magasin, client, progression } = monter();
    const cascadeAvant = magasin.getState().cascade;
    fireEvent.click(document.querySelector('[data-action="continuer-region"]')!);
    await waitFor(() => expect(magasin.getState().ecran).toBe('noeud'));
    expect(api.composer).toHaveBeenCalledExactlyOnceWith(profil.id, { region: 'galeries', compagnon: null });
    expect(api.paquet).toHaveBeenCalledExactlyOnceWith(paquetGaleries.noeud.id);
    expect(magasin.getState().sortie).toBe(destination);
    expect(magasin.getState().paquet).toBe(paquetGaleries);
    expect(magasin.getState().codeMoteur).toBe('trace');
    expect(magasin.getState().etatMoteur).toMatchObject({ indexLettre: 0, indexTrait: 0, termineMs: null });
    expect(magasin.getState().resume).toBeNull();
    expect(magasin.getState().cascade).toEqual(cascadeAvant);
    expect(client.getQueryData(['progression', profil.id])).toEqual(progression);
    expect(api.enregistrer).not.toHaveBeenCalled();
  });

  it('une réponse tardive ne remplace pas une nouvelle tentative', async () => {
    let livrer!: (paquet: PaquetNoeudAttendu) => void;
    const attente = new Promise<PaquetNoeudAttendu>((resoudre) => { livrer = resoudre; });
    api.composer.mockResolvedValue(destination);
    api.paquet.mockReturnValue(attente);
    const { magasin, client, progression } = monter();
    fireEvent.click(document.querySelector('[data-action="continuer-region"]')!);
    await waitFor(() => expect(api.paquet).toHaveBeenCalledTimes(1));
    act(() => { magasin.setState({ graine: magasin.getState().graine + 1 }); });
    const tentativeCourante = magasin.getState();
    await act(async () => { livrer(paquetGaleries); await attente; });
    expect(magasin.getState()).toBe(tentativeCourante);
    expect(magasin.getState().sortie).toBe(preparation);
    expect(magasin.getState().paquet).toBe(paquetPrecedent);
    expect(client.getQueryData(['progression', profil.id])).toEqual(progression);
    expect(api.enregistrer).not.toHaveBeenCalled();
  });
});
