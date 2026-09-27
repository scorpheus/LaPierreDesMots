import type { CodeErreurSqliteWasm } from './protocole-sqlite-wasm.js';

/** Lectures SQLite communes au Worker et au contrôle des sauvegardes synthétiques. */
export interface LecteurValidationSqlite {
  selectValue(sql: string): unknown;
  selectValues(sql: string): unknown[];
}

export class ErreurWorkerSqlite extends Error {
  constructor(readonly code: CodeErreurSqliteWasm, message: string) {
    super(message);
    this.name = 'ErreurWorkerSqlite';
  }
}

// À relever avec toute nouvelle migration. Une sauvegarde d'une version antérieure connue sera
// migrée au rechargement ; une version future est refusée pour ne jamais ouvrir un schéma inconnu.
export const VERSION_SCHEMA_MAXIMA = 14;
export const TABLES_REQUISES = [
  { nom: 'preferences_niveaux_maths', depuis: 14 },
  { nom: 'sessions_projets_maths', depuis: 13 },
  { nom: 'progression_projets_maths', depuis: 13 },
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
  { nom: 'etagere_rang', depuis: 8 },
  { nom: 'reprises_lecture', depuis: 13 },
  { nom: 'instances_maths', depuis: 13 },
  { nom: 'actions_maths', depuis: 13 },
  { nom: 'reprises_maths', depuis: 13 },
  { nom: 'tentatives_maths', depuis: 13 },
  { nom: 'progression_maths', depuis: 13 },
  { nom: 'recompenses_maths', depuis: 13 }
] as const;

export function verifierIntegriteEtTables(cible: LecteurValidationSqlite): void {
  const integrite = cible.selectValue('PRAGMA integrity_check;');
  if (integrite !== 'ok') {
    throw new ErreurWorkerSqlite(
      'sauvegarde-invalide',
      `La vérification SQLite a échoué : ${String(integrite ?? 'résultat absent')}.`
    );
  }
  // integrity_check ne vérifie pas les références entre tables. La copie à importer
  // doit aussi conserver les liens entre journal, instances et profils.
  if (cible.selectValues('PRAGMA foreign_key_check;').length !== 0) {
    throw new ErreurWorkerSqlite(
      'sauvegarde-invalide',
      'La sauvegarde contient des données dont le profil ou la partie est absent.'
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
  if (versionCourante >= 12 && Number(cible.selectValue(
    "SELECT COUNT(*) FROM pragma_table_info('profils') WHERE name = 'generation_progression';"
  )) !== 1) {
    throw new ErreurWorkerSqlite('sauvegarde-invalide', 'La génération de progression manque dans la sauvegarde.');
  }
  if (versionCourante >= 13 && Number(cible.selectValue(
    "SELECT COUNT(*) FROM pragma_table_info('profils') WHERE name = 'generation_maths';"
  )) !== 1) {
    throw new ErreurWorkerSqlite('sauvegarde-invalide', 'La génération maths manque dans la sauvegarde.');
  }
}

