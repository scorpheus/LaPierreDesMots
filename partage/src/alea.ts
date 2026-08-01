/**
 * Aléatoire injecté — annexe T § 2.1.
 *
 * Un seul générateur, déterministe, instancié avec une graine. Aucun autre fichier du dépôt
 * n'a le droit d'appeler `Math.random` : une règle ESLint (lot L-A) le refuse partout ailleurs.
 * C'est ce qui rend le rejeu des journaux (annexe T § T2) interprétable.
 *
 * L'algorithme est **mulberry32** : 32 bits d'état, une seule multiplication imprécise évitée
 * grâce à `Math.imul`, période 2^32. Il tient dans dix lignes, se reproduit à l'identique dans
 * n'importe quel moteur JavaScript, et c'est exactement ce que l'annexe T demande.
 */

import { ErreurPierre } from './erreurs.js';

/**
 * Variable d'environnement qui force la graine en test (annexe T § 2.1, contrat § 1.1).
 * Volontairement **non exportée** : le contrat § 11.1 n'ouvre que `creerAlea` et
 * `graineParDefaut`, et un symbole de plus fausserait le compte de la surface.
 */
const VARIABLE_GRAINE = 'ATELIER_GRAINE';

export interface Alea {
  /** La graine effectivement utilisée, journalisée avec chaque tentative. */
  readonly graine: number;
  /** Flottant dans `[0, 1[`. */
  flottant(): number;
  /** Entier dans `[minInclus, maxExclus[`. Lève si l'intervalle est vide. */
  entier(minInclus: number, maxExclus: number): number;
  /** Un élément du tableau. Lève si le tableau est vide. */
  choisir<T>(elements: readonly T[]): T;
  /** Copie mélangée (Fisher-Yates). Le tableau d'entrée n'est pas modifié. */
  melanger<T>(elements: readonly T[]): T[];
}

/**
 * Lecture d'une variable d'environnement qui fonctionne aussi dans le navigateur, où
 * `process` n'existe pas : sans ce détour, le seul fait d'importer ce module ferait planter
 * le client.
 */
function lireVariableEnvironnement(nom: string): string | undefined {
  const hote = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return hote.process?.env?.[nom];
}

/**
 * Graine forcée par `ATELIER_GRAINE` si la variable est posée, sinon graine aléatoire.
 *
 * En test, `tests/configuration/preparation.ts` (lot L-G) pose la variable : toute la suite
 * tire alors la même suite de nombres d'une exécution à l'autre.
 */
export function graineParDefaut(): number {
  const brute = lireVariableEnvironnement(VARIABLE_GRAINE);
  if (brute !== undefined && brute.trim() !== '') {
    const valeur = Number.parseInt(brute.trim(), 10);
    if (!Number.isFinite(valeur)) {
      throw new ErreurPierre(
        'argument-invalide',
        `${VARIABLE_GRAINE} n'est pas un entier : « ${brute} »`,
        { variable: VARIABLE_GRAINE, valeur: brute },
      );
    }
    return valeur >>> 0;
  }
  // Seul appel à `Math.random` autorisé dans le dépôt (contrat § 0).
  return Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
}

/**
 * Crée un générateur déterministe. Deux générateurs créés avec la même graine rendent
 * exactement la même suite, indéfiniment.
 */
export function creerAlea(graine: number = graineParDefaut()): Alea {
  if (!Number.isFinite(graine)) {
    throw new ErreurPierre('argument-invalide', 'La graine doit être un nombre fini.', { graine });
  }

  const graineInitiale = graine >>> 0;
  let etat = graineInitiale;

  const flottant = (): number => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
  };

  const entier = (minInclus: number, maxExclus: number): number => {
    if (!Number.isInteger(minInclus) || !Number.isInteger(maxExclus)) {
      throw new ErreurPierre('argument-invalide', 'Les bornes doivent être des entiers.', {
        minInclus,
        maxExclus,
      });
    }
    if (maxExclus <= minInclus) {
      throw new ErreurPierre('argument-invalide', 'Intervalle vide : maxExclus <= minInclus.', {
        minInclus,
        maxExclus,
      });
    }
    return minInclus + Math.floor(flottant() * (maxExclus - minInclus));
  };

  const choisir = <T>(elements: readonly T[]): T => {
    if (elements.length === 0) {
      throw new ErreurPierre('argument-invalide', 'Impossible de choisir dans un tableau vide.');
    }
    return elements[entier(0, elements.length)] as T;
  };

  const melanger = <T>(elements: readonly T[]): T[] => {
    const copie = [...elements];
    for (let i = copie.length - 1; i > 0; i -= 1) {
      const j = entier(0, i + 1);
      const gauche = copie[i] as T;
      const droite = copie[j] as T;
      copie[i] = droite;
      copie[j] = gauche;
    }
    return copie;
  };

  return { graine: graineInitiale, flottant, entier, choisir, melanger };
}
