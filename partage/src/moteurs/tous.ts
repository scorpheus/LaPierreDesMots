/**
 * Le catalogue des moteurs — contrat v1 § 4.3, étendu par contrat-features-v2 § 3.5.3.
 *
 * **Le catalogue passe de 1 à 14.** C'était le seul chiffre du § 1.3 qui disait « néant » sur
 * la promesse de variété : « `CodeMoteur` déclare les 13 ; `MOTEURS` en contient un ».
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * ⚠ DÉFAUT DU CONTRAT GELÉ — **quatorze, pas treize.** SOLDÉ à l'intégration.
 *
 * Le contrat v2 § 3.3 fait écrire `trace` par L2-C, et son § 10.2 compte 13 `moteur.ts`
 * NEUFS, `colorie` non compris : le total réel est de quatorze. Or `'trace'` ne figurait ni
 * dans l'union `CodeMoteur` de `partage/src/identifiants.ts`, ni dans l'énumération de
 * `contenu/schemas/exercice.schema.json` — deux fichiers qu'aucun lot ne possédait au § 3.
 * L2-C et L2-E l'ont signalé et posé deux transtypages provisoires plutôt que de modifier
 * un fichier hors de leur lot.
 *
 * L'intégration a ajouté `'trace'` aux deux énumérations et retiré les deux transtypages.
 * Mesuré après correction, commandes et sorties citées :
 *
 *   $ grep -n "| 'trace';" partage/src/identifiants.ts
 *   91:  | 'trace';
 *
 *   $ grep -c '"trace"' contenu/schemas/exercice.schema.json
 *   1
 *
 *   $ grep -n "^  code:" partage/src/moteurs/trace/moteur.ts client/src/moteurs/trace/index.ts
 *   partage/src/moteurs/trace/moteur.ts:395:  code: 'trace',
 *   client/src/moteurs/trace/index.ts:14:  code: 'trace',
 *   (plus aucun `as` : les deux transtypages provisoires ont disparu)
 * ────────────────────────────────────────────────────────────────────────────────────────
 *
 * **Inversion de dépendance assumée** (contrat v1 § 11.4, contrat v2 § 5.2, point 1) : ce
 * fichier appartient à L2-E et importe `moteurColorie` (L-E v1), `moteurPlace` et
 * `moteurTrace` (L2-C). Il ne compile pas tant que les treize n'existent pas — et c'est
 * exactement ce qu'on veut : **l'oubli d'enregistrer un moteur ne compile pas**, au lieu de
 * ne se voir qu'à l'exécution, devant l'enfant, sur un écran vide.
 *
 * L'ordre de la liste est celui de `CodeMoteur` dans `identifiants.ts`. Il n'a aucun effet
 * fonctionnel — `enregistrerMoteur` indexe par code — mais le garder aligné rend la
 * comparaison des deux listes visuelle, donc vérifiable en revue sans outil.
 */

import { moteurAssemble } from './assemble/moteur.js';
import { moteurAttrape } from './attrape/moteur.js';
import { moteurChemin } from './chemin/moteur.js';
import { moteurChrono } from './chrono/moteur.js';
import { moteurColorie } from './colorie/moteur.js';
import { moteurEclair } from './eclair/moteur.js';
import { moteurGrave } from './grave/moteur.js';
import { moteurHistoire } from './histoire/moteur.js';
import { moteurLibre } from './libre/moteur.js';
import { moteurPaires } from './paires/moteur.js';
import { moteurPhrase } from './phrase/moteur.js';
import { moteurPlace } from './place/moteur.js';
import { moteurTri } from './tri/moteur.js';
import { moteurTrace } from './trace/moteur.js';
import { enregistrerMoteur } from './registre.js';
import type { MoteurQuelconque } from './types.js';

export const MOTEURS: readonly MoteurQuelconque[] = [
  moteurAttrape,
  moteurTri,
  moteurAssemble,
  moteurChemin,
  moteurEclair,
  moteurPaires,
  moteurPhrase,
  moteurHistoire,
  moteurChrono,
  moteurGrave,
  moteurColorie,
  moteurLibre,
  moteurPlace,
  moteurTrace,
];

/** Idempotent. Appelé par la racine de composition du client, du serveur et de chaque test. */
export function initialiserRegistreMoteurs(): void {
  for (const moteur of MOTEURS) {
    enregistrerMoteur(moteur);
  }
}
