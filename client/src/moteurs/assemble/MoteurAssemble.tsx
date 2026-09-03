/**
 * `MoteurAssemble` — le composant hôte du moteur `assemble`. Lot de portage « décor de fond +
 * mots posés » (R47/R52), depuis `phrase` — première scène jugée par le père : « fais les
 * beaux design ».
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurAssemble` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionAssemble`, fait battre l'horloge, déclenche le retour
 * sensoriel, et donne à voir l'état.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI EST PORTÉ TEL QUEL, ET CE QUI EST PROPRE À `assemble`
 *
 * Le geste est identique à `phrase` : remettre des éléments dans un ordre imposé
 * (`capacites.ordreEtapesImpose`), avec les mêmes trois lois validées par le père —
 *
 *   1. le décor est le FOND, il se colore avec l'avancée (`SceneDecor`, `emplacements.ts`) ;
 *   2. les éléments à ranger sont posés DEVANT, à des emplacements DÉRIVÉS de l'habillage —
 *      jamais une coordonnée écrite à la main ;
 *   3. une case vide est une PROMESSE DE PLACE (R59) — le réceptacle réserve sa boîte dès le
 *      départ, le jeton atterrit sur son centre MESURÉ (`../phrase/receptacles.js`, réutilisé
 *      tel quel, jamais recopié).
 *
 * Propre à `assemble` : la population des fentes est `consigne.solution` (les blocs-syllabes,
 * DANS L'ORDRE — « ta-pis » n'est pas « pis-ta ») ; les quatre motifs de refus.
 *
 * ── R49, DEUXIÈME PASSE : IL N'Y A PLUS DE BANDEAU MODÈLE ─────────────────────────────────────
 * Une première version de ce fichier affichait `consigne.mot` dans une bande dédiée, au-dessus
 * du décor — le même geste que R60 sur `phrase`. Le père, sur `phrase`, a vu le défaut que ce
 * geste RECRÉE : *« la phrase est en haut et en bas, il y a doublon. la consigne c'est juste de
 * quoi parle l'exercice, lire les phrases c'est normal. »* Le mot complet apparaissait donc DEUX
 * fois dans le moteur lui-même — une fois entier tout en haut, une fois reconstruit bloc par
 * bloc dans la ligne de fentes du bas — sans compter l'en-tête de `EcranNoeud` qui le porte déjà
 * (enveloppé dans la consigne, en typographie d'interface). La ligne de fentes EST la lecture :
 * elle grandit à mesure que l'enfant range, et porte le mot entier une fois la consigne close.
 * Un bandeau qui montre par avance ce que les fentes vont montrer ne renseigne rien de plus, et
 * fait chercher à l'enfant « la différence entre les deux » là où il n'y en a aucune.
 *
 * ── LES BLOCS INTRUS SONT AFFICHÉS, MAIS JAMAIS PAR `ordreAffichage` ──────────────────────────
 * `contenu.blocs` porte des blocs INTRUS — des syllabes offertes qui n'entrent dans le mot
 * d'AUCUNE consigne (`bloc-bis`, jumeau de `bloc-pis`). Une première version de ce fichier ne
 * les rendait pas du tout, en s'appuyant uniquement sur `EtatEtapeAssemble.ordreAffichage`
 * (`partage/src/moteurs/assemble/moteur.ts`, toujours NON modifié) qui les exclut par
 * construction : il filtre sur `etape.solution.includes(id)`, et c'est volontaire — l'ENSEMBLE
 * TRIÉ de ce champ doit rester identique à `consigne.solution` pour que le garde Q4
 * (`tests/unitaires/melange-des-reponses.test.ts`) continue de le reconnaître comme « l'ordre
 * affiché » (il retient le premier champ de l'état dont le contenu trié égale celui de la
 * réponse ; l'élargir aurait fait retomber Q4 sur `restantes`, non mélangé, et déclaré
 * `assemble` gagné à 100 % sans lire).
 *
 * Mais `tests/composants/MoteurAssemble.test.tsx` tape directement sur un bloc intrus et
 * attend qu'il soit refusé, compté en erreur, et journalisé dans `confusion` — la mécanique que
 * `bloc-intrus` existe pour exercer. Un intrus jamais rendu est une loi morte : le motif de
 * refus `bloc-intrus` devient inatteignable au doigt, alors que le contenu le prévoit
 * explicitement (v. le commentaire de `ponton-assemble-01.json` : « les deux intrus sont les
 * JUMEAUX des syllabes justes, jamais des syllabes au hasard »).
 *
 * Le remède tient donc en DEUX dérivations disjointes, jamais une seule élargie :
 *   1. `plans` (via `planifier`, INCHANGÉ) ne voit QUE `ordreAffichage` — c'est lui qui alimente
 *      le pool de régions rallumées d'une étape à l'autre, et Q4 le lit tel quel ;
 *   2. `planAffiche`, plus bas, REFAIT la dérivation de la SEULE étape courante en y ajoutant
 *      les intrus pertinents (`intrusPertinents`) — sur le MÊME pool de régions encore
 *      disponibles à ce point, pour que solution et intrus se relaxent l'un contre l'autre sans
 *      jamais se chevaucher. C'est ce second plan, et lui seul, qui est rendu à l'écran.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { ActionAssemble, ContenuAssemble, EtatAssemble, Habillage } from '@pierre/partage';

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
import { styleDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';
// LE MODULE GÉNÉRIQUE — écrit pour `phrase`, adopté ici tel quel (§ en-tête du fichier).
// Ne rien recopier : `Fente`, `JetonEnVol`, `centreDuReceptacle`, `decalageEntre` ne connaissent
// ni bloc, ni consigne, ni habillage — seulement des jetons porteurs d'un texte et des
// réceptacles qui leur gardent la place.
import {
  FEUILLE_DU_VOL,
  Fente,
  JetonEnVol,
  centreDuReceptacle,
  decalageEntre,
} from '../phrase/receptacles.js';
import { ZoneDeGlisser, useCibleDeDepot, useJetonGlissable } from '../commun/glisser.js';
import type { VolDuJeton } from '../phrase/receptacles.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/**
 * Le cadre servi tant que rien n'est mesuré — premier rendu, `happy-dom`, `ResizeObserver`
 * absent. Reprend à l'identique la convention de `MoteurPhrase.tsx`.
 */
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

/**
 * Largeur moyenne d'un glyphe d'Andika, en fraction du corps. Reprise à l'identique de
 * `MoteurPhrase.tsx` — même police, même profil de lecture, même parti pris (se tromper du
 * côté qui laisse de l'espace plutôt que de faire chevaucher).
 */
const LARGEUR_GLYPHE = 0.66;

/**
 * Le rectangle occupé par le décor ET par les blocs : tout, sauf la bande de lecture. Sans
 * bandeau modèle (R49, deuxième passe), il n'y a plus qu'une seule hauteur à retrancher.
 * Écrit une fois, employé deux fois — deux littéraux qui doivent rester égaux finiraient par
 * diverger.
 */
function ZONE_DE_JEU(hauteurBande: number): CSSProperties {
  return {
    insetInlineStart: 0,
    insetInlineEnd: 0,
    insetBlockStart: 0,
    insetBlockEnd: `${String(hauteurBande)}px`,
  };
}

/** Durée du vol du bloc vers sa fente — identique à `phrase` : c'est le retour au geste, pas
 * une propriété du décor, donc pas prise dans `habillage.timings`. */
const DUREE_VOL_MS = 320;

/**
 * CE QUE LE REFUS DIT — et il ne dit JAMAIS ce qui a raté.
 *
 * Même loi que `phrase` (R58) : ni « tu », ni « non », ni « erreur », et jamais la syllabe
 * attendue — la nommer ferait du refus une aide gratuite.
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'bloc-hors-ordre': 'On cherche la syllabe qui vient à cette place-là.',
  'bloc-intrus': 'Cette syllabe-là n’est pas dans ce mot.',
  'bloc-deja-pose': 'Cette syllabe est déjà rangée dans le mot.',
  'bloc-inconnu': 'On cherche la syllabe qui vient à cette place-là.',
};

interface PlanDeConsigne {
  readonly id: string;
  readonly resultat: ResultatDerivation;
}

/**
 * Les plans de toutes les consignes jusqu'à la courante, dans l'ordre. FONCTION PURE, reprise à
 * l'identique du principe de `MoteurPhrase.tsx` : le pool de régions d'une consigne dépend de
 * celles que les consignes précédentes ont déjà rallumées, donc les plans se calculent en
 * cascade plutôt que de garder un état caché.
 */
function planifier(parametres: {
  readonly habillage: Habillage;
  readonly etapes: EtatAssemble['etapes'];
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

    // L'ORDRE AFFICHÉ VIENT DU MOTEUR (R44) : `ordreAffichage` est tiré une seule fois par
    // `Alea` dans `creerEtat`, jamais remélangé ici.
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
 * UN BLOC-SYLLABE, SAISISSABLE AU DOIGT ET TAPABLE — les deux, jamais l'un OU l'autre.
 *
 * C'est un composant et non un `<button>` en ligne pour une raison mécanique : `useDraggable`
 * est un hook, et un hook ne s'appelle pas dans un `.map`. Le sortir ici est la seule façon de
 * donner à CHAQUE bloc sa propre prise, sans quoi les huit blocs partageraient la même.
 *
 * L'ordre des attributs est normatif, et `Reserve.tsx` le documentait déjà : les attributs de
 * dnd-kit d'abord, les nôtres ENSUITE. `useDraggable` pose son propre `style` et son propre
 * `role` ; les écraser après coup est voulu — le `data-bloc` que les recettes visent ne doit
 * jamais être remplacé par un attribut de bibliothèque.
 */
function BlocSaisissable({
  cle,
  libelle,
  classes,
  region,
  placee,
  styleTexte,
  surTap,
}: {
  readonly cle: string;
  readonly libelle: string;
  readonly classes: readonly string[];
  readonly region: string;
  readonly placee: boolean;
  readonly styleTexte: CSSProperties;
  readonly surTap: (evenement: { clientX: number; clientY: number }) => void;
}): ReactElement {
  const prise = useJetonGlissable(cle, placee);
  return (
    <button
      {...prise.attributs}
      {...prise.ecouteurs}
      ref={prise.brancher}
      type="button"
      className={classes.join(' ')}
      data-bloc={cle}
      data-pose={placee ? 'oui' : 'non'}
      data-glisse={prise.enVol ? 'oui' : 'non'}
      data-region-visee={region}
      hidden={placee}
      style={
        {
          ...styleTexte,
          ...prise.style,
          pointerEvents: 'auto',
          whiteSpace: 'nowrap',
        } as CSSProperties
      }
      onClick={surTap}
    >
      {libelle}
    </button>
  );
}

export function MoteurAssemble(
  proprietes: ProprietesMoteur<ContenuAssemble, EtatAssemble, ActionAssemble>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionAssemble);
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

  /**
   * LE VOL — l'état, et la cible VISÉE AU MOMENT DU TAP. Mécanique identique à `phrase`
   * (`receptacles.tsx`) : la fente existe encore au moment du geste, c'est elle qu'on mesure.
   */
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
      // Refus : oscillation de 6 px et son NEUTRE. Aucune vibration, aucun rouge (§ 4.1).
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
    (action: ActionAssemble, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  // --- la mesure du cadre ---------------------------------------------------
  // R39 : le banc mesure en PAYSAGE, l'enfant joue en PORTRAIT — on mesure ce qu'on reçoit.
  const racine = useRef<HTMLDivElement | null>(null);
  const bande = useRef<HTMLDivElement | null>(null);
  const coucheBlocs = useRef<HTMLDivElement | null>(null);
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
  const styleLecture = useMemo(() => styleDeLecture(reglages), [reglages]);

  const blocParId = useMemo(
    () => new Map(contenu.blocs.map((b) => [b.id, b] as const)),
    [contenu],
  );

  const mesurer = useCallback(
    (cle: string): Boite => {
      const libelle = blocParId.get(cle)?.libelle ?? '';
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
    [blocParId, reglages],
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

  /**
   * Les blocs INTRUS pertinents pour l'étape courante : ceux dont `confusionAvec` désigne le
   * libellé d'un bloc de LA SOLUTION de cette étape — les « jumeaux » que le contenu prévoit,
   * jamais des intrus au hasard. Mesuré sur la fixture de `tests/composants/MoteurAssemble.test.tsx`
   * (`bloc-bis`, `confusionAvec: 'pis'`, solution `['bloc-ta', 'bloc-pis']`) : un seul intrus
   * pertinent, celui que le test tape.
   */
  const intrusPertinents = useMemo(() => {
    const etapeContenu = contenu.consignes[etat.indexEtape];
    if (etapeContenu === undefined) return [];
    const libellesSolution = new Set(
      etapeContenu.solution
        .map((id) => blocParId.get(id)?.libelle)
        .filter((l): l is string => l !== undefined),
    );
    return contenu.blocs
      .filter((b) => b.intrus && b.confusionAvec !== null && libellesSolution.has(b.confusionAvec))
      .map((b) => b.id);
  }, [contenu, etat.indexEtape, blocParId]);

  /**
   * Les régions déjà réservées par les étapes PRÉCÉDENTES — le même calcul que `planifier()`
   * fait en interne pour la disponibilité de l'étape courante, reproduit ici pour poser les
   * intrus sur le MÊME pool sans toucher `plans`, qui doit rester une fonction du seul
   * `ordreAffichage` (voir l'en-tête du fichier).
   */
  const disponiblesPourCourant = useMemo(() => {
    const dejaUtilisees = new Set<string>();
    for (let k = 0; k < plans.length - 1; k += 1) {
      const plan = plans[k];
      if (plan === undefined) continue;
      for (const emplacement of plan.resultat.emplacements) {
        if (emplacement.region !== null) dejaUtilisees.add(emplacement.region);
      }
    }
    return regions.filter((r) => !dejaUtilisees.has(r.id));
  }, [plans, regions]);

  /**
   * Le plan RENDU : celui de l'étape courante, enrichi des intrus pertinents dans la MÊME
   * dérivation — une seule relaxation, pour que solution et intrus ne se chevauchent jamais.
   * `plans`/`ordreAffichage` restent intacts (Q4), ce plan-ci n'existe que pour l'écran.
   */
  const planAffiche = useMemo((): PlanDeConsigne | null => {
    if (planCourant === null) return null;
    if (intrusPertinents.length === 0) return planCourant;
    return {
      id: planCourant.id,
      resultat: deriverEmplacements({
        habillage,
        cles: [...(etat.etapes[etat.indexEtape]?.ordreAffichage ?? []), ...intrusPertinents],
        disponibles: disponiblesPourCourant,
        toutes: regions,
        cadre: cadreJeu,
        bornes,
        mesurer,
        margeVisibilite: MARGE_VISIBILITE,
      }),
    };
  }, [
    planCourant,
    intrusPertinents,
    etat.etapes,
    etat.indexEtape,
    habillage,
    disponiblesPourCourant,
    regions,
    cadreJeu,
    bornes,
    mesurer,
  ]);

  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

  /** Les régions rallumées : celles dont le bloc est ACQUIS. « Un acquis n'est jamais repris »
   * (R14) est ici une propriété de la liste. */
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

  /** CE QUE L'AIDE DÉSIGNE — même correction que R53 sur `phrase` : on ne désigne la cible que
   * si l'enfant a RÉCLAMÉ l'aide, jamais au palier automatique. */
  const aideReclamee = etape !== undefined && etape.aideDemandee !== 'aucune';
  const cibleDeLAide = !aideReclamee || etat.aide === null ? null : etat.aide.cible;

  const blocRefuse = etat.dernierRefus === null ? null : etat.dernierRefus.bloc;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;

  const consigne = contenu.consignes[etat.indexEtape] ?? null;
  const solution = consigne === null ? [] : consigne.solution;
  const restants = solution.filter((id) => etat.acquis[id] === undefined);

  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  /** Vise la fente où ce bloc ira, AVANT d'émettre l'action — la fente existe encore. */
  const viser = (emplacement: Emplacement, libelle: string): void => {
    volVise.current = null;
    const cible = restants[0];
    if (cible === undefined) return;
    const arrivee = centreDuReceptacle(racine.current, refFentes.current.get(cible) ?? null);
    if (arrivee === null) return;
    const [decX, decY] = decalageEntre(racine.current, coucheBlocs.current);
    volVise.current = {
      cle: emplacement.cle,
      texte: libelle,
      depart: [emplacement.x + decX, emplacement.y + decY],
      arrivee,
    };
  };

  const accueil = useCibleDeDepot('fentes-du-mot');

  /**
   * LE GLISSER, EN PLUS DU TAP — R16, et la promesse « faire glisser des blocs-syllabes ».
   *
   * Le dépôt émet EXACTEMENT la même action que `onClick` : `poser`, avec le même vol vers la
   * fente. Deux gestes, une seule règle — sans quoi le jeu se comporterait autrement selon la
   * façon dont l'enfant touche l'écran, ce qui est le pire des deux mondes.
   *
   * La cible est unique : la ligne du mot. `assemble` n'a pas de choix de destination — l'ordre
   * fait la règle — donc offrir plusieurs zones inventerait une décision qui n'existe pas.
   */
  const deposerLeBloc = useCallback(
    (bloc: string) => {
      const emplacement = planAffiche?.resultat.emplacements.find((e) => e.cle === bloc);
      if (emplacement === undefined) return;
      const libelle = blocParId.get(bloc)?.libelle ?? '';
      fixerVol(null);
      viser(emplacement, libelle);
      // Le glisser n'a pas de coordonnées de clic : on note le centre du bloc, qui est
      // précisément d'où le jeton part.
      jouer({ type: 'poser', bloc }, { clientX: emplacement.x, clientY: emplacement.y });
    },
    // `viser` est une fonction de rendu (pas un `useCallback`) : la lister ici la rendrait
    // instable à chaque image. Les valeurs qu'elle lit sont des `ref`, jamais du state.
    [blocParId, planAffiche, jouer],
  );

  return (
    <ZoneDeGlisser surDepot={(jeton) => { deposerLeBloc(jeton); }}>
    <div
      ref={racine}
      data-moteur="assemble"
      data-habillage={habillage.id}
      data-termine={etat.termineMs === null ? 'non' : 'oui'}
      data-aide={etat.niveauAide}
      data-etape={etape === undefined ? '' : etape.identifiant}
      data-regions-allumees={String(allumees.length)}
      data-blocs-affiches={String(solution.length + intrusPertinents.length)}
      style={{
        position: 'relative',
        blockSize: '100%',
        minBlockSize: 0,
        overflow: 'hidden',
        borderRadius: 'var(--rayon-carte)',
      }}
    >
      <style>{FEUILLE_DU_VOL}</style>

      {/* ---------------------------------------------------------------- le décor, en fond */}
      <div style={{ position: 'absolute', ...ZONE_DE_JEU(hauteurBande), zIndex: 0 }}>
        <SceneDecor
          habillage={habillage}
          allumees={allumees}
          derniere={derniere}
          animationsDesactivees={animationsDesactivees}
          ajustement="contenir"
        />
      </div>

      {/* ------------------------------------------------------- les blocs, devant, aux régions */}
      <div
        ref={coucheBlocs}
        data-plateau="blocs"
        style={{
          position: 'absolute',
          ...ZONE_DE_JEU(hauteurBande),
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        {planAffiche === null
          ? null
          : planAffiche.resultat.emplacements.map((emplacement) => {
              const bloc = blocParId.get(emplacement.cle);
              if (bloc === undefined) return null;
              const placee = etat.acquis[emplacement.cle] !== undefined;

              const classes = ['cible'];
              if (!animationsDesactivees && cibleDeLAide === emplacement.cle) {
                classes.push('halo-demonstration');
              }
              if (!animationsDesactivees && blocRefuse === emplacement.cle) {
                classes.push('oscillation');
              }

              // R54 — DEUX ÉLÉMENTS, PORTEUR QUI CENTRE ET BOUTON QUI OSCILLE, jamais la même
              // transform sur les deux : c'est la loi que `phrase` a établie et qu'on reprend
              // sans y toucher (voir l'en-tête de `receptacles.tsx`).
              return (
                <span
                  key={emplacement.cle}
                  data-porte-bloc={emplacement.cle}
                  style={{
                    position: 'absolute',
                    insetInlineStart: `${String(emplacement.x)}px`,
                    insetBlockStart: `${String(emplacement.y)}px`,
                    transform: 'translate(-50%, -50%)',
                    display: 'inline-flex',
                    pointerEvents: 'none',
                  }}
                >
                  <BlocSaisissable
                    key={
                      emplacement.cle === blocRefuse
                        ? `${emplacement.cle}-${String(marqueRefusCourante)}`
                        : emplacement.cle
                    }
                    cle={emplacement.cle}
                    libelle={bloc.libelle}
                    classes={classes}
                    region={emplacement.region ?? ''}
                    placee={placee}
                    styleTexte={styleLecture as CSSProperties}
                    surTap={(evenement) => {
                      fixerVol(null);
                      viser(emplacement, bloc.libelle);
                      jouer({ type: 'poser', bloc: emplacement.cle }, evenement);
                    }}
                  />
                </span>
              );
            })}
      </div>

      {/* ── LE BLOC QUI TRAVERSE — R59 : il va DANS la fente, plus au-dessus ─────────────────
          Couche qui couvre tout le moteur ; copie transitoire, purement additive. */}
      {vol === null ? null : (
        <div
          key={vol.marque}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
        >
          <JetonEnVol vol={vol} dureeMs={DUREE_VOL_MS} styleTexte={styleLecture as CSSProperties} />
        </div>
      )}

      {/* ------------------------------------------------------------ la bande de lecture
          « Le décor s'agite, le texte jamais » : fond parchemin, police de lecture, aucune
          animation. Porte le MOT EN TRAIN DE SE FAIRE (les fentes), pas la consigne — la
          consigne est déjà dans l'en-tête de `EcranNoeud` (R49). */}
      <div
        ref={bande}
        data-plateau="mot"
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          insetInlineEnd: 0,
          insetBlockEnd: 0,
          zIndex: 2,
          /* La réponse se lit sous l'illustration, jamais collée au bord gauche. */
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingInline: 'clamp(0.75rem, 4vw, 3rem)',
          boxSizing: 'border-box',
        }}
      >
        {/* ── R59 — LA LIGNE DE FENTES *EST* LE MOT QU'ON RECONSTRUIT ──────────────────────── */}
        {/* LA LIGNE DU MOT EST LA ZONE D'ACCUEIL DU GLISSER. Une seule cible, et c'est voulu :
            `assemble` n'offre aucun choix de destination — c'est l'ORDRE qui fait la règle —
            donc plusieurs zones inventeraient une décision que le moteur ne prend pas.
            Le liseré n'apparaît QUE pendant le survol : une affordance permanente ferait du
            bruit pour l'enfant qui joue au tap, c'est-à-dire pour le chemin principal. */}
        <div
          ref={accueil.brancher}
          data-fentes="mot"
          data-alignement="centre"
          data-restantes={String(restants.length)}
          data-survolee={accueil.survolee ? 'oui' : 'non'}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            inlineSize: '100%',
            maxInlineSize: '72rem',
            gap: '0.5rem',
            marginBlockEnd: '0.6rem',
            outline: accueil.survolee ? '3px dashed var(--soleil)' : undefined,
            outlineOffset: '4px',
            borderRadius: 'var(--rayon-carte)',
          }}
        >
          {solution.map((id) => {
            const placee = etat.acquis[id] !== undefined;
            return (
              <Fente
                key={id}
                cle={id}
                texte={placee ? (blocParId.get(id)?.libelle ?? '') : null}
                boite={mesurer(id)}
                prochaine={!placee && restants[0] === id}
                styleTexte={styleLecture as CSSProperties}
                brancher={(noeud) => {
                  refFentes.current.set(id, noeud);
                }}
              />
            );
          })}
        </div>

        {/* CE QUE LE REFUS DIT — jamais ce qui a raté, jamais la syllabe attendue. S'efface tout
            seul dès qu'un geste est pris (le réducteur remet `dernierRefus` à `null`). */}
        <p
          role="status"
          aria-live="polite"
          data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
          data-animations={animationsDesactivees ? 'calmes' : 'vives'}
          style={{ ...styleLecture, margin: 0, minBlockSize: '1.5em' } as CSSProperties}
        >
          {messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus}
        </p>

        {/* Ce que le décor NE DIT PAS aux lecteurs d'écran, le moteur le dit en clair. */}
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
            : `${
                regions.find((r) => r.id === derniere.id)?.libelle ?? derniere.id
              } reprend ses couleurs.`}
        </p>
      </div>

      {/* ── LES DEUX CONTRÔLES SONT PORTÉS PAR L'ÉCRAN, PAS PAR LE MOTEUR (R10) ────────────── */}
    </div>
    </ZoneDeGlisser>
  );
}
