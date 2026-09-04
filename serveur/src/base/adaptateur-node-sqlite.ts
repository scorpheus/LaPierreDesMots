/**
 * Adaptateur `Base` sur `node:sqlite` — le seul point ou le serveur touche `DatabaseSync`
 * en dehors de `connexion.ts`. Voir Docs/addendum-portage-android.md § 3-4.
 *
 * VERROU TRANSACTIONNEL — nécessaire, pas cosmétique.
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
 * Le callback reçoit une `Base` transactionnelle dédiée : ses méthodes s'exécutent directement
 * sur la connexion déjà verrouillée, tandis qu'un appel fait sur la `Base` publique attend dans
 * la file. Cette capacité explicite est également implantable dans un Worker navigateur, sans
 * dépendre de `AsyncLocalStorage` ni d'un compteur global qui confondrait deux appels async.
 *
 * Coût négligeable : les appels `node:sqlite` sont synchrones et la base est minuscule (un
 * enfant).
 */

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

function creerVerrou(): <T>(action: () => Promise<T>) => Promise<T> {
  let file: Promise<unknown> = Promise.resolve();

  return function verrouiller<T>(action: () => Promise<T>): Promise<T> {
    const resultat = file.then(action, action);
    file = resultat.then(
      () => undefined,
      () => undefined
    );
    return resultat;
  };
}

export function creerBaseNodeSqlite(base: DatabaseSync): Base {
  const verrouiller = creerVerrou();

  const executer = (sql: string): Promise<void> => {
    base.exec(sql);
    return Promise.resolve();
  };

  const lancer = (
    sql: string,
    parametres: readonly unknown[] = []
  ): Promise<ResultatEcriture> => {
    const resultat = base.prepare(sql).run(...versParametresSqlite(parametres));
    return Promise.resolve({
      changements: Number(resultat.changes),
      dernierIdInsere: resultat.lastInsertRowid
    });
  };

  const uneLigne = <T>(
    sql: string,
    parametres: readonly unknown[] = []
  ): Promise<T | undefined> => {
    const ligne = base.prepare(sql).get(...versParametresSqlite(parametres)) as LigneBrute | undefined;
    return Promise.resolve(ligne as T | undefined);
  };

  const lignes = <T>(sql: string, parametres: readonly unknown[] = []): Promise<readonly T[]> => {
    const resultat = base.prepare(sql).all(...versParametresSqlite(parametres)) as readonly LigneBrute[];
    return Promise.resolve(resultat as readonly T[]);
  };

  const baseTransactionnelle: Base = {
    executer,
    lancer,
    uneLigne,
    lignes,
    transaction<T>(): Promise<T> {
      return Promise.reject(new Error('Les transactions imbriquees ne sont pas prises en charge.'));
    }
  };

  return {
    executer(sql: string): Promise<void> {
      return verrouiller(() => executer(sql));
    },

    lancer(sql: string, parametres: readonly unknown[] = []): Promise<ResultatEcriture> {
      return verrouiller(() => lancer(sql, parametres));
    },

    uneLigne<T>(sql: string, parametres: readonly unknown[] = []): Promise<T | undefined> {
      return verrouiller(() => uneLigne<T>(sql, parametres));
    },

    lignes<T>(sql: string, parametres: readonly unknown[] = []): Promise<readonly T[]> {
      return verrouiller(() => lignes<T>(sql, parametres));
    },

    transaction<T>(action: (transaction: Base) => Promise<T>): Promise<T> {
      return verrouiller(async () => {
        base.exec('BEGIN IMMEDIATE;');
        try {
          const resultat = await action(baseTransactionnelle);
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
