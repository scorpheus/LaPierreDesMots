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

describe('atlas animés des compagnons', () => {
  it('sert l’atlas normalisé et conserve une empreinte statique pour le repli', () => {
    const { container } = render(<Compagnon compagnon={compagnon} />);
    const portrait = container.querySelector('.compagnon-sprite--atlas') as HTMLElement;

    expect(portrait.style.backgroundImage).toContain('assets/compagnons/animations/filou-8.png');
    expect(portrait.querySelector('img')?.getAttribute('src'))
      .toContain('assets/compagnons/filou.png');
  });
});
