/**
 * « ON N'ARRIVE PAS À DÉPLACER » — R16, et ce n'était pas un défaut tactile.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * Le père, sur tablette : « Range dans la grotte de gauche les mots avec la lettre B. En fait
 * sur la tablette, ça marche pas, on n'arrive pas à déplacer, on n'arrive pas à bien les mettre. »
 *
 * MESURÉ AVANT DE CONCLURE. `grep` sur `MoteurTri.tsx` — `onPointer`, `onTouch`, `onDrag`,
 * `draggable`, `dnd-kit` — ne rendait **aucune ligne**. Ce moteur n'a jamais été un glisser :
 * c'est un tap-puis-tap.
 *
 * Le défaut était donc d'AFFORDANCE, et il était double :
 *
 *   1. `data-saisi` existait dans le DOM et **rien ne le montrait**. L'enfant tapait un mot,
 *      l'écran ne bougeait pas, il concluait que le tap n'avait pas marché — et essayait de
 *      glisser ;
 *   2. rien ne disait le geste attendu, alors que le mot « range » de la consigne en promet un
 *      autre.
 *
 * ── CE QUE CE FICHIER GARDE, ET POURQUOI PAS UNE CAPTURE ──────────────────────────────────────
 * Une capture d'écran dirait « ça a changé », jamais « l'enfant sait quoi faire ». Les cas
 * ci-dessous vérifient la PROPRIÉTÉ : un élément en main se distingue des autres, la phrase
 * décrit le prochain geste et pas la règle générale, et les réceptacles s'annoncent quand ils
 * attendent quelque chose.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { moteurTri } from '@partage/moteurs/tri/moteur';
import { MoteurTri } from '@client/moteurs/tri/MoteurTri';
import type { ActionTri, EtatTri } from '@partage/moteurs/tri/types';
import type { Habillage } from '@pierre/partage';
import type { ServicesJeu } from '@client/moteurs/types';

import { contenuTri as contenu } from '../fixtures/moteurs/tri.js';
import { aleaDeTest, horlogeDeTest, lireJson, servicesDeTest } from '../configuration/preparation.js';

const habillage: Habillage = lireJson<Habillage>(
  'contenu/habillages/galeries/grottes.habillage.json'
);
const horloge = horlogeDeTest();
const alea = aleaDeTest();

function servicesJeuDeTest(): ServicesJeu {
  return {
    ...servicesDeTest(),
    haptique: { vibrer(): void {}, disponible: false },
    retour: {
      async depotCorrect(): Promise<void> {},
      async depotRefuse(): Promise<void> {},
      async palierFranchi(): Promise<void> {},
      reinitialiserSerie(): void {},
      animationsDesactivees: true
    }
  };
}
const services = servicesJeuDeTest();

function Harnais(): ReactElement {
  const [etat, fixerEtat] = useState<EtatTri>(() =>
    moteurTri.creerEtat({ contenu, habillage, alea, horloge })
  );
  const emettre = useCallback((action: ActionTri) => {
    fixerEtat((precedent) => moteurTri.reduire(precedent, action, { alea, horloge }));
  }, []);
  return (
    <MoteurTri
      contenu={contenu}
      habillage={habillage}
      etat={etat}
      emettre={emettre}
      services={services}
      animationsDesactivees
    />
  );
}

afterEach(() => {
  cleanup();
});

const premierElement = (racine: HTMLElement): HTMLElement =>
  racine.querySelector<HTMLElement>('[data-element]') as HTMLElement;

describe('R16 — l’enfant VOIT qu’il a quelque chose en main', () => {
  it('CONTRÔLE POSITIF — ce moteur ne propose AUCUN glisser, et c’est la prémisse', () => {
    // Si un glisser était ajouté un jour, tout ce fichier changerait de sens : il garde
    // l'affordance d'un tap-puis-tap, pas celle d'un déplacement.
    const { container } = render(<Harnais />);
    expect(container.querySelectorAll('[draggable="true"]')).toHaveLength(0);
    expect(premierElement(container).tagName).toBe('BUTTON');
  });

  it('LE DÉFAUT — un mot pris se distingue des autres', () => {
    const { container } = render(<Harnais />);
    const element = premierElement(container);
    expect(element.getAttribute('data-saisi')).toBe('non');
    const avant = element.getAttribute('style') ?? '';

    fireEvent.click(element);
    expect(element.getAttribute('data-saisi')).toBe('oui');
    expect(
      element.getAttribute('style') ?? '',
      'le mot est « en main » dans l’état et RIEN ne le montre : c’est le défaut exact que le ' +
        'père a rencontré — il a cru que son tap n’avait pas marché'
    ).not.toBe(avant);
  });

  it('la phrase décrit LE PROCHAIN GESTE, pas la règle générale', () => {
    const { container } = render(<Harnais />);
    const phrase = (): Element | null => container.querySelector('[data-consigne-geste]');

    expect(phrase()?.getAttribute('data-consigne-geste')).toBe('choisir');
    expect(phrase()?.textContent).toMatch(/touche un mot/iu);

    fireEvent.click(premierElement(container));
    expect(phrase()?.getAttribute('data-consigne-geste')).toBe('deposer');
    expect(phrase()?.textContent, 'la phrase n’a pas suivi le geste').toMatch(/où il va/iu);
  });

  it('les réceptacles s’annoncent quand ils attendent quelque chose, et pas avant', () => {
    const { container } = render(<Harnais />);
    const receptacle = (): Element =>
      container.querySelector('[data-receptacle]') as Element;

    expect(receptacle().getAttribute('data-attend')).toBe('non');
    fireEvent.click(premierElement(container));
    expect(receptacle().getAttribute('data-attend')).toBe('oui');
  });

  it('la phrase est annoncée aux lecteurs d’écran — l’affordance visuelle a son équivalent', () => {
    // Le contour jaune ne dit rien à qui n'y voit pas. `aria-live` porte la même information.
    const { container } = render(<Harnais />);
    const phrase = container.querySelector('[data-consigne-geste]');
    expect(phrase?.getAttribute('aria-live')).toBe('polite');
    expect(phrase?.getAttribute('role')).toBe('status');
  });

  it('un mot rangé reste visible — un acquis ne se reprend jamais (R14)', () => {
    // Il se calme, il ne disparaît pas. Un élément qui s'efface donnerait le sentiment d'avoir
    // perdu quelque chose, et c'est le contraire de ce que le jeu promet.
    const { container } = render(<Harnais />);
    fireEvent.click(premierElement(container));
    fireEvent.click(container.querySelector('[data-receptacle]') as Element);
    const range = container.querySelector('[data-element][data-range]:not([data-range="non"])');
    if (range !== null) {
      expect(range.getAttribute('style') ?? '').toContain('opacity');
      expect(range.isConnected, 'l’élément rangé a disparu de l’écran').toBe(true);
    }
  });
});
