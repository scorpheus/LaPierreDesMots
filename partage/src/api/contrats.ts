/**
 * Types et chemins des routes HTTP — contrat § 3.3.
 *
 * Le client et le serveur lisent la même table de chemins : une route renommée d'un côté ne
 * compile plus de l'autre. `CHEMINS_API.motifs` porte la forme paramétrée attendue par
 * Fastify, `CHEMINS_API` la forme construite attendue par `fetch`.
 */

import type { Habillage } from '../moteurs/types.js';
import type { Exercice, Noeud } from '../contenu/types.js';
import type { NombreEtoiles, Tentative } from '../journal/types.js';
import type {
  CheminAsset,
  CodeMoteur,
  CodeRegion,
  Horodatage,
  IdNoeud,
  IdProfil,
} from '../identifiants.js';

/** L'avatar en calques paramétriques (v2 § 4.1). Les couleurs sont des hexadécimaux. */
export interface ConfigurationAvatar {
  readonly peau: string;
  readonly cheveux: string;
  readonly yeux: string;
  /** Code de coiffure, ex. `courte-ebouriffee`. */
  readonly coiffure: string;
  /** Code de morphologie, ex. `7-ans`. */
  readonly morphologie: string;
}

export interface Profil {
  readonly id: IdProfil;
  readonly prenom: string;
  readonly avatar: ConfigurationAvatar;
  /** Variante de palette du profil (v2 § 11) : deux frères ne voient pas le même monde. */
  readonly paletteVariante: CodeRegion;
  readonly creeLe: Horodatage;
  readonly dernierAccesLe: Horodatage;
}

/** Corps de `POST /api/profils`. Le serveur pose l'identifiant et les deux horodatages. */
export interface CreationProfil {
  readonly prenom: string;
  readonly avatar?: ConfigurationAvatar;
  readonly paletteVariante?: CodeRegion;
}

/** Une ligne de la projection `progression_noeud` (contrat § 6.2). */
export interface ProgressionNoeud {
  readonly noeud: IdNoeud;
  readonly etoiles: NombreEtoiles;
  readonly nbTentatives: number;
  readonly dernierLe: Horodatage;
}

/** Tout ce qu'il faut pour jouer un nœud, en une seule requête. */
export interface PaquetNoeud {
  readonly noeud: Noeud;
  readonly exercice: Exercice;
  readonly habillage: Habillage;
}

export interface ReponseTentative {
  readonly tentative: Tentative;
  /** Vrai si la clé d'idempotence était déjà connue : rien n'a été inséré (contrat § 6.3). */
  readonly deja: boolean;
  /** L'état de la progression après coup ; les étoiles ne décroissent jamais. */
  readonly progression: ProgressionNoeud;
}

export interface ReponseSante {
  readonly statut: 'ok';
  readonly version: string;
  readonly maintenant: Horodatage;
  readonly base: 'ouverte' | 'fermee';
  readonly moteurs: readonly CodeMoteur[];
}

export type CodeErreurApi =
  | 'requete-invalide'
  | 'introuvable'
  | 'conflit'
  | 'contenu-invalide'
  | 'erreur-interne';

/** Toute erreur de l'API répond ce corps, quel que soit le statut HTTP. */
export interface ErreurApi {
  readonly code: CodeErreurApi;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Les chemins des sept routes. `motifs` est la forme paramétrée pour l'enregistrement côté
 * serveur ; les fonctions construisent l'URL côté client, en encodant leurs arguments.
 */
export const CHEMINS_API = {
  sante: '/api/sante',
  profils: '/api/profils',
  profil: (id: IdProfil): string => `/api/profils/${encodeURIComponent(id)}`,
  progression: (id: IdProfil): string => `/api/profils/${encodeURIComponent(id)}/progression`,
  noeud: (id: IdNoeud): string => `/api/contenu/noeuds/${encodeURIComponent(id)}`,
  asset: (chemin: CheminAsset): string =>
    `/api/contenu/assets/${chemin.split('/').map(encodeURIComponent).join('/')}`,
  tentatives: '/api/tentatives',
  motifs: {
    sante: '/api/sante',
    profils: '/api/profils',
    profil: '/api/profils/:id',
    progression: '/api/profils/:id/progression',
    noeud: '/api/contenu/noeuds/:id',
    asset: '/api/contenu/assets/*',
    tentatives: '/api/tentatives',
  },
} as const;
