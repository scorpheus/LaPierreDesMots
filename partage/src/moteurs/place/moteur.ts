/**
 * `moteurPlace` — la mécanique pure du placement à consigne. Lot L2-C, clôt O6.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.2.
 *
 * Aucun DOM, aucun `setTimeout`, aucun `Date.now`, aucun `Math.random` : le temps entre par
 * `ContexteMoteur.horloge`, jamais autrement, et l'action `battementHorloge` est ce qui fait
 * mûrir les seuils d'inactivité.
 *
 * TROIS RÈGLES DURES, opposables en revue :
 *   - `ResumeTentative.reussi` vaut TOUJOURS `true` (R14). Il est produit par
 *     `resumeDepuisEtapes` du socle commun, seul endroit du lot où la valeur est écrite.
 *   - `niveauAide` est monotone croissant, par consigne et pour l'exercice entier. Il passe
 *     par `niveauAideSuivant`, jamais par une règle recodée ici (§ 4.8, règle 4).
 *   - Le barème d'étoiles n'est pas réimplanté : `calculerEtoiles` reste le seul endroit où
 *     il vit (contrat v1 § 5.7).
 *
 * CONVENTION D'INACTIVITÉ, identique à `colorie` (contrat v1 § 5.8), et pour la même
 * raison. `derniereActionMs` mesure le temps depuis le dernier **progrès ou la dernière
 * erreur** sur la consigne active. Il est remis par : un dépôt accepté, une erreur comptée,
 * l'octroi d'un palier d'aide, l'activation d'une consigne. Il n'est PAS remis par
 * `ecouterConsigne` (R15 : réécouter ne coûte rien, donc ne repousse pas non plus l'aide),
 * ni par `saisir`, `glisser`, `abandonner`, ni par un refus qui ne compte pas. Sans cela, un
 * enfant bloqué qui promène un élément n'obtiendrait jamais l'aide promise par la v2 § 5.4.
 */

import type {
  ContexteMoteur,
  EntreeMoteur,
  Moteur,
  NiveauAide,
  ProgressionMoteur,
  ResumeTentative,
  AideProposee,
} from '../types.js';
import {
  DELAIS_AIDE_PAR_DEFAUT,
  aideLaPlusHaute,
  construireAide,
  niveauAideSuivant,
  progressionDepuisEtapes,
  relecturesDues,
  resumeDepuisEtapes,
} from '../commun/index.js';
import type { EtapeGenerique } from '../commun/index.js';
import { SCHEMA_CONTENU_PLACE } from './schema-contenu.js';
import { evaluerDepot } from './validation.js';
import type {
  ActionPlace,
  ContenuPlace,
  EtatConsignePlace,
  EtatPlace,
  IdElement,
} from './types.js';
import type { Point } from '../commun/geometrie.js';

/** Le mode de réponse de tout item `place` — D13, table des `p_devinette`. */
const MODE_REPONSE = 'place' as const;

function remplacerConsigne(
  consignes: readonly EtatConsignePlace[],
  index: number,
  remplacante: EtatConsignePlace,
): readonly EtatConsignePlace[] {
  return consignes.map((c, i) => (i === index ? remplacante : c));
}

/**
 * L'étape générique vue par le socle commun. `confusion` vaut **toujours `null`** pour
 * `place`, et c'est une décision, pas un oubli : poser le poisson au lieu du soleil n'est
 * pas une confusion de graphème. L'annoncer comme telle polluerait le top 10 de D23, dont
 * tout l'intérêt est de séparer les axes miroir. C'est `trace` qui porte les confusions.
 */
function etapeDe(consigne: EtatConsignePlace): EtapeGenerique {
  return {
    identifiant: consigne.id,
    nbErreurs: consigne.nbErreurs,
    niveauAide: consigne.niveauAide,
    nbEcoutes: consigne.nbEcoutes,
    debutMs: consigne.debutMs,
    finMs: consigne.finMs,
    premiereActionMs: consigne.premiereActionMs,
    modeReponse: MODE_REPONSE,
    confusion: null,
  };
}

/** Le libellé de la zone encore attendue, pour que la démonstration ait quelque chose à montrer. */
function cibleDeDemonstration(consigne: EtatConsignePlace): string | null {
  return consigne.depotsRestants[0]?.zone ?? null;
}

/**
 * Fait mûrir les seuils d'inactivité et d'erreurs. Appelée après CHAQUE action, pas
 * seulement sur `battementHorloge` : une 2ᵉ erreur doit déclencher l'indice immédiatement.
 *
 * CADENCE DE LA RELECTURE — même invariant qu'en v1 : « tant que la consigne active reste
 * sans action, l'enfant l'entend au moins une fois par tranche de 20 s ». Le moteur relit
 * quand `nbEcoutes` est en retard sur `relecturesDues`, et pas autrement. Une réécoute
 * volontaire (R15) compte dans ce quota.
 */
function appliquerPaliers(etat: EtatPlace, instant: number): EtatPlace {
  if (etat.termineMs !== null) return etat;
  const consigne = etat.consignes[etat.indexConsigne];
  if (consigne === undefined) return etat;

  const relit = relecturesDues(consigne, instant, DELAIS_AIDE_PAR_DEFAUT) > consigne.nbEcoutes;
  const nbEcoutes = relit ? consigne.nbEcoutes + 1 : consigne.nbEcoutes;

  const niveau = niveauAideSuivant(consigne, instant, DELAIS_AIDE_PAR_DEFAUT);

  if (niveau === consigne.niveauAide) {
    // Une relecture seule ne touche ni `niveauAide`, ni `aide`, ni le résumé : R15, sans coût.
    if (!relit) return etat;
    return {
      ...etat,
      consignes: remplacerConsigne(etat.consignes, etat.indexConsigne, {
        ...consigne,
        nbEcoutes,
      }),
    };
  }

  const majConsigne: EtatConsignePlace = {
    ...consigne,
    nbEcoutes,
    niveauAide: niveau,
    // Le palier accordé fait repartir le compteur : les 30 s de la démonstration se comptent
    // depuis l'indice, pas depuis le dernier dépôt.
    derniereActionMs: instant,
    instantIndiceMs:
      niveau === 'indice' && consigne.instantIndiceMs === null ? instant : consigne.instantIndiceMs,
  };

  return {
    ...etat,
    consignes: remplacerConsigne(etat.consignes, etat.indexConsigne, majConsigne),
    niveauAide: aideLaPlusHaute(etat.niveauAide, niveau),
    aide: construireAide(niveau, cibleDeDemonstration(majConsigne), null),
  };
}

function creerEtat(entree: EntreeMoteur<ContenuPlace>): EtatPlace {
  const instant = entree.horloge.maintenantMs();
  const consignes: readonly EtatConsignePlace[] = entree.contenu.consignes.map(
    (consigne, index): EtatConsignePlace => ({
      id: consigne.id,
      depotsRestants: [...consigne.depots],
      nbErreurs: 0,
      niveauAide: 'aucune',
      nbEcoutes: 0,
      debutMs: index === 0 ? instant : 0,
      finMs: null,
      premiereActionMs: null,
      derniereActionMs: instant,
      instantIndiceMs: null,
    }),
  );

  return {
    indexConsigne: 0,
    consignes,
    // La géométrie est recopiée UNE fois, ici, et ne change plus : `reduire` ne reçoit pas
    // le contenu (écart n° 2, documenté sur `EtatPlace.zones`).
    zones: [...entree.contenu.zones],
    places: {},
    elementSaisi: null,
    pointCourant: null,
    niveauAide: 'aucune',
    aide: null,
    dernierRefus: null,
    demarreMs: instant,
    // Un contenu sans consigne est refusé par le schéma (`minItems: 1`) ; s'il passait,
    // l'exercice serait terminé d'emblée plutôt que sans issue (test `singe`).
    termineMs: consignes.length === 0 ? instant : null,
  };
}

/** Marque la première action de l'enfant sur la consigne active — l'origine de la latence (D18). */
function marquerPremiereAction(
  consigne: EtatConsignePlace,
  instant: number,
): EtatConsignePlace {
  if (consigne.premiereActionMs !== null) return consigne;
  return { ...consigne, premiereActionMs: instant };
}

/**
 * `etat` est sa propre source de zones — voir l'écart n° 2 documenté sur `EtatPlace.zones` :
 * `reduire` ne reçoit pas le contenu, la géométrie vit donc dans l'état.
 */
function reduireDeposer(etat: EtatPlace, point: Point, instant: number): EtatPlace {
  const decision = evaluerDepot(etat, etat, etat.elementSaisi, point);
  const consigne = etat.consignes[etat.indexConsigne];

  if (!decision.acceptee) {
    const motif = decision.motif ?? 'hors-scene';
    const consignes =
      consigne === undefined
        ? etat.consignes
        : remplacerConsigne(
            etat.consignes,
            etat.indexConsigne,
            decision.compteErreur
              ? {
                  ...marquerPremiereAction(consigne, instant),
                  nbErreurs: consigne.nbErreurs + 1,
                  derniereActionMs: instant,
                }
              : marquerPremiereAction(consigne, instant),
          );

    // L'élément retourne à la réserve. Pas de rouge, pas de son négatif, pas d'écran
    // d'échec : seulement une oscillation de 6 px, jouée par la couche de rendu.
    return appliquerPaliers(
      {
        ...etat,
        consignes,
        elementSaisi: null,
        pointCourant: null,
        dernierRefus: {
          element: etat.elementSaisi,
          zone: decision.zone,
          motif,
          instantMs: instant,
        },
      },
      instant,
    );
  }

  // `decision.acceptee` implique une consigne active, un élément saisi et une zone.
  if (consigne === undefined || etat.elementSaisi === null || decision.zone === null) return etat;
  const element: IdElement = etat.elementSaisi;

  const restants = consigne.depotsRestants.filter((d) => d.zone !== decision.zone);
  let consignes = remplacerConsigne(etat.consignes, etat.indexConsigne, {
    ...marquerPremiereAction(consigne, instant),
    depotsRestants: restants,
    derniereActionMs: instant,
    finMs: decision.consigneSatisfaite ? instant : consigne.finMs,
  });

  // Passage automatique à la consigne suivante : il n'existe ni « valider » ni « suivant »
  // (contrat v1 § 5.3, v2 § 5.1 — le retour est immédiat).
  let indexConsigne = etat.indexConsigne;
  if (decision.consigneSatisfaite && !decision.exerciceTermine) {
    indexConsigne = etat.indexConsigne + 1;
    const suivante = consignes[indexConsigne];
    if (suivante !== undefined) {
      consignes = remplacerConsigne(consignes, indexConsigne, {
        ...suivante,
        debutMs: instant,
        derniereActionMs: instant,
      });
    }
  }

  return appliquerPaliers(
    {
      ...etat,
      consignes,
      indexConsigne,
      places: { ...etat.places, [element]: decision.zone },
      elementSaisi: null,
      pointCourant: null,
      dernierRefus: null,
      // L'aide affichée appartient à la consigne qui vient de se clore.
      aide: decision.consigneSatisfaite ? null : etat.aide,
      termineMs: decision.exerciceTermine ? instant : etat.termineMs,
    },
    instant,
  );
}

function reduire(etat: EtatPlace, action: ActionPlace, contexte: ContexteMoteur): EtatPlace {
  const instant = contexte.horloge.maintenantMs();

  switch (action.type) {
    case 'saisir': {
      if (etat.termineMs !== null) return etat;
      // Un élément déjà posé ne se reprend pas : un acquis n'est jamais repris (R14).
      if (Object.prototype.hasOwnProperty.call(etat.places, action.element)) return etat;
      const consigne = etat.consignes[etat.indexConsigne];
      const consignes =
        consigne === undefined
          ? etat.consignes
          : remplacerConsigne(
              etat.consignes,
              etat.indexConsigne,
              marquerPremiereAction(consigne, instant),
            );
      return appliquerPaliers(
        { ...etat, consignes, elementSaisi: action.element, dernierRefus: null },
        instant,
      );
    }

    case 'glisser':
      if (etat.elementSaisi === null) return etat;
      return { ...etat, pointCourant: action.point };

    case 'deposer':
      return reduireDeposer(etat, action.point, instant);

    case 'abandonner':
      // Reposer l'élément sans le placer ne coûte rien et ne compte rien.
      return { ...etat, elementSaisi: null, pointCourant: null };

    case 'ecouterConsigne': {
      // R15 : réécouter est gratuit, sans limite, et ne compte pas comme une aide.
      const consigne = etat.consignes[etat.indexConsigne];
      if (consigne === undefined) return etat;
      return appliquerPaliers(
        {
          ...etat,
          consignes: remplacerConsigne(etat.consignes, etat.indexConsigne, {
            ...consigne,
            nbEcoutes: consigne.nbEcoutes + 1,
          }),
        },
        instant,
      );
    }

    case 'demanderAide': {
      // L'appel volontaire de Gobi produit EXACTEMENT le palier `indice`, et coûte la même
      // chose qu'un palier automatique : ni plus, ni moins (contrat v1 § 5.6).
      const consigne = etat.consignes[etat.indexConsigne];
      if (consigne === undefined || etat.termineMs !== null) return etat;
      const niveau = aideLaPlusHaute(consigne.niveauAide, 'indice');
      if (niveau === consigne.niveauAide) return etat;
      const majConsigne: EtatConsignePlace = {
        ...consigne,
        niveauAide: niveau,
        derniereActionMs: instant,
        instantIndiceMs: consigne.instantIndiceMs ?? instant,
      };
      return {
        ...etat,
        consignes: remplacerConsigne(etat.consignes, etat.indexConsigne, majConsigne),
        niveauAide: aideLaPlusHaute(etat.niveauAide, niveau),
        aide: construireAide(niveau, cibleDeDemonstration(majConsigne), null),
      };
    }

    case 'battementHorloge':
      return appliquerPaliers(etat, instant);

    default:
      return etat;
  }
}

function progression(etat: EtatPlace): ProgressionMoteur {
  return progressionDepuisEtapes(etat.consignes.map(etapeDe), etat.indexConsigne);
}

function aideProposee(etat: EtatPlace): AideProposee | null {
  return etat.aide;
}

function resume(etat: EtatPlace): ResumeTentative {
  const dernierInstant = etat.consignes.reduce(
    (max, c) => Math.max(max, c.finMs ?? c.derniereActionMs),
    etat.demarreMs,
  );
  const fin = etat.termineMs ?? dernierInstant;
  return resumeDepuisEtapes(etat.consignes.map(etapeDe), etat.demarreMs, fin);
}

/** Le niveau d'aide global, exposé pour la lisibilité des tests de monotonie. */
export function niveauAideGlobal(etat: EtatPlace): NiveauAide {
  return etat.niveauAide;
}

export const moteurPlace: Moteur<ContenuPlace, EtatPlace, ActionPlace> = {
  code: 'place',
  version: 1,
  capacites: {
    // Ordre imposé ENTRE consignes, libre À L'INTÉRIEUR d'une consigne — même règle que
    // `colorie` (contrat v1 § 5.3).
    ordreEtapesImpose: true,
    // `place` ne recolorie rien : il pose des éléments. C'est la différence de fond avec
    // `colorie`, et c'est ce qui rend les deux moteurs complémentaires sur la même fiche.
    recolorieLeDecor: false,
    // Aligné sur `consignes.maxItems` du schéma de contenu.
    nbEtapesMax: 8,
  },
  schemaContenu: SCHEMA_CONTENU_PLACE,
  creerEtat,
  reduire,
  progression,
  aideProposee,
  resume,
};
