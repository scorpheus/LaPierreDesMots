/**
 * Types du moteur `assemble` — lot L2-E.
 *
 * Faire glisser des blocs-syllabes pour former un mot. L'ordre est **imposé** : c'est la
 * syllabation qui s'exerce, et « ta-pis » n'est pas « pis-ta ».
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { FormeConsigne } from '../colorie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdBloc = string;

export interface BlocSyllabe {
  readonly id: IdBloc;
  /** La syllabe écrite sur le bloc. */
  readonly libelle: string;
  /** Un bloc offert mais qui n'entre dans aucun mot de l'exercice. */
  readonly intrus: boolean;
  /** La syllabe que ce bloc fait confondre, `null` sinon (D23). */
  readonly confusionAvec: string | null;
}

export interface ConsigneAssemble {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /** Le mot à former. Sert à l'aide vocale et au libellé a11y. */
  readonly mot: string;
  /** Les blocs **dans l'ordre**. C'est la solution, et l'ordre en fait partie. */
  readonly solution: readonly IdBloc[];
  readonly motsCles: readonly string[];
}

export interface ContenuAssemble {
  readonly consignes: readonly ConsigneAssemble[];
  readonly blocs: readonly BlocSyllabe[];
  readonly competence: string;
}

export type MotifRefusAssemble =
  | 'bloc-hors-ordre' // le bon bloc, mais pas à son rang — erreur de lecture
  | 'bloc-intrus'     // le bloc n'appartient à aucun mot de l'exercice
  | 'bloc-deja-pose'
  | 'bloc-inconnu';

export interface RefusAssemble {
  readonly bloc: IdBloc | null;
  readonly motif: MotifRefusAssemble;
  readonly instantMs: number;
}

export interface EtatEtapeAssemble {
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
   * Le nombre de blocs à ordonner. `modeReponse` vaut `'ordre'` : `p_devinette` vaut
   * `1 / n!` et se calcule depuis CE nombre (D13). Sans lui, `pDevinette` lève, la
   * transaction du serveur est annulée et **la tentative est perdue** (Q-I14).
   */
  readonly nbElements: number | null;
  readonly confusion: ConfusionObservee | null;
}

export interface EtatAssemble {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapeAssemble[];
  readonly blocs: readonly BlocSyllabe[];
  readonly competence: string;
  /** Clé = `IdBloc`, valeur = le rang occupé, en base 1. */
  readonly acquis: Readonly<Record<string, string>>;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusAssemble | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionAssemble =
  | { readonly type: 'poser'; readonly bloc: IdBloc }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
