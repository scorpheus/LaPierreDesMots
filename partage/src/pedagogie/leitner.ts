/**
 * Leitner à 5 boîtes sur les items atomiques — graphèmes, mots outils, mots du mur. Lot L2-D.
 *
 * v2 § 12.2 : J+1, J+3, J+7, J+16, J+35. Les délais eux-mêmes ne sont PAS ici, ils sont en
 * données (C2) : ce module ne connaît que la structure — cinq boîtes, une promotion d'un cran,
 * un repli sur échec.
 *
 * Toutes les fonctions sont pures et prennent `maintenant` en argument. Aucune ne lit l'heure :
 * c'est ce qui permet de vérifier le retour à J+35 sans attendre cinq semaines (annexe T § 2.2).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * ARITHMÉTIQUE DES DATES — pourquoi elle est écrite à la main.
 *
 * `new Date(...)` est interdit hors de `horloge.ts` (règle ESLint maison), et pour une bonne
 * raison : un seul appel enfoui rendrait le rejeu des journaux ininterprétable. `Date.parse`
 * reste autorisé et sert aux COMPARAISONS ; pour l'ADDITION de jours on convertit la date
 * civile en nombre de jours et retour, par l'algorithme de Howard Hinnant, en n'opérant que sur
 * la partie `YYYY-MM-DD` de l'horodatage. L'heure est reconduite telle quelle : un item revu à
 * 9 h revient à 9 h, et la forme de l'horodatage d'entrée est préservée au caractère près.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */

import { ErreurPierre } from '../erreurs.js';
import type { Horodatage } from '../identifiants.js';
import type { ItemLeitner, NumeroBoite, ParametresLeitner } from './types.js';

/** Cinq boîtes (v2 § 12.2). Contrainte de structure, pas valeur calibrée : elle reste ici. */
const NB_BOITES = 5;

const MOTIF_ISO = /^(\d{4})-(\d{2})-(\d{2})(T.*)$/;

/** Jours écoulés depuis 1970-01-01 pour une date civile. Algorithme `days_from_civil`. */
function joursDepuisEpoque(annee: number, mois: number, jour: number): number {
  const a = annee - (mois <= 2 ? 1 : 0);
  const ere = Math.floor(a / 400);
  const anneeDansEre = a - ere * 400;
  const jourDansAnnee = Math.floor((153 * (mois + (mois > 2 ? -3 : 9)) + 2) / 5) + jour - 1;
  const jourDansEre =
    anneeDansEre * 365 +
    Math.floor(anneeDansEre / 4) -
    Math.floor(anneeDansEre / 100) +
    jourDansAnnee;
  return ere * 146097 + jourDansEre - 719468;
}

/** Réciproque exacte de `joursDepuisEpoque`. Algorithme `civil_from_days`. */
function dateCivile(joursEpoque: number): { annee: number; mois: number; jour: number } {
  const z = joursEpoque + 719468;
  const ere = Math.floor(z / 146097);
  const jourDansEre = z - ere * 146097;
  const anneeDansEre = Math.floor(
    (jourDansEre -
      Math.floor(jourDansEre / 1460) +
      Math.floor(jourDansEre / 36524) -
      Math.floor(jourDansEre / 146096)) /
      365
  );
  const annee = anneeDansEre + ere * 400;
  const jourDansAnnee =
    jourDansEre -
    (365 * anneeDansEre + Math.floor(anneeDansEre / 4) - Math.floor(anneeDansEre / 100));
  const moisDecale = Math.floor((5 * jourDansAnnee + 2) / 153);
  const jour = jourDansAnnee - Math.floor((153 * moisDecale + 2) / 5) + 1;
  const mois = moisDecale + (moisDecale < 10 ? 3 : -9);
  return { annee: annee + (mois <= 2 ? 1 : 0), mois, jour };
}

function deuxChiffres(valeur: number): string {
  return String(valeur).padStart(2, '0');
}

/**
 * Ajoute `jours` à un horodatage ISO en UTC, heure comprise inchangée.
 *
 * Refuse une entrée qui n'est pas un horodatage ISO : une échéance calculée à partir d'une date
 * illisible serait fausse sans que rien ne le dise.
 */
function ajouterJours(instant: Horodatage, jours: number): Horodatage {
  const trouve = MOTIF_ISO.exec(instant);
  if (trouve === null) {
    throw new ErreurPierre(
      'argument-invalide',
      `Horodatage ISO 8601 UTC attendu, reçu « ${instant} ».`,
      { instant }
    );
  }
  const annee = Number(trouve[1]);
  const mois = Number(trouve[2]);
  const jour = Number(trouve[3]);
  const heure = String(trouve[4]);

  const civil = dateCivile(joursDepuisEpoque(annee, mois, jour) + Math.trunc(jours));
  return `${String(civil.annee).padStart(4, '0')}-${deuxChiffres(civil.mois)}-${deuxChiffres(civil.jour)}${heure}`;
}

function bornerBoite(boite: number): NumeroBoite {
  return Math.min(NB_BOITES, Math.max(1, Math.trunc(boite))) as NumeroBoite;
}

/**
 * Un item qu'on vient de rencontrer : boîte 1, jamais revu, **dû immédiatement**.
 *
 * L'échéance vaut `maintenant` et non `maintenant + délai` — la signature du contrat ne reçoit
 * d'ailleurs aucun paramètre, donc aucun délai n'est disponible ici. C'est aussi le bon
 * comportement : différer la première révision d'un item qu'on vient de voir perdrait la seule
 * occasion où il est encore frais.
 */
export function itemLeitnerInitial(item: string, maintenant: Horodatage): ItemLeitner {
  return {
    item,
    boite: 1,
    derniereRevueLe: maintenant,
    echeanceLe: maintenant,
    nbRevues: 0,
  };
}

/**
 * **P6** — la boîte monte d'un cran, l'échéance suit `delaisJours[boite - 1]`, exactement.
 *
 * Le délai appliqué est celui de la boîte d'ARRIVÉE : c'est ce qui donne son sens à un système
 * espacé — réussir en boîte 1 fait revenir l'item à J+3, pas à J+1. Au sommet, la boîte reste
 * la 5 et l'échéance repart pour un délai maximal ; rien ne déborde.
 */
export function promouvoir(
  item: ItemLeitner,
  params: ParametresLeitner,
  maintenant: Horodatage,
): ItemLeitner {
  const boite = bornerBoite(item.boite + 1);
  return {
    item: item.item,
    boite,
    derniereRevueLe: maintenant,
    echeanceLe: ajouterJours(maintenant, delaiDeBoite(boite, params)),
    nbRevues: item.nbRevues + 1,
  };
}

/**
 * **P7** — un échec renvoie en `boiteApresEchec`, quelle que soit la boîte de départ.
 *
 * `nbRevues` augmente quand même : un échec est un passage, pas une punition (R14). Le compteur
 * dit combien de fois l'item a été VU, jamais combien de fois il a été réussi.
 */
export function retrograder(
  item: ItemLeitner,
  params: ParametresLeitner,
  maintenant: Horodatage,
): ItemLeitner {
  const boite = bornerBoite(params.boiteApresEchec);
  return {
    item: item.item,
    boite,
    derniereRevueLe: maintenant,
    echeanceLe: ajouterJours(maintenant, delaiDeBoite(boite, params)),
    nbRevues: item.nbRevues + 1,
  };
}

/**
 * Dû dès l'instant de l'échéance, et il le reste tant qu'il n'a pas été revu : une révision
 * oubliée ne s'efface pas toute seule.
 *
 * La comparaison passe par `Date.parse` et non par l'ordre lexicographique des chaînes : deux
 * formes ISO du même instant — avec ou sans millisecondes — ne se comparent pas correctement
 * caractère par caractère (`'Z'` vaut plus que `'.'`).
 */
export function estDue(item: ItemLeitner, maintenant: Horodatage): boolean {
  return Date.parse(item.echeanceLe) <= Date.parse(maintenant);
}

/**
 * **P8** — aucune dérive quand plusieurs révisions tombent le même jour : l'ordre rendu est
 * stable et ne dépend d'aucun aléa. Trié par échéance croissante, puis par identifiant.
 *
 * Aucun `Alea` n'entre ici, et c'est délibéré : mélanger les révisions dues rendrait deux rejeux
 * du même journal différents, et `test:rejeu` cesserait d'être interprétable.
 */
export function itemsDus(
  items: readonly ItemLeitner[],
  maintenant: Horodatage,
  limite?: number,
): readonly ItemLeitner[] {
  const dus = items
    .filter((item) => estDue(item, maintenant))
    .sort((a, b) => {
      const ecart = Date.parse(a.echeanceLe) - Date.parse(b.echeanceLe);
      if (ecart !== 0) {
        return ecart;
      }
      return a.item < b.item ? -1 : a.item > b.item ? 1 : 0;
    });

  if (limite === undefined) {
    return dus;
  }
  return dus.slice(0, Math.max(0, Math.trunc(limite)));
}

/** Le délai de la boîte, tel qu'il est déclaré en données. Hors bornes : la boîte est ramenée. */
export function delaiDeBoite(boite: NumeroBoite, params: ParametresLeitner): number {
  return params.delaisJours[bornerBoite(boite) - 1] as number;
}
