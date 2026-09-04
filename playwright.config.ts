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
import { cpus } from "node:os";

import { defineConfig, devices } from "@playwright/test";

/**
 * Adresse de REPLI, et rien d'autre — lot P1.
 *
 * `tests/harnais-serveur.ts` redéfinit `baseURL` par un fixateur : chaque cas est branché sur
 * le port que le noyau a réservé pour SON serveur. Cette valeur ne sert donc jamais à une
 * recette du dépôt. Elle reste parce qu'un `baseURL` absent rendrait `page.goto('/')`
 * illégale dans un cas écrit à la va-vite hors harnais, et parce qu'elle documente le port du
 * contrat § 0.
 */
const PORT = Number(process.env["PIERRE_PORT"] ?? 8080);
const URL_BASE = `http://127.0.0.1:${PORT}`;

/**
 * Le format peut être resserré ponctuellement sans créer cinq configurations Playwright.
 * La valeur exprime le viewport CSS réellement offert à la page, barres du navigateur déjà
 * retranchées : `PIERRE_VIEWPORT=720x1017`. Sans variable, la recette historique reste inchangée.
 */
function viewportDeValidation(): { width: number; height: number } {
  const valeur = process.env["PIERRE_VIEWPORT"]?.trim();
  if (valeur === undefined || valeur === "") return { width: 1920, height: 1200 };
  const resultat = /^(\d+)x(\d+)$/u.exec(valeur);
  if (resultat === null) {
    throw new Error(
      `PIERRE_VIEWPORT doit avoir la forme LARGEURxHAUTEUR, reçu « ${valeur} »`
    );
  }
  const width = Number(resultat[1]);
  const height = Number(resultat[2]);
  if (width < 320 || height < 320) {
    throw new Error(`PIERRE_VIEWPORT est trop petit pour être un viewport jouable : ${valeur}`);
  }
  return { width, height };
}

/**
 * ── COMBIEN DE TRAVAILLEURS : LE CHIFFRE EST MESURÉ, PAS DÉDUIT DU NOMBRE DE CŒURS ─────────
 *
 * Le premier réglage de P1 disait « 50 % des cœurs », c'est-à-dire 16 sur cette machine. Ça
 * paraissait prudent et c'était faux. Balayage complet, chaque ligne est une exécution entière
 * des 372 cas, `bac-a-sable/p1-parallelisme/traque.ndjson` :
 *
 *     travailleurs   mur d'horloge     travail cumulé   inflation   verdicts
 *      1              393 s             384 s            1,00 ×      vert
 *      6               92 s · 92 s      490 s            1,28 ×      vert · vert
 *     10               84 s · 84 s      679 s            1,77 ×      vert · vert
 *     16               84 s → 90 s     1062 s            2,77 ×      5 verts, 2 rouges
 *     24              153 s · 162 s        —                —        rouge · rouge
 *     32               98 s                —                —        vert
 *
 * Deux faits, et ils commandent le choix :
 *
 * 1. **Le mur d'horloge cesse de descendre à 10.** Il est borné par le CHEMIN CRITIQUE — le
 *    cas le plus long de la campagne, « CONTRAT DE SORTIE QA », 20 s en série. Aucun nombre de
 *    travailleurs ne raccourcit un cas. Passé 10, on n'achète plus de vitesse.
 *
 * 2. **L'inflation, elle, continue de monter.** À 16, chaque cas passe 2,77 fois plus de temps
 *    au mur qu'en série — non parce que le produit a ralenti, mais parce qu'il attend son tour.
 *    Or le garde-fou `timeout: 90_000` a été calibré sur une campagne en SÉRIE, où le pire cas
 *    laissait 4,5 × de marge. À 16 la marge tombe à 1,6 ×, et deux rouges sont apparus — un
 *    dépassement de délai dans `parcours-ouverture`, un relevé de géométrie pris sur une image
 *    non stabilisée dans l'audit R16. **Aucun des deux n'est un défaut de produit : ce sont des
 *    mesures prises sur une machine affamée.** À 24 c'est pire, et le mur DOUBLE.
 *
 * Le point de fonctionnement retenu est donc **10**, où le mur est au plus bas ET la marge du
 * garde-fou reste à 2,5 ×. Le plafond est absolu, pas proportionnel : au-delà, la contention
 * est pure perte. La moitié des cœurs reste la borne sur une petite machine, parce qu'un cas
 * consomme DEUX processus — un Chromium et le serveur Node qui lui est propre.
 *
 * `PIERRE_TRAVAILLEURS` force la valeur — un nombre (`1` pour reproduire un défaut en série)
 * ou un pourcentage (`75%`). La conversion en nombre n'est pas une coquetterie : Playwright
 * refuse la chaîne `'8'`, mesuré, sortie citée — `config.workers must be a number or
 * percentage`. Une chaîne venue de l'environnement aurait fait échouer la campagne au
 * chargement de la configuration, de la façon la plus opaque qui soit.
 */
const PLAFOND_TRAVAILLEURS = 10;

function travailleurs(): number | string {
  const demande = process.env["PIERRE_TRAVAILLEURS"];
  if (demande !== undefined && demande.trim() !== "") {
    const nettoye = demande.trim();
    return /^\d+$/u.test(nettoye) ? Number(nettoye) : nettoye;
  }
  const coeurs = cpus().length;
  return Math.max(1, Math.min(PLAFOND_TRAVAILLEURS, Math.floor(coeurs / 2)));
}

/*
 * La GRAINE — `ATELIER_GRAINE`, défaut `20260801` — n'est plus lue ici depuis le lot P1 : elle
 * est posée par `tests/harnais-serveur.ts`, qui démarre les serveurs. La valeur et la variable
 * d'environnement sont les mêmes qu'avant ; seul l'endroit qui les lit a changé. Toute la suite
 * reste rejouable à l'identique, et l'est même DAVANTAGE : chaque cas repart d'un `Alea`
 * rembobiné, au lieu d'hériter de l'avancement laissé par les cas précédents.
 */

/**
 * Profil d'appareil — annexe T § 3.
 * `reducedMotion: 'reduce'` fige les animations au niveau du navigateur ; `sauterAnimations()`
 * de `window.__test` fait le reste côté application. Les deux sont nécessaires : le premier
 * couvre le CSS, le second couvre les animations pilotées en JavaScript.
 */
const tabletteGalaxyTabS10FE = {
  ...devices["Desktop Chrome"],
  viewport: viewportDeValidation(),
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: false,
  reducedMotion: "reduce" as const,
  locale: "fr-FR",
  timezoneId: "Europe/Paris",
  colorScheme: "light" as const,
};

export default defineConfig({
  testDir: "tests",
  // Aucune attente arbitraire n'est tolérée dans les tests (annexe T § 6) : on attend un
  // état. Ces délais ne sont donc que des garde-fous contre un blocage réel.
  timeout: 90_000,
  expect: {
    timeout: 10_000,
    // Tolérance visuelle de 0,2 % de pixels — annexe T § 4.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  /**
   * ── LE PARALLÉLISME, ET CE QUI LE REND LÉGITIME (lot P1) ─────────────────────────────────
   *
   * Ces deux lignes valaient `fullyParallel: false` et `workers: 1` sur une machine à
   * 32 cœurs, et **le réglage avait une bonne raison** : les 372 cas partageaient UN serveur
   * et UNE base `:memory:`. Un cas qui crée un profil pendant qu'un autre les compte, c'est un
   * rouge aléatoire — et un test instable est pire qu'un test lent, on finit par l'ignorer,
   * puis par ignorer la suite.
   *
   * La réponse de P1 n'est pas de paralléliser quand même : c'est de **supprimer le partage**.
   * `tests/harnais-serveur.ts` donne à CHAQUE CAS un processus serveur neuf — base `:memory:`
   * vierge, `Alea` rembobiné sur `ATELIER_GRAINE`, port réservé par le noyau. Deux cas ne
   * peuvent plus se voir, donc le verdict ne dépend plus de l'ordre dans lequel
   * l'ordonnanceur les distribue. C'est plus isolé qu'avant, pas moins.
   *
   * ── LE CONTRÔLE QUI SÉPARE LES DEUX EFFETS, ET C'EST LE CHIFFRE DU LOT ──────────────────
   *
   * Même arbre, même bundle (`client/dist-test` empreint à `0a2f365acfe098fc` avant ET après),
   * isolation par cas ACTIVE, mais `PIERRE_TRAVAILLEURS=1` :
   *
   *     en série, avec un serveur neuf par cas .... 393 s   372 verts
   *     mesure archivée du réglage précédent ...... 390 s   372 verts
   *
   * L'isolation coûte donc **+3 s sur 390, soit +0,8 %** — le vivier préchauffe le serveur
   * suivant pendant que le cas courant joue, si bien que les 327 ms d'un démarrage ne sont
   * presque jamais sur le chemin critique. **Tout le gain vient du parallélisme, et rien du
   * réglage n'a été acheté en dégradant l'isolation.**
   *
   * Le nombre de travailleurs est choisi par mesure, voir `travailleurs()` plus haut.
   */
  fullyParallel: true,
  workers: travailleurs(),
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
  updateSnapshots: "none",
  retries: 0,
  outputDir: "tests/rapports/artefacts/playwright",
  reporter: [
    ["list"],
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
      "json",
      { outputFile: process.env["PIERRE_RAPPORT_JSON"] ?? "tests/rapports/brut/playwright.json" },
    ],
    ["html", { outputFolder: "tests/rapports/artefacts/playwright-html", open: "never" }],
  ],
  use: {
    baseURL: URL_BASE,
    ...tabletteGalaxyTabS10FE,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // R10 et R4 : aucun appel sortant. Toute requête hors du serveur local est coupée, et
    // le test qui en dépendrait échouera au lieu de réussir grâce au réseau.
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "parcours",
      testDir: "tests/e2e",
      testMatch: /parcours-.*\.spec\.ts$/,
      // `parcours-zz-invariants.spec.ts` appartient au projet `bilan` : il LIT le journal que
      // les autres recettes écrivent, donc il ne peut pas tourner en même temps qu'elles.
      testIgnore: /parcours-zz-invariants\.spec\.ts$/,
      // Le contrat exhaustif rejoue 88 recettes dans UN cas. En série il prend 30,2 s ;
      // mêlé aux dix navigateurs de la campagne, il a déjà épuisé son garde-fou de 270 s.
      // Il appartient au projet `couverture`, exécuté après les parcours : mêmes assertions,
      // même serveur isolé, mais une mesure qui ne dépend plus de la contention de la machine.
      grepInvert: /CONTRAT DE SORTIE QA : écrans déclarés = écrans visités, écart nul/u,
    },
    {
      name: "robustesse",
      testDir: "tests/e2e",
      testMatch: /(cassecou|singe)\.spec\.ts$/,
    },
    {
      name: "visuel",
      testDir: "tests/visuel",
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
        polices: ["andika", "opendyslexic", "verdana"],
      },
    },
    {
      name: "qualite",
      testDir: "tests/qualite",
      testMatch: /.*\.spec\.ts$/,
      testIgnore: [/responsive-tous-ecrans\.spec\.ts$/, /gamefeel-latence\.spec\.ts$/],
    },
    {
      // Une mesure de latence exécutée au milieu de dix audits axe/core ne mesure plus le jeu,
      // mais la contention artificielle de la machine. Ce projet court est séquencé par npm.
      name: "qualite-latence",
      testDir: "tests/qualite",
      testMatch: /gamefeel-latence\.spec\.ts$/,
      dependencies: ["qualite"],
    },
    {
      name: "responsive",
      testDir: "tests/qualite",
      testMatch: /responsive-tous-ecrans\.spec\.ts$/,
      use: {
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
      dependencies: ["qualite-latence"],
    },

    {
      name: "couverture",
      testDir: "tests/e2e",
      testMatch: /parcours-audit-tout-le-site\.spec\.ts$/,
      grep: /CONTRAT DE SORTIE QA : écrans déclarés = écrans visités, écart nul/u,
      fullyParallel: false,
      dependencies: ["parcours", "robustesse"],
    },

    /**
     * ── LA CLÔTURE DE CAMPAGNE — UN PROJET À ELLE SEULE (lot P1) ──────────────────────────
     *
     * `parcours-zz-invariants.spec.ts` n'est pas une recette comme les autres : son § 5
     * AGRÈGE le journal que les dix-huit autres viennent d'écrire, et publie le chiffre de
     * couverture de la campagne. Il devait donc passer APRÈS elles.
     *
     * Jusqu'ici, l'ordre était obtenu par le nom du fichier — « Playwright ordonne par
     * chemin », dit son propre en-tête, « `parcours-zz-` le garantit sans toucher à
     * `playwright.config.ts`, qui appartient à un autre lot ». Ce lot-ci est celui-là, et le
     * préfixe alphabétique ne garantit plus rien dès que `fullyParallel` est vrai : seize
     * travailleurs se partagent la file, le dernier fichier n'est plus le dernier exécuté.
     *
     * `dependencies` le dit en clair au lieu de l'espérer d'un tri : le projet `bilan` ne
     * démarre qu'après `couverture`, elle-même postérieure à `parcours` ET `robustesse`, tous
     * travailleurs confondus. Et `fullyParallel: false` lui rend l'ordre de déclaration à
     * l'intérieur du fichier — ses contrôles positifs arment la sentinelle et doivent avoir
     * écrit leurs bilans avant que le § 5 ne les compte.
     *
     * Le fichier n'a pas bougé d'un octet : il reste dans `tests/e2e/`, il reste une
     * `*.spec.ts` recensée par `recettesSurDisque()`, et il porte toujours le harnais.
     */
    {
      name: "bilan",
      testDir: "tests/e2e",
      testMatch: /parcours-zz-invariants\.spec\.ts$/,
      fullyParallel: false,
      dependencies: ["couverture"],
    },
  ],

  /**
   * ── IL N'Y A PLUS DE `webServer`, ET C'EST LE CŒUR DU LOT P1 ─────────────────────────────
   *
   * Ce bloc démarrait UN serveur, sur UN port, pour LES 372 CAS. C'est exactement ce qui
   * imposait `workers: 1` : on ne parallélise pas des cas qui écrivent tous dans la même base.
   *
   * Le serveur est désormais démarré par `tests/harnais-serveur.ts`, un par cas, avec le même
   * environnement à une variable près (`PIERRE_HOTE=127.0.0.1` au lieu de `0.0.0.0` : un
   * serveur de test n'a rien à faire sur le LAN). L'attente de disponibilité est la même —
   * une réponse 200 de `/api/sante`, jamais un délai.
   *
   * Deux défauts disparaissent avec ce bloc, et ils n'étaient pas des défauts de vitesse :
   *
   *   • `reuseExistingServer: false` faisait ÉCHOUER toute la campagne quand le port 8080
   *     était déjà pris — c'est-à-dire quand le père faisait tourner le jeu pour son enfant ;
   *   • deux campagnes lancées en parallèle (D10) se disputaient ce même port 8080.
   *
   * Les ports sont maintenant réservés par le noyau (`listen(0)`) : ni deviné, ni partagé.
   *
   * Prérequis inchangé (contrat § 8.2) : `serveur/dist/` vient de `npm run typescript`,
   * `client/dist-test/` de `npm run construire:test`. Les deux précèdent `test:e2e`. Si l'un
   * manque, le harnais le DIT au lieu de laisser 372 cas échouer sur une page blanche.
   */
});
