/**
 * Types du moteur `tri` — lot L2-E.
 *
 * Ranger des éléments dans 2 ou 3 réceptacles. Le réceptacle porte un CRITÈRE écrit
 * (« les mots où j'entends [u] ») : c'est le critère qui se déchiffre, pas l'élément.
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { FormeConsigne } from '../colorie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdElementTri = string;
export type IdReceptacle = string;

export interface ReceptacleTri {
  readonly id: IdReceptacle;
  readonly libelle: string;
  /** Le critère écrit sur le réceptacle. C'est LUI que l'enfant déchiffre. */
  readonly critere: string;
  /** Polygone de dépôt en coordonnées `viewBox`, au moins un carré de 64 px (R16). */
  readonly zone: readonly (readonly [number, number])[];
}

export interface ElementTri {
  readonly id: IdElementTri;
  readonly libelle: string;
  readonly asset: CheminAsset | null;
  readonly receptacleAttendu: IdReceptacle;
  /**
   * Ce que l'enfant lit quand il se trompe sur cet élément — « dal » pour « bal ».
   * Sans ce champ, un mauvais rangement ne serait qu'un compteur ; avec lui, il devient une
   * `ConfusionObservee` portant son axe, donc une ligne du top 10 du dashboard (D23).
   */
  readonly confusionAvec: string | null;
}

export interface ConsigneTri {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /** UNE consigne, PLUSIEURS éléments à ranger — même leçon que `cibles` en `colorie`. */
  readonly aRanger: readonly IdElementTri[];
  readonly motsCles: readonly string[];
}

export interface ContenuTri {
  readonly consignes: readonly ConsigneTri[];
  readonly receptacles: readonly ReceptacleTri[];
  readonly elements: readonly ElementTri[];
  readonly competence: string;
}

export type MotifRefusTri =
  | 'mauvais-receptacle'    // la seule erreur de lecture
  | 'element-hors-consigne' // bonne lecture, mauvais moment
  | 'element-deja-range'    // double-tap : un geste, pas un contresens
  | 'element-inconnu'
  | 'receptacle-inconnu';

export interface RefusTri {
  readonly element: IdElementTri | null;
  readonly receptacle: IdReceptacle | null;
  readonly motif: MotifRefusTri;
  readonly instantMs: number;
}

export interface EtatEtapeTri {
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

/**
 * L'état est **auto-suffisant** : il embarque le catalogue, comme les dix autres moteurs de
 * ce lot. `reduire` ne reçoit pas le contenu (contrat v1 § 4.1) et un état sérialisé doit
 * rester jouable — une fermeture ou un `WeakMap` casserait en silence.
 */
export interface EtatTri {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapeTri[];
  readonly receptacles: readonly ReceptacleTri[];
  readonly elements: readonly ElementTri[];
  readonly competence: string;
  /** Clé = `IdElementTri`, valeur = `IdReceptacle`. Un rangement est définitif. */
  readonly acquis: Readonly<Record<string, string>>;
  readonly elementSaisi: IdElementTri | null;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusTri | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionTri =
  | { readonly type: 'saisir'; readonly element: IdElementTri }
  | { readonly type: 'deposer'; readonly element: IdElementTri; readonly receptacle: IdReceptacle }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
