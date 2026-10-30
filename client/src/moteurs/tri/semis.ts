/**
 * LE SEMIS — éparpiller les mots de `tri` sur le décor, sans les ranger en lignes.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE MODULE EXISTE (retour parent E16 / E25, 12 oct.)
 *
 * « Les mots sont dans l'ordre, alignés et pas mélangés, il faut faire comme dans la clairière. »
 * Mesuré (sonde `parcours-tri-sonde-disposition`, 55 cas nœud × format) : quand les centroïdes
 * du décor sont trop serrés pour les mots, `deriverEmplacements` replie TOUT en lignes centrées
 * (`repli: 'lignes'`) — 5 à 7 mots sur une même ligne, ce que le père voit comme une grille. Et
 * même sans repli, les centroïdes situés SOUS les réceptacles sont ramenés sur le bord de la
 * bande des mots par le clampage : ils s'y alignent (5 sur 10 dans la Forêt).
 *
 * `rangerEnLignes` reste la loi des autres moteurs (`phrase`, `chemin`, `paires`…), et ce module
 * n'y touche pas : il est propre à `tri`, qui n'a besoin d'aucun ordre de lecture entre ses mots.
 *
 * ── LA LOI, SANS CHEVAUCHEMENT PAR CONSTRUCTION ───────────────────────────────────────────────
 *  1. On prend le PLUS GRAND nombre de rangées que la hauteur permet (chaque rangée haute d'au
 *     moins un mot + l'écart), et on y répartit les mots en équilibrant les largeurs (le plus
 *     large d'abord, dans la rangée la moins remplie). Plus de rangées, moins de mots par rangée :
 *     c'est ce qui laisse de l'air à disperser. Si les mots n'entrent pas, on retire une rangée.
 *  2. Dans sa rangée, chaque mot garde l'ordre MÉLANGÉ de l'état ; le vide restant est réparti
 *     de part et d'autre de chaque mot.
 *  3. Chaque mot est ensuite décalé, en x et en y, d'au plus la MOITIÉ du vide qui l'entoure, par
 *     une suite fixe (nombre d'or) — aucun tirage, aucun `Math.random` : à mêmes entrées, même
 *     semis. Les rangées impaires penchent à droite, les paires à gauche : pas de colonnes.
 *
 * Deux mots d'une même rangée restent séparés d'au moins `ECART` (le vide entre eux vaut
 * `ECART + s`, et chacun ne s'en approche que de `s / 2`) ; deux rangées aussi (chaque mot reste
 * dans sa tranche, à `ECART / 2` de ses bords). Le compte de chevauchements est néanmoins
 * RECALCULÉ et rendu : la loi s'affirme, le chiffre se prouve.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

import type { Boite, Bornes } from '../../habillages/emplacements.js';

/**
 * Écart minimal entre deux mots. Un peu plus que `ECART_MIN` (10) de `emplacements.ts`, dont
 * `compterChevauchements` est repris ici à l'identique : à 10 tout juste, l'arrondi flottant
 * pourrait compter un chevauchement à 9,999 px.
 */
const ECART = 12;
/** L'écart que `emplacements.ts` exige entre deux pastilles — la même définition du chevauchement. */
const ECART_CHEVAUCHEMENT = 10;

const NOMBRE_D_OR = 0.6180339887498949;

export interface ResultatSemis {
  /** Centres des mots, dans l'ordre des boîtes reçues. Vide si le semis ne tient pas. */
  readonly points: readonly (readonly [number, number])[];
  /** `false` quand même une seule rangée par mot ne tient pas dans les bornes. */
  readonly tient: boolean;
  readonly rangees: number;
  /** Recalculés, jamais affirmés. **Doivent valoir 0** pour que le semis soit employé. */
  readonly chevauchements: number;
  readonly horsBornes: number;
}

/** Une suite fixe dans [-1, 1], bien répartie : la partie fractionnaire des multiples du nombre d'or. */
function decalage(rang: number, phase: number): number {
  const t = (rang + 1) * NOMBRE_D_OR + phase;
  return 2 * (t - Math.floor(t)) - 1;
}

/**
 * Le plus grand nombre de mots dont les centres verticaux coïncident à `tolerance` près.
 * C'est la mesure de « rangé en lignes » : le moteur et le banc e2e emploient la même.
 */
export function plusGrandAlignement(ordonnees: readonly number[], tolerance = 2): number {
  let plus = 0;
  for (const y of ordonnees) {
    const compte = ordonnees.filter((autre) => Math.abs(autre - y) <= tolerance).length;
    if (compte > plus) plus = compte;
  }
  return plus;
}

/** Au-delà de ce nombre de mots sur une même ligne, la scène se lit comme une grille. */
export function alignementTolere(nombreDeMots: number): number {
  return Math.min(Math.ceil(nombreDeMots / 3), MOTS_PAR_RANGEE_MAX);
}

/**
 * Au plus quatre mots sur une même rangée, quelle que soit la largeur : au-delà, la photo
 * tablette du parent montre un « ruban » (six mots en corps 27 à 800 px). Vaut pour le semis,
 * pour les régions du décor et pour le repli en lignes (`MoteurTri`), comme pour la grille
 * (`tri.css`). Décision du parent du 30 oct. (contrat du socle § 12).
 */
export const MOTS_PAR_RANGEE_MAX = 4;

function repartir(boites: readonly Boite[], rangees: number): number[][] | null {
  const largeurs = new Array<number>(rangees).fill(0);
  const membres: number[][] = Array.from({ length: rangees }, () => []);
  const ordre = boites.map((boite, i) => ({ i, largeur: boite.largeur }));
  ordre.sort((a, b) => b.largeur - a.largeur || a.i - b.i);
  for (const { i, largeur } of ordre) {
    let cible = 0;
    for (let r = 1; r < rangees; r += 1) {
      if ((largeurs[r] as number) < (largeurs[cible] as number)) cible = r;
    }
    largeurs[cible] = (largeurs[cible] as number) + largeur;
    (membres[cible] as number[]).push(i);
  }
  if (membres.some((rangee) => rangee.length === 0)) return null;
  // L'ordre MÉLANGÉ de l'état, rendu à chaque rangée : le tri par largeur ne doit pas se voir.
  for (const rangee of membres) rangee.sort((a, b) => a - b);
  return membres;
}

function largeurDeRangee(boites: readonly Boite[], rangee: readonly number[]): number {
  return rangee.reduce((s, i) => s + (boites[i] as Boite).largeur, 0) + ECART * Math.max(0, rangee.length - 1);
}

export function semerEnQuinconce(boites: readonly Boite[], bornes: Bornes): ResultatSemis {
  const n = boites.length;
  if (n === 0) return { points: [], tient: true, rangees: 0, chevauchements: 0, horsBornes: 0 };

  const largeurDispo = bornes.xMax - bornes.xMin;
  const hauteurDispo = bornes.yMax - bornes.yMin;
  const hauteurMax = Math.max(...boites.map((b) => b.hauteur));
  const rangeesMax = Math.min(n, Math.floor(hauteurDispo / (hauteurMax + ECART)));

  let rangees: number[][] | null = null;
  for (let r = rangeesMax; r >= 1 && rangees === null; r -= 1) {
    const essai = repartir(boites, r);
    if (
      essai !== null &&
      essai.every((rangee) => rangee.length <= MOTS_PAR_RANGEE_MAX && largeurDeRangee(boites, rangee) <= largeurDispo)
    ) {
      rangees = essai;
    }
  }
  if (rangees === null) {
    return { points: [], tient: false, rangees: 0, chevauchements: 0, horsBornes: n };
  }

  const tranche = hauteurDispo / rangees.length;
  const points = new Array<readonly [number, number]>(n);
  rangees.forEach((rangee, r) => {
    const centreRangee = bornes.yMin + tranche * (r + 0.5);
    const vide = largeurDispo - largeurDeRangee(boites, rangee);
    const s = vide / (rangee.length + 1);
    const penchant = r % 2 === 0 ? -0.5 : 0.5;
    let x = bornes.xMin + s;
    for (const i of rangee) {
      const boite = boites[i] as Boite;
      const jeuX = Math.max(-1, Math.min(1, penchant + 0.5 * decalage(i, 0.17)));
      const jeuY = decalage(i, 0.53);
      const margeY = Math.max(0, tranche - boite.hauteur - ECART) / 2;
      points[i] = [x + boite.largeur / 2 + (s / 2) * jeuX, centreRangee + margeY * jeuY];
      x += boite.largeur + ECART + s;
    }
  });

  // Le contrat de sortie, CALCULÉ : même définition que `emplacements.ts`.
  let chevauchements = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const a = boites[i] as Boite;
      const b = boites[j] as Boite;
      const pa = points[i] as readonly [number, number];
      const pb = points[j] as readonly [number, number];
      if (
        Math.abs(pa[0] - pb[0]) < (a.largeur + b.largeur) / 2 + ECART_CHEVAUCHEMENT &&
        Math.abs(pa[1] - pb[1]) < (a.hauteur + b.hauteur) / 2 + ECART_CHEVAUCHEMENT
      ) {
        chevauchements += 1;
      }
    }
  }
  let horsBornes = 0;
  points.forEach(([x, y], i) => {
    const boite = boites[i] as Boite;
    if (
      x - boite.largeur / 2 < bornes.xMin - 0.5 ||
      x + boite.largeur / 2 > bornes.xMax + 0.5 ||
      y - boite.hauteur / 2 < bornes.yMin - 0.5 ||
      y + boite.hauteur / 2 > bornes.yMax + 0.5
    ) {
      horsBornes += 1;
    }
  });

  return { points, tient: true, rangees: rangees.length, chevauchements, horsBornes };
}
