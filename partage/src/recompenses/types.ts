/**
 * La cascade de récompenses — D25, contrat des features v2 § 4.1 (lot L2-A).
 *
 * Ce fichier ne contient QUE des types. Les valeurs vivent dans `cascade.ts` et
 * `parametres.ts`, et le sous-chemin `@pierre/partage/recompenses` les publie (C1 : le
 * barillet `@pierre/partage` n'accueille que des types, jamais une constante).
 */

import type { CheminAsset, CodeRegion, Horodatage } from '../identifiants.js';

/**
 * La cascade de D25, dans l'ordre.
 *
 * Le mapping avec le système de l'école est direct et délibéré : étoile → tampon spécial →
 * image. Ce système motive DÉJÀ l'enfant ; on capitalise sur du mesuré, pas sur une théorie.
 */
export type CodePalier = 'etoile' | 'intermediaire' | 'rare';

/**
 * Ce que rapporte le palier. `rare` est une IMAGE, ou son équivalent (D25, point 2) :
 * « une portion de monde qui reprend ses couleurs — quelque chose qu'il peut montrer ».
 */
export type NatureRecompense = 'etoile' | 'forme-gobi' | 'objet-campement' | 'zone-recoloriee';

export interface SeuilsCascade {
  /** ~5 à l'école. Déclaré en données (C2), jamais en dur. */
  readonly etoilesParIntermediaire: number;
  /** ~10 à l'école. */
  readonly intermediairesParRare: number;
  readonly natureIntermediaire: NatureRecompense;
  readonly natureRare: NatureRecompense;
}

/**
 * L'état de la cascade d'un profil.
 *
 * Les cinq compteurs sont **monotones croissants** — sauf les deux « depuis », qui retombent
 * à zéro au franchissement du palier qu'ils alimentent, exactement comme une carte de tampons
 * qu'on recommence. `appliquerEtoiles` en fait un invariant vérifié par table et par
 * propriété (`tests/unitaires/cascade.test.ts`).
 */
export interface EtatCascade {
  readonly etoilesTotal: number;
  readonly etoilesDepuisIntermediaire: number;
  readonly intermediairesTotal: number;
  readonly intermediairesDepuisRare: number;
  readonly raresTotal: number;
  readonly dernierPalierLe: Horodatage | null;
}

/**
 * Ce qu'une jauge AFFICHE.
 *
 * `restant` est un champ, pas une soustraction laissée à la vue. D25 point 3 : « ce qui
 * motive, c'est de voir la case suivante vide ». Une jauge qui ne porte que `acquis` laisse
 * la vue libre de n'afficher que l'acquis — et c'est exactement l'erreur que ce champ
 * interdit. `client/src/composants/JaugePalier.tsx` porte l'attribut `data-restant`, et
 * `tests/composants/JaugePalier.test.tsx` l'assert **sur le DOM**, pas sur le calcul.
 *
 * Lecture uniforme des trois jauges : « combien reste-t-il avant la prochaine récompense de
 * ce palier, et en quelle monnaie ». Pour `intermediaire` la monnaie est l'étoile (« trois
 * étoiles sur cinq »), pour `rare` c'est l'intermédiaire (« sept tampons sur dix ») — les
 * deux phrases mêmes de D25. Pour `etoile`, la monnaie est le nœud terminé : `requis` vaut 1
 * et `acquis` 0, parce qu'il n'existe pas de fraction de nœud.
 */
export interface JaugePalier {
  readonly palier: CodePalier;
  readonly acquis: number;
  readonly requis: number;
  readonly restant: number;
  readonly nature: NatureRecompense;
}

export interface RecompenseObtenue {
  readonly palier: CodePalier;
  readonly nature: NatureRecompense;
  /** Ce qui est effectivement remis : un graphème, un objet, une zone. `null` pour l'étoile. */
  readonly reference: string | null;
  readonly asset: CheminAsset | null;
  readonly region: CodeRegion | null;
}

export interface GainCascade {
  readonly etat: EtatCascade;
  /** Dans l'ordre de franchissement. Vide si aucun palier n'a été franchi. */
  readonly paliersFranchis: readonly CodePalier[];
  readonly recompenses: readonly RecompenseObtenue[];
  /** Toujours les trois jauges, toujours dans l'ordre `etoile`, `intermediaire`, `rare`. */
  readonly jauges: readonly JaugePalier[];
}
