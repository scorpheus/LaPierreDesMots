/**
 * Messages échangés avec le Worker SQLite de la PWA.
 *
 * Le protocole ne transporte que des valeurs prises en charge par le clonage structuré. Les
 * objets propres à SQLite WASM restent dans le Worker : la fenêtre ne reçoit jamais de pointeur,
 * de statement ni d'exception native.
 */

export type ValeurSqliteWasm = string | number | bigint | null | Uint8Array;
export type LigneSqliteWasm = Readonly<Record<string, ValeurSqliteWasm>>;

export interface ConfigurationSqliteWasm {
  readonly nomBase: string;
  readonly repertoirePool: string;
  readonly nomVfs: string;
  readonly nomVerrou: string;
  readonly capaciteInitiale: number;
}

export type CorpsRequeteSqliteWasm =
  | { readonly type: 'initialiser'; readonly configuration: ConfigurationSqliteWasm }
  | { readonly type: 'executer'; readonly sql: string; readonly jeton: string | null }
  | {
      readonly type: 'lancer';
      readonly sql: string;
      readonly parametres: readonly ValeurSqliteWasm[];
      readonly jeton: string | null;
    }
  | {
      readonly type: 'une-ligne';
      readonly sql: string;
      readonly parametres: readonly ValeurSqliteWasm[];
      readonly jeton: string | null;
    }
  | {
      readonly type: 'lignes';
      readonly sql: string;
      readonly parametres: readonly ValeurSqliteWasm[];
      readonly jeton: string | null;
    }
  | { readonly type: 'debut-transaction'; readonly jeton: string }
  | { readonly type: 'valider-transaction'; readonly jeton: string }
  | { readonly type: 'annuler-transaction'; readonly jeton: string }
  | { readonly type: 'exporter-base' }
  | { readonly type: 'importer-base'; readonly donnees: Uint8Array }
  | { readonly type: 'fermer' };

type AvecIdentifiant<T> = T extends unknown ? T & { readonly identifiant: number } : never;

export type RequeteSqliteWasm = AvecIdentifiant<CorpsRequeteSqliteWasm>;

export type CodeErreurSqliteWasm =
  | 'base-deja-ouverte'
  | 'stockage-indisponible'
  | 'initialisation-impossible'
  | 'parametre-invalide'
  | 'requete-invalide'
  | 'transaction-invalide'
  | 'sauvegarde-invalide'
  | 'sqlite'
  | 'worker-interrompu';

export interface ErreurSqliteWasmSerialisee {
  readonly code: CodeErreurSqliteWasm;
  readonly nom: string;
  readonly message: string;
  readonly resultCode?: number;
}

export type ReponseSqliteWasm =
  | { readonly identifiant: number; readonly ok: true; readonly resultat: unknown }
  | {
      readonly identifiant: number;
      readonly ok: false;
      readonly erreur: ErreurSqliteWasmSerialisee;
    };

/** Frontière injectable utilisée par l'adaptateur et ses tests unitaires. */
export interface CanalSqliteWasm {
  envoyer(requete: CorpsRequeteSqliteWasm): Promise<unknown>;
  arreter(): void;
}
