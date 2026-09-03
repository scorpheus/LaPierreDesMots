// Lanceur de La Pierre des Mots — contrat technique v1 § 1.1, lot L-A.
//
// Ce que ce script garantit, et qui est la promesse entière du lot :
//   on clone, on lance `demarrer.bat`, ça marche.
//
//   1. la version de Node est celle qu'attend `node:sqlite` intégré ;
//   2. `.env` est chargé s'il existe, sinon les défauts suffisent ;
//   3. ce qui doit être compilé l'est — et seulement s'il ne l'est pas déjà ;
//   4. le serveur démarre en HTTP (décision D3 : pas de certificat, pas de Docker) ;
//   5. l'adresse à taper sur la tablette est affichée, avec son QR ;
//   6. le PID est déposé pour `arreter.bat`.
//
// Usage :  node scripts/demarrer.mjs [--dev] [--port 8080] [--sans-construire]

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { annoncerService, PORT_PAR_DEFAUT } from './reseau.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FICHIER_PID = join(RACINE, 'donnees', 'serveur.pid');

/** Version minimale de Node — doit rester alignée sur `engines.node` du package.json. */
const NODE_MINIMAL = [24, 13, 0];

/** Port du serveur de développement Vite — contrat § 0, « Ports ». */
const PORT_VITE = 5173;

// ---------------------------------------------------------------- petits utilitaires

/** @param {string} message */
function echouer(message) {
  console.error('');
  console.error('  ✖ ' + message);
  console.error('');
  process.exit(1);
}

/** @param {string} message */
function etape(message) {
  console.log('  · ' + message);
}

/**
 * Compare deux triplets de version.
 * @param {number[]} a @param {number[]} b @returns {number}
 */
function comparerVersions(a, b) {
  for (let i = 0; i < 3; i += 1) {
    const gauche = a[i] ?? 0;
    const droite = b[i] ?? 0;
    if (gauche !== droite) return gauche - droite;
  }
  return 0;
}

/**
 * Exécute une commande et attend sa fin. Rejette si le code de sortie n'est pas 0.
 * @param {string} commande
 * @param {string[]} arguments_
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv }} [options]
 * @returns {Promise<void>}
 */
function executer(commande, arguments_, options = {}) {
  return new Promise((resoudre, rejeter) => {
    const enfant = spawn(commande, arguments_, {
      cwd: options.cwd ?? RACINE,
      env: options.env ?? process.env,
      stdio: 'inherit',
      // Sous Windows, `npm` et `npx` sont des `.cmd` : sans shell, `spawn` ne les trouve pas.
      shell: process.platform === 'win32'
    });
    enfant.on('error', rejeter);
    enfant.on('close', (code) => {
      if (code === 0) resoudre(undefined);
      else rejeter(new Error(`\`${commande} ${arguments_.join(' ')}\` a échoué (code ${code}).`));
    });
  });
}

/** @param {string[]} arguments_ */
function lireOptions(arguments_) {
  const options = {
    dev: arguments_.includes('--dev'),
    sansConstruire: arguments_.includes('--sans-construire'),
    port: Number(process.env.PIERRE_PORT ?? PORT_PAR_DEFAUT)
  };
  const indexPort = arguments_.indexOf('--port');
  if (indexPort !== -1 && arguments_[indexPort + 1]) {
    options.port = Number(arguments_[indexPort + 1]);
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    echouer(`Port invalide : « ${options.port} ». Attendu un entier entre 1 et 65535.`);
  }
  return options;
}

// ---------------------------------------------------------------- contrôles préalables

function verifierNode() {
  const brute = process.versions.node.split('.').map(Number);
  if (comparerVersions(brute, NODE_MINIMAL) < 0) {
    echouer(
      `Node ${NODE_MINIMAL.join('.')} ou plus récent est requis (trouvé ${process.versions.node}).\n` +
        "    Le socle repose sur `node:sqlite`, intégré à partir de Node 24.\n" +
        '    Télécharger la version LTS sur https://nodejs.org — rien d’autre à installer.'
    );
  }
}

function chargerEnvironnement() {
  const fichier = join(RACINE, '.env');
  if (!existsSync(fichier)) return false;
  try {
    process.loadEnvFile(fichier);
    return true;
  } catch (erreur) {
    echouer(`Le fichier .env existe mais n’a pas pu être lu : ${String(erreur)}`);
    return false;
  }
}

function verifierInstallation() {
  if (existsSync(join(RACINE, 'node_modules'))) return;
  echouer(
    "Les dépendances ne sont pas installées.\n" +
      '    Lancer :  npm ci        (ou `npm install` au tout premier clone)\n' +
      '    `demarrer.bat` le fait normalement pour vous.'
  );
}

// ---------------------------------------------------------------- construction

/**
 * Renvoie le fichier le plus récent d'une arborescence. Les dossiers de sortie sont exclus :
 * leur propre écriture ne doit évidemment pas déclencher une nouvelle construction.
 * @param {string} cheminRelatif
 * @returns {number}
 */
function dateLaPlusRecente(cheminRelatif) {
  const chemin = join(RACINE, cheminRelatif);
  if (!existsSync(chemin)) return 0;
  const etat = statSync(chemin);
  if (!etat.isDirectory()) return etat.mtimeMs;

  let plusRecente = etat.mtimeMs;
  for (const entree of readdirSync(chemin, { withFileTypes: true })) {
    if (entree.name === 'dist' || entree.name === 'node_modules') continue;
    plusRecente = Math.max(
      plusRecente,
      dateLaPlusRecente(join(cheminRelatif, entree.name)),
    );
  }
  return plusRecente;
}

/** @param {string} sortie @param {string[]} entrees */
function constructionPerimee(sortie, entrees) {
  const cheminSortie = join(RACINE, sortie);
  if (!existsSync(cheminSortie)) return true;
  const dateSortie = statSync(cheminSortie).mtimeMs;
  return entrees.some((entree) => dateLaPlusRecente(entree) > dateSortie);
}

/**
 * Construit ce qui manque, et rien de plus. Un lancement quotidien ne recompile pas :
 * la promesse « deux secondes » de CLAUDE.md en dépend.
 * @param {{ dev: boolean, sansConstruire: boolean }} options
 */
async function construireSiNecessaire(options) {
  if (options.sansConstruire) {
    etape('Construction ignorée (--sans-construire).');
    return;
  }

  // `partage/` est requis dans les deux modes : `serveur/` s'exécute sur `partage/dist/`
  // (contrat § 3.2), y compris quand le client est servi par Vite.
  if (constructionPerimee('partage/dist/index.js', ['partage/src', 'partage/package.json'])) {
    etape('Compilation de partage…');
    await executer('npm', ['run', 'construire', '-w', '@pierre/partage']);
  }

  if (options.dev) return;

  if (
    constructionPerimee('serveur/dist/index.js', [
      'serveur/src',
      'serveur/package.json',
      'partage/dist/index.js',
    ])
  ) {
    etape('Compilation du serveur…');
    await executer('npm', ['run', 'construire', '-w', '@pierre/serveur']);
  }
  if (
    constructionPerimee('client/dist/index.html', [
      'client/src',
      'client/index.html',
      'client/package.json',
      'client/vite.config.ts',
      'partage/dist/index.js',
    ])
  ) {
    etape('Compilation du client…');
    await executer('npm', ['run', 'construire', '-w', '@pierre/client']);
  }
}

// ---------------------------------------------------------------- PID

/** @param {number} pid */
function deposerPid(pid) {
  mkdirSync(dirname(FICHIER_PID), { recursive: true });
  writeFileSync(FICHIER_PID, String(pid), 'utf8');
}

function retirerPid() {
  try {
    if (existsSync(FICHIER_PID)) rmSync(FICHIER_PID);
  } catch {
    // Un PID résiduel n'empêche rien : `arreter.bat` sait qu'un PID peut être mort.
  }
}

// ---------------------------------------------------------------- lancement

/**
 * @param {{ dev: boolean, port: number }} options
 * @returns {import('node:child_process').ChildProcess}
 */
function lancerServeur(options) {
  const environnement = {
    ...process.env,
    PIERRE_PORT: String(options.port),
    PIERRE_RACINE: RACINE
  };

  if (options.dev) {
    // `tsx watch` : le serveur se recharge à chaque sauvegarde d'un fichier de `serveur/src/`.
    return spawn('npx', ['tsx', 'watch', 'serveur/src/index.ts'], {
      cwd: RACINE,
      env: environnement,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
  }

  const entree = join(RACINE, 'serveur', 'dist', 'index.js');
  if (!existsSync(entree)) {
    echouer(
      `Le serveur compilé est introuvable : ${entree}\n` +
        '    La compilation a-t-elle réussi ? Relancer :  npm run construire'
    );
  }
  return spawn(process.execPath, [entree], {
    cwd: RACINE,
    env: environnement,
    stdio: 'inherit'
  });
}

/**
 * @param {{ port: number }} _options
 * @returns {import('node:child_process').ChildProcess}
 */
function lancerVite(_options) {
  return spawn('npx', ['vite', '--host', '--port', String(PORT_VITE)], {
    cwd: join(RACINE, 'client'),
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
}

// ---------------------------------------------------------------- programme principal

async function principal() {
  const options = lireOptions(process.argv.slice(2));

  console.log('');
  console.log('  La Pierre des Mots' + (options.dev ? '  —  mode développement' : ''));
  console.log('');

  verifierNode();
  verifierInstallation();
  if (chargerEnvironnement()) etape('Configuration lue depuis .env');

  try {
    await construireSiNecessaire(options);
  } catch (erreur) {
    echouer(
      `La compilation a échoué.\n    ${String(erreur instanceof Error ? erreur.message : erreur)}`
    );
  }

  /** @type {import('node:child_process').ChildProcess[]} */
  const enfants = [];

  const serveur = lancerServeur(options);
  enfants.push(serveur);
  if (serveur.pid) deposerPid(serveur.pid);

  if (options.dev) enfants.push(lancerVite(options));

  let termine = false;
  const arreterTout = () => {
    if (termine) return;
    termine = true;
    retirerPid();
    for (const enfant of enfants) {
      if (!enfant.killed) enfant.kill();
    }
  };

  process.on('SIGINT', () => {
    arreterTout();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    arreterTout();
    process.exit(0);
  });

  serveur.on('close', (code) => {
    arreterTout();
    process.exit(code ?? 0);
  });

  // Le serveur met une fraction de seconde à écouter ; on annonce ensuite, pour que le QR
  // soit la dernière chose affichée et reste sous les yeux du parent.
  // Aucune attente arbitraire dans le chemin de test : ceci est un lanceur, pas un test.
  setTimeout(() => {
    void annoncerService(options.dev ? PORT_VITE : options.port);
  }, 700);
}

principal().catch((erreur) => {
  echouer(String(erreur instanceof Error ? erreur.stack : erreur));
});
