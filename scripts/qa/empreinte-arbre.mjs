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
 * L'empreinte de l'arbre de travail : le CONTENU de chaque fichier surveillé, pas son écart à
 * la tête.
 *
 * ── POURQUOI LE CONTENU, ET NON `git status` — MESURÉ ─────────────────────────────────────
 * La première version hachait « la tête + les fichiers qui s'en écartent ». Elle criait donc
 * dès qu'un COMMIT tombait, alors qu'un commit ne change **rien** sur le disque : mesuré le
 * 2026-08-03, au tour 9 de `tours-apres.ndjson`, la campagne voisine a commité et l'empreinte
 * a bougé sur huit fichiers dont le contenu était identique. Un garde qui crie pour un
 * changement qui n'en est pas un finit débranché — c'est la seule façon dont un garde meurt.
 *
 * Le coût de l'exactitude a été mesuré avant d'être payé : **900 fichiers, 6,8 Mo, 62 ms**
 * (24 ms d'énumération, 38 ms de lecture et de hachage). Aucune raison d'approximer.
 *
 * L'énumération passe par `git ls-files -c -o --exclude-standard` : les fichiers suivis PLUS
 * les nouveaux non ignorés. `outils/`, `node_modules/`, les `dist/` et `donnees/` sont donc
 * hors champ sans qu'on ait à les nommer — `.gitignore` fait foi.
 *
 * @returns {{tete: string, fichiers: {chemin: string, sha: string}[], nbFichiers: number,
 *            ecarts: {chemin: string, sha: string}[], empreinte: string, propre: boolean}}
 */
export function empreinteArbre() {
  const tete = git(['rev-parse', 'HEAD']).sortie.trim() || 'inconnu';
  const { code, sortie } = git([
    'ls-files',
    '-c',
    '-o',
    '--exclude-standard',
    '--',
    ...PREFIXES_SURVEILLES,
    ...FICHIERS_SURVEILLES
  ]);

  const fichiers = [];
  if (code === 0) {
    for (const brut of sortie.split(/\r?\n/)) {
      if (brut.trim().length === 0) continue;
      const chemin = brut.replace(/^"|"$/g, '').replace(/\\/g, '/');
      if (!surveille(chemin)) continue;
      const absolu = join(RACINE, chemin);
      // Un fichier suivi mais absent du disque a été supprimé : son absence EST l'état, et
      // elle doit compter — sinon une suppression passerait pour « rien n'a bougé ».
      if (!existsSync(absolu)) {
        fichiers.push({ chemin, sha: 'absent' });
        continue;
      }
      if (statSync(absolu).isDirectory()) continue;
      fichiers.push({ chemin, sha: sha256(readFileSync(absolu)) });
    }
  }
  fichiers.sort((a, b) => (a.chemin < b.chemin ? -1 : a.chemin > b.chemin ? 1 : 0));

  // Les écarts à la tête ne servent plus à l'empreinte : ils restent au rapport, parce que
  // « l'arbre porte 8 modifications non commitées » est une information utile au lecteur.
  const ecarts = ecartsALaTete(fichiers);

  return {
    tete,
    fichiers,
    nbFichiers: fichiers.length,
    ecarts,
    empreinte: sha256(fichiers.map((f) => `${f.chemin}:${f.sha}`).join('\n')),
    propre: ecarts.length === 0
  };
}

/** Les fichiers surveillés qui diffèrent de la tête — pour le rapport, jamais pour l'empreinte. */
function ecartsALaTete(fichiers) {
  const { code, sortie } = git(['status', '--porcelain', '-uall']);
  if (code !== 0) return [];
  const parChemin = new Map(fichiers.map((f) => [f.chemin, f.sha]));
  const ecarts = [];
  for (const ligne of sortie.split(/\r?\n/)) {
    if (ligne.trim().length === 0) continue;
    // Format porcelain v1 : deux colonnes d'état, une espace, le chemin. Un renommage porte
    // « ancien -> nouveau » ; on garde la destination, c'est elle qui est sur le disque.
    const brut = ligne.slice(3).trim();
    const chemin = (brut.includes(' -> ') ? brut.split(' -> ')[1] : brut)
      .replace(/^"|"$/g, '')
      .replace(/\\/g, '/');
    if (!surveille(chemin)) continue;
    ecarts.push({ chemin, sha: parChemin.get(chemin) ?? 'absent' });
  }
  return ecarts;
}

/** Une empreinte lisible en une ligne : les douze premiers caractères suffisent à comparer. */
export function empreinteCourte(empreinte) {
  return empreinte.slice(0, 12);
}

/**
 * Ce qui a bougé entre deux empreintes — NOMMÉ, jamais résumé par « ça a changé ».
 *
 * Le déplacement de la tête n'y figure PAS : un commit qui ne touche pas au disque n'a rien
 * changé pour la suite de tests, et le signaler ferait crier le garde à tort (voir
 * `empreinteArbre`). Seul le contenu compte.
 *
 * @returns {string[]} les chemins dont le contenu diffère entre les deux relevés.
 */
export function fichiersQuiOntBouge(avant, apres) {
  const table = (releve) => new Map((releve.fichiers ?? []).map((f) => [f.chemin, f.sha]));
  const a = table(avant);
  const b = table(apres);
  const bouges = new Set();
  for (const [chemin, sha] of a) if (b.get(chemin) !== sha) bouges.add(`${chemin} (retiré ou modifié)`);
  for (const [chemin, sha] of b) if (a.get(chemin) !== sha) bouges.add(chemin);
  // Un chemin qui a seulement changé de contenu apparaît deux fois sous deux libellés ; on
  // garde le nom nu, qui est le plus lisible.
  const nus = new Set([...bouges].map((n) => n.replace(' (retiré ou modifié)', '')));
  return [...nus].sort();
}

// ─────────────────────────────────────────────────────────────────── exécution directe

const estAppeleDirectement =
  typeof process.argv[1] === 'string' && process.argv[1].endsWith('empreinte-arbre.mjs');

if (estAppeleDirectement) {
  const releve = empreinteArbre();
  console.log(`empreinte ${releve.empreinte}`);
  console.log(`tête      ${releve.tete}`);
  console.log(`fichiers  ${String(releve.nbFichiers)} surveillés`);
  console.log(
    `arbre     ${releve.propre ? 'PROPRE' : `${String(releve.ecarts.length)} fichier(s) surveillé(s) s’écartent de la tête`}`
  );
  if (process.argv.includes('--detail')) {
    for (const ecart of releve.ecarts) {
      console.log(`  ${ecart.sha.slice(0, 12)}  ${ecart.chemin}`);
    }
  }
}
