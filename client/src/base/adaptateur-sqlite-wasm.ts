/**
 * Adaptateur `Base` de la PWA : la fenêtre ne manipule pas SQLite directement, elle parle à un
 * unique Worker ESM qui possède la connexion OPFS. Le Worker est partagé par toutes les méthodes
 * de cette instance et refuse une seconde fenêtre au moyen d'un Web Lock.
 */

import type { Base, ResultatEcriture } from '@pierre/partage/base';

import type {
  CanalSqliteWasm,
  CodeErreurSqliteWasm,
  CorpsRequeteSqliteWasm,
  ErreurSqliteWasmSerialisee,
  ReponseSqliteWasm,
  ValeurSqliteWasm
} from './protocole-sqlite-wasm.js';

export const NOM_BASE_PWA = '/pierre.sqlite3';
export const REPERTOIRE_POOL_PWA = '/la-pierre-des-mots/sqlite';
export const NOM_VFS_PWA = 'pierre-opfs-sahpool';
export const NOM_VERROU_PWA = 'la-pierre-des-mots:sqlite:v1';
export const CAPACITE_POOL_PWA = 6;

export interface BaseNavigateur extends Base {
  /** Copie cohérente de la base SQLite, destinée à une sauvegarde choisie par le parent. */
  exporter(): Promise<Uint8Array>;
  /** Remplace la base après validation complète dans le Worker propriétaire du VFS. */
  importer(donnees: Uint8Array): Promise<{ readonly octets: number }>;
  fermer(): Promise<void>;
}

export class ErreurBaseNavigateur extends Error {
  constructor(
    readonly code: CodeErreurSqliteWasm,
    message: string,
    readonly resultCode?: number
  ) {
    super(message);
    this.name = 'ErreurBaseNavigateur';
  }
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

function versValeurSqlite(valeur: unknown): ValeurSqliteWasm {
  if (
    valeur === null ||
    typeof valeur === 'string' ||
    typeof valeur === 'number' ||
    typeof valeur === 'bigint' ||
    valeur instanceof Uint8Array
  ) {
    return valeur;
  }
  throw new ErreurBaseNavigateur(
    'parametre-invalide',
    `Parametre SQLite non pris en charge : ${typeof valeur}.`
  );
}

function versParametresSqlite(parametres: readonly unknown[]): readonly ValeurSqliteWasm[] {
  return parametres.map(versValeurSqlite);
}

function versResultatEcriture(resultat: unknown): ResultatEcriture {
  if (typeof resultat !== 'object' || resultat === null) {
    throw new ErreurBaseNavigateur('requete-invalide', "SQLite n'a pas rendu de resultat d'ecriture.");
  }
  const brut = resultat as { readonly changements?: unknown; readonly dernierIdInsere?: unknown };
  if (
    typeof brut.changements !== 'number' ||
    (typeof brut.dernierIdInsere !== 'number' && typeof brut.dernierIdInsere !== 'bigint')
  ) {
    throw new ErreurBaseNavigateur('requete-invalide', "Le resultat d'ecriture SQLite est mal forme.");
  }
  return { changements: brut.changements, dernierIdInsere: brut.dernierIdInsere };
}

function transactionImbriquee<T>(): Promise<T> {
  return Promise.reject(
    new ErreurBaseNavigateur(
      'transaction-invalide',
      'Les transactions imbriquees ne sont pas prises en charge.'
    )
  );
}

function versExportSqlite(resultat: unknown): Uint8Array {
  if (!(resultat instanceof Uint8Array)) {
    throw new ErreurBaseNavigateur(
      'requete-invalide',
      "Le Worker n'a pas rendu une sauvegarde SQLite valide."
    );
  }
  return resultat;
}

function versResultatImport(resultat: unknown): { readonly octets: number } {
  const octets =
    typeof resultat === 'object' && resultat !== null && 'octets' in resultat
      ? (resultat as { readonly octets: unknown }).octets
      : undefined;
  if (typeof octets !== 'number' || !Number.isSafeInteger(octets) || octets < 1) {
    throw new ErreurBaseNavigateur(
      'requete-invalide',
      "Le Worker n'a pas confirmé l'import de la sauvegarde."
    );
  }
  return { octets };
}

/**
 * Construit le contrat métier sur un canal RPC déjà initialisé. Cette frontière injectable
 * permet de prouver le mutex et le rollback sans lancer WebAssembly dans les tests unitaires.
 */
export function creerBaseSqliteWasm(canal: CanalSqliteWasm): BaseNavigateur {
  const verrouiller = creerVerrou();
  let prochainJeton = 1;
  let fermee = false;

  const exigerOuverte = (): void => {
    if (fermee) {
      throw new ErreurBaseNavigateur('worker-interrompu', 'La base du navigateur est fermee.');
    }
  };

  const creerBaseTransactionnelle = (jeton: string): Base => ({
    async executer(sql: string): Promise<void> {
      exigerOuverte();
      await canal.envoyer({ type: 'executer', sql, jeton });
    },
    async lancer(sql: string, parametres: readonly unknown[] = []): Promise<ResultatEcriture> {
      exigerOuverte();
      return versResultatEcriture(
        await canal.envoyer({
          type: 'lancer',
          sql,
          parametres: versParametresSqlite(parametres),
          jeton
        })
      );
    },
    async uneLigne<T>(sql: string, parametres: readonly unknown[] = []): Promise<T | undefined> {
      exigerOuverte();
      return (await canal.envoyer({
        type: 'une-ligne',
        sql,
        parametres: versParametresSqlite(parametres),
        jeton
      })) as T | undefined;
    },
    async lignes<T>(sql: string, parametres: readonly unknown[] = []): Promise<readonly T[]> {
      exigerOuverte();
      return (await canal.envoyer({
        type: 'lignes',
        sql,
        parametres: versParametresSqlite(parametres),
        jeton
      })) as readonly T[];
    },
    transaction: transactionImbriquee
  });

  return {
    executer(sql: string): Promise<void> {
      return verrouiller(async () => {
        exigerOuverte();
        await canal.envoyer({ type: 'executer', sql, jeton: null });
      });
    },

    lancer(sql: string, parametres: readonly unknown[] = []): Promise<ResultatEcriture> {
      return verrouiller(async () => {
        exigerOuverte();
        return versResultatEcriture(
          await canal.envoyer({
            type: 'lancer',
            sql,
            parametres: versParametresSqlite(parametres),
            jeton: null
          })
        );
      });
    },

    uneLigne<T>(sql: string, parametres: readonly unknown[] = []): Promise<T | undefined> {
      return verrouiller(async () => {
        exigerOuverte();
        return (await canal.envoyer({
          type: 'une-ligne',
          sql,
          parametres: versParametresSqlite(parametres),
          jeton: null
        })) as T | undefined;
      });
    },

    lignes<T>(sql: string, parametres: readonly unknown[] = []): Promise<readonly T[]> {
      return verrouiller(async () => {
        exigerOuverte();
        return (await canal.envoyer({
          type: 'lignes',
          sql,
          parametres: versParametresSqlite(parametres),
          jeton: null
        })) as readonly T[];
      });
    },

    transaction<T>(action: (transaction: Base) => Promise<T>): Promise<T> {
      return verrouiller(async () => {
        exigerOuverte();
        const jeton = `transaction-${String(prochainJeton)}`;
        prochainJeton += 1;
        await canal.envoyer({ type: 'debut-transaction', jeton });
        try {
          const resultat = await action(creerBaseTransactionnelle(jeton));
          await canal.envoyer({ type: 'valider-transaction', jeton });
          return resultat;
        } catch (erreur) {
          try {
            await canal.envoyer({ type: 'annuler-transaction', jeton });
          } catch {
            // L'erreur d'origine — callback ou COMMIT — reste la plus utile au diagnostic.
          }
          throw erreur;
        }
      });
    },

    exporter(): Promise<Uint8Array> {
      return verrouiller(async () => {
        exigerOuverte();
        return versExportSqlite(await canal.envoyer({ type: 'exporter-base' }));
      });
    },

    importer(donnees: Uint8Array): Promise<{ readonly octets: number }> {
      return verrouiller(async () => {
        exigerOuverte();
        if (!(donnees instanceof Uint8Array)) {
          throw new ErreurBaseNavigateur(
            'parametre-invalide',
            'La sauvegarde a importer doit etre un tableau d octets.'
          );
        }
        return versResultatImport(
          await canal.envoyer({ type: 'importer-base', donnees })
        );
      });
    },

    fermer(): Promise<void> {
      return verrouiller(async () => {
        if (fermee) return;
        fermee = true;
        try {
          await canal.envoyer({ type: 'fermer' });
        } finally {
          canal.arreter();
        }
      });
    }
  };
}

function estReponse(message: unknown): message is ReponseSqliteWasm {
  if (typeof message !== 'object' || message === null) return false;
  const candidat = message as { readonly identifiant?: unknown; readonly ok?: unknown };
  return typeof candidat.identifiant === 'number' && typeof candidat.ok === 'boolean';
}

function depuisErreurSerialisee(erreur: ErreurSqliteWasmSerialisee): ErreurBaseNavigateur {
  return new ErreurBaseNavigateur(erreur.code, erreur.message, erreur.resultCode);
}

function creerCanalWorker(worker: Worker): CanalSqliteWasm {
  let prochainIdentifiant = 1;
  let arrete = false;
  const attentes = new Map<
    number,
    { readonly resoudre: (resultat: unknown) => void; readonly rejeter: (erreur: unknown) => void }
  >();

  const rejeterToutes = (erreur: ErreurBaseNavigateur): void => {
    for (const attente of attentes.values()) attente.rejeter(erreur);
    attentes.clear();
  };

  const recevoir = (evenement: MessageEvent<unknown>): void => {
    if (!estReponse(evenement.data)) return;
    const attente = attentes.get(evenement.data.identifiant);
    if (attente === undefined) return;
    attentes.delete(evenement.data.identifiant);
    if (evenement.data.ok) attente.resoudre(evenement.data.resultat);
    else attente.rejeter(depuisErreurSerialisee(evenement.data.erreur));
  };

  const interrompu = (): void => {
    arrete = true;
    rejeterToutes(
      new ErreurBaseNavigateur(
        'worker-interrompu',
        "Le Worker SQLite s'est interrompu avant de repondre."
      )
    );
  };

  worker.addEventListener('message', recevoir);
  worker.addEventListener('error', interrompu);
  worker.addEventListener('messageerror', interrompu);

  return {
    envoyer(requete: CorpsRequeteSqliteWasm): Promise<unknown> {
      if (arrete) {
        return Promise.reject(
          new ErreurBaseNavigateur('worker-interrompu', "Le Worker SQLite n'est plus disponible.")
        );
      }
      const identifiant = prochainIdentifiant;
      prochainIdentifiant += 1;
      return new Promise((resoudre, rejeter) => {
        attentes.set(identifiant, { resoudre, rejeter });
        worker.postMessage({ ...requete, identifiant });
      });
    },

    arreter(): void {
      if (arrete) return;
      arrete = true;
      worker.removeEventListener('message', recevoir);
      worker.removeEventListener('error', interrompu);
      worker.removeEventListener('messageerror', interrompu);
      worker.terminate();
      rejeterToutes(new ErreurBaseNavigateur('worker-interrompu', 'Le Worker SQLite a ete ferme.'));
    }
  };
}

let promesseOuverture: Promise<BaseNavigateur> | null = null;

async function creerEtOuvrirBaseNavigateur(): Promise<BaseNavigateur> {
  const worker = new Worker(new URL('./sqlite-wasm.worker.ts', import.meta.url), {
    type: 'module',
    name: 'sqlite-la-pierre-des-mots'
  });
  const canal = creerCanalWorker(worker);
  try {
    await canal.envoyer({
      type: 'initialiser',
      configuration: {
        nomBase: NOM_BASE_PWA,
        repertoirePool: REPERTOIRE_POOL_PWA,
        nomVfs: NOM_VFS_PWA,
        nomVerrou: NOM_VERROU_PWA,
        capaciteInitiale: CAPACITE_POOL_PWA
      }
    });
    const base = creerBaseSqliteWasm(canal);
    return {
      ...base,
      async fermer(): Promise<void> {
        try {
          await base.fermer();
        } finally {
          promesseOuverture = null;
        }
      }
    };
  } catch (erreur) {
    canal.arreter();
    throw erreur;
  }
}

/** Ouvre au plus une connexion OPFS pour toute la durée de vie de la page. */
export function ouvrirBaseNavigateur(): Promise<BaseNavigateur> {
  promesseOuverture ??= creerEtOuvrirBaseNavigateur().catch((erreur: unknown) => {
    promesseOuverture = null;
    throw erreur;
  });
  return promesseOuverture;
}
