/**
 * Types du moteur `phrase` — lot L2-E.
 *
 * Ordonner des étiquettes-mots pour reconstruire une phrase. L'ordre est **imposé** : la
 * syntaxe est justement ce qui s'exerce.
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { FormeConsigne } from '../colorie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdEtiquette = string;

export interface EtiquettePhrase {
  readonly id: IdEtiquette;
  /** Le mot écrit sur l'étiquette, ponctuation comprise. */
  readonly mot: string;
  /** Une étiquette offerte qui n'entre dans aucune phrase de l'exercice. */
  readonly intrus: boolean;
}

export interface ConsignePhrase {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /** La phrase attendue, pour l'aide vocale et le libellé a11y. */
  readonly phrase: string;
  /** Les étiquettes **dans l'ordre**. */
  readonly ordre: readonly IdEtiquette[];
  readonly motsCles: readonly string[];
}

export interface ContenuPhrase {
  readonly consignes: readonly ConsignePhrase[];
  readonly etiquettes: readonly EtiquettePhrase[];
  readonly competence: string;
}

export type MotifRefusPhrase =
  | 'etiquette-hors-ordre' // la bonne étiquette, mais pas à son rang
  | 'etiquette-intruse'
  | 'etiquette-deja-placee'
  | 'etiquette-inconnue';

export interface RefusPhrase {
  readonly etiquette: IdEtiquette | null;
  readonly motif: MotifRefusPhrase;
  readonly instantMs: number;
}

export interface EtatEtapePhrase {
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
   * Le nombre d'étiquettes-mots à ordonner. `modeReponse` vaut `'ordre'` : `p_devinette`
   * vaut `1 / n!` et se calcule depuis CE nombre (D13).
   *
   * C'est le champ dont l'absence faisait rendre 500 à `POST /api/tentatives` et perdait
   * la tentative entière sur le nœud `clairiere-05` — progression, étoiles et maîtrise
   * comprises, sans que rien ne se voie à l'écran (Q-I14).
   */
  readonly nbElements: number | null;
  readonly confusion: ConfusionObservee | null;
}

export interface EtatPhrase {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapePhrase[];
  readonly etiquettes: readonly EtiquettePhrase[];
  readonly competence: string;
  /** Clé = `IdEtiquette`, valeur = le rang occupé, en base 1. */
  readonly acquis: Readonly<Record<string, string>>;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusPhrase | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionPhrase =
  | { readonly type: 'placer'; readonly etiquette: IdEtiquette }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
