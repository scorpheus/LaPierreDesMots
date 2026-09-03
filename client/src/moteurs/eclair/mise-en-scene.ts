/**
 * PORTER LA MISE EN SCÈNE DE `phrase` (R51/R52) À `eclair`, `histoire`, `attrape`, `chemin`,
 * `grave` — SANS LA RÉPLIQUER CINQ FOIS.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER PORTE, ET CE QU'IL NE PORTE PAS
 *
 * `phrase` (lot L2-E précédent) a établi la règle, opposable et écrite dans
 * `Docs/decision-decor-de-fond-et-mots-poses.md` : le décor COUVRE la zone de jeu, il se
 * RALLUME région par région à mesure que l'enfant réussit, et les éléments posés dessus
 * viennent d'une DÉRIVATION — jamais d'une coordonnée écrite à la main. Les cinq moteurs de ce
 * lot partagent exactement ce mécanisme ; seul CE QUI est posé diffère (des mots pour `phrase`,
 * des options pour `eclair`/`histoire`, des touches de clavier pour `grave`, des cases pour
 * `chemin`). Recopier la mesure du cadre, la cascade de régions et le calcul de « dernière
 * allumée » cinq fois aurait fait diverger les cinq copies à la première correction — c'est très
 * exactement le défaut qu'a produit R8 (deux listes de polices) et que ce fichier évite.
 *
 * Ce module ne connaît AUCUN moteur en particulier : ni étiquette, ni option, ni case, ni
 * clavier. Il ne prend que des `cle: string` et un `mesurer(cle): Boite`.
 *
 * ── PAS DE JSX ICI, ET C'EST DÉLIBÉRÉ ─────────────────────────────────────────────────────────
 * `PorteurPose` (le SEUL bout de JSX de la mise en scène partagée) vit à part, dans
 * `porteur-pose.tsx` : ce fichier-ci ne connaît que des fonctions et des types purs, ce qui lui
 * permet d'être importé tel quel par un script de mesure Node (`--experimental-strip-types` ne
 * décape pas le JSX d'un `.tsx`) — exactement ce que `bac-a-sable/mesurer-mise-en-scene-cinq-
 * moteurs.mjs` fait pour prouver, sur du VRAI contenu, que `chevauchements` et `horsBornes`
 * valent 0.
 *
 * ── SON VRAI DOMICILE, ET POURQUOI IL N'Y EST PAS ─────────────────────────────────────────────
 * Il devrait vivre dans `client/src/moteurs/commun/`, comme `phrase/receptacles.tsx` le
 * documente déjà. Il n'y est pas pour la MÊME raison : `tests/unitaires/decor-de-fond.test.ts`
 * énumère tous les sous-dossiers de `client/src/moteurs/` et exige de chacun un composant
 * `Moteur*.tsx` — créer `commun/` ferait échouer ce garde, et `tests/` n'appartient pas à ce
 * lot. Il est donc posé dans `eclair/`, le premier des cinq dossiers que je possède, et importé
 * par les quatre autres. Aucune limite de propriété n'est franchie : les cinq dossiers sont à
 * moi pour ce lot.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject } from 'react';

import type { Habillage } from '@pierre/partage';
import type { ReglagesLecture } from '@pierre/partage/lecture';

import type { RegionAllumee } from '../../habillages/SceneDecor.js';
import { deriverEmplacements, regionsColoriables } from '../../habillages/emplacements.js';
import type {
  Boite,
  Bornes,
  Cadre,
  RegionDHabillage,
  ResultatDerivation,
  TransformeDecor,
  ViewBox,
} from '../../habillages/emplacements.js';
import { lireViewBox, transformeMeet, transformeSlice, versPixels } from '../../habillages/emplacements.js';

export type { Boite, Bornes, Cadre, RegionDHabillage, ResultatDerivation, TransformeDecor, ViewBox };
export { lireViewBox, regionsColoriables, transformeMeet, transformeSlice, versPixels };

/** Cadre servi tant que rien n'est mesuré — voir `MoteurPhrase.CADRE_DE_REPLI`, même raison. */
export const CADRE_DE_REPLI: Cadre = { largeur: 900, hauteur: 1000 };
export const HAUTEUR_BANDE_DE_REPLI = 120;

/** Respiration entre une pastille et le bord du cadre, en pixels. */
export const MARGE = 14;

/** Sous cette distance d'un bord, une région n'est presque pas dessinée : on ne l'utilise pas. */
export const MARGE_VISIBILITE = 28;

/** R16 : toute cible fait au moins 64 px. */
export const CIBLE_MIN = 64;

// ------------------------------------------------------------------ la mesure du cadre

export interface MesureCadre {
  readonly racine: MutableRefObject<HTMLDivElement | null>;
  readonly bande: MutableRefObject<HTMLDivElement | null>;
  readonly cadre: Cadre;
  readonly hauteurBande: number;
}

/**
 * Mesure le cadre du moteur et la hauteur de sa bande statique (refus/aide, et ce que chaque
 * moteur y ajoute). Reprend `MoteurPhrase`, en plus simple : ces cinq moteurs n'ont pas de
 * bande de phrase-modèle au-dessus du décor, donc un seul rectangle à mesurer suffit.
 *
 * R39 : le banc mesure en PAYSAGE, l'enfant joue en portrait. On ne suppose donc aucun format —
 * on mesure celui qu'on reçoit.
 */
export function useMesureCadre(hauteurBandeRepli = HAUTEUR_BANDE_DE_REPLI): MesureCadre {
  const racine = useRef<HTMLDivElement | null>(null);
  const bande = useRef<HTMLDivElement | null>(null);
  const [cadre, fixerCadre] = useState<Cadre>(CADRE_DE_REPLI);
  const [hauteurBande, fixerHauteurBande] = useState(hauteurBandeRepli);

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

    // `ResizeObserver` peut manquer sous `happy-dom` : son absence ne doit jamais rendre
    // l'exercice injouable, on garde alors la mesure du premier relevé.
    if (typeof ResizeObserver !== 'function') return undefined;
    const observateur = new ResizeObserver(relever);
    observateur.observe(noeud);
    if (bande.current !== null) observateur.observe(bande.current);
    return () => {
      observateur.disconnect();
    };
  }, []);

  return { racine, bande, cadre, hauteurBande };
}

/** Le rectangle que le décor couvre : tout le moteur, moins la bande statique du bas. */
export function styleZoneDeJeu(hauteurBande: number): CSSProperties {
  return {
    position: 'absolute',
    insetInlineStart: 0,
    insetInlineEnd: 0,
    insetBlockStart: 0,
    insetBlockEnd: `${String(hauteurBande)}px`,
  };
}

export function cadreJeuEtBornes(cadre: Cadre, hauteurBande: number): { cadreJeu: Cadre; bornes: Bornes } {
  const cadreJeu: Cadre = {
    largeur: cadre.largeur,
    hauteur: Math.max(cadre.hauteur - hauteurBande, CIBLE_MIN + 2 * MARGE),
  };
  const bornes: Bornes = {
    xMin: MARGE,
    yMin: MARGE,
    xMax: Math.max(cadreJeu.largeur - MARGE, MARGE + CIBLE_MIN),
    yMax: Math.max(cadreJeu.hauteur - MARGE, MARGE + CIBLE_MIN),
  };
  return { cadreJeu, bornes };
}

// ------------------------------------------------------------------ la cascade de régions

export interface PlanEtape {
  readonly resultat: ResultatDerivation;
}

/**
 * La MÊME cascade que `MoteurPhrase.planifier`, généralisée à N'IMPORTE QUELLE population de
 * clés : chaque étape prend les régions encore éteintes en premier, jamais celles qu'une étape
 * antérieure a déjà consommées. Pour un moteur à plateau STABLE (`chemin`, `grave` — la même
 * population du début à la fin), on appelle cette fonction avec une seule « étape » portant
 * toutes les clés : c'est alors un simple appel à `deriverEmplacements`.
 */
export function planifierCascade(parametres: {
  readonly habillage: Habillage;
  readonly listesParEtape: readonly (readonly string[])[];
  readonly regions: readonly RegionDHabillage[];
  readonly cadre: Cadre;
  readonly bornes: Bornes;
  mesurer(cle: string): Boite;
}): readonly PlanEtape[] {
  const plans: PlanEtape[] = [];
  const allumees = new Set<string>();

  for (const cles of parametres.listesParEtape) {
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
    plans.push({ resultat });
    for (const emplacement of resultat.emplacements) {
      if (emplacement.region !== null) allumees.add(emplacement.region);
    }
  }

  return plans;
}

/**
 * Les régions rallumées : celles dont la clé est ACQUISE. Un acquis n'est jamais repris (R14),
 * donc cette liste ne décroît jamais tant que `acquis` ne décroît pas — ce qui n'arrive jamais.
 */
export function regionsAllumeesDepuisAcquis(
  plans: readonly PlanEtape[],
  acquis: Readonly<Record<string, string>>,
  centroideParRegion: ReadonlyMap<string, readonly [number, number]>,
): readonly RegionAllumee[] {
  const liste: RegionAllumee[] = [];
  const vues = new Set<string>();
  for (const plan of plans) {
    for (const emplacement of plan.resultat.emplacements) {
      if (emplacement.region === null) continue;
      if (acquis[emplacement.cle] === undefined) continue;
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
}

/**
 * La dernière région allumée, trouvée par DIFFÉRENCE avec le rendu précédent — c'est elle qui
 * porte le balayage de `SceneDecor` (v2 ligne 79 : « depuis le point touché »).
 */
export function useDerniereAllumee(allumees: readonly RegionAllumee[]): RegionAllumee | null {
  const [derniere, fixerDerniere] = useState<RegionAllumee | null>(null);
  const empreinte = allumees.map((a) => a.id).join('|');
  const precedente = useRef<string | null>(null);

  useEffect(() => {
    const avant =
      precedente.current === null
        ? null
        : new Set(precedente.current === '' ? [] : precedente.current.split('|'));
    precedente.current = empreinte;
    if (avant === null) return;
    const nouvelle = allumees.find((region) => !avant.has(region.id));
    if (nouvelle !== undefined) fixerDerniere(nouvelle);
    // Dépendance volontairement limitée à `empreinte` : `allumees` change de référence à
    // chaque rendu (nouveau tableau dérivé), et le suivre ferait rejouer cet effet même quand
    // le CONTENU n'a pas bougé. `empreinte` est la forme stable de cette même liste.
  }, [empreinte, allumees]);

  return derniere;
}

// ------------------------------------------------------------------ l'encombrement d'un texte

/** `.cible` — `padding: 0.75rem 1.25rem`, `border: 4px`. Sert à estimer l'encombrement. */
const PADDING_X = 20;
const PADDING_Y = 12;
const BORDURE = 4;

/**
 * Largeur moyenne d'un glyphe d'Andika, en fraction du corps — même constante et même parti
 * pris que `MoteurPhrase.LARGEUR_GLYPHE` : une estimation trop LARGE écarte les pastilles plus
 * que nécessaire (le défaut est de l'espace perdu) ; trop étroite, elles se chevauchent (le
 * défaut est de l'illisible). On se trompe du côté qui ne coûte rien.
 */
const LARGEUR_GLYPHE = 0.66;

/**
 * L'encombrement d'un texte posé sur le décor, dans la typographie de lecture du profil —
 * même fonction que `MoteurPhrase.mesurer`, généralisée : ce que l'enfant doit lire dans une
 * pastille suit les mêmes réglages que ce qu'il lit dans la bande de lecture (R35).
 */
export function mesurerTexte(texte: string, reglages: ReglagesLecture): Boite {
  const corps = reglages.corpsPx;
  const interlettrage = reglages.interlettrageEm * corps;
  return {
    largeur: Math.max(
      CIBLE_MIN,
      texte.length * (corps * LARGEUR_GLYPHE + interlettrage) + 2 * (PADDING_X + BORDURE),
    ),
    hauteur: Math.max(CIBLE_MIN, corps * reglages.interligne + 2 * (PADDING_Y + BORDURE)),
  };
}
