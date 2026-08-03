/**
 * `npm run verifier` — la chaîne complète, UN SEUL code de sortie. Lot L-G.
 *
 * Contrat gelé § 8.2 :
 *
 *   lint → typescript → test → test:contenu
 *        → construire:test → test:e2e → test:visuel
 *        → construire      → test:qualite
 *        → test:rejeu      → rapport
 *
 * Trois règles qui gouvernent tout ce fichier :
 *
 * 1. **Aucune étape n'interrompt la chaîne.** Tout s'exécute, puis on agrège. « Un agent doit
 *    voir tous ses défauts d'un coup, pas le premier. »
 * 2. **Rien n'est supprimé.** Avant de commencer, chaque étape reçoit un rapport
 *    « non exécutée » ; il est écrasé quand elle tourne. Un `verifier` interrompu laisse donc
 *    un rapport qui dit la vérité, sans qu'aucun fichier n'ait jamais été effacé.
 * 3. **Un défaut d'environnement se nomme comme tel.** Chromium absent n'est pas un défaut de
 *    code ; le rapport le distingue, et la chaîne sort quand même en 1 — un environnement
 *    incomplet ne vérifie rien.
 *
 * Ce script ne fait ni `npm install` ni `npx playwright install` : l'installation est réservée
 * à l'orchestrateur (contrat § 8.2, prérequis).
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  decrireManquement,
  decrireZoneVide,
  evaluerZones,
  lireResumeCouverture
} from './couverture-zones.mjs';
import { erreursNonCapturees, sansAnsi } from './sortie-outils.mjs';
import {
  DOSSIER_RAPPORTS,
  RACINE,
  ecrireEtape,
  genererRapport,
  nomDeFichier,
  preparerDossiers
} from './rapport.mjs';

const DOSSIER_JOURNAUX = join(DOSSIER_RAPPORTS, 'artefacts', 'journaux');

/**
 * La chaîne, dans l'ordre du contrat § 8.2.
 *
 * `propreRapport` : l'étape écrit elle-même son `tests/rapports/<etape>.json` (ce sont les
 * scripts de L-G). `verifier.mjs` ne l'écrase alors que si le script n'a rien écrit — un
 * plantage avant l'écriture, par exemple.
 */
const CHAINE = [
  { cle: 'lint', script: 'lint' },
  { cle: 'typescript', script: 'typescript' },
  {
    cle: 'test',
    script: 'test',
    natif: 'vitest',
    brut: 'tests/rapports/brut/test.vitest.json',
    // `--coverage` active les seuils PAR ZONE de l'annexe T § 7, déclarés dans
    // `vitest.config.ts`. Sans ce drapeau, ils seraient configurés mais jamais mesurés.
    argumentsSupplementaires: [
      '--coverage',
      '--reporter=default',
      '--reporter=json',
      '--outputFile.json=tests/rapports/brut/test.vitest.json'
    ]
  },
  { cle: 'test:contenu', script: 'test:contenu', propreRapport: true },
  { cle: 'construire:test', script: 'construire:test' },
  {
    cle: 'test:e2e',
    script: 'test:e2e',
    natif: 'playwright',
    brut: 'tests/rapports/brut/test-e2e.playwright.json'
  },
  { cle: 'test:visuel', script: 'test:visuel', propreRapport: true },
  { cle: 'construire', script: 'construire' },
  {
    cle: 'test:qualite',
    script: 'test:qualite',
    natif: 'playwright',
    brut: 'tests/rapports/brut/test-qualite.playwright.json',
    // `test:qualite` enchaîne Playwright PUIS `verifier-bundle.mjs`, qui écrit l'étape
    // `bundle` de son côté.
    etapesFilles: ['bundle']
  },
  { cle: 'test:rejeu', script: 'test:rejeu', propreRapport: true }
];

/**
 * Motifs qui trahissent un environnement incomplet, pas un défaut de code.
 *
 * Le spécificateur de module y est NU (`'fastify'`), jamais relatif : c'est ce qui distingue
 * « un paquet n'est pas installé » de « un fichier du dépôt n'existe pas ».
 */
const MOTIFS_ENVIRONNEMENT = [
  /Executable doesn'?t exist/i,
  /npx playwright install/i,
  /Cannot find module '(?!\.{1,2}[/\\])[^']+'/,
  /Cannot find package '[^']+'/,
  /Missing script/i,
  /is not recognized as an internal or external command/i,
  /command not found/i
];

/**
 * Motifs qui ANNULENT le verdict « environnement » : ils désignent un fichier SOURCE absent,
 * donc un défaut de code, quel que soit ce qu'on a lu par ailleurs dans la même sortie.
 *
 * Sans cette liste, un import relatif vers un fichier qui n'existe pas — le cas d'un lot en
 * cours d'écriture — faisait passer cinq étapes sur onze en « défaut d'environnement, pas
 * défaut de code », c'est-à-dire exactement le contraire de la vérité. Le rapport aurait
 * envoyé son lecteur relancer `npm install` pour rien.
 */
const MOTIFS_DEFAUT_DE_CODE = [
  // Spécificateur relatif (`'./routes/x.js'`) — tel que TypeScript et Vite le rapportent.
  /Cannot find module '\.{1,2}[/\\]/,
  /Failed to load url \.{1,2}[/\\]/,
  // Spécificateur ABSOLU (`'C:\…\dist\routes\x.js'`, `'/opt/…'`) : Node résout l'import
  // relatif avant de se plaindre, et le chemin qu'il cite n'a plus rien d'un nom de paquet.
  /Cannot find module '(?:[A-Za-z]:[/\\]|\/)/,
  /Cannot find module '@[^']*' or its corresponding type declarations/
];

/**
 * Marque d'un rapport d'étape posé avant exécution. Une seule constante : comparée en deux
 * endroits, une chaîne recopiée finirait par diverger et la détection deviendrait muette.
 */
const NOTE_NON_EXECUTEE = 'étape non exécutée — `npm run verifier` ne s’est pas rendu jusque-là.';

preparerDossiers();
mkdirSync(DOSSIER_JOURNAUX, { recursive: true });

if (!existsSync(join(RACINE, 'node_modules'))) {
  ecrireEtape({
    etape: 'lint',
    statut: 'environnement',
    note:
      '`node_modules/` est absent : rien ne peut être vérifié. Lancer `npm install` à la racine, ' +
      'puis `npx playwright install chromium` (contrat § 8.2). L’installation est réservée à ' +
      'l’orchestrateur.'
  });
  genererRapport({ commande: 'npm run verifier' });
  console.error('verifier : `node_modules/` absent. Voir tests/rapports/RAPPORT.md');
  process.exit(1);
}

// ── règle 2 : aucun fichier n'est supprimé, chaque étape part d'un rapport « non exécutée »
for (const etape of [...CHAINE.map((e) => e.cle), 'bundle']) {
  ecrireEtape({
    etape,
    statut: 'echec',
    total: 0,
    echecs: 1,
    details: [],
    note: NOTE_NON_EXECUTEE
  });
}

// ───────────────────────────────────────────────────────────── lancement d'une commande npm

/** Lance `npm run <script>` sans passer par un shell quand c'est possible. */
function lancerNpm(script, argumentsSupplementaires = [], variables = {}) {
  const suffixe = argumentsSupplementaires.length > 0 ? ['--', ...argumentsSupplementaires] : [];
  const environnement = { ...process.env, ...variables, FORCE_COLOR: '0' };
  const npmExec = process.env['npm_execpath'];

  if (npmExec && npmExec.endsWith('.js')) {
    return spawnSync(process.execPath, [npmExec, 'run', script, ...suffixe], {
      cwd: RACINE,
      encoding: 'utf8',
      env: environnement,
      maxBuffer: 64 * 1024 * 1024
    });
  }
  return spawnSync('npm', ['run', script, ...suffixe], {
    cwd: RACINE,
    encoding: 'utf8',
    env: environnement,
    shell: true,
    maxBuffer: 64 * 1024 * 1024
  });
}

// ───────────────────────────────────────────────────── dépouillement des rapports natifs


function depouillerVitest(chemin) {
  if (!existsSync(chemin)) return null;
  try {
    const brut = JSON.parse(readFileSync(chemin, 'utf8'));
    const details = [];
    for (const fichier of brut.testResults ?? []) {
      for (const cas of fichier.assertionResults ?? []) {
        if (cas.status === 'failed') {
          details.push({
            ou: `${fichier.name ?? ''} › ${[...(cas.ancestorTitles ?? []), cas.title].join(' › ')}`,
            message: sansAnsi((cas.failureMessages ?? []).join(' | ').split('\n')[0] ?? 'échec')
          });
        }
      }
    }
    return {
      total: brut.numTotalTests ?? details.length,
      echecs: brut.numFailedTests ?? details.length,
      // `success` est distinct de `numFailedTests` : Vitest le met à `false` quand la campagne
      // a mal fini SANS qu'aucun test n'ait échoué — une erreur non capturée, un worker qui ne
      // répond plus. C'est exactement le cas qui affichait « échec, 0 échec ».
      succes: brut.success === true,
      details
    };
  } catch {
    return null;
  }
}


function depouillerPlaywright(chemin) {
  if (!existsSync(chemin)) return null;
  try {
    const brut = JSON.parse(readFileSync(chemin, 'utf8'));
    const details = [];
    let total = 0;
    const parcourir = (suites = []) => {
      for (const suite of suites) {
        for (const cas of suite.specs ?? []) {
          total += 1;
          if (!cas.ok) {
            const message =
              cas.tests?.[0]?.results?.[0]?.error?.message ?? 'scénario en échec';
            details.push({
              ou: `${cas.file ?? suite.file ?? ''} › ${cas.title}`,
              message: String(message).split('\n')[0]
            });
          }
        }
        parcourir(suite.suites);
      }
    };
    parcourir(brut.suites);
    return { total, echecs: details.length, details };
  } catch {
    return null;
  }
}

/**
 * Évalue les seuils PAR ZONE de l'annexe T § 7.
 *
 * ── Ce que cette fonction remplace, et pourquoi ──────────────────────────────────────────
 *
 * L'ancienne version rendait une phrase — « couverture globale : lignes 94,22 %, branches
 * 85,78 % » — que l'étape `test` accolait à `Seuils PAR ZONE : annexe T § 7` **quel que soit
 * le motif de son échec**. Le rapport disait donc « couverture » chaque fois que `test`
 * rougissait, y compris quand la couverture n'y était pour rien. C'est ce qui envoyait
 * chercher au mauvais endroit : la note ressemblait à un diagnostic sans en être un.
 *
 * Mesuré sur le journal de l'échec qui a motivé ce lot :
 * `grep -c -i "threshold" tests/rapports/artefacts/journaux/test.log` → **0**. Aucun seuil
 * n'était en cause ; l'étape était tombée sur une erreur non capturée.
 *
 * La nouvelle version ne raconte rien : elle CALCULE des verdicts par zone, et le rapport ne
 * parle de couverture que lorsqu'une zone est réellement fautive.
 */
function evaluerCouverture() {
  const chemin = join(DOSSIER_RAPPORTS, 'couverture', 'coverage-summary.json');
  const resume = lireResumeCouverture(chemin);
  const verdict = evaluerZones(resume, RACINE);
  const total = resume?.total ?? {};
  const part = (cle) => (total[cle]?.pct === undefined ? '—' : `${String(total[cle].pct).replace('.', ',')} %`);
  return {
    ...verdict,
    // Gardé pour mémoire, mais présenté pour ce qu'il est : un chiffre d'ambiance. « Une
    // couverture globale à 80 % ne dit rien d'utile » (annexe T § 7).
    global: `couverture globale, pour information : lignes ${part('lines')}, branches ${part('branches')}, fonctions ${part('functions')}`
  };
}

// ─────────────────────────────────────────────────────────────────────── exécution

const debutGlobal = Date.now();
console.log('npm run verifier — chaîne complète, aucune étape n’interrompt les suivantes.\n');

for (const etape of CHAINE) {
  const debut = Date.now();
  process.stdout.write(`→ ${etape.cle} … `);

  const variables = {};
  if (etape.natif === 'playwright' && etape.brut) {
    // `PIERRE_RAPPORT_JSON` et non `PLAYWRIGHT_JSON_OUTPUT_NAME` : cette dernière n'existe
    // plus dans Playwright 1.62 (vérifié par recherche dans `node_modules/`), et les trois
    // campagnes Playwright écrivaient toutes dans le même fichier. `playwright.config.ts`
    // lit la nôtre.
    variables['PIERRE_RAPPORT_JSON'] = etape.brut;
  }

  const resultat = lancerNpm(etape.script, etape.argumentsSupplementaires ?? [], variables);
  const dureeMs = Date.now() - debut;
  const sortie = `${resultat.stdout ?? ''}\n${resultat.stderr ?? ''}`;

  const journal = join(DOSSIER_JOURNAUX, `${etape.cle.replace(/[^a-z0-9._-]+/gi, '-')}.log`);
  writeFileSync(journal, sortie, 'utf8');

  const codeSortie = resultat.status ?? 1;
  const environnement =
    MOTIFS_ENVIRONNEMENT.some((motif) => motif.test(sortie)) &&
    !MOTIFS_DEFAUT_DE_CODE.some((motif) => motif.test(sortie));

  // Les scripts de L-G écrivent leur propre rapport ; on ne l'écrase que s'il manque.
  const cheminEtape = join(DOSSIER_RAPPORTS, nomDeFichier(etape.cle));
  let dejaEcritParLeScript = false;
  if (etape.propreRapport && existsSync(cheminEtape)) {
    try {
      const existant = JSON.parse(readFileSync(cheminEtape, 'utf8'));
      dejaEcritParLeScript = existant.note !== NOTE_NON_EXECUTEE;
    } catch {
      dejaEcritParLeScript = false;
    }
  }

  if (!dejaEcritParLeScript) {
    const natif =
      etape.natif === 'vitest'
        ? depouillerVitest(join(RACINE, etape.brut))
        : etape.natif === 'playwright'
          ? depouillerPlaywright(join(RACINE, etape.brut))
          : null;

    const details = natif?.details ?? [];

    // ── couverture par zone : mesurée pour la seule étape `test`, et seulement là
    const couverture = etape.cle === 'test' ? evaluerCouverture() : null;
    // Une ABSENCE de mesure compte comme une faute, au même titre qu'un seuil manqué.
    // `test` est lancée avec `--coverage` : si aucun résumé n'en sort, les seuils de
    // l'annexe T § 7 n'ont rien vérifié — et un vert obtenu sans mesure est précisément le
    // genre de silence que ce lot existe pour supprimer.
    const couvertureNonMesuree = couverture !== null && !couverture.mesuree;
    const fauteDeCouverture =
      (couverture?.manquements.length ?? 0) + (couverture?.zonesVides.length ?? 0) > 0 ||
      couvertureNonMesuree;

    // ── erreurs non capturées : le cas « l'étape échoue, aucun test n'échoue »
    const horsTest =
      etape.natif === 'vitest' && codeSortie !== 0 ? erreursNonCapturees(sortie) : null;

    if (details.length === 0 && codeSortie !== 0 && !fauteDeCouverture) {
      // Pas de rapport machine exploitable : on garde les dernières lignes utiles du journal.
      // `sansAnsi` — sans quoi le tableau de `RAPPORT.md` se remplit de codes de couleur.
      const lignes = sansAnsi(sortie)
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0)
        .slice(-25);
      for (const ligne of lignes) details.push({ ou: etape.cle, message: ligne });
    }

    // ── le statut, et surtout la CAUSE en une ligne
    //
    // L'ordre de ces branches est l'ordre de ce qu'on veut lire en premier. Un test en échec
    // prime sur un seuil : il désigne un comportement cassé, le seuil désigne un comportement
    // non vérifié. Ce ne sont pas les mêmes urgences, et ce ne sont pas les mêmes remèdes.
    let statut;
    let cause = null;
    if (environnement) {
      statut = 'environnement';
      cause = 'prérequis d’installation manquant — défaut d’environnement, pas défaut de code.';
    } else if ((natif?.echecs ?? 0) > 0) {
      statut = 'echec';
      cause = `${natif.echecs} test(s) en échec sur ${natif.total} — voir le détail plus bas.`;
    } else if (couvertureNonMesuree) {
      statut = 'couverture';
      cause =
        'aucun test en échec, mais **aucune couverture n’a été produite** : les seuils par ' +
        'zone de l’annexe T § 7 n’ont donc rien vérifié. Une absence de mesure n’est pas une ' +
        'réussite. Vérifier que l’étape tourne bien avec `--coverage`.';
    } else if (fauteDeCouverture) {
      statut = 'couverture';
      const premiers = [
        ...couverture.manquements.map((m) => decrireManquement(m)),
        ...couverture.zonesVides.map((z) => decrireZoneVide(z))
      ];
      cause =
        `aucun test en échec — **seuil de couverture non atteint** dans ` +
        `${premiers.length} cas : ${premiers[0]}` +
        (premiers.length > 1 ? ` (et ${premiers.length - 1} autre(s), voir plus bas)` : '');
    } else if (codeSortie !== 0) {
      statut = 'echec';
      // Le cas qui affichait « échec, 0 échec » sans jamais dire pourquoi.
      const nommees = horsTest?.erreurs ?? [];
      cause =
        `aucun test en échec et aucun seuil de couverture manqué, mais l’étape est sortie en ` +
        `${codeSortie}` +
        (nommees.length > 0
          ? ` — ${horsTest.annonce || nommees.length} erreur(s) NON CAPTURÉE(S), hors de tout ` +
            `test : ${nommees.slice(0, 3).join(' · ')}. Une erreur non capturée peut rendre ` +
            'vert un test qui aurait dû rougir : elle se corrige, elle ne s’ignore pas.'
          : ' — motif non identifié dans la sortie ; voir le journal de l’étape.');
    } else {
      statut = 'reussite';
    }

    const notes = [];
    if (environnement) {
      notes.push(
        'prérequis d’installation manquant — défaut d’environnement, pas défaut de code ' +
          '(contrat § 8.2). Voir `npm install` et `npx playwright install chromium`.'
      );
    }
    if (couverture) {
      notes.push(
        couverture.mesuree
          ? `${couverture.global}. Les seuils qui font foi sont PAR ZONE (annexe T § 7) : ` +
            `${couverture.zones.length} zone(s) évaluée(s), ${couverture.manquements.length} ` +
            `manquement(s), ${couverture.zonesVides.length} zone(s) sans aucun fichier.`
          : 'aucun résumé de couverture produit — les seuils par zone n’ont donc rien mesuré. ' +
            'Ce n’est pas une réussite : c’est une absence de mesure.'
      );
    }
    notes.push(`code de sortie ${codeSortie} · journal : ${`tests/rapports/artefacts/journaux/${etape.cle.replace(/[^a-z0-9._-]+/gi, '-')}.log`}`);

    ecrireEtape({
      etape: etape.cle,
      statut,
      cause,
      couverture,
      dureeMs,
      total: natif?.total ?? (codeSortie === 0 ? 1 : 0),
      echecs: natif?.echecs ?? (codeSortie === 0 ? 0 : 1),
      details,
      note: notes.join(' '),
      artefacts: ['tests/rapports/artefacts/']
    });
  } else {
    // Le script a écrit son rapport ; on y ajoute seulement le chemin de son journal.
    try {
      const existant = JSON.parse(readFileSync(cheminEtape, 'utf8'));
      existant.dureeMs = dureeMs;
      existant.artefacts = [
        ...(existant.artefacts ?? []),
        `tests/rapports/artefacts/journaux/${etape.cle.replace(/[^a-z0-9._-]+/gi, '-')}.log`
      ];
      writeFileSync(cheminEtape, `${JSON.stringify(existant, null, 2)}\n`, 'utf8');
    } catch {
      /* le rapport du script fait foi ; on ne le corrompt pas si on n'a pas su le relire */
    }
  }

  // Une étape fille que son script n'a pas atteinte porte encore le rapport « non exécutée »
  // posé avant la chaîne. Tester `existsSync` ne suffisait pas — le fichier existe TOUJOURS,
  // puisque la règle 2 l'a écrit — et la fille gardait alors une note générique qui ne disait
  // pas POURQUOI elle n'avait pas tourné. On teste la marque, pas la présence.
  for (const fille of etape.etapesFilles ?? []) {
    const cheminFille = join(DOSSIER_RAPPORTS, nomDeFichier(fille));
    let jamaisAtteinte = true;
    if (existsSync(cheminFille)) {
      try {
        jamaisAtteinte = JSON.parse(readFileSync(cheminFille, 'utf8')).note === NOTE_NON_EXECUTEE;
      } catch {
        jamaisAtteinte = true;
      }
    }
    if (jamaisAtteinte) {
      ecrireEtape({
        etape: fille,
        statut: 'echec',
        dureeMs: 0,
        total: 0,
        echecs: 1,
        details: [],
        note:
          `non exécutée : \`${etape.cle}\` s’est arrêtée avant de l’atteindre (les deux sont ` +
          'enchaînées par `&&`). Son verdict est donc inconnu, pas mauvais — corriger ' +
          `\`${etape.cle}\` et relancer.`
      });
    }
  }

  const relu = existsSync(cheminEtape) ? JSON.parse(readFileSync(cheminEtape, 'utf8')) : null;
  const symbole =
    relu?.statut === 'reussite'
      ? '✅'
      : relu?.statut === 'vide'
        ? '➖'
        : relu?.statut === 'environnement'
          ? '🔌'
          : relu?.statut === 'couverture'
            ? '📉'
            : '❌';
  console.log(`${symbole}  ${(dureeMs / 1000).toFixed(1)} s`);
  // La cause s'affiche AUSSI au terminal : l'agent qui lance la chaîne la voit passer sans
  // avoir à ouvrir le rapport, et sait déjà s'il doit corriger du code ou écrire un test.
  if (relu?.cause) console.log(`    ${relu.cause.replace(/\*\*/g, '')}`);
}

// ─────────────────────────────────────────────────────────────────────────── rapport

appendFileSync(
  join(DOSSIER_JOURNAUX, 'verifier.log'),
  `chaîne exécutée en ${((Date.now() - debutGlobal) / 1000).toFixed(1)} s\n`,
  'utf8'
);

const bilan = genererRapport({ commande: 'npm run verifier' });

console.log('');
console.log(
  bilan.bloquantes === 0
    ? `✅ VERT — ${bilan.total} étape(s), aucune en échec.`
    : `❌ ROUGE — ${bilan.bloquantes} étape(s) en échec sur ${bilan.total}.`
);
console.log(`Rapport lisible : ${'tests/rapports/RAPPORT.md'}`);
console.log(`Durée totale : ${((Date.now() - debutGlobal) / 1000).toFixed(1)} s`);

process.exit(bilan.bloquantes > 0 ? 1 : 0);
