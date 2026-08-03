/**
 * La galerie d'exercices de la zone parent — D34.
 *
 * TROIS PROPRIÉTÉS OPPOSABLES :
 *   1. tout exercice du catalogue est lançable, quel que soit l'état de progression ;
 *   2. **RIEN de ce qui s'y joue n'est journalisé** — sinon un parent qui teste fausse les
 *      statistiques de l'enfant, et le journal cesse de faire foi ;
 *   3. l'entrée est invisible depuis l'espace enfant.
 *
 * Tout ce fichier est PUR : aucune horloge, aucun aléa, aucun accès disque, aucun DOM. Il est
 * atteint par le seul sous-chemin `@pierre/partage/parent`, chargé en chunk différé — rien de
 * la zone parent n'entre dans le bundle de 250 Ko que l'enfant télécharge (convention C1).
 */

import type {
  CodeCompetence, CodeMoteur, CodeRegion, IdExercice, IdHabillage, IdNoeud,
} from '../identifiants.js';

export type StatutValidation = 'en-attente' | 'valide' | 'rejete' | 'livre';

export interface EntreeGalerie {
  readonly exercice: IdExercice;
  readonly titre: string;
  readonly moteur: CodeMoteur;
  readonly habillage: IdHabillage;
  readonly competences: readonly CodeCompetence[];
  readonly statut: StatutValidation;
  /**
   * Le nœud qui joue cet exercice — R30.
   *
   * Le catalogue liste des exercices ; on n'entre dans le jeu que par un nœud. Sans ce champ,
   * « Lancer cet exercice » n'avait rien à ouvrir, et le bouton restait désactivé sans que
   * rien ne le dise. Le serveur le résolvait déjà pour en déduire la région : il le publie.
   *
   * `null` quand l'exercice ne déclare aucun nœud — l'entrée reste au catalogue, elle n'est
   * simplement pas lançable, et la fiche le dit au parent au lieu de le laisser deviner.
   */
  readonly noeud: IdNoeud | null;
  readonly region: CodeRegion | null;
  /** Chemin sur disque — c'est aussi l'écran de relecture de l'annexe P § 6.3. */
  readonly chemin: string;
}

export interface CatalogueGalerie {
  readonly entrees: readonly EntreeGalerie[];
  /** Bénéfice de D34 : R12 et R13 deviennent vérifiables À L'ŒIL, pas seulement par un test. */
  readonly moteursParCompetence: Readonly<Record<CodeCompetence, readonly CodeMoteur[]>>;
  readonly habillagesParMoteur: Readonly<Record<CodeMoteur, readonly IdHabillage[]>>;
}

/**
 * Le drapeau qui traverse tout le chemin de lancement.
 *
 * `journalise: false` n'est PAS un filtre appliqué au serveur : le client ne poste rien du
 * tout. Un filtre serveur laisserait la requête partir, donc laisserait un jour quelqu'un
 * l'oublier. `tests/unitaires/galerie-non-journalisee.test.ts` compte les lignes de
 * `tentatives` avant et après N lancements, et exige l'égalité.
 */
export interface OptionsLancement {
  readonly journalise: boolean;
}

export const LANCEMENT_PARENT: OptionsLancement = { journalise: false };
export const LANCEMENT_ENFANT: OptionsLancement = { journalise: true };

/** L'état de la porte parent — ce qui permet de distinguer « pas de code » de « code faux ». */
export interface EtatPorteParent {
  readonly codeDefini: boolean;
  readonly verrouilleJusqua: string | null;
  readonly nbEchecs: number;
}

// ─────────────────────────────────────────────────────────── construction du catalogue
//
// Ces trois fonctions sont ici, et non dans `serveur/src/services/catalogue-exercices.ts`,
// pour une raison mesurable : le test de R12 / R13 doit pouvoir croiser le catalogue SANS
// monter une application Fastify ni ouvrir une base. Le service serveur ne fait plus que
// LIRE le disque et appeler ces fonctions ; ce qu'il ajoute est de l'entrée-sortie, et rien
// de ce qui se raisonne n'est enfermé derrière une requête HTTP.

/**
 * L'index « quels moteurs travaillent cette compétence ? » — la lecture directe de R12.
 *
 * Un moteur n'y apparaît qu'UNE fois par compétence, même si six exercices l'emploient :
 * R12 exige « ≥ 3 moteurs par compétence », pas « ≥ 3 exercices ». Compter les occurrences
 * ferait passer trois habillages du même moteur pour trois moteurs.
 */
export function indexerMoteursParCompetence(
  entrees: readonly EntreeGalerie[],
): Readonly<Record<CodeCompetence, readonly CodeMoteur[]>> {
  const index = new Map<CodeCompetence, Set<CodeMoteur>>();
  for (const entree of entrees) {
    for (const competence of entree.competences) {
      const moteurs = index.get(competence) ?? new Set<CodeMoteur>();
      moteurs.add(entree.moteur);
      index.set(competence, moteurs);
    }
  }
  return figerIndex(index);
}

/**
 * L'index « quels habillages ce moteur porte-t-il ? » — la lecture directe de R13.
 *
 * Un moteur qui n'a qu'un seul habillage ne peut pas tenir « jamais deux fois le même
 * habillage dans une sortie » dès qu'il y passe deux fois. Le voir à l'œil dans la galerie
 * est exactement ce que D34 achète.
 */
export function indexerHabillagesParMoteur(
  entrees: readonly EntreeGalerie[],
): Readonly<Record<CodeMoteur, readonly IdHabillage[]>> {
  const index = new Map<CodeMoteur, Set<IdHabillage>>();
  for (const entree of entrees) {
    const habillages = index.get(entree.moteur) ?? new Set<IdHabillage>();
    habillages.add(entree.habillage);
    index.set(entree.moteur, habillages);
  }
  return figerIndex(index);
}

/**
 * Le catalogue complet à partir de ses entrées. **Aucun filtre, jamais** : c'est la propriété
 * n° 1 de D34, et la seule façon de la tenir est de n'avoir nulle part où écrire un filtre.
 *
 * Les entrées sont triées par identifiant d'exercice — un ordre stable, indépendant du
 * système de fichiers, pour que deux machines rendent la même galerie.
 */
export function construireCatalogue(entrees: readonly EntreeGalerie[]): CatalogueGalerie {
  const triees = [...entrees].sort((a, b) => (a.exercice < b.exercice ? -1 : a.exercice > b.exercice ? 1 : 0));
  return {
    entrees: triees,
    moteursParCompetence: indexerMoteursParCompetence(triees),
    habillagesParMoteur: indexerHabillagesParMoteur(triees),
  };
}

function figerIndex<C extends string, V extends string>(
  index: ReadonlyMap<C, ReadonlySet<V>>,
): Readonly<Record<C, readonly V[]>> {
  const sortie: Record<string, readonly V[]> = {};
  for (const cle of [...index.keys()].sort()) {
    sortie[cle] = [...(index.get(cle) ?? new Set<V>())].sort();
  }
  return sortie as Readonly<Record<C, readonly V[]>>;
}
