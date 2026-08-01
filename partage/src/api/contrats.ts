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
  IdExercice,
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
 * Les chemins des **dix-neuf** routes : les 7 de la v1, plus les 12 du contrat des features
 * v2 § 5.3. `motifs` est la forme paramétrée pour l'enregistrement côté serveur ; les fonctions
 * construisent l'URL côté client, en encodant leurs arguments.
 *
 * **L2-H déclare TOUS les chemins, y compris ceux qu'il n'implante pas** (contrat § 5.1). Un
 * chemin déclaré ici et implanté ailleurs ne peut pas diverger d'un côté sans cesser de
 * compiler de l'autre — c'est toute la raison d'être de cette table unique.
 */
export const CHEMINS_API = {
  // ── les 7 de la v1 ──────────────────────────────────────────────────────────────────────
  sante: '/api/sante',
  profils: '/api/profils',
  profil: (id: IdProfil): string => `/api/profils/${encodeURIComponent(id)}`,
  progression: (id: IdProfil): string => `/api/profils/${encodeURIComponent(id)}/progression`,
  noeud: (id: IdNoeud): string => `/api/contenu/noeuds/${encodeURIComponent(id)}`,
  asset: (chemin: CheminAsset): string =>
    `/api/contenu/assets/${chemin.split('/').map(encodeURIComponent).join('/')}`,
  tentatives: '/api/tentatives',

  // ── lecture et typographie — implantées par L2-B ────────────────────────────────────────
  reglages: (id: IdProfil): string => `/api/profils/${encodeURIComponent(id)}/reglages`,
  essaiTypographie: (id: IdProfil): string =>
    `/api/profils/${encodeURIComponent(id)}/essai-typographie`,

  // ── pédagogie — implantées par L2-D ─────────────────────────────────────────────────────
  maitrise: (id: IdProfil): string => `/api/profils/${encodeURIComponent(id)}/maitrise`,
  revisions: (id: IdProfil): string => `/api/profils/${encodeURIComponent(id)}/revisions`,
  sortie: (id: IdProfil): string => `/api/profils/${encodeURIComponent(id)}/sortie`,

  // ── monde et campement — implantées par L2-F ────────────────────────────────────────────
  monde: (id: IdProfil): string => `/api/profils/${encodeURIComponent(id)}/monde`,
  campement: (id: IdProfil): string => `/api/profils/${encodeURIComponent(id)}/campement`,

  // ── zone parent — implantées par L2-H ───────────────────────────────────────────────────
  parentOuvrir: '/api/parent/ouvrir',
  parentDashboard: (profil: IdProfil): string =>
    `/api/parent/${encodeURIComponent(profil)}/dashboard`,
  /** `code` est un `CodeExport` de `parent/types.ts` ; le type y vit, pas ici (C1). */
  parentExport: (profil: IdProfil, code: string): string =>
    `/api/parent/${encodeURIComponent(profil)}/export/${encodeURIComponent(code)}`,
  parentRelecture: (exercice: IdExercice): string =>
    `/api/parent/relecture/${encodeURIComponent(exercice)}`,

  motifs: {
    sante: '/api/sante',
    profils: '/api/profils',
    profil: '/api/profils/:id',
    progression: '/api/profils/:id/progression',
    noeud: '/api/contenu/noeuds/:id',
    asset: '/api/contenu/assets/*',
    tentatives: '/api/tentatives',
    reglages: '/api/profils/:id/reglages',
    essaiTypographie: '/api/profils/:id/essai-typographie',
    maitrise: '/api/profils/:id/maitrise',
    revisions: '/api/profils/:id/revisions',
    sortie: '/api/profils/:id/sortie',
    monde: '/api/profils/:id/monde',
    campement: '/api/profils/:id/campement',
    parentOuvrir: '/api/parent/ouvrir',
    parentDashboard: '/api/parent/:profil/dashboard',
    parentExport: '/api/parent/:profil/export/:code',
    parentRelecture: '/api/parent/relecture/:exercice',
  },
} as const;

// L'en-tête du jeton parent, `OuvertureParent` et `DecisionRelecture` vivent dans
// `partage/src/parent/types.ts`, atteignable par le seul sous-chemin `@pierre/partage/parent`.
// Motif : C1 — le barillet racine n'accueille que des types, et `partage/src/index.ts`
// appartient à L2-D. Les poser ici obligerait un autre lot à les réexporter pour que le client
// les voie, et une frontière qui dépend d'un lot tiers est une frontière qui casse.
