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

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  /** Le SVG déclaratif de l'habillage. `null` → décor de repli dérivé. */
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
    svgMarkup,
    onPeindre
  } = proprietes;

  const refSvg = useRef<SVGSVGElement | null>(null);
  const refDernierPoint = useRef<readonly [number, number]>([0, 0]);
  const refRemplissagesPrecedents = useRef<Readonly<Record<string, CouleurColoriage>>>({});

  const viewBox = habillage.scene.viewBox || VIEWBOX_PAR_DEFAUT;
  const dureeRecolorationMs = habillage.timings.recolorationMs;

  /** Les calques coloriables, seule source de régions — aucune table interne. */
  const calquesColoriables = useMemo(
    () => habillage.scene.calques.filter((calque) => calque.role === 'coloriable'),
    [habillage]
  );

  const regionsDeclarees = useMemo<readonly RegionColoriable[]>(
    () => calquesColoriables.flatMap((calque) => calque.regions),
    [calquesColoriables]
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

  const libelles = useMemo(() => {
    const table = new Map<string, string>();
    for (const region of regionsDeclarees) table.set(region.id, region.libelle);
    return table;
  }, [regionsDeclarees]);

  const centroides = useMemo(() => {
    const table = new Map<string, readonly [number, number]>();
    for (const region of regionsDeclarees) table.set(region.id, region.centroide);
    return table;
  }, [regionsDeclarees]);

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

    // Même vocabulaire que le repli : chaque calque déclaré porte son rôle, et seul le rôle
    // `coloriable` reçoit le doigt.
    for (const calque of habillage.scene.calques) {
      // Même forme de sélecteur que la ligne des régions, plus bas : les `id` de calque
      // viennent de l'habillage, que `test:contenu` valide avant qu'il n'atteigne l'enfant.
      const groupe = svg.querySelector(`#${calque.id}`);
      if (groupe === null) continue;
      groupe.setAttribute('data-calque', calque.role);
      if (calque.role !== 'coloriable') {
        (groupe as SVGGElement).style.pointerEvents = 'none';
      }
    }

    const selecteur = calquesColoriables.map((calque) => `#${calque.id} > [id]`).join(', ');
    if (selecteur.length === 0) return undefined;
    const noeuds = Array.from(svg.querySelectorAll(selecteur));

    const surTouche = (evenement: Event): void => {
      const clavier = evenement as globalThis.KeyboardEvent;
      if (!toucheDeValidation(clavier.key)) return;
      evenement.preventDefault();
      peindreAuClavier((evenement.currentTarget as Element).getAttribute('data-region-svg'));
    };

    for (const noeud of noeuds) {
      const identifiant = noeud.getAttribute('id');
      if (identifiant === null) continue;
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
      noeud.addEventListener('keydown', surTouche);
    }

    return () => {
      for (const noeud of noeuds) noeud.removeEventListener('keydown', surTouche);
    };
  }, [
    svgMarkup,
    habillage,
    remplissages,
    libelles,
    regionEnDemonstration,
    calquesColoriables,
    peindreAuClavier
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
    const cible = svg.querySelector(`[data-region-svg="${regionEnRefus}"]`);
    if (cible === null) return;
    if (typeof (cible as SVGGraphicsElement).getBoundingClientRect === 'function') {
      void (cible as SVGGraphicsElement).getBoundingClientRect();
    }
    cible.classList.add('pierre-region--refus');
  }, [svgMarkup, regionEnRefus, marqueRefus]);

  return (
    <svg
      ref={refSvg}
      className={`pierre-scene${animationsDesactivees ? ' pierre-scene--calme' : ''}`}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      role="group"
      aria-label={habillage.libelle}
      data-habillage={habillage.id}
      data-decor={svgMarkup === null ? 'repli' : 'habillage'}
      onPointerDown={surPointerDown}
      style={{ width: '100%', height: 'auto', touchAction: 'manipulation' }}
    >
      <style>{STYLES_SCENE}</style>

      {contenuDecor !== null ? (
        <g
          data-calque="habillage"
          // Le SVG de l'habillage est un asset local du dépôt, validé par
          // `test:contenu` avant d'atteindre l'enfant ; il ne vient d'aucun réseau.
          // `contenuDecor` est MÉMORISÉ — voir son commentaire : un littéral ici
          // réinjecterait le markup à chaque rendu et effacerait le coloriage.
          dangerouslySetInnerHTML={contenuDecor}
        />
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
                    <circle
                      // La clé porte `marqueRefus` : un second refus sur la même région
                      // remonte l'élément, seul moyen de rejouer l'animation en React.
                      key={`${region.id}-${region.id === regionEnRefus ? marqueRefus : 0}`}
                      id={region.id}
                      className={classes.join(' ')}
                      cx={region.centroide[0]}
                      cy={region.centroide[1]}
                      r={rayonEquivalent(region.surface)}
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
