/**
 * Types du moteur `colorie` — lot L-E.
 *
 * Forme canonique du jeu : une scène au trait, grise par défaut, que l'enfant recolorie
 * en suivant des consignes lues (fiches-origine-analyse.md § 3).
 *
 * Ce fichier ne contient QUE des types. Les valeurs vivent dans `validation.ts`,
 * `moteur.ts` et `schema-contenu.ts`.
 *
 * Contrat gelé : contrat-technique-v1.md § 5.8.
 */

import type { CheminAsset, IdConsigne, IdRegionSvg } from '../../identifiants.js';
import type { CouleurColoriage } from '../../palette.js';
import type { AideProposee, NiveauAide } from '../types.js';

/**
 * Forme grammaticale de la consigne.
 *
 * F3 (fiches-origine § 5) : sur les 79 consignes du niveau 1, la forme dominante est
 * l'affirmation descriptive (« Le pull de la maîtresse est bleu »), pas l'impératif.
 * Ce champ existe pour qu'aucun lot ne soit tenté de « corriger » l'affirmation en
 * impératif : la difficulté pragmatique est le contenu de l'exercice, pas un défaut.
 */
export type FormeConsigne = 'imperative' | 'affirmative';

/** Un couple (région, couleur) : une case à remplir. */
export interface CibleColorie {
  readonly region: IdRegionSvg;
  readonly couleur: CouleurColoriage;
}

export interface ConsigneColorie {
  readonly id: IdConsigne;
  readonly texte: string;
  /** F3 : l'affirmation qui vaut consigne doit survivre au passage en jeu. */
  readonly forme: FormeConsigne;
  /** Clé du clip pré-rendu. `null` en v1 (pas d'audio, D1). */
  readonly audio: CheminAsset | null;
  /** UNE consigne, PLUSIEURS couples (région, couleur) — fiches-origine § 3. */
  readonly cibles: readonly CibleColorie[];
  /** Mots à surligner au palier `indice`. */
  readonly motsCles: readonly string[];
}

export interface ContenuColorie {
  readonly consignes: readonly ConsigneColorie[];
  /** Sous-ensemble du nuancier de l'habillage. Jamais restreint à la consigne active. */
  readonly nuancierAutorise: readonly CouleurColoriage[];
}

/**
 * Les quatre motifs de refus (contrat § 5.5).
 *
 * Un refus n'est PAS un échec : la couleur ne prend pas, la région oscille de 6 px,
 * et l'exercice continue. Deux motifs sur quatre seulement comptent comme erreur de
 * lecture — voir `REFUS_COMPTE_ERREUR` dans `validation.ts`.
 */
export type MotifRefus =
  | 'region-hors-consigne'
  | 'couleur-fausse'
  | 'region-deja-peinte'
  | 'aucune-couleur-choisie';

export interface RefusColorie {
  readonly region: IdRegionSvg;
  readonly couleur: CouleurColoriage | null;
  readonly motif: MotifRefus;
  readonly instantMs: number;
}

export interface EtatConsigne {
  readonly id: IdConsigne;
  readonly ciblesRestantes: readonly CibleColorie[];
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  /** R15 — le palier que l'enfant a RÉCLAMÉ. Seul lui compte dans le journal. */
  readonly aideDemandee: NiveauAide;
  readonly nbEcoutes: number;
  readonly debutMs: number;
  readonly finMs: number | null;
  readonly derniereActionMs: number;
}

export interface EtatColorie {
  readonly indexConsigne: number;
  readonly consignes: readonly EtatConsigne[];
  /** Clé = `IdRegionSvg`. Une entrée = une région peinte, définitivement. */
  readonly remplissages: Readonly<Record<string, CouleurColoriage>>;
  readonly couleurChoisie: CouleurColoriage | null;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusColorie | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionColorie =
  | { readonly type: 'choisirCouleur'; readonly couleur: CouleurColoriage }
  | { readonly type: 'peindre'; readonly region: IdRegionSvg }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
