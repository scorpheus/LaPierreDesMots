// Configuration ESLint « plate » (flat config) de La Pierre des Mots.
// Contrat technique v1 § 0 et § 1.1 · CLAUDE.md, règles non négociables.
//
// LA RÈGLE MAISON DE CE FICHIER — celle qui justifie qu'il existe :
//   `Math.random`, `Date.now()` et `new Date()` sont INTERDITS partout,
//   sauf dans les deux fichiers qui les implémentent :
//     partage/src/alea.ts     → l'aléatoire (mulberry32, graine `ATELIER_GRAINE`)
//     partage/src/horloge.ts  → le temps (`figer`, `avancer`)
//
// Motif, écrit ici pour qu'on ne l'assouplisse pas par confort : tout le déterminisme de la
// suite de tests en dépend. Le rejeu des journaux de référence (annexe T § T2) compare des
// sorties bit à bit ; un seul `Math.random` ou un seul `new Date()` enfoui dans la logique
// rend ce rejeu ininterprétable, et la régression pédagogique passe alors inaperçue.
//
// Note sur `no-restricted-globals` : la règle N'EST PAS employée pour `Math` et `Date`, parce
// qu'elle interdirait l'identifiant entier — donc aussi `Math.max`, `Math.round`, `Date.parse`
// et le type `Date`. On cible les MEMBRES par `no-restricted-syntax` et `no-restricted-properties`,
// qui disent exactement ce qu'on veut dire.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ---------------------------------------------------------------- messages en français

const MESSAGE_ALEA =
  'Aléatoire interdit ici. Utilise `Alea` : `import { creerAlea } from "@pierre/partage"`, ' +
  'puis `alea.entier(...)` / `alea.flottant()`. `Math.random` n\'est ni reproductible ni ' +
  'rejouable — seul `partage/src/alea.ts` a le droit de l\'appeler.';

const MESSAGE_HORLOGE =
  'Temps interdit ici. Utilise `Horloge` : `import { creerHorloge } from "@pierre/partage"`, ' +
  'puis `horloge.maintenant()`. `Date.now()` et `new Date()` rendent impossibles `figer` et ' +
  '`avancer`, donc les tests de rejeu — seul `partage/src/horloge.ts` a le droit de les appeler.';

// ---------------------------------------------------------------- sélecteurs

/** @type {{selector: string, message: string}[]} */
const SYNTAXE_ALEA = [
  {
    selector: "MemberExpression[object.name='Math'][property.name='random']",
    message: MESSAGE_ALEA
  },
  {
    // Attrape `const { random } = Math;` — le contournement le plus évident.
    selector: "VariableDeclarator[init.name='Math'] > ObjectPattern > Property[key.name='random']",
    message: MESSAGE_ALEA
  }
];

/** @type {{selector: string, message: string}[]} */
const SYNTAXE_TEMPS = [
  {
    selector: "MemberExpression[object.name='Date'][property.name='now']",
    message: MESSAGE_HORLOGE
  },
  {
    selector: "NewExpression[callee.name='Date']",
    message: MESSAGE_HORLOGE
  },
  {
    // Attrape `const { now } = Date;`.
    selector: "VariableDeclarator[init.name='Date'] > ObjectPattern > Property[key.name='now']",
    message: MESSAGE_HORLOGE
  }
];

const PROPRIETE_ALEA = { object: 'Math', property: 'random', message: MESSAGE_ALEA };
const PROPRIETE_TEMPS = { object: 'Date', property: 'now', message: MESSAGE_HORLOGE };

// Les deux seuls fichiers du dépôt autorisés à appeler la primitive qu'ils encapsulent.
const FICHIER_ALEA = 'partage/src/alea.ts';
const FICHIER_HORLOGE = 'partage/src/horloge.ts';

export default tseslint.config(
  // ------------------------------------------------------------ ce qui n'est jamais linté
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-test/**',
      '**/.venv/**',
      'outils/**',
      'donnees/**',
      'contenu/brouillons/**',
      'tests/rapports/**',
      'playwright-report/**',
      'coverage/**',
      '**/*.d.ts'
    ]
  },

  // ------------------------------------------------------------ socle
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ------------------------------------------------------------ la règle maison, partout
  {
    name: 'pierre/alea-et-horloge',
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node }
    },
    rules: {
      'no-restricted-syntax': ['error', ...SYNTAXE_ALEA, ...SYNTAXE_TEMPS],
      'no-restricted-properties': ['error', PROPRIETE_ALEA, PROPRIETE_TEMPS],

      // Confort de lecture, pas de dogme.
      'no-console': 'off',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
      ],
      // En `warn` et non `error` : `verbatimModuleSyntax` fait déjà échouer la COMPILATION
      // sur un `import type` manquant. Doubler l'erreur ferait tomber `npm run lint` sur un
      // point que `npm run typescript` signale mieux, et la règle est auto-corrigeable.
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' }
      ]
    }
  },

  // ------------------------------------------------------------ le client tourne dans un navigateur
  {
    name: 'pierre/client-navigateur',
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser }
    }
  },

  // ------------------------------------------------------------ les deux dérogations, chirurgicales
  {
    // `alea.ts` implémente l'aléatoire : il peut appeler `Math.random` pour sa graine par
    // défaut. Il reste soumis à l'interdiction du temps.
    name: 'pierre/derogation-alea',
    files: [FICHIER_ALEA],
    rules: {
      'no-restricted-syntax': ['error', ...SYNTAXE_TEMPS],
      'no-restricted-properties': ['error', PROPRIETE_TEMPS]
    }
  },
  {
    // `horloge.ts` implémente le temps : il peut appeler `Date.now()` et `new Date()`.
    // Il reste soumis à l'interdiction de l'aléatoire.
    name: 'pierre/derogation-horloge',
    files: [FICHIER_HORLOGE],
    rules: {
      'no-restricted-syntax': ['error', ...SYNTAXE_ALEA],
      'no-restricted-properties': ['error', PROPRIETE_ALEA]
    }
  },

  // ------------------------------------------------------------ outillage de construction
  {
    // Les scripts de `scripts/` et `outils/` ne sont PAS du code applicatif : ils datent des
    // rapports, mesurent des durées de compilation et écrivent des horodatages de fichiers.
    // `Horloge` est un objet du jeu, injecté dans les moteurs ; il n'a pas de sens ici.
    // L'ALÉATOIRE RESTE INTERDIT : un script qui tire au sort n'est pas reproductible.
    name: 'pierre/outillage',
    files: ['scripts/**/*.{js,mjs}', '*.config.{js,mjs,ts}', 'eslint.config.js'],
    rules: {
      'no-restricted-syntax': ['error', ...SYNTAXE_ALEA],
      'no-restricted-properties': ['error', PROPRIETE_ALEA]
    }
  },

  // ------------------------------------------------------------ tests
  {
    // Les tests montent l'horloge figée par `tests/configuration/preparation.ts` ; la règle
    // maison y vaut donc telle quelle (aucune dérogation). On assouplit seulement `any`,
    // inévitable quand on force un état invalide pour vérifier qu'il est refusé.
    name: 'pierre/tests',
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off'
    }
  }
);
