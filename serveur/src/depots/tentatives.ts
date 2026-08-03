/**
 * Depot du journal `tentatives` — APPEND-ONLY.
 *
 * Aucune fonction de ce fichier n'emet d'UPDATE ni de DELETE contre `tentatives`. C'est la table
 * qui fait foi (CLAUDE.md) : tout le reste — `progression_noeud`, et demain le BKT et le Leitner —
 * se recalcule depuis elle. La modifier retroactivement rendrait le test de rejeu (annexe T § T2)
 * ininterpretable.
 *
 * IDEMPOTENCE (annexe T § T2, contrat § 6.3) : « rejouer deux fois la meme tentative (reseau
 * capricieux, double tap) ne double pas le score ». La cle est portee par la colonne UNIQUE
 * `cle_idempotence` ; un second envoi rend la tentative deja enregistree, sans rien inserer et
 * sans toucher a la progression.
 */

import { createHash } from 'node:crypto';

import type { DatabaseSync } from 'node:sqlite';

import type {
  CodeMoteur,
  Horloge,
  Horodatage,
  IdExercice,
  IdNoeud,
  IdProfil,
  IdTentative,
  NiveauAide,
  NombreEtoiles,
  ParametresPedagogie,
  ResumeTentative,
  Tentative
} from '@pierre/partage';
import { calculerEtoiles } from '@pierre/partage';

import { dansTransaction } from '../base/connexion.js';
import { journaliserEtapes, listerEtapes } from './etapes.js';
import { appliquerRevue, revueReussie } from './leitner.js';
import { appliquerObservation, observationDeLEtape } from './maitrise.js';
import { toucherProfil } from './profils.js';
import { appliquerTentativeALaProgression } from './progression.js';

import type { EtapeAJournaliser } from './etapes.js';

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

/**
 * Charge utile acceptee par `POST /api/tentatives`, apres validation d'execution.
 *
 * Le corps HTTP est une entree NON FIABLE : il est valide a l'execution, jamais suppose conforme
 * a `TentativeAEnregistrer` par la seule vertu du typage.
 */
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
  /**
   * Nombre d'etapes ECARTEES du journal fin faute de `nbElements` utilisable en mode `ordre`
   * ou `appariement` (lot A1). Doit valoir `0` : c'est le filet, pas un mode de marche.
   * La route le journalise en `warn` — un filet silencieux est un defaut qui dort.
   */
  readonly etapesEcartees: number;
}

/**
 * Ce qu'il faut, en plus de la tentative, pour alimenter BKT et Leitner — lot L2-D.
 *
 * Les competences viennent de l'EXERCICE, jamais de l'etape : `ResumeEtape` ne les porte pas,
 * et les deviner depuis l'identifiant de l'etape serait exactement le genre de raccourci qui
 * rend un indicateur faux sans que rien ne le dise. Une etape qui journalise une confusion
 * porte, elle, sa propre competence : celle-la fait foi (D23).
 *
 * Facultatif a l'appel : quand il manque, la tentative est enregistree normalement mais rien
 * n'alimente la pedagogie. On ne perd jamais une tentative reellement jouee pour un contexte
 * absent (annexe T § T2, « aucune tentative perdue »).
 */
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
 *
 * Le client la calcule normalement lui-meme. Quand il ne l'envoie pas, le serveur la derive au
 * lieu de refuser : une tentative reellement jouee ne doit jamais etre perdue pour un champ
 * manquant (annexe T § T2, « aucune tentative perdue »). Le serveur ne la RECALCULE jamais pour
 * la comparer a celle du client : deux facons de concatener suffiraient a casser l'idempotence.
 */
export function deriverCleIdempotence(
  profilId: string,
  noeudId: string,
  demarreLe: string,
  graine: number
): string {
  const matiere = `${profilId}|${noeudId}|${demarreLe}|${String(graine)}`;
  return createHash('sha256').update(matiere, 'utf8').digest('hex');
}

/** Identifiant de tentative, derive de la cle : deux envois identiques donnent le meme `id`. */
function deriverIdentifiant(cleIdempotence: string): string {
  return `tnt-${createHash('sha256').update(`tentative|${cleIdempotence}`, 'utf8').digest('hex').slice(0, 16)}`;
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
    // `reussi`, `nbErreurs`, `aideUtilisee` et `dureeMs` vivent dans `resume` et nulle part
    // ailleurs (contrat, `ResumeTentative`). Les colonnes SQL du meme nom restent — elles
    // servent l'agregation en base — mais les exposer aussi a plat sur l'objet ferait deux
    // sources de verite pour la meme grandeur.
    resume
  };
}

function lireParCle(base: DatabaseSync, cle: string): Tentative | null {
  const ligne = base
    .prepare(`SELECT ${CHAMPS} FROM tentatives WHERE cle_idempotence = ?`)
    .get(cle) as unknown as LigneTentative | undefined;
  return ligne === undefined ? null : versTentative(ligne);
}

/** Journal complet d'un profil, dans l'ordre ou il s'est ecrit. */
export function listerTentatives(base: DatabaseSync, profilId: string): readonly Tentative[] {
  const lignes = base
    .prepare(`SELECT ${CHAMPS} FROM tentatives WHERE profil_id = ? ORDER BY termine_le, id`)
    .all(profilId) as unknown as LigneTentative[];
  return lignes.map(versTentative);
}

export function compterTentatives(base: DatabaseSync, profilId: string): number {
  const ligne = base
    .prepare('SELECT COUNT(*) AS n FROM tentatives WHERE profil_id = ?')
    .get(profilId) as unknown as { n: number };
  return Number(ligne.n);
}

/**
 * Ecrit une tentative au journal, ou constate qu'elle y est deja.
 *
 * L'insertion et la mise a jour de la projection se font dans UNE transaction : il n'existe
 * aucun instant ou le journal porte une tentative que la progression ignore.
 *
 * `demarre_le` et `termine_le` viennent du CLIENT, qui seul connait la duree reellement vecue par
 * l'enfant ; `horloge` ne sert qu'a dater le dernier acces du profil, cote serveur.
 */
export function enregistrerTentative(
  base: DatabaseSync,
  validee: TentativeValidee,
  horloge: Horloge,
  pedagogie?: AlimentationPedagogique
): ResultatEnregistrement {
  // Le bareme vit uniquement dans `calculerEtoiles` (contrat § 5.7) : le serveur ne le rejoue
  // pas. Le bornage a [0, 3] n'est pas un second bareme, c'est le respect de la contrainte CHECK
  // de la colonne — une tentative reellement jouee ne doit pas etre perdue sur un 500.
  const etoiles = Math.min(3, Math.max(0, Math.trunc(Number(calculerEtoiles(validee.resume)))));
  const aideUtilisee = NIVEAUX_AIDE.includes(validee.resume.aideUtilisee)
    ? validee.resume.aideUtilisee
    : 'aucune';

  return dansTransaction(base, () => {
    const dejaLa = lireParCle(base, validee.cleIdempotence);
    if (dejaLa !== null) {
      return { deja: true, tentative: dejaLa, etapesJournalisees: 0, etapesEcartees: 0 };
    }

    try {
      base
        .prepare(
          `INSERT INTO tentatives (${CHAMPS})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          deriverIdentifiant(validee.cleIdempotence),
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
        );
    } catch (erreur) {
      // Ceinture et bretelles. `BEGIN IMMEDIATE` serialise deja les ecrivains, donc le
      // « je lis puis j'insere » ci-dessus est atomique. Si la contrainte UNIQUE parle quand
      // meme, c'est qu'un autre processus a gagne la course : sa tentative fait foi, la notre
      // est le doublon que l'idempotence doit absorber — pas une erreur a remonter a l'enfant.
      const concurrente = lireParCle(base, validee.cleIdempotence);
      if (concurrente !== null) {
        return { deja: true, tentative: concurrente, etapesJournalisees: 0, etapesEcartees: 0 };
      }
      throw erreur;
    }

    appliquerTentativeALaProgression(
      base,
      validee.profil,
      validee.noeud,
      etoiles,
      validee.termineLe
    );

    toucherProfil(base, validee.profil, horloge);

    const inseree = lireParCle(base, validee.cleIdempotence);
    if (inseree === null) {
      throw new Error("La tentative vient d'etre inseree et reste introuvable.");
    }

    // Journal fin et projections pedagogiques, DANS LA MEME TRANSACTION que la tentative : il
    // n'existe aucun instant ou le journal porte une tentative dont les etapes manquent, ni ou
    // une maitrise refleterait une etape que le journal ignore.
    const alimentation = alimenterPedagogie(base, inseree.id, validee, pedagogie);

    return {
      deja: false,
      tentative: inseree,
      etapesJournalisees: alimentation.journalisees,
      etapesEcartees: alimentation.ecartees
    };
  });
}

/**
 * Inscrit les etapes au journal fin, puis avance BKT et Leitner — lot L2-D.
 *
 * L'ordre compte : le journal d'abord, les projections ensuite et A PARTIR DE LUI. C'est ce qui
 * garantit que le chemin incremental et `recalculerMaitrise` voient exactement la meme suite
 * d'observations ; les faire diverger d'un champ suffirait a rendre le rejeu ininterpretable.
 *
 * La competence d'une etape est celle de sa CONFUSION quand elle en journalise une (D23 : la
 * confusion sait de quelle competence elle releve), sinon la premiere competence de l'exercice.
 * Une etape sans confusion et sans exercice connu n'est pas journalisee : on prefere une ligne
 * absente a une ligne rattachee a une competence inventee.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * FILET DU LOT A1 (Q-I14) — une etape mal formee ne fait plus PERDRE la tentative.
 *
 * Une etape en mode `ordre` ou `appariement` sans `nbElements` faisait lever `pDevinette`
 * (D13) depuis ce fichier, DANS la transaction qui venait d'inserer la tentative. La
 * transaction etait annulee, la route rendait 500, et rien n'etait enregistre : ni le
 * journal, ni les etoiles, ni la progression du noeud. L'enfant voyait sa recompense et
 * l'acquis disparaissait — l'exact contraire de R14.
 *
 * On applique donc a `nbElements` la regle deja en vigueur ici pour la competence : l'etape
 * fautive est ECARTEE du journal fin, et rien d'autre ne bouge. Ce n'est pas un defaut
 * invente — c'est une ligne absente, et le compte remonte a la route qui l'inscrit en `warn`.
 * Journaliser l'etape avec un `nbElements` suppose ferait monter la maitrise estimee sur des
 * reponses au hasard (la « regression pedagogique silencieuse » de l'annexe T § 1) ; et
 * l'inserer telle quelle empoisonnerait le journal pour toujours, puisque `recalculerMaitrise`
 * releve la table a chaque appel et leverait a son tour.
 *
 * Une valeur NON nulle, meme egale a 1, n'est pas ecartee : `journaliserEtapes` la borne deja
 * par `Math.max(2, ...)` et les deux chemins du BKT relisent le journal. Le seul cas qui
 * levait est l'absence.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */
function alimenterPedagogie(
  base: DatabaseSync,
  tentativeId: string,
  validee: TentativeValidee,
  pedagogie: AlimentationPedagogique | undefined
): { readonly journalisees: number; readonly ecartees: number } {
  if (pedagogie === undefined || validee.resume.etapes.length === 0) {
    return { journalisees: 0, ecartees: 0 };
  }

  /**
   * ARBITRAGE Q-INT-4, tranché par le parent — option « code ».
   *
   * Une réussite est désormais imputée à **toutes** les compétences déclarées par l'exercice,
   * et non plus à `competences[0]` seule. Le recensement par objet avait mesuré, sur les 76
   * exercices, **3 compétences sur 29 qui ne pouvaient jamais recevoir la moindre réussite**
   * — `comp.consigne.multiple`, `gph.rare.gn`, `gph.rare.ph`. Elles restaient vertes pour R12,
   * qui compte le déclaré, avec un journal vide pour toujours : le BKT et le Leitner ne les
   * auraient jamais vues monter, et le tableau du parent aurait affiché un progrès imaginaire.
   *
   * **Une confusion observée, elle, ne se dilue pas.** Elle NOMME sa compétence : c'est un
   * signal précis sur une paire de lettres, l'imputer aux autres compétences de l'exercice le
   * noierait. Elle reste donc seule créditée.
   */
  const competencesDeclarees = pedagogie.competences
    .map((competence) => competence.trim())
    .filter((competence) => competence !== '');

  let ecartees = 0;
  const aJournaliser: EtapeAJournaliser[] = [];
  validee.resume.etapes.forEach((etape, rang) => {
    const nommeeParLaConfusion = etape.confusion?.competence?.trim() ?? '';
    const cibles =
      nommeeParLaConfusion !== '' ? [nommeeParLaConfusion] : competencesDeclarees;
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
        // R14 : `ResumeTentative.reussi` vaut toujours `true`, une etape finit toujours par
        // aboutir. Ce qui informe le BKT, c'est de savoir si elle a abouti SANS erreur.
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

  const inserees = journaliserEtapes(base, aJournaliser, validee.termineLe);
  if (inserees === 0) {
    return { journalisees: 0, ecartees };
  }

  // On relit le journal plutot que de reutiliser les objets en memoire : les projections
  // doivent voir EXACTEMENT ce que le recalcul integral verra, colonnes bornees comprises.
  //
  // ⚠ LES DEUX PROJECTIONS N'ONT PAS LA MEME CLE, et depuis Q-INT-4 cela decide de leur
  // justesse :
  //   · la MAITRISE est indexee par COMPETENCE — chaque ligne l'alimente, c'est le but meme
  //     de l'arbitrage : trois competences declarees, trois maitrises nourries ;
  //   · le LEITNER est indexe par ITEM ATOMIQUE (`etape.identifiant`) — un grapheme, un mot.
  //     La competence n'y entre pas.
  //
  // Une etape produisant desormais une ligne PAR competence, appeler `appliquerRevue` sur
  // chacune promouvrait le MEME item plusieurs fois pour une seule reussite : de la boite 1 a
  // la boite 3 d'un coup, soit J+1 devenu J+7. La revision espacee se serait deregle en
  // silence — mesure a l'ecriture : `tests/api/parcours-humains.test.ts` (« a des revisions a
  // faire a J+3 ») et `pedagogie.test.ts` (« ne rend que les items dus ») sont tombes ensemble.
  //
  // On dedoublonne donc par item : **une etape vaut une revision**, quel que soit le nombre de
  // competences creditees.
  // Meme critere que `recalculerLeitner` — (tentative, rang) et non l'identifiant seul : c'est
  // l'ETAPE qui vaut une revision. Les deux chemins doivent dedoublonner a l'identique, sinon
  // le recalcul integral diverge de l'incrementale et le rejeu le signale.
  const etapesRevues = new Set<number>();
  for (const etape of listerEtapes(base, validee.profil)) {
    if (etape.tentativeId !== tentativeId) {
      continue;
    }
    appliquerObservation(base, validee.profil, observationDeLEtape(etape), pedagogie.parametres);
    if (etapesRevues.has(etape.rang)) {
      continue;
    }
    etapesRevues.add(etape.rang);
    appliquerRevue(
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
