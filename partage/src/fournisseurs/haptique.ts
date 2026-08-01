/**
 * La vibration derrière une interface — annexe T § 2.3, contrat des features v2 § 4.1 (L2-A).
 *
 * Deux raisons, et une seule d'entre elles suffirait :
 *   1. les tests ne doivent RIEN déclencher — une suite qui fait vibrer la machine d'un
 *      intégrateur est une suite qu'on finit par ne plus lancer ;
 *   2. `prefers-reduced-motion` et le réglage « animations calmes » doivent pouvoir tout
 *      couper **en un seul point** (v2 § 8). Réparti sur les sites d'appel, un seul oubli
 *      suffirait à casser la dégradation.
 *
 * Ce fichier ne contient QUE des types : la seule implantation qui touche `navigator.vibrate`
 * est `client/src/gamefeel/haptique-navigateur.ts`, et une règle ESLint maison l'y enferme.
 */

import type { CodeErreur } from '../erreurs.js';

/**
 * Les trois moments où l'appareil vibre. Aucun autre.
 *
 * En particulier : **jamais sur un refus** — « l'erreur est un mouvement, pas une punition »
 * (v2 § 8, contrat technique v1 § 5.6). Une vibration sur l'erreur transformerait le geste
 * raté en sanction physique, exactement ce que R14 interdit.
 *
 * - `depot-correct` — 20 ms, la valeur nommée par D26 ;
 * - `palier-franchi` — la cascade de D25 vient de monter d'un cran ;
 * - `apparition` — un élément entre en scène (Gobi, une récompense).
 */
export type CodeVibration = 'depot-correct' | 'palier-franchi' | 'apparition';

/**
 * L'API Vibration, vue par le jeu.
 *
 * `vibrer` ne rend rien et ne lève jamais : une vibration ratée n'est pas une erreur de jeu.
 * Sur une tablette sans moteur, sur un navigateur qui l'ignore, ou quand l'enfant a demandé
 * des animations calmes, l'appel est simplement sans effet.
 */
export interface FournisseurHaptique {
  /** Ne rend rien et ne lève jamais : une vibration ratée n'est pas une erreur de jeu. */
  vibrer(code: CodeVibration): void;
  /** Faux quand l'appareil n'a pas de moteur, ou quand les animations calmes sont actives. */
  readonly disponible: boolean;
}

/**
 * Erreur exposée pour mémoire : le fournisseur n'en lève aucune.
 *
 * L'alias existe pour que le lien avec `CodeErreur` soit visible dans le fichier plutôt que
 * dans un commentaire : si un jour `vibrer` devait échouer, c'est ce code-là qu'il porterait —
 * et le contrat aurait changé.
 */
export type _ErreurHaptiqueJamaisLevee = CodeErreur;
