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
//   4. `publicDir` et le préchargement de l'Andika régulière (v2 § 9.3, D19).
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
  // ── AJOUT N4 (contrat de finition v3) ─────────────────────────────────────────────────
  // Le § 4.4 confie à N4 `partage/src/ouverture/index.ts` avec pour rôle « sous-chemin
  // `@pierre/partage/ouverture` », mais n'attribue à AUCUN lot les trois fichiers où un
  // sous-chemin se déclare (`partage/package.json`, ce fichier, `vitest.config.ts`). Sans
  // cette ligne le sous-chemin n'existe pas et le livrable de N4 est creux. Signalé au
  // rapport de N4 comme omission du plan gelé — N2 (`/voix`) a le même besoin, et l'ajout
  // est purement additif, donc fusionnable.
  '@pierre/partage/ouverture': source('ouverture/index.ts'),
  // AJOUT N2 — même omission, même remède, et la note de N4 ci-dessus la prévoyait.
  // `@pierre/partage/voix` porte les VALEURS de N2 (`aUnClip`, `clipDe`, `SEUIL_QC`) : la
  // convention C1 leur interdit le barillet, donc sans cette ligne le client ne les résout
  // pas et `voix-fichier.ts` ne se lie pas.
  '@pierre/partage/voix': source('voix/index.ts'),
  // AJOUT portage Android — Docs/addendum-portage-android.md § 3. Résolu ici pour que
  // `client/src/base/adaptateur-capacitor-sqlite.ts` et `migrations-autonome.ts` (mode
  // autonome uniquement, Lot 3) compilent ; le mode LAN n'importe jamais ce sous-chemin, donc
  // sa présence ici n'entraîne rien dans le bundle du contrat § 3.1 tant que rien ne l'importe.
  '@pierre/partage/base': source('base/index.ts'),
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
 * Le fichier préchargé : Andika en 400, nécessaire au premier texte de lecture.
 *
 * Pas la graisse 700 ni les quatre autres familles : `prechargerPolice` charge les deux graisses
 * dès qu'une `ZoneDeLecture` monte. Les imposer avant même le choix du profil consommerait le
 * budget initial pour une ressource dont l'accueil ne se sert pas.
 */
const POLICES_PRECHARGEES = ['andika-regular.woff2'];

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
  const estAutonome = mode === 'autonome';

  return {
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // CHEMINS ABSOLUS — corrigé à l'intégration de la campagne N. Mesuré, pas supposé.
    //
    // Cette ligne valait `'./'`, au motif que « le bundle est servi indifféremment depuis
    // Vite, depuis Fastify ou depuis un `file://` de dépannage ». Le motif est VOID et la
    // conséquence était un écran blanc sans issue :
    //
    //  1. le motif ne tient pas — `prechargerPolices()` (plus haut dans ce fichier) émet
    //     déjà `href: '/polices/…'`, un chemin ABSOLU. Un `file://` ne résolvait donc déjà
    //     aucune police. On payait le prix d'une portabilité qui n'existait pas.
    //
    //  2. le prix, lui, était réel. Sous `base: './'`, `index.html` porte
    //     `src="./assets/index-*.js"`. Le navigateur le résout contre le RÉPERTOIRE de l'URL
    //     courante : à `/parent/dashboard`, cela donne `/parent/assets/index-*.js`. Le repli
    //     SPA de `serveur/src/statique.ts` répond alors `index.html` — mesuré :
    //
    //         $ curl -o /dev/null -w "%{http_code} %{content_type}" \
    //               http://127.0.0.1:8098/parent/assets/index-2mjMLhgT.js
    //         200 text/html; charset=utf-8            <-- du HTML là où le module est attendu
    //
    //     Le module ne se charge pas, React ne monte jamais, la page reste BLANCHE et n'offre
    //     aucune sortie. C'est la règle absolue « AUCUN ÉTAT SANS ISSUE » enfreinte sur la
    //     seule route de profondeur 2 du dépôt — `/parent/dashboard`, précisément l'écran que
    //     le père cherchait. Tout rechargement ou favori sur cette URL donnait un écran mort.
    //
    // `'/'` rend les chemins absolus : ils résolvent identiquement à toute profondeur d'URL.
    // Le service Fastify et le serveur Vite servent tous deux depuis la racine du site, donc
    // aucun des deux n'y perd quoi que ce soit.
    //
    // Gardé par `tests/e2e/parcours-profondeur-url.spec.ts`, qui recharge CHAQUE route de
    // `CHEMINS` par une vraie navigation et exige que l'application monte.
    // ═══════════════════════════════════════════════════════════════════════════════════════
    base: '/',
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
      // Trois sorties, qui ne se croisent JAMAIS (§ 7.3, prolongé par le portage Android) :
      // `dist/` (LAN, contrat § 7.3, `verifier-bundle.mjs` l'inspecte), `dist-test/` (Playwright),
      // `dist-autonome/` (Capacitor `webDir`, Lot 5 — Docs/addendum-portage-android.md § 6).
      outDir: estTest ? 'dist-test' : estAutonome ? 'dist-autonome' : 'dist',
      emptyOutDir: true,
      target: 'es2022',
      // Sources de débogage dans le build de test uniquement : elles ne doivent jamais
      // peser dans le budget de 250 Ko gzip mesuré sur `dist/` (§ 7.3).
      sourcemap: estTest,
      cssCodeSplit: false,
      // Le budget de 250 Ko gzip (§ 7.3) est un contrat du mode LAN. Le mode autonome embarque
      // `contenu/` (7,29 Mo) et le pont SQLite : lui appliquer la même alerte serait du bruit,
      // pas un garde-fou — `verifier-bundle.mjs` ne mesure d'ailleurs que `dist/`.
      chunkSizeWarningLimit: estAutonome ? 8192 : 250
    },

    // Le montage de `window.__test` est gardé par `import.meta.env.MODE === 'test'` dans
    // `src/main.tsx`. Vite remplace ce littéral au build : en production la branche est
    // statiquement fausse et Rollup élimine le chunk dynamique (§ 7.2).
    define: {}
  };
});
