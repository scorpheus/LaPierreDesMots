import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Compagnon as CompagnonDuMonde } from '@pierre/partage';
import { Compagnon } from '@client/composants/Compagnon';

const compagnon: CompagnonDuMonde = {
  code: 'filou',
  libelle: 'Filou',
  valeur: 'La malice',
  domaine: 'Mots outils',
  region: 'clairiere',
  asset: 'assets/compagnons/filou.png',
  rallieLe: '2026-09-01T08:00:00.000Z'
};

describe('portrait canonique des compagnons', () => {
  it('ne masque jamais le portrait validé derrière un ancien atlas', () => {
    const { container } = render(<Compagnon compagnon={compagnon} />);
    const portrait = container.querySelector('.compagnon-sprite') as HTMLElement;

    expect(portrait.classList.contains('compagnon-sprite--atlas')).toBe(false);
    expect(portrait.style.backgroundImage).toBe('');
    expect(portrait.querySelector('img')?.getAttribute('src'))
      .toContain('assets/compagnons/filou.png');
    expect(getComputedStyle(portrait.querySelector('img')!).visibility).not.toBe('hidden');
  });
});
