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
  GainCascade,
  Horloge,
  Horodatage,
  IdExercice,
  IdNoeud,
  IdProfil,
  IdTentative,
  NiveauAide,
  NombreEtoiles,
  ParametresPedagogie,
  RecompenseObtenue,
  ResumeTentative,
  SeuilsCascade,
  Tentative
} from '@pierre/partage';
import { calculerEtoiles } from '@pierre/partage';
import { jaugesDe } from '@pierre/partage/recompenses';
import type { FormeDeclaree } from '@pierre/partage/monde';

import { dansTransaction } from '../base/connexion.js';
import { appliquerTentativeALaCascadeAvecGain, chargerSeuilsCascade, lireCascade } from './cascade.js';
import { journaliserEtapes, listerEtapes } from './etapes.js';
import { appliquerRevue, revueReussie } from './leitner.js';
import { appliquerObservation, observationDeLEtape } from './maitrise.js';
import { chargerReferentielMonde, enregistrerFormeGobi, lireFormes } from './monde.js';
import { toucherProfil } from './profils.js';
import { appliquerTentativeALaProgression } from './progression.js';

import type { EtapeAJournaliser } from './etapes.js';
import type { ReferentielMonde } from './monde.js';

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
  /**
   * Le gain de la cascade de recompenses (D25) — lot A1 (R31).
   *
   * Jamais `null` : meme un profil qui n'a rien gagne a une cascade, vide mais reelle. Sur un
   * rejeu idempotent (`deja: true`), c'est l'etat COURANT sans rien de neuf — `paliersFranchis`
   * et `recompenses` vides, `jauges` a jour — parce qu'un second envoi de la meme tentative ne
   * doit RIEN faire bouger deux fois (contrat § 6.3, meme regle que la progression).
   */
  readonly gainCascade: GainCascade;
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
 * Le gain de cascade tel qu'il est AUJOURD'HUI, sans rien y appliquer — lot A1 (R31).
 *
 * Sert les deux chemins qui ne doivent RIEN faire bouger : le rejeu idempotent (une meme cle
 * envoyee deux fois) et la course concurrente absorbee par la contrainte UNIQUE. Le contrat
 * § 6.3 dit deja « rien d'autre ne bouge » pour la progression ; la cascade suit la meme regle,
 * sans quoi un double-tap sur reseau capricieux compterait deux fois les etoiles d'un seul nœud.
 */
function gainCascadeActuel(
  base: DatabaseSync,
  profilId: string,
  seuils: SeuilsCascade
): GainCascade {
  const etat = lireCascade(base, profilId);
  return { etat, paliersFranchis: [], recompenses: [], jauges: jaugesDe(etat, seuils) };
}

/**
 * Le PROCHAIN grapheme du referentiel que ce profil ne possede pas encore — lot A1 (R31).
 *
 * L'ordre est celui declare par `contenu/monde/gobi-stades.json` (a, e, i, o, u, b, …) : c'est
 * l'ordre pedagogique du jeu, et `stadeApresFormes` (`partage/src/monde/gobi.ts`) ne se soucie
 * que du NOMBRE de formes obtenues, jamais de leur identite — aucun autre ordre n'est prescrit
 * ailleurs dans les specs. `null` quand les 25 formes sont deja toutes obtenues : il n'y a alors
 * plus rien a attribuer, et ce n'est pas une erreur.
 */
function prochaineFormeAOffrir(
  base: DatabaseSync,
  profilId: string,
  referentiel: ReferentielMonde
): FormeDeclaree | null {
  const possedees = new Set(lireFormes(base, profilId, referentiel).map((forme) => forme.grapheme));
  return referentiel.formes.find((forme) => !possedees.has(forme.grapheme)) ?? null;
}

/**
 * Applique la cascade de D25 au nœud qui vient de se clore, et attribue VRAIMENT ce qu'elle
 * annonce — lot A1, point 3 du § 2 de la feuille de route (R31).
 *
 * `appliquerTentativeALaCascadeAvecGain` fait le calcul pur et l'ecriture de
 * `progression_cascade` ; elle ne peut pas faire plus, par construction (elle ne connait ni
 * Gobi ni le referentiel — `partage/src/recompenses/cascade.ts` le dit explicitement : « choisir
 * QUELLE forme de Gobi ou QUELLE zone est remise appartient au monde, pas a la cascade »). C'est
 * ici, au niveau du DEPOT serveur, que ce choix se fait : pour chaque palier `intermediaire`
 * franchi par CETTE tentative, on offre le prochain grapheme non possede et on l'ecrit dans
 * `formes_gobi` via `enregistrerFormeGobi` — qui existait deja et n'etait appelee par personne
 * (feuille-de-route § 2). Le palier `rare` (« zone-recoloriee ») n'a besoin d'aucune ecriture
 * supplementaire : la recoloration des regions est deja une PROJECTION recalculee depuis
 * `progression_noeud` (`depots/monde.ts`, regle H1) — corriger R31 la rend deja « vraie ».
 */
function appliquerCascadeEtRecompenses(
  base: DatabaseSync,
  profilId: string,
  etoiles: NombreEtoiles,
  termineLe: Horodatage,
  horloge: Horloge,
  seuils: SeuilsCascade,
  referentiel: ReferentielMonde
): GainCascade {
  const gain = appliquerTentativeALaCascadeAvecGain(base, profilId, etoiles, seuils, termineLe);

  if (!gain.paliersFranchis.includes('intermediaire')) {
    return gain;
  }

  const recompenses: RecompenseObtenue[] = gain.recompenses.map((recompense) => {
    if (recompense.palier !== 'intermediaire') {
      return recompense;
    }
    const forme = prochaineFormeAOffrir(base, profilId, referentiel);
    if (forme === null) {
      // Les 25 formes sont deja toutes obtenues : rien de plus a donner, on ne journalise rien.
      return recompense;
    }
    enregistrerFormeGobi(base, profilId, forme.grapheme, referentiel, horloge);
    return { ...recompense, reference: forme.grapheme, asset: forme.cristal };
  });

  return { ...gain, recompenses };
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
  // Le bornage rendait `number`, ce qui suffisait tant que `etoiles` n'allait qu'en base. Le lot
  // A1 le passe maintenant a `appliquerCascadeEtRecompenses(… etoiles: NombreEtoiles …)`, et
  // `tsc -b` l'a refuse (TS2345, mesure de l'orchestrateur). On garde le bornage — il protege la
  // contrainte CHECK — mais on le fait rendre le type etroit PAR CONSTRUCTION, sans transtypage :
  // l'index est deja borne a [0, 3] juste au-dessus, le `?? 0` n'est la que pour TypeScript.
  const ETOILES: readonly NombreEtoiles[] = [0, 1, 2, 3];
  const etoiles: NombreEtoiles =
    ETOILES[Math.min(3, Math.max(0, Math.trunc(Number(calculerEtoiles(validee.resume)))))] ?? 0;
  const aideUtilisee = NIVEAUX_AIDE.includes(validee.resume.aideUtilisee)
    ? validee.resume.aideUtilisee
    : 'aucune';

  // Lot A1 (R31) : charges une fois par chemin (memoises), lus AVANT la branche qui en a besoin
  // pour que les trois issues de la transaction — rejeu, course concurrente, ecriture reelle —
  // rendent toutes un `gainCascade` construit de la meme facon.
  const seuilsCascade = chargerSeuilsCascade();

  return dansTransaction(base, () => {
    const dejaLa = lireParCle(base, validee.cleIdempotence);
    if (dejaLa !== null) {
      return {
        deja: true,
        tentative: dejaLa,
        etapesJournalisees: 0,
        etapesEcartees: 0,
        gainCascade: gainCascadeActuel(base, validee.profil, seuilsCascade)
      };
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
        return {
          deja: true,
          tentative: concurrente,
          etapesJournalisees: 0,
          etapesEcartees: 0,
          gainCascade: gainCascadeActuel(base, validee.profil, seuilsCascade)
        };
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

    // ══════════════════════════════════════════════════════════════════════════════════════
    // LA CASCADE DE D25, ENFIN APPLIQUEE ICI — lot A1, LE DEFAUT N°1 DU JEU (R31).
    //
    // `appliquerTentativeALaCascadeAvecGain` et `enregistrerFormeGobi` existaient deja, etaient
    // justes, etaient testees, et n'etaient appelees par PERSONNE (feuille-de-route § 2). Le
    // client calculait la cascade lui-meme, dans une variable qui repartait de zero a chaque
    // rechargement (`magasin.ts`) : rien de ce que l'enfant gagnait n'etait jamais ecrit.
    //
    // DANS LA MEME TRANSACTION que la tentative, comme la progression et la pedagogie ci-dessus :
    // il ne doit jamais exister d'instant ou une tentative est journalisee sans que sa cascade
    // le soit aussi.
    // ══════════════════════════════════════════════════════════════════════════════════════
    const referentielMonde = chargerReferentielMonde();
    const gainCascade = appliquerCascadeEtRecompenses(
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
