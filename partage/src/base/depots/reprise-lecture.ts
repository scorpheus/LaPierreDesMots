/** Reprise lecture en SQLite, avec génération du profil et révision comparée dans une transaction. */
import type { Base } from '../contrat.js';
import type { Horloge } from '../../horloge.js';
import type { IdProfil } from '../../identifiants.js';
import {
  analyserInstantaneLecture, decoderInstantaneLecture, encoderEtatLecture,
} from '../../reprise-lecture/index.js';
import type { InstantaneRepriseLecture } from '../../reprise-lecture/index.js';

interface LigneReprise {
  readonly generation_progression: number;
  readonly revision: number;
  readonly version_contrat: number;
  readonly version_moteur: number;
  readonly instantane_json: string;
}

export type CodeErreurRepriseLecture =
  | 'profil-introuvable' | 'generation-perimee' | 'revision-conflictuelle' | 'instantane-corrompu';

export class ErreurRepriseLecture extends Error {
  constructor(readonly code: CodeErreurRepriseLecture) {
    super(code);
    this.name = 'ErreurRepriseLecture';
  }
}

async function generationCourante(base: Base, profil: IdProfil): Promise<number> {
  const ligne = await base.uneLigne<{ generation_progression: number }>(
    'SELECT generation_progression FROM profils WHERE id = ?', [profil]);
  if (ligne === undefined) throw new ErreurRepriseLecture('profil-introuvable');
  return Number(ligne.generation_progression);
}

async function ligneCourante(base: Base, profil: IdProfil): Promise<LigneReprise | undefined> {
  return base.uneLigne<LigneReprise>(
    'SELECT generation_progression, revision, version_contrat, version_moteur, instantane_json ' +
    'FROM reprises_lecture WHERE profil_id = ?', [profil]);
}

function decoderLigne(ligne: LigneReprise, profil: IdProfil): InstantaneRepriseLecture {
  let instantane: InstantaneRepriseLecture;
  try { instantane = decoderInstantaneLecture(ligne.instantane_json); }
  catch { throw new ErreurRepriseLecture('instantane-corrompu'); }
  if (instantane.profil !== profil ||
      instantane.generationProgression !== Number(ligne.generation_progression) ||
      instantane.revision !== Number(ligne.revision) ||
      instantane.versionContrat !== Number(ligne.version_contrat) ||
      instantane.versionMoteur !== Number(ligne.version_moteur)) {
    throw new ErreurRepriseLecture('instantane-corrompu');
  }
  return instantane;
}

function canoniser(valeur: unknown): string {
  if (Array.isArray(valeur)) return `[${valeur.map(canoniser).join(',')}]`;
  if (valeur !== null && typeof valeur === 'object') {
    return `{${Object.entries(valeur).sort(([a], [b]) => a.localeCompare(b))
      .map(([cle, element]) => `${JSON.stringify(cle)}:${canoniser(element)}`).join(',')}}`;
  }
  const json = JSON.stringify(valeur);
  if (typeof json !== 'string') throw new Error('Valeur JSON non canonisable.');
  return json;
}

function memeContenu(gauche: InstantaneRepriseLecture, droite: InstantaneRepriseLecture): boolean {
  return canoniser({ ...gauche, revision: 0 }) === canoniser({ ...droite, revision: 0 });
}

export async function lireRepriseLecture(base: Base, profil: IdProfil): Promise<InstantaneRepriseLecture | null> {
  const generation = await generationCourante(base, profil);
  const ligne = await ligneCourante(base, profil);
  if (ligne === undefined) return null;
  if (Number(ligne.generation_progression) !== generation) {
    throw new ErreurRepriseLecture('generation-perimee');
  }
  return decoderLigne(ligne, profil);
}

export async function ecrireRepriseLecture(
  base: Base,
  horloge: Horloge,
  instantaneBrut: unknown,
  revisionAttendue: number | null,
): Promise<number> {
  const instantane = analyserInstantaneLecture(instantaneBrut);
  if ((revisionAttendue === null && instantane.revision !== 0) ||
      (revisionAttendue !== null && (!Number.isSafeInteger(revisionAttendue) ||
        revisionAttendue < 0 || instantane.revision !== revisionAttendue))) {
    throw new ErreurRepriseLecture('revision-conflictuelle');
  }
  return base.transaction(async (transaction) => {
    const generation = await generationCourante(transaction, instantane.profil);
    if (generation !== instantane.generationProgression) {
      throw new ErreurRepriseLecture('generation-perimee');
    }
    const ancienne = await ligneCourante(transaction, instantane.profil);
    if (ancienne !== undefined) {
      if (Number(ancienne.generation_progression) !== generation) {
        throw new ErreurRepriseLecture('generation-perimee');
      }
      const precedente = decoderLigne(ancienne, instantane.profil);
      if (memeContenu(precedente, instantane)) return precedente.revision;
      if (revisionAttendue !== precedente.revision) {
        throw new ErreurRepriseLecture('revision-conflictuelle');
      }
      const revision = precedente.revision + 1;
      const miseAJour = { ...instantane, revision };
      const resultat = await transaction.lancer(
        'UPDATE reprises_lecture SET revision = ?, version_contrat = ?, version_moteur = ?, ' +
        'instantane_json = ?, maj_le = ? WHERE profil_id = ? AND generation_progression = ? AND revision = ?',
        [revision, miseAJour.versionContrat, miseAJour.versionMoteur, encoderEtatLecture(miseAJour),
          String(horloge.maintenant()), instantane.profil, generation, precedente.revision]);
      if (resultat.changements !== 1) throw new ErreurRepriseLecture('revision-conflictuelle');
      return revision;
    }
    if (revisionAttendue !== null) throw new ErreurRepriseLecture('revision-conflictuelle');
    const premiere = { ...instantane, revision: 1 };
    await transaction.lancer(
      'INSERT INTO reprises_lecture (profil_id, generation_progression, revision, version_contrat, ' +
      'version_moteur, instantane_json, maj_le) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [premiere.profil, generation, 1, premiere.versionContrat, premiere.versionMoteur,
        encoderEtatLecture(premiere), String(horloge.maintenant())]);
    return 1;
  });
}

export async function effacerRepriseLecture(
  base: Base, profil: IdProfil, generationProgression: number, revisionAttendue: number,
): Promise<void> {
  if (!Number.isSafeInteger(generationProgression) || generationProgression < 0 ||
      !Number.isSafeInteger(revisionAttendue) || revisionAttendue < 0) {
    throw new ErreurRepriseLecture('revision-conflictuelle');
  }
  await base.transaction(async (transaction) => {
    const generation = await generationCourante(transaction, profil);
    if (generation !== generationProgression) throw new ErreurRepriseLecture('generation-perimee');
    const ligne = await ligneCourante(transaction, profil);
    if (ligne === undefined) return;
    if (Number(ligne.generation_progression) !== generation) {
      throw new ErreurRepriseLecture('generation-perimee');
    }
    if (Number(ligne.revision) !== revisionAttendue) {
      throw new ErreurRepriseLecture('revision-conflictuelle');
    }
    const resultat = await transaction.lancer(
      'DELETE FROM reprises_lecture WHERE profil_id = ? AND generation_progression = ? AND revision = ?',
      [profil, generation, revisionAttendue]);
    if (resultat.changements !== 1) throw new ErreurRepriseLecture('revision-conflictuelle');
  });
}
