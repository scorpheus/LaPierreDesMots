/**
 * T11 — le module commun du glisser refuse d'être mal branché.
 *
 * Le défaut mesuré (bac-a-sable/socle-etape/gestes3-diagnostic.spec.ts) : `phrase`, `assemble`
 * et `chrono` appelaient `useCibleDeDepot` dans le corps du moteur, donc AU-DESSUS du
 * `DndContext` qu'ils rendent. La cible s'inscrivait auprès d'un contexte vide : le mot volait
 * sous le doigt mais aucun dépôt n'arrivait jamais. happy-dom ne mesure aucune boîte, donc la
 * preuve du geste lui-même est en e2e (`tests/e2e/parcours-glisser-et-toucher.spec.ts`) ; ici,
 * on garde la cause : un branchement hors zone doit casser tout de suite, pas en silence.
 */
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CibleDeDepot, ZoneDeGlisser, useCibleDeDepot, useJetonGlissable } from '../../client/src/moteurs/commun/glisser.js';

function CibleHorsZone(): ReactElement {
  const cible = useCibleDeDepot('ligne');
  return <div ref={cible.brancher} />;
}

function JetonHorsZone(): ReactElement {
  const jeton = useJetonGlissable('mot');
  return <button type="button" ref={jeton.brancher}>mot</button>;
}

describe('glisser commun', () => {
  it('une cible de dépôt hors de ZoneDeGlisser casse au rendu, avec la raison', () => {
    const muet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<CibleHorsZone />)).toThrow(/ZoneDeGlisser/);
    muet.mockRestore();
  });

  it('un jeton hors de ZoneDeGlisser casse au rendu, avec la raison', () => {
    const muet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<JetonHorsZone />)).toThrow(/ZoneDeGlisser/);
    muet.mockRestore();
  });

  it('CibleDeDepot, rendu DANS la zone, branche son élément', () => {
    const { container } = render(
      <ZoneDeGlisser surDepot={() => undefined}>
        <CibleDeDepot id="ligne">
          {(cible) => <div ref={cible.brancher} data-survolee={cible.survolee ? 'oui' : 'non'} data-cible="ligne" />}
        </CibleDeDepot>
      </ZoneDeGlisser>,
    );
    expect(container.querySelector('[data-cible="ligne"]')?.getAttribute('data-survolee')).toBe('non');
  });
});
