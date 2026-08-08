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
 *      (`transformeSlice`/`versPixels`) : le panneau du wagon est donc à l'endroit où le wagon
 *      est dessiné, jamais un rectangle gris flottant ailleurs ;
 *   3. **les mots sont devant**, à des emplacements DÉRIVÉS (`deriverEmplacements`), jamais
 *      écrits à la main ;
 *   4. **le mot atterrit DANS le réceptacle** — chaque réceptacle réserve, dès le départ, une
 *      `Fente` (`../phrase/receptacles.js`, le module générique écrit pour être adopté) par
 *      élément qui lui est destiné ; le vol vise le CENTRE MESURÉ de cette fente ;
 *   5. **le refus est une oscillation centrée** — porteur qui centre, bouton qui oscille,
 *      propriétés disjointes (R54) ;
 *   6. **un second chemin, le glisser** — `tri` a de VRAIES destinations (2-3 réceptacles),
 *      contrairement à `phrase` qui n'en a qu'une : le glisser y a donc un sens. Repris de
 *      `../place/MoteurPlace.js` : `PointerSensor`, `activationConstraint: { distance: 8 }`,
 *      `touch-action: none`. Le tap-puis-tap reste le chemin PRINCIPAL.
 *
 * ── CE QUI N'EST PAS RÉUTILISABLE TEL QUEL, ET POURQUOI ──────────────────────────────────────
 * `Fente` de `receptacles.tsx` réserve UNE boîte pour UN texte. Un réceptacle de `tri` en reçoit
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  transformeSlice,
  versPixels,
} from '../../habillages/emplacements.js';
import type {
  Boite,
  Bornes,
  Cadre,
  Emplacement,
  TransformeDecor,
} from '../../habillages/emplacements.js';
import { ZoneDeLecture, styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';
import {
  FEUILLE_DU_VOL,
  Fente,
  JetonEnVol,
  centreDuReceptacle,
  decalageEntre,
} from '../phrase/receptacles.js';
import type { VolDuJeton } from '../phrase/receptacles.js';

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
// R49 — la consigne n'est plus redite ici (`EcranNoeud` la porte déjà) : le bandeau du haut ne
// tient plus qu'une ligne de geste, d'où une hauteur de repli bien plus basse qu'avant.
const HAUTEUR_BANDEAU_REPLI = 56;
const HAUTEUR_PIED_REPLI = 56;

/** Respiration entre une pastille et le bord du cadre, en pixels. */
const MARGE = 14;
/** Sous cette distance d'un bord, une région n'est presque pas dessinée : on ne l'utilise pas. */
const MARGE_VISIBILITE = 28;
/** Respiration entre la zone des mots et le haut des panneaux de réceptacles. */
const ESPACE_AVANT_RECEPTACLES = 16;

/** `.cible` — `padding: 0.75rem 1.25rem`, `border: 4px`. Sert à estimer l'encombrement. */
const PADDING_X = 20;
const PADDING_Y = 12;
const BORDURE = 4;
const CIBLE_MIN = 64;
const LARGEUR_GLYPHE = 0.66;

/** La fente d'un réceptacle est un accusé de réception, pas la cible de lecture principale :
 * l'enfant a déjà déchiffré le mot pour choisir sa pastille. Elle reste lisible, en plus petit. */
const FENTE_CORPS_PX = 16;
const FENTE_PADDING_X = 8;
const FENTE_PADDING_Y = 6;
const FENTE_BORDURE = 3;
const FENTE_MIN = 40;

const DUREE_VOL_MS = 320;

function ZONE_DE_JEU(hauteurBandeau: number, hauteurPied: number): CSSProperties {
  return {
    insetInlineStart: 0,
    insetInlineEnd: 0,
    insetBlockStart: `${String(hauteurBandeau)}px`,
    insetBlockEnd: `${String(hauteurPied)}px`,
  };
}

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
}

/** Les panneaux des réceptacles, dérivés de `receptacle.zone` — AUCUNE coordonnée écrite ici. */
function panneauxReceptacles(
  receptacles: readonly ReceptacleTri[],
  t: TransformeDecor,
): readonly PanneauReceptacleGeometrie[] {
  return receptacles.map((receptacle) => {
    const b = bornesDuPolygone(receptacle.zone);
    const [x1, y1] = versPixels([b.xMin, b.yMin], t);
    const [x2, y2] = versPixels([b.xMax, b.yMax], t);
    return {
      receptacle,
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      largeur: Math.abs(x2 - x1),
      hauteur: Math.abs(y2 - y1),
    };
  });
}

// ------------------------------------------------------------------ le mot flottant, sur le décor

interface ProprietesElementFlottant {
  readonly element: ElementTri;
  readonly emplacement: Emplacement;
  readonly saisi: boolean;
  readonly range: boolean;
  readonly enRefus: boolean;
  readonly marqueRefus: number;
  readonly styleTexte: CSSProperties;
  onTaper(element: ElementTri, evenement: { clientX: number; clientY: number }): void;
}

function ElementFlottant({
  element,
  emplacement,
  saisi,
  range,
  enRefus,
  marqueRefus,
  styleTexte,
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
      style={{
        position: 'absolute',
        insetInlineStart: `${String(emplacement.x)}px`,
        insetBlockStart: `${String(emplacement.y)}px`,
        // Le SEUL rôle de ce porteur : centrer. Aucune classe, donc aucune animation ne peut lui
        // reprendre cette transformation (R54).
        transform: `translate(-50%, -50%)${glisse}`,
        display: 'inline-flex',
        pointerEvents: 'none',
        zIndex: saisi ? 1 : 0,
      }}
    >
      <button
        ref={setNodeRef}
        key={enRefus ? `${element.id}-${String(marqueRefus)}` : element.id}
        type="button"
        className={classes.join(' ')}
        data-element={element.id}
        data-saisi={saisi ? 'oui' : 'non'}
        data-range={range ? 'oui' : 'non'}
        onClick={(evenement) => {
          onTaper(element, evenement);
        }}
        {...listeners}
        {...attributes}
        aria-pressed={saisi}
        style={
          {
            ...styleTexte,
            pointerEvents: 'auto',
            touchAction: 'none',
            whiteSpace: 'nowrap',
            outline: saisi ? '4px solid var(--soleil, #FFC93C)' : undefined,
            outlineOffset: saisi ? '3px' : undefined,
            fontWeight: saisi ? 700 : undefined,
            // Rangé : il ne s'efface JAMAIS (R14), il se calme. C'est le seul indice que sa
            // fente, dans son réceptacle, porte désormais son texte.
            opacity: range ? 0.55 : 1,
          } as CSSProperties
        }
      >
        {element.libelle}
      </button>
    </span>
  );
}

// ------------------------------------------------------------------ le panneau d'un réceptacle

interface ProprietesPanneauReceptacle {
  readonly geometrie: PanneauReceptacleGeometrie;
  readonly elements: readonly ElementTri[];
  readonly acquis: Readonly<Record<string, string>>;
  readonly restantes: readonly string[];
  readonly attend: boolean;
  readonly couleur: string;
  readonly styleTexteFente: CSSProperties;
  readonly mesurerFente: (id: string) => Boite;
  onDeposer(evenement: { clientX: number; clientY: number }): void;
  brancherFente(id: string, noeud: HTMLElement | null): void;
}

function PanneauReceptacle({
  geometrie,
  elements,
  acquis,
  restantes,
  attend,
  couleur,
  styleTexteFente,
  mesurerFente,
  onDeposer,
  brancherFente,
}: ProprietesPanneauReceptacle): ReactElement {
  const { receptacle, x, y, largeur, hauteur } = geometrie;
  const { setNodeRef, isOver } = useDroppable({ id: receptacle.id });

  return (
    <div
      style={{
        position: 'absolute',
        insetInlineStart: `${String(x)}px`,
        insetBlockStart: `${String(y)}px`,
        inlineSize: `${String(Math.max(largeur, CIBLE_MIN * 2))}px`,
        minBlockSize: `${String(Math.max(hauteur, CIBLE_MIN))}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.35rem',
      }}
    >
      {/* Le critère, HORS du bouton de dépôt : `ZoneDeLecture` peut monter son propre bouton de
          guidage de ligne selon le profil de lecture. Un bouton dans un bouton est une
          infraction `nested-interactive` (la même que `ScenePlace` a réparée) — les deux
          restent donc des FRÈRES, jamais l'un dans l'autre. */}
      <ZoneDeLecture texte={receptacle.critere} motsCles={[]} />
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
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignContent: 'flex-start',
          gap: '0.3rem',
          inlineSize: '100%',
          minBlockSize: `${String(Math.max(hauteur, CIBLE_MIN))}px`,
          padding: '0.6rem',
          borderRadius: 'var(--rayon-carte)',
          border: `var(--epaisseur-trait) ${attend || isOver ? 'solid' : 'dashed'} var(--trait)`,
          backgroundColor: isOver
            ? couleur
            : `color-mix(in srgb, ${couleur} 22%, var(--parchemin) 78%)`,
          boxShadow: attend ? 'var(--ombre-bd)' : 'var(--ombre-bd-appui)',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        {elements.map((element) => (
          <Fente
            key={element.id}
            cle={element.id}
            texte={acquis[element.id] !== undefined ? element.libelle : null}
            boite={mesurerFente(element.id)}
            prochaine={restantes.includes(element.id)}
            styleTexte={styleTexteFente}
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
  const racine = useRef<HTMLDivElement | null>(null);
  const bandeau = useRef<HTMLDivElement | null>(null);
  const pied = useRef<HTMLDivElement | null>(null);
  const coucheElements = useRef<HTMLDivElement | null>(null);
  const [cadre, fixerCadre] = useState<Cadre>(CADRE_DE_REPLI);
  const [hauteurBandeau, fixerHauteurBandeau] = useState(HAUTEUR_BANDEAU_REPLI);
  const [hauteurPied, fixerHauteurPied] = useState(HAUTEUR_PIED_REPLI);

  useEffect(() => {
    const noeud = racine.current;
    if (noeud === null) return undefined;

    const relever = (): void => {
      const rect = noeud.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fixerCadre({ largeur: rect.width, hauteur: rect.height });
      }
      const hautBandeau = bandeau.current?.getBoundingClientRect().height ?? 0;
      if (hautBandeau > 0) fixerHauteurBandeau(hautBandeau);
      const hautPied = pied.current?.getBoundingClientRect().height ?? 0;
      if (hautPied > 0) fixerHauteurPied(hautPied);
    };

    relever();

    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(relever);
    observateur.observe(noeud);
    if (bandeau.current !== null) observateur.observe(bandeau.current);
    if (pied.current !== null) observateur.observe(pied.current);
    return () => {
      observateur.disconnect();
    };
  }, []);

  // --- la typographie --------------------------------------------------------
  const reglages = useReglagesLecture();
  const styleLecture = useMemo(() => styleDeLecture(reglages), [reglages]);
  const styleFente = useMemo<CSSProperties>(
    () => ({ fontFamily: styleLecture.fontFamily, fontSize: `${String(FENTE_CORPS_PX)}px` }) as CSSProperties,
    [styleLecture],
  );

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

  // --- la dérivation -----------------------------------------------------------
  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);

  const cadreJeu = useMemo<Cadre>(
    () => ({
      largeur: cadre.largeur,
      hauteur: Math.max(cadre.hauteur - hauteurBandeau - hauteurPied, CIBLE_MIN + 2 * MARGE),
    }),
    [cadre, hauteurBandeau, hauteurPied],
  );

  const vb = useMemo(() => lireViewBox(habillage.scene.viewBox), [habillage]);
  const transformeDecor = useMemo(() => transformeSlice(vb, cadreJeu), [vb, cadreJeu]);

  const panneaux = useMemo(
    () => panneauxReceptacles(contenu.receptacles, transformeDecor),
    [contenu.receptacles, transformeDecor],
  );

  const bornes = useMemo<Bornes>(() => {
    const hautDesReceptacles =
      panneaux.length === 0
        ? cadreJeu.hauteur
        : Math.min(...panneaux.map((p) => p.y));
    return {
      xMin: MARGE,
      yMin: MARGE,
      xMax: Math.max(cadreJeu.largeur - MARGE, MARGE + CIBLE_MIN),
      // Les mots ne descendent jamais sous le haut des panneaux de réceptacles : c'est ce qui
      // évite que la zone des mots et celle des réceptacles se chevauchent.
      yMax: Math.max(
        Math.min(cadreJeu.hauteur - MARGE, hautDesReceptacles - ESPACE_AVANT_RECEPTACLES),
        MARGE + CIBLE_MIN,
      ),
    };
  }, [cadreJeu, panneaux]);

  const cles = useMemo(() => etat.elements.map((e) => e.id), [etat.elements]);

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

  const emplacementParElement = useMemo(
    () => new Map(resultat.emplacements.map((e) => [e.cle, e] as const)),
    [resultat],
  );

  const allumees = useMemo<readonly RegionAllumee[]>(() => {
    const centroideParRegion = new Map(regions.map((r) => [r.id, r.centroide] as const));
    const liste: RegionAllumee[] = [];
    for (const emplacement of resultat.emplacements) {
      if (emplacement.region === null) continue;
      if (etat.acquis[emplacement.cle] === undefined) continue;
      liste.push({
        id: emplacement.region,
        couleur: emplacement.couleur,
        centroide: centroideParRegion.get(emplacement.region) ?? [0, 0],
      });
    }
    return liste;
  }, [resultat, etat.acquis, regions]);

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
      const liste = carte.get(element.receptacleAttendu);
      if (liste !== undefined) liste.push(element);
    }
    return carte;
  }, [contenu.receptacles, contenu.elements]);

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
      const emplacement = emplacementParElement.get(elementId);
      if (emplacement === undefined) return;
      const libelle = elementsParId.get(elementId)?.libelle ?? '';
      const [decX, decY] = decalageEntre(racine.current, coucheElements.current);
      volVise.current = {
        cle: elementId,
        texte: libelle,
        depart: [emplacement.x + decX, emplacement.y + decY],
        arrivee,
      };
    },
    [emplacementParElement, elementsParId],
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
      <div
        ref={racine}
        data-moteur="tri"
        data-habillage={habillage.id}
        data-termine={etat.termineMs === null ? 'non' : 'oui'}
        data-aide={etat.niveauAide}
        data-etape={etape === undefined ? '' : etape.identifiant}
        data-regions-allumees={String(allumees.length)}
        style={{
          position: 'relative',
          blockSize: '100%',
          minBlockSize: 0,
          overflow: 'hidden',
          borderRadius: 'var(--rayon-carte)',
        }}
      >
        <style>{FEUILLE_DU_VOL}</style>

        {/* ── R49 — LA CONSIGNE N'EST PLUS RÉPÉTÉE ICI ────────────────────────────────────
            `EcranNoeud` la porte déjà, en tête d'écran (`barre-consigne`, `data-consigne`),
            AVEC le vrai `BoutonEcouter` — et elle y reste affichée tout le temps que l'étape
            est courante, pas seulement le temps d'une annonce. Le père : « la phrase est en
            haut et en bas, il y a doublon ». Pour `tri`, la consigne PORTE le critère de tri
            (« Range les mots où tu entends… ») : vérifié ci-dessus, l'en-tête le garde visible
            pendant toute l'étape, donc rien n'est perdu à ne plus le redire ici. Ce qui reste,
            c'est le SEUL texte que `EcranNoeud` ne peut pas connaître : le GESTE, qui dépend
            de `etat.elementSaisi` (R16). */}
        <div
          ref={bandeau}
          data-plateau="geste"
          style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, insetBlockStart: 0, zIndex: 2 }}
        >
          <p
            data-consigne-geste={etat.elementSaisi === null ? 'choisir' : 'deposer'}
            role="status"
            aria-live="polite"
            style={{ margin: 0, fontSize: '1.125rem', opacity: 0.9 }}
          >
            {etat.elementSaisi === null
              ? 'Touche un mot pour le prendre.'
              : 'Maintenant, touche l’endroit où il va.'}
          </p>
        </div>

        {/* ── le décor, en fond : couvre la zone de jeu, se recolorie à mesure ────────────── */}
        <div style={{ position: 'absolute', ...ZONE_DE_JEU(hauteurBandeau, hauteurPied), zIndex: 0 }}>
          <SceneDecor
            habillage={habillage}
            allumees={allumees}
            derniere={derniere}
            animationsDesactivees={animationsDesactivees}
          />
        </div>

        {/* ── les mots, devant, à des emplacements dérivés ────────────────────────────────── */}
        <div
          ref={coucheElements}
          data-plateau="elements"
          style={{
            position: 'absolute',
            ...ZONE_DE_JEU(hauteurBandeau, hauteurPied),
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          {contenu.elements.map((element) => {
            const emplacement = emplacementParElement.get(element.id);
            if (emplacement === undefined) return null;
            return (
              <ElementFlottant
                key={element.id}
                element={element}
                emplacement={emplacement}
                saisi={etat.elementSaisi === element.id}
                range={etat.acquis[element.id] !== undefined}
                enRefus={!animationsDesactivees && elementRefuse === element.id}
                marqueRefus={marqueRefusCourante}
                styleTexte={styleLecture as CSSProperties}
                onTaper={taperElement}
              />
            );
          })}
        </div>

        {/* ── les réceptacles, posés sur le décor : la boîte de `zone`, en pixels ─────────── */}
        <div
          style={{ position: 'absolute', ...ZONE_DE_JEU(hauteurBandeau, hauteurPied), zIndex: 1 }}
        >
          {panneaux.map((geometrie, rang) => (
            <PanneauReceptacle
              key={geometrie.receptacle.id}
              geometrie={geometrie}
              elements={elementsParReceptacle.get(geometrie.receptacle.id) ?? []}
              acquis={etat.acquis}
              restantes={etape?.restantes ?? []}
              attend={etat.elementSaisi !== null}
              // `couleurDeRegion`, jamais un index brut dans `palette.nuancier` : c'est elle qui
              // écarte les deux teintes NEUTRES (`gris`≡grisaille éteinte, `blanc`≡parchemin) —
              // sans ce filtre, un réceptacle assigné à l'une des deux se confondrait avec son
              // propre fond (le défaut mesuré sur `phrase`, `emplacements.ts:169-214`).
              couleur={couleurDeRegion(habillage, rang)}
              styleTexteFente={styleFente}
              mesurerFente={mesurerFente}
              onDeposer={(evenement) => {
                deposerDans(geometrie.receptacle.id, evenement);
              }}
              brancherFente={(id, noeud) => {
                refFentes.current.set(id, noeud);
              }}
            />
          ))}
        </div>

        {/* ── le mot qui traverse — il atterrit DANS la fente, jamais au-dessus ───────────── */}
        {vol === null ? null : (
          <div
            key={vol.marque}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
          >
            <JetonEnVol vol={vol} dureeMs={DUREE_VOL_MS} styleTexte={styleFente} />
          </div>
        )}

        {/* ── le pied de page : le refus ou l'aide, jamais les deux, aucune animation ─────── */}
        <div
          ref={pied}
          data-plateau="messages"
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            insetInlineEnd: 0,
            insetBlockEnd: 0,
            zIndex: 2,
          }}
        >
          <p
            role="status"
            aria-live="polite"
            data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
            data-animations={animationsDesactivees ? 'calmes' : 'vives'}
            style={{ margin: 0, minBlockSize: '1.5em' }}
          >
            {messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus}
          </p>
        </div>
      </div>
    </DndContext>
  );
}
