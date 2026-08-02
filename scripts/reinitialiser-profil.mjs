/**
 * `npm run profil:reinitialiser -- <prénom>` — lot H2, point 4.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE COMMANDE EXISTE, ALORS QUE LA ZONE PARENT SAIT DÉJÀ LE FAIRE
 *
 * Parce que l'interface elle-même peut être bloquée — **et elle vient de l'être**. Le
 * 2026-08-02, deux régions figées à 100 % ont rendu la carte entièrement non cliquable : plus
 * un seul monde à toucher, donc plus un seul chemin vers quoi que ce soit. Une remise à zéro
 * qui n'existerait que derrière un écran serait exactement la porte fermée à clé dont la clé
 * est à l'intérieur.
 *
 * Cette commande ne passe donc **ni par le serveur, ni par le réseau, ni par le navigateur**.
 * Elle ouvre la base et appelle le MÊME service que la route — jamais une seconde implantation
 * de l'effacement, qui dériverait de la première au premier changement.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * LA SAUVEGARDE EST OBLIGATOIRE ET N'EST PAS UNE OPTION
 *
 * Aucun drapeau ne la désactive. Une sauvegarde inutile ne coûte rien ; une progression perdue
 * ne se retrouve pas. Elle est écrite par `VACUUM INTO` — un fichier unique et consolidé, WAL
 * compris — dans `donnees/sauvegardes/`, et son chemin est imprimé AVANT le premier effacement.
 * Si la sauvegarde échoue, la commande s'arrête et n'efface rien.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *
 * Usage :
 *   npm run profil:reinitialiser -- --lister
 *   npm run profil:reinitialiser -- Ezékiel                    (aperçu, n'efface rien)
 *   npm run profil:reinitialiser -- Ezékiel --progression --confirmer
 *   npm run profil:reinitialiser -- Ezékiel --complete --confirmer
 *
 * **Sans `--confirmer`, rien n'est effacé.** La commande affiche ce qu'elle ferait, table par
 * table, et s'arrête. C'est la transposition à la ligne de commande de la confirmation
 * explicite de l'écran : un geste irréversible sur les données d'un enfant ne se déclenche
 * jamais du premier coup, ni à l'écran par un tap distrait, ni ici par une flèche haute.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import { RACINE } from './rapport.mjs';

const CHEMIN_BASE = process.env['PIERRE_BASE'] ?? join(RACINE, 'donnees', 'pierre.db');
const DOSSIER_SAUVEGARDES = join(RACINE, 'donnees', 'sauvegardes');

/**
 * Charge le service depuis la SOURCE TypeScript, via tsx.
 *
 * Jamais depuis `serveur/dist/` : un `dist` périmé effacerait selon l'ANCIENNE définition des
 * portées, et la commande sortirait en vert. C'est le même raisonnement, et la même dépendance
 * de développement, que `scripts/test-rejeu.mjs` — qui l'explique en détail.
 */
async function chargerService() {
  const { register } = await import('tsx/esm/api');
  register();
  const source = join(RACINE, 'serveur', 'src', 'services', 'reinitialisation-profil.ts');
  return import(pathToFileURL(source).href);
}

/** L'horloge du dépôt, jamais `new Date()` — règle ESLint à l'appui (CLAUDE.md). */
async function chargerHorloge() {
  const { register } = await import('tsx/esm/api');
  register();
  const source = join(RACINE, 'partage', 'src', 'horloge.ts');
  return import(pathToFileURL(source).href);
}

function usage() {
  console.log(`
  npm run profil:reinitialiser -- --lister
  npm run profil:reinitialiser -- <prénom> [--complete|--progression] [--confirmer]

  --lister        les profils de la base, avec leur identifiant
  --complete      le profil redevient neuf (réglages de lecture compris)
  --progression   garde le prénom, l'avatar et les réglages de lecture   [défaut]
  --confirmer     efface pour de bon. Sans lui, la commande n'affiche qu'un aperçu.

  La base est TOUJOURS sauvegardée avant le premier effacement.
`);
}

/**
 * Sauvegarde consolidée. `VACUUM INTO` et non une copie de fichier : le WAL peut porter
 * l'essentiel des données (mesuré le 2026-08-02 : 4 Ko de `.db` pour 799 Ko de `.db-wal`), et
 * une copie du seul `.db` serait une sauvegarde presque vide qui aurait l'air d'une sauvegarde.
 */
function sauvegarder(base, horodatage) {
  if (!existsSync(DOSSIER_SAUVEGARDES)) {
    mkdirSync(DOSSIER_SAUVEGARDES, { recursive: true });
  }
  const marque = horodatage.replace(/[:.]/gu, '-');
  const cible = join(DOSSIER_SAUVEGARDES, `pierre-avant-reinitialisation-${marque}.db`);
  if (existsSync(cible)) {
    // On n'écrase JAMAIS une sauvegarde. Deux remises à zéro dans la même milliseconde
    // n'arrivent pas ; si cela arrivait, la seconde ne détruirait pas la première.
    throw new Error(`Une sauvegarde porte déjà ce nom : ${cible}`);
  }
  base.exec(`VACUUM INTO '${cible.replace(/'/gu, "''")}';`);
  return cible;
}

function profils(base) {
  return base
    .prepare('SELECT id, prenom, cree_le, dernier_acces_le FROM profils ORDER BY cree_le')
    .all();
}

/** Comparaison de prénom, alignée sur celle du serveur : sans accent, sans casse. */
function memePrenom(a, b) {
  const canon = (t) =>
    String(t)
      .normalize('NFD')
      .replace(/\p{Mn}/gu, '')
      .toLowerCase()
      .trim();
  return canon(a) === canon(b);
}

async function principal() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes('--aide') || arguments_.includes('-h')) {
    usage();
    return 0;
  }

  if (!existsSync(CHEMIN_BASE)) {
    console.error(`Aucune base à cet endroit : ${CHEMIN_BASE}`);
    console.error('Lance le jeu une fois (demarrer.bat) : elle sera créée et migrée.');
    return 1;
  }

  const base = new DatabaseSync(CHEMIN_BASE);
  base.exec('PRAGMA foreign_keys = ON;');
  base.exec('PRAGMA busy_timeout = 8000;');

  try {
    const liste = profils(base);

    if (arguments_.includes('--lister') || arguments_.length === 0) {
      console.log(`\nBase : ${CHEMIN_BASE}`);
      console.log(`${String(liste.length)} profil(s) :\n`);
      for (const p of liste) {
        console.log(`  ${String(p.prenom).padEnd(16)} ${String(p.id)}   dernier accès ${String(p.dernier_acces_le)}`);
      }
      if (arguments_.length === 0) {
        usage();
      }
      return 0;
    }

    const demande = arguments_.find((a) => !a.startsWith('--'));
    if (demande === undefined) {
      console.error('Donne le prénom de l’enfant. `--lister` affiche ceux que la base connaît.');
      return 1;
    }

    // Le prénom d'abord, l'identifiant en repli : un parent connaît le prénom de son fils, pas
    // `prf-0fbbeba7fb27d3f7`.
    const cibles = liste.filter(
      (p) => memePrenom(p.prenom, demande) || String(p.id) === demande
    );
    if (cibles.length === 0) {
      console.error(`Aucun profil ne s’appelle « ${demande} ».`);
      console.error('Les profils connus : ' + liste.map((p) => String(p.prenom)).join(', '));
      return 1;
    }
    if (cibles.length > 1) {
      console.error(`Plusieurs profils s’appellent « ${demande} ». Donne l’identifiant :`);
      for (const p of cibles) console.error(`  ${String(p.id)}`);
      return 1;
    }
    const cible = cibles[0];

    if (arguments_.includes('--complete') && arguments_.includes('--progression')) {
      console.error('Choisis UNE portée : --complete ou --progression.');
      return 1;
    }
    // Défaut délibéré : la portée qui conserve. Une commande dont le défaut est la destruction
    // maximale punirait la frappe rapide.
    const portee = arguments_.includes('--complete') ? 'complete' : 'progression';

    const service = await chargerService();
    const apercu = service.previsualiserReinitialisation(base, String(cible.id), portee);
    const total = apercu.reduce((n, l) => n + l.lignesEffacees, 0);

    console.log(`\nProfil  : ${String(cible.prenom)}  (${String(cible.id)})`);
    console.log(`Portée  : ${portee === 'complete' ? 'COMPLÈTE — le profil redevient neuf' : 'PROGRESSION SEULE — prénom, avatar et réglages de lecture conservés'}`);
    console.log(`Base    : ${CHEMIN_BASE}\n`);
    console.log('Ce qui serait effacé :');
    for (const ligne of apercu) {
      if (ligne.lignesEffacees > 0) {
        console.log(`  ${String(ligne.lignesEffacees).padStart(6)}  ${ligne.table}`);
      }
    }
    console.log(`  ${'—'.repeat(6)}`);
    console.log(`  ${String(total).padStart(6)}  lignes au total, sur ${String(apercu.length)} tables\n`);

    if (!arguments_.includes('--confirmer')) {
      console.log('RIEN N’A ÉTÉ EFFACÉ. Ajoute --confirmer pour effacer pour de bon.\n');
      return 0;
    }

    const { horloge } = await chargerHorloge();
    const maintenant = String(horloge.maintenant());

    const sauvegarde = sauvegarder(base, maintenant);
    console.log(`Sauvegarde écrite AVANT tout effacement :\n  ${sauvegarde}\n`);

    const rapport = service.reinitialiserProfil(base, String(cible.id), portee, horloge);

    // On RELIT la base : le rapport qu'on vient d'écrire ne se certifie pas lui-même.
    const restes = service.tablesNonVidees(base, String(cible.id), portee);
    if (restes.length > 0) {
      console.error('\nÉCHEC : des lignes ont survécu à la remise à zéro.');
      for (const r of restes) console.error(`  ${String(r.lignesEffacees)}  ${r.table}`);
      console.error(`\nLa base d’avant est intacte ici : ${sauvegarde}`);
      return 1;
    }

    console.log(`${String(rapport.lignesEffaceesTotal)} lignes effacées sur ${String(rapport.lignes.length)} tables.`);
    if (rapport.tablesConservees.length > 0) {
      console.log(`Conservées : ${rapport.tablesConservees.join(', ')}`);
    }
    console.log(`\n${String(cible.prenom)} peut rejouer. Redémarre le serveur si le jeu tournait.\n`);
    return 0;
  } finally {
    base.close();
  }
}

const code = await principal();
process.exit(code);
