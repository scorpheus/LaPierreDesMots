/**
 * `GuidageLettre` — départ, flèche de sens, couloir de tolérance. Lot L2-C.
 *
 * CE COMPOSANT EST L'AIDE ELLE-MÊME, et il montre trois choses que le tracé fini ne montre
 * pas :
 *   • **le point de départ** — un gros disque, la seule chose que l'enfant doit viser en
 *     premier ;
 *   • **le sens** — une flèche au milieu du trait. C'est le sens qui distingue `b` de `d`
 *     sur un tracé (D23) ; un modèle sans flèche laisserait l'enfant deviner, et le moteur
 *     mesurerait alors sa devinette ;
 *   • **le couloir de tolérance** — dessiné à sa vraie largeur. Un couloir large est un
 *     choix assumé : l'exercice porte sur l'orientation, jamais sur la propreté du geste.
 *     Un `b` tremblant mais bien orienté a réussi (R16).
 *
 * Aucun rouge, jamais : un trait raté s'estompe et se redemande (D16, R14).
 */

import type { ReactElement } from 'react';
import type { TraitLettre } from '@pierre/partage';

const TRAIT = 'var(--trait, #1B2440)';
const GUIDE = 'var(--guide, rgba(27, 36, 64, 0.18))';
const COULOIR = 'var(--couloir, rgba(242, 193, 78, 0.28))';
const DEPART = 'var(--depart, #F2C14E)';

export interface ProprietesGuidageLettre {
  readonly trait: TraitLettre;
  /** `a-tracer` · `en-cours` · `trace` — la même valeur que `data-trait-etat`. */
  readonly etat: 'a-tracer' | 'en-cours' | 'trace';
  /** Demi-largeur du couloir, en unités `viewBox`. Vient de la tolérance convertie. */
  readonly tolerance: number;
  readonly animationsDesactivees: boolean;
  /** `true` au palier `demonstration` : le trait s'anime au lieu d'attendre. */
  readonly enDemonstration: boolean;
}

function polyligne(trait: TraitLettre): string {
  return trait.points.map(([x, y]) => `${x},${y}`).join(' ');
}

/** Le milieu du trait, et la direction qu'on y suit. Sert à poser la flèche de sens. */
function flecheDeSens(trait: TraitLettre): { readonly x: number; readonly y: number; readonly angle: number } | null {
  const points = trait.points;
  if (points.length < 2) return null;
  const milieu = Math.floor(points.length / 2);
  const a = points[Math.max(0, milieu - 1)];
  const b = points[Math.min(points.length - 1, milieu)];
  if (a === undefined || b === undefined) return null;
  const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return { x: b[0], y: b[1], angle };
}

export function GuidageLettre(proprietes: ProprietesGuidageLettre): ReactElement {
  const { trait, etat, tolerance, animationsDesactivees, enDemonstration } = proprietes;
  const fleche = flecheDeSens(trait);
  const largeurCouloir = Math.max(2, tolerance * 2);

  return (
    <g data-trait={trait.id} data-trait-etat={etat} aria-label={trait.libelle}>
      {/* Le couloir, à sa vraie largeur : ce qui est toléré est ce qui est montré. */}
      <polyline
        data-guide="couloir"
        points={polyligne(trait)}
        fill="none"
        stroke={etat === 'trace' ? 'none' : COULOIR}
        strokeWidth={largeurCouloir}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Le modèle. Tracé plein une fois franchi, pointillé tant qu'il attend. */}
      <polyline
        data-guide="modele"
        points={polyligne(trait)}
        fill="none"
        stroke={etat === 'trace' ? TRAIT : GUIDE}
        strokeWidth={etat === 'trace' ? 4 : 2.5}
        strokeDasharray={etat === 'trace' ? undefined : '5 6'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {etat === 'trace' ? null : (
        <>
          <circle
            data-guide="depart"
            cx={trait.depart[0]}
            cy={trait.depart[1]}
            r={enDemonstration && !animationsDesactivees ? 7 : 5}
            fill={DEPART}
            stroke={TRAIT}
            strokeWidth={1.5}
          />
          {fleche === null ? null : (
            <polygon
              data-guide="sens"
              points="-5,-4 6,0 -5,4"
              fill={TRAIT}
              transform={`translate(${fleche.x} ${fleche.y}) rotate(${fleche.angle})`}
            />
          )}
        </>
      )}

      <title>{trait.libelle}</title>
    </g>
  );
}
