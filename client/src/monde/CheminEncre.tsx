// Le chemin qui se dessine à l'encre — v2 § 9.4, lot L2-F.
//
// « … et le chemin qui se dessine à l'encre au fur et à mesure. »
//
// Le tracé est une DÉRIVÉE de la progression, jamais un état à part : la longueur d'encre posée
// vaut la part de régions terminées. Il n'y a donc rien à synchroniser, rien qui puisse mentir,
// et rien à remettre à zéro — le chemin ne se dépeint pas plus que la carte (R14).
//
// Technique : un seul `<path>`, `pathLength="1"` pour que la fraction soit lisible telle quelle
// dans `strokeDasharray`. Aucun calcul de longueur réelle, donc aucune dépendance à la taille
// de rendu ni à `getTotalLength()` — qui n'existe pas sous happy-dom.
import type { ReactElement } from 'react';

export interface ProprietesCheminEncre {
  /** Les points d'ancrage, en unités `viewBox`, dans l'ordre de la progression. */
  readonly etapes: readonly (readonly [number, number])[];
  /** Part du chemin déjà tracée, de 0 à 1. */
  readonly avancement: number;
  readonly animationsDesactivees?: boolean;
}

/**
 * Une courbe douce passant par les étapes. La commande `Q` prend un point de contrôle relevé
 * de 60 unités : c'est ce qui donne l'arc de carte au trésor plutôt qu'une ligne brisée.
 */
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

export function CheminEncre({
  etapes,
  avancement,
  animationsDesactivees = false
}: ProprietesCheminEncre): ReactElement | null {
  if (etapes.length < 2) {
    return null;
  }
  const part = Math.min(1, Math.max(0, avancement));

  return (
    <g data-chemin="encre" data-chemin-avancement={part.toFixed(2)} aria-hidden="true">
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
      {/* L'encre posée. `pathLength=1` rend la fraction directement lisible. */}
      <path
        d={tracerChemin(etapes)}
        pathLength={1}
        fill="none"
        stroke="var(--trait)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${String(part)} 1`}
        style={{
          transition: animationsDesactivees ? 'none' : 'stroke-dasharray 900ms ease-out'
        }}
      />
    </g>
  );
}
