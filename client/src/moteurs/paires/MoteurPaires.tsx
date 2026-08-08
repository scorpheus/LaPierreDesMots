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
 * ── CE QUI N'EST PAS RÉUTILISÉ DE `../phrase/receptacles.js`, ET POURQUOI ────────────────────
 * `Fente` et `JetonEnVol` supposent une case VIDE qui attend un jeton précis — la loi de R59.
 * `paires` n'a pas cette case : une carte retournée reste à SA place, elle ne vole nulle part,
 * et « apparier » ne désigne aucune case tierce. Le vol du module ne s'applique donc pas ; ce
 * qui s'applique, et qui EST repris, c'est la loi elle-même transposée : chaque carte occupe,
 * dès la création de l'état, un emplacement DÉRIVÉ et STABLE (jamais recalculé quand une autre
 * carte est acquise) — c'est cette stabilité, et non une case explicite, qui tient R59 ici.
 *
 * ── UN DÉFAUT DE CONTENU CONNU, NON CORRIGÉ ICI ───────────────────────────────────────────────
 * Faute d'assets dessinés (`asset: null`, D2), la face « image » affiche son libellé en clair :
 * l'appariement reste une tâche de lecture, pas encore un memory à cartes retournées. Signalé
 * dans les `$commentaire` de plusieurs exercices ; ni le contenu ni la règle ne sont à moi.
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { ActionPaires, ContenuPaires, EtatPaires } from '@pierre/partage';

import { SceneDecor } from '../../habillages/SceneDecor.js';
import type { RegionAllumee } from '../../habillages/SceneDecor.js';
import { deriverEmplacements, regionsColoriables } from '../../habillages/emplacements.js';
import type { Boite, Bornes, Cadre, Emplacement } from '../../habillages/emplacements.js';
import { styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';

/**
 * `CartePaires` ne figure pas au barillet (`@pierre/partage` n'exporte que `ContenuPaires`,
 * `EtatPaires`, `ActionPaires` — vérifié dans `partage/src/index.ts`). Dérivé localement,
 * comme `tri` le fait pour `ElementTri`/`ReceptacleTri`, plutôt que d'ajouter un symbole au
 * barillet pour un lot de rendu.
 */
type CartePaires = ContenuPaires['cartes'][number];

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** Cadre servi tant que rien n'est mesuré — premier rendu, `happy-dom`, `ResizeObserver` absent. */
const CADRE_DE_REPLI: Cadre = { largeur: 900, hauteur: 1000 };
const HAUTEUR_PIED_REPLI = 56;

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

/** R49 : plus de bandeau du haut, donc plus qu'une seule borne à porter — le pied de page. */
function ZONE_DE_JEU(hauteurPied: number): CSSProperties {
  return {
    insetInlineStart: 0,
    insetInlineEnd: 0,
    insetBlockStart: 0,
    insetBlockEnd: `${String(hauteurPied)}px`,
  };
}

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
  readonly emplacement: Emplacement;
  readonly retournee: boolean;
  readonly appariee: boolean;
  readonly enRefus: boolean;
  readonly marqueRefus: number;
  readonly styleTexte: CSSProperties;
  onTaper(carte: CartePaires, evenement: { clientX: number; clientY: number }): void;
}

function CarteFlottante({
  carte,
  emplacement,
  retournee,
  appariee,
  enRefus,
  marqueRefus,
  styleTexte,
  onTaper,
}: ProprietesCarteFlottante): ReactElement {
  // Le glisser, chemin SECOND : amener une carte SUR une autre simule les deux taps.
  const { attributes, listeners, setNodeRef: brancherSource, transform } = useDraggable({
    id: carte.id,
    disabled: appariee,
  });
  const { setNodeRef: brancherCible, isOver } = useDroppable({ id: carte.id });

  const brancher = useCallback(
    (noeud: HTMLButtonElement | null) => {
      brancherSource(noeud);
      brancherCible(noeud);
    },
    [brancherSource, brancherCible],
  );

  const classes = ['cible'];
  if (enRefus) classes.push('oscillation');

  const glisse =
    transform === null ? '' : ` translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)`;

  return (
    <span
      data-porte-carte={carte.id}
      style={{
        position: 'absolute',
        insetInlineStart: `${String(emplacement.x)}px`,
        insetBlockStart: `${String(emplacement.y)}px`,
        // Le SEUL rôle de ce porteur : centrer. Aucune classe, donc aucune animation ne peut lui
        // reprendre cette transformation (R54).
        transform: `translate(-50%, -50%)${glisse}`,
        display: 'inline-flex',
        pointerEvents: 'none',
        zIndex: retournee ? 1 : 0,
      }}
    >
      <button
        ref={brancher}
        key={enRefus ? `${carte.id}-${String(marqueRefus)}` : carte.id}
        type="button"
        className={classes.join(' ')}
        data-carte={carte.id}
        data-face={carte.face}
        data-retournee={retournee ? 'oui' : 'non'}
        data-appariee={appariee ? 'oui' : 'non'}
        disabled={appariee}
        onClick={(evenement) => {
          onTaper(carte, evenement);
        }}
        {...listeners}
        {...attributes}
        aria-pressed={retournee}
        style={
          {
            ...styleTexte,
            pointerEvents: 'auto',
            touchAction: 'none',
            whiteSpace: 'nowrap',
            outline: retournee || isOver ? '4px solid var(--soleil, #FFC93C)' : undefined,
            outlineOffset: retournee || isOver ? '3px' : undefined,
            fontWeight: retournee ? 700 : undefined,
            // Appariée : elle ne s'efface JAMAIS (R14), elle se calme.
            opacity: appariee ? 0.55 : 1,
          } as CSSProperties
        }
      >
        {carte.libelle}
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
  const racine = useRef<HTMLDivElement | null>(null);
  const pied = useRef<HTMLDivElement | null>(null);
  const [cadre, fixerCadre] = useState<Cadre>(CADRE_DE_REPLI);
  const [hauteurPied, fixerHauteurPied] = useState(HAUTEUR_PIED_REPLI);

  useEffect(() => {
    const noeud = racine.current;
    if (noeud === null) return undefined;

    const relever = (): void => {
      const rect = noeud.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fixerCadre({ largeur: rect.width, hauteur: rect.height });
      }
      const hautPied = pied.current?.getBoundingClientRect().height ?? 0;
      if (hautPied > 0) fixerHauteurPied(hautPied);
    };

    relever();

    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(relever);
    observateur.observe(noeud);
    if (pied.current !== null) observateur.observe(pied.current);
    return () => {
      observateur.disconnect();
    };
  }, []);

  // --- la typographie ---------------------------------------------------------
  const reglages = useReglagesLecture();
  const styleLecture = useMemo(() => styleDeLecture(reglages), [reglages]);

  const cartesParId = useMemo(
    () => new Map(etat.cartes.map((c) => [c.id, c] as const)),
    [etat.cartes],
  );

  const mesurer = useCallback(
    (cle: string): Boite => {
      const libelle = cartesParId.get(cle)?.libelle ?? '';
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
      hauteur: Math.max(cadre.hauteur - hauteurPied, CIBLE_MIN + 2 * MARGE),
    }),
    [cadre, hauteurPied],
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

  const emplacementParCarte = useMemo(
    () => new Map(resultat.emplacements.map((e) => [e.cle, e] as const)),
    [resultat],
  );

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

  // --- le glisser, chemin second : amener une carte SUR une autre --------------
  const capteurs = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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
    <DndContext sensors={capteurs} onDragStart={auDebutDuGlisse} onDragEnd={auBoutDuGlisse}>
      <div
        ref={racine}
        data-moteur="paires"
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
        {/* R49 — plus de bandeau du haut : `EcranNoeud` porte déjà la consigne (« la phrase
            est en haut et en bas, il y a doublon », le père) avec le vrai `BoutonEcouter`.
            `paires` n'a rien d'autre à y dire — pas de geste dépendant de l'état, contrairement
            à `tri` — donc le bandeau disparaît plutôt que de rester vide. */}

        {/* ── le décor, en fond : couvre la zone de jeu, se recolorie à mesure ────────────── */}
        <div style={{ position: 'absolute', ...ZONE_DE_JEU(hauteurPied), zIndex: 0 }}>
          <SceneDecor
            habillage={habillage}
            allumees={allumees}
            derniere={derniere}
            animationsDesactivees={animationsDesactivees}
          />
        </div>

        {/* ── les cartes, devant, à des emplacements dérivés de `etat.cartes` ─────────────── */}
        <div
          data-plateau="cartes"
          style={{
            position: 'absolute',
            ...ZONE_DE_JEU(hauteurPied),
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          {etat.cartes.map((carte) => {
            const emplacement = emplacementParCarte.get(carte.id);
            if (emplacement === undefined) return null;
            return (
              <CarteFlottante
                key={carte.id}
                carte={carte}
                emplacement={emplacement}
                retournee={etat.carteRetournee === carte.id}
                appariee={etat.acquis[carte.paire] !== undefined}
                enRefus={!animationsDesactivees && carteRefusee === carte.id}
                marqueRefus={marqueRefusCourante}
                styleTexte={styleLecture as CSSProperties}
                onTaper={taperCarte}
              />
            );
          })}
        </div>

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
