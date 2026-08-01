/**
 * `moteurGrave` — la mécanique pure de `grave`. Lot L2-E.
 *
 * Compléter un mot lettre par lettre. C'est ici que les confusions miroir se voient le
 * mieux : `axeDeLaPaire` qualifie chaque lettre fausse sans jamais la supposer (D23).
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
import { SCHEMA_CONTENU_GRAVE } from './schema-contenu.js';
import { evaluerGrave, modeReponseGrave } from './validation.js';
import type { DecisionGrave } from './validation.js';
import type {
  ActionGrave,
  ContenuGrave,
  EtatGrave,
  EtatEtapeGrave,
  RefusGrave,
} from './types.js';

function remplacer(
  etapes: readonly EtatEtapeGrave[],
  index: number,
  remplacante: EtatEtapeGrave,
): readonly EtatEtapeGrave[] {
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
function appliquerPaliers(etat: EtatGrave, instant: number): EtatGrave {
  if (etat.termineMs !== null) return etat;
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined) return etat;

  // `relecturesDues` porte le quota, `niveauAideSuivant` porte la monotonie : les deux
  // viennent du socle commun de L2-C, jamais réimplantés ici (§ 4.8, règle 4).
  const relit = relecturesDues(etape, instant, DELAIS_AIDE_PAR_DEFAUT) > etape.nbEcoutes;
  const niveau = niveauAideSuivant(etape, instant, DELAIS_AIDE_PAR_DEFAUT);

  if (niveau === etape.niveauAide && !relit) return etat;

  const maj: EtatEtapeGrave = {
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
  etat: EtatGrave,
  decision: DecisionGrave,
  refus: RefusGrave,
  instant: number,
  extra: Partial<EtatGrave>,
): EtatGrave {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined) return etat;

  if (!decision.acceptee) {
    // Le geste ne prend pas. Aucun rouge, aucun son négatif, aucun écran d'échec : une
    // oscillation de 6 px, jouée par la couche de rendu (R14, v2 § 8).
    const majEtape: EtatEtapeGrave = {
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

export const moteurGrave: Moteur<ContenuGrave, EtatGrave, ActionGrave> = {
  code: 'grave',
  version: 1,
  capacites: {
    ordreEtapesImpose: true,
    recolorieLeDecor: false,
    // Aligné sur `maxItems` du schéma de contenu : les deux doivent bouger ensemble.
    nbEtapesMax: 6,
  },
  schemaContenu: SCHEMA_CONTENU_GRAVE,

  creerEtat(entree: EntreeMoteur<ContenuGrave>): EtatGrave {
    const instant = entree.horloge.maintenantMs();
    const etapes = entree.contenu.consignes.map(
      (etape, index): EtatEtapeGrave => ({
        identifiant: etape.id,
        restantes: etape.trous.map((t) => t.id),
        nbErreurs: 0,
        niveauAide: 'aucune',
        nbEcoutes: 0,
        debutMs: index === 0 ? instant : 0,
        finMs: null,
        premiereActionMs: null,
        derniereActionMs: instant,
        instantIndiceMs: null,
        modeReponse: modeReponseGrave(entree.contenu),
        confusion: null,
      }),
    );

    return {
      indexEtape: 0,
      etapes,
      trous: entree.contenu.consignes.flatMap((c) => [...c.trous]),
      clavier: [...entree.contenu.clavier],
      competence: entree.contenu.competence,
      acquis: {},

      niveauAide: 'aucune',
      aide: null,
      dernierRefus: null,
      demarreMs: instant,
      // Un contenu sans étape est refusé par le schéma (`minItems: 1`) ; s'il passait, la
      // partie serait close d'emblée plutôt que sans issue (test `singe`).
      termineMs: etapes.length === 0 ? instant : null,
    };
  },

  reduire(etat: EtatGrave, action: ActionGrave, contexte: ContexteMoteur): EtatGrave {
    const instant = contexte.horloge.maintenantMs();
    const etape = etat.etapes[etat.indexEtape];

    switch (action.type) {
      case 'graver': {
        const decision = evaluerGrave(etat, action.lettre);
        return appliquerDecision(
          etat,
          decision,
          { lettre: action.lettre, motif: decision.motif ?? 'trous-remplis', instantMs: instant },
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
        if (niveau === etape.niveauAide) return etat;
        const maj: EtatEtapeGrave = {
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

  progression(etat: EtatGrave): ProgressionMoteur {
    return progressionDepuisEtapes(etat.etapes, etat.indexEtape);
  },

  aideProposee(etat: EtatGrave): AideProposee | null {
    return etat.aide;
  },

  resume(etat: EtatGrave): ResumeTentative {
    const fin =
      etat.termineMs ??
      etat.etapes.reduce((max, e) => Math.max(max, e.finMs ?? e.derniereActionMs), etat.demarreMs);
    return resumeDepuisEtapes(etat.etapes, etat.demarreMs, fin);
  },
};
