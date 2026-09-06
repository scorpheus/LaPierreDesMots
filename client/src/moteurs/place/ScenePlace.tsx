/**
 * `ScenePlace` — le décor, ses zones cibles et les éléments déjà posés. Lot L2-C.
 *
 * Ce fichier ne connaît AUCUN décor : ni forme, ni libellé, ni coordonnée. Tout vient de
 * `contenu.zones` et de `habillage.scene` — c'est la traduction littérale de « zéro ligne de
 * code par habillage » (v2 § 7). Un second habillage `place` n'ajoute pas une ligne ici.
 *
 * LA ZONE EST SON POLYGONE, et c'est la différence de fond avec `colorie`.
 * `RegionColoriable` ne transporte que centroïde et surface, d'où l'approximation par disque
 * de même aire du contrat v1 § 5.2. `ZoneCible` transporte son **polygone fermé** : la forme
 * dessinée sous le doigt et la forme que `zoneSousLeDoigt` interroge sont donc la MÊME, par
 * construction. Aucune divergence de géométrie n'est possible.
 *
 * DEUX CHEMINS POUR POSER UN ÉLÉMENT, et le premier est le principal :
 *   1. **taper la réserve, puis taper la zone.** Aucune coordination fine (R16).
 *   2. glisser-déposer, par dnd-kit, pour ceux que ça amuse.
 * Les deux émettent exactement les mêmes actions. Un enfant qui ne sait pas maintenir un
 * doigt pendant deux secondes ne doit pas être empêché de jouer.
 */

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as KeyboardEventReact, ReactElement } from 'react';
import { useDroppable } from '@dnd-kit/core';
// Le client n'emprunte JAMAIS l'alias `@partage` (réservé aux tests, contrat v1 § 11.3) :
// tout passe par le barillet, et le barillet n'accueille que des TYPES (C1). Ces cinq
// symboles y sont déclarés par L2-D au § 4.7 ; aucune valeur n'est importée d'ici, donc
// aucun octet n'entre dans le bundle par cette ligne.
import type { ContenuPlace, Habillage, Point, ZoneCible } from '@pierre/partage';
import { urlAsset } from '../../api/client.js';

/**
 * `IdElement` et `IdZoneCible` ne figurent pas dans les additions au barillet (§ 4.7) — ce
 * sont de simples alias de `string` (écart v1 n° 6 : aucun marquage nominal). On les
 * redéclare localement plutôt que d'exiger deux lignes de plus à L2-D, sans rien changer
 * au typage réel.
 */
type IdElement = string;
type IdZoneCible = string;

const TRAIT = 'var(--trait, #1B2440)';
const ZONE_LIBRE = 'var(--zone-libre, rgba(27, 36, 64, 0.06))';
const ZONE_VISEE = 'var(--zone-visee, rgba(27, 36, 64, 0.16))';

/** Repli si l'habillage ne déclare aucun `viewBox` — neutre, jamais emprunté à un décor. */
export const VIEWBOX_PAR_DEFAUT = '0 0 100 100';

/** Taille de repli avant mesure ; les unités SVG ne sont pas des pixels CSS. */
const COTE_PRISE_MINIMAL = 80;

export interface ProprietesScenePlace {
  readonly contenu: ContenuPlace;
  readonly habillage: Habillage;
  /** Clé = `IdElement`, valeur = `IdZoneCible`. Un élément posé l'est définitivement (R14). */
  readonly places: Readonly<Record<string, IdZoneCible>>;
  readonly elementSaisi: IdElement | null;
  readonly zoneEnDemonstration: IdZoneCible | null;
  readonly zoneEnRefus: IdZoneCible | null;
  /** Instant du dernier refus : change à chaque refus, ce qui relance l'oscillation. */
  readonly marqueRefus: number;
  readonly animationsDesactivees: boolean;
  /** Corps du SVG d'habillage, sans sa balise racine. `null` → décor dérivé des polygones. */
  readonly svgMarkup: string | null;
  onDeposer(point: Point): void;
}

function pointsSvg(zone: ZoneCible): string {
  return zone.polygone.map(([x, y]) => `${x},${y}`).join(' ');
}

/**
 * Une zone cible. `useDroppable` la branche sur dnd-kit ; le `onClick` tient le chemin
 * tap-tap, qui reste le chemin principal (R16).
 */
function Zone(proprietes: {
  readonly zone: ZoneCible;
  readonly occupee: boolean;
  readonly enDemonstration: boolean;
  readonly enRefus: boolean;
  readonly marqueRefus: number;
  readonly animationsDesactivees: boolean;
  readonly cotePrise: number;
  readonly viewBox: string;
  onTaper(point: Point): void;
}): ReactElement {
  const { zone, occupee, enDemonstration, enRefus, marqueRefus, animationsDesactivees, onTaper } =
    proprietes;
  const { setNodeRef, isOver } = useDroppable({ id: zone.id });
  const [minX = 0, minY = 0, largeurVue = 100, hauteurVue = 100] = proprietes.viewBox.split(/[\s,]+/u).map(Number);
  const largeurPrise = Math.min(proprietes.cotePrise, largeurVue);
  const hauteurPrise = Math.min(proprietes.cotePrise, hauteurVue);
  // Le ciel est proche du bord supérieur : grandir autour du seul centroïde peut encore
  // rogner la moitié de la prise. Garder toute sa surface à l'intérieur du dessin.
  const xPrise = Math.max(minX, Math.min(zone.centroide[0] - largeurPrise / 2, minX + largeurVue - largeurPrise));
  const yPrise = Math.max(minY, Math.min(zone.centroide[1] - hauteurPrise / 2, minY + hauteurVue - hauteurPrise));

  /**
   * dnd-kit type sa `ref` sur `HTMLElement` ; une zone cible est un groupe SVG, donc un
   * `SVGGElement`. On adapte par une `ref` de rappel plutôt que par un transtypage
   * défensif : le `SVGGElement` EST un `Element`, la bibliothèque n'en demande pas
   * davantage à l'exécution, et le compilateur continue de protéger le reste du composant.
   */
  const brancher = useCallback(
    (noeud: SVGGElement | null) => {
      setNodeRef(noeud as Element as HTMLElement | null);
    },
    [setNodeRef],
  );

  const taper = useCallback(() => {
    onTaper(zone.centroide);
  }, [onTaper, zone]);

  const auClavier = useCallback(
    (evenement: KeyboardEventReact<SVGGElement>) => {
      if (evenement.key !== 'Enter' && evenement.key !== ' ') return;
      evenement.preventDefault();
      onTaper(zone.centroide);
    },
    [onTaper, zone],
  );

  return (
    <g
      ref={brancher}
      data-zone-cible={zone.id}
      data-zone-etat={occupee ? 'occupee' : 'libre'}
      data-relation={zone.relation}
      // Le refus est une OSCILLATION, jamais une couleur : pas de rouge, jamais (R14).
      data-refus={enRefus ? String(marqueRefus) : undefined}
      role="button"
      tabIndex={0}
      aria-label={zone.libelle}
      style={{ cursor: 'pointer' }}
      onClick={taper}
      onKeyDown={auClavier}
    >
      {/* Le rectangle ne peint rien : il agrandit seulement la boîte de frappe du groupe.
          Le toit de l'école mesurait 60 px de haut dans le navigateur, malgré un polygone
          parfaitement visible. */}
      <rect
        x={xPrise}
        y={yPrise}
        width={largeurPrise}
        height={hauteurPrise}
        fill="transparent"
        stroke="none"
        pointerEvents="all"
        data-cible-frappe="oui"
        aria-hidden="true"
      />
      <polygon
        points={pointsSvg(zone)}
        fill={isOver || enDemonstration ? ZONE_VISEE : ZONE_LIBRE}
        stroke={TRAIT}
        strokeWidth={enDemonstration && !animationsDesactivees ? 3 : 1.5}
        strokeDasharray={occupee ? undefined : '6 5'}
        aria-hidden="true"
      />
    </g>
  );
}

export function ScenePlace(proprietes: ProprietesScenePlace): ReactElement {
  const {
    contenu,
    habillage,
    places,
    zoneEnDemonstration,
    zoneEnRefus,
    marqueRefus,
    animationsDesactivees,
    svgMarkup,
    onDeposer,
  } = proprietes;

  const viewBox = habillage.scene.viewBox || VIEWBOX_PAR_DEFAUT;
  const scene = useRef<SVGSVGElement | null>(null);
  const [cotePrise, fixerCotePrise] = useState(COTE_PRISE_MINIMAL);
  useLayoutEffect(() => {
    const svg = scene.current;
    if (svg === null) return undefined;
    const [, , largeur = 100, hauteur = 100] = viewBox.split(/[\s,]+/u).map(Number);
    const mesurer = (): void => {
      const cadre = svg.getBoundingClientRect();
      const echelle = Math.min(cadre.width / largeur, cadre.height / hauteur);
      if (Number.isFinite(echelle) && echelle > 0) fixerCotePrise(Math.max(COTE_PRISE_MINIMAL, 66 / echelle));
    };
    mesurer();
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(svg);
    return () => observateur.disconnect();
  }, [viewBox]);

  const occupees = useMemo(() => new Set(Object.values(places)), [places]);
  const parZone = useMemo(() => {
    const carte = new Map<IdZoneCible, IdElement>();
    for (const [element, zone] of Object.entries(places)) carte.set(zone, element);
    return carte;
  }, [places]);
  const reserveParId = useMemo(
    () => new Map(contenu.reserve.map((e) => [e.id, e])),
    [contenu],
  );

  return (
    <svg
      ref={scene}
      data-scene="place"
      viewBox={viewBox}
      // ── `group`, ET NON `img` ────────────────────────────────────────────────────────
      // `role="img"` déclare un contenu ATOMIQUE : un lecteur d'écran n'annonce alors que
      // l'étiquette et n'entre pas dedans. Or cette scène CONTIENT les cibles que l'enfant
      // doit taper — la règle `nested-interactive` d'axe-core l'a relevé, en `serious`, dès
      // que l'audit d'accessibilité a réellement atteint le nœud `clairiere-04` :
      //
      //     nested-interactive (serious) × 1   sur svg[data-scene="place"]
      //
      // Conséquence concrète : les emplacements du moteur `place` étaient invisibles à la
      // navigation assistée, alors qu'ils sont tout l'exercice. `role="group"` garde
      // l'étiquette du décor et rend ses enfants atteignables.
      role="group"
      aria-label={habillage.libelle}
      style={{ touchAction: 'none' }}
    >
      {svgMarkup === null ? null : (
        // Décor déclaratif de l'habillage. Nettoyé de tout script par l'hôte avant injection.
        <g data-decor="habillage" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      )}

      <g data-calque="zones">
        {contenu.zones.map((zone) => (
          <Zone
            key={zone.id}
            zone={zone}
            occupee={occupees.has(zone.id)}
            enDemonstration={zoneEnDemonstration === zone.id}
            enRefus={zoneEnRefus === zone.id}
            marqueRefus={marqueRefus}
            animationsDesactivees={animationsDesactivees}
            cotePrise={cotePrise}
            viewBox={viewBox}
            onTaper={onDeposer}
          />
        ))}
      </g>

      <g data-calque="poses">
        {contenu.zones.map((zone) => {
          const element = parZone.get(zone.id);
          if (element === undefined) return null;
          const modele = reserveParId.get(element);
          if (modele === undefined) return null;
          const [largeur, hauteur] = modele.taille;
          return (
            <g key={zone.id} data-pose={element} data-pose-zone={zone.id}>
              <rect
                x={zone.centroide[0] - largeur / 2}
                y={zone.centroide[1] - hauteur / 2}
                width={largeur}
                height={hauteur}
                rx={Math.min(largeur, hauteur) / 6}
                fill="rgba(255, 255, 255, 0.82)"
                stroke={TRAIT}
                strokeWidth={1.5}
              />
              <image
                data-dessin-pose={element}
                href={urlAsset(modele.asset)}
                x={zone.centroide[0] - largeur / 2 + 4}
                y={zone.centroide[1] - hauteur / 2 + 4}
                width={largeur - 8}
                height={hauteur - 8}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              />
              <title>{modele.libelle}</title>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
