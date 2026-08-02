/**
 * Types du moteur `chrono` — lot L2-E.
 *
 * Remettre des vignettes dans l'ordre du récit (niveau 5 du corpus, « Numérote de 1 à 5 »).
 * L'ordre est **imposé** : la chronologie est ce qui s'exerce.
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { FormeConsigne } from '../colorie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdVignette = string;

export interface VignetteChrono {
  readonly id: IdVignette;
  /** La légende écrite sous la vignette. C'est elle qui se déchiffre. */
  readonly libelle: string;
  readonly asset: CheminAsset | null;
  readonly taille: readonly [number, number];
}

export interface ConsigneChrono {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /** Le récit dont les vignettes racontent les moments, pour l'aide vocale. */
  readonly recit: string;
  /** Les vignettes **dans l'ordre du récit**. */
  readonly ordre: readonly IdVignette[];
  readonly motsCles: readonly string[];
}

export interface ContenuChrono {
  readonly consignes: readonly ConsigneChrono[];
  readonly vignettes: readonly VignetteChrono[];
  readonly competence: string;
}

export type MotifRefusChrono =
  | 'vignette-hors-ordre' // ce n'est pas le moment suivant du récit
  | 'vignette-deja-numerotee'
  | 'vignette-inconnue';

export interface RefusChrono {
  readonly vignette: IdVignette | null;
  readonly motif: MotifRefusChrono;
  readonly instantMs: number;
}

export interface EtatEtapeChrono {
  /** `identifiant`, et non `id` : c'est le nom qu'`EtapeGenerique` (L2-C) impose. */
  readonly identifiant: IdConsigne;
  /** Ce qu'il reste à faire sur cette étape. Vide = étape close. */
  readonly restantes: readonly string[];
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  readonly nbEcoutes: number;
  readonly debutMs: number;
  readonly finMs: number | null;
  readonly premiereActionMs: number | null;
  readonly derniereActionMs: number;
  readonly instantIndiceMs: number | null;
  readonly modeReponse: ModeReponse;
  /**
   * Le nombre de vignettes à remettre dans l'ordre du récit. `modeReponse` vaut `'ordre'` :
   * `p_devinette` vaut `1 / n!` et se calcule depuis CE nombre (D13). Sans lui, la
   * tentative est perdue en 500 (Q-I14).
   */
  readonly nbElements: number | null;
  readonly confusion: ConfusionObservee | null;
}

export interface EtatChrono {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapeChrono[];
  readonly vignettes: readonly VignetteChrono[];
  readonly competence: string;
  /** Clé = `IdVignette`, valeur = le numéro attribué, en base 1. */
  readonly acquis: Readonly<Record<string, string>>;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusChrono | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionChrono =
  | { readonly type: 'numeroter'; readonly vignette: IdVignette }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
