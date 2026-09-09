import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EvolutionGobi } from '@client/composants/EvolutionGobi.js';

afterEach(cleanup);

describe('Évolution de Gobi — le dessin obtenu porte le stade annoncé', () => {
  it('montre des images différentes pour la première évolution et le Gardien', () => {
    const vue = render(
      <EvolutionGobi
        avant="oeuf"
        apres="fissure"
        libelle="La Lueur qui perce"
        animationsDesactivees
        surFin={() => undefined}
      />
    );

    // L'oracle porte sur l'image réellement chargée, pas sur data-stade-apres :
    // cet attribut annonçait déjà le bon stade avec un dessin identique pour tous.
    const imageFissure = vue.container.querySelector('[data-evolution-role="apres"] image');
    expect(imageFissure).not.toBeNull();
    const adresseFissure = imageFissure?.getAttribute('href');
    expect(adresseFissure).toBeTruthy();

    vue.rerender(
      <EvolutionGobi
        avant="veilleur"
        apres="gardien"
        libelle="Le Gardien"
        animationsDesactivees
        surFin={() => undefined}
      />
    );

    const imageGardien = vue.container.querySelector('[data-evolution-role="apres"] image');
    expect(imageGardien).not.toBeNull();
    const adresseGardien = imageGardien?.getAttribute('href');
    expect(adresseGardien).toBeTruthy();
    expect(adresseGardien).not.toBe(adresseFissure);
    expect(adresseFissure).toContain('assets/gobi/stades/stade-2.webp');
    expect(adresseGardien).toContain('assets/gobi/stades/stade-10.webp');
  });
});
