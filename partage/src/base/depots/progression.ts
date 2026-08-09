/**
 * Projection `progression_noeud` — recalculable, jamais source de verite.
 *
 * CLAUDE.md, « le journal fait foi » : toute progression se recalcule depuis `tentatives`.
 * Ce fichier porte donc DEUX chemins qui doivent rendre exactement le meme resultat :
 *
 * - `appliquerTentativeALaProgression` — incremental, appele a chaque tentative enregistree ;
 * - `recalculerProgression` — reconstruction integrale depuis le journal.
 *
 * L'egalite des deux est le test T2 « Recalculs » de l'annexe T § T2. Elle n'est pas obtenue par
 * hasard : les trois agregats sont ecrits deux fois avec la meme loi.
 *
 * | colonne         | recalcul integral   | incremental                                  |
 * |-----------------|---------------------|----------------------------------------------|
 * | `etoiles`       | `MAX(etoiles)`      | `MAX(ancien, nouveau)` — un acquis n'est jamais repris |
 * | `nb_tentatives` | `COUNT(*)`          | `ancien + 1`                                 |
 * | `dernier_le`    | `MAX(termine_le)`   | `MAX(ancien, termine_le)`                    |
 *
 * `MAX` sur `dernier_le` est licite parce que les horodatages sont ISO 8601 en UTC : leur ordre
 * lexicographique est leur ordre chronologique.
 *
 * Porté sur le contrat `Base` — Docs/addendum-portage-android.md § 4.
 */

import type { Horodatage, IdNoeud } from '../../identifiants.js';
import type { NombreEtoiles } from '../../journal/types.js';
import type { ProgressionNoeud } from '../../api/contrats.js';
import type { Base } from '../contrat.js';

interface LigneProgression {
  readonly noeud_id: string;
  readonly etoiles: number;
  readonly nb_tentatives: number;
  readonly dernier_le: string;
}

function versProgression(ligne: LigneProgression): ProgressionNoeud {
  return {
    noeud: String(ligne.noeud_id) as IdNoeud,
    etoiles: Number(ligne.etoiles) as NombreEtoiles,
    nbTentatives: Number(ligne.nb_tentatives),
    dernierLe: String(ligne.dernier_le) as Horodatage
  };
}

const SQL_LECTURE = `
SELECT noeud_id, etoiles, nb_tentatives, dernier_le
FROM progression_noeud
WHERE profil_id = ?
ORDER BY noeud_id
`;

/** Etat de progression d'un profil, tel que le sert `GET /api/profils/:id/progression`. */
export async function lireProgression(base: Base, profilId: string): Promise<readonly ProgressionNoeud[]> {
  const lignes = await base.lignes<LigneProgression>(SQL_LECTURE, [profilId]);
  return lignes.map(versProgression);
}

export async function lireProgressionNoeud(
  base: Base,
  profilId: string,
  noeudId: string
): Promise<ProgressionNoeud | null> {
  const ligne = await base.uneLigne<LigneProgression>(
    `SELECT noeud_id, etoiles, nb_tentatives, dernier_le
     FROM progression_noeud WHERE profil_id = ? AND noeud_id = ?`,
    [profilId, noeudId]
  );
  return ligne === undefined ? null : versProgression(ligne);
}

/**
 * Chemin incremental. A appeler dans la meme transaction que l'insertion de la tentative.
 *
 * `MAX(...)` sur les etoiles est la traduction en SQL de « un acquis n'est jamais repris »
 * (contrat § 6.3) : rejouer un noeud plus mal ne fait jamais redescendre le nombre d'etoiles.
 */
export async function appliquerTentativeALaProgression(
  base: Base,
  profilId: string,
  noeudId: string,
  etoiles: number,
  termineLe: string
): Promise<void> {
  await base.lancer(
    `INSERT INTO progression_noeud (profil_id, noeud_id, etoiles, nb_tentatives, dernier_le)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT (profil_id, noeud_id) DO UPDATE SET
       etoiles       = MAX(progression_noeud.etoiles, excluded.etoiles),
       nb_tentatives = progression_noeud.nb_tentatives + 1,
       dernier_le    = MAX(progression_noeud.dernier_le, excluded.dernier_le)`,
    [profilId, noeudId, etoiles, termineLe]
  );
}

/**
 * Reconstruit integralement la progression d'un profil depuis `tentatives`.
 *
 * C'est le `RECALCULER` complet de l'annexe T § T2. Il efface la projection avant de la
 * reconstruire : la projection n'a aucune information que le journal ne porte pas, donc
 * l'effacer ne perd rien. Si un jour elle en avait une, ce serait une seconde source de verite
 * et le journal ne ferait plus foi.
 */
export async function recalculerProgression(
  base: Base,
  profilId: string
): Promise<readonly ProgressionNoeud[]> {
  await base.lancer('DELETE FROM progression_noeud WHERE profil_id = ?', [profilId]);
  await base.lancer(
    `INSERT INTO progression_noeud (profil_id, noeud_id, etoiles, nb_tentatives, dernier_le)
     SELECT profil_id, noeud_id, MAX(etoiles), COUNT(*), MAX(termine_le)
     FROM tentatives
     WHERE profil_id = ?
     GROUP BY profil_id, noeud_id`,
    [profilId]
  );

  return lireProgression(base, profilId);
}

/** Recalcule la progression de tous les profils. Rend le nombre de profils traites. */
export async function recalculerToutesLesProgressions(base: Base): Promise<number> {
  const lignes = await base.lignes<{ id: string }>('SELECT id FROM profils ORDER BY id');
  for (const ligne of lignes) {
    await recalculerProgression(base, String(ligne.id));
  }
  return lignes.length;
}
