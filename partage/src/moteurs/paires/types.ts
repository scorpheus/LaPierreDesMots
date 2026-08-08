/**
 * Types du moteur `paires` — lot L2-E.
 *
 * Appariement mot / image, façon memory. Deux cartes retournées : soit elles vont ensemble,
 * soit elles se retournent sans bruit et sans reproche. **Les cartes déjà appariées ne se
 * reprennent jamais** — c'est R14 appliquée à la mécanique elle-même.
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { FormeConsigne } from '../colorie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdCarte = string;
export type IdPaire = string;

export type FaceCarte = 'mot' | 'image';

export interface CartePaires {
  readonly id: IdCarte;
  readonly libelle: string;
  readonly face: FaceCarte;
  readonly asset: CheminAsset | null;
  /** Les deux cartes d'une même paire portent la même valeur ici. */
  readonly paire: IdPaire;
}

export interface ConsignePaires {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /** Les paires à reconstituer sur cette étape. */
  readonly aApparier: readonly IdPaire[];
  readonly motsCles: readonly string[];
}

export interface ContenuPaires {
  readonly consignes: readonly ConsignePaires[];
  readonly cartes: readonly CartePaires[];
  readonly competence: string;
}

export type MotifRefusPaires =
  | 'paire-fausse'         // les deux cartes ne vont pas ensemble — erreur de lecture
  | 'paire-hors-consigne'  // paire juste, mais pas demandée sur cette étape
  | 'carte-deja-appariee'  // un acquis ne se reprend jamais (R14)
  | 'meme-carte'           // l'enfant a retapé la carte déjà retournée : un geste
  | 'carte-inconnue';

export interface RefusPaires {
  readonly carte: IdCarte | null;
  readonly motif: MotifRefusPaires;
  readonly instantMs: number;
}

export interface EtatEtapePaires {
  /** `identifiant`, et non `id` : c'est le nom qu'`EtapeGenerique` (L2-C) impose. */
  readonly identifiant: IdConsigne;
  /**
   * Les paires DE CETTE ÉTAPE, dans l'ordre où elles se rencontrent en scannant le plateau
   * mélangé (`EtatPaires.cartes`) de gauche à droite — R32/R44.
   *
   * Les cartes étaient rangées deux par deux, `mot-X · image-X`, exactement dans l'ordre
   * d'`aApparier` : retourner les deux premières cartes visibles complétait toujours LA BONNE
   * paire. Mesuré : 130 consignes sur 130. Ce champ ne pilote aucune règle — `paires` n'impose
   * aucun ordre de complétion, une paire quelconque de `restantes` est acceptée à tout moment
   * (`validation.ts`) — il ne fait que PROJETER, pour cette étape, l'ordre réel du plateau
   * mélangé une seule fois à la création de l'état, par `Alea`.
   *
   * Déclaré AVANT `restantes` : le garde Q4 (`tests/unitaires/melange-des-reponses.test.ts`)
   * retient le PREMIER tableau d'identifiants de `Object.values(etatEtape)` dont le contenu
   * trié égale celui des paires attendues. `restantes` vaut `[...aApparier]` à la création — il
   * satisferait aussi ce critère, mais il n'est pas mélangé.
   */
  readonly ordreAffichage: readonly IdPaire[];
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
   * Le nombre de paires à reconstituer sur cette étape. `modeReponse` vaut
   * `'appariement'` : `p_devinette` vaut `1 / n!` et se calcule depuis CE nombre (D13).
   *
   * Le schéma admet `minItems: 1`, et une paire unique donnerait `n = 1`, sous le plancher
   * de `pDevinette`. Ce cas est déjà borné EN AVAL — `journaliserEtapes` écrit
   * `Math.max(2, n)` et les deux chemins du BKT relisent le journal — donc la valeur réelle
   * part telle quelle d'ici, sans second barème inventé dans le moteur.
   */
  readonly nbElements: number | null;
  readonly confusion: ConfusionObservee | null;
}

export interface EtatPaires {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapePaires[];
  /**
   * Le catalogue de cartes de l'exercice, dans l'ordre du PLATEAU — R32/R44. Mélangé une seule
   * fois par `Alea` à la création de l'état (jamais au rendu), donc reproductible à la graine
   * près. Le client rend ce champ, jamais `contenu.cartes` qui range les paires côte à côte.
   */
  readonly cartes: readonly CartePaires[];
  readonly competence: string;
  /** Clé = `IdPaire`, valeur = `'appariee'`. Une paire faite est faite (R14). */
  readonly acquis: Readonly<Record<string, string>>;
  /** La première carte retournée. Retourner la première ne coûte rien et ne juge rien. */
  readonly carteRetournee: IdCarte | null;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusPaires | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionPaires =
  | { readonly type: 'retourner'; readonly carte: IdCarte }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
