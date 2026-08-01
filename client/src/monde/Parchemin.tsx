// Le support de la carte — v2 § 9.4, lot L2-F.
//
// « La carte du monde, dessinée comme une carte au trésor sur parchemin. C'est l'écran qu'on
// ouvre en premier, celui qu'on montre à ses parents. »
//
// Ce composant ne dessine que le SUPPORT : le fond parchemin, ses bords irréguliers et son
// ombre. Les six régions, le voile et le chemin sont posés par-dessus, en enfants. La
// séparation n'est pas cosmétique : « le décor s'agite, le texte jamais » (v2 § 9.3), et le
// parchemin est précisément la surface sur laquelle on lit — il ne bouge donc jamais.
import type { ReactElement, ReactNode } from 'react';

export interface ProprietesParchemin {
  /** Le `viewBox` de la scène posée dessus, pour que support et contenu partagent l'échelle. */
  readonly viewBox?: string;
  readonly titre?: string;
  readonly children?: ReactNode;
}

/** Bords volontairement inégaux : quatre coins jamais alignés, comme un vieux papier. */
const CONTOUR = 'M12,28 L1188,12 L1176,776 L24,788 Z';

export function Parchemin({
  viewBox = '0 0 1200 800',
  titre = 'La carte du monde',
  children
}: ProprietesParchemin): ReactElement {
  return (
    <div
      data-parchemin="oui"
      style={{
        position: 'relative',
        inlineSize: '100%',
        maxInlineSize: '1200px',
        marginInline: 'auto'
      }}
    >
      <svg
        viewBox={viewBox}
        role="img"
        aria-label={titre}
        style={{
          inlineSize: '100%',
          blockSize: 'auto',
          display: 'block',
          filter: 'drop-shadow(0 6px 0 rgba(27, 36, 64, 0.18))'
        }}
      >
        <title>{titre}</title>
        <path
          d={CONTOUR}
          fill="var(--parchemin)"
          stroke="#C9B48A"
          strokeWidth="8"
          strokeLinejoin="round"
        />
        {children}
      </svg>
    </div>
  );
}
