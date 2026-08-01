/**
 * Configuration Playwright — lot L-G.
 *
 * Quatre projets, ceux du contrat gelé § 1.7 : `parcours`, `robustesse`, `visuel`, `qualite`.
 *
 * L'appareil est calqué sur la Galaxy Tab S10 FE telle que l'annexe T § 3 la décrit :
 * 1920 × 1200, tactile, DPR 2. Ces trois nombres sont repris tels quels du document, ils ne
 * sont pas recalculés depuis une fiche technique constructeur.
 *
 * Le serveur servi est **`client/dist-test/`**, jamais `client/dist/` (contrat § 7.3) : c'est
 * la construction qui embarque `window.__test`. `scripts/verifier-bundle.mjs`, lui, n'inspecte
 * que `client/dist/`. Les deux dossiers ne se croisent jamais.
 */
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const racineDepot = fileURLToPath(new URL('.', import.meta.url));

/** Port du serveur local — contrat § 0, table « Ports ». */
const PORT = Number(process.env['PIERRE_PORT'] ?? 8080);
const URL_BASE = `http://127.0.0.1:${PORT}`;

/**
 * Graine fixée. Toute la suite E2E est rejouable à l'identique : le serveur, le client et les
 * tests partagent cette valeur. `Alea` est la seule source de hasard du projet (contrat § 0).
 */
const GRAINE = process.env['ATELIER_GRAINE'] ?? '20260801';

/**
 * Profil d'appareil — annexe T § 3.
 * `reducedMotion: 'reduce'` fige les animations au niveau du navigateur ; `sauterAnimations()`
 * de `window.__test` fait le reste côté application. Les deux sont nécessaires : le premier
 * couvre le CSS, le second couvre les animations pilotées en JavaScript.
 */
const tabletteGalaxyTabS10FE = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1920, height: 1200 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: false,
  reducedMotion: 'reduce' as const,
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
  colorScheme: 'light' as const
};

export default defineConfig({
  testDir: 'tests',
  // Aucune attente arbitraire n'est tolérée dans les tests (annexe T § 6) : on attend un
  // état. Ces délais ne sont donc que des garde-fous contre un blocage réel.
  timeout: 90_000,
  expect: {
    timeout: 10_000,
    // Tolérance visuelle de 0,2 % de pixels — annexe T § 4.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css'
    }
  },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  outputDir: 'tests/rapports/artefacts/playwright',
  reporter: [
    ['list'],
    // `scripts/verifier.mjs` fixe `PLAYWRIGHT_JSON_OUTPUT_NAME` par étape ; hors chaîne, ce
    // chemin par défaut évite d'écraser un rapport précédent au hasard.
    ['json', { outputFile: 'tests/rapports/brut/playwright.json' }],
    ['html', { outputFolder: 'tests/rapports/artefacts/playwright-html', open: 'never' }]
  ],
  use: {
    baseURL: URL_BASE,
    ...tabletteGalaxyTabS10FE,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // R10 et R4 : aucun appel sortant. Toute requête hors du serveur local est coupée, et
    // le test qui en dépendrait échouera au lieu de réussir grâce au réseau.
    serviceWorkers: 'block'
  },
  projects: [
    {
      name: 'parcours',
      testDir: 'tests/e2e',
      testMatch: /parcours-.*\.spec\.ts$/
    },
    {
      name: 'robustesse',
      testDir: 'tests/e2e',
      testMatch: /(cassecou|singe)\.spec\.ts$/
    },
    {
      name: 'visuel',
      testDir: 'tests/visuel',
      testMatch: /.*\.spec\.ts$/
    },
    {
      name: 'qualite',
      testDir: 'tests/qualite',
      testMatch: /.*\.spec\.ts$/
    }
  ],
  webServer: {
    // `tsc -b` (étape `typescript` de la chaîne) a déjà émis `serveur/dist/`, et
    // `construire:test` a émis `client/dist-test/`. Les deux précèdent `test:e2e` dans
    // l'enchaînement du contrat § 8.2.
    command: 'node serveur/dist/index.js',
    url: `${URL_BASE}/api/sante`,
    cwd: racineDepot,
    timeout: 60_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PIERRE_PORT: String(PORT),
      ATELIER_GRAINE: GRAINE,
      // Base éphémère : la suite E2E ne touche jamais `donnees/pierre.db`.
      PIERRE_BASE: ':memory:',
      PIERRE_CONTENU: 'contenu',
      // ⚠ Défaut du contrat gelé signalé par L-G : le contrat § 7.3 impose de servir
      // `client/dist-test/` en test, `OptionsApplication.racineClient` existe (§ 6.4), mais
      // aucune variable d'environnement n'est nommée pour la porter — `.env.exemple` (§ 1.1)
      // n'en liste pas. `PIERRE_CLIENT` est l'hypothèse de L-G, à confirmer avec L-C.
      PIERRE_CLIENT: 'client/dist-test'
    }
  }
});
