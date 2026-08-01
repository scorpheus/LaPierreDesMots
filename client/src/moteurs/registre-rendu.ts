// Registre des rendus de moteur — contrat v1 § 4.5, étendu par contrat-features-v2 § 3.5.3.
//
// **Le registre passe de 1 à 14 entrées.** Il porte l'une des deux inversions de dépendance
// assumées (§ 5.2, point 1) : il importe `renduPlace` et `renduTrace`, écrits par L2-C. Il ne
// compile pas tant que les quatorze n'existent pas, et c'est voulu — l'oubli d'un
// enregistrement ne compile pas, au lieu de ne se voir qu'en jeu, devant l'enfant.
//
// La promesse « zéro ligne de code par habillage » (v2 § 7) se vérifie ICI : le registre est
// indexé par MOTEUR, jamais par habillage. Les 35 habillages de cette campagne n'ajoutent
// aucune entrée à ce fichier.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// DÉFAUT 2 DU § 1.5 — SOLDÉ POUR CE FICHIER.
//
// La version v1 écrivait `colorie: renduColorie as unknown as MoteurRenduQuelconque`, avec le
// commentaire « le contrat gèle le nom mais pas les membres ». Le cast était inutile : les
// membres sont désormais visibles, et `MoteurRenduQuelconque` vaut `MoteurRendu<never, never,
// never>` PRÉCISÉMENT pour que l'assignation directe fonctionne. `types.ts` le dit déjà en
// toutes lettres : « avec `never`, les propriétés `contenu` et `etat` du type cible sont
// assignables à tout, et `emettre` reste bivariante parce qu'elle est déclarée en méthode ».
//
// Mesure du lot :
//   $ grep -c "as unknown as" client/src/moteurs/registre-rendu.ts
//   0
// ─────────────────────────────────────────────────────────────────────────────────────────
import type { CodeMoteur } from '@pierre/partage';
import { renduAssemble } from './assemble/index.js';
import { renduAttrape } from './attrape/index.js';
import { renduChemin } from './chemin/index.js';
import { renduChrono } from './chrono/index.js';
import { renduColorie } from './colorie/index.js';
import { renduEclair } from './eclair/index.js';
import { renduGrave } from './grave/index.js';
import { renduHistoire } from './histoire/index.js';
import { renduLibre } from './libre/index.js';
import { renduPaires } from './paires/index.js';
import { renduPhrase } from './phrase/index.js';
import { renduPlace } from './place/index.js';
import { renduTri } from './tri/index.js';
import { renduTrace } from './trace/index.js';
import type { MoteurRenduQuelconque } from './types.js';

export const registreRendu: Readonly<Record<string, MoteurRenduQuelconque>> = {
  attrape: renduAttrape,
  tri: renduTri,
  assemble: renduAssemble,
  chemin: renduChemin,
  eclair: renduEclair,
  paires: renduPaires,
  phrase: renduPhrase,
  histoire: renduHistoire,
  chrono: renduChrono,
  grave: renduGrave,
  colorie: renduColorie,
  libre: renduLibre,
  place: renduPlace,
  trace: renduTrace,
};

/**
 * Lève si le moteur n'a pas de rendu déclaré.
 *
 * Erreur native volontaire : le contrat v1 § 4.5 ne prescrit pas `ErreurPierre` ici, et ce
 * chemin est un défaut de programmation (un moteur enregistré côté logique sans rendu), pas
 * une condition de jeu. Il n'atteint jamais l'enfant : `test:contenu` contrôle le couple
 * moteur/habillage avant le lancement (contrôle 4).
 */
export function obtenirRendu(code: CodeMoteur): MoteurRenduQuelconque {
  const rendu = registreRendu[code];
  if (rendu === undefined) {
    throw new Error(`Aucun rendu déclaré pour le moteur « ${String(code)} ».`);
  }
  return rendu;
}
