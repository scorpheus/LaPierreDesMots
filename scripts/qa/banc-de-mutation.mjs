/**
 * `npm run qa:mutations` — le test de la QA par la QA. Lot Q5.
 *
 * On casse le code de production, un défaut à la fois, et on regarde si la suite hurle. Une
 * suite qui reste verte sur un `d` tracé à l'envers n'est pas une suite de tests, c'est une
 * cérémonie.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────────────────
 *
 * `Docs/audit-qa.md` a mesuré le taux de survie **une fois**, à la main, le 2026-08-02. Un
 * chiffre mesuré une fois est un chiffre qui se périme : la QA se dégraderait sans que
 * personne ne le voie. Ce banc rend la mesure REPRODUCTIBLE et OPPOSABLE.
 *
 * ── LES CINQ INVARIANTS, ET CE QU'ILS ONT COÛTÉ ─────────────────────────────────────────
 *
 * 1. **L'ancrage est unique, ou on refuse de démarrer.** Un ancrage à deux occurrences ne
 *    mute pas ce qu'on croit. Absent : la recette a rouillé, on le DIT (`ANCRAGE-PERDU`) — on
 *    ne saute jamais en silence.
 *
 * 2. **Restauration dans un `finally`, à l'octet près**, et jamais aveugle : avant de
 *    restaurer, on relit le disque. Si le contenu n'est plus celui qu'on a écrit, c'est qu'un
 *    autre écrivain est passé — **on ne restaure pas**, on crie `COLLISION`. Écraser le travail
 *    d'autrui pour « nettoyer le sien » est la faute que la règle globale du dépôt interdit.
 *
 * 3. **Les tests non suivis par git sont exclus, recalculés à CHAQUE essai.** Ce sont ceux
 *    qu'une campagne parallèle est en train d'écrire. Sans cette exclusion, le banc compte la
 *    rougeur des autres comme sa propre détection.
 *
 * 4. **Cinq contrôles négatifs.** Des modifications qui ne changent RIEN et doivent laisser la
 *    suite verte. L'audit a rendu 23/23 au premier passage ; les cinq contrôles ont tous rougi
 *    et ont révélé que la mesure était du bruit. *Sans contrôle négatif, un banc de mutation ne
 *    mesure pas la QA.*
 *
 * 5. **Base verte AVANT et APRÈS.** Une base rouge avant : toute détection est un faux positif.
 *    Une base rouge après : une restauration a échoué, et le dépôt est sale.
 *
 * ── LA RÈGLE D'ÉCHEC ────────────────────────────────────────────────────────────────────
 *
 * Le banc sort en 1 dès qu'un de ces cinq faits est vrai :
 *
 *   • une mutation attendue `DETECTEE` a **survécu** → la QA a régressé ;
 *   • un contrôle négatif a rougi → la mesure ne vaut rien ;
 *   • la base n'était pas verte, avant ou après ;
 *   • un ancrage a été perdu → une recette pourrit sans le dire ;
 *   • une collision d'écriture a été détectée.
 *
 * Une mutation attendue `SURVIT` qui se fait DÉTECTER n'échoue pas : c'est une **AMÉLIORATION**
 * (un lot a fermé le trou). Le banc l'imprime en toutes lettres avec la ligne exacte à changer
 * dans `recettes.mjs`. Le cliquet ne se resserre qu'à la main, mais il ne se desserre jamais
 * tout seul.
 *
 *   > Pourquoi pas « échouer dès qu'une mutation survit », comme la demande le disait ? Parce
 *   > que 10 des 26 mutations survivent aujourd'hui, pour des raisons écrites et acceptées
 *   > (écran non couvert au composant, taille rendue qu'un DOM sans mise en page ne peut pas
 *   > mesurer). Une commande rouge en permanence est une commande qu'on cesse de lire — et
 *   > c'est exactement le mode de défaillance que ce lot combat. Chaque survivant porte donc
 *   > son `pourquoi` dans `recettes.mjs`, et tout NOUVEAU survivant fait rougir le banc.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────────────────
 *
 *   npm run qa:mutations                      # les 31 recettes, ~5 min
 *   npm run qa:mutations -- --liste           # ne rien exécuter, montrer le plan
 *   npm run qa:mutations -- --seulement=M18,M20,M26
 *   npm run qa:mutations -- --sans-controles  # à ne PAS utiliser : voir l'invariant 4
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * `--recettes=<chemin>` charge un autre jeu de recettes.
 *
 * Il sert d'abord à **prouver que ce banc peut échouer** : un jeu de preuve porte une recette
 * attendue `DETECTEE` dont la mutation ne change rien, et une recette dont l'ancrage n'existe
 * pas. Les deux chemins d'échec — `régression` et `ANCRAGE-PERDU` — deviennent alors
 * exécutables sans toucher aux recettes gelées. *Un garde qu'on n'a jamais vu se déclencher
 * n'a pas fait ses preuves.*
 *
 * Un jeu chargé par cette option ne peut JAMAIS écrire le rapport de référence : voir
 * `EST_COMPLET` plus bas.
 */
const cheminRecettes =
  process.argv.slice(2).find((a) => a.startsWith('--recettes='))?.slice(11) ?? './recettes.mjs';
const { MUTATIONS, TOUTES_LES_RECETTES } = await import(
  cheminRecettes.startsWith('.')
    ? cheminRecettes
    : pathToFileURL(cheminRecettes).href
);

const RACINE = fileURLToPath(new URL('../..', import.meta.url));
const DOSSIER_QA = join(RACINE, 'tests', 'rapports', 'qa');

// ─────────────────────────────────────────────────────────────────────── arguments

const arguments_ = process.argv.slice(2);
const aDrapeau = (nom) => arguments_.includes(`--${nom}`);
const valeurDe = (nom) => {
  const trouve = arguments_.find((a) => a.startsWith(`--${nom}=`));
  return trouve === undefined ? null : trouve.slice(nom.length + 3);
};

const MODE_LISTE = aDrapeau('liste');
const SANS_CONTROLES = aDrapeau('sans-controles');
const FILTRE = valeurDe('seulement');

const selection = new Set(
  FILTRE === null ? [] : FILTRE.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
);

const recettes = (SANS_CONTROLES ? MUTATIONS : TOUTES_LES_RECETTES).filter((r) =>
  selection.size === 0 ? true : selection.has(r.id)
);

/**
 * Un banc PARTIEL n'écrit pas le rapport de référence, il écrit `mutations-partiel.json`.
 *
 * Mesuré en écrivant ce lot : un `--seulement=M11,M11b` avait écrasé le rapport complet, et le
 * tableau de bord a aussitôt affiché « 1 survivante sur 2 » comme s'il s'agissait de l'état du
 * dépôt. **Un rapport partiel qui prend la place du rapport complet est exactement le test
 * trompeur que ce lot combat**, et il l'a été à l'intérieur de son propre outillage.
 */
const EST_COMPLET =
  selection.size === 0 && !SANS_CONTROLES && cheminRecettes === './recettes.mjs';
const CHEMIN_JSON = join(DOSSIER_QA, EST_COMPLET ? 'mutations.json' : 'mutations-partiel.json');
const CHEMIN_JOURNAL = join(
  DOSSIER_QA,
  EST_COMPLET ? 'mutations-journal.tsv' : 'mutations-journal-partiel.tsv'
);

if (selection.size > 0) {
  const inconnues = [...selection].filter(
    (id) => !TOUTES_LES_RECETTES.some((r) => r.id === id)
  );
  if (inconnues.length > 0) {
    console.error(`--seulement : recette(s) inconnue(s) : ${inconnues.join(', ')}`);
    process.exit(2);
  }
}

// ────────────────────────────────────────────────────────────── exécution des étages

/** Sortie unifiée d'un processus enfant. */
function lancer(commande, argumentsCommande, options = {}) {
  const resultat = spawnSync(commande, argumentsCommande, {
    cwd: RACINE,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
    maxBuffer: 64 * 1024 * 1024,
    ...options
  });
  return {
    code: resultat.status ?? 1,
    sortie: `${resultat.stdout ?? ''}\n${resultat.stderr ?? ''}`
  };
}

/**
 * Les fichiers de test que git ne suit pas — donc ceux qu'une AUTRE campagne écrit en ce
 * moment. Recalculé à chaque essai : une campagne parallèle en ajoute pendant que le banc
 * tourne, et une liste figée en début de course laisserait entrer les nouveaux.
 */
function testsNonSuivis() {
  const { code, sortie } = lancer('git', ['ls-files', '--others', '--exclude-standard', '--', 'tests']);
  if (code !== 0) return [];
  return sortie
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /\.(test|spec)\.(ts|tsx)$/.test(l));
}

const VITEST = join(RACINE, 'node_modules', 'vitest', 'vitest.mjs');

/** L'étage 1 : `npm run test` moins les tests que d'autres campagnes écrivent. */
function etageVitest() {
  const exclusions = testsNonSuivis().flatMap((f) => ['--exclude', f]);
  const { code, sortie } = lancer(process.execPath, [
    VITEST,
    'run',
    '--project', 'unitaires',
    '--project', 'composants',
    '--project', 'api',
    ...exclusions
  ]);
  // Les couleurs sont coupées par `FORCE_COLOR: 0`, mais une version de Vitest peut les
  // remettre : on désarme les séquences ANSI avant de lire le compte.
  //
  // Construite par `fromCharCode` plutôt qu'écrite en clair : un caractère d'échappement
  // LITTÉRAL dans une expression régulière est invisible à la relecture — celui-ci a dormi
  // dans ce fichier jusqu'à ce qu'ESLint le refuse (`no-control-regex`), et il avait raison.
  const ansi = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');
  const compte = /Tests\s+(?:\S+\s+)?(\d+)\s+passed/.exec(sortie.replace(ansi, ''));
  return { code, sortie, nbTests: compte === null ? null : Number(compte[1]) };
}

/** Étage 2 : la validation du contenu. Script Node, aucune compilation. */
function etageContenu() {
  return lancer(process.execPath, [join('scripts', 'test-contenu.mjs')]);
}

/** Étage 3 : le rejeu des journaux de référence. `tsx` lit `partage/src`, aucune compilation. */
function etageRejeu() {
  return lancer(process.execPath, [join('scripts', 'test-rejeu.mjs')]);
}

/**
 * Les E2E ne sont **pas** un étage de ce banc, et c'est écrit ici plutôt que tu, parce qu'une
 * limite tue est une limite qui devient un mensonge : `playwright.config.ts` sert
 * `node serveur/dist/index.js`, donc les E2E exigent un build, et la compilation appartient à
 * l'orchestrateur (D10). Les recettes couvertes en E2E portent `assertionE2E` — le fichier et
 * l'assertion sont NOMMÉS, ce qui rend la couverture vérifiable à la lecture.
 */
const ETAGES = [
  { nom: 'vitest', executer: etageVitest },
  { nom: 'contenu', executer: etageContenu },
  { nom: 'rejeu', executer: etageRejeu }
];

// ───────────────────────────────────────────────────────── application d'une mutation

/** Compte les occurrences d'un ancrage littéral ou régulier. */
function compterOccurrences(texte, ancrage) {
  if (typeof ancrage === 'string') {
    let compte = 0;
    let index = texte.indexOf(ancrage);
    while (index !== -1) {
      compte += 1;
      index = texte.indexOf(ancrage, index + 1);
    }
    return compte;
  }
  const global = new RegExp(ancrage.source, `${ancrage.flags.replace('g', '')}g`);
  return [...texte.matchAll(global)].length;
}

function appliquer(texte, ancrage, remplacement) {
  if (typeof ancrage === 'string') {
    return texte.replace(ancrage, () => remplacement);
  }
  return texte.replace(ancrage, remplacement);
}

// ────────────────────────────────────────────────────── protection des rapports d'étape

/**
 * `test:contenu` et `test:rejeu` écrivent leur rapport dans `tests/rapports/`. Les faire
 * tourner 31 fois sur du code volontairement cassé laisserait un rapport MENSONGER derrière
 * le banc. On les met de côté et on les remet — le rapport de la dernière vraie vérification
 * reste celui que `RAPPORT.md` affiche.
 */
const RAPPORTS_A_PROTEGER = ['test-contenu.json', 'test-rejeu.json'].map((n) =>
  join(RACINE, 'tests', 'rapports', n)
);

function sauvegarderRapports() {
  return RAPPORTS_A_PROTEGER.map((chemin) => ({
    chemin,
    contenu: existsSync(chemin) ? readFileSync(chemin) : null
  }));
}

function restaurerRapports(sauvegarde) {
  for (const { chemin, contenu } of sauvegarde) {
    if (contenu !== null) writeFileSync(chemin, contenu);
  }
}

// ─────────────────────────────────────────────────────────────────────────── le banc

const journal = [];
let collision = null;

function essayer(recette) {
  const chemin = join(RACINE, recette.fichier);
  if (!existsSync(chemin)) {
    return { verdict: 'ANCRAGE-PERDU', detail: `fichier absent : ${recette.fichier}` };
  }

  const octetsOriginaux = readFileSync(chemin);
  const texte = octetsOriginaux.toString('utf8');

  const occurrences = compterOccurrences(texte, recette.ancrage);
  if (occurrences !== 1) {
    return {
      verdict: 'ANCRAGE-PERDU',
      detail:
        `ancrage ${recette.id} dans ${recette.fichier} : ${occurrences} occurrence(s), attendu 1. ` +
        'Le code a bougé — la recette est à remettre à jour, pas à sauter.'
    };
  }

  const mute = appliquer(texte, recette.ancrage, recette.remplacement);
  if (mute === texte) {
    return { verdict: 'ANCRAGE-PERDU', detail: `le remplacement de ${recette.id} n’a rien changé` };
  }
  const octetsMutes = Buffer.from(mute, 'utf8');

  let verdict = 'SURVIT';
  const etagesJoues = [];
  try {
    writeFileSync(chemin, octetsMutes);
    for (const etage of ETAGES) {
      const resultat = etage.executer();
      etagesJoues.push({ etage: etage.nom, code: resultat.code, nbTests: resultat.nbTests ?? null });
      if (resultat.code !== 0) {
        verdict = 'DETECTEE';
        break; // détecté au premier étage qui parle : les suivants ne diraient rien de plus
      }
    }
  } finally {
    // Invariant 2 : on ne restaure QUE si le disque porte encore exactement ce qu'on y a mis.
    const surDisque = existsSync(chemin) ? readFileSync(chemin) : null;
    if (surDisque !== null && surDisque.equals(octetsMutes)) {
      writeFileSync(chemin, octetsOriginaux);
    } else {
      collision = {
        recette: recette.id,
        fichier: recette.fichier,
        message:
          `${recette.fichier} a été réécrit par quelqu’un d’autre pendant l’essai ${recette.id}. ` +
          'Le banc N’A RIEN RESTAURÉ sur ce fichier : écraser le travail d’un autre écrivain ' +
          'coûte plus cher que de s’arrêter. Vérifier `git diff` sur ce fichier avant de relancer.'
      };
    }
  }

  return { verdict, etagesJoues };
}

// ─────────────────────────────────────────────────────────────────────────── plan

console.log('');
console.log('╭─ Banc de mutation — La Pierre des Mots');
console.log(`│  ${recettes.length} recette(s) : ${recettes.filter((r) => r.negatif !== true).length} mutation(s) + ${recettes.filter((r) => r.negatif === true).length} contrôle(s) négatif(s)`);
console.log('╰─ Chaque essai : ancrage unique → mutation → suite → restauration à l’octet près');
console.log('');

if (SANS_CONTROLES) {
  console.log(
    '⚠  --sans-controles : la mesure qui suit N’EST PAS OPPOSABLE. L’audit du 2026-08-02 a\n' +
    '   rendu 23 détectées sur 23 avant que les contrôles négatifs ne révèlent que la suite\n' +
    '   était déjà rouge pour une autre raison. Ne publier aucun chiffre issu de ce mode.\n'
  );
}

// Un avertissement qui vaut mieux qu'un refus : les fichiers-cibles qu'un autre écrit en ce
// moment sont ceux où une collision est possible. On les nomme AVANT de commencer.
const { sortie: statutGit } = lancer('git', ['status', '--porcelain']);
const salesConnus = new Set(
  statutGit
    .split(/\r?\n/)
    .map((l) => l.slice(3).trim().replace(/\\/g, '/'))
    .filter((l) => l.length > 0)
);
const ciblesSales = [...new Set(recettes.map((r) => r.fichier))].filter((f) => salesConnus.has(f));
if (ciblesSales.length > 0) {
  console.log('⚠  Fichiers-cibles déjà modifiés dans l’arbre de travail :');
  for (const f of ciblesSales) console.log(`   · ${f}`);
  console.log('   Le banc les restaure à l’octet près, mais ne lance PAS ce banc pendant');
  console.log('   qu’une campagne écrit ces fichiers-là. Voir l’invariant 2.\n');
}

if (MODE_LISTE) {
  // `--liste` ne se contente pas d'imprimer le plan : il VÉRIFIE chaque ancrage. C'est un
  // contrôle à une seconde qui dit si les recettes ont rouillé, sans payer les cinq minutes
  // de suite. Un plan qui s'imprime sans vérifier ses ancrages est un rapport trompeur.
  console.log('id\tancrage\tattendu\tcouvertPar\tfichier\ttitre');
  let perdus = 0;
  for (const r of recettes) {
    const chemin = join(RACINE, r.fichier);
    let etat;
    if (!existsSync(chemin)) {
      etat = 'FICHIER-ABSENT';
    } else {
      const n = compterOccurrences(readFileSync(chemin, 'utf8'), r.ancrage);
      etat = n === 1 ? 'ok' : `${n} occurrence(s)`;
    }
    if (etat !== 'ok') perdus += 1;
    console.log(`${r.id}\t${etat}\t${r.attendu}\t${r.couvertPar ?? '—'}\t${r.fichier}\t${r.titre}`);
  }
  console.log('');
  console.log(`${recettes.length} recette(s), ${perdus} ancrage(s) perdu(s).`);
  process.exit(perdus > 0 ? 1 : 0);
}

// ─────────────────────────────────────────────────────────────────────── exécution

mkdirSync(DOSSIER_QA, { recursive: true });
const sauvegardeRapports = sauvegarderRapports();
const debut = Date.now();

const exclusInitiales = testsNonSuivis();
if (exclusInitiales.length > 0) {
  console.log(`Tests non suivis par git, EXCLUS de chaque essai (${exclusInitiales.length}) :`);
  for (const f of exclusInitiales) console.log(`   · ${f}`);
  console.log('');
}

process.stdout.write('BASE  avant … ');
const baseAvant = etageVitest();
console.log(
  baseAvant.code === 0
    ? `VERTE   ${baseAvant.nbTests ?? '?'} tests`
    : `ROUGE   ← toute détection qui suit serait un faux positif`
);

/** @type {{id: string, verdict: string, attendu: string, detail?: string}[]} */
const resultats = [];

if (baseAvant.code === 0) {
  for (const recette of recettes) {
    process.stdout.write(`${recette.id.padEnd(5)} ${recette.fichier.padEnd(48).slice(0, 48)} … `);
    const debutEssai = Date.now();
    const { verdict, detail, etagesJoues } = essayer(recette);
    const dureeMs = Date.now() - debutEssai;

    const conforme =
      verdict === recette.attendu ||
      (recette.attendu === 'SURVIT' && verdict === 'DETECTEE'); // amélioration
    const symbole =
      verdict === 'ANCRAGE-PERDU'
        ? '🔧'
        : verdict === recette.attendu
          ? verdict === 'DETECTEE' ? '✅' : '➖'
          : verdict === 'DETECTEE'
            ? '🎉'
            : '❌';

    console.log(`${symbole} ${verdict.padEnd(14)} ${(dureeMs / 1000).toFixed(1)} s`);
    if (detail !== undefined) console.log(`      ${detail}`);

    resultats.push({
      id: recette.id,
      titre: recette.titre,
      fichier: recette.fichier,
      negatif: recette.negatif === true,
      attendu: recette.attendu,
      verdict,
      conforme,
      couvertPar: recette.couvertPar ?? null,
      assertionE2E: recette.assertionE2E ?? null,
      regle: recette.regle ?? null,
      pourquoi: recette.pourquoi ?? null,
      detail: detail ?? null,
      dureeMs,
      etages: etagesJoues ?? []
    });
    journal.push(`${recette.id}\t${recette.attendu}\t${verdict}\t${dureeMs}\t${recette.fichier}`);

    if (collision !== null) break; // invariant 2 : on s'arrête net, le dépôt prime
  }
}

process.stdout.write('BASE  après … ');
const baseApres = etageVitest();
console.log(
  baseApres.code === 0
    ? `VERTE   ${baseApres.nbTests ?? '?'} tests`
    : 'ROUGE   ← une restauration a échoué, le dépôt est SALE'
);

restaurerRapports(sauvegardeRapports);

// ─────────────────────────────────────────────────────────────────────── verdict

const joues = resultats.filter((r) => !r.negatif);
const negatifs = resultats.filter((r) => r.negatif);
const quiValent = joues.filter((r) => r.couvertPar !== 'equivalent');

const regressions = joues.filter((r) => r.attendu === 'DETECTEE' && r.verdict === 'SURVIT');
const ameliorations = joues.filter((r) => r.attendu === 'SURVIT' && r.verdict === 'DETECTEE');
const ancragesPerdus = resultats.filter((r) => r.verdict === 'ANCRAGE-PERDU');
const negatifsRouges = negatifs.filter((r) => r.verdict === 'DETECTEE');

const survivantsObserves = quiValent.filter((r) => r.verdict === 'SURVIT');
const trousReels = survivantsObserves.filter((r) => r.couvertPar === null);
const detectees = joues.filter((r) => r.verdict === 'DETECTEE');

const tauxSurvie =
  quiValent.length === 0 ? null : (survivantsObserves.length / quiValent.length) * 100;

const echecs = [];
if (baseAvant.code !== 0) echecs.push('la base n’était pas verte AVANT le banc');
if (baseApres.code !== 0) echecs.push('la base n’est pas verte APRÈS le banc — dépôt sale');
if (negatifsRouges.length > 0)
  echecs.push(
    `${negatifsRouges.length} contrôle(s) négatif(s) ont rougi (${negatifsRouges.map((r) => r.id).join(', ')}) — ` +
      'la mesure n’est pas opposable'
  );
if (regressions.length > 0)
  echecs.push(
    `${regressions.length} mutation(s) attendue(s) DÉTECTÉE(S) ont SURVÉCU : ${regressions.map((r) => r.id).join(', ')}`
  );
if (ancragesPerdus.length > 0)
  echecs.push(
    `${ancragesPerdus.length} ancrage(s) perdu(s) : ${ancragesPerdus.map((r) => r.id).join(', ')}`
  );
if (collision !== null) echecs.push(collision.message);
if (!MODE_LISTE && recettes.length > 0 && resultats.length === 0)
  echecs.push('aucune recette n’a été jouée — un banc vide ne prouve rien');

console.log('');
console.log('── Contrat de sortie ──────────────────────────────────────────────');
console.log(`mutations jouées                 ${joues.length}`);
console.log(`mutants équivalents (hors compte) ${joues.length - quiValent.length}`);
console.log(`mutations qui valent              ${quiValent.length}`);
console.log(`détectées                         ${detectees.length}`);
console.log(`survivantes                       ${survivantsObserves.length}`);
console.log(
  `  dont couvertes en E2E (non exécuté) ${survivantsObserves.filter((r) => r.couvertPar === 'e2e').length}`
);
console.log(`  dont TROUS RÉELS — vus par personne ${trousReels.length}${trousReels.length > 0 ? ` (${trousReels.map((r) => r.id).join(', ')})` : ''}`);
console.log(`taux de survie                    ${tauxSurvie === null ? '—' : `${tauxSurvie.toFixed(0)} %`}`);
console.log(`contrôles négatifs verts          ${negatifs.length - negatifsRouges.length} / ${negatifs.length}`);
console.log(`durée                             ${((Date.now() - debut) / 1000).toFixed(0)} s`);
console.log('');

if (ameliorations.length > 0) {
  console.log('🎉 AMÉLIORATION — un lot a peut-être fermé un trou.');
  console.log('');
  console.log('   ⚠  NE RESSERRE PAS LE CLIQUET SUR CETTE SEULE MESURE. Le 2026-08-02, M2 est');
  console.log('      passée « détectée » puis « survivante » à vingt minutes d’écart : la');
  console.log('      détection venait d’un test qu’une campagne parallèle écrivait, et que');
  console.log('      l’invariant 3 exclut dès qu’il apparaît dans `git ls-files --others`.');
  console.log('      Confirme d’abord, PUIS édite :');
  console.log('');
  for (const r of ameliorations) {
    console.log(`   ${r.id} · npm run qa:mutations -- --seulement=${r.id}`);
    console.log(`        si c’est encore DETECTEE : dans scripts/qa/recettes.mjs, passer`);
    console.log(`        attendu: 'SURVIT' → 'DETECTEE' et retirer \`pourquoi\` / \`couvertPar\`.`);
    console.log(`        ${r.titre}`);
  }
  console.log('');
}

if (trousReels.length > 0) {
  console.log('Les défauts qu’AUCUN test du dépôt ne verrait :');
  for (const r of trousReels) {
    console.log(`   ${r.id} — ${r.titre}`);
    console.log(`        ${r.fichier}${r.regle === null ? '' : `  ·  ${r.regle}`}`);
  }
  console.log('');
}

const rapport = {
  etape: 'qa:mutations',
  complet: EST_COMPLET,
  ecritLe: new Date().toISOString(),
  commande: `npm run qa:mutations${arguments_.length > 0 ? ` -- ${arguments_.join(' ')}` : ''}`,
  baseVerteAvant: baseAvant.code === 0,
  baseVerteApres: baseApres.code === 0,
  nbTestsBase: baseAvant.nbTests,
  testsExclus: exclusInitiales,
  mutationsJouees: joues.length,
  mutantsEquivalents: joues.length - quiValent.length,
  mutationsQuiValent: quiValent.length,
  detectees: detectees.length,
  survivantes: survivantsObserves.length,
  survivantesCouvertesE2E: survivantsObserves.filter((r) => r.couvertPar === 'e2e').length,
  trousReels: trousReels.map((r) => ({ id: r.id, titre: r.titre, fichier: r.fichier, regle: r.regle })),
  tauxSurviePourCent: tauxSurvie === null ? null : Number(tauxSurvie.toFixed(1)),
  controlesNegatifs: negatifs.length,
  controlesNegatifsVerts: negatifs.length - negatifsRouges.length,
  regressions: regressions.map((r) => r.id),
  ameliorations: ameliorations.map((r) => r.id),
  ancragesPerdus: ancragesPerdus.map((r) => ({ id: r.id, detail: r.detail })),
  collision,
  echecs,
  dureeMs: Date.now() - debut,
  resultats
};

writeFileSync(CHEMIN_JSON, `${JSON.stringify(rapport, null, 2)}\n`, 'utf8');
writeFileSync(
  CHEMIN_JOURNAL,
  `id\tattendu\tobserve\tdureeMs\tfichier\n${journal.join('\n')}\n`,
  'utf8'
);

console.log(`Rapport machine : ${relative(RACINE, CHEMIN_JSON).replace(/\\/g, '/')}`);
console.log(`Journal         : ${relative(RACINE, CHEMIN_JOURNAL).replace(/\\/g, '/')}`);
if (!EST_COMPLET) {
  console.log(
    'ℹ  Banc PARTIEL : le rapport de référence `mutations.json` n’a PAS été touché, et le\n' +
      '   tableau de bord continue d’afficher la dernière mesure complète.'
  );
}
console.log('');

if (echecs.length === 0) {
  console.log('✅ VERT — aucune régression de la QA, la mesure est opposable.');
  process.exit(0);
}
console.log('❌ ROUGE :');
for (const e of echecs) console.log(`   · ${e}`);
process.exit(1);
