/**
 * Loupe volontaire des coloriages : elle agrandit la scène sans jamais deviner la cible.
 * Ces tests sont volontairement isolés du moteur : ils vérifient le cadre et la traduction
 * du geste, pas une maquette de progression pédagogique.
 */
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CadreColoriage,
  LARGEUR_MINIMALE_LOUPE_PX,
  TAILLE_COMMANDE_LOUPE_PX
} from '@client/moteurs/colorie/CadreColoriage';
import { SceneSvg, SEUIL_DEFILEMENT_LOUPE_PX } from '@client/moteurs/colorie/SceneSvg';
import type { Habillage } from '@pierre/partage';

afterEach(cleanup);

const habillage = {
  id: 'essai.loupe-colorie',
  libelle: 'La scène de la loupe',
  scene: {
    viewBox: '0 0 200 100',
    calques: [{
      id: 'calque-zones', role: 'coloriable', regions: [{
        id: 'cible', libelle: 'la cible', centroide: [100, 50], surface: 2400
      }]
    }]
  },
  timings: { recolorationMs: 0 }
} as Habillage;

function SceneQuiSeSouvient(): React.ReactElement {
  const [consigne, fixerConsigne] = useState(1);
  const [remplissage, fixerRemplissage] = useState('vierge');
  return (
    <button type="button" onClick={() => { fixerConsigne(2); fixerRemplissage('rouge'); }}>
      {`consigne ${String(consigne)} — ${remplissage}`}
    </button>
  );
}

function ScenePourGestes({ loupe, peindre }: { readonly loupe: boolean; peindre: (region: string) => void }): React.ReactElement {
  return <SceneSvg
    habillage={habillage}
    remplissages={{}}
    regionEnDemonstration={null}
    regionEnRefus={null}
    marqueRefus={0}
    animationsDesactivees
    loupeActive={loupe}
    svgMarkup={null}
    onPeindre={peindre}
  />;
}

describe('CadreColoriage', () => {
  it('fixe les deux dimensions de confort demandées', () => {
    const { container } = render(<CadreColoriage enfants={() => <SceneQuiSeSouvient />} />);
    const styles = [...container.querySelectorAll('style')].map((style) => style.textContent).join('\n');

    expect(TAILLE_COMMANDE_LOUPE_PX).toBe(64);
    expect(LARGEUR_MINIMALE_LOUPE_PX).toBe(1280);
    expect(styles).toContain(`min-inline-size: ${String(TAILLE_COMMANDE_LOUPE_PX)}px`);
    expect(styles).toContain(`min-inline-size: ${String(LARGEUR_MINIMALE_LOUPE_PX)}px`);
  });

  it('bascule volontairement entre la vue entière et la vue agrandie, sans remonter de cible', () => {
    render(<CadreColoriage enfants={() => <SceneQuiSeSouvient />} />);

    const bascule = screen.getByRole('button', { name: 'Voir en grand' });
    expect(bascule.getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('[data-loupe-coloriage]')?.getAttribute('data-loupe')).toBe('non');

    fireEvent.click(bascule);
    expect(screen.getByRole('button', { name: 'Voir tout' }).getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-loupe-coloriage]')?.getAttribute('data-loupe')).toBe('oui');
    expect(document.querySelector('[data-loupe-fenetre]')?.getAttribute('data-defilement')).toBe('oui');
  });

  it('conserve l’état enfant pendant la bascule de confort', () => {
    render(<CadreColoriage enfants={() => <SceneQuiSeSouvient />} />);

    fireEvent.click(screen.getByRole('button', { name: 'consigne 1 — vierge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Voir en grand' }));

    expect(screen.getByRole('button', { name: 'consigne 2 — rouge' })).toBeTruthy();
  });
});

describe('SceneSvg en loupe', () => {
  function region(): SVGCircleElement {
    const trouvee = document.querySelector<SVGCircleElement>('[data-region-svg="cible"]');
    if (trouvee === null) throw new Error('région de repli absente');
    return trouvee;
  }

  it('attend le pointerup d’un tap resté à moins de 10 px avant de peindre', () => {
    const peindre = vi.fn();
    const { container } = render(<ScenePourGestes loupe peindre={peindre} />);
    const svg = container.querySelector('svg');
    if (svg === null) throw new Error('scène absente');

    fireEvent.pointerDown(region(), { pointerId: 1, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 107, clientY: 56 });
    expect(peindre).not.toHaveBeenCalled();
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 107, clientY: 56 });

    expect(peindre).toHaveBeenCalledOnce();
    expect(peindre).toHaveBeenCalledWith('cible');
  });

  it('laisse le geste de défilement intact dès 10 px de déplacement', () => {
    const peindre = vi.fn();
    const { container } = render(<ScenePourGestes loupe peindre={peindre} />);
    const svg = container.querySelector('svg');
    if (svg === null) throw new Error('scène absente');

    fireEvent.pointerDown(region(), { pointerId: 2, clientX: 100, clientY: 50 });
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 110, clientY: 50 });
    fireEvent.pointerUp(svg, { pointerId: 2, clientX: 110, clientY: 50 });

    expect(peindre).not.toHaveBeenCalled();
    expect(SEUIL_DEFILEMENT_LOUPE_PX).toBe(10);
  });

  it('ignore un pointercancel : aucun geste interrompu ne peint', () => {
    const peindre = vi.fn();
    const { container } = render(<ScenePourGestes loupe peindre={peindre} />);
    const svg = container.querySelector('svg');
    if (svg === null) throw new Error('scène absente');

    fireEvent.pointerDown(region(), { pointerId: 3, clientX: 100, clientY: 50 });
    fireEvent.pointerCancel(svg, { pointerId: 3, clientX: 100, clientY: 50 });
    fireEvent.pointerUp(svg, { pointerId: 3, clientX: 100, clientY: 50 });

    expect(peindre).not.toHaveBeenCalled();
  });
});
