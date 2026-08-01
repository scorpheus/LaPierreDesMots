/**
 * Ouverture de la base SQLite.
 *
 * `node:sqlite` est integre a Node 24 : aucune dependance native a compiler, aucune installation
 * hors du depot (CLAUDE.md, regle du depot auto-contenu).
 */

import { DatabaseSync } from 'node:sqlite';

/** Valeur de `chemin` qui demande une base en memoire, jetee a la fermeture. */
export const BASE_EN_MEMOIRE = ':memory:';

/**
 * Ouvre la base et pose ses PRAGMA.
 *
 * Contrat § 6.1 : `journal_mode = WAL` et `foreign_keys = ON` sont poses **ici**, jamais dans un
 * fichier de migration. Une base en memoire n'a pas de journal sur disque : le WAL n'y est pas
 * demande, SQLite le refuserait silencieusement.
 *
 * `chemin === ':memory:'` en test (contrat § 6.4).
 */
export function ouvrirBase(chemin: string): DatabaseSync {
  const base = new DatabaseSync(chemin);

  if (chemin !== BASE_EN_MEMOIRE) {
    base.exec('PRAGMA journal_mode = WAL;');
    // Le WAL rend `NORMAL` sur : les ecritures restent durables au crash de processus.
    base.exec('PRAGMA synchronous = NORMAL;');
  }
  base.exec('PRAGMA foreign_keys = ON;');
  // Deux clients sur le meme profil ne doivent pas se marcher dessus (annexe T § T2).
  base.exec('PRAGMA busy_timeout = 5000;');

  return base;
}

/**
 * Execute `action` dans une transaction. Valide au retour, annule sur exception.
 *
 * Les transactions imbriquees ne sont pas gerees : aucun appelant du lot n'en ouvre deux.
 */
export function dansTransaction<T>(base: DatabaseSync, action: () => T): T {
  base.exec('BEGIN IMMEDIATE;');
  try {
    const resultat = action();
    base.exec('COMMIT;');
    return resultat;
  } catch (erreur) {
    try {
      base.exec('ROLLBACK;');
    } catch {
      // Une transaction deja annulee par SQLite n'a pas a masquer l'erreur d'origine.
    }
    throw erreur;
  }
}
