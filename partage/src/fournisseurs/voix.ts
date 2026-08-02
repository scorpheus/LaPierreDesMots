/**
 * Synthèse vocale, derrière une interface — annexe T § 2.3.
 *
 * « Rien n'est synthétisé à l'exécution » (CLAUDE.md) : l'implantation réelle joue un clip
 * PRÉ-RENDU, produit au build par `npm run voix` et déclaré au manifeste
 * (`contenu/audio/manifeste.json`).
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * MODIFIÉ PAR N2 — contrat de finition v3 § 5.5. Deux changements, et un seul motif.
 *
 * 1. `Locuteur` passe de QUATRE à SEPT membres, et sa définition déménage dans
 *    `../voix/manifeste.js`. D41 : voix entièrement synthétiques, sept locuteurs. `'enfant'`
 *    est RETIRÉ — D41 écarte l'enregistrement familial, et une voix d'enfant synthétique ne
 *    sert aucune consigne. Les quatre compagnons entrent, parce que ce sont eux qui parlent
 *    en région.
 *
 * 2. `DemandeVoix.clip` (un CHEMIN de fichier) devient `DemandeVoix.cle` (une CLÉ de
 *    manifeste), et `FournisseurVoix` gagne `aUnClip`.
 *
 *    Le motif est D42 : « le bouton écouter est masqué tant qu'aucun audio n'existe ». Pour
 *    tenir cette règle, l'application doit répondre à « ce texte a-t-il un clip ? » AVANT de
 *    rendre quoi que ce soit. Avec un chemin de fichier, chaque appelant devait le savoir
 *    lui-même — c'est-à-dire que chaque appelant pouvait se tromper. Avec une clé, un seul
 *    objet sait : le fournisseur. `aUnClip` est la question, `dire` est la réponse, et le
 *    bouton n'a plus rien à deviner.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 */

import type { CleAudio, Locuteur } from '../voix/manifeste.js';

export type { CleAudio, Locuteur };

export interface DemandeVoix {
  /** Le texte à dire, tel qu'il est écrit à l'écran (apostrophes typographiques comprises). */
  readonly texte: string;
  readonly locuteur?: Locuteur;
  /**
   * REMPLACE `clip` — la clé du manifeste, jamais un chemin de fichier.
   *
   * Le fournisseur résout ; l'appelant n'a pas à connaître l'arborescence de `contenu/audio/`,
   * ni le nom de fichier — qui porte l'empreinte du texte et change donc à chaque correction
   * de la consigne. `null` : aucun clip n'est demandé, et le fournisseur se tait.
   */
  readonly cle?: CleAudio | null;
  /** 1 = vitesse normale. Le palier d'aide `souffle-syllabe` ralentit. */
  readonly vitesse?: number;
  /** Vrai pour une diction syllabée (palier `indice`) : le rendu `syllabe` du manifeste. */
  readonly syllabe?: boolean;
}

export interface FournisseurVoix {
  /** Résout quand la lecture est terminée. Une demande pendant une lecture l'interrompt. */
  dire(demande: DemandeVoix): Promise<void>;
  /** Coupe la lecture en cours, sans erreur s'il n'y en a pas. */
  taire(): void;
  /** Faux quand aucune voix n'est disponible : l'appelant ne doit alors rien attendre. */
  readonly disponible: boolean;
  /**
   * AJOUT N2 — ce que `BoutonEcouter` interroge AVANT de se rendre (D42).
   *
   * Elle ne joue rien, ne charge rien, ne réserve rien : elle consulte le manifeste. Elle
   * doit donc être appelable à chaque rendu React sans coût, et rendre `false` sur `null`
   * plutôt que de lever — un bouton ne fait pas tomber un écran.
   */
  aUnClip(cle: CleAudio | null): boolean;
}
