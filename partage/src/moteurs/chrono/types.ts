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
  /**
   * L'ordre dans lequel les vignettes DE CETTE ÉTAPE apparaissent dans le plateau — R32/R44.
   *
   * `EtatChrono.vignettes` porte le catalogue ENTIER de l'exercice, mélangé une seule fois à
   * la création de l'état (§ types de `EtatChrono`) ; ce champ-ci en est la projection propre
   * à cette étape — les identifiants de `ordre`, dans l'ordre où ils apparaissent dans le
   * plateau mélangé. Mesuré : les vignettes étaient listées dans l'ordre du récit, et taper de
   * gauche à droite numérotait juste à 100 %. Le mélange est tiré par `Alea`, jamais rejoué
   * (reproductible à la graine près).
   *
   * Déclaré AVANT `restantes` : le garde Q4 (`tests/unitaires/melange-des-reponses.test.ts`)
   * retient le PREMIER tableau d'identifiants de `Object.values(etatEtape)` dont le contenu
   * trié égale celui des vignettes attendues. `restantes` vaut `[...ordre]` à la création — il
   * satisferait aussi ce critère, mais il n'est pas mélangé.
   */
  readonly ordreAffichage: readonly IdVignette[];
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
  /**
   * Le catalogue de vignettes de l'exercice, dans l'ordre du PLATEAU — R32/R44. Mélangé une
   * seule fois par `Alea` à la création de l'état (jamais au rendu), donc reproductible à la
   * graine près. Le client rend ce champ, jamais `contenu.vignettes` qui reste dans l'ordre du
   * récit.
   */
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
