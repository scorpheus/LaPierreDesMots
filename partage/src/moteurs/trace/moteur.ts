/**
 * `moteurTrace` — la mécanique pure du tracé de lettre au doigt. Lot L2-C, clôt O11.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.3.
 *
 * Aucun DOM, aucun `setTimeout`, aucun `Date.now`, aucun `Math.random` : le temps entre par
 * `ContexteMoteur.horloge` et l'action `battementHorloge` fait mûrir les seuils.
 *
 * TROIS RÈGLES DURES : `resume().reussi` vaut toujours `true` (R14, produit par le socle
 * commun) ; `niveauAide` est monotone croissant (`niveauAideSuivant`, jamais recodé) ; le
 * barème d'étoiles n'est pas réimplanté (`calculerEtoiles`, contrat v1 § 5.7).
 *
 * CE QUE CE MOTEUR JOURNALISE, et qui n'existe nulle part ailleurs : **l'axe** de la
 * confusion, jamais la paire en bloc (D23). `etat.axeConfondu` est renseigné par
 * `evaluerTrait`, qui le MESURE par réflexion géométrique — voir `validation.ts`.
 *
 * ÉCART AU CONTRAT GELÉ n° 4, signalé au rapport — `EtatTrace` (§ 4.3.3) porte UN seul jeu
 * de compteurs (`nbErreurs`, `niveauAide`, `premiereActionMs`, `derniereActionMs`), pas un
 * par lettre. Le résumé émet donc **une étape par tentative**, et non une par lettre. Une
 * granularité par lettre serait préférable pour le BKT ; elle demanderait d'ajouter des
 * compteurs par lettre à l'état gelé, ce que ce lot ne fait pas de son propre chef.
 */

import type {
  AideProposee,
  NiveauAide,
  ContexteMoteur,
  EntreeMoteur,
  Moteur,
  ProgressionMoteur,
  ResumeTentative,
} from '../types.js';
import type { AxeMiroir, ConfusionObservee } from '../../pedagogie/types.js';
import {
  DELAIS_AIDE_PAR_DEFAUT,
  aideLaPlusHaute,
  construireAide,
  niveauAideSuivant,
  progressionDepuisEtapes,
  resumeDepuisEtapes,
} from '../commun/index.js';
import type { EtapeGenerique, EtatAidable } from '../commun/index.js';
import { COUVERTURE_MINIMALE, REFUS_TRACE_COMPTE_ERREUR, evaluerTrait } from './validation.js';
import { SCHEMA_CONTENU_TRACE } from './schema-contenu.js';
import type { MotifRefusTrace } from './validation.js';
import type {
  ActionTrace,
  AideTrace,
  ContenuTrace,
  EtatTrace,
  EtatTrait,
  ModeleLettre,
  TraitLettre,
} from './types.js';

/** Le mode de réponse de tout item `trace` — D13 : « on ne trace pas une lettre par hasard ». */
const MODE_REPONSE = 'trace' as const;

/** Un geste de moins de deux points n'est pas un geste : c'est un tap. */
const ECHANTILLONS_MINIMUM = 2;

/** Le modèle actif, ou `null` si l'exercice est allé au bout. */
function lettreActive(etat: EtatTrace): ModeleLettre | null {
  return etat.lettres[etat.indexLettre] ?? null;
}

/** Le trait attendu à cet instant, ou `null`. */
function traitAttendu(etat: EtatTrace): TraitLettre | null {
  return lettreActive(etat)?.traits[etat.indexTrait] ?? null;
}

/**
 * `EtatTrace` vu comme un `EtatAidable` du socle commun.
 *
 * L'adaptateur existe parce que le contrat gelé nomme le début de la tentative `demarreMs`
 * dans `EtatTrace` (§ 4.3.3) et `debutMs` dans `EtatAidable` (§ 4.3.1). Deux noms pour la
 * même grandeur : on les réconcilie ICI, en un point unique, plutôt que de renommer un champ
 * gelé que d'autres lots lisent.
 */
function vueAidable(etat: EtatTrace): EtatAidable {
  return {
    nbErreurs: etat.nbErreurs,
    niveauAide: etat.niveauAide,
    debutMs: etat.demarreMs,
    derniereActionMs: etat.derniereActionMs,
    instantIndiceMs: etat.instantIndiceMs,
  };
}

/** Rang global d'un trait dans la liste aplatie `etat.traits`. */
function rangGlobal(etat: EtatTrace, indexLettre: number, indexTrait: number): number {
  let rang = 0;
  for (let l = 0; l < indexLettre; l += 1) rang += etat.lettres[l]?.traits.length ?? 0;
  return rang + indexTrait;
}

/**
 * La confusion observée, telle que le dashboard la lira.
 *
 * `rendu` est le JUMEAU de paire, pas une invention : sur l'axe `gauche-droite`, un `b`
 * réfléchi EST un `d`, et c'est ce que l'enfant a produit. `null` tant qu'aucun axe n'a été
 * mesuré — un moteur qui remplirait ce champ « au cas où » rendrait le top 10 de D23
 * illisible.
 *
 * ÉCART AU CONTRAT GELÉ n° 5, signalé au rapport — `ConfusionObservee.competence` est
 * obligatoire, et un moteur n'a aucun accès aux compétences de son exercice (elles vivent
 * dans l'enveloppe, jamais dans `jeu.contenu`). Le code est donc DÉRIVÉ de l'axe, ce qui est
 * exactement la clé d'agrégation dont le top 10 a besoin. Les deux codes
 * `gph.miroir.gauche-droite` et `gph.miroir.haut-bas` sont consignés dans
 * `Docs/questions-en-attente.md` à l'intention de L2-D, qui possède `competences.json`.
 */
function confusionDe(etat: EtatTrace): ConfusionObservee | null {
  const axe: AxeMiroir | null = etat.axeConfondu;
  if (axe === null) return null;
  const lettre = lettreActive(etat) ?? etat.lettres[etat.lettres.length - 1] ?? null;
  if (lettre === null || etat.paire === null) return null;
  const attendu = lettre.lettre;
  const rendu = etat.paire.a === attendu ? etat.paire.b : etat.paire.a;
  return { attendu, rendu, axe, competence: `gph.miroir.${axe}` };
}

/** L'étape unique de la tentative — voir l'écart n° 4 en tête de fichier. */
function etapeDe(etat: EtatTrace): EtapeGenerique {
  const lettre = lettreActive(etat) ?? etat.lettres[etat.lettres.length - 1] ?? null;
  return {
    identifiant: lettre?.lettre ?? 'trace',
    nbErreurs: etat.nbErreurs,
    niveauAide: etat.niveauAide,
    nbEcoutes: 0,
    debutMs: etat.demarreMs,
    finMs: etat.termineMs,
    premiereActionMs: etat.premiereActionMs,
    modeReponse: MODE_REPONSE,
    confusion: confusionDe(etat),
  };
}

/** Les pseudo-étapes de progression : une par trait, close quand le trait est tracé. */
function etapesDeProgression(etat: EtatTrace): readonly EtapeGenerique[] {
  return etat.traits.map((trait) => ({
    identifiant: trait.id,
    nbErreurs: 0,
    niveauAide: 'aucune' as const,
    nbEcoutes: 0,
    debutMs: etat.demarreMs,
    finMs: trait.termine ? etat.derniereActionMs : null,
    premiereActionMs: etat.premiereActionMs,
    modeReponse: MODE_REPONSE,
    confusion: null,
  }));
}

/**
 * Fait mûrir les seuils. Même convention d'inactivité que `colorie` et `place` : seuls un
 * progrès, une erreur comptée ou l'octroi d'un palier remettent `derniereActionMs`.
 * Réécouter est gratuit (R15) et ne repousse donc pas l'aide.
 *
 * `relecturesDues` du socle commun n'est pas appelé ici : `EtatTrace` (§ 4.3.3) ne porte
 * aucun compteur d'écoutes, donc aucun quota n'est tenable dans l'état. La relecture
 * automatique est jouée par l'hôte `MoteurTrace.tsx`, qui tient le quota côté rendu —
 * exactement comme `MoteurColorie.tsx` le fait déjà en v1.
 */
/**
 * L'aide du socle commun, augmentée du libellé du trait attendu (`AideTrace`).
 *
 * Un point unique : partout ailleurs dans ce fichier, l'aide se construit par ici, jamais à
 * la main. `construireAide` reste la seule à décider du `code` et du `niveau` — on ne
 * réimplante pas la règle du § 4.3.1, on lui ajoute un champ.
 */
function construireAideTrace(niveau: NiveauAide, trait: TraitLettre | null): AideTrace | null {
  const base = construireAide(niveau, trait?.id ?? null, trait?.libelle ?? null);
  if (base === null) return null;
  return { ...base, libelle: trait?.libelle ?? null };
}

function appliquerPaliers(etat: EtatTrace, instant: number): EtatTrace {
  if (etat.termineMs !== null) return etat;

  const niveau = niveauAideSuivant(vueAidable(etat), instant, DELAIS_AIDE_PAR_DEFAUT);
  if (niveau === etat.niveauAide) return etat;

  const trait = traitAttendu(etat);
  return {
    ...etat,
    niveauAide: aideLaPlusHaute(etat.niveauAide, niveau),
    // Le palier accordé fait repartir le compteur.
    derniereActionMs: instant,
    instantIndiceMs:
      niveau === 'indice' && etat.instantIndiceMs === null ? instant : etat.instantIndiceMs,
    aide: construireAideTrace(niveau, trait),
  };
}

function creerEtat(entree: EntreeMoteur<ContenuTrace>): EtatTrace {
  const instant = entree.horloge.maintenantMs();
  const lettres = [...entree.contenu.lettres];
  const traits: readonly EtatTrait[] = lettres.flatMap((lettre) =>
    lettre.traits.map((trait): EtatTrait => ({
      id: trait.id,
      termine: false,
      nbEssais: 0,
      couverture: 0,
    })),
  );

  return {
    indexLettre: 0,
    indexTrait: 0,
    traits,
    // Recopiés une fois : `reduire` ne reçoit pas le contenu (écart n° 2, sur `EtatTrace`).
    lettres,
    paire: entree.contenu.paire,
    gesteEnCours: [],
    nbErreurs: 0,
    niveauAide: 'aucune',
    aide: null,
    dernierRefus: null,
    axeConfondu: null,
    demarreMs: instant,
    premiereActionMs: null,
    derniereActionMs: instant,
    instantIndiceMs: null,
    // Un contenu sans lettre est refusé par le schéma (`minItems: 1`) ; s'il passait,
    // l'exercice serait terminé d'emblée plutôt que sans issue (test `singe`).
    termineMs: traits.length === 0 ? instant : null,
  };
}

/**
 * Le geste ressemble-t-il à un trait ULTÉRIEUR de la même lettre ? C'est la seule façon de
 * distinguer « il n'a pas su tracer la hampe » de « il a commencé par le rond ».
 */
function traitPlusLoinReconnu(etat: EtatTrace): boolean {
  const lettre = lettreActive(etat);
  if (lettre === null) return false;
  for (let i = etat.indexTrait + 1; i < lettre.traits.length; i += 1) {
    const autre = lettre.traits[i];
    if (autre === undefined) continue;
    const decision = evaluerTrait(lettre, autre, etat.gesteEnCours);
    if (decision.couverture >= COUVERTURE_MINIMALE) return true;
  }
  return false;
}

/**
 * Le motif définitif du refus, une fois posée la question « et si c'était un trait d'après ? ».
 *
 * DÉFAUT CORRIGÉ — `trait-hors-ordre` était INATTEIGNABLE, et c'est le père qui l'a payé sur
 * le `d`. La requalification n'était tentée que sur `trace-incomplet`, or un trait ultérieur
 * commence à SON départ, donc loin de celui qu'on attend : `evaluerTrait` répondait
 * `depart-eloigne` et la question n'était jamais posée. Le seul motif capable de dire
 * « commence par le rond » ne pouvait donc jamais sortir. Mesuré avant correction :
 * `expected 'depart-eloigne' to be 'trait-hors-ordre'`.
 *
 * Les DEUX motifs sans coût sont désormais requalifiables, et eux seuls :
 *   • `sens-inverse` ne l'est jamais — c'est un fait mesuré sur le geste, et le confondre
 *     avec un problème d'ordre perdrait le signal de D23 ;
 *   • `trait-hors-ordre` compte comme erreur (`REFUS_TRACE_COMPTE_ERREUR`), et c'est ce qui
 *     fait enfin monter `nbErreurs` : avant, cinq tentatives dans le mauvais ordre laissaient
 *     le compteur à **0**, l'aide de Gobi n'arrivait donc jamais par la voie des erreurs, et
 *     l'enfant devait attendre 45 s d'inactivité devant un écran qu'il ne comprenait pas.
 */
function motifRequalifie(etat: EtatTrace, motif: MotifRefusTrace | null): MotifRefusTrace {
  const brut = motif ?? 'trace-incomplet';
  if (brut !== 'trace-incomplet' && brut !== 'depart-eloigne') return brut;
  return traitPlusLoinReconnu(etat) ? 'trait-hors-ordre' : brut;
}

function reduireTerminerGeste(etat: EtatTrace, instant: number): EtatTrace {
  const lettre = lettreActive(etat);
  const trait = traitAttendu(etat);

  // Geste sans objet : on l'oublie, sans rien compter. Il n'existe aucun état sans issue.
  if (lettre === null || trait === null || etat.termineMs !== null) {
    return { ...etat, gesteEnCours: [] };
  }
  if (etat.gesteEnCours.length < ECHANTILLONS_MINIMUM) {
    return { ...etat, gesteEnCours: [] };
  }

  const decision = evaluerTrait(lettre, trait, etat.gesteEnCours);
  const rang = rangGlobal(etat, etat.indexLettre, etat.indexTrait);
  const etatTrait = etat.traits[rang];

  // L'axe une fois mesuré ne se perd plus : c'est la donnée que le dashboard agrège, et
  // l'effacer au geste suivant reviendrait à ne jamais la journaliser.
  const axeConfondu = decision.axe ?? etat.axeConfondu;

  if (!decision.acceptee) {
    // Requalification : « il n'a pas su tracer la hampe » et « il a commencé par le rond »
    // ne se soignent pas de la même façon. Seul ce test les sépare.
    const motif = motifRequalifie(etat, decision.motif);
    const compteErreur = REFUS_TRACE_COMPTE_ERREUR[motif];

    // UN ORDRE IMPOSÉ SE DIT, il ne se devine pas. Sur `trait-hors-ordre`, l'enfant a tracé
    // un trait juste, au mauvais moment : la seule chose qui lui manque est le NOM du trait
    // à faire d'abord. On accorde donc l'indice tout de suite, sans attendre la deuxième
    // erreur — au même palier et au même coût que l'appel volontaire de Gobi, plus bas.
    // Le niveau ne redescend jamais (`aideLaPlusHaute`), R14 est tenue.
    const niveau: NiveauAide =
      motif === 'trait-hors-ordre' ? aideLaPlusHaute(etat.niveauAide, 'indice') : etat.niveauAide;

    return appliquerPaliers(
      {
        ...etat,
        niveauAide: niveau,
        instantIndiceMs:
          niveau === 'indice' && etat.instantIndiceMs === null ? instant : etat.instantIndiceMs,
        aide: motif === 'trait-hors-ordre' ? construireAideTrace(niveau, trait) : etat.aide,
        gesteEnCours: [],
        traits:
          etatTrait === undefined
            ? etat.traits
            : etat.traits.map((t, i) =>
                i === rang
                  ? {
                      ...t,
                      nbEssais: t.nbEssais + 1,
                      couverture: Math.max(t.couverture, decision.couverture),
                    }
                  : t,
              ),
        nbErreurs: compteErreur ? etat.nbErreurs + 1 : etat.nbErreurs,
        derniereActionMs: compteErreur ? instant : etat.derniereActionMs,
        premiereActionMs: etat.premiereActionMs ?? instant,
        dernierRefus: { trait: trait.id, motif, instantMs: instant },
        axeConfondu,
      },
      instant,
    );
  }

  // Trait accepté. On avance ; jamais en arrière (R14).
  const traits = etat.traits.map((t, i) =>
    i === rang
      ? {
          ...t,
          termine: true,
          nbEssais: t.nbEssais + 1,
          couverture: Math.max(t.couverture, decision.couverture),
        }
      : t,
  );

  let indexLettre = etat.indexLettre;
  let indexTrait = etat.indexTrait + 1;
  if (indexTrait >= lettre.traits.length) {
    indexLettre += 1;
    indexTrait = 0;
  }
  const termine = indexLettre >= etat.lettres.length;

  return appliquerPaliers(
    {
      ...etat,
      traits,
      indexLettre,
      indexTrait,
      gesteEnCours: [],
      derniereActionMs: instant,
      premiereActionMs: etat.premiereActionMs ?? instant,
      dernierRefus: null,
      aide: null,
      axeConfondu,
      termineMs: termine ? instant : etat.termineMs,
    },
    instant,
  );
}

function reduire(etat: EtatTrace, action: ActionTrace, contexte: ContexteMoteur): EtatTrace {
  const instant = contexte.horloge.maintenantMs();

  switch (action.type) {
    case 'commencerGeste':
      if (etat.termineMs !== null) return etat;
      return {
        ...etat,
        gesteEnCours: [action.echantillon],
        dernierRefus: null,
        premiereActionMs: etat.premiereActionMs ?? instant,
      };

    case 'prolongerGeste':
      // Un geste qui n'a pas commencé ne se prolonge pas : le doigt était déjà posé quand la
      // lettre a changé. On l'ignore plutôt que de fabriquer un tracé partiel.
      if (etat.gesteEnCours.length === 0 || etat.termineMs !== null) return etat;
      return { ...etat, gesteEnCours: [...etat.gesteEnCours, action.echantillon] };

    case 'terminerGeste':
      return reduireTerminerGeste(etat, instant);

    case 'ecouterConsigne':
      // R15 : réécouter est gratuit, sans limite, et ne compte pas comme une aide.
      // `EtatTrace` ne porte pas de compteur d'écoutes (§ 4.3.3) : l'état ne bouge pas, et
      // c'est l'hôte qui rejoue le clip. Aucune information n'est perdue — la réécoute ne
      // change rien à la tentative, par construction (R15).
      return etat;

    case 'demanderAide': {
      // L'appel volontaire de Gobi produit EXACTEMENT le palier `indice`, au même coût.
      if (etat.termineMs !== null) return etat;
      const niveau = aideLaPlusHaute(etat.niveauAide, 'indice');
      if (niveau === etat.niveauAide) return etat;
      const trait = traitAttendu(etat);
      return {
        ...etat,
        niveauAide: niveau,
        derniereActionMs: instant,
        instantIndiceMs: etat.instantIndiceMs ?? instant,
        aide: construireAideTrace(niveau, trait),
      };
    }

    case 'battementHorloge':
      return appliquerPaliers(etat, instant);

    default:
      return etat;
  }
}

function progression(etat: EtatTrace): ProgressionMoteur {
  return progressionDepuisEtapes(
    etapesDeProgression(etat),
    rangGlobal(etat, etat.indexLettre, etat.indexTrait),
  );
}

function aideProposee(etat: EtatTrace): AideProposee | null {
  return etat.aide;
}

function resume(etat: EtatTrace): ResumeTentative {
  const fin = etat.termineMs ?? etat.derniereActionMs;
  return resumeDepuisEtapes([etapeDe(etat)], etat.demarreMs, fin);
}

export const moteurTrace: Moteur<ContenuTrace, EtatTrace, ActionTrace> = {
  // ÉCART AU CONTRAT GELÉ n° 3 — SOLDÉ à l'intégration. `'trace'` est entré dans l'union
  // `CodeMoteur` (`partage/src/identifiants.ts`) et dans l'énumération de
  // `contenu/schemas/exercice.schema.json` ; le transtypage provisoire est retiré.
  code: 'trace',
  version: 1,
  capacites: {
    // Les traits d'une lettre s'exécutent dans l'ordre : c'est le geste d'écriture, pas un
    // dessin libre (D23). Les lettres se suivent aussi.
    ordreEtapesImpose: true,
    recolorieLeDecor: false,
    // Aligné sur `lettres.maxItems × traits.maxItems` du schéma de contenu.
    nbEtapesMax: 12,
  },
  schemaContenu: SCHEMA_CONTENU_TRACE,
  creerEtat,
  reduire,
  progression,
  aideProposee,
  resume,
};
