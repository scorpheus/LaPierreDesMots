/**
 * `moteurHistoire` — la mécanique pure de `histoire`. Lot L2-E.
 *
 * Lire un texte court, puis répondre. Le vrai/faux n'a pas de moteur à lui : il est une
 * variante de réponse d'ici (§ 8, n° 6), et se retire d'une ligne de contenu.
 *
 * Aucun DOM, aucun `setTimeout`, aucun `Date.now`, aucun `Math.random` : le temps entre par
 * `ContexteMoteur.horloge` et mûrit par `battementHorloge` (§ 4.8, règle 3).
 *
 * QUATRE RÈGLES DURES, opposables en revue (§ 4.8) :
 *   1. les cinq membres de `Moteur` sont déclarés en **syntaxe de méthode** — en
 *      propriété-fonction, `MoteurQuelconque` cesse d'être assignable et les deux registres
 *      ne compilent plus (contrat v1 § 4.1, note normative) ;
 *   2. `resume().reussi` vaut **toujours `true`** (R14) — `false` est structurellement
 *      inatteignable, et l'écrire ferait naître le seul écran d'échec possible du dépôt ;
 *   3. l'escalade d'aide vient de `../commun/aide.js`, jamais réimplantée ;
 *   4. le barème d'étoiles n'est pas ici : `calculerEtoiles` en est le seul dépositaire.
 */

import {
  DELAIS_AIDE_PAR_DEFAUT,
  aideLaPlusHaute,
  construireAide,
  niveauAideSuivant,
  progressionDepuisEtapes,
  relecturesDues,
  resumeDepuisEtapes,
} from '../commun/index.js';
import type {
  AideProposee,
  ContexteMoteur,
  EntreeMoteur,
  Moteur,
  ProgressionMoteur,
  ResumeTentative,
} from '../types.js';
import { SCHEMA_CONTENU_HISTOIRE } from './schema-contenu.js';
import { evaluerHistoire, modeReponseHistoire } from './validation.js';
import type { DecisionHistoire } from './validation.js';
import type {
  ActionHistoire,
  ContenuHistoire,
  EtatHistoire,
  EtatEtapeHistoire,
  RefusHistoire,
} from './types.js';

function remplacer(
  etapes: readonly EtatEtapeHistoire[],
  index: number,
  remplacante: EtatEtapeHistoire,
): readonly EtatEtapeHistoire[] {
  return etapes.map((e, i) => (i === index ? remplacante : e));
}

/**
 * Fait mûrir les seuils d'inactivité et d'erreurs.
 *
 * La relecture automatique est **gratuite** (R15) : elle n'avance jamais `niveauAide`, ne
 * repousse pas `derniereActionMs` et ne coûte aucune étoile. Le quota — au plus une relecture
 * par tranche de `relectureMs` — reprend la convention mesurée du `colorie` : sans lui, un
 * hôte qui bat à la seconde ferait reparler Gobi vingt-cinq fois de suite.
 */
function appliquerPaliers(etat: EtatHistoire, instant: number): EtatHistoire {
  if (etat.termineMs !== null) return etat;
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined) return etat;

  // `relecturesDues` porte le quota, `niveauAideSuivant` porte la monotonie : les deux
  // viennent du socle commun de L2-C, jamais réimplantés ici (§ 4.8, règle 4).
  const relit = relecturesDues(etape, instant, DELAIS_AIDE_PAR_DEFAUT) > etape.nbEcoutes;
  const niveau = niveauAideSuivant(etape, instant, DELAIS_AIDE_PAR_DEFAUT);

  if (niveau === etape.niveauAide && !relit) return etat;

  const maj: EtatEtapeHistoire = {
    ...etape,
    nbEcoutes: relit ? etape.nbEcoutes + 1 : etape.nbEcoutes,
    niveauAide: niveau,
    instantIndiceMs: etape.instantIndiceMs ?? (niveau === 'aucune' ? null : instant),
    derniereActionMs: niveau === etape.niveauAide ? etape.derniereActionMs : instant,
  };

  if (niveau === etape.niveauAide) {
    return { ...etat, etapes: remplacer(etat.etapes, etat.indexEtape, maj) };
  }
  return {
    ...etat,
    etapes: remplacer(etat.etapes, etat.indexEtape, maj),
    niveauAide: aideLaPlusHaute(etat.niveauAide, niveau),
    aide: construireAide(niveau, maj.restantes[0] ?? null, null),
  };
}

/**
 * Le corps commun des onze moteurs : une décision entre, un état sort.
 *
 * `extra` porte ce que ce moteur-ci a de particulier à mettre à jour. C'est le seul endroit
 * où les onze diffèrent, et c'est voulu — un réducteur par moteur multiplierait par onze les
 * occasions de laisser filer un `reussi: false` ou une aide qui régresse.
 */
function appliquerDecision(
  etat: EtatHistoire,
  decision: DecisionHistoire,
  refus: RefusHistoire,
  instant: number,
  extra: Partial<EtatHistoire>,
): EtatHistoire {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined) return etat;

  if (!decision.acceptee) {
    // Le geste ne prend pas. Aucun rouge, aucun son négatif, aucun écran d'échec : une
    // oscillation de 6 px, jouée par la couche de rendu (R14, v2 § 8).
    const majEtape: EtatEtapeHistoire = {
      ...etape,
      premiereActionMs: etape.premiereActionMs ?? instant,
      nbErreurs: decision.compteErreur ? etape.nbErreurs + 1 : etape.nbErreurs,
      derniereActionMs: decision.compteErreur ? instant : etape.derniereActionMs,
      confusion: decision.confusion ?? etape.confusion,
    };
    return appliquerPaliers(
      {
        ...etat,
        ...extra,
        etapes: remplacer(etat.etapes, etat.indexEtape, majEtape),
        dernierRefus: refus,
      },
      instant,
    );
  }

  const cle = decision.acquis === null ? null : decision.acquis[0];
  let etapes = remplacer(etat.etapes, etat.indexEtape, {
    ...etape,
    restantes: cle === null ? etape.restantes : etape.restantes.filter((r) => r !== cle),
    premiereActionMs: etape.premiereActionMs ?? instant,
    derniereActionMs: instant,
    finMs: decision.etapeSatisfaite ? instant : etape.finMs,
  });

  // Passage automatique à l'étape suivante : il n'existe ni « valider » ni « suivant »
  // (contrat v1 § 5.3, v2 § 5.1 — le retour est immédiat).
  let indexEtape = etat.indexEtape;
  if (decision.etapeSatisfaite && !decision.exerciceTermine) {
    indexEtape += 1;
    const suivante = etapes[indexEtape];
    if (suivante !== undefined) {
      etapes = remplacer(etapes, indexEtape, {
        ...suivante,
        debutMs: instant,
        derniereActionMs: instant,
      });
    }
  }

  return appliquerPaliers(
    {
      ...etat,
      ...extra,
      etapes,
      indexEtape,
      acquis:
        decision.acquis === null
          ? etat.acquis
          : { ...etat.acquis, [decision.acquis[0]]: decision.acquis[1] },
      dernierRefus: null,
      // L'aide affichée appartient à l'étape qui vient de se clore.
      aide: decision.etapeSatisfaite ? null : etat.aide,
      termineMs: decision.exerciceTermine ? instant : etat.termineMs,
    },
    instant,
  );
}

export const moteurHistoire: Moteur<ContenuHistoire, EtatHistoire, ActionHistoire> = {
  code: 'histoire',
  version: 1,
  capacites: {
    ordreEtapesImpose: true,
    recolorieLeDecor: false,
    // Aligné sur `maxItems` du schéma de contenu : les deux doivent bouger ensemble.
    nbEtapesMax: 8,
  },
  schemaContenu: SCHEMA_CONTENU_HISTOIRE,

  creerEtat(entree: EntreeMoteur<ContenuHistoire>): EtatHistoire {
    const instant = entree.horloge.maintenantMs();
    const etapes = entree.contenu.questions.map(
      (etape, index): EtatEtapeHistoire => ({
        identifiant: etape.id,
        // R32/R44 — LE MÉLANGE, ICI ET UNE SEULE FOIS.
        //
        // « range les mots, mais ils sont déjà dans l'ordre » : `options` liste la bonne
        // réponse en tête sur la quasi-totalité des questions livrées. Le rendre tel quel
        // faisait gagner sans lire. Le tirage passe par `Alea` (jamais `Math.random`, règle
        // ESLint à l'appui) et n'a lieu qu'à la création de l'état : l'ordre ne bouge plus sous
        // les yeux de l'enfant, et il se rejoue à l'identique à graine égale.
        ordreAffichage: entree.alea.melanger(etape.options),
        restantes: [etape.reponse],
        nbErreurs: 0,
        niveauAide: 'aucune',
        aideDemandee: 'aucune',
        nbEcoutes: 0,
        debutMs: index === 0 ? instant : 0,
        finMs: null,
        premiereActionMs: null,
        derniereActionMs: instant,
        instantIndiceMs: null,
        modeReponse: modeReponseHistoire(entree.contenu, index),
        // Mode à `p_devinette` tabulée : aucun nombre d'éléments à transmettre (D13).
        nbElements: null,
        confusion: null,
      }),
    );

    return {
      indexEtape: 0,
      etapes,
      options: [...entree.contenu.options],
      competence: entree.contenu.competence,
      acquis: {},
      recitVisible: true,
      niveauAide: 'aucune',
      aide: null,
      dernierRefus: null,
      demarreMs: instant,
      // Un contenu sans étape est refusé par le schéma (`minItems: 1`) ; s'il passait, la
      // partie serait close d'emblée plutôt que sans issue (test `singe`).
      termineMs: etapes.length === 0 ? instant : null,
    };
  },

  reduire(etat: EtatHistoire, action: ActionHistoire, contexte: ContexteMoteur): EtatHistoire {
    const instant = contexte.horloge.maintenantMs();
    const etape = etat.etapes[etat.indexEtape];

    switch (action.type) {
      case 'basculerRecit':
        // Revenir au récit est GRATUIT et sans limite (R15) : relire n'est pas une aide.
        return { ...etat, recitVisible: !etat.recitVisible };

      case 'repondre': {
        const decision = evaluerHistoire(etat, action.option);
        return appliquerDecision(
          etat,
          decision,
          {
            option: action.option,
            motif: decision.motif ?? 'option-inconnue',
            instantMs: instant,
          },
          instant,
          {},
        );
      }

      case 'ecouterConsigne': {
        // R15 : réécouter est gratuit, sans limite, et ne compte jamais comme une aide.
        if (etape === undefined) return etat;
        return appliquerPaliers(
          {
            ...etat,
            etapes: remplacer(etat.etapes, etat.indexEtape, {
              ...etape,
              nbEcoutes: etape.nbEcoutes + 1,
            }),
          },
          instant,
        );
      }

      case 'demanderAide': {
        // L'appel volontaire de Gobi produit EXACTEMENT le palier `indice`, et coûte la même
        // chose qu'un palier automatique : ni plus, ni moins (contrat v1 § 5.6).
        if (etape === undefined || etat.termineMs !== null) return etat;
        const niveau = aideLaPlusHaute(etape.niveauAide, 'indice');
        // R15 + R17 — LA DEMANDE EST ENREGISTRÉE MÊME SI LE PALIER NE BOUGE PAS.
        //
        // Avant : `if (niveau === etape.niveauAide) return etat;` — donc quand l'aide était
        // DÉJÀ montée toute seule (45 s d'inactivité), taper sur Gobi ne produisait RIEN à
        // l'écran, et le journal retenait quand même une aide jamais demandée. Deux défauts
        // signalés séparément par le père, une seule cause.
        const demandee = aideLaPlusHaute(etape.aideDemandee, 'indice');
        if (niveau === etape.niveauAide && demandee === etape.aideDemandee) return etat;
        const maj: EtatEtapeHistoire = {
          ...etape,
          niveauAide: niveau,
          aideDemandee: demandee,
          instantIndiceMs: etape.instantIndiceMs ?? instant,
          derniereActionMs: instant,
        };
        return {
          ...etat,
          etapes: remplacer(etat.etapes, etat.indexEtape, maj),
          niveauAide: aideLaPlusHaute(etat.niveauAide, niveau),
          aide: construireAide(niveau, maj.restantes[0] ?? null, null),
        };
      }

      case 'battementHorloge':
        return appliquerPaliers(etat, instant);

      default:
        return etat;
    }
  },

  progression(etat: EtatHistoire): ProgressionMoteur {
    return progressionDepuisEtapes(etat.etapes, etat.indexEtape);
  },

  aideProposee(etat: EtatHistoire): AideProposee | null {
    return etat.aide;
  },

  resume(etat: EtatHistoire): ResumeTentative {
    const fin =
      etat.termineMs ??
      etat.etapes.reduce((max, e) => Math.max(max, e.finMs ?? e.derniereActionMs), etat.demarreMs);
    return resumeDepuisEtapes(etat.etapes, etat.demarreMs, fin);
  },
};
