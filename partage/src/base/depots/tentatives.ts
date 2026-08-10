/**
 * Depot du journal `tentatives` — APPEND-ONLY.
 *
 * Aucune fonction de ce fichier n'emet d'UPDATE ni de DELETE contre `tentatives`. C'est la table
 * qui fait foi (CLAUDE.md) : tout le reste — `progression_noeud`, le BKT et le Leitner — se
 * recalcule depuis elle.
 *
 * IDEMPOTENCE (annexe T § T2, contrat § 6.3) : « rejouer deux fois la meme tentative ne double
 * pas le score ». La cle est portee par la colonne UNIQUE `cle_idempotence`.
 *
 * Porté sur le contrat `Base` — Docs/addendum-portage-android.md § 4. `enregistrerTentative`
 * recevait `seuilsCascade` et `referentielMonde` via deux chargeurs `node:fs` internes
 * (`chargerSeuilsCascade`, `chargerReferentielMonde`) : les deux sont désormais des PARAMÈTRES,
 * chargés par l'appelant (serveur ou app autonome) — ce dépôt ne touche plus jamais le disque.
 */

import type {
  CodeMoteur, Horodatage, IdExercice, IdNoeud, IdProfil, IdTentative,
} from '../../identifiants.js';
import type { NombreEtoiles, Tentative } from '../../journal/types.js';
import type { NiveauAide, ResumeTentative } from '../../moteurs/types.js';
import type { Horloge } from '../../horloge.js';
import type { ParametresPedagogie } from '../../pedagogie/types.js';
import { calculerEtoiles } from '../../etoiles.js';
import type { GainCascade, RecompenseObtenue, SeuilsCascade } from '../../recompenses/types.js';
import { jaugesDe } from '../../recompenses/cascade.js';
import type { FormeDeclaree } from '../../monde/gobi.js';
import { hacherSha256Hex } from '../hachage.js';
import type { Base } from '../contrat.js';

import { appliquerTentativeALaCascadeAvecGain, lireCascade } from './cascade.js';
import { journaliserEtapes, listerEtapes } from './etapes.js';
import type { EtapeAJournaliser } from './etapes.js';
import { appliquerRevue, revueReussie } from './leitner.js';
import { appliquerObservation, observationDeLEtape } from './maitrise.js';
import { enregistrerFormeGobi, lireFormes } from './monde.js';
import type { ReferentielMonde } from './monde.js';
import { toucherProfil } from './profils.js';
import { appliquerTentativeALaProgression } from './progression.js';

/** Les trois paliers de la v2 § 5.4, tels que la contrainte CHECK de la table les accepte. */
const NIVEAUX_AIDE: readonly string[] = ['aucune', 'indice', 'demonstration'];

/**
 * Les deux modes dont `p_devinette` vaut `1 / n!` et se calcule depuis `nbElements` (D13).
 *
 * Meme liste que `MODES_CALCULES` de `partage/src/pedagogie/bkt.ts`. Elle est recopiee ici
 * plutot qu'importee a dessein : ce fichier doit savoir DECIDER de journaliser une etape sans
 * appeler `pDevinette`, dont la levee est justement ce qu'on veut eviter.
 */
const MODES_P_DEVINETTE_CALCULEE: readonly string[] = ['ordre', 'appariement'];

interface LigneTentative {
  readonly id: string;
  readonly cle_idempotence: string;
  readonly profil_id: string;
  readonly noeud_id: string;
  readonly exercice_id: string;
  readonly moteur: string;
  readonly habillage: string;
  readonly graine: number;
  readonly demarre_le: string;
  readonly termine_le: string;
  readonly duree_ms: number;
  readonly reussi: number;
  readonly nb_erreurs: number;
  readonly aide_utilisee: string;
  readonly etoiles: number;
  readonly detail_json: string;
}

/** Charge utile acceptee par `POST /api/tentatives`, apres validation d'execution. */
export interface TentativeValidee {
  readonly cleIdempotence: string;
  readonly profil: string;
  readonly noeud: string;
  readonly exercice: string;
  readonly moteur: string;
  readonly habillage: string;
  readonly graine: number;
  readonly demarreLe: string;
  readonly termineLe: string;
  readonly resume: ResumeTentative;
}

export interface ResultatEnregistrement {
  /** `true` si la tentative etait deja au journal : rien n'a ete insere. */
  readonly deja: boolean;
  readonly tentative: Tentative;
  /** Nombre d'etapes reellement inscrites au journal fin. `0` sur un rejeu. */
  readonly etapesJournalisees: number;
  /** Nombre d'etapes ECARTEES du journal fin faute de `nbElements` utilisable (lot A1). */
  readonly etapesEcartees: number;
  /** Le gain de la cascade de recompenses (D25) — lot A1 (R31). Jamais `null`. */
  readonly gainCascade: GainCascade;
}

/** Ce qu'il faut, en plus de la tentative, pour alimenter BKT et Leitner — lot L2-D. */
export interface AlimentationPedagogique {
  /** Les competences de l'exercice, dans l'ordre du referentiel. Peut etre vide. */
  readonly competences: readonly string[];
  readonly parametres: ParametresPedagogie;
}

const CHAMPS = `id, cle_idempotence, profil_id, noeud_id, exercice_id, moteur, habillage, graine,
  demarre_le, termine_le, duree_ms, reussi, nb_erreurs, aide_utilisee, etoiles, detail_json`;

/**
 * Cle d'idempotence de repli, formule du contrat § 6.3 :
 * `sha256(profil_id | noeud_id | demarre_le | graine)`.
 */
export async function deriverCleIdempotence(
  profilId: string,
  noeudId: string,
  demarreLe: string,
  graine: number
): Promise<string> {
  return hacherSha256Hex(`${profilId}|${noeudId}|${demarreLe}|${String(graine)}`);
}

/** Identifiant de tentative, derive de la cle : deux envois identiques donnent le meme `id`. */
async function deriverIdentifiant(cleIdempotence: string): Promise<string> {
  const empreinte = await hacherSha256Hex(`tentative|${cleIdempotence}`);
  return `tnt-${empreinte.slice(0, 16)}`;
}

function versTentative(ligne: LigneTentative): Tentative {
  let resume: ResumeTentative;
  try {
    resume = JSON.parse(String(ligne.detail_json)) as ResumeTentative;
  } catch {
    resume = {
      reussi: Number(ligne.reussi) === 1,
      nbErreurs: Number(ligne.nb_erreurs),
      aideUtilisee: String(ligne.aide_utilisee) as NiveauAide,
      dureeMs: Number(ligne.duree_ms),
      etapes: []
    };
  }

  return {
    id: String(ligne.id) as IdTentative,
    cleIdempotence: String(ligne.cle_idempotence),
    profil: String(ligne.profil_id) as IdProfil,
    noeud: String(ligne.noeud_id) as IdNoeud,
    exercice: String(ligne.exercice_id) as IdExercice,
    moteur: String(ligne.moteur) as CodeMoteur,
    habillage: String(ligne.habillage),
    graine: Number(ligne.graine),
    demarreLe: String(ligne.demarre_le) as Horodatage,
    termineLe: String(ligne.termine_le) as Horodatage,
    etoiles: Number(ligne.etoiles) as NombreEtoiles,
    resume
  };
}

async function lireParCle(base: Base, cle: string): Promise<Tentative | null> {
  const ligne = await base.uneLigne<LigneTentative>(
    `SELECT ${CHAMPS} FROM tentatives WHERE cle_idempotence = ?`,
    [cle]
  );
  return ligne === undefined ? null : versTentative(ligne);
}

/** Journal complet d'un profil, dans l'ordre ou il s'est ecrit. */
export async function listerTentatives(base: Base, profilId: string): Promise<readonly Tentative[]> {
  const lignes = await base.lignes<LigneTentative>(
    `SELECT ${CHAMPS} FROM tentatives WHERE profil_id = ? ORDER BY termine_le, id`,
    [profilId]
  );
  return lignes.map(versTentative);
}

export async function compterTentatives(base: Base, profilId: string): Promise<number> {
  const ligne = await base.uneLigne<{ n: number }>(
    'SELECT COUNT(*) AS n FROM tentatives WHERE profil_id = ?',
    [profilId]
  );
  return Number(ligne?.n ?? 0);
}

/** Le gain de cascade tel qu'il est AUJOURD'HUI, sans rien y appliquer — lot A1 (R31). */
async function gainCascadeActuel(base: Base, profilId: string, seuils: SeuilsCascade): Promise<GainCascade> {
  const etat = await lireCascade(base, profilId);
  return { etat, paliersFranchis: [], recompenses: [], jauges: jaugesDe(etat, seuils) };
}

/** Le PROCHAIN grapheme du referentiel que ce profil ne possede pas encore — lot A1 (R31). */
async function prochaineFormeAOffrir(
  base: Base,
  profilId: string,
  referentiel: ReferentielMonde
): Promise<FormeDeclaree | null> {
  const possedees = new Set((await lireFormes(base, profilId, referentiel)).map((forme) => forme.grapheme));
  return referentiel.formes.find((forme) => !possedees.has(forme.grapheme)) ?? null;
}

/**
 * Applique la cascade de D25 au nœud qui vient de se clore, et attribue VRAIMENT ce qu'elle
 * annonce — lot A1, point 3 du § 2 de la feuille de route (R31).
 */
async function appliquerCascadeEtRecompenses(
  base: Base,
  profilId: string,
  etoiles: NombreEtoiles,
  termineLe: Horodatage,
  horloge: Horloge,
  seuils: SeuilsCascade,
  referentiel: ReferentielMonde
): Promise<GainCascade> {
  const gain = await appliquerTentativeALaCascadeAvecGain(base, profilId, etoiles, seuils, termineLe);

  if (!gain.paliersFranchis.includes('intermediaire')) {
    return gain;
  }

  const recompenses: RecompenseObtenue[] = [];
  for (const recompense of gain.recompenses) {
    if (recompense.palier !== 'intermediaire') {
      recompenses.push(recompense);
      continue;
    }
    const forme = await prochaineFormeAOffrir(base, profilId, referentiel);
    if (forme === null) {
      recompenses.push(recompense);
      continue;
    }
    await enregistrerFormeGobi(base, profilId, forme.grapheme, referentiel, horloge);
    recompenses.push({ ...recompense, reference: forme.grapheme, asset: forme.cristal });
  }

  return { ...gain, recompenses };
}

/**
 * Ecrit une tentative au journal, ou constate qu'elle y est deja.
 *
 * L'insertion et la mise a jour de la projection se font dans UNE transaction : il n'existe
 * aucun instant ou le journal porte une tentative que la progression ignore.
 */
export async function enregistrerTentative(
  base: Base,
  validee: TentativeValidee,
  horloge: Horloge,
  seuilsCascade: SeuilsCascade,
  referentielMonde: ReferentielMonde,
  pedagogie?: AlimentationPedagogique
): Promise<ResultatEnregistrement> {
  const ETOILES: readonly NombreEtoiles[] = [0, 1, 2, 3];
  const etoiles: NombreEtoiles =
    ETOILES[Math.min(3, Math.max(0, Math.trunc(Number(calculerEtoiles(validee.resume)))))] ?? 0;
  const aideUtilisee = NIVEAUX_AIDE.includes(validee.resume.aideUtilisee)
    ? validee.resume.aideUtilisee
    : 'aucune';

  return base.transaction(async () => {
    const dejaLa = await lireParCle(base, validee.cleIdempotence);
    if (dejaLa !== null) {
      return {
        deja: true,
        tentative: dejaLa,
        etapesJournalisees: 0,
        etapesEcartees: 0,
        gainCascade: await gainCascadeActuel(base, validee.profil, seuilsCascade)
      };
    }

    try {
      await base.lancer(`INSERT INTO tentatives (${CHAMPS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        await deriverIdentifiant(validee.cleIdempotence),
        validee.cleIdempotence,
        validee.profil,
        validee.noeud,
        validee.exercice,
        validee.moteur,
        validee.habillage,
        Math.trunc(validee.graine),
        validee.demarreLe,
        validee.termineLe,
        Math.max(0, Math.trunc(validee.resume.dureeMs)),
        validee.resume.reussi ? 1 : 0,
        Math.max(0, Math.trunc(validee.resume.nbErreurs)),
        aideUtilisee,
        etoiles,
        JSON.stringify(validee.resume)
      ]);
    } catch (erreur) {
      // Ceinture et bretelles. `BEGIN IMMEDIATE` (ou l'equivalent de l'adaptateur) serialise
      // deja les ecrivains ; si la contrainte UNIQUE parle quand meme, un autre processus a
      // gagne la course : sa tentative fait foi, la notre est le doublon que l'idempotence doit
      // absorber — pas une erreur a remonter a l'enfant.
      const concurrente = await lireParCle(base, validee.cleIdempotence);
      if (concurrente !== null) {
        return {
          deja: true,
          tentative: concurrente,
          etapesJournalisees: 0,
          etapesEcartees: 0,
          gainCascade: await gainCascadeActuel(base, validee.profil, seuilsCascade)
        };
      }
      throw erreur;
    }

    await appliquerTentativeALaProgression(base, validee.profil, validee.noeud, etoiles, validee.termineLe);
    await toucherProfil(base, validee.profil, horloge);

    const inseree = await lireParCle(base, validee.cleIdempotence);
    if (inseree === null) {
      throw new Error("La tentative vient d'etre inseree et reste introuvable.");
    }

    const alimentation = await alimenterPedagogie(base, inseree.id, validee, pedagogie);

    const gainCascade = await appliquerCascadeEtRecompenses(
      base,
      validee.profil,
      etoiles,
      validee.termineLe,
      horloge,
      seuilsCascade,
      referentielMonde
    );

    return {
      deja: false,
      tentative: inseree,
      etapesJournalisees: alimentation.journalisees,
      etapesEcartees: alimentation.ecartees,
      gainCascade
    };
  });
}

/**
 * Inscrit les etapes au journal fin, puis avance BKT et Leitner — lot L2-D.
 *
 * FILET DU LOT A1 (Q-I14) — une etape mal formee ne fait plus PERDRE la tentative : elle est
 * ECARTEE du journal fin plutot que de faire lever `pDevinette` DANS la transaction.
 */
async function alimenterPedagogie(
  base: Base,
  tentativeId: string,
  validee: TentativeValidee,
  pedagogie: AlimentationPedagogique | undefined
): Promise<{ readonly journalisees: number; readonly ecartees: number }> {
  if (pedagogie === undefined || validee.resume.etapes.length === 0) {
    return { journalisees: 0, ecartees: 0 };
  }

  /**
   * ARBITRAGE Q-INT-4 : une reussite est imputee a **toutes** les competences declarees par
   * l'exercice. Une confusion observee, elle, NOMME sa competence et reste seule creditee.
   */
  const competencesDeclarees = pedagogie.competences
    .map((competence) => competence.trim())
    .filter((competence) => competence !== '');

  let ecartees = 0;
  const aJournaliser: EtapeAJournaliser[] = [];
  validee.resume.etapes.forEach((etape, rang) => {
    const nommeeParLaConfusion = etape.confusion?.competence?.trim() ?? '';
    const cibles = nommeeParLaConfusion !== '' ? [nommeeParLaConfusion] : competencesDeclarees;
    if (cibles.length === 0) {
      return;
    }
    if (
      MODES_P_DEVINETTE_CALCULEE.includes(etape.modeReponse) &&
      (typeof etape.nbElements !== 'number' || !Number.isFinite(etape.nbElements))
    ) {
      ecartees += 1;
      return;
    }
    for (const competence of cibles) {
      aJournaliser.push({
        tentativeId,
        profilId: validee.profil,
        rang,
        identifiant: etape.identifiant,
        competence,
        modeReponse: etape.modeReponse,
        reussi: etape.nbErreurs === 0,
        nbErreurs: etape.nbErreurs,
        aideUtilisee: etape.aideUtilisee,
        dureeMs: etape.dureeMs,
        latenceMs: etape.latenceMs,
        nbElements: etape.nbElements ?? null,
        confusion: etape.confusion
      });
    }
  });

  const inserees = await journaliserEtapes(base, aJournaliser, validee.termineLe);
  if (inserees === 0) {
    return { journalisees: 0, ecartees };
  }

  // ⚠ LES DEUX PROJECTIONS N'ONT PAS LA MEME CLE (voir depots/leitner.ts et depots/maitrise.ts) :
  // la MAITRISE est indexee par COMPETENCE, le LEITNER par ITEM ATOMIQUE. On dedoublonne donc
  // par (tentative, rang) pour le Leitner — une etape vaut une revision, quel que soit le
  // nombre de competences creditees.
  const etapesRevues = new Set<number>();
  for (const etape of await listerEtapes(base, validee.profil)) {
    if (etape.tentativeId !== tentativeId) {
      continue;
    }
    await appliquerObservation(base, validee.profil, observationDeLEtape(etape), pedagogie.parametres);
    if (etapesRevues.has(etape.rang)) {
      continue;
    }
    etapesRevues.add(etape.rang);
    await appliquerRevue(
      base,
      validee.profil,
      etape.identifiant,
      revueReussie(etape),
      pedagogie.parametres,
      etape.journaliseLe
    );
  }

  return { journalisees: inserees, ecartees };
}
