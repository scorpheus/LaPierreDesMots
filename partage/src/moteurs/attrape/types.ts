/**
 * Types du moteur `attrape` — lot L2-E.
 *
 * Toucher les bonnes cibles mobiles parmi des intrus. La mécanique n'a pas d'autre difficulté
 * que la LECTURE de l'étiquette : la trajectoire est déclarée par l'habillage, la cible fait
 * au moins 64 px et la tolérance est de 24 px (R16). On n'exerce jamais l'adresse.
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { FormeConsigne } from '../colorie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdCibleAttrape = string;

/**
 * Une cible qui passe. `bonne` dit si elle est à attraper.
 *
 * `confusionAvec` est **le champ qui empêche ce moteur d'être creux** : quand l'intrus est
 * une confusion connue de la cible (`bal` pour `bal`/`dal`), le contenu le déclare, et le
 * refus journalise une `ConfusionObservee` au lieu d'un simple compteur d'erreurs (D23).
 */
export interface CibleAttrape {
  readonly id: IdCibleAttrape;
  /** Le mot ou le graphème écrit sur la cible. Déchiffré, donc jamais animé (v2 § 9.3). */
  readonly libelle: string;
  readonly bonne: boolean;
  readonly asset: CheminAsset | null;
  /** Position de départ en coordonnées `viewBox`. Le mouvement appartient au rendu. */
  readonly depart: readonly [number, number];
  /** Taille de rendu en unités `viewBox`, contrôlée contre la règle des 64 px. */
  readonly taille: readonly [number, number];
  /** L'étiquette que cet intrus fait confondre, `null` s'il n'en fait confondre aucune. */
  readonly confusionAvec: string | null;
}

export interface ConsigneAttrape {
  readonly id: IdConsigne;
  readonly texte: string;
  /** F3 : l'affirmation qui vaut consigne survit au passage en jeu. */
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /** UNE consigne, PLUSIEURS cibles — même leçon que `cibles` en `colorie`. */
  readonly aAttraper: readonly IdCibleAttrape[];
  readonly motsCles: readonly string[];
}

export interface ContenuAttrape {
  readonly consignes: readonly ConsigneAttrape[];
  /** Toutes les cibles offertes, bonnes et intruses confondues. */
  readonly cibles: readonly CibleAttrape[];
  /** Compétence journalisée avec la confusion observée. */
  readonly competence: string;
}

export type MotifRefusAttrape =
  | 'cible-intruse' // l'enfant a lu de travers — la seule erreur de lecture
  | 'cible-hors-consigne' // bonne cible, mais pas celle de la consigne active
  | 'cible-deja-attrapee' // double-tap : un geste, pas un contresens
  | 'cible-inconnue'; // la cible n'existe pas dans le contenu

export interface RefusAttrape {
  readonly cible: IdCibleAttrape | null;
  readonly motif: MotifRefusAttrape;
  readonly instantMs: number;
}

export interface EtatEtapeAttrape {
  /** `identifiant`, et non `id` : c'est le nom qu'`EtapeGenerique` (L2-C) impose. */
  readonly identifiant: IdConsigne;
  readonly restantes: readonly IdCibleAttrape[];
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  /** R15 — le palier que l'enfant a RÉCLAMÉ. Seul lui compte dans le journal. */
  readonly aideDemandee: NiveauAide;
  readonly nbEcoutes: number;
  readonly debutMs: number;
  readonly finMs: number | null;
  readonly premiereActionMs: number | null;
  readonly derniereActionMs: number;
  readonly instantIndiceMs: number | null;
  readonly modeReponse: ModeReponse;
  /**
   * Toujours `null` : la `p_devinette` de ce mode est TABULÉE (D13), jamais calculée en
   * 1/n!. Le champ est REQUIS par `EtapeGenerique` — chaque moteur doit répondre, y compris
   * par `null` assumé (correctif A1, Q-I14).
   */
  readonly nbElements: number | null;
  readonly confusion: ConfusionObservee | null;
}

/**
 * L'état est **auto-suffisant** : il embarque le catalogue des cibles et la compétence.
 *
 * `reduire` ne reçoit pas le contenu (contrat v1 § 4.1). Le colorie a résolu ce point en
 * recopiant ses cibles dans l'état ; les onze moteurs de ce lot font pareil. Une fermeture
 * sur le contenu, ou un `WeakMap` indexé par l'état, marcherait en mémoire et **casserait en
 * silence** dès qu'un état est sérialisé — ce qui est exactement le mode de défaillance que
 * le projet cherche à éviter.
 */
export interface EtatAttrape {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapeAttrape[];
  /** Catalogue recopié du contenu à la création : la validation n'a besoin de rien d'autre. */
  readonly cibles: readonly CibleAttrape[];
  readonly competence: string;
  /**
   * Clé = `IdCibleAttrape`, valeur = `'attrapee'`. Une entrée = une cible prise, définitivement.
   * Le nom `acquis` est commun aux onze moteurs : c'est ce qui rend leur réducteur identique.
   */
  readonly acquis: Readonly<Record<string, string>>;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusAttrape | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionAttrape =
  | { readonly type: 'toucher'; readonly cible: IdCibleAttrape }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
