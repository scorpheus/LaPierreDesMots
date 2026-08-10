/**
 * Projection `maitrise_competence` — recalculable, jamais source de verite. Lot L2-D.
 *
 * Meme discipline que `progression.ts` du socle v1 : DEUX chemins qui doivent rendre exactement
 * le meme resultat.
 *
 * - `appliquerObservation` — incremental, appele a chaque tentative enregistree ;
 * - `recalculerMaitrise`   — reconstruction integrale depuis `etapes_tentative`.
 *
 * Leur egalite est le test T2 « Recalculs » de l'annexe T § T2, et c'est le SEUL filet contre la
 * regression pedagogique silencieuse.
 *
 * `acquise_le` s'ecrit `COALESCE(ancien, nouveau)`, JAMAIS `nouveau` : un acquis n'est jamais
 * repris (R14, contrat des features v2 § 6).
 *
 * Porté sur le contrat `Base` — Docs/addendum-portage-android.md § 4. Le CHARGEMENT des
 * paramètres pédagogiques (`node:fs`) est sorti de ce fichier — voir
 * `serveur/src/referentiels/pedagogie.ts` — et `ParametresPedagogie` arrive désormais en
 * paramètre à toute fonction qui en a besoin, exactement comme avant.
 */

import type { CodeCompetence, Horodatage } from '../../identifiants.js';
import type { EtatMaitrise, ObservationTentative, ParametresPedagogie } from '../../pedagogie/types.js';
import { estAcquise, etatMaitriseInitial, mettreAJourMaitrise } from '../../pedagogie/bkt.js';
import type { Base } from '../contrat.js';
import { listerEtapes } from './etapes.js';
import type { EtapeJournalisee } from './etapes.js';

interface LigneMaitrise {
  readonly competence: string;
  readonly p: number;
  readonly nb_tentatives: number;
  readonly jours_distincts_json: string;
  readonly nb_faible_devinette: number;
  readonly acquise_le: string | null;
}

const CHAMPS = `competence, p, nb_tentatives, jours_distincts_json, nb_faible_devinette, acquise_le`;

function versEtat(ligne: LigneMaitrise): EtatMaitrise {
  let jours: readonly string[] = [];
  try {
    const analyse: unknown = JSON.parse(String(ligne.jours_distincts_json));
    jours = Array.isArray(analyse) ? (analyse as string[]).map(String) : [];
  } catch {
    jours = [];
  }
  return {
    competence: String(ligne.competence) as CodeCompetence,
    p: Number(ligne.p),
    nbTentatives: Number(ligne.nb_tentatives),
    joursDistincts: jours,
    nbTentativesFaibleDevinette: Number(ligne.nb_faible_devinette),
    acquiseLe: ligne.acquise_le === null ? null : (String(ligne.acquise_le) as Horodatage)
  };
}

/** Etat de maitrise d'un profil, tel que le sert `GET /api/profils/:id/maitrise`. */
export async function lireMaitrises(base: Base, profilId: string): Promise<readonly EtatMaitrise[]> {
  const lignes = await base.lignes<LigneMaitrise>(
    `SELECT ${CHAMPS} FROM maitrise_competence WHERE profil_id = ? ORDER BY competence`,
    [profilId]
  );
  return lignes.map(versEtat);
}

export async function lireMaitrise(
  base: Base,
  profilId: string,
  competence: string
): Promise<EtatMaitrise | null> {
  const ligne = await base.uneLigne<LigneMaitrise>(
    `SELECT ${CHAMPS} FROM maitrise_competence WHERE profil_id = ? AND competence = ?`,
    [profilId, competence]
  );
  return ligne === undefined ? null : versEtat(ligne);
}

/**
 * Ecrit un etat, en preservant `acquise_le`.
 *
 * `COALESCE(maitrise_competence.acquise_le, excluded.acquise_le)` est la traduction en SQL de
 * « un acquis n'est jamais repris » (R14), exactement comme `MAX(...)` l'est pour les etoiles
 * de `progression_noeud` au contrat v1 § 6.3.
 */
async function ecrire(base: Base, profilId: string, etat: EtatMaitrise): Promise<void> {
  await base.lancer(
    `INSERT INTO maitrise_competence
       (profil_id, competence, p, nb_tentatives, jours_distincts_json,
        nb_faible_devinette, acquise_le)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (profil_id, competence) DO UPDATE SET
       p                    = excluded.p,
       nb_tentatives        = excluded.nb_tentatives,
       jours_distincts_json = excluded.jours_distincts_json,
       nb_faible_devinette  = excluded.nb_faible_devinette,
       acquise_le           = COALESCE(maitrise_competence.acquise_le, excluded.acquise_le)`,
    [
      profilId,
      etat.competence,
      Math.min(1, Math.max(0, etat.p)),
      Math.max(0, Math.trunc(etat.nbTentatives)),
      JSON.stringify(etat.joursDistincts),
      Math.max(0, Math.trunc(etat.nbTentativesFaibleDevinette)),
      etat.acquiseLe
    ]
  );
}

/**
 * Applique UNE observation a l'etat de maitrise, purement puis en base.
 *
 * `acquiseLe` est pose ICI et nulle part ailleurs : `mettreAJourMaitrise` le reconduit sans
 * jamais le poser (elle ne connait pas le critere complet, et surtout pas l'instant a
 * inscrire). Une fois pose, il ne bouge plus — ni ici, ni au recalcul.
 */
export async function appliquerObservation(
  base: Base,
  profilId: string,
  observation: ObservationTentative,
  parametres: ParametresPedagogie
): Promise<EtatMaitrise> {
  const depart =
    (await lireMaitrise(base, profilId, observation.competence)) ??
    etatMaitriseInitial(observation.competence, parametres.bkt);

  const suivant = mettreAJourMaitrise(depart, observation, parametres.bkt, parametres.acquis);
  const avecAcquis: EtatMaitrise = {
    ...suivant,
    acquiseLe:
      suivant.acquiseLe ??
      (estAcquise(suivant, parametres.acquis) ? observation.instant : null)
  };

  await ecrire(base, profilId, avecAcquis);
  return avecAcquis;
}

/**
 * Une etape du journal, telle que le BKT la lit.
 *
 * `reussi` vaut « aboutie sans erreur ». Ce n'est PAS `ResumeTentative.reussi`, qui vaut
 * toujours `true` (R14 : aucun ecran d'echec, toute session finit sur une reussite).
 */
export function observationDeLEtape(etape: EtapeJournalisee): ObservationTentative {
  return {
    competence: etape.competence as CodeCompetence,
    reussi: etape.reussi,
    modeReponse: etape.modeReponse,
    nbElements: etape.nbElements,
    avecAide: etape.aideUtilisee !== 'aucune',
    instant: etape.journaliseLe
  };
}

/**
 * Reconstruit integralement la maitrise d'un profil depuis `etapes_tentative`.
 *
 * `acquise_le` est repose au PREMIER instant ou le critere est satisfait — pas au dernier :
 * c'est ce qui rend le recalcul identique a l'incremental, ou `COALESCE` garde le premier.
 */
export async function recalculerMaitrise(
  base: Base,
  profilId: string,
  parametres: ParametresPedagogie
): Promise<readonly EtatMaitrise[]> {
  await base.lancer('DELETE FROM maitrise_competence WHERE profil_id = ?', [profilId]);

  const etats = new Map<string, EtatMaitrise>();
  for (const etape of await listerEtapes(base, profilId)) {
    const observation = observationDeLEtape(etape);
    const depart =
      etats.get(observation.competence) ??
      etatMaitriseInitial(observation.competence, parametres.bkt);
    const suivant = mettreAJourMaitrise(depart, observation, parametres.bkt, parametres.acquis);
    etats.set(observation.competence, {
      ...suivant,
      acquiseLe:
        suivant.acquiseLe ??
        (estAcquise(suivant, parametres.acquis) ? observation.instant : null)
    });
  }

  for (const etat of etats.values()) {
    await ecrire(base, profilId, etat);
  }
  return lireMaitrises(base, profilId);
}

/** Recalcule la maitrise de tous les profils. Rend le nombre de profils traites. */
export async function recalculerToutesLesMaitrises(base: Base, parametres: ParametresPedagogie): Promise<number> {
  const lignes = await base.lignes<{ id: string }>('SELECT id FROM profils ORDER BY id');
  for (const ligne of lignes) {
    await recalculerMaitrise(base, String(ligne.id), parametres);
  }
  return lignes.length;
}
