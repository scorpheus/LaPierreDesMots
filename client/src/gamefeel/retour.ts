// `RetourSensoriel` — LE point unique du game feel (lot L2-A, v2 § 8, D26).
//
// « C'est parce qu'il lit, donc c'est cool » (D26). Le spectaculaire est déclenché par l'acte
// de lire ; il n'est jamais collé à côté. Ce fichier est l'endroit où ce déclenchement se
// compose, et il est le seul.
//
// AUCUN composant, AUCUN moteur n'appelle `FournisseurAudio` ni `FournisseurHaptique`
// directement. Sinon la dégradation par `prefers-reduced-motion` serait à réécrire à chaque
// site d'appel, et un seul oubli suffirait à la casser.
//
// Toutes les méthodes résolvent en moins de 100 ms (v2 § 8) : elles DÉCLENCHENT, elles
// n'attendent pas la fin de l'effet. C'est pour cela qu'aucune ne rend autre chose que
// `Promise<void>` et qu'aucune n'attend `jouerEffet`.

import type { CodePalier, FournisseurAudio, FournisseurHaptique } from '@pierre/partage';
import { demiTonsDeSerie } from './serie.js';

export interface OptionsDepot {
  /** Point de l'événement, en coordonnées CSS. Origine des particules et du balayage. */
  readonly origine: readonly [number, number];
  /**
   * Longueur de la série de bonnes réponses en cours, à partir de 1. v2 § 8 : « 2ᵉ bonne
   * réponse = un demi-ton plus haut, comme les pièces de Mario. C'est le détail le plus
   * rentable de toute la liste. »
   *
   * `0` — ou toute valeur inférieure à 1 — signifie « je ne compte pas, compte pour moi » :
   * le retour sensoriel incrémente alors sa propre série. C'est le cas de l'hôte `EcranNoeud`,
   * qui n'a pas à dupliquer un compteur dont `reinitialiserSerie` est déjà le seul point de
   * remise à zéro.
   */
  readonly serie: number;
}

/**
 * LE point unique qui compose son, vibration et particules.
 */
export interface RetourSensoriel {
  depotCorrect(options: OptionsDepot): Promise<void>;
  /** Oscillation 6 px / 180 ms, son NEUTRE et court. Aucune vibration, aucun rouge. */
  depotRefuse(): Promise<void>;
  palierFranchi(palier: CodePalier): Promise<void>;
  /** Remet la série à zéro. Appelé sur refus et au changement de consigne. */
  reinitialiserSerie(): void;
  readonly animationsDesactivees: boolean;
}

// ⚠ NOTE DE CONTRAT — pas de `serieCourante` ici, et c'est délibéré.
//
// L'interface du § 4.1 du contrat gelé ne la déclare pas, et sept autres lots écrivent des
// doublures de `RetourSensoriel` contre cette signature exacte : leur ajouter un membre les
// ferait toutes cesser de compiler. `EcranNoeud` a pourtant besoin de la longueur de la série
// pour `data-serie` (§ 7) — c'est donc le MAGASIN qui la tient et la passe en `options.serie`,
// ce que `OptionsDepot` prévoit explicitement. Le compteur interne ci-dessous ne sert plus
// qu'au cas où l'appelant ne compte pas.

export interface OptionsRetour {
  readonly audio: FournisseurAudio;
  readonly haptique: FournisseurHaptique;
  readonly animationsDesactivees: boolean;
  readonly emettreParticules: (origine: readonly [number, number], nombre: number) => void;
}

/**
 * Le son de chaque palier de la cascade.
 *
 * Les deux derniers codes viennent d'être ajoutés à `CodeEffet` par ce même lot : c'est la
 * réparation du défaut 1 du contrat des features v2 § 1.5. Le `Record` est **exhaustif par le
 * type** — un palier ajouté à `CodePalier` sans son ici ne compilerait plus.
 */
const SON_DU_PALIER: Readonly<Record<CodePalier, 'etoile' | 'palier-intermediaire' | 'palier-rare'>> =
  {
    etoile: 'etoile',
    intermediaire: 'palier-intermediaire',
    rare: 'palier-rare'
  };

export function creerRetourSensoriel(options: OptionsRetour): RetourSensoriel {
  // La série vit ICI et nulle part ailleurs. Un second compteur dans l'hôte serait un second
  // endroit à réinitialiser, donc un endroit à oublier.
  let serie = 0;

  function jouer(code: Parameters<FournisseurAudio['jouerEffet']>[0], demiTons: number): void {
    // On NE `await` PAS : la promesse d'un fournisseur audio résout quand le son a démarré,
    // et même cela est de trop dans le chemin d'un appui. Le retour visuel ne doit jamais
    // attendre le son (v2 § 8, « une réponse visible en moins de 100 ms »).
    void options.audio.jouerEffet(code, { demiTons }).catch(() => {
      // Un son qui ne part pas n'est pas une erreur de jeu. Silence, pas d'exception.
    });
  }

  return {
    animationsDesactivees: options.animationsDesactivees,

    async depotCorrect(depot: OptionsDepot): Promise<void> {
      serie = depot.serie >= 1 ? Math.trunc(depot.serie) : serie + 1;

      jouer('depot-correct', demiTonsDeSerie(serie));
      options.haptique.vibrer('depot-correct');
      // Décision parent du 2026-09-02 : la gerbe générique masquait les dessins et persistait
      // parfois sur l'écran suivant. Le retour positif reste porté par le son, la vibration et
      // la réaction propre au moteur ; aucune particule n'est émise ici.
    },

    async depotRefuse(): Promise<void> {
      // La série tombe. C'est la SEULE conséquence d'un refus sur le game feel : pas de
      // vibration, pas de son descendant, pas de rouge (v2 § 8, R14).
      serie = 0;
      jouer('depot-refuse', 0);
    },

    async palierFranchi(palier: CodePalier): Promise<void> {
      jouer(SON_DU_PALIER[palier], 0);
      options.haptique.vibrer('palier-franchi');
    },

    reinitialiserSerie(): void {
      serie = 0;
    }
  };
}
