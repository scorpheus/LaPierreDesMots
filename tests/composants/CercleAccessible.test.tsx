import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CercleAccessible } from '@client/composants/CercleAccessible';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('conserve 66 pixels CSS à la réduction, puis retrouve son rayon minimal à l’agrandissement', () => {
  let echelle = 0.25;
  const mesurer = vi.fn(() => ({ a: echelle, b: 0, c: 0, d: echelle }));
  let redimensionner = (): void => undefined;
  const debrancher = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(rappel: () => void) { redimensionner = rappel; }
    observe(): void { /* Le test pilote explicitement le changement de taille. */ }
    disconnect = debrancher;
  });
  const vue = render(<svg ref={(svg) => {
    if (svg !== null) Object.defineProperty(svg, 'getScreenCTM', { configurable: true, value: mesurer });
  }}><CercleAccessible rayonMinimal={48} cx={200} cy={200} role="button" aria-label="Zone" /></svg>);
  // La ref du parent est affectée après l'effet de l'enfant ; l'observateur représente ici
  // la première mesure réelle, absente du DOM sans moteur graphique.
  act(() => redimensionner());
  expect(vue.getByRole('button').getAttribute('r')).toBe('132');
  echelle = 2;
  act(() => redimensionner());
  expect(vue.getByRole('button').getAttribute('r')).toBe('48');
  vue.unmount();
  expect(debrancher).toHaveBeenCalledOnce();
});
