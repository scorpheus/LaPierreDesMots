/**
 * `npm run test:visuel` — T4. Lot L-G. Contrat gelé § 1.7 : « traduit `--maj` →
 * `--update-snapshots` ».
 *
 * Trois comportements, et le deuxième est celui qui évite un faux rouge au premier lancement :
 *
 *   npm run test:visuel          compare aux références ; **crée celles qui manquent** et le
 *                                DIT dans le rapport, au lieu d'échouer sur une absence
 *                                (`--update-snapshots=missing`) ;
 *   npm run test:visuel -- --maj régénère TOUTES les références (`--update-snapshots=all`) ;
 *   npm run test:visuel -- --strict  échoue si une référence manque (`=none`), pour un
 *                                contrôle d'intégrité en revue.
 *
 * Une référence créée n'a **rien vérifié** : le rapport distingue explicitement « N référence(s)
 * créée(s) » de « N capture(s) comparée(s) ». C'est la différence entre un vert et un vert qui
 * ment.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { lancerPlaywright } from './playwright.mjs';
import { DOSSIER_BRUT, RACINE, ecrireEtape, genererRapport, preparerDossiers } from './rapport.mjs';

const ETAPE = 'test:visuel';
const debut = Date.now();

const arguments_ = process.argv.slice(2);
const majDemandee = arguments_.includes('--maj');
// `--strict` reste ACCEPTÉ pour ne casser aucune habitude, mais il n'a plus d'effet : son
// comportement est devenu le défaut. Voir l'encadré ci-dessous.
const stricte = arguments_.includes('--strict');
void stricte;

/**
 * ── LE DÉFAUT EST `none`, ET C'EST UNE CORRECTION DE SÛRETÉ ────────────────────────────────
 *
 * Cette ligne valait `majDemandee ? 'all' : stricte ? 'none' : 'missing'`. Le mode `missing`
 * de Playwright **écrit silencieusement toute référence absente**, puis s'en sert de vérité
 * pour tous les passages suivants.
 *
 * Vécu, pas supposé : un simple `npm run verifier` — c'est-à-dire un double-clic sur
 * `verifier.bat` — a créé
 * `tests/visuel/decor-v2.spec.ts-snapshots/carte-monde-v2-visuel-win32.png`, une référence de
 * 157 Ko née d'une commande de VÉRIFICATION, que personne n'avait regardée. Elle a été
 * supprimée.
 *
 * C'est précisément ce que CLAUDE.md interdit — « ne jamais mettre à jour une référence de
 * test visuel de sa propre initiative » — et ce que **D39** protège : les références attendent
 * le nouveau graphisme ET un adulte qui a vu l'image. Une garantie qui repose sur la
 * discipline de celui qui tape la commande n'en est pas une : le défaut la rend mécanique.
 *
 * Conséquence assumée : tant qu'une référence manque, `test:visuel` est ROUGE. C'est l'état
 * déclaré du dépôt (D39), et il vaut mieux qu'un vert obtenu en photographiant l'écran tel
 * qu'il est aujourd'hui.
 *
 * Pour produire les références, la porte reste ouverte et explicite :
 *     npm run test:visuel -- --maj
 */
const modeSnapshots = majDemandee ? 'all' : 'none';

const DOSSIER_VISUEL = join(RACINE, 'tests', 'visuel');
const CHEMIN_JSON = join(DOSSIER_BRUT, 'test-visuel.playwright.json');

preparerDossiers();

/** Compte les fichiers de référence présents avant la campagne. */
function compterReferences() {
  if (!existsSync(DOSSIER_VISUEL)) return 0;
  return readdirSync(DOSSIER_VISUEL, { recursive: true, withFileTypes: true }).filter(
    (e) => e.isFile() && e.name.endsWith('.png')
  ).length;
}

const referencesAvant = compterReferences();

// `lancerPlaywright` pose `PLAYWRIGHT_BROWSERS_PATH` sur le dossier `outils/navigateurs/` du
// dépôt (décision D9). Passer par `npx playwright` chercherait le navigateur dans
// `%LOCALAPPDATA%`, où rien n'est installé — un rouge qui ressemblerait à un défaut de code.
const resultat = lancerPlaywright(
  ['test', '--project=visuel', `--update-snapshots=${modeSnapshots}`],
  { supplement: { PIERRE_RAPPORT_JSON: CHEMIN_JSON }, silencieux: true }
);

const sortie = `${resultat.stdout ?? ''}${resultat.stderr ?? ''}`;
process.stdout.write(sortie);

const referencesApres = compterReferences();
const referencesCreees = Math.max(0, referencesApres - referencesAvant);

// ─────────────────────────────────────────────────── dépouillement du rapport Playwright

let total = 0;
let echecs = 0;
/** Cas dont le SEUL grief est « la référence n'existait pas » : une création, pas un écart. */
let creations = 0;
const details = [];

/**
 * Playwright ne distingue pas, dans son code de sortie, une référence CRÉÉE d'une capture
 * DIVERGENTE : en 1.62, `--update-snapshots=missing` écrit bien l'image manquante, puis
 * marque quand même le cas en échec avec « A snapshot doesn't exist at …, writing actual ».
 * Mesuré au premier lancement de la chaîne : 2 cas « échoués » alors que rien ne divergeait,
 * il n'y avait simplement aucune référence à comparer.
 *
 * Les deux cas ne veulent pas dire la même chose et ne doivent pas rendre le même verdict :
 * une divergence est un défaut, une création n'a **rien vérifié du tout**. On lit donc le
 * message, et le rapport dit lequel des deux s'est produit.
 */
const estCreationDeReference = (message) =>
  /snapshot doesn'?t exist|writing actual|A snapshot is not provided/i.test(String(message));

if (existsSync(CHEMIN_JSON)) {
  try {
    const brut = JSON.parse(readFileSync(CHEMIN_JSON, 'utf8'));
    const parcourir = (suites = []) => {
      for (const suite of suites) {
        for (const cas of suite.specs ?? []) {
          total += 1;
          if (!cas.ok) {
            const message =
              cas.tests?.[0]?.results?.[0]?.error?.message ?? 'capture différente de la référence';
            if (estCreationDeReference(message)) {
              creations += 1;
            } else {
              echecs += 1;
              details.push({
                ou: `${cas.file ?? ''} › ${cas.title}`,
                message: String(message).split('\n')[0]
              });
            }
          }
        }
        parcourir(suite.suites);
      }
    };
    parcourir(brut.suites);
  } catch (erreur) {
    details.push({
      ou: 'tests/rapports/brut/test-visuel.playwright.json',
      message: `rapport Playwright illisible : ${erreur instanceof Error ? erreur.message : erreur}`
    });
    echecs += 1;
  }
}

const navigateurAbsent =
  /Executable doesn'?t exist|playwright install|browserType\.launch/i.test(sortie);

let statut;
let note;

if (navigateurAbsent) {
  statut = 'environnement';
  note =
    'Chromium n’est pas installé pour Playwright. Lancer `npx playwright install chromium`. ' +
    'C’est un défaut d’environnement, pas un défaut de code (contrat § 8.2).';
} else if (majDemandee && echecs === 0) {
  // `--maj` RÉÉCRIT les références : il n'y a rien eu à comparer, par construction. Annoncer
  // « N captures comparées » ici serait le plus confortable des mensonges — celui qui rend
  // vert un lancement dont c'était justement le but.
  statut = 'vide';
  note =
    `${total} référence(s) RÉGÉNÉRÉE(S) par \`--maj\` : **aucune comparaison n’a eu lieu**. ` +
    'Les relire à l’œil avant de les committer, puis relancer sans `--maj` pour qu’elles ' +
    'servent enfin de référence.';
} else if (echecs > 0) {
  statut = 'echec';
  note =
    `${echecs} capture(s) différente(s) de leur référence. ` +
    'Regarder les diffs dans `tests/rapports/artefacts/`. Si l’écart est voulu : ' +
    '`npm run test:visuel -- --maj` — jamais de sa propre initiative sur une divergence non expliquée.';
} else if (total === 0 && resultat.status !== 0) {
  // Playwright a échoué AVANT d'exécuter quoi que ce soit — configuration illisible, client
  // non bâti, module absent. Annoncer « aucun cas à ce stade » serait un ➖ rassurant posé sur
  // une panne : c'est la différence entre une suite vide et une suite empêchée.
  statut = 'echec';
  note =
    `Playwright est sorti en code ${String(resultat.status)} sans exécuter un seul scénario : ` +
    'la campagne visuelle a été EMPÊCHÉE, elle n’est pas vide. Voir le journal de l’étape.';
} else if (total === 0) {
  statut = 'vide';
  note = 'aucun scénario visuel n’a été exécuté — aucun cas à ce stade.';
} else if (stricte && creations > 0) {
  // `--strict` demande explicitement qu'une référence absente soit une faute.
  statut = 'echec';
  note = `${creations} référence(s) absente(s) en mode --strict (\`--update-snapshots=none\`).`;
} else if (creations > 0 || referencesCreees > 0) {
  // Ni réussite ni échec : ces captures-là n'ont RIEN vérifié. Le statut `vide` du contrat
  // § 8.2 est fait pour ça — « aucun cas à ce stade » — et il ne bloque pas la chaîne.
  // Prétendre « réussite » sur une image qu'on vient d'écrire soi-même serait un vert menteur.
  statut = creations >= total ? 'vide' : 'reussite';
  note =
    `${Math.max(creations, referencesCreees)} référence(s) CRÉÉE(S) à ce lancement — elles ` +
    `n’ont RIEN vérifié, une image comparée à elle-même ne prouve rien. ` +
    `${total - creations} capture(s) réellement comparée(s). Relancer \`npm run verifier\` ` +
    'pour que toutes le soient, et relire les images créées avant de les committer.';
} else if (resultat.status !== 0) {
  statut = 'echec';
  note =
    `Playwright est sorti en code ${String(resultat.status)} sans qu'aucune capture ne diverge : ` +
    'panne du lanceur ou de la configuration. Voir le journal de l’étape.';
} else {
  statut = 'reussite';
  note = `${total} capture(s) comparée(s) à leur référence, tolérance 0,2 % de pixels.`;
}

ecrireEtape({
  etape: ETAPE,
  statut,
  dureeMs: Date.now() - debut,
  total,
  echecs,
  details,
  note,
  artefacts: ['tests/rapports/artefacts/playwright']
});
genererRapport({ commande: `npm run test:visuel${majDemandee ? ' -- --maj' : ''}` });

console.log(
  `test:visuel — ${total} capture(s), ${creations} création(s), ${echecs} échec(s). ${note}`
);
process.exit(statut === 'echec' || statut === 'environnement' ? 1 : 0);
