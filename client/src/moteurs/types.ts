// Contrat de rendu d'un moteur — contrat technique v1 § 4.4, reproduit à la lettre.
// C'est la seule chose que L-E importe de L-D (§ 11.3).
import type { ReactElement } from 'react';
import type {
  Alea,
  FournisseurAudio,
  FournisseurVoix,
  Habillage,
  Horloge,
  CodeMoteur
} from '@pierre/partage';

export interface ServicesJeu {
  readonly alea: Alea;
  readonly horloge: Horloge;
  readonly voix: FournisseurVoix;
  readonly audio: FournisseurAudio;
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
