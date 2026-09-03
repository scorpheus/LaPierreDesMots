import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MurDesNoms } from '@client/monde/MurDesNoms';
import { FournisseurJeu } from '@client/etat/services';
import { creerMagasin } from '@client/etat/magasin';
import { servicesDeTest } from '../configuration/preparation.js';

function monter(): void {
  const services = servicesDeTest();
  render(
    <FournisseurJeu valeur={{ services, magasin: creerMagasin(services) }}>
      <MurDesNoms
        noms={[
          { texte: 'ou', libelle: 'Gobi-OU', obtenuLe: '2026-09-01T08:00:00Z' },
          { texte: 'ch', libelle: 'Gobi-CH', obtenuLe: '2026-09-01T08:00:00Z' }
        ]}
      />
    </FournisseurJeu>
  );
}

afterEach(() => cleanup());

describe('MurDesNoms', () => {
  it('explique quoi faire avant le premier choix', () => {
    monter();
    expect(screen.getByText('Touche un nom pour l’ouvrir dans ton carnet.')).toBeDefined();
  });

  it('affiche le nom choisi dans le carnet sans dépendre de la sortie audio', () => {
    monter();
    fireEvent.click(screen.getByRole('button', { name: 'Réécouter Gobi-CH' }));

    expect(screen.getByText('Tu as rencontré « ch ». Ce nom est gravé sur ton mur.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Réécouter Gobi-CH' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
  });
});
