/**
 * Le contrat de validation du moteur `trace` — lot L2-C. Clôt le point ouvert O11.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.3.
 *
 * Tout ce fichier est PUR : aucune horloge, aucun aléa, aucun DOM, aucun `Math.random`.
 *
 * CE QUE CE FICHIER DOIT PROUVER, et que rien d'autre dans le dépôt ne prouve : **l'axe de
 * la confusion**. D23, conséquence 1 : « ne jamais traiter b/d/p/q en bloc — ce sont deux
 * mécanismes différents, et un enfant peut être gêné par un axe et pas par l'autre ». Un
 * moteur qui rend toujours `axe: null` est un moteur creux, et c'est le contrat de sortie du
 * lot (§ 10.4).
 *
 * COMMENT L'AXE EST OBTENU — par la GÉOMÉTRIE, jamais par déclaration.
 * `modele.axeRisque` ne fait que **nommer le candidat** ; il ne décide de rien. La décision
 * est prise en comparant deux couvertures : celle du modèle attendu, et celle du même modèle
 * RÉFLÉCHI sur l'axe candidat. L'axe n'est rendu que si le reflet est mieux couvert que
 * l'original *et* franchit le seuil. Sans cette double condition, tout gribouillis sur un
 * `b` serait annoncé « confusion gauche-droite » et l'indicateur de D23 serait du bruit.
 */

import type { AxeMiroir, PaireMiroir } from '../../pedagogie/types.js';
import { distance } from '../commun/geometrie.js';
import type { Point } from '../commun/geometrie.js';
import type { EchantillonGeste, ModeleLettre, TraitLettre } from './types.js';

/**
 * R16, sans exception : 24 px de tolérance. Le couloir de guidage est LARGE, et c'est voulu —
 * l'exercice porte sur l'orientation et le sens, jamais sur la propreté du geste. Un enfant
 * qui trace un `b` tremblant mais bien orienté a réussi.
 *
 * UNITÉ — **des pixels CSS**, et c'est le seul endroit du fichier qui en manipule. Les
 * fonctions de mesure ne connaissent, elles, que des unités `viewBox` : la conversion se
 * fait en un point unique, `toleranceViewBox`, juste en dessous. Confondre les deux rend le
 * moteur aveugle — le commentaire de cette fonction le mesure.
 */
export const TOLERANCE_TRACE_PX = 24;

/** Fraction des points du modèle à franchir pour valider un trait. PLACEHOLDER — à valider. */
export const COUVERTURE_MINIMALE = 0.8;

/**
 * Largeur de rendu de la zone de tracé, en pixels CSS. Miroir exact du `min(100%, 420px)`
 * de `MoteurTrace.tsx`. PLACEHOLDER — à valider sur la Galaxy Tab S10 FE.
 */
export const LARGEUR_RENDU_PX = 420;

/**
 * La tolérance R16, convertie dans les unités du `viewBox` du modèle.
 *
 * SANS CETTE CONVERSION, LE MOTEUR EST AVEUGLE, et ce n'est pas une figure de style : mesuré
 * sur `minuscules.json`, le rond du `d` couvre celui du `b` à **0,89** quand on applique les
 * 24 bruts à un `viewBox` large de 100 unités — au-dessus de `COUVERTURE_MINIMALE`. Un
 * enfant qui trace exactement la mauvaise lettre serait alors accepté, et seule la
 * vérification du point de départ le rattraperait. Les 24 px valent 24 px à l'écran, pas 24
 * unités de dessin ; à 420 px pour 100 unités, ils valent **5,7 unités**.
 *
 * Repli sur `TOLERANCE_TRACE_PX` si le `viewBox` est illisible — un modèle mal formé ne doit
 * pas lever au milieu d'un geste.
 */
export function toleranceViewBox(viewBox: string, largeurRenduPx = LARGEUR_RENDU_PX): number {
  const bornes = bornesViewBox(viewBox);
  if (bornes === null || largeurRenduPx <= 0) return TOLERANCE_TRACE_PX;
  return (TOLERANCE_TRACE_PX * bornes[2]) / largeurRenduPx;
}

export type MotifRefusTrace =
  | 'depart-eloigne'    // le geste ne commence pas près du point de départ
  | 'sens-inverse'      // le geste suit le modèle à l'envers — LE cas qui nous intéresse
  | 'trace-incomplet'   // couverture sous le seuil
  | 'trait-hors-ordre'; // l'enfant a commencé le trait 2 avant le trait 1

/**
 * Aucun de ces motifs n'affiche du rouge. Le trait s'estompe et se redemande (D16, R14).
 *
 * Deux motifs sur quatre comptent comme erreur, exactement dans le même esprit qu'en
 * `colorie` (v1 § 5.5) et en `place` : `sens-inverse` et `trait-hors-ordre` portent sur la
 * STRUCTURE de la lettre — l'enfant a compris autre chose. `depart-eloigne` et
 * `trace-incomplet` sont des gestes ratés, pas des contresens : un doigt qui dérape ne coûte
 * rien.
 */
export const REFUS_TRACE_COMPTE_ERREUR: Readonly<Record<MotifRefusTrace, boolean>> = {
  'depart-eloigne': false,
  'sens-inverse': true,
  'trace-incomplet': false,
  'trait-hors-ordre': true,
};

export interface DecisionTrait {
  readonly acceptee: boolean;
  readonly motif: MotifRefusTrace | null;
  readonly compteErreur: boolean;
  readonly couverture: number;
  /**
   * L'axe de la confusion **quand elle est identifiable**, `null` sinon.
   *
   * C'est le champ qui fait tout l'intérêt pédagogique du moteur : il alimente
   * `ConfusionObservee`, donc le top 10 du dashboard, donc la seule donnée réelle qu'un
   * orthophoniste pourrait un jour lire (D23, conséquence 3).
   */
  readonly axe: AxeMiroir | null;
}

// ------------------------------------------------------------------- outils de mesure

/** Les points d'un geste, dans l'ordre où le doigt les a produits. */
function pointsDuGeste(geste: readonly EchantillonGeste[]): readonly Point[] {
  return geste.map((e) => e.point);
}

/**
 * Couverture ORIENTÉE du modèle par le geste : fraction des points du modèle atteints, dans
 * l'ordre du modèle, par un curseur qui n'avance jamais dans le geste.
 *
 * C'est la monotonie du curseur (`j` ne recule jamais) qui rend la mesure sensible au SENS.
 * Une couverture non orientée — « chaque point du modèle a-t-il un voisin dans le geste » —
 * rendrait `1` pour un `b` tracé à l'envers, et le moteur serait aveugle à exactement ce
 * qu'il doit voir.
 *
 * ADDITION DE LOT — cette fonction n'est pas au § 4.3.3. Elle est exportée parce que la
 * propriété « couverture(modèle, modèle) === 1 » est ce qui garantit que le reste du fichier
 * mesure quelque chose ; un test qui ne pourrait pas l'appeler ne prouverait rien.
 */
export function couvertureOrientee(
  modele: readonly Point[],
  geste: readonly Point[],
  tolerance: number,
): number {
  if (modele.length === 0) return 1;
  if (geste.length === 0) return 0;

  let curseur = 0;
  let atteints = 0;

  for (const attendu of modele) {
    let k = curseur;
    while (k < geste.length) {
      const point = geste[k];
      if (point !== undefined && distance(attendu, point) <= tolerance) break;
      k += 1;
    }
    if (k < geste.length) {
      atteints += 1;
      curseur = k;
    }
  }

  return atteints / modele.length;
}

/** Bornes du `viewBox` d'un modèle : `[minX, minY, largeur, hauteur]`. */
function bornesViewBox(viewBox: string): readonly [number, number, number, number] | null {
  const nombres = viewBox.trim().split(/\s+/).map(Number);
  if (nombres.length !== 4 || nombres.some((n) => !Number.isFinite(n))) return null;
  const [minX, minY, largeur, hauteur] = nombres as [number, number, number, number];
  if (largeur <= 0 || hauteur <= 0) return null;
  return [minX, minY, largeur, hauteur];
}

/**
 * Réflexion des points sur l'axe demandé, autour du CENTRE du `viewBox` du modèle.
 *
 * `gauche-droite` → miroir sur l'axe vertical (`x' = 2·cx − x`) : c'est la confusion `b`/`d`
 * et `p`/`q`.
 * `haut-bas` → miroir sur l'axe horizontal (`y' = 2·cy − y`) : c'est `b`/`p` et `d`/`q`.
 *
 * POURQUOI LE CENTRE DU `viewBox` ET PAS CELUI DE LA LETTRE — parce que les quatre lettres
 * de `contenu/modeles-lettres/minuscules.json` sont dessinées dans le MÊME `viewBox`
 * `0 0 100 160` et y sont **exactement** images l'une de l'autre par ces deux réflexions.
 * Le centre de la boîte englobante de chaque lettre, lui, dépend de la lettre : réfléchir
 * `b` autour du sien ne donnerait pas `p`. La convention est donc portée par les modèles,
 * et `tests/unitaires/trace-validation.test.ts` la vérifie sur les fichiers réels.
 *
 * ADDITION DE LOT — exportée pour que ce test puisse justement le vérifier.
 */
export function refleterPoints(
  points: readonly Point[],
  axe: AxeMiroir,
  viewBox: string,
): readonly Point[] {
  const bornes = bornesViewBox(viewBox);
  if (bornes === null) return points;
  const [minX, minY, largeur, hauteur] = bornes;
  const cx = minX + largeur / 2;
  const cy = minY + hauteur / 2;
  return points.map(([x, y]): Point =>
    axe === 'gauche-droite' ? [2 * cx - x, y] : [x, 2 * cy - y],
  );
}

/**
 * Meilleure couverture du modèle par le geste, quel que soit le sens de parcours.
 * Sert à juger une RESSEMBLANCE de forme, indépendamment du sens — c'est ce qu'il faut
 * pour identifier un miroir, où seule la forme est en cause.
 */
function ressemblance(
  modele: readonly Point[],
  geste: readonly Point[],
  tolerance: number,
): number {
  const inverse = [...geste].reverse();
  return Math.max(
    couvertureOrientee(modele, geste, tolerance),
    couvertureOrientee(modele, inverse, tolerance),
  );
}

// ----------------------------------------------------------------------- décisions

/**
 * Vrai si le geste parcourt le modèle dans le bon sens. Indépendant de la vitesse.
 *
 * L'indépendance à la vitesse ne vient pas d'un traitement du temps : elle vient du fait que
 * la mesure ne regarde QUE l'ordre des points, jamais leurs instants. Un doigt lent qui
 * produit deux cents échantillons et un doigt rapide qui en produit douze donnent la même
 * réponse — c'est aussi la raison d'être de `echantillonnage.ts` côté client.
 *
 * Départage en cas d'égalité : le sens direct gagne. Un geste ambigu n'est pas une erreur.
 *
 * `tolerance` est ici en unités `viewBox`, et le repli sur `TOLERANCE_TRACE_PX` est LARGE :
 * la signature gelée du § 4.3.3 ne passe que le `TraitLettre`, jamais le `ModeleLettre`, donc
 * aucun `viewBox` n'est atteignable pour convertir. Les appelants de ce lot passent la
 * tolérance convertie ; `evaluerTrait`, lui, la calcule depuis `modele.viewBox`.
 */
export function sensRespecte(
  trait: TraitLettre,
  geste: readonly EchantillonGeste[],
  tolerance?: number,
): boolean {
  const marge = tolerance ?? TOLERANCE_TRACE_PX;
  const points = pointsDuGeste(geste);
  const avant = couvertureOrientee(trait.points, points, marge);
  const arriere = couvertureOrientee(trait.points, [...points].reverse(), marge);
  return avant >= arriere;
}

/**
 * L'axe confondu pour UN trait, par comparaison au reflet du trait attendu.
 *
 * Deux conditions, et il faut les deux : le reflet doit être **mieux** couvert que
 * l'original, et il doit franchir `COUVERTURE_MINIMALE`. La première écarte les gestes qui
 * ressemblent surtout à la bonne lettre ; la seconde écarte les gribouillis, qui ne
 * ressemblent à rien et dont l'axe n'existe pas.
 */
function axeDuTrait(
  modele: ModeleLettre,
  trait: TraitLettre,
  geste: readonly EchantillonGeste[],
  tolerance: number,
  axeCandidat: AxeMiroir | null,
): AxeMiroir | null {
  if (axeCandidat === null) return null;
  const points = pointsDuGeste(geste);
  const direct = ressemblance(trait.points, points, tolerance);
  const reflet = refleterPoints(trait.points, axeCandidat, modele.viewBox);
  const miroir = ressemblance(reflet, points, tolerance);
  if (miroir > direct && miroir >= COUVERTURE_MINIMALE) return axeCandidat;
  return null;
}

/**
 * La SECONDE voie vers l'axe : le trait a été parcouru à l'envers.
 *
 * Elle existe parce que la première ne peut pas tout voir, et la limite est géométrique, pas
 * algorithmique. Mesuré sur `contenu/modeles-lettres/minuscules.json` : le rond du `p` est,
 * point pour point, **le rond du `b` parcouru à l'envers** — la réflexion haut-bas d'un arc
 * symétrique et son inversion de sens produisent le même ensemble de points. Sur ce trait-là,
 * `axeDuTrait` trouve `miroir === direct` et rend `null` à juste titre : la forme seule ne
 * tranche pas.
 *
 * Ce qui tranche, c'est le SENS — et c'est exactement ce que dit le contrat gelé § 4.3.3 :
 * « `sens-inverse` — le geste suit le modèle à l'envers — LE cas qui nous intéresse », sous
 * un titre qui annonce « **le sens distingue `b` de `d`** ».
 *
 * La règle n'est pas une tautologie, parce qu'elle est conditionnée à DEUX faits mesurés et
 * non déclarés : le geste couvre réellement le modèle inversé à `COUVERTURE_MINIMALE`
 * (`sens-inverse` n'est pas prononcé autrement), et la lettre est déclarée à risque sur cet
 * axe par l'exercice. Un gribouillis ne franchit pas le premier ; une lettre sans axe de
 * risque ne franchit pas le second.
 */
function axeParInversionDeSens(modele: ModeleLettre, motif: MotifRefusTrace | null): AxeMiroir | null {
  if (motif !== 'sens-inverse') return null;
  return modele.axeRisque;
}

/**
 * Juge un geste contre le trait attendu.
 *
 * ORDRE DES TESTS, normatif :
 *   1. geste trop court → `trace-incomplet` (aucun coût).
 *   2. sens inverse avéré → `sens-inverse`. Testé AVANT `depart-eloigne`, parce qu'un geste
 *      à l'envers commence forcément loin du départ : le diagnostiquer « départ éloigné »
 *      perdrait précisément l'information qui nous intéresse.
 *   3. départ éloigné → `depart-eloigne` (aucun coût).
 *   4. couverture sous le seuil → `trace-incomplet` (aucun coût).
 *   5. sinon accepté.
 *
 * `axe` est calculé dans TOUS les cas, y compris sur une acceptation : c'est une mesure, pas
 * une conséquence du refus. Sur un tracé juste, le reflet est moins bien couvert que
 * l'original et l'axe est `null` — sans qu'aucune ligne n'ait à le forcer.
 */
export function evaluerTrait(
  modele: ModeleLettre,
  trait: TraitLettre,
  geste: readonly EchantillonGeste[],
  tolerance?: number,
): DecisionTrait {
  // La tolérance par défaut est CONVERTIE dans les unités du modèle, jamais appliquée brute.
  const marge = tolerance ?? toleranceViewBox(modele.viewBox);
  const points = pointsDuGeste(geste);
  const axeGeometrique = axeDuTrait(modele, trait, geste, marge, modele.axeRisque);

  const decision = (
    acceptee: boolean,
    motif: MotifRefusTrace | null,
    couverture: number,
  ): DecisionTrait => ({
    acceptee,
    motif,
    compteErreur: motif === null ? false : REFUS_TRACE_COMPTE_ERREUR[motif],
    couverture,
    // La forme d'abord, le sens en second recours. Les deux voies nomment le même axe
    // candidat ; aucune ne l'invente.
    axe: axeGeometrique ?? axeParInversionDeSens(modele, motif),
  });

  if (points.length < 2) return decision(false, 'trace-incomplet', 0);

  const avant = couvertureOrientee(trait.points, points, marge);
  const arriere = couvertureOrientee(trait.points, [...points].reverse(), marge);

  if (arriere > avant && arriere >= COUVERTURE_MINIMALE) {
    return decision(false, 'sens-inverse', avant);
  }

  const premier = points[0];
  if (premier === undefined || distance(premier, trait.depart) > marge) {
    return decision(false, 'depart-eloigne', avant);
  }

  if (avant < COUVERTURE_MINIMALE) return decision(false, 'trace-incomplet', avant);

  return decision(true, null, avant);
}

/**
 * L'axe confondu, en comparant le tracé rendu au modèle attendu et à son jumeau de paire.
 *
 * Rend `null` quand le tracé ne ressemble ni à l'un ni à l'autre : dans ce cas ce n'est pas
 * une confusion miroir, et l'annoncer comme telle fausserait l'indicateur.
 *
 * La paire ne sert pas seulement à nommer l'axe : elle **restreint** le diagnostic à l'axe
 * que l'exercice travaille. Un exercice `b`/`p` ne rendra jamais `gauche-droite`, même si le
 * geste y ressemblait — c'est D23 appliqué à la lettre, et c'est ce qui rend les deux
 * exercices `miroir-bd-01` et `miroir-bp-01` séparément interprétables.
 */
export function axeConfondu(
  modele: ModeleLettre,
  paire: PaireMiroir | null,
  geste: readonly EchantillonGeste[],
): AxeMiroir | null {
  if (paire === null) return null;
  const points = pointsDuGeste(geste);
  if (points.length < 2) return null;

  const marge = toleranceViewBox(modele.viewBox);
  let meilleurDirect = 0;
  let meilleurMiroir = 0;

  for (const trait of modele.traits) {
    meilleurDirect = Math.max(meilleurDirect, ressemblance(trait.points, points, marge));
    const reflet = refleterPoints(trait.points, paire.axe, modele.viewBox);
    meilleurMiroir = Math.max(meilleurMiroir, ressemblance(reflet, points, marge));
  }

  if (meilleurMiroir > meilleurDirect && meilleurMiroir >= COUVERTURE_MINIMALE) return paire.axe;
  return null;
}
