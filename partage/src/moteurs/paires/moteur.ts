/**
 * `moteurPaires` — la mécanique pure de `paires`. Lot L2-E.
 *
 * Appariement mot / image. Retourner la PREMIÈRE carte ne juge rien et ne compte rien ;
 * seule la seconde décide. Une paire faite ne se reprend jamais (R14).
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
import { SCHEMA_CONTENU_PAIRES } from './schema-contenu.js';
import { evaluerPaires, modeReponsePaires } from './validation.js';
import type { DecisionPaires } from './validation.js';
import type {
  ActionPaires,
  ContenuPaires,
  EtatPaires,
  EtatEtapePaires,
  IdPaire,
  RefusPaires,
} from './types.js';

function remplacer(
  etapes: readonly EtatEtapePaires[],
  index: number,
  remplacante: EtatEtapePaires,
): readonly EtatEtapePaires[] {
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
function appliquerPaliers(etat: EtatPaires, instant: number): EtatPaires {
  if (etat.termineMs !== null) return etat;
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined) return etat;

  // `relecturesDues` porte le quota, `niveauAideSuivant` porte la monotonie : les deux
  // viennent du socle commun de L2-C, jamais réimplantés ici (§ 4.8, règle 4).
  const relit = relecturesDues(etape, instant, DELAIS_AIDE_PAR_DEFAUT) > etape.nbEcoutes;
  const niveau = niveauAideSuivant(etape, instant, DELAIS_AIDE_PAR_DEFAUT);

  if (niveau === etape.niveauAide && !relit) return etat;

  const maj: EtatEtapePaires = {
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
  etat: EtatPaires,
  decision: DecisionPaires,
  refus: RefusPaires,
  instant: number,
  extra: Partial<EtatPaires>,
): EtatPaires {
  const etape = etat.etapes[etat.indexEtape];
  if (etape === undefined) return etat;

  if (!decision.acceptee) {
    // Le geste ne prend pas. Aucun rouge, aucun son négatif, aucun écran d'échec : une
    // oscillation de 6 px, jouée par la couche de rendu (R14, v2 § 8).
    const majEtape: EtatEtapePaires = {
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
  // Une paire correcte peut appartenir à n'importe quelle étape encore visible sur le plateau.
  // On la retire donc de son étape propriétaire, pas forcément de l'étape courante.
  let etapes: readonly EtatEtapePaires[] = etat.etapes.map((candidate, index) => {
    const contenait = cle !== null && candidate.restantes.includes(cle);
    const restantes = contenait
      ? candidate.restantes.filter((restante) => restante !== cle)
      : candidate.restantes;
    const devientVide = contenait && restantes.length === 0;
    return {
      ...candidate,
      restantes,
      debutMs: devientVide && candidate.debutMs === 0 ? instant : candidate.debutMs,
      premiereActionMs:
        index === etat.indexEtape ? candidate.premiereActionMs ?? instant : candidate.premiereActionMs,
      derniereActionMs: contenait || index === etat.indexEtape ? instant : candidate.derniereActionMs,
      finMs: devientVide ? instant : candidate.finMs,
    };
  });

  // Passage automatique à l'étape suivante : il n'existe ni « valider » ni « suivant »
  // (contrat v1 § 5.3, v2 § 5.1 — le retour est immédiat).
  let indexEtape = etat.indexEtape;
  if (decision.etapeSatisfaite && !decision.exerciceTermine) {
    // Des paires d'étapes futures peuvent déjà avoir été trouvées. On saute leurs étapes
    // devenues vides au lieu de les rouvrir et de bloquer la sortie.
    do {
      indexEtape += 1;
    } while (etapes[indexEtape]?.restantes.length === 0 && indexEtape < etapes.length - 1);
    const suivante = etapes[indexEtape];
    if (suivante !== undefined) {
      etapes = remplacer(etapes, indexEtape, {
        ...suivante,
        debutMs: suivante.debutMs === 0 ? instant : suivante.debutMs,
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

export const moteurPaires: Moteur<ContenuPaires, EtatPaires, ActionPaires> = {
  code: 'paires',
  version: 1,
  capacites: {
    // Le plateau entier est visible : l'enfant peut constituer n'importe quelle paire.
    ordreEtapesImpose: false,
    recolorieLeDecor: false,
    // Aligné sur `maxItems` du schéma de contenu : les deux doivent bouger ensemble.
    nbEtapesMax: 6,
  },
  schemaContenu: SCHEMA_CONTENU_PAIRES,

  creerEtat(entree: EntreeMoteur<ContenuPaires>): EtatPaires {
    const instant = entree.horloge.maintenantMs();
    // R32/R44 — LE MÉLANGE DU PLATEAU, ICI ET UNE SEULE FOIS.
    //
    // Les cartes étaient rangées deux par deux, `mot-X · image-X`, dans l'ordre d'`aApparier` :
    // retourner les deux premières cartes visibles gagnait toujours la BONNE paire. Le mélange
    // porte sur le CATALOGUE ENTIER (toutes les étapes) — c'est lui qui fixe l'ordre réel du
    // plateau. Le tirage passe par `Alea`, jamais `Math.random`.
    const cartesMelangees = entree.alea.melanger(entree.contenu.cartes);
    // L'ordre des PAIRES tel qu'une main qui scanne le plateau mélangé de gauche à droite les
    // rencontrerait — première apparition de chaque `IdPaire`, cartes dédoublonnées.
    const ordrePairesGlobal: IdPaire[] = [];
    for (const carte of cartesMelangees) {
      if (!ordrePairesGlobal.includes(carte.paire)) ordrePairesGlobal.push(carte.paire);
    }
    const etapes = entree.contenu.consignes.map(
      (etape, index): EtatEtapePaires => ({
        identifiant: etape.id,
        // La projection, propre à cette étape, de l'ordre des paires du plateau mélangé.
        ordreAffichage: ordrePairesGlobal.filter((id) => etape.aApparier.includes(id)),
        restantes: [...etape.aApparier],
        nbErreurs: 0,
        niveauAide: 'aucune',
        aideDemandee: 'aucune',
        nbEcoutes: 0,
        debutMs: index === 0 ? instant : 0,
        finMs: null,
        premiereActionMs: null,
        derniereActionMs: instant,
        instantIndiceMs: null,
        modeReponse: modeReponsePaires(entree.contenu),
        // `'appariement'` : `p_devinette = 1/n!` se calcule depuis ce nombre (D13).
        nbElements: etape.aApparier.length,
        confusion: null,
      }),
    );

    return {
      indexEtape: 0,
      etapes,
      cartes: cartesMelangees,
      competence: entree.contenu.competence,
      acquis: {},
      carteRetournee: null,
      niveauAide: 'aucune',
      aide: null,
      dernierRefus: null,
      demarreMs: instant,
      // Un contenu sans étape est refusé par le schéma (`minItems: 1`) ; s'il passait, la
      // partie serait close d'emblée plutôt que sans issue (test `singe`).
      termineMs: etapes.length === 0 ? instant : null,
    };
  },

  reduire(etat: EtatPaires, action: ActionPaires, contexte: ContexteMoteur): EtatPaires {
    const instant = contexte.horloge.maintenantMs();
    const etape = etat.etapes[etat.indexEtape];

    switch (action.type) {
      case 'retourner': {
        // Première carte : on retourne, on n'évalue pas. C'est ce qui rend le premier tap
        // gratuit — sans quoi un memory punirait le fait même d'explorer.
        if (etat.carteRetournee === null) {
          if (!etat.cartes.some((c) => c.id === action.carte)) return etat;
          return { ...etat, carteRetournee: action.carte, dernierRefus: null };
        }
        const decision = evaluerPaires(etat, etat.carteRetournee, action.carte);
        return appliquerDecision(
          etat,
          decision,
          { carte: action.carte, motif: decision.motif ?? 'carte-inconnue', instantMs: instant },
          instant,
          // Les deux cartes se retournent, quel que soit le verdict.
          { carteRetournee: null },
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
        const maj: EtatEtapePaires = {
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

  progression(etat: EtatPaires): ProgressionMoteur {
    return progressionDepuisEtapes(etat.etapes, etat.indexEtape);
  },

  aideProposee(etat: EtatPaires): AideProposee | null {
    return etat.aide;
  },

  resume(etat: EtatPaires): ResumeTentative {
    const fin =
      etat.termineMs ??
      etat.etapes.reduce((max, e) => Math.max(max, e.finMs ?? e.derniereActionMs), etat.demarreMs);
    return resumeDepuisEtapes(etat.etapes, etat.demarreMs, fin);
  },
};
