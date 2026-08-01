/**
 * `SceneSvg` — le décor en calques, ses régions tapables, et la recoloration. Lot L-E.
 *
 * PRINCIPE FONDATEUR (annexe P § 2, CLAUDE.md) : « la couleur vient du code, pas du
 * modèle ». L'état par défaut d'une région est GRIS parce que son remplissage n'est pas
 * assigné — ce n'est PAS un filtre posé sur une image colorée. C'est ce seul choix qui
 * rend la recoloration correcte par construction.
 *
 * DEUX SOURCES DE DÉCOR, une seule mécanique.
 *   1. `svgMarkup` fourni : le SVG déclaratif de l'habillage, chargé depuis
 *      `habillage.scene.fichier`. Zéro ligne de code par habillage (v2 § 7).
 *   2. `svgMarkup` absent (test composant, asset manquant, premier rendu) : le décor
 *      bouchon `SCENE_BOUCHON` ci-dessous, écrit à la main.
 * Les deux portent les MÊMES `id` — les 30 gelés du contrat § 9.4 — donc la désignation
 * des régions, la peinture, la recoloration et les attributs `data-*` sont identiques.
 * La mécanique ne connaît que des `id`, jamais une géométrie.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  KeyboardEvent as KeyboardEventReact,
  PointerEvent as PointerEventReact,
  ReactElement
} from 'react';
import type { CouleurColoriage, Habillage, IdRegionSvg } from '@pierre/partage';
import { hexDeCouleur, regionSousLeDoigt } from '@pierre/partage';
import { jouerRecoloration } from './recoloration.js';

/** Couleur d'une région non encore conquise. Surchargeable par L-D dans `global.css`. */
const REMPLISSAGE_VIDE = 'var(--region-vide, #D9DEE7)';
const TRAIT = 'var(--trait, #1B2440)';
const PARCHEMIN = 'var(--parchemin, #FFF6E3)';

export interface RegionBouchon {
  readonly id: IdRegionSvg;
  readonly libelle: string;
  /** Données du `<path>`. Chemin FERMÉ : un trait interrompu ferait fuiter la couleur. */
  readonly d: string;
  readonly centroide: readonly [number, number];
  /** Aire en unités `viewBox`. Contrôlée contre la règle des 64 px (annexe T § T5). */
  readonly surface: number;
}

/** Reprend les dimensions relevées de la scène d'origine (fiches-origine § 3). */
export const VIEWBOX_BOUCHON = '0 0 922 615';

/** Disque exprimé en deux arcs, refermé par `Z`. */
function disque(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

function aireDisque(r: number): number {
  return Math.round(Math.PI * r * r);
}

const X_ARBRES = [505, 615, 725, 845] as const;

function arbreTronc(index: number): RegionBouchon {
  const x = X_ARBRES[index] ?? 0;
  return {
    id: `tronc-arbre-${index + 1}`,
    libelle: `le tronc du ${index + 1}ᵉ arbre`,
    d: `M ${x - 21} 322 L ${x + 21} 322 L ${x + 21} 432 L ${x - 21} 432 Z`,
    centroide: [x, 377],
    surface: 42 * 110
  };
}

function arbreFeuilles(index: number): RegionBouchon {
  const x = X_ARBRES[index] ?? 0;
  return {
    id: `feuilles-arbre-${index + 1}`,
    libelle: `les feuilles du ${index + 1}ᵉ arbre`,
    d: disque(x, 268, 52),
    centroide: [x, 268],
    surface: aireDisque(52)
  };
}

/**
 * Le décor bouchon (décision D2) : la cour d'école de la fiche 1 du niveau 1, en formes
 * géométriques simples. L'enjeu est la MÉCANIQUE, pas le style — le vrai décor viendra
 * de la vectorisation de l'illustration d'origine.
 *
 * Les 30 `id` sont ceux, gelés, du contrat § 9.4. Ni un de plus, ni un de moins :
 * ce sont eux que `contenu/exercices/clairiere/ecole-01.json` référence.
 */
export const SCENE_BOUCHON: readonly RegionBouchon[] = [
  // --- fond ---------------------------------------------------------------
  {
    id: 'ciel',
    libelle: 'le ciel',
    d: 'M 0 0 L 922 0 L 922 320 L 0 320 Z',
    centroide: [461, 160],
    surface: 922 * 320
  },
  {
    id: 'herbe',
    libelle: 'l’herbe de la cour',
    d: 'M 0 320 L 922 320 L 922 615 L 0 615 Z',
    centroide: [461, 468],
    surface: 922 * 295
  },
  // --- l'école ------------------------------------------------------------
  {
    id: 'mur-ecole',
    libelle: 'le mur de l’école',
    d: 'M 130 250 L 420 250 L 420 432 L 130 432 Z',
    centroide: [275, 341],
    surface: 290 * 182
  },
  {
    id: 'toit-ecole',
    libelle: 'le toit de l’école',
    d: 'M 108 250 L 275 148 L 442 250 Z',
    centroide: [275, 216],
    surface: Math.round((334 * 102) / 2)
  },
  {
    id: 'porte-ecole',
    libelle: 'la porte de l’école',
    d: 'M 246 336 L 306 336 L 306 432 L 246 432 Z',
    centroide: [276, 384],
    surface: 60 * 96
  },
  {
    id: 'fenetre-ecole-1',
    libelle: 'la première fenêtre de l’école',
    d: 'M 158 278 L 220 278 L 220 336 L 158 336 Z',
    centroide: [189, 307],
    surface: 62 * 58
  },
  {
    id: 'fenetre-ecole-2',
    libelle: 'la deuxième fenêtre de l’école',
    d: 'M 330 278 L 392 278 L 392 336 L 330 336 Z',
    centroide: [361, 307],
    surface: 62 * 58
  },
  {
    // « L'école a une horloge sur le toit » — l'une des six affirmations V/F de la fiche.
    id: 'horloge-ecole',
    libelle: 'l’horloge de l’école',
    d: disque(275, 206, 28),
    centroide: [275, 206],
    surface: aireDisque(28)
  },
  // --- les quatre arbres --------------------------------------------------
  arbreTronc(0),
  arbreTronc(1),
  arbreTronc(2),
  arbreTronc(3),
  arbreFeuilles(0),
  arbreFeuilles(1),
  arbreFeuilles(2),
  arbreFeuilles(3),
  // --- la maîtresse -------------------------------------------------------
  {
    id: 'cheveux-maitresse',
    libelle: 'les cheveux de la maîtresse',
    d: disque(80, 372, 31),
    centroide: [80, 372],
    surface: aireDisque(31)
  },
  {
    id: 'pull-maitresse',
    libelle: 'le pull de la maîtresse',
    d: 'M 44 402 L 116 402 L 116 478 L 44 478 Z',
    centroide: [80, 440],
    surface: 72 * 76
  },
  {
    id: 'jupe-maitresse',
    libelle: 'la jupe de la maîtresse',
    d: 'M 48 478 L 112 478 L 124 546 L 36 546 Z',
    centroide: [80, 510],
    surface: Math.round(((64 + 88) / 2) * 68)
  },
  // --- les deux garçons, au ballon ---------------------------------------
  {
    id: 'cheveux-garcon-1',
    libelle: 'les cheveux du premier garçon',
    d: disque(232, 382, 31),
    centroide: [232, 382],
    surface: aireDisque(31)
  },
  {
    id: 'tshirt-garcon-1',
    libelle: 'le tee-shirt du premier garçon',
    d: 'M 196 412 L 268 412 L 268 486 L 196 486 Z',
    centroide: [232, 449],
    surface: 72 * 74
  },
  {
    id: 'cheveux-garcon-2',
    libelle: 'les cheveux du deuxième garçon',
    d: disque(352, 382, 31),
    centroide: [352, 382],
    surface: aireDisque(31)
  },
  {
    id: 'tshirt-garcon-2',
    libelle: 'le tee-shirt du deuxième garçon',
    d: 'M 316 412 L 388 412 L 388 486 L 316 486 Z',
    centroide: [352, 449],
    surface: 72 * 74
  },
  {
    id: 'ballon',
    libelle: 'le ballon',
    d: disque(292, 562, 33),
    centroide: [292, 562],
    surface: aireDisque(33)
  },
  // --- les deux filles, à la corde ---------------------------------------
  {
    id: 'cheveux-fille-1',
    libelle: 'les cheveux de la première fille',
    d: disque(470, 382, 31),
    centroide: [470, 382],
    surface: aireDisque(31)
  },
  {
    id: 'robe-fille-1',
    libelle: 'la robe de la première fille',
    d: 'M 436 412 L 504 412 L 518 512 L 422 512 Z',
    centroide: [470, 458],
    surface: Math.round(((68 + 96) / 2) * 100)
  },
  {
    id: 'cheveux-fille-2',
    libelle: 'les cheveux de la deuxième fille',
    d: disque(600, 382, 31),
    centroide: [600, 382],
    surface: aireDisque(31)
  },
  {
    id: 'robe-fille-2',
    libelle: 'la robe de la deuxième fille',
    d: 'M 566 412 L 634 412 L 648 512 L 552 512 Z',
    centroide: [600, 458],
    surface: Math.round(((68 + 96) / 2) * 100)
  },
  {
    id: 'corde',
    libelle: 'la corde à sauter',
    d: 'M 540 392 C 560 500 640 500 660 392 L 676 396 C 654 520 546 520 524 396 Z',
    centroide: [600, 462],
    surface: 4480
  },
  // --- le mobilier de cour ------------------------------------------------
  {
    id: 'banc',
    libelle: 'le banc',
    d: 'M 700 486 L 894 486 L 894 520 L 700 520 Z',
    centroide: [797, 503],
    surface: 194 * 34
  }
];

/**
 * Un chemin est fermé si chacune de ses sous-courbes commence par `M`/`m` et se termine
 * par `Z`/`z`. C'est la vérification bloquante de CLAUDE.md : « un trait interrompu d'un
 * pixel fait fuiter le remplissage sur toute l'image ».
 */
export function estCheminFerme(d: string): boolean {
  const nettoye = d.trim();
  if (nettoye.length === 0) return false;
  if (!/^[Mm]/.test(nettoye)) return false;
  const sousChemins = nettoye
    .split(/(?=[Mm])/)
    .map((morceau) => morceau.trim())
    .filter((morceau) => morceau.length > 0);
  return sousChemins.length > 0 && sousChemins.every((morceau) => /[Zz]$/.test(morceau));
}

// ------------------------------------------------------------------ styles

/**
 * Game feel de la v2 § 8, en CSS pur pour tenir la promesse « réponse visible en moins
 * de 100 ms » : l'appui ne passe par aucun cycle React.
 * Appui `scale 0.94` en 60 ms ; relâchement en ressort (400 ms, bezier à dépassement,
 * approximation CSS de `stiffness 400 / damping 18`).
 * Erreur : oscillation horizontale de 6 px sur 180 ms. Pas de rouge, pas de son négatif,
 * pas de secousse d'écran.
 */
const STYLES_SCENE = `
.pierre-region {
  cursor: pointer;
  transform-box: fill-box;
  transform-origin: center;
  transition: fill 120ms linear, transform 400ms cubic-bezier(.34, 1.56, .64, 1);
}
.pierre-region:active { transform: scale(.94); transition: transform 60ms ease-out; }
.pierre-region:focus-visible { outline: 3px solid var(--soleil, #FFC93C); outline-offset: 2px; }
.pierre-region--refus { animation: pierre-oscille 180ms ease-in-out 1; }
.pierre-region--demonstration { animation: pierre-halo 900ms ease-in-out infinite; }
@keyframes pierre-oscille {
  0%   { transform: translateX(0); }
  25%  { transform: translateX(-6px); }
  75%  { transform: translateX(6px); }
  100% { transform: translateX(0); }
}
@keyframes pierre-halo {
  0%, 100% { filter: none; }
  50%      { filter: drop-shadow(0 0 10px var(--soleil, #FFC93C)); }
}
.pierre-scene--calme .pierre-region,
.pierre-scene--calme .pierre-region--refus,
.pierre-scene--calme .pierre-region--demonstration { animation: none; transition: none; }
@media (prefers-reduced-motion: reduce) {
  .pierre-region, .pierre-region--refus, .pierre-region--demonstration {
    animation: none; transition: none;
  }
}
`;

// --------------------------------------------------------------- composant

export interface ProprietesSceneSvg {
  readonly habillage: Habillage;
  /** Clé = `IdRegionSvg`. Une entrée = une région peinte, définitivement. */
  readonly remplissages: Readonly<Record<string, CouleurColoriage>>;
  /** Région que la démonstration fait pulser, ou `null`. */
  readonly regionEnDemonstration: IdRegionSvg | null;
  /** Région du dernier refus, ou `null`. */
  readonly regionEnRefus: IdRegionSvg | null;
  /** Instant du dernier refus : change à chaque refus, même sur la même région. */
  readonly marqueRefus: number;
  readonly animationsDesactivees: boolean;
  /** Le SVG déclaratif de l'habillage. `null` → décor bouchon. */
  readonly svgMarkup: string | null;
  onPeindre(region: IdRegionSvg): void;
}

function pointViewBox(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  viewBox: string
): readonly [number, number] {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  const minX = parts[0] ?? 0;
  const minY = parts[1] ?? 0;
  const largeur = parts[2] ?? 1;
  const hauteur = parts[3] ?? 1;
  const boite = typeof svg.getBoundingClientRect === 'function' ? svg.getBoundingClientRect() : null;
  if (boite === null || boite.width === 0 || boite.height === 0) {
    return [minX + largeur / 2, minY + hauteur / 2];
  }
  return [
    minX + ((clientX - boite.left) / boite.width) * largeur,
    minY + ((clientY - boite.top) / boite.height) * hauteur
  ];
}

export function SceneSvg(proprietes: ProprietesSceneSvg): ReactElement {
  const {
    habillage,
    remplissages,
    regionEnDemonstration,
    regionEnRefus,
    marqueRefus,
    animationsDesactivees,
    svgMarkup,
    onPeindre
  } = proprietes;

  const refSvg = useRef<SVGSVGElement | null>(null);
  const refDernierPoint = useRef<readonly [number, number]>([0, 0]);
  const refRemplissagesPrecedents = useRef<Readonly<Record<string, CouleurColoriage>>>({});

  const viewBox = habillage.scene.viewBox || VIEWBOX_BOUCHON;
  const dureeRecolorationMs = habillage.timings.recolorationMs;

  const libelles = useMemo(() => {
    const table = new Map<string, string>();
    for (const region of SCENE_BOUCHON) table.set(region.id, region.libelle);
    for (const calque of habillage.scene.calques) {
      if (calque.role !== 'coloriable') continue;
      for (const region of calque.regions) table.set(region.id, region.libelle);
    }
    return table;
  }, [habillage]);

  /** Désignation : le DOM d'abord (exact), la tolérance de visée ensuite (contrat § 5.2). */
  const designer = useCallback(
    (cible: Element | null, point: readonly [number, number]): IdRegionSvg | null => {
      const noeud = cible !== null && typeof cible.closest === 'function'
        ? cible.closest('[data-region-svg]')
        : null;
      const direct = noeud?.getAttribute('data-region-svg');
      if (typeof direct === 'string' && direct.length > 0) return direct;
      return regionSousLeDoigt(habillage, point);
    },
    [habillage]
  );

  const surPointerDown = useCallback(
    (evenement: PointerEventReact<SVGSVGElement>): void => {
      const svg = refSvg.current;
      if (svg === null) return;
      const point = pointViewBox(svg, evenement.clientX, evenement.clientY, viewBox);
      refDernierPoint.current = point;
      const region = designer(evenement.target as Element | null, point);
      // `null` : le doigt est hors du dessin. Le tap est ignoré — pas de refus, pas
      // d'erreur, pas de son. Un doigt qui glisse ne coûte rien (contrat § 5.2).
      if (region !== null) onPeindre(region);
    },
    [designer, onPeindre, viewBox]
  );

  const surClavier = useCallback(
    (evenement: KeyboardEventReact<SVGPathElement>): void => {
      if (evenement.key !== 'Enter' && evenement.key !== ' ') return;
      evenement.preventDefault();
      const region = evenement.currentTarget.getAttribute('data-region-svg');
      if (region !== null && region.length > 0) {
        const centre = SCENE_BOUCHON.find((r) => r.id === region)?.centroide;
        if (centre !== undefined) refDernierPoint.current = centre;
        onPeindre(region);
      }
    },
    [onPeindre]
  );

  // Recoloration : balayage radial depuis le point touché, sur les régions qui viennent
  // d'être peintes. Idempotent — une région déjà traitée n'est pas rejouée.
  useEffect(() => {
    const svg = refSvg.current;
    if (svg === null) return;
    const precedents = refRemplissagesPrecedents.current;
    for (const [region, couleur] of Object.entries(remplissages)) {
      if (precedents[region] === couleur) continue;
      const element = svg.querySelector(`[data-region-svg="${region}"]`);
      if (element === null) continue;
      void jouerRecoloration(element as SVGGraphicsElement, couleur, {
        origine: refDernierPoint.current,
        dureeMs: dureeRecolorationMs,
        desactivee: animationsDesactivees
      });
    }
    refRemplissagesPrecedents.current = { ...remplissages };
  }, [remplissages, dureeRecolorationMs, animationsDesactivees]);

  // Décor déclaratif : le markup injecté ne connaît pas React, on lui applique les
  // remplissages et les attributs `data-*` à la main. Mêmes `id`, même résultat.
  useEffect(() => {
    const svg = refSvg.current;
    if (svg === null || svgMarkup === null) return;
    const noeuds = svg.querySelectorAll('#calque-zones > [id]');
    noeuds.forEach((noeud) => {
      const identifiant = noeud.getAttribute('id');
      if (identifiant === null) return;
      const couleur = remplissages[identifiant];
      noeud.setAttribute('data-region-svg', identifiant);
      noeud.setAttribute('data-peinte', couleur === undefined ? 'non' : 'oui');
      noeud.setAttribute('fill', couleur === undefined ? REMPLISSAGE_VIDE : hexDeCouleur(couleur));
      noeud.classList.add('pierre-region');
      if (couleur === undefined) noeud.removeAttribute('data-couleur');
      else noeud.setAttribute('data-couleur', couleur);
      const libelle = libelles.get(identifiant);
      if (libelle !== undefined) noeud.setAttribute('aria-label', libelle);
      noeud.setAttribute('role', 'button');
      noeud.setAttribute('tabindex', '0');
      noeud.classList.toggle('pierre-region--demonstration', identifiant === regionEnDemonstration);
    });
  }, [svgMarkup, remplissages, libelles, regionEnDemonstration]);

  return (
    <svg
      ref={refSvg}
      className={`pierre-scene${animationsDesactivees ? ' pierre-scene--calme' : ''}`}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      role="group"
      aria-label={habillage.libelle}
      data-habillage={habillage.id}
      data-decor={svgMarkup === null ? 'bouchon' : 'habillage'}
      onPointerDown={surPointerDown}
      style={{ width: '100%', height: 'auto', touchAction: 'manipulation' }}
    >
      <style>{STYLES_SCENE}</style>

      {svgMarkup !== null ? (
        <g
          data-calque="habillage"
          // Le SVG de l'habillage est un asset local du dépôt, validé par
          // `test:contenu` avant d'atteindre l'enfant ; il ne vient d'aucun réseau.
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      ) : (
        <>
          <g id="calque-fond" data-calque="fond" />

          <g id="calque-zones" data-calque="coloriable">
            {SCENE_BOUCHON.map((region) => {
              const couleur = remplissages[region.id];
              const classes = ['pierre-region'];
              if (region.id === regionEnDemonstration) classes.push('pierre-region--demonstration');
              if (region.id === regionEnRefus) classes.push('pierre-region--refus');
              return (
                <path
                  key={`${region.id}-${region.id === regionEnRefus ? marqueRefus : 0}`}
                  id={region.id}
                  className={classes.join(' ')}
                  d={region.d}
                  fill={couleur === undefined ? REMPLISSAGE_VIDE : hexDeCouleur(couleur)}
                  stroke={TRAIT}
                  strokeWidth={4}
                  strokeLinejoin="round"
                  data-region-svg={region.id}
                  data-peinte={couleur === undefined ? 'non' : 'oui'}
                  data-couleur={couleur}
                  role="button"
                  tabIndex={0}
                  aria-label={region.libelle}
                  onKeyDown={surClavier}
                />
              );
            })}
          </g>

          {/* Le trait : dessiné par-dessus, jamais coloriable, jamais tapable. */}
          <g id="calque-trait" data-calque="trait" pointerEvents="none" fill="none" stroke={TRAIT}>
            <path d="M 0 320 L 922 320" strokeWidth={5} />
            <path d="M 108 250 L 275 148 L 442 250 Z" strokeWidth={5} strokeLinejoin="round" />
            <path d="M 130 250 L 420 250 L 420 432 L 130 432 Z" strokeWidth={5} />
            <path d="M 275 178 L 275 206 L 293 214" strokeWidth={4} strokeLinecap="round" />
            <path d="M 189 278 L 189 336 M 158 307 L 220 307" strokeWidth={3} />
            <path d="M 361 278 L 361 336 M 330 307 L 392 307" strokeWidth={3} />
            {/* Les visages, posés sur les cheveux : le parchemin, jamais coloriable. */}
            {[
              [80, 380],
              [232, 390],
              [352, 390],
              [470, 390],
              [600, 390]
            ].map(([cx, cy]) => (
              <path
                key={`visage-${cx ?? 0}`}
                d={disque(cx ?? 0, cy ?? 0, 21)}
                fill={PARCHEMIN}
                strokeWidth={4}
              />
            ))}
            {/* Bras et jambes, en bâtons — l'enjeu est la mécanique, pas le style. */}
            <path
              d="M 44 424 L 20 456 M 116 424 L 140 456 M 62 546 L 58 596 M 98 546 L 102 596"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <path
              d="M 196 430 L 168 462 M 268 430 L 296 470 M 210 486 L 204 578 M 254 486 L 262 578"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <path
              d="M 316 430 L 288 470 M 388 430 L 416 462 M 330 486 L 324 578 M 374 486 L 382 578"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <path
              d="M 436 430 L 412 462 M 504 430 L 528 462 M 452 512 L 448 580 M 488 512 L 492 580"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <path
              d="M 566 430 L 536 456 M 634 430 L 664 456 M 582 512 L 578 580 M 618 512 L 622 580"
              strokeWidth={5}
              strokeLinecap="round"
            />
            {/* Le banc et ses pieds. */}
            <path d="M 700 486 L 894 486 L 894 520 L 700 520 Z" strokeWidth={5} />
            <path d="M 716 520 L 716 566 M 878 520 L 878 566" strokeWidth={6} strokeLinecap="round" />
            {/* Les coutures du ballon. */}
            <path d="M 259 562 L 325 562 M 292 529 L 292 595" strokeWidth={3} />
          </g>
        </>
      )}
    </svg>
  );
}
