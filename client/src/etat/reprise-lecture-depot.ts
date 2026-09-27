import type { IdProfil } from '@pierre/partage';
import type { InstantaneRepriseLecture } from '@pierre/partage/reprise-lecture';

/** Port vers SQLite. Le transport HTTP ou local est branché par la racine de composition. */
export interface DepotRepriseLecture {
  lire(profil: IdProfil): Promise<InstantaneRepriseLecture | null>;
  /** Compare `revisionAttendue` dans la même transaction que l'écriture. */
  ecrire(instantane: InstantaneRepriseLecture, revisionAttendue: number | null): Promise<number>;
  /** Efface uniquement la génération et la révision observées. */
  effacer(profil: IdProfil, generationProgression: number, revisionAttendue: number): Promise<void>;
}
