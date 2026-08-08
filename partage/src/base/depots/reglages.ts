/**
 * Depot des reglages de lecture et des essais typographiques — lot L2-B.
 *
 * Deux tables, deux natures opposees, et il vaut la peine de les distinguer :
 *
 * - `reglages_lecture` est un CHOIX de l'enfant. Ce n'est pas une projection, rien ne le
 *   recalcule depuis le journal, et c'est la seule table de ce lot qui accepte un UPDATE.
 * - `essais_typographie` est le protocole A/B de D19. Ses RESULTATS, eux, se recalculent
 *   depuis `etapes_tentative` (migration 003, lot L2-D) : la table ne garde que la definition
 *   de l'essai, jamais ses conclusions. Une conclusion stockee serait une conclusion figee.
 *
 * `normaliserReglages` est appelee A LA LECTURE comme A L'ECRITURE. C'est deliberement
 * redondant : une ligne ecrite par une version anterieure, ou par une main, ne doit pas rendre
 * un profil injouable. « Une valeur hors bornes est RAMENEE, jamais rejetee. »
 *
 * Porté sur le contrat `Base` — Docs/addendum-portage-android.md § 4.
 */

import type { Horodatage, IdProfil } from '../../identifiants.js';
import type { Horloge } from '../../horloge.js';
import { REGLAGES_PAR_DEFAUT, normaliserReglages, comparer } from '../../lecture/index.js';
import type {
  ComparaisonTypographie,
  EssaiTypographie,
  ReglagesLecture,
  ResultatBras,
} from '../../lecture/index.js';
import type { Base } from '../contrat.js';

/** Une ligne de `reglages_lecture`. */
interface LigneReglages {
  readonly profil_id: string;
  readonly police: string;
  readonly corps_px: number;
  readonly interlettrage_em: number;
  readonly espacement_mots_em: number;
  readonly interligne: number;
  readonly coloration_syllabique: number;
  readonly surlignage_ligne: number;
  readonly regle_de_lecture: number;
  readonly fond: string;
  readonly modifie_le: string;
}

interface LigneEssai {
  readonly id: string;
  readonly profil_id: string;
  readonly competence: string;
  readonly bras_json: string;
  readonly ouvert_le: string;
  readonly cloture_le: string | null;
}

const CHAMPS_REGLAGES =
  'profil_id, police, corps_px, interlettrage_em, espacement_mots_em, interligne, ' +
  'coloration_syllabique, surlignage_ligne, regle_de_lecture, fond, modifie_le';

const CHAMPS_ESSAI = 'id, profil_id, competence, bras_json, ouvert_le, cloture_le';

function versReglages(ligne: LigneReglages): ReglagesLecture {
  // `normaliserReglages` fait le travail de validation : on lui donne des valeurs brutes et
  // elle rend un objet complet et borne. Aucun `as CodePolice` ici — un transtypage aveugle
  // laisserait passer une police inconnue jusqu'a l'ecran de l'enfant.
  return normaliserReglages({
    police: ligne.police as ReglagesLecture['police'],
    corpsPx: Number(ligne.corps_px),
    interlettrageEm: Number(ligne.interlettrage_em),
    espacementMotsEm: Number(ligne.espacement_mots_em),
    interligne: Number(ligne.interligne),
    colorationSyllabique: Number(ligne.coloration_syllabique) === 1,
    surlignageLigneCourante: Number(ligne.surlignage_ligne) === 1,
    regleDeLecture: Number(ligne.regle_de_lecture) === 1,
    fond: ligne.fond as ReglagesLecture['fond'],
  });
}

/**
 * Les reglages d'un profil.
 *
 * Un profil sans ligne rend LES DEFAUTS, jamais `null` : « aucun ecran d'echec » vaut aussi
 * pour l'absence de donnee. Un enfant qui n'a jamais ouvert l'ecran de reglages lit en Andika
 * a 24 px, ce qui est exactement ce qu'on veut.
 */
export async function lireReglages(base: Base, profilId: string): Promise<ReglagesLecture> {
  const ligne = await base.uneLigne<LigneReglages>(
    `SELECT ${CHAMPS_REGLAGES} FROM reglages_lecture WHERE profil_id = ?`,
    [profilId]
  );
  return ligne === undefined ? REGLAGES_PAR_DEFAUT : versReglages(ligne);
}

/** Vrai si le profil a deja pose ses propres reglages. Sert au dashboard parent, pas au jeu. */
export async function reglagesPersonnalises(base: Base, profilId: string): Promise<boolean> {
  return (
    (await base.uneLigne('SELECT 1 FROM reglages_lecture WHERE profil_id = ?', [profilId])) !==
    undefined
  );
}

/**
 * Ecrit les reglages d'un profil et rend ce qui est REELLEMENT enregistre.
 *
 * Le corps entrant est partiel : l'ecran n'envoie qu'un champ a la fois. On part donc des
 * reglages courants — defauts compris — et on applique le delta, ce qui rend l'operation
 * idempotente et sans surprise. Rendre l'etat relu, et non l'etat voulu, est la seule facon
 * qu'un `PUT` ne mente jamais sur ce qui est en base.
 */
export async function ecrireReglages(
  base: Base,
  profilId: string,
  demande: Partial<ReglagesLecture>,
  horloge: Horloge,
): Promise<ReglagesLecture> {
  const courants = await lireReglages(base, profilId);
  const voulus = normaliserReglages({ ...courants, ...demande });
  const instant: Horodatage = horloge.maintenant();

  await base.lancer(
    `INSERT INTO reglages_lecture (${CHAMPS_REGLAGES}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(profil_id) DO UPDATE SET
       police = excluded.police,
       corps_px = excluded.corps_px,
       interlettrage_em = excluded.interlettrage_em,
       espacement_mots_em = excluded.espacement_mots_em,
       interligne = excluded.interligne,
       coloration_syllabique = excluded.coloration_syllabique,
       surlignage_ligne = excluded.surlignage_ligne,
       regle_de_lecture = excluded.regle_de_lecture,
       fond = excluded.fond,
       modifie_le = excluded.modifie_le`,
    [
      profilId,
      voulus.police,
      voulus.corpsPx,
      voulus.interlettrageEm,
      voulus.espacementMotsEm,
      voulus.interligne,
      voulus.colorationSyllabique ? 1 : 0,
      voulus.surlignageLigneCourante ? 1 : 0,
      voulus.regleDeLecture ? 1 : 0,
      voulus.fond,
      String(instant),
    ]
  );

  return lireReglages(base, profilId);
}

// ─────────────────────────────────────────────────────────── protocole A/B de D19

function versEssai(ligne: LigneEssai): EssaiTypographie | null {
  let bras: unknown;
  try {
    bras = JSON.parse(ligne.bras_json);
  } catch {
    return null;
  }
  // Exactement deux bras. Une comparaison a trois n'est pas lisible (contrat § 4.2), et une
  // ligne qui en porterait trois est une donnee fautive : on l'IGNORE au lieu d'en tirer une
  // comparaison bancale que le parent croirait valide.
  if (!Array.isArray(bras) || bras.length !== 2) {
    return null;
  }
  return {
    id: String(ligne.id),
    profil: String(ligne.profil_id) as IdProfil,
    competence: String(ligne.competence),
    bras: [bras[0], bras[1]] as EssaiTypographie['bras'],
    ouvertLe: String(ligne.ouvert_le) as Horodatage,
    clotureLe: ligne.cloture_le === null ? null : (String(ligne.cloture_le) as Horodatage),
  };
}

/** L'essai ouvert d'un profil, le plus recent d'abord. `null` s'il n'y en a aucun. */
export async function lireEssaiOuvert(base: Base, profilId: string): Promise<EssaiTypographie | null> {
  const ligne = await base.uneLigne<LigneEssai>(
    `SELECT ${CHAMPS_ESSAI} FROM essais_typographie
     WHERE profil_id = ? AND cloture_le IS NULL
     ORDER BY ouvert_le DESC, id DESC LIMIT 1`,
    [profilId]
  );
  return ligne === undefined ? null : versEssai(ligne);
}

export async function ouvrirEssai(
  base: Base,
  essai: Omit<EssaiTypographie, 'clotureLe'>,
): Promise<EssaiTypographie> {
  await base.lancer(`INSERT INTO essais_typographie (${CHAMPS_ESSAI}) VALUES (?, ?, ?, ?, ?, ?)`, [
    essai.id,
    String(essai.profil),
    essai.competence,
    JSON.stringify(essai.bras),
    String(essai.ouvertLe),
    null,
  ]);
  return { ...essai, clotureLe: null };
}

/**
 * La comparaison courante d'un profil, ou `null` s'il n'y a aucun essai ouvert.
 *
 * ⚠ DETTE EXPLICITE, a dire dans le rapport. Les deux `ResultatBras` doivent se calculer
 * depuis `etapes_tentative` — la table qui porte la latence de reconnaissance (D18) et qui est
 * ecrite par la migration 003 du lot L2-D. Tant que L2-D n'a pas rendu, cette fonction ne
 * PEUT pas mesurer, et elle rend donc des resultats a zero tentative. `comparer` repond alors
 * `brasFavorable: null`, ce qui est exactement le comportement voulu : « ne jamais conclure sur
 * un bras a trois tentatives », et a plus forte raison sur un bras a zero. Le jour ou la table
 * existe, seul le corps de `mesurerBras` change ; aucune interface ne bouge.
 */
export async function lireComparaison(
  base: Base,
  profilId: string,
): Promise<ComparaisonTypographie | null> {
  const essai = await lireEssaiOuvert(base, profilId);
  if (essai === null) {
    return null;
  }
  const resultats: readonly [ResultatBras, ResultatBras] = [
    mesurerBras(essai, 0),
    mesurerBras(essai, 1),
  ];
  return comparer(essai, resultats);
}

function mesurerBras(essai: EssaiTypographie, rang: 0 | 1): ResultatBras {
  return {
    configuration: essai.bras[rang],
    nbTentatives: 0,
    latenceMedianeMs: 0,
    tauxErreur: 0,
  };
}
