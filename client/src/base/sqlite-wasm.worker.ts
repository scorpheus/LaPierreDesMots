/**
 * Propriétaire unique de SQLite WASM et du VFS OPFS de la PWA.
 *
 * `opfs-sahpool` ne tolère qu'une instance par répertoire. Le Web Lock est donc acquis AVANT
 * l'installation du VFS et reste détenu jusqu'à `fermer`. Une seconde page reçoit une erreur
 * explicite ; aucune base mémoire de secours ne peut masquer la perte de persistance.
 */

import type { Database, SAHPoolUtil, Sqlite3Static } from '@sqlite.org/sqlite-wasm';

import type {
  CodeErreurSqliteWasm,
  ConfigurationSqliteWasm,
  ErreurSqliteWasmSerialisee,
  ReponseSqliteWasm,
  RequeteSqliteWasm
} from './protocole-sqlite-wasm.js';

interface ContexteWorker {
  addEventListener(
    type: 'message',
    ecouter: (evenement: MessageEvent<unknown>) => void
  ): void;
  postMessage(message: ReponseSqliteWasm): void;
}

interface ConfigurationGlobaleSqlite {
  sqlite3ApiConfig?: {
    readonly disable: {
      readonly vfs: Readonly<Record<string, boolean>>;
    };
  };
}

class ErreurWorkerSqlite extends Error {
  constructor(readonly code: CodeErreurSqliteWasm, message: string) {
    super(message);
    this.name = 'ErreurWorkerSqlite';
  }
}

const contexte = globalThis as unknown as ContexteWorker;

let sqlite3: Sqlite3Static | null = null;
let pool: SAHPoolUtil | null = null;
let base: Database | null = null;
let configurationActive: ConfigurationSqliteWasm | null = null;
let jetonTransaction: string | null = null;
let promesseInitialisation: Promise<unknown> | null = null;
let promesseVerrou: Promise<void> | null = null;
let resoudreLiberationVerrou: (() => void) | null = null;

const TAILLE_MAX_SAUVEGARDE = 64 * 1024 * 1024;
const SIGNATURE_SQLITE = new TextEncoder().encode('SQLite format 3\0');
// À relever avec toute nouvelle migration. Une sauvegarde d'une version antérieure connue sera
// migrée au rechargement ; une version future est refusée pour ne jamais ouvrir un schéma inconnu.
const VERSION_SCHEMA_MAXIMA = 11;
const TABLES_REQUISES = [
  { nom: 'schema_migrations', depuis: 1 },
  { nom: 'profils', depuis: 1 },
  { nom: 'tentatives', depuis: 1 },
  { nom: 'progression_noeud', depuis: 1 },
  { nom: 'reglages_lecture', depuis: 2 },
  { nom: 'essais_typographie', depuis: 2 },
  { nom: 'etapes_tentative', depuis: 3 },
  { nom: 'maitrise_competence', depuis: 3 },
  { nom: 'items_leitner', depuis: 3 },
  { nom: 'sorties', depuis: 3 },
  { nom: 'progression_cascade', depuis: 4 },
  { nom: 'progression_region', depuis: 5 },
  { nom: 'compagnons', depuis: 5 },
  { nom: 'formes_gobi', depuis: 5 },
  { nom: 'stade_gobi', depuis: 5 },
  { nom: 'campement', depuis: 5 },
  { nom: 'points_visites', depuis: 5 },
  { nom: 'code_parent', depuis: 6 },
  { nom: 'verrou_parent', depuis: 6 },
  { nom: 'relecture_contenu', depuis: 6 },
  { nom: 'ouverture_vue', depuis: 7 },
  { nom: 'etagere_rang', depuis: 8 }
] as const;

function estConfiguration(valeur: unknown): valeur is ConfigurationSqliteWasm {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const c = valeur as Partial<ConfigurationSqliteWasm>;
  return (
    typeof c.nomBase === 'string' &&
    c.nomBase.startsWith('/') &&
    typeof c.repertoirePool === 'string' &&
    c.repertoirePool.startsWith('/') &&
    typeof c.nomVfs === 'string' &&
    c.nomVfs !== '' &&
    typeof c.nomVerrou === 'string' &&
    c.nomVerrou !== '' &&
    typeof c.capaciteInitiale === 'number' &&
    Number.isInteger(c.capaciteInitiale) &&
    c.capaciteInitiale >= 4
  );
}

function estRequete(message: unknown): message is RequeteSqliteWasm {
  if (typeof message !== 'object' || message === null) return false;
  const candidate = message as { readonly identifiant?: unknown; readonly type?: unknown };
  return typeof candidate.identifiant === 'number' && typeof candidate.type === 'string';
}

async function acquerirVerrou(nom: string): Promise<void> {
  if (!globalThis.isSecureContext || !('locks' in navigator)) {
    throw new ErreurWorkerSqlite(
      'stockage-indisponible',
      'Le stockage local durable exige un navigateur compatible dans un contexte HTTPS.'
    );
  }

  let decisionRendue = false;
  let resoudreDecision: ((acquis: boolean) => void) | null = null;
  let rejeterDecision: ((erreur: unknown) => void) | null = null;
  const decision = new Promise<boolean>((resoudre, rejeter) => {
    resoudreDecision = resoudre;
    rejeterDecision = rejeter;
  });

  promesseVerrou = navigator.locks
    .request(nom, { mode: 'exclusive', ifAvailable: true }, async (verrou) => {
      decisionRendue = true;
      if (verrou === null) {
        resoudreDecision?.(false);
        return;
      }
      resoudreDecision?.(true);
      await new Promise<void>((resoudre) => {
        resoudreLiberationVerrou = resoudre;
      });
    })
    .then(() => undefined)
    .catch((erreur: unknown) => {
      if (!decisionRendue) rejeterDecision?.(erreur);
      else throw erreur;
    });

  if (!(await decision)) {
    await promesseVerrou;
    promesseVerrou = null;
    throw new ErreurWorkerSqlite(
      'base-deja-ouverte',
      'La progression est deja ouverte dans un autre onglet. Ferme-le puis recharge cette page.'
    );
  }
}

async function libererVerrou(): Promise<void> {
  const liberation = resoudreLiberationVerrou;
  const occupation = promesseVerrou;
  resoudreLiberationVerrou = null;
  promesseVerrou = null;
  liberation?.();
  await occupation;
}

function configurerChargementSqlite(): void {
  const monde = globalThis as typeof globalThis & ConfigurationGlobaleSqlite;
  monde.sqlite3ApiConfig = {
    disable: {
      vfs: {
        // Dans la version 3.53, le VFS OPFS historique teste ces deux clés ensemble.
        opfs: true,
        'opfs-vfs': true,
        'opfs-wl': true,
        kvvfs: true
      }
    }
  };
}

async function initialiser(configuration: unknown): Promise<unknown> {
  if (!estConfiguration(configuration)) {
    throw new ErreurWorkerSqlite('requete-invalide', 'Configuration SQLite navigateur invalide.');
  }
  if (base !== null) {
    return { nomBase: configurationActive?.nomBase, nomVfs: pool?.vfsName };
  }
  if (!('storage' in navigator) || typeof navigator.storage.getDirectory !== 'function') {
    throw new ErreurWorkerSqlite(
      'stockage-indisponible',
      "Ce navigateur ne fournit pas l'Origin Private File System requis."
    );
  }

  await acquerirVerrou(configuration.nomVerrou);
  try {
    configurerChargementSqlite();
    // Import dynamique obligatoire : `sqlite3ApiConfig` doit exister avant l'évaluation du paquet.
    const { default: sqlite3InitModule } = await import('@sqlite.org/sqlite-wasm');
    sqlite3 = await sqlite3InitModule();
    pool = await sqlite3.installOpfsSAHPoolVfs({
      clearOnInit: false,
      initialCapacity: configuration.capaciteInitiale,
      directory: configuration.repertoirePool,
      name: configuration.nomVfs
    });
    base = new pool.OpfsSAHPoolDb(configuration.nomBase);
    if (base.dbVfsName() !== configuration.nomVfs) {
      throw new ErreurWorkerSqlite(
        'initialisation-impossible',
        `SQLite a ouvert la base avec un VFS inattendu : ${String(base.dbVfsName())}.`
      );
    }
    base.exec('PRAGMA journal_mode = DELETE; PRAGMA foreign_keys = ON;');
    configurationActive = configuration;
    return { nomBase: configuration.nomBase, nomVfs: pool.vfsName };
  } catch (erreur) {
    try {
      base?.close();
      base = null;
      pool?.pauseVfs();
      pool = null;
    } finally {
      await libererVerrou();
    }
    if (erreur instanceof ErreurWorkerSqlite) throw erreur;
    throw new ErreurWorkerSqlite(
      'initialisation-impossible',
      `Impossible d'ouvrir la base persistante du navigateur : ${messageDe(erreur)}.`
    );
  }
}

function exigerBase(): Database {
  if (base === null) {
    throw new ErreurWorkerSqlite('initialisation-impossible', "La base SQLite n'est pas ouverte.");
  }
  return base;
}

function exigerPool(): SAHPoolUtil {
  if (pool === null || configurationActive === null) {
    throw new ErreurWorkerSqlite(
      'initialisation-impossible',
      "Le stockage SQLite n'est pas initialise."
    );
  }
  return pool;
}

function verifierEnveloppeSauvegarde(donnees: unknown): asserts donnees is Uint8Array {
  if (!(donnees instanceof Uint8Array)) {
    throw new ErreurWorkerSqlite('sauvegarde-invalide', 'Le fichier choisi ne contient pas des octets.');
  }
  if (donnees.byteLength === 0) {
    throw new ErreurWorkerSqlite('sauvegarde-invalide', 'La sauvegarde choisie est vide.');
  }
  if (donnees.byteLength > TAILLE_MAX_SAUVEGARDE) {
    throw new ErreurWorkerSqlite(
      'sauvegarde-invalide',
      'La sauvegarde dépasse la taille maximale de 64 Mio.'
    );
  }
  const signatureValide = SIGNATURE_SQLITE.every((octet, index) => donnees[index] === octet);
  if (!signatureValide) {
    throw new ErreurWorkerSqlite(
      'sauvegarde-invalide',
      "Ce fichier n'est pas une base SQLite reconnue."
    );
  }
}

function ouvrirBaseDansPool(nomBase: string): Database {
  const vfs = exigerPool();
  const ouverte = new vfs.OpfsSAHPoolDb(nomBase);
  const nomVfsOuvert = ouverte.dbVfsName();
  if (nomVfsOuvert !== configurationActive?.nomVfs) {
    ouverte.close();
    throw new ErreurWorkerSqlite(
      'initialisation-impossible',
      `SQLite a ouvert la base avec un VFS inattendu : ${String(nomVfsOuvert)}.`
    );
  }
  ouverte.exec('PRAGMA journal_mode = DELETE; PRAGMA foreign_keys = ON;');
  return ouverte;
}

function verifierIntegriteEtTables(cible: Database): void {
  const integrite = cible.selectValue('PRAGMA integrity_check;');
  if (integrite !== 'ok') {
    throw new ErreurWorkerSqlite(
      'sauvegarde-invalide',
      `La vérification SQLite a échoué : ${String(integrite ?? 'résultat absent')}.`
    );
  }

  const presentes = new Set(
    cible
      .selectValues("SELECT name FROM sqlite_schema WHERE type = 'table';")
      .filter((nom): nom is string => typeof nom === 'string')
  );
  if (!presentes.has('schema_migrations')) {
    throw new ErreurWorkerSqlite(
      'sauvegarde-invalide',
      'La sauvegarde ne porte pas de version de schéma La Pierre des Mots.'
    );
  }

  const versions = cible
    .selectValues('SELECT version FROM schema_migrations ORDER BY version;')
    .map((version) => Number(version));
  const suiteValide =
    versions.length > 0 &&
    versions.every(
      (version, index) => Number.isInteger(version) && version === index + 1
    );
  const versionCourante = versions.at(-1) ?? 0;
  if (!suiteValide || versionCourante > VERSION_SCHEMA_MAXIMA) {
    throw new ErreurWorkerSqlite(
      'sauvegarde-invalide',
      `Version de sauvegarde inconnue ou incomplète : ${String(versionCourante)}.`
    );
  }

  const absentes = TABLES_REQUISES.filter(
    (table) => table.depuis <= versionCourante && !presentes.has(table.nom)
  ).map((table) => table.nom);
  if (absentes.length > 0) {
    throw new ErreurWorkerSqlite(
      'sauvegarde-invalide',
      `La sauvegarde ne correspond pas à La Pierre des Mots (tables absentes : ${absentes.join(', ')}).`
    );
  }
}

async function validerSauvegardeSansToucherLaBase(donnees: Uint8Array): Promise<void> {
  const vfs = exigerPool();
  const nomTemporaire = '/pierre-import-validation.sqlite3';
  let temporaire: Database | null = null;
  try {
    vfs.unlink(nomTemporaire);
    await vfs.importDb(nomTemporaire, donnees);
    temporaire = ouvrirBaseDansPool(nomTemporaire);
    verifierIntegriteEtTables(temporaire);
  } finally {
    temporaire?.close();
    vfs.unlink(nomTemporaire);
  }
}

function exporterBase(): Uint8Array {
  if (jetonTransaction !== null) {
    throw new ErreurWorkerSqlite(
      'transaction-invalide',
      "Une sauvegarde ne peut pas être créée pendant une transaction."
    );
  }
  const db = exigerBase();
  const api = sqlite3;
  if (api === null) {
    throw new ErreurWorkerSqlite('initialisation-impossible', "SQLite n'est pas initialise.");
  }
  return api.capi.sqlite3_js_db_export(db);
}

async function importerBase(donneesInconnues: unknown): Promise<{ readonly octets: number }> {
  if (jetonTransaction !== null) {
    throw new ErreurWorkerSqlite(
      'transaction-invalide',
      "Une sauvegarde ne peut pas être importée pendant une transaction."
    );
  }
  verifierEnveloppeSauvegarde(donneesInconnues);
  const donnees = donneesInconnues;
  await validerSauvegardeSansToucherLaBase(donnees);

  const configuration = configurationActive;
  const vfs = exigerPool();
  if (configuration === null) {
    throw new ErreurWorkerSqlite('initialisation-impossible', 'Configuration SQLite absente.');
  }

  // La copie de retour est prise avant toute fermeture. Si le remplacement ou sa seconde
  // validation échoue, elle est réimportée avant que l'erreur ne remonte à la fenêtre.
  const ancienne = exporterBase();
  base?.close();
  base = null;
  try {
    await vfs.importDb(configuration.nomBase, donnees);
    base = ouvrirBaseDansPool(configuration.nomBase);
    verifierIntegriteEtTables(base);
    return { octets: donnees.byteLength };
  } catch (cause) {
    try {
      base?.close();
      base = null;
      await vfs.importDb(configuration.nomBase, ancienne);
      base = ouvrirBaseDansPool(configuration.nomBase);
      verifierIntegriteEtTables(base);
    } catch (erreurRestauration) {
      throw new ErreurWorkerSqlite(
        'initialisation-impossible',
        `L'import a échoué et la base précédente n'a pas pu être restaurée : ${messageDe(erreurRestauration)}.`
      );
    }
    throw new ErreurWorkerSqlite(
      'sauvegarde-invalide',
      `La sauvegarde a été refusée ; la base précédente a été restaurée : ${messageDe(cause)}.`
    );
  }
}

function exigerJeton(jeton: string | null): void {
  if (jetonTransaction === null) {
    if (jeton !== null) {
      throw new ErreurWorkerSqlite('transaction-invalide', 'La transaction demandee est terminee.');
    }
    return;
  }
  if (jeton !== jetonTransaction) {
    throw new ErreurWorkerSqlite(
      'transaction-invalide',
      'La connexion SQLite est reservee par une autre transaction.'
    );
  }
}

function commencerTransaction(jeton: string): void {
  if (jetonTransaction !== null) {
    throw new ErreurWorkerSqlite('transaction-invalide', 'Une transaction SQLite est deja active.');
  }
  exigerBase().exec('BEGIN IMMEDIATE;');
  jetonTransaction = jeton;
}

function validerTransaction(jeton: string): void {
  exigerJeton(jeton);
  if (jetonTransaction === null) {
    throw new ErreurWorkerSqlite('transaction-invalide', "Aucune transaction n'est a valider.");
  }
  exigerBase().exec('COMMIT;');
  jetonTransaction = null;
}

function annulerTransaction(jeton: string): void {
  exigerJeton(jeton);
  if (jetonTransaction === null) return;
  try {
    exigerBase().exec('ROLLBACK;');
  } finally {
    jetonTransaction = null;
  }
}

async function fermer(): Promise<void> {
  if (jetonTransaction !== null && base !== null) {
    try {
      base.exec('ROLLBACK;');
    } catch {
      // La fermeture doit quand même libérer les handles OPFS et le Web Lock.
    }
    jetonTransaction = null;
  }
  base?.close();
  base = null;
  pool?.pauseVfs();
  pool = null;
  sqlite3 = null;
  configurationActive = null;
  await libererVerrou();
}

async function traiter(requete: RequeteSqliteWasm): Promise<unknown> {
  switch (requete.type) {
    case 'initialiser':
      promesseInitialisation ??= initialiser(requete.configuration);
      return promesseInitialisation;
    case 'executer':
      exigerJeton(requete.jeton);
      exigerBase().exec(requete.sql);
      return undefined;
    case 'lancer': {
      exigerJeton(requete.jeton);
      const db = exigerBase();
      if (requete.parametres.length === 0) db.exec(requete.sql);
      else db.exec({ sql: requete.sql, bind: requete.parametres });
      return {
        changements: Number(db.changes()),
        dernierIdInsere: sqlite3?.capi.sqlite3_last_insert_rowid(db) ?? 0n
      };
    }
    case 'une-ligne':
      exigerJeton(requete.jeton);
      return requete.parametres.length === 0
        ? exigerBase().selectObject(requete.sql)
        : exigerBase().selectObject(requete.sql, requete.parametres);
    case 'lignes':
      exigerJeton(requete.jeton);
      return requete.parametres.length === 0
        ? exigerBase().selectObjects(requete.sql)
        : exigerBase().selectObjects(requete.sql, requete.parametres);
    case 'debut-transaction':
      commencerTransaction(requete.jeton);
      return undefined;
    case 'valider-transaction':
      validerTransaction(requete.jeton);
      return undefined;
    case 'annuler-transaction':
      annulerTransaction(requete.jeton);
      return undefined;
    case 'exporter-base':
      return exporterBase();
    case 'importer-base':
      return importerBase(requete.donnees);
    case 'fermer':
      await fermer();
      return undefined;
  }
}

function messageDe(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : String(erreur);
}

function serialiserErreur(erreur: unknown): ErreurSqliteWasmSerialisee {
  if (erreur instanceof ErreurWorkerSqlite) {
    return { code: erreur.code, nom: erreur.name, message: erreur.message };
  }
  const resultCode =
    typeof erreur === 'object' &&
    erreur !== null &&
    'resultCode' in erreur &&
    typeof erreur.resultCode === 'number'
      ? erreur.resultCode
      : undefined;
  return {
    code: resultCode === undefined ? 'requete-invalide' : 'sqlite',
    nom: erreur instanceof Error ? erreur.name : 'Erreur',
    message: messageDe(erreur),
    ...(resultCode === undefined ? {} : { resultCode })
  };
}

let file: Promise<unknown> = Promise.resolve();

contexte.addEventListener('message', (evenement) => {
  if (!estRequete(evenement.data)) return;
  const requete = evenement.data;
  const traitement = file.then(() => traiter(requete));
  file = traitement.then(
    () => undefined,
    () => undefined
  );
  void traitement.then(
    (resultat) => {
      contexte.postMessage({ identifiant: requete.identifiant, ok: true, resultat });
    },
    (erreur: unknown) => {
      contexte.postMessage({
        identifiant: requete.identifiant,
        ok: false,
        erreur: serialiserErreur(erreur)
      });
    }
  );
});
