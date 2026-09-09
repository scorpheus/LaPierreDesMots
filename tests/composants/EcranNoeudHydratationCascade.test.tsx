import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercice, Noeud, SeuilsCascade } from '@pierre/partage';
import { EcranNoeud } from '@client/ecrans/EcranNoeud';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';
import { CHEMIN_EXERCICE_ECOLE, CHEMIN_NOEUD_CLAIRIERE, habillageEcole,
  lireJson, servicesDeTest } from '../configuration/preparation.js';

const api = vi.hoisted(() => ({ lireMonde: vi.fn() }));
vi.mock('@client/api/client', async (original) => ({
  ...(await original<Record<string, unknown>>()), lireMonde: api.lireMonde
}));

const cascade = { etoilesTotal: 49, etoilesDepuisIntermediaire: 4, intermediairesTotal: 9,
  intermediairesDepuisRare: 9, raresTotal: 0, dernierPalierLe: null };
const monde = { carte: { regions: [], ouvertesEnParallele: 1 },
  gobi: { stade: 'oeuf', formes: [], formeActive: null }, compagnons: [], campement: [], cascade };

function monter() {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  const retour = creerRetourSensoriel({ audio: base.audio, haptique,
    animationsDesactivees: true, emettreParticules: () => undefined });
  const celebrer = vi.spyOn(retour, 'palierFranchi');
  const services = { ...base, haptique, retour };
  const magasin = creerMagasin(services, 1,
    lireJson<SeuilsCascade>('contenu/referentiel/parametres-recompenses.json'));
  magasin.getState().choisirProfil({ id: 'prf-1', prenom: 'Alma' } as never);
  magasin.getState().demarrerNoeud({
    noeud: lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE),
    exercice: lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE), habillage: habillageEcole()
  } as never);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <FournisseurJeu valeur={{ services, magasin }}><EcranNoeud /></FournisseurJeu>
  </QueryClientProvider>);
  return { magasin, celebrer };
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); api.lireMonde.mockReset(); });

describe('la jauge reprend les acquis persistants sans rejouer la récompense', () => {
  it('reprend à quatre sur cinq après un rechargement, sans son ni nouveau gain', async () => {
    api.lireMonde.mockResolvedValue(monde);
    const { magasin, celebrer } = monter();
    await waitFor(() => expect(document.querySelector('[data-palier="intermediaire"]')
      ?.getAttribute('data-restant')).toBe('1'));
    expect(magasin.getState().cascade).toEqual(cascade);
    expect(magasin.getState().dernierGain).toBeNull();
    expect(celebrer).not.toHaveBeenCalled();
  });

  it('efface la jauge au changement de profil et ignore sa réponse tardive', async () => {
    let resoudre!: (valeur: typeof monde) => void;
    const lecture = new Promise<typeof monde>((resolution) => { resoudre = resolution; });
    api.lireMonde.mockReturnValueOnce(lecture).mockReturnValue(new Promise(() => undefined));
    const { magasin } = monter();
    act(() => magasin.setState({ cascade }));
    act(() => magasin.getState().choisirProfil({ id: 'prf-2', prenom: 'Léo' } as never));
    expect(magasin.getState().cascade.etoilesTotal).toBe(0);
    await act(async () => { resoudre(monde); });
    expect(magasin.getState().cascade.etoilesTotal).toBe(0);
    expect(magasin.getState().dernierGain).toBeNull();
  });
});
