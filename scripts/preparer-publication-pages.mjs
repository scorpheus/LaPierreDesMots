#!/usr/bin/env node
/**
 * Finalise le livrable PWA puis, sur demande, prepare la branche locale `gh-pages`.
 *
 * AUCUN appel de ce script ne pousse vers GitHub. La commande distante est seulement affichee
 * a la fin, afin que le proprietaire puisse voir exactement ce qui partirait avant de l'autoriser.
 */

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
export const BASE_PAGES = '/LaPierreDesMots/';
export const DIST_PWA = path.join(RACINE, 'client', 'dist-pwa');
export const BAC_A_SABLE = path.join(RACINE, 'bac-a-sable');
export const DOSSIER_BRANCHE = path.join(BAC_A_SABLE, 'publication-gh-pages');

const MODELE_SERVICE_WORKER = path.join(
  RACINE,
  'client',
  'src',
  'pwa',
  'service-worker.js'
);
const ICONE_SOURCE = path.join(
  RACINE,
  'contenu',
  'assets',
  'gobi',
  'stades',
  'stade-10.svg'
);

const POLICES_REQUISES = [
  'andika-regular.woff2',
  'andika-bold.woff2',
  'opendyslexic-regular.woff2',
  'atkinson-hyperlegible-regular.woff2',
  'atkinson-hyperlegible-bold.woff2',
  'fredoka-variable.woff2'
];

function exiger(condition, message) {
  if (!condition) throw new Error(message);
}

function relatifPosix(racine, fichier) {
  return path.relative(racine, fichier).split(path.sep).join('/');
}

function resoudreSousRacine(racine, relatif) {
  const cible = path.resolve(racine, relatif);
  const ecart = path.relative(racine, cible);
  if (ecart === '' || (!ecart.startsWith(`..${path.sep}`) && ecart !== '..' && !path.isAbsolute(ecart))) {
    return cible;
  }
  throw new Error(`Chemin hors de la racine autorisee : ${relatif}`);
}

function listerFichiers(racine) {
  const fichiers = [];
  const visiter = (dossier) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const absolu = path.join(dossier, entree.name);
      if (entree.isDirectory()) visiter(absolu);
      else if (entree.isFile()) fichiers.push(absolu);
    }
  };
  visiter(racine);
  return fichiers.sort((a, b) => relatifPosix(racine, a).localeCompare(relatifPosix(racine, b)));
}

/** Les artefacts ignores par git doivent exister sur la machine qui construit. */
export function verifierEntreesLocales() {
  const absentes = [];
  let manifesteAudioLu = null;
  for (const police of POLICES_REQUISES) {
    const fichier = path.join(RACINE, 'client', 'public', 'polices', police);
    if (!existsSync(fichier) || statSync(fichier).size === 0) absentes.push(relatifPosix(RACINE, fichier));
  }

  const manifesteAudio = path.join(RACINE, 'contenu', 'audio', 'manifeste.json');
  if (!existsSync(manifesteAudio)) {
    absentes.push('contenu/audio/manifeste.json');
  } else {
    const manifeste = JSON.parse(readFileSync(manifesteAudio, 'utf8'));
    manifesteAudioLu = manifeste;
    exiger(Array.isArray(manifeste.clips), 'Le manifeste audio ne porte pas de tableau `clips`.');
    for (const clip of manifeste.clips) {
      exiger(
        typeof clip === 'object' && clip !== null && typeof clip.fichier === 'string',
        'Une entree du manifeste audio ne porte pas de fichier.'
      );
      const fichier = resoudreSousRacine(path.join(RACINE, 'contenu'), clip.fichier);
      if (!existsSync(fichier) || statSync(fichier).size === 0) {
        absentes.push(relatifPosix(RACINE, fichier));
      }
    }
  }

  if (absentes.length > 0) {
    throw new Error(
      `Le build local est incomplet : ${String(absentes.length)} artefact(s) ignore(s) absent(s).\n` +
        absentes.slice(0, 20).map((fichier) => `  - ${fichier}`).join('\n')
    );
  }
  return manifesteAudioLu;
}

function copierAudioPublie(manifeste) {
  exiger(manifeste !== null && Array.isArray(manifeste.clips), 'Manifeste audio local illisible.');
  const dejaCopies = new Set();
  for (const clip of manifeste.clips) {
    if (dejaCopies.has(clip.fichier)) continue;
    dejaCopies.add(clip.fichier);
    const source = resoudreSousRacine(path.join(RACINE, 'contenu'), clip.fichier);
    const destination = resoudreSousRacine(DIST_PWA, clip.fichier);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
  const sourceManifeste = path.join(RACINE, 'contenu', 'audio', 'manifeste.json');
  const destinationManifeste = path.join(DIST_PWA, 'audio', 'manifeste.json');
  mkdirSync(path.dirname(destinationManifeste), { recursive: true });
  copyFileSync(sourceManifeste, destinationManifeste);
}

function estImageLourde(fichier) {
  return /\.(?:avif|jpe?g|png|webp)$/iu.test(fichier);
}

/**
 * Les SVG historiques nomment leurs rasters comme le serveur LAN
 * (`/api/contenu/assets/...`). Le manifeste Vite est la seule table fiable entre ces chemins
 * sources et leurs noms empreintés : une recherche par seul nom de fichier serait ambiguë.
 */
function reecrireImagesImbriquees() {
  const fichierManifeste = path.join(DIST_PWA, '.vite', 'manifest.json');
  exiger(existsSync(fichierManifeste), 'Le manifeste Vite du build PWA est absent.');
  const manifeste = JSON.parse(readFileSync(fichierManifeste, 'utf8'));
  const urlParChemin = new Map();
  for (const [source, entree] of Object.entries(manifeste)) {
    if (typeof entree !== 'object' || entree === null || typeof entree.file !== 'string') continue;
    const normalise = source.replaceAll('\\', '/');
    const marqueur = '/contenu/';
    const position = normalise.lastIndexOf(marqueur);
    if (position !== -1) {
      urlParChemin.set(normalise.slice(position + marqueur.length), urlDeFichier(entree.file));
    }
  }

  const introuvables = new Set();
  for (const fichier of listerFichiers(DIST_PWA).filter((item) => item.endsWith('.svg'))) {
    const source = readFileSync(fichier, 'utf8');
    const reecrit = source.replace(
      /(href|xlink:href)=(["'])\/api\/contenu\/assets\/([^"']+)\2/gu,
      (correspondance, attribut, guillemet, cheminEncode) => {
        let chemin = cheminEncode;
        try {
          chemin = decodeURIComponent(cheminEncode);
        } catch {
          // Le chemin brut est contrôlé juste après.
        }
        const cible = urlParChemin.get(chemin);
        if (cible === undefined) {
          introuvables.add(chemin);
          return correspondance;
        }
        return `${attribut}=${guillemet}${cible}${guillemet}`;
      }
    );
    if (reecrit !== source) writeFileSync(fichier, reecrit, 'utf8');
  }
  exiger(
    introuvables.size === 0,
    `Images imbriquees introuvables dans le manifeste Vite : ${[...introuvables].sort().join(', ')}`
  );
}

function urlDeFichier(relatif) {
  return `${BASE_PAGES}${relatif.split('/').map(encodeURIComponent).join('/')}`;
}

function empreinteLivrable(fichiers) {
  const hachage = createHash('sha256');
  for (const fichier of fichiers) {
    hachage.update(relatifPosix(DIST_PWA, fichier));
    hachage.update('\0');
    hachage.update(readFileSync(fichier));
    hachage.update('\0');
  }
  return hachage.digest('hex').slice(0, 16);
}

function verifierCheminsPublics(fichiers) {
  const fautes = [];
  for (const fichier of fichiers) {
    if (!/\.(?:css|html|js|mjs|svg)$/iu.test(fichier)) continue;
    const texte = readFileSync(fichier, 'utf8');
    const relatif = relatifPosix(DIST_PWA, fichier);
    // Le chunk local conserve les constantes `CHEMINS_API` partagées avec le mode LAN, sans
    // les appeler. Seules les URL portées par le HTML sont ici des chemins de livraison ; la
    // recette navigateur contrôle séparément les requêtes réellement émises.
    if (fichier.endsWith('.html') && /(["'])\/api\//u.test(texte)) {
      fautes.push(`${relatif} contient encore un chemin /api/`);
    }
    if (/(["'(])\/polices\//u.test(texte)) {
      fautes.push(`${relatif} contient encore un chemin racine /polices/`);
    }
    if (/(?:href|src)=["']\/assets\//u.test(texte)) {
      fautes.push(`${relatif} contient encore un chemin racine /assets/`);
    }
  }
  if (fautes.length > 0) {
    throw new Error(`Chemins incompatibles avec GitHub Pages :\n${fautes.join('\n')}`);
  }
}

/** Termine le build sans jamais toucher a une branche Git. */
export function finaliserLivrable() {
  const manifesteAudio = verifierEntreesLocales();
  exiger(existsSync(DIST_PWA), 'client/dist-pwa est absent : lancer le build Vite PWA avant.');

  const index = path.join(DIST_PWA, 'index.html');
  const manifeste = path.join(DIST_PWA, 'manifest.webmanifest');
  exiger(existsSync(index), 'client/dist-pwa/index.html est absent.');
  exiger(existsSync(manifeste), 'client/dist-pwa/manifest.webmanifest est absent.');
  exiger(existsSync(ICONE_SOURCE), 'L asset valide de Gobi destine a l icone est absent.');

  reecrireImagesImbriquees();

  // Le 404 source transmet la route a index.html via sessionStorage. Il doit rester distinct
  // du point d entree : GitHub Pages l execute avec un statut 404 puis revient a la base.
  exiger(existsSync(path.join(DIST_PWA, '404.html')), 'client/dist-pwa/404.html est absent.');
  writeFileSync(path.join(DIST_PWA, '.nojekyll'), '', 'utf8');
  // Les voix sont volontairement ignorees par git. Les copier depuis le manifeste valide rend
  // leur presence dans gh-pages independante de la facon dont Vite decoupe le port local.
  copierAudioPublie(manifesteAudio);
  const dossierIcones = path.join(DIST_PWA, 'icones');
  mkdirSync(dossierIcones, { recursive: true });
  copyFileSync(ICONE_SOURCE, path.join(dossierIcones, 'gobi-gardien.svg'));

  let fichiers = listerFichiers(DIST_PWA).filter(
    (fichier) => path.basename(fichier) !== 'service-worker.js'
  );
  verifierCheminsPublics(fichiers);

  const version = empreinteLivrable(fichiers);
  const precache = fichiers
    .map((fichier) => relatifPosix(DIST_PWA, fichier))
    // `.nojekyll` est un marqueur de publication, pas une ressource du site. GitHub
    // Pages peut l'utiliser sans garantir qu'il soit ensuite servi au navigateur :
    // le precacher rendrait alors toute l'installation du service worker atomiquement
    // impossible pour un simple fichier vide.
    .filter((fichier) => fichier !== '.nojekyll' && !estImageLourde(fichier))
    .map(urlDeFichier);
  exiger(precache.includes(`${BASE_PAGES}index.html`), 'Le precache ne contient pas index.html.');

  const modele = readFileSync(MODELE_SERVICE_WORKER, 'utf8');
  const serviceWorker = modele
    .replace('__PIERRE_VERSION__', version)
    .replace('__PIERRE_BASE__', BASE_PAGES)
    .replace('globalThis.__PIERRE_PRECACHE__', JSON.stringify(precache, null, 2));
  exiger(!serviceWorker.includes('__PIERRE_'), 'Un marqueur du service worker n a pas ete remplace.');
  writeFileSync(path.join(DIST_PWA, 'service-worker.js'), serviceWorker, 'utf8');

  fichiers = listerFichiers(DIST_PWA);
  const poidsTotal = fichiers.reduce((somme, fichier) => somme + statSync(fichier).size, 0);
  const poidsNoyau = fichiers
    .filter((fichier) => !estImageLourde(fichier))
    .reduce((somme, fichier) => somme + statSync(fichier).size, 0);
  const rapport = {
    version,
    base: BASE_PAGES,
    fichiers: fichiers.length,
    octetsTotal: poidsTotal,
    octetsPrecharges: poidsNoyau,
    politiqueCache:
      'noyau atomique (HTML, JS, CSS, WASM, polices, SVG, JSON, Opus) ; images lourdes a la demande'
  };
  writeFileSync(
    path.join(DIST_PWA, 'version-build.json'),
    `${JSON.stringify(rapport, null, 2)}\n`,
    'utf8'
  );

  console.log(`[pwa] livrable ${version} finalise dans client/dist-pwa`);
  console.log(`[pwa] total : ${(poidsTotal / 1024 / 1024).toFixed(1)} Mio`);
  console.log(`[pwa] precache atomique : ${(poidsNoyau / 1024 / 1024).toFixed(1)} Mio`);
  console.log('[pwa] les PNG/WebP/JPEG sont caches a leur premiere consultation.');
}

function git(arguments_, options = {}) {
  const resultat = spawnSync('git', arguments_, {
    cwd: options.cwd ?? RACINE,
    encoding: 'utf8',
    windowsHide: true,
    stdio: options.silencieux ? 'pipe' : 'inherit'
  });
  if (options.codesAcceptes?.includes(resultat.status) !== true && resultat.status !== 0) {
    const detail = options.silencieux ? `${resultat.stdout ?? ''}${resultat.stderr ?? ''}`.trim() : '';
    throw new Error(
      `git ${arguments_.join(' ')} a echoue (code ${String(resultat.status)}).${detail ? `\n${detail}` : ''}`
    );
  }
  return resultat;
}

function sortieGit(arguments_, cwd = RACINE) {
  return String(git(arguments_, { cwd, silencieux: true }).stdout).trim();
}

function exigerDepotPropre() {
  git(['diff', '--quiet'], { silencieux: true });
  git(['diff', '--cached', '--quiet'], { silencieux: true });
  const nonSuivis = sortieGit(['ls-files', '--others', '--exclude-standard']);
  exiger(
    nonSuivis === '',
    `Le depot porte des fichiers non suivis. Committer ou ranger avant publication :\n${nonSuivis}`
  );
}

function worktrees() {
  const lignes = sortieGit(['worktree', 'list', '--porcelain']).split(/\r?\n/u);
  const resultat = [];
  let courant = null;
  for (const ligne of lignes) {
    if (ligne.startsWith('worktree ')) {
      courant = { dossier: path.resolve(ligne.slice('worktree '.length)), branche: null };
      resultat.push(courant);
    } else if (courant !== null && ligne.startsWith('branch refs/heads/')) {
      courant.branche = ligne.slice('branch refs/heads/'.length);
    }
  }
  return resultat;
}

function preparerWorktree() {
  mkdirSync(BAC_A_SABLE, { recursive: true });
  const cible = path.resolve(DOSSIER_BRANCHE);
  const ecart = path.relative(BAC_A_SABLE, cible);
  exiger(
    ecart !== '' && !ecart.startsWith(`..${path.sep}`) && ecart !== '..' && !path.isAbsolute(ecart),
    'La cible de publication doit rester dans bac-a-sable/.'
  );

  const brancheExiste = spawnSync(
    'git',
    ['show-ref', '--verify', '--quiet', 'refs/heads/gh-pages'],
    { cwd: RACINE, windowsHide: true }
  ).status === 0;
  const existants = worktrees();
  const worktreeBranche = existants.find((entree) => entree.branche === 'gh-pages');

  if (worktreeBranche !== undefined) {
    exiger(
      path.resolve(worktreeBranche.dossier) === cible,
      `La branche gh-pages est deja ouverte ailleurs : ${worktreeBranche.dossier}`
    );
    return cible;
  }
  exiger(!existsSync(cible), `${relatifPosix(RACINE, cible)} existe sans etre le worktree gh-pages attendu.`);

  if (brancheExiste) {
    git(['worktree', 'add', cible, 'gh-pages']);
  } else {
    git(['worktree', 'add', '--detach', cible, 'HEAD']);
    git(['switch', '--orphan', 'gh-pages'], { cwd: cible });
  }
  return cible;
}

function viderWorktree(cible) {
  const resolue = path.resolve(cible);
  exiger(
    resolue === path.resolve(DOSSIER_BRANCHE),
    'Refus de vider un dossier qui n est pas le worktree de publication attendu.'
  );
  for (const entree of readdirSync(resolue, { withFileTypes: true })) {
    if (entree.name === '.git') continue;
    rmSync(path.join(resolue, entree.name), { recursive: true, force: true });
  }
}

/** Prepare un commit local sans fetch, push, API GitHub ni changement du worktree principal. */
export function preparerBrancheLocale() {
  exigerDepotPropre();
  for (const attendu of ['index.html', '404.html', 'manifest.webmanifest', 'service-worker.js', '.nojekyll']) {
    exiger(existsSync(path.join(DIST_PWA, attendu)), `Livrable incomplet : ${attendu} est absent.`);
  }

  const source = sortieGit(['rev-parse', 'HEAD']);
  const brancheSource = sortieGit(['branch', '--show-current']) || '(detachee)';
  const cible = preparerWorktree();
  viderWorktree(cible);
  cpSync(DIST_PWA, cible, { recursive: true });
  writeFileSync(
    path.join(cible, 'SOURCE_COMMIT.txt'),
    `source=${source}\nbranche=${brancheSource}\n`,
    'utf8'
  );

  git(['add', '--all', '--force'], { cwd: cible });
  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], {
    cwd: cible,
    windowsHide: true
  });
  exiger(diff.status === 0 || diff.status === 1, 'Impossible de comparer le commit gh-pages prepare.');
  if (diff.status === 1) {
    git(['commit', '-m', `SitePwa: préparer le build ${source.slice(0, 12)} pour GitHub Pages`], {
      cwd: cible
    });
  } else {
    console.log('[pages] aucun octet n a change : la branche locale est deja a jour.');
  }

  console.log('');
  console.log(`[pages] branche gh-pages preparee localement dans ${relatifPosix(RACINE, cible)}`);
  console.log('[pages] AUCUN push n a ete execute.');
  console.log('[pages] apres accord explicite du proprietaire, la commande distante exacte est :');
  console.log('');
  console.log('  git -C bac-a-sable/publication-gh-pages push origin gh-pages:gh-pages');
  console.log('');
  console.log('[pages] GitHub Pages est configure sur gh-pages / racine ; ce push declenchera');
  console.log('        automatiquement l Action Pages officielle.');
}

const estAppeleDirectement =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (estAppeleDirectement) {
  const arguments_ = new Set(process.argv.slice(2));
  try {
    if (arguments_.has('--finaliser')) finaliserLivrable();
    else if (arguments_.has('--branche')) preparerBrancheLocale();
    else throw new Error('Usage : --finaliser ou --branche');
  } catch (cause) {
    console.error(`[pages] ECHEC : ${cause instanceof Error ? cause.message : String(cause)}`);
    process.exitCode = 1;
  }
}
