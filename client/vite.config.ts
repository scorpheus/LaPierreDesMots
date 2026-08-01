// Configuration Vite du client — contrat technique v1 § 1.4, § 3.2 et § 7.3,
// prolongé par le contrat des features v2 § 4.7 (les 9 sous-chemins) — lot L2-B.
//
// Quatre responsabilités, et rien d'autre :
//   1. les NEUF alias vers les SOURCES de `@pierre/partage` (§ 4.7) — aucune construction
//      préalable n'est nécessaire, ni en dev, ni en test ;
//   2. le proxy `/api` vers le serveur Fastify, pour que le client dev parle au vrai serveur ;
//   3. le dossier de sortie choisi PAR MODE : `dist/` en production, `dist-test/` en mode test.
//      Les deux ne se croisent jamais (§ 7.3) : `verifier-bundle.mjs` inspecte le premier,
//      Playwright sert le second ;
//   4. `publicDir` et le préchargement des deux fichiers d'Andika (v2 § 9.3, D19).
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

/** Ports gelés par le contrat § 0. Écrits en clair : aucune lecture d'environnement ici. */
const PORT_SERVEUR = 8080;
const PORT_VITE = 5173;

const source = (chemin: string): string =>
  fileURLToPath(new URL(`../partage/src/${chemin}`, import.meta.url));

/**
 * L'ORDRE DES CLÉS COMPTE, et il devient critique à neuf entrées (contrat v2 § 4.7).
 *
 * Vite compare les alias chaîne par PRÉFIXE : `@pierre/partage` placé avant
 * `@pierre/partage/lecture` capturerait ce dernier et résoudrait
 * `partage/src/index.ts/lecture` — un import silencieusement faux, qui ne se verrait qu'à
 * l'exécution. Du plus spécifique au moins spécifique, donc, et le barillet nu EN DERNIER.
 *
 * ⚠ Les mêmes neuf entrées, dans le même ordre, vivent dans `vitest.config.ts`, possédé par
 * L2-D. Le contrat § 11 nomme cette duplication comme un risque et demande de la vérifier
 * DES DEUX CÔTÉS. Signalé au rapport de L2-B.
 */
const ALIAS_PARTAGE = {
  '@pierre/partage/validation': source('contenu/validation.ts'),
  '@pierre/partage/factices': source('fournisseurs/factices.ts'),
  '@pierre/partage/pedagogie': source('pedagogie/index.ts'),
  '@pierre/partage/miroir': source('pedagogie/miroir.ts'),
  '@pierre/partage/lecture': source('lecture/index.ts'),
  '@pierre/partage/recompenses': source('recompenses/index.ts'),
  '@pierre/partage/monde': source('monde/index.ts'),
  '@pierre/partage/parent': source('parent/index.ts'),
  '@pierre/partage': source('index.ts')
};

const PROXY_API = {
  '/api': {
    target: `http://127.0.0.1:${PORT_SERVEUR}`,
    changeOrigin: false,
    ws: false
  }
};

/**
 * Les deux fichiers préchargés : Andika en 400 et en 700.
 *
 * Pas les cinq polices — précharger quatre familles que ce profil n'a pas choisies coûterait
 * quelques centaines de kilo-octets au premier rendu, dont la cible est de 1,2 s sur Galaxy
 * Tab S10 FE. Andika est la police par défaut de TOUTE zone de lecture (v2 § 9.3) ; les autres
 * sont chargées à la demande par `prechargerPolice` quand le profil les réclame.
 */
const POLICES_PRECHARGEES = ['andika-regular.woff2', 'andika-bold.woff2'];

/**
 * Injecte les `<link rel="preload">` dans `index.html`.
 *
 * `crossorigin` est OBLIGATOIRE sur un préchargement de police, même en même origine : sans
 * lui le navigateur télécharge le fichier DEUX FOIS, une fois pour le préchargement et une
 * fois pour le `@font-face`, et le préchargement devient une perte nette.
 *
 * Aucun domaine tiers n'apparaît ici, et c'est mesurable : `tests/visuel/polices.spec.ts`
 * compte les requêtes sortantes pendant le rendu des cinq polices, et le seuil est zéro
 * (v2 § 9.3, « aucun appel à Google Fonts »).
 */
function prechargerPolices(): Plugin {
  return {
    name: 'pierre-precharger-polices',
    transformIndexHtml() {
      return POLICES_PRECHARGEES.map((fichier) => ({
        tag: 'link',
        attrs: {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: `/polices/${fichier}`,
          crossorigin: ''
        },
        injectTo: 'head' as const
      }));
    }
  };
}

export default defineConfig(({ mode }) => {
  const estTest = mode === 'test';

  return {
    // Chemins relatifs : le bundle est servi indifféremment depuis Vite, depuis Fastify
    // (`serveur/src/statique.ts`) ou depuis un `file://` de dépannage.
    base: './',
    plugins: [react(), tailwind(), prechargerPolices()],

    // Les cinq WOFF2 vivent dans `client/public/polices/` et sont copiés tels quels à la
    // racine du bundle : `/polices/andika-regular.woff2`. Ils ne sont PAS versionnés — ils
    // sont téléchargés à l'installation par `scripts/telecharger-polices.mjs`, empreintes
    // SHA-256 épinglées (D9 : rien ne s'installe hors du dossier du projet).
    publicDir: 'public',

    resolve: { alias: ALIAS_PARTAGE },

    // `host: true` : la tablette du LAN doit pouvoir joindre le serveur de développement.
    server: { port: PORT_VITE, strictPort: true, host: true, proxy: PROXY_API },
    preview: { port: PORT_VITE + 1, strictPort: true, host: true, proxy: PROXY_API },

    build: {
      outDir: estTest ? 'dist-test' : 'dist',
      emptyOutDir: true,
      target: 'es2022',
      // Sources de débogage dans le build de test uniquement : elles ne doivent jamais
      // peser dans le budget de 250 Ko gzip mesuré sur `dist/` (§ 7.3).
      sourcemap: estTest,
      cssCodeSplit: false,
      chunkSizeWarningLimit: 250
    },

    // Le montage de `window.__test` est gardé par `import.meta.env.MODE === 'test'` dans
    // `src/main.tsx`. Vite remplace ce littéral au build : en production la branche est
    // statiquement fausse et Rollup élimine le chunk dynamique (§ 7.2).
    define: {}
  };
});
