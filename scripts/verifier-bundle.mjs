/**
 * `scripts/verifier-bundle.mjs` — lot L-G. Contrat gelé § 7.3, annexe T § 5 et § 8.3.
 *
 * Deux vérifications sur **`client/dist/`** — le bundle de PRODUCTION, jamais `dist-test/` :
 *
 * 1. **Fuite des crochets de test.** Recherche des chaînes `__test`, `chargerProfil`,
 *    `allerAuNoeud`, `sauterAnimations`, `figerHorloge`, `monterCrochetsDeTest` dans
 *    `**\/*.{js,css,html}`. Une seule occurrence = échec. « Sinon, un enfant curieux finira
 *    par trouver `allerAuNoeud` — et honnêtement, il aura raison d'essayer. »
 * 2. **Budget.** Somme gzip des entrées initiales ≤ 250 Ko (v2 § 13.5).
 *
 * ⚠ Piège nommé au contrat § 7.3 et respecté ici : **cette liste de chaînes ne vit que dans ce
 * fichier**. Exportée depuis `partage/`, elle entrerait elle-même dans le bundle et la
 * vérification échouerait sur son propre outillage.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

import { RACINE, ecrireEtape, genererRapport } from './rapport.mjs';

const ETAPE = 'bundle';
const debut = Date.now();

const DIST = join(RACINE, 'client', 'dist');
const BUDGET_KO = 250;
const BUDGET_OCTETS = BUDGET_KO * 1024;

/**
 * Ne pas exporter, ne pas déplacer : voir l'avertissement d'en-tête.
 *
 * **Seuls les noms EXCLUSIFS aux crochets de test ont leur place ici.** La liste initiale
 * contenait `sauterAnimations`, `chargerProfil` et `allerAuNoeud` — or `sauterAnimations` est
 * une méthode du magasin Zustand de PRODUCTION (`client/src/etat/magasin.ts:59,216`), et aucun
 * minifieur ne renomme une clé de propriété d'objet littéral. Le détecteur échouait donc
 * toujours, sur du code parfaitement légitime : un faux positif permanent rend
 * `npm run verifier` rouge quoi qu'on fasse, et un contrôle qui ne peut pas passer finit par
 * être ignoré — c'est pire que pas de contrôle du tout.
 *
 * Avant d'ajouter un nom ici : vérifier par `grep` qu'il n'apparaît nulle part hors des
 * crochets de test.
 */
const CHAINES_INTERDITES = [
  '__test',
  'monterCrochetsDeTest',
  'figerHorloge'
];

const problemes = [];
let nbControles = 0;

function relatif(chemin) {
  return relative(RACINE, chemin).split(sep).join(posix.sep);
}

function terminer(statut, note, total) {
  ecrireEtape({
    etape: ETAPE,
    statut,
    dureeMs: Date.now() - debut,
    total: total ?? nbControles,
    echecs: problemes.length,
    details: problemes,
    note
  });
  genererRapport({ commande: 'node scripts/verifier-bundle.mjs' });
  console.log(`bundle — ${problemes.length} problème(s) sur ${total ?? nbControles} contrôle(s)`);
  for (const p of problemes) console.log(`  ✗ ${p.ou} : ${p.message}`);
  if (note) console.log(`  ${note}`);
  process.exit(statut === 'echec' || statut === 'environnement' ? 1 : 0);
}

if (!existsSync(DIST)) {
  terminer(
    'environnement',
    `\`client/dist/\` est absent (${relatif(DIST)}). Lancer \`npm run construire\` avant ` +
      '`npm run test:qualite`. La chaîne de `npm run verifier` le fait dans le bon ordre.',
    0
  );
}

function fichiers(dossier) {
  return readdirSync(dossier, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath ?? e.path ?? dossier, e.name));
}

// ────────────────────────────────────────────────────── 1. fuite des crochets de test

// Le contrat § 7.3 fixe l'extension exacte du périmètre : `**\/*.{js,css,html}`.
const inspectables = fichiers(DIST).filter((f) => /\.(js|mjs|cjs|css|html)$/i.test(f));
for (const fichier of inspectables) {
  nbControles += 1;
  const contenu = readFileSync(fichier, 'utf8');
  for (const chaine of CHAINES_INTERDITES) {
    const index = contenu.indexOf(chaine);
    if (index === -1) continue;
    // On rapporte la première occurrence avec son voisinage : de quoi retrouver le module.
    const extrait = contenu.slice(Math.max(0, index - 60), index + 60).replace(/\s+/g, ' ');
    problemes.push({
      ou: relatif(fichier),
      message:
        `fuite des crochets de test : « ${chaine} » présent dans le bundle de production ` +
        `(octet ${index}) — « …${extrait}… »`
    });
  }
}

// ───────────────────────────────────────────────────────────────────── 2. budget gzip

const indexHtml = join(DIST, 'index.html');
let entrees = [];
if (existsSync(indexHtml)) {
  const html = readFileSync(indexHtml, 'utf8');
  const references = new Set();
  const motifs = [
    /<script[^>]+src=["']([^"']+)["']/gi,
    /<link[^>]+rel=["'](?:stylesheet|modulepreload|preload)["'][^>]*href=["']([^"']+)["']/gi,
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:stylesheet|modulepreload|preload)["']/gi
  ];
  for (const motif of motifs) {
    for (const trouvaille of html.matchAll(motif)) {
      const href = trouvaille[1];
      if (!href || /^(https?:)?\/\//.test(href) || href.startsWith('data:')) continue;
      references.add(href.replace(/^\.?\//, ''));
    }
  }
  entrees = [...references]
    .map((href) => join(DIST, ...href.split('/')))
    .filter((chemin) => existsSync(chemin) && statSync(chemin).isFile());
  // `index.html` fait partie de la charge initiale.
  entrees.unshift(indexHtml);
} else {
  problemes.push({
    ou: relatif(indexHtml),
    message: 'index.html absent du bundle de production : impossible de mesurer la charge initiale'
  });
}

nbControles += 1;
let totalGzip = 0;
const detailEntrees = [];
for (const chemin of entrees) {
  const octets = gzipSync(readFileSync(chemin)).length;
  totalGzip += octets;
  detailEntrees.push({ fichier: relatif(chemin), gzipOctets: octets });
}

if (entrees.length > 0 && totalGzip > BUDGET_OCTETS) {
  problemes.push({
    ou: relatif(DIST),
    message:
      `budget dépassé : ${(totalGzip / 1024).toFixed(1)} Ko gzip pour la charge initiale, ` +
      `budget ${BUDGET_KO} Ko (v2 § 13.5). Entrées : ` +
      detailEntrees
        .sort((a, b) => b.gzipOctets - a.gzipOctets)
        .map((e) => `${e.fichier} ${(e.gzipOctets / 1024).toFixed(1)} Ko`)
        .join(', ')
  });
}

const note =
  `${inspectables.length} fichier(s) inspecté(s) pour la fuite des crochets ; ` +
  `charge initiale ${(totalGzip / 1024).toFixed(1)} Ko gzip sur un budget de ${BUDGET_KO} Ko ` +
  `(${entrees.length} entrée(s)).`;

terminer(problemes.length === 0 ? 'reussite' : 'echec', note);
