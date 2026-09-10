/**
 * `MoteurAttrape` — le composant hôte du moteur `attrape`. Lot L2-E, mise en scène portée
 * depuis `phrase` (R51/R52), et le défaut mesuré pour CE moteur :
 *
 *     « cibles MOBILES » → 0 primitive de mouvement dans le moteur
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurAttrape` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionAttrape`, fait battre l'horloge du moteur, déclenche
 * le retour sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * OÙ SONT POSÉES LES CIBLES
 *
 * `CibleAttrape.depart` est en coordonnées `viewBox` (le type le dit : « Position de départ en
 * coordonnées viewBox. Le mouvement appartient au rendu. »). Elle reste le repli quand un
 * habillage n'offre aucune région, mais ne peut pas être une position absolue : deux positions
 * publiées peuvent se rejoindre après réduction sur un téléphone. Les boîtes tactiles réelles
 * sont donc rangées par le planificateur commun ; la lisibilité et le tap l'emportent sur une
 * position décorative (R52).
 *
 * ── LE MOUVEMENT, ET POURQUOI IL N'EST PAS UNE TROISIÈME `transform` SUR LE BOUTON ────────────
 * R54 (`Docs/decision-decor-de-fond-et-mots-poses.md`) : une image-clé qui touche `transform`
 * REMPLACE toute transformation déjà posée sur le MÊME élément, elle ne compose pas. Une cible
 * porte donc TROIS calques disjoints, chacun sa propriété :
 *   1. le porteur (`PorteurPose`) CENTRE, par sa propre `transform` ;
 *   2. un calque de DÉRIVE anime `transform` (la trajectoire) ;
 *   3. le bouton `.cible` garde `transform` pour lui seul (`:active`, `.oscillation`).
 * Aucun des trois n'écrase les autres : c'est exactement le schéma que `phrase` a validé pour
 * son porteur de mot et son oscillation.
 *
 * ── DÉTERMINISTE, SANS `Math.random` NI `Date.now` ────────────────────────────────────────────
 * La phase et l'amplitude de la dérive sont dérivées de l'IDENTIFIANT de la cible par un petit
 * hachage pur (`hacher`) : à mêmes cibles, même mouvement, d'une session à l'autre — et surtout
 * les cibles ne dérivent pas toutes en même temps, sans tirer un seul nombre aléatoire.
 *
 * ── `prefers-reduced-motion` : L'ÉTAT FINAL EST IDENTIQUE DANS LES DEUX RÉGIMES ────────────────
 * Animations coupées ⇒ aucune classe d'animation n'est posée, les cibles restent à leur
 * `depart`, immobiles : c'est le seul état qu'une capture T4 puisse figer sans instabilité.
 *
 * ── LA RECOLORATION DU DÉCOR NE SUIT PAS LA CIBLE ─────────────────────────────────────────────
 * Les cibles n'ont pas de région propre (elles flottent devant le décor, pas dedans) ; la
 * récompense visuelle du décor vient d'une cascade de régions sur les cibles BONNES de chaque
 * consigne, en cascade par étape — même mécanisme que les trous de `grave`.
 *
 * ── LA CONSIGNE N'EST PLUS RÉPÉTÉE ICI (R49) — `EcranNoeud` la porte déjà.
 *
 * TROIS INVARIANTS DE RENDU, inchangés et opposables :
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs** (R14) ;
 *   - **aucun rouge sur un refus** : la cible oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px** — la classe `.cible` le pose, jamais un nombre recopié.
 */

import { MessageStable } from '../../composants/MessageStable.js';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { ActionAttrape, ContenuAttrape, EtatAttrape } from '@pierre/partage';
import { styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import { SceneDecor } from '../../habillages/SceneDecor.js';
import type { ProprietesMoteur } from '../types.js';
import {
  CIBLE_MIN,
  cadreJeuEtBornes,
  lireViewBox,
  MARGE,
  mesurerTexte,
  planifierCascade,
  regionsAllumeesDepuisAcquis,
  regionsColoriables,
  styleZoneDeJeu,
  transformeMeet,
  useDerniereAllumee,
  useMesureCadre,
  versPixels,
} from '../eclair/mise-en-scene.js';
import { PorteurPose } from '../eclair/porteur-pose.js';
import { urlAsset } from '../../api/client.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/**
 * CE QUE LE REFUS DIT — jamais la cible attendue (v2 § 5.4, même discipline que `phrase`).
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'cible-intruse': 'Ce n’est pas la bonne cible à attraper.',
  'cible-hors-consigne': 'Cette cible n’est pas demandée pour l’instant.',
  'cible-deja-attrapee': 'Cette cible est déjà attrapée.',
  'cible-inconnue': 'Ce n’est pas la bonne cible à attraper.',
};

/**
 * La feuille de style de la dérive. UNE SEULE règle, injectée une fois : chaque cible choisit
 * son amplitude et sa durée par des variables CSS, jamais par une image-clé recopiée.
 */
const FEUILLE_DE_DERIVE = `
@keyframes pierre-derive-cible {
  0%, 100% { transform: translate(0, 0); }
  25%      { transform: translate(var(--derive-dx), calc(var(--derive-dy) * -1)); }
  50%      { transform: translate(0, 0); }
  75%      { transform: translate(calc(var(--derive-dx) * -1), var(--derive-dy)); }
}
[data-derive="oui"] {
  animation: pierre-derive-cible var(--derive-duree) ease-in-out var(--derive-delai) infinite;
}
`;

/** Hachage pur et stable — aucun `Math.random`, aucun `Date.now` (règle non négociable). */
function hacher(texte: string): number {
  let h = 0;
  for (let i = 0; i < texte.length; i += 1) {
    h = (h * 31 + texte.charCodeAt(i)) >>> 0;
  }
  return h;
}

/*
 * Le mélange appartient à la SESSION, pas à un rendu. `useState` garde la permutation pendant
 * les aides et les rerenders ; la clé `useId` mémorise le premier tirage pendant les deux
 * invocations de développement de StrictMode. Sans cette courte mémoire, StrictMode avancerait
 * deux fois le même Alea injecté et le rejeu dépendrait de l'environnement de rendu.
 */
const ORDRES_DE_SESSION = new WeakMap<object, Map<string, readonly string[]>>();

function tirerOrdreDeSession(
  alea: ProprietesMoteur<ContenuAttrape, EtatAttrape, ActionAttrape>['services']['alea'],
  identifiantSession: string,
  cibles: ContenuAttrape['cibles'],
): readonly string[] {
  let ordres = ORDRES_DE_SESSION.get(alea);
  if (ordres === undefined) {
    ordres = new Map<string, readonly string[]>();
    ORDRES_DE_SESSION.set(alea, ordres);
  }
  const connu = ordres.get(identifiantSession);
  if (connu !== undefined) return connu;

  // L'ordre du JSON est éditorial. Le tirer tel quel ferait de son rangement par le rédacteur
  // une variable cachée du jeu ; l'Alea reçoit donc toujours le même catalogue canonique.
  const ordre = alea
    .melanger([...cibles].sort((gauche, droite) => gauche.id.localeCompare(droite.id)))
    .map((cible) => cible.id);
  ordres.set(identifiantSession, ordre);
  return ordre;
}

function oublierOrdreDeSession(
  alea: ProprietesMoteur<ContenuAttrape, EtatAttrape, ActionAttrape>['services']['alea'],
  identifiantSession: string,
): void {
  const ordres = ORDRES_DE_SESSION.get(alea);
  if (ordres === undefined) return;
  ordres.delete(identifiantSession);
  if (ordres.size === 0) ORDRES_DE_SESSION.delete(alea);
}

interface BoiteCible {
  readonly id: string;
  /** Boîte CSS du bouton, bordure et remplissage compris. */
  readonly largeurBouton: number;
  readonly hauteurBouton: number;
  /** Pixels réellement alloués au raster, sans taille intrinsèque non bornée. */
  readonly largeurRaster: number;
  readonly hauteurRaster: number;
  /** Emprise de la boîte pendant la dérive, employée par la grille. */
  readonly largeur: number;
  readonly hauteur: number;
}

/** `.cible` : padding 20 × 12 px et trait 4 px, comme `mesurerTexte`. */
const GARNITURE_CIBLE_X = 20 + 4;
const GARNITURE_CIBLE_Y = 12 + 4;

/**
 * Le repli d'`attrape` est une vraie grille intrinsèque, pas un simple drapeau de collision.
 * La hauteur retournée est celle dont le plateau a besoin : l'appelant l'ajoute donc au flux
 * vertical avant de poser les boutons. Une boîte ne sera jamais ensuite re-clampée sur une autre.
 */
export function composerGrilleCibles(
  boites: readonly BoiteCible[],
  largeurCadre: number,
): {
  readonly positions: ReadonlyMap<string, readonly [number, number]>;
  readonly hauteur: number;
  readonly chevauchements: number;
  readonly horsBornes: number;
} {
  const largeurUtile = Math.max(CIBLE_MIN, largeurCadre - 2 * MARGE);
  const lignes: BoiteCible[][] = [];
  let ligne: BoiteCible[] = [];
  let largeurLigne = 0;
  for (const boite of boites) {
    const largeurSuivante = ligne.length === 0 ? boite.largeur : largeurLigne + MARGE + boite.largeur;
    if (ligne.length > 0 && largeurSuivante > largeurUtile) {
      lignes.push(ligne);
      ligne = [boite];
      largeurLigne = boite.largeur;
    } else {
      ligne.push(boite);
      largeurLigne = largeurSuivante;
    }
  }
  if (ligne.length > 0) lignes.push(ligne);

  const positions = new Map<string, readonly [number, number]>();
  let y = MARGE;
  for (const courante of lignes) {
    const hauteurLigne = Math.max(...courante.map((boite) => boite.hauteur));
    const largeurDeLaLigne = courante.reduce((somme, boite) => somme + boite.largeur, 0) + MARGE * (courante.length - 1);
    let x = MARGE + Math.max(0, (largeurUtile - largeurDeLaLigne) / 2);
    for (const boite of courante) {
      positions.set(boite.id, [x + boite.largeur / 2, y + hauteurLigne / 2]);
      x += boite.largeur + MARGE;
    }
    y += hauteurLigne + MARGE;
  }
  let chevauchements = 0;
  let horsBornes = 0;
  for (let i = 0; i < boites.length; i += 1) {
    const boite = boites[i] as BoiteCible;
    const position = positions.get(boite.id) as readonly [number, number];
    if (
      position[0] - boite.largeur / 2 < MARGE || position[0] + boite.largeur / 2 > largeurCadre - MARGE ||
      position[1] - boite.hauteur / 2 < MARGE || position[1] + boite.hauteur / 2 > y - MARGE
    ) horsBornes += 1;
    for (let j = i + 1; j < boites.length; j += 1) {
      const autre = boites[j] as BoiteCible;
      const autrePosition = positions.get(autre.id) as readonly [number, number];
      if (
        (Math.abs(position[0] - autrePosition[0]) < (boite.largeur + autre.largeur) / 2) &&
        (Math.abs(position[1] - autrePosition[1]) < (boite.hauteur + autre.hauteur) / 2)
      ) chevauchements += 1;
    }
  }
  return { positions, hauteur: y, chevauchements, horsBornes };
}

export function MoteurAttrape(
  proprietes: ProprietesMoteur<ContenuAttrape, EtatAttrape, ActionAttrape>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;
  const identifiantSession = useId();
  const [ordreCibles] = useState(() =>
    tirerOrdreDeSession(services.alea, identifiantSession, contenu.cibles),
  );
  const ciblesParId = useMemo(
    () => new Map(contenu.cibles.map((cible) => [cible.id, cible] as const)),
    [contenu.cibles],
  );
  const ciblesAffichees = useMemo(
    () => ordreCibles
      .map((id) => ciblesParId.get(id))
      .filter((cible): cible is ContenuAttrape['cibles'][number] => cible !== undefined),
    [ordreCibles, ciblesParId],
  );

  useEffect(
    () => () => oublierOrdreDeSession(services.alea, identifiantSession),
    [services.alea, identifiantSession],
  );

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionAttrape);
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
    (action: ActionAttrape, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  const etape = etat.etapes[etat.indexEtape];
  const ciblesDeLEtape = useMemo(() => {
    if (etape === undefined) return [];
    const ids = new Set(etape.restantes);
    return contenu.cibles.filter((cible) => ids.has(cible.id));
  }, [contenu.cibles, etape]);

  // --- la typographie de lecture ---------------------------------------------
  const reglages = useReglagesLecture();
  const styleLecture = useMemo(() => styleDeLecture(reglages), [reglages]);

  // --- la mesure du cadre -----------------------------------------------------
  const { racine, bande, cadre, hauteurBande } = useMesureCadre();
  const { cadreJeu, bornes } = useMemo(() => cadreJeuEtBornes(cadre, hauteurBande), [cadre, hauteurBande]);

  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);
  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

  // --- la transformation « couvrir », partagée avec le décor --------------------
  const vb = useMemo(() => lireViewBox(habillage.scene.viewBox), [habillage]);
  const t = useMemo(() => transformeMeet(vb, cadreJeu), [vb, cadreJeu]);

  /*
   * Toutes les cibles restent visibles : les cibles des étapes suivantes sont aussi de vrais
   * distracteurs. Elles ne peuvent donc pas simplement disparaître pour « résoudre » une
   * collision. On les range avec les mêmes boîtes que celles réellement tapées. Quand un
   * téléphone manque de hauteur, le plateau devient plus haut et le parent défile : jamais une
   * prise n'est empilée sous une autre.
   */
  const boitesCibles = useMemo<readonly BoiteCible[]>(() => {
    const margeDerive = animationsDesactivees ? 0 : 30;
    return ciblesAffichees.map((cible) => {
      const texte = mesurerTexte(cible.libelle, reglages);
      // La grille définit sa hauteur : ses images ne peuvent donc pas être dimensionnées
      // depuis cette même hauteur (boucle ResizeObserver après rotation). La largeur seule
      // règle le raster ; les cibles textuelles n'ont pas de boîte d'image fictive.
      const echelleRaster = Math.max(0, Math.min(
        // Le grand écran ajoute de l'espace, pas des dessins plus grands que leur taille prévue.
        1,
        cadre.largeur / vb.largeur,
        (cadre.largeur - 2 * MARGE - 2 * margeDerive - 2 * GARNITURE_CIBLE_X) / Math.max(1, cible.taille[0]),
      ));
      const illustree = cible.asset !== null && cible.asset !== undefined;
      const largeurRaster = illustree ? cible.taille[0] * echelleRaster : 0;
      const hauteurRaster = illustree ? cible.taille[1] * echelleRaster : 0;
      const largeurBouton = Math.max(CIBLE_MIN, texte.largeur, largeurRaster + 2 * GARNITURE_CIBLE_X);
      const hauteurBouton = Math.max(CIBLE_MIN, texte.hauteur, hauteurRaster + 2 * GARNITURE_CIBLE_Y);
      return {
        id: cible.id,
        largeurBouton,
        hauteurBouton,
        largeurRaster,
        hauteurRaster,
        largeur: largeurBouton + 2 * margeDerive,
        hauteur: hauteurBouton + 2 * margeDerive,
      };
    });
  }, [animationsDesactivees, ciblesAffichees, reglages, cadre.largeur, vb.largeur]);
  const grilleCibles = useMemo(
    () => composerGrilleCibles(boitesCibles, cadre.largeur),
    [boitesCibles, cadre.largeur],
  );
  const boiteCibleParId = useMemo(
    () => new Map(boitesCibles.map((boite) => [boite.id, boite])),
    [boitesCibles],
  );
  const hauteurMinimumScene = useMemo(() => {
    // La bande basse est hors de la grille, mais dans le cadre mesuré par le moteur.
    return `${String(grilleCibles.hauteur + hauteurBande)}px`;
  }, [grilleCibles.hauteur, hauteurBande]);

  // --- la recoloration : cascade des cibles BONNES, par étape --------------------
  const listesParEtape = useMemo(
    () => contenu.consignes.map((c) => [...c.aAttraper]),
    [contenu.consignes],
  );
  const boiteInvisible = useMemo(() => ({ largeur: CIBLE_MIN, hauteur: CIBLE_MIN }), []);
  const plansRecoloration = useMemo(
    () =>
      planifierCascade({
        habillage,
        listesParEtape,
        regions,
        cadre: cadreJeu,
        bornes,
        mesurer: () => boiteInvisible,
      }),
    [habillage, listesParEtape, regions, cadreJeu, bornes, boiteInvisible],
  );
  const allumees = useMemo(
    () => regionsAllumeesDepuisAcquis(plansRecoloration, etat.acquis, centroideParRegion),
    [plansRecoloration, etat.acquis, centroideParRegion],
  );
  const derniere = useDerniereAllumee(allumees);

  const etiquetteRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.cible;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;
  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  return (
    <div
      data-moteur="attrape"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      data-regions-allumees={String(allumees.length)}
      style={{
        position: 'relative',
        blockSize: 'auto',
        flex: '1 0 auto',
        minBlockSize: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        borderRadius: 'var(--rayon-carte)',
      }}
    >
      <style>{FEUILLE_DE_DERIVE}</style>

      {/* Le geste générique est porté par la barre haute de l'écran. Ce cartouche garde
          seulement la cible concrète de l'étape sous les yeux de l'enfant. */}
      <div
        data-plateau="etape-attrape"
        aria-live="polite"
        style={{
          position: 'relative',
          alignSelf: 'flex-start',
          flex: '0 0 auto',
          margin: '0.75rem 0.75rem 0',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.45rem 0.8rem',
          border: '3px solid var(--trait)',
          borderRadius: '1rem',
          background: 'var(--parchemin)',
          boxShadow: 'var(--ombre-bd)',
          ...styleLecture,
        } as CSSProperties}
      >
        <span style={{ fontWeight: 700 }}>{`Étape ${String(etat.indexEtape + 1)} / ${String(etat.etapes.length)}`}</span>
        <span aria-hidden="true" style={{ color: 'var(--soleil)', fontSize: '1.25em' }}>✦</span>
        <span style={{ fontWeight: 800 }}>
          {ciblesDeLEtape.length === 0
            ? 'Cible suivante'
            : `À attraper maintenant : ${ciblesDeLEtape.map((cible) => cible.libelle).join(' · ')}`}
        </span>
      </div>

      {/* Le cartouche est dans le flux, hors de ce cadre mesuré : aucune cible ne peut être
          masquée par une règle ou par un changement de profil de lecture. */}
      <div
        ref={racine}
        data-zone-jeu="attrape"
        style={{
          position: 'relative',
          flex: `1 0 ${hauteurMinimumScene}`,
          minBlockSize: hauteurMinimumScene,
          overflow: 'hidden',
        }}
      >

      {/* ------------------------------------------------------------- le décor, en fond */}
      <div style={styleZoneDeJeu(hauteurBande)}>
        <SceneDecor
          habillage={habillage}
          allumees={allumees}
          derniere={derniere}
          animationsDesactivees={animationsDesactivees}
          ajustement="contenir"
        />
      </div>

      {/* --------------------------------------------------------- les cibles, MOBILES */}
      <div
        data-plateau="cibles"
        data-chevauchements={String(grilleCibles.chevauchements)}
        data-hors-bornes={String(grilleCibles.horsBornes)}
        data-disposition="grille-intrinseque"
        style={{ ...styleZoneDeJeu(hauteurBande), zIndex: 1, pointerEvents: 'none' }}
      >
        {ciblesAffichees.map((cible) => {
          const largeur = Math.max(CIBLE_MIN, cible.taille[0] * t.echelle);
          const hauteur = Math.max(CIBLE_MIN, cible.taille[1] * t.echelle);
          const boite = boiteCibleParId.get(cible.id);
          const largeurBouton = boite?.largeurBouton ?? largeur;
          const hauteurBouton = boite?.hauteurBouton ?? hauteur;
          // ── LE DÉCOR EST COUVERT, PAS CONTENU (R52) — UNE CIBLE PEUT DONC TOMBER DANS LA
          //     PARTIE ROGNÉE, EXACTEMENT COMME UNE RÉGION PEUT TOMBER HORS ÉCRAN ────────────
          //
          // Mesuré, sortie citée (`bac-a-sable/mesurer-mise-en-scene-cinq-moteurs.mjs`) : sur
          // les 7 exercices réels, entre 2 et 8 cibles sur 8 à 14 tombaient hors du cadre —
          // c'est-à-dire une cible qu'on ne peut jamais attraper. `deriverEmplacements` (pour
          // `phrase`, les options, le clavier, les cases) CLAMPE déjà ses pastilles dans les
          // bornes ; une cible transformée par le seul `versPixels` ne l'était pas. On applique
          // donc la MÊME discipline ici : le point reste celui du contenu, mais son rendu ne
          // sort jamais de la zone jouable — sans quoi une cible « bonne » deviendrait
          // structurellement inatteignable, le pire défaut possible sur ce moteur.
          const [xBrut, yBrut] = versPixels(cible.depart, t);
          // Marge pour la DÉRIVE (14 à 30 px) : la cible ne doit pas sortir du cadre à l'apogée
          // de son mouvement non plus.
          const margeDerive = animationsDesactivees ? 0 : 30;
          const demiL = largeur / 2 + margeDerive;
          const demiH = hauteur / 2 + margeDerive;
          const x = Math.min(
            Math.max(xBrut, bornes.xMin + demiL),
            Math.max(bornes.xMax - demiL, bornes.xMin + demiL),
          );
          const y = Math.min(
            Math.max(yBrut, bornes.yMin + demiH),
            Math.max(bornes.yMax - demiH, bornes.yMin + demiH),
          );
          const emplacement = grilleCibles.positions.get(cible.id);
          const attrapee = etat.acquis[cible.id] !== undefined;
          const refusee = etiquetteRefusee === cible.id;
          // Les lucioles portent directement le mot utile : la classe dédiée renforce sa
          // hiérarchie de lecture sans imposer une règle au moteur pour les autres habillages.
          const classes = ['cible'];
          if (cible.id.startsWith('luciole-')) classes.push('cible-luciole');
          if (!animationsDesactivees && refusee) classes.push('oscillation');

          const h = hacher(cible.id);
          const derive: CSSProperties = animationsDesactivees
            ? {}
            : ({
                '--derive-dx': `${String(14 + (h % 5) * 4)}px`,
                '--derive-dy': `${String(10 + ((h >> 3) % 4) * 3)}px`,
                '--derive-duree': `${String(2600 + (h % 900))}ms`,
                '--derive-delai': `-${String(h % 2600)}ms`,
              } as CSSProperties);

          return (
            <PorteurPose key={cible.id} x={emplacement?.[0] ?? x} y={emplacement?.[1] ?? y}>
              <div data-derive={animationsDesactivees ? 'non' : 'oui'} style={derive}>
                <button
                  key={refusee ? `${cible.id}-${String(marqueRefusCourante)}` : cible.id}
                  type="button"
                  data-cible={cible.id}
                  data-attrapee={attrapee ? 'oui' : 'non'}
                  data-refusee={refusee ? 'oui' : 'non'}
                  className={classes.join(' ')}
                  hidden={attrapee}
                  style={
                    {
                      ...styleLecture,
                      pointerEvents: 'auto',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box',
                      inlineSize: `${String(largeurBouton)}px`,
                      blockSize: `${String(hauteurBouton)}px`,
                      minInlineSize: `${String(largeurBouton)}px`,
                      minBlockSize: `${String(hauteurBouton)}px`,
                    } as CSSProperties
                  }
                  onClick={(evenement) => {
                    jouer({ type: 'toucher', cible: cible.id }, evenement);
                  }}
                >
                  {cible.asset === null || cible.asset === undefined ? null : (
                    <img
                      src={urlAsset(String(cible.asset))}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      data-illustration-cible="oui"
                      style={{
                        display: 'block',
                        inlineSize: `${String(boite?.largeurRaster ?? largeur)}px`,
                        blockSize: `${String(boite?.hauteurRaster ?? hauteur)}px`,
                        maxInlineSize: '100%',
                        maxBlockSize: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <span
                    style={
                      cible.asset === null || cible.asset === undefined
                        ? undefined
                        : {
                            position: 'absolute',
                            inlineSize: '1px',
                            blockSize: '1px',
                            overflow: 'hidden',
                            clipPath: 'inset(50%)',
                            whiteSpace: 'nowrap',
                          }
                    }
                  >
                    {cible.libelle}
                  </span>
                </button>
              </div>
            </PorteurPose>
          );
        })}
      </div>

      {/* ------------------------------------------------------------ la bande statique */}
      <div
        ref={bande}
        data-plateau="controles"
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          insetInlineEnd: 0,
          insetBlockEnd: 0,
          zIndex: 2,
          display: 'grid',
          gap: '0.5rem',
          padding: '0.75rem',
        }}
      >
        <p
          role="status"
          aria-live="polite"
          data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
          data-animations={animationsDesactivees ? 'calmes' : 'vives'}
          style={{ ...styleLecture, margin: 0, minBlockSize: '1.5em' } as CSSProperties}
        >
          <MessageStable messages={Object.values(MESSAGES_DE_REFUS)}>{messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus}</MessageStable>
        </p>

        <p
          role="status"
          aria-live="polite"
          data-annonce="coloriage"
          style={{
            position: 'absolute',
            inlineSize: 1,
            blockSize: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
          }}
        >
          {derniere === null
            ? ''
            : `${regions.find((r) => r.id === derniere.id)?.libelle ?? derniere.id} reprend ses couleurs.`}
        </p>
      </div>

      {/* ── LES DEUX CONTRÔLES SONT PORTÉS PAR L'ÉCRAN, PAS PAR LE MOTEUR (R10) ────────────── */}
      </div>
    </div>
  );
}
