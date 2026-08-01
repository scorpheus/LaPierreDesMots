// Anticipation → impact → récupération — v2 § 8 (lot L2-A).
//
// Les quatre gestes de la section « game feel » de la v2, écrits une fois, en objets simples :
//
//   Appui        : `scale 0.94` en 60 ms, ombre qui se rapproche.
//   Relâchement  : `scale 1.06` puis `1.0`, ressort `stiffness 400 / damping 18`.
//   Dépôt correct: aimantation 24 px, `overshoot` de 8 %.
//   Refus        : oscillation horizontale de 6 px sur 180 ms, retour à sa place —
//                  **pas de son négatif, pas de rouge, pas de secousse d'écran**.
//
// Aucun import de Motion ici, et c'est délibéré : ces objets sont des DONNÉES d'animation, pas
// une animation. Un composant les passe à Motion, un test les lit, et le budget de bundle ne
// paie rien pour un fichier qui n'est que des nombres.
//
// Les durées par défaut viennent de la v2 ; `TimingsHabillage` (contrat technique v1 § 4.1) les
// surcharge par habillage, ce qui est la raison d'être des paramètres `dureeMs`.

import { OVERSHOOT } from './aimantation.js';

/** Le ressort de la v2 § 8. Les deux nombres sont cités du document, pas dérivés. */
export const RESSORT = { stiffness: 400, damping: 18 } as const;

/** Durées par défaut, en millisecondes — v2 § 8. Un habillage peut les surcharger. */
export const DUREES = {
  appuiMs: 60,
  relachementMs: 120,
  refusMs: 180,
  recolorationMs: 900
} as const;

/** Échelle à l'appui : l'élément s'enfonce. */
export const ECHELLE_APPUI = 0.94;

/** Échelle au relâchement, avant le retour à 1 : l'élément rebondit. */
export const ECHELLE_RELACHEMENT = 1.06;

/** Amplitude de l'oscillation de refus, en pixels — v2 § 8. */
export const OSCILLATION_REFUS_PX = 6;

/** La courbe de la recoloration — v2 § 8, citée à la lettre. */
export const COURBE_RECOLORATION = 'cubic-bezier(.16,1,.3,1)';

export interface TransitionRessort {
  readonly type: 'spring';
  readonly stiffness: number;
  readonly damping: number;
}

/** La transition de ressort, telle que Motion l'attend. */
export function transitionRessort(): TransitionRessort {
  return { type: 'spring', stiffness: RESSORT.stiffness, damping: RESSORT.damping };
}

export interface ImagesCles {
  /** Suite de valeurs à parcourir. Une seule valeur = aucun mouvement. */
  readonly valeurs: readonly number[];
  readonly dureeMs: number;
}

/**
 * Appui : anticipation. Rien ne « part » sans s'être d'abord ramassé.
 * `animationsDesactivees` rend une image-clé unique : le fonctionnel reste, le décoratif part.
 */
export function imagesClesAppui(
  animationsDesactivees: boolean,
  dureeMs: number = DUREES.appuiMs
): ImagesCles {
  return animationsDesactivees
    ? { valeurs: [1], dureeMs: 0 }
    : { valeurs: [1, ECHELLE_APPUI], dureeMs };
}

/** Relâchement : impact puis récupération. */
export function imagesClesRelachement(
  animationsDesactivees: boolean,
  dureeMs: number = DUREES.relachementMs
): ImagesCles {
  return animationsDesactivees
    ? { valeurs: [1], dureeMs: 0 }
    : { valeurs: [ECHELLE_APPUI, ECHELLE_RELACHEMENT, 1], dureeMs };
}

/**
 * Dépôt correct : la cible dépasse de 8 % puis revient.
 *
 * C'est ICI que `OVERSHOOT` est consommé — `aimanter` rend la position finale exacte, ce
 * dépassement n'est qu'une image-clé intermédiaire.
 */
export function imagesClesDepot(
  animationsDesactivees: boolean,
  dureeMs: number = DUREES.relachementMs
): ImagesCles {
  return animationsDesactivees
    ? { valeurs: [1], dureeMs: 0 }
    : { valeurs: [1, 1 + OVERSHOOT, 1], dureeMs };
}

/**
 * Refus : oscillation horizontale de 6 px, l'élément retourne à sa place.
 *
 * Aucune couleur, aucun son négatif, aucune secousse d'écran (v2 § 8, R14). La suite est
 * symétrique et se termine à 0 : l'élément revient EXACTEMENT d'où il vient, sinon un refus
 * déplacerait la scène et l'enfant lirait un déplacement comme une sanction.
 */
export function imagesClesRefus(
  animationsDesactivees: boolean,
  dureeMs: number = DUREES.refusMs
): ImagesCles {
  const a = OSCILLATION_REFUS_PX;
  return animationsDesactivees
    ? { valeurs: [0], dureeMs: 0 }
    : { valeurs: [0, -a, a, -a / 2, a / 2, 0], dureeMs };
}
