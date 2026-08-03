// Combien d'assets sont PRODUITS, et combien l'enfant en voit vraiment — lot d'intégration.
//
// ═════════════════════════════════════════════════════════════════════════════════════════
// LE DÉFAUT QUE CE SCRIPT EXISTE POUR ATTRAPER
//
// « Un SVG produit et jamais affiché est du travail perdu. » `scripts/test-contenu.mjs`
// vérifie déjà qu'aucun SVG n'est ORPHELIN — c'est-à-dire qu'un document le DÉCLARE. Ce n'est
// pas la même question. Un habillage peut déclarer parfaitement son décor sans qu'aucun
// exercice ne cite cet habillage : le fichier est déclaré, contrôlé, compté — et l'enfant ne
// le verra jamais. C'est exactement la leçon de D48 : on audite les OBJETS qui devraient
// porter la propriété, pas les occurrences de la propriété.
//
// Ce script énumère donc les SVG livrés et remonte, pour chacun, la CHAÎNE COMPLÈTE jusqu'à
// l'écran :
//
//   décor d'exercice  : svg → habillage → exercice → nœud → liste `noeuds` d'une région
//   décor de campement: svg → habillage → cité par `contenu/monde/campement.json`
//   carte             : svg → cité par `contenu/monde/regions.json` ET par `EcranCarte.tsx`
//   ouverture         : svg → cité par `contenu/monde/sequence-ouverture.json`
//   Gobi              : svg → cité par `contenu/monde/gobi-*.json`, ou inliné par le code
//   registre          : svg → `contenu/registre-svg.json`, vivant par le code ou archivé
//
// Il ne supprime rien et ne modifie rien. Il compte, il nomme, et il sort en 1 si un SVG
// livré n'a aucune chaîne jusqu'à l'écran — hors des exceptions NOMMÉES ci-dessous, qui
// portent chacune son motif mesuré. Un quatrième décor hors de portée le ferait rougir.
// ═════════════════════════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENU = join(RACINE, 'contenu');

const lire = (chemin) => JSON.parse(readFileSync(join(RACINE, chemin), 'utf8'));
const texte = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');

/** Tous les fichiers d'un dossier, récursivement, filtrés par suffixe. */
function fichiersSous(dossierAbsolu, suffixe) {
  if (!existsSync(dossierAbsolu)) return [];
  return readdirSync(dossierAbsolu, { recursive: true, withFileTypes: true })
    .filter((entree) => entree.isFile() && entree.name.endsWith(suffixe))
    .map((entree) => join(entree.parentPath, entree.name));
}

/** Chemin relatif à `contenu/`, séparateurs POSIX — la forme que les documents emploient. */
const relatifContenu = (absolu) => absolu.slice(CONTENU.length + 1).split('\\').join('/');

// ─────────────────────────────────────────────────────────────────── les populations lues

const SVG_LIVRES = fichiersSous(CONTENU, '.svg').map(relatifContenu).sort();

const HABILLAGES = fichiersSous(join(CONTENU, 'habillages'), '.habillage.json').map((absolu) => ({
  chemin: relatifContenu(absolu),
  donnees: JSON.parse(readFileSync(absolu, 'utf8')),
}));

const EXERCICES = fichiersSous(join(CONTENU, 'exercices'), '.json').map((absolu) =>
  JSON.parse(readFileSync(absolu, 'utf8')),
);

const NOEUDS = fichiersSous(join(CONTENU, 'noeuds'), '.json').map((absolu) =>
  JSON.parse(readFileSync(absolu, 'utf8')),
);

const REGIONS = lire('contenu/monde/regions.json');
const NOEUDS_SUR_LA_CARTE = new Set(REGIONS.regions.flatMap((region) => region.noeuds));

/** Tout ce que les documents de `contenu/monde/` citent, à plat. */
function chainesDe(valeur, vues = new Set()) {
  if (typeof valeur === 'string') {
    vues.add(valeur);
    return vues;
  }
  if (Array.isArray(valeur)) {
    for (const item of valeur) chainesDe(item, vues);
    return vues;
  }
  if (valeur !== null && typeof valeur === 'object') {
    for (const item of Object.values(valeur)) chainesDe(item, vues);
    return vues;
  }
  return vues;
}

const CITES_PAR_LE_MONDE = new Map();
for (const absolu of fichiersSous(join(CONTENU, 'monde'), '.json')) {
  const nom = relatifContenu(absolu);
  for (const chaine of chainesDe(JSON.parse(readFileSync(absolu, 'utf8')))) {
    if (!chaine.endsWith('.svg')) continue;
    const vus = CITES_PAR_LE_MONDE.get(chaine) ?? [];
    vus.push(nom);
    CITES_PAR_LE_MONDE.set(chaine, vus);
  }
}

const REGISTRE = lire('contenu/registre-svg.json');
const VIVANTS_PAR_LE_CODE = new Map(
  REGISTRE.declaresParLeCode.map((entree) => [entree.fichier, entree.consommateur]),
);
const ARCHIVES = new Map(REGISTRE.archives.map((entree) => [entree.fichier, entree.remplacePar]));

/** Le dessin de Gobi est monté EN LIGNE : le module généré cite ses fichiers source. */
const DESSIN_GOBI = existsSync(join(RACINE, 'client/src/composants/gobi-dessin.gen.ts'))
  ? texte('client/src/composants/gobi-dessin.gen.ts')
  : '';

/** Les SVG que le code du client nomme littéralement (la carte, par exemple). */
const SOURCES_CLIENT = fichiersSous(join(RACINE, 'client', 'src'), '.tsx')
  .concat(fichiersSous(join(RACINE, 'client', 'src'), '.ts'))
  .map((absolu) => readFileSync(absolu, 'utf8'))
  .join('\n');

// ─────────────────────────────────────────────── la chaîne, maillon par maillon, par SVG

/** habillage.id → son fichier de scène, relatif à `contenu/`. */
const SCENE_DE_L_HABILLAGE = new Map();
for (const { chemin, donnees } of HABILLAGES) {
  const fichier = String(donnees.scene?.fichier ?? '');
  if (fichier !== '') {
    const dossier = chemin.slice(0, chemin.lastIndexOf('/'));
    // Le champ est relatif à `contenu/` quand il commence par `habillages/`, sinon au dossier.
    SCENE_DE_L_HABILLAGE.set(
      String(donnees.id),
      fichier.startsWith('habillages/') ? fichier : `${dossier}/${fichier}`,
    );
  }
}

/** habillage.id → les exercices qui le citent. */
const EXERCICES_PAR_HABILLAGE = new Map();
for (const exercice of EXERCICES) {
  const id = String(exercice.jeu?.habillage ?? '');
  const vus = EXERCICES_PAR_HABILLAGE.get(id) ?? [];
  vus.push(String(exercice.id));
  EXERCICES_PAR_HABILLAGE.set(id, vus);
}

/** exercice.id → les nœuds qui le citent, et ceux que la carte cite en retour. */
const NOEUDS_PAR_EXERCICE = new Map();
for (const noeud of NOEUDS) {
  const vus = NOEUDS_PAR_EXERCICE.get(String(noeud.exercice)) ?? [];
  vus.push(String(noeud.id));
  NOEUDS_PAR_EXERCICE.set(String(noeud.exercice), vus);
}

/**
 * La chaîne d'un SVG jusqu'à l'écran. Rend `{ vu, voie, detail }`.
 *
 * `vu` est vrai quand un chemin complet existe — pas quand un document le mentionne.
 */
function chaineJusquALEcran(svg) {
  // 1. Décor d'habillage : le seul cas où la chaîne a quatre maillons.
  const habillage = [...SCENE_DE_L_HABILLAGE.entries()].find(([, fichier]) => fichier === svg);
  if (habillage !== undefined) {
    const [id] = habillage;
    const exercices = EXERCICES_PAR_HABILLAGE.get(id) ?? [];
    const atteignables = exercices.filter((exercice) =>
      (NOEUDS_PAR_EXERCICE.get(exercice) ?? []).some((noeud) => NOEUDS_SUR_LA_CARTE.has(noeud)),
    );
    if (atteignables.length > 0) {
      return {
        vu: true,
        voie: 'exercice',
        detail: `${id} ← ${String(atteignables.length)} exercice(s) sur la carte`,
      };
    }
    // Un habillage sans exercice reste affichable s'il est cité par `contenu/monde/`.
    if (CITES_PAR_LE_MONDE.has(svg)) {
      return { vu: true, voie: 'monde', detail: CITES_PAR_LE_MONDE.get(svg).join(', ') };
    }
    return {
      vu: false,
      voie: 'habillage-sans-exercice',
      detail:
        `l'habillage « ${id} » déclare ce décor, ` +
        `${String(exercices.length)} exercice(s) le citent, aucun n'est sur la carte`,
    };
  }

  // 2. Cité par un document de `contenu/monde/` — carte, campement, ouverture, formes de Gobi.
  if (CITES_PAR_LE_MONDE.has(svg)) {
    return { vu: true, voie: 'monde', detail: CITES_PAR_LE_MONDE.get(svg).join(', ') };
  }

  // 3. Monté EN LIGNE par le module généré du dessin de Gobi.
  const nomSeul = svg.slice(svg.lastIndexOf('/') + 1);
  if (DESSIN_GOBI.includes(svg) || DESSIN_GOBI.includes(nomSeul)) {
    return { vu: true, voie: 'en-ligne', detail: 'client/src/composants/gobi-dessin.gen.ts' };
  }

  // 4. Nommé littéralement par une source du client.
  if (SOURCES_CLIENT.includes(svg)) {
    return { vu: true, voie: 'code-client', detail: 'chemin littéral dans client/src' };
  }

  // 5. Déclaré vivant par le code serveur, ou archivé — les deux sorties du registre.
  if (VIVANTS_PAR_LE_CODE.has(svg)) {
    return { vu: true, voie: 'registre-code', detail: VIVANTS_PAR_LE_CODE.get(svg) };
  }
  if (ARCHIVES.has(svg)) {
    return { vu: false, voie: 'archive', detail: `remplacé par ${ARCHIVES.get(svg)}` };
  }

  return { vu: false, voie: 'orphelin', detail: 'aucun document ni code ne le réclame' };
}

/**
 * LES SEULES EXCEPTIONS ADMISES, chacune avec son motif MESURÉ.
 *
 * Ce ne sont pas des orphelins : les trois décors sont déclarés par un habillage, dessinés,
 * contrôlés en régions fermées, et montés par `tests/composants/MoteurLibre.test.tsx`. Ce qui
 * leur manque est un CHEMIN POUR L'ENFANT, et il ne dépend pas d'un fichier de contenu.
 *
 * `client/src/monde/Chaudron.tsx` le dit lui-même, et le code est déjà écrit pour le jour où
 * la décision sera prise : la propriété `surOuvrir` existe, `EcranCampement` la relaie sous
 * `surOuvrirChaudron`, et `client/src/routeur.tsx` ne la passe pas. Le chaudron répond donc
 * « Le chaudron mijote encore » — jamais une erreur, R14 tenue —, et
 * `tests/composants/EcranCampement.test.tsx` garde ce comportement.
 *
 * Ce qui bloquait — « aucun nœud `libre` livré » — n'est PLUS vrai : `galeries-12` porte
 * `galeries-paroi-libre-01`. Le câbler reste néanmoins une décision de conception et non une
 * intégration : passer par un nœud journalise une tentative, rend trois étoiles et fait monter
 * la recoloration des Galeries, ce qui contredit « il n'y a rien à réussir » (v2 § 5.4). Les
 * deux issues — un nœud `libre` hébergé par le campement, ou une route sans journalisation —
 * appartiennent au père. Consigné dans `Docs/questions-en-attente.md`.
 */
const HORS_DE_PORTEE_ADMIS = new Map([
  [
    'habillages/campement/chaudron.svg',
    'sortie de secours du campement ; `surOuvrirChaudron` non câblé au routeur (décision ouverte)',
  ],
  [
    'habillages/campement/page-blanche.svg',
    'seconde surface de coloriage libre du campement ; même chaîne manquante que le chaudron',
  ],
  [
    'habillages/campement/vitrail-libre.svg',
    'troisième surface de coloriage libre ; même chaîne manquante que le chaudron',
  ],
]);

// ─────────────────────────────────────────────────────────────────────────── le rapport

const parVoie = new Map();
const jamaisVus = [];
const horsDePorteeAdmis = [];
for (const svg of SVG_LIVRES) {
  const { vu, voie, detail } = chaineJusquALEcran(svg);
  parVoie.set(voie, (parVoie.get(voie) ?? 0) + 1);
  if (vu || voie === 'archive') continue;
  if (HORS_DE_PORTEE_ADMIS.has(svg)) {
    horsDePorteeAdmis.push(`${svg} — ${HORS_DE_PORTEE_ADMIS.get(svg)}`);
    continue;
  }
  jamaisVus.push(`${svg} — ${detail}`);
}

const affiches =
  SVG_LIVRES.length -
  (parVoie.get('archive') ?? 0) -
  jamaisVus.length -
  horsDePorteeAdmis.length;

console.log('auditer-assets-affiches — la chaîne du fichier jusqu’à l’écran');
console.log(`  SVG livrés sous contenu/          : ${String(SVG_LIVRES.length)}`);
console.log(`  SVG atteignables à l’écran        : ${String(affiches)}`);
console.log(`  archivés (remplacés, jamais ôtés) : ${String(parVoie.get('archive') ?? 0)}`);
console.log(`  hors de portée, motif nommé       : ${String(horsDePorteeAdmis.length)}`);
console.log(`  jamais atteignables, sans motif   : ${String(jamaisVus.length)}`);
for (const [voie, compte] of [...parVoie.entries()].sort()) {
  console.log(`    voie ${voie.padEnd(24)} ${String(compte).padStart(4)}`);
}

// Les habillages, vus depuis les exercices : combien de décors l'enfant peut réellement ouvrir.
const habillagesAvecExercice = [...SCENE_DE_L_HABILLAGE.keys()].filter((id) =>
  (EXERCICES_PAR_HABILLAGE.get(id) ?? []).some((exercice) =>
    (NOEUDS_PAR_EXERCICE.get(exercice) ?? []).some((noeud) => NOEUDS_SUR_LA_CARTE.has(noeud)),
  ),
);
console.log(
  `  habillages déclarés / ouvrables par un nœud de la carte : ` +
    `${String(SCENE_DE_L_HABILLAGE.size)} / ${String(habillagesAvecExercice.length)}`,
);

if (horsDePorteeAdmis.length > 0) {
  console.log('\n  Hors de portée de l’enfant, admis et motivé (décision au père) :');
  for (const ligne of horsDePorteeAdmis) console.log(`    · ${ligne}`);
}

// Une exception qui a cessé d'être vraie doit se voir : sinon la table pourrit et finit par
// couvrir un décor qu'on aurait câblé depuis longtemps.
const admisDevenusVisibles = [...HORS_DE_PORTEE_ADMIS.keys()].filter(
  (svg) => !horsDePorteeAdmis.some((ligne) => ligne.startsWith(svg)),
);
if (admisDevenusVisibles.length > 0) {
  console.log(
    `\n  ${String(admisDevenusVisibles.length)} exception(s) devenue(s) inutile(s) — ` +
      'le décor est atteignable, l’entrée doit sortir de la table :',
  );
  for (const svg of admisDevenusVisibles) console.log(`    · ${svg}`);
}

if (jamaisVus.length > 0) {
  console.log('\n  SVG livrés qu’aucune chaîne ne mène à l’écran :');
  for (const ligne of jamaisVus) console.log(`    · ${ligne}`);
}

if (jamaisVus.length > 0 || admisDevenusVisibles.length > 0) process.exit(1);

