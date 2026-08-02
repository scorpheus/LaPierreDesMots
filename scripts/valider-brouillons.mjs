/**
 * `node scripts/valider-brouillons.mjs` — la porte entre le brouillon et l'enfant. Lot N8.
 *
 * CLAUDE.md, règle non négociable : « Aucun texte français destiné à l'enfant sans
 * vérification de couverture lexicale CE1. » Cette phrase n'avait aucune mécanique : mesuré au
 * gel du contrat de finition, le contrôle 9 de `scripts/test-contenu.mjs` est DÉSACTIVÉ avec
 * pour raison « aucune liste de fréquence dans le dépôt à ce stade ». Ce script est la liste,
 * et le contrôle.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * IL AUDITE DES OBJETS, PAS DES OCCURRENCES.
 *
 * Il n'énumère pas les endroits où le mot « mot » apparaît : il énumère **les objets qui
 * doivent porter du vocabulaire** — chaque brouillon de phonologie, chaque consigne
 * d'exercice, chaque libellé de cible, chaque étiquette, chaque option — et il demande à
 * chacun s'il tient. Une propriété absente est une propriété manquante, pas une occurrence de
 * moins.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * IL REFUSE, IL NE CORRIGE PAS.
 *
 * Sortie 1 dès le premier mot hors lexique. Corriger automatiquement un texte destiné à un
 * enfant de sept ans, ce serait décider à la place de l'adulte qui relit ; et un script qui
 * réécrit le contenu qu'il valide ne valide plus rien.
 *
 * `contenu/brouillons/` est ignoré par git (mesuré : `.gitignore`, ligne « contenu/brouillons/* »).
 * Son absence n'est donc PAS un échec — c'est un dépôt fraîchement cloné, et le script le dit
 * au lieu de rendre un faux vert. En revanche, `contenu/exercices/` est versionné : lui est
 * toujours contrôlé, et c'est celui-là qui atteint l'enfant.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';

import { LEXIQUE_CE1, RACINE, estAuLexique, normaliser } from './generer-phonologie.mjs';

const DOSSIER_PHONOLOGIE = join(RACINE, 'contenu', 'brouillons', 'phonologie');
const DOSSIER_EXERCICES = join(RACINE, 'contenu', 'exercices');

/**
 * Les mots que le lexique CE1 n'a pas à porter : noms propres du monde du jeu et vocabulaire
 * de l'interface. Ils sont ÉNUMÉRÉS ici plutôt que devinés par une heuristique — une règle du
 * genre « les mots capitalisés passent » laisserait entrer n'importe quoi.
 */
const HORS_LEXIQUE_ADMIS = new Set(
  ['gobi', 'filou', 'bulle', 'roc', 'plume', 'clairiere', 'galeries', 'pierre'].map(normaliser),
);

const problemes = [];
let objetsAudites = 0;
let motsAudites = 0;

function signaler(ou, message) {
  problemes.push({ ou, message });
}

function relatif(absolu) {
  return relative(RACINE, absolu).split(sep).join(posix.sep);
}

function lireJson(chemin) {
  return JSON.parse(readFileSync(chemin, 'utf8'));
}

function fichiersJson(dossier) {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => join(e.parentPath ?? dossier, e.name))
    .sort();
}

/**
 * Les mots d'un texte français, tels qu'un enfant les lit : l'apostrophe coupe (« l'école »
 * donne « école »), le trait d'union aussi, la ponctuation disparaît.
 */
export function motsDuTexte(texte) {
  return texte
    .split(/[^A-Za-zÀ-ÖØ-öø-ÿ]+/u)
    .map((mot) => mot.trim())
    // Une lettre seule est une élision — le `l` de « l'école », le `d` de « d'abord ». Ce
    // n'est pas un mot de vocabulaire, et l'exiger au lexique refuserait toute apostrophe.
    .filter((mot) => mot.length > 1);
}

/** Contrôle un objet porteur de texte. Rend le nombre de mots hors lexique. */
function auditerTexte(ou, champ, texte) {
  objetsAudites += 1;
  let hors = 0;
  for (const mot of motsDuTexte(texte)) {
    motsAudites += 1;
    if (estAuLexique(mot) || HORS_LEXIQUE_ADMIS.has(normaliser(mot))) continue;
    hors += 1;
    signaler(ou, `${champ} : « ${mot} » est hors du lexique CE1 (${String(LEXIQUE_CE1.length)} mots)`);
  }
  return hors;
}

// ──────────────────────────────────────────────────────── 1. les brouillons de phonologie

const brouillons = fichiersJson(DOSSIER_PHONOLOGIE);

for (const chemin of brouillons) {
  const ou = relatif(chemin);
  const donnees = lireJson(chemin);

  objetsAudites += 1;
  if (donnees.statut !== 'brouillon-non-jouable') {
    signaler(ou, `statut « ${String(donnees.statut)} » : un brouillon n'est jamais jouable tel quel`);
  }
  if (!Array.isArray(donnees.aFaireALaMain) || donnees.aFaireALaMain.length === 0) {
    signaler(ou, 'aucun reste à faire : sans relecture parent, ce serait un exercice, pas un brouillon');
  }

  // `natureDesFormes` dit ce que le brouillon porte : des graphèmes, des syllabes ou des
  // MOTS. Seuls les mots vont au lexique — « mi », « pa », « fé » sont des syllabes justes et
  // ne seront jamais dans une liste de vocabulaire. Sans ce champ déclaré, le contrôle
  // n'aurait que deux issues, toutes deux fausses : refuser 50 syllabes correctes, ou laisser
  // passer n'importe quelle suite de lettres sous prétexte qu'elle est courte.
  const nature = donnees.natureDesFormes;
  if (!['grapheme', 'syllabe', 'mot'].includes(nature)) {
    signaler(ou, `natureDesFormes « ${String(nature)} » : le brouillon ne dit pas ce qu'il porte`);
  }

  if (nature === 'mot') {
    for (const item of donnees.items ?? []) {
      if (typeof item.forme === 'string') auditerMot(ou, 'items.forme', item.forme);
    }
  }
  // Les mots d'exemple, eux, sont TOUJOURS des mots — quelle que soit la nature des formes.
  for (const item of donnees.items ?? []) {
    for (const mot of item.motsExemples ?? []) auditerMot(ou, 'motsExemples', mot);
    for (const mot of item.motsA ?? []) auditerMot(ou, 'items.motsA', mot);
    for (const mot of item.motsB ?? []) auditerMot(ou, 'items.motsB', mot);
  }
  for (const mot of donnees.motsA ?? []) auditerMot(ou, 'motsA', mot);
  for (const mot of donnees.motsB ?? []) auditerMot(ou, 'motsB', mot);
  for (const paire of donnees.paires ?? []) {
    auditerMot(ou, 'paires.a', paire.a);
    auditerMot(ou, 'paires.b', paire.b);
  }
}

/** Un mot isolé, confronté au lexique. C'est l'unité auditée : un objet, pas une occurrence. */
function auditerMot(ou, champ, mot) {
  if (typeof mot !== 'string' || mot.length === 0) return;
  objetsAudites += 1;
  motsAudites += 1;
  if (estAuLexique(mot) || HORS_LEXIQUE_ADMIS.has(normaliser(mot))) return;
  signaler(ou, `${champ} : « ${mot} » est hors du lexique CE1 (${String(LEXIQUE_CE1.length)} mots)`);
}

// ─────────────────────────────────────────── 2. les exercices livrés — eux atteignent l'enfant

const exercices = fichiersJson(DOSSIER_EXERCICES);

for (const chemin of exercices) {
  const ou = relatif(chemin);
  const exercice = lireJson(chemin);
  const contenu = exercice?.jeu?.contenu ?? {};

  for (const consigne of contenu.consignes ?? []) {
    if (typeof consigne.texte === 'string') auditerTexte(ou, `consigne ${String(consigne.id)}`, consigne.texte);
    if (typeof consigne.phrase === 'string') auditerTexte(ou, `phrase ${String(consigne.id)}`, consigne.phrase);
    if (typeof consigne.recit === 'string') auditerTexte(ou, `récit ${String(consigne.id)}`, consigne.recit);
    if (typeof consigne.mot === 'string') auditerTexte(ou, `mot ${String(consigne.id)}`, consigne.mot);
  }
  for (const cle of ['cibles', 'options', 'elements', 'blocs', 'etiquettes', 'cartes', 'vignettes', 'reserve', 'receptacles', 'cases']) {
    for (const item of contenu[cle] ?? []) {
      if (typeof item.libelle === 'string') auditerTexte(ou, `${cle}.${String(item.id)}`, item.libelle);
      if (typeof item.mot === 'string') auditerTexte(ou, `${cle}.${String(item.id)}`, item.mot);
    }
  }
  if (typeof contenu.recit === 'string') auditerTexte(ou, 'récit', contenu.recit);
  for (const question of contenu.questions ?? []) {
    if (typeof question.texte === 'string') auditerTexte(ou, `question ${String(question.id)}`, question.texte);
  }
}

// ────────────────────────────────────────────────────────────────────────── le verdict

const entete =
  `valider-brouillons — ${String(brouillons.length)} brouillon(s) de phonologie, ` +
  `${String(exercices.length)} exercice(s), ${String(objetsAudites)} objet(s) audité(s), ` +
  `${String(motsAudites)} mot(s) confronté(s) au lexique de ${String(LEXIQUE_CE1.length)} mots`;

console.log(entete);

if (brouillons.length === 0) {
  console.log(
    '  contenu/brouillons/phonologie/ est absent — dépôt fraîchement cloné (le dossier est ' +
    'ignoré par git). Lancer `node scripts/generer-phonologie.mjs`. Ce n’est pas un échec.',
  );
}

if (problemes.length > 0) {
  console.error(`REFUS — ${String(problemes.length)} problème(s) :`);
  for (const p of problemes.slice(0, 40)) console.error(`  ✗ ${p.ou} : ${p.message}`);
  if (problemes.length > 40) console.error(`  … ${String(problemes.length - 40)} autre(s)`);
  console.error(
    'Un mot hors lexique n’est pas corrigé ici : il est refusé. L’adulte qui relit décide, ' +
    'soit d’inscrire le mot au lexique de scripts/generer-phonologie.mjs, soit de le retirer.',
  );
  process.exit(1);
}

console.log('  aucun mot hors lexique. Le contenu peut être relu par le parent.');
