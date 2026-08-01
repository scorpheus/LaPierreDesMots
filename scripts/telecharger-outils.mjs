// Installation des outils tiers du dépôt — contrat technique v1 § 1.1, lot L-A.
// Appelé par `npm run preparer`.
//
// RÈGLE QUI COMMANDE TOUT CE FICHIER (décision D9) : rien ne s'installe hors du dossier du
// projet. Les binaires vont dans `outils/bin/`, le venv Python dans `.venv/`, les deux sont
// ignorés par git. Aucun `npm install -g`, aucun `pip install` global, jamais.
//
// Deux propriétés non négociables :
//   · IDEMPOTENT — relancer ne retélécharge rien et ne réinstalle rien.
//   · BRUYANT EN CAS DE DOUTE — une empreinte qui ne correspond pas, un outil sans empreinte
//     déclarée, un Python absent : le script s'arrête et dit quoi faire. Il ne « fait de son
//     mieux » jamais : un outil à moitié installé se paie trois heures plus tard.
//
// Usage :  node scripts/telecharger-outils.mjs [--sans-python] [--forcer]

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER_OUTILS = join(RACINE, 'outils');
const DOSSIER_BIN = join(DOSSIER_OUTILS, 'bin');
const DOSSIER_CACHE = join(DOSSIER_OUTILS, 'telechargements');
const DOSSIER_VENV = join(RACINE, '.venv');
const REQUIREMENTS = join(RACINE, 'scripts', 'ingestion', 'requirements.txt');

// ---------------------------------------------------------------- manifeste

/**
 * @typedef {object} OutilTiers
 * @property {string} nom             identifiant court, sert de nom de dossier
 * @property {string} libelle         ce que l'outil sert à faire, en français
 * @property {string} url             archive ou binaire, HTTPS uniquement
 * @property {string | null} empreinte sha256 hexadécimal de ce que l'URL renvoie
 * @property {string} temoin          chemin, relatif à `outils/bin/`, prouvant l'installation
 * @property {boolean} archive        vrai si l'URL renvoie une archive à extraire
 */

/**
 * Les outils réellement installés par `npm run preparer` en v1.
 *
 * **VIDE, et c'est le contrat** (§ 1.1 : « aucun en v1 : sort en code 0 »). La v1 est la tranche
 * verticale mince de la décision D1 : un nœud, un moteur, des SVG bouchons écrits à la main
 * (D2). Aucune vectorisation, donc aucun binaire tiers.
 *
 * @type {OutilTiers[]}
 */
const OUTILS = [];

/**
 * Ce qui viendra, et pourquoi ce n'est pas encore là.
 *
 * `potrace` est autorisé par la décision D4 et nécessaire à l'annexe P § 3.2, mais il n'entre
 * en jeu qu'au lot L1b (vectorisation des planches ComfyUI). Son entrée est écrite ici, non
 * activée, avec `empreinte: null` — le script REFUSE de télécharger un outil sans empreinte
 * plutôt que d'exécuter un binaire qu'il n'a pas pu vérifier.
 *
 * Pour l'activer : renseigner `url` et `empreinte` (sha256 de l'archive téléchargée à la main
 * et vérifiée), puis déplacer l'entrée dans `OUTILS`.
 *
 * @type {OutilTiers[]}
 */
export const OUTILS_A_VENIR = [
  {
    nom: 'potrace',
    libelle: 'Vectorisation du trait noir en SVG (annexe P § 3.2, lot L1b)',
    url: '',
    empreinte: null,
    temoin: 'potrace/potrace.exe',
    archive: true
  }
];

// ---------------------------------------------------------------- sortie

let echecs = 0;

/** @param {string} message */
const info = (message) => console.log('  · ' + message);
/** @param {string} message */
const bien = (message) => console.log('  ✓ ' + message);
/** @param {string} message */
const mal = (message) => {
  echecs += 1;
  console.error('  ✖ ' + message);
};

// ---------------------------------------------------------------- empreintes

/**
 * @param {Uint8Array | string} donnees
 * @returns {string}
 */
function empreinteSha256(donnees) {
  return createHash('sha256').update(donnees).digest('hex');
}

/**
 * @param {string} chemin
 * @returns {string | null}
 */
function empreinteFichier(chemin) {
  if (!existsSync(chemin)) return null;
  return empreinteSha256(readFileSync(chemin));
}

// ---------------------------------------------------------------- outils tiers

/**
 * @param {OutilTiers} outil
 * @param {{ forcer: boolean }} options
 * @returns {Promise<void>}
 */
async function installerOutil(outil, options) {
  const temoin = join(DOSSIER_BIN, outil.temoin);

  if (!options.forcer && existsSync(temoin)) {
    bien(`${outil.nom} — déjà installé (${outil.temoin})`);
    return;
  }

  if (!outil.empreinte) {
    mal(
      `${outil.nom} — aucune empreinte sha256 déclarée. Téléchargement REFUSÉ.\n` +
        "     Un binaire non vérifié est un binaire qu'on exécute en aveugle : renseigner\n" +
        '     `empreinte` dans scripts/telecharger-outils.mjs avant de réessayer.'
    );
    return;
  }

  if (!outil.url.startsWith('https://')) {
    mal(`${outil.nom} — URL absente ou non HTTPS : « ${outil.url} ». Téléchargement REFUSÉ.`);
    return;
  }

  mkdirSync(DOSSIER_CACHE, { recursive: true });
  const archive = join(DOSSIER_CACHE, `${outil.nom}${outil.archive ? '.zip' : ''}`);

  info(`${outil.nom} — téléchargement…`);
  try {
    const reponse = await fetch(outil.url);
    if (!reponse.ok) {
      mal(`${outil.nom} — le serveur a répondu ${reponse.status} ${reponse.statusText}.`);
      return;
    }
    writeFileSync(archive, new Uint8Array(await reponse.arrayBuffer()));
  } catch (erreur) {
    mal(
      `${outil.nom} — téléchargement impossible : ${String(erreur)}\n` +
        '     Vérifier la connexion. Cette étape est la SEULE du dépôt qui exige le réseau ;\n' +
        "     le jeu lui-même est entièrement hors-ligne."
    );
    return;
  }

  const mesuree = empreinteFichier(archive);
  if (mesuree !== outil.empreinte) {
    rmSync(archive, { force: true });
    mal(
      `${outil.nom} — EMPREINTE INCORRECTE. Fichier supprimé, rien n'a été installé.\n` +
        `     attendue : ${outil.empreinte}\n` +
        `     obtenue  : ${mesuree}\n` +
        "     Soit l'URL a changé de contenu, soit le téléchargement est corrompu."
    );
    return;
  }

  const destination = join(DOSSIER_BIN, outil.nom);
  mkdirSync(destination, { recursive: true });

  if (outil.archive) {
    // `tar` est fourni par Windows 10/11 (bsdtar) et lit les .zip. Aucune dépendance npm.
    const extraction = spawnSync('tar', ['-xf', archive, '-C', destination], {
      stdio: 'inherit',
      windowsHide: true
    });
    if (extraction.status !== 0) {
      mal(`${outil.nom} — extraction impossible (tar a rendu ${extraction.status}).`);
      return;
    }
  } else {
    writeFileSync(join(destination, outil.temoin.split('/').pop() ?? outil.nom), readFileSync(archive));
  }

  if (!existsSync(temoin)) {
    mal(
      `${outil.nom} — installé, mais le témoin attendu est absent : ${outil.temoin}\n` +
        "     L'archive n'a pas la forme prévue par le manifeste."
    );
    return;
  }

  bien(`${outil.nom} — installé dans outils/bin/${outil.nom}`);
}

// ---------------------------------------------------------------- venv Python

/** @returns {string | null} */
function trouverPython() {
  const candidats =
    process.platform === 'win32'
      ? [['py', ['-3', '--version']], ['python', ['--version']]]
      : [['python3', ['--version']], ['python', ['--version']]];

  for (const [commande, arguments_] of candidats) {
    const essai = spawnSync(/** @type {string} */ (commande), /** @type {string[]} */ (arguments_), {
      encoding: 'utf8',
      windowsHide: true
    });
    if (essai.status === 0) return /** @type {string} */ (commande);
  }
  return null;
}

/** @returns {string} */
function pythonDuVenv() {
  return process.platform === 'win32'
    ? join(DOSSIER_VENV, 'Scripts', 'python.exe')
    : join(DOSSIER_VENV, 'bin', 'python');
}

/**
 * Crée `.venv/` à la racine du dépôt et y installe les paquets d'ingestion.
 * Idempotent par empreinte : tant que `requirements.txt` n'a pas changé, on ne réinstalle rien.
 * @param {{ forcer: boolean }} options
 */
function preparerVenv(options) {
  if (!existsSync(REQUIREMENTS)) {
    info(
      'Aucun scripts/ingestion/requirements.txt — venv Python non nécessaire à ce stade.\n' +
        "     (Ce fichier appartient au lot d'ingestion ; il apparaîtra avec lui.)"
    );
    return;
  }

  const empreinteVoulue = empreinteFichier(REQUIREMENTS);
  const marqueur = join(DOSSIER_VENV, '.empreinte-requirements');
  const python = pythonDuVenv();

  if (
    !options.forcer &&
    existsSync(python) &&
    existsSync(marqueur) &&
    readFileSync(marqueur, 'utf8').trim() === empreinteVoulue
  ) {
    bien('venv Python — déjà à jour (.venv/)');
    return;
  }

  if (!existsSync(python)) {
    const interpreteur = trouverPython();
    if (!interpreteur) {
      mal(
        "Python est introuvable : impossible de créer .venv/.\n" +
          '     Installer Python 3.11+ depuis https://www.python.org, puis relancer\n' +
          '     `npm run preparer`. Rien d’autre n’est à installer globalement.'
      );
      return;
    }
    info(`Création du venv avec « ${interpreteur} »…`);
    const creation = spawnSync(
      interpreteur,
      interpreteur === 'py' ? ['-3', '-m', 'venv', DOSSIER_VENV] : ['-m', 'venv', DOSSIER_VENV],
      { stdio: 'inherit', windowsHide: true }
    );
    if (creation.status !== 0 || !existsSync(python)) {
      mal(`La création de .venv/ a échoué (code ${creation.status}).`);
      return;
    }
  }

  info('Installation des paquets d’ingestion dans .venv/…');
  const installation = spawnSync(python, ['-m', 'pip', 'install', '-r', REQUIREMENTS], {
    stdio: 'inherit',
    windowsHide: true
  });
  if (installation.status !== 0) {
    mal(`pip a échoué (code ${installation.status}). Rien n’a été installé hors de .venv/.`);
    return;
  }

  writeFileSync(marqueur, `${empreinteVoulue}\n`, 'utf8');
  bien('venv Python — prêt (.venv/)');
}

// ---------------------------------------------------------------- programme principal

async function principal() {
  const arguments_ = process.argv.slice(2);
  const options = {
    forcer: arguments_.includes('--forcer'),
    sansPython: arguments_.includes('--sans-python') || process.env.PIERRE_SANS_PYTHON === '1'
  };

  console.log('');
  console.log('  Préparation des outils — tout reste dans le dépôt (décision D9).');
  console.log('');

  mkdirSync(DOSSIER_BIN, { recursive: true });

  if (OUTILS.length === 0) {
    info('0 binaire tiers requis en v1 — rien à télécharger.');
    for (const futur of OUTILS_A_VENIR) {
      info(`  (à venir : ${futur.nom} — ${futur.libelle} ; empreinte à renseigner)`);
    }
  } else {
    for (const outil of OUTILS) {
      await installerOutil(outil, options);
    }
  }

  console.log('');
  if (options.sansPython) {
    info('Venv Python ignoré (--sans-python).');
  } else {
    preparerVenv(options);
  }

  console.log('');
  if (echecs === 0) {
    console.log('  Préparation terminée. Aucun problème.');
    console.log('');
    process.exit(0);
  }
  console.error(`  ${echecs} problème(s) — rien n’a été installé à moitié, voir ci-dessus.`);
  console.error('');
  process.exit(1);
}

principal().catch((erreur) => {
  console.error('');
  console.error('  ✖ ' + String(erreur instanceof Error ? erreur.stack : erreur));
  console.error('');
  process.exit(1);
});
