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

export interface EtatPaires {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapePaires[];
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
