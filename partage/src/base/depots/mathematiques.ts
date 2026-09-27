/** Accès SQLite du domaine maths. `tentatives_maths` est un journal append-only. */
import type { Base } from '../contrat.js';
import type {
  EtapeProjetMaths, FamilleMaths, InstanceMathsBase, NiveauMaths, ProjetMathsId,
  RepriseMaths, TentativeMaths,
} from '../../mathematiques/types.js';

export interface LigneSessionProjetMaths {
  readonly id: string;
  readonly profil_id: string;
  readonly generation_maths: number;
  readonly cle_creation: string;
  readonly empreinte_creation: string;
  readonly projet_id: string;
  readonly version_projet: number;
  readonly variables_json: string;
  readonly plan_json: string;
  readonly transformation_id: string;
  readonly cadeau_id: string | null;
  readonly cadeau_type: 'souvenir' | 'objet' | 'fete' | null;
  readonly cree_le: string;
}

export interface LigneInstanceMaths {
  readonly id: string;
  readonly profil_id: string;
  readonly generation_maths: number;
  readonly cle_creation: string;
  readonly empreinte_creation: string;
  readonly session_projet_id: string | null;
  readonly instance_json: string;
}

export interface LigneRepriseMaths {
  readonly instance_id: string;
  readonly profil_id: string;
  readonly generation_maths: number;
  readonly revision: number;
  readonly version_etat: number;
  readonly statut: 'active' | 'suspendue' | 'en_attente' | 'terminee';
  readonly reprise_json: string;
}

export interface LignePreferenceNiveauMaths {
  readonly famille: FamilleMaths;
  readonly niveau: NiveauMaths;
  readonly revision: number;
  readonly cle_geste: string;
}

export async function lirePreferencesNiveauxMaths(
  base: Base, profilId: string, generationMaths: number,
): Promise<readonly LignePreferenceNiveauMaths[]> {
  return base.lignes<LignePreferenceNiveauMaths>(
    `SELECT famille, niveau, revision, cle_geste FROM preferences_niveaux_maths
     WHERE profil_id = ? AND generation_maths = ?`, [profilId, generationMaths]);
}

export async function lirePreferenceNiveauMaths(
  base: Base, profilId: string, generationMaths: number, famille: FamilleMaths,
): Promise<LignePreferenceNiveauMaths | null> {
  return await base.uneLigne<LignePreferenceNiveauMaths>(
    `SELECT famille, niveau, revision, cle_geste FROM preferences_niveaux_maths
     WHERE profil_id = ? AND generation_maths = ? AND famille = ?`,
    [profilId, generationMaths, famille]) ?? null;
}

export interface LigneActionMaths {
  readonly instance_id: string;
  readonly profil_id: string;
  readonly generation_maths: number;
  readonly cle_geste: string;
  readonly empreinte_requete: string;
  readonly version_action: number;
  readonly effet_json: string;
}

export interface LigneTentativeMaths {
  readonly id: string;
  readonly instance_id: string;
  readonly profil_id: string;
  readonly famille: FamilleMaths;
  readonly niveau: NiveauMaths;
  readonly projet_id: string | null;
  readonly nb_erreurs: number;
  readonly aide_utilisee: string;
  readonly etoiles: number;
  readonly solution_json: string;
  readonly notions_json: string;
  readonly contexte_json: string;
}

export async function lireGenerationMaths(base: Base, profilId: string): Promise<number | null> {
  const ligne = await base.uneLigne<{ generation_maths: number }>(
    'SELECT generation_maths FROM profils WHERE id = ?', [profilId],
  );
  return ligne === undefined ? null : Number(ligne.generation_maths);
}

export async function lireInstanceMaths(base: Base, instanceId: string): Promise<LigneInstanceMaths | null> {
  return await base.uneLigne<LigneInstanceMaths>(
    `SELECT id, profil_id, generation_maths, cle_creation, empreinte_creation,
            session_projet_id, instance_json
     FROM instances_maths WHERE id = ?`, [instanceId],
  ) ?? null;
}

export async function lireInstanceMathsParCle(
  base: Base, profilId: string, generation: number, cle: string,
): Promise<LigneInstanceMaths | null> {
  return await base.uneLigne<LigneInstanceMaths>(
    `SELECT id, profil_id, generation_maths, cle_creation, empreinte_creation,
            session_projet_id, instance_json
     FROM instances_maths WHERE profil_id = ? AND generation_maths = ? AND cle_creation = ?`,
    [profilId, generation, cle],
  ) ?? null;
}

export async function lireSessionProjetMaths(base: Base, sessionId: string): Promise<LigneSessionProjetMaths | null> {
  return await base.uneLigne<LigneSessionProjetMaths>(
    `SELECT id, profil_id, generation_maths, cle_creation, empreinte_creation, projet_id,
            version_projet, variables_json, plan_json, transformation_id, cadeau_id, cadeau_type, cree_le
     FROM sessions_projets_maths WHERE id = ?`, [sessionId],
  ) ?? null;
}

export async function lireSessionProjetMathsParCle(
  base: Base, profilId: string, generation: number, cle: string,
): Promise<LigneSessionProjetMaths | null> {
  return await base.uneLigne<LigneSessionProjetMaths>(
    `SELECT id, profil_id, generation_maths, cle_creation, empreinte_creation, projet_id,
            version_projet, variables_json, plan_json, transformation_id, cadeau_id, cadeau_type, cree_le
     FROM sessions_projets_maths
     WHERE profil_id = ? AND generation_maths = ? AND cle_creation = ?`,
    [profilId, generation, cle],
  ) ?? null;
}

export async function lireRepriseMaths(base: Base, instanceId: string): Promise<LigneRepriseMaths | null> {
  return await base.uneLigne<LigneRepriseMaths>(
    `SELECT instance_id, profil_id, generation_maths, revision, version_etat, statut, reprise_json
     FROM reprises_maths WHERE instance_id = ?`, [instanceId],
  ) ?? null;
}

export async function lireRepriseActiveMaths(base: Base, profilId: string): Promise<LigneRepriseMaths | null> {
  return await base.uneLigne<LigneRepriseMaths>(
    `SELECT instance_id, profil_id, generation_maths, revision, version_etat, statut, reprise_json
     FROM reprises_maths WHERE profil_id = ? AND statut = 'active'`, [profilId],
  ) ?? null;
}

export async function lireDerniereRepriseMaths(
  base: Base, profilId: string, generation: number,
): Promise<LigneRepriseMaths | null> {
  return await base.uneLigne<LigneRepriseMaths>(
    `SELECT instance_id, profil_id, generation_maths, revision, version_etat, statut, reprise_json
     FROM reprises_maths WHERE profil_id = ? AND generation_maths = ?
       AND statut IN ('active', 'suspendue')
     ORDER BY CASE WHEN statut = 'active' THEN 0 ELSE 1 END, maj_le DESC, instance_id DESC
     LIMIT 1`, [profilId, generation],
  ) ?? null;
}

export async function lireProjetSuspenduMaths(
  base: Base, profilId: string, generation: number,
): Promise<LigneRepriseMaths | null> {
  return await base.uneLigne<LigneRepriseMaths>(
    `SELECT r.instance_id, r.profil_id, r.generation_maths, r.revision, r.version_etat,
            r.statut, r.reprise_json
     FROM reprises_maths r JOIN instances_maths i ON i.id = r.instance_id
     WHERE r.profil_id = ? AND r.generation_maths = ?
       AND r.statut = 'suspendue' AND i.session_projet_id IS NOT NULL
     ORDER BY r.maj_le DESC, r.instance_id DESC LIMIT 1`, [profilId, generation],
  ) ?? null;
}

export async function lireActionMathsParCle(
  base: Base, profilId: string, generation: number, cle: string,
): Promise<LigneActionMaths | null> {
  return await base.uneLigne<LigneActionMaths>(
    `SELECT instance_id, profil_id, generation_maths, cle_geste, empreinte_requete,
            version_action, effet_json
     FROM actions_maths WHERE profil_id = ? AND generation_maths = ? AND cle_geste = ?`,
    [profilId, generation, cle],
  ) ?? null;
}

export function analyserRepriseMaths(ligne: LigneRepriseMaths, instance: InstanceMathsBase): RepriseMaths {
  const reprise = JSON.parse(ligne.reprise_json) as RepriseMaths;
  return { ...reprise, instance, revision: Number(ligne.revision),
    projet: reprise.projet === null ? null : {
      ...reprise.projet, suspendu: ligne.statut === 'suspendue' || ligne.statut === 'en_attente',
    },
  };
}

export async function lireTentativesMaths(base: Base, profilId: string): Promise<readonly TentativeMaths[]> {
  const lignes = await base.lignes<LigneTentativeMaths & {
    termine_le: string; modele_id: string; version_modele: number; version_generateur: number; graine: number;
  }>(
    `SELECT t.id, t.instance_id, t.profil_id, t.famille, t.niveau, t.projet_id, t.nb_erreurs,
            t.aide_utilisee, t.etoiles, t.solution_json, t.notions_json, t.contexte_json, t.termine_le,
            i.modele_id, i.version_modele, i.version_generateur, i.graine
     FROM tentatives_maths t JOIN instances_maths i ON i.id = t.instance_id AND i.profil_id = t.profil_id
     WHERE t.profil_id = ? ORDER BY t.termine_le, t.rowid`, [profilId],
  );
  return lignes.map((ligne) => ({
    id: ligne.id,
    instanceId: ligne.instance_id,
    definition: { modeleId: ligne.modele_id, versionModele: Number(ligne.version_modele),
      versionGenerateur: Number(ligne.version_generateur), graine: Number(ligne.graine) },
    termineLe: ligne.termine_le,
    famille: ligne.famille,
    niveau: ligne.niveau,
    projetId: ligne.projet_id as TentativeMaths['projetId'],
    erreursValidees: Number(ligne.nb_erreurs),
    aide: ligne.aide_utilisee as TentativeMaths['aide'],
    solution: JSON.parse(ligne.solution_json) as TentativeMaths['solution'],
    etoiles: Number(ligne.etoiles) as TentativeMaths['etoiles'],
    notions: JSON.parse(ligne.notions_json) as TentativeMaths['notions'],
    contexte: JSON.parse(ligne.contexte_json) as TentativeMaths['contexte'],
  }));
}

export interface ProgressionMathsLue {
  readonly famille: FamilleMaths;
  readonly niveau: NiveauMaths;
  readonly projetId: string | null;
  readonly etoiles: 1 | 2 | 3;
  readonly nbTentatives: number;
  readonly dernierLe: string;
}

export interface RecompenseMathsLue {
  readonly projetId: string;
  readonly cadeauId: string;
  readonly categorie: 'souvenir' | 'objet' | 'fete';
  readonly attribueLe: string;
}

export interface ProgressionProjetMathsLue {
  readonly projetId: ProjetMathsId;
  readonly etapesTerminees: number;
  readonly nombreEtapes: number;
  readonly transformationId: string;
  readonly termineLe: string | null;
}

export async function lireProgressionMaths(base: Base, profilId: string): Promise<readonly ProgressionMathsLue[]> {
  const lignes = await base.lignes<{
    famille: FamilleMaths; niveau: NiveauMaths; projet_id: string;
    etoiles: number; nb_tentatives: number; dernier_le: string;
  }>(`SELECT famille, niveau, projet_id, etoiles, nb_tentatives, dernier_le
      FROM progression_maths WHERE profil_id = ? ORDER BY famille, niveau, projet_id`, [profilId]);
  return lignes.map((ligne) => ({
    famille: ligne.famille, niveau: ligne.niveau, projetId: ligne.projet_id || null,
    etoiles: Number(ligne.etoiles) as 1 | 2 | 3,
    nbTentatives: Number(ligne.nb_tentatives), dernierLe: ligne.dernier_le,
  }));
}

export async function lireRecompensesMaths(base: Base, profilId: string): Promise<readonly RecompenseMathsLue[]> {
  const lignes = await base.lignes<{
    projet_id: string; cadeau_id: string; categorie: RecompenseMathsLue['categorie']; attribue_le: string;
  }>(`SELECT projet_id, cadeau_id, categorie, attribue_le
      FROM recompenses_maths WHERE profil_id = ? ORDER BY attribue_le, projet_id`, [profilId]);
  return lignes.map((ligne) => ({
    projetId: ligne.projet_id, cadeauId: ligne.cadeau_id,
    categorie: ligne.categorie, attribueLe: ligne.attribue_le,
  }));
}

export async function lireProgressionProjetsMaths(
  base: Base, profilId: string,
): Promise<readonly ProgressionProjetMathsLue[]> {
  const lignes = await base.lignes<{
    projet_id: string; etapes_terminees: number; nombre_etapes: number;
    transformation_id: string; termine_le: string | null;
  }>(`SELECT projet_id, etapes_terminees, nombre_etapes, transformation_id, termine_le
      FROM progression_projets_maths WHERE profil_id = ? ORDER BY projet_id`, [profilId]);
  return lignes.map((ligne) => ({
    projetId: ligne.projet_id as ProjetMathsId, etapesTerminees: Number(ligne.etapes_terminees),
    nombreEtapes: Number(ligne.nombre_etapes), transformationId: ligne.transformation_id,
    termineLe: ligne.termine_le,
  }));
}

interface LigneEtapeReussie {
  readonly instance_id: string;
  readonly projet_etape: number;
  readonly famille: string;
  readonly niveau: string;
  readonly termine_le: string;
  readonly ordre_inscription: number;
}

function lirePlanFige(session: LigneSessionProjetMaths): readonly EtapeProjetMaths[] {
  const brut: unknown = JSON.parse(session.plan_json);
  if (!Array.isArray(brut) || brut.length === 0 || brut.some((element, rang) =>
    typeof element !== 'object' || element === null ||
    (element as EtapeProjetMaths).rang !== rang ||
    typeof (element as EtapeProjetMaths).instanceId !== 'string' ||
    typeof (element as EtapeProjetMaths).famille !== 'string' ||
    typeof (element as EtapeProjetMaths).niveau !== 'string')) {
    throw new Error(`Plan de projet illisible pour la session ${session.id}.`);
  }
  return brut as EtapeProjetMaths[];
}

/** Les projections lisent seulement le journal maths et le plan immuable de chaque session. */
export async function actualiserProjectionsMaths(transaction: Base, profilId: string): Promise<void> {
  await transaction.lancer('DELETE FROM progression_maths WHERE profil_id = ?', [profilId]);
  await transaction.lancer('DELETE FROM progression_projets_maths WHERE profil_id = ?', [profilId]);
  await transaction.lancer('DELETE FROM recompenses_maths WHERE profil_id = ?', [profilId]);
  await transaction.lancer(
    `INSERT INTO progression_maths
     (profil_id, famille, niveau, projet_id, etoiles, nb_tentatives, dernier_le)
     SELECT profil_id, famille, niveau, COALESCE(projet_id, ''), MAX(etoiles), COUNT(*), MAX(termine_le)
     FROM tentatives_maths WHERE profil_id = ?
     GROUP BY profil_id, famille, niveau, COALESCE(projet_id, '')`, [profilId],
  );

  const sessions = await transaction.lignes<LigneSessionProjetMaths>(
    `SELECT id, profil_id, generation_maths, cle_creation, empreinte_creation, projet_id,
            version_projet, variables_json, plan_json, transformation_id, cadeau_id, cadeau_type, cree_le
     FROM sessions_projets_maths WHERE profil_id = ? ORDER BY cree_le, id`, [profilId],
  );
  const projets = new Map<string, {
    etapesTerminees: number; nombreEtapes: number; transformationId: string; termineLe: string | null; ordreFin: number;
  }>();
  const cadeaux = new Map<string, {
    sessionId: string; cadeauId: string; categorie: 'souvenir' | 'objet' | 'fete'; attribueLe: string; ordreFin: number;
  }>();
  for (const session of sessions) {
    const plan = lirePlanFige(session);
    const reussies = await transaction.lignes<LigneEtapeReussie>(
      `SELECT instance_id, projet_etape, famille, niveau, termine_le,
              COALESCE(json_extract(contexte_json, '$.ordreInscription'), rowid) AS ordre_inscription
       FROM tentatives_maths WHERE profil_id = ? AND session_projet_id = ?`,
      [profilId, session.id],
    );
    const dates = plan.map((etape) => reussies.find((ligne) =>
      ligne.instance_id === etape.instanceId && Number(ligne.projet_etape) === etape.rang &&
      ligne.famille === etape.famille && ligne.niveau === etape.niveau)?.termine_le ?? null);
    const terminees = dates.filter((date): date is string => date !== null);
    const termineLe = terminees.length === plan.length ? [...terminees].sort().at(-1)! : null;
    const ordreFin = termineLe === null ? Number.POSITIVE_INFINITY : Math.max(...reussies.map((r) => Number(r.ordre_inscription)));
    const avant = projets.get(session.projet_id);
    if (avant === undefined || terminees.length > avant.etapesTerminees ||
        (avant.termineLe === null && termineLe !== null) || ordreFin < avant.ordreFin) {
      projets.set(session.projet_id, {
        etapesTerminees: terminees.length, nombreEtapes: plan.length,
        transformationId: session.transformation_id, termineLe, ordreFin,
      });
    }
    if (termineLe !== null && session.cadeau_id !== null && session.cadeau_type !== null) {
      const premier = cadeaux.get(session.projet_id);
      if (premier === undefined || ordreFin < premier.ordreFin) {
        cadeaux.set(session.projet_id, {
          sessionId: session.id, cadeauId: session.cadeau_id,
          categorie: session.cadeau_type, attribueLe: termineLe, ordreFin,
        });
      }
    }
  }
  for (const [projetId, projet] of projets) {
    await transaction.lancer(
      `INSERT INTO progression_projets_maths
       (profil_id, projet_id, etapes_terminees, nombre_etapes, transformation_id, termine_le)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [profilId, projetId, projet.etapesTerminees, projet.nombreEtapes,
        projet.transformationId, projet.termineLe],
    );
  }
  for (const [projetId, cadeau] of cadeaux) {
    await transaction.lancer(
      `INSERT INTO recompenses_maths
       (profil_id, projet_id, session_id, cadeau_id, categorie, attribue_le)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [profilId, projetId, cadeau.sessionId, cadeau.cadeauId,
        cadeau.categorie, cadeau.attribueLe],
    );
  }
}

export async function reconstruireProjectionsMaths(base: Base, profilId: string): Promise<void> {
  await base.transaction(async (transaction) => actualiserProjectionsMaths(transaction, profilId));
}
