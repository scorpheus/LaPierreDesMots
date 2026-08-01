/**
 * `npm run test:visuel` — T4. Lot L-G. Contrat gelé § 1.7 : « traduit `--maj` →
 * `--update-snapshots` ».
 *
 * Trois comportements, et le deuxième est celui qui évite un faux rouge au premier lancement :
 *
 *   npm run test:visuel          compare aux références ; **crée celles qui manquent** et le
 *                                DIT dans le rapport, au lieu d'échouer sur une absence
 *                                (`--update-snapshots=missing`) ;
 *   npm run test:visuel -- --maj régénère TOUTES les références (`--update-snapshots=all`) ;
 *   npm run test:visuel -- --strict  échoue si une référence manque (`=none`), pour un
 *                                contrôle d'intégrité en revue.
 *
 * Une référence créée n'a **rien vérifié** : le rapport distingue explicitement « N référence(s)
 * créée(s) » de « N capture(s) comparée(s) ». C'est la différence entre un vert et un vert qui
 * ment.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { DOSSIER_BRUT, RACINE, ecrireEtape, genererRapport, preparerDossiers } from './rapport.mjs';

const ETAPE = 'test:visuel';
const debut = Date.now();

const arguments_ = process.argv.slice(2);
const majDemandee = arguments_.includes('--maj');
const stricte = arguments_.includes('--strict');
const modeSnapshots = majDemandee ? 'all' : stricte ? 'none' : 'missing';

const DOSSIER_VISUEL = join(RACINE, 'tests', 'visuel');
const CHEMIN_JSON = join(DOSSIER_BRUT, 'test-visuel.playwright.json');

preparerDossiers();

/** Compte les fichiers de référence présents avant la campagne. */
function compterReferences() {
  if (!existsSync(DOSSIER_VISUEL)) return 0;
  return readdirSync(DOSSIER_VISUEL, { recursive: true, withFileTypes: true }).filter(
    (e) => e.isFile() && e.name.endsWith('.png')
  ).length;
}

const referencesAvant = compterReferences();

const commande = [
  'playwright',
  'test',
  '--project=visuel',
  `--update-snapshots=${modeSnapshots}`
];

const resultat = spawnSync('npx', commande, {
  cwd: RACINE,
  encoding: 'utf8',
  shell: true,
  env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: CHEMIN_JSON }
});

const sortie = `${resultat.stdout ?? ''}${resultat.stderr ?? ''}`;
process.stdout.write(sortie);

const referencesApres = compterReferences();
const referencesCreees = Math.max(0, referencesApres - referencesAvant);

// ─────────────────────────────────────────────────── dépouillement du rapport Playwright

let total = 0;
let echecs = 0;
const details = [];

if (existsSync(CHEMIN_JSON)) {
  try {
    const brut = JSON.parse(readFileSync(CHEMIN_JSON, 'utf8'));
    const parcourir = (suites = []) => {
      for (const suite of suites) {
        for (const cas of suite.specs ?? []) {
          total += 1;
          if (!cas.ok) {
            echecs += 1;
            const message =
              cas.tests?.[0]?.results?.[0]?.error?.message ?? 'capture différente de la référence';
            details.push({ ou: `${cas.file ?? ''} › ${cas.title}`, message: message.split('\n')[0] });
          }
        }
        parcourir(suite.suites);
      }
    };
    parcourir(brut.suites);
  } catch (erreur) {
    details.push({
      ou: 'tests/rapports/brut/test-visuel.playwright.json',
      message: `rapport Playwright illisible : ${erreur instanceof Error ? erreur.message : erreur}`
    });
    echecs += 1;
  }
}

const navigateurAbsent =
  /Executable doesn'?t exist|playwright install|browserType\.launch/i.test(sortie);

let statut;
let note;

if (navigateurAbsent) {
  statut = 'environnement';
  note =
    'Chromium n’est pas installé pour Playwright. Lancer `npx playwright install chromium`. ' +
    'C’est un défaut d’environnement, pas un défaut de code (contrat § 8.2).';
} else if (resultat.status !== 0 || echecs > 0) {
  statut = 'echec';
  note =
    `${echecs} capture(s) différente(s) de leur référence. ` +
    'Regarder les diffs dans `tests/rapports/artefacts/`. Si l’écart est voulu : ' +
    '`npm run test:visuel -- --maj` — jamais de sa propre initiative sur une divergence non expliquée.';
} else if (total === 0) {
  statut = 'vide';
  note = 'aucun scénario visuel n’a été exécuté — aucun cas à ce stade.';
} else if (referencesCreees > 0) {
  statut = 'reussite';
  note =
    `${referencesCreees} référence(s) CRÉÉE(S) (elles n’ont donc rien vérifié) et ` +
    `${total - referencesCreees} capture(s) comparée(s). Relancer pour que tout soit comparé.`;
} else {
  statut = 'reussite';
  note = `${total} capture(s) comparée(s) à leur référence, tolérance 0,2 % de pixels.`;
}

ecrireEtape({
  etape: ETAPE,
  statut,
  dureeMs: Date.now() - debut,
  total,
  echecs,
  details,
  note,
  artefacts: ['tests/rapports/artefacts/playwright']
});
genererRapport({ commande: `npm run test:visuel${majDemandee ? ' -- --maj' : ''}` });

console.log(`test:visuel — ${total} capture(s), ${echecs} échec(s). ${note}`);
process.exit(statut === 'echec' || statut === 'environnement' ? 1 : 0);
