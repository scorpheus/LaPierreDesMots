// La progression de la carte raster — le PNG est la peinture, ce composant en montre l'état.
//
// Le fichier validé porte déjà les six paysages en couleur. Le rendre directement puis poser un
// gris opaque ne fonctionnait pas : les silhouettes du SVG historique ne coïncident pas avec le
// PNG. Ici, une même image est donc dessinée deux fois, parfaitement superposée : la couche du
// dessous passe dans un filtre de désaturation, et la couche du dessus ne ressort qu'à travers
// les six masques tracés sur les vrais paysages du PNG. Les prises restent dans `EcranCarte` et
// ne dépendent jamais de ces masques.
import type { ReactElement } from 'react';

type CodeRaster =
  | 'clairiere'
  | 'galeries'
  | 'marais-jumeau'
  | 'foret-muette'
  | 'volcan'
  | 'cite-des-histoires';

interface MasqueRegionRaster {
  /** Silhouette de paysage, mesurée sur le PNG transposé dans le viewBox 1200 × 800. */
  readonly d: string;
  /** Rayon maximal de la révélation progressive, en unités du viewBox. */
  readonly rayon: number;
}

/**
 * Zones de couleur du PNG. Elles ne reprennent volontairement PAS les six polygones SVG :
 * l'ancien décor et l'illustration raster n'ont ni les mêmes lieux, ni les mêmes coordonnées.
 * Chaque contour est large autour d'un repère réellement dessiné afin qu'un premier exercice
 * réveille un morceau clairement reconnaissable du paysage, sans colorer ses voisins.
 */
const MASQUES: Readonly<Record<CodeRaster, MasqueRegionRaster>> = {
  clairiere: {
    // La Clairière est le chemin de départ au sud. La Pierre centrale reste hors de ce masque :
    // elle ne retrouve sa couleur qu'après les six Éclats.
    d: 'M284 524 C361 484 459 510 527 575 C581 624 576 716 528 768 L324 800 L130 800 C174 705 214 596 284 524 Z',
    rayon: 225
  },
  galeries: {
    d: 'M792 473 C890 431 1083 449 1178 529 L1188 689 L1038 696 C940 691 836 664 787 597 C766 557 771 508 792 473 Z',
    rayon: 220
  },
  'marais-jumeau': {
    d: 'M944 268 C1026 230 1150 248 1200 314 L1200 479 C1144 508 1043 491 981 448 C934 411 914 326 944 268 Z',
    rayon: 180
  },
  'foret-muette': {
    d: 'M866 18 C971 -12 1138 22 1200 96 L1200 282 C1129 296 1016 274 936 226 C870 183 836 91 866 18 Z',
    rayon: 210
  },
  volcan: {
    d: 'M0 496 C88 448 231 452 335 514 C392 560 387 674 326 727 L42 726 L0 674 Z',
    rayon: 200
  },
  'cite-des-histoires': {
    d: 'M0 274 C87 239 238 272 314 351 C350 397 336 490 281 534 C188 571 75 544 0 489 Z',
    rayon: 190
  }
};

/** La Pierre brisée au centre : conclusion distincte des six paysages régionaux. */
const MASQUE_CONCLUSION =
  'M422 338 C494 286 697 287 785 365 C842 416 830 541 757 592 C667 649 506 638 427 565 C372 510 365 398 422 338 Z';

export interface AvancementRaster {
  readonly region: CodeRaster;
  readonly ancre: readonly [number, number];
  readonly pourcentageColorie: number;
}

export interface ProprietesCarteRasterProgression {
  readonly source: string;
  readonly avancements: readonly AvancementRaster[];
  /** Les six Éclats ont été obtenus : la Pierre centrale peut retrouver ses couleurs. */
  readonly conclusionActive?: boolean;
  readonly surErreur?: () => void;
}

function borne(pourcentage: number): number {
  return Math.max(0, Math.min(1, pourcentage));
}

/**
 * Dessine le monde éteint, puis seulement les portions que le journal a rallumées.
 *
 * `feColorMatrix` est le gris réel : saturation nulle sur chaque pixel du PNG, y compris la
 * lumière de la Pierre au centre. La seconde image conserve ses couleurs d'origine et est
 * découpée par un masque radial. À 0 %, elle n'est pas rendue ; à 100 %, tout le paysage de la
 * région est rendu. Entre les deux, le disque souple grandit depuis la prise de la région.
 */
export function CarteRasterProgression({
  source,
  avancements,
  conclusionActive = false,
  surErreur
}: ProprietesCarteRasterProgression): ReactElement {
  return (
    <g data-decor="carte" data-decor-raster="carte" data-format-decor="raster" aria-hidden="true">
      <defs>
        <filter id="carte-raster-grisaille" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
        </filter>
        {avancements.map(({ region, ancre, pourcentageColorie }) => {
          const masque = MASQUES[region];
          const pourcentage = borne(pourcentageColorie);
          const rayon = masque.rayon * Math.sqrt(pourcentage);
          return (
            <g key={`definitions-raster-${region}`}>
              <clipPath id={`carte-raster-zone-${region}`}>
                <path d={masque.d} />
              </clipPath>
              <radialGradient id={`carte-raster-reveil-${region}`}>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="72%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
              <mask id={`carte-raster-masque-${region}`}>
                <rect x="0" y="0" width="1200" height="800" fill="#000000" />
                <circle
                  cx={ancre[0]}
                  cy={ancre[1]}
                  r={rayon}
                  fill={`url(#carte-raster-reveil-${region})`}
                />
              </mask>
            </g>
          );
        })}
        <clipPath id="carte-raster-zone-conclusion">
          <path d={MASQUE_CONCLUSION} />
        </clipPath>
      </defs>
      <image
        href={source}
        x="0"
        y="0"
        width="1200"
        height="800"
        preserveAspectRatio="xMidYMid slice"
        filter="url(#carte-raster-grisaille)"
        data-carte-grisaille="totale"
        onError={surErreur}
      />
      {avancements.map(({ region, pourcentageColorie }) => {
        const pourcentage = borne(pourcentageColorie);
        if (pourcentage === 0) return null;
        return (
          <g
            key={`revelation-raster-${region}`}
            data-revelation-region={region}
            data-revelation-pourcentage={pourcentage.toFixed(2)}
            clipPath={`url(#carte-raster-zone-${region})`}
            {...(pourcentage === 1
              ? {}
              : { mask: `url(#carte-raster-masque-${region})` })}
          >
            <image
              href={source}
              x="0"
              y="0"
              width="1200"
              height="800"
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        );
      })}
      {conclusionActive ? (
        <g
          data-revelation-conclusion="pierre"
          clipPath="url(#carte-raster-zone-conclusion)"
        >
          <image
            href={source}
            x="0"
            y="0"
            width="1200"
            height="800"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      ) : null}
    </g>
  );
}
