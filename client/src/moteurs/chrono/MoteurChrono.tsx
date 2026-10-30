/**
 * `MoteurChrono` — le composant hôte du moteur `chrono`. Lot de portage « décor de fond + mots
 * posés » (R47/R52), depuis `phrase` — première scène jugée par le père : « fais les beaux
 * design ».
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurChrono` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionChrono`, fait battre l'horloge, déclenche le retour
 * sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI EST PORTÉ TEL QUEL, ET CE QUI EST PROPRE À `chrono`
 *
 * Le geste est identique à `phrase` : remettre des éléments dans un ordre imposé
 * (`capacites.ordreEtapesImpose`), avec les mêmes trois lois validées par le père —
 *
 *   1. le décor est le FOND, il se colore avec l'avancée (`SceneDecor`, `emplacements.ts`) ;
 *   2. les vignettes à numéroter sont posées DEVANT, à des emplacements DÉRIVÉS de l'habillage ;
 *   3. une case vide est une PROMESSE DE PLACE (R59) — le réceptacle réserve sa boîte dès le
 *      départ, le jeton atterrit sur son centre MESURÉ (`../commun/fentes.js`, réutilisé
 *      tel quel, jamais recopié).
 *
 * Propre à `chrono` : la population des fentes est `consigne.ordre` (les vignettes, dans l'ordre
 * du récit).
 *
 * ── R49, DEUXIÈME PASSE : IL N'Y A PLUS DE BANDEAU MODÈLE ─────────────────────────────────────
 * Une première version de ce fichier affichait `consigne.recit` dans une bande dédiée, au-dessus
 * du décor — le même geste que R60 sur `phrase`. Le père, sur `phrase`, a vu le défaut que ce
 * geste RECRÉE : *« la phrase est en haut et en bas, il y a doublon. la consigne c'est juste de
 * quoi parle l'exercice, lire les phrases c'est normal. »* Le récit apparaissait donc DEUX fois
 * dans le moteur — une fois entier tout en haut, une fois reconstruit vignette par vignette dans
 * la ligne de fentes du bas. La ligne de fentes EST la lecture : elle grandit à mesure que
 * l'enfant range, et porte le récit entier une fois la consigne close. Un bandeau qui montre par
 * avance ce que les fentes vont montrer ne renseigne rien de plus.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import { MessageStable } from '../../composants/MessageStable.js';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { ActionChrono, ContenuChrono, EtatChrono, Habillage } from '@pierre/partage';

import { urlAsset } from '../../api/client.js';
import { SceneDecor } from '../../habillages/SceneDecor.js';
import type { RegionAllumee } from '../../habillages/SceneDecor.js';
import { deriverEmplacements, regionsColoriables } from '../../habillages/emplacements.js';
import type {
  Boite,
  Bornes,
  Cadre,
  Emplacement,
  RegionDHabillage,
  ResultatDerivation,
} from '../../habillages/emplacements.js';
import { useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import { DispositionMoteur } from '../../activite/DispositionMoteur.js';
import { RepereEtape } from '../../activite/RepereEtape.js';
import type { ProprietesMoteur } from '../types.js';
// LE MODULE COMMUN des fentes et du vol (`commun/fentes.tsx`). Ne rien recopier.
import { JetonEnVol, centreDuReceptacle } from '../commun/fentes.js';
import { CibleDeDepot, ZoneDeGlisser, useJetonGlissable } from '../commun/glisser.js';
import type { VolDuJeton } from '../commun/fentes.js';

import {
  choisirDispositionChrono,
  dispositionEnPile,
  largeurDeLaPile,
  largeurUtileDePhrase,
} from './disposition-des-phrases.js';
import type { DispositionChrono, PlaceDeLaFrise } from './disposition-des-phrases.js';
import './chrono.css';
import { ROLE_REPONSE } from '../../activite/Question.js';
import { TexteColore } from '../../lecture/TexteColore.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/** Le cadre servi tant que rien n'est mesuré — reprend la convention de `MoteurPhrase.tsx`. */
const CADRE_DE_REPLI: Cadre = { largeur: 900, hauteur: 1000 };
const HAUTEUR_BANDE_DE_REPLI = 160;

/** Respiration entre une pastille et le bord du cadre, en pixels. */
const MARGE = 14;

/** Sous cette distance d'un bord, une région n'est presque pas dessinée : on ne l'utilise pas. */
const MARGE_VISIBILITE = 28;

/** `.cible` — `padding: 0.75rem 1.25rem`, `border: 4px`. Sert à estimer l'encombrement. */
const PADDING_X = 20;
const PADDING_Y = 12;
const BORDURE = 4;
const CIBLE_MIN = 64;

/** Côté minimal d'une image de contenu (`--socle-image-min`, contrat du socle S4). */
const IMAGE_MIN = 96;

/** Largeur moyenne d'un glyphe d'Andika, en fraction du corps — reprise à l'identique. */
const LARGEUR_GLYPHE = 0.66;

/**
 * Largeur maximale d'une pastille de vignette, en pixels.
 *
 * Propre à `chrono` : une légende de vignette est une PHRASE (jusqu'à 80 caractères, schéma de
 * contenu), jamais un mot isolé comme sur `phrase`/`assemble`. Sans plafond, une légende comme
 * « Elle range un caillou sur le château. » mesure ~700 px de large — plus que la largeur
 * jouable d'un cadre portrait de 720 px. MESURÉ : la première version de ce fichier laissait
 * `mesurer()` calculer une boîte sur UNE seule ligne, nowrap, sans plafond ; le contrat de
 * sortie de `deriverEmplacements` (0 hors bornes) est alors tombé à 1 sur le format portrait le
 * plus étroit (`bac-a-sable/verif-assemble-chrono.verif.tsx`). Le plafond ci-dessous, plus le
 * passage à un texte qui peut ENJAMBER (voir le bouton de pastille plus bas), corrigent les deux
 * bouts : la boîte que `mesurer` déclare et celle que le CSS rend concordent.
 */
const LARGEUR_MAX_PASTILLE = 288; // 18rem à 16 px racine — même valeur que `maxInlineSize` du bouton.

/** Centre les cartes en une rangée, avec le même haut et la même hauteur. */
export function alignerEmplacementsChrono(
  emplacements: readonly Emplacement[],
  bornes: Bornes,
): readonly Emplacement[] {
  if (emplacements.length < 2) return emplacements;
  const hauteurCommune = Math.max(...emplacements.map((e) => e.boite.hauteur));
  const hautSouhaite = Math.min(...emplacements.map((e) => e.y - e.boite.hauteur / 2));
  const hautCommun = Math.max(
    bornes.yMin,
    Math.min(hautSouhaite, bornes.yMax - hauteurCommune),
  );
  const espace = 24;
  const largeurGroupe =
    emplacements.reduce((somme, e) => somme + e.boite.largeur, 0) +
    espace * (emplacements.length - 1);
  const largeurDisponible = bornes.xMax - bornes.xMin;
  let curseur = bornes.xMin + Math.max(0, (largeurDisponible - largeurGroupe) / 2);
  return emplacements.map((e) => {
    const x = curseur + e.boite.largeur / 2;
    curseur += e.boite.largeur + espace;
    return {
      ...e,
      x,
      y: hautCommun + hauteurCommune / 2,
      boite: { ...e.boite, hauteur: hauteurCommune },
    };
  });
}

/** Durée du vol de la vignette vers sa fente — identique à `phrase`. */
const DUREE_VOL_MS = 320;

/**
 * CE QUE LE REFUS DIT — et il ne dit JAMAIS ce qui a raté (même loi que R58 sur `phrase`).
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'vignette-hors-ordre': 'On cherche l’image qui vient à ce moment-là.',
  'vignette-deja-numerotee': 'Cette image est déjà rangée dans l’histoire.',
  'vignette-inconnue': 'On cherche l’image qui vient à ce moment-là.',
};

interface PlanDeConsigne {
  readonly id: string;
  readonly resultat: ResultatDerivation;
}

/**
 * Les plans de toutes les consignes jusqu'à la courante, dans l'ordre. FONCTION PURE, reprise à
 * l'identique du principe de `MoteurPhrase.tsx`.
 */
function planifier(parametres: {
  readonly habillage: Habillage;
  readonly etapes: EtatChrono['etapes'];
  readonly indexCourant: number;
  readonly regions: readonly RegionDHabillage[];
  readonly cadre: Cadre;
  readonly bornes: Bornes;
  mesurer(cle: string): Boite;
}): readonly PlanDeConsigne[] {
  const plans: PlanDeConsigne[] = [];
  const allumees = new Set<string>();

  for (let k = 0; k <= parametres.indexCourant; k += 1) {
    const etape = parametres.etapes[k];
    if (etape === undefined) break;

    const cles = etape.ordreAffichage;

    const disponibles = parametres.regions.filter((region) => !allumees.has(region.id));
    const resultat = deriverEmplacements({
      habillage: parametres.habillage,
      cles,
      disponibles,
      toutes: parametres.regions,
      cadre: parametres.cadre,
      bornes: parametres.bornes,
      mesurer: parametres.mesurer,
      margeVisibilite: MARGE_VISIBILITE,
    });

    plans.push({ id: etape.identifiant, resultat });
    for (const emplacement of resultat.emplacements) {
      if (emplacement.region !== null) allumees.add(emplacement.region);
    }
  }

  return plans;
}

/**
 * UNE VIGNETTE D'HISTOIRE, SAISISSABLE AU DOIGT ET TAPABLE — les deux, jamais l'un OU l'autre.
 *
 * Le tap reste le chemin PRINCIPAL : on touche la vignette, elle prend son numéro et vole vers
 * sa fente. Le glisser s'ajoute pour honorer « remettre les images dans l'ordre » des specs § 5
 * sans rien exiger de plus — sous 8 px de déplacement, le geste reste un clic.
 *
 * Composant et non `<button>` en ligne : `useDraggable` est un hook, et un hook ne s'appelle pas
 * dans un `.map`.
 */
function VignetteSaisissable({
  cle,
  libelle,
  asset,
  classes,
  numero,
  region,
  placee,
  surTap,
}: {
  readonly cle: string;
  readonly libelle: string;
  readonly asset: string | null;
  readonly classes: readonly string[];
  readonly numero: number | string;
  readonly region: string;
  readonly placee: boolean;
  readonly surTap: (evenement: { clientX: number; clientY: number }) => void;
}): ReactElement {
  const prise = useJetonGlissable(cle, placee);
  return (
    <button
      {...prise.attributs}
      {...prise.ecouteurs}
      ref={prise.brancher}
      type="button"
      {...ROLE_REPONSE}
      className={[...classes, 'chrono-vignette'].join(' ')}
      data-vignette={cle}
      data-numero={numero}
      data-pose={placee ? 'oui' : 'non'}
      data-glisse={prise.enVol ? 'oui' : 'non'}
      data-region-visee={region}
      hidden={placee}
      // Seul le style du glisser reste en ligne : sa translation suit le doigt.
      style={prise.style}
      onClick={surTap}
    >
      {asset === null ? null : (
        <img
          data-illustration-vignette="oui"
          src={urlAsset(asset)}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      )}
      <span><TexteColore texte={libelle} /></span>
    </button>
  );
}

/**
 * La frise de `chrono` reçoit des IMAGES, pas des phrases entières.
 *
 * L'ancienne version réutilisait la fente textuelle de `phrase` et lui donnait la boîte complète
 * de la carte (illustration + cinq lignes possibles). Sur la tablette portrait, trois cases vides
 * de 240 × 390 px mangeaient donc la moitié du plateau avant même le premier geste. Ici la place
 * promet exactement ce qui viendra : une miniature 4:3, avec son rang toujours visible.
 */
function FenteChrono({
  cle,
  rang,
  libelle,
  asset,
  placee,
  prochaine,
  boite,
  brancher,
}: {
  readonly cle: string;
  readonly rang: number;
  readonly libelle: string;
  readonly asset: string | null;
  readonly placee: boolean;
  readonly prochaine: boolean;
  readonly boite: Boite;
  readonly brancher: (noeud: HTMLElement | null) => void;
}): ReactElement {
  return (
    <span
      ref={brancher}
      className="chrono-fente"
      role="img"
      data-fente={cle}
      data-placee={placee ? 'oui' : 'non'}
      data-prochaine={prochaine ? 'oui' : 'non'}
      aria-label={placee ? `${String(rang)}. ${libelle}` : `Place ${String(rang)}`}
      // La boîte est celle que la dérivation a réservée : elle ne bouge pas au remplissage.
      style={{ inlineSize: `${String(boite.largeur)}px`, blockSize: `${String(boite.hauteur)}px` }}
    >
      {placee && asset !== null ? (
        <img src={urlAsset(asset)} alt="" aria-hidden="true" draggable={false} />
      ) : (
        <span className="chrono-fente__numero" aria-hidden="true">{rang}</span>
      )}
      {placee ? (
        <span className="chrono-fente__rang" aria-hidden="true">{rang}</span>
      ) : null}
    </span>
  );
}

export function MoteurChrono(
  proprietes: ProprietesMoteur<ContenuChrono, EtatChrono, ActionChrono>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionChrono);
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
    (action: ActionChrono, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  // --- la mesure du cadre ---------------------------------------------------
  const racine = useRef<HTMLDivElement | null>(null);
  const bande = useRef<HTMLDivElement | null>(null);
  const refVignettes = useRef(new Map<string, HTMLElement | null>());
  const [cadre, fixerCadre] = useState<Cadre>(CADRE_DE_REPLI);
  const [hauteurBande, fixerHauteurBande] = useState(HAUTEUR_BANDE_DE_REPLI);

  useEffect(() => {
    const noeud = racine.current;
    if (noeud === null) return undefined;

    const relever = (): void => {
      const rect = noeud.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fixerCadre({ largeur: rect.width, hauteur: rect.height });
      }
      const hautBande = bande.current?.getBoundingClientRect().height ?? 0;
      if (hautBande > 0) fixerHauteurBande(hautBande);
    };

    relever();

    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(relever);
    observateur.observe(noeud);
    if (bande.current !== null) observateur.observe(bande.current);
    return () => {
      observateur.disconnect();
    };
  }, []);

  // --- la typographie --------------------------------------------------------
  const reglages = useReglagesLecture();

  const vignetteParId = useMemo(
    () => new Map(contenu.vignettes.map((v) => [v.id, v] as const)),
    [contenu],
  );

  /**
   * L'encombrement d'une vignette. Une légende est une PHRASE (« Gobi est sur la plage. »), pas
   * un mot : au-delà de `LARGEUR_MAX_PASTILLE`, le texte ENJAMBE (le bouton plus bas retire son
   * `nowrap` pour cette raison), donc la boîte doit grandir en HAUTEUR plutôt qu'en largeur au
   * même rythme que le texte grandit — sans quoi la boîte que ce module déclare à la relaxation
   * ne correspond plus à ce que le CSS rend, et un mot déborde des bornes sans que rien ne le
   * mesure avant l'écran de l'enfant (défaut trouvé par le contrat de sortie, voir la constante).
   */
  const mesurer = useCallback(
    (cle: string): Boite => {
      const vignette = vignetteParId.get(cle);
      const libelle = vignette?.libelle ?? '';
      const corps = reglages.corpsPx;
      const interlettrage = reglages.interlettrageEm * corps;
      const largeurTexteSurUneLigne = libelle.length * (corps * LARGEUR_GLYPHE + interlettrage);
      const largeurUtile = LARGEUR_MAX_PASTILLE - 2 * (PADDING_X + BORDURE);
      const lignes = Math.max(1, Math.ceil(largeurTexteSurUneLigne / largeurUtile));
      return {
        largeur: vignette?.asset === null || vignette?.asset === undefined
          ? Math.max(CIBLE_MIN, Math.min(largeurTexteSurUneLigne, largeurUtile) + 2 * (PADDING_X + BORDURE))
          : 240,
        hauteur: Math.max(
          CIBLE_MIN,
          lignes * corps * reglages.interligne + 2 * (PADDING_Y + BORDURE) +
            (vignette?.asset === null || vignette?.asset === undefined ? 0 : 160),
        ),
      };
    },
    [vignetteParId, reglages],
  );

  // --- la dérivation --------------------------------------------------------
  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);

  const cadreJeu = useMemo<Cadre>(
    () => ({
      largeur: cadre.largeur,
      hauteur: Math.max(cadre.hauteur - hauteurBande, CIBLE_MIN + 2 * MARGE),
    }),
    [cadre, hauteurBande],
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

  const plans = useMemo(
    () =>
      planifier({
        habillage,
        etapes: etat.etapes,
        indexCourant: etat.indexEtape,
        regions,
        cadre: cadreJeu,
        bornes,
        mesurer,
      }),
    [habillage, etat.etapes, etat.indexEtape, regions, cadreJeu, bornes, mesurer],
  );

  const planCourant = plans[etat.indexEtape] ?? plans[plans.length - 1] ?? null;
  const emplacementsAlignes = useMemo(
    () => alignerEmplacementsChrono(planCourant?.resultat.emplacements ?? [], bornes),
    [planCourant, bornes],
  );

  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

  const allumees = useMemo<readonly RegionAllumee[]>(() => {
    const liste: RegionAllumee[] = [];
    const vues = new Set<string>();
    for (const plan of plans) {
      for (const emplacement of plan.resultat.emplacements) {
        if (emplacement.region === null) continue;
        if (etat.acquis[emplacement.cle] === undefined) continue;
        if (vues.has(emplacement.region)) continue;
        vues.add(emplacement.region);
        liste.push({
          id: emplacement.region,
          couleur: emplacement.couleur,
          centroide: centroideParRegion.get(emplacement.region) ?? [0, 0],
        });
      }
    }
    return liste;
  }, [plans, etat.acquis, centroideParRegion]);

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

  const aideReclamee = etape !== undefined && etape.aideDemandee !== 'aucune';
  const cibleDeLAide = !aideReclamee || etat.aide === null ? null : etat.aide.cible;

  const vignetteRefusee = etat.dernierRefus === null ? null : etat.dernierRefus.vignette;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;

  const consigne = contenu.consignes[etat.indexEtape] ?? null;
  const ordre = consigne === null ? [] : consigne.ordre;
  const restants = ordre.filter((id) => etat.acquis[id] === undefined);

  // --- la place d'une phrase de récit (décision du parent du 30 oct.) ----------
  // Un étalon caché, dans la typographie réelle du profil, mesure la largeur où chaque légende
  // garde des lignes d'au moins 15 caractères ; `choisirDispositionChrono` en déduit colonnes,
  // pile ou pile haute. Mesuré avant la peinture : l'enfant ne voit jamais l'essai.
  const plateau = useRef<HTMLDivElement | null>(null);
  const etalon = useRef<HTMLSpanElement | null>(null);
  const etalonImage = useRef<HTMLSpanElement | null>(null);
  const [policesChargees, fixerPolicesChargees] = useState(0);
  const [placeDesPhrases, fixerPlaceDesPhrases] = useState<{
    readonly disposition: DispositionChrono;
    readonly frise: PlaceDeLaFrise;
    readonly largeurCarte: number | null;
    readonly filet: boolean;
  }>({ disposition: 'colonnes', frise: 'dessous', largeurCarte: null, filet: false });
  const empreinteLegendes = ordre.map((id) => vignetteParId.get(id)?.libelle ?? '').join('\n');

  useEffect(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return undefined;
    let actif = true;
    const relancer = (): void => {
      if (actif) fixerPolicesChargees((n) => n + 1);
    };
    void document.fonts.ready.then(relancer);
    document.fonts.addEventListener('loadingdone', relancer);
    return () => {
      actif = false;
      document.fonts.removeEventListener('loadingdone', relancer);
    };
  }, []);

  useLayoutEffect(() => {
    const scene = racine.current;
    const zone = plateau.current;
    const mesure = etalon.current;
    const image = etalonImage.current;
    const moteur = scene?.closest<HTMLElement>('[data-moteur="chrono"]') ?? null;
    if (scene === null || zone === null || mesure === null || image === null || moteur === null) return;
    const largeurTexte = largeurUtileDePhrase(empreinteLegendes.split('\n'), (texte) => {
      mesure.textContent = texte;
      return mesure.getBoundingClientRect().width;
    }) + 2;
    mesure.textContent = '';
    const carte = zone.querySelector<HTMLElement>('.chrono-vignette:not([hidden])');
    // Toutes les vignettes rangées : plus rien à disposer, la dernière disposition reste.
    if (carte === null || largeurTexte <= 2) return;
    const styleCarte = getComputedStyle(carte);
    const habillageCarte = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
      .reduce((somme, cle) => somme + (Number.parseFloat(styleCarte[cle as 'paddingLeft']) || 0), 0);
    const styleScene = getComputedStyle(scene);
    const mesures = {
      largeurPlateau: scene.clientWidth
        - (Number.parseFloat(styleScene.paddingLeft) || 0) - (Number.parseFloat(styleScene.paddingRight) || 0),
      nombreDeVignettes: ordre.length,
      ecart: Number.parseFloat(getComputedStyle(zone).columnGap) || 0,
      habillageCarte,
      imageACote: image.getBoundingClientRect().width,
      largeurTexte,
    };
    const largeurCarte = Math.ceil(largeurTexte + habillageCarte);

    // Chaque essai est posé sur le DOM, mesuré, puis remplacé par le suivant : tout se joue avant
    // la peinture. Le dernier appliqué est celui retenu, et React le repose à l'identique.
    const appliquer = (disposition: DispositionChrono, frise: PlaceDeLaFrise): boolean => {
      moteur.setAttribute('data-disposition-chrono', disposition);
      moteur.setAttribute('data-frise-chrono', frise);
      zone.style.setProperty('--chrono-largeur-carte', `${String(largeurCarte)}px`);
      return scene.scrollHeight <= scene.clientHeight + 1 && scene.scrollWidth <= scene.clientWidth + 1;
    };
    let disposition = choisirDispositionChrono(mesures);
    let frise: PlaceDeLaFrise = 'dessous';
    // Des colonnes qui débordent en hauteur se rangent en pile.
    if (disposition === 'colonnes' && !appliquer('colonnes', 'dessous')) disposition = dispositionEnPile(mesures);
    if (disposition !== 'colonnes' && !appliquer(disposition, 'dessous')) {
      // Scène plus large que haute : la frise à côté, si les vignettes y gardent leur largeur.
      const tient = appliquer(disposition, 'a-cote') && zone.clientWidth >= largeurDeLaPile(mesures, disposition);
      if (tient) frise = 'a-cote';
    }
    // Sinon, le filet : la scène défile (`chrono.css`), aucun texte n'est rogné.
    const filet = !appliquer(disposition, frise);
    fixerPlaceDesPhrases((avant) =>
      avant.disposition === disposition && avant.frise === frise && avant.largeurCarte === largeurCarte
        && avant.filet === filet
        ? avant
        : { disposition, frise, largeurCarte, filet });
  }, [cadre.largeur, cadre.hauteur, reglages, empreinteLegendes, ordre.length, policesChargees, restants.length]);

  const boiteFente = useMemo<Boite>(() => {
    const nb = Math.max(ordre.length, 1);
    const largeurDisponible = Math.max(cadre.largeur - 2 * MARGE - (nb - 1) * 10, CIBLE_MIN * nb);
    // Une fente garde son image 4:3 à 96 px au moins : si la ligne ne tient pas, elle passe à la ligne.
    const largeur = Math.max((IMAGE_MIN * 4) / 3, Math.min(168, Math.floor(largeurDisponible / nb)));
    return { largeur, hauteur: Math.max(IMAGE_MIN, Math.round(largeur * 0.75)) };
  }, [cadre.largeur, ordre.length]);

  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  /** Vise la fente où cette vignette ira, AVANT d'émettre l'action. */
  const viser = (cle: string, libelle: string): void => {
    volVise.current = null;
    const cible = restants[0];
    if (cible === undefined) return;
    const arrivee = centreDuReceptacle(racine.current, refFentes.current.get(cible) ?? null);
    const depart = centreDuReceptacle(racine.current, refVignettes.current.get(cle) ?? null);
    if (arrivee === null || depart === null) return;
    volVise.current = {
      cle,
      texte: libelle,
      depart,
      arrivee,
    };
  };

  /**
   * LE GLISSER, EN PLUS DU TAP — specs § 5 « remettre les images dans l'ordre », sans trahir R16.
   *
   * Le dépôt émet EXACTEMENT la même action que le tap : `numeroter`, avec le même vol. Deux
   * gestes, une seule règle. Une seule zone d'accueil — la frise — parce que le moteur n'offre
   * aucun choix de destination : c'est l'ORDRE qui fait la règle, et `moteurChrono` seul dit si
   * la vignette lâchée était la suivante.
   */

  // La frise est la seule zone d'accueil : une vignette lâchée dessus prend la place suivante.

  const deposerLaVignette = useCallback(
    (cle: string) => {
      const emplacement = planCourant?.resultat.emplacements.find((e: { cle: string }) => e.cle === cle);
      if (emplacement === undefined) return;
      const libelle = vignetteParId.get(cle)?.libelle ?? '';
      fixerVol(null);
      viser(emplacement.cle, libelle);
      jouer({ type: 'numeroter', vignette: cle }, { clientX: emplacement.x, clientY: emplacement.y });
    },
    // `viser` est une fonction de rendu, pas un `useCallback` : la lister la rendrait instable.
    [vignetteParId, planCourant, jouer],
  );

  const messageAffiche =
    messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus;

  return (
    <ZoneDeGlisser surDepot={(jeton) => { deposerLaVignette(jeton); }}>
      <DispositionMoteur
        moteur="chrono"
        data-habillage={habillage.id}
        data-termine={etat.termineMs === null ? 'non' : 'oui'}
        data-aide={etat.niveauAide}
        data-etape={etape === undefined ? '' : etape.identifiant}
        data-regions-allumees={String(allumees.length)}
        data-vignettes-affichees={String(ordre.length)}
        data-disposition-chrono={placeDesPhrases.disposition}
        data-frise-chrono={placeDesPhrases.frise}
        data-filet-defilement={placeDesPhrases.filet ? 'oui' : 'non'}
        scene={
          <div ref={racine} className="chrono-scene">
            {/* T10 — le repère commun, affiché sous la consigne de l'écran : ce qui reste à
                ranger, sans révéler l'image suivante. SANS « Étape n sur N » : le parent l'a
                retiré le 3 septembre comme « compteur technique » (Docs/correctif-chronologies-
                2026-09-03.md) ; question reposée au parent après T10. */}
            {consigne === null ? null : (
              <RepereEtape
                moteur="chrono"
                rang={etat.indexEtape + 1}
                total={etat.etapes.length}
                afficherRang={false}
                detail={restants.length === 0
                  ? 'Histoire terminée !'
                  : `${String(restants.length)} ${restants.length === 1 ? 'image' : 'images'} à ranger.`}
                animationsDesactivees={animationsDesactivees}
              />
            )}

            {/* le décor, en fond */}
            <div className="chrono-decor">
              <SceneDecor
                habillage={habillage}
                allumees={allumees}
                derniere={derniere}
                animationsDesactivees={animationsDesactivees}
                ajustement="contenir"
              />
            </div>

            {/* les vignettes, devant ; une colonne par image de l'histoire */}
            <div
              ref={plateau}
              className="chrono-vignettes"
              data-plateau="vignettes"
              style={{
                '--chrono-colonnes': String(Math.max(ordre.length, 1)),
                ...(placeDesPhrases.largeurCarte === null ? {} : { '--chrono-largeur-carte': `${String(placeDesPhrases.largeurCarte)}px` }),
              } as CSSProperties}
            >
              <span className="chrono-etalons" aria-hidden="true">
                <span ref={etalon} className="chrono-etalon" />
                <span ref={etalonImage} className="chrono-etalon-image" />
              </span>
              {planCourant === null
                ? null
                : emplacementsAlignes.map((emplacement) => {
                    const vignette = vignetteParId.get(emplacement.cle);
                    if (vignette === undefined) return null;
                    const placee = etat.acquis[emplacement.cle] !== undefined;

                    const classes = ['cible'];
                    if (!animationsDesactivees && cibleDeLAide === emplacement.cle) {
                      classes.push('halo-demonstration');
                    }
                    if (!animationsDesactivees && vignetteRefusee === emplacement.cle) {
                      classes.push('oscillation');
                    }

                    // R54 — porteur qui centre, bouton qui oscille : deux transformations disjointes.
                    return (
                      <span
                        key={emplacement.cle}
                        ref={(noeud) => {
                          refVignettes.current.set(emplacement.cle, noeud);
                        }}
                        className="chrono-porte-vignette"
                        data-porte-vignette={emplacement.cle}
                      >
                        <VignetteSaisissable
                          key={
                            emplacement.cle === vignetteRefusee
                              ? `${emplacement.cle}-${String(marqueRefusCourante)}`
                              : emplacement.cle
                          }
                          cle={emplacement.cle}
                          libelle={vignette.libelle}
                          asset={vignette.asset === null ? null : String(vignette.asset)}
                          classes={classes}
                          numero={etat.acquis[emplacement.cle] ?? ''}
                          region={emplacement.region ?? ''}
                          placee={placee}
                          surTap={(evenement) => {
                            fixerVol(null);
                            viser(emplacement.cle, vignette.libelle);
                            jouer({ type: 'numeroter', vignette: emplacement.cle }, evenement);
                          }}
                        />
                      </span>
                    );
                  })}
            </div>

            {/* LA VIGNETTE QUI TRAVERSE — R59 : elle va DANS la fente, plus au-dessus. */}
            {vol === null ? null : (
              <div key={vol.marque} className="chrono-vol">
                <JetonEnVol vol={vol} dureeMs={DUREE_VOL_MS} />
              </div>
            )}

            {/* La bande de lecture porte l'HISTOIRE EN TRAIN DE SE RANGER (les fentes), pas la
                consigne (déjà dans l'en-tête de `EcranNoeud`, R49). */}
            <div ref={bande} className="chrono-histoire" data-plateau="histoire">
              {/* R59 — LA LIGNE DE FENTES *EST* L'HISTOIRE QU'ON RECONSTRUIT */}
              <CibleDeDepot id="frise-chrono">{(accueilFrise) => (
              <div
                ref={accueilFrise.brancher}
                className="chrono-fentes"
                data-fentes="histoire"
                data-restantes={String(restants.length)}
                data-survolee={accueilFrise.survolee ? 'oui' : 'non'}
              >
                {ordre.map((id, index) => {
                  const placee = etat.acquis[id] !== undefined;
                  const vignette = vignetteParId.get(id);
                  return (
                    <FenteChrono
                      key={id}
                      cle={id}
                      rang={index + 1}
                      libelle={vignette?.libelle ?? ''}
                      asset={vignette?.asset === null || vignette?.asset === undefined ? null : String(vignette.asset)}
                      placee={placee}
                      boite={boiteFente}
                      prochaine={!placee && restants[0] === id}
                      brancher={(noeud) => {
                        refFentes.current.set(id, noeud);
                      }}
                    />
                  );
                })}
              </div>
              )}</CibleDeDepot>
            </div>
          </div>
        }
        pied={
          <>
            {/* CE QUE LE REFUS DIT — jamais ce qui a raté, jamais quelle vignette est attendue. */}
            <p
              role="status"
              aria-live="polite"
              data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
              data-animations={animationsDesactivees ? 'calmes' : 'vives'}
              className="chrono-retour"
            >
              <MessageStable messages={Object.values(MESSAGES_DE_REFUS)}>{messageAffiche}</MessageStable>
            </p>

            <p role="status" aria-live="polite" data-annonce="coloriage" className="chrono-annonce">
              {derniere === null
                ? ''
                : `${
                    regions.find((r) => r.id === derniere.id)?.libelle ?? derniere.id
                  } reprend ses couleurs.`}
            </p>
            {/* LES DEUX CONTRÔLES SONT PORTÉS PAR L'ÉCRAN, PAS PAR LE MOTEUR (R10). */}
          </>
        }
      />
    </ZoneDeGlisser>
  );
}
