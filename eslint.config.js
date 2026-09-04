// Configuration ESLint « plate » (flat config) de La Pierre des Mots.
// Contrat technique v1 § 0 et § 1.1 · CLAUDE.md, règles non négociables.
//
// LES RÈGLES MAISON DE CE FICHIER — celles qui justifient qu'il existe :
//   `Math.random`, `Date.now()`, `new Date()` et `navigator.vibrate` sont INTERDITS partout,
//   sauf dans les trois fichiers qui les implémentent :
//     partage/src/alea.ts                          → l'aléatoire (mulberry32, `ATELIER_GRAINE`)
//     partage/src/horloge.ts                       → le temps (`figer`, `avancer`)
//     client/src/gamefeel/haptique-navigateur.ts   → la vibration (lot L2-A, D26)
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

// ---------------------------------------------------------------- la vibration (lot L2-A)
//
// Même forme, même motif que les deux règles ci-dessus : une primitive du navigateur enfermée
// dans le SEUL fichier qui l'encapsule. Ce qui est en jeu ici n'est pas le déterminisme mais
// la dégradation : `prefers-reduced-motion` et le réglage « animations calmes » doivent
// pouvoir tout couper EN UN POINT (v2 § 8). Répartie sur les sites d'appel, un seul oubli
// suffirait à faire vibrer une tablette dont l'enfant a demandé qu'elle se taise — et à faire
// vibrer la machine qui exécute la suite de tests.

const MESSAGE_VIBRATION =
  'Vibration interdite ici. Passe par `RetourSensoriel` : `services.retour.depotCorrect(...)`, ' +
  'ou par `FournisseurHaptique` si le geste n\'est pas un dépôt. `navigator.vibrate` appelé ' +
  'directement contourne `prefers-reduced-motion` et le réglage « animations calmes » — seul ' +
  'client/src/gamefeel/haptique-navigateur.ts a le droit de l\'appeler (v2 § 8, D26).';

/** @type {{selector: string, message: string}[]} */
const SYNTAXE_VIBRATION = [
  {
    selector: "MemberExpression[object.name='navigator'][property.name='vibrate']",
    message: MESSAGE_VIBRATION
  },
  {
    // Attrape `const { vibrate } = navigator;` — le contournement le plus évident.
    selector:
      "VariableDeclarator[init.name='navigator'] > ObjectPattern > Property[key.name='vibrate']",
    message: MESSAGE_VIBRATION
  }
];

const PROPRIETE_VIBRATION = {
  object: 'navigator',
  property: 'vibrate',
  message: MESSAGE_VIBRATION
};

// Les trois seuls fichiers du dépôt autorisés à appeler la primitive qu'ils encapsulent.
const FICHIER_ALEA = 'partage/src/alea.ts';
const FICHIER_HORLOGE = 'partage/src/horloge.ts';
const FICHIER_HAPTIQUE = 'client/src/gamefeel/haptique-navigateur.ts';

export default tseslint.config(
  // ------------------------------------------------------------ ce qui n'est jamais linté
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-test/**',
      // Livrable statique GitHub Pages : bundles Vite minifiés, même statut que les deux
      // sorties ci-dessus. Il est ignoré par Git et ne doit jamais être relinté comme une source.
      '**/dist-pwa/**',
      // `dist-autonome/` — le build Android/Capacitor du portage (Docs/addendum-portage-android.md
      // § 5) : mêmes bundles minifiés que `dist/`, juste un autre nom de dossier. Sans cette ligne,
      // `npm run lint` relit du JS généré (`==`, expressions nues, `customElements`/`document`
      // non déclarés) et le fait passer pour une infraction de code source.
      '**/dist-autonome/**',
      // `client/android/` — le projet natif Capacitor : Gradle, Java, et une COPIE du bundle web
      // (`app/build/…`, `app/src/main/assets/…`) que Capacitor synchronise depuis `dist-autonome/`.
      // Même raison que `dist-autonome/` ci-dessus, en pire : il contient aussi du Java et du XML.
      'client/android/**',
      // Un worktree imbriqué est un AUTRE checkout du même dépôt, pas du code de celui-ci — le
      // lire ferait dépendre le verdict de `npm run lint` d'un répertoire qui ne sera jamais
      // commité depuis ici, exactement le défaut de mesure que `bac-a-sable/**` documente déjà.
      '.claude/worktrees/**',
      '**/.venv/**',
      'outils/**',
      'donnees/**',
      'contenu/brouillons/**',
      'tests/rapports/**',
      'playwright-report/**',
      'coverage/**',
      // `bac-a-sable/` est ignoré par git (`.gitignore`, `bac-a-sable/*` sauf `LISEZ-MOI.md`).
      // Le linter le lisait quand même — et c'est un défaut de MESURE, pas de confort : le
      // verdict de `npm run lint`, donc la première étape de `npm run verifier`, donc le
      // crochet `pre-push`, dépendait alors de fichiers qui ne seront jamais poussés. Mesuré
      // le 2026-08-03 : `npx eslint .` sortait à 8 erreurs, `npx eslint . --ignore-pattern
      // "bac-a-sable/**"` à 0 — un dépôt fraîchement cloné était donc VERT là où la machine
      // de l'auteur était ROUGE, sur un code identique. Une porte qui juge ce qu'elle ne
      // livre pas ne dit rien de ce qu'elle livre.
      //
      // Ce que cela n'excuse pas : les scripts de mesure du bac à sable restent du code qu'on
      // relit. Ils ne sont simplement plus opposables à la livraison.
      'bac-a-sable/**',
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
      'no-restricted-syntax': ['error', ...SYNTAXE_ALEA, ...SYNTAXE_TEMPS, ...SYNTAXE_VIBRATION],
      'no-restricted-properties': ['error', PROPRIETE_ALEA, PROPRIETE_TEMPS, PROPRIETE_VIBRATION],

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

  // ------------------------------------------------------------ les trois dérogations, chirurgicales
  //
  // Chacune n'ouvre QUE la primitive que le fichier encapsule, et reste soumise aux deux
  // autres interdictions. Une dérogation qui les lèverait toutes serait une porte, pas une
  // exception.
  {
    // `alea.ts` implémente l'aléatoire : il peut appeler `Math.random` pour sa graine par
    // défaut. Il reste soumis à l'interdiction du temps et de la vibration.
    name: 'pierre/derogation-alea',
    files: [FICHIER_ALEA],
    rules: {
      'no-restricted-syntax': ['error', ...SYNTAXE_TEMPS, ...SYNTAXE_VIBRATION],
      'no-restricted-properties': ['error', PROPRIETE_TEMPS, PROPRIETE_VIBRATION]
    }
  },
  {
    // `horloge.ts` implémente le temps : il peut appeler `Date.now()` et `new Date()`.
    // Il reste soumis à l'interdiction de l'aléatoire et de la vibration.
    name: 'pierre/derogation-horloge',
    files: [FICHIER_HORLOGE],
    rules: {
      'no-restricted-syntax': ['error', ...SYNTAXE_ALEA, ...SYNTAXE_VIBRATION],
      'no-restricted-properties': ['error', PROPRIETE_ALEA, PROPRIETE_VIBRATION]
    }
  },
  {
    // `haptique-navigateur.ts` implémente la vibration : il peut appeler `navigator.vibrate`.
    // Il reste soumis à l'interdiction de l'aléatoire et du temps.
    name: 'pierre/derogation-haptique',
    files: [FICHIER_HAPTIQUE],
    rules: {
      'no-restricted-syntax': ['error', ...SYNTAXE_ALEA, ...SYNTAXE_TEMPS],
      'no-restricted-properties': ['error', PROPRIETE_ALEA, PROPRIETE_TEMPS]
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
      'no-restricted-syntax': ['error', ...SYNTAXE_ALEA, ...SYNTAXE_VIBRATION],
      'no-restricted-properties': ['error', PROPRIETE_ALEA, PROPRIETE_VIBRATION]
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
