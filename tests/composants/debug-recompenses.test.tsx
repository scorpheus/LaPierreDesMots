import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EcranDebugRecompenses } from '../../client/src/ecrans/EcranDebugRecompenses.js';
import { formesDuDocument } from '@pierre/partage/monde';
import documentGobi from '../../contenu/monde/gobi-stades.json' with { type: 'json' };

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});
describe('Prévisualisation locale des récompenses', () => {
  it('reste sous le contrat du dashboard et offre une vraie prise pour revenir au jeu', () => {
    const { container } = render(<EcranDebugRecompenses />);
    expect(container.querySelector('main')?.getAttribute('data-ecran')).toBe('dashboard');
    expect(screen.getByRole('link', { name: 'Retour au jeu' }).classList.contains('cible')).toBe(true);
  });

  it('ouvre les exemples par URL puis reprend les vrais gains de la simulation', () => {
    window.history.replaceState(null, '', '/debug/recompenses?exercices=49&cadeaux=1');
    render(<EcranDebugRecompenses exercicesInitiaux={49} />);
    expect(screen.getByRole('button', { name: /Gobi reçoit la forme.*er/u })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+1 nouvel exercice réussi' }));
    expect(screen.getByText('50 nouveaux exercices réussis simulés.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tu as franchi un palier !' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Gobi reçoit la forme/u }));
    const image = within(screen.getByRole('dialog')).getByRole('img');
    expect(formesDuDocument(documentGobi).some((forme) => image.getAttribute('src')?.endsWith(forme.cristal))).toBe(true);
    expect(screen.getByText('50 nouveaux exercices réussis simulés.')).toBeTruthy();
  });

  it('montre les quatre cadeaux sans changer le compteur et ouvre la vraie forme', () => {
    render(<EcranDebugRecompenses exercicesInitiaux={49} />);
    fireEvent.click(screen.getByRole('button', { name: 'Voir toutes les récompenses' }));
    expect(screen.getByText('49 nouveaux exercices réussis simulés.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Une étoile de plus !' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tu as franchi un palier !' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tu as atteint un grand palier !' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Gobi reçoit la forme.*er/u }));
    const fenetre = screen.getByRole('dialog');
    expect(within(fenetre).getByRole('img').getAttribute('src')).toContain('assets/coffre/formes/er.png');
    expect(screen.getByText('49 nouveaux exercices réussis simulés.')).toBeTruthy();
  });

  it('avance chaque réussite et garde les compteurs lors du rejeu', () => {
    render(<EcranDebugRecompenses exercicesInitiaux={23} />);
    expect(screen.getByText(/Encore 27 nouveaux exercices réussis avant le grand palier/u)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+1 nouvel exercice réussi' }));
    expect(screen.getByText(/Encore 26 nouveaux exercices réussis avant le grand palier/u)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer un exercice déjà acquis' }));
    expect(screen.getByText(/Encore 26 nouveaux exercices réussis avant le grand palier/u)).toBeTruthy();
    expect(screen.getByText(/24 nouveaux exercices réussis simulés/u)).toBeTruthy();
  });
});
