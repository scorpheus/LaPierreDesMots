/**
 * `npm run verifier:rapide` — le palier du développement d'une fonctionnalité, visé < 60 s.
 *
 *   npm run verifier:rapide                      fichiers modifiés par rapport à HEAD (git)
 *   npm run verifier:rapide -- <fichier> …       fichiers nommés
 *
 * Il ne remplace pas `npm run verifier` (avant un push) ni `verifier:complet` (avant une
 * publication) : il lance seulement ce que les fichiers touchés peuvent casser.
 *
 *   - lint des fichiers touchés, `tsc -b` (incrémental) et `test:contenu` ;
 *   - Vitest `related` : les tests qui importent un fichier touché, sans couverture ;
 *   - navigateur ciblé : la garde du socle pour chaque moteur touché (toute la garde si le socle
 *     ou les styles communs le sont), plus les specs Playwright modifiées elles-mêmes.
 *
 * Tout tourne en parallèle ; le code de sortie est 1 dès qu'une étape échoue.
 * Docs/boucle-tests-rapide-2026-09-02.md, ajout du 9 octobre.
 */
import { execFileSync, spawn } from 'node:child_process';
import './priorite-basse.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { RACINE } from './rapport.mjs';

const debut = Date.now();
const nommes = process.argv.slice(2).filter((a) => !a.startsWith('--'));

/** Les fichiers touchés : ceux nommés, sinon ceux que git voit modifiés ou nouveaux. */
function fichiersTouches() {
  if (nommes.length > 0) return nommes.map((f) => f.replace(/\\/g, '/'));
  const sortie = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: RACINE, encoding: 'utf8' });
  return sortie.split(/\r?\n/).filter(Boolean)
    .filter((ligne) => !ligne.startsWith(' D') && !ligne.startsWith('D '))
    .map((ligne) => ligne.slice(3).replace(/^"|"$/g, '').split(' -> ').at(-1));
}

const touches = fichiersTouches().filter((f) => existsSync(join(RACINE, f)));
// La logique (`partage`, `serveur`) suit le graphe d'imports : ses tests tournent sous Node, vite.
const sources = touches.filter((f) => /^(partage|serveur)\/src\/.*\.(ts|tsx)$/.test(f));
const testsUnitaires = touches.filter((f) => /^tests\/(unitaires|composants|api)\/.*\.test\.tsx?$/.test(f));
// Un fichier du client est importé par le registre des moteurs, donc par presque tous les tests
// d'écran : `related` relancerait toute la suite de composants (80 s mesurées pour un moteur).
// On prend les tests qui portent son nom (`MoteurPaires.tsx` → `MoteurPaires*.test.tsx`).
const nomsClient = touches.filter((f) => /^client\/src\/.*\.(ts|tsx)$/.test(f))
  .map((f) => f.split('/').at(-1).replace(/\.(ts|tsx)$/, ''))
  // Un moteur de `partage` a ses tests d'écran sous le nom du composant (`paires` → `MoteurPaires`).
  .concat(touches.map((f) => /^partage\/src\/moteurs\/([a-z]+)\//.exec(f)?.[1]).filter(Boolean)
    .map((m) => `Moteur${m[0].toUpperCase()}${m.slice(1)}`));
const testsDuClient = nomsClient.length === 0 ? [] : execFileSync('git', ['ls-files', 'tests/composants', 'tests/unitaires'], { cwd: RACINE, encoding: 'utf8' })
  .split(/\r?\n/).filter((f) => nomsClient.some((nom) => f.split('/').at(-1).startsWith(nom)) && /\.test\.tsx?$/.test(f));
const specs = touches.filter((f) => /^tests\/(e2e|qualite)\/.*\.spec\.ts$/.test(f));
const lintables = touches.filter((f) => /\.(ts|tsx|mjs|js)$/.test(f) && !f.startsWith('bac-a-sable/'));

/** Garde du socle : par moteur touché, ou entière si le socle ou un style commun change. */
const moteurs = [...new Set(touches.map((f) => /^client\/src\/moteurs\/([a-z]+)\//.exec(f)?.[1]).filter(Boolean))]
  .filter((m) => m !== 'commun');
const socleEntier = touches.some((f) => /^client\/src\/(activite|styles)\//.test(f) || f.startsWith('client/src/moteurs/commun/'));
const filtreGarde = socleEntier ? null : moteurs.length > 0 ? `socle — (${moteurs.join('|')}) —` : undefined;

const CLIENT_FIGE = 'tests/rapports/client-fige-rapide';
const environnement = { ...process.env, FORCE_COLOR: '0', PIERRE_TRAVAILLEURS_VITEST: '4', PIERRE_CLIENT_TEST: CLIENT_FIGE };

function lancer(nom, commande, arguments_) {
  const t0 = Date.now();
  return new Promise((resoudre) => {
    const fils = spawn(commande, arguments_, { cwd: RACINE, env: environnement, shell: process.platform === 'win32' });
    let sortie = '';
    fils.stdout.on('data', (m) => { sortie += m; });
    fils.stderr.on('data', (m) => { sortie += m; });
    fils.on('close', (code) => {
      const duree = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`→ ${nom} … ${code === 0 ? '✅' : '❌'}  ${duree} s`);
      if (code !== 0) console.log(sortie.split(/\r?\n/).filter((l) => l.trim() !== '').slice(-25).map((l) => `    ${l}`).join('\n'));
      resoudre({ nom, code: code ?? 1 });
    });
  });
}

const npx = (outil, ...args) => ['npx', [outil, ...args]];
console.log(`verifier:rapide — ${String(touches.length)} fichier(s) touché(s) ; moteurs : ${moteurs.join(', ') || 'aucun'}${socleEntier ? ' ; socle commun touché' : ''}\n`);

const etapes = [];
if (lintables.length > 0) etapes.push(lancer('lint (fichiers touchés)', ...npx('eslint', ...lintables)));
etapes.push(lancer('test:contenu', 'node', ['scripts/test-contenu.mjs']));
const projets = ['--project', 'unitaires', '--project', 'composants', '--project', 'api'];
// La logique sous Node seulement (`unitaires`, `api`) ; ses tests d'écran sont pris par leur nom.
if (sources.length > 0) {
  etapes.push(lancer('vitest related (logique)', ...npx('vitest', 'related', '--run', '--passWithNoTests',
    '--project', 'unitaires', '--project', 'api', ...sources)));
}
const testsNommes = [...new Set([...testsUnitaires, ...testsDuClient])];
if (testsNommes.length > 0) {
  etapes.push(lancer(`vitest (${String(testsNommes.length)} fichier(s) nommé(s))`, ...npx('vitest', 'run', '--passWithNoTests', ...projets, ...testsNommes)));
}

// Le navigateur a besoin du serveur compilé et d'une construction figée, propre à ce palier.
const navigateur = (async () => {
  if (filtreGarde === undefined && specs.length === 0) return { nom: 'navigateur', code: 0 };
  const ts = await lancer('typescript', 'npm', ['run', 'typescript']);
  const construction = await lancer('construction figée', 'npm', ['run', 'construire:test', '-w', '@pierre/client', '--', '--outDir', `../${CLIENT_FIGE}`, '--emptyOutDir']);
  if (ts.code !== 0 || construction.code !== 0) return { nom: 'navigateur', code: 1 };
  const suites = [];
  if (filtreGarde !== undefined) {
    suites.push(lancer(`garde du socle${filtreGarde === null ? ' (entière)' : ` (${moteurs.join(', ')})`}`, 'node',
      ['scripts/playwright.mjs', 'test', 'tests/qualite/socle-activite.spec.ts', '--project=qualite', '--no-deps', '--workers=4', '--reporter=dot',
        ...(filtreGarde === null ? [] : ['-g', `"${filtreGarde}"`])]));
  }
  if (specs.length > 0) {
    suites.push(lancer(`specs touchées (${String(specs.length)})`, 'node',
      ['scripts/playwright.mjs', 'test', ...specs, '--project=parcours', '--project=qualite', '--project=responsive', '--no-deps', '--workers=4', '--reporter=dot']));
  }
  const resultats = await Promise.all(suites);
  return { nom: 'navigateur', code: resultats.some((r) => r.code !== 0) ? 1 : 0 };
})();
if (filtreGarde === undefined && specs.length === 0) etapes.push(lancer('typescript', 'npm', ['run', 'typescript']));
etapes.push(navigateur);

const resultats = await Promise.all(etapes);
const rouges = resultats.filter((r) => r.code !== 0);
console.log(`\n${rouges.length === 0 ? '✅ VERT' : `❌ ROUGE — ${rouges.map((r) => r.nom).join(', ')}`} · durée ${((Date.now() - debut) / 1000).toFixed(1)} s`);
console.log('Rappel : `npm run verifier` reste la preuve avant un push.');
process.exit(rouges.length === 0 ? 0 : 1);
