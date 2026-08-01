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

/** Motifs qui trahissent un environnement incomplet, pas un défaut de code. */
const MOTIFS_ENVIRONNEMENT = [
  /Executable doesn'?t exist/i,
  /npx playwright install/i,
  /Cannot find module/i,
  /ERR_MODULE_NOT_FOUND/,
  /Missing script/i,
  /is not recognized as an internal or external command/i,
  /command not found/i
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
            message: (cas.failureMessages ?? []).join(' | ').split('\n')[0] ?? 'échec'
          });
        }
      }
    }
    return {
      total: brut.numTotalTests ?? details.length,
      echecs: brut.numFailedTests ?? details.length,
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

function resumeCouverture() {
  const chemin = join(DOSSIER_RAPPORTS, 'couverture', 'coverage-summary.json');
  if (!existsSync(chemin)) return null;
  try {
    const brut = JSON.parse(readFileSync(chemin, 'utf8'));
    const total = brut.total ?? {};
    const part = (cle) => (total[cle]?.pct === undefined ? '—' : `${total[cle].pct} %`);
    return `couverture globale : lignes ${part('lines')}, branches ${part('branches')}, fonctions ${part('functions')}`;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────── exécution

const debutGlobal = Date.now();
console.log('npm run verifier — chaîne complète, aucune étape n’interrompt les suivantes.\n');

for (const etape of CHAINE) {
  const debut = Date.now();
  process.stdout.write(`→ ${etape.cle} … `);

  const variables = {};
  if (etape.natif === 'playwright' && etape.brut) {
    variables['PLAYWRIGHT_JSON_OUTPUT_NAME'] = etape.brut;
  }

  const resultat = lancerNpm(etape.script, etape.argumentsSupplementaires ?? [], variables);
  const dureeMs = Date.now() - debut;
  const sortie = `${resultat.stdout ?? ''}\n${resultat.stderr ?? ''}`;

  const journal = join(DOSSIER_JOURNAUX, `${etape.cle.replace(/[^a-z0-9._-]+/gi, '-')}.log`);
  writeFileSync(journal, sortie, 'utf8');

  const codeSortie = resultat.status ?? 1;
  const environnement = MOTIFS_ENVIRONNEMENT.some((motif) => motif.test(sortie));

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
    if (details.length === 0 && codeSortie !== 0) {
      // Pas de rapport machine exploitable : on garde les dernières lignes utiles du journal.
      const lignes = sortie
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0)
        .slice(-25);
      for (const ligne of lignes) details.push({ ou: etape.cle, message: ligne });
    }

    const notes = [];
    if (environnement) {
      notes.push(
        'prérequis d’installation manquant — défaut d’environnement, pas défaut de code ' +
          '(contrat § 8.2). Voir `npm install` et `npx playwright install chromium`.'
      );
    }
    if (etape.cle === 'test') {
      const couverture = resumeCouverture();
      if (couverture) notes.push(`${couverture}. Seuils PAR ZONE : annexe T § 7.`);
      else notes.push('aucun résumé de couverture produit — seuils par zone non mesurés.');
    }
    notes.push(`code de sortie ${codeSortie} · journal : ${`tests/rapports/artefacts/journaux/${etape.cle.replace(/[^a-z0-9._-]+/gi, '-')}.log`}`);

    ecrireEtape({
      etape: etape.cle,
      statut: environnement ? 'environnement' : codeSortie === 0 ? 'reussite' : 'echec',
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

  // Une étape fille non écrite (le script n'a pas été atteint) reste sur son « non exécutée ».
  for (const fille of etape.etapesFilles ?? []) {
    const cheminFille = join(DOSSIER_RAPPORTS, nomDeFichier(fille));
    if (!existsSync(cheminFille)) {
      ecrireEtape({
        etape: fille,
        statut: 'echec',
        dureeMs: 0,
        total: 0,
        echecs: 1,
        details: [],
        note: `non exécutée : \`${etape.cle}\` s’est arrêtée avant.`
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
          : '❌';
  console.log(`${symbole}  ${(dureeMs / 1000).toFixed(1)} s`);
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
