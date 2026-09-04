/**
 * Adaptateur `Base` sur `@capacitor-community/sqlite` — mode autonome Android, Lot 3 du portage
 * (Docs/addendum-portage-android.md § 3-4). Symétrique de
 * `serveur/src/base/adaptateur-node-sqlite.ts` : même contrat `Base`, connexion différente.
 *
 * VERROU TRANSACTIONNEL.
 *
 * Le callback de `transaction()` reçoit une `Base` dédiée à la transaction. Ses méthodes
 * contournent le verrou public et désactivent les transactions automatiques du plugin ; toute
 * opération faite sur la `Base` publique pendant ce temps reste en file. Cette capacité
 * explicite distingue donc réellement un appel transactionnel d'un appel concurrent, sans
 * `AsyncLocalStorage` — indisponible dans une WebView — et sans compteur global ambigu.
 */

import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';

import type { Base, ResultatEcriture } from '@pierre/partage/base';

/** Nom de la base sur l'appareil — un seul enfant, une seule base, jamais choisi par l'usager. */
export const NOM_BASE_AUTONOME = 'pierre';

/**
 * Ouvre (ou retrouve) la connexion SQLite native sur l'appareil.
 *
 * `retrieveConnection` plutôt que `createConnection` quand la connexion existe déjà : Capacitor
 * lève si on tente de créer deux fois la même connexion nommée, ce qui arrive au moindre
 * remontage de l'app (rotation d'écran, retour au premier plan).
 */
export async function ouvrirBaseCapacitor(): Promise<SQLiteDBConnection> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const dejaOuverte = (await sqlite.isConnection(NOM_BASE_AUTONOME, false)).result === true;
  const connexion = dejaOuverte
    ? await sqlite.retrieveConnection(NOM_BASE_AUTONOME, false)
    : await sqlite.createConnection(NOM_BASE_AUTONOME, false, 'no-encryption', 1, false);
  await connexion.open();
  // `journal_mode = WAL` n'a pas de sens mono-processus sur mobile (pas de second écrivain à
  // isoler) ; `foreign_keys = ON` reste requis, exactement comme côté serveur.
  await connexion.execute('PRAGMA foreign_keys = ON;');
  return connexion;
}

/** Une ligne renvoyée par `query()`, forme brute avant validation par l'appelant. */
type LigneBrute = Record<string, unknown>;

/**
 * Éclate un texte SQL en instructions individuelles, sur les `;` de premier niveau — jamais
 * ceux à l'intérieur d'une chaîne entre guillemets simples (`''` est l'échappement SQLite du
 * guillemet) NI ceux à l'intérieur d'un commentaire `-- jusqu'à la fin de ligne`.
 *
 * CE DERNIER POINT EST LA CAUSE MESURÉE DU DÉFAUT, PAS UNE PRÉCAUTION GÉNÉRIQUE : deux
 * migrations, et deux seulement, portent un `;` À L'INTÉRIEUR D'UN COMMENTAIRE —
 * `005_monde.sql:7` (« … affectation directe ; ») et
 * `010_recalcul-progression-region.sql:14` (« … n'en declarait qu'un ou deux ; seize nœuds… »).
 * `005_monde.sql` est précisément la migration qui échouait sur émulateur avec
 * `SQLITE_MISUSE (21) — API called with NULL prepared statement` : la coïncidence n'en est pas
 * une, elle a guidé ce correctif. Un découpeur AVEUGLE AUX COMMENTAIRES (le nôtre au premier
 * essai, très probablement celui du plugin Android aussi, faute d'accès à ses sources) coupe
 * la migration en un fragment supplémentaire dont le contenu utile est un commentaire seul —
 * exactement le fragment que `sqlite3_prepare_v2` rend avec un `stmt` NUL (documenté,
 * `rc == SQLITE_OK`), et que le code natif utilise ensuite sans le garder.
 *
 * Ce n'est PAS un analyseur SQL général — juste assez pour les migrations de ce dépôt, qui
 * n'écrivent jamais de point-virgule dans un littéral, ni de commentaire bloc entre astérisques,
 * ni de déclencheur `BEGIN…END`. Aucune migration actuelle n'en a besoin.
 */
function decouperInstructionsSql(sql: string): readonly string[] {
  const instructions: string[] = [];
  let courante = '';
  let dansChaine = false;
  let dansCommentaire = false;

  for (let index = 0; index < sql.length; index += 1) {
    const caractere = sql[index] as string;
    courante += caractere;

    if (dansCommentaire) {
      if (caractere === '\n') {
        dansCommentaire = false;
      }
      continue;
    }
    if (caractere === "'") {
      dansChaine = !dansChaine;
      continue;
    }
    if (!dansChaine && caractere === '-' && sql[index + 1] === '-') {
      dansCommentaire = true;
      continue;
    }
    if (caractere === ';' && !dansChaine) {
      instructions.push(courante);
      courante = '';
    }
  }
  if (courante.trim() !== '') {
    instructions.push(courante);
  }

  return instructions
    .map((fragment) => fragment.replace(/--[^\n]*/g, '').trim())
    .filter((fragment) => fragment !== '');
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

export function creerBaseCapacitorSqlite(connexion: SQLiteDBConnection): Base {
  const verrouiller = creerVerrou();

  /**
   * `execute()` et `run()` du plugin ouvrent leur propre transaction par défaut. La Base
   * transactionnelle passe donc `false`, puisque `beginTransaction()` a déjà ouvert celle qui
   * gouverne le callback. Le booléen vaut `true` pour les appels publics isolés.
   */
  const executer = async (sql: string, transactionAutomatique: boolean): Promise<void> => {
    // Un `sql` multi-instructions (migrations : plusieurs `CREATE TABLE`/`CREATE INDEX`)
    // est éclaté ICI plutôt que confié à `connexion.execute()`. Mesuré sur émulateur (Lot 5,
    // Docs/addendum-portage-android.md § 6bis) : le découpeur multi-instructions du plugin
    // Android échoue au 5ᵉ fichier de migration sur SIX `CREATE TABLE` d'affilée.
    for (const instruction of decouperInstructionsSql(sql)) {
      await connexion.execute(instruction, transactionAutomatique);
    }
  };

  const lancer = async (
    sql: string,
    parametres: readonly unknown[] = [],
    transactionAutomatique: boolean
  ): Promise<ResultatEcriture> => {
    const resultat = await connexion.run(sql, [...parametres], transactionAutomatique);
    return {
      changements: resultat.changes?.changes ?? 0,
      dernierIdInsere: resultat.changes?.lastId ?? 0
    };
  };

  const uneLigne = async <T>(
    sql: string,
    parametres: readonly unknown[] = []
  ): Promise<T | undefined> => {
    const resultat = await connexion.query(sql, [...parametres]);
    const lignes = (resultat.values ?? []) as readonly LigneBrute[];
    return lignes[0] as T | undefined;
  };

  const lignes = async <T>(
    sql: string,
    parametres: readonly unknown[] = []
  ): Promise<readonly T[]> => {
    const resultat = await connexion.query(sql, [...parametres]);
    return ((resultat.values ?? []) as readonly LigneBrute[]) as readonly T[];
  };

  const baseTransactionnelle: Base = {
    executer: (sql) => executer(sql, false),
    lancer: (sql, parametres = []) => lancer(sql, parametres, false),
    uneLigne,
    lignes,
    transaction<T>(): Promise<T> {
      return Promise.reject(new Error('Les transactions imbriquees ne sont pas prises en charge.'));
    }
  };

  return {
    executer(sql: string): Promise<void> {
      return verrouiller(() => executer(sql, true));
    },

    lancer(sql: string, parametres: readonly unknown[] = []): Promise<ResultatEcriture> {
      return verrouiller(() => lancer(sql, parametres, true));
    },

    uneLigne<T>(sql: string, parametres: readonly unknown[] = []): Promise<T | undefined> {
      return verrouiller(() => uneLigne<T>(sql, parametres));
    },

    lignes<T>(sql: string, parametres: readonly unknown[] = []): Promise<readonly T[]> {
      return verrouiller(() => lignes<T>(sql, parametres));
    },

    transaction<T>(action: (transaction: Base) => Promise<T>): Promise<T> {
      return verrouiller(async () => {
        await connexion.beginTransaction();
        try {
          const resultat = await action(baseTransactionnelle);
          await connexion.commitTransaction();
          return resultat;
        } catch (erreur) {
          try {
            await connexion.rollbackTransaction();
          } catch {
            // Une transaction deja annulee par SQLite n'a pas a masquer l'erreur d'origine.
          }
          throw erreur;
        }
      });
    }
  };
}
