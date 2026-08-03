// Le chemin qui se dessine à l'encre — v2 § 9.4, lot L2-F. Repris par S4.
//
// « … et le chemin qui se dessine à l'encre au fur et à mesure. »
//
// Le tracé est une DÉRIVÉE de la progression, jamais un état à part : l'encre posée sur chaque
// route vaut ce qui est rallumé de la région d'où elle part. Il n'y a donc rien à synchroniser,
// rien qui puisse mentir, et rien à remettre à zéro — le chemin ne se dépeint pas plus que la
// carte (R14).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// CE QUE S4 A CORRIGÉ : UN SEUL TRAIT NE PEUT PAS TENIR LA PROMESSE
//
// Ce composant recevait UN avancement — la moyenne des cinq premières régions — et le posait sur
// UN seul `<path>` de cinq courbes, `pathLength="1"`. La fraction se répartissait donc sur la
// LONGUEUR TOTALE, ce qui suppose cinq segments de même longueur. Ils ne le sont pas. Mesuré
// (`node bac-a-sable/s4-carte/mesurer-geometrie.mjs`, échantillonnage à 4000 pas) :
//
//   longueurs d arc des 5 segments        321,4 · 308,0 · 396,3 · 343,3 · 315,1
//     écart max à la moyenne              17,7 %
//   fraction atteinte au bout du segment  0,191 · 0,374 · 0,609 · 0,813 · 1,000
//   fraction posée après k régions        0,200 · 0,400 · 0,600 · 0,800 · 1,000
//     écart max                           0,026 de la longueur totale, soit ≈ 44 unités
//
// L'écran affirmait pourtant, en toutes lettres : « Terminer la Clairière remplit EXACTEMENT le
// premier cinquième et pose l'encre jusqu'aux Galeries ». C'était faux de 44 unités — deux fois
// le rayon d'un marqueur. Une région terminée voyait son encre déborder sur la route suivante,
// une autre s'arrêter avant d'arriver : le geste de l'enfant et le dessin ne disaient pas tout à
// fait la même chose.
//
// ── LA CORRECTION ─────────────────────────────────────────────────────────────────────────────
// CINQ tracés, un par route, chacun avec SA propre part d'encre. Le segment `i` est la route que
// l'on quitte : il s'encre à mesure que la région `i` se rallume, et il est complet quand elle
// l'est — quelle que soit sa longueur. L'hypothèse d'égalité disparaît au lieu d'être corrigée,
// ce qui est toujours préférable : il n'y a plus rien à re-mesurer si un jour une ancre bouge.
// ══════════════════════════════════════════════════════════════════════════════════════════════
import type { ReactElement } from 'react';

export interface ProprietesCheminEncre {
  /** Les points d'ancrage, en unités `viewBox`, dans l'ordre de la progression. */
  readonly etapes: readonly (readonly [number, number])[];
  /**
   * Part encrée de CHAQUE route, de 0 à 1 — une par intervalle entre deux étapes, donc
   * `etapes.length - 1` valeurs. Une valeur manquante vaut 0 : une route dont personne ne dit
   * rien reste à tracer, jamais tracée par défaut.
   */
  readonly parts: readonly number[];
  readonly animationsDesactivees?: boolean;
}

/**
 * Une route entre deux étapes. La commande `Q` prend un point de contrôle relevé de 60 unités :
 * c'est ce qui donne l'arc de carte au trésor plutôt qu'une ligne brisée.
 *
 * Cette formule est celle du LIT DE LA ROUTE gravé dans `carte-monde-v3.svg` — les cinq `d` du
 * `calque-chemin` s'en déduisent au point près, et c'est ce qui fait que l'encre du client
 * recouvre exactement le ruban du décor au lieu de courir à côté.
 */
export function tracerRoute(
  depart: readonly [number, number],
  arrivee: readonly [number, number]
): string {
  const cx = Math.round((depart[0] + arrivee[0]) / 2);
  const cy = Math.round((depart[1] + arrivee[1]) / 2) - 60;
  return `M${String(depart[0])},${String(depart[1])} Q${String(cx)},${String(cy)} ${String(
    arrivee[0]
  )},${String(arrivee[1])}`;
}

/** Le tracé complet, d'un seul tenant — le lit de la route, celui qu'on voit toujours en pâle. */
export function tracerChemin(etapes: readonly (readonly [number, number])[]): string {
  if (etapes.length === 0) {
    return '';
  }
  const [depart, ...suite] = etapes;
  let d = `M${String(depart![0])},${String(depart![1])}`;
  let precedent = depart!;
  for (const etape of suite) {
    const cx = Math.round((precedent[0] + etape[0]) / 2);
    const cy = Math.round((precedent[1] + etape[1]) / 2) - 60;
    d += ` Q${String(cx)},${String(cy)} ${String(etape[0])},${String(etape[1])}`;
    precedent = etape;
  }
  return d;
}

/** Borne une part dans [0, 1]. Une progression ne descend jamais sous zéro ni au-dessus d'un. */
const borner = (valeur: number): number =>
  Number.isFinite(valeur) ? Math.min(1, Math.max(0, valeur)) : 0;

export function CheminEncre({
  etapes,
  parts,
  animationsDesactivees = false
}: ProprietesCheminEncre): ReactElement | null {
  if (etapes.length < 2) {
    return null;
  }
  const routes = etapes.slice(0, -1).map((depart, rang) => ({
    d: tracerRoute(depart, etapes[rang + 1]!),
    part: borner(parts[rang] ?? 0)
  }));

  /**
   * L'avancement d'ensemble, conservé pour la prise `data-chemin-avancement` qu'interrogent les
   * tests de parcours. C'est une MOYENNE DES PARTS, donc une lecture du même état — jamais une
   * seconde vérité qu'il faudrait tenir à jour à côté du dessin.
   */
  const ensemble = routes.reduce((total, route) => total + route.part, 0) / routes.length;

  return (
    <g
      data-chemin="encre"
      data-chemin-avancement={ensemble.toFixed(2)}
      data-chemin-routes={routes.map((route) => route.part.toFixed(2)).join(' ')}
      aria-hidden="true"
    >
      {/* L'encre pâle du chemin ENTIER : on voit toujours où l'on va, jamais où l'on a échoué. */}
      <path
        d={tracerChemin(etapes)}
        fill="none"
        stroke="var(--grisaille)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="14 12"
        opacity="0.45"
      />
      {/* L'encre posée, route par route. `pathLength=1` rend la part directement lisible, et
          elle est LOCALE à la route : aucune longueur d'arc n'entre plus dans le calcul. */}
      {routes.map((route, rang) => (
        <path
          // Les routes sont les intervalles d'une liste ordonnée et figée : le rang EST leur
          // identité, il ne dépend d'aucune donnée réordonnable.
          key={`route-${String(rang)}`}
          data-chemin-route={String(rang)}
          data-chemin-part={route.part.toFixed(2)}
          d={route.d}
          pathLength={1}
          fill="none"
          stroke="var(--trait)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${String(route.part)} 1`}
          style={{
            transition: animationsDesactivees ? 'none' : 'stroke-dasharray 900ms ease-out'
          }}
        />
      ))}
    </g>
  );
}
