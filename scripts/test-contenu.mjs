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
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

import { RACINE, ecrireEtape, genererRapport } from './rapport.mjs';
import { cheminsRemplisNonFermes } from './svg-remplissage.mjs';

const ETAPE = 'test:contenu';
const debut = Date.now();

const DOSSIER_CONTENU = join(RACINE, 'contenu');
const CHEMIN_SCHEMA_EXERCICE = join(DOSSIER_CONTENU, 'schemas', 'exercice.schema.json');
const CHEMIN_COMPETENCES = join(DOSSIER_CONTENU, 'referentiel', 'competences.json');

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
  ['7', 'Graphe de prérequis acyclique', 'un seul nœud en v1, aucun prérequis (D1)'],
  ['8', 'Audio pré-rendu par consigne (R15)', 'pas d’audio en v1 (D1) — dette explicite, écart n° 4'],
  ['9', 'Couverture lexicale CE1', 'aucune liste de fréquence dans le dépôt à ce stade'],
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
  if (declarePar === undefined) {
    signaler(
      ou,
      'aucun habillage ni document de `contenu/monde/` ne déclare ce SVG : ses régions ne ' +
        'peuvent être ni contrôlées, ni jouées. Contenu mort, ou déclaration manquante.',
      'P3.2'
    );
    continue;
  }

  nbSvgControles += 1;
  const fautifs = cheminsRemplisNonFermes(readFileSync(cheminSvg, 'utf8'), estCheminFerme);
  if (fautifs.length > 0) {
    signaler(
      ou,
      `déclaré par ${relatif(declarePar)} — ${fautifs.length} tracé(s) rempli(s) et NON ` +
        `fermé(s) : ${fautifs.join(', ')}. Le remplissage fuit sur toute l'image ` +
        '(annexe P § 3.2).',
      'P3.2'
    );
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
  `${nbSvgControles}/${tousLesSvg.length} SVG contrôlés en régions fermées (annexe P § 3.2). ` +
  `Contrôles désactivés en v1, avec leur raison (contrat § 9.8) : ` +
  controlesDesactives.map(([n, quoi, pourquoi]) => `#${n} ${quoi} — ${pourquoi}`).join(' ; ') +
  '.';

terminer(problemes.length === 0 ? 'reussite' : 'echec', note);
