// Contrat de rendu d'un moteur — contrat technique v1 § 4.4, reproduit à la lettre.
// C'est la seule chose que L-E importe de L-D (§ 11.3).
import type { ReactElement } from 'react';
import type {
  Alea,
  FournisseurAudio,
  FournisseurHaptique,
  FournisseurVoix,
  Habillage,
  Horloge,
  CodeMoteur
} from '@pierre/partage';
import type { RetourSensoriel } from '../gamefeel/retour.js';

/**
 * Les services injectés dans tout moteur — contrat des features v2 § 4.1 (lot L2-A).
 *
 * Deux membres s'ajoutent aux quatre du socle v1, et la raison est une règle de conception,
 * pas une commodité : **un moteur ne joue jamais un son directement**. Il appelle `retour`.
 * Sans quoi la dégradation par `prefers-reduced-motion` serait à réécrire dans chacun des
 * treize moteurs, et un seul oubli suffirait à la casser (v2 § 8).
 *
 * `haptique` est exposé pour les rares cas où un moteur veut une vibration hors dépôt — une
 * apparition, par exemple. Le chemin normal reste `retour`.
 */
export interface ServicesJeu {
  readonly alea: Alea;
  readonly horloge: Horloge;
  readonly voix: FournisseurVoix;
  readonly audio: FournisseurAudio;
  readonly haptique: FournisseurHaptique;
  readonly retour: RetourSensoriel;
}

export interface ProprietesMoteur<C, E, A> {
  readonly contenu: C;
  readonly habillage: Habillage;
  readonly etat: E;
  /** Méthode, pas propriété-fonction : c'est ce qui rend `MoteurRenduQuelconque` assignable. */
  emettre(action: A): void;
  readonly services: ServicesJeu;
  readonly animationsDesactivees: boolean;
}

export type ComposantMoteur<C, E, A> = (
  proprietes: ProprietesMoteur<C, E, A>
) => ReactElement | null;

export interface MoteurRendu<C, E, A> {
  readonly code: CodeMoteur;
  readonly Composant: ComposantMoteur<C, E, A>;
}

/**
 * `never` sur les trois paramètres, et non `unknown` : `ComposantMoteur` est un type de
 * fonction autonome, donc contravariant sous `strictFunctionTypes`. Avec `never`, les
 * propriétés `contenu` et `etat` du type cible sont assignables à tout, et `emettre`
 * reste bivariante parce qu'elle est déclarée en méthode.
 */
export type MoteurRenduQuelconque = MoteurRendu<never, never, never>;
