/**
 * Types du moteur `eclair` — lot L2-E.
 *
 * Un mot apparaît brièvement, puis il faut le retrouver parmi des voisins orthographiques.
 *
 * **C'est le moteur qui porte la latence de reconnaissance (D18)** : `premiereActionMs` moins
 * `finExpositionMs` est le seul chiffre du projet qui mesure la fluidité et non la justesse.
 * D18 en fait l'indicateur principal du dashboard parent ; il naît ici.
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { CouleurColoriage } from '../../palette.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { FormeConsigne } from '../colorie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdOptionEclair = string;

export interface OptionEclair {
  readonly id: IdOptionEclair;
  readonly libelle: string;
  readonly bonne: boolean;
  /** La forme que cette option fait confondre avec la bonne réponse, `null` sinon (D23). */
  readonly confusionAvec: string | null;
  /**
   * Couleur à MONTRER, quand l'option en désigne une — R11, sur retour de jeu du 2026-08-03.
   *
   * LE DÉFAUT QU'ELLE CORRIGE, mesuré sur le contenu livré : le mot montré en éclair fait cinq
   * lettres, et l'option à lire pour y répondre en faisait dix-sept.
   *
   *     mot flashé « rouge »  →  options « la luciole rouge », « la luciole grise », …
   *
   * L'exercice teste la lecture d'un mot d'un seul coup d'œil, et pour y répondre l'enfant
   * devait déchiffrer trois phrases plus longues que le mot. La charge de lecture était
   * TRIPLÉE sur l'exercice dont tout l'objet est de ne pas déchiffrer. Et la consigne — « touche
   * la luciole de la couleur que tu as lue » — promettait des lucioles, pas des phrases.
   *
   * Absente sur une option qui ne désigne aucune couleur : les quatre autres exercices `eclair`
   * proposent le mot nu (`bol`, `dos`, `banane`), ce qui est juste — on lit le mot, on retrouve
   * le mot. Rien n'y change.
   */
  readonly couleur?: CouleurColoriage;
}

export interface ConsigneEclair {
  readonly id: IdConsigne;
  /** Le mot montré en éclair. Il n'est PAS animé : le décor s'agite, le texte jamais. */
  readonly mot: string;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /**
   * Durée d'exposition. Elle est **déclarée par le contenu**, jamais en dur : c'est un
   * paramètre pédagogique, et D13 exige qu'il vive en données pour être recalibré.
   */
  readonly expositionMs: number;
  readonly options: readonly IdOptionEclair[];
  readonly reponse: IdOptionEclair;
  readonly motsCles: readonly string[];
}

export interface ContenuEclair {
  readonly consignes: readonly ConsigneEclair[];
  readonly options: readonly OptionEclair[];
  readonly competence: string;
}

export type MotifRefusEclair =
  | 'option-fausse'        // la seule erreur de lecture
  | 'option-hors-consigne' // l'option n'est pas offerte sur cette étape
  | 'option-deja-choisie'  // double-tap
  | 'option-inconnue';

export interface RefusEclair {
  readonly option: IdOptionEclair | null;
  readonly motif: MotifRefusEclair;
  readonly instantMs: number;
}

export interface EtatEtapeEclair {
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
   * Toujours `null` : la `p_devinette` de ce mode est TABULÉE (D13), jamais calculée en
   * 1/n!. Le champ est REQUIS par `EtapeGenerique` — chaque moteur doit répondre, y compris
   * par `null` assumé (correctif A1, Q-I14).
   */
  readonly nbElements: number | null;
  readonly confusion: ConfusionObservee | null;
}

export interface EtatEclair {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapeEclair[];
  readonly options: readonly OptionEclair[];
  readonly competence: string;
  /** Clé = `IdOptionEclair`, valeur = `'juste'`. */
  readonly acquis: Readonly<Record<string, string>>;
  /**
   * Instant où l'éclair a cessé d'être visible sur l'étape courante. Origine de la latence
   * de reconnaissance (D18). `null` tant que le mot est encore affiché.
   */
  readonly finExpositionMs: number | null;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusEclair | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionEclair =
  | { readonly type: 'repondre'; readonly option: IdOptionEclair }
  /** Fin de l'exposition, émise par le rendu. Elle FIXE l'origine de la latence. */
  | { readonly type: 'finExposition' }
  /** Revoir l'éclair. GRATUIT et sans limite, comme réécouter la consigne (R15). */
  | { readonly type: 'revoirEclair' }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
