import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaquetNoeud } from '@pierre/partage';
import { EcranChaudron } from '@client/ecrans/EcranChaudron';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';
import { lireJson, servicesDeTest } from '../configuration/preparation.js';

const paquet = {
  noeud: lireJson('contenu/noeuds/galeries-12.json'),
  exercice: lireJson('contenu/exercices/galeries/paroi-libre-01.json'),
  habillage: lireJson('contenu/habillages/campement/chaudron.habillage.json'),
} as PaquetNoeud;

function monter(surRetour: () => void): void {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  const services = {
    ...base,
    haptique,
    retour: creerRetourSensoriel({
      audio: base.audio,
      haptique,
      animationsDesactivees: true,
      emettreParticules: () => undefined,
    }),
  };
  const magasin = creerMagasin(services);
  const file = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={file}>
      <FournisseurJeu valeur={{ services, magasin }}>
        <EcranChaudron paquet={paquet} surRetour={surRetour} />
      </FournisseurJeu>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe('activité libre du chaudron', () => {
  it('ne démarre pas un nœud pédagogique et ne montre pas de récompense', async () => {
    const surRetour = vi.fn();
    monter(surRetour);
    await waitFor(() => expect(screen.getByRole('button', { name: 'J’ai fini' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'J’ai fini' }));

    expect(surRetour).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-ecran="recompense"]')).toBeNull();
    expect(document.querySelector('[data-activite="libre"]')).not.toBeNull();
  });

  it('reste sur le chaudron tant que l’enfant ne choisit pas « J’ai fini »', async () => {
    const surRetour = vi.fn();
    monter(surRetour);
    await waitFor(() => expect(screen.getByRole('button', { name: 'J’ai fini' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'rouge' }));

    expect(surRetour).not.toHaveBeenCalled();
    expect(document.querySelector('[data-moteur="libre"]')).not.toBeNull();
  });
});
