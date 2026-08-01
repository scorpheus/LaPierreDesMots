/**
 * Musique et effets, derrière une interface — annexe T § 2.3.
 * En test, `AudioMuet` : aucun contexte Web Audio n'est ouvert.
 */

import type { CheminAsset } from '../identifiants.js';

/** Les trois canaux réglables séparément. */
export type CanalAudio = 'ambiance' | 'effets' | 'voix';

/**
 * Les effets nommés par la v2 § 8. `depot-refuse` est **neutre et court** : jamais descendant,
 * jamais dissonant — l'erreur n'a pas de son négatif (contrat § 5.6).
 */
export type CodeEffet =
  | 'depot-correct'
  | 'depot-refuse'
  | 'recoloration'
  | 'etoile'
  | 'gobi-parle'
  | 'transition-noeud'
  | 'fin-noeud';

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
