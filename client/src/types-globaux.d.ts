// Déclaration globale de la surface de test — contrat technique v1 § 7.1, reproduit à la lettre.
// `SurfaceTest` ne contient que des types : rien n'en subsiste dans le bundle de production.
import type { SurfaceTest } from '@pierre/partage';

declare global {
  interface Window {
    __test?: SurfaceTest;
  }
}

export {};
