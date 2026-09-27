import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CATALOGUE_MATHS, type EtatMaths, type PortApiMaths } from '@pierre/partage/mathematiques';
import { CollectionMaths } from '@client/mathematiques/CollectionMaths';

const etat = (cadeauId: string[] = []): EtatMaths => ({
  generationMaths: 0,
  preferencesNiveaux: Object.fromEntries(CATALOGUE_MATHS.map((famille) =>
    [famille.id, { niveau: 'decouverte', revision: 0 }])) as EtatMaths['preferencesNiveaux'],
  reprise: null, projetSuspendu: null, progression: [], projets: [], tentatives: [],
  recompenses: cadeauId.map((id) => ({
    cadeauId: id, projetId: id.includes('objet') ? 'MAT-PON-P03' : id.includes('fete') ? 'MAT-FET-P01' : 'MAT-PON-P01',
    categorie: id.includes('objet') ? 'objet' : id.includes('fete') ? 'fete' : 'souvenir',
    attribueLe: '2026-09-26T00:00:00.000Z',
  })),
});

function monter(options: {
  readonly cadeaux?: string[];
  readonly emplacement?: 'coffre' | 'campement';
  readonly api?: Pick<PortApiMaths, 'lireEtat'>;
} = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const api = options.api ?? { lireEtat: vi.fn(async () => ({ ok: true, valeur: etat(options.cadeaux) })) };
  render(<QueryClientProvider client={client}><CollectionMaths profilId="profil-collection" api={api}
    emplacement={options.emplacement ?? 'coffre'} /></QueryClientProvider>);
  return { api, client };
}

afterEach(() => cleanup());

describe('CollectionMaths — gains conservés, jamais inventés', () => {
  it('montre treize emplacements distincts et ne crédite que les cadeaux lus', async () => {
    monter({ cadeaux: ['maths-souvenir-ponts', 'maths-objet-ponts'] });
    await waitFor(() => expect(screen.getByTestId('collection-maths-coffre').getAttribute('data-chargement')).toBe('termine'));
    expect(screen.getByText('Galet mesureur')).toBeTruthy();
    expect(screen.getByText('Planchette à repères')).toBeTruthy();
    expect(document.querySelectorAll('[data-collection-maths-piece]')).toHaveLength(13);
    expect(document.querySelector('[data-collection-maths-piece="maths-souvenir-ponts"]')?.getAttribute('data-obtenu')).toBe('oui');
    expect(document.querySelector('[data-collection-maths-piece="maths-objet-ponts"]')?.getAttribute('data-obtenu')).toBe('oui');
    expect(screen.queryByText(/MAT-PON-02/u)).toBeNull();
  });

  it('garde les objets maths dans la petite étagère, sans mélanger les souvenirs', async () => {
    monter({ emplacement: 'campement', cadeaux: ['maths-souvenir-ponts', 'maths-objet-ponts'] });
    await waitFor(() => expect(screen.getByTestId('collection-maths-campement').getAttribute('data-chargement')).toBe('termine'));
    expect(screen.getByText('Planchette à repères')).toBeTruthy();
    expect(screen.queryByText('Galet mesureur')).toBeNull();
    expect(document.querySelectorAll('[data-collection-maths-piece]')).toHaveLength(1);
  });

  it('conserve le dernier gain affiché si une actualisation échoue', async () => {
    const lireEtat = vi.fn()
      .mockResolvedValueOnce({ ok: true, valeur: etat(['maths-souvenir-ponts']) })
      .mockRejectedValueOnce(new Error('hors ligne'));
    const { client } = monter({ api: { lireEtat } });
    await screen.findByText('Galet mesureur');
    await client.invalidateQueries({ queryKey: ['mathematiques', 'profil-collection'] });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('reste visible'));
    expect(screen.getByText('Galet mesureur')).toBeTruthy();
  });

  it('ne montre jamais les gains du profil précédent si le nouveau carnet échoue', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const api: Pick<PortApiMaths, 'lireEtat'> = { lireEtat: vi.fn(async (profilId) => {
      if (profilId === 'alice') return { ok: true, valeur: etat(['maths-objet-ponts']) };
      throw new Error('stockage indisponible');
    }) };
    const vue = (profilId: string) => <QueryClientProvider client={client}>
      <CollectionMaths profilId={profilId} emplacement="campement" api={api} />
    </QueryClientProvider>;
    const rendu = render(vue('alice'));
    await screen.findByText('Planchette à repères');
    rendu.rerender(vue('bob'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('collection attend'));
    expect(screen.queryByText('Planchette à repères')).toBeNull();
    expect(document.querySelectorAll('[data-obtenu="oui"]')).toHaveLength(0);
    client.clear();
  });
});
