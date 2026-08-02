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

  /**
   * ── AUCUNE RÉFÉRENCE VISUELLE N'EST FIGÉE PAR ACCIDENT ────────────────────────────────────
   *
   * Posé à l'intégration de la campagne N, après l'avoir vécu. Le défaut par défaut de
   * Playwright est `updateSnapshots: 'missing'` : **une capture absente est ÉCRITE
   * silencieusement** au premier passage, puis sert de référence à tous les suivants.
   *
   * Mesuré : un simple `npm run verifier` a créé
   * `tests/visuel/decor-v2.spec.ts-snapshots/carte-monde-v2-visuel-win32.png` — une référence
   * de 157 Ko, née d'une commande de vérification, que personne n'avait regardée. Elle a été
   * supprimée.
   *
   * C'est exactement ce que CLAUDE.md interdit : « ne jamais mettre à jour une référence de
   * test visuel de sa propre initiative », et ce que **D39** protège — les références attendent
   * le nouveau graphisme ET un adulte qui a vu l'image. Une règle qui repose sur la discipline
   * de celui qui lance la commande n'est pas une règle : `'none'` la rend mécanique. Une
   * capture manquante fait désormais ÉCHOUER le cas, elle ne s'invente plus.
   *
   * Pour produire les références, quand le père aura validé le graphisme, la porte reste
   * ouverte et explicite : `npm run test:visuel -- --update-snapshots`.
   */
  updateSnapshots: 'none',
  retries: 0,
  workers: 1,
  outputDir: 'tests/rapports/artefacts/playwright',
  reporter: [
    ['list'],
    // Chemin du rapport machine, PAR ÉTAPE.
    //
    // `PLAYWRIGHT_JSON_OUTPUT_NAME` n'existe plus dans Playwright 1.62 — mesuré :
    // `grep -rn "PLAYWRIGHT_JSON_OUTPUT" node_modules/` ne rend aucune ligne. `verifier.mjs`
    // la posait quand même, et les trois campagnes (`test:e2e`, `test:visuel`,
    // `test:qualite`) écrivaient donc toutes dans le MÊME fichier, chacune écrasant la
    // précédente : le dépouillement ne trouvait jamais son rapport et l'étape s'affichait
    // « 1 échec sur 0 cas », sans jamais nommer le scénario fautif.
    // `PIERRE_RAPPORT_JSON` est à nous, et elle, elle est lue.
    [
      'json',
      { outputFile: process.env['PIERRE_RAPPORT_JSON'] ?? 'tests/rapports/brut/playwright.json' }
    ],
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
      testMatch: /.*\.spec\.ts$/,
      // ── LA MATRICE DES 5 POLICES (lot L2-B, contrat des features v2 § 3.2) ──────────────
      //
      // Elle est portée par les MÉTADONNÉES du projet `visuel`, et non par cinq projets
      // `visuel-andika`, `visuel-luciole`… Deux raisons mesurées, aucune n'est esthétique :
      //
      //  1. Playwright inscrit le nom du projet dans le chemin des références :
      //     `noeud-gris-visuel-win32.png`. Découper `visuel` en cinq projets renommerait les
      //     TROIS références du socle v1 déjà commitées, et « ne jamais mettre à jour une
      //     référence de sa propre initiative » (CLAUDE.md) l'interdit.
      //  2. `scripts/test-visuel.mjs` lance `--project=visuel` et n'appartient à aucun lot de
      //     cette campagne : cinq projets nouveaux ne seraient JAMAIS exécutés par
      //     `npm run test:visuel`. Une matrice que personne ne lance est une matrice creuse.
      //
      // `tests/visuel/polices.spec.ts` lit cette liste et engendre une capture par police.
      // La liste est ici, et pas dans le spec, pour qu'elle reste une donnée de configuration
      // opposable : un ajout de police se voit dans le diff de ce fichier.
      metadata: {
        polices: ['andika', 'opendyslexic', 'luciole', 'belle-allure', 'verdana']
      }
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
