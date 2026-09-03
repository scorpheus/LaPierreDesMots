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

/**
 * Le nombre de nœuds de CETTE sortie — lot N8.
 *
 * AVANT : `Math.min(nbNoeudsMax, vivier.length)`. La longueur était donc **constante** pour
 * une région donnée, et `nbNoeudsMin` — déclaré dans
 * `contenu/referentiel/parametres-pedagogie.json`, porté par `ContraintesSelecteur`, relu par
 * `parametres.ts` — n'était lu par aucune ligne de ce fichier. La v2 § 5.2 dit « 4 à 6 nœuds
 * enchaînés » ; on en servait toujours 6.
 *
 * APRÈS : la longueur est tirée dans `[nbNoeudsMin, nbNoeudsMax]` par l'`Alea` injecté. Une
 * sortie courte n'est pas une sortie ratée — D46 : « le jeu doit être bon en 5 minutes comme
 * en 30 », et c'est la longueur qui porte cette promesse.
 *
 * Le plancher à deux reste opposable : quand le vivier ne permet pas d'atteindre
 * `nbNoeudsMin`, on sert ce qu'on a plutôt que de refuser. Refuser une sortie de trois nœuds
 * parce qu'on en voulait quatre, ce serait rendre la région injouable — un état sans issue,
 * le pire bug possible sur une application d'enfant.
 */
function nbNoeudsDeLaSortie(
  contraintes: { readonly nbNoeudsMin: number; readonly nbNoeudsMax: number },
  tailleVivier: number,
  alea: Alea,
): number {
  const bas = Math.max(NB_NOEUDS_PLANCHER, Math.trunc(contraintes.nbNoeudsMin));
  const haut = Math.max(bas, Math.trunc(contraintes.nbNoeudsMax));
  // `entier(bas, haut + 1)` est appelé INCONDITIONNELLEMENT, y compris quand le vivier est
  // trop court pour en profiter : l'état de l'`Alea` doit avancer du même nombre de tirages
  // quelle que soit la taille du vivier, sinon deux appels de même graine sur deux régions
  // différentes deviendraient corrélés d'une façon impossible à relire.
  const tire = alea.entier(bas, haut + 1);
  return Math.max(NB_NOEUDS_PLANCHER, Math.min(tire, tailleVivier));
}

/**
 * Tire un candidat DANS son palier de difficulté — lot N8.
 *
 * AVANT : `restants.shift()` pour l'échauffement, `restants.pop()` pour la synthèse. Sur les
 * six nœuds de La Clairière — difficultés 1, 1, 1, 1, 2, 2 — l'ouverture était donc
 * `clairiere-01` à **chaque** sortie, mesuré sur 60 passages. L'échauffement est pourtant
 * l'exercice que l'enfant voit le plus souvent.
 *
 * APRÈS : on tire parmi TOUS les candidats de difficulté extrême, jamais au travers des
 * paliers. Le trajet de la v2 § 5.2 est conservé à la lettre — « nœud 1 échauffement, réussite
 * quasi certaine » reste le plus facile du vivier, « nœud final un peu plus corsé » reste le
 * plus difficile — mais lequel des ex æquo joue ce rôle change d'un passage à l'autre.
 *
 * `restants` est trié canoniquement : le palier est donc un segment contigu, et le tirage ne
 * dépend pas de l'ordre de lecture du disque.
 */
function tirerDansLePalier(
  restants: NoeudCandidat[],
  extreme: 'facile' | 'difficile',
  alea: Alea,
): NoeudCandidat {
  const reference = (
    extreme === 'facile' ? restants[0] : restants[restants.length - 1]
  ) as NoeudCandidat;
  const palier = restants.filter((candidat) => candidat.difficulte === reference.difficulte);
  const choisi = alea.choisir(palier);
  restants.splice(restants.indexOf(choisi), 1);
  return choisi;
}

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
  //
  //    N8 — LE DÉFAUT QUE CETTE BOUCLE PORTAIT, mesuré avant correction. La déduplication
  //    gardait le PREMIER candidat de l'ordre canonique et jetait les autres. Or l'ordre
  //    canonique est total et déterministe : un nœud qui partage son habillage avec un nœud
  //    plus facile n'était donc **jamais** retenu, dans aucune sortie, jamais.
  //
  //    Mesuré sur Les Galeries : cinq habillages pour six nœuds ; `galeries-06`
  //    (`galeries.cristal`, l'axe b/p) tombait derrière `galeries-03` qui porte le même
  //    habillage, et sortait de 60 passages sur 60. Un exercice livré, référencé par un nœud,
  //    validé par le schéma — et invisible. C'est exactement le défaut que
  //    `clairiere-sortie-complete.test.ts` traque du côté des données ; il existait aussi ici,
  //    du côté du code, et aucun test ne le voyait parce qu'on ne regardait qu'une sortie.
  //
  //    Le représentant de chaque habillage se TIRE donc parmi les candidats qui le portent.
  //    Bénéfice second, et c'est celui que N8 cherchait : deux passages ne proposent plus le
  //    même exercice pour un habillage donné.
  // Une nouvelle sortie doit faire avancer la région. Avant ce filtre, le sélecteur pouvait
  // tirer à nouveau des nœuds déjà terminés (notamment Galeries 7/13), alors que des exercices
  // inédits restaient invisibles. Avec un seul inédit, on lui adjoint juste assez de nœuds déjà
  // vus, portant si possible d'autres habillages, pour conserver une ouverture et une clôture :
  // le dernier exercice ne peut donc plus se perdre dans un nouveau tirage aléatoire.
  const termines = new Set((entree.noeudsTermines ?? []).map(String));
  const inedits = eligibles.filter((candidat) => !termines.has(String(candidat.noeud)));
  const dejaVus = eligibles.filter((candidat) => termines.has(String(candidat.noeud)));
  const renforts = inedits.length === 1
    ? dejaVus
        .filter((candidat) => candidat.habillage !== inedits[0]?.habillage)
        .slice(0, NB_NOEUDS_PLANCHER - 1)
    : [];
  const eligiblesPourLaSortie = inedits.length >= NB_NOEUDS_PLANCHER
    ? inedits
    : inedits.length === 1 && renforts.length >= NB_NOEUDS_PLANCHER - 1
      ? [...inedits, ...renforts]
      : eligibles;
  const ordonnes = [...eligiblesPourLaSortie].sort(ordreCanonique);
  let vivier: readonly NoeudCandidat[];
  if (contraintes.habillageUniqueParSortie) {
    const parHabillage = new Map<string, NoeudCandidat[]>();
    for (const candidat of ordonnes) {
      const groupe = parHabillage.get(candidat.habillage) ?? [];
      groupe.push(candidat);
      parHabillage.set(candidat.habillage, groupe);
    }
    // Les clés sont triées : l'ordre d'insertion d'une `Map` suit l'ordre canonique des
    // candidats, mais s'appuyer dessus rendrait le tirage sensible à un changement de tri.
    const habillages = [...parHabillage.keys()].sort();
    vivier = habillages
      .map((habillage) => alea.choisir(parHabillage.get(habillage) as NoeudCandidat[]))
      .sort(ordreCanonique);
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

  const n = nbNoeudsDeLaSortie(contraintes, vivier.length, alea);
  const roles = rolesDeLaSortie(n, contraintes.rangRevision);

  // 3. Attribuer les nœuds aux rôles.
  //    L'échauffement est le plus facile du vivier (« réussite quasi certaine », v2 § 5.2) ;
  //    la synthèse est le plus difficile (« défi de synthèse »). Le milieu est mélangé par
  //    l'`Alea` injecté.
  //
  //    N8 : le mélange du milieu N'ÉTAIT PAS une source de variété suffisante. Quand le vivier
  //    tient tout entier dans la sortie — le cas de nos deux régions —, mélanger le milieu ne
  //    change que l'ORDRE, jamais la composition, et l'ouverture comme la clôture restaient
  //    identiques à chaque passage. Les deux extrémités se tirent donc maintenant DANS leur
  //    palier de difficulté (`tirerDansLePalier`), et la longueur elle-même varie.
  const restants = [...vivier];
  const echauffement = tirerDansLePalier(restants, 'facile', alea);
  const synthese = tirerDansLePalier(restants, 'difficile', alea);
  const moteursFavorises = new Set((entree.moteursFavorises ?? []).map(String));
  const favorises = restants.filter(
    (candidat) => candidat.moteur !== undefined && moteursFavorises.has(String(candidat.moteur))
  );
  const ordinaires = restants.filter((candidat) => !favorises.includes(candidat));
  // Une préférence, jamais une obligation : le compagnon amène d'abord une mécanique qui lui
  // ressemble quand elle est disponible, sans écarter de compétence ni casser les paliers de
  // difficulté. Le reste demeure mélangé par l'Alea injecté.
  const milieu = [...alea.melanger(favorises), ...alea.melanger(ordinaires)]
    .slice(0, Math.max(0, n - NB_NOEUDS_PLANCHER));

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
