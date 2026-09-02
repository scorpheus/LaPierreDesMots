/**
 * `SceneLibre` — le décor tapable du coloriage sans consigne. Lot L2-E, mise en scène.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE `MoteurLibre` RENDAIT AVANT CE FICHIER, MESURÉ SUR LE CODE (pas une capture) :
 *
 *     <button data-region-svg="grande-paroi">grande-paroi</button>
 *     <button data-region-svg="petite-paroi">petite-paroi</button>
 *     ...
 *
 * Le nom BRUT de chaque région, en texte, dans une liste qui empile verticalement. AUCUN SVG,
 * aucune forme, aucune couleur posée : « peindre » n'avait ni pinceau ni toile. C'est le
 * moteur qui a le plus besoin de la mise en scène, et c'était le seul des quatorze où le
 * décor n'existait sous AUCUNE forme, pas même à 14 % — parce qu'aucun habillage n'était
 * jamais lu, seul son `id` de région traversait le texte du bouton.
 *
 * ── DEUX SOURCES DE DÉCOR, UNE SEULE GÉOMÉTRIE (repris de `colorie/SceneSvg.tsx`) ────────────
 *   1. `svgMarkup` chargé : l'illustration déclarative de l'habillage.
 *   2. `svgMarkup` absent (asset manquant, ou réseau indisponible — c'est le cas sous les
 *      tests de composant, qui ne chargent aucun asset) : un repli DÉRIVÉ de l'habillage, un
 *      disque par région, au centroïde déclaré, de rayon équivalent à sa surface. C'est ce
 *      chemin que `tests/composants/MoteurLibre.test.tsx` exerce : il tape
 *      `[data-region-svg="flamme"]` sans qu'aucun fichier `.svg` n'ait été chargé.
 *
 * ── POURQUOI `preserveAspectRatio="xMidYMid meet"`, ET NON `slice` COMME `phrase` ────────────
 * `phrase` couvre (`slice`) parce que son décor est un FOND : ce qui compte, ce sont les mots,
 * et une région hors champ ne prive l'enfant de rien puisqu'aucun mot n'y est jamais posé
 * (`regionsVisibles` les écarte déjà). Ici le décor EST le jeu : chaque région coloriable doit
 * rester ATTEIGNABLE, sans quoi peindre « comme on veut » perdrait justement les régions que
 * l'enfant a choisi de peindre. `meet` (contenir) garantit que la toile entière reste visible et
 * tapable, quitte à laisser une marge de chaque côté plutôt que de rogner une couleur.
 *
 * ── LES RÉGIONS HORS DE `contenu.regions` RESTENT DESSINÉES, JAMAIS TAPABLES ──────────────────
 * « Toutes, toujours : rien n'est verrouillé » (`ContenuLibre`, à la lettre) vaut pour les
 * régions QUE L'EXERCICE OFFRE. L'habillage peut en déclarer davantage — `paroi-libre` en
 * déclare neuf, l'exercice n'en offre que six — et les trois de trop restent à l'écran, dans
 * leur couleur neutre, pour que le dessin garde son sens (un mur sans son sol serait un défaut
 * visuel, pas une consigne). Elles ne reçoivent ni `role="button"`, ni gestionnaire : un doigt
 * qui s'y pose ne fait rien, silencieusement — jamais un refus, ce moteur n'en a aucun.
 *
 * ── ZÉRO LIGNE PAR HABILLAGE ────────────────────────────────────────────────────────────────
 * Ce fichier ne connaît ni forme, ni couleur, ni coordonnée : tout vient de
 * `habillage.scene.calques` et de la couleur choisie par l'enfant (`CouleurColoriage`), jamais
 * d'une table propre à un décor.
 *
 * ⚠ CE QUE CE LOT SIGNALE AU RAPPORT, ET NE CORRIGE PAS LUI-MÊME : mesuré sur
 * `galeries.paroi-libre` (les six régions offertes par `galeries-paroi-libre-01.json`), à
 * l'hypothèse de cadre portrait 928×886 de `Docs/decision-decor-de-fond-et-mots-poses.md`,
 * UNE région — « la goutte de pluie » (surface 2 415,9) — rend un disque de ~54 px de diamètre,
 * sous les 64 px de R16. C'est le même conflit que `colorie` porte déjà (21 régions sous 64 px)
 * : la règle des 64 px gagne, la dette est chiffrée, pas rabotée.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as KeyboardEventReact, MouseEvent as MouseEventReact, ReactElement } from 'react';
import type { CouleurColoriage, Habillage, IdRegionSvg, RegionColoriable } from '@pierre/partage';
import { hexDeCouleur } from '@pierre/partage';

import { chargerSceneHabillage } from '../../habillages/chargeur.js';
import { corpsDuSvg } from '../../habillages/SceneDecor.js';
import { SceneRasterIndexee } from './SceneRasterIndexee.js';

/** Région non encore peinte. Même jeton que `colorie/SceneSvg.tsx`. */
const REMPLISSAGE_VIDE = 'var(--region-vide, #D9DEE7)';
const TRAIT = 'var(--trait, #1B2440)';

/** Repli si l'habillage ne déclare aucun `viewBox` — jamais emprunté à un décor particulier. */
const VIEWBOX_PAR_DEFAUT = '0 0 100 100';

/**
 * 80 unités gardent une prise d'au moins 64 px quand la scène de 960 unités est contenue dans
 * les 800 px utiles de la tablette en portrait. Le dessin reste inchangé : seul le disque de
 * frappe transparent grandit.
 */
// À corps de lecture maximal, la scène est réduite à environ 72,5 % sur la tablette de
// référence. 88 unités n'y donneraient que 64 px tout juste ; 96 garde une marge réelle sans
// modifier le dessin, puisque ce disque reste transparent.
const DIAMETRE_PRISE_MINIMAL = 96;

/** Rayon du disque de repli, de même aire que la région déclarée (mêmes maths que `colorie`). */
function rayonEquivalent(surface: number): number {
  return Math.sqrt(Math.max(surface, 0) / Math.PI);
}

const STYLES_SCENE = `
.pierre-scene-libre { cursor: default; touch-action: manipulation; }
.pierre-region-libre {
  cursor: pointer;
  transform-box: fill-box;
  transform-origin: center;
  transition: fill 150ms linear, transform 400ms cubic-bezier(.34, 1.56, .64, 1);
}
.pierre-region-libre:active { transform: scale(.94); transition: transform 60ms ease-out; }
.pierre-region-libre:focus-visible { outline: 3px solid var(--soleil, #FFC93C); outline-offset: 2px; }
.pierre-prise-libre { cursor: pointer; fill: transparent; pointer-events: all; }
.pierre-prise-libre:focus-visible { outline: 3px solid var(--soleil, #FFC93C); outline-offset: 2px; }
.pierre-scene-libre--calme .pierre-region-libre { transition: none; }
@media (prefers-reduced-motion: reduce) { .pierre-region-libre { transition: none; } }
`;

export interface ProprietesSceneLibre {
  readonly habillage: Habillage;
  /** Les régions que CET exercice offre — `contenu.regions`. Les seules qui répondent au doigt. */
  readonly regionsOffertes: readonly IdRegionSvg[];
  /**
   * Clé = région, valeur = couleur posée. Typé comme `EtatLibre.acquis` (chaîne, pas
   * `CouleurColoriage`) : le réducteur ne resserre pas ce type, et une région inconnue de
   * `hexDeCouleur` retombe sur le jeton `soleil` plutôt que de lever (même garde que
   * `couleurDeRegion`, `client/src/habillages/emplacements.ts`).
   */
  readonly remplissages: Readonly<Record<string, string>>;
  readonly animationsDesactivees: boolean;
  onColorier(region: IdRegionSvg, evenement: { clientX: number; clientY: number }): void;
}

function toucheDeValidation(touche: string): boolean {
  return touche === 'Enter' || touche === ' ';
}

function SceneLibreSvg({
  habillage,
  regionsOffertes,
  remplissages,
  animationsDesactivees,
  onColorier,
}: ProprietesSceneLibre): ReactElement {
  const [svgMarkup, fixerSvgMarkup] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    void chargerSceneHabillage(habillage)
      .then((texte) => {
        if (vivant) fixerSvgMarkup(corpsDuSvg(texte));
      })
      .catch(() => {
        // Un décor absent n'est pas une erreur de jeu (même convention que `colorie` et
        // `SceneDecor`) : le repli dérivé prend le relais, silencieusement.
        if (vivant) fixerSvgMarkup(null);
      });
    return () => {
      vivant = false;
    };
  }, [habillage]);

  const viewBox = habillage.scene.viewBox || VIEWBOX_PAR_DEFAUT;
  const offertes = useMemo(() => new Set<string>(regionsOffertes.map(String)), [regionsOffertes]);

  const calquesColoriables = useMemo(
    () => habillage.scene.calques.filter((c) => c.role === 'coloriable'),
    [habillage],
  );
  const regionsDeclarees = useMemo<readonly RegionColoriable[]>(
    () => calquesColoriables.flatMap((c) => c.regions),
    [calquesColoriables],
  );
  const libelles = useMemo(() => {
    const table = new Map<string, string>();
    for (const r of regionsDeclarees) table.set(r.id, r.libelle);
    return table;
  }, [regionsDeclarees]);

  const contenuDecor = useMemo(
    () => (svgMarkup === null ? null : { __html: svgMarkup }),
    [svgMarkup],
  );

  const refSvg = useRef<SVGSVGElement | null>(null);

  /**
   * DÉCOR RÉEL — pose les attributs et le clavier sur le markup injecté (`dangerouslySetInnerHTML`
   * ne connaît pas React). Reprend le procédé de `colorie/SceneSvg.tsx` § « décor déclaratif »,
   * qui documente déjà pourquoi les calques non coloriables doivent devenir `pointerEvents: none`
   * (le calque de trait est dessus, sans quoi il vole le doigt à la région qu'il borde).
   */
  useEffect(() => {
    const svg = refSvg.current;
    if (svg === null || svgMarkup === null) return undefined;

    for (const calque of habillage.scene.calques) {
      const groupe = svg.querySelector(`#${calque.id}`);
      if (groupe === null) continue;
      groupe.setAttribute('data-calque', calque.role);
      if (calque.role !== 'coloriable') {
        (groupe as SVGGElement).style.pointerEvents = 'none';
      }
    }

    const selecteur = calquesColoriables.map((c) => `#${c.id} > [id]`).join(', ');
    if (selecteur.length === 0) return undefined;
    const noeuds = Array.from(svg.querySelectorAll(selecteur));

    for (const noeud of noeuds) {
      const id = noeud.getAttribute('id');
      if (id === null) continue;
      const tapable = offertes.has(id);
      const couleur = remplissages[id];
      noeud.setAttribute('data-region-source', id);
      noeud.setAttribute('data-peinte', couleur === undefined ? 'non' : 'oui');
      noeud.setAttribute(
        'fill',
        couleur === undefined ? REMPLISSAGE_VIDE : hexDeCouleur(couleur as CouleurColoriage),
      );
      noeud.classList.add('pierre-region-libre');
      (noeud as SVGElement).style.pointerEvents = tapable ? 'auto' : 'none';
      // La forme peinte reste sensible au doigt sur toute sa surface, mais la commande
      // accessible est le disque transparent de 96 unités rendu plus bas. Exposer le petit
      // tracé lui-même recréait une cible de 35 px pour « la goutte de pluie ».
      noeud.removeAttribute('role');
      noeud.removeAttribute('tabindex');
      noeud.removeAttribute('aria-label');
    }
    return undefined;
  }, [svgMarkup, habillage, remplissages, offertes, calquesColoriables]);

  /**
   * Un seul gestionnaire, à la racine — le DOM d'abord (`closest`), jamais de géométrie : ce
   * moteur n'a pas de tolérance de visée à calculer, la région tapée EST la région désignée.
   * Fonctionne identiquement sur le décor réel (attributs posés ci-dessus) et sur le repli
   * (attributs posés en JSX, plus bas) — c'est la même géométrie, une seule fois.
   */
  const surClic = (evenement: MouseEventReact<SVGSVGElement>): void => {
    const cible =
      (evenement.target as Element | null)?.closest?.('[data-region-svg], [data-region-source]') ??
      null;
    const id = cible?.getAttribute('data-region-svg') ?? cible?.getAttribute('data-region-source');
    if (id === null || id === undefined || !offertes.has(id)) return;
    onColorier(id, { clientX: evenement.clientX, clientY: evenement.clientY });
  };

  const surClavierPrise = (evenement: KeyboardEventReact<SVGCircleElement>): void => {
    if (!toucheDeValidation(evenement.key)) return;
    const id = evenement.currentTarget.getAttribute('data-region-svg');
    if (id === null || !offertes.has(id)) return;
    evenement.preventDefault();
    onColorier(id, { clientX: 0, clientY: 0 });
  };

  return (
    <svg
      ref={refSvg}
      className={`pierre-scene-libre${animationsDesactivees ? ' pierre-scene-libre--calme' : ''}`}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      role="group"
      aria-label={habillage.libelle}
      data-scene-libre={habillage.id}
      data-decor={svgMarkup === null ? 'repli' : 'habillage'}
      onClick={surClic}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <style>{STYLES_SCENE}</style>

      {contenuDecor !== null ? (
        <g data-calque="habillage" dangerouslySetInnerHTML={contenuDecor} />
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
                  const tapable = offertes.has(region.id);
                  return (
                    <circle
                      key={region.id}
                      id={region.id}
                      className="pierre-region-libre"
                      cx={region.centroide[0]}
                      cy={region.centroide[1]}
                      r={rayonEquivalent(region.surface)}
                      fill={
                        couleur === undefined
                          ? REMPLISSAGE_VIDE
                          : hexDeCouleur(couleur as CouleurColoriage)
                      }
                      stroke={TRAIT}
                      strokeWidth={4}
                      style={{ pointerEvents: tapable ? 'auto' : 'none' }}
                      data-region-source={region.id}
                      data-peinte={couleur === undefined ? 'non' : 'oui'}
                    />
                  );
                })
              : null}
          </g>
        ))
      )}

      <g data-calque="prises">
        {regionsDeclarees
          .filter((region) => offertes.has(region.id))
          .map((region) => (
            <circle
              key={region.id}
              className="pierre-prise-libre"
              cx={region.centroide[0]}
              cy={region.centroide[1]}
              r={DIAMETRE_PRISE_MINIMAL / 2}
              data-cible-frappe="oui"
              data-region-svg={region.id}
              data-peinte={remplissages[region.id] === undefined ? 'non' : 'oui'}
              role="button"
              tabIndex={0}
              aria-label={libelles.get(region.id) ?? region.id}
              onKeyDown={surClavierPrise}
            />
          ))}
      </g>
    </svg>
  );
}

/** Choisit le moteur de rendu déclaré, sans connaître le moindre habillage particulier. */
export function SceneLibre(proprietes: ProprietesSceneLibre): ReactElement {
  if (proprietes.habillage.scene.rasterIndexe !== undefined) {
    return <SceneRasterIndexee {...proprietes} repli={<SceneLibreSvg {...proprietes} />} />;
  }
  return <SceneLibreSvg {...proprietes} />;
}
