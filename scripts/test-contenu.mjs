/**
 * `npm run test:contenu` — validation de TOUT le contenu. Lot L-G.
 *
 * Les **6 contrôles retenus pour la v1** sont ceux du contrat gelé § 9.8 ; les 4 autres de
 * l'annexe T § T1 sont désactivés, chacun avec sa raison écrite, et le rapport les nomme au
 * lieu de les taire.
 *
 * S'y ajoute le contrôle **P3.2**, qui ne vient pas de l'annexe T mais de l'annexe P § 3.2 :
 * les **régions fermées**. C'est l'étape BLOQUANTE de la chaîne image — « un trait
 * interrompu d'un pixel fait fuiter le remplissage sur toute l'image » (CLAUDE.md) — et elle
 * n'avait aucun contrôle automatique : ce script n'ouvrait pas un seul fichier `.svg`.
 *
 * C'est aussi la commande que l'agent générateur de contenu doit exécuter avant de déposer un
 * brouillon (annexe T § T1). Elle ne modifie jamais rien : elle lit et elle juge.
 *
 * S'y ajoute enfin le contrôle **M6.2** (lot A2), qui ne vient pas non plus de l'annexe T mais
 * du point de synchronisation du contrat de finition v3 § 6.2 : le croisement de
 * `contenu/monde/regions.json` et de `contenu/noeuds/**`. Mesuré avant ce lot, sortie citée :
 *
 *   $ grep -n "noeud" scripts/test-contenu.mjs
 *   358,359,360,361,362,363,364   (une variable locale du parcours SVG, aucune lecture)
 *
 * Sept occurrences, aucun fichier de nœud ouvert. Un agent pouvait livrer six nœuds invisibles
 * sur la carte et lire « 0 problème » — c'est arrivé deux fois (contrat § 1.5, puis N8).
 *
 * S'y ajoute enfin, pour le lot A3, la **troisième source de déclaration** du contrôle P3.2 :
 * `contenu/registre-svg.json`. Le contrôle rendait 14 anomalies « aucun habillage ni document
 * de `contenu/monde/` ne déclare ce SVG » sans offrir d'autre issue que la suppression, alors
 * qu'aucun lot ne supprime un fichier de contenu. Le registre ouvre les deux issues qui
 * manquaient — déclarer ce que le code seul nomme, archiver ce qui a été remplacé — et il est
 * lui-même contrôlé, entrée par entrée, plus bas dans ce fichier. Aucun octet n'a été effacé.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

import { RACINE, ecrireEtape, genererRapport } from './rapport.mjs';
import { cheminsRemplisNonFermes } from './svg-remplissage.mjs';
import { croiserNoeudsEtRegions, resumerCroisement } from './verifier-noeuds-regions.mjs';
import { croiserPrerequis, resumerPrerequis } from './verifier-prerequis.mjs';

const ETAPE = 'test:contenu';
const debut = Date.now();

const DOSSIER_CONTENU = join(RACINE, 'contenu');
const CHEMIN_SCHEMA_EXERCICE = join(DOSSIER_CONTENU, 'schemas', 'exercice.schema.json');
const CHEMIN_COMPETENCES = join(DOSSIER_CONTENU, 'referentiel', 'competences.json');
const CHEMIN_REGISTRE_SVG = join(DOSSIER_CONTENU, 'registre-svg.json');
const CHEMIN_SCHEMA_REGISTRE = join(DOSSIER_CONTENU, 'schemas', 'registre-svg.schema.json');

/**
 * Règle des 64 px, transposée dans l'échelle du `viewBox` — contrat § 5.2 : « une `surface` au
 * moins égale à celle d'un carré de 64 px **à l'échelle de rendu** ».
 *
 * L'échelle de rendu n'est pas devinée : elle se calcule pour chaque habillage à partir de son
 * `viewBox` et du gabarit d'appareil de l'annexe T § 3 (1920 × 1200), duquel on retire la bande
 * réservée à la consigne et au nuancier. Le contrôle reste une **approximation statique** : la
 * mesure qui fait foi est `tests/qualite/a11y.spec.ts`, qui lit les boîtes réellement rendues.
 */
const GABARIT = { largeur: 1920, hauteur: 1200, bandeReserveePx: 240 };
const CIBLE_MINIMALE_PX = 64;

const controlesDesactives = [
  [
    '8',
    'Audio pré-rendu par consigne (R15)',
    'mesurée ailleurs depuis le lot N2 : `tests/unitaires/consignes-audibles.test.ts` ' +
      'interroge le manifeste — « la SEULE source de vérité sur l’existence d’un clip » — ' +
      'et exige 100 % des consignes livrées, avec un cas de non-vacuité. La raison v1 — ' +
      '« pas d’audio en v1 (D1), dette explicite » — est caduque : `production/voix.lock.json` ' +
      'déclare 174 clips pour 69 clés à couvrir, 0 refusé'
  ],
  [
    '9',
    'Couverture lexicale CE1',
    'la raison v1 — « aucune liste de fréquence dans le dépôt à ce stade » — est caduque : ' +
      '`LEXIQUE_CE1` de `scripts/generer-phonologie.mjs` en est une. Le contrôle reste ' +
      'désactivé faute d’un SEUIL tranché par le parent : 93,0 % des mots lus en jeu y ' +
      'figurent, et les 4 absents sont `b`, `d` (les graphèmes travaillés, D23), `gobi` ' +
      '(le personnage) et `voit` (conjugaison de `voir`, qui y figure). Refuser à 100 % ' +
      'interdirait D23 ; choisir 90 % serait inventer une loi — cela revient au parent'
  ],
  [
    '10',
    '≥ 3 moteurs par compétence (R12)',
    'mesurée ailleurs depuis la campagne v2 : `tests/unitaires/moteurs-couverture.test.ts` ' +
      'la calcule sur `contenu/exercices/**` réel et échoue si une seule compétence passe ' +
      'sous 3. La raison v1 — « un seul moteur, par construction (D1) » — est caduque : ' +
      'le registre en compte 14'
  ]
];

const problemes = [];
let nbControles = 0;

function signaler(ou, message, controle) {
  problemes.push({ ou, message: `[contrôle ${controle}] ${message}` });
}

function relatif(chemin) {
  return relative(RACINE, chemin).split(sep).join(posix.sep);
}

function lireJson(chemin) {
  return JSON.parse(readFileSync(chemin, 'utf8'));
}

function fichiers(dossier, extension, filtre = () => true) {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(extension))
    .map((e) => join(e.parentPath ?? e.path ?? dossier, e.name))
    .filter(filtre)
    .sort();
}

function fichiersJson(dossier, filtre = () => true) {
  return fichiers(dossier, '.json', filtre);
}

function terminer(statut, note) {
  ecrireEtape({
    etape: ETAPE,
    statut,
    dureeMs: Date.now() - debut,
    total: nbControles,
    echecs: problemes.length,
    details: problemes,
    note
  });
  genererRapport({ commande: 'npm run test:contenu' });

  const entete = `test:contenu — ${nbControles} contrôle(s), ${problemes.length} problème(s)`;
  console.log(entete);
  for (const p of problemes.slice(0, 30)) console.log(`  ✗ ${p.ou} : ${p.message}`);
  if (problemes.length > 30) console.log(`  … ${problemes.length - 30} autre(s)`);
  if (note) console.log(`  ${note}`);
  console.log('Rapport lisible : tests/rapports/RAPPORT.md');
  process.exit(statut === 'echec' || statut === 'environnement' ? 1 : 0);
}

// ───────────────────────────────────────────────────── prérequis : le socle est-il construit ?

let partage;
try {
  partage = await import('@pierre/partage');
} catch (erreur) {
  terminer(
    'environnement',
    '`@pierre/partage` est introuvable ou non construit. Lancer `npm install` puis ' +
      '`npm run typescript` (qui émet `partage/dist/`). Détail : ' +
      (erreur instanceof Error ? erreur.message : String(erreur))
  );
}

let validerSceneSvg;
let estCheminFerme;
try {
  ({ validerSceneSvg, estCheminFerme } = await import('@pierre/partage/validation'));
} catch (erreur) {
  terminer(
    'environnement',
    '`@pierre/partage/validation` est introuvable ou non construit — le contrôle P3.2 des ' +
      'régions fermées ne peut pas s’exécuter. Lancer `npm run typescript`. Détail : ' +
      (erreur instanceof Error ? erreur.message : String(erreur))
  );
}

let Ajv2020;
try {
  ({ default: Ajv2020 } = await import('ajv/dist/2020.js'));
} catch (erreur) {
  terminer(
    'environnement',
    'Ajv 2020 est introuvable. Lancer `npm install` à la racine. Détail : ' +
      (erreur instanceof Error ? erreur.message : String(erreur))
  );
}

if (!existsSync(DOSSIER_CONTENU)) {
  terminer('environnement', `le dossier \`contenu/\` est absent (${relatif(DOSSIER_CONTENU)}).`);
}

partage.initialiserRegistreMoteurs();

// ─────────────────────────────────────────────────────────────────── chargement des sources

const exercices = fichiersJson(join(DOSSIER_CONTENU, 'exercices')).map((chemin) => ({
  chemin,
  donnees: lireJson(chemin)
}));

const habillages = new Map();
for (const chemin of fichiersJson(join(DOSSIER_CONTENU, 'habillages'), (c) =>
  c.endsWith('.habillage.json')
)) {
  const donnees = lireJson(chemin);
  habillages.set(donnees.id, { chemin, donnees });
}

const competences = existsSync(CHEMIN_COMPETENCES) ? lireJson(CHEMIN_COMPETENCES) : null;
const codesCompetences = new Set((competences ?? []).map((c) => c.code));

if (exercices.length === 0) {
  terminer(
    'vide',
    'aucun exercice dans `contenu/exercices/` — rien à valider. Ce n’est pas une réussite, ' +
      'c’est une absence, et le rapport le dit.'
  );
}

// ─────────────────────────────────────────────────────────── contrôle 1 — schémas (2 temps)

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validerEnveloppe = existsSync(CHEMIN_SCHEMA_EXERCICE)
  ? ajv.compile(lireJson(CHEMIN_SCHEMA_EXERCICE))
  : null;

if (!validerEnveloppe) {
  signaler(relatif(CHEMIN_SCHEMA_EXERCICE), 'schéma d’enveloppe absent', 1);
}

const validateursMoteur = new Map();
function validateurDeMoteur(code) {
  if (validateursMoteur.has(code)) return validateursMoteur.get(code);
  let valideur = null;
  if (partage.estMoteurEnregistre(code)) {
    const moteur = partage.obtenirMoteur(code);
    valideur = moteur.schemaContenu ? ajv.compile(moteur.schemaContenu) : null;
  }
  validateursMoteur.set(code, valideur);
  return valideur;
}

for (const { chemin, donnees } of exercices) {
  const ou = relatif(chemin);

  // ── contrôle 1a : l'enveloppe
  nbControles += 1;
  if (validerEnveloppe && !validerEnveloppe(donnees)) {
    for (const erreur of validerEnveloppe.errors ?? []) {
      signaler(ou, `enveloppe : ${erreur.instancePath || '/'} ${erreur.message}`, 1);
    }
  }

  const moteur = donnees?.jeu?.moteur;
  const idHabillage = donnees?.jeu?.habillage;

  // ── contrôle 4 : moteur enregistré, habillage existant, couple compatible
  nbControles += 1;
  const moteurConnu = typeof moteur === 'string' && partage.estMoteurEnregistre(moteur);
  if (!moteurConnu) {
    signaler(ou, `moteur « ${moteur} » non enregistré dans le registre`, 4);
  }
  const habillage = habillages.get(idHabillage);
  if (!habillage) {
    signaler(ou, `habillage « ${idHabillage} » introuvable dans contenu/habillages/`, 4);
  } else if (!Array.isArray(habillage.donnees.moteurs) || !habillage.donnees.moteurs.includes(moteur)) {
    signaler(
      ou,
      `l’habillage « ${idHabillage} » ne déclare pas le moteur « ${moteur} » comme compatible`,
      4
    );
  }

  // ── contrôle 1b : le bloc `jeu.contenu`, validé par le schéma que le moteur publie
  nbControles += 1;
  if (moteurConnu) {
    const valideur = validateurDeMoteur(moteur);
    if (!valideur) {
      signaler(ou, `le moteur « ${moteur} » ne publie aucun \`schemaContenu\``, 1);
    } else if (!valideur(donnees.jeu.contenu)) {
      for (const erreur of valideur.errors ?? []) {
        signaler(ou, `jeu.contenu : ${erreur.instancePath || '/'} ${erreur.message}`, 1);
      }
    }
  }

  // ── contrôle 5 : compétences citées
  nbControles += 1;
  if (!competences) {
    signaler(relatif(CHEMIN_COMPETENCES), 'référentiel de compétences absent', 5);
  } else {
    for (const code of donnees.competences ?? []) {
      if (!codesCompetences.has(code)) {
        signaler(ou, `compétence « ${code} » absente du référentiel`, 5);
      }
    }
  }

  // ── contrôle 6 : cohérence des régions et règle des 64 px
  nbControles += 1;
  if (habillage) {
    const coloriables = new Map();
    for (const calque of habillage.donnees.scene?.calques ?? []) {
      if (calque.role !== 'coloriable') continue;
      for (const region of calque.regions ?? []) coloriables.set(region.id, region);
    }

    const surfaceMinimale = surfaceMinimaleViewBox(habillage.donnees.scene?.viewBox);
    const consignes = donnees.jeu?.contenu?.consignes ?? [];
    consignes.forEach((consigne, iConsigne) => {
      (consigne.cibles ?? []).forEach((cible, iCible) => {
        const pointeur = `/jeu/contenu/consignes/${iConsigne}/cibles/${iCible}`;
        const region = coloriables.get(cible.region);
        if (!region) {
          signaler(
            ou,
            `${pointeur} : région « ${cible.region} » absente des calques coloriables de ` +
              `« ${idHabillage} »`,
            6
          );
          return;
        }
        if (surfaceMinimale !== null && Number(region.surface) < surfaceMinimale) {
          signaler(
            ou,
            `${pointeur} : région « ${cible.region} » de surface ${region.surface} < ` +
              `${Math.round(surfaceMinimale)} unités viewBox, soit moins d’un carré de ` +
              `${CIBLE_MINIMALE_PX} px à l’échelle de rendu (R16)`,
            6
          );
        }
      });
    });
  }

  // ── contrôle 3 : les médias référencés existent
  nbControles += 1;
  if (habillage) {
    const fichier = habillage.donnees.scene?.fichier;
    if (typeof fichier !== 'string' || fichier.length === 0) {
      signaler(relatif(habillage.chemin), 'la scène ne déclare aucun fichier', 3);
    } else {
      const surDisque = join(DOSSIER_CONTENU, ...fichier.split('/'));
      if (!existsSync(surDisque)) {
        signaler(relatif(habillage.chemin), `média absent du disque : ${fichier}`, 3);
      }
    }
  }
}

// ────────────────────────────── contrôle P3.2 — régions fermées, sur TOUS les SVG de contenu/
//
// L'étape bloquante de l'annexe P § 3.2. Un `<path>` coloriable qui a perdu son `Z` fait
// fuiter le remplissage sur toute l'image ; rien ne le voyait avant l'enfant.
//
// Le contrôle part des SVG PRÉSENTS SUR DISQUE, pas des déclarations : recenser les fichiers
// déclarés ne dirait rien d'un fichier qui traîne sans déclaration — et un `.svg` que personne
// ne réclame est soit du contenu mort, soit une déclaration manquante. Les deux méritent
// d'être dits.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// ÉLARGI À L'INTÉGRATION DE LA CAMPAGNE v2 — deux sources de déclaration, deux contrôles.
//
// La version v1 ne connaissait qu'une source : les `*.habillage.json`. La campagne v2 ajoute
// **8 SVG qui ne sont pas des scènes d'exercice** et qu'aucun habillage ne peut donc déclarer
// — la carte du monde, le campement, les 5 stades de Gobi et son cristal (lot L2-F). Mesuré
// avant correction, sortie citée :
//
//   test:contenu — 69 contrôle(s), 8 problème(s)
//     ✗ contenu/assets/gobi/cristal-base.svg : [contrôle P3.2] aucun habillage ne déclare…
//     ✗ … 7 autres, tous du même motif
//
// Les traiter en « contenu mort » était faux : ils sont déclarés, mais dans `contenu/monde/`.
// Les faire taire aurait été pire — la carte du monde EST une scène coloriable, c'est même la
// mécanique signature du projet (v2 § 9.4).
//
// D'où deux niveaux, et aucun fichier sans contrôle :
//   1. SVG déclaré par un habillage → `validerSceneSvg`, contrôle complet (régions déclarées,
//      présentes, fermées) ;
//   2. SVG déclaré par `contenu/monde/*.json` → contrôle STRUCTUREL : tout `<path>` qui porte
//      un remplissage doit être fermé. C'est exactement le risque de l'annexe P § 3.2, et il
//      ne demande aucune liste de régions ;
//   3. SVG déclaré nulle part → toujours signalé comme avant.
// ─────────────────────────────────────────────────────────────────────────────────────────

const svgParChemin = new Map();
for (const { chemin, donnees } of habillages.values()) {
  const fichier = donnees.scene?.fichier;
  if (typeof fichier !== 'string' || fichier.length === 0) continue;
  svgParChemin.set(join(DOSSIER_CONTENU, ...fichier.split('/')), { chemin, donnees });
}

/**
 * Les SVG déclarés par les documents de `contenu/monde/` : `scene.fichier` pour la carte et
 * le campement, `asset` pour les stades de Gobi et les compagnons. On parcourt le document en
 * profondeur plutôt que de nommer les clés une à une : une clé nouvelle serait sinon un
 * fichier redevenu invisible, en silence.
 */
const svgDuMonde = new Map();
for (const cheminDoc of fichiersJson(join(DOSSIER_CONTENU, 'monde'))) {
  const donnees = lireJson(cheminDoc);
  const pile = [donnees];
  while (pile.length > 0) {
    const noeud = pile.pop();
    if (Array.isArray(noeud)) {
      pile.push(...noeud);
    } else if (noeud && typeof noeud === 'object') {
      pile.push(...Object.values(noeud));
    } else if (typeof noeud === 'string' && noeud.endsWith('.svg')) {
      svgDuMonde.set(join(DOSSIER_CONTENU, ...noeud.split('/')), cheminDoc);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// TROISIÈME SOURCE DE DÉCLARATION — `contenu/registre-svg.json` (lot A3).
//
// Mesuré avant ce lot, sortie citée :
//
//   $ npm run test:contenu
//   test:contenu — 167 contrôle(s), 14 problème(s)
//     ✗ contenu/assets/gobi/animation/{aide,apparition,hesitation,joie,repos}.svg   (5)
//     ✗ contenu/assets/gobi/{cristal-base,stade-1-oeuf…stade-5-gardien}.svg         (6)
//     ✗ contenu/habillages/{carte/carte-monde,clairiere/ecole,galeries/grottes}.svg (3)
//     … 80/94 SVG contrôlés en régions fermées
//
// Quatorze fichiers, un seul motif : « aucun habillage ni document de `contenu/monde/` ne
// déclare ce SVG ». Le contrôle avait raison de les dire ; il n'offrait AUCUNE sortie autre
// que la suppression, et **le père seul décide de ce qui part**. Un contrôle dont la seule
// issue est interdite finit désactivé — c'est ainsi qu'un garde-fou meurt.
//
// Le registre donne les deux issues manquantes, et **il est plus strict que l'anomalie qu'il
// éteint** : on n'y entre qu'en payant une obligation mécanique, vérifiée plus bas.
//   • `declaresParLeCode` — le fichier est vivant, du code le nomme. `cristal-base.svg` est le
//     repli de `lireFormes` (serveur/src/depots/monde.ts) : il n'a jamais été mort, il était
//     déclaré au mauvais endroit. « Un décor déclaré dans du code n'est pas déclaré »
//     (contenu/schemas/monde.schema.json) : on le déclare ici, on ne le cache pas.
//   • `archives` — le fichier est REMPLACÉ, et l'entrée nomme son successeur. Interdit d'y
//     ranger un orphelin neuf : archiver, c'est nommer ce qui a pris la place.
//
// Les deux listes subissent le MÊME contrôle structurel de régions fermées que les SVG du
// monde. Un archivé n'est pas dispensé de lisibilité : `carte-monde.svg` et `ecole.svg`
// servent encore de référence à cinq suites de tests.
// ─────────────────────────────────────────────────────────────────────────────────────────

const registre = existsSync(CHEMIN_REGISTRE_SVG) ? lireJson(CHEMIN_REGISTRE_SVG) : null;

nbControles += 1;
if (registre === null) {
  signaler(
    relatif(CHEMIN_REGISTRE_SVG),
    'registre des SVG hors habillage absent : sans lui, tout asset nommé par le code seul ' +
      'redevient « contenu mort » et la seule issue offerte est la suppression.',
    'P3.2'
  );
} else if (existsSync(CHEMIN_SCHEMA_REGISTRE)) {
  const validerRegistre = ajv.compile(lireJson(CHEMIN_SCHEMA_REGISTRE));
  if (!validerRegistre(registre)) {
    for (const erreur of validerRegistre.errors ?? []) {
      signaler(relatif(CHEMIN_REGISTRE_SVG), `${erreur.instancePath || '/'} ${erreur.message}`, 'P3.2');
    }
  }
} else {
  signaler(relatif(CHEMIN_SCHEMA_REGISTRE), 'schéma du registre des SVG absent', 'P3.2');
}

const entreesDeclarees = Array.isArray(registre?.declaresParLeCode)
  ? registre.declaresParLeCode
  : [];
const entreesArchivees = Array.isArray(registre?.archives) ? registre.archives : [];

/** `chemin absolu du .svg` → l'entrée de registre qui le porte, et sa liste d'origine. */
const svgDuRegistre = new Map();
for (const entree of entreesDeclarees) {
  svgDuRegistre.set(join(DOSSIER_CONTENU, ...String(entree.fichier).split('/')), {
    entree,
    liste: 'declaresParLeCode'
  });
}
for (const entree of entreesArchivees) {
  const cle = join(DOSSIER_CONTENU, ...String(entree.fichier).split('/'));
  const deja = svgDuRegistre.get(cle);
  if (deja !== undefined) {
    signaler(
      relatif(CHEMIN_REGISTRE_SVG),
      `« ${entree.fichier} » figure à la fois dans \`declaresParLeCode\` et dans ` +
        '`archives` : un asset est vivant OU remplacé, jamais les deux. Le registre ' +
        'contredirait le code qu’il prétend documenter.',
      'P3.2'
    );
    continue;
  }
  svgDuRegistre.set(cle, { entree, liste: 'archives' });
}

const tousLesSvg = fichiers(DOSSIER_CONTENU, '.svg');
let nbSvgControles = 0;

for (const cheminSvg of tousLesSvg) {
  nbControles += 1;
  const ou = relatif(cheminSvg);
  const habillage = svgParChemin.get(cheminSvg);

  if (habillage) {
    nbSvgControles += 1;
    const rapportSvg = validerSceneSvg(readFileSync(cheminSvg, 'utf8'), habillage.donnees);
    for (const probleme of rapportSvg.problemes) {
      signaler(ou, `${probleme.chemin} : ${probleme.message} [${probleme.regle}]`, 'P3.2');
    }
    continue;
  }

  const declarePar = svgDuMonde.get(cheminSvg);
  const auRegistre = svgDuRegistre.get(cheminSvg);

  if (declarePar === undefined && auRegistre === undefined) {
    signaler(
      ou,
      'aucun habillage, aucun document de `contenu/monde/` et aucune entrée de ' +
        '`contenu/registre-svg.json` ne déclare ce SVG : ses régions ne peuvent être ni ' +
        'contrôlées, ni jouées. Contenu mort, ou déclaration manquante. Deux issues, jamais ' +
        'la suppression : le déclarer là où il est joué, ou l’inscrire au registre — vivant ' +
        'avec le code qui le nomme, ou archivé avec le fichier qui l’a remplacé.',
      'P3.2'
    );
    continue;
  }

  // Le registre ne doit JAMAIS masquer une vraie déclaration : si l'asset a retrouvé un
  // habillage ou un document du monde, son entrée est périmée et doit disparaître. Sans ce
  // contrôle, un fichier archivé puis remis en service resterait « archivé » pour toujours.
  if (declarePar !== undefined && auRegistre !== undefined) {
    signaler(
      ou,
      `déclaré par ${relatif(declarePar)} ET inscrit au registre (\`${auRegistre.liste}\`) : ` +
        'le registre ne vaut que pour ce qu’aucune déclaration de contenu ne porte. Retirer ' +
        'l’entrée du registre.',
      'P3.2'
    );
  }

  nbSvgControles += 1;
  const fautifs = cheminsRemplisNonFermes(readFileSync(cheminSvg, 'utf8'), estCheminFerme);
  if (fautifs.length > 0) {
    const source =
      declarePar !== undefined
        ? `déclaré par ${relatif(declarePar)}`
        : `inscrit au registre (\`${auRegistre.liste}\`)`;
    signaler(
      ou,
      `${source} — ${fautifs.length} tracé(s) rempli(s) et NON fermé(s) : ` +
        `${fautifs.join(', ')}. Le remplissage fuit sur toute l'image (annexe P § 3.2).`,
      'P3.2'
    );
  }
}

// ── Le registre lui-même est contrôlé, entrée par entrée. Sans cela il ne serait qu'une
//    liste de silences : il suffirait d'y écrire un nom pour éteindre une anomalie.

/** Un chemin d'asset est-il porté par une déclaration de contenu, ou par un asset vivant ? */
function estDeclareVivant(cheminRelatifContenu) {
  const absolu = join(DOSSIER_CONTENU, ...String(cheminRelatifContenu).split('/'));
  if (svgParChemin.has(absolu) || svgDuMonde.has(absolu)) return true;
  return svgDuRegistre.get(absolu)?.liste === 'declaresParLeCode';
}

for (const entree of entreesDeclarees) {
  nbControles += 1;
  const absolu = join(DOSSIER_CONTENU, ...String(entree.fichier).split('/'));
  if (!existsSync(absolu)) {
    signaler(
      relatif(CHEMIN_REGISTRE_SVG),
      `\`declaresParLeCode\` cite « ${entree.fichier} », absent du disque. Une entrée qui ne ` +
        'désigne plus rien est un registre qui pourrit : la corriger ou la retirer.',
      'P3.2'
    );
    continue;
  }
  const source = join(RACINE, ...String(entree.consommateur).split('/'));
  if (!existsSync(source)) {
    signaler(
      relatif(CHEMIN_REGISTRE_SVG),
      `« ${entree.fichier} » se dit consommé par « ${entree.consommateur} », qui n’existe ` +
        'pas. L’asset n’a donc aucun propriétaire : ce n’est pas une déclaration, c’est une ' +
        'affirmation.',
      'P3.2'
    );
    continue;
  }
  if (!readFileSync(source, 'utf8').includes(String(entree.symbole))) {
    signaler(
      relatif(CHEMIN_REGISTRE_SVG),
      `« ${entree.consommateur} » ne contient nulle part « ${entree.symbole} », que le ` +
        `registre lui prête pour « ${entree.fichier} ». Le lien entre le dessin et le code ` +
        'est rompu — renommé d’un côté, pas de l’autre.',
      'P3.2'
    );
  }
}

for (const entree of entreesArchivees) {
  nbControles += 1;
  const absolu = join(DOSSIER_CONTENU, ...String(entree.fichier).split('/'));
  if (!existsSync(absolu)) {
    signaler(
      relatif(CHEMIN_REGISTRE_SVG),
      `\`archives\` cite « ${entree.fichier} », absent du disque. **Aucun lot ne supprime un ` +
        'fichier de contenu** : soit il a été renommé et l’entrée doit suivre, soit une ' +
        'suppression a eu lieu et elle doit être signalée au père.',
      'P3.2'
    );
    continue;
  }
  const successeur = join(DOSSIER_CONTENU, ...String(entree.remplacePar).split('/'));
  if (!existsSync(successeur)) {
    signaler(
      relatif(CHEMIN_REGISTRE_SVG),
      `« ${entree.fichier} » est archivé au profit de « ${entree.remplacePar} », qui n’existe ` +
        'pas. On n’archive pas contre un fichier absent : ce serait ranger un orphelin.',
      'P3.2'
    );
    continue;
  }
  if (!estDeclareVivant(entree.remplacePar)) {
    signaler(
      relatif(CHEMIN_REGISTRE_SVG),
      `« ${entree.fichier} » est archivé au profit de « ${entree.remplacePar} », que rien ne ` +
        'déclare — ni habillage, ni `contenu/monde/`, ni `declaresParLeCode`. Le successeur ' +
        'serait alors lui-même un orphelin, et le registre aurait servi à masquer deux ' +
        'fichiers au lieu d’un.',
      'P3.2'
    );
  }
  for (const lecteur of entree.encoreLuPar ?? []) {
    const cheminLecteur = join(RACINE, ...String(lecteur).split('/'));
    const nom = String(entree.fichier).split('/').pop();
    if (!existsSync(cheminLecteur)) {
      signaler(
        relatif(CHEMIN_REGISTRE_SVG),
        `« ${entree.fichier} » se dit encore lu par « ${lecteur} », qui n’existe pas.`,
        'P3.2'
      );
    } else if (!readFileSync(cheminLecteur, 'utf8').includes(nom)) {
      signaler(
        relatif(CHEMIN_REGISTRE_SVG),
        `« ${lecteur} » ne cite plus « ${nom} » : l’archive a perdu ce lecteur, et le ` +
          'registre annonce une dépendance qui n’existe plus.',
        'P3.2'
      );
    }
  }
}

// ─────────────────────────────────────────────────────── contrôle 2 — unicité des `id`

nbControles += 1;
const vus = new Map();
for (const { chemin, donnees } of exercices) {
  const id = donnees?.id;
  if (vus.has(id)) {
    signaler(relatif(chemin), `identifiant « ${id} » déjà porté par ${relatif(vus.get(id))}`, 2);
  } else {
    vus.set(id, chemin);
  }
}

// ──────────── contrôle M6.2 — `regions.json` × `contenu/noeuds/**`, les DEUX populations
//
// « `noeuds` ne cite que des nœuds réellement livrés : c'est lui qui fait le pourcentage de
// recoloration » — `contenu/monde/regions.json` le dit de lui-même. Un nœud livré et non cité
// est invisible sur la carte ; un nœud cité et non livré rend la région à jamais incomplète.
// Aucune relecture d'un seul fichier ne peut le voir : les deux côtés sont cohérents avec
// eux-mêmes, et c'est leur ÉCART qui ment. D'où un croisement, et non une lecture.
//
// La règle qui commande : on énumère les OBJETS des deux côtés — les fichiers de nœud, les
// entrées des tableaux `noeuds` — jamais les occurrences d'un identifiant. Un `grep` rendait
// le même nombre de lignes avant et après le défaut.

const CHEMIN_REGIONS = join(DOSSIER_CONTENU, 'monde', 'regions.json');
let resumeCroisement = 'contrôle M6.2 non exécuté';
let resumePrerequis = 'contrôle 7 non exécuté';

nbControles += 1;
if (!existsSync(CHEMIN_REGIONS)) {
  signaler(
    relatif(CHEMIN_REGIONS),
    'le document des régions est absent : la carte n’a aucune source de nœuds, et le ' +
      'pourcentage de recoloration ne peut pas être calculé.',
    'M6.2'
  );
} else {
  const croisement = croiserNoeudsEtRegions({
    documentRegions: lireJson(CHEMIN_REGIONS),
    noeuds: fichiersJson(join(DOSSIER_CONTENU, 'noeuds')).map((chemin) => ({
      chemin: relatif(chemin),
      donnees: lireJson(chemin)
    })),
    exercices: new Set(exercices.map(({ donnees }) => String(donnees?.id)))
  });

  for (const anomalie of croisement.anomalies) {
    signaler(anomalie.ou, `${anomalie.message} [${anomalie.regle}]`, 'M6.2');
  }
  resumeCroisement = resumerCroisement(croisement);
}

// ───────────────── contrôle 7 — le graphe de prérequis, RÉVEILLÉ (il dormait sur une raison fausse)
//
// Il figurait parmi les DÉSACTIVÉS, avec pour raison « un seul nœud en v1, aucun prérequis
// (D1) ». Mesuré à l'intégration : **18 nœuds livrés, 17 portent un prérequis**. La raison
// était caduque, et le contrôle dormait sur un graphe réel — même motif que les SVG du lot A3.
//
// Le croisement vit dans `scripts/verifier-prerequis.mjs`, PUR, pour qu'on puisse lui
// soumettre un graphe cassé et exiger qu'il le refuse : `tests/unitaires/prerequis-noeuds.test.ts`
// lui donne un cycle, un prérequis inconnu et un dépôt sans porte d'entrée. Un garde qu'on n'a
// jamais vu se déclencher n'est pas un garde.

nbControles += 1;
{
  const rapport = croiserPrerequis(
    fichiersJson(join(DOSSIER_CONTENU, 'noeuds')).map((chemin) => ({
      chemin: relatif(chemin),
      donnees: lireJson(chemin)
    }))
  );
  for (const anomalie of rapport.anomalies) {
    signaler(anomalie.ou, `${anomalie.message} [${anomalie.regle}]`, 7);
  }
  resumePrerequis = resumerPrerequis(rapport);
}

// ─────────────────────────────────────────────────────────────────────────── utilitaires

/**
 * Surface minimale, en unités `viewBox`, qu'une région doit avoir pour qu'un carré de 64 px
 * CSS tienne dedans à l'échelle où la scène est réellement rendue.
 */
function surfaceMinimaleViewBox(viewBox) {
  if (typeof viewBox !== 'string') return null;
  const [, , largeur, hauteur] = viewBox.trim().split(/\s+/).map(Number);
  if (!Number.isFinite(largeur) || !Number.isFinite(hauteur) || largeur <= 0 || hauteur <= 0) {
    return null;
  }
  const echelle = Math.min(
    GABARIT.largeur / largeur,
    (GABARIT.hauteur - GABARIT.bandeReserveePx) / hauteur
  );
  const coteEnUnites = CIBLE_MINIMALE_PX / echelle;
  return coteEnUnites * coteEnUnites;
}

// ────────────────────────────────────────────────────────────────────────────── verdict

const note =
  `${exercices.length} exercice(s), ${habillages.size} habillage(s), ` +
  `${nbSvgControles}/${tousLesSvg.length} SVG contrôlés en régions fermées (annexe P § 3.2), ` +
  `dont ${entreesDeclarees.length} vivant(s) déclaré(s) par le code et ` +
  `${entreesArchivees.length} archivé(s) — `+
  `contenu/registre-svg.json, aucun fichier supprimé. ` +
  `Carte (M6.2) : ${resumeCroisement}. ` +
  `${resumePrerequis} ` +
  `Contrôles désactivés en v1, avec leur raison (contrat § 9.8) : ` +
  controlesDesactives.map(([n, quoi, pourquoi]) => `#${n} ${quoi} — ${pourquoi}`).join(' ; ') +
  '.';

terminer(problemes.length === 0 ? 'reussite' : 'echec', note);
