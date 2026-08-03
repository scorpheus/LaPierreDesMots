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
  // `blocs` est ABSENT de cette liste, et c'est un contrôle DÉPLACÉ, jamais retiré : il est
  // repris plus bas, en plus strict. Voir le bloc « les syllabes du moteur assemble ».
  for (const cle of ['cibles', 'options', 'elements', 'etiquettes', 'cartes', 'vignettes', 'reserve', 'receptacles', 'cases']) {
    for (const item of contenu[cle] ?? []) {
      if (typeof item.libelle === 'string') auditerTexte(ou, `${cle}.${String(item.id)}`, item.libelle);
      if (typeof item.mot === 'string') auditerTexte(ou, `${cle}.${String(item.id)}`, item.mot);
    }
  }

  // ───────────────────────────────── les syllabes du moteur `assemble` — lot M1
  //
  // CE N'EST PAS UNE EXEMPTION, C'EST LA CORRECTION D'UNE ERREUR DE CATÉGORIE.
  //
  // Mesuré au gel du lot M1, sortie citée :
  //
  //   $ node scripts/valider-brouillons.mjs
  //   REFUS — 13 problème(s) :
  //     ✗ …/stalagmites-assemble-01.json : blocs.bloc-do : « do » est hors du lexique CE1
  //     ✗ … 8 autres, tous des syllabes du même fichier
  //
  // Neuf refus sur treize portaient sur des syllabes. Un bloc du moteur `assemble` porte une
  // SYLLABE — « mi », « pa », « jar » — et une syllabe n'est jamais dans une liste de
  // vocabulaire. Ce script le dit déjà lui-même, mot pour mot, pour les brouillons de
  // phonologie : « Sans ce champ déclaré, le contrôle n'aurait que deux issues, toutes deux
  // fausses : refuser 50 syllabes correctes, ou laisser passer n'importe quelle suite de
  // lettres ». Il avait `natureDesFormes` pour trancher côté brouillon, et RIEN côté exercice.
  // Conséquence mécanique : AUCUN exercice `assemble` ne pouvait franchir cette porte, quel
  // que soit son contenu. C'est pourquoi le seul qui existait la faisait rougir depuis son
  // écriture, et pourquoi la porte rendait déjà un REFUS sur le dépôt livré.
  //
  // La troisième issue est celle-ci, et elle est PLUS STRICTE que le contrôle qu'elle
  // remplace, pas moins :
  //   • le `mot` de chaque consigne reste confronté au lexique — il l'est déjà par la boucle
  //     des consignes, et c'est LUI le mot de vocabulaire ;
  //   • les syllabes de la solution doivent RECOMPOSER ce mot, à l'accent près. Le contrôle
  //     d'origine ne le faisait pas : « do » + « mi » + « no » aurait pu écrire « domi » sans
  //     que rien ne le voie ;
  //   • deux blocs ne peuvent pas porter le même libellé — un doublon ferait payer à l'enfant
  //     une erreur qu'il n'a pas commise, `bloc-hors-ordre` comptant une erreur ;
  //   • un bloc ne porte que des lettres : ni chiffre, ni espace, ni ponctuation. C'est ce qui
  //     ferme la seconde issue fausse que le commentaire d'origine redoutait — « laisser
  //     passer n'importe quelle suite de lettres » n'est plus possible, puisque la suite doit
  //     recomposer un mot du lexique.
  if (exercice?.jeu?.moteur === 'assemble') {
    const parId = new Map((contenu.blocs ?? []).map((b) => [String(b.id), b]));

    const vus = new Map();
    for (const bloc of contenu.blocs ?? []) {
      objetsAudites += 1;
      const libelle = String(bloc.libelle ?? '');
      if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]+$/u.test(libelle)) {
        signaler(ou, `blocs.${String(bloc.id)} : « ${libelle} » n'est pas une syllabe (lettres seules attendues)`);
      }
      const cle = normaliser(libelle);
      if (vus.has(cle)) {
        signaler(
          ou,
          `blocs.${String(bloc.id)} : le libellé « ${libelle} » est déjà porté par ` +
            `« ${String(vus.get(cle))} ». Deux tuiles identiques font payer à l'enfant une ` +
            "erreur qu'il n'a pas commise : `bloc-hors-ordre` compte une erreur.",
        );
      }
      vus.set(cle, bloc.id);
    }

    for (const consigne of contenu.consignes ?? []) {
      objetsAudites += 1;
      const manquants = (consigne.solution ?? []).filter((id) => !parId.has(String(id)));
      if (manquants.length > 0) {
        signaler(ou, `consigne ${String(consigne.id)} : bloc(s) inconnu(s) ${manquants.join(', ')}`);
        continue;
      }
      const recompose = (consigne.solution ?? [])
        .map((id) => String(parId.get(String(id)).libelle))
        .join('');
      if (normaliser(recompose) !== normaliser(String(consigne.mot ?? ''))) {
        signaler(
          ou,
          `consigne ${String(consigne.id)} : les syllabes de la solution écrivent ` +
            `« ${recompose} », pas « ${String(consigne.mot)} ». Un exercice qui n'écrit pas le ` +
            'mot annoncé est un exercice qu\'aucune réponse ne termine.',
        );
      }
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
