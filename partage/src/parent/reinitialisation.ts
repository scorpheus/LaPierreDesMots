/**
 * Remise à zéro d'un profil, et état réel d'un profil — lot H2.
 *
 * Demandé après essai réel : *« le père teste sur le profil de son fils et demande un moyen de
 * repartir à zéro »*. Ce fichier est **entièrement pur** — aucune horloge, aucun aléa, aucun
 * accès disque, aucun DOM, aucune requête. Il est atteint par le seul sous-chemin
 * `@pierre/partage/parent`, chargé en chunk différé : rien de la zone parent n'entre dans le
 * bundle de 250 Ko que l'enfant télécharge (convention C1).
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * LES QUATRE PROPRIÉTÉS OPPOSABLES DE CE CONTRAT
 *
 * 1. **On efface par défaut, on conserve par exception.** La portée « progression » est
 *    définie comme *toutes les tables porteuses de `profil_id`, MOINS une liste blanche
 *    courte et explicite*. Jamais l'inverse. C'est la leçon de D48 appliquée à l'effacement :
 *    si l'on énumérait ce qu'il faut effacer, une table ajoutée par une migration future
 *    survivrait en silence à la remise à zéro — et le profil garderait une projection périmée,
 *    c'est-à-dire exactement le défaut que cette campagne corrige.
 *
 * 2. **La confirmation nomme le profil.** Le serveur exige que le parent ait retapé le prénom
 *    de l'enfant. Un tap distrait ne peut pas produire un prénom ; une requête égarée non
 *    plus. La comparaison passe par `comparerNormalise` : « ezekiel » vaut « Ezékiel », un
 *    accent ne fait pas échouer un parent qui a raison.
 *
 * 3. **Ce qui sera perdu est énoncé avant, pas après.** `pertesDeLaPortee` rend la liste en
 *    français, et c'est la MÊME liste qui décrit l'écran de confirmation et le rapport de la
 *    commande hors interface. Deux formulations divergentes seraient deux promesses.
 *
 * 4. **Le rapport porte des comptes, pas un « ok ».** `RapportReinitialisation.lignes` dit
 *    table par table combien de lignes ont disparu. Un effacement qui n'efface rien se voit ;
 *    un effacement qui oublie une table se voit aussi.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 */

import type { CodeRegion, Horodatage, IdNoeud, IdProfil } from '../identifiants.js';
import { comparerNormalise } from '../texte.js';

// ═══════════════════════════════════════════════════════════════════ les deux portées

/**
 * Les deux portées de remise à zéro. Elles ne servent pas la même chose :
 *
 * - `complete` — le profil redevient neuf. Tout ce qui le concerne disparaît, y compris les
 *   réglages de lecture.
 * - `progression` — on garde le prénom, l'avatar et les **réglages de lecture** (police,
 *   corps, interlettrage, fond). Ces réglages ont été mesurés POUR cet enfant, par un adulte,
 *   au terme d'un essai typographique (D19) ; les perdre parce qu'on veut rejouer la Clairière
 *   serait absurde.
 */
export type PorteeReinitialisation = 'complete' | 'progression';

export const PORTEES_REINITIALISATION: readonly PorteeReinitialisation[] = [
  'complete',
  'progression'
];

export function estPorteeReinitialisation(valeur: unknown): valeur is PorteeReinitialisation {
  return valeur === 'complete' || valeur === 'progression';
}

/**
 * Les tables porteuses de `profil_id` que la portée « progression » **conserve**.
 *
 * C'est la SEULE liste blanche du dispositif, et elle tient en deux noms. Tout le reste est
 * effacé, y compris ce qu'une migration future ajoutera — voir la propriété n° 1 en tête de
 * fichier.
 *
 * - `reglages_lecture` : la typographie réglée pour cet enfant (D19).
 * - `essais_typographie` : la mesure qui a produit ce réglage. La jeter sans jeter le réglage
 *   laisserait un réglage dont plus personne ne sait d'où il vient.
 *
 * `profils` n'y figure pas parce qu'elle **ne porte pas** `profil_id` : c'est la table du
 * profil lui-même, jamais touchée par une remise à zéro. Supprimer un profil est une autre
 * action, qui n'est pas demandée ici.
 */
export const TABLES_CONSERVEES_PAR_PROGRESSION: readonly string[] = [
  'essais_typographie',
  'reglages_lecture'
];

/** Vrai quand la portée efface le contenu de cette table pour le profil visé. */
export function porteeEfface(portee: PorteeReinitialisation, table: string): boolean {
  if (portee === 'complete') {
    return true;
  }
  return !TABLES_CONSERVEES_PAR_PROGRESSION.includes(table);
}

// ═══════════════════════════════════════════════════════════════ ce qui sera perdu

/** Un libellé humain de la portée, pour le titre de l'écran et celui de la commande. */
export function libellePortee(portee: PorteeReinitialisation): string {
  return portee === 'complete'
    ? 'Remise à zéro complète'
    : 'Remise à zéro de la progression seule';
}

/**
 * Ce qui sera perdu, en français, dans l'ordre où un parent y pense.
 *
 * Écrit une fois, lu par l'écran de confirmation ET par la commande hors interface. La règle
 * de formulation de D35 ne s'applique pas ici : cet écran s'adresse à un adulte et doit dire
 * une **perte**, pas un pouvoir d'agir. C'est le seul endroit du dépôt où c'est vrai, et c'est
 * pourquoi il est isolé dans une fonction plutôt que dispersé dans deux composants.
 */
export function pertesDeLaPortee(portee: PorteeReinitialisation): readonly string[] {
  const communes = [
    'toute la progression : les nœuds terminés, les étoiles, les régions recoloriées et les Éclats',
    'la maîtrise mesurée de chaque compétence, et les révisions en attente',
    'la collection : formes de Gobi, compagnons ralliés, objets du campement',
    'le stade de Gobi, qui redevient celui du premier jour',
    'le journal des tentatives — c’est lui qui fait foi, donc rien ne pourra être reconstruit'
  ];
  if (portee === 'progression') {
    return communes;
  }
  return [
    ...communes,
    'les réglages de lecture : police, corps, interlettrage, espacement, fond'
  ];
}

/** Ce qui survit, dit explicitement : un parent doit lire les deux colonnes avant de trancher. */
export function conservesParLaPortee(portee: PorteeReinitialisation): readonly string[] {
  const communs = ['le prénom de l’enfant', 'son avatar'];
  if (portee === 'complete') {
    return communs;
  }
  return [...communs, 'les réglages de lecture, réglés pour lui (police, espacement, fond)'];
}

// ═══════════════════════════════════════════════════════════════ la confirmation

/**
 * La confirmation est valide quand le parent a retapé le prénom de l'enfant.
 *
 * Un bouton seul ne suffit pas : « c'est une action irréversible sur les données d'un enfant,
 * elle ne doit jamais se déclencher par un tap distrait ». Retaper un prénom demande de lire
 * QUEL profil est visé — c'est la garde qui nomme le profil, pas seulement celle qui ralentit.
 *
 * `comparerNormalise` et non `===` : le prénom est affiché à l'écran juste au-dessus du champ,
 * et refuser « ezekiel » pour « Ezékiel » punirait un parent qui a raison.
 */
export function confirmationValide(prenom: string, saisie: unknown): boolean {
  if (typeof saisie !== 'string' || saisie.trim() === '') {
    return false;
  }
  return comparerNormalise(prenom, saisie);
}

// ═══════════════════════════════════════════════════════════════ le rapport

/** Une table effacée et son compte de lignes. Zéro est une information, pas une absence. */
export interface LigneRapportReinitialisation {
  readonly table: string;
  readonly lignesEffacees: number;
}

/**
 * Ce que rend une remise à zéro. **Des comptes, jamais un « ok »** — un effacement muet est
 * indistinguable d'un effacement qui n'a rien fait.
 */
export interface RapportReinitialisation {
  readonly profil: IdProfil;
  readonly prenom: string;
  readonly portee: PorteeReinitialisation;
  readonly effectueLe: Horodatage;
  /** Une ligne par table porteuse de `profil_id`, y compris celles restées à zéro. */
  readonly lignes: readonly LigneRapportReinitialisation[];
  /** Somme de `lignes` — le chiffre que le parent lit en premier. */
  readonly lignesEffaceesTotal: number;
  /** Les tables volontairement épargnées par la portée. Vide pour `complete`. */
  readonly tablesConservees: readonly string[];
}

/**
 * Ce que rendrait une remise à zéro, **sans rien effacer**.
 *
 * L'écran de confirmation le demande avant de faire taper quoi que ce soit : un parent doit
 * lire des comptes réels — « 6 tentatives, 3 nœuds, 6 régions » — et non une promesse
 * générique. Un avertissement qui ne chiffre rien ne se lit plus au troisième passage.
 */
export interface ApercuReinitialisation {
  readonly profil: IdProfil;
  readonly prenom: string;
  readonly portee: PorteeReinitialisation;
  readonly lignes: readonly LigneRapportReinitialisation[];
  /** `pertesDeLaPortee(portee)`, rendue par le serveur pour qu'il n'y ait qu'une formulation. */
  readonly pertes: readonly string[];
}

/** Somme des lignes effacées. Isolée pour que l'écran et la commande comptent pareil. */
export function totalLignesEffacees(
  lignes: readonly LigneRapportReinitialisation[]
): number {
  return lignes.reduce((somme, ligne) => somme + ligne.lignesEffacees, 0);
}

// ═══════════════════════════════════════════════════ l'état réel du profil (point 3)

/**
 * Une région, vue **deux fois** : ce que la base a stocké, et ce que le journal redonne.
 *
 * C'EST LE CŒUR DE CET ÉCRAN. Le défaut qui a bloqué l'enfant — deux régions à 100 % pour
 * 3 nœuds joués sur 18 — était invisible parce que rien nulle part n'affichait les deux
 * valeurs côte à côte. Une seule requête SQL le montrait, et il a fallu la penser.
 *
 * On n'affiche donc jamais un pourcentage sans son recalcul, et jamais un recalcul sans son
 * écart. « Si un agent doit recalculer, il imprime les deux valeurs et l'écart » — la règle
 * vaut aussi pour un écran.
 */
export interface EtatRegionProfil {
  readonly region: CodeRegion;
  readonly ordre: number;
  readonly ouverte: boolean;
  /** Ce que `progression_region` porte en base. Projection, jamais source de vérité. */
  readonly pourcentageStocke: number;
  /** Ce que le journal redonne aujourd'hui, par `carteRecalculee`. */
  readonly pourcentageRecalcule: number;
  /** `pourcentageStocke - pourcentageRecalcule`. Non nul = projection périmée. */
  readonly ecart: number;
  readonly noeudsLivres: number;
  readonly noeudsTermines: number;
  readonly eclatObtenuLe: Horodatage | null;
}

/** Une tentative récente, telle que le parent peut la relire. */
export interface TentativeRecente {
  readonly noeud: IdNoeud;
  readonly exercice: string;
  readonly moteur: string;
  readonly termineLe: Horodatage;
  readonly reussi: boolean;
  readonly etoiles: number;
  readonly nbErreurs: number;
  readonly aideUtilisee: string;
}

/**
 * L'état réel d'un profil — « ce que le profil a réellement fait ».
 *
 * L'écran qui rend ceci est celui qui aurait rendu le défaut visible immédiatement au lieu
 * d'exiger une requête SQL. C'est sa raison d'être, et elle commande sa forme : des comptes
 * bruts d'abord, les écarts ensuite, la narration jamais.
 */
export interface EtatProfil {
  readonly profil: IdProfil;
  readonly prenom: string;
  readonly creeLe: Horodatage;
  readonly dernierAccesLe: Horodatage;

  readonly noeudsTermines: number;
  readonly noeudsLivres: number;
  readonly etoilesObtenues: number;
  /** 3 × `noeudsLivres` : le plafond réel, pour que « 7 étoiles » se lise sur quelque chose. */
  readonly etoilesPossibles: number;
  readonly nbTentatives: number;
  readonly nbEtapes: number;

  readonly regions: readonly EtatRegionProfil[];
  readonly dernieresTentatives: readonly TentativeRecente[];

  readonly stadeGobi: string | null;
  readonly nbFormesGobi: number;
  readonly nbCompagnons: number;
  readonly nbObjetsCampement: number;
  readonly nbItemsLeitner: number;

  /**
   * Le nombre de régions dont la projection ment — `ecart` non nul.
   *
   * **C'est le chiffre du lot.** Il valait 2 sur la base réelle du 2026-08-02 (Clairière et
   * Galeries, toutes deux à 100 % stocké pour 1/6 et 2/12 nœuds terminés). Il doit valoir 0
   * sur un profil sain, et un écran qui l'affiche non nul dit au parent, sans SQL, que la
   * carte ment.
   */
  readonly regionsIncoherentes: number;
}

/** Compte les régions dont la projection stockée s'écarte du recalcul. */
export function compterRegionsIncoherentes(
  regions: readonly EtatRegionProfil[]
): number {
  return regions.filter((region) => region.ecart !== 0).length;
}
