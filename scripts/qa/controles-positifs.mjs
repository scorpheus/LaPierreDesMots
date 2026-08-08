/**
 * Q8 — AUCUN GARDE NE PASSE SANS AVOIR PROUVÉ QU'IL SAIT ÉCHOUER.
 *
 * Spécification : `Docs/specs-qa-des-promesses-v1.md` § 4, garde Q8. Ce fichier est le
 * MÉTA-GARDE du lot Q : sans lui, les sept autres ne sont que des affirmations.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE CHIFFRE QUI JUSTIFIE CE FICHIER — il n'est pas rhétorique
 *
 * Sur les seules mesures de la session du 2026-08-07, **quatre instruments sur cinq ont menti
 * au moins une fois** (§ 2.6 de la spec), et R20 en avait déjà relevé trois. Le plus
 * instructif des quatre : un détecteur d'atteignabilité qui comptait **son propre script de
 * mesure** comme un appelant de production, et publiait donc « la cascade est branchée » —
 * l'exact contraire du fait.
 *
 * Un instrument qui ne peut pas prouver qu'il sait rougir n'est pas un instrument, c'est une
 * opinion avec une sortie de commande.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── CE QUE Q8 VÉRIFIE, ET DANS QUEL ORDRE ─────────────────────────────────────────────────
 *
 * 1. **La population des gardes est DÉRIVÉE de la spec**, jamais écrite ici. On lit les
 *    en-têtes `### Q<n> — …` et la ligne `| **vit dans** | …` de `specs-qa-des-promesses-v1.md`.
 *    Conséquence opposable : un garde Q9 ajouté demain à la spec entre dans Q8 **tout seul**,
 *    et Q8 rougit tant qu'il n'est pas écrit. C'est la seule forme qui ne pourrit pas
 *    (CLAUDE.md, « le recensement se marche par les fonctions de nom »).
 *
 * 2. **Le fichier du garde existe.** Sinon : dette nommée, ou rouge.
 *
 * 3. **Le garde DÉCLARE au moins un contrôle positif**, sous la forme d'un cas de test dont le
 *    titre contient `CONTRÔLE POSITIF` — pas d'un commentaire. Les commentaires sont retirés
 *    avant toute recherche textuelle (règle 10 du § 5 : ils citent souvent précisément ce qui
 *    est absent, et c'est l'erreur n° 1 du § 2.6).
 *
 * 4. **Le contrôle positif a été EXÉCUTÉ CE TOUR-CI**, et il est passé. C'est le point qui
 *    sépare Q8 d'un `grep` : on ne lit pas le fichier du garde, on lit le RAPPORT DE COURSE
 *    (`tests/rapports/brut/*.json`), on y cherche le cas par son titre, et on exige :
 *      • qu'il y figure ;
 *      • qu'il soit `passed` ;
 *      • que le rapport soit **plus récent que le fichier du garde** — un rapport antérieur à
 *        la dernière modification du garde ne prouve rien sur le garde d'aujourd'hui.
 *    « Exécuté à chaque tour, pas une fois à l'écriture » (§ 4, Q8) n'a pas d'autre traduction
 *    mécanique.
 *
 * ── POURQUOI UN CONTRÔLE POSITIF QUI PASSE EST UNE BONNE NOUVELLE ─────────────────────────
 *
 * Le critère d'échec de la spec dit « ou son contrôle positif passe au vert ». Il faut le lire
 * dans le bon sens, et c'est important : le contrôle positif est le cas où le garde est mis
 * devant un défaut CONNU. Il est VERT quand le garde a bien vu le défaut, et ROUGE quand
 * l'instrument est devenu aveugle. C'est donc l'aveuglement — le garde qui ne trouve plus son
 * propre défaut de référence — qui fait échouer Q8, et c'est exactement ce qui est arrivé au
 * détecteur D2 sur `objet-campement` (§ 2.2).
 *
 * ── ORDRE D'APPEL ─────────────────────────────────────────────────────────────────────────
 *
 * Q8 se lance **après** les campagnes, jamais avant : il lit leurs rapports. Dans
 * `npm run verifier`, sa place est la dernière étape. Lancé seul sur des rapports périmés, il
 * le DIT (« rapport PÉRIMÉ ») au lieu de faire semblant.
 *
 *     node scripts/qa/controles-positifs.mjs
 *     node scripts/qa/controles-positifs.mjs --rapports bac-a-sable/lot-q/rapports
 *
 * ── CE QUE Q8 NE FAIT PAS ─────────────────────────────────────────────────────────────────
 *
 * Il n'exécute aucun test lui-même. Un méta-garde qui relancerait les gardes mesurerait sa
 * propre exécution, et non celle de la campagne : c'est précisément l'erreur n° 2 du § 2.6,
 * l'instrument qui se compte lui-même. Il lit ce que la campagne a réellement produit.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ch = (relatif) => join(RACINE, relatif);

/** La spec qui fait foi. Q8 ne redéfinit aucun garde ; il les lit. */
const SPEC = 'Docs/specs-qa-des-promesses-v1.md';

/** Le marqueur qu'un cas de test doit porter dans son TITRE pour valoir contrôle positif. */
const MARQUEUR = 'CONTRÔLE POSITIF';

/**
 * LES DETTES NOMMÉES — et une dette n'est pas un pardon.
 *
 * Au premier passage du contrat de couverture de CLAUDE.md, **six exemptions sur huit étaient
 * inutiles** : le corpus produisait déjà les lois qu'on avait cru devoir exempter. Une
 * exemption non nécessaire est un mensonge dans le contrat. Q8 le rend impossible : si la
 * condition d'extinction est remplie — le fichier promis existe — Q8 **échoue** en le disant,
 * au lieu de continuer à pardonner.
 *
 * Chaque entrée porte les trois champs que la spec exige : la raison, et LA SCÈNE QUI
 * L'ÉTEINDRAIT.
 */
/**
 * LES DETTES NOMMÉES — il n'y en a plus AUCUNE, et c'est un résultat.
 *
 * Il y en a eu deux, et les deux se sont éteintes exactement par la scène qu'elles nommaient :
 *
 *   • **Q2** — « la spec le loge en `tests/e2e/` où aucun projet Playwright ne le collecte ».
 *     L'orchestrateur a vérifié `playwright.config.ts` et corrigé le § 4 Q2 de la spec.
 *   • **Q3** — « il attend le lot A1 : la cascade n'atteint jamais le serveur ». A1 a atterri,
 *     `tests/e2e/parcours-recompense-persistee.spec.ts` est écrit, et **c'est Q8 qui a réclamé
 *     le retrait de cette dette** dès que le fichier est apparu :
 *
 *         ✗ Q3 : la dette « … » n'a plus lieu d'être — …spec.ts EXISTE.
 *
 * C'est la propriété qu'on voulait : une exemption est une DETTE, pas un pardon, et elle ne
 * peut pas survivre à sa propre condition d'extinction. Au premier passage du contrat de
 * couverture de CLAUDE.md, six exemptions sur huit étaient inutiles ; ici, zéro reste.
 */
const DETTES = [];


// ══════════════════════════════════════════════════════════════════ outillage de lecture

/**
 * Retire les commentaires — règle 10 du § 5.
 * Ils citent souvent précisément ce qui est absent : c'est ainsi qu'un recensement a compté un
 * glisser sur `tri` en lisant la phrase qui dit qu'il n'y en a pas (§ 2.6, erreur n° 1).
 */
const sansCommentaires = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/**
 * LA POPULATION DES GARDES, DÉRIVÉE DE LA SPEC.
 *
 * On lit les en-têtes `### Q<n> — <titre>` puis, dans le bloc de chacun, la ligne
 * `| **vit dans** | \`<chemin>\` … |`. Le premier chemin entre accents graves fait foi.
 */
function gardesDeclares() {
  const source = readFileSync(ch(SPEC), 'utf8');
  const blocs = source.split(/^### /m).slice(1);
  const gardes = [];
  for (const bloc of blocs) {
    const entete = /^(Q\d+)\s*—\s*(.+)$/m.exec(bloc);
    if (entete === null) continue;
    const vitDans = /\|\s*\*\*vit dans\*\*\s*\|\s*`([^`]+)`/.exec(bloc);
    gardes.push({
      code: entete[1],
      titre: entete[2].trim(),
      fichier: vitDans === null ? null : vitDans[1].trim()
    });
  }
  if (gardes.length === 0) {
    throw new Error(
      `Q8 : aucun garde lu dans ${SPEC}. La population serait vide, donc le contrat serait ` +
        'vrai par vacuité — on refuse de continuer.'
    );
  }
  return gardes;
}

/** Les titres des cas de test déclarés par un fichier, commentaires retirés. */
function titresDesCas(cheminRelatif) {
  const source = sansCommentaires(readFileSync(ch(cheminRelatif), 'utf8'));
  const titres = [];
  for (const trouve of source.matchAll(/\b(?:test|it)\s*\(\s*(['"`])((?:(?!\1)[\s\S])*)\1/g)) {
    titres.push(trouve[2]);
  }
  return titres;
}

// ══════════════════════════════════════════════════════ les rapports de course de ce tour

/**
 * LES RAPPORTS DE LA COURSE — DÉRIVÉS DE `scripts/verifier.mjs`, JAMAIS DEVINÉS.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * ⚠ CE BLOC ÉTAIT UNE LISTE ÉCRITE À LA MAIN, ET ELLE A FAIT MENTIR LE MÉTA-GARDE.
 *
 * Elle contenait `playwright.json`. Ce nom n'est pas un rapport de la chaîne : c'est le nom de
 * REPLI de `playwright.config.ts` — `process.env['PIERRE_RAPPORT_JSON'] ?? '…/playwright.json'`
 * —, celui qu'on obtient quand on lance Playwright À LA MAIN, hors `verifier.mjs`. Le fichier
 * qui portait ce nom datait d'un lancement isolé fait une heure avant un correctif de Q7.
 *
 * Q8 a donc lu, dans le même dossier, un rapport FRAIS qui disait « le contrôle positif de Q7
 * passe » et un rapport PÉRIMÉ qui portait un cas supprimé depuis, et il a cru le second.
 * Mesuré, sortie citée :
 *
 *     test-qualite.playwright.json   35 cas    ← la course en cours
 *     playwright.json               230 cas    ← reliquat d'un lancement isolé
 *     ✗ Q7 : son contrôle positif a ÉCHOUÉ — « … R20 à corps maximal … »   (titre supprimé)
 *
 * **Il a déclaré AVEUGLE un garde qui voit.** C'est la direction la plus coûteuse : à force,
 * on cesse de croire le méta-garde, et ce jour-là il ne garde plus rien. C'est exactement le
 * mode de défaillance que Q8 existe pour empêcher, dans Q8 lui-même.
 *
 * ── LE REMÈDE, ET POURQUOI CELUI-LÀ ───────────────────────────────────────────────────────
 *
 * La règle n° 1 du § 5 de la spec vaut aussi pour les ENTRÉES d'un garde : « la population se
 * DÉRIVE du code, jamais d'une liste ». On lit donc la table `CHAINE` de `scripts/verifier.mjs`
 * et on ne retient que les étapes qui déclarent un `brut:` — c'est-à-dire exactement les
 * fichiers que la chaîne écrit elle-même, avec leur `natif:` qui en donne la forme. Une étape
 * ajoutée demain entre toute seule ; un fichier que personne n'écrit n'entre jamais.
 *
 * Tout autre `*.json` du dossier est ÉNUMÉRÉ et IGNORÉ. On ne le supprime pas : ce ne sont pas
 * nos fichiers, et vider un dossier pour faire taire un outil est une réparation qui détruit.
 * C'est à l'outil d'être robuste au reliquat.
 *
 * ── LE DERNIER TROU, FERMÉ PAR `PIERRE_COURSE_DEBUT` ──────────────────────────────────────
 *
 * Le filtre canonique ne suffisait pas tout à fait : un rapport CANONIQUE peut lui-même dater
 * d'une chaîne précédente si l'on relance une chaîne partielle. `scripts/verifier.mjs` pose
 * donc, pour la seule étape `qa:controles`, l'instant où LA CHAÎNE a commencé — pris avant la
 * première étape, donc **un repère unique pour toutes**. Aucune comparaison de dates entre
 * étapes : elles ne se terminent pas ensemble, et s'en servir serait fragile.
 *
 * Un rapport canonique antérieur à ce repère n'appartient pas à la course : ses cas sont lus
 * mais MARQUÉS, et un garde dont le contrôle positif ne figure que là est déclaré non exécuté
 * ce tour-ci — avec le motif exact, pas un « introuvable » qui laisserait chercher.
 *
 * ── ET SANS LA VARIABLE, C'EST UN CAS LÉGITIME, PAS UNE PANNE ─────────────────────────────
 *
 * `node scripts/qa/controles-positifs.mjs` lancé à la main, hors chaîne, reste utile : il DIT
 * qu'il ne juge pas la fraîcheur de course, et il ne rougit pas pour ça. Le contrôle de
 * fraîcheur PAR GARDE (rapport antérieur au fichier du garde) continue de tourner dans tous
 * les cas — c'est lui qui attrape la direction dangereuse, un garde modifié depuis son rapport.
 * Un outil qui refuserait de se lancer hors de sa chaîne serait un outil qu'on ne lance plus.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
function rapportsCanoniques() {
  const source = readFileSync(ch('scripts/verifier.mjs'), 'utf8');
  const table = /const CHAINE = \[([\s\S]*?)\n\];/.exec(source);
  if (table === null) {
    throw new Error(
      'Q8 : la table `CHAINE` est introuvable dans scripts/verifier.mjs. Sans elle, on ne sait ' +
        'plus quels rapports appartiennent à la course — et lire n’importe quel `*.json` du ' +
        'dossier est précisément le défaut que ce bloc corrige. On refuse de continuer.'
    );
  }
  const canoniques = [];
  for (const bloc of table[1].split(/\{\s*cle:/).slice(1)) {
    const brut = /brut:\s*'([^']+)'/.exec(bloc)?.[1];
    const natif = /natif:\s*'([^']+)'/.exec(bloc)?.[1];
    if (brut === undefined || natif === undefined) continue;
    canoniques.push({ fichier: brut.split('/').pop(), forme: natif });
  }
  if (canoniques.length === 0) {
    throw new Error(
      'Q8 : `CHAINE` a été trouvée mais aucune étape ne déclare de `brut:`. Aucune exécution ne ' +
        'pourrait alors être prouvée, et Q8 rougirait pour la mauvaise raison.'
    );
  }
  return canoniques;
}

/** Aplati un rapport Playwright en `{ fichier, titre, statut }`. */
function casDUnRapportPlaywright(json) {
  const cas = [];
  const descendre = (suite, chemin) => {
    for (const spec of suite.specs ?? []) {
      const statut = (spec.tests ?? []).every((t) => t.status === 'expected') ? 'passed' : 'failed';
      cas.push({ fichier: spec.file ?? chemin, titre: spec.title, statut });
    }
    for (const sous of suite.suites ?? []) descendre(sous, sous.file ?? chemin);
  };
  for (const suite of json.suites ?? []) descendre(suite, suite.file);
  return cas;
}

/** Aplati un rapport Vitest en `{ fichier, titre, statut }`. */
function casDUnRapportVitest(json) {
  const cas = [];
  for (const fichier of json.testResults ?? []) {
    for (const assertion of fichier.assertionResults ?? []) {
      cas.push({ fichier: fichier.name, titre: assertion.title, statut: assertion.status });
    }
  }
  return cas;
}

/**
 * L'instant où LA CHAÎNE a commencé, posé par `scripts/verifier.mjs` sur la seule étape
 * `qa:controles`. `null` hors chaîne — et c'est un état légitime, jamais une panne.
 */
function debutDeLaCourse() {
  const brut = process.env['PIERRE_COURSE_DEBUT'];
  if (brut === undefined || brut.trim() === '') return null;
  const instant = Number(brut);
  // Une valeur illisible ne doit pas se transformer en `NaN` silencieux : toute comparaison
  // avec `NaN` est fausse, donc tous les rapports passeraient pour frais. On préfère ne pas
  // juger plutôt que de juger faux (CLAUDE.md, « refuser de conclure »).
  return Number.isFinite(instant) && instant > 0 ? instant : null;
}

const COURSE_DEBUT = debutDeLaCourse();

/** Tous les cas exécutés, avec l'instant du rapport qui les porte. */
function casExecutes(dossierRapports) {
  const cas = [];
  const lus = [];
  const canoniques = rapportsCanoniques();
  for (const { fichier, forme } of canoniques) {
    const chemin = join(dossierRapports, fichier);
    if (!existsSync(chemin)) {
      lus.push({ fichier, etat: 'ABSENT — l’étape n’a pas tourné' });
      continue;
    }
    let json;
    try {
      json = JSON.parse(readFileSync(chemin, 'utf8'));
    } catch {
      lus.push({ fichier, etat: 'ILLISIBLE' });
      continue;
    }
    const instant = statSync(chemin).mtimeMs;
    // Antérieur au départ de la chaîne ⇒ ce rapport est celui d'une course PRÉCÉDENTE.
    const horsCourse = COURSE_DEBUT !== null && instant < COURSE_DEBUT;
    const extraits = forme === 'vitest' ? casDUnRapportVitest(json) : casDUnRapportPlaywright(json);
    for (const un of extraits) cas.push({ ...un, rapport: fichier, instant, horsCourse });
    lus.push({
      fichier,
      etat: `${String(extraits.length)} cas${horsCourse ? ' · ANTÉRIEUR à la course en cours' : ''}`
    });
  }

  // ── LES RELIQUATS : énumérés, jamais lus, jamais supprimés ────────────────────────────────
  //
  // Un `*.json` du dossier qu'aucune étape de `CHAINE` ne déclare vient forcément d'ailleurs :
  // un lancement isolé, une mesure ponctuelle, une campagne archivée. Le taire le rendrait
  // invisible le jour où il expliquerait un verdict ; le lire a déjà fait mentir Q8 une fois.
  const reliquats = [];
  const attendus = new Set(canoniques.map((r) => r.fichier));
  if (existsSync(dossierRapports)) {
    for (const nom of readdirSync(dossierRapports)) {
      if (nom.endsWith('.json') && !attendus.has(nom)) reliquats.push(nom);
    }
  }
  return { cas, lus, reliquats };
}

/** Un chemin de rapport (absolu ou relatif au dossier `tests/`) désigne-t-il ce garde ? */
function memeFichier(cheminDuRapport, cheminDuGarde) {
  const normalise = (s) => s.replace(/\\/g, '/').toLowerCase();
  const rapport = normalise(cheminDuRapport);
  const garde = normalise(cheminDuGarde);
  // Les deux sens sont nécessaires, et ce n'est pas une précaution : Vitest écrit un chemin
  // ABSOLU (`C:/…/tests/unitaires/x.test.ts`, qui se termine par le chemin du garde), tandis
  // que Playwright écrit un chemin relatif à son `testDir` (`e2e/x.spec.ts`, dont le chemin du
  // garde se termine). Ne tester qu'un sens faisait déclarer « NON EXÉCUTÉ » les trois gardes
  // Playwright, alors qu'ils venaient de tourner sous mes yeux.
  return rapport.endsWith(garde) || garde.endsWith(rapport);
}

// ═══════════════════════════════════════════════════════════════════════════ le verdict

function principal() {
  const arguments_ = process.argv.slice(2);
  const indexRapports = arguments_.indexOf('--rapports');
  const dossierRapports =
    indexRapports === -1 ? ch('tests/rapports/brut') : resolve(arguments_[indexRapports + 1]);

  const gardes = gardesDeclares();
  const moi = 'scripts/qa/controles-positifs.mjs';
  const { cas, lus, reliquats } = casExecutes(dossierRapports);

  console.log('═'.repeat(94));
  console.log('Q8 — AUCUN GARDE NE PASSE SANS AVOIR PROUVÉ QU’IL SAIT ÉCHOUER');
  console.log('═'.repeat(94));
  console.log(`population : ${String(gardes.length)} gardes, dérivés de ${SPEC}`);
  console.log(`             ${gardes.map((g) => g.code).join(' · ')}`);
  console.log(`rapports   : ${dossierRapports.replace(/\\/g, '/')}`);
  console.log('             (noms dérivés des `brut:` de CHAINE, dans scripts/verifier.mjs)');
  console.log(
    COURSE_DEBUT === null
      ? '             fraîcheur de course : NON JUGÉE — `PIERRE_COURSE_DEBUT` absente ' +
          '(lancement hors chaîne). La fraîcheur PAR GARDE, elle, s’applique quand même.'
      : `             fraîcheur de course : jugée contre le départ de la chaîne ` +
          `(${new Date(COURSE_DEBUT).toISOString()})`
  );
  for (const { fichier, etat } of lus) console.log(`             ${fichier.padEnd(34)} ${etat}`);
  if (lus.length === 0) console.log('             *** AUCUN — aucune exécution ne peut être prouvée ***');
  if (reliquats.length > 0) {
    // « hors CHAINE » et non « reliquats » : tous ne sont pas des déchets. `test-visuel…json`
    // est réécrit à chaque course par `scripts/test-visuel.mjs`, mais son étape ne déclare
    // aucun `brut:` — il n'appartient donc pas à la course AU SENS DE CE GARDE, et aucun garde
    // ne vit dans `tests/visuel/`. Une étiquette qui traiterait un fichier frais de déchet
    // serait le genre d'imprécision qui fait cesser de lire un outil.
    console.log(
      `hors CHAINE: ${String(reliquats.length)} fichier(s) qu’aucune étape ne déclare en ` +
        '`brut:` — IGNORÉS, jamais lus, jamais supprimés :'
    );
    for (const nom of reliquats) console.log(`             ${nom}`);
  }
  console.log('');

  const griefs = [];
  const lignes = [];

  for (const garde of gardes) {
    const dette = DETTES.find((d) => d.garde === garde.code);
    const declare = garde.fichier;

    // ── Le méta-garde ne se demande pas à lui-même un contrôle positif : il EST le contrôle.
    if (declare !== null && memeFichier(declare, moi)) {
      lignes.push([garde.code, 'méta-garde', '—', '—', 'il est le contrôle des autres']);
      continue;
    }

    // ── Le domicile réel : celui de la spec, ou celui qu'une dette nomme explicitement.
    const domicile = dette?.domicile ?? declare;
    if (domicile === null) {
      griefs.push(`${garde.code} : la spec ne dit pas où il vit (ligne « vit dans » absente).`);
      lignes.push([garde.code, '—', 'ABSENT', '—', 'la spec ne nomme aucun fichier']);
      continue;
    }

    const present = existsSync(ch(domicile));

    // ── UNE DETTE DONT LA CONDITION D'EXTINCTION EST REMPLIE EST UN MENSONGE.
    //
    // Deux formes de dette, deux conditions d'extinction :
    //   • dette « le garde n'existe pas encore » (Q3) → elle meurt quand le fichier apparaît ;
    //   • dette « le garde vit ailleurs que là où la spec le loge » (Q2) → elle meurt quand le
    //     chemin DÉCLARÉ PAR LA SPEC existe, c'est-à-dire quand l'écart a été tranché.
    const eteinte =
      dette !== undefined &&
      (dette.domicile === undefined ? present : existsSync(ch(declare ?? domicile)));
    if (eteinte) {
      griefs.push(
        `${garde.code} : la dette « ${dette.raison.slice(0, 60)}… » n’a plus lieu d’être — ` +
          `${domicile} EXISTE. Retirer la dette de scripts/qa/controles-positifs.mjs.`
      );
      lignes.push([garde.code, domicile, 'DETTE PÉRIMÉE', '—', 'le fichier existe désormais']);
      continue;
    }

    if (!present) {
      if (dette === undefined) {
        griefs.push(`${garde.code} : ${domicile} n’existe pas, et aucune dette ne le couvre.`);
        lignes.push([garde.code, domicile, 'ABSENT', '—', 'aucune dette nommée']);
      } else {
        lignes.push([garde.code, domicile, 'DETTE', '—', dette.scene.slice(0, 46) + '…']);
      }
      continue;
    }

    // ── 1. le garde DÉCLARE-t-il un contrôle positif ? (commentaires retirés)
    const controles = titresDesCas(domicile).filter((t) => t.includes(MARQUEUR));
    if (controles.length === 0) {
      griefs.push(
        `${garde.code} : ${domicile} ne déclare AUCUN cas de test dont le titre porte ` +
          `« ${MARQUEUR} ». Un garde sans contrôle positif est une affirmation.`
      );
      lignes.push([garde.code, domicile, 'présent', '0 déclaré', 'AUCUN CONTRÔLE POSITIF']);
      continue;
    }

    // ── 2. ces contrôles ont-ils TOURNÉ ce tour-ci, et sont-ils passés ?
    const tousLesExecutes = cas.filter(
      (c) => memeFichier(c.fichier, domicile) && c.titre.includes(MARQUEUR)
    );

    // ── 2 bis. CE QUI VIENT D'UNE COURSE PRÉCÉDENTE NE COMPTE PAS POUR CELLE-CI.
    //
    // Un rapport canonique laissé par une chaîne partielle antérieure porte de vrais cas, avec
    // de vrais verdicts — mais ils parlent d'un autre tour. Les compter, c'est exactement
    // l'erreur qui a fait déclarer aveugle un garde qui voyait, une strate plus bas.
    const executes = tousLesExecutes.filter((c) => !c.horsCourse);
    if (executes.length === 0 && tousLesExecutes.length > 0) {
      const rapports = [...new Set(tousLesExecutes.map((c) => c.rapport))].join(', ');
      griefs.push(
        `${garde.code} : son contrôle positif ne figure que dans un rapport ANTÉRIEUR au départ ` +
          `de la chaîne (${rapports}). L’étape qui l’exécute n’a donc pas tourné ce tour-ci — ` +
          'ce verdict-là appartient à une course précédente.'
      );
      lignes.push([
        garde.code,
        domicile,
        'présent',
        `${String(tousLesExecutes.length)} hors course`,
        'COURSE PRÉCÉDENTE'
      ]);
      continue;
    }
    if (executes.length === 0) {
      griefs.push(
        `${garde.code} : ${String(controles.length)} contrôle(s) positif(s) DÉCLARÉ(S) et ` +
          'AUCUN retrouvé dans les rapports de ce tour. Un contrôle qu’on ne voit pas tourner ' +
          'est un contrôle qu’on n’a pas.'
      );
      lignes.push([
        garde.code,
        domicile,
        'présent',
        `${String(controles.length)} déclaré(s)`,
        'NON EXÉCUTÉ ce tour'
      ]);
      continue;
    }

    // ── 3. le rapport est-il POSTÉRIEUR au garde ? sinon il parle d'un autre fichier.
    const modifieLe = statSync(ch(domicile)).mtimeMs;
    const perimes = executes.filter((c) => c.instant < modifieLe);
    if (perimes.length === executes.length) {
      griefs.push(
        `${garde.code} : le rapport qui porte son contrôle positif (${executes[0].rapport}) est ` +
          'ANTÉRIEUR à la dernière modification du garde. Il ne prouve rien sur le garde ' +
          'd’aujourd’hui. Relancer la campagne, puis Q8.'
      );
      lignes.push([garde.code, domicile, 'présent', `${String(executes.length)} exécuté(s)`, 'rapport PÉRIMÉ']);
      continue;
    }

    // ── 4. UN CONTRÔLE POSITIF QUI NE MORD PLUS EST UN INSTRUMENT DEVENU AVEUGLE.
    const echoues = executes.filter((c) => c.statut !== 'passed');
    if (echoues.length > 0) {
      griefs.push(
        `${garde.code} : son contrôle positif a ÉCHOUÉ — « ${echoues[0].titre} ». Le garde ne ` +
          'retrouve plus le défaut de référence qui l’a inspiré : il est devenu aveugle, comme ' +
          'D2 sur `objet-campement` (§ 2.2). Le garde lui-même ne prouve plus rien.'
      );
      lignes.push([garde.code, domicile, 'présent', `${String(executes.length)} exécuté(s)`, 'CONTRÔLE AVEUGLE']);
      continue;
    }

    lignes.push([
      garde.code,
      domicile,
      'présent',
      `${String(executes.length)} exécuté(s)`,
      'contrôle positif VERT'
    ]);
  }

  // ── la table
  const largeurs = [4, 52, 14, 16, 26];
  const enTete = ['garde', 'domicile', 'état', 'contrôles positifs', 'verdict'];
  console.log(enTete.map((t, i) => t.padEnd(largeurs[i])).join(' '));
  console.log(largeurs.map((l) => '─'.repeat(l)).join(' '));
  for (const ligne of lignes) {
    console.log(ligne.map((t, i) => String(t).padEnd(largeurs[i])).join(' '));
  }

  // ── les dettes, toujours imprimées : une dette invisible redevient un oubli
  console.log('');
  console.log(`DETTES NOMMÉES : ${String(DETTES.length)}`);
  for (const dette of DETTES) {
    console.log(`  ${dette.garde} — ${dette.raison}`);
    console.log(`     ce qui l’éteint : ${dette.scene}`);
  }

  console.log('');
  if (griefs.length > 0) {
    console.log('─'.repeat(94));
    console.log(`Q8 ROUGE — ${String(griefs.length)} grief(s) :`);
    for (const grief of griefs) console.log(`  ✗ ${grief}`);
    console.log('─'.repeat(94));
    process.exitCode = 1;
    return;
  }
  console.log(
    `Q8 VERT — les ${String(lignes.length)} gardes déclarés portent un contrôle positif, il a ` +
      'tourné ce tour-ci, et il mord.'
  );
}

principal();
