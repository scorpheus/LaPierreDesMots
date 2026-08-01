/**
 * La surface `window.__test` — contrat § 7.1.
 *
 * **Ce fichier ne contient QUE des `export type` et des `export interface`.** Aucune valeur,
 * aucune constante, aucune chaîne : les types sont effacés à la compilation, il n'en subsiste
 * rien dans le bundle, même quand le barillet les réexporte. Une seule `export const` ici et
 * `scripts/verifier-bundle.mjs` échouerait sur son propre outillage (contrat § 7.3).
 */

import type { CodeMoteur, CodeRegion, IdNoeud, IdProfil } from '../identifiants.js';
import type { NombreEtoiles } from '../journal/types.js';
import type { AideProposee, ProgressionMoteur } from '../moteurs/types.js';
import type { ConfigurationAvatar } from '../api/contrats.js';

export type CodeEcran = 'chargement' | 'profils' | 'carte' | 'noeud' | 'recompense';

export interface EntreeProgressionTest {
  readonly noeud: IdNoeud;
  readonly etoiles: NombreEtoiles;
}

export interface FixtureProfil {
  readonly id: IdProfil;
  readonly prenom: string;
  readonly avatar: ConfigurationAvatar;
  readonly paletteVariante: CodeRegion;
  readonly progression: readonly EntreeProgressionTest[];
}

export interface EtatTestSerialisable {
  readonly ecran: CodeEcran;
  readonly profil: IdProfil | null;
  readonly noeud: IdNoeud | null;
  readonly moteur: CodeMoteur | null;
  readonly progression: ProgressionMoteur | null;
  /** État interne du moteur, tel quel. `EtatColorie` en v1. */
  readonly etatMoteur: unknown;
  readonly aide: AideProposee | null;
  readonly animationsDesactivees: boolean;
  readonly graine: number;
}

export interface SurfaceTest {
  chargerProfil(fixture: FixtureProfil): Promise<void>;
  allerAuNoeud(id: IdNoeud): Promise<void>;
  /** L'action est celle du moteur monté. `ActionColorie` en v1. */
  repondre(action: unknown): Promise<void>;
  etat(): EtatTestSerialisable;
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
