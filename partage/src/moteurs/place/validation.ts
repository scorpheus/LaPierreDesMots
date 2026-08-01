/**
 * Le contrat de validation du moteur `place` — lot L2-C.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.2.
 *
 * Tout ce fichier est PUR : aucune horloge, aucun aléa, aucun DOM. Il décide, il ne mute
 * rien. `moteur.ts` s'en sert pour construire l'état suivant.
 *
 * La règle qui commande tout le fichier : **il n'existe aucun chemin d'échec** (v2 § 5.4,
 * R14). Un refus fait que l'élément retourne à la réserve ; il ne produit ni rouge, ni son
 * négatif, ni écran d'échec, et trois motifs sur cinq ne comptent même pas.
 */

import { normaliserTexte } from '../../texte.js';
import { plusProcheSousTolerance, pointDansPolygone } from '../commun/geometrie.js';
import type { Point } from '../commun/geometrie.js';
import type {
  ContenuPlace,
  EtatPlace,
  IdElement,
  IdZoneCible,
  RelationSpatiale,
} from './types.js';

/** R16 : 24 px de tolérance sur toute cible de dépôt, sans exception. */
export const TOLERANCE_DEPOT_PX = 24;

export type MotifRefusPlace =
  | 'zone-hors-consigne'    // la zone n'est pas une cible de la consigne active
  | 'element-hors-consigne' // l'élément saisi n'est pas attendu ici (c'est un intrus)
  | 'zone-deja-occupee'     // la zone porte déjà son élément
  | 'aucun-element-saisi'   // dépôt sans saisie préalable
  | 'hors-scene';           // le doigt est sorti du dessin

/**
 * Deux motifs sur cinq seulement sont des erreurs de LECTURE. Même raisonnement qu'au
 * contrat v1 § 5.5 : `zone-deja-occupee` est le double-tap, `aucun-element-saisi` et
 * `hors-scene` sont des gestes, pas des contresens. Un geste ne coûte rien.
 */
export const REFUS_PLACE_COMPTE_ERREUR: Readonly<Record<MotifRefusPlace, boolean>> = {
  'zone-hors-consigne': true,
  'element-hors-consigne': true,
  'zone-deja-occupee': false,
  'aucun-element-saisi': false,
  'hors-scene': false,
};

// ------------------------------------------------------------------------ visée

/**
 * Ce dont la visée a réellement besoin : les zones, rien d'autre.
 *
 * ÉCART AU CONTRAT GELÉ n° 2 — le § 4.3.2 type le paramètre `contenu` en `ContenuPlace`.
 * Il est ÉLARGI à `Pick<ContenuPlace, 'zones'>` pour que `reduire`, qui ne reçoit pas le
 * contenu (voir `EtatPlace.zones`), puisse appeler ces deux fonctions avec l'état.
 * Élargissement, jamais restriction : tout `ContenuPlace` reste assignable, donc **aucun
 * site d'appel du contrat gelé ne cesse de compiler**.
 */
export type SourceZonesPlace = Pick<ContenuPlace, 'zones'>;

/**
 * Zone désignée par un point, en coordonnées `viewBox`.
 *
 * 1. Le point tombe dans un polygone → c'est lui.
 * 2. Sinon, le centroïde le plus proche sous `tolerance`.
 * 3. Sinon `null` : le dépôt est **ignoré**, l'élément retourne à la réserve. Aucun refus,
 *    aucun son, aucun compte. Un doigt qui glisse hors du dessin ne coûte rien.
 *
 * Différence nette avec `regionSousLeDoigt` de `colorie` (v1) : ici l'étape 1 est un VRAI
 * test d'appartenance, parce que `ZoneCible` transporte son polygone. La limite assumée de
 * v1 — le disque de même aire — n'a pas lieu d'être reconduite.
 *
 * Départage déterministe à égalité : l'ordre de déclaration des zones.
 */
export function zoneSousLeDoigt(
  contenu: SourceZonesPlace,
  point: Point,
  tolerance?: number,
): IdZoneCible | null {
  const marge = tolerance ?? TOLERANCE_DEPOT_PX;

  for (const zone of contenu.zones) {
    if (pointDansPolygone(point, zone.polygone)) return zone.id;
  }

  const index = plusProcheSousTolerance(
    point,
    contenu.zones.map((z) => z.centroide),
    marge,
  );
  if (index === null) return null;
  return contenu.zones[index]?.id ?? null;
}

// ------------------------------------------------------------------- évaluation

export interface DecisionDepot {
  readonly acceptee: boolean;
  readonly zone: IdZoneCible | null;
  readonly motif: MotifRefusPlace | null;
  readonly compteErreur: boolean;
  readonly consigneSatisfaite: boolean;
  readonly exerciceTermine: boolean;
}

function refus(motif: MotifRefusPlace, zone: IdZoneCible | null): DecisionDepot {
  return {
    acceptee: false,
    zone,
    motif,
    compteErreur: REFUS_PLACE_COMPTE_ERREUR[motif],
    consigneSatisfaite: false,
    exerciceTermine: false,
  };
}

/**
 * Fonction pure. Ne modifie pas l'état ; `reduire` s'en sert pour le construire.
 *
 * L'ORDRE DES TESTS EST NORMATIF, et ce n'est pas l'ordre de la table des motifs :
 * `zone-deja-occupee` est testé AVANT `zone-hors-consigne`. Sans cela, un double-tap sur
 * une zone qui vient de satisfaire sa consigne tomberait dans la consigne suivante, serait
 * « hors consigne », et compterait une erreur — exactement la double soumission que
 * l'annexe T § T1 interdit. C'est la même précaution qu'au contrat v1 § 5.5 pour `colorie`.
 */
export function evaluerDepot(
  etat: EtatPlace,
  contenu: SourceZonesPlace,
  element: IdElement | null,
  point: Point,
): DecisionDepot {
  // L'exercice est fini : plus rien ne peut être une erreur.
  if (etat.termineMs !== null) return refus('zone-deja-occupee', null);

  if (element === null) return refus('aucun-element-saisi', null);

  // Un élément déjà posé qu'on repose : c'est le double-tap, pas un contresens. Le
  // vocabulaire des motifs est fermé (§ 4.3.2) ; `zone-deja-occupee` est le seul qui dise
  // « ce geste ne coûte rien parce qu'il a déjà eu lieu ».
  if (Object.prototype.hasOwnProperty.call(etat.places, element)) {
    return refus('zone-deja-occupee', etat.places[element] ?? null);
  }

  const zone = zoneSousLeDoigt(contenu, point);
  if (zone === null) return refus('hors-scene', null);

  // La zone porte déjà son élément.
  for (const occupee of Object.values(etat.places)) {
    if (occupee === zone) return refus('zone-deja-occupee', zone);
  }

  const consigne = etat.consignes[etat.indexConsigne];
  if (consigne === undefined) return refus('zone-deja-occupee', zone);

  const attendu = consigne.depotsRestants.find((d) => d.zone === zone);
  if (attendu === undefined) return refus('zone-hors-consigne', zone);
  if (attendu.element !== element) return refus('element-hors-consigne', zone);

  const consigneSatisfaite = consigne.depotsRestants.length === 1;
  const exerciceTermine = consigneSatisfaite && etat.indexConsigne === etat.consignes.length - 1;

  return {
    acceptee: true,
    zone,
    motif: null,
    compteErreur: false,
    consigneSatisfaite,
    exerciceTermine,
  };
}

// ------------------------------------------- lecture des consignes du corpus réel
//
// ADDITION DE LOT, signalée au rapport : les deux symboles ci-dessous ne figurent pas au
// § 4.3.2 et ne traversent AUCUNE frontière de lot. Ils existent pour que le contrat de
// sortie « nombre de consignes “Dessine…” du niveau 1 couvertes par `place` » (§ 10.4) soit
// MESURÉ sur `contenu/brouillons/niveau-1/`, et non affirmé. Un lexique écrit à la main
// serait invérifiable ; celui-ci est confronté aux 8 consignes réelles par
// `tests/unitaires/place-validation.test.ts`.

/**
 * Marqueurs de surface qui décident de la relation spatiale, du plus spécifique au moins
 * spécifique — l'ordre COMPTE : « au-dessus de » contient « dessus », et « à côté de »
 * doit gagner sur « côté ».
 */
export const LEXIQUE_RELATIONS: readonly (readonly [string, RelationSpatiale])[] = [
  ['au-dessus de', 'au-dessus'],
  ['au dessus de', 'au-dessus'],
  ['en dessous de', 'en-dessous'],
  ['en-dessous de', 'en-dessous'],
  ["a cote d", 'a-cote-de'],
  ['pres d', 'a-cote-de'],
  ['entre ', 'entre'],
  ['derriere ', 'derriere'],
  ['devant ', 'devant'],
  ['sous ', 'sous'],
  ['sur ', 'sur'],
  ['dans ', 'dans'],
];

/**
 * La relation spatiale portée par le texte d'une consigne, ou `null` si aucune n'est
 * reconnue. Comparaison sur la forme canonique (`normaliserTexte`) : « à côté » et « a
 * cote » sont le même mot pour cette fonction, et l'apostrophe typographique du corpus ne
 * fait échouer aucune égalité.
 */
export function relationDeConsigne(texte: string): RelationSpatiale | null {
  const canonique = normaliserTexte(texte);
  for (const [marqueur, relation] of LEXIQUE_RELATIONS) {
    if (canonique.includes(marqueur)) return relation;
  }
  return null;
}
