/**
 * Exports CSV du dashboard parent — contrat des features v2 § 3.8, lot L2-H. Deplace de
 * `serveur/src/services/export-csv.ts` au Lot 4 du portage Android
 * (Docs/addendum-portage-android.md § 6bis) : ce service n'a jamais touche `node:fs` ni
 * `node:crypto`, seulement `Base.lignes` — il etait deja portable, seul son adresse ne l'etait
 * pas.
 *
 * Trois decisions de format, et elles servent toutes le meme but : que le fichier s'ouvre
 * D'UN CLIC dans l'Excel francais du PC du salon, sans assistant d'importation.
 *
 * 1. **Separateur `;`.** L'Excel francais lit `,` comme separateur decimal ; avec une virgule
 *    en separateur de colonnes, tout le fichier atterrit dans la colonne A.
 * 2. **BOM UTF-8 en tete.** Sans lui, Excel lit le fichier en ANSI et « Clairiere » devient
 *    « ClairiÃ¨re ». C'est le defaut le plus visible et le plus vite reproche.
 * 3. **Virgule decimale.** Meme raison : `0.42` est du texte pour Excel FR, `0,42` est un
 *    nombre. Les entiers restent sans virgule. PLACEHOLDER — a valider, consigne dans
 *    `Docs/questions-en-attente.md`.
 *
 * Le contenu, lui, n'est jamais reformate : c'est le journal, tel quel. Un export qui
 * arrondirait ne serait plus une piece a conviction.
 */

import type { Base } from '../contrat.js';
import type { CodeExport } from '../../parent/types.js';

/** Marque d'ordre des octets UTF-8. Excel en a besoin, les autres tableurs l'ignorent. */
export const BOM_UTF8 = '﻿';

export const SEPARATEUR_CSV = ';';

/** Ce que chaque export lit, et sous quel nom de fichier il est propose. */
const REQUETES: Readonly<Record<CodeExport, { readonly sql: string; readonly fichier: string }>> = {
  tentatives: {
    fichier: 'tentatives',
    sql: `SELECT id, noeud_id, exercice_id, moteur, habillage, graine,
                 demarre_le, termine_le, duree_ms, reussi, nb_erreurs, aide_utilisee, etoiles
          FROM tentatives WHERE profil_id = ? ORDER BY termine_le, id`
  },
  etapes: {
    fichier: 'etapes',
    sql: `SELECT id, tentative_id, rang, identifiant, competence, mode_reponse,
                 reussi, nb_erreurs, aide_utilisee, duree_ms, latence_ms,
                 conf_attendu, conf_rendu, conf_axe, journalise_le
          FROM etapes_tentative WHERE profil_id = ? ORDER BY journalise_le, tentative_id, rang`
  },
  maitrise: {
    fichier: 'maitrise',
    sql: `SELECT competence, p, nb_tentatives, jours_distincts_json,
                 nb_faible_devinette, acquise_le
          FROM maitrise_competence WHERE profil_id = ? ORDER BY competence`
  },
  confusions: {
    fichier: 'confusions',
    // Le detail brut, une ligne par observation : le parent qui exporte veut la matiere, pas
    // l'agregat qu'il a deja sous les yeux a l'ecran.
    sql: `SELECT substr(journalise_le, 1, 10) AS jour, conf_attendu, conf_rendu, conf_axe,
                 competence, latence_ms, duree_ms
          FROM etapes_tentative
          WHERE profil_id = ? AND conf_attendu IS NOT NULL
          ORDER BY journalise_le, conf_attendu, conf_rendu`
  },
  latences: {
    fichier: 'latences',
    sql: `SELECT substr(journalise_le, 1, 10) AS jour, competence, mode_reponse, latence_ms
          FROM etapes_tentative
          WHERE profil_id = ? AND latence_ms IS NOT NULL
          ORDER BY journalise_le, competence`
  }
};

export function estCodeExport(valeur: string): valeur is CodeExport {
  return Object.prototype.hasOwnProperty.call(REQUETES, valeur);
}

/** Nom de fichier propose au telechargement. */
export function nomFichierExport(code: CodeExport, profilId: string): string {
  const propre = profilId.replace(/[^a-zA-Z0-9_-]/gu, '_');
  return `pierre-${REQUETES[code].fichier}-${propre}.csv`;
}

/**
 * Echappe une cellule au sens RFC 4180, separateur `;`.
 * On ne cite que ce qui l'exige : un fichier tout entier entre guillemets est illisible a
 * l'oeil, et le parent doit pouvoir l'ouvrir dans un editeur de texte.
 */
export function cellule(valeur: unknown): string {
  if (valeur === null || valeur === undefined) {
    return '';
  }
  if (typeof valeur === 'number') {
    // Virgule decimale pour Excel FR ; les entiers ne changent pas.
    return Number.isInteger(valeur) ? String(valeur) : String(valeur).replace('.', ',');
  }
  if (typeof valeur === 'bigint' || typeof valeur === 'boolean') {
    return String(valeur);
  }
  const texte = valeur instanceof Uint8Array ? '(binaire)' : String(valeur);
  if (/[;"\r\n]/u.test(texte)) {
    return `"${texte.replace(/"/gu, '""')}"`;
  }
  return texte;
}

/** Assemble un CSV complet, BOM compris. Fins de ligne CRLF : c'est ce qu'attend Excel. */
export function enCsv(
  entetes: readonly string[],
  lignes: readonly (readonly unknown[])[]
): string {
  const corps = [entetes.map(cellule).join(SEPARATEUR_CSV)];
  for (const ligne of lignes) {
    corps.push(ligne.map(cellule).join(SEPARATEUR_CSV));
  }
  return BOM_UTF8 + corps.join('\r\n') + '\r\n';
}

/**
 * Construit l'export demande pour un profil.
 *
 * REFUSE PLUTOT QUE D'EMETTRE DU FAUX : un code inconnu jette, il ne rend pas un fichier vide.
 * Un CSV a zero ligne et un CSV jamais produit se ressemblent trop pour qu'on les confonde.
 */
export async function construireExport(
  base: Base,
  profilId: string,
  code: CodeExport
): Promise<string> {
  const lignes = await base.lignes<Record<string, unknown>>(REQUETES[code].sql, [profilId]);

  const premiere = lignes[0];
  if (premiere === undefined) {
    // Aucune donnee : on rend quand meme les en-tetes, pris du SQL, pour que le parent
    // distingue « rien a montrer » de « export casse ».
    return enCsv(entetesDeclarees(REQUETES[code].sql), []);
  }

  const entetes = Object.keys(premiere);
  return enCsv(
    entetes,
    lignes.map((ligne) => entetes.map((nom) => ligne[nom]))
  );
}

/**
 * Les noms de colonnes tels que la requete les declare, quand aucune ligne ne revient.
 * On lit le `SELECT ... FROM`, on coupe sur les virgules de premier niveau, on garde l'alias
 * quand il y en a un. C'est une heuristique, et elle ne sert QUE l'en-tete d'un export vide.
 */
function entetesDeclarees(sql: string): readonly string[] {
  const selection = /SELECT([\s\S]*?)FROM/iu.exec(sql)?.[1] ?? '';
  const colonnes: string[] = [];
  let profondeur = 0;
  let courante = '';
  for (const caractere of selection) {
    if (caractere === '(') {
      profondeur += 1;
    } else if (caractere === ')') {
      profondeur -= 1;
    }
    if (caractere === ',' && profondeur === 0) {
      colonnes.push(courante);
      courante = '';
      continue;
    }
    courante += caractere;
  }
  colonnes.push(courante);

  return colonnes
    .map((brute) => brute.trim().replace(/\s+/gu, ' '))
    .filter((brute) => brute !== '')
    .map((brute) => {
      const alias = / AS ([A-Za-z0-9_]+)$/iu.exec(brute);
      if (alias?.[1] !== undefined) {
        return alias[1];
      }
      const dernier = brute.split('.').at(-1) ?? brute;
      return dernier;
    });
}
