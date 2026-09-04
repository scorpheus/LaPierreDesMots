import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FicheObjet } from '../../client/src/monde/FicheObjet.js';

describe('fiche de collection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('donne le focus à la sortie sans faire défiler le contenu hors du titre', () => {
    const focus = vi.spyOn(HTMLButtonElement.prototype, 'focus');
    render(
      <FicheObjet
        marqueRacine={{ 'data-fiche-coffre': 'eclat' }}
        libelleAria="Éclat, pas encore gagné"
        titre="La Clairière"
        obtenu={false}
        couleurRevelee={false}
        phrase="Termine cette région pour gagner son Éclat."
        visuel={<svg aria-hidden="true" />}
        surFermer={() => undefined}
      />,
    );

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.querySelector('[data-fiche-objet="oui"] h2')?.textContent).toBe('La Clairière');
  });
});
