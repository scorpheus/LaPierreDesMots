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
  '@pierre/partage': racine('./partage/src/index.ts'),
  // Réservés aux tests — contrat § 11.3.
  '@partage': racine('./partage/src'),
  '@client': racine('./client/src'),
  '@serveur': racine('./serveur/src')
};

const preparation = racine('./tests/configuration/preparation.ts');

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
 */
const seuilsParZone = {
  // `pedagogie/` ≥ 90 % — annexe T § 7. Le premier risque du projet vit ici.
  'partage/src/pedagogie/*.ts': {
    statements: 90,
    branches: 90,
    functions: 90,
    lines: 90
  },
  // `validation/` ≥ 95 % — c'est le juge ; un faux négatif décourage l'enfant pour rien.
  'partage/src/contenu/validation.ts': {
    statements: 95,
    branches: 95,
    functions: 95,
    lines: 95
  },
  'partage/src/moteurs/colorie/validation.ts': {
    statements: 95,
    branches: 95,
    functions: 95,
    lines: 95
  },
  // `moteurs/` ≥ 80 % — le reste est couvert en E2E.
  'partage/src/moteurs/**/*.ts': {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  },
  // `serveur/routes/` ≥ 80 %.
  'serveur/src/routes/**/*.ts': {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  }
};

export default defineConfig({
  resolve: { alias },
  test: {
    // Aucune surveillance : la chaîne de vérification n'est jamais interactive.
    watch: false,
    // Une seule source de hasard et de temps : le fichier de préparation.
    globals: false,
    reporters: ['default'],
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
