/**
 * Le catalogue des moteurs — contrat § 4.3.
 *
 * **Inversion de dépendance assumée** (contrat § 11.4) : ce fichier appartient au lot L-B et
 * importe `moteurColorie`, écrit par le lot L-E. L'alternative — un `enregistrerMoteur`
 * dispersé dans chaque racine de composition — ferait de l'oubli une panne à l'exécution ;
 * ici, l'oubli ne compile pas.
 */

import { moteurColorie } from './colorie/moteur.js';
import { enregistrerMoteur } from './registre.js';
import type { MoteurQuelconque } from './types.js';

export const MOTEURS: readonly MoteurQuelconque[] = [moteurColorie];

/** Idempotent. Appelé par la racine de composition du client, du serveur et de chaque test. */
export function initialiserRegistreMoteurs(): void {
  for (const moteur of MOTEURS) {
    enregistrerMoteur(moteur);
  }
}
