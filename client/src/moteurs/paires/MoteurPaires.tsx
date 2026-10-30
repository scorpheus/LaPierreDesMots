/**
 * `MoteurPaires` — le composant hôte du moteur `paires`. Lot de portage de la mise en scène.
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurPaires` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionPaires`, fait battre l'horloge, déclenche le retour
 * sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI EST PORTÉ, ET DEPUIS OÙ — même source que `tri` : `client/src/moteurs/phrase/`, validée
 * par le père (« la vibration des mauvais clics est bien, le déplacement vers la case vide est
 * bien » puis « fais les beaux design »).
 *
 *   1. **le décor est le fond**, il couvre la zone de jeu et se recolorie à mesure — chaque
 *      carte APPARIÉE rallume la région où elle est posée (`SceneDecor`, `emplacements.ts`) ;
 *   2. **les cartes sont devant**, à des emplacements DÉRIVÉS de `etat.cartes` (déjà mélangé une
 *      fois par `Alea` à la création, R32/R44 — jamais recalculé ici) ;
 *   3. **le refus est une oscillation centrée** — porteur qui centre, carte qui oscille,
 *      propriétés disjointes (R54) ;
 *   4. **un second chemin, le glisser** : ce moteur n'a pas de « réceptacle » au sens de `tri`
 *      — apparier, c'est amener une carte SUR une autre. Glisser la carte-mot sur la carte-image
 *      (ou l'inverse) simule la même paire de taps que le chemin principal.
 *
 * ── CE QUI N'EST PAS RÉUTILISÉ DE `../commun/fentes.js`, ET POURQUOI ────────────────────────
 * `Fente` et `JetonEnVol` supposent une case VIDE qui attend un jeton précis — la loi de R59.
 * `paires` n'a pas cette case : une carte retournée reste à SA place, elle ne vole nulle part,
 * et « apparier » ne désigne aucune case tierce. Le vol du module ne s'applique donc pas ; ce
 * qui s'applique, et qui EST repris, c'est la loi elle-même transposée : chaque carte occupe,
 * dès la création de l'état, un emplacement DÉRIVÉ et STABLE (jamais recalculé quand une autre
 * carte est acquise) — c'est cette stabilité, et non une case explicite, qui tient R59 ici.
 *
 * La face `image` affiche son asset lorsqu'il existe et ne révèle jamais son libellé à l'écran :
 * le libellé reste le nom accessible du bouton. Un contenu ancien sans asset conserve un repli
 * textuel afin de ne jamais rendre une carte vide.
 *
 * TROIS INVARIANTS DE RENDU, inchangés et opposables :
 *   - aucun `data-etat="echec"` n'est émis ici, ni ailleurs (R14) ;
 *   - aucun rouge sur un refus : la cible oscille, elle ne se colore pas ;
 *   - toute cible fait au moins 64 px (`var(--cible-min)`).
 *
 * ── R49 — LA CONSIGNE N'EST PLUS RÉPÉTÉE ICI ──────────────────────────────────────────────────
 * « la phrase est en haut et en bas, il y a doublon » (le père). `EcranNoeud` la porte déjà, en
 * tête d'écran, avec le vrai `BoutonEcouter`. `paires` n'avait rien d'autre à dire dans son
 * bandeau du haut — pas de geste dépendant de l'état, contrairement à `tri` — donc le bandeau
 * a disparu entièrement plutôt que de rester vide.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import { MessageStable } from '../../composants/MessageStable.js';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { DndContext, MouseSensor, TouchSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent, DragStartEvent, Modifier } from '@dnd-kit/core';
import type { ActionPaires, ContenuPaires, EtatPaires } from '@pierre/partage';

import { urlAsset } from '../../api/client.js';
import { SceneDecor } from '../../habillages/SceneDecor.js';
import type { RegionAllumee } from '../../habillages/SceneDecor.js';
import { deriverEmplacements, regionsColoriables } from '../../habillages/emplacements.js';
import type { Boite, Bornes, Cadre } from '../../habillages/emplacements.js';
import { DispositionMoteur } from '../../activite/DispositionMoteur.js';
import { RepereEtape } from '../../activite/RepereEtape.js';
import { composerCartesPaires } from './composition.js';
import { decouperEnVagues, policesChargees, vagueDeLEtape } from '../commun/vagues.js';
import './paires.css';
import { styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';
import { ROLE_REPONSE } from '../../activite/Question.js';
import { TexteColore } from '../../lecture/TexteColore.js';

/**
 * `CartePaires` ne figure pas au barillet (`@pierre/partage` n'exporte que `ContenuPaires`,
 * `EtatPaires`, `ActionPaires` — vérifié dans `partage/src/index.ts`). Dérivé localement,
 * comme `tri` le fait pour `ElementTri`/`ReceptacleTri`, plutôt que d'ajouter un symbole au
 * barillet pour un lot de rendu.
 */
type CartePaires = ContenuPaires['cartes'][number];

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** Une grande carte-phrase ne doit pas choisir sa voisine à la place de l'image sous le doigt. */
const carteSousLePointeur: CollisionDetection = (argumentsCollision) => pointerWithin({
  ...argumentsCollision,
  droppableContainers: argumentsCollision.droppableContainers.filter(
    (cible) => cible.id !== argumentsCollision.active.id,
  ),
});

/** Garder le carton dans la largeur utile sans changer la cible désignée par le doigt.
 * Le défilement vertical reste possible sur téléphone ; un auto-scroll horizontal ferait
 * changer les coordonnées de toutes les cibles pendant le dépôt. */
const contenirGlisseHorizontal: Modifier = ({ transform, draggingNodeRect, windowRect }) => {
  if (draggingNodeRect === null || windowRect === null) return transform;
  return {
    ...transform,
    x: Math.max(8 - draggingNodeRect.left,
      Math.min(transform.x, windowRect.width - draggingNodeRect.right - 8)),
  };
};
const MODIFICATEURS_GLISSE = [contenirGlisseHorizontal];

/** Même requête que le « petit écran » de `activite/socle.css` : là seulement, la page défile. */
const REQUETE_PAGE_DEFILANTE = '(max-width: 600px), (max-height: 500px)';

function usePageDefilante(): boolean {
  const lire = (): boolean => typeof matchMedia === 'function' && matchMedia(REQUETE_PAGE_DEFILANTE).matches;
  const [defilante, fixer] = useState(lire);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined;
    const requete = matchMedia(REQUETE_PAGE_DEFILANTE);
    const suivre = (): void => { fixer(requete.matches); };
    requete.addEventListener('change', suivre);
    return () => { requete.removeEventListener('change', suivre); };
  }, []);
  return defilante;
}

/** Largeur minimale d'une colonne : une image de 96 px et le cadre de sa carte. */
const LARGEUR_COLONNE_MIN = 112;
const COLONNES_PAR_DEFAUT = 4;

interface DispositionGrille {
  readonly colonnes: number;
  readonly serree: boolean;
  /** Côté de l'image d'une carte, en pixels : le plancher est 96, elle grandit si la place le permet. */
  readonly image: number;
}

const IMAGE_MIN = 96;
const IMAGE_MAX = 192;
/** Bordure et marges internes d'une carte, quand aucune carte-image n'est là pour les mesurer. */
const CADRE_CARTE = 20;

/** Bordure et rembourrage réels d'une carte-image, retirés de la cellule pour l'image. */
function cadreCarte(grille: HTMLElement): number {
  const carte = grille.querySelector('[data-illustration-carte]')?.closest('[data-carte]');
  if (carte === null || carte === undefined) return CADRE_CARTE;
  const s = getComputedStyle(carte);
  const somme = (...valeurs: string[]): number => valeurs.reduce((total, v) => total + (Number.parseFloat(v) || 0), 0);
  return Math.ceil(Math.max(
    somme(s.borderTopWidth, s.borderBottomWidth, s.paddingTop, s.paddingBottom),
    somme(s.borderLeftWidth, s.borderRightWidth, s.paddingLeft, s.paddingRight),
  ));
}

/**
 * Côté de l'image que permet une grille de `colonnes` colonnes. `parLargeurSeule` : la hauteur
 * n'est pas bornée (la page défile), seule la largeur d'une colonne compte.
 */
function coteImage(grille: HTMLElement, colonnes: number, nombreCartes: number, parLargeurSeule: boolean): number {
  const style = getComputedStyle(grille);
  const ecart = Number.parseFloat(style.rowGap) || 0;
  const margeX = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
  const margeY = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
  const rangees = Math.ceil(nombreCartes / colonnes);
  const largeurCellule = (grille.clientWidth - margeX - (colonnes - 1) * ecart) / colonnes;
  const hauteurCellule = parLargeurSeule
    ? Number.POSITIVE_INFINITY
    : (grille.clientHeight - margeY - (rangees - 1) * ecart) / rangees;
  const cote = Math.floor(Math.min(largeurCellule, hauteurCellule) - cadreCarte(grille));
  return Math.max(IMAGE_MIN, Math.min(IMAGE_MAX, cote));
}

/**
 * Le débordement RÉEL de la grille, des deux côtés. Elle est centrée (`align-content: center`) :
 * trop haute, elle déborde aussi vers le haut, et `scrollHeight` ne voit que le bas. Mesuré le
 * 30 oct. : des cartes 1 px au-dessus et 3 px au-dessous du plateau, rognées, sur une grille
 * réputée « tenir ».
 */
function debordementReel(grille: HTMLElement): number {
  const cartes = [...grille.querySelectorAll<HTMLElement>('[data-carte]')].map((c) => c.getBoundingClientRect());
  if (cartes.length === 0) return Math.max(0, grille.scrollHeight - grille.clientHeight);
  const haut = grille.getBoundingClientRect().top + grille.clientTop;
  const bas = haut + grille.clientHeight;
  return Math.max(0, haut - Math.min(...cartes.map((r) => r.top)))
    + Math.max(0, Math.max(...cartes.map((r) => r.bottom)) - bas);
}

/** Une carte dont le texte dépasse son cadre est tronquée pour l'enfant. */
function carteTronquee(grille: HTMLElement): boolean {
  return [...grille.querySelectorAll<HTMLElement>('[data-carte]')].some((carte) =>
    carte.scrollHeight > carte.clientHeight + 1 || carte.scrollWidth > carte.clientWidth + 1);
}

/**
 * Après la meilleure disposition, une carte que l'enfant ne peut ni lire ni toucher : tronquée,
 * hors de l'écran, rognée par un ancêtre, ou recouverte en son centre — le critère S1/S10 de la
 * garde du socle. C'est là, et seulement là, que l'exercice se découpe en vagues. `tient` est plus
 * exigeant (le moindre pixel de débordement de la grille), et la scène aussi : mesuré le 30 oct.,
 * des cartes 46 px sous la scène restaient visibles et touchables, et l'on découpait des plateaux
 * que l'enfant voyait entiers (`parcours-paires-cadrage` : 30 sur 32 verts sans vagues).
 */
function cartesCachees(grille: HTMLElement): boolean {
  if (carteTronquee(grille)) return true;
  if (!hauteurBornee(grille)) return false;
  const vh = document.documentElement.clientHeight;
  const vw = document.documentElement.clientWidth;
  return [...grille.querySelectorAll<HTMLElement>('[data-carte]')].some((carte) => {
    const r = carte.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    if (r.top < -1 || r.left < -1 || r.bottom > vh + 1 || r.right > vw + 1) return true;
    for (let p = carte.parentElement; p !== null && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const c = p.getBoundingClientRect();
      // Plus strict que les gardes (1 et 2 px) : un bord de carte rogné d'un pixel se voit.
      if (r.top < c.top - 0.5 || r.left < c.left - 0.5 || r.bottom > c.bottom + 0.5 || r.right > c.right + 0.5) return true;
    }
    const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return dessus !== null && !carte.contains(dessus) && !dessus.contains(carte);
  });
}

/**
 * La scène a-t-elle une hauteur fixe ? Sur petit écran, le socle laisse la page défiler et la
 * scène prend la hauteur de son contenu : `.cadre-scene-activite` n'y contient plus que la largeur.
 */
function hauteurBornee(grille: HTMLElement): boolean {
  const cadre = grille.closest('.cadre-scene-activite');
  return cadre === null || getComputedStyle(cadre).containerType === 'size';
}

/**
 * Choisit colonnes et taille d'image avec les plus grandes images possibles, sans carte tronquée.
 * Mesure après rendu : le contenu réel (phrases longues) décide.
 * - Hauteur bornée (tablette, PC) : tout doit tenir dans la scène ; si rien ne tient, même en
 *   grille serrée, garde la disposition la moins débordante.
 * - Hauteur libre (petit écran) : la décision ne dépend que de la largeur, donc elle ne peut pas
 *   osciller avec la hauteur qu'elle provoque.
 */
function choisirDisposition(
  grille: HTMLElement,
  nombreCartes: number,
): (DispositionGrille & { readonly tient: boolean }) | null {
  const largeur = grille.clientWidth;
  if (largeur <= 0 || grille.clientHeight <= 0 || nombreCartes === 0) return null;
  const bornee = hauteurBornee(grille);
  const maxColonnes = Math.max(2, Math.min(nombreCartes, Math.floor(largeur / LARGEUR_COLONNE_MIN)));
  let repli: DispositionGrille = { colonnes: COLONNES_PAR_DEFAUT, serree: false, image: IMAGE_MIN };
  let debordementMin = Number.POSITIVE_INFINITY;
  for (const serree of [false, true]) {
    grille.dataset['serree'] = serree ? 'oui' : 'non';
    let meilleure: DispositionGrille | null = null;
    for (let colonnes = 2; colonnes <= maxColonnes; colonnes += 1) {
      const image = coteImage(grille, colonnes, nombreCartes, !bornee);
      grille.style.setProperty('--paires-colonnes', String(colonnes));
      grille.style.setProperty('--paires-image', `${String(image)}px`);
      const tronquee = carteTronquee(grille);
      const debordement = bornee ? debordementReel(grille) : 0;
      if (!tronquee && debordement <= 1) {
        // À image égale, plus de colonnes : moins de rangées, donc moins de page à faire défiler.
        if (meilleure === null || image > meilleure.image || (image === meilleure.image && !bornee)) {
          meilleure = { colonnes, serree, image };
        }
      } else {
        const penalite = debordement + (tronquee ? 10_000 : 0);
        if (penalite < debordementMin) {
          debordementMin = penalite;
          repli = { colonnes, serree, image };
        }
      }
    }
    if (meilleure !== null) return { ...meilleure, tient: true };
  }
  return { ...repli, tient: false };
}

/** Cadre servi tant que rien n'est mesuré — premier rendu, `happy-dom`, `ResizeObserver` absent. */
const CADRE_DE_REPLI: Cadre = { largeur: 900, hauteur: 1000 };

/** Respiration entre une carte et le bord du cadre, en pixels. */
const MARGE = 14;
/** Sous cette distance d'un bord, une région n'est presque pas dessinée : on ne l'utilise pas. */
const MARGE_VISIBILITE = 28;

/** `.cible` — `padding: 0.75rem 1.25rem`, `border: 4px`. Sert à estimer l'encombrement. */
const PADDING_X = 20;
const PADDING_Y = 12;
const BORDURE = 4;
const CIBLE_MIN = 64;
const LARGEUR_GLYPHE = 0.66;

/**
 * CE QUE LE REFUS DIT — jamais ce qui a raté, jamais la carte attendue (v2 § 5.4, R58).
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'paire-fausse': 'On cherche une autre carte qui va avec.',
  'paire-hors-consigne': 'On garde cette carte pour une autre fois.',
  'carte-deja-appariee': 'Cette paire est déjà trouvée.',
  'meme-carte': 'On cherche une AUTRE carte.',
  'carte-inconnue': 'On cherche une carte à retourner.',
};

// ------------------------------------------------------------------ la carte, sur le décor

interface ProprietesCarteFlottante {
  readonly carte: CartePaires;
  readonly retournee: boolean;
  readonly appariee: boolean;
  readonly enRefus: boolean;
  readonly marqueRefus: number;
  onTaper(carte: CartePaires, evenement: { clientX: number; clientY: number }): void;
}

function CarteFlottante({
  carte,
  retournee,
  appariee,
  enRefus,
  marqueRefus,
  onTaper,
}: ProprietesCarteFlottante): ReactElement {
  // Le glisser, chemin SECOND : amener une carte SUR une autre simule les deux taps.
  const { attributes, listeners, setNodeRef: brancherSource, transform } = useDraggable({
    id: carte.id,
    disabled: appariee,
  });
  const { setNodeRef: brancherCible, isOver } = useDroppable({ id: carte.id, disabled: appariee });

  const brancher = useCallback(
    (noeud: HTMLButtonElement | null) => {
      brancherSource(noeud);
      brancherCible(noeud);
    },
    [brancherSource, brancherCible],
  );

  const classes = ['cible', 'paires-carte'];
  if (enRefus) classes.push('oscillation');

  const glisse =
    transform === null ? '' : ` translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)`;

  return (
    <span
      data-porte-carte={carte.id}
      className="paires-porteur"
      style={glisse === '' ? undefined : { transform: glisse }}
    >
      <button
        ref={brancher}
        key={enRefus ? `${carte.id}-${String(marqueRefus)}` : carte.id}
        type="button"
        {...ROLE_REPONSE}
        className={classes.join(' ')}
        data-carte={carte.id}
        data-face={carte.face}
        data-retournee={retournee ? 'oui' : 'non'}
        data-appariee={appariee ? 'oui' : 'non'}
        data-survol={isOver ? 'oui' : 'non'}
        disabled={appariee}
        aria-label={carte.libelle}
        onClick={(evenement) => {
          onTaper(carte, evenement);
        }}
        {...listeners}
        {...attributes}
        aria-pressed={retournee}
      >
        {carte.face === 'image' && carte.asset !== null ? (
          <img
            data-illustration-carte="oui"
            src={urlAsset(String(carte.asset))}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        ) : (
          <TexteColore texte={carte.libelle} />
        )}
      </button>
    </span>
  );
}

// ------------------------------------------------------------------ le moteur

export function MoteurPaires(
  proprietes: ProprietesMoteur<ContenuPaires, EtatPaires, ActionPaires>,
): ReactElement {
  // R49 — `contenu` n'est plus lu ici : la consigne (seule donnée que ce moteur en tirait)
  // est désormais la propriété exclusive de `EcranNoeud` ; toutes les cartes viennent de
  // `etat.cartes`, déjà mélangé (R32/R44).
  const { habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionPaires);
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

  useEffect(() => {
    if (nbAcquis > precedents.current) {
      serie.current += 1;
      void services.retour.depotCorrect({ origine: origine.current, serie: serie.current });
    }
    precedents.current = nbAcquis;
  }, [nbAcquis, services]);

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
    (action: ActionPaires, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  // --- la mesure du cadre ---------------------------------------------------
  //
  // R49 — plus de bandeau du haut : `EcranNoeud` porte déjà la consigne, en tête d'écran, avec
  // le vrai `BoutonEcouter` (« la phrase est en haut et en bas, il y a doublon », le père).
  // `paires` n'a rien d'autre à y dire — contrairement à `tri`, dont le geste dépend de
  // `elementSaisi` — donc le bandeau disparaît entièrement plutôt que de rester vide.
  const plateau = useRef<HTMLDivElement | null>(null);
  const [cadre, fixerCadre] = useState<Cadre>(CADRE_DE_REPLI);

  useEffect(() => {
    const noeud = plateau.current;
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

  // --- la typographie ---------------------------------------------------------
  const reglages = useReglagesLecture();
  const styleLecture = useMemo(() => styleDeLecture(reglages), [reglages]);

  // --- la grille des cartes : colonnes choisies sur mesure ----------------------
  const grille = useRef<HTMLDivElement | null>(null);
  const [disposition, fixerDisposition] = useState<DispositionGrille>({
    colonnes: COLONNES_PAR_DEFAUT,
    serree: false,
    image: IMAGE_MIN,
  });
  // --- le découpage en vagues (décision du parent du 30 oct., contrat du socle § 12) ----------
  // Quand aucune grille ne tient, même serrée, les cartes se montrent par VAGUES de consignes
  // contiguës (`commun/vagues.ts`) : celles de l'étape en cours sont toujours là. Cliquet par
  // taille de scène, lue dans le DOM au moment même de la mesure : la taille tenue par React
  // retarde d'un rendu pendant une rotation, et rangeait la mesure du nouveau format sous la clé
  // de l'ancien (mesuré le 30 oct. : au retour au format initial, les cartes avaient changé).
  // Une autre taille repart d'une seule vague.
  const [vaguesMesurees, fixerVaguesMesurees] = useState<{ cle: string; nombre: number }>({ cle: '', nombre: 1 });
  const nombreDeVagues = vaguesMesurees.nombre;
  const vagues = useMemo(
    () => decouperEnVagues(etat.etapes.map((etape) => etape.ordreAffichage.length), nombreDeVagues),
    [etat.etapes, nombreDeVagues],
  );
  const vagueMontree = vagueDeLEtape(vagues, etat.indexEtape);
  const cartesMontrees = useMemo(() => {
    if (vagues.length <= 1) return etat.cartes;
    const nommees = new Set(etat.etapes.flatMap((etape) => etape.ordreAffichage));
    const paires = new Set((vagues[vagueMontree] ?? []).flatMap((index) => etat.etapes[index]?.ordreAffichage ?? []));
    // Une paire qu'aucune étape ne nomme est de toutes les vagues : jamais perdue.
    return etat.cartes.filter((carte) => paires.has(carte.paire) || !nommees.has(carte.paire));
  }, [etat.cartes, etat.etapes, vagues, vagueMontree]);
  const nombreEtapes = etat.etapes.length;

  const nombreCartes = cartesMontrees.length;
  // Un autre jeu de cartes (nœud suivant, vague suivante) se remesure, même à nombre égal.
  const jeuDeCartes = cartesMontrees.map((c) => `${c.id}:${c.libelle}`).join('|');
  useLayoutEffect(() => {
    const noeud = grille.current;
    const cadreScene = plateau.current;
    if (noeud === null || cadreScene === null) return undefined;
    let image = 0;
    let confirmation = 0;
    let corrections = 0;
    let actif = true;
    const ajuster = (confirmee: boolean): void => {
      if (!actif) return;
      const choix = choisirDisposition(noeud, nombreCartes);
      if (choix === null) return;
      noeud.style.setProperty('--paires-colonnes', String(choix.colonnes));
      noeud.style.setProperty('--paires-image', `${String(choix.image)}px`);
      noeud.dataset['serree'] = choix.serree ? 'oui' : 'non';
      fixerDisposition((avant) =>
        avant.colonnes === choix.colonnes && avant.serree === choix.serree && avant.image === choix.image
          ? avant
          : { colonnes: choix.colonnes, serree: choix.serree, image: choix.image });
      // Une carte reste cachée : une vague de plus (au plus une consigne par vague, puis le filet).
      // Sur petit écran, la hauteur suit le contenu : la clé n'en dépend pas, rien n'oscille.
      // La police de lecture entre dans la clé : mesuré avec la police de repli, le plateau se
      // découpe tout de suite (mieux vaut trop découper un instant que rogner), puis repart d'une
      // seule vague quand la police arrive.
      const cle = `${String(cadreScene.clientWidth)}x${hauteurBornee(noeud) ? String(cadreScene.clientHeight) : 'libre'}|${policesChargees() ? 'police' : 'repli'}`;
      // Pas de préalable `!choix.tient` : une grille centrée qui déborde vers le HAUT ne compte pas
      // dans `scrollHeight` (mesuré le 30 oct. : cartes 1 px au-dessus du plateau, rognées).
      const cachees = cartesCachees(noeud);
      // Une image transitoire ne fait pas monter le cliquet. Mesuré le 30 oct. : la première image
      // après une rotation montre les cartes 15 px hors de la scène, la suivante les remet dedans.
      // Le débordement doit se confirmer deux images plus tard, la disposition choisie posée. La
      // mesure synchrone du montage, elle, est faite avant la peinture sur la mise en page réelle :
      // elle compte tout de suite, sans quoi l'enfant verrait deux images de cartes rognées.
      if (cachees && !confirmee) {
        cancelAnimationFrame(confirmation);
        confirmation = requestAnimationFrame(() => {
          confirmation = requestAnimationFrame(() => { ajuster(true); });
        });
      }
      fixerVaguesMesurees((avant) => {
        // Autre taille, mesurée sur plusieurs vagues : on repart d'une seule, puis on remesure.
        if (avant.cle !== cle && avant.nombre !== 1) return { cle, nombre: 1 };
        const nombre = cachees && confirmee && avant.nombre < nombreEtapes ? avant.nombre + 1 : avant.nombre;
        return avant.cle === cle && nombre === avant.nombre ? avant : { cle, nombre };
      });
    };
    ajuster(true);
    if (typeof ResizeObserver !== 'function') {
      return () => {
        actif = false;
        cancelAnimationFrame(confirmation);
      };
    }
    // Mesurer à l'image suivante : pendant un redimensionnement, le navigateur notifie des tailles
    // transitoires, et retoucher la grille dans le rappel même relancerait l'observateur en boucle.
    const planifier = (): void => {
      if (!actif) return;
      corrections = 0;
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => { ajuster(false); });
    };
    const observateur = new ResizeObserver(planifier);
    observateur.observe(cadreScene);
    // La police de lecture arrive parfois après le premier rendu : le texte change de taille
    // sans que la scène bouge, il faut donc remesurer.
    const polices = typeof document === 'undefined' ? undefined : document.fonts;
    polices?.addEventListener('loadingdone', planifier);
    void polices?.ready.then(planifier);
    // Une image de carte qui arrive après la mesure change la hauteur des cartes sans changer la
    // scène : mesuré le 30 oct., la même scène donnait tantôt 4 colonnes, tantôt 6 (cartes de
    // 107 px, tronquées une fois l'image chargée). `load` ne remonte pas : on l'écoute en capture.
    noeud.addEventListener('load', planifier, true);
    // Une mesure prise sur une géométrie qui change ENSUITE sans que la scène bouge. Mesuré le
    // 31 oct. : l'essai voyait des cartes de 150 px et retenait la grille non serrée, puis deux
    // phrases passaient sur 4 lignes (rangées 166/166/127,5) et rognaient le plateau de 2 px ; et,
    // au retour d'une rotation, une image de 176 px choisie sur un état transitoire là où l'état
    // final en donne 175 (la grille se décalait d'un demi-pixel). On observe donc les cartes et
    // l'on refait le choix : une carte qui déborde se corrige toujours ; sinon au plus deux
    // corrections par taille de scène, pour qu'aucun choix ne puisse osciller (l'observation sans
    // borne, essayée le 30 oct., retouchait la grille à chaque image). Un choix inchangé repose
    // les mêmes valeurs : les cartes ne bougent pas, l'observateur se tait.
    let verification = 0;
    const verifier = (): void => {
      if (!actif) return;
      cancelAnimationFrame(verification);
      verification = requestAnimationFrame(() => {
        if (!actif) return;
        const deborde = carteTronquee(noeud) || (hauteurBornee(noeud) && debordementReel(noeud) > 1);
        if (!deborde && corrections >= 2) return;
        const avant = `${noeud.style.getPropertyValue('--paires-colonnes')}|${noeud.style.getPropertyValue('--paires-image')}|${noeud.dataset['serree'] ?? ''}`;
        ajuster(false);
        if (`${noeud.style.getPropertyValue('--paires-colonnes')}|${noeud.style.getPropertyValue('--paires-image')}|${noeud.dataset['serree'] ?? ''}` !== avant) corrections += 1;
      });
    };
    const observateurCartes = new ResizeObserver(verifier);
    for (const carte of noeud.querySelectorAll('[data-carte]')) observateurCartes.observe(carte);
    return () => {
      actif = false;
      cancelAnimationFrame(image);
      cancelAnimationFrame(confirmation);
      cancelAnimationFrame(verification);
      observateur.disconnect();
      observateurCartes.disconnect();
      polices?.removeEventListener('loadingdone', planifier);
      noeud.removeEventListener('load', planifier, true);
    };
  }, [nombreCartes, jeuDeCartes, reglages, nombreEtapes]);

  const cartesParId = useMemo(
    () => new Map(etat.cartes.map((c) => [c.id, c] as const)),
    [etat.cartes],
  );

  const mesurer = useCallback(
    (cle: string): Boite => {
      const carte = cartesParId.get(cle);
      const libelle = carte?.libelle ?? '';
      if (carte?.face === 'image' && carte.asset !== null) {
        return { largeur: 128, hauteur: 128 };
      }
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
    [cartesParId, reglages],
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

  const bornes = useMemo<Bornes>(
    () => ({
      xMin: MARGE,
      yMin: MARGE,
      xMax: Math.max(cadreJeu.largeur - MARGE, MARGE + CIBLE_MIN),
      yMax: Math.max(cadreJeu.hauteur - MARGE, MARGE + CIBLE_MIN),
    }),
    [cadreJeu],
  );

  // `etat.cartes` porte déjà le mélange (R32/R44), tiré UNE FOIS par `Alea` à `creerEtat`. On
  // ne le recalcule JAMAIS ici — recalculer une position dérivée à partir d'un ordre qu'on
  // aurait soi-même retiré serait exactement le défaut que R44 a corrigé ailleurs.
  const cles = useMemo(() => etat.cartes.map((c) => c.id), [etat.cartes]);

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

  const composition = useMemo(() => composerCartesPaires(cartesMontrees), [cartesMontrees]);

  const allumees = useMemo<readonly RegionAllumee[]>(() => {
    const centroideParRegion = new Map(regions.map((r) => [r.id, r.centroide] as const));
    const liste: RegionAllumee[] = [];
    for (const emplacement of resultat.emplacements) {
      if (emplacement.region === null) continue;
      const carte = cartesParId.get(emplacement.cle);
      if (carte === undefined) continue;
      if (etat.acquis[carte.paire] === undefined) continue;
      liste.push({
        id: emplacement.region,
        couleur: emplacement.couleur,
        centroide: centroideParRegion.get(emplacement.region) ?? [0, 0],
      });
    }
    return liste;
  }, [resultat, etat.acquis, regions, cartesParId]);

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
  // Toutes les cartes sont visibles ensemble : le compteur porte donc sur tout le plateau,
  // jamais sur un groupe interne que l'enfant ne voit pas et qui imposerait un faux ordre.
  const pairesAttendues = useMemo(
    () => [...new Set(etat.etapes.flatMap((candidate) => candidate.ordreAffichage))],
    [etat.etapes],
  );
  const pairesTrouvees = pairesAttendues.filter((paire) => etat.acquis[paire] !== undefined).length;

  const carteRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.carte;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  const taperCarte = useCallback(
    (carte: CartePaires, evenement: { clientX: number; clientY: number }) => {
      jouer({ type: 'retourner', carte: carte.id }, evenement);
    },
    [jouer],
  );

  // --- le glisser, l'autre geste : amener une carte SUR une autre (T11) -------
  // Sur petit écran, la page défile (socle.css, contrat § 3 S2) : un balayage immédiat lui
  // appartient, même s'il commence sur une carte, et le maintien distingue le glisser voulu.
  // Ailleurs, la page ne défile jamais : exiger un maintien de 250 ms faisait échouer le
  // glisser naturel de l'enfant (mesuré : parcours-glisser-et-toucher, rouge au doigt).
  const pageDefilante = usePageDefilante();
  const capteurs = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: pageDefilante ? { delay: 250, tolerance: 5 } : { distance: 8 },
    }),
  );

  const auDebutDuGlisse = useCallback(
    (evenement: DragStartEvent) => {
      const source = String(evenement.active.id);
      // Ne pas re-retourner la carte déjà retournée : ce serait « la même carte deux fois »,
      // un refus gratuit que le glisser n'a pas provoqué.
      if (etat.carteRetournee !== source) {
        emettre({ type: 'retourner', carte: source });
      }
    },
    [emettre, etat.carteRetournee],
  );

  const auBoutDuGlisse = useCallback(
    (evenement: DragEndEvent) => {
      const source = String(evenement.active.id);
      if (evenement.over === null) return;
      const cible = String(evenement.over.id);
      if (cible === source) return;
      emettre({ type: 'retourner', carte: cible });
    },
    [emettre],
  );

  return (
    <DndContext sensors={capteurs} modifiers={MODIFICATEURS_GLISSE} collisionDetection={carteSousLePointeur} onDragStart={auDebutDuGlisse} onDragEnd={auBoutDuGlisse}>
      <DispositionMoteur
        moteur="paires"
        hauteurPetitEcran="contenu"
        data-habillage={habillage.id}
        data-termine={etat.termineMs === null ? 'non' : 'oui'}
        data-aide={etat.niveauAide}
        data-etape={etape === undefined ? '' : etape.identifiant}
        data-regions-allumees={String(allumees.length)}
        data-vagues={`${String(vagueMontree + 1)}/${String(vagues.length)}`}
        scene={
          <div className="paires-plateau" ref={plateau}>
            {/* Le décor est le fond : il couvre le plateau et se recolorie à mesure. */}
            <div className="paires-decor">
              <SceneDecor
                habillage={habillage}
                allumees={allumees}
                derniere={derniere}
                animationsDesactivees={animationsDesactivees}
                ajustement="contenir"
              />
            </div>

            {/* Les cartes, devant, dans l'ordre de `etat.cartes` (mélange R32/R44). */}
            <div
              className="paires-cartes"
              data-plateau="cartes"
              data-composition={composition.mixte ? 'mixte' : 'textes'}
              data-serree={disposition.serree ? 'oui' : 'non'}
              ref={grille}
              style={{ ...styleLecture, '--paires-colonnes': String(disposition.colonnes), '--paires-image': `${String(disposition.image)}px` } as CSSProperties}
            >
              {composition.cartes.map((carte) => (
                <CarteFlottante
                  key={carte.id}
                  carte={carte}
                  retournee={etat.carteRetournee === carte.id}
                  appariee={etat.acquis[carte.paire] !== undefined}
                  enRefus={!animationsDesactivees && carteRefusee === carte.id}
                  marqueRefus={marqueRefusCourante}
                  onTaper={taperCarte}
                />
              ))}
            </div>
          </div>
        }
        pied={
          <div className="paires-reperes">
            {/* T10 — le cadre commun, mais pas d'étape : le réducteur accepte une paire d'un
                groupe suivant avant la première (tests/unitaires/liberte-ordre-moteurs.test.ts),
                donc « Étape n sur N » mentirait. Reste le compteur de paires, dans le même style
                que partout, et ICI, sous le plateau : monté dans la barre de consigne, sa rangée
                de plus cachait 8 cartes de cite-des-histoires-02 en 1100×700 (mesuré,
                bac-a-sable/socle-etape/entete-diagnostic.spec.ts). */}
            {etape === undefined ? null : (
              <RepereEtape
                moteur="paires"
                rang={etat.indexEtape + 1}
                total={etat.etapes.length}
                afficherRang={false}
                dansLaBarre={false}
                detail={`${String(pairesTrouvees)} / ${String(pairesAttendues.length)} paires`}
                animationsDesactivees={animationsDesactivees}
              />
            )}
            <p
              role="status"
              aria-live="polite"
              data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
              data-animations={animationsDesactivees ? 'calmes' : 'vives'}
            >
              <MessageStable messages={Object.values(MESSAGES_DE_REFUS)}>{messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus}</MessageStable>
            </p>
          </div>
        }
      />
    </DndContext>
  );
}
