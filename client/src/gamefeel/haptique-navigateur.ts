// L'unique implantation de `FournisseurHaptique` — annexe T § 2.3, D26 (lot L2-A).
//
// ⚠ CE FICHIER EST LE SEUL DU DÉPÔT AUTORISÉ À TOUCHER `navigator.vibrate`, et
// `eslint.config.js` le vérifie (règle `pierre/vibration`). Motif écrit ici pour qu'on ne
// l'assouplisse pas par confort : la dégradation par `prefers-reduced-motion` et par le
// réglage « animations calmes » doit se faire EN UN POINT (v2 § 8). Répartie sur les sites
// d'appel, un seul oubli suffirait à faire vibrer une tablette dont l'enfant a justement
// demandé qu'elle se taise.
//
// Second motif, tout aussi opposable : une suite de tests ne doit rien déclencher. Sous
// happy-dom, `navigator.vibrate` n'existe pas ; le repli est silencieux et `disponible` est
// faux, ce qui rend l'absence VISIBLE plutôt que muette.

import type { CodeVibration, FournisseurHaptique } from '@pierre/partage';

/**
 * Motifs de vibration, en millisecondes.
 *
 * `depot-correct` vaut **20 ms** : c'est la valeur nommée par D26, pas une estimation. Les deux
 * autres sont des PLACEHOLDER — à valider sur la tablette réelle (consignés dans
 * `Docs/questions-en-attente.md`). Ils restent courts par construction : au-delà d'une
 * cinquantaine de millisecondes, une tablette posée sur une table fait du bruit, et le bruit
 * réveille la maison avant de récompenser l'enfant.
 *
 * Aucune vibration n'est associée au refus, et ce n'est pas un oubli : `CodeVibration` n'en
 * déclare pas. « L'erreur est un mouvement, pas une punition » (v2 § 8).
 */
const MOTIFS: Readonly<Record<CodeVibration, readonly number[]>> = {
  // D26, cité : « vibration 20 ms sur dépôt correct ».
  'depot-correct': [20],
  // PLACEHOLDER — à valider : deux impulsions, pour que le palier se distingue du dépôt.
  'palier-franchi': [20, 40, 30],
  // PLACEHOLDER — à valider : plus court encore que le dépôt, c'est une annonce, pas un geste.
  apparition: [12]
};

export interface OptionsHaptique {
  /**
   * `true` quand `prefers-reduced-motion` ou le réglage « animations calmes » sont actifs.
   * Le fournisseur devient alors indisponible et `vibrer` est sans effet — la vibration est
   * du mouvement, elle tombe avec le reste du décoratif.
   */
  readonly animationsDesactivees: boolean;
}

/**
 * Vrai si l'appareil expose l'API Vibration.
 *
 * Trois navigateurs sur quatre l'exposent sans moteur derrière (les ordinateurs de bureau) :
 * `disponible` dit donc « l'appel ne lèvera pas », pas « l'enfant sentira quelque chose ».
 * C'est la seule promesse qu'un navigateur permet de tenir.
 */
function vibrationExposee(): boolean {
  return typeof navigator === 'object' && typeof navigator.vibrate === 'function';
}

export function creerHaptiqueNavigateur(options: OptionsHaptique): FournisseurHaptique {
  const disponible = vibrationExposee() && !options.animationsDesactivees;

  return {
    disponible,

    vibrer(code: CodeVibration): void {
      if (!disponible) {
        return;
      }
      try {
        navigator.vibrate(MOTIFS[code] as number[]);
      } catch {
        // Une vibration ratée n'est pas une erreur de jeu (contrat § 4.1) : certains
        // navigateurs lèvent quand la page n'a pas encore reçu de geste utilisateur. On avale,
        // en silence et sans trace : l'enfant n'a rien à voir, et le parent non plus.
      }
    }
  };
}

/**
 * Un fournisseur qui ne vibre jamais et le dit.
 *
 * Utilisé quand les animations calmes sont actives, et par les tests de composants : il évite
 * d'avoir à simuler `navigator.vibrate` pour monter un écran.
 */
export function creerHaptiqueMuette(): FournisseurHaptique {
  return {
    disponible: false,
    vibrer(): void {
      // Sans effet, par construction.
    }
  };
}
