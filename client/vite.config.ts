// Configuration Vite du client — contrat technique v1 § 1.4, § 3.2 et § 7.3.
//
// Trois responsabilités, et rien d'autre :
//   1. les trois alias vers les SOURCES de `@pierre/partage` (§ 3.2) — aucune construction
//      préalable n'est nécessaire, ni en dev, ni en test ;
//   2. le proxy `/api` vers le serveur Fastify, pour que le client dev parle au vrai serveur ;
//   3. le dossier de sortie choisi PAR MODE : `dist/` en production, `dist-test/` en mode test.
//      Les deux ne se croisent jamais (§ 7.3) : `verifier-bundle.mjs` inspecte le premier,
//      Playwright sert le second.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

/** Ports gelés par le contrat § 0. Écrits en clair : aucune lecture d'environnement ici. */
const PORT_SERVEUR = 8080;
const PORT_VITE = 5173;

/** L'ordre des clés compte : le plus spécifique d'abord (contrat § 3.2). */
const ALIAS_PARTAGE = {
  '@pierre/partage/validation': fileURLToPath(
    new URL('../partage/src/contenu/validation.ts', import.meta.url)
  ),
  '@pierre/partage/factices': fileURLToPath(
    new URL('../partage/src/fournisseurs/factices.ts', import.meta.url)
  ),
  '@pierre/partage': fileURLToPath(new URL('../partage/src/index.ts', import.meta.url))
};

const PROXY_API = {
  '/api': {
    target: `http://127.0.0.1:${PORT_SERVEUR}`,
    changeOrigin: false,
    ws: false
  }
};

export default defineConfig(({ mode }) => {
  const estTest = mode === 'test';

  return {
    // Chemins relatifs : le bundle est servi indifféremment depuis Vite, depuis Fastify
    // (`serveur/src/statique.ts`) ou depuis un `file://` de dépannage.
    base: './',
    plugins: [react(), tailwind()],

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
