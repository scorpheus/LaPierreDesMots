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
  /**
   * L'ordre dans lequel les blocs DE CETTE ÉTAPE apparaissent dans le plateau — R32/R44.
   *
   * `EtatAssemble.blocs` porte le catalogue ENTIER de l'exercice, mélangé une seule fois à la
   * création de l'état (§ types de `EtatAssemble`) ; ce champ-ci en est la projection propre à
   * cette étape — les identifiants de `solution`, dans l'ordre où ils apparaissent dans le
   * plateau mélangé. Mesuré : le premier bloc utile de chaque mot était toujours le premier
   * bloc du plateau — 95 consignes sur 95 gagnées en tapant de gauche à droite. Le mélange est
   * tiré par `Alea`, jamais rejoué (reproductible à la graine près).
   *
   * Déclaré AVANT `restantes` : le garde Q4 (`tests/unitaires/melange-des-reponses.test.ts`)
   * retient le PREMIER tableau d'identifiants de `Object.values(etatEtape)` dont le contenu
   * trié égale celui des blocs attendus. `restantes` vaut `[...solution]` à la création — il
   * satisferait aussi ce critère, mais il n'est pas mélangé.
   */
  readonly ordreAffichage: readonly IdBloc[];
  /** Ce qu'il reste à faire sur cette étape. Vide = étape close. */
  readonly restantes: readonly string[];
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
  /**
   * Le catalogue de blocs de l'exercice, dans l'ordre du PLATEAU — R32/R44. Mélangé une seule
   * fois par `Alea` à la création de l'état (jamais au rendu), donc reproductible à la graine
   * près. Le client rend ce champ, jamais `contenu.blocs` qui liste chaque mot dans l'ordre de
   * sa solution.
   */
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
