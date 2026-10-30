/**
 * T10 — LE REPÈRE D'ÉTAPE COMMUN (`client/src/activite/RepereEtape.tsx`).
 *
 * Retour du parent (Docs/tableau-retours.md, T10, E03, E05, E06) : un seul style (celui de
 * E03, fond jaune), toujours en haut sous la consigne, et un signal NET quand l'étape change —
 * sans jamais animer le texte (« le décor s'agite, le texte jamais »).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { FournisseurRepereEtape, RepereEtape } from '../../client/src/activite/RepereEtape.js';
import { RACINE_DEPOT } from '../configuration/preparation.js';

afterEach(cleanup);

const repere = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-repere-etape]');

describe('RepereEtape', () => {
  it('dit « Étape n sur N » et la cible de l’étape, dans un seul cadre', () => {
    render(<RepereEtape moteur="attrape" rang={1} total={4} detail="bleu" animationsDesactivees={false} />);
    expect(repere()?.textContent).toContain('Étape 1 sur 4');
    expect(repere()?.textContent).toContain('bleu');
    expect(repere()?.getAttribute('data-repere-etape')).toBe('attrape');
    expect(repere()?.getAttribute('data-etape-rang')).toBe('1');
    expect(repere()?.getAttribute('data-etape-total')).toBe('4');
    expect(repere()?.getAttribute('aria-live')).toBe('polite');
  });

  it('une cible à déchiffrer prend le style de lecture (detailALire)', () => {
    render(<RepereEtape moteur="attrape" rang={1} total={4} detail="bleu" detailALire animationsDesactivees={false} />);
    expect(repere()?.querySelector('.repere-etape__detail--lecture')?.textContent).toBe('bleu');
  });

  it('une seule étape : pas de « Étape 1 sur 1 », la cible seule si elle existe', () => {
    const { rerender } = render(<RepereEtape moteur="grave" rang={1} total={1} detail="chat" animationsDesactivees={false} />);
    expect(repere()?.textContent).not.toContain('Étape');
    expect(repere()?.textContent).toContain('chat');
    rerender(<RepereEtape moteur="grave" rang={1} total={1} animationsDesactivees={false} />);
    expect(repere()).toBeNull();
  });

  it('`afficherRang={false}` retire le rang même avec plusieurs étapes (étapes non contraignantes)', () => {
    render(<RepereEtape moteur="tri" rang={1} total={2} afficherRang={false} animationsDesactivees={false} />);
    expect(repere()).toBeNull();
  });

  it('à l’ouverture, aucun signal : on ne signale qu’un CHANGEMENT', () => {
    render(<RepereEtape moteur="phrase" rang={1} total={2} animationsDesactivees={false} />);
    expect(repere()?.getAttribute('data-nouvelle-etape')).toBe('non');
    expect(repere()?.getAttribute('data-signal')).toBe('');
  });

  it('quand l’étape change : signal posé, relancé à chaque changement, éteint au toucher suivant', () => {
    const { rerender } = render(<RepereEtape moteur="phrase" rang={1} total={3} animationsDesactivees={false} />);
    rerender(<RepereEtape moteur="phrase" rang={2} total={3} animationsDesactivees={false} />);
    expect(repere()?.getAttribute('data-nouvelle-etape')).toBe('oui');
    const premier = repere()?.getAttribute('data-signal');
    expect(premier).toMatch(/^(a|b)$/);

    rerender(<RepereEtape moteur="phrase" rang={3} total={3} animationsDesactivees={false} />);
    // Deux noms d'animation alternés : c'est ce qui RELANCE l'animation CSS à chaque étape.
    expect(repere()?.getAttribute('data-signal')).not.toBe(premier);

    act(() => { fireEvent.pointerDown(document.body); });
    expect(repere()?.getAttribute('data-nouvelle-etape')).toBe('non');
  });

  it('animations désactivées : le signal reste (un état), l’animation est déclarée calme', () => {
    const { rerender } = render(<RepereEtape moteur="phrase" rang={1} total={2} animationsDesactivees />);
    rerender(<RepereEtape moteur="phrase" rang={2} total={2} animationsDesactivees />);
    expect(repere()?.getAttribute('data-nouvelle-etape')).toBe('oui');
    expect(repere()?.getAttribute('data-animations')).toBe('calmes');
  });

  it('sans barre de consigne (moteur monté seul), le repère se rend sur place', () => {
    const { container } = render(<div data-ici><RepereEtape moteur="place" rang={1} total={3} animationsDesactivees /></div>);
    expect(container.querySelector('[data-ici] [data-repere-etape]')).not.toBeNull();
  });

  it('avec une fente fournie par l’écran, le repère s’y rend, et nulle part ailleurs', () => {
    function Ecran(): ReactElement {
      const [fente, fixerFente] = useState<HTMLElement | null>(null);
      return (
        <>
          <header><p>Consigne</p><div data-fente ref={fixerFente} /></header>
          <section data-scene>
            <FournisseurRepereEtape fente={fente}>
              <RepereEtape moteur="place" rang={2} total={3} animationsDesactivees />
            </FournisseurRepereEtape>
          </section>
        </>
      );
    }
    const { container } = render(<Ecran />);
    expect(container.querySelector('[data-fente] [data-repere-etape]')).not.toBeNull();
    expect(container.querySelector('[data-scene] [data-repere-etape]')).toBeNull();
  });
});

describe('RepereEtape — dansLaBarre={false}', () => {
  it('un compteur qui n’est pas une étape (paires) reste où le moteur le rend, même avec une fente', () => {
    function Ecran(): ReactElement {
      const [fente, fixerFente] = useState<HTMLElement | null>(null);
      return (
        <>
          <header><div data-fente ref={fixerFente} /></header>
          <section data-scene>
            <FournisseurRepereEtape fente={fente}>
              <RepereEtape moteur="paires" rang={1} total={3} afficherRang={false} dansLaBarre={false}
                detail="0 / 6 paires" animationsDesactivees />
            </FournisseurRepereEtape>
          </section>
        </>
      );
    }
    const { container } = render(<Ecran />);
    expect(container.querySelector('[data-scene] [data-repere-etape="paires"]')?.textContent).toBe('0 / 6 paires');
    expect(container.querySelector('[data-fente] [data-repere-etape]')).toBeNull();
  });
});

describe('etape.css — le texte ne s’anime jamais', () => {
  const css = readFileSync(join(RACINE_DEPOT, 'client/src/activite/etape.css'), 'utf8');

  it('reprend le style de E03 : bordure de trait, fond jaune (soleil 28 %), police d’interface', () => {
    const bloc = /\.repere-etape\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(bloc).toMatch(/border:\s*2px solid var\(--trait\)/);
    expect(bloc).toMatch(/var\(--soleil[^)]*\)\s*28%/);
    expect(bloc).toMatch(/font-family:\s*var\(--font-interface\)/);
    expect(bloc).toMatch(/font-size:\s*var\(--socle-texte-interface\)/);
  });

  it('les images-clés n’animent que le cadre (ombre, fond), jamais transform, opacité ou police', () => {
    const images = [...css.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]*\{[^}]*\})*)[^{}]*\}/g)].map((m) => m[1] ?? '');
    expect(images.length).toBeGreaterThanOrEqual(2);
    for (const corps of images) {
      expect(corps).not.toMatch(/transform|opacity|font|letter-spacing|color:/);
      expect(corps).toMatch(/box-shadow|background/);
    }
  });

  it('l’animation n’existe que sous « prefers-reduced-motion: no-preference » et pour data-animations="vives"', () => {
    const horsMedia = css.replace(/@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g, '');
    expect(horsMedia).not.toMatch(/animation\s*:/);
    expect(css).toMatch(/\[data-animations='vives'\]/);
  });
});
