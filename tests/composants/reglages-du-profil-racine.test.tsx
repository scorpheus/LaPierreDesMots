/**
 * LA POLICE DU PROFIL ATTEINT LES MOTEURS — `--lecture-famille` posée à la racine.
 *
 * Constat du 30 oct. 2026 : les feuilles des moteurs (phrase, tri, assemble, chrono, éclair,
 * grave…) écrivent `font-family: var(--lecture-famille, var(--font-lecture))`. Or seule
 * `ZoneDeLecture` posait cette variable, sur son propre élément ; la racine gardait la valeur
 * de `polices.css` (Andika). Le parent choisissait OpenDyslexic, et les mots à glisser restaient
 * en Andika. Le fournisseur pose désormais la famille à la racine, avec les autres variables.
 */
import { cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REGLAGES_PAR_DEFAUT } from '@pierre/partage/lecture';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { familleDe } from '@client/lecture/polices';
import { FournisseurReglagesDuProfil } from '@client/lecture/reglages-du-profil';

import { servicesDeTest } from '../configuration/preparation.js';
import { profilDeTest } from './donnees-ecrans.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FournisseurReglagesDuProfil — variables de la racine', () => {
  it('pose la famille de la police du profil sur la racine, pour tous les moteurs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ ...REGLAGES_PAR_DEFAUT, police: 'opendyslexic' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const services = servicesDeTest();
    const magasin = creerMagasin(services);
    magasin.getState().choisirProfil(profilDeTest());

    const { unmount } = render(
      <QueryClientProvider client={client}>
        <FournisseurJeu valeur={{ services, magasin }}>
          <FournisseurReglagesDuProfil>
            <p>texte</p>
          </FournisseurReglagesDuProfil>
        </FournisseurJeu>
      </QueryClientProvider>,
    );

    const racine = document.documentElement;
    await waitFor(() => {
      expect(racine.style.getPropertyValue('--lecture-famille')).toBe(familleDe('opendyslexic'));
    });

    // Démonté, la racine retombe sur la feuille (`polices.css`) : rien ne survit à la loi.
    unmount();
    expect(racine.style.getPropertyValue('--lecture-famille')).toBe('');
  });
});
