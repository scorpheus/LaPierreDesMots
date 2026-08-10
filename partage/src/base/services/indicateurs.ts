/**
 * Les requetes du dashboard parent — contrat des features v2 § 3.8, lot L2-H. Déplacé de
 * `serveur/src/services/` au Lot 2 du portage Android (Docs/addendum-portage-android.md § 6bis).
 *
 * TOUT SE RECALCULE DEPUIS LE JOURNAL. `etapes_tentative` (migration 003, L2-D) est
 * append-only : c'est elle qui porte la latence de reconnaissance (D18) et les confusions avec
 * leur AXE (D23). Ce fichier ne fait que la lire et la donner aux agregations pures de
 * `@pierre/partage/parent`, qui sont les seules a savoir ce qu'est une mediane ou un axe.
 *
 * Consequence a ne pas defaire : aucune agregation n'est ecrite en SQL. Un `AVG()` ou un
 * `GROUP BY conf_attendu` dans une requete serait une deuxieme implantation des memes regles,
 * hors de portee des tests unitaires — et c'est exactement la ou une regression pedagogique se
 * cache (annexe T § 1).
 *
 * DEPENDANCES DE TABLES, assumees et nommees :
 *   `etapes_tentative`, `maitrise_competence` → migration 003 (L2-D)
 *   `progression_region`                     → migration 005 (L2-F)
 *   `tentatives`                             → migration 001 (socle v1)
 * Tant que 003 et 005 ne sont pas la, `GET /api/parent/:profil/dashboard` echoue — et c'est
 * voulu : un dashboard qui rendrait des listes vides sur une base incomplete serait creux.
 */

import type { Base } from '../contrat.js';
import type { CodeRegion } from '../../identifiants.js';
import type {
  ConfusionAgregee,
  CouvertureRegion,
  PointLatence
} from '../../parent/types.js';
import { agregerConfusions, agregerLatences, croiserCouverture } from '../../parent/indicateurs.js';

/** Les six regions de la v2 § 3.3, dans l'ordre de la progression phonologique. */
const REGIONS: readonly CodeRegion[] = [
  'clairiere',
  'galeries',
  'marais-jumeau',
  'foret-muette',
  'volcan',
  'cite-des-histoires'
];

/**
 * La region d'un noeud, deduite de son identifiant (`clairiere-01`, `marais-jumeau-03`).
 *
 * C'est la convention de nommage de `contenu/noeuds/` (contrat v1 § 9.6). On teste les prefixes
 * du plus long au plus court : sans cela `marais-jumeau-01` ne serait jamais reconnu si une
 * region s'appelait `marais`. Rend `null` plutot que de ranger un noeud dans une region au
 * hasard — une carte de couverture fausse est pire qu'une carte incomplete.
 */
export function regionDuNoeud(noeud: string): CodeRegion | null {
  const candidats = [...REGIONS].sort((a, b) => b.length - a.length);
  for (const region of candidats) {
    if (noeud === region || noeud.startsWith(`${region}-`)) {
      return region;
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────── courbe de latence (D18)

interface LigneLatence {
  readonly jour: string;
  readonly competence: string;
  readonly latence_ms: number;
}

/**
 * Les latences de reconnaissance du profil, un point par (jour, competence).
 *
 * `latence_ms IS NULL` est ECARTE : un moteur qui ne sait pas mesurer la latence n'a pas
 * mesure zero. Confondre les deux ferait plonger la courbe a chaque etape non instrumentee.
 */
export async function latencesDuProfil(base: Base, profilId: string): Promise<readonly PointLatence[]> {
  const lignes = await base.lignes<LigneLatence>(
    `SELECT substr(journalise_le, 1, 10) AS jour, competence, latence_ms
     FROM etapes_tentative
     WHERE profil_id = ? AND latence_ms IS NOT NULL`,
    [profilId]
  );

  return agregerLatences(
    lignes.map((ligne) => ({
      jour: String(ligne.jour),
      competence: String(ligne.competence),
      ms: Number(ligne.latence_ms)
    }))
  );
}

// ─────────────────────────────────────────────────────────────── top des confusions (D23)

interface LigneConfusion {
  readonly jour: string;
  readonly conf_attendu: string;
  readonly conf_rendu: string;
  readonly conf_axe: string | null;
  readonly competence: string;
  readonly latence_ms: number | null;
  readonly duree_ms: number;
}

/**
 * Le top des confusions, ET le nombre de confusions ecartees faute d'axe.
 *
 * **Le second chiffre est le contrat de sortie de L2-H.** Un moteur qui journaliserait
 * `conf_axe = NULL` partout rendrait un top vide ; sans `ecartees`, ce vide serait
 * indistinguable d'un enfant qui ne confond plus rien. C'est nommement le defaut « detecteur
 * qui declare un poids qu'il n'applique jamais » (contrat § 11).
 */
export async function confusionsDuProfil(
  base: Base,
  profilId: string,
  limite?: number
): Promise<{ readonly top: readonly ConfusionAgregee[]; readonly ecartees: number }> {
  const lignes = await base.lignes<LigneConfusion>(
    `SELECT substr(journalise_le, 1, 10) AS jour,
            conf_attendu, conf_rendu, conf_axe, competence, latence_ms, duree_ms
     FROM etapes_tentative
     WHERE profil_id = ? AND conf_attendu IS NOT NULL AND conf_rendu IS NOT NULL`,
    [profilId]
  );

  return agregerConfusions(
    lignes.map((ligne) => ({
      attendu: String(ligne.conf_attendu),
      rendu: String(ligne.conf_rendu),
      // La colonne est `TEXT` contrainte a deux valeurs par la migration 003 ; le transtypage
      // ne cache donc rien que le schema n'ait deja verrouille.
      axe: ligne.conf_axe === null ? null : (String(ligne.conf_axe) as 'gauche-droite' | 'haut-bas'),
      competence: String(ligne.competence),
      jour: String(ligne.jour),
      // A defaut de latence mesuree, la duree de l'etape : c'est une borne superieure honnete,
      // jamais un zero.
      latenceMs: ligne.latence_ms === null ? Number(ligne.duree_ms) : Number(ligne.latence_ms)
    })),
    limite
  );
}

// ──────────────────────────────────────────────────────────────────── carte de couverture

interface LigneRecoloration {
  readonly region_code: string;
  readonly pourcentage_colorie: number;
}

interface LigneMaitriseRegion {
  readonly noeud_id: string;
  readonly competence: string;
  readonly p: number;
  readonly acquise: number;
}

/**
 * La carte du monde annotee par la maitrise REELLE (v2 § 14) — « repere une region coloriee
 * mais mal acquise ».
 *
 * La region d'une competence n'est nulle part en base : elle se deduit du noeud ou la
 * competence a ete travaillee, par la convention de nommage de `contenu/noeuds/`. C'est un
 * choix mesurable et sans nouvelle table ; il est signale au rapport comme un point ou le
 * contrat gele ne dit rien.
 */
export async function couvertureDuProfil(
  base: Base,
  profilId: string
): Promise<readonly CouvertureRegion[]> {
  const recoloration = await base.lignes<LigneRecoloration>(
    `SELECT region_code, pourcentage_colorie
     FROM progression_region WHERE profil_id = ?`,
    [profilId]
  );

  const parCompetence = await base.lignes<LigneMaitriseRegion>(
    `SELECT t.noeud_id AS noeud_id, e.competence AS competence,
            m.p AS p, (m.acquise_le IS NOT NULL) AS acquise
     FROM etapes_tentative e
     JOIN tentatives t ON t.id = e.tentative_id
     JOIN maitrise_competence m
       ON m.profil_id = e.profil_id AND m.competence = e.competence
     WHERE e.profil_id = ?
     GROUP BY t.noeud_id, e.competence`,
    [profilId]
  );

  // Une competence travaillee dans deux noeuds d'une meme region ne compte qu'une fois : sinon
  // la moyenne de maitrise pencherait vers la competence la plus jouee, pas la plus fragile.
  const vues = new Set<string>();
  const maitrise: { region: string; p: number; acquise: boolean }[] = [];
  for (const ligne of parCompetence) {
    const region = regionDuNoeud(String(ligne.noeud_id));
    if (region === null) {
      continue;
    }
    const cle = `${region} ${String(ligne.competence)}`;
    if (vues.has(cle)) {
      continue;
    }
    vues.add(cle);
    maitrise.push({ region, p: Number(ligne.p), acquise: Number(ligne.acquise) === 1 });
  }

  return croiserCouverture(
    recoloration.map((ligne) => ({
      region: String(ligne.region_code),
      pourcentage: Number(ligne.pourcentage_colorie)
    })),
    maitrise
  );
}
