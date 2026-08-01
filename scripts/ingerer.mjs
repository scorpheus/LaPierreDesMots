// Enveloppe Node de la chaîne d'ingestion — lot L2-G, contrat features v2 § 3.7.
// Appelée par `npm run ingerer`.
//
// CE QU'ELLE FAIT, DANS CET ORDRE
//   1. s'assure que `.venv/` existe et porte PyMuPDF + Pillow — sinon elle délègue à
//      `scripts/telecharger-outils.mjs`, qui est le SEUL à installer quoi que ce soit ;
//   2. lance `scripts/ingestion/extraire-fiches.py` sur chaque niveau demandé ;
//   3. optionnellement découpe les illustrations puis les vectorise ;
//   4. AGRÈGE les manifestes de niveau en un manifeste de corpus.
//
// POURQUOI L'AGRÉGATION EST FAITE EN PYTHON, ET NON ICI
//   `scripts/ingestion/manifeste.py` porte déjà la comptabilité du corpus. La réécrire en
//   JavaScript donnerait deux implantations de la même règle, donc deux vérités — et c'est
//   toujours la seconde qui se trompe en silence. Cette enveloppe appelle donc `manifeste.py`
//   et se contente de lire son résultat.
//
// LA RÈGLE QUI COMMANDE LE CODE DE SORTIE
//   Un refus n'est PAS un échec : le niveau 7 refuse ses 15 fiches par décision de contrat
//   (§ 8, n° 3 — point ouvert O7). Ce qui est un échec, c'est une fiche qui disparaît du
//   décompte. Le code de sortie suit donc l'ÉCART, pas le nombre de refus.
//
// Usage :
//   node scripts/ingerer.mjs                       # les 7 niveaux
//   node scripts/ingerer.mjs --niveau 3 --niveau 5
//   node scripts/ingerer.mjs --niveau 1 --illustrations --vectoriser

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER_VENV = join(RACINE, '.venv');
const DOSSIER_BROUILLONS = join(RACINE, 'contenu', 'brouillons');
const INGESTION = join(RACINE, 'scripts', 'ingestion');

/** Les sept niveaux du corpus. Table fermée : 7 PDF x 15 fiches = 105. */
const NIVEAUX = [1, 2, 3, 4, 5, 6, 7];

/** @returns {string} */
function pythonDuVenv() {
  return process.platform === 'win32'
    ? join(DOSSIER_VENV, 'Scripts', 'python.exe')
    : join(DOSSIER_VENV, 'bin', 'python');
}

/**
 * Le venv, ou un message qui nomme le défaut pour ce qu'il est.
 * @returns {string | null}
 */
function preparerVenv() {
  let python = pythonDuVenv();
  if (existsSync(python)) return python;

  console.log('  · .venv/ absent — délégation à scripts/telecharger-outils.mjs.');
  const preparation = spawnSync(
    process.execPath,
    [join(RACINE, 'scripts', 'telecharger-outils.mjs')],
    { stdio: 'inherit', windowsHide: true }
  );
  python = pythonDuVenv();
  if (existsSync(python)) return python;

  console.error('');
  console.error("  ✖ .venv/ reste absent (npm run preparer a rendu " + preparation.status + ').');
  console.error('    C’est un défaut d’ENVIRONNEMENT, pas de code : contrat features v2 § 2.2.');
  console.error('    Installer Python 3.11+ puis relancer `npm run preparer`.');
  console.error('    Rien ne s’installe hors du dépôt, jamais (décision D9).');
  console.error('');
  return null;
}

/**
 * @param {string} python
 * @param {string} script
 * @param {string[]} arguments_
 * @returns {number}
 */
function lancer(python, script, arguments_) {
  const execution = spawnSync(python, [join(INGESTION, script), ...arguments_], {
    stdio: 'inherit',
    windowsHide: true
  });
  return execution.status ?? 2;
}

function principal() {
  const bruts = process.argv.slice(2);
  const demandes = bruts
    .map((valeur, index) => (bruts[index - 1] === '--niveau' ? Number(valeur) : Number.NaN))
    .filter((n) => Number.isInteger(n) && NIVEAUX.includes(n));
  const niveaux = demandes.length > 0 ? demandes : NIVEAUX;
  const avecIllustrations = bruts.includes('--illustrations');
  const avecVectorisation = bruts.includes('--vectoriser');

  console.log('');
  console.log(`  Ingestion des fiches d’origine — niveaux ${niveaux.join(', ')}.`);
  console.log('  Sortie : contenu/brouillons/ et NULLE PART AILLEURS (annexe P § 6.4).');
  console.log('');

  const python = preparerVenv();
  if (!python) return 2;

  /** @type {number[]} */
  const environnement = [];
  for (const niveau of niveaux) {
    console.log('');
    console.log(`  ── niveau ${niveau} ─────────────────────────────────────────`);
    // 0 = tout ingéré · 1 = au moins un refus (légitime) · 2 = environnement.
    const code = lancer(python, 'extraire-fiches.py', ['--niveau', String(niveau)]);
    if (code >= 2) environnement.push(niveau);

    if (avecIllustrations) {
      lancer(python, 'extraire-illustrations.py', ['--niveau', String(niveau)]);
    }
    if (avecVectorisation) {
      lancer(python, 'vectoriser.py', ['--niveau', String(niveau)]);
    }
  }

  console.log('');
  console.log('  ── comptabilité du corpus ──────────────────────────────');
  const agregation = spawnSync(python, [join(INGESTION, 'manifeste.py'), DOSSIER_BROUILLONS], {
    stdio: ['ignore', 'ignore', 'inherit'],
    windowsHide: true
  });
  if (agregation.status !== 0) {
    console.error('  ✖ agrégation impossible : voir ci-dessus.');
    return 1;
  }

  const global_ = JSON.parse(readFileSync(join(DOSSIER_BROUILLONS, 'manifeste.json'), 'utf8'));
  for (const ligne of global_.niveaux) {
    console.log(
      `    niveau ${ligne.niveau} : ${String(ligne.fichesIngerees).padStart(3)} ingérée(s) · ` +
        `${String(ligne.fichesRefusees).padStart(3)} refusée(s) sur ${ligne.fichesDuPdf}`
    );
  }
  console.log('');
  console.log(`    corpus            : ${global_.fichesDuCorpus} fiches`);
  console.log(`    ingérées          : ${global_.fichesIngerees}`);
  console.log(`    refusées          : ${global_.fichesRefusees}`);
  console.log(`    ÉCART             : ${global_.ecart}   (doit valoir 0)`);
  console.log(`    refus par motif   : ${JSON.stringify(global_.refusParMotif)}`);
  console.log('');

  if (environnement.length > 0) {
    console.error(`  ✖ niveau(x) ${environnement.join(', ')} : défaut d’environnement.`);
    return 2;
  }
  if (global_.ecart !== 0) {
    console.error(`  ✖ ÉCART DE ${global_.ecart} FICHE(S) : des fiches ont disparu du décompte.`);
    return 1;
  }
  console.log('  Comptabilité fermée : chaque fiche est ingérée, ou refusée avec son motif.');
  console.log('');
  return 0;
}

process.exit(principal());
