import { cleanup, render, waitFor } from '@testing-library/react';
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

const cascade = { etoilesTotal: 0, etoilesDepuisIntermediaire: 0, intermediairesTotal: 0,
  intermediairesDepuisRare: 0, raresTotal: 0, dernierPalierLe: null };

function monter(): void {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  const retour = creerRetourSensoriel({ audio: base.audio, haptique,
    animationsDesactivees: true, emettreParticules: () => undefined });
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
}

afterEach(() => { cleanup(); api.lireMonde.mockReset(); });

describe('pendant un exercice, Gobi montre le stade atteint par le profil', () => {
  it('un Gobi au stade « crête » ne s’affiche pas en œuf', async () => {
    api.lireMonde.mockResolvedValue({ carte: { regions: [], ouvertesEnParallele: 1 },
      gobi: { stade: 'crete', formes: [], formeActive: null }, compagnons: [], campement: [], cascade });
    monter();
    await waitFor(() => expect(document.querySelector('[data-stade-gobi]')
      ?.getAttribute('data-stade-gobi')).toBe('crete'));
    expect(document.querySelector('[data-dessin-gobi-raster]')
      ?.getAttribute('data-dessin-gobi-raster')).toBe('assets/gobi/stades/stade-5.webp');
  });
});
