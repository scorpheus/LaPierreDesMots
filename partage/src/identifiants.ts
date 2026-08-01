/**
 * Alias d'identifiants et unions fermées.
 *
 * Écart assumé n° 6 du contrat technique v1 : les identifiants sont de simples alias de
 * `string`, sans marquage nominal (*branded types*). Le marquage s'ajoutera plus tard sans
 * changer un seul site d'appel.
 *
 * Les deux unions fermées — `CodeRegion` et `CodeMoteur` — sont, elles, opposables : elles
 * doivent rester alignées sur les énumérations de `contenu/schemas/exercice.schema.json`
 * (contrat § 9.2) et sur les six régions de la v2 § 3.3.
 */

/** Identifiant d'un profil d'enfant. */
export type IdProfil = string;

/** Identifiant d'un nœud de la carte, ex. `clairiere-01`. */
export type IdNoeud = string;

/** Identifiant d'un exercice, ex. `clairiere-ecole-01`. */
export type IdExercice = string;

/** Identifiant d'un habillage, ex. `clairiere.ecole`. */
export type IdHabillage = string;

/** `id` d'un `<path>` coloriable dans le SVG de la scène, ex. `toit-ecole`. */
export type IdRegionSvg = string;

/** Identifiant d'une consigne à l'intérieur d'un contenu, ex. `c1`. */
export type IdConsigne = string;

/** Identifiant d'une tentative enregistrée au journal. */
export type IdTentative = string;

/** Code d'une compétence du référentiel, ex. `comp.consigne.simple`. */
export type CodeCompetence = string;

/** Date et heure au format ISO 8601 en UTC, ex. `2026-09-01T08:00:00.000Z`. */
export type Horodatage = string;

/** Chemin d'un asset, relatif à la racine de `contenu/`, ex. `habillages/clairiere/ecole.svg`. */
export type CheminAsset = string;

/**
 * Les six régions de la v2 § 3.3, dans l'ordre de la progression phonologique.
 * Sert aussi de code de variante de palette par profil (v2 § 11).
 */
export type CodeRegion =
  | 'clairiere'
  | 'galeries'
  | 'marais-jumeau'
  | 'foret-muette'
  | 'volcan'
  | 'cite-des-histoires';

/**
 * Les treize moteurs de la v2 § 7. L'énumération reprend, dans le même ordre, celle de
 * `contenu/schemas/exercice.schema.json` (contrat § 9.2).
 * Un seul est implanté en v1 : `colorie` (décision D1).
 */
export type CodeMoteur =
  | 'attrape'
  | 'tri'
  | 'assemble'
  | 'chemin'
  | 'eclair'
  | 'paires'
  | 'phrase'
  | 'histoire'
  | 'chrono'
  | 'grave'
  | 'colorie'
  | 'libre'
  | 'place';
