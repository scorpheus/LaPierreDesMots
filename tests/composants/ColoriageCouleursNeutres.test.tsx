import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SceneSvg } from '@client/moteurs/colorie/SceneSvg';
import type { CouleurColoriage, Habillage } from '@pierre/partage';

const habillage = JSON.parse(readFileSync('contenu/habillages/clairiere/ecole.habillage.json', 'utf8')) as Habillage;
afterEach(cleanup);
describe('la peinture neutre change aussi la luminosité du dessin', () => {
  it.each([
    ['noir', 'multiply'], ['blanc', 'screen'], ['gris', 'normal'], ['rouge', 'color'],
  ] as const)('la couleur %s utilise le mélange %s', (couleur: CouleurColoriage, melange) => {
    const { container } = render(<SceneSvg habillage={habillage} remplissages={{ tableau: couleur }}
      regionEnDemonstration={null} regionEnRefus={null} marqueRefus={0} animationsDesactivees
      svgMarkup='<g id="calque-fond"><image data-fond-illustre="ecole"/></g><g id="calque-zones"><path id="tableau" d="M0 0L80 0L80 80L0 80Z"/></g>'
      onPeindre={() => undefined} />);
    const region = container.querySelector<SVGElement>('[data-region-source="tableau"]');
    expect(region?.style.mixBlendMode).toBe(melange);
    expect(region?.getAttribute('data-couleur')).toBe(couleur);
  });
});
