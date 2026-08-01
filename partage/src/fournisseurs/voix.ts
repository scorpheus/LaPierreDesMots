/**
 * Synthèse vocale, derrière une interface — annexe T § 2.3.
 *
 * « Rien n'est synthétisé à l'exécution » (CLAUDE.md) : l'implantation réelle joue un clip
 * pré-rendu. En v1 il n'y a aucun audio (décision D1, écart n° 4 du contrat) et le client
 * câble `VoixMuette`, qui journalise ce qu'on lui a demandé de dire.
 */

import type { CheminAsset } from '../identifiants.js';

/** Qui parle. Chaque locuteur a sa voix clonée ou sa voix de synthèse. */
export type Locuteur = 'gobi' | 'narrateur' | 'maitresse' | 'enfant';

export interface DemandeVoix {
  /** Le texte à dire, tel qu'il est écrit à l'écran (apostrophes typographiques comprises). */
  readonly texte: string;
  readonly locuteur?: Locuteur;
  /** Clé du clip pré-rendu quand elle est connue. `null` = pas de clip pour ce texte. */
  readonly clip?: CheminAsset | null;
  /** 1 = vitesse normale. Le palier d'aide `souffle-syllabe` ralentit. */
  readonly vitesse?: number;
  /** Vrai pour une diction syllabée (palier `indice`, contrat § 5.6). */
  readonly syllabe?: boolean;
}

export interface FournisseurVoix {
  /** Résout quand la lecture est terminée. Une demande pendant une lecture l'interrompt. */
  dire(demande: DemandeVoix): Promise<void>;
  /** Coupe la lecture en cours, sans erreur s'il n'y en a pas. */
  taire(): void;
  /** Faux quand aucune voix n'est disponible : l'appelant ne doit alors rien attendre. */
  readonly disponible: boolean;
}
