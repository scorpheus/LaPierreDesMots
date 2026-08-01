/**
 * Types du moteur `grave` — lot L2-E.
 *
 * Compléter un mot lettre par lettre (niveau 6 du corpus : phrase à trou amorcée).
 *
 * **C'est le moteur où les confusions miroir se voient le mieux** : l'enfant qui grave `d`
 * là où il faut `b` produit exactement la donnée que D23 veut mesurer, et `axeDeLaPaire` la
 * qualifie sans supposition.
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { FormeConsigne } from '../colorie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdTrou = string;

export interface TrouGrave {
  readonly id: IdTrou;
  /** Rang du caractère manquant dans `mot`, à partir de 0. */
  readonly position: number;
  /** La lettre ou le graphème attendu. Plusieurs caractères sont permis : `ou`, `an`. */
  readonly attendu: string;
}

export interface ConsigneGrave {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /** Le mot complet. L'affichage masque les positions des trous. */
  readonly mot: string;
  /** Les trous **dans l'ordre de gravure**, de gauche à droite. */
  readonly trous: readonly TrouGrave[];
  readonly motsCles: readonly string[];
}

export interface ContenuGrave {
  readonly consignes: readonly ConsigneGrave[];
  /**
   * Les touches offertes. Un clavier **restreint** : on ne demande jamais de chercher une
   * lettre dans un alphabet complet, ce serait une épreuve de motricité, pas de lecture.
   */
  readonly clavier: readonly string[];
  readonly competence: string;
}

export type MotifRefusGrave =
  | 'lettre-fausse' // la seule erreur de lecture — et celle qui porte l'axe (D23)
  | 'trous-remplis'
  | 'lettre-hors-clavier';

export interface RefusGrave {
  readonly lettre: string | null;
  readonly motif: MotifRefusGrave;
  readonly instantMs: number;
}

export interface EtatEtapeGrave {
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
  readonly confusion: ConfusionObservee | null;
}

export interface EtatGrave {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapeGrave[];
  /** Les trous de toutes les consignes, à plat : la validation n'a besoin de rien d'autre. */
  readonly trous: readonly TrouGrave[];
  readonly clavier: readonly string[];
  readonly competence: string;
  /** Clé = `IdTrou`, valeur = la lettre gravée. Une gravure est définitive. */
  readonly acquis: Readonly<Record<string, string>>;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusGrave | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionGrave =
  | { readonly type: 'graver'; readonly lettre: string }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
