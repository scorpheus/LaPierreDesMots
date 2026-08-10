/**
 * `npm run profil:recalculer -- [--profil <prénom|id>] [--confirmer]` — lot Q1.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CET OUTIL EXISTE
 *
 * Quatre reconstructions intégrales existent et sont justes, chacune testée contre son chemin
 * incrémental par le test de rejeu T2 (annexe T § T2) : `recalculerToutesLesProgressions`,
 * `recalculerToutesLesCascades`, `recalculerToutesLesMaitrises`, `recalculerLeitner`. Avant ce
 * lot, AUCUNE n'avait d'appelant en production — exactement le défaut que
 * `tests/unitaires/ecrivains-atteignables.test.ts` (garde Q1) traque : « un chemin déclaré,
 * câblé, jamais parcouru ». `Docs/questions-en-attente.md`, § Q-H1-4, les avait déjà nommées :
 * « ce sont des filets [d'exploitation], et il leur manque … un appel ».
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI UN OUTIL MANUEL, ET NON UN APPEL AUTOMATIQUE AU DÉMARRAGE
 *
 * `serveur/src/index.ts` répare déjà `progression_region` à chaque démarrage
 * (`reparerProgressionRegion`, lot H1) — mais CETTE reconstruction-ci ne dépend d'aucun
 * paramètre pédagogique : `MAX`/`COUNT` sur `tentatives` ne cite aucun contenu, donc elle ne
 * PEUT PAS faire redescendre un acquis (Q-H1-4, table de l'audit des 21 tables).
 *
 * `progression_cascade`, `maitrise_competence` et `items_leitner` sont différentes : leurs
 * recalculs relisent le journal SOUS LES PARAMÈTRES ACTUELS de
 * `contenu/referentiel/parametres-{recompenses,pedagogie}.json`. Si ces paramètres ont changé
 * depuis que l'enfant a joué, le recalcul peut déplacer `acquise_le` ou une boîte Leitner —
 * ce que R14 (« un acquis n'est jamais repris ») interdit de faire sans y avoir réfléchi.
 * `Docs/questions-en-attente.md` § Q-H1-4 pose donc explicitement la question au père :
 * « recalculer aussi la cascade, la maîtrise et le Leitner au démarrage ? » — et elle reste
 * OUVERTE. Cet outil répond à Q1 (rendre les fonctions atteignables) SANS trancher cette
 * question produit : il ne s'exécute que sur demande explicite d'un humain, jamais tout seul.
 *
 * Aucun effacement de données source : ces quatre tables sont des PROJECTIONS recalculables
 * depuis `tentatives` / `etapes_tentative`, qui ne sont jamais touchés ici (CLAUDE.md, « le
 * journal fait foi »). C'est pourquoi ce script n'écrit PAS de sauvegarde automatique comme
 * `reinitialiser-profil.mjs` : il ne peut rien perdre que le journal ne sache déjà reconstruire.
 *
 * Passe par le contrat `Base` (Docs/addendum-portage-android.md § 4), comme le reste du dépôt
 * depuis le portage Android : les dépôts ne vivent plus dans `serveur/src/depots/`, mais dans
 * `partage/src/base/depots/`, async, et `creerBaseNodeSqlite` est le seul pont vers `node:sqlite`.
 *
 * Usage :
 *   npm run profil:recalculer -- --lister
 *   npm run profil:recalculer -- --profil Ezékiel              (aperçu, n'écrit rien)
 *   npm run profil:recalculer -- --profil Ezékiel --confirmer
 *   npm run profil:recalculer -- --tous --confirmer
 *
 * **Sans `--confirmer`, rien n'est écrit.** Comme `reinitialiser-profil.mjs`, un geste qui
 * touche les données d'un enfant ne se déclenche jamais du premier coup.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import { RACINE } from './rapport.mjs';

const CHEMIN_BASE = process.env['PIERRE_BASE'] ?? join(RACINE, 'donnees', 'pierre.db');

/** Charge un module depuis la SOURCE TypeScript, via tsx — jamais depuis un `dist` périmé. */
async function chargerModule(cheminRelatif) {
  const { register } = await import('tsx/esm/api');
  register();
  const source = join(RACINE, ...cheminRelatif.split('/'));
  return import(pathToFileURL(source).href);
}

function usage() {
  console.log(`
  npm run profil:recalculer -- --lister
  npm run profil:recalculer -- --profil <prénom|id> [--confirmer]
  npm run profil:recalculer -- --tous [--confirmer]

  --lister        les profils de la base, avec leur identifiant
  --profil <x>     ne recalcule que ce profil
  --tous          recalcule tous les profils
  --confirmer     écrit pour de bon. Sans lui, la commande n'affiche qu'un aperçu.

  Reconstruit intégralement, depuis le journal (\`tentatives\` / \`etapes_tentative\`) :
    progression_noeud, progression_cascade, maitrise_competence, items_leitner.

  ⚠ progression_cascade, maitrise_competence et items_leitner relisent le journal SOUS LES
  PARAMÈTRES ACTUELS de contenu/referentiel/. Si ces paramètres ont changé depuis que l'enfant
  a joué, le recalcul peut déplacer un acquis — voir l'en-tête de ce fichier (Q-H1-4).
`);
}

function profils(base) {
  return base
    .prepare('SELECT id, prenom, cree_le FROM profils ORDER BY cree_le')
    .all();
}

/** Comparaison de prénom, alignée sur celle de `reinitialiser-profil.mjs`. */
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

  const baseSqlite = new DatabaseSync(CHEMIN_BASE);
  baseSqlite.exec('PRAGMA foreign_keys = ON;');
  baseSqlite.exec('PRAGMA busy_timeout = 8000;');

  try {
    const liste = profils(baseSqlite);

    if (arguments_.includes('--lister') || arguments_.length === 0) {
      console.log(`\nBase : ${CHEMIN_BASE}`);
      console.log(`${String(liste.length)} profil(s) :\n`);
      for (const p of liste) {
        console.log(`  ${String(p.prenom).padEnd(16)} ${String(p.id)}`);
      }
      if (arguments_.length === 0) {
        usage();
      }
      return 0;
    }

    let cibles;
    if (arguments_.includes('--tous')) {
      cibles = liste;
    } else {
      const indexProfil = arguments_.indexOf('--profil');
      const demande = indexProfil === -1 ? undefined : arguments_[indexProfil + 1];
      if (demande === undefined) {
        console.error('Donne `--profil <prénom>` ou `--tous`. `--lister` affiche les profils connus.');
        return 1;
      }
      cibles = liste.filter((p) => memePrenom(p.prenom, demande) || String(p.id) === demande);
      if (cibles.length === 0) {
        console.error(`Aucun profil ne s'appelle « ${demande} ».`);
        return 1;
      }
      if (cibles.length > 1) {
        console.error(`Plusieurs profils s'appellent « ${demande} ». Donne l'identifiant :`);
        for (const p of cibles) console.error(`  ${String(p.id)}`);
        return 1;
      }
    }

    const confirmer = arguments_.includes('--confirmer');

    console.log(`\nBase    : ${CHEMIN_BASE}`);
    console.log(`Profils : ${cibles.map((p) => String(p.prenom)).join(', ')}`);
    console.log(
      confirmer
        ? 'Recalcul de progression_noeud, progression_cascade, maitrise_competence, items_leitner…\n'
        : 'APERÇU — rien ne sera écrit sans --confirmer.\n',
    );

    if (!confirmer) {
      console.log('Ajoute --confirmer pour écrire pour de bon.\n');
      return 0;
    }

    const [{ creerBaseNodeSqlite }, depots, { chargerSeuilsCascade }, { chargerParametresPedagogie }] =
      await Promise.all([
        chargerModule('serveur/src/base/adaptateur-node-sqlite.ts'),
        chargerModule('partage/src/base/index.ts'),
        chargerModule('serveur/src/referentiels/recompenses.ts'),
        chargerModule('serveur/src/referentiels/pedagogie.ts'),
      ]);

    const base = creerBaseNodeSqlite(baseSqlite);
    const seuils = chargerSeuilsCascade();
    const parametresPedagogie = chargerParametresPedagogie();

    if (arguments_.includes('--tous')) {
      // Les trois reconstructions « toutes les » existent déjà, tables et profils confondus :
      // les appeler ICI est exactement le branchement que Q1 réclamait, sans rien dupliquer.
      await depots.recalculerToutesLesProgressions(base);
      await depots.recalculerToutesLesCascades(base, seuils);
      await depots.recalculerToutesLesMaitrises(base, parametresPedagogie);
      for (const cible of cibles) {
        await depots.recalculerLeitner(base, String(cible.id), parametresPedagogie);
      }
    } else {
      const id = String(cibles[0].id);
      await depots.recalculerProgression(base, id);
      await depots.recalculerCascade(base, id, seuils);
      await depots.recalculerMaitrise(base, id, parametresPedagogie);
      await depots.recalculerLeitner(base, id, parametresPedagogie);
    }

    for (const cible of cibles) {
      console.log(`  ${String(cible.prenom).padEnd(16)} recalculé.`);
    }
    console.log(`\n${String(cibles.length)} profil(s) recalculé(s).\n`);
    return 0;
  } finally {
    baseSqlite.close();
  }
}

const code = await principal();
process.exit(code);
