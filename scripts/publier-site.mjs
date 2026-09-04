#!/usr/bin/env node
/**
 * Publication GitHub Pages en deux temps.
 *
 *   node scripts/publier-site.mjs --preparer   # local uniquement
 *   node scripts/publier-site.mjs --publier    # push autorise + recette distante
 *
 * Le second mode est volontairement distinct : le skill impose d'obtenir l'accord explicite
 * du proprietaire avant de lancer une commande qui ecrit sur GitHub.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifierEntreesLocales } from './preparer-publication-pages.mjs';
import { lireEtapes, STATUTS } from './rapport.mjs';

export const RACINE = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
export const DOSSIER_PUBLICATION = path.join(RACINE, 'bac-a-sable', 'publication-gh-pages');
export const CHEMIN_ETAT = path.join(RACINE, 'bac-a-sable', 'publication-gh-pages-etat.json');
export const URL_SITE = 'https://scorpheus.github.io/LaPierreDesMots/';

const MOTIFS_TEST = [
  /(?:^|[\\/])vitest(?:[\\/]|\.|$)/iu,
  /tinypool/iu,
  /@playwright[\\/]test[\\/]cli/iu,
  /scripts[\\/]playwright\.mjs\s+test/iu,
  /scripts[\\/]verifier\.mjs/iu,
];

function exiger(condition, message) {
  if (!condition) throw new Error(message);
}

function executer(programme, arguments_, options = {}) {
  const resultat = spawnSync(programme, arguments_, {
    cwd: options.cwd ?? RACINE,
    encoding: 'utf8',
    windowsHide: true,
    stdio: options.capturer ? 'pipe' : 'inherit',
    env: { ...process.env, FORCE_COLOR: '0', ...options.env },
    maxBuffer: 64 * 1024 * 1024,
    shell: options.shell ?? false,
  });
  if (resultat.error) throw resultat.error;
  if (resultat.status !== 0) {
    const detail = options.capturer
      ? `${resultat.stdout ?? ''}${resultat.stderr ?? ''}`.trim()
      : '';
    throw new Error(
      `${programme} ${arguments_.join(' ')} a echoue (code ${String(resultat.status)}).` +
        (detail ? `\n${detail}` : ''),
    );
  }
  return resultat;
}

function sortie(programme, arguments_, cwd = RACINE) {
  return String(executer(programme, arguments_, { cwd, capturer: true }).stdout).trim();
}

function npm(script) {
  const npmExec = process.env['npm_execpath'];
  if (npmExec?.endsWith('.js')) executer(process.execPath, [npmExec, 'run', script]);
  else executer('npm', ['run', script], { shell: process.platform === 'win32' });
}

function depotPropre(cwd = RACINE) {
  const statut = sortie('git', ['status', '--porcelain=v1', '--untracked-files=all'], cwd);
  exiger(statut === '', `Le depot doit correspondre a un commit propre avant publication :\n${statut}`);
}

/** Fonction pure, testee : ne retient que les travailleurs de CE depot. */
export function identifierProcessusTests(processus, racine = RACINE, pidCourant = process.pid) {
  const racineNormalisee = path.resolve(racine).toLocaleLowerCase('fr-FR');
  return processus.filter((processus_) => {
    if (Number(processus_.pid) === Number(pidCourant)) return false;
    const commande = String(processus_.commande ?? '');
    const commandeNormalisee = commande.toLocaleLowerCase('fr-FR');
    return commandeNormalisee.includes(racineNormalisee) && MOTIFS_TEST.some((motif) => motif.test(commande));
  });
}

function listerProcessusNode() {
  if (process.platform === 'win32') {
    const commande = [
      "$p = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } |",
      "Select-Object @{n='pid';e={$_.ProcessId}}, @{n='commande';e={$_.CommandLine}};",
      "if ($p) { $p | ConvertTo-Json -Compress } else { Write-Output '[]' }",
    ].join(' ');
    const brut = sortie('powershell.exe', ['-NoProfile', '-Command', commande]);
    const resultat = brut ? JSON.parse(brut) : [];
    return Array.isArray(resultat) ? resultat : [resultat];
  }

  const brut = sortie('ps', ['-eo', 'pid=,args=']);
  return brut
    .split(/\r?\n/u)
    .map((ligne) => ligne.trim().match(/^(\d+)\s+(.+)$/u))
    .filter(Boolean)
    .map((correspondance) => ({ pid: Number(correspondance[1]), commande: correspondance[2] }));
}

export function exigerAucuneCampagneConcurrente(processus = listerProcessusNode()) {
  const actifs = identifierProcessusTests(processus);
  exiger(
    actifs.length === 0,
    'Une campagne de test de ce depot est deja active. La publication refuse de melanger ' +
      `deux rapports. Processus :\n${actifs
        .map((processus_) => `  - PID ${String(processus_.pid)} : ${processus_.commande}`)
        .join('\n')}`,
  );
}

/** Fonction pure : un code de sortie vert ne suffit pas si un rapport bloquant subsiste. */
export function verifierRapportVert(etapes) {
  exiger(etapes.length > 0, 'Le rapport de verification est vide.');
  const bloquantes = etapes.filter((etape) => STATUTS[etape.statut]?.bloquant !== false);
  exiger(
    bloquantes.length === 0,
    `Le rapport reste rouge : ${bloquantes.map((etape) => etape.etape).join(', ')}`,
  );
  return {
    etapes: etapes.length,
    cas: etapes.reduce((total, etape) => total + (etape.total ?? 0), 0),
  };
}

function lireJson(chemin, libelle) {
  exiger(existsSync(chemin), `${libelle} est absent : ${path.relative(RACINE, chemin)}`);
  try {
    return JSON.parse(readFileSync(chemin, 'utf8'));
  } catch (cause) {
    throw new Error(`${libelle} est illisible : ${cause instanceof Error ? cause.message : cause}`);
  }
}

function lireSourceCommit() {
  const chemin = path.join(DOSSIER_PUBLICATION, 'SOURCE_COMMIT.txt');
  exiger(existsSync(chemin), 'SOURCE_COMMIT.txt est absent du worktree de publication.');
  return Object.fromEntries(
    readFileSync(chemin, 'utf8').trim().split(/\r?\n/u).map((ligne) => ligne.split('=', 2)),
  );
}

function ecrireEtat(etat) {
  writeFileSync(CHEMIN_ETAT, `${JSON.stringify(etat, null, 2)}\n`, 'utf8');
}

export function verifierEtatPrepare(etat, actuel) {
  exiger(etat.schema === 1, 'Le fichier de preparation porte une version inconnue.');
  exiger(etat.sourceCommit === actuel.sourceCommit, 'Le commit source a change depuis la preparation.');
  exiger(etat.pagesCommit === actuel.pagesCommit, 'Le commit gh-pages a change depuis la preparation.');
  exiger(etat.version === actuel.version, 'Le livrable PWA a change depuis la preparation.');
  exiger(actuel.sourceDeclaree === actuel.sourceCommit, 'SOURCE_COMMIT.txt ne designe plus le commit source.');
}

function etatActuel() {
  depotPropre();
  depotPropre(DOSSIER_PUBLICATION);
  const source = lireSourceCommit();
  const version = lireJson(
    path.join(DOSSIER_PUBLICATION, 'version-build.json'),
    'Le manifeste de version du livrable',
  );
  return {
    sourceCommit: sortie('git', ['rev-parse', 'HEAD']),
    pagesCommit: sortie('git', ['rev-parse', 'HEAD'], DOSSIER_PUBLICATION),
    version: version.version,
    sourceDeclaree: source.source,
  };
}

export function extrairePremierAsset(manifeste) {
  const icone = manifeste?.icons?.find((element) => typeof element?.src === 'string');
  exiger(icone, 'Le manifeste Web ne porte aucune icone a verifier.');
  return new URL(icone.src, URL_SITE).href;
}

async function attendre(etiquette, lireEtat, accepter, delaiMs = 180_000) {
  const fin = Date.now() + delaiMs;
  let dernier;
  do {
    dernier = await lireEtat();
    if (accepter(dernier)) return dernier;
    await new Promise((resoudre) => setTimeout(resoudre, 2_500));
  } while (Date.now() < fin);
  throw new Error(`${etiquette} n a pas atteint l etat attendu. Dernier etat : ${JSON.stringify(dernier)}`);
}

async function fetchOk(url) {
  const reponse = await fetch(url, { cache: 'no-store' });
  exiger(reponse.ok, `${url} repond HTTP ${String(reponse.status)}.`);
  return reponse;
}

async function verifierSiteDistant(versionAttendue) {
  const suffixe = `?publication=${encodeURIComponent(versionAttendue)}`;
  await attendre(
    'La version publique',
    async () => (await fetchOk(new URL(`version-build.json${suffixe}`, URL_SITE))).json(),
    (valeur) => valeur?.version === versionAttendue,
  );
  const accueil = await fetchOk(new URL(suffixe, URL_SITE));
  exiger((await accueil.text()).includes('<div id="root">'), 'La page publique ne contient pas la racine React.');
  const serviceWorker = await fetchOk(new URL(`service-worker.js${suffixe}`, URL_SITE));
  exiger((await serviceWorker.text()).includes(versionAttendue), 'Le service worker public ne porte pas la version attendue.');
  const manifeste = await (await fetchOk(new URL(`manifest.webmanifest${suffixe}`, URL_SITE))).json();
  await fetchOk(extrairePremierAsset(manifeste));
}

function nomDepotGithub() {
  const depot = JSON.parse(sortie('gh', ['repo', 'view', '--json', 'nameWithOwner']));
  exiger(typeof depot.nameWithOwner === 'string', 'Impossible de determiner le depot GitHub.');
  return depot.nameWithOwner;
}

async function attendreAction(pagesCommit) {
  const execution = await attendre(
    'L Action GitHub Pages',
    async () => {
      const executions = JSON.parse(
        sortie('gh', [
          'run', 'list', '--branch', 'gh-pages', '--commit', pagesCommit, '--limit', '20',
          '--json', 'databaseId,headSha,name,status,conclusion,url',
        ]),
      );
      return executions.find(
        (item) => item.headSha === pagesCommit && /pages build and deployment/iu.test(item.name),
      ) ?? null;
    },
    (valeur) => valeur !== null,
  );
  executer('gh', ['run', 'watch', String(execution.databaseId), '--exit-status']);
  const finale = JSON.parse(
    sortie('gh', ['run', 'view', String(execution.databaseId), '--json', 'conclusion,status,url,headSha']),
  );
  exiger(
    finale.status === 'completed' && finale.conclusion === 'success',
    'L Action Pages n est pas en succes.',
  );
  return { id: execution.databaseId, url: finale.url };
}

export async function preparerPublication() {
  console.log('\n[publication] Controle local avant la campagne longue...');
  depotPropre();
  exigerAucuneCampagneConcurrente();
  verifierEntreesLocales();

  console.log('\n[publication] Verification complete, executee une seule fois...');
  npm('verifier');
  exigerAucuneCampagneConcurrente();
  const bilan = verifierRapportVert(lireEtapes());

  console.log('\n[publication] Construction du livrable PWA...');
  npm('construire:pwa');

  console.log('\n[publication] Preparation du commit local gh-pages...');
  executer(process.execPath, ['scripts/preparer-publication-pages.mjs', '--branche']);

  const actuel = etatActuel();
  const etat = {
    schema: 1,
    prepareLe: new Date().toISOString(),
    sourceCommit: actuel.sourceCommit,
    sourceBranche: sortie('git', ['branch', '--show-current']) || '(detachee)',
    pagesCommit: actuel.pagesCommit,
    version: actuel.version,
    rapport: bilan,
    url: URL_SITE,
    commandeDistante: 'git -C bac-a-sable/publication-gh-pages push origin gh-pages:gh-pages',
  };
  ecrireEtat(etat);

  console.log('\n[publication] PRETE — rien n a ete envoye a GitHub.');
  console.log(`  source    : ${etat.sourceCommit}`);
  console.log(`  gh-pages  : ${etat.pagesCommit}`);
  console.log(`  version   : ${etat.version}`);
  console.log(`  validation: ${String(bilan.etapes)} etapes, ${String(bilan.cas)} cas`);
  console.log('\nApres accord explicite du proprietaire : publier-site.bat --publier');
}

export async function publier() {
  const etat = lireJson(CHEMIN_ETAT, 'L etat de preparation');
  const actuel = etatActuel();
  verifierEtatPrepare(etat, actuel);
  sortie('gh', ['auth', 'status']);
  const depot = nomDepotGithub();

  console.log('\n[publication] Push autorise de gh-pages...');
  executer('git', ['push', 'origin', 'gh-pages:gh-pages'], { cwd: DOSSIER_PUBLICATION });
  const distant = sortie('git', ['ls-remote', 'origin', 'refs/heads/gh-pages'], DOSSIER_PUBLICATION)
    .split(/\s+/u)[0];
  exiger(distant === etat.pagesCommit, 'La branche distante ne pointe pas sur le commit prepare.');

  console.log('\n[publication] Attente de l Action officielle GitHub Pages...');
  const action = await attendreAction(etat.pagesCommit);
  await attendre(
    'GitHub Pages',
    async () => JSON.parse(sortie('gh', ['api', `repos/${depot}/pages`])),
    (page) => page?.status === 'built',
  );

  console.log('\n[publication] Verification du site public et de ses caches...');
  await verifierSiteDistant(etat.version);
  ecrireEtat({
    ...etat,
    publieLe: new Date().toISOString(),
    action,
    recetteDistante: 'reussite',
  });

  console.log('\n[publication] PUBLIEE ET VERIFIEE');
  console.log(`  ${URL_SITE}`);
  console.log(`  version : ${etat.version}`);
  console.log(`  Action  : ${action.url}`);
}

const estAppeleDirectement =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (estAppeleDirectement) {
  const modes = process.argv.slice(2);
  const mode = modes.length === 0 ? '--preparer' : modes[0];
  try {
    if (mode === '--preparer') await preparerPublication();
    else if (mode === '--publier') await publier();
    else throw new Error('Usage : publier-site.bat [--preparer|--publier]');
  } catch (cause) {
    console.error(`\n[publication] ECHEC : ${cause instanceof Error ? cause.message : String(cause)}`);
    process.exitCode = 1;
  }
}
