/**
 * `MoteurPhrase` — le composant hôte du moteur `phrase`. Lot L2-E, mise en scène reprise
 * après la troisième session de jeu du père (R51, R52).
 *
 * Il ne décide de RIEN de la RÈGLE. Toute la règle vit dans `moteurPhrase` (paquet `partage`) ;
 * ce composant traduit un geste en `ActionPhrase`, fait battre l'horloge, déclenche le retour
 * sensoriel, et donne à voir l'état. Ce qui a changé, c'est le DONNER À VOIR.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE LE PÈRE A VU, ET CE QU'IL A DÉCIDÉ
 *
 * Sur sa tablette EN PORTRAIT, `banniere-phrase-01` rendait : un en-tête, la consigne, la
 * consigne encore une fois, une rangée de dix mots minuscules en haut à gauche, ~250 px de vide,
 * un décor de 310 px flottant au centre, ~350 px de vide, et Gobi tout en bas.
 * **« c'est pas beau design »** (R51).
 *
 * Sa décision fait foi, et c'est mot pour mot la v2 lignes 70 et 79 (R52) :
 *
 *   1. **le décor est le FOND** — il couvre l'écran au lieu d'y flotter ;
 *   2. **il se colore avec l'avancée de l'exercice** — pas seulement à la fin, sur la carte ;
 *   3. **les mots sont DEVANT**, bonne taille, bonne police, à des endroits choisis —
 *      « mais lisibles ». **La lisibilité l'emporte sur la mise en scène.**
 *
 * ── OÙ SONT POSÉS LES MOTS, ET POURQUOI PERSONNE N'A À L'ÉCRIRE ───────────────────────────────
 * Aux CENTROÏDES des régions coloriables de l'habillage, choisies par SURFACE décroissante. Les
 * deux champs sont déjà dans `*.habillage.json` depuis le lot M6 — neuf régions nommées pour la
 * bannière, dix pour la guirlande. Rien n'est écrit à la main, donc **ajouter un habillage coûte
 * toujours zéro ligne de code** (v2 § 7, et c'est ce qui porte R12 et R13). Toute la dérivation
 * est dans `client/src/habillages/emplacements.ts`, qui ne connaît aucun décor.
 *
 * ── LE LIEN QUI FAIT LA BOUCLE DE 30 SECONDES ─────────────────────────────────────────────────
 * Le mot est posé SUR une région, et c'est CETTE région qu'il rallume quand il est correctement
 * rangé. Une seule dérivation sert donc l'emplacement ET la recoloration : le balayage part de
 * sous le doigt de l'enfant, comme la v2 ligne 79 le demande. « Action → retour immédiat →
 * fragment de décor recolorié » cesse d'être une phrase de spécification.
 *
 * ── TROIS INVARIANTS DE RENDU, INCHANGÉS ET OPPOSABLES ────────────────────────────────────────
 *   - **aucun `data-etat="echec"` n'est émis ici, ni ailleurs** (R14) ;
 *   - **aucun rouge sur un refus** : la cible oscille, elle ne se colore pas ;
 *   - **toute cible fait au moins 64 px** — c'est la classe `.cible` qui le pose désormais,
 *     donc `var(--cible-min)` et non un nombre recopié.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import { MessageStable } from '../../composants/MessageStable.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { ActionPhrase, ContenuPhrase, EtatPhrase, Habillage } from '@pierre/partage';

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
import { DispositionMoteur } from '../../activite/DispositionMoteur.js';
import { RepereEtape } from '../../activite/RepereEtape.js';
import { ZoneDeLecture, useReglagesLecture } from '../../lecture/ZoneDeLecture.js';
import type { ProprietesMoteur } from '../types.js';
import { Fente, JetonEnVol, centreDuReceptacle, decalageEntre } from '../commun/fentes.js';
import './phrase.css';
import { CibleDeDepot, ZoneDeGlisser, useJetonGlissable } from '../commun/glisser.js';
import type { VolDuJeton } from '../commun/fentes.js';
import { ROLE_REPONSE } from '../../activite/Question.js';
import { TexteColore } from '../../lecture/TexteColore.js';

/** Cadence du `battementHorloge`. Le moteur ne connaît aucun `setTimeout` : c'est ici. */
const PERIODE_BATTEMENT_MS = 1000;

/**
 * Le cadre servi tant que rien n'est mesuré — premier rendu, `happy-dom`, `ResizeObserver`
 * absent. Il n'est PAS une supposition sur la tablette du père : il ne sert qu'à ce que les
 * mots existent et soient tapables avant la première mesure. La mesure réelle arrive au
 * premier `ResizeObserver` et remplace tout.
 */
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

/**
 * Largeur moyenne d'un glyphe d'Andika, en fraction du corps. Mesurée à l'œil nu ? Non :
 * majorée volontairement. Une estimation TROP LARGE écarte les pastilles davantage que
 * nécessaire — le défaut est alors de l'espace perdu ; une estimation trop étroite les fait se
 * chevaucher, et le défaut est alors de l'illisible. On se trompe du côté qui ne coûte rien.
 */
const LARGEUR_GLYPHE = 0.66;

/**
 * Le rectangle occupé par le décor ET par les mots : tout, sauf la bande de lecture.
 * Écrit une fois, employé deux fois — deux littéraux qui doivent rester égaux finiraient par
 * diverger, et le décor se décalerait de ses mots sans que rien ne le dise.
 */
/**
 * Assez long pour être suivi de l'œil, assez court pour ne jamais retarder le geste suivant —
 * et de toute façon **le geste suivant l'interrompt** (v2 § 8 : aucune animation bloquante).
 *
 * Cette durée n'est PAS prise dans `habillage.timings` : elle ne décrit pas le décor mais le
 * retour au geste, qui est le même pour tous les habillages. La sortir dans le fichier
 * d'habillage donnerait à chaque décor le droit de régler la réactivité du jeu.
 */
const DUREE_VOL_MS = 320;

/**
 * CE QUE LE REFUS DIT — et il ne dit JAMAIS ce qui a raté.
 *
 * « Aucun écran d'échec, jamais » (v2 § 5.4). Un refus n'est pas une faute : c'est un geste que
 * le jeu n'a pas pris. Ces quatre phrases disent donc **ce qu'on attend**, au présent, sans
 * « tu », sans « non », sans « erreur » — et sans jamais nommer le mot attendu, sans quoi le
 * refus deviendrait une aide gratuite et le déchiffrage n'aurait plus lieu.
 *
 * ⚠ MANQUE CONNU, CHIFFRÉ AU RAPPORT : ces quatre textes n'ont **aucun clip**.
 * `scripts/recenser-textes.mjs` recense le CONTENU — exercices, points du campement, tableaux
 * d'ouverture — et n'offre aucun canal à une chaîne d'interface. « Tout est audible en un tap »
 * n'est donc pas tenu ici. Ils sont réunis dans cette seule table pour qu'un lot qui possède
 * `scripts/` n'ait qu'un endroit à brancher, sous les clés `phrase/refus-<motif>`.
 */
const MESSAGES_DE_REFUS: Readonly<Record<string, string>> = {
  'etiquette-hors-ordre': 'On cherche le mot qui vient à cette place-là.',
  'etiquette-intruse': 'Ce mot-là n’est pas dans cette phrase.',
  'etiquette-deja-placee': 'Ce mot est déjà rangé dans la phrase.',
  'etiquette-inconnue': 'On cherche le mot qui vient à cette place-là.',
};

interface PlanDeConsigne {
  readonly id: string;
  readonly resultat: ResultatDerivation;
}

/**
 * Les plans de toutes les consignes jusqu'à la courante, dans l'ordre.
 *
 * FONCTION PURE — c'est le point. Le pool de régions d'une consigne dépend de celles que les
 * consignes précédentes ont déjà rallumées, donc les plans se calculent en cascade. Les
 * recalculer entièrement à chaque rendu coûte quelques microsecondes et supprime tout état
 * caché : aucune `ref` à tenir, aucun ordre de rendu à espérer, et deux exécutions à même
 * graine donnent le même écran.
 */
function planifier(parametres: {
  readonly habillage: Habillage;
  readonly etapes: EtatPhrase['etapes'];
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

    // R44 — L'ORDRE AFFICHÉ VIENT DU MOTEUR, il n'est plus retiré ici.
    //
    // Première version de ce lot : le mélange était fait dans le rendu, à partir d'une graine
    // dérivée de `(graine, idConsigne)`. C'était pur et reproductible, et l'enfant voyait bien
    // des mots mélangés — mais le garde Q4 mesure le MOTEUR et le CONTENU, pas le DOM, et il
    // restait donc rouge : le mélange existait sans être mesurable.
    //
    // Surtout, quatre autres moteurs portent le même biais (`chrono` 5,0 × le hasard,
    // `histoire` 2,5 ×, `assemble` 2,1 ×, `paires` 2,0 ×) et seront corrigés par un autre lot.
    // Une variante maison sur `phrase` aurait installé deux mécanismes pour une seule règle —
    // très exactement ce qui a fait diverger les deux listes de polices (R8).
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
 * UNE ÉTIQUETTE-MOT, SAISISSABLE AU DOIGT ET TAPABLE — les deux, jamais l'un OU l'autre.
 *
 * Le tap reste le chemin PRINCIPAL, et c'est celui que le père a validé le 2026-08-07 :
 * « une fois sélectionner, c'est bien que le mot se déplace tout seul sur la case vide ». Le
 * glisser s'ajoute pour honorer « remettre les mots dans l'ordre » des specs § 5, sans rien
 * exiger de plus de l'enfant — sous 8 px de déplacement, le geste reste un clic.
 *
 * Composant et non `<button>` en ligne : `useDraggable` est un hook, et un hook ne s'appelle
 * pas dans un `.map`. C'est la seule façon de donner à CHAQUE étiquette sa propre prise.
 */
function EtiquetteSaisissable({
  cle,
  mot,
  classes,
  region,
  placee,
  surTap,
}: {
  readonly cle: string;
  readonly mot: string;
  readonly classes: readonly string[];
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
      className={classes.join(' ')}
      data-etiquette={cle}
      data-placee={placee ? 'oui' : 'non'}
      data-glisse={prise.enVol ? 'oui' : 'non'}
      data-region-visee={region}
      hidden={placee}
      // Le fond opaque et la lecture sont dans `phrase.css` (R37) ; ici, seulement la prise du glisser.
      style={prise.style}
      onClick={surTap}
    >
      <TexteColore texte={mot} />
    </button>
  );
}

export function MoteurPhrase(
  proprietes: ProprietesMoteur<ContenuPhrase, EtatPhrase, ActionPhrase>,
): ReactElement {
  const { contenu, habillage, etat, emettre, services, animationsDesactivees } = proprietes;

  // --- le battement ---------------------------------------------------------
  useEffect(() => {
    const identifiant = setInterval(() => {
      emettre({ type: 'battementHorloge' } as ActionPhrase);
    }, PERIODE_BATTEMENT_MS);
    return () => {
      clearInterval(identifiant);
    };
  }, [emettre]);

  // --- le retour sensoriel --------------------------------------------------
  //
  // La série est comptée ICI, pas dans le moteur : c'est une notion de PLAISIR, pas de règle
  // (v2 § 8, D26 — « 2ᵉ bonne réponse = un demi-ton plus haut »). Le moteur reste pur, et le
  // jour où la hauteur montante changera, aucune logique de jeu ne bougera.
  const serie = useRef(0);
  const nbAcquis = Object.keys(etat.acquis).length;
  const precedents = useRef(nbAcquis);
  const marqueRefus = useRef(etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs);
  const origine = useRef<readonly [number, number]>([0, 0]);

  /**
   * LE VOL — l'état, et la cible VISÉE AU MOMENT DU TAP.
   *
   * La destination est mesurée **dans le gestionnaire de clic**, avant d'émettre l'action, et
   * c'est le seul instant où elle est lisible : dès que le mot est accepté, sa case se remplit
   * et disparaît du DOM. La mesurer après coup obligerait à garder un historique des positions
   * de la frappe précédente — deux `ref` et un ordre d'effets à espérer. Ici, la case existe
   * encore, elle est sous les yeux de l'enfant, et c'est exactement celle qu'il vise.
   */
  const refFentes = useRef(new Map<string, HTMLElement | null>());
  const volVise = useRef<Omit<VolDuJeton, 'marque'> | null>(null);
  const [vol, fixerVol] = useState<VolDuJeton | null>(null);
  const marqueVol = useRef(0);

  useEffect(() => {
    if (nbAcquis > precedents.current) {
      serie.current += 1;
      void services.retour.depotCorrect({ origine: origine.current, serie: serie.current });

      // Le geste a été PRIS : le mot part vers sa case. On ne monte rien quand les animations
      // sont calmes — l'état final est le même, donc les captures T4 ne bougent pas.
      const vise = volVise.current;
      if (vise !== null && !animationsDesactivees) {
        marqueVol.current += 1;
        fixerVol({ ...vise, marque: marqueVol.current });
      }
    }
    volVise.current = null;
    precedents.current = nbAcquis;
  }, [nbAcquis, services, animationsDesactivees]);

  // Le vol s'efface de lui-même. Il n'attend rien et ne bloque rien : c'est une copie
  // transitoire, `pointerEvents: none`, que le geste suivant balaie de toute façon.
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

  /** Mémorise le point du geste : c'est l'origine des particules et du balayage. */
  const noter = useCallback((evenement: { clientX: number; clientY: number }) => {
    origine.current = [evenement.clientX, evenement.clientY];
  }, []);

  const jouer = useCallback(
    (action: ActionPhrase, evenement: { clientX: number; clientY: number }) => {
      noter(evenement);
      emettre(action);
    },
    [emettre, noter],
  );

  // --- la mesure du cadre ---------------------------------------------------
  //
  // R39 : le banc mesure en PAYSAGE, l'enfant joue en PORTRAIT. On ne suppose donc aucun format
  // — on mesure celui qu'on reçoit, quel qu'il soit, et la mise en scène s'y adapte.
  // `decor` est la zone que le décor couvre, et le repère des emplacements dérivés ; `racine`
  // (la disposition entière) sert de repère au vol, qui va des mots aux fentes.
  const decor = useRef<HTMLDivElement | null>(null);
  const [cadre, fixerCadre] = useState<Cadre>(CADRE_DE_REPLI);
  const racine = (): HTMLElement | null =>
    decor.current?.closest<HTMLElement>('.disposition-moteur') ?? null;

  useEffect(() => {
    const noeud = decor.current;
    if (noeud === null) return undefined;

    const relever = (): void => {
      const rect = noeud.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fixerCadre({ largeur: rect.width, hauteur: rect.height });
      }
    };

    relever();

    // `ResizeObserver` peut manquer — `happy-dom` ne le fournit pas toujours. Son absence ne
    // doit jamais rendre l'exercice injouable : on garde alors la mesure du premier relevé.
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(relever);
    observateur.observe(noeud);
    return () => {
      observateur.disconnect();
    };
  }, []);

  // --- la typographie des mots ---------------------------------------------
  // Le style des mots vient du CSS (`phrase.css`, variables `--lecture-*` du profil). Les
  // réglages ne servent plus qu'à estimer l'encombrement d'un mot.
  const reglages = useReglagesLecture();

  const etiquetteParId = useMemo(
    () => new Map(contenu.etiquettes.map((e) => [e.id, e] as const)),
    [contenu],
  );

  const mesurer = useCallback(
    (cle: string): Boite => {
      const mot = etiquetteParId.get(cle)?.mot ?? '';
      const corps = reglages.corpsPx;
      const interlettrage = reglages.interlettrageEm * corps;
      return {
        largeur: Math.max(
          CIBLE_MIN,
          mot.length * (corps * LARGEUR_GLYPHE + interlettrage) + 2 * (PADDING_X + BORDURE),
        ),
        hauteur: Math.max(CIBLE_MIN, corps * reglages.interligne + 2 * (PADDING_Y + BORDURE)),
      };
    },
    [etiquetteParId, reglages],
  );

  // --- la dérivation --------------------------------------------------------
  const regions = useMemo(() => regionsColoriables(habillage), [habillage]);

  /**
   * LA ZONE DE JEU : tout le moteur, MOINS la bande de lecture.
   *
   * C'est elle que le décor couvre, et c'est le réglage qui a demandé un aller-retour devant
   * la capture. Premier essai : le décor couvrait la boîte ENTIÈRE. Mesuré sur un cadre
   * 928×1046 et un `viewBox` 960×600, l'échelle de couverture vaut alors
   *
   *     max(928/960, 1046/600) = 1,743   →  1 673 px de large pour 928 disponibles,
   *                                          soit 745 px de décor rognés horizontalement
   *
   * et le dessin cessait d'être une cité : on n'en voyait plus que des aplats. En couvrant la
   * seule zone de jeu, la même scène tient à
   *
   *     max(928/960, 886/600) = 1,477   →  490 px rognés au lieu de 745
   *
   * pour un écran tout aussi plein — la bande de lecture continue le parchemin du décor, donc
   * il n'y a aucune bordure et aucun vide. C'est le compromis que R52 impose de lui-même :
   * « le décor c'est le fond » ne veut pas dire « le décor n'est plus reconnaissable ».
   *
   * Bénéfice de fond : le décor et les mots partagent alors UN SEUL référentiel — c'est très
   * exactement ce que R40 reproche au campement, où le cadre et l'image n'ont pas le même
   * rapport et où les points se posent sur le cadre pendant que le décor flotte au milieu.
   */
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
      // Aucun mot ne passe sous la bande de lecture. C'est le point où « la lisibilité
      // l'emporte sur la mise en scène » se traduit en une soustraction.
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

  const centroideParRegion = useMemo(
    () => new Map(regions.map((r) => [r.id, r.centroide] as const)),
    [regions],
  );

  /**
   * Les régions rallumées : celles dont le mot est ACQUIS. Aucun comptage, aucun pourcentage —
   * un mot rangé, une région qui reprend ses couleurs. « Un acquis n'est jamais repris » (R14)
   * est ici une propriété de la liste : `acquis` ne décroît pas, donc l'allumage non plus.
   */
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

  // La dernière allumée porte le balayage de 900 ms. On la trouve par DIFFÉRENCE avec le
  // rendu précédent : c'est la seule façon de la connaître sans demander au moteur pur de
  // transporter une notion de décor, qui ne le regarde pas.
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

  /**
   * CE QUE L'AIDE DÉSIGNE — R53, et la cause n'est PAS celle qu'on croyait.
   *
   * > « le premier mot clignote en jaune direct, il faudrait attendre que "?gobi" soit cliqué.
   * >   j'ai fait rejouer après une première fois, ça vient peut-être de là. »
   *
   * Le rejeu est hors de cause, et c'est mesuré : `magasin.demarrerNoeud` appelle
   * `moteur.creerEtat` à CHAQUE lancement, donc l'état repart toujours à
   * `nbErreurs: 0 · aide: null · derniereActionMs: maintenant`. Rien ne survit d'une partie à
   * l'autre. Sortie de `bac-a-sable/mesurer-r53-aide-spontanee.mjs`, citée :
   *
   *     SCÉNARIO 1 — aucun geste           → première aide à t = 45 000 ms   (indice → « Le »)
   *     SCÉNARIO 2 — deux taps faux, 0 attente → aide à t =  2 000 ms   (indice → « Le »)
   *     SCÉNARIO 3 — tap sur « ? Gobi »    → aide à t =  1 000 ms, aideDemandee = indice
   *
   * La vraie porte est `erreursAvantIndice: 2` (`commun/delais.ts`) : **deux taps faux et
   * l'aide monte toute seule**, en deux secondes, sans qu'on ait rien demandé. Et
   * `construireAide` désigne `restantes[0]` — c'est-à-dire LA BONNE RÉPONSE. L'écran donnait
   * donc la réponse au deuxième essai.
   *
   * ── ET C'EST MON MÉLANGE QUI A OUVERT CETTE PORTE ─────────────────────────────────────────
   * Avant R44, taper de gauche à droite gagnait 60 consignes sur 60 : zéro erreur, donc jamais
   * de palier automatique, donc le défaut restait invisible. Les mots mélangés, l'enfant qui
   * tape sans lire se trompe — et atteint deux erreurs en quelques secondes. Le défaut était
   * là depuis toujours ; c'est le lot précédent qui l'a rendu ATTEIGNABLE.
   *
   * ── LE REMÈDE EST ICI, ET LE JOURNAL EST DÉJÀ SAIN ────────────────────────────────────────
   * On désigne la cible seulement si l'enfant a RÉCLAMÉ l'aide — `aideDemandee`, le champ que
   * l'état porte déjà et que seule l'action `demanderAide` alimente. C'est littéralement la
   * demande du père : « attendre que ?gobi soit cliqué ».
   *
   * Ce qui reste au palier automatique : la relecture de la consigne par Gobi, qui est gratuite
   * et qu'on garde (R15). Ce qu'il perd : le droit de montrer la réponse.
   *
   * L'étoile, elle, n'était PAS perdue — contrairement à ce que `Docs/retours-de-jeu.md` dit
   * encore de R15. Mesuré :
   *
   *     niveauAide = indice · aideDemandee = aucune · resume.aideUtilisee = aucune
   *
   * `commun/etapes.ts:149` lit bien `aideDemandee`. La moitié « journal » de R15 est donc déjà
   * corrigée ; seule la moitié « affichage » restait, et c'était celle-ci.
   */
  const aideReclamee = etape !== undefined && etape.aideDemandee !== 'aucune';
  const cibleDeLAide = !aideReclamee || etat.aide === null ? null : etat.aide.cible;

  const etiquetteRefusee =
    etat.dernierRefus === null ? null : etat.dernierRefus.etiquette;
  const marqueRefusCourante = etat.dernierRefus === null ? 0 : etat.dernierRefus.instantMs;

  const consigne = contenu.consignes[etat.indexEtape] ?? null;
  const ordre = consigne === null ? [] : consigne.ordre;

  // `phraseEnCours` — la concaténation des mots déjà placés — a été RETIRÉE ici, et il faut
  // dire pourquoi : c'était elle qui rendait le mot « au-dessus des cases » (R59). La phrase
  // qui se construit n'est plus un texte à part, elle EST la ligne de fentes.
  const restants = ordre.filter((id) => etat.acquis[id] === undefined);

  const messageDeRefus =
    etat.dernierRefus === null ? '' : (MESSAGES_DE_REFUS[etat.dernierRefus.motif] ?? '');

  /**
   * Vise la case où ce mot ira, AVANT d'émettre l'action.
   *
   * La case est celle du premier mot restant : c'est la seule que le moteur puisse accepter,
   * puisque `capacites.ordreEtapesImpose` vaut `true`. Si le tap est refusé, la visée est
   * simplement jetée — l'effet ne la consomme que si `acquis` a grandi.
   *
   * Le vol se joue dans le repère de `racine()` (la disposition entière) ; les emplacements
   * dérivés sont dans celui du décor, d'où le décalage mesuré ci-dessous.
   */
  const viser = (emplacement: Emplacement, mot: string): void => {
    volVise.current = null;
    const cible = restants[0];
    if (cible === undefined) return;
    const arrivee = centreDuReceptacle(racine(), refFentes.current.get(cible) ?? null);
    if (arrivee === null) return;
    // Le départ de repli vient de la DÉRIVATION (repère du décor), l'arrivée d'une MESURE (repère
    // de la disposition) : on mesure le décalage au lieu de l'écrire en dur (défaut R40).
    const [decX, decY] = decalageEntre(racine(), decor.current);
    const prise = racine()?.querySelector(`[data-etiquette="${CSS.escape(emplacement.cle)}"]`) ?? null;
    const departReel = centreDuReceptacle(racine(), prise as HTMLElement | null);
    volVise.current = {
      cle: emplacement.cle,
      texte: mot,
      depart: departReel ?? [emplacement.x + decX, emplacement.y + decY],
      arrivee,
    };
  };

  /**
   * LE GLISSER, EN PLUS DU TAP — specs § 5 « remettre les mots dans l'ordre », sans trahir R16.
   *
   * Le dépôt émet EXACTEMENT la même action que le tap : `placer`, avec le même vol vers la
   * case. Deux gestes, une seule règle — sinon le jeu se comporterait autrement selon la façon
   * dont l'enfant touche l'écran.
   *
   * Une seule zone d'accueil, la ligne de la phrase : le moteur n'offre aucun choix de
   * destination — c'est l'ORDRE qui fait la règle — donc plusieurs cibles inventeraient une
   * décision qu'il ne prend pas. C'est `moteurPhrase` qui dira si le mot lâché était le bon.
   */

  const deposerLEtiquette = useCallback(
    (cle: string) => {
      const emplacement = planCourant?.resultat.emplacements.find((e: { cle: string }) => e.cle === cle);
      if (emplacement === undefined) return;
      const mot = etiquetteParId.get(cle)?.mot ?? '';
      fixerVol(null);
      viser(emplacement, mot);
      jouer({ type: 'placer', etiquette: cle }, { clientX: emplacement.x, clientY: emplacement.y });
    },
    // `viser` est une fonction de rendu, pas un `useCallback` : la lister ici la rendrait
    // instable à chaque image. Ce qu'elle lit sont des `ref`, jamais du state.
    [etiquetteParId, planCourant, jouer],
  );

  return (
    <ZoneDeGlisser surDepot={(jeton) => { deposerLEtiquette(jeton); }}>
      <DispositionMoteur
        moteur="phrase"
        disposition="empilee"
        data-habillage={habillage.id}
        data-termine={etat.termineMs === null ? 'non' : 'oui'}
        data-aide={etat.niveauAide}
        data-etape={etape === undefined ? '' : etape.identifiant}
        data-regions-allumees={String(allumees.length)}
        data-mots-affiches={String(ordre.length)}
        scene={
          <>
            <div className="phrase-scene">
              {/* ── R60 — LA PHRASE MODÈLE, AU-DESSUS DU DESSIN ───────────────────────────────
                  Le père : « la phrase doit être au-dessus du dessin. » Le jeton part des mots
                  et descend vers les fentes, jamais à travers elle : « aucune animation dans le
                  champ de lecture » tient par la géométrie. */}
              <div data-plateau="modele" className="modele-phrase-centre phrase-modele">
                {/* T10 — le repère commun, affiché sous la consigne de l'écran. */}
                <RepereEtape
                  moteur="phrase"
                  rang={etat.indexEtape + 1}
                  total={etat.etapes.length}
                  animationsDesactivees={animationsDesactivees}
                />
                {/* T19 : la phrase modèle est ce qu'on DEMANDE de reconstruire. */}
                <ZoneDeLecture
                  question
                  texte={consigne === null ? '' : consigne.phrase}
                  motsCles={consigne === null ? [] : consigne.motsCles}
                  etiquette={
                    consigne === null ? 'La phrase à composer.' : `La phrase à lire : ${consigne.phrase}`
                  }
                />
              </div>

              {/* Le décor est le fond. Il couvre cette zone, et les emplacements dérivés se
                  mesurent dans le même rectangle : un décor et ses prises partagent UN référentiel
                  (la leçon de R40). */}
              <div ref={decor} className="phrase-decor" data-plateau="illustration-phrase">
                <SceneDecor
                  habillage={habillage}
                  allumees={allumees}
                  derniere={derniere}
                  animationsDesactivees={animationsDesactivees}
                  ajustement="contenir"
                />
              </div>
            </div>

            {/* Le mot qui traverse va DANS la fente (R59). Une copie, jamais l'élément réel. */}
            {vol === null ? null : (
              <div key={vol.marque} className="phrase-vol">
                <JetonEnVol vol={vol} dureeMs={DUREE_VOL_MS} />
              </div>
            )}
          </>
        }
        reserve={
          <div className="phrase-reserve" data-plateau="phrase">
            {/* Les mots à prendre. La couche ne prend pas le doigt : seules les pastilles le
                prennent. */}
            <div className="phrase-mots" data-plateau="etiquettes">
              {planCourant === null
                ? null
                : planCourant.resultat.emplacements.map((emplacement) => {
                    const etiquette = etiquetteParId.get(emplacement.cle);
                    if (etiquette === undefined) return null;
                    const placee = etat.acquis[emplacement.cle] !== undefined;

                    // R50 — seuls les mots de la consigne courante. Un mot rangé quitte les mots
                    // pour rejoindre la phrase ; il reste dans le DOM, `hidden` : le réducteur
                    // seul décide qu'un second appui ne coûte rien (`etiquette-deja-placee`).
                    const classes = ['cible'];
                    if (!animationsDesactivees && cibleDeLAide === emplacement.cle) {
                      classes.push('halo-demonstration');
                    }
                    if (!animationsDesactivees && etiquetteRefusee === emplacement.cle) {
                      classes.push('oscillation');
                    }

                    // R54 — DEUX ÉLÉMENTS : un porteur et un bouton. `.oscillation` anime
                    // `transform` ; si le porteur centrait par `transform` lui aussi, l'image-clé
                    // remplacerait le centrage et le mot se décalerait.
                    return (
                      <span
                        key={emplacement.cle}
                        className="phrase-porteur"
                        data-porte-etiquette={emplacement.cle}
                        hidden={placee}
                      >
                        <EtiquetteSaisissable
                          key={
                            emplacement.cle === etiquetteRefusee
                              ? `${emplacement.cle}-${String(marqueRefusCourante)}`
                              : emplacement.cle
                          }
                          cle={emplacement.cle}
                          mot={etiquette.mot}
                          classes={classes}
                          region={emplacement.region ?? ''}
                          placee={placee}
                          surTap={(evenement) => {
                            // Viser AVANT d'émettre : après, la case est remplie et n'existe plus.
                            // Un tap interrompt aussi le vol en cours (v2 § 8).
                            fixerVol(null);
                            viser(emplacement, etiquette.mot);
                            jouer({ type: 'placer', etiquette: emplacement.cle }, evenement);
                          }}
                        />
                      </span>
                    );
                  })}
            </div>

            {/* ── R59 — LA LIGNE DE FENTES *EST* LA PHRASE QU'ON RECONSTRUIT ─────────────────
                Une case vide est une promesse de place : chaque fente garde sa place du début à
                la fin, réserve la boîte de son futur mot, et le porte au même endroit. */}
            <CibleDeDepot id="fentes-de-la-phrase">{(accueilPhrase) => (
            <div
              ref={accueilPhrase.brancher}
              className="phrase-fentes"
              data-survolee={accueilPhrase.survolee ? 'oui' : 'non'}
              data-fentes="phrase"
              data-restantes={String(restants.length)}
            >
              {ordre.map((id) => {
                const placee = etat.acquis[id] !== undefined;
                return (
                  <Fente
                    key={id}
                    cle={id}
                    texte={placee ? (etiquetteParId.get(id)?.mot ?? '') : null}
                    boite={mesurer(id)}
                    prochaine={!placee && restants[0] === id}
                    // C'est ce nœud que `viser` mesure au moment du tap.
                    brancher={(noeud) => {
                      refFentes.current.set(id, noeud);
                    }}
                  />
                );
              })}
            </div>
            )}</CibleDeDepot>
          </div>
        }
        pied={
          <>
            {/* CE QUE LE REFUS DIT : ce qu'on ATTEND, jamais ce qui a raté ni le mot attendu. Il
                s'efface tout seul, le réducteur remet `dernierRefus` à `null` au geste suivant. */}
            <p
              className="phrase-message"
              role="status"
              aria-live="polite"
              data-refus-texte={messageDeRefus === '' ? 'non' : 'oui'}
              data-animations={animationsDesactivees ? 'calmes' : 'vives'}
            >
              <MessageStable messages={Object.values(MESSAGES_DE_REFUS)}>{messageDeRefus === '' ? (etat.aide === null ? '' : (etat.aide.texte ?? '')) : messageDeRefus}</MessageStable>
            </p>

            {/* Ce que le décor ne dit pas aux lecteurs d'écran, le moteur le dit en clair. */}
            <p className="phrase-annonce" role="status" aria-live="polite" data-annonce="coloriage">
              {derniere === null
                ? ''
                : `${
                    regions.find((r) => r.id === derniere.id)?.libelle ?? derniere.id
                  } reprend ses couleurs.`}
            </p>
          </>
        }
      />
    </ZoneDeGlisser>
  );
}
