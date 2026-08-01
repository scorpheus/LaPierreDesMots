/**
 * Le sélecteur de sortie — lot L2-D, v2 § 5.2 (trajet d'une sortie) et § 12.1 (prérequis).
 *
 * ```
 * nœud 1  échauffement, réussite quasi certaine
 * nœud 2  compétence en cours
 * nœud 3  révision espacée (SRS)
 * nœud 4  nouveauté, encadrée par le compagnon
 * nœud 5  défi de synthèse
 * ```
 *
 * Quatre propriétés opposables, prouvées sur 200 sorties simulées (P9 à P12 du § 4.4). Elles
 * sont dans `tests/unitaires/selecteur.test.ts` et elles font foi : ce fichier est écrit pour
 * qu'elles tiennent, pas l'inverse.
 *
 * `alea` est injecté : deux appels avec la même graine et la même entrée rendent le même plan.
 * C'est ce qui rend `test:rejeu` interprétable — un sélecteur non déterministe rendrait toute
 * comparaison de rejeu impossible à interpréter.
 *
 * Aucune valeur pédagogique en dur (C2) : les bornes, le seuil de prérequis et le rang de
 * révision viennent tous de `ParametresPedagogie`.
 */

import type { Alea } from '../alea.js';
import { ErreurPierre } from '../erreurs.js';
import type { CodeCompetence } from '../identifiants.js';
import type { Competence } from '../contenu/types.js';
import type {
  EntreeSelecteur, EtapeSortie, NoeudCandidat, ParametresPedagogie, PlanSortie,
  RoleNoeudSortie,
} from './types.js';

/** Une sortie a une ouverture ET une clôture : en dessous de deux nœuds, il n'y a pas de sortie. */
const NB_NOEUDS_PLANCHER = 2;

function refuser(message: string, details: Readonly<Record<string, unknown>>): never {
  throw new ErreurPierre('contenu-invalide', message, details);
}

function maitriseDe(entree: EntreeSelecteur, code: CodeCompetence): number {
  return entree.maitrises.find((m) => m.competence === code)?.p ?? 0;
}

/**
 * v2 § 12.1 : « aucune [compétence] n'est proposée si un prérequis est sous 60 % de maîtrise ».
 *
 * Une compétence absente du référentiel est traitée comme **non éligible** : proposer un code
 * dont on ne connaît pas la chaîne de prérequis reviendrait à supposer qu'il n'en a pas, et
 * c'est exactement le raccourci qui ferait sauter la progression phonologique.
 */
function competenceEligible(
  entree: EntreeSelecteur,
  parRef: ReadonlyMap<CodeCompetence, Competence>,
  code: CodeCompetence,
  seuil: number,
): boolean {
  const competence = parRef.get(code);
  if (competence === undefined) {
    return false;
  }
  return competence.prerequis.every((prerequis) => maitriseDe(entree, prerequis) >= seuil);
}

/**
 * Ordre canonique des candidats : difficulté croissante, puis identifiant de nœud.
 *
 * Le tri est TOTAL et ne dépend d'aucun aléa. C'est lui qui rend la composition reproductible :
 * s'appuyer sur l'ordre d'arrivée ferait dépendre le plan de l'ordre de lecture du disque.
 */
function ordreCanonique(a: NoeudCandidat, b: NoeudCandidat): number {
  if (a.difficulte !== b.difficulte) {
    return a.difficulte - b.difficulte;
  }
  return a.noeud < b.noeud ? -1 : a.noeud > b.noeud ? 1 : 0;
}

/**
 * Les rôles des `n` rangs d'une sortie.
 *
 * Rang 1 `echauffement`, rang `n` `synthese` — toujours (P10). Le rang de révision n'existe que
 * s'il tombe strictement entre les deux : à `n = 3`, le rang 3 est la clôture, et une révision
 * en clôture violerait « jamais en ouverture ni en clôture » (v2 § 12.2).
 */
function rolesDeLaSortie(n: number, rangRevision: number): readonly RoleNoeudSortie[] {
  const roles: RoleNoeudSortie[] = [];
  for (let rang = 1; rang <= n; rang += 1) {
    if (rang === 1) {
      roles.push('echauffement');
    } else if (rang === n) {
      roles.push('synthese');
    } else if (rang === rangRevision) {
      roles.push('revision');
    } else if (rang < rangRevision) {
      roles.push('competence-en-cours');
    } else {
      roles.push('nouveaute');
    }
  }
  return roles;
}

/**
 * Compose une sortie. Quatre propriétés opposables, prouvées sur 200 sorties simulées :
 *
 *  - **P9**  jamais deux fois le même habillage dans une sortie (R13) ;
 *  - **P10** l'étape de rang 1 est toujours `echauffement`, la dernière toujours `synthese` ;
 *  - **P11** aucune compétence dont un prérequis est sous `seuilPrerequis` (v2 § 12.1) ;
 *  - **P12** les révisions dues sont placées au rang `rangRevision`, jamais en 1 ni en dernier.
 *
 * LÈVE `ErreurPierre('contenu-invalide')` quand le vivier ne permet pas deux nœuds distincts.
 * Rendre un plan vide serait le pire des deux mondes : l'enfant se retrouverait devant une
 * sortie sans clôture, donc sans victoire, et rien ne le signalerait.
 */
export function composerSortie(
  entree: EntreeSelecteur,
  parametres: ParametresPedagogie,
  alea: Alea,
): PlanSortie {
  const contraintes = parametres.selecteur;
  const parRef = new Map<CodeCompetence, Competence>(
    entree.competences.map((competence) => [competence.code, competence])
  );

  // 1. Filtrer : la bonne région, et la chaîne de prérequis respectée pour TOUTES les
  //    compétences du nœud. Un nœud dont une seule compétence est prématurée est écarté en
  //    entier — on ne joue pas la moitié d'un exercice.
  const eligibles = entree.noeudsDisponibles.filter(
    (candidat) =>
      candidat.region === entree.region &&
      candidat.competences.length > 0 &&
      candidat.competences.every((code) =>
        competenceEligible(entree, parRef, code, contraintes.seuilPrerequis)
      )
  );

  // 2. Un seul nœud par habillage (R13, P9) : la déduplication se fait AVANT le choix du
  //    nombre de nœuds, sans quoi une sortie de 6 pourrait n'avoir que 4 habillages distincts.
  //    Quand les données lèvent la contrainte, le vivier garde TOUS les candidats — écrire un
  //    `Map` inconditionnel dédupliquerait quand même et rendrait le drapeau décoratif.
  const ordonnes = [...eligibles].sort(ordreCanonique);
  let vivier: readonly NoeudCandidat[];
  if (contraintes.habillageUniqueParSortie) {
    const vus = new Set<string>();
    vivier = ordonnes.filter((candidat) => {
      if (vus.has(candidat.habillage)) {
        return false;
      }
      vus.add(candidat.habillage);
      return true;
    });
  } else {
    vivier = ordonnes;
  }

  if (vivier.length < NB_NOEUDS_PLANCHER) {
    refuser(
      `Impossible de composer une sortie dans « ${entree.region} » : ` +
        `${String(vivier.length)} nœud(s) éligible(s), il en faut au moins ` +
        `${String(NB_NOEUDS_PLANCHER)} — une ouverture et une clôture.`,
      {
        region: entree.region,
        disponibles: entree.noeudsDisponibles.length,
        eligibles: vivier.length,
      }
    );
  }

  const n = Math.min(contraintes.nbNoeudsMax, vivier.length);
  const roles = rolesDeLaSortie(n, contraintes.rangRevision);

  // 3. Attribuer les nœuds aux rôles.
  //    L'échauffement est le plus facile du vivier (« réussite quasi certaine », v2 § 5.2) ;
  //    la synthèse est le plus difficile (« défi de synthèse »). Le milieu est mélangé par
  //    l'`Alea` injecté : c'est la seule source de variété, et elle est reproductible.
  const restants = [...vivier];
  const echauffement = restants.shift() as NoeudCandidat;
  const synthese = restants.pop() as NoeudCandidat;
  const milieu = alea.melanger(restants).slice(0, Math.max(0, n - NB_NOEUDS_PLANCHER));

  const choisis: NoeudCandidat[] = [echauffement, ...milieu, synthese];

  // 4. Les révisions dues, au seul rang de révision (P12). Elles ne sont injectées que si ce
  //    rang existe dans CETTE sortie — une sortie courte n'a pas de rang de révision, et
  //    inventer une place ailleurs violerait « jamais en ouverture ni en clôture ».
  const rangRevisionPresent = roles[contraintes.rangRevision - 1] === 'revision';
  const revisions = rangRevisionPresent
    ? entree.revisionsDues.map((item) => item.item)
    : [];

  const etapes: readonly EtapeSortie[] = choisis.map((candidat, index) => ({
    rang: index + 1,
    role: roles[index] as RoleNoeudSortie,
    noeud: candidat.noeud,
    habillage: candidat.habillage,
    competences: candidat.competences,
    revisions: roles[index] === 'revision' ? revisions : [],
  }));

  return {
    profil: entree.profil,
    region: entree.region,
    compagnon: entree.compagnon,
    etapes,
    composeeLe: entree.maintenant,
  };
}

/**
 * Raccourcit la sortie quand l'attention chute — temps de réponse qui s'allonge, erreurs qui
 * s'enchaînent (v2 § 5.2). Rend un plan **tronqué mais toujours clos par une `synthese`** :
 * une session se termine toujours par une victoire, y compris quand elle est écourtée.
 *
 * Les rangs sont renumérotés à partir de 1 : une étape de rang 6 devenue la troisième porterait
 * sinon un rang que rien dans le plan ne justifie, et le journal deviendrait illisible.
 */
export function raccourcirSortie(plan: PlanSortie, rangAtteint: number): PlanSortie {
  const total = plan.etapes.length;
  if (total === 0) {
    return plan;
  }

  const cloture = plan.etapes[total - 1] as EtapeSortie;
  const garde = Math.min(Math.max(0, Math.trunc(rangAtteint)), total - 1);
  const jouees = plan.etapes.slice(0, garde);

  if (garde >= total - 1) {
    return plan;
  }

  const etapes: readonly EtapeSortie[] = [...jouees, cloture].map((etape, index) => ({
    ...etape,
    rang: index + 1,
  }));

  return { ...plan, etapes };
}
