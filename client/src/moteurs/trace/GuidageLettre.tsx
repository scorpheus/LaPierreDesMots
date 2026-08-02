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
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * DÉFAUT CORRIGÉ — L'ORDRE IMPOSÉ ÉTAIT INVISIBLE. Le moteur impose l'ordre des traits, et
 * l'ordre du `d` est l'inverse de celui du `b` : la boucle d'abord (D33). Or ce composant
 * rendait le trait attendu (`en-cours`) et le trait d'après (`a-tracer`) avec **exactement
 * les mêmes attributs** — même couloir, même pointillé, **deux disques de départ jaunes
 * identiques et deux flèches**. Seul `data-trait-etat`, invisible, les séparait. L'enfant
 * voyait donc deux invitations à poser le doigt, et celle qui n'était pas la bonne était
 * refusée sans rien expliquer. C'est ce que le père a rencontré sur le `d`.
 *
 * TROIS RÈGLES, désormais :
 *   1. **Un seul point de départ à l'écran**, celui du trait attendu. Le trait d'après est un
 *      fantôme : pas de disque, pas de flèche, rien à viser.
 *   2. Le trait attendu est plus **contrasté** que celui d'après — le regard va au bon
 *      endroit sans qu'on ait à lire quoi que ce soit.
 *   3. Le disque de départ fait au moins **64 px CSS** de diamètre (CLAUDE.md règle 5, R16).
 *      À `min(100%, 420px)` pour 100 unités de `viewBox`, cela fait `r >= 7,62` : il valait
 *      `r=5`, soit 42 px — sous la plus petite cible tapable de l'application.
 * ────────────────────────────────────────────────────────────────────────────────────────
 */

import type { ReactElement } from 'react';
import type { TraitLettre } from '@pierre/partage';

const TRAIT = 'var(--trait, #1B2440)';
const GUIDE = 'var(--guide, rgba(27, 36, 64, 0.18))';
const COULOIR = 'var(--couloir, rgba(242, 193, 78, 0.28))';
const DEPART = 'var(--depart, #F2C14E)';

/**
 * Le trait D'APRÈS, en retrait. PLACEHOLDER — les deux valeurs sont un défaut raisonnable,
 * pas une décision : elles disent seulement « moins présent que celui d'à côté ». La
 * question est posée en fin de `Docs/questions-en-attente.md`.
 */
const COULOIR_ATTENTE = 'var(--couloir-attente, rgba(242, 193, 78, 0.09))';
const GUIDE_ATTENTE = 'var(--guide-attente, rgba(27, 36, 64, 0.07))';

/**
 * Rayon du disque de départ, en unités `viewBox`. `8 × 2 × 4,2 px/unité = 67,2 px` — au-delà
 * des 64 px exigés, et `tests/composants/MoteurTrace-ordre-visible.test.tsx` le mesure.
 */
const RAYON_DEPART = 8;
const RAYON_DEPART_ANIME = 10;

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

/** Ce que l'on dit du trait à qui ne voit pas l'écran. L'ordre en fait partie. */
function annonce(trait: TraitLettre, etat: ProprietesGuidageLettre['etat']): string {
  if (etat === 'trace') return `${trait.libelle}, déjà gravé`;
  if (etat === 'en-cours') return `${trait.libelle}, à tracer maintenant`;
  return `${trait.libelle}, après`;
}

export function GuidageLettre(proprietes: ProprietesGuidageLettre): ReactElement {
  const { trait, etat, tolerance, animationsDesactivees, enDemonstration } = proprietes;
  const fleche = flecheDeSens(trait);
  const largeurCouloir = Math.max(2, tolerance * 2);

  // Le trait attendu, et lui seul, se vise : il porte le départ, la flèche, et le contraste.
  const aViser = etat === 'en-cours';

  return (
    <g data-trait={trait.id} data-trait-etat={etat} aria-label={annonce(trait, etat)}>
      {/* Le couloir, à sa vraie largeur : ce qui est toléré est ce qui est montré. */}
      <polyline
        data-guide="couloir"
        points={polyligne(trait)}
        fill="none"
        stroke={etat === 'trace' ? 'none' : aViser ? COULOIR : COULOIR_ATTENTE}
        strokeWidth={aViser ? largeurCouloir : Math.max(2, largeurCouloir / 2)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Le modèle. Tracé plein une fois franchi, pointillé tant qu'il attend. */}
      <polyline
        data-guide="modele"
        points={polyligne(trait)}
        fill="none"
        stroke={etat === 'trace' ? TRAIT : aViser ? GUIDE : GUIDE_ATTENTE}
        strokeWidth={etat === 'trace' ? 4 : aViser ? 3 : 1.5}
        strokeDasharray={etat === 'trace' ? undefined : aViser ? '5 6' : '2 8'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* UN SEUL point de départ à l'écran : celui du trait attendu. */}
      {aViser ? (
        <>
          <circle
            data-guide="depart"
            cx={trait.depart[0]}
            cy={trait.depart[1]}
            r={enDemonstration && !animationsDesactivees ? RAYON_DEPART_ANIME : RAYON_DEPART}
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
      ) : null}

      <title>{annonce(trait, etat)}</title>
    </g>
  );
}
