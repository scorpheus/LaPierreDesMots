/**
 * L'écran de remise à zéro — lot H2, points 1 et 2. Annexe T § T3.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER GARDE
 *
 * Une seule chose, et elle vaut tout le reste : **le bouton qui efface ne peut pas être
 * atteint par un tap distrait.** Le brief le pose comme condition — « c'est une action
 * irréversible sur les données d'un enfant, elle ne doit jamais se déclencher par un tap
 * distrait » — et une condition qu'aucun test ne mesure est une intention, pas une garantie.
 *
 * Le cas décisif compte les appels réseau après N interactions plausibles d'un parent pressé :
 * il doit valoir **zéro** tant que le prénom n'a pas été retapé.
 *
 * `client.js` est simulé, et c'est la seule façon d'observer ce compte : ce qui est vérifié
 * ici, c'est que le composant N'APPELLE PAS. Le serveur a sa propre garde, testée dans
 * `tests/api/parent-reinitialisation.test.ts` — les deux sont nécessaires, aucune ne remplace
 * l'autre.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactElement } from 'react';

const apercuAppels: unknown[][] = [];
const remiseAppels: unknown[][] = [];

vi.mock('@client/api/client', () => ({
  apercuReinitialisationProfil: (...arguments_: unknown[]) => {
    apercuAppels.push(arguments_);
    return Promise.resolve({
      profil: 'prf-1',
      prenom: 'Ezékiel',
      portee: arguments_[1],
      lignes: [
        { table: 'tentatives', lignesEffacees: 6 },
        { table: 'progression_noeud', lignesEffacees: 3 },
        { table: 'progression_region', lignesEffacees: 6 },
        { table: 'campement', lignesEffacees: 0 }
      ],
      pertes: ['toute la progression']
    });
  },
  reinitialiserProfilParent: (...arguments_: unknown[]) => {
    remiseAppels.push(arguments_);
    return Promise.resolve({
      profil: 'prf-1',
      prenom: 'Ezékiel',
      portee: arguments_[1],
      effectueLe: '2026-09-01T08:00:00Z',
      lignes: [{ table: 'tentatives', lignesEffacees: 6 }],
      lignesEffaceesTotal: 15,
      tablesConservees: ['essais_typographie', 'reglages_lecture']
    });
  }
}));

const { ReinitialiserProfil } = await import('@client/parent/ReinitialiserProfil');

function monter(): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <ReinitialiserProfil profil={'prf-1' as never} prenom="Ezékiel" />
    </QueryClientProvider>
  );
}

function bouton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /Effacer/u }) as HTMLButtonElement;
}

function champ(): HTMLInputElement {
  return screen.getByLabelText(/retape le prénom/u) as HTMLInputElement;
}

beforeEach(() => {
  apercuAppels.length = 0;
  remiseAppels.length = 0;
});

afterEach(cleanup);

describe('la confirmation qui nomme le profil', () => {
  it('LE TEST QUI GARDE LE RISQUE : aucun tap n’efface tant que le prénom n’est pas retapé', () => {
    render(monter());

    // Un parent pressé : il tape le bouton, choisit l'autre portée, retape, écrit « oui »,
    // retape encore. Cinq gestes plausibles, aucun n'est le geste demandé.
    fireEvent.click(bouton());
    fireEvent.click(screen.getByDisplayValue('complete'));
    fireEvent.click(bouton());
    fireEvent.change(champ(), { target: { value: 'oui' } });
    fireEvent.click(bouton());

    expect(remiseAppels, 'appels réseau d’effacement après cinq gestes').toHaveLength(0);
    expect(bouton().disabled).toBe(true);
  });

  it('le bouton s’active dès que le prénom correspond, accents et casse mis à part', () => {
    render(monter());
    expect(bouton().disabled).toBe(true);

    fireEvent.change(champ(), { target: { value: '  ezekiel ' } });
    expect(bouton().disabled).toBe(false);
  });

  it('et il efface alors, en portant la portée choisie et le prénom tapé', async () => {
    render(monter());

    fireEvent.click(screen.getByDisplayValue('complete'));
    fireEvent.change(champ(), { target: { value: 'Ezékiel' } });
    fireEvent.click(bouton());

    await waitFor(() => {
      expect(remiseAppels).toHaveLength(1);
    });
    expect(remiseAppels[0]?.[1]).toBe('complete');
    expect(remiseAppels[0]?.[2]).toBe('Ezékiel');
  });

  it('changer de portée EFFACE la confirmation déjà tapée', () => {
    render(monter());

    fireEvent.change(champ(), { target: { value: 'Ezékiel' } });
    expect(bouton().disabled).toBe(false);

    // Un prénom tapé pour « garder les réglages » ne doit pas valider « tout effacer ».
    fireEvent.click(screen.getByDisplayValue('complete'));
    expect(champ().value).toBe('');
    expect(bouton().disabled).toBe(true);
  });
});

describe('ce que le parent lit avant de trancher', () => {
  it('les deux portées sont proposées, et chacune dit ce qu’elle GARDE', () => {
    render(monter());

    const progression = screen.getByDisplayValue('progression').closest('label');
    const complete = screen.getByDisplayValue('complete').closest('label');

    expect(progression?.textContent).toContain('réglages de lecture');
    expect(complete?.textContent).toContain('prénom');
    // La portée complète ne promet PAS de garder les réglages : c'est toute la différence.
    expect(complete?.textContent).not.toContain('réglages de lecture');
  });

  it('l’aperçu chiffre ce qui sera effacé, et ne compte pas les tables déjà vides', async () => {
    render(monter());

    // 6 + 3 + 6 = 15 lignes, dans 3 tables — `campement` est à zéro et n'est pas comptée.
    await waitFor(() => {
      expect(screen.getByText(/15 enregistrements seront effacés/u)).toBeTruthy();
    });
    expect(screen.getByText(/dans 3 tables/u)).toBeTruthy();
  });

  it('l’aperçu est redemandé quand la portée change — jamais le compte de l’autre', async () => {
    render(monter());
    await waitFor(() => {
      expect(apercuAppels.length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByDisplayValue('complete'));
    await waitFor(() => {
      expect(apercuAppels.some((appel) => appel[1] === 'complete')).toBe(true);
    });
    expect(apercuAppels.some((appel) => appel[1] === 'progression')).toBe(true);
  });
});

describe('les cibles, R16', () => {
  it('le bouton d’effacement et le champ font au moins 64 px de haut', () => {
    render(monter());
    // `minBlockSize: '4rem'` = 64 px à la racine par défaut. On lit le style déclaré : happy-dom
    // ne fait pas de mise en page, mesurer un rectangle rendrait 0 et ne prouverait rien.
    expect(bouton().style.minBlockSize).toBe('4rem');
    expect(champ().style.minBlockSize).toBe('4rem');
  });
});
