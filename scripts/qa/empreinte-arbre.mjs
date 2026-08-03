/**
 * `scripts/qa/empreinte-arbre.mjs` — L'EMPREINTE DE L'ARBRE QUI A RÉELLEMENT TOURNÉ. Lot P0.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE — MESURÉ, PAS REDOUTÉ
 *
 * `Docs/questions-en-attente.md` § Q-INT-9 rapporte « sept exécutions du même commit sur arbre
 * propre, TROIS ROUGES », en conclut que « la cause est produit, pas outillage », et désigne la
 * falaise du sélecteur (S3-Q2) comme coupable. Le lot P0 a refait la mesure — dix exécutions,
 * `bac-a-sable/p0-intermittence/tours-avant.ndjson` — et a trouvé **trois rouges** aussi.
 *
 * Sauf que les trois rouges étaient **identiques à la ligne près**, sur trois exécutions
 * consécutives (tours 8, 9, 10), et qu'aucun ne passait par `composerSortie` :
 *
 *     AssertionError: expected 3 to be 1        tests/api/parcours-humains.test.ts:193
 *     AssertionError: expected 4 to be 2        tests/api/pedagogie.test.ts:195
 *     AssertionError: journal fin vide: expected 6 to be 2   tentatives-nbelements.test.ts:410
 *
 * Trois exécutions rigoureusement identiques, ce n'est pas de l'intermittence : c'est un autre
 * code. Horodatages relevés sur le disque au moment de la mesure, sortie citée :
 *
 *     serveur/src/depots/etapes.ts       2026-08-03 11:27:26
 *     serveur/src/depots/tentatives.ts   2026-08-03 11:28:06
 *     tours 1 à 7 (verts)                lancés de 11:24:57 à 11:28:48
 *     tours 8 à 10 (rouges)              lancés après 11:28:48
 *
 * Un autre écrivain — le dépôt fait tourner plusieurs campagnes en parallèle, D10 — était en
 * train d'appliquer l'arbitrage Q-INT-4 (« une réussite est imputée à TOUTES les compétences
 * déclarées ») pendant que la mesure tournait. Les tests qui comptent les lignes du journal
 * voyaient donc 3 au lieu de 1. **Rien n'était intermittent. La mesure n'était simplement pas
 * attribuable**, parce que rien n'enregistrait l'arbre qui avait produit le verdict.
 *
 * C'est le mode de défaillance le plus coûteux du corpus : l'orchestrateur et ses agents
 * partagent la même prémisse — « arbre propre » — donc personne ne la teste. Un `git status`
 * lancé AVANT et APRÈS une campagne de dix minutes ne dit rien de ce qui s'est passé PENDANT.
 *
 * ── CE QUE CE MODULE GARANTIT ─────────────────────────────────────────────────────────────
 *
 * `empreinteArbre()` rend une empreinte SHA-256 de tout ce dont le verdict de la suite dépend :
 * le commit de tête, plus le contenu exact de chaque fichier source qui s'en écarte (modifié,
 * ajouté, non suivi). Deux empreintes égales ⇒ la suite a jugé le même code. Deux empreintes
 * différentes ⇒ **aucun verdict n'est comparable**, et le dire coûte une seconde.
 *
 * Aucun `Date.now`, aucun `new Date`, aucun `Math.random` : une empreinte est une fonction du
 * contenu, jamais de l'instant.
 *
 *     node scripts/qa/empreinte-arbre.mjs            # l'empreinte, une ligne
 *     node scripts/qa/empreinte-arbre.mjs --detail   # et les fichiers qui s'écartent de HEAD
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Ce dont le verdict de la suite dépend, et rien d'autre.
 *
 * `tests/rapports/` en est EXCLU volontairement : les étages y écrivent leur propre rapport
 * pendant qu'ils tournent. L'y inclure ferait diverger l'empreinte à chaque exécution et
 * rendrait le contrôle inutile — un garde qui crie toujours est un garde qu'on débranche.
 * `donnees/`, `outils/` et les `dist/` sont exclus pour la même raison : ce sont des sorties,
 * pas des entrées.
 */
const PREFIXES_SURVEILLES = [
  'partage/src/',
  'serveur/src/',
  'serveur/migrations/',
  'client/src/',
  'contenu/',
  'tests/',
  'scripts/'
];

/** Fichiers de configuration à la racine — un seuil qui bouge change tout autant un verdict. */
const FICHIERS_SURVEILLES = [
  'package.json',
  'vitest.config.ts',
  'playwright.config.ts',
  'tsconfig.json',
  'tsconfig.base.json',
  'eslint.config.js'
];

const PREFIXES_EXCLUS = ['tests/rapports/'];

function surveille(chemin) {
  if (PREFIXES_EXCLUS.some((prefixe) => chemin.startsWith(prefixe))) return false;
  if (FICHIERS_SURVEILLES.includes(chemin)) return true;
  return PREFIXES_SURVEILLES.some((prefixe) => chemin.startsWith(prefixe));
}

function git(argumentsGit) {
  const resultat = spawnSync('git', argumentsGit, {
    cwd: RACINE,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  return { code: resultat.status ?? 1, sortie: resultat.stdout ?? '' };
}

function sha256(octets) {
  return createHash('sha256').update(octets).digest('hex');
}

/**
 * L'empreinte de l'arbre de travail.
 *
 * @returns {{tete: string, ecarts: {chemin: string, sha: string}[], empreinte: string,
 *            propre: boolean}}
 *   `tete` — le commit de tête (`inconnu` hors dépôt git) ;
 *   `ecarts` — les fichiers surveillés qui diffèrent de `tete`, avec l'empreinte de leur
 *     contenu EXACT (un fichier modifié deux fois donne deux empreintes différentes, là où
 *     `git status` rendrait la même ligne) ;
 *   `empreinte` — le SHA-256 de l'ensemble ;
 *   `propre` — vrai si aucun fichier surveillé ne s'écarte de `tete`.
 */
export function empreinteArbre() {
  const tete = git(['rev-parse', 'HEAD']).sortie.trim() || 'inconnu';
  const { code, sortie } = git(['status', '--porcelain', '-uall']);
  const ecarts = [];

  if (code === 0) {
    for (const ligne of sortie.split(/\r?\n/)) {
      if (ligne.trim().length === 0) continue;
      // Format porcelain v1 : deux colonnes d'état, une espace, le chemin. Un renommage porte
      // « ancien -> nouveau » ; on garde la destination, c'est elle qui est sur le disque.
      const brut = ligne.slice(3).trim();
      const chemin = (brut.includes(' -> ') ? brut.split(' -> ')[1] : brut)
        .replace(/^"|"$/g, '')
        .replace(/\\/g, '/');
      if (!surveille(chemin)) continue;
      const absolu = join(RACINE, chemin);
      // Un fichier supprimé n'a pas de contenu : son absence EST l'écart, et elle compte.
      if (!existsSync(absolu)) {
        ecarts.push({ chemin, sha: 'absent' });
        continue;
      }
      if (statSync(absolu).isDirectory()) continue;
      ecarts.push({ chemin, sha: sha256(readFileSync(absolu)) });
    }
  }

  ecarts.sort((a, b) => (a.chemin < b.chemin ? -1 : a.chemin > b.chemin ? 1 : 0));
  const matiere = [tete, ...ecarts.map((e) => `${e.chemin}:${e.sha}`)].join('\n');
  return { tete, ecarts, empreinte: sha256(matiere), propre: ecarts.length === 0 };
}

/** Une empreinte lisible en une ligne : les douze premiers caractères suffisent à comparer. */
export function empreinteCourte(empreinte) {
  return empreinte.slice(0, 12);
}

/**
 * Ce qui a bougé entre deux empreintes — nommé, jamais résumé par « ça a changé ».
 * @returns {string[]} les chemins dont le contenu diffère entre les deux relevés.
 */
export function fichiersQuiOntBouge(avant, apres) {
  const table = (releve) => new Map(releve.ecarts.map((e) => [e.chemin, e.sha]));
  const a = table(avant);
  const b = table(apres);
  const bouges = new Set();
  for (const [chemin, sha] of a) if (b.get(chemin) !== sha) bouges.add(chemin);
  for (const [chemin, sha] of b) if (a.get(chemin) !== sha) bouges.add(chemin);
  if (avant.tete !== apres.tete) bouges.add(`(HEAD ${avant.tete.slice(0, 8)} → ${apres.tete.slice(0, 8)})`);
  return [...bouges].sort();
}

// ─────────────────────────────────────────────────────────────────── exécution directe

const estAppeleDirectement =
  typeof process.argv[1] === 'string' && process.argv[1].endsWith('empreinte-arbre.mjs');

if (estAppeleDirectement) {
  const releve = empreinteArbre();
  console.log(`empreinte ${releve.empreinte}`);
  console.log(`tête      ${releve.tete}`);
  console.log(
    `arbre     ${releve.propre ? 'PROPRE' : `${String(releve.ecarts.length)} fichier(s) surveillé(s) s’écartent de la tête`}`
  );
  if (process.argv.includes('--detail')) {
    for (const ecart of releve.ecarts) {
      console.log(`  ${ecart.sha.slice(0, 12)}  ${ecart.chemin}`);
    }
  }
}
