/**
 * `moteurEclair` — la mécanique pure de `eclair`. Lot L2-E.
 *
 * Un mot apparaît brièvement, puis il faut le retrouver. Ce moteur porte la latence de
 * reconnaissance de D18 : `finExpositionMs` en est l'origine, `premiereActionMs` la fin.
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
import { SCHEMA_CONTENU_ECLAIR } from './schema-contenu.js';
import { evaluerEclair, modeReponseEclair } from './validation.js';
import type { DecisionEclair } from './validation.js';
import type {
  ActionEclair,
  ContenuEclair,
  EtatEclair,
  EtatEtapeEclair,
  RefusEclair,
} from './types.js';

function remplacer(
  etapes: readonly EtatEtapeEclair[],
  index: number,
  remplacante: EtatEtapeEclair,
): readonly EtatEtapeEclair[] {
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
function appliquerPaliers(etat: EtatEclair, instant: number): EtatEclair {
  if (etat.termineMs !== null) return etat;
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined) return etat;

  // `relecturesDues` porte le quota, `niveauAideSuivant` porte la monotonie : les deux
  // viennent du socle commun de L2-C, jamais réimplantés ici (§ 4.8, règle 4).
  const relit = relecturesDues(etape, instant, DELAIS_AIDE_PAR_DEFAUT) > etape.nbEcoutes;
  const niveau = niveauAideSuivant(etape, instant, DELAIS_AIDE_PAR_DEFAUT);

  if (niveau === etape.niveauAide && !relit) return etat;

  const maj: EtatEtapeEclair = {
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
  etat: EtatEclair,
  decision: DecisionEclair,
  refus: RefusEclair,
  instant: number,
  extra: Partial<EtatEclair>,
): EtatEclair {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined) return etat;

  if (!decision.acceptee) {
    // Le geste ne prend pas. Aucun rouge, aucun son négatif, aucun écran d'échec : une
    // oscillation de 6 px, jouée par la couche de rendu (R14, v2 § 8).
    const majEtape: EtatEtapeEclair = {
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

export const moteurEclair: Moteur<ContenuEclair, EtatEclair, ActionEclair> = {
  code: 'eclair',
  version: 1,
  capacites: {
    ordreEtapesImpose: true,
    recolorieLeDecor: false,
    // Aligné sur `maxItems` du schéma de contenu : les deux doivent bouger ensemble.
    nbEtapesMax: 8,
  },
  schemaContenu: SCHEMA_CONTENU_ECLAIR,

  creerEtat(entree: EntreeMoteur<ContenuEclair>): EtatEclair {
    const instant = entree.horloge.maintenantMs();
    const etapes = entree.contenu.consignes.map(
      (etape, index): EtatEtapeEclair => ({
        identifiant: etape.id,
        restantes: [etape.reponse],
        nbErreurs: 0,
        niveauAide: 'aucune',
        nbEcoutes: 0,
        debutMs: index === 0 ? instant : 0,
        finMs: null,
        premiereActionMs: null,
        derniereActionMs: instant,
        instantIndiceMs: null,
        modeReponse: modeReponseEclair(entree.contenu, index),
        confusion: null,
      }),
    );

    return {
      indexEtape: 0,
      etapes,
      options: [...entree.contenu.options],
      competence: entree.contenu.competence,
      acquis: {},
      finExpositionMs: null,
      niveauAide: 'aucune',
      aide: null,
      dernierRefus: null,
      demarreMs: instant,
      // Un contenu sans étape est refusé par le schéma (`minItems: 1`) ; s'il passait, la
      // partie serait close d'emblée plutôt que sans issue (test `singe`).
      termineMs: etapes.length === 0 ? instant : null,
    };
  },

  reduire(etat: EtatEclair, action: ActionEclair, contexte: ContexteMoteur): EtatEclair {
    const instant = contexte.horloge.maintenantMs();
    const etape = etat.etapes[etat.indexEtape];

    switch (action.type) {
      case 'finExposition':
        // Origine de la latence de reconnaissance (D18). Fixée une seule fois par étape :
        // revoir l'éclair ne doit pas effacer la première mesure, qui est la vraie.
        if (etat.finExpositionMs !== null) return etat;
        return { ...etat, finExpositionMs: instant };

      case 'revoirEclair': {
        // GRATUIT et sans limite, comme réécouter la consigne (R15).
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

      case 'repondre': {
        const decision = evaluerEclair(etat, action.option);
        const suivant = appliquerDecision(
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
        // Nouvelle étape, nouvel éclair : l'origine de la latence se réarme.
        if (suivant.indexEtape === etat.indexEtape) return suivant;
        return { ...suivant, finExpositionMs: null };
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
        if (niveau === etape.niveauAide) return etat;
        const maj: EtatEtapeEclair = {
          ...etape,
          niveauAide: niveau,
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

  progression(etat: EtatEclair): ProgressionMoteur {
    return progressionDepuisEtapes(etat.etapes, etat.indexEtape);
  },

  aideProposee(etat: EtatEclair): AideProposee | null {
    return etat.aide;
  },

  resume(etat: EtatEclair): ResumeTentative {
    const fin =
      etat.termineMs ??
      etat.etapes.reduce((max, e) => Math.max(max, e.finMs ?? e.derniereActionMs), etat.demarreMs);
    return resumeDepuisEtapes(etat.etapes, etat.demarreMs, fin);
  },
};
