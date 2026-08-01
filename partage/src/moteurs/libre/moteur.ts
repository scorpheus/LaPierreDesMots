/**
 * `moteurLibre` — le coloriage sans consigne. Lot L2-E.
 *
 * **C'est la sortie de secours à un tap, sans culpabilité** (v2 § 5.4). Il ne peut pas être
 * raté : c'est sa raison d'être, et c'est pour cela qu'il ne partage pas le réducteur des dix
 * autres moteurs. Là où eux évaluent, celui-ci enregistre.
 *
 * § 4.8, à la lettre : « Son `resume()` rend `reussi: true`, `nbErreurs: 0`,
 * `aideUtilisee: 'aucune'` — donc trois étoiles à chaque fois, et c'est voulu. »
 *
 * Trois conséquences directes, toutes vérifiées par `tests/composants/MoteurLibre.test.tsx` :
 *   - `demanderAide` est un **no-op**. Il n'y a rien à aider : aider suppose une attente, et
 *     il n'y en a aucune. Faire monter `niveauAide` ici retirerait une étoile pour un geste
 *     qui ne devrait rien coûter.
 *   - `dernierRefus` vaut `null` en permanence, et son type l'impose.
 *   - repeindre une région déjà peinte est **permis**. On n'est pas en train de valider.
 */

import { progressionDepuisEtapes, resumeDepuisEtapes } from '../commun/index.js';
import type {
  AideProposee,
  ContexteMoteur,
  EntreeMoteur,
  Moteur,
  ProgressionMoteur,
  ResumeTentative,
} from '../types.js';
import { SCHEMA_CONTENU_LIBRE } from './schema-contenu.js';
import { evaluerLibre, modeReponseLibre } from './validation.js';
import type { ActionLibre, ContenuLibre, EtatLibre, EtatEtapeLibre } from './types.js';

/** L'identifiant de l'unique étape. Il n'y a rien à découper : il n'y a pas de consigne. */
const ETAPE_UNIQUE = 'libre';

export const moteurLibre: Moteur<ContenuLibre, EtatLibre, ActionLibre> = {
  code: 'libre',
  version: 1,
  capacites: {
    // Aucun ordre : il n'y a qu'une étape, et rien n'y est imposé.
    ordreEtapesImpose: false,
    recolorieLeDecor: true,
    nbEtapesMax: 1,
  },
  schemaContenu: SCHEMA_CONTENU_LIBRE,

  creerEtat(entree: EntreeMoteur<ContenuLibre>): EtatLibre {
    const instant = entree.horloge.maintenantMs();
    const etape: EtatEtapeLibre = {
      identifiant: ETAPE_UNIQUE,
      restantes: [],
      nbErreurs: 0,
      niveauAide: 'aucune',
      nbEcoutes: 0,
      debutMs: instant,
      finMs: null,
      premiereActionMs: null,
      derniereActionMs: instant,
      instantIndiceMs: null,
      modeReponse: modeReponseLibre(entree.contenu),
      confusion: null,
    };

    return {
      indexEtape: 0,
      etapes: [etape],
      regions: [...entree.contenu.regions],
      nuancierAutorise: [...entree.contenu.nuancierAutorise],
      competence: entree.contenu.competence,
      acquis: {},
      couleurChoisie: null,
      niveauAide: 'aucune',
      aide: null,
      dernierRefus: null,
      demarreMs: instant,
      termineMs: null,
    };
  },

  reduire(etat: EtatLibre, action: ActionLibre, contexte: ContexteMoteur): EtatLibre {
    const instant = contexte.horloge.maintenantMs();
    const etape = etat.etapes[0];
    if (etape === undefined) return etat;

    switch (action.type) {
      case 'choisirCouleur':
        if (!etat.nuancierAutorise.includes(action.couleur)) return etat;
        return { ...etat, couleurChoisie: action.couleur };

      case 'colorier': {
        if (etat.termineMs !== null) return etat;
        const decision = evaluerLibre(etat, action.region, etat.couleurChoisie);
        if (decision.acquis === null) {
          // Région inconnue, ou pas de couleur en main : on IGNORE. Ignorer ne fait pas de
          // bruit ; refuser en ferait, et il n'y a rien à refuser ici.
          return etat;
        }
        return {
          ...etat,
          acquis: { ...etat.acquis, [decision.acquis[0]]: decision.acquis[1] },
          etapes: [
            {
              ...etape,
              premiereActionMs: etape.premiereActionMs ?? instant,
              derniereActionMs: instant,
            },
          ],
        };
      }

      case 'terminer':
        // Le seul moteur où l'enfant décide de la fin. Elle est toujours une réussite.
        if (etat.termineMs !== null) return etat;
        return {
          ...etat,
          etapes: [{ ...etape, finMs: instant, derniereActionMs: instant }],
          termineMs: instant,
        };

      case 'ecouterConsigne':
        // Il n'y a pas de consigne à réécouter. On compte tout de même l'écoute : le décor
        // dit ce qu'on peut faire, et l'entendre reste gratuit (R15).
        return { ...etat, etapes: [{ ...etape, nbEcoutes: etape.nbEcoutes + 1 }] };

      case 'demanderAide':
        // No-op assumé, voir l'en-tête : aider supposerait une attente, il n'y en a pas.
        return etat;

      case 'battementHorloge':
        // Aucun seuil ne mûrit : il n'existe ni indice, ni démonstration, ni relecture.
        return etat;

      default:
        return etat;
    }
  },

  progression(etat: EtatLibre): ProgressionMoteur {
    // L'avancement se voit à l'écran (le décor se remplit) mais il ne conditionne RIEN :
    // `termine` ne dépend que du choix de l'enfant.
    const base = progressionDepuisEtapes(etat.etapes, 0);
    const total = etat.regions.length;
    const peintes = etat.regions.filter((r) => etat.acquis[r] !== undefined).length;
    return {
      ...base,
      avancement: total === 0 ? 1 : Math.min(1, peintes / total),
      termine: etat.termineMs !== null,
    };
  },

  aideProposee(etat: EtatLibre): AideProposee | null {
    return etat.aide;
  },

  resume(etat: EtatLibre): ResumeTentative {
    const fin = etat.termineMs ?? etat.etapes[0]?.derniereActionMs ?? etat.demarreMs;
    // `nbErreurs` vaut 0 et `aideUtilisee` vaut `aucune` par construction : aucun chemin de
    // ce fichier ne les fait bouger. `calculerEtoiles` rendra donc 3, toujours, et c'est
    // exactement ce que § 4.8 prescrit.
    return resumeDepuisEtapes(etat.etapes, etat.demarreMs, fin);
  },
};
