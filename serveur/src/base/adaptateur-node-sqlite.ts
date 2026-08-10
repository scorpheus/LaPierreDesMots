/**
 * Adaptateur `Base` sur `node:sqlite` — le seul point ou le serveur touche `DatabaseSync`
 * en dehors de `connexion.ts`. Voir Docs/addendum-portage-android.md § 3-4.
 *
 * VERROU REENTRANT — nécessaire, pas cosmétique.
 *
 * `DatabaseSync` est synchrone ; le contrat `Base` est async partout (pour rester compatible
 * avec l'adaptateur Capacitor, qui traverse un pont natif). Un `await` — même sur une valeur déjà
 * résolue — cède la main à la file de micro-tâches : entre deux instructions SQL d'UNE
 * transaction, une AUTRE requête HTTP concurrente peut désormais s'intercaler sur la MÊME
 * connexion, alors que l'ancien code, entièrement synchrone, ne le permettait pas. Puisque
 * `node:sqlite` n'a qu'UNE connexion, toute transaction y est une propriété de la CONNEXION —
 * une écriture isolée d'une requête B (`toucherProfil`, …) s'intercalerait sinon DANS la
 * transaction ouverte d'une requête A et serait validée ou annulée avec elle.
 *
 * Le verrou sérialise donc TOUTES les méthodes de cet adaptateur, pas seulement `transaction()`.
 * Il doit être RÉENTRANT : le code À L'INTÉRIEUR d'un `transaction()` appelle lui-même `lancer`,
 * `uneLigne`, etc. sur ce même `Base` (voir `depots/tentatives.ts`) — un verrou non réentrant se
 * bloquerait donc lui-même. `AsyncLocalStorage` marque « on est déjà dans la section critique »
 * pour toute la portée async du `transaction()` en cours, afin que ces appels internes
 * s'exécutent directement au lieu de se remettre en file derrière eux-mêmes. Un appel concurrent
 * qui n'est PAS dans cette portée (une autre requête HTTP) continue, lui, d'attendre son tour.
 *
 * Coût négligeable : les appels `node:sqlite` sont synchrones et la base est minuscule (un
 * enfant).
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { DatabaseSync } from 'node:sqlite';

import type { Base, ResultatEcriture } from '@pierre/partage/base';

interface LigneBrute {
  readonly [colonne: string]: unknown;
}

/**
 * `node:sqlite` type ses paramètres liés en `SQLInputValue` (`null | number | bigint | string |
 * Uint8Array`). Le contrat `Base` les prend en `readonly unknown[]` — c'est à l'appelant (les
 * dépôts) de ne passer que des valeurs SQL-compatibles ; ce cast est la frontière FFI, pas un
 * relâchement de la vérification côté dépôts.
 */
function versParametresSqlite(parametres: readonly unknown[]): never[] {
  return parametres as never[];
}

function creerVerrouReentrant(): <T>(action: () => Promise<T>) => Promise<T> {
  const dansLaSectionCritique = new AsyncLocalStorage<true>();
  let file: Promise<unknown> = Promise.resolve();

  return function verrouiller<T>(action: () => Promise<T>): Promise<T> {
    if (dansLaSectionCritique.getStore() === true) {
      return action();
    }
    const resultat = file.then(
      () => dansLaSectionCritique.run(true, action),
      () => dansLaSectionCritique.run(true, action)
    );
    file = resultat.then(
      () => undefined,
      () => undefined
    );
    return resultat;
  };
}

export function creerBaseNodeSqlite(base: DatabaseSync): Base {
  const verrouiller = creerVerrouReentrant();

  return {
    executer(sql: string): Promise<void> {
      return verrouiller(() => {
        base.exec(sql);
        return Promise.resolve();
      });
    },

    lancer(sql: string, parametres: readonly unknown[] = []): Promise<ResultatEcriture> {
      return verrouiller(() => {
        const resultat = base.prepare(sql).run(...versParametresSqlite(parametres));
        return Promise.resolve({
          changements: Number(resultat.changes),
          dernierIdInsere: resultat.lastInsertRowid
        });
      });
    },

    uneLigne<T>(sql: string, parametres: readonly unknown[] = []): Promise<T | undefined> {
      return verrouiller(() => {
        const ligne = base.prepare(sql).get(...versParametresSqlite(parametres)) as LigneBrute | undefined;
        return Promise.resolve(ligne as T | undefined);
      });
    },

    lignes<T>(sql: string, parametres: readonly unknown[] = []): Promise<readonly T[]> {
      return verrouiller(() => {
        const lignes = base.prepare(sql).all(...versParametresSqlite(parametres)) as readonly LigneBrute[];
        return Promise.resolve(lignes as readonly T[]);
      });
    },

    transaction<T>(action: () => Promise<T>): Promise<T> {
      return verrouiller(async () => {
        base.exec('BEGIN IMMEDIATE;');
        try {
          const resultat = await action();
          base.exec('COMMIT;');
          return resultat;
        } catch (erreur) {
          try {
            base.exec('ROLLBACK;');
          } catch {
            // Une transaction deja annulee par SQLite n'a pas a masquer l'erreur d'origine.
          }
          throw erreur;
        }
      });
    }
  };
}
