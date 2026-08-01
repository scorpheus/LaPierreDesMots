/**
 * Les paires miroir et leurs deux axes — lot L2-D, sous-chemin `@pierre/partage/miroir`.
 *
 * Les quatre paires, **et leurs deux axes**. Cette table est la seule autorité du dépôt sur le
 * sujet ; aucun contenu, aucun moteur, aucun écran ne redéclare une paire de son côté.
 *
 * `b`↔`d` et `p`↔`q` sont des miroirs GAUCHE-DROITE.
 * `b`↔`p` et `d`↔`q` sont des miroirs HAUT-BAS.
 *
 * Ce fichier a son propre sous-chemin parce qu'il pèse ~1 Ko et que le client en a besoin, là
 * où `bkt`, `leitner` et `selecteur` sont serveur (C1, budget de bundle). Il n'importe donc
 * **rien d'autre que ses types** : lui faire tirer `parametres.ts` ou `bkt.ts` ferait entrer
 * tout le moteur pédagogique dans le bundle client.
 *
 * D23, conséquence 1, en toutes lettres : « Ne jamais traiter `b/d/p/q` en bloc : ce sont deux
 * mécanismes différents, et un enfant peut être gêné par un axe et pas par l'autre. »
 */

import type { AxeMiroir, PaireMiroir } from './types.js';

/**
 * Les quatre paires de D23.
 *
 * `b`↔`q` et `d`↔`p` n'y figurent volontairement pas : ce sont des rotations de 180°, pas des
 * miroirs — elles combinent les deux axes et ne sont donc imputables à aucun. Les journaliser
 * sous un axe unique reviendrait à inventer une information que le geste ne porte pas.
 */
export const PAIRES_MIROIR: readonly PaireMiroir[] = Object.freeze([
  Object.freeze({ a: 'b', b: 'd', axe: 'gauche-droite' as const }),
  Object.freeze({ a: 'p', b: 'q', axe: 'gauche-droite' as const }),
  Object.freeze({ a: 'b', b: 'p', axe: 'haut-bas' as const }),
  Object.freeze({ a: 'd', b: 'q', axe: 'haut-bas' as const }),
]);

/**
 * `null` si les deux lettres ne forment pas une paire miroir connue.
 *
 * Symétrique par construction : c'est la comparaison qui est faite dans les deux sens, pas la
 * table qui est doublée. Une lettre confondue avec elle-même n'est pas une confusion : elle
 * rend `null`, sans quoi le top 10 du dashboard compterait des lignes vides.
 */
export function axeDeLaPaire(a: string, b: string): AxeMiroir | null {
  if (a === b) {
    return null;
  }
  for (const paire of PAIRES_MIROIR) {
    if ((paire.a === a && paire.b === b) || (paire.a === b && paire.b === a)) {
      return paire.axe;
    }
  }
  return null;
}

/** Les paires d'un axe donné. Sert à composer un exercice qui ne travaille QU'UN axe (D23). */
export function pairesDeLAxe(axe: AxeMiroir): readonly PaireMiroir[] {
  return PAIRES_MIROIR.filter((paire) => paire.axe === axe);
}
