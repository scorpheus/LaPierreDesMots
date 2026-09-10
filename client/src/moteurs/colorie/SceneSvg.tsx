/**
 * `SceneSvg` — le décor en calques, ses régions tapables, et la recoloration. Lot L-E.
 *
 * PRINCIPE FONDATEUR (annexe P § 2, CLAUDE.md) : « la couleur vient du code, pas du
 * modèle ». L'état par défaut d'une région est GRIS parce que son remplissage n'est pas
 * assigné — ce n'est PAS un filtre posé sur une image colorée. C'est ce seul choix qui
 * rend la recoloration correcte par construction.
 *
 * DEUX SOURCES DE DÉCOR, UNE SEULE GÉOMÉTRIE.
 *   1. `svgMarkup` fourni : le SVG déclaratif de l'habillage, chargé depuis
 *      `habillage.scene.fichier`. C'est le décor que l'enfant voit.
 *   2. `svgMarkup` absent (asset manquant, premier rendu, test) : un décor de REPLI
 *      **dérivé de l'habillage** — un disque par région, au centroïde déclaré, de même
 *      aire que la `surface` déclarée.
 *
 * CE FICHIER NE CONNAÎT AUCUN DÉCOR. Il ne porte ni forme, ni libellé, ni coordonnée :
 * tout vient de `habillage.scene.calques`. C'est la traduction littérale de « zéro ligne
 * de code par habillage » (v2 § 7) — un second habillage n'ajoute pas une ligne ici.
 *
 * POURQUOI LE REPLI EST DÉRIVÉ, ET NON DESSINÉ À LA MAIN.
 * Il l'était : 170 lignes de décor en dur, portant les mêmes 30 `id` que l'habillage de la
 * v1 et AUCUNE de ses coordonnées — une même région à 702 unités d'écart, aux bords
 * opposés de l'image. Or `regionSousLeDoigt` lit toujours les centroïdes de l'HABILLAGE, y
 * compris quand le décor affiché venait du code : un doigt posé sur le trait peignait alors
 * une région située ailleurs dans l'image, en silence, et le comptait comme une erreur de
 * l'enfant. Deux géométries sous les mêmes `id` ne peuvent pas coexister ; l'habillage fait
 * autorité parce que c'est LUI que le contrat § 1.6 désigne comme le décor (lot L-F) et lui
 * que `test:contenu` contrôle.
 * Le disque de rayon `√(surface/π)` n'est pas un choix esthétique : c'est EXACTEMENT
 * l'approximation qu'emploie `regionSousLeDoigt` (contrat § 5.2). Ce qui est dessiné sous
 * un point est donc, par construction, ce que la visée nomme en ce point.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as KeyboardEventReact,
  PointerEvent as PointerEventReact,
  ReactElement
} from 'react';
import type {
  CouleurColoriage,
  Habillage,
  IdRegionSvg,
  RegionColoriable
} from '@pierre/partage';
import { hexDeCouleur, regionSousLeDoigt } from '@pierre/partage';
import { jouerRecoloration } from './recoloration.js';
import { CercleAccessible } from '../../composants/CercleAccessible.js';

/** Couleur d'une région non encore conquise. Surchargeable par L-D dans `global.css`. */
const REMPLISSAGE_VIDE = 'var(--region-vide, #D9DEE7)';
const TRAIT = 'var(--trait, #1B2440)';

/**
 * Repli si l'habillage ne déclare aucun `viewBox`. Volontairement neutre : le contrat § 9.4
 * rend `scene.viewBox` obligatoire, et une valeur empruntée à un décor particulier
 * réintroduirait ici la connaissance d'une scène.
 */
export const VIEWBOX_PAR_DEFAUT = '0 0 100 100';

/**
 * Rayon du disque de même aire que la région.
 * Reprend `rayonEquivalent` de `partage/src/moteurs/colorie/validation.ts` : c'est ce qui
 * garantit que le repli et la visée parlent de la même forme.
 */
function rayonEquivalent(surface: number): number {
  return Math.sqrt(Math.max(surface, 0) / Math.PI);
}

// ------------------------------------------------------------------ styles

/**
 * Game feel de la v2 § 8, en CSS pur pour tenir la promesse « réponse visible en moins
 * de 100 ms » : l'appui ne passe par aucun cycle React.
 * Appui `scale 0.94` en 60 ms ; relâchement en ressort (400 ms, bezier à dépassement,
 * approximation CSS de `stiffness 400 / damping 18`).
 * Erreur : oscillation horizontale de 6 px sur 180 ms. Pas de rouge, pas de son négatif,
 * pas de secousse d'écran (décision D16).
 */
const STYLES_SCENE = `
.pierre-region {
  cursor: pointer;
  transform-box: fill-box;
  transform-origin: center;
  transition: fill 120ms linear, transform 400ms cubic-bezier(.34, 1.56, .64, 1);
}
.pierre-region:active { transform: scale(.94); transition: transform 60ms ease-out; }
/* Le masque du vrai dessin reste sous le doigt pendant l'appui. Le réduire pouvait
   déplacer une porte ou un banc fin hors du contact avant le pointerdown tactile. */
.pierre-region[data-region-source]:active { transform: none; filter: brightness(1.08); }
.pierre-region:focus-visible { outline: 3px solid var(--soleil, #FFC93C); outline-offset: 2px; }
.pierre-region--refus { animation: pierre-oscille 180ms ease-in-out 1; }
.pierre-region--demonstration { animation: pierre-halo 900ms ease-in-out infinite; }
.pierre-fond-illustre--gris { filter: grayscale(1) saturate(0); }
.pierre-prise-colorie {
  cursor: pointer;
  fill: transparent;
  pointer-events: all;
  vector-effect: non-scaling-stroke;
}
.pierre-prise-colorie.pierre-region--demonstration {
  stroke: var(--soleil, #FFC93C);
  stroke-width: 4;
  stroke-dasharray: 10 8;
  filter: drop-shadow(0 2px 3px rgba(27, 36, 64, .35));
}
.pierre-prise-colorie:focus { outline: none; }
.pierre-prise-colorie:focus-visible { stroke: var(--soleil, #FFC93C); stroke-width: 4; }
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
  /** Nombre de régions demandées par cet exercice, pour recolorer le raster jusqu'à 100 %. */
  readonly nombreRegionsAttendues?: number;
  /** Seules les cibles de la consigne courante doivent prendre le doigt. */
  readonly regionsActives?: readonly IdRegionSvg[];
  /** Loupe de confort volontaire : un glissement défile, il ne peint jamais. */
  readonly loupeActive?: boolean;
  /** Le SVG déclaratif de l'habillage. `null` → décor de repli dérivé. */
  readonly svgMarkup: string | null;
  onPeindre(region: IdRegionSvg): void;
}

/** Le mouvement au moins égal à 10 px appartient au défilement de la loupe. */
export const SEUIL_DEFILEMENT_LOUPE_PX = 10;

interface GesteLoupe {
  readonly pointerId: number;
  readonly departX: number;
  readonly departY: number;
  readonly region: IdRegionSvg;
  deplace: boolean;
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
  const echelle = Math.min(boite.width / largeur, boite.height / hauteur);
  const margeX = (boite.width - largeur * echelle) / 2;
  const margeY = (boite.height - hauteur * echelle) / 2;
  return [
    minX + (clientX - boite.left - margeX) / echelle,
    minY + (clientY - boite.top - margeY) / echelle
  ];
}

/** `Enter` et `Espace` valident, comme sur un bouton. Rien d'autre n'agit. */
function toucheDeValidation(touche: string): boolean {
  return touche === 'Enter' || touche === ' ';
}

export function SceneSvg(proprietes: ProprietesSceneSvg): ReactElement {
  const {
    habillage,
    remplissages,
    regionEnDemonstration,
    regionEnRefus,
    marqueRefus,
    animationsDesactivees,
    regionsActives,
    loupeActive = false,
    svgMarkup,
    onPeindre
  } = proprietes;

  const refSvg = useRef<SVGSVGElement | null>(null);
  const refDernierPoint = useRef<readonly [number, number]>([0, 0]);
  const refGesteLoupe = useRef<GesteLoupe | null>(null);
  const refRemplissagesPrecedents = useRef<Readonly<Record<string, CouleurColoriage>>>({});

  const viewBox = habillage.scene.viewBox || VIEWBOX_PAR_DEFAUT;
  const dureeRecolorationMs = habillage.timings.recolorationMs;
  const dimensionsViewBox = viewBox.trim().split(/[\s,]+/u).map(Number);
  const rapportViewBox = (dimensionsViewBox[2] ?? 1) / Math.max(1, dimensionsViewBox[3] ?? 1);
  const [rayonPrise, fixerRayonPrise] = useState(64);
  // Une longueur SVG est mise à l'échelle avec tout le dessin : 80 unités donnaient 80 px sur
  // la tablette de référence, mais seulement 40 px dans le viewport E2E plus bas. Le rayon est
  // donc dérivé de la boîte RÉELLEMENT rendue pour garantir un diamètre de 64 px CSS partout.
  useLayoutEffect(() => {
    const svg = refSvg.current;
    if (svg === null) return undefined;
    const morceaux = viewBox.trim().split(/[\s,]+/u).map(Number);
    const largeurViewBox = morceaux[2] ?? 1;
    const hauteurViewBox = morceaux[3] ?? 1;
    const mesurer = (): void => {
      const boite = svg.getBoundingClientRect();
      if (boite.width <= 0 || boite.height <= 0) return;
      const echelle = Math.min(boite.width / largeurViewBox, boite.height / hauteurViewBox);
      if (!Number.isFinite(echelle) || echelle <= 0) return;
      // Une petite marge absorbe le cycle entre le changement de largeur du panneau d'aide
      // et le rappel asynchrone de ResizeObserver. Sans elle, la scène pouvait être mesurée à
      // 64 px puis tomber brièvement à 57–59 px au moment précis où Gobi ouvrait sa bulle.
      fixerRayonPrise(Math.max(64, 36 / echelle));
    };
    mesurer();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(svg);
    return () => observateur.disconnect();
  }, [viewBox]);

  /** Les calques coloriables, seule source de régions — aucune table interne. */
  const calquesColoriables = useMemo(
    () => habillage.scene.calques.filter((calque) => calque.role === 'coloriable'),
    [habillage]
  );

  const regionsDeclarees = useMemo<readonly RegionColoriable[]>(
    () => calquesColoriables.flatMap((calque) => calque.regions),
    [calquesColoriables]
  );

  const identifiantsActifs = useMemo(
    () => (regionsActives === undefined ? null : new Set(regionsActives.map(String))),
    [regionsActives]
  );

  /**
   * L'OBJET `dangerouslySetInnerHTML`, MÉMORISÉ — et ce n'est pas une micro-optimisation,
   * c'est ce qui rend le décor réel jouable.
   *
   * React 19 ne compare plus le contenu de cette propriété : `updateProperties` ne regarde
   * que l'identité de l'objet (`lastProp !== nextProp`) et, si elle a changé, ré-applique
   * `setInnerHTML` sans regarder si la chaîne est la même. Un littéral `{{ __html: … }}`
   * écrit dans le JSX est un objet NEUF à chaque rendu : le markup était donc réinjecté à
   * chaque re-rendu, et tout ce que l'effet de décoration avait posé à la main disparaissait.
   *
   * Mesuré sur le décor réel (Chromium 151, `client/dist-test`) : 30 régions décorées au
   * montage, puis **0** une centaine de millisecondes plus tard — au premier re-rendu, celui
   * que `document.fonts.ready` déclenche en passant `data-test-pret` à `oui`. L'effet, lui,
   * ne se rejouait pas : ses dépendances n'avaient pas bougé.
   *
   * Ce que l'enfant perdait à ce moment précis : `role="button"`, `tabindex`, `aria-label`,
   * l'écouteur clavier, `data-peinte`, `data-couleur` — et le `fill`, c'est-à-dire **la
   * couleur qu'il venait de poser**. Le battement d'une seconde suffisait à effacer son
   * coloriage à l'écran. Trois suites l'ont vu en même temps (T3 parcours, T3 casse-cou,
   * T4 captures) ; aucune ne pouvait le voir sous happy-dom, où rien ne déclenche ce
   * re-rendu.
   */
  const contenuDecor = useMemo(
    () => (svgMarkup === null ? null : { __html: svgMarkup }),
    [svgMarkup]
  );

  const centroides = useMemo(() => {
    const table = new Map<string, readonly [number, number]>();
    for (const region of regionsDeclarees) table.set(region.id, region.centroide);
    return table;
  }, [regionsDeclarees]);

  /**
   * Désignation : le vrai chemin du décor d'abord. La tolérance circulaire n'existe que pour
   * le repli qui dessine précisément ces disques ; sur le décor réel elle transformerait les
   * trous et les interstices du SVG en réponses voisines.
   */
  const designer = useCallback(
    (cible: Element | null, point: readonly [number, number]): IdRegionSvg | null => {
      const noeud = cible !== null && typeof cible.closest === 'function'
        ? cible.closest('[data-region-svg], [data-region-source]')
        : null;
      const direct =
        noeud?.getAttribute('data-region-svg') ?? noeud?.getAttribute('data-region-source');
      if (
        typeof direct === 'string' &&
        direct.length > 0 &&
        (identifiantsActifs === null || identifiantsActifs.has(direct))
      ) return direct;
      if (svgMarkup !== null) return null;
      const approchee = regionSousLeDoigt(habillage, point);
      if (
        approchee === null ||
        (identifiantsActifs !== null && !identifiantsActifs.has(String(approchee)))
      ) return null;
      return approchee;
    },
    [habillage, identifiantsActifs, svgMarkup]
  );

  /** Résout la région du geste sans jamais s'approcher d'une cible inactive. */
  const regionDuGeste = useCallback(
    (evenement: PointerEventReact<SVGSVGElement>): { region: IdRegionSvg; point: readonly [number, number] } | null => {
      const svg = refSvg.current;
      if (svg === null) return null;
      const point = pointViewBox(svg, evenement.clientX, evenement.clientY, viewBox);
      let region = designer(evenement.target as Element | null, point);
      // Chromium tactile peut rediriger le contact d'un chemin fin vers le SVG parent.
      // Reprendre alors le pixel exact sous le doigt, jamais une proximité de centroïde.
      if (region === null && typeof document.elementFromPoint === 'function') {
        const sousDoigt = document.elementFromPoint(evenement.clientX, evenement.clientY);
        if (sousDoigt !== null && svg.contains(sousDoigt)) region = designer(sousDoigt, point);
      }
      return region === null ? null : { region, point };
    },
    [designer, viewBox]
  );

  const surPointerDown = useCallback(
    (evenement: PointerEventReact<SVGSVGElement>): void => {
      const geste = regionDuGeste(evenement);
      // `null` : le doigt est hors du dessin. Le tap est ignoré — pas de refus, pas
      // d'erreur, pas de son. Un doigt qui glisse ne coûte rien (contrat § 5.2).
      if (geste === null) return;
      if (!loupeActive) {
        refDernierPoint.current = geste.point;
        onPeindre(geste.region);
        return;
      }
      // En loupe, le navigateur doit pouvoir transformer ce contact en défilement. La
      // peinture est donc différée au pointerup et ne survit pas à un geste de 10 px ou plus.
      refGesteLoupe.current = {
        pointerId: evenement.pointerId,
        departX: evenement.clientX,
        departY: evenement.clientY,
        region: geste.region,
        deplace: false
      };
    },
    [loupeActive, onPeindre, regionDuGeste]
  );

  const surPointerMove = useCallback(
    (evenement: PointerEventReact<SVGSVGElement>): void => {
      const geste = refGesteLoupe.current;
      if (!loupeActive || geste === null || geste.pointerId !== evenement.pointerId || geste.deplace) return;
      const distance = Math.hypot(evenement.clientX - geste.departX, evenement.clientY - geste.departY);
      if (distance >= SEUIL_DEFILEMENT_LOUPE_PX) geste.deplace = true;
    },
    [loupeActive]
  );

  const surPointerUp = useCallback(
    (evenement: PointerEventReact<SVGSVGElement>): void => {
      const geste = refGesteLoupe.current;
      if (!loupeActive || geste === null || geste.pointerId !== evenement.pointerId) return;
      refGesteLoupe.current = null;
      const distanceFinale = Math.hypot(
        evenement.clientX - geste.departX,
        evenement.clientY - geste.departY
      );
      // Certains navigateurs cèdent le pointeur au défilement avant de livrer le dernier
      // `pointermove`. Le contrôle final garde la règle < 10 px même dans ce cas.
      if (geste.deplace || distanceFinale >= SEUIL_DEFILEMENT_LOUPE_PX) return;
      const svg = refSvg.current;
      if (svg !== null) {
        refDernierPoint.current = pointViewBox(svg, evenement.clientX, evenement.clientY, viewBox);
      }
      onPeindre(geste.region);
    },
    [loupeActive, onPeindre, viewBox]
  );

  const surPointerCancel = useCallback(
    (evenement: PointerEventReact<SVGSVGElement>): void => {
      const geste = refGesteLoupe.current;
      if (geste !== null && geste.pointerId === evenement.pointerId) refGesteLoupe.current = null;
    },
    []
  );

  /**
   * Peinture au clavier. Le centroïde vient de l'HABILLAGE : c'est lui qui donne son
   * origine au balayage radial de la recoloration, sur les deux décors indifféremment.
   */
  const peindreAuClavier = useCallback(
    (region: string | null): void => {
      if (region === null || region.length === 0) return;
      const centre = centroides.get(region);
      if (centre !== undefined) refDernierPoint.current = centre;
      onPeindre(region);
    },
    [centroides, onPeindre]
  );

  const surClavier = useCallback(
    (evenement: KeyboardEventReact<SVGElement>): void => {
      if (!toucheDeValidation(evenement.key)) return;
      evenement.preventDefault();
      peindreAuClavier(evenement.currentTarget.getAttribute('data-region-svg'));
    },
    [peindreAuClavier]
  );

  // Recoloration : balayage radial depuis le point touché, sur les régions qui viennent
  // d'être peintes. Idempotent — une région déjà traitée n'est pas rejouée.
  useEffect(() => {
    const svg = refSvg.current;
    if (svg === null) return;
    const precedents = refRemplissagesPrecedents.current;
    for (const [region, couleur] of Object.entries(remplissages)) {
      if (precedents[region] === couleur) continue;
      const element = svg.querySelector(`[data-region-source="${region}"]`);
      if (element === null) continue;
      void jouerRecoloration(element as SVGGraphicsElement, couleur, {
        origine: refDernierPoint.current,
        dureeMs: dureeRecolorationMs,
        desactivee: animationsDesactivees
      });
    }
    refRemplissagesPrecedents.current = { ...remplissages };
  }, [remplissages, dureeRecolorationMs, animationsDesactivees]);

  /**
   * DÉCOR DÉCLARATIF — le markup injecté ne connaît pas React : on lui pose à la main les
   * remplissages, les attributs `data-*`, le rôle, et **le gestionnaire clavier**.
   *
   * Ce dernier manquait, alors que `role="button"` et `tabindex="0"` étaient bien posés :
   * le décor réel s'annonçait actionnable au clavier et ne répondait à rien. axe-core ne
   * voit pas ce défaut — il contrôle la présence du rôle, pas celle du gestionnaire.
   *
   * L'écouteur est natif et par nœud, avec son ménage : une délégation sur la racine
   * doublerait le `onKeyDown` React de la branche de repli.
   *
   * LES CALQUES NON COLORIABLES SONT RENDUS TRANSPARENTS AU DOIGT — et c'est la moitié la
   * plus importante de cet effet. Le repli le fait depuis toujours (`pointerEvents: 'none'`
   * sur tout calque dont le rôle n'est pas `coloriable`) ; le décor réel, lui, ne le faisait
   * pas. Or le calque de trait est DESSUS : partout où une ligne du dessin traverse une
   * région — et un décor de coloriage en est fait —, c'était elle qui recevait le doigt.
   *
   * Ce que l'enfant perdait, précisément : l'appui `scale(.94)` de la v2 § 8 — le retour en
   * moins de 100 ms — ne se déclenchait pas, puisque `:active` s'applique à l'élément touché
   * et à ses ancêtres, et qu'un trait n'est pas l'ancêtre d'une région. Le curseur `pointer`
   * non plus. La peinture, elle, partait quand même : `surPointerDown` est posé sur la racine
   * `<svg>` et `designer` se rabat sur `regionSousLeDoigt` — mais sur l'APPROXIMATION en
   * disques, pas sur la forme réelle, donc au risque de nommer la région voisine.
   * Un décor où viser juste donne parfois la mauvaise région, sans aucun retour d'appui,
   * pour un enfant de 7 ans qui croit avoir mal visé : c'est exactement le contraire de R14.
   */
  useEffect(() => {
    const svg = refSvg.current;
    if (svg === null || svgMarkup === null) return undefined;

    // Un décor illustré est une image couleur : laisser les zones non actives transparentes
    // ne suffit donc absolument pas à montrer le « monde gris ». La grisaille appartient au
    // calque de base ; les chemins coloriables, posés au-dessus en mode `color`, révèlent ensuite
    // la teinte choisie sans effacer les ombres ni la texture du raster.
    for (const fondIllustre of svg.querySelectorAll('[data-fond-illustre]')) {
      const classes = fondIllustre.getAttribute('class') ?? '';
      fondIllustre.setAttribute(
        'class',
        `${classes} pierre-fond-illustre--gris`.trim()
      );
      fondIllustre.setAttribute('data-etat-couleur', 'gris');
    }

    // Même vocabulaire que le repli : chaque calque déclaré porte son rôle, et seul le rôle
    // `coloriable` reçoit le doigt.
    for (const calque of habillage.scene.calques) {
      // Même forme de sélecteur que la ligne des régions, plus bas : les `id` de calque
      // viennent de l'habillage, que `test:contenu` valide avant qu'il n'atteigne l'enfant.
      const groupe = svg.querySelector(`#${calque.id}`);
      if (groupe === null) continue;
      groupe.setAttribute('data-calque', calque.role);
      if (calque.role === 'coloriable') {
        // Les décors raster masquent volontairement la géométrie technique dans le fichier
        // source. Une fois montée dans le jeu, elle doit redevenir visible pour que la couleur
        // choisie apparaisse réellement au lieu de rester annulée par `opacity="0"` du parent.
        groupe.setAttribute('opacity', '1');
        (groupe as SVGGElement).style.opacity = '1';
      } else {
        (groupe as SVGGElement).style.pointerEvents = 'none';
      }
    }

    const selecteur = calquesColoriables.map((calque) => `#${calque.id} > [id]`).join(', ');
    if (selecteur.length === 0) return undefined;
    const noeuds = Array.from(svg.querySelectorAll(selecteur));
    const fondEstIllustre = svg.querySelector('[data-fond-illustre]') !== null;

    for (const noeud of noeuds) {
      const identifiant = noeud.getAttribute('id');
      if (identifiant === null) continue;
      const couleur = remplissages[identifiant];
      // Les SVG historiques portent déjà cet attribut sur la forme visible. Il désigne
      // désormais exclusivement la prise interactive transparente, afin qu'une région ne
      // soit annoncée qu'une fois aux technologies d'assistance et aux gardes de QA.
      noeud.removeAttribute('data-region-svg');
      noeud.setAttribute('data-region-source', identifiant);
      const active = identifiantsActifs === null || identifiantsActifs.has(identifiant);
      noeud.setAttribute('data-active', active ? 'oui' : 'non');
      noeud.setAttribute('data-peinte', couleur === undefined ? 'non' : 'oui');
      noeud.setAttribute('fill', couleur === undefined ? REMPLISSAGE_VIDE : hexDeCouleur(couleur));
      // Sur les décors illustrés, seules les régions déjà réussies reçoivent un aplat. Le
      // mélange `color` conserve les ombres et le trait de l'image. Les anciennes zones de
      // blockout et la cible encore vierge restent ainsi invisibles.
      // Avant la réussite, seul le contour de la prise guide le doigt. Afficher ici le gris
      // bleuté de `REMPLISSAGE_VIDE` donnait l'impression que la réponse était déjà coloriée.
      (noeud as SVGGraphicsElement).style.opacity = couleur !== undefined ? '0.92' : '0';
      // « color » conserve la luminosité du raster : sur le gris, peindre en noir/blanc
      // pouvait donc ne rien changer. Les couleurs neutres modifient aussi la valeur.
      (noeud as SVGGraphicsElement).style.mixBlendMode = couleur === 'noir' ? 'multiply'
        : couleur === 'blanc' ? 'screen' : couleur === 'gris' ? 'normal' : 'color';
      // `fill` respecte la géométrie exacte du path, y compris `fill-rule="evenodd"` et ses
      // trous. Les prises circulaires accessibles, rendues plus bas, ne reçoivent pas le doigt.
      (noeud as SVGGraphicsElement).style.pointerEvents = active ? 'fill' : 'none';
      // Le trait technique d'un masque ne fait pas partie du PNG. Le laisser visible après
      // la réussite dessinait une bordure vectorielle bleue autour du motif peint.
      if (fondEstIllustre) (noeud as SVGGraphicsElement).style.stroke = 'none';
      noeud.classList.add('pierre-region');
      if (couleur === undefined) noeud.removeAttribute('data-couleur');
      else noeud.setAttribute('data-couleur', couleur);
      noeud.classList.toggle('pierre-region--demonstration', identifiant === regionEnDemonstration);
    }

    return undefined;
  }, [
    svgMarkup,
    habillage,
    remplissages,
    regionEnDemonstration,
    calquesColoriables,
    peindreAuClavier,
    identifiantsActifs
  ]);

  /**
   * REFUS SUR LE DÉCOR DÉCLARATIF — le seul retour d'erreur du jeu (décision D16) : la
   * couleur ne prend pas et la région oscille de 6 px. Pas de rouge, pas de son négatif.
   *
   * Effet séparé, et qui dépend de `marqueRefus` : deux refus de suite sur la MÊME région
   * doivent rejouer l'animation. Retirer puis reposer la classe ne suffit pas — le
   * navigateur regroupe les deux dans le même cycle de style ; la lecture de la boîte
   * force le recalcul entre les deux.
   */
  useEffect(() => {
    const svg = refSvg.current;
    if (svg === null || svgMarkup === null) return;
    for (const noeud of svg.querySelectorAll('.pierre-region--refus')) {
      noeud.classList.remove('pierre-region--refus');
    }
    if (regionEnRefus === null) return;
    const cibles = svg.querySelectorAll(
      `[data-region-source="${regionEnRefus}"], [data-region-svg="${regionEnRefus}"]`
    );
    if (cibles.length === 0) return;
    const cibleVisible = cibles[0];
    if (
      cibleVisible !== undefined &&
      typeof (cibleVisible as SVGGraphicsElement).getBoundingClientRect === 'function'
    ) {
      void (cibleVisible as SVGGraphicsElement).getBoundingClientRect();
    }
    for (const cible of cibles) cible.classList.add('pierre-region--refus');
  }, [svgMarkup, regionEnRefus, marqueRefus]);

  return (
    <svg
      ref={refSvg}
      className={`pierre-scene${animationsDesactivees ? ' pierre-scene--calme' : ''}`}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      role="group"
      aria-label={habillage.libelle}
      data-habillage={habillage.id}
      data-decor={svgMarkup === null ? 'repli' : 'habillage'}
      onPointerDown={surPointerDown}
      onPointerMove={loupeActive ? surPointerMove : undefined}
      onPointerUp={loupeActive ? surPointerUp : undefined}
      onPointerCancel={loupeActive ? surPointerCancel : undefined}
      style={{
        width: '100%',
        height: 'auto',
        maxWidth: `min(100%, calc((100dvh - 19rem) * ${String(rapportViewBox)}))`,
        maxHeight: 'calc(100dvh - 19rem)',
        alignSelf: 'center',
        flex: '0 1 auto',
        touchAction: loupeActive ? 'pan-x pan-y' : 'manipulation'
      }}
    >
      <style>{STYLES_SCENE}</style>

      {contenuDecor !== null ? (
        <>
          <g
            data-calque="habillage"
            // Le SVG de l'habillage est un asset local du dépôt, validé par
            // `test:contenu` avant d'atteindre l'enfant ; il ne vient d'aucun réseau.
            // `contenuDecor` est MÉMORISÉ — voir son commentaire : un littéral ici
            // réinjecterait le markup à chaque rendu et effacerait le coloriage.
            dangerouslySetInnerHTML={contenuDecor}
          />
          <g data-calque="prises" aria-label="Zones à colorier">
            {regionsDeclarees.map((region) => {
              const couleur = remplissages[region.id];
              const active = regionsActives === undefined || regionsActives.includes(region.id);
              return (
                <CercleAccessible
                  key={`prise-${region.id}`}
                  className={`pierre-prise-colorie${
                    region.id === regionEnRefus ? ' pierre-region--refus' : ''
                  }${
                    region.id === regionEnDemonstration
                      ? ' pierre-region--demonstration'
                      : ''
                  }`}
                  cx={region.centroide[0]}
                  cy={region.centroide[1]}
                  rayonMinimal={rayonPrise}
                  data-region-svg={region.id}
                  data-active={active ? 'oui' : 'non'}
                  data-peinte={couleur === undefined ? 'non' : 'oui'}
                  aria-disabled={!active}
                  {...(couleur === undefined ? {} : { 'data-couleur': couleur })}
                  aria-label={region.libelle}
                  role="button"
                  tabIndex={active ? 0 : -1}
                  style={{ pointerEvents: 'none' }}
                  // Un lecteur d'écran active un bouton par un `click` synthétique. Le doigt,
                  // lui, traverse cette prise et atteint exclusivement le vrai path dessous.
                  onClick={() => {
                    refDernierPoint.current = region.centroide;
                    onPeindre(region.id);
                  }}
                  onKeyDown={surClavier}
                />
              );
            })}
          </g>
        </>
      ) : (
        habillage.scene.calques.map((calque) => (
          <g
            key={calque.id}
            id={calque.id}
            data-calque={calque.role}
            {...(calque.role === 'coloriable' ? {} : { pointerEvents: 'none' as const })}
          >
            {calque.role === 'coloriable'
              ? calque.regions.map((region) => {
                  const couleur = remplissages[region.id];
                  const classes = ['pierre-region'];
                  if (region.id === regionEnDemonstration) {
                    classes.push('pierre-region--demonstration');
                  }
                  if (region.id === regionEnRefus) classes.push('pierre-region--refus');
                  return (
                    <CercleAccessible
                      // La clé porte `marqueRefus` : un second refus sur la même région
                      // remonte l'élément, seul moyen de rejouer l'animation en React.
                      key={`${region.id}-${region.id === regionEnRefus ? marqueRefus : 0}`}
                      id={region.id}
                      className={classes.join(' ')}
                      cx={region.centroide[0]}
                      cy={region.centroide[1]}
                      // Le repli est visible pendant le chargement asynchrone du décor réel.
                      // `CercleAccessible` conserve ses 66 px CSS même si la loupe compacte
                      // provisoirement la scène avant l'arrivée de l'asset.
                      rayonMinimal={Math.max(rayonEquivalent(region.surface), rayonPrise)}
                      fill={couleur === undefined ? REMPLISSAGE_VIDE : hexDeCouleur(couleur)}
                      stroke={TRAIT}
                      strokeWidth={4}
                      data-region-svg={region.id}
                      data-peinte={couleur === undefined ? 'non' : 'oui'}
                      data-couleur={couleur}
                      role="button"
                      tabIndex={0}
                      aria-label={region.libelle}
                      onKeyDown={surClavier}
                    />
                  );
                })
              : null}
          </g>
        ))
      )}
    </svg>
  );
}
