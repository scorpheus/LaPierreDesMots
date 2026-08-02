/**
 * Le nom d'une région, au survol ET au maintien — lot N7, contrat de finition v3 § 4.7.
 *
 * ── CE QUE CE FICHIER PROUVE, ET QU'UN TEST DE SURVOL SEUL NE PROUVERAIT PAS ────────────────
 * Le jeu se joue au doigt sur une tablette. **Un doigt ne survole rien.** Un composant testé
 * au seul `pointerenter` de souris passerait au vert et ne montrerait jamais un nom à
 * l'enfant. Les trois cas qui comptent ici sont donc :
 *
 *   • le MAINTIEN révèle le nom, après le délai et pas avant ;
 *   • un TAP FRANC ne le révèle pas — sinon toute la carte clignoterait ;
 *   • le maintien N'AVALE PAS le tap : le `click` de la prise part quand même.
 *
 * Le dernier est le plus important. Une prise qui cesserait de répondre parce que le doigt a
 * traîné serait un état sans issue, et c'est le pire défaut possible sur une application
 * d'enfant (CLAUDE.md).
 * ───────────────────────────────────────────────────────────────────────────────────────────
 *
 * Le temps est simulé par les minuteries factices de Vitest — jamais par une attente réelle.
 * « Ne jamais introduire d'attente arbitraire : attendre un état, jamais une durée. »
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  DELAI_APRES_MAINTIEN_MS,
  DELAI_MAINTIEN_MS,
  NomDeRegion,
  RAYON_PRISE_VIEWBOX,
} from '@client/monde/NomDeRegion.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers();
});

/** Rend le composant dans un `<svg>`, comme la carte et le campement le font. */
function poser(props: Partial<Parameters<typeof NomDeRegion>[0]> = {}): HTMLElement {
  const { container } = render(
    <svg viewBox="0 0 1200 800">
      <NomDeRegion nom="La Clairière" x={190} y={640} {...props}>
        <circle data-prise-region="clairiere" cx={190} cy={640} r={20} />
      </NomDeRegion>
    </svg>
  );
  return container.querySelector('[data-nom-region]') as unknown as HTMLElement;
}

/**
 * Fait avancer le temps SIMULÉ, dans un `act` — sans lui, React 19 diffère le rendu
 * déclenché par la minuterie et le DOM reste celui d'avant l'échéance.
 * Jamais d'attente réelle : on avance une horloge, on ne dort pas.
 */
function avancer(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const etiquette = (): Element | null => document.querySelector('[data-etiquette="nom-region"]');

describe('NomDeRegion — au repos, aucun nom', () => {
  test('rien n’est affiché tant que rien n’est demandé', () => {
    const groupe = poser();
    expect(groupe.getAttribute('data-nom-visible')).toBe('non');
    expect(etiquette()).toBeNull();
    // Le nom n'est pas seulement caché : il n'est PAS dans le DOM. Un nom masqué en CSS
    // resterait lu par un lecteur d'écran et compté par les tests d'accessibilité.
    expect(screen.queryByText('La Clairière')).toBeNull();
  });

  test('la prise tactile existe, et elle est bien sous les enfants', () => {
    const groupe = poser();
    const enfants = [...groupe.children];
    expect(enfants[0]?.getAttribute('data-prise')).toBe('nom-region');
    expect(enfants[1]?.getAttribute('data-prise-region')).toBe('clairiere');
  });

  test('le rayon par défaut tient largement la règle des 64 px (R16)', () => {
    // Mesure, pas affirmation. La carte est un `viewBox` de 1200 × 800 rendu dans les 1920 px
    // de large de la Galaxy Tab S10 FE : l'échelle vaut 1920 / 1200 = 1,6.
    const echelle = 1920 / 1200;
    const diametreCssPx = RAYON_PRISE_VIEWBOX * 2 * echelle;
    expect(diametreCssPx).toBeGreaterThanOrEqual(64);
  });
});

describe('NomDeRegion — le MAINTIEN, le geste de la tablette', () => {
  test('le nom apparaît après le délai de maintien, et pas avant', () => {
    const groupe = poser();
    fireEvent.pointerDown(groupe, { pointerType: 'touch' });

    // Juste avant l'échéance : toujours rien. Sans ce demi-cas, un composant qui révèle
    // immédiatement passerait le cas suivant.
    avancer(DELAI_MAINTIEN_MS - 1);
    expect(groupe.getAttribute('data-nom-visible')).toBe('non');

    avancer(1);
    expect(groupe.getAttribute('data-nom-visible')).toBe('oui');
    expect(screen.getByText('La Clairière')).toBeTruthy();
  });

  test('un TAP FRANC ne révèle rien — sinon la carte clignoterait à chaque entrée', () => {
    const groupe = poser();
    fireEvent.pointerDown(groupe, { pointerType: 'touch' });
    avancer(120); // un tap d'enfant de 7 ans
    fireEvent.pointerUp(groupe, { pointerType: 'touch' });

    avancer(DELAI_MAINTIEN_MS * 4);
    expect(groupe.getAttribute('data-nom-visible')).toBe('non');
  });

  test('après le relâchement, le nom reste le temps d’être lu, puis s’efface', () => {
    const groupe = poser();
    fireEvent.pointerDown(groupe, { pointerType: 'touch' });
    avancer(DELAI_MAINTIEN_MS);
    fireEvent.pointerUp(groupe, { pointerType: 'touch' });

    // Sur tablette, `pointerleave` n'arrive pas quand le doigt se lève : sans ce délai, soit
    // le nom resterait pour toujours, soit il disparaîtrait avant d'être lu.
    expect(groupe.getAttribute('data-nom-visible')).toBe('oui');
    avancer(DELAI_APRES_MAINTIEN_MS - 1);
    expect(groupe.getAttribute('data-nom-visible')).toBe('oui');
    avancer(1);
    expect(groupe.getAttribute('data-nom-visible')).toBe('non');
  });

  test('LE MAINTIEN N’AVALE PAS LE TAP — la prise répond toujours', () => {
    // Le cas qui compte le plus. Une prise qui cesserait de répondre parce que l'enfant a
    // maintenu serait un état sans issue.
    const taps: number[] = [];
    render(
      <svg viewBox="0 0 1200 800">
        <NomDeRegion nom="La Clairière" x={190} y={640}>
          <circle
            data-prise-region="clairiere"
            cx={190}
            cy={640}
            r={20}
            onClick={() => taps.push(1)}
          />
        </NomDeRegion>
      </svg>
    );
    const prise = document.querySelector('[data-prise-region="clairiere"]')!;
    const groupe = document.querySelector('[data-nom-region]')!;

    fireEvent.pointerDown(groupe, { pointerType: 'touch' });
    avancer(DELAI_MAINTIEN_MS + 200);
    fireEvent.pointerUp(groupe, { pointerType: 'touch' });
    fireEvent.click(prise);

    expect(groupe.getAttribute('data-nom-visible')).toBe('oui');
    expect(taps).toEqual([1]);
  });

  test('un pointeur annulé remet tout à zéro, sans laisser de minuterie derrière', () => {
    const groupe = poser();
    fireEvent.pointerDown(groupe, { pointerType: 'touch' });
    fireEvent.pointerCancel(groupe, { pointerType: 'touch' });
    avancer(DELAI_MAINTIEN_MS * 4);
    expect(groupe.getAttribute('data-nom-visible')).toBe('non');
  });
});

describe('NomDeRegion — le SURVOL, le geste du parent à la souris', () => {
  test('la souris révèle au survol, sans maintien', () => {
    const groupe = poser();
    fireEvent.pointerEnter(groupe, { pointerType: 'mouse' });
    expect(groupe.getAttribute('data-nom-visible')).toBe('oui');
    fireEvent.pointerLeave(groupe, { pointerType: 'mouse' });
    expect(groupe.getAttribute('data-nom-visible')).toBe('non');
  });

  test('le clic de souris ne relance PAS une minuterie de maintien', () => {
    // Sans la garde `pointerType === 'mouse'`, un clic maintenu ferait réapparaître
    // l'étiquette après le `pointerleave` — elle clignoterait.
    const groupe = poser();
    fireEvent.pointerDown(groupe, { pointerType: 'mouse' });
    fireEvent.pointerLeave(groupe, { pointerType: 'mouse' });
    avancer(DELAI_MAINTIEN_MS * 4);
    expect(groupe.getAttribute('data-nom-visible')).toBe('non');
  });

  test('le focus clavier révèle aussi — sinon le clavier serait le seul exclu', () => {
    const groupe = poser();
    fireEvent.focus(groupe);
    expect(groupe.getAttribute('data-nom-visible')).toBe('oui');
    fireEvent.blur(groupe);
    expect(groupe.getAttribute('data-nom-visible')).toBe('non');
  });
});

describe('NomDeRegion — les trois règles que le composant ne peut pas enfreindre', () => {
  test('l’étiquette n’intercepte pas le doigt', () => {
    const groupe = poser({ toujoursVisible: true });
    expect(groupe.getAttribute('data-nom-visible')).toBe('oui');
    expect((etiquette() as SVGGElement).style.pointerEvents).toBe('none');
  });

  test('AUCUNE animation, aucune transition — « le texte ne bouge jamais » (v2 § 9.3)', () => {
    poser({ toujoursVisible: true, detail: 'Il reste 40 % à rallumer' });
    // On énumère les OBJETS de l'étiquette, pas les occurrences du mot « animation ».
    for (const noeud of [etiquette()!, ...etiquette()!.querySelectorAll('*')]) {
      const style = (noeud as SVGElement).style;
      expect(style.animation, noeud.nodeName).toBeFalsy();
      expect(style.transition, noeud.nodeName).toBeFalsy();
      expect(noeud.getAttribute('class') ?? '').not.toMatch(/anim/u);
    }
  });

  test('l’étiquette est `aria-hidden` : le nom n’est pas annoncé deux fois', () => {
    poser({ toujoursVisible: true });
    expect(etiquette()!.getAttribute('aria-hidden')).toBe('true');
  });

  test('la seconde ligne s’affiche quand elle est fournie, et rien de plus sinon', () => {
    poser({ toujoursVisible: true, detail: 'Il reste 40 % à rallumer' });
    expect(screen.getByText('Il reste 40 % à rallumer')).toBeTruthy();
    cleanup();
    poser({ toujoursVisible: true });
    expect(etiquette()!.querySelectorAll('text')).toHaveLength(1);
  });
});
