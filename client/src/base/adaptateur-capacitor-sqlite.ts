/**
 * Adaptateur `Base` sur `@capacitor-community/sqlite` — mode autonome Android, Lot 3 du portage
 * (Docs/addendum-portage-android.md § 3-4). Symétrique de
 * `serveur/src/base/adaptateur-node-sqlite.ts` : même contrat `Base`, connexion différente.
 *
 * VERROU DE RÉENTRANCE — DÉLIBÉRÉMENT PLUS SIMPLE QUE CÔTÉ SERVEUR, ET POURQUOI.
 *
 * L'adaptateur serveur (`adaptateur-node-sqlite.ts`) utilise `node:async_hooks.AsyncLocalStorage`
 * pour distinguer « je suis un appel imbriqué DANS la transaction en cours » d'« un appel non
 * lié arrive pendant qu'une transaction tourne » — nécessaire là-bas parce qu'un serveur HTTP
 * traite plusieurs requêtes réellement concurrentes sur la MÊME connexion SQLite.
 *
 * `node:async_hooks` n'existe pas dans une WebView (ni dans aucun navigateur) : aucun équivalent
 * portable n'assure la même précision. Ce fichier retient donc un COMPTEUR DE PROFONDEUR plutôt
 * qu'un contexte async véritable — il traite comme « réentrant » tout appel survenant PENDANT
 * qu'une transaction est active sur cette connexion, sans distinguer s'il vient bien de
 * l'intérieur de cette transaction ou d'un appel non lié survenu au même moment.
 *
 * C'est un choix délibéré, pas un oubli : l'app autonome sert UN SEUL enfant sur UN SEUL
 * appareil, et l'interface ne permet pas à deux écrans de soumettre une tentative au même
 * instant. Le risque qu'un compteur de profondeur ne peut pas couvrir — une écriture VRAIMENT
 * non liée qui s'intercalerait dans une transaction en cours — suppose une concurrence que cette
 * cible n'a pas. Si l'app autonome gagnait un jour plusieurs surfaces d'écriture simultanées
 * (synchronisation en arrière-plan, par exemple), ce fichier devrait remonter à une solution
 * aussi précise que celle du serveur.
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

function creerVerrouDeProfondeur(): <T>(action: () => Promise<T>) => Promise<T> {
  let profondeur = 0;
  let file: Promise<unknown> = Promise.resolve();

  const executerEnProfondeur = async <T>(action: () => Promise<T>): Promise<T> => {
    profondeur += 1;
    try {
      return await action();
    } finally {
      profondeur -= 1;
    }
  };

  return function verrouiller<T>(action: () => Promise<T>): Promise<T> {
    if (profondeur > 0) {
      return executerEnProfondeur(action);
    }
    const resultat = file.then(
      () => executerEnProfondeur(action),
      () => executerEnProfondeur(action)
    );
    file = resultat.then(
      () => undefined,
      () => undefined
    );
    return resultat;
  };
}

export function creerBaseCapacitorSqlite(connexion: SQLiteDBConnection): Base {
  const verrouiller = creerVerrouDeProfondeur();

  /**
   * Profondeur de transaction EXPLICITE (`transaction()`), distincte du compteur de réentrance
   * du verrou ci-dessus. Mesuré en émulateur (Lot 5, Docs/addendum-portage-android.md § 6bis) :
   * `execute()` et `run()` du plugin Capacitor ouvrent CHACUN leur propre transaction par
   * défaut (`transaction?: boolean = true` dans leur signature — absent du typage `Base`, qui ne
   * l'expose pas). Un `base.executer(...)` appelé DEPUIS le callback de `base.transaction(...)`
   * — exactement ce que fait `appliquerMigrations` — tentait donc d'ouvrir une SECONDE
   * transaction sur une connexion qui en a déjà une active :
   *
   *     Execute: Failed in beginTransaction — Already in transaction
   *
   * Un crash au tout premier lancement de l'app, avant qu'aucun écran ne s'affiche — invisible
   * à `tests/unitaires/adaptateur-capacitor-sqlite.test.ts`, dont la fausse connexion enveloppe
   * `node:sqlite` et ne reproduit pas ce comportement du VRAI plugin. Seul un test sur émulateur
   * réel l'a montré.
   *
   * Le remède : quand cette profondeur est > 0, `execute`/`run` passent `transaction: false` —
   * la transaction déjà ouverte par `transaction()` gouverne, aucune imbrication n'est demandée
   * au plugin. Et `transaction()` lui-même ne rouvre/referme la transaction native qu'au
   * franchissement 0→1 / 1→0 : un appel imbriqué continue dans la MÊME transaction, jamais dans
   * une seconde — SQLite n'a de toute façon pas de vraies transactions imbriquées.
   */
  let profondeurTransaction = 0;

  return {
    executer(sql: string): Promise<void> {
      return verrouiller(async () => {
        // Un `sql` multi-instructions (migrations : plusieurs `CREATE TABLE`/`CREATE INDEX`)
        // est éclaté ICI plutôt que confié à `connexion.execute()`. Mesuré sur émulateur (Lot 5,
        // Docs/addendum-portage-android.md § 6bis) : le découpeur multi-instructions du plugin
        // Android échoue au 5ᵉ fichier de migration sur SIX `CREATE TABLE` d'affilée, sans
        // aucune particularité syntaxique qui le distingue des quatre précédents (qui en
        // comptaient jusqu'à sept et passaient) —
        //
        //     SQLiteLog: (21) API called with NULL prepared statement
        //     RetHandler: *** ERROR Execute: not an error (code 0)
        //
        // Un `sqlite3_prepare_v2` qui rend `rc == SQLITE_OK` avec un `stmt` NUL est le
        // comportement DOCUMENTÉ de SQLite pour un fragment ne contenant aucune instruction
        // (blanc ou commentaire seul) : la signature pointe vers un découpage interne qui
        // produit, sur CE fichier précisément, un fragment vide que le code Java ne garde pas
        // contre un stmt nul avant de l'utiliser. Reproductible, non expliqué plus avant faute
        // d'accès aux sources Java du plugin — contourné en ne lui donnant jamais plus d'une
        // instruction à la fois.
        for (const instruction of decouperInstructionsSql(sql)) {
          await connexion.execute(instruction, profondeurTransaction === 0);
        }
      });
    },

    lancer(sql: string, parametres: readonly unknown[] = []): Promise<ResultatEcriture> {
      return verrouiller(async () => {
        const resultat = await connexion.run(sql, [...parametres], profondeurTransaction === 0);
        return {
          changements: resultat.changes?.changes ?? 0,
          dernierIdInsere: resultat.changes?.lastId ?? 0
        };
      });
    },

    uneLigne<T>(sql: string, parametres: readonly unknown[] = []): Promise<T | undefined> {
      return verrouiller(async () => {
        const resultat = await connexion.query(sql, [...parametres]);
        const lignes = (resultat.values ?? []) as readonly LigneBrute[];
        return lignes[0] as T | undefined;
      });
    },

    lignes<T>(sql: string, parametres: readonly unknown[] = []): Promise<readonly T[]> {
      return verrouiller(async () => {
        const resultat = await connexion.query(sql, [...parametres]);
        return ((resultat.values ?? []) as readonly LigneBrute[]) as readonly T[];
      });
    },

    transaction<T>(action: () => Promise<T>): Promise<T> {
      return verrouiller(async () => {
        const estLaPlusExterieure = profondeurTransaction === 0;
        if (estLaPlusExterieure) {
          await connexion.beginTransaction();
        }
        profondeurTransaction += 1;
        try {
          const resultat = await action();
          if (estLaPlusExterieure) {
            await connexion.commitTransaction();
          }
          return resultat;
        } catch (erreur) {
          if (estLaPlusExterieure) {
            try {
              await connexion.rollbackTransaction();
            } catch {
              // Une transaction deja annulee par SQLite n'a pas a masquer l'erreur d'origine.
            }
          }
          throw erreur;
        } finally {
          profondeurTransaction -= 1;
        }
      });
    }
  };
}
