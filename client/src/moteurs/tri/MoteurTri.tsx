/**
 * `MoteurTri` — le composant hôte du moteur `tri`. Lot de portage de la mise en scène.
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurTri` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionTri`, fait battre l'horloge, déclenche le retour
 * sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI EST PORTÉ, ET DEPUIS OÙ
 *
 * Le père a validé le prototype de `phrase` : « la vibration des mauvais clics est bien, le
 * déplacement vers la case vide est bien » puis « fais les beaux design ». Ce fichier porte
 * cette mise en scène ici, sans la recopier :
 *
 *   1. **le décor est le fond**, il couvre la zone de jeu et se recolorie à mesure
 *      (`../../habillages/SceneDecor.js`, `../../habillages/emplacements.js`) ;
 *   2. **les réceptacles sont posés sur le décor** — chaque `receptacles[].zone` (un polygone
 *      DÉJÀ fourni par le contenu, dans le même repère `viewBox` que le décor) donne sa boîte
 *      englobante, transformée en pixels par la MÊME projection que le décor
 *      (`transformeMeet`/`versPixels`) : le panneau du wagon est donc à l'endroit où le wagon
 *      est dessiné, jamais un rectangle gris flottant ailleurs ;
 *   3. **les mots sont devant**, à des emplacements DÉRIVÉS (`deriverEmplacements`), jamais
 *      écrits à la main ;
 *   4. **le mot atterrit DANS le réceptacle** — chaque réceptacle réserve, dès le départ, une
 *      `Fente` (`../commun/fentes.js`, le module commun des fentes) par
 *      élément qui lui est destiné ; le vol vise le CENTRE MESURÉ de cette fente ;
 *   5. **le refus est une oscillation centrée** — porteur qui centre, bouton qui oscille,
 *      propriétés disjointes (R54) ;
 *   6. **un second chemin, le glisser** — `tri` a de VRAIES destinations (2-3 réceptacles),
 *      contrairement à `phrase` qui n'en a qu'une : le glisser y a donc un sens. Repris de
 *      `../place/MoteurPlace.js` : `PointerSensor`, `activationConstraint: { distance: 8 }`,
 *      `touch-action: none`. Le tap-puis-tap reste le chemin PRINCIPAL.
 *
 * ── CE QUI N'EST PAS RÉUTILISABLE TEL QUEL, ET POURQUOI ──────────────────────────────────────
 * `Fente` de `commun/fentes.tsx` réserve UNE boîte pour UN texte. Un réceptacle de `tri` en reçoit
 * PLUSIEURS au fil de l'exercice (tous les éléments dont `receptacleAttendu` le désigne, sur
 * TOUTES les consignes). La loi ne change pas — chaque fente réserve sa boîte dès le départ,
 * pour ne jamais faire bouger la case visée — seule la POPULATION change : au lieu d'une ligne
 * de fentes (une phrase), c'est un GROUPE de fentes par réceptacle, dérivé de
 * `contenu.elements.filter(e => e.receptacleAttendu === receptacle.id)`.
 *
 * ── UN DÉFAUT CONNU QUE CE LOT NE CORRIGE PAS (R33) ───────────────────────────────────────────
 * Tous les éléments de TOUTES les consignes restent affichés et tapables en même temps — c'est
 * déjà le rendu d'avant ce lot, et la règle de validation (`element-hors-consigne`) n'est pas
 * touchée ici. En rendant chaque élément à un emplacement propre sur le décor plutôt que dans
 * une rangée plate, ce défaut reste aussi visible qu'avant, peut-être plus : un mot loin de son
 * réceptacle a plus de chemin à parcourir pour se faire refuser.
 *
 * TROIS INVARIANTS DE RENDU, inchangés et opposables :
 *   - aucun `data-etat="echec"` n'est émis ici, ni ailleurs (R14) ;
 *   - aucun rouge sur un refus : la cible oscille, elle ne se colore pas ;
 *   - toute cible fait au moins 64 px (`var(--cible-min)`).
 *
 * ── R49 — LA CONSIGNE N'EST PLUS RÉPÉTÉE ICI ──────────────────────────────────────────────────
 * « la phrase est en haut et en bas, il y a doublon » (le père). `EcranNoeud` porte déjà la
 * consigne courante, en tête d'écran, AVEC le vrai `BoutonEcouter` — et elle y reste affichée
 * tant que l'étape est courante, pas seulement le temps d'une annonce (vérifié dans
 * `EcranNoeud.tsx`, `barre-consigne`). Pour `tri`, la consigne PORTE le critère de tri
 * (« Range les mots où tu entends… ») : l'en-tête le garde donc visible pendant toute l'étape,
 * rien n'est perdu à ne plus le redire ici. Ce bandeau ne montre plus que le GESTE
 * (`data-consigne-geste`), que `EcranNoeud` ne peut pas connaître : il dépend de
 * `etat.elementSaisi`, propre au moteur.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { ActionTri, ContenuTri, EtatTri } from '@pierre/partage';

import { SceneDecor } from '../../habillages/SceneDecor.js';
import type { RegionAllumee } from '../../habillages/SceneDecor.js';
import {
  couleurDeRegion,
  deriverEmplacements,
  lireViewBox,
  regionsColoriables,
  transformeMeet,
  versPixels,
} from '../../habillages/emplacements.js';
import type {
  Boite,
  Bornes,
  Cadre,
  Emplacement,
  TransformeDecor,
} from '../../habillages/emplacements.js';
import { DispositionMoteur } from '../../activite/DispositionMoteur.js';
import { MOTS_PAR_RANGEE_MAX, alignementTolere, plusGrandAlignement, semerEnQuinconce } from './semis.js';
import { ZoneDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';
import { Fente, JetonEnVol, centreDuReceptacle } from '../commun/fentes.js';
import type { VolDuJeton } from '../commun/fentes.js';
import { decouperEnVagues, policesChargees, vagueDeLEtape } from '../commun/vagues.js';
import './tri.css';
import { ROLE_QUESTION, ROLE_REPONSE } from '../../activite/Question.js';
import { TexteColore } from '../../lecture/TexteColore.js';

/**
 * `ElementTri` et `ReceptacleTri` ne figurent pas au barillet (`@pierre/partage` n'exporte que
 * `ContenuTri`, `EtatTri`, `ActionTri` — vérifié dans `partage/src/index.ts`). Le client
 * n'emprunte jamais l'alias `@partage` (réservé aux tests) : on dérive donc l'alias localement
 * depuis le type déjà importé, sans ajouter un seul symbole au barillet.
 */
type ElementTri = ContenuTri['elements'][number];
type ReceptacleTri = ContenuTri['receptacles'][number];

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** Cadre servi tant que rien n'est mesuré — premier rendu, `happy-dom`, `ResizeObserver` absent. */
const CADRE_DE_REPLI: Cadre = { largeur: 900, hauteur: 1000 };

/** Respiration entre une pastille et le bord du cadre, en pixels. */
const MARGE = 14;
/** Sous cette distance d'un bord, une région n'est presque pas dessinée : on ne l'utilise pas. */
const MARGE_VISIBILITE = 28;

/** `.cible` — `padding: 0.75rem 1.25rem`, `border: 4px`. Sert à estimer l'encombrement. */
const PADDING_X = 20;
const PADDING_Y = 12;
const BORDURE = 4;
const CIBLE_MIN = 64;
const LARGEUR_GLYPHE = 0.66;

/** La fente d'un réceptacle est un accusé de réception, pas la cible de lecture principale :
 * l'enfant a déjà déchiffré le mot pour choisir sa pastille. Elle prend le style d'interface. */
const FENTE_CORPS_PX = 18;
const FENTE_PADDING_X = 8;
const FENTE_PADDING_Y = 6;
const FENTE_BORDURE = 3;
const FENTE_MIN = 40;
/** En grille, une fente vide ne dépasse pas cette largeur : un livre range ses fentes sur deux colonnes. */
const FENTE_LARGEUR_GRILLE_MAX = 160;
const FENTE_HAUTEUR_GRILLE_MAX = 30;

/* Les grottes se dimensionnent en proportion du cadre mesuré, jamais en pixels fixes. Leur côté
 * court reste une cible tactile (CIBLE_MIN). */
/* Le critère est une vraie `ZoneDeLecture` : on lui réserve une cible au-dessus de la grotte. */
const HAUTEUR_CRITERE_RECEPTACLE = CIBLE_MIN + 8;
/** Respiration entre la zone des mots et le haut des panneaux de réceptacles. */
const ESPACE_AVANT_RECEPTACLES = 16;
const PART_LARGEUR_RECEPTACLE = 0.34;
const PART_HAUTEUR_RECEPTACLE = 0.22;
const ZOOM_DECOR_TRI = 1.2;

const DUREE_VOL_MS = 320;

/**
 * CE QUE LE REFUS DIT — jamais ce qui a raté, jamais le mot attendu (v2 § 5.4, R58).
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'mauvais-receptacle': 'On cherche un autre endroit pour ce mot.',
  'element-hors-consigne': 'On garde ce mot pour une autre fois.',
  'element-deja-range': 'Ce mot est déjà rangé.',
  'element-inconnu': 'On cherche un mot à ranger.',
  'receptacle-inconnu': 'On cherche un endroit où ranger.',
};

/** La boîte englobante d'un polygone, dans le repère où il est exprimé. */
function bornesDuPolygone(
  polygone: readonly (readonly [number, number])[],
): { xMin: number; yMin: number; xMax: number; yMax: number } {
  let xMin = Number.POSITIVE_INFINITY;
  let yMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;
  for (const [x, y] of polygone) {
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  if (!Number.isFinite(xMin) || !Number.isFinite(yMin)) {
    return { xMin: 0, yMin: 0, xMax: 0, yMax: 0 };
  }
  return { xMin, yMin, xMax, yMax };
}

interface PanneauReceptacleGeometrie {
  readonly receptacle: ReceptacleTri;
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly hauteur: number;
  /**
   * La hauteur que le panneau OCCUPE vraiment : critère + fentes. Estimée au premier rendu
   * (`hauteur + HAUTEUR_CRITERE_RECEPTACLE`), puis MESURÉE dans le DOM.
   *
   * Retour parent E16/E25, mesuré (sonde `parcours-tri-sonde-disposition`, 12 oct.) : un critère
   * qui passe sur deux lignes et six fentes qui s'enroulent donnent 204 à 243 px de panneau là
   * où l'estimation en réservait 189. Le panneau débordait du cadre de 1 à 29 px, la mesure
   * après rendu le voyait, et la scène entière basculait en grille alignée (clairiere-03,
   * foret-muette-11, marais-jumeau-03, volcan-02/10 entre 1100×700 et 1366×768).
   */
  readonly encombrement: number;
}

/**
 * Les panneaux des réceptacles. Leur ORDRE de gauche à droite vient de `receptacle.zone` (la
 * consigne dit « le panier de gauche ») ; leur HAUTEUR, jamais : ils sont TOUJOURS en haut du
 * décor, et les mots en dessous.
 *
 * Décision du parent, 12 oct. 2026 (tableau T22) : « j'aime bien les paniers en haut, avec les
 * mots en dessous […] c'est plus lisible par rapport à ce qui est demandé ». Avant, la zone donnait
 * aussi la hauteur : les Galeries avaient leurs grottes en haut, les dix autres tri leurs paniers
 * en bas (mesuré sur les 11 tri, 800×1100 et 1920×940). Un seul comportement pour tous.
 */
function panneauxReceptacles(
  receptacles: readonly ReceptacleTri[],
  t: TransformeDecor,
  limites: Bornes,
  cadre: Cadre,
  hauteursMesurees: ReadonlyMap<string, number> | null,
): readonly PanneauReceptacleGeometrie[] {
  const largeurMax = Math.max(CIBLE_MIN * 2, cadre.largeur * PART_LARGEUR_RECEPTACLE);
  const hauteurMax = Math.max(CIBLE_MIN, cadre.hauteur * PART_HAUTEUR_RECEPTACLE);
  const xMin = limites.xMin + MARGE;
  const xMax = limites.xMax - MARGE;
  const haut = limites.yMin + MARGE;
  const panneaux = receptacles.map((receptacle) => {
    const b = bornesDuPolygone(receptacle.zone);
    const [x1] = versPixels([b.xMin, b.yMin], t);
    const [x2] = versPixels([b.xMax, b.yMax], t);
    const [, y1] = versPixels([b.xMin, b.yMin], t);
    const [, y2] = versPixels([b.xMax, b.yMax], t);
    const largeurZone = Math.abs(x2 - x1);
    const largeur = Math.max(CIBLE_MIN * 2, Math.min(largeurZone, largeurMax));
    const hauteur = Math.max(CIBLE_MIN, Math.min(Math.abs(y2 - y1), hauteurMax));
    const xCentre = Math.min(x1, x2) + (largeurZone - largeur) / 2;
    const encombrement = Math.max(
      hauteur,
      hauteursMesurees?.get(receptacle.id) ?? hauteur + HAUTEUR_CRITERE_RECEPTACLE,
    );
    return {
      receptacle,
      // Centré sur sa zone en largeur, ramené dans la partie visible du décor.
      x: Math.max(xMin, Math.min(xCentre, xMax - largeur)),
      y: haut,
      largeur,
      hauteur,
      encombrement,
    };
  });
  // Tous sur la même rangée : s'ils se recouvrent (zones superposées dans le dessin), on les
  // répartit à intervalles égaux, dans leur ordre de gauche à droite. S'ils n'entrent pas, la
  // mesure après rendu bascule en grille.
  const ordonnes = [...panneaux].sort((a, b) => a.x - b.x);
  const recouvrement = ordonnes.some((p, i) => {
    const suivant = ordonnes[i + 1];
    return suivant !== undefined && p.x + p.largeur + ESPACE_AVANT_RECEPTACLES > suivant.x;
  });
  if (!recouvrement) return panneaux;
  const somme = ordonnes.reduce((s, p) => s + p.largeur, 0);
  const intervalle = Math.max(0, (xMax - xMin - somme) / (ordonnes.length + 1));
  let x = xMin + intervalle;
  const replaces = new Map<string, number>();
  for (const p of ordonnes) {
    replaces.set(p.receptacle.id, x);
    x += p.largeur + intervalle;
  }
  return panneaux.map((p) => ({ ...p, x: replaces.get(p.receptacle.id) ?? p.x }));
}

/**
 * LA BANDE DES MOTS : sous les panneaux, jusqu'au bas du décor (décision du parent, T22). Mots et
 * panneaux occupent des zones disjointes.
 */
function bandeDesMots(limites: Bornes, panneaux: readonly PanneauReceptacleGeometrie[]): Bornes {
  const xMin = limites.xMin + MARGE;
  const xMax = Math.max(limites.xMax - MARGE, limites.xMin + MARGE + CIBLE_MIN);
  const basDuDecor = limites.yMax - MARGE;
  const yMin =
    panneaux.length === 0
      ? limites.yMin + MARGE
      : Math.max(...panneaux.map((p) => p.y + p.encombrement)) + ESPACE_AVANT_RECEPTACLES;
  return { xMin, yMin, xMax, yMax: Math.max(basDuDecor, yMin + CIBLE_MIN) };
}

// ------------------------------------------------------------------ le mot, dans le plateau

interface ProprietesElementFlottant {
  readonly element: ElementTri;
  /** Position dérivée sur le décor ; `null` dans le repli en grille. */
  readonly emplacement: Emplacement | null;
  readonly saisi: boolean;
  readonly range: boolean;
  readonly enRefus: boolean;
  readonly marqueRefus: number;
  onTaper(element: ElementTri, evenement: { clientX: number; clientY: number }): void;
}

/**
 * Un mot ou un panier qui sort du cadre, même de deux pixels, est rogné pour l'enfant : la
 * hauteur de défilement du plateau ne le voit pas toujours, la boîte réelle de chaque cible si.
 */
function grilleDeborde(cadreTri: HTMLElement, plateauGrille: HTMLElement): boolean {
  if (cadreTri.clientHeight === 0) return false;
  if (plateauGrille.scrollHeight > cadreTri.clientHeight + 1) return true;
  const bas = cadreTri.getBoundingClientRect().top + cadreTri.clientTop + cadreTri.clientHeight;
  return Array.from(plateauGrille.querySelectorAll('[data-porte-element], [data-receptacle]'))
    .some((cible) => cible.getBoundingClientRect().bottom > bas + 0.5);
}

function ElementFlottant({
  element,
  emplacement,
  saisi,
  range,
  enRefus,
  marqueRefus,
  onTaper,
}: ProprietesElementFlottant): ReactElement {
  // Le glisser, chemin SECOND : `tri` a de vraies destinations, contrairement à `phrase`.
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: element.id });

  const classes = ['cible'];
  if (enRefus) classes.push('oscillation');

  const glisse =
    transform === null ? '' : ` translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)`;

  return (
    <span
      data-porte-element={element.id}
      // Le porteur centre le mot sur son emplacement et porte le glisser ; l'oscillation du
      // refus est sur le bouton, donc aucune image-clé ne lui reprend cette transformation (R54).
      style={
        emplacement === null
          ? transform === null
            ? undefined
            : { transform: glisse.trim() }
          : {
              insetInlineStart: `${String(emplacement.x)}px`,
              insetBlockStart: `${String(emplacement.y)}px`,
              transform: `translate(-50%, -50%)${glisse}`,
            }
      }
    >
      <button
        ref={setNodeRef}
        key={enRefus ? `${element.id}-${String(marqueRefus)}` : element.id}
        type="button"
        {...ROLE_REPONSE}
        className={classes.join(' ')}
        data-element={element.id}
        data-saisi={saisi ? 'oui' : 'non'}
        data-range={range ? 'oui' : 'non'}
        // Sur tablette, le geste naturel peut ne produire qu'une séquence pointerdown/up
        // lorsque le capteur de glisser n'est pas activé. Le tap reste prioritaire (R16) ;
        // pendant un vrai glisser, `transform` n'est plus nul et le dépôt dnd-kit garde la main.
        onPointerUp={(evenement) => {
          if (transform === null) onTaper(element, evenement);
        }}
        onClick={(evenement) => {
          onTaper(element, evenement);
        }}
        {...listeners}
        {...attributes}
        aria-pressed={saisi}
      >
        <TexteColore texte={element.libelle} />
      </button>
    </span>
  );
}

// ------------------------------------------------------------------ le panneau d'un réceptacle

interface ProprietesPanneauReceptacle {
  readonly receptacle: ReceptacleTri;
  /** Boîte dérivée du décor ; `null` dans le repli en grille. */
  readonly geometrie: PanneauReceptacleGeometrie | null;
  readonly elements: readonly ElementTri[];
  readonly acquis: Readonly<Record<string, string>>;
  readonly attend: boolean;
  readonly couleur: string;
  readonly mesurerFente: (id: string) => Boite;
  onDeposer(evenement: { clientX: number; clientY: number }): void;
  brancherFente(id: string, noeud: HTMLElement | null): void;
}

function PanneauReceptacle({
  receptacle,
  geometrie,
  elements,
  acquis,
  attend,
  couleur,
  mesurerFente,
  onDeposer,
  brancherFente,
}: ProprietesPanneauReceptacle): ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: receptacle.id });

  return (
    <div
      className="tri-panneau"
      style={
        {
          '--couleur-receptacle': couleur,
          ...(geometrie === null
            ? {}
            : {
                insetInlineStart: `${String(geometrie.x)}px`,
                insetBlockStart: `${String(geometrie.y)}px`,
                inlineSize: `${String(geometrie.largeur)}px`,
                '--hauteur-receptacle': `${String(geometrie.hauteur)}px`,
              }),
        } as CSSProperties
      }
    >
      {/* Le critère, HORS du bouton de dépôt : `ZoneDeLecture` peut monter son propre bouton de
          guidage de ligne selon le profil de lecture. Un bouton dans un bouton est une
          infraction `nested-interactive` (la même que `ScenePlace` a réparée) — les deux
          restent donc des FRÈRES, jamais l'un dans l'autre. */}
      {/* T19 : le critère d'un panier dit ce qu'on DEMANDE d'y ranger. */}
      <ZoneDeLecture question texte={receptacle.critere} motsCles={[]} />
      {/* MESURÉ, sortie citée (`node scripts/playwright.mjs test
          tests/qualite/a11y-tout-le-site.spec.ts --project=qualite`) : les onze exercices `tri`
          rendaient « button-name (critical) × 2 » (× 3 pour `volcan.wagons`, à trois
          réceptacles) — un défaut PAR RÉCEPTACLE, pas onze défauts distincts. Cause : le bouton
          ne porte qu'une FORME (les fentes) ; tant qu'aucune n'est remplie, son nom accessible
          est la chaîne vide. Le nom vient du CONTENU — `receptacle.libelle` et
          `receptacle.critere`, tous deux déjà déclarés dans l'exercice — jamais d'une chaîne
          inventée ici, sur le modèle de `Etagere.tsx` (`aria-label` construit depuis l'objet et
          son état, jamais en dur). */}
      <button
        ref={setNodeRef}
        type="button"
        data-receptacle={receptacle.id}
        data-attend={attend ? 'oui' : 'non'}
        aria-label={
          attend
            ? `${receptacle.libelle}, ${receptacle.critere} — prêt à recevoir`
            : `${receptacle.libelle}, ${receptacle.critere}`
        }
        onClick={onDeposer}
        data-survol={isOver ? 'oui' : 'non'}
      >
        {elements.map((element) => (
          <Fente
            key={element.id}
            cle={element.id}
            texte={acquis[element.id] !== undefined ? element.libelle : null}
            boite={mesurerFente(element.id)}
            // Jamais jaune : tri n'a plus d'étape visible (E03), une fente marquée « prochaine »
            // était un reste d'avant (retour du parent, E25).
            prochaine={false}
            brancher={(noeud) => {
              brancherFente(element.id, noeud);
            }}
          />
        ))}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ le moteur

export function MoteurTri(
  proprietes: ProprietesMoteur<ContenuTri, EtatTri, ActionTri>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionTri);
    }, PERIODE_BATTEMENT_MS);
    return () => {
      clearInterval(identifiant);
    };
  }, [emettre]);

  // --- le retour sensoriel --------------------------------------------------
  const serie = useRef(0);
  const nbAcquis = Object.keys(etat.acquis).length;
  const precedents = useRef(nbAcquis);
  const marqueRefus = useRef(etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs);
  const origine = useRef<readonly [number, number]>([0, 0]);

  const refFentes = useRef(new Map<string, HTMLElement | null>());
  const volVise = useRef<Omit<VolDuJeton, 'marque'> | null>(null);
  const [vol, fixerVol] = useState<VolDuJeton | null>(null);
  const marqueVol = useRef(0);

  useEffect(() => {
    if (nbAcquis > precedents.current) {
      serie.current += 1;
      void services.retour.depotCorrect({ origine: origine.current, serie: serie.current });

      const vise = volVise.current;
      if (vise !== null && !animationsDesactivees) {
        marqueVol.current += 1;
        fixerVol({ ...vise, marque: marqueVol.current });
      }
    }
    volVise.current = null;
    precedents.current = nbAcquis;
  }, [nbAcquis, services, animationsDesactivees]);

  useEffect(() => {
    if (vol === null) return undefined;
    const minuterie = setTimeout(() => {
      fixerVol((courant) => (courant?.marque === vol.marque ? null : courant));
    }, DUREE_VOL_MS);
    return () => {
      clearTimeout(minuterie);
    };
  }, [vol]);

  useEffect(() => {
    const marque = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
    if (marque !== 0 && marque !== marqueRefus.current) {
      serie.current = 0;
      services.retour.reinitialiserSerie();
      void services.retour.depotRefuse();
    }
    marqueRefus.current = marque;
  }, [etat.dernierRefus, services]);

  const noter = useCallback((evenement: { clientX: number; clientY: number }) => {
    origine.current = [evenement.clientX, evenement.clientY];
  }, []);

  const jouer = useCallback(
    (action: ActionTri, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  // --- la mesure du cadre ---------------------------------------------------
  // Le cadre est la zone de scène que donne le socle : décor, mots et réceptacles s'y posent.
  const racine = useRef<HTMLDivElement | null>(null);
  const [cadre, fixerCadre] = useState<Cadre>(CADRE_DE_REPLI);

  useEffect(() => {
    const noeud = racine.current;
    if (noeud === null) return undefined;

    const relever = (): void => {
      const rect = noeud.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fixerCadre({ largeur: rect.width, hauteur: rect.height });
      }
    };

    relever();

    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(relever);
    observateur.observe(noeud);
    return () => {
      observateur.disconnect();
    };
  }, []);

  // --- la typographie --------------------------------------------------------
  // Le style des mots vient du CSS (`tri.css`, variables `--lecture-*` du profil) ; on ne garde
  // ici que les réglages qui servent à estimer l'encombrement.
  const reglages = useReglagesLecture();

  const elementsParId = useMemo(
    () => new Map(contenu.elements.map((e) => [e.id, e] as const)),
    [contenu],
  );

  const mesurer = useCallback(
    (cle: string): Boite => {
      const libelle = elementsParId.get(cle)?.libelle ?? '';
      const corps = reglages.corpsPx;
      const interlettrage = reglages.interlettrageEm * corps;
      return {
        largeur: Math.max(
          CIBLE_MIN,
          libelle.length * (corps * LARGEUR_GLYPHE + interlettrage) + 2 * (PADDING_X + BORDURE),
        ),
        hauteur: Math.max(CIBLE_MIN, corps * reglages.interligne + 2 * (PADDING_Y + BORDURE)),
      };
    },
    [elementsParId, reglages],
  );

  const mesurerFente = useCallback(
    (cle: string): Boite => {
      const libelle = elementsParId.get(cle)?.libelle ?? '';
      return {
        largeur: Math.max(
          FENTE_MIN,
          libelle.length * (FENTE_CORPS_PX * LARGEUR_GLYPHE) + 2 * (FENTE_PADDING_X + FENTE_BORDURE),
        ),
        hauteur: Math.max(FENTE_MIN, FENTE_CORPS_PX * 1.3 + 2 * (FENTE_PADDING_Y + FENTE_BORDURE)),
      };
    },
    [elementsParId],
  );

  const mesurerFenteEnGrille = useCallback(
    (cle: string): Boite => {
      const boite = mesurerFente(cle);
      // La fente n'est pas une cible : le doigt touche le livre entier. Elle peut donc être basse.
      return { largeur: Math.min(boite.largeur, FENTE_LARGEUR_GRILLE_MAX), hauteur: Math.min(boite.hauteur, FENTE_HAUTEUR_GRILLE_MAX) };
    },
    [mesurerFente],
  );

  // --- la dérivation -----------------------------------------------------------
  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);

  const cadreJeu = useMemo<Cadre>(
    () => ({
      largeur: cadre.largeur,
      hauteur: Math.max(cadre.hauteur, CIBLE_MIN + 2 * MARGE),
    }),
    [cadre],
  );

  // Le cadre de jeu est la boîte MESURÉE de la zone de scène : décor, bornes et grottes en
  // dérivent, jamais d'une taille fixe.
  const vb = useMemo(() => lireViewBox(habillage.scene.viewBox), [habillage]);
  const transformeDecor = useMemo(
    () => transformeMeet(vb, cadreJeu, ZOOM_DECOR_TRI),
    [vb, cadreJeu],
  );

  const limitesDecor = useMemo<Bornes>(
    () => ({
      xMin: Math.max(0, vb.x * transformeDecor.echelle + transformeDecor.decalageX),
      yMin: Math.max(0, vb.y * transformeDecor.echelle + transformeDecor.decalageY),
      xMax: Math.min(
        cadreJeu.largeur,
        (vb.x + vb.largeur) * transformeDecor.echelle + transformeDecor.decalageX,
      ),
      yMax: Math.min(
        cadreJeu.hauteur,
        (vb.y + vb.hauteur) * transformeDecor.echelle + transformeDecor.decalageY,
      ),
    }),
    [vb, transformeDecor, cadreJeu],
  );

  // --- le découpage en vagues (décision du parent du 30 oct., contrat du socle § 12) ----------
  // Quand même la grille serrée déborde, l'exercice se montre par VAGUES de consignes contiguës
  // (`commun/vagues.ts`) : la consigne affichée garde toujours ses mots à l'écran, et les mots
  // déjà rangés restent dans leurs cases. Le nombre de vagues ne fait que croître pour un cadre
  // donné (cliquet) ; un autre cadre — rotation, autre appareil — repart d'une seule vague.
  const cleVagues = `${String(Math.round(cadre.largeur))}x${String(Math.round(cadre.hauteur))}`;
  const [vaguesMesurees, fixerVaguesMesurees] = useState<{ cle: string; nombre: number } | null>(null);
  const nombreDeVagues = vaguesMesurees !== null && vaguesMesurees.cle === cleVagues ? vaguesMesurees.nombre : 1;
  const vagues = useMemo(
    () => decouperEnVagues(contenu.consignes.map((consigne) => consigne.aRanger.length), nombreDeVagues),
    [contenu.consignes, nombreDeVagues],
  );
  const vagueMontree = vagueDeLEtape(vagues, etat.indexEtape);
  // Deux ensembles : les mots du PLATEAU (la vague en cours — un mot rangé y reste, grisé) et les
  // CASES des paniers (les vagues passées et la vague en cours ; celles à venir arrivent avec
  // leurs mots). Un élément qu'aucune consigne ne nomme est de toutes les vagues : jamais perdu.
  const { idsDuPlateau, idsMontres } = useMemo(() => {
    const nommes = new Set(contenu.consignes.flatMap((consigne) => consigne.aRanger));
    const orphelins = contenu.elements.filter((element) => !nommes.has(element.id)).map((element) => element.id);
    const plateau = new Set<string>(orphelins);
    const cases = new Set<string>(orphelins);
    for (const [rang, vague] of vagues.entries()) {
      if (rang > vagueMontree) break;
      for (const index of vague) {
        for (const id of contenu.consignes[index]?.aRanger ?? []) {
          cases.add(id);
          if (rang === vagueMontree) plateau.add(id);
        }
      }
    }
    return { idsDuPlateau: plateau, idsMontres: cases };
  }, [contenu.consignes, contenu.elements, vagues, vagueMontree]);
  const elementsMontres = useMemo(
    () => etat.elements.filter((element) => idsDuPlateau.has(element.id)),
    [etat.elements, idsDuPlateau],
  );

  // Les hauteurs RÉELLES des panneaux, relevées après rendu, par cadre et par jeu de mots. Elles
  // ne dépendent que de la largeur du panneau (donc du cadre) et de son contenu, jamais de sa
  // position : les reposer ne peut pas les changer, la boucle s'arrête au second rendu.
  const jeuDeMots = elementsMontres.map((element) => element.id).join('|');
  const cleHauteurs = `${String(Math.round(cadre.largeur))}x${String(Math.round(cadre.hauteur))}#${jeuDeMots}`;
  const [hauteursMesurees, fixerHauteursMesurees] = useState<{
    cle: string;
    hauteurs: ReadonlyMap<string, number>;
  } | null>(null);
  const hauteursCourantes =
    hauteursMesurees !== null && hauteursMesurees.cle === cleHauteurs ? hauteursMesurees.hauteurs : null;

  const panneaux = useMemo(
    () => panneauxReceptacles(contenu.receptacles, transformeDecor, limitesDecor, cadreJeu, hauteursCourantes),
    [contenu.receptacles, transformeDecor, limitesDecor, cadreJeu, hauteursCourantes],
  );

  // La bande des mots : sous les panneaux (`bandeDesMots`).
  const bornes = useMemo<Bornes>(() => bandeDesMots(limitesDecor, panneaux), [limitesDecor, panneaux]);

  const cles = useMemo(() => elementsMontres.map((e) => e.id), [elementsMontres]);

  const resultat = useMemo(
    () =>
      deriverEmplacements({
        habillage,
        cles,
        disponibles: regions,
        toutes: regions,
        cadre: cadreJeu,
        bornes,
        mesurer,
        margeVisibilite: MARGE_VISIBILITE,
      }),
    [habillage, cles, regions, cadreJeu, bornes, mesurer],
  );

  // LE SEMIS (retour parent E16/E25). Les régions du décor gardent la main quand elles
  // éparpillent vraiment les mots : aucun chevauchement, rien hors bornes, aucun repli en lignes,
  // et pas plus de ⌈n/3⌉ mots sur une même ligne. Sinon — centroïdes trop serrés, ou ramenés par
  // le clampage sur le bord de la bande —, les mots sont semés en quinconce dans la même bande,
  // sans chevauchement par construction (`semis.ts`). La région que chaque mot rallume reste
  // celle que la dérivation lui a donnée : seule la POSITION change.
  const semis = useMemo(
    () => semerEnQuinconce(resultat.emplacements.map((e) => e.boite), bornes),
    [resultat, bornes],
  );
  const regionsEparpillent =
    resultat.repli === 'regions' &&
    resultat.chevauchements === 0 &&
    resultat.horsBornes === 0 &&
    plusGrandAlignement(resultat.emplacements.map((e) => e.y)) <= alignementTolere(resultat.emplacements.length);
  const semisValide = semis.tient && semis.chevauchements === 0 && semis.horsBornes === 0;
  const placement: 'regions' | 'semis' = !regionsEparpillent && semisValide ? 'semis' : 'regions';
  const emplacementsRendus = useMemo(
    () =>
      placement === 'regions'
        ? resultat.emplacements
        : resultat.emplacements.map((emplacement, i) => {
            const point = semis.points[i] ?? [emplacement.x, emplacement.y];
            return { ...emplacement, x: point[0], y: point[1] };
          }),
    [placement, resultat, semis],
  );
  const chevauchementsRendus = placement === 'semis' ? semis.chevauchements : resultat.chevauchements;
  const horsBornesRendus = placement === 'semis' ? semis.horsBornes : resultat.horsBornes;
  const emplacementParElement = useMemo(
    () => new Map(emplacementsRendus.map((e) => [e.cle, e] as const)),
    [emplacementsRendus],
  );

  // REPLI EN GRILLE. Le module rend ses propres `chevauchements` et `horsBornes` ; s'il en
  // compte, ou si la mesure après rendu (ci-dessous) trouve un mot ou une grotte qui sort du
  // cadre ou en recouvre un autre, les mots et les grottes se rangent en flux dans le cadre.
  const [repliMesure, fixerRepliMesure] = useState<{ cadre: string; actif: boolean } | null>(null);
  // Les étiquettes grandissent après coup (police chargée, réglages de lecture) : leur taille
  // fait partie de la clé, pour que la mesure soit refaite quand elle change.
  const [versionTailles, fixerVersionTailles] = useState(0);
  // Le jeu de mots fait partie de la clé : le nœud suivant se remesure, même à cadre égal.
  const cleCadre = `${String(Math.round(cadre.largeur))}x${String(Math.round(cadre.hauteur))}#${String(versionTailles)}#${jeuDeMots}`;
  // Le repli en lignes de `deriverEmplacements`, sur le décor, alignait jusqu'à sept mots : au-delà
  // de `MOTS_PAR_RANGEE_MAX`, c'est la grille, qui en tient quatre par rangée.
  const lignesTropPeuplees =
    placement === 'regions' &&
    resultat.repli === 'lignes' &&
    plusGrandAlignement(emplacementsRendus.map((e) => e.y)) > MOTS_PAR_RANGEE_MAX;
  const modeGrille =
    chevauchementsRendus > 0 ||
    horsBornesRendus > 0 ||
    lignesTropPeuplees ||
    (repliMesure !== null && repliMesure.cadre === cleCadre && repliMesure.actif);

  useLayoutEffect(() => {
    if (modeGrille) return;
    if (repliMesure !== null && repliMesure.cadre === cleCadre) return;
    const noeud = racine.current;
    if (noeud === null) return;
    const boite = noeud.getBoundingClientRect();
    if (boite.width === 0 || boite.height === 0) return;
    // D'abord les hauteurs réelles des panneaux : si elles diffèrent de celles qui ont servi à
    // les poser, on les reporte et on juge au rendu suivant (un tour de plus, jamais deux : la
    // hauteur ne dépend pas de la position).
    const relevees = new Map<string, number>();
    for (const panneau of noeud.querySelectorAll<HTMLElement>('.tri-panneau')) {
      const id = panneau.querySelector('[data-receptacle]')?.getAttribute('data-receptacle');
      if (id !== null && id !== undefined) relevees.set(id, panneau.getBoundingClientRect().height);
    }
    const ecart = panneaux.some((p) => {
      const reelle = relevees.get(p.receptacle.id);
      return reelle !== undefined && Math.abs(Math.max(reelle, p.hauteur) - p.encombrement) > 1;
    });
    if (ecart) {
      fixerHauteursMesurees({ cle: cleHauteurs, hauteurs: relevees });
      return;
    }
    const rects = [
      ...Array.from(noeud.querySelectorAll<HTMLElement>('[data-element]')),
      ...Array.from(noeud.querySelectorAll<HTMLElement>('.tri-panneau')),
    ].map((n) => n.getBoundingClientRect());
    const dehors = rects.some(
      (r) =>
        r.left < boite.left - 1 || r.top < boite.top - 1 ||
        r.right > boite.right + 1 || r.bottom > boite.bottom + 1,
    );
    let recouvre = false;
    for (let i = 0; i < rects.length && !recouvre; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        if (a === undefined || b === undefined) continue;
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) {
          recouvre = true;
          break;
        }
      }
    }
    fixerRepliMesure({ cadre: cleCadre, actif: dehors || recouvre });
  }, [modeGrille, repliMesure, cleCadre, cleHauteurs, hauteursCourantes, emplacementsRendus, panneaux]);

  // GRILLE SERRÉE. Si la grille déborde du cadre, ses marges se resserrent — jamais le corps ni
  // l'interligne de lecture. C'est un cliquet par cadre : une fois serrée, elle le reste tant que
  // le cadre et les mots ne changent pas, donc la bascule ne peut pas osciller.
  const [serrageMesure, fixerSerrageMesure] = useState<string | null>(null);
  const grilleSerree = modeGrille && serrageMesure === cleCadre;
  useLayoutEffect(() => {
    if (!modeGrille || grilleSerree) return undefined;
    const noeud = racine.current;
    const plateauGrille = noeud?.querySelector<HTMLElement>('.tri-plateau');
    if (noeud === null || noeud === undefined || plateauGrille === null || plateauGrille === undefined) return undefined;
    const mesurer = (): void => {
      if (grilleDeborde(noeud, plateauGrille)) fixerSerrageMesure(cleCadre);
    };
    mesurer();
    // Les mots prennent leur taille après coup (police) : le plateau qui grandit relance la mesure.
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(plateauGrille);
    return () => {
      observateur.disconnect();
    };
  }, [modeGrille, grilleSerree, cleCadre]);

  // VAGUES. La grille serrée déborde encore : une vague de plus, et toute la cascade (décor,
  // grille, serrage) se rejoue sur moins de mots. Au-delà d'une consigne par vague, le filet :
  // le cadre défile (`tri.css`), aucun mot n'est rogné.
  useLayoutEffect(() => {
    if (!grilleSerree || nombreDeVagues >= contenu.consignes.length) return undefined;
    const noeud = racine.current;
    const plateauGrille = noeud?.querySelector<HTMLElement>('.tri-plateau');
    if (noeud === null || noeud === undefined || plateauGrille === null || plateauGrille === undefined) return undefined;
    let actif = true;
    const mesurer = (): void => {
      if (actif && grilleDeborde(noeud, plateauGrille) && policesChargees()) {
        fixerVaguesMesurees({ cle: cleVagues, nombre: nombreDeVagues + 1 });
      }
    };
    mesurer();
    // Une mesure faite pendant le chargement de la police ne compte pas : la police arrivée, on
    // remesure. Le plateau, de hauteur minimale fixe, ne change pas toujours de taille quand ses
    // mots se replient : on observe aussi les mots et les paniers.
    const polices = typeof document === 'undefined' || !('fonts' in document) ? undefined : document.fonts;
    polices?.addEventListener('loadingdone', mesurer);
    void polices?.ready.then(mesurer);
    const observateur = typeof ResizeObserver === 'function' ? new ResizeObserver(mesurer) : null;
    observateur?.observe(plateauGrille);
    plateauGrille.querySelectorAll('.tri-mots, .tri-receptacles').forEach((bloc) => { observateur?.observe(bloc); });
    return () => {
      actif = false;
      observateur?.disconnect();
      polices?.removeEventListener('loadingdone', mesurer);
    };
  }, [grilleSerree, cleCadre, cleVagues, nombreDeVagues, contenu.consignes.length]);

  // En mode décor seulement : un mot ou un panneau qui change de taille relance la mesure.
  // En grille, on n'observe plus, sinon la bascule pourrait osciller.
  useEffect(() => {
    if (modeGrille) return undefined;
    const noeud = racine.current;
    if (noeud === null || typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(() => {
      fixerVersionTailles((version) => version + 1);
    });
    for (const element of noeud.querySelectorAll('[data-element], .tri-panneau')) observateur.observe(element);
    return () => {
      observateur.disconnect();
    };
  }, [modeGrille, emplacementsRendus, panneaux]);

  const allumees = useMemo<readonly RegionAllumee[]>(() => {
    const centroideParRegion = new Map(regions.map((r) => [r.id, r.centroide] as const));
    const liste: RegionAllumee[] = [];
    for (const emplacement of emplacementsRendus) {
      if (emplacement.region === null) continue;
      if (etat.acquis[emplacement.cle] === undefined) continue;
      liste.push({
        id: emplacement.region,
        couleur: emplacement.couleur,
        centroide: centroideParRegion.get(emplacement.region) ?? [0, 0],
      });
    }
    return liste;
  }, [emplacementsRendus, etat.acquis, regions]);

  const [derniere, fixerDerniere] = useState<RegionAllumee | null>(null);
  const empreinteAllumees = allumees.map((a) => a.id).join('|');
  const empreintePrecedente = useRef<string | null>(null);

  useEffect(() => {
    const avant =
      empreintePrecedente.current === null
        ? null
        : new Set(empreintePrecedente.current === '' ? [] : empreintePrecedente.current.split('|'));
    empreintePrecedente.current = empreinteAllumees;
    if (avant === null) return;
    const nouvelle = allumees.find((region) => !avant.has(region.id));
    if (nouvelle !== undefined) fixerDerniere(nouvelle);
  }, [empreinteAllumees, allumees]);

  const etape = etat.etapes[etat.indexEtape];
  const elementsParReceptacle = useMemo(() => {
    const carte = new Map<string, ElementTri[]>();
    for (const receptacle of contenu.receptacles) carte.set(receptacle.id, []);
    for (const element of contenu.elements) {
      // Les cases des vagues à venir n'apparaissent qu'avec leurs mots.
      if (!idsMontres.has(element.id)) continue;
      const liste = carte.get(element.receptacleAttendu);
      if (liste !== undefined) liste.push(element);
    }
    return carte;
  }, [contenu.receptacles, contenu.elements, idsMontres]);

  const elementRefuse = etat.dernierRefus === null ? null : etat.dernierRefus.element;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  /** Vise la fente de CET élément, dans SON réceptacle — quel que soit celui qu'on a tapé. Le
   * vol ne se joue que si `nbAcquis` grandit, donc un dépôt refusé ne consomme jamais la visée. */
  const viser = useCallback(
    (elementId: string): void => {
      volVise.current = null;
      const arrivee = centreDuReceptacle(racine.current, refFentes.current.get(elementId) ?? null);
      if (arrivee === null) return;
      // Le départ est le centre mesuré du mot, dans le même repère que l'arrivée.
      const prise = racine.current?.querySelector(`[data-element="${CSS.escape(elementId)}"]`) ?? null;
      const depart = centreDuReceptacle(racine.current, prise);
      if (depart === null) return;
      volVise.current = {
        cle: elementId,
        texte: elementsParId.get(elementId)?.libelle ?? '',
        depart,
        arrivee,
      };
    },
    [elementsParId],
  );

  const taperElement = useCallback(
    (element: ElementTri, evenement: { clientX: number; clientY: number }) => {
      jouer({ type: 'saisir', element: element.id }, evenement);
    },
    [jouer],
  );

  const deposerDans = useCallback(
    (receptacleId: string, evenement: { clientX: number; clientY: number }) => {
      if (etat.elementSaisi === null) return;
      viser(etat.elementSaisi);
      jouer({ type: 'deposer', element: etat.elementSaisi, receptacle: receptacleId }, evenement);
    },
    [etat.elementSaisi, viser, jouer],
  );

  // --- le glisser, chemin second (R16 : le tap reste principal) ---------------
  const capteurs = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const auDebutDuGlisse = useCallback(
    (evenement: DragStartEvent) => {
      emettre({ type: 'saisir', element: String(evenement.active.id) });
    },
    [emettre],
  );

  const auBoutDuGlisse = useCallback(
    (evenement: DragEndEvent) => {
      const elementId = String(evenement.active.id);
      if (evenement.over === null) return;
      const receptacleId = String(evenement.over.id);
      // Pas de vol ici : le glisser a déjà montré le trajet sous le doigt. Un second vol par-
      // dessus rejouerait le même trajet et paraîtrait faux.
      emettre({ type: 'deposer', element: elementId, receptacle: receptacleId });
    },
    [emettre],
  );

  return (
    <DndContext sensors={capteurs} onDragStart={auDebutDuGlisse} onDragEnd={auBoutDuGlisse}>
      <DispositionMoteur
        moteur="tri"
        hauteurPetitEcran="contenu"
        data-habillage={habillage.id}
        data-termine={etat.termineMs === null ? 'non' : 'oui'}
        data-aide={etat.niveauAide}
        data-etape={etape === undefined ? '' : etape.identifiant}
        data-regions-allumees={String(allumees.length)}
        data-vagues={`${String(vagueMontree + 1)}/${String(vagues.length)}`}
        data-disposition={modeGrille ? 'grille' : 'decor'}
        // Ce qui a décidé de la disposition, lisible par les bancs : `aucun` sur le décor ; sinon
        // la condition qui a fait basculer en grille (comptes du placement, ou mesure après rendu).
        data-repli={
          chevauchementsRendus > 0
            ? 'chevauchements'
            : horsBornesRendus > 0
              ? 'hors-bornes'
              : lignesTropPeuplees
                ? 'lignes'
                : modeGrille
                ? 'mesure'
                : 'aucun'
        }
        // `semis` (quinconce, `semis.ts`), sinon le repli de `deriverEmplacements` : `regions` ou `lignes`.
        data-placement={placement === 'semis' ? 'semis' : resultat.repli}
        scene={
          <div ref={racine} className={`tri-cadre tri-cadre--${modeGrille ? 'grille' : 'decor'}`} data-serre={grilleSerree ? 'oui' : 'non'}>
            {/* Le décor est le fond : il couvre la scène et se recolorie à mesure. */}
            <SceneDecor
              habillage={habillage}
              allumees={allumees}
              derniere={derniere}
              animationsDesactivees={animationsDesactivees}
              ajustement="contenir"
              zoom={ZOOM_DECOR_TRI}
            />

            <div className="tri-plateau" data-plateau="elements">
              {/* Les mots à ranger, devant le décor — dans l'ordre MÉLANGÉ de l'état, jamais celui
                  du fichier : en grille, l'ordre du fichier donnait la réponse (tableau, E16). */}
              <div className="tri-mots">
                {elementsMontres.map((element) => (
                  <ElementFlottant
                    key={element.id}
                    element={element}
                    emplacement={modeGrille ? null : (emplacementParElement.get(element.id) ?? null)}
                    saisi={etat.elementSaisi === element.id}
                    range={etat.acquis[element.id] !== undefined}
                    enRefus={!animationsDesactivees && elementRefuse === element.id}
                    marqueRefus={marqueRefusCourante}
                    onTaper={taperElement}
                  />
                ))}
              </div>

              {/* Les réceptacles, sous les mots. */}
              <div className="tri-receptacles" data-plateau="receptacles">
                {contenu.receptacles.map((receptacle, rang) => (
                  <PanneauReceptacle
                    key={receptacle.id}
                    receptacle={receptacle}
                    geometrie={modeGrille ? null : (panneaux.find((p) => p.receptacle.id === receptacle.id) ?? null)}
                    elements={elementsParReceptacle.get(receptacle.id) ?? []}
                    acquis={etat.acquis}
                    attend={etat.elementSaisi !== null}
                    // `couleurDeRegion`, jamais un index brut dans `palette.nuancier` : elle écarte
                    // les deux teintes neutres (`gris`, `blanc`) qui se confondraient avec le fond.
                    couleur={couleurDeRegion(habillage, rang)}
                    mesurerFente={modeGrille ? mesurerFenteEnGrille : mesurerFente}
                    onDeposer={(evenement) => {
                      deposerDans(receptacle.id, evenement);
                    }}
                    brancherFente={(id, noeud) => {
                      refFentes.current.set(id, noeud);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Le mot qui traverse atterrit DANS la fente, jamais au-dessus. */}
            {vol === null ? null : (
              <div key={vol.marque} className="tri-vol">
                <JetonEnVol vol={vol} dureeMs={DUREE_VOL_MS} />
              </div>
            )}

            {/* Retour immédiat, posé sur l'image : il ne prend pas de hauteur à la scène, qui
                « sautait » à chaque refus quand il vivait dans un pied. */}
            {(messageDeRefus !== '' || etat.aide !== null) && (
              <div className="tri-message" data-message-tri="visible">
                {messageDeRefus !== '' ? messageDeRefus : (etat.aide?.texte ?? 'Gobi te guide.')}
              </div>
            )}
          </div>
        }
        pied={
          <>
            {/* R49 — la consigne est portée par `EcranNoeud` ; ne reste ici que le GESTE, que
                seul le moteur connaît (`etat.elementSaisi`). */}
            {/* T10 / E03 — AUCUN repère « Étape n sur N » ici, et c'est mesuré : le réducteur
                accepte tout mot posé dans son bon panier, quelle que soit l'étape
                (tests/unitaires/tri-etapes-non-contraignantes.test.ts). Annoncer « Étape 1 sur
                2 : les mots de couleur à gauche » décrivait une contrainte qui n'existe pas ; la
                consigne de l'écran (« Range chaque mot dans le bon panier ») suffit. */}
            <p
              className="tri-geste"
              data-consigne-geste={etat.elementSaisi === null ? 'choisir' : 'deposer'}
              role="status"
              aria-live="polite"
              {...ROLE_QUESTION}
            >
              <TexteColore texte={etat.elementSaisi === null
                ? 'Touche un mot pour le prendre.'
                : 'Maintenant, touche l’endroit où il va.'} />
            </p>
            <div className="tri-annonce" data-plateau="messages">
              <p
                role="status"
                aria-live="polite"
                data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
                data-animations={animationsDesactivees ? 'calmes' : 'vives'}
              >
                {messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus}
              </p>
            </div>
          </>
        }
      />
    </DndContext>
  );
}
