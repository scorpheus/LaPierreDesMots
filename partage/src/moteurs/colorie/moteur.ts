/**
 * `moteurColorie` — la mécanique pure du coloriage à consigne. Lot L-E.
 *
 * Aucun DOM, aucun `setTimeout`, aucun `Date.now`, aucun `Math.random` : le temps entre
 * par `ContexteMoteur.horloge`, jamais autrement, et l'action `battementHorloge` est ce
 * qui fait mûrir les seuils d'inactivité (contrat § 5.8).
 *
 * DEUX RÈGLES DURES, opposables en revue (contrat § 5.6) :
 *   - `ResumeTentative.reussi` vaut TOUJOURS `true`. `false` est structurellement
 *     inatteignable pour ce moteur ; l'écrire violerait R14.
 *   - `niveauAide` est monotone croissant, par consigne et pour l'exercice entier.
 *     Une aide obtenue n'est jamais retirée.
 *
 * CONVENTION D'INACTIVITÉ, choisie ici et valable pour tout le fichier.
 * `EtatConsigne.derniereActionMs` mesure le temps écoulé depuis le dernier **progrès ou
 * la dernière erreur** sur la consigne active. Il est remis à l'instant courant par :
 * une peinture acceptée, une erreur comptée, l'octroi d'un palier d'aide, l'activation
 * d'une consigne. Il n'est PAS remis par `ecouterConsigne` (R15 : réécouter ne coûte
 * rien, donc ne repousse pas non plus l'aide), ni par `choisirCouleur`, ni par un refus
 * qui ne compte pas. Sans cela, un enfant bloqué qui tapote des godets n'obtiendrait
 * jamais l'aide que la v2 § 5.4 lui promet.
 */

import type {
  AideProposee,
  ContexteMoteur,
  EntreeMoteur,
  Moteur,
  NiveauAide,
  ProgressionMoteur,
  ResumeEtape,
  ResumeTentative
} from '../types.js';
import { DELAIS_AIDE, evaluerPeintureDepuisEtat } from './validation.js';
import { SCHEMA_CONTENU_COLORIE } from './schema-contenu.js';
import type {
  ActionColorie,
  ContenuColorie,
  EtatColorie,
  EtatConsigne,
  MotifRefus
} from './types.js';

const RANG_AIDE: Readonly<Record<NiveauAide, number>> = {
  aucune: 0,
  indice: 1,
  demonstration: 2
};

function aideLaPlusHaute(a: NiveauAide, b: NiveauAide): NiveauAide {
  return RANG_AIDE[a] >= RANG_AIDE[b] ? a : b;
}

function remplacerConsigne(
  consignes: readonly EtatConsigne[],
  index: number,
  remplacante: EtatConsigne
): readonly EtatConsigne[] {
  return consignes.map((c, i) => (i === index ? remplacante : c));
}

/**
 * `reduire` ne reçoit pas le contenu (contrat § 4.1) : le texte de la consigne et ses
 * `motsCles` ne sont donc pas atteignables ici. `texte` reste `null` et c'est la couche
 * de rendu, qui possède le contenu, qui fait parler Gobi. Sans effet en v1 : D1 exclut
 * l'audio (écart n° 4), et `AideProposee.texte` n'est de toute façon jamais affiché seul.
 */
function construireAide(niveau: NiveauAide, consigne: EtatConsigne): AideProposee | null {
  if (niveau === 'aucune') return null;
  if (niveau === 'indice') {
    return { niveau: 'indice', code: 'relire-consigne', cible: null, texte: null };
  }
  const premiere = consigne.ciblesRestantes[0];
  return {
    niveau: 'demonstration',
    code: 'montre-cible',
    cible: premiere === undefined ? null : premiere.region,
    texte: null
  };
}

/**
 * Fait mûrir les trois seuils d'inactivité de § 5.6 :
 *   - 20 s sans action : **relecture** automatique de la consigne. C'est une réécoute, PAS
 *     une aide (R15) : `niveauAide` ne bouge pas, `ResumeTentative.aideUtilisee` non plus,
 *     et aucune étoile n'est retirée. Seul `nbEcoutes` avance.
 *   - rang 1 : 2ᵉ erreur ou 45 s d'inactivité → `indice`.
 *   - rang 2 : 3ᵉ erreur ou 30 s après l'indice → `demonstration`.
 *
 * Appelée après CHAQUE action, pas seulement sur `battementHorloge` : une 2ᵉ erreur doit
 * déclencher l'indice immédiatement, sans attendre le battement suivant.
 *
 * CADENCE DE LA RELECTURE. L'hôte bat toutes les secondes
 * (`PERIODE_BATTEMENT_MS`, `client/src/moteurs/colorie/MoteurColorie.tsx`) : relire dès que
 * `inactivité ≥ 20 s` ferait reparler Gobi vingt-cinq fois entre la 20ᵉ et la 45ᵉ seconde.
 * L'invariant tenu ici est donc **« tant que la consigne active reste sans action, l'enfant
 * l'entend au moins une fois par tranche de 20 s »** : le moteur relit quand `nbEcoutes` est
 * en retard sur `⌊inactivité / 20 s⌋`, et pas autrement. Une réécoute volontaire (R15) compte
 * dans ce quota — l'enfant vient d'entendre la consigne, la lui resservir n'apporterait rien.
 *
 * Cet invariant se tient avec les seuls champs de `EtatConsigne` gelés au contrat § 5.5 :
 * aucun compteur de relecture n'y est prévu, et en ajouter un dévierait du contrat.
 */
function appliquerPaliers(etat: EtatColorie, instant: number): EtatColorie {
  if (etat.termineMs !== null) return etat;
  const consigne = etat.consignes[etat.indexConsigne];
  if (consigne === undefined) return etat;

  const inactiviteMs = instant - consigne.derniereActionMs;

  // Palier de relecture. Il ne remet PAS `derniereActionMs` : la même convention qu'à
  // `ecouterConsigne` — réécouter ne coûte rien, donc ne repousse pas non plus l'indice.
  // Sans cela, un enfant bloqué serait relu toutes les 20 s et n'atteindrait jamais 45 s.
  const relit = Math.floor(inactiviteMs / DELAIS_AIDE.relectureMs) > consigne.nbEcoutes;
  const nbEcoutes = relit ? consigne.nbEcoutes + 1 : consigne.nbEcoutes;

  let niveau = consigne.niveauAide;

  if (
    RANG_AIDE[niveau] < RANG_AIDE.demonstration &&
    (consigne.nbErreurs >= DELAIS_AIDE.erreursAvantDemonstration ||
      (niveau === 'indice' && inactiviteMs >= DELAIS_AIDE.demonstrationMs))
  ) {
    niveau = 'demonstration';
  } else if (
    RANG_AIDE[niveau] < RANG_AIDE.indice &&
    (consigne.nbErreurs >= DELAIS_AIDE.erreursAvantIndice ||
      inactiviteMs >= DELAIS_AIDE.indiceMs)
  ) {
    niveau = 'indice';
  }

  if (niveau === consigne.niveauAide) {
    // Une relecture seule ne touche ni `niveauAide`, ni `aide`, ni le résumé : R15, sans coût.
    if (!relit) return etat;
    return {
      ...etat,
      consignes: remplacerConsigne(etat.consignes, etat.indexConsigne, { ...consigne, nbEcoutes })
    };
  }

  const majConsigne: EtatConsigne = {
    ...consigne,
    nbEcoutes,
    niveauAide: niveau,
    // Le palier accordé fait repartir le compteur : les 30 s de la démonstration se
    // comptent depuis l'indice, pas depuis la dernière peinture.
    derniereActionMs: instant
  };

  return {
    ...etat,
    consignes: remplacerConsigne(etat.consignes, etat.indexConsigne, majConsigne),
    niveauAide: aideLaPlusHaute(etat.niveauAide, niveau),
    aide: construireAide(niveau, majConsigne)
  };
}

function creerEtat(entree: EntreeMoteur<ContenuColorie>): EtatColorie {
  const instant = entree.horloge.maintenantMs();
  const consignes: readonly EtatConsigne[] = entree.contenu.consignes.map(
    (consigne, index): EtatConsigne => ({
      id: consigne.id,
      ciblesRestantes: [...consigne.cibles],
      nbErreurs: 0,
      niveauAide: 'aucune',
      nbEcoutes: 0,
      debutMs: index === 0 ? instant : 0,
      finMs: null,
      derniereActionMs: instant
    })
  );

  return {
    indexConsigne: 0,
    consignes,
    remplissages: {},
    couleurChoisie: null,
    niveauAide: 'aucune',
    aide: null,
    dernierRefus: null,
    demarreMs: instant,
    // Un contenu sans consigne est refusé par le schéma (`minItems: 1`) ; si jamais il
    // passait, l'exercice serait terminé d'emblée plutôt que sans issue.
    termineMs: consignes.length === 0 ? instant : null
  };
}

function reduirePeindre(
  etat: EtatColorie,
  region: string,
  instant: number
): EtatColorie {
  const decision = evaluerPeintureDepuisEtat(etat, region, etat.couleurChoisie);
  const consigne = etat.consignes[etat.indexConsigne];

  if (!decision.acceptee) {
    const motif: MotifRefus = decision.motif ?? 'region-hors-consigne';
    const consignes =
      consigne !== undefined && decision.compteErreur
        ? remplacerConsigne(etat.consignes, etat.indexConsigne, {
            ...consigne,
            nbErreurs: consigne.nbErreurs + 1,
            derniereActionMs: instant
          })
        : etat.consignes;

    // La couleur ne prend pas. Pas de rouge, pas de son négatif, pas d'écran d'échec :
    // seulement une oscillation de 6 px, jouée par la couche de rendu.
    return appliquerPaliers(
      {
        ...etat,
        consignes,
        dernierRefus: { region, couleur: etat.couleurChoisie, motif, instantMs: instant }
      },
      instant
    );
  }

  // `decision.acceptee` implique une consigne active et une couleur choisie.
  if (consigne === undefined || etat.couleurChoisie === null) return etat;

  const restantes = consigne.ciblesRestantes.filter((cible) => cible.region !== region);
  let consignes = remplacerConsigne(etat.consignes, etat.indexConsigne, {
    ...consigne,
    ciblesRestantes: restantes,
    derniereActionMs: instant,
    finMs: decision.consigneSatisfaite ? instant : consigne.finMs
  });

  // Passage automatique à la consigne suivante : il n'existe ni « valider » ni
  // « suivant » (contrat § 5.3, v2 § 5.1 — le retour est immédiat).
  let indexConsigne = etat.indexConsigne;
  if (decision.consigneSatisfaite && !decision.exerciceTermine) {
    indexConsigne = etat.indexConsigne + 1;
    const suivante = consignes[indexConsigne];
    if (suivante !== undefined) {
      consignes = remplacerConsigne(consignes, indexConsigne, {
        ...suivante,
        debutMs: instant,
        derniereActionMs: instant
      });
    }
  }

  return appliquerPaliers(
    {
      ...etat,
      consignes,
      indexConsigne,
      remplissages: { ...etat.remplissages, [region]: etat.couleurChoisie },
      dernierRefus: null,
      // L'aide affichée appartient à la consigne qui vient de se clore.
      aide: decision.consigneSatisfaite ? null : etat.aide,
      termineMs: decision.exerciceTermine ? instant : etat.termineMs
    },
    instant
  );
}

function reduire(
  etat: EtatColorie,
  action: ActionColorie,
  contexte: ContexteMoteur
): EtatColorie {
  const instant = contexte.horloge.maintenantMs();

  switch (action.type) {
    case 'choisirCouleur':
      return appliquerPaliers(
        { ...etat, couleurChoisie: action.couleur, dernierRefus: null },
        instant
      );

    case 'peindre':
      return reduirePeindre(etat, action.region, instant);

    case 'ecouterConsigne': {
      // R15 : réécouter est gratuit, sans limite, et ne compte pas comme une aide.
      const consigne = etat.consignes[etat.indexConsigne];
      if (consigne === undefined) return etat;
      return appliquerPaliers(
        {
          ...etat,
          consignes: remplacerConsigne(etat.consignes, etat.indexConsigne, {
            ...consigne,
            nbEcoutes: consigne.nbEcoutes + 1
          })
        },
        instant
      );
    }

    case 'demanderAide': {
      // L'appel volontaire de Gobi produit EXACTEMENT le palier `indice`, et coûte la
      // même chose qu'un palier automatique : ni plus, ni moins (contrat § 5.6).
      const consigne = etat.consignes[etat.indexConsigne];
      if (consigne === undefined || etat.termineMs !== null) return etat;
      const niveau = aideLaPlusHaute(consigne.niveauAide, 'indice');
      if (niveau === consigne.niveauAide) return etat;
      const majConsigne: EtatConsigne = {
        ...consigne,
        niveauAide: niveau,
        derniereActionMs: instant
      };
      return {
        ...etat,
        consignes: remplacerConsigne(etat.consignes, etat.indexConsigne, majConsigne),
        niveauAide: aideLaPlusHaute(etat.niveauAide, niveau),
        aide: construireAide(niveau, majConsigne)
      };
    }

    case 'battementHorloge':
      return appliquerPaliers(etat, instant);

    default:
      return etat;
  }
}

function progression(etat: EtatColorie): ProgressionMoteur {
  const etapesTotal = etat.consignes.length;
  const finies = etat.consignes.filter((c) => c.finMs !== null).length;
  return {
    avancement: etapesTotal === 0 ? 1 : Math.min(1, finies / etapesTotal),
    termine: etat.termineMs !== null,
    etapeCourante: Math.max(0, Math.min(etat.indexConsigne, etapesTotal - 1)),
    etapesTotal
  };
}

function aideProposee(etat: EtatColorie): AideProposee | null {
  return etat.aide;
}

function resume(etat: EtatColorie): ResumeTentative {
  const dernierInstant = etat.consignes.reduce(
    (max, c) => Math.max(max, c.finMs ?? c.derniereActionMs),
    etat.demarreMs
  );
  const fin = etat.termineMs ?? dernierInstant;

  const etapes: readonly ResumeEtape[] = etat.consignes.map((c): ResumeEtape => ({
    identifiant: c.id,
    nbErreurs: c.nbErreurs,
    aideUtilisee: c.niveauAide,
    nbEcoutes: c.nbEcoutes,
    dureeMs: Math.max(0, (c.finMs ?? c.derniereActionMs) - (c.debutMs || etat.demarreMs))
  }));

  return {
    // TOUJOURS `true` : règle de non-échec (v2 § 5.4, R14). Écrire `false` ici serait
    // le seul endroit du dépôt d'où un écran d'échec pourrait naître.
    reussi: true,
    nbErreurs: etat.consignes.reduce((somme, c) => somme + c.nbErreurs, 0),
    aideUtilisee: etat.niveauAide,
    dureeMs: Math.max(0, fin - etat.demarreMs),
    etapes
  };
}

export const moteurColorie: Moteur<ContenuColorie, EtatColorie, ActionColorie> = {
  code: 'colorie',
  version: 1,
  capacites: {
    // Ordre imposé ENTRE consignes, libre À L'INTÉRIEUR d'une consigne (contrat § 5.3).
    ordreEtapesImpose: true,
    recolorieLeDecor: true,
    // Aligné sur `consignes.maxItems` du schéma de contenu.
    nbEtapesMax: 8
  },
  schemaContenu: SCHEMA_CONTENU_COLORIE,
  creerEtat,
  reduire,
  progression,
  aideProposee,
  resume
};
