import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { GainCascade } from '@pierre/partage';
import { ETAT_CASCADE_VIDE } from '@pierre/partage/recompenses';
import { CascadeRecompense } from '@client/composants/CascadeRecompense';

afterEach(cleanup);
it('ouvre chaque gain, agrandit sa vraie illustration et referme sans modifier les récompenses', () => {
  const gain: GainCascade = { etat: ETAT_CASCADE_VIDE, jauges: [], paliersFranchis: [], recompenses: [
    { palier: 'etoile', nature: 'etoile', reference: null, asset: null, region: null },
    { palier: 'intermediaire', nature: 'forme-gobi', reference: null, asset: null, region: null },
    { palier: 'rare', nature: 'zone-recoloriee', reference: null, asset: null, region: null },
    { palier: 'intermediaire', nature: 'forme-gobi', reference: 'er', asset: 'assets/coffre/formes/er.png', region: null }
  ] };
  const avant = structuredClone(gain);
  const { rerender } = render(<CascadeRecompense gain={gain} />);
  for (const nom of ['Une étoile de plus !', 'Tu as franchi un palier !', 'Tu as atteint un grand palier !', /Gobi reçoit la forme/u]) {
    const bouton = screen.getByRole('button', { name: nom });
    fireEvent.click(bouton);
    const fenetre = screen.getByRole('dialog');
    expect(within(fenetre).getByRole('heading').textContent).toMatch(nom);
    if (nom instanceof RegExp) expect(within(fenetre).getByRole('img').getAttribute('src')).toContain('er.png');
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(gain).toEqual(avant);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Une étoile de plus !' }));
  rerender(<CascadeRecompense gain={null} />);
  expect(screen.queryByRole('dialog')).toBeNull();
});
