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
 * regression pedagogique silencieuse : « un ajustement du BKT ne casse rien visiblement, et la
 * progression est devenue absurde. Personne ne le voit avant trois semaines. »
 *
 * | colonne              | recalcul integral            | incremental                        |
 * |----------------------|------------------------------|------------------------------------|
 * | `p`, compteurs       | rejeu de toutes les etapes   | une etape de plus sur l'etat lu    |
 * | `acquise_le`         | premier instant ou le critere | COALESCE(ancien, nouveau)          |
 *
 * `acquise_le` s'ecrit `COALESCE(ancien, nouveau)`, JAMAIS `nouveau` : un acquis n'est jamais
 * repris (R14, contrat des features v2 § 6).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import type {
  CodeCompetence,
  EtatMaitrise,
  Horodatage,
  ObservationTentative,
  ParametresPedagogie
} from '@pierre/partage';
import {
  estAcquise,
  etatMaitriseInitial,
  lireParametresPedagogie,
  mettreAJourMaitrise
} from '@pierre/partage/pedagogie';

import { RACINE_DEPOT } from '../configuration.js';
import { listerEtapes } from './etapes.js';

import type { EtapeJournalisee } from './etapes.js';

/** Le fichier de parametres, seul endroit ou vivent les valeurs pedagogiques (C2, D13). */
export const CHEMIN_PARAMETRES_PEDAGOGIE = path.join(
  RACINE_DEPOT,
  'contenu',
  'referentiel',
  'parametres-pedagogie.json'
);

const CACHE_PARAMETRES = new Map<string, ParametresPedagogie>();

/**
 * Charge et valide les parametres pedagogiques, une fois par chemin.
 *
 * Le fichier est lu au demarrage et memorise : le relire a chaque tentative ferait dependre la
 * pedagogie de l'etat du disque au milieu d'une session. `lireParametresPedagogie` LEVE plutot
 * que de completer — un parametre manquant doit se voir au demarrage, pas dans trois semaines
 * dans une courbe (D13).
 */
export function chargerParametresPedagogie(
  chemin: string = CHEMIN_PARAMETRES_PEDAGOGIE
): ParametresPedagogie {
  const memorise = CACHE_PARAMETRES.get(chemin);
  if (memorise !== undefined) {
    return memorise;
  }
  const parametres = lireParametresPedagogie(JSON.parse(readFileSync(chemin, 'utf8')));
  CACHE_PARAMETRES.set(chemin, parametres);
  return parametres;
}

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
export function lireMaitrises(base: DatabaseSync, profilId: string): readonly EtatMaitrise[] {
  const lignes = base
    .prepare(
      `SELECT ${CHAMPS} FROM maitrise_competence WHERE profil_id = ? ORDER BY competence`
    )
    .all(profilId) as unknown as LigneMaitrise[];
  return lignes.map(versEtat);
}

export function lireMaitrise(
  base: DatabaseSync,
  profilId: string,
  competence: string
): EtatMaitrise | null {
  const ligne = base
    .prepare(`SELECT ${CHAMPS} FROM maitrise_competence WHERE profil_id = ? AND competence = ?`)
    .get(profilId, competence) as unknown as LigneMaitrise | undefined;
  return ligne === undefined ? null : versEtat(ligne);
}

/**
 * Ecrit un etat, en preservant `acquise_le`.
 *
 * `COALESCE(maitrise_competence.acquise_le, excluded.acquise_le)` est la traduction en SQL de
 * « un acquis n'est jamais repris » (R14), exactement comme `MAX(...)` l'est pour les etoiles
 * de `progression_noeud` au contrat v1 § 6.3.
 */
function ecrire(base: DatabaseSync, profilId: string, etat: EtatMaitrise): void {
  base
    .prepare(
      `INSERT INTO maitrise_competence
         (profil_id, competence, p, nb_tentatives, jours_distincts_json,
          nb_faible_devinette, acquise_le)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (profil_id, competence) DO UPDATE SET
         p                    = excluded.p,
         nb_tentatives        = excluded.nb_tentatives,
         jours_distincts_json = excluded.jours_distincts_json,
         nb_faible_devinette  = excluded.nb_faible_devinette,
         acquise_le           = COALESCE(maitrise_competence.acquise_le, excluded.acquise_le)`
    )
    .run(
      profilId,
      etat.competence,
      Math.min(1, Math.max(0, etat.p)),
      Math.max(0, Math.trunc(etat.nbTentatives)),
      JSON.stringify(etat.joursDistincts),
      Math.max(0, Math.trunc(etat.nbTentativesFaibleDevinette)),
      etat.acquiseLe
    );
}

/**
 * Applique UNE observation a l'etat de maitrise, purement puis en base.
 *
 * `acquiseLe` est pose ICI et nulle part ailleurs : `mettreAJourMaitrise` le reconduit sans
 * jamais le poser (elle ne connait pas le critere complet, et surtout pas l'instant a
 * inscrire). Une fois pose, il ne bouge plus — ni ici, ni au recalcul.
 */
export function appliquerObservation(
  base: DatabaseSync,
  profilId: string,
  observation: ObservationTentative,
  parametres: ParametresPedagogie
): EtatMaitrise {
  const depart =
    lireMaitrise(base, profilId, observation.competence) ??
    etatMaitriseInitial(observation.competence, parametres.bkt);

  const suivant = mettreAJourMaitrise(depart, observation, parametres.bkt, parametres.acquis);
  const avecAcquis: EtatMaitrise = {
    ...suivant,
    acquiseLe:
      suivant.acquiseLe ??
      (estAcquise(suivant, parametres.acquis) ? observation.instant : null)
  };

  ecrire(base, profilId, avecAcquis);
  return avecAcquis;
}

/**
 * Une etape du journal, telle que le BKT la lit.
 *
 * `reussi` vaut « aboutie sans erreur ». Ce n'est PAS `ResumeTentative.reussi`, qui vaut
 * toujours `true` (R14 : aucun ecran d'echec, toute session finit sur une reussite). Prendre
 * ce dernier ferait monter `p` a chaque passage, quoi qu'il arrive : le BKT deviendrait un
 * compteur de tentatives deguise, et c'est exactement le « detecteur creux » que le projet
 * s'interdit.
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
 * C'est le RECALCULER complet de l'annexe T § T2. Il efface la projection avant de la
 * reconstruire : la projection n'a aucune information que le journal ne porte pas. Si un jour
 * elle en avait une, ce serait une seconde source de verite et le journal ne ferait plus foi.
 *
 * `acquise_le` est repose au PREMIER instant ou le critere est satisfait — pas au dernier :
 * c'est ce qui rend le recalcul identique a l'incremental, ou `COALESCE` garde le premier.
 */
export function recalculerMaitrise(
  base: DatabaseSync,
  profilId: string,
  parametres: ParametresPedagogie
): readonly EtatMaitrise[] {
  base.prepare('DELETE FROM maitrise_competence WHERE profil_id = ?').run(profilId);

  const etats = new Map<string, EtatMaitrise>();
  for (const etape of listerEtapes(base, profilId)) {
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
    ecrire(base, profilId, etat);
  }
  return lireMaitrises(base, profilId);
}

/** Recalcule la maitrise de tous les profils. Rend le nombre de profils traites. */
export function recalculerToutesLesMaitrises(
  base: DatabaseSync,
  parametres: ParametresPedagogie
): number {
  const lignes = base.prepare('SELECT id FROM profils ORDER BY id').all() as unknown as {
    id: string;
  }[];
  for (const ligne of lignes) {
    recalculerMaitrise(base, String(ligne.id), parametres);
  }
  return lignes.length;
}
