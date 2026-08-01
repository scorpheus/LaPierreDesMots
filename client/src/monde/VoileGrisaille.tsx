// Le voile de Grisaille — v2 § 3.1, § 3.2 et § 9.4, lot L2-F.
//
// « La Grisaille n'est pas un méchant. C'est un brouillard, une absence. Il n'y a pas de vilain
// à combattre, pas de menace, pas de peur — juste un monde éteint qu'on rallume. »
//
// Deux conséquences tenues ici, et ce sont des règles de conception, pas des effets :
//
//   1. **Une région voilée n'est pas un SECOND asset.** C'est la même forme, sous un filtre de
//      désaturation et un voile. « Une zone grise n'est pas un filtre sur une image colorée,
//      c'est l'état par défaut d'un SVG dont les remplissages ne sont pas assignés » — ici la
//      couleur est bien dans le fichier, mais le principe demeure : un seul asset, deux états.
//   2. **Le voile ne fait jamais peur.** Aucun noir, aucune ombre menaçante : `--grisaille`
//      seule, et un mouvement lent que `prefers-reduced-motion` supprime (D21, garde-fou 2).
import type { ReactElement } from 'react';

/**
 * Les images-clés du brouillard, portées PAR CE COMPOSANT et non par `styles/global.css`.
 *
 * Deux raisons, et la seconde est la vraie : `global.css` appartient à un autre lot (un seul
 * écrivain par fichier), et une `animation` qui pointe vers des images-clés absentes ne fait
 * rien **en silence** — exactement le défaut « un détecteur qui déclare un poids qu'il
 * n'applique jamais ». Redéclarer les mêmes images-clés est sans effet en CSS : le composant
 * peut être monté six fois sans dommage.
 */
const IMAGES_CLES_BRUME = `
@keyframes pierre-brume {
  0%   { opacity: 0.82; transform: translateX(0) scale(1); }
  100% { opacity: 1;    transform: translateX(6px) scale(1.02); }
}
@media (prefers-reduced-motion: reduce) {
  [data-voile="grisaille"] > use { animation: none !important; }
}
`;

export interface ProprietesVoileGrisaille {
  /** Identifiant du `<clipPath>` ou de la forme à voiler. Le voile épouse la région. */
  readonly forme: string;
  /** 0 = région entièrement rallumée, 1 = région entièrement voilée. */
  readonly opacite: number;
  readonly animationsDesactivees?: boolean;
}

/**
 * Le voile lui-même. À poser DANS le `<svg>` du parchemin, juste après la région qu'il couvre.
 *
 * `pointerEvents: none` : le voile ne mange jamais le tap. Une région voilée reste touchable —
 * l'enfant peut toujours demander à voir ce qu'il y a dessous, ça ne coûte rien.
 */
export function VoileGrisaille({
  forme,
  opacite,
  animationsDesactivees = false
}: ProprietesVoileGrisaille): ReactElement {
  const borne = Math.min(1, Math.max(0, opacite));

  return (
    <g
      data-voile="grisaille"
      data-voile-opacite={borne.toFixed(2)}
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    >
      <style>{IMAGES_CLES_BRUME}</style>
      <use
        href={`#${forme}`}
        fill="var(--grisaille)"
        stroke="none"
        opacity={borne}
        style={
          animationsDesactivees
            ? undefined
            : { animation: 'pierre-brume 9s ease-in-out infinite alternate' }
        }
      />
    </g>
  );
}
