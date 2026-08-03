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

/**
 * Ce que Gobi répond quand on l'appelle ici — lot A4.
 *
 * `AideProposee.niveau` n'admet pas `aucune` (`Exclude<NiveauAide, 'aucune'>`), donc la
 * valeur est `indice` : c'est le TYPE qui l'impose, pas un palier atteint. Le palier, lui,
 * reste `aucune` dans l'état — voir `demanderAide` ci-dessous —, et c'est lui seul que
 * `resume()` transporte jusqu'aux étoiles.
 *
 * `cible: null` parce qu'il n'y a rien à montrer : aucune région n'est plus juste qu'une
 * autre. Le texte est dit par `FournisseurVoix` et n'est jamais affiché seul (R15).
 */
const AIDE_LIBRE: AideProposee = {
  niveau: 'indice',
  code: 'relire-consigne',
  cible: null,
  texte: 'Ici, il n’y a rien à réussir. Prends la couleur que tu veux.',
};

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
        aideDemandee: 'aucune',
      nbEcoutes: 0,
      debutMs: instant,
      finMs: null,
      premiereActionMs: null,
      derniereActionMs: instant,
      instantIndiceMs: null,
      modeReponse: modeReponseLibre(entree.contenu),
      // Mode à `p_devinette` tabulée : aucun nombre d'éléments à transmettre (D13).
      nbElements: null,
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
        // ─────────────────────────────────────────────────────────────────────────────────
        // GOBI RÉPOND. Corrigé au lot A4, quand `libre` est devenu atteignable.
        //
        // Ce cas était un NO-OP assumé — « aider supposerait une attente, il n'y en a pas ».
        // Le raisonnement est juste et il reste écrit ; sa CONSÉQUENCE ne l'était pas : la
        // coquille rend un bouton « Gobi, aide-moi » sur ce moteur comme sur les treize
        // autres, et ce bouton ne faisait rien. Un bouton qui ne répond pas « casse la
        // confiance plus sûrement qu'un bouton absent » (D42) — et il le faisait sur le seul
        // écran conçu pour l'enfant qui n'a plus envie de déchiffrer.
        //
        // Mesuré, pas supposé, dès le premier nœud `libre` livré :
        //
        //   x « libre » : l’aide de Gobi est offerte et ne coûte jamais un échec
        //     Error: « libre » : l'aide est tapée et rien ne change
        //     (tests/e2e/parcours-audit-moteurs.spec.ts:159)
        //
        // CE QUI NE CHANGE PAS, ET C'EST LE POINT : `niveauAide` — celui de l'étape comme
        // celui de l'exercice — reste `aucune`. `resumeDepuisEtapes` rend donc toujours
        // `aideUtilisee: 'aucune'`, et `calculerEtoiles` toujours 3. La garantie du § 4.8
        // (« trois étoiles à chaque fois, et c'est voulu ») tient mécaniquement, et
        // `tests/unitaires/moteurs-reducteurs.test.ts` l'assert désormais en toutes lettres.
        // Ce qui change est la seule chose qui manquait : Gobi dit un mot.
        // ─────────────────────────────────────────────────────────────────────────────────
        if (etat.termineMs !== null) return etat;
        return {
          ...etat,
          // L'écoute est comptée, comme pour `ecouterConsigne` : elle est gratuite (R15) et
          // c'est elle qui rend l'état différent à chaque demande, donc le bouton vivant.
          etapes: [{ ...etape, nbEcoutes: etape.nbEcoutes + 1 }],
          aide: AIDE_LIBRE,
        };

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
