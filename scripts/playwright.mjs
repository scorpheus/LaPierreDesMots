/**
 * `scripts/playwright.mjs` — le SEUL point d'entrée de Playwright dans ce dépôt.
 *
 * Raison d'être : la décision D9 — « tout reste dans le dépôt, rien ne s'installe hors du
 * dossier du projet ». Or `npx playwright install chromium`, laissé à lui-même, écrit
 * ~450 Mo dans `%LOCALAPPDATA%\ms-playwright`, c'est-à-dire **hors du dépôt**. La seule
 * façon de l'en empêcher est la variable `PLAYWRIGHT_BROWSERS_PATH`, et elle doit être
 * posée AVANT que `playwright-core` ne soit chargé : ce module calcule son dossier de
 * registre au chargement, pas au lancement du navigateur. La poser dans
 * `playwright.config.ts` serait donc trop tard.
 *
 * D'où ce fichier : il pose la variable dans l'environnement d'un processus fils, puis
 * lance la CLI Playwright dedans. Les trois commandes qui touchent Playwright
 * (`test:e2e`, `test:visuel`, `test:qualite`) passent toutes par ici — sinon l'une d'elles
 * chercherait le navigateur au mauvais endroit et échouerait seule, ce qui est le pire des
 * cas : un rouge qui ressemble à un défaut de code.
 *
 * Usage bibliothèque :
 *     import { environnementPlaywright, lancerPlaywright } from './playwright.mjs';
 *
 * Usage commande (les arguments sont passés tels quels à la CLI) :
 *     node scripts/playwright.mjs test --project=qualite
 *     node scripts/playwright.mjs install chromium
 *
 * Ce script n'installe rien de sa propre initiative : `install` doit être demandé
 * explicitement (contrat § 8.2, « l'installation est réservée à l'orchestrateur »).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Où vivent les navigateurs de Playwright. **Absolu, et dans le dépôt** (décision D9).
 *
 * Absolu et non relatif : Playwright résout un `PLAYWRIGHT_BROWSERS_PATH` relatif depuis le
 * répertoire courant du processus, qui n'est pas toujours la racine du dépôt (le serveur web
 * de Playwright, les rapporteurs et les tests eux-mêmes tournent avec des `cwd` différents).
 * Un chemin relatif marcherait par accident et casserait sans prévenir.
 *
 * `outils/` est ignoré par git (`.gitignore` ligne 7) : les ~450 Mo ne partent jamais au dépôt.
 */
export const DOSSIER_NAVIGATEURS = join(RACINE, 'outils', 'navigateurs');

/** La CLI Playwright, résolue dans `node_modules/` — jamais par `npx`, qui pourrait aller la chercher au loin. */
export const CLI_PLAYWRIGHT = join(RACINE, 'node_modules', '@playwright', 'test', 'cli.js');

/**
 * L'environnement à donner à tout processus qui lance Playwright.
 * @param {Record<string, string | undefined>} [supplement] variables à ajouter
 * @returns {Record<string, string | undefined>}
 */
export function environnementPlaywright(supplement = {}) {
  return { ...process.env, PLAYWRIGHT_BROWSERS_PATH: DOSSIER_NAVIGATEURS, ...supplement };
}

/**
 * Vrai si au moins un navigateur a été installé dans le dépôt.
 *
 * Sert uniquement à produire un message utile ; ce n'est pas une garantie que le binaire
 * exact demandé par la version courante de Playwright est présent — c'est Playwright qui
 * tranche, et lui seul.
 */
export function navigateurInstalle() {
  return existsSync(DOSSIER_NAVIGATEURS);
}

/**
 * Lance la CLI Playwright dans l'environnement du dépôt.
 * @param {string[]} arguments_ arguments de la CLI (`['test', '--project=qualite']`)
 * @param {{supplement?: Record<string, string | undefined>, silencieux?: boolean}} [options]
 */
export function lancerPlaywright(arguments_, options = {}) {
  return spawnSync(process.execPath, [CLI_PLAYWRIGHT, ...arguments_], {
    cwd: RACINE,
    env: environnementPlaywright(options.supplement ?? {}),
    encoding: 'utf8',
    stdio: options.silencieux === true ? 'pipe' : 'inherit',
    maxBuffer: 64 * 1024 * 1024
  });
}

// ─────────────────────────────────────────────────────────────────── exécution directe

const estAppeleDirectement =
  typeof process.argv[1] === 'string' && process.argv[1].endsWith('playwright.mjs');

if (estAppeleDirectement) {
  const arguments_ = process.argv.slice(2);
  if (arguments_.length === 0) {
    console.error(
      'Usage : node scripts/playwright.mjs <arguments de la CLI Playwright>\n' +
        '  ex. : node scripts/playwright.mjs test --project=qualite\n' +
        '        node scripts/playwright.mjs install chromium'
    );
    process.exit(2);
  }
  if (!existsSync(CLI_PLAYWRIGHT)) {
    console.error(
      `Playwright est absent de node_modules/ (${CLI_PLAYWRIGHT}). Lancer \`npm install\` ` +
        'à la racine — c’est un prérequis d’environnement, à la charge de l’orchestrateur.'
    );
    process.exit(1);
  }
  const resultat = lancerPlaywright(arguments_);
  process.exit(resultat.status ?? 1);
}
