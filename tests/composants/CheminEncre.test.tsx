/**
 * LE CHEMIN D'ENCRE ARRIVE-T-IL LÀ OÙ IL DIT ? — lot S4.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « … et le chemin qui se dessine à l'encre au fur et à mesure » (v2 § 9.4).
 *
 * Ce composant n'avait AUCUN test — mesuré : `grep -rl "CheminEncre\|data-chemin" tests/ client/src`
 * ne rendait que `client/src/monde/CheminEncre.tsx`, `client/src/ecrans/EcranCarte.tsx` et
 * `tests/visuel/carte.spec.ts`, où la seule assertion est `avancement > 0`. Un chemin qui
 * n'arrive nulle part passe ce test.
 *
 * ── LE DÉFAUT QUE CE FICHIER GARDE ────────────────────────────────────────────────────────────
 * Le composant recevait UN avancement — la moyenne des cinq régions — et le posait sur UN tracé
 * en `pathLength="1"`. La fraction se répartissait donc sur la longueur TOTALE, ce qui suppose
 * cinq routes de même longueur. Elles varient de ± 17,7 % (mesuré à 4000 pas,
 * `node bac-a-sable/s4-carte/mesurer-geometrie.mjs`) :
 *
 *   longueurs      321,4 · 308,0 · 396,3 · 343,3 · 315,1
 *   fin de route   0,191 · 0,374 · 0,609 · 0,813 · 1,000   ← où le marqueur se trouve
 *   encre posée    0,200 · 0,400 · 0,600 · 0,800 · 1,000   ← où l'encre s'arrêtait
 *   écart max      0,026 de la longueur totale, soit ≈ 44 unités — deux rayons de marqueur
 *
 * Les cas ci-dessous ne re-mesurent pas ces longueurs : ils vérifient que le calcul ne DÉPEND
 * PLUS d'elles. Une route pleine est pleine, une route vide est vide, quelle que soit sa taille.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { CheminEncre, tracerChemin, tracerRoute } from '@client/monde/CheminEncre.js';

import { lireTexte } from '../configuration/preparation.js';

afterEach(() => {
  cleanup();
});

/** Les six ancres de la carte, dans l'ordre de la progression — celles d'`EcranCarte`. */
const ETAPES: readonly (readonly [number, number])[] = [
  [190, 640],
  [450, 460],
  [240, 240],
  [620, 150],
  [900, 340],
  [1020, 630],
];

function poser(parts: readonly number[], animationsDesactivees = false): SVGGElement {
  const { container } = render(
    <svg viewBox="0 0 1200 800">
      <CheminEncre
        etapes={ETAPES}
        parts={parts}
        animationsDesactivees={animationsDesactivees}
      />
    </svg>
  );
  return container.querySelector('[data-chemin="encre"]') as unknown as SVGGElement;
}

/** Les parts encrées, route par route, telles que le DOM les porte. */
function partsRendues(chemin: SVGGElement): readonly string[] {
  return [...chemin.querySelectorAll('[data-chemin-route]')].map(
    (route) => route.getAttribute('data-chemin-part') ?? '?'
  );
}

describe('le chemin d’encre s’encre route par route, jamais en moyenne', () => {
  test('cinq ancres consécutives donnent CINQ routes, une par intervalle', () => {
    // Le contrôle négatif de tout le fichier : si le composant ne rendait qu'un tracé, les cas
    // suivants compareraient des listes vides et seraient verts sans rien prouver.
    expect(poser([0, 0, 0, 0, 0]).querySelectorAll('[data-chemin-route]')).toHaveLength(
      ETAPES.length - 1
    );
  });

  test('terminer la PREMIÈRE région remplit la première route, et elle seule', () => {
    // C'est la promesse exacte que l'écran affirmait et que le tracé unique ne tenait pas :
    // « terminer la Clairière pose l'encre jusqu'aux Galeries ».
    expect(partsRendues(poser([1, 0, 0, 0, 0]))).toEqual(['1.00', '0.00', '0.00', '0.00', '0.00']);
  });

  test('une route à demi rallumée est à demi encrée, INDÉPENDAMMENT de sa longueur', () => {
    // La troisième route est la plus longue (396,3 u contre 308,0 pour la deuxième). Avec un
    // tracé unique, la même valeur y produisait une encre plus longue ; ici les deux rendent
    // la même part, et c'est tout l'objet de la correction.
    const parts = partsRendues(poser([0, 0.5, 0.5, 0, 0]));
    expect(parts[1]).toBe('0.50');
    expect(parts[1]).toBe(parts[2]);
  });

  test('chaque route porte son `strokeDasharray` LOCAL, en `pathLength` 1', () => {
    const chemin = poser([1, 0.25, 0, 0, 0]);
    const routes = [...chemin.querySelectorAll('[data-chemin-route]')];
    expect(routes[0]?.getAttribute('stroke-dasharray')).toBe('1 1');
    expect(routes[1]?.getAttribute('stroke-dasharray')).toBe('0.25 1');
    for (const route of routes) {
      expect(route.getAttribute('pathLength')).toBe('1');
    }
  });

  test('une part absente, négative ou aberrante ne trace RIEN — jamais tout', () => {
    // Un chemin tracé par défaut mentirait sur une progression qui n'a pas eu lieu. Une part
    // manquante vaut donc 0, et non « pas d'information, donc on remplit ».
    expect(partsRendues(poser([]))).toEqual(['0.00', '0.00', '0.00', '0.00', '0.00']);
    expect(partsRendues(poser([-4, Number.NaN, 9, 0.3, 0]))).toEqual([
      '0.00',
      '0.00',
      '1.00',
      '0.30',
      '0.00',
    ]);
  });

  test('l’avancement d’ensemble reste lisible, et c’est une LECTURE des parts', () => {
    // `tests/visuel/carte.spec.ts` lit cette prise. Elle survit à la correction, mais elle est
    // désormais dérivée du dessin au lieu de le commander : les deux ne peuvent plus diverger.
    const chemin = poser([1, 1, 0, 0, 0]);
    expect(chemin.getAttribute('data-chemin-avancement')).toBe('0.40');
    expect(chemin.getAttribute('data-chemin-routes')).toBe('1.00 1.00 0.00 0.00 0.00');
  });

  test('moins de deux étapes ne dessinent rien plutôt qu’un trait sans destination', () => {
    const { container } = render(
      <svg viewBox="0 0 1200 800">
        <CheminEncre etapes={[[190, 640]]} parts={[1]} />
      </svg>
    );
    expect(container.querySelector('[data-chemin="encre"]')).toBeNull();
  });
});

describe('l’encre du client recouvre le LIT DE LA ROUTE gravé dans le décor', () => {
  const carte = lireTexte('contenu/habillages/carte/carte-monde-v3.svg');

  test('les cinq routes tracées sont, au point près, les cinq `d` du `calque-chemin`', () => {
    // Si les deux formules divergeaient, l'encre courrait À CÔTÉ du ruban gravé — un défaut
    // qui ne se voit que sur l'écran qu'on montre à ses parents, et jamais dans un test de
    // composant qui ne regarderait que le client.
    const gravees = [...carte.matchAll(/<path id="chemin-[^"]+" d="([^"]+)"/gu)].map(
      (occurrence) => occurrence[1]
    );
    expect(gravees.length, 'le décor ne grave plus ses cinq routes').toBe(ETAPES.length - 1);

    const tracees = ETAPES.slice(0, -1).map((depart, rang) => tracerRoute(depart, ETAPES[rang + 1]!));
    expect(tracees).toEqual(gravees);
  });

  test('le tracé d’un seul tenant enchaîne exactement les mêmes routes', () => {
    const enchaine = tracerChemin(ETAPES);
    for (const [rang, depart] of ETAPES.slice(0, -1).entries()) {
      const route = tracerRoute(depart, ETAPES[rang + 1]!);
      // Chaque route, privée de son `M` de départ, se retrouve telle quelle dans l'enchaînement.
      expect(enchaine).toContain(route.slice(route.indexOf(' Q') + 1));
    }
  });
});
