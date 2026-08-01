/**
 * Musique et effets, derrière une interface — annexe T § 2.3.
 * En test, `AudioMuet` : aucun contexte Web Audio n'est ouvert.
 */

import type { CheminAsset } from '../identifiants.js';

/** Les trois canaux réglables séparément. */
export type CanalAudio = 'ambiance' | 'effets' | 'voix';

/**
 * Les effets nommés par la v2 § 8, plus les deux paliers de la cascade de D25.
 *
 * `depot-refuse` est **neutre et court** : jamais descendant, jamais dissonant — l'erreur n'a
 * pas de son négatif (contrat technique v1 § 5.6).
 *
 * ⚠ CETTE UNION EST LA SEULE AUTORITÉ, et c'est la réparation du défaut 1 du contrat des
 * features v2 § 1.5 : `client/src/services/audio-tone.ts` déclarait cinq recettes sous
 * d'autres noms (`depot-accepte`, `consigne-terminee`, `exercice-termine`), dont deux
 * seulement coïncidaient avec cette liste. `depot-correct` — « le détail le plus rentable de
 * toute la liste » (v2 § 8) — n'était donc **jamais joué sous son nom**, et le repli « tout
 * code inconnu est joué comme `depot-accepte` » masquait la divergence au lieu de la
 * signaler. Les recettes de `audio-tone.ts` sont désormais indexées par `CodeEffet` : un code
 * ajouté ici et oublié là-bas ne compile plus.
 */
export type CodeEffet =
  | 'depot-correct'
  | 'depot-refuse'
  | 'recoloration'
  | 'etoile'
  | 'gobi-parle'
  | 'transition-noeud'
  | 'fin-noeud'
  /** Cascade D25, palier ~5 : le tampon spécial de l'école. */
  | 'palier-intermediaire'
  /** Cascade D25, palier ~10 : l'image. Le son le plus rare du jeu, donc le plus désirable. */
  | 'palier-rare';

export interface FournisseurAudio {
  /**
   * Résout quand l'effet a démarré, pas quand il est fini : la cible est < 80 ms.
   *
   * Les options sont écrites en clair plutôt que nommées : un type exporté de plus élargirait
   * la surface de `partage/` au-delà de ce que le contrat § 11.1 énumère. `demiTons` porte la
   * série de bonnes réponses de la v2 § 8 (« 2ᵉ bonne réponse = un demi-ton plus haut »),
   * `volume` va de 0 à 1 et multiplie le volume du canal `effets`.
   */
  jouerEffet(
    code: CodeEffet,
    options?: { readonly demiTons?: number; readonly volume?: number },
  ): Promise<void>;
  demarrerAmbiance(cle: CheminAsset): Promise<void>;
  arreterAmbiance(): void;
  /** Volume d'un canal, de 0 à 1. */
  reglerVolume(canal: CanalAudio, valeur: number): void;
  readonly disponible: boolean;
}
