/**
 * Configuration Vitest — lot L-G.
 *
 * Trois projets, exactement ceux que le contrat gelé § 8 appelle :
 *   `vitest run --project unitaires --project composants --project api`
 *
 * Les alias reproduisent à la lettre le contrat § 3.2 : Vite et Vitest lisent la SOURCE de
 * `partage/`, jamais son `dist/`. Aucune construction préalable n'est donc nécessaire pour
 * lancer `npm run test`. L'ordre des clés compte — le plus spécifique d'abord.
 *
 * Trois alias supplémentaires, `@partage`, `@client`, `@serveur`, existent pour les seuls
 * tests : ils donnent accès aux modules internes qui ne passent pas par un point d'entrée
 * publié (le moteur `colorie` de L-E, les écrans de L-D, l'application Fastify de L-C).
 * Le contrat § 11.3 les prévoit explicitement (« alias vers `client/src/**` », « alias vers
 * `serveur/src/**` »). Ils sont volontairement absents de `client/vite.config.ts` : rien du
 * code de production ne doit les emprunter.
 */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Source UNIQUE des seuils de l'annexe T § 7. Ils vivaient ici ; ils vivent désormais dans un
// module que `scripts/verifier.mjs` partage, parce que Vitest ne sait pas les appliquer sur
// Windows (voir l'en-tête du module : `relative()` rend des contre-obliques, les globs des
// obliques, aucun fichier ne matche, et un seuil qui ne matche rien est déclaré satisfait).
// Deux tables de seuils auraient fini par diverger sans que rien ne le signale.
import { SEUILS_PAR_ZONE } from './scripts/couverture-zones.mjs';

const racine = (chemin: string): string => fileURLToPath(new URL(chemin, import.meta.url));

/**
 * Les 9 sous-chemins de `@pierre/partage`, **du plus spécifique au moins spécifique**.
 *
 * L'ordre n'est pas cosmétique : Vite résout les alias par préfixe, dans l'ordre des clés. Si
 * `@pierre/partage` venait en premier, il capturerait `@pierre/partage/pedagogie` et tous les
 * imports de sous-chemin partiraient silencieusement vers le barillet — ils compileraient et
 * rendraient le mauvais module. C'était déjà la règle du contrat v1 § 3.2 ; à 9 entrées elle
 * devient critique (contrat des features v2 § 4.7 et § 11).
 *
 * La même liste, dans le même ordre, est à poser dans `client/vite.config.ts` — possédé par
 * L2-B. Deux propriétaires distincts : à vérifier des deux côtés.
 */
const alias = {
  // Contrat § 3.2 — le plus spécifique d'abord.
  '@pierre/partage/validation': racine('./partage/src/contenu/validation.ts'),
  '@pierre/partage/factices': racine('./partage/src/fournisseurs/factices.ts'),
  '@pierre/partage/pedagogie': racine('./partage/src/pedagogie/index.ts'),
  '@pierre/partage/miroir': racine('./partage/src/pedagogie/miroir.ts'),
  '@pierre/partage/lecture': racine('./partage/src/lecture/index.ts'),
  '@pierre/partage/recompenses': racine('./partage/src/recompenses/index.ts'),
  '@pierre/partage/monde': racine('./partage/src/monde/index.ts'),
  '@pierre/partage/parent': racine('./partage/src/parent/index.ts'),
  // AJOUT N4 — voir le commentaire jumeau de `client/vite.config.ts`. Le § 4.4 du contrat de
  // finition v3 attribue le sous-chemin `@pierre/partage/ouverture` à N4 sans attribuer les
  // fichiers où un sous-chemin se déclare. Omission signalée au rapport de N4.
  '@pierre/partage/ouverture': racine('./partage/src/ouverture/index.ts'),
  // AJOUT N2, même omission et même remède que la ligne ci-dessus. Le § 4.2 confie à N2
  // `partage/src/voix/index.ts` avec pour rôle « sous-chemin `@pierre/partage/voix` » sans
  // nommer les trois fichiers où un sous-chemin se déclare. L'ajout est purement additif :
  // N2 et N4 ont trouvé le trou indépendamment et leurs deux lignes fusionnent sans conflit.
  '@pierre/partage/voix': racine('./partage/src/voix/index.ts'),
  // AJOUT portage Android — Docs/addendum-portage-android.md § 3. Même omission que les deux
  // blocs ci-dessus si on l'oubliait ici : le sous-chemin existe dans `partage/package.json`
  // (résolution Node), mais Vitest résout `@pierre/partage/*` par CET alias, pas par les
  // `exports` du package — sans cette ligne, tout import de `@pierre/partage/base` échoue au
  // chargement des tests avec « Cannot find module », quel que soit le contenu du fichier.
  '@pierre/partage/base': racine('./partage/src/base/index.ts'),
  '@pierre/partage': racine('./partage/src/index.ts'),
  // Réservés aux tests — contrat § 11.3.
  '@partage': racine('./partage/src'),
  '@client': racine('./client/src'),
  '@serveur': racine('./serveur/src')
};

const preparation = racine('./tests/configuration/preparation.ts');

/*
 * La couverture V8 rend chaque ouvrier beaucoup plus lourd qu'un test Vitest ordinaire. Sans
 * plafond, la machine à 32 fils lançait assez de processus pour affamer SQLite et le canal RPC :
 * 28 délais dépassés sans défaut d'assertion, puis `Timeout calling onTaskUpdate`. Quatre ouvriers
 * gardent du parallélisme tout en laissant le serveur et Playwright respirer pendant `verifier`.
 */
const PLAFOND_TRAVAILLEURS_VITEST = 4;

/**
 * Seuils de couverture PAR ZONE — annexe T § 7.
 *
 * Ils ne s'appliquent que lorsque `--coverage` est passé ; `scripts/verifier.mjs` le passe
 * pour l'étape `test`, de sorte que la chaîne complète les mesure vraiment.
 *
 * La zone `pedagogie/` n'avait **aucun seuil en v1, et c'était délibéré** : la décision D1
 * excluait BKT, Leitner et sélecteur ; un seuil sur un dossier vide est un chiffre qui ne
 * mesure rien. **Le lot L2-D les livre : le seuil de l'annexe T § 7 — ≥ 90 % — entre donc en
 * vigueur ici.** C'est la zone où « un ajustement du BKT ou du Leitner ne casse rien
 * visiblement, et la progression est devenue absurde » (annexe T § 1) : c'est celle où une
 * ligne non couverte coûte le plus cher.
 *
 * **Ces seuils-ci ne mordent que sur POSIX**, et ce n'est pas un choix : Vitest matche ses
 * globs contre `relative(root, fichier)`, qui rend des contre-obliques sur Windows. On les
 * garde — ils sont justes là où ils s'appliquent — mais l'évaluation qui fait foi est celle de
 * `scripts/verifier.mjs`, qui normalise les séparateurs et tourne sur les deux plateformes.
 */
const seuilsParZone = SEUILS_PAR_ZONE;

export default defineConfig({
  resolve: { alias },
  test: {
    // Aucune surveillance : la chaîne de vérification n'est jamais interactive.
    watch: false,
    // Une seule source de hasard et de temps : le fichier de préparation.
    globals: false,
    reporters: ['default'],
    /**
     * Les journaux console des tests qui PASSENT ne sont pas rapportés ; ceux des tests qui
     * ÉCHOUENT le restent intégralement (c'est la définition de `'passed-only'` : « see logs
     * from failing tests only »).
     *
     * ── Pourquoi, mesuré ────────────────────────────────────────────────────────────────
     *
     * Q-INT-7 a observé `verifier` rouge avec **zéro test en échec** :
     * `Error: [vitest-worker]: Timeout calling "onTaskUpdate"` — le fil principal, saturé,
     * ne répond plus à l'ouvrier dans le délai RPC. Elle nommait la piste sans l'appliquer,
     * « parce qu'elle touche la configuration de test ».
     *
     * Le volume, compté sur le journal d'une exécution complète :
     *
     *     lignes de sortie                                        7 085
     *     dont « not configured to support act(...) »              3 133   (44 %)
     *     blocs stderr                                            1 167
     *     dont tests/composants/exploration-modele.test.tsx        1 134   (97 %)
     *
     * Chaque bloc est un aller-retour RPC vers le fil principal. Un seul fichier de test en
     * produisait 97 %.
     *
     * **Ce réglage n'assouplit aucun test** : aucune assertion, aucun délai, aucun `skip`.
     * Il ne retire que le bruit des tests qui passent — et un échec reste aussi diagnosticable
     * qu'avant, ce qui a été vérifié en faisant échouer un test exprès.
     */
    silent: 'passed-only',
    maxWorkers: PLAFOND_TRAVAILLEURS_VITEST,
    coverage: {
      provider: 'v8',
      // `--coverage` l'active ; sans ce drapeau, `npm run test` reste rapide.
      enabled: false,
      reportsDirectory: 'tests/rapports/couverture',
      reporter: ['text-summary', 'json-summary', 'html'],
      include: [
        'partage/src/**/*.ts',
        'serveur/src/**/*.ts',
        'client/src/moteurs/**/*.{ts,tsx}'
      ],
      exclude: [
        // Types purs : effacés à la compilation, aucune ligne exécutable.
        'partage/src/testabilite/surface.ts',
        'partage/src/**/types.ts',
        'partage/src/api/contrats.ts',
        // Points d'entrée : couverts en E2E, pas en unitaire (annexe T § 7).
        'serveur/src/index.ts',
        '**/*.d.ts'
      ],
      thresholds: seuilsParZone
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unitaires',
          environment: 'node',
          setupFiles: [preparation],
          include: ['tests/unitaires/**/*.test.ts']
        }
      },
      {
        resolve: { alias },
        // Sans cette ligne, esbuild transforme le JSX en `React.createElement` et les 13 cas
        // du test composant échouent sur `ReferenceError: React is not defined` — aucun
        // fichier n'importe React, et il n'a pas à l'être : le client tourne en transformation
        // automatique via `@vitejs/plugin-react` (client/vite.config.ts). On aligne Vitest sur
        // le même régime plutôt que d'ajouter 13 imports qui ne servent qu'aux tests.
        esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
        test: {
          name: 'composants',
          environment: 'happy-dom',
          setupFiles: [preparation],
          include: ['tests/composants/**/*.test.{ts,tsx}']
        }
      },
      {
        resolve: { alias },
        test: {
          name: 'api',
          environment: 'node',
          setupFiles: [preparation],
          include: ['tests/api/**/*.test.ts'],
          // `node:sqlite` en mémoire : chaque fichier ouvre la sienne, aucun port, aucun
          // fichier sur disque. L'isolation par fichier suffit et reste rapide.
          fileParallelism: true
        }
      }
    ]
  }
});
