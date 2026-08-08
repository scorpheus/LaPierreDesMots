/**
 * `PorteurPose` — le SEUL bout de JSX de la mise en scène partagée (voir `mise-en-scene.ts`
 * pour pourquoi il est séparé : un script de mesure Node ne peut pas décaper le JSX d'un
 * `.tsx` avec `--experimental-strip-types`, seulement ses types).
 */
import type { ReactElement, ReactNode } from 'react';

export interface ProprietesPorteurPose {
  readonly x: number;
  readonly y: number;
  readonly children: ReactNode;
}

/**
 * Positionne un élément posé sur le décor, à un point mesuré. C'est le SEUL rôle de ce porteur :
 * centrer par `transform: translate(-50%, -50%)`. Il ne reçoit jamais de classe d'animation —
 * c'est la leçon de R54 (`Docs/decision-decor-de-fond-et-mots-poses.md`) : une image-clé qui
 * touche `transform` REMPLACE le centrage au lieu de composer avec lui. L'enfant qu'on pose
 * dedans porte l'oscillation ; ce porteur ne porte que la position.
 */
export function PorteurPose({ x, y, children }: ProprietesPorteurPose): ReactElement {
  return (
    <span
      style={{
        position: 'absolute',
        insetInlineStart: `${String(x)}px`,
        insetBlockStart: `${String(y)}px`,
        transform: 'translate(-50%, -50%)',
        display: 'inline-flex',
        pointerEvents: 'none',
      }}
    >
      {children}
    </span>
  );
}
