/**
 * `npm run qa:tableau` — l'état de la QA sur une page, lisible en trente secondes. Lot Q5.
 *
 * ── LA RÈGLE QUI GOUVERNE CE FICHIER ────────────────────────────────────────────────────
 *
 * **Aucun chiffre n'est imprimé sans sa source et sa fraîcheur.** Un tableau de bord qui
 * affiche « 92 % » sans dire d'où ça vient ni de quand ça date est la forme la plus efficace
 * du test trompeur : il fait décider. Quand une source manque, la case dit
 * « non mesuré — lancer `npm run …` » et **ne montre aucun nombre**. Une case vide est une
 * information ; une case périmée est un mensonge.
 *
 * Le corollaire : ce script **ne calcule que ce qu'il peut mesurer lui-même** (l'énumération
 * des écrans, des moteurs, des tests). Tout le reste — couverture, mutations, tests trompeurs —
 * est LU depuis le rapport de l'outil qui fait foi, jamais recalculé.
 *
 * ── LES DEUX ÉNUMÉRATIONS QU'IL FAIT LUI-MÊME, ET POURQUOI ELLES SONT PAR OBJET ─────────
 *
 * D48 : « auditer une propriété, c'est énumérer les objets qui DEVRAIENT la porter, pas les
 * occurrences de l'attribut ». On énumère donc :
 *
 *   • les **écrans** depuis les valeurs de `data-ecran` trouvées dans `client/src/**` — pas
 *     depuis une liste écrite à la main, qui a déjà donné 8 entrées là où le code en portait 13 ;
 *   • les **moteurs** depuis les dossiers de `client/src/moteurs/`, en excluant `commun` qui
 *     porte l'infrastructure partagée et n'est pas une valeur métier de `CodeMoteur`.
 *
 * C'est l'asymétrie que l'audit a trouvée, et c'est le chiffre à surveiller :
 * **14 moteurs sur 14 sont gardés au composant, 2 écrans sur 12 le sont.**
 *
 * Sortie : `tests/rapports/TABLEAU-DE-BORD-QA.md` (à lire) et
 * `tests/rapports/qa/tableau-de-bord.json` (à outiller).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `--racine=<chemin>` — la seule raison d'être de cette option est de rendre le garde-fou
 * VÉRIFIABLE : pointé sur un dossier vide, le tableau de bord doit sortir en 1 et dire que ses
 * populations sont nulles. Un garde qu'on n'a jamais vu se déclencher n'a pas fait ses preuves.
 */
const RACINE = (() => {
  const donnee = process.argv.slice(2).find((a) => a.startsWith('--racine='));
  return donnee === undefined ? fileURLToPath(new URL('../..', import.meta.url)) : donnee.slice(9);
})();
const DOSSIER_RAPPORTS = join(RACINE, 'tests', 'rapports');
const DOSSIER_QA = join(DOSSIER_RAPPORTS, 'qa');
const CHEMIN_MD = join(DOSSIER_RAPPORTS, 'TABLEAU-DE-BORD-QA.md');
const CHEMIN_JSON = join(DOSSIER_QA, 'tableau-de-bord.json');

// ────────────────────────────────────────────────────────────────── outillage de lecture

function fichiersSous(dossier, garder) {
  if (!existsSync(dossier)) return [];
  const trouves = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) {
      if (entree.name === 'node_modules' || entree.name === 'rapports') continue;
      trouves.push(...fichiersSous(chemin, garder));
    } else if (garder(entree.name)) trouves.push(chemin);
  }
  return trouves;
}

/**
 * Lit un rapport JSON produit par un autre outil. **Rend `null` quand il manque**, jamais un
 * objet vide : c'est ce `null` qui fait écrire « non mesuré » au lieu d'un zéro trompeur.
 */
function lireRapport(chemin) {
  if (!existsSync(chemin)) return null;
  try {
    const contenu = JSON.parse(readFileSync(chemin, 'utf8'));
    return { ...contenu, __fraicheur: statSync(chemin).mtime.toISOString() };
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────── énumération 1 : les écrans, par objet

/**
 * Les écrans DÉCLARÉS : chaque valeur de `data-ecran` trouvée dans le client, avec le fichier
 * qui la porte. C'est la population ; le reste n'est que couverture.
 */
function ecransDeclares() {
  const sources = fichiersSous(join(RACINE, 'client', 'src'), (n) => n.endsWith('.tsx'));
  const table = new Map();
  for (const chemin of sources) {
    const texte = readFileSync(chemin, 'utf8');
    for (const trouve of texte.matchAll(/data-ecran=["']([a-z0-9-]+)["']/g)) {
      const composant = chemin.split(/[/\\]/).pop().replace(/\.tsx$/, '');
      if (!table.has(trouve[1])) table.set(trouve[1], { composant, fichier: relative(RACINE, chemin).replace(/\\/g, '/') });
    }
  }
  return table;
}

/** Les écrans du dossier `client/src/ecrans/` — la mesure exacte de l'audit § 5.1. */
function ecransDuDossier() {
  const dossier = join(RACINE, 'client', 'src', 'ecrans');
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((n) => n.endsWith('.tsx'))
    .map((n) => n.replace(/\.tsx$/, ''));
}

function moteursDeclares() {
  const dossier = join(RACINE, 'client', 'src', 'moteurs');
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'commun')
    .map((e) => e.name);
}

const TESTS_COMPOSANTS = existsSync(join(RACINE, 'tests', 'composants'))
  ? readdirSync(join(RACINE, 'tests', 'composants'))
  : [];

/** Un composant est gardé s'il porte un test de composant à son nom. */
function aUnTestDeComposant(composant) {
  return TESTS_COMPOSANTS.some((n) => n === `${composant}.test.tsx` || n === `${composant}.test.ts`);
}

/** `MoteurTrace` pour le dossier `trace`. */
function nomDeComposantMoteur(dossier) {
  return `Moteur${dossier.charAt(0).toUpperCase()}${dossier.slice(1)}`;
}

/**
 * Le texte de tous les tests de composant, concaténé une fois.
 *
 * Sert la mesure LARGE : un écran peut être couvert sans porter de fichier à son nom — c'est le
 * cas d'un test d'exploration qui parcourt le graphe des écrans. Mesurer seulement « un fichier
 * à son nom » sous-estimerait alors la couverture, et un tableau de bord qui se trompe dans ce
 * sens-là fait écrire des tests qui existent déjà.
 *
 * Les deux mesures sont affichées côte à côte. La STRICTE reste le chiffre de référence : c'est
 * elle que l'audit a mesurée (2 sur 12), et un écran sans fichier à son nom n'a personne pour
 * répondre de lui quand il change.
 */
const TEXTE_DES_TESTS_COMPOSANTS = TESTS_COMPOSANTS.map((nom) => {
  try {
    return readFileSync(join(RACINE, 'tests', 'composants', nom), 'utf8');
  } catch {
    return '';
  }
}).join('\n');

function estMentionnePar(composant, valeurDataEcran) {
  return (
    new RegExp(`(?<![\\w$])${composant}(?![\\w$])`).test(TEXTE_DES_TESTS_COMPOSANTS) ||
    (valeurDataEcran !== undefined &&
      TEXTE_DES_TESTS_COMPOSANTS.includes(`data-ecran="${valeurDataEcran}"`))
  );
}

// ─────────────────────────────────────────────────────────────────────── les mesures

const ecrans = ecransDeclares();
const dossierEcrans = ecransDuDossier();
const moteurs = moteursDeclares();

/** `EcranNoeud` → `noeud`, quand cet écran déclare bien un `data-ecran`. */
const valeurDataEcranDe = (composant) =>
  [...ecrans.entries()].find(([, v]) => v.composant === composant)?.[0];

const ecransCouverts = dossierEcrans.filter(aUnTestDeComposant);
const ecransNus = dossierEcrans.filter((e) => !aUnTestDeComposant(e));
const ecransMentionnes = dossierEcrans.filter((e) => estMentionnePar(e, valeurDataEcranDe(e)));
const ecransJamaisMontes = dossierEcrans.filter(
  (e) => !aUnTestDeComposant(e) && !estMentionnePar(e, valeurDataEcranDe(e))
);
const moteursCouverts = moteurs.filter((m) => aUnTestDeComposant(nomDeComposantMoteur(m)));
const moteursNus = moteurs.filter((m) => !aUnTestDeComposant(nomDeComposantMoteur(m)));

const fichiersDeTest = fichiersSous(join(RACINE, 'tests'), (n) => /\.(test|spec)\.tsx?$/.test(n));

const mutationsLues = lireRapport(join(DOSSIER_QA, 'mutations.json'));

/**
 * **Un rapport de mutation non opposable ne donne aucun chiffre.**
 *
 * Trois conditions, et les trois sont nécessaires : base verte avant, base verte après, et TOUS
 * les contrôles négatifs verts. Si l'une manque, le rapport peut être arithmétiquement juste et
 * factuellement faux.
 *
 * Vu en conditions réelles le 2026-08-02, sur ce dépôt : un banc a rendu **33 recettes détectées
 * sur 33**, contrôles négatifs compris. Chiffre magnifique, entièrement faux — la suite était
 * passée au rouge à la deuxième recette parce qu'une campagne parallèle venait de casser
 * `tests/unitaires/carte.test.ts`, et le banc comptait cette rougeur-là comme sa détection.
 * C'est mot pour mot le piège décrit par `Docs/audit-qa.md` § 1. Le publier aurait fait croire
 * au père que sa QA était parfaite.
 *
 * `complet === false` : un banc partiel a écrit là où il ne devait pas.
 */
function estOpposable(rapport) {
  if (rapport === null) return 'rapport absent — lancer `npm run qa:mutations`';
  if (rapport.complet !== true) return 'rapport PARTIEL — il ne décrit pas tout le jeu de recettes';
  if (rapport.baseVerteAvant !== true) return 'la base n’était pas verte AVANT le banc';
  if (rapport.baseVerteApres !== true) return 'la base n’était pas verte APRÈS le banc';
  if ((rapport.echecs?.length ?? 0) > 0) {
    return `le banc est ROUGE : ${rapport.echecs.join(' · ')}`;
  }
  if ((rapport.ancragesPerdus?.length ?? 0) > 0) {
    return `${rapport.ancragesPerdus.length} recette(s) ont un ancrage perdu`;
  }
  if ((rapport.mutationsNonMesurees?.length ?? 0) > 0) {
    return `${rapport.mutationsNonMesurees.length} mutation(s) n’ont pas été mesurées`;
  }
  if (rapport.controlesNegatifsExecutes !== rapport.controlesNegatifs) {
    return (
      `${rapport.controlesNegatifs - (rapport.controlesNegatifsExecutes ?? 0)} contrôle(s) ` +
      'n’ont pas été exécutés'
    );
  }
  if (rapport.controlesNegatifsVerts !== rapport.controlesNegatifs) {
    return (
      `${rapport.controlesNegatifs - rapport.controlesNegatifsVerts} contrôle(s) négatif(s) ` +
      'ont rougi — le banc mesurait le bruit d’une autre campagne, pas la QA'
    );
  }
  return null;
}

const motifNonOpposable = estOpposable(mutationsLues);
const mutations = motifNonOpposable === null ? mutationsLues : null;
const trompeurs = lireRapport(join(DOSSIER_QA, 'tests-trompeurs.json'));
const couverture = lireRapport(join(DOSSIER_RAPPORTS, 'couverture', 'coverage-summary.json'));
const etapeTest = lireRapport(join(DOSSIER_RAPPORTS, 'test.json'));
const etapeE2E = lireRapport(join(DOSSIER_RAPPORTS, 'test-e2e.json'));
const etapeRejeu = lireRapport(join(DOSSIER_RAPPORTS, 'test-rejeu.json'));
const etapeContenu = lireRapport(join(DOSSIER_RAPPORTS, 'test-contenu.json'));

/** Les seuils PAR ZONE de l'annexe T § 7, tels que `vitest.config.ts` les déclare. */
const ZONES = [
  ['partage/src/pedagogie/', 90, 'le premier risque du projet vit ici'],
  ['partage/src/contenu/validation.ts', 95, 'c’est le juge'],
  ['partage/src/moteurs/', 80, 'le reste est couvert en E2E'],
  ['serveur/src/routes/', 80, '']
];

function couvertureDeZone(prefixe) {
  if (couverture === null) return null;
  const entrees = Object.entries(couverture).filter(
    ([cle]) => cle !== 'total' && cle.replace(/\\/g, '/').includes(prefixe)
  );
  if (entrees.length === 0) return null;
  const somme = entrees.reduce(
    (acc, [, v]) => ({ couvert: acc.couvert + (v.lines?.covered ?? 0), total: acc.total + (v.lines?.total ?? 0) }),
    { couvert: 0, total: 0 }
  );
  return somme.total === 0 ? null : Math.round((somme.couvert / somme.total) * 1000) / 10;
}

// ─────────────────────────────────────────────────────────────────────── la page

const l = [];
const pct = (n, d) => (d === 0 ? '—' : `${Math.round((n / d) * 100)} %`);
const feu = (n, d) => (d === 0 ? '⬜' : n === d ? '🟩' : n >= d * 0.75 ? '🟨' : '🟥');

l.push('# Tableau de bord de la QA — La Pierre des Mots');
l.push('');
l.push(`**Écrit le** ${new Date().toISOString()} · régénéré par \`npm run qa:tableau\``);
l.push('');
l.push('> Chaque chiffre porte sa source. Une case qui dit « non mesuré » n’est pas un zéro :');
l.push('> c’est un ordre à taper. Un tableau de bord qui affiche un nombre périmé fait décider');
l.push('> à côté, et c’est exactement le défaut qu’il est censé prévenir.');
l.push('');

// ── 1. la zone aveugle principale
l.push('## 1. Ce qui est gardé au composant — la zone aveugle principale');
l.push('');
l.push('*Mesuré par énumération des OBJETS, pas des occurrences (D48).*');
l.push('');
l.push('| Population | Gardés | Sur | Part | |');
l.push('|---|---:|---:|---:|:--:|');
l.push(
  `| Moteurs de \`client/src/moteurs/\` | ${moteursCouverts.length} | ${moteurs.length} | ` +
    `${pct(moteursCouverts.length, moteurs.length)} | ${feu(moteursCouverts.length, moteurs.length)} |`
);
l.push(
  `| Écrans de \`client/src/ecrans/\` | ${ecransCouverts.length} | ${dossierEcrans.length} | ` +
    `${pct(ecransCouverts.length, dossierEcrans.length)} | ${feu(ecransCouverts.length, dossierEcrans.length)} |`
);
l.push(
  `| Écrans **montés au moins une fois** par un test de composant | ${ecransMentionnes.length} | ` +
    `${dossierEcrans.length} | ${pct(ecransMentionnes.length, dossierEcrans.length)} | ` +
    `${feu(ecransMentionnes.length, dossierEcrans.length)} |`
);
l.push(`| Valeurs de \`data-ecran\` déclarées dans \`client/src/**\` | — | ${ecrans.size} | — | |`);
l.push('');
l.push('*Les deux lignes « écrans » ne mesurent pas la même chose, et l’écart est l’information :*');
l.push('*la première demande un fichier AU NOM de l’écran — quelqu’un qui réponde de lui quand il*');
l.push('*change ; la seconde accepte qu’un test d’exploration le traverse. Un écran traversé mais*');
l.push('*sans fichier à son nom est gardé contre la disparition, pas contre la dérive.*');
l.push('');
if (ecransNus.length > 0) {
  l.push(`**Les ${ecransNus.length} écrans sans fichier de test à leur nom :**`);
  l.push('');
  for (const e of ecransNus) {
    l.push(`- \`${e}\`${estMentionnePar(e, valeurDataEcranDe(e)) ? ' — traversé par un test d’exploration' : ' — **jamais monté**'}`);
  }
  l.push('');
}
if (ecransJamaisMontes.length > 0) {
  l.push(
    `**${ecransJamaisMontes.length} écran(s) ne sont montés par AUCUN test de composant.** Chacun est ` +
      'un endroit où une mutation survit par construction.'
  );
  l.push('');
}
if (moteursNus.length > 0) {
  l.push(`**Moteurs sans test de composant : ${moteursNus.join(', ')}**`);
  l.push('');
}

// ── 2. mutations
l.push('## 2. Ce que la QA attrape quand on casse le code');
l.push('');
if (mutations === null) {
  if (motifNonOpposable === null) {
    l.push('> **Non mesuré.** Lancer `npm run qa:mutations` (≈ 30–35 min). Sans cette mesure, la');
    l.push('> valeur de la suite de tests est une croyance.');
  } else {
    l.push(`> **MESURE NON OPPOSABLE — aucun chiffre n’est affiché.** ${motifNonOpposable}.`);
    l.push('>');
    l.push('> Le rapport existe et il est peut-être arithmétiquement juste ; il n’est pas');
    l.push('> *fiable*, et un chiffre non fiable sur un tableau de bord fait décider à côté.');
    l.push('> Relancer `npm run qa:mutations` une fois la suite verte et la machine calme :');
    l.push('> `npm run test` doit passer avant que le banc ne veuille dire quoi que ce soit.');
  }
  l.push('');
} else {
  l.push(`*Source : \`tests/rapports/qa/mutations.json\`, écrit le ${mutations.ecritLe}.*`);
  l.push('');
  l.push('| Grandeur | Valeur |');
  l.push('|---|---:|');
  l.push(`| Mutations cataloguées | ${mutations.mutationsCataloguees} |`);
  l.push(`| Mutations réellement injectées | ${mutations.mutationsJouees} |`);
  l.push(`| Mutations non mesurées | ${mutations.mutationsNonMesurees.length} |`);
  l.push(`| Mutants équivalents (hors dénominateur) | ${mutations.mutantsEquivalents} |`);
  l.push(`| **Mutations qui valent** | **${mutations.mutationsQuiValent}** |`);
  l.push(`| Détectées par la suite exécutée | ${mutations.detectees} |`);
  l.push(`| Survivantes | ${mutations.survivantes} |`);
  l.push(`| — dont couvertes par une assertion E2E nommée, non exécutée | ${mutations.survivantesCouvertesE2E} |`);
  l.push(`| **— dont TROUS RÉELS, vus par personne** | **${mutations.trousReels.length}** |`);
  l.push(`| Taux de survie | ${mutations.tauxSurviePourCent} % |`);
  l.push(`| Contrôles négatifs exécutés | ${mutations.controlesNegatifsExecutes} / ${mutations.controlesNegatifs} |`);
  l.push(`| Contrôles négatifs verts | ${mutations.controlesNegatifsVerts} / ${mutations.controlesNegatifs} |`);
  l.push(`| Base verte avant **et** après | ${mutations.baseVerteAvant && mutations.baseVerteApres ? 'oui' : '**NON — mesure non opposable**'} |`);
  l.push('');
  if (mutations.trousReels.length > 0) {
    l.push('**Les défauts qu’aucun test du dépôt ne verrait :**');
    l.push('');
    l.push('| # | Défaut | Fichier | Règle enfreinte |');
    l.push('|---|---|---|---|');
    for (const t of mutations.trousReels) {
      l.push(`| ${t.id} | ${t.titre} | \`${t.fichier}\` | ${t.regle ?? '—'} |`);
    }
    l.push('');
  }
}

// ── 3. tests trompeurs
l.push('## 3. Les tests qui rassurent sans rien prouver');
l.push('');
if (trompeurs === null) {
  l.push('> **Non mesuré.** Lancer `npm run qa:trompeurs` (≈ 2 s).');
  l.push('');
} else {
  l.push(`*Source : \`tests/rapports/qa/tests-trompeurs.json\`, écrit le ${trompeurs.ecritLe}.*`);
  l.push('');
  l.push('| Grandeur | Valeur | Seuil |');
  l.push('|---|---:|---:|');
  l.push(`| Fichiers de test analysés | ${trompeurs.nbFichiers} | — |`);
  l.push(`| Cas de test analysés | ${trompeurs.nbCas} | — |`);
  l.push(`| **Bloquants** (sans assertion, désactivés) | **${trompeurs.bloquants}** | 0 |`);
  l.push(`| Avertissements | ${trompeurs.avertissements} | ${trompeurs.plafondAvertissements} |`);
  l.push('');
  const codes = Object.entries(trompeurs.parCode ?? {}).sort((a, b) => b[1] - a[1]);
  if (codes.length > 0) {
    l.push('| Détecteur | Constats |');
    l.push('|---|---:|');
    for (const [code, n] of codes) l.push(`| \`${code}\` | ${n} |`);
    l.push('');
  }
}

// ── 4. couverture par zone
l.push('## 4. Couverture par zone — annexe T § 7');
l.push('');
if (couverture === null) {
  l.push('> **Non mesuré.** La couverture n’est produite que par `npm run verifier` (il passe');
  l.push('> `--coverage`). `npm run test` seul ne la calcule pas, et c’est délibéré : la suite');
  l.push('> reste à 8 secondes, ce qui rend le banc de mutation possible.');
  l.push('');
} else {
  l.push(`*Source : \`tests/rapports/couverture/coverage-summary.json\`, écrit le ${couverture.__fraicheur}.*`);
  l.push('');
  l.push('| Zone | Lignes couvertes | Seuil | | Pourquoi ce seuil |');
  l.push('|---|---:|---:|:--:|---|');
  for (const [zone, seuil, pourquoi] of ZONES) {
    const mesure = couvertureDeZone(zone);
    const symbole = mesure === null ? '⬜' : mesure >= seuil ? '🟩' : '🟥';
    l.push(
      `| \`${zone}\` | ${mesure === null ? '—' : `${mesure} %`} | ${seuil} % | ${symbole} | ${pourquoi} |`
    );
  }
  l.push('');
}

// ── 5. les suites
l.push('## 5. Les suites, et quand elles ont tourné');
l.push('');
l.push('| Suite | Cas | Échecs | Écrit le |');
l.push('|---|---:|---:|---|');
for (const [nom, rapport, commande] of [
  ['`npm run test` — unitaires + composants + api', etapeTest, 'npm run test'],
  ['`npm run test:contenu`', etapeContenu, 'npm run test:contenu'],
  ['`npm run test:e2e` — parcours et robustesse', etapeE2E, 'npm run test:e2e'],
  ['`npm run test:rejeu`', etapeRejeu, 'npm run test:rejeu']
]) {
  if (rapport === null) {
    l.push(`| ${nom} | — | — | *non mesuré : \`${commande}\`* |`);
  } else {
    l.push(`| ${nom} | ${rapport.total ?? '—'} | ${rapport.echecs ?? '—'} | ${rapport.__fraicheur} |`);
  }
}
l.push(`| Fichiers de test dans le dépôt | ${fichiersDeTest.length} | — | énuméré à l’instant |`);
l.push('');

// ── 6. quoi faire
l.push('## 6. Où porter l’effort — dans cet ordre');
l.push('');
l.push('1. **Les trous réels du § 2.** Ce sont des défauts que rien n’arrête aujourd’hui, sur');
l.push('   des règles que le projet a déjà payées cher.');
l.push('2. **Les écrans nus du § 1.** L’audit a mesuré que 8 survivants sur 11 y tombent : c’est');
l.push('   le lot qui a le plus d’effet par ligne écrite.');
l.push('3. **Les bloquants du § 3.** Un test sans assertion ou désactivé est un mensonge dans le');
l.push('   rapport, pas une dette.');
l.push('');
l.push('---');
l.push('');
l.push('| Commande | Ce qu’elle mesure | Durée |');
l.push('|---|---|---|');
l.push('| `npm run qa:mutations` | ce que la QA attrape quand on casse le code | ≈ 30–35 min |');
l.push('| `npm run qa:trompeurs` | les tests qui n’assertent rien ou trop peu | ≈ 2 s |');
l.push('| `npm run qa:tableau` | cette page | < 1 s |');
l.push('| `npm run verifier` | la chaîne complète, un seul code de sortie | plusieurs min |');
l.push('');

mkdirSync(DOSSIER_QA, { recursive: true });
writeFileSync(CHEMIN_MD, `${l.join('\n')}\n`, 'utf8');

const resume = {
  etape: 'qa:tableau',
  ecritLe: new Date().toISOString(),
  moteursDeclares: moteurs.length,
  moteursCouverts: moteursCouverts.length,
  moteursNus,
  ecransDuDossier: dossierEcrans.length,
  ecransCouverts: ecransCouverts.length,
  ecransMontesAuMoinsUneFois: ecransMentionnes.length,
  ecransNus,
  ecransJamaisMontes,
  ecransDeclaresParDataEcran: ecrans.size,
  fichiersDeTest: fichiersDeTest.length,
  mutationsNonOpposable: motifNonOpposable,
  mutations: mutations === null ? null : {
    cataloguees: mutations.mutationsCataloguees,
    jouees: mutations.mutationsJouees,
    nonMesurees: mutations.mutationsNonMesurees.length,
    quiValent: mutations.mutationsQuiValent,
    detectees: mutations.detectees,
    survivantes: mutations.survivantes,
    trousReels: mutations.trousReels.length,
    tauxSurviePourCent: mutations.tauxSurviePourCent,
    ecritLe: mutations.ecritLe
  },
  trompeurs: trompeurs === null ? null : {
    bloquants: trompeurs.bloquants,
    avertissements: trompeurs.avertissements,
    plafond: trompeurs.plafondAvertissements,
    ecritLe: trompeurs.ecritLe
  },
  couvertureParZone: Object.fromEntries(ZONES.map(([z]) => [z, couvertureDeZone(z)]))
};
writeFileSync(CHEMIN_JSON, `${JSON.stringify(resume, null, 2)}\n`, 'utf8');

// ─────────────────────────────────────────────────────────────────── verdict

console.log('');
console.log('╭─ Tableau de bord de la QA');
console.log(`│  moteurs gardés au composant  ${moteursCouverts.length} / ${moteurs.length}`);
console.log(`│  écrans  gardés au composant  ${ecransCouverts.length} / ${dossierEcrans.length}  (fichier à leur nom)`);
console.log(`│  écrans  montés au moins 1×   ${ecransMentionnes.length} / ${dossierEcrans.length}  (test d’exploration compris)`);
console.log(`│  écrans déclarés (data-ecran) ${ecrans.size}`);
console.log(`│  fichiers de test             ${fichiersDeTest.length}`);
console.log(
  `│  mutations survivantes        ${
    mutations === null
      ? motifNonOpposable === null
        ? '— (npm run qa:mutations)'
        : `— MESURE NON OPPOSABLE : ${motifNonOpposable}`
      : `${mutations.survivantes} / ${mutations.mutationsQuiValent}, dont ${mutations.trousReels.length} vues par personne`
  }`
);
console.log(
  `│  tests trompeurs              ${trompeurs === null ? '— (npm run qa:trompeurs)' : `${trompeurs.bloquants} bloquant(s), ${trompeurs.avertissements} avertissement(s)`}`
);
console.log('╰─ Page : tests/rapports/TABLEAU-DE-BORD-QA.md');
console.log('');

// Un tableau de bord dont une population est nulle n'a rien énuméré : il ne mesure pas un
// dépôt sain, il mesure sa propre panne. C'est le seul cas où il sort en 1.
const echecs = [];
if (moteurs.length === 0) echecs.push('population NULLE : aucun moteur énuméré dans `client/src/moteurs/`');
if (dossierEcrans.length === 0) echecs.push('population NULLE : aucun écran énuméré dans `client/src/ecrans/`');
if (ecrans.size === 0) echecs.push('population NULLE : aucun `data-ecran` trouvé dans `client/src/`');
if (fichiersDeTest.length === 0) echecs.push('population NULLE : aucun fichier de test énuméré');
if (motifNonOpposable !== null) echecs.push(`mesure de mutation NON OPPOSABLE : ${motifNonOpposable}`);

if (echecs.length === 0) {
  console.log('✅ Les quatre populations sont non nulles — le tableau mesure quelque chose.');
  process.exit(0);
}
console.log('❌ ROUGE :');
for (const e of echecs) console.log(`   · ${e}`);
process.exit(1);
