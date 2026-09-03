/**
 * Types du moteur `place` — lot L2-C. Clôt le point ouvert O6.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.2, reproduit à la lettre.
 *
 * Ce fichier ne contient QUE des types. Les valeurs vivent dans `validation.ts`,
 * `moteur.ts` et `schema-contenu.ts`.
 *
 * RAISON D'ÊTRE DU MOTEUR, en une phrase : les 8 consignes « Dessine… » du niveau 1
 * exercent la **localisation spatiale**, que le coloriage n'exerce pas du tout
 * (fiches-origine § 3, quatrième observation). Mesuré sur le corpus réel :
 *
 *   $ python -c "…manifeste…"  →  consignesParType = { colorie: 51, place: 8, autre: 16 }
 *
 * ÉCART AU CONTRAT GELÉ, signalé au rapport : le bloc du § 4.3.2 n'importe pas
 * `MotifRefusPlace`, qu'il utilise pourtant dans `RefusPlace`. L'import est ajouté ici ;
 * il est `import type`, donc effacé à la compilation, et le cycle types↔validation est
 * sans effet à l'exécution.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { Point, Polygone } from '../commun/geometrie.js';
import type { NiveauAide, AideProposee } from '../types.js';
import type { FormeConsigne } from '../colorie/types.js';
import type { MotifRefusPlace } from './validation.js';

export type IdElement = string;
export type IdZoneCible = string;

/**
 * La relation spatiale exercée. **C'est la raison d'être du moteur** : « à côté de », « dans
 * le ciel », « sur le banc » exercent la localisation spatiale, que le coloriage n'exerce
 * pas du tout (fiches-origine § 3, quatrième observation).
 *
 * Les neuf valeurs couvrent les quatre relations réellement présentes au niveau 1 —
 * `dans` (fiches 1 et 4), `a-cote-de` (fiches 2, 3 et 5), `sur` (fiches 6 et 7),
 * `derriere` (fiche 15) — et cinq de plus pour les niveaux suivants.
 */
export type RelationSpatiale =
  | 'dans' | 'sur' | 'sous' | 'a-cote-de'
  | 'devant' | 'derriere' | 'entre' | 'au-dessus' | 'en-dessous';

export interface ElementPlacable {
  readonly id: IdElement;
  /** « un soleil » — sert à l'aide vocale et au libellé a11y. */
  readonly libelle: string;
  readonly asset: CheminAsset;
  /** Taille de rendu en unités `viewBox`. Contrôlée contre la règle des 64 px. */
  readonly taille: readonly [number, number];
}

export interface ZoneCible {
  readonly id: IdZoneCible;
  readonly libelle: string;
  /** Polygone FERMÉ en coordonnées `viewBox`, au moins 3 points. */
  readonly polygone: Polygone;
  readonly centroide: Point;
  readonly relation: RelationSpatiale;
  /** L'ancre de la relation : « à côté **du banc** ». `null` pour « dans le ciel ». */
  readonly ancre: string | null;
}

export interface DepotAttendu {
  readonly element: IdElement;
  readonly zone: IdZoneCible;
}

export interface ConsignePlace {
  readonly id: IdConsigne;
  readonly texte: string;
  /** Comme pour `colorie` : l'affirmation qui vaut consigne doit survivre (F3). */
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /** UNE consigne, PLUSIEURS dépôts — même leçon que `cibles` en `colorie`. */
  readonly depots: readonly DepotAttendu[];
  readonly motsCles: readonly string[];
}

export interface ContenuPlace {
  readonly consignes: readonly ConsignePlace[];
  readonly zones: readonly ZoneCible[];
  /** La réserve offerte à l'enfant : éléments attendus **et intrus**. */
  readonly reserve: readonly ElementPlacable[];
}

export interface RefusPlace {
  readonly element: IdElement | null;
  readonly zone: IdZoneCible | null;
  readonly motif: MotifRefusPlace;
  readonly instantMs: number;
}

export interface EtatConsignePlace {
  readonly id: IdConsigne;
  /** Texte humain de la consigne, conservé pour que l'aide puisse parler sans identifiant technique. */
  readonly texte: string;
  readonly depotsRestants: readonly DepotAttendu[];
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  /** R15 — le palier que l'enfant a RÉCLAMÉ. Seul lui compte dans le journal. */
  readonly aideDemandee: NiveauAide;
  readonly nbEcoutes: number;
  readonly debutMs: number;
  readonly finMs: number | null;
  readonly premiereActionMs: number | null;
  readonly derniereActionMs: number;
  readonly instantIndiceMs: number | null;
}

export interface EtatPlace {
  readonly indexConsigne: number;
  readonly consignes: readonly EtatConsignePlace[];
  /**
   * ÉCART AU CONTRAT GELÉ n° 2, signalé au rapport — champ AJOUTÉ à `EtatPlace`.
   *
   * Le § 4.3.2 gèle trois choses inconciliables : `ActionPlace.deposer` porte un `Point`,
   * `evaluerDepot` a besoin du `ContenuPlace` pour convertir ce point en zone, et
   * `Moteur.reduire(etat, action, contexte)` ne reçoit **pas** le contenu (contrat v1
   * § 4.1, `ContexteMoteur = { alea, horloge }` — mesuré :
   * `grep -n "interface ContexteMoteur" -A 5 partage/src/moteurs/types.ts`).
   *
   * `colorie` s'en tirait parce que le DOM résout la région et que l'action porte déjà son
   * `IdRegionSvg`. Ici l'action porte un point brut : la géométrie doit donc vivre dans
   * l'état. `creerEtat` la recopie depuis `entree.contenu.zones`, une fois, et elle ne
   * change plus.
   *
   * Aucun autre lot ne lit les membres de `EtatPlace` (§ 5.1 : L2-E n'importe que
   * `moteurPlace` et `renduPlace`) : l'ajout ne casse aucune frontière.
   */
  readonly zones: readonly ZoneCible[];
  /** Clé = `IdElement`. Une entrée = un élément posé, définitivement. */
  readonly places: Readonly<Record<string, IdZoneCible>>;
  readonly elementSaisi: IdElement | null;
  /** Position courante du glissé, pour l'aimantation. `null` hors glissé. */
  readonly pointCourant: Point | null;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusPlace | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionPlace =
  | { readonly type: 'saisir'; readonly element: IdElement }
  | { readonly type: 'glisser'; readonly point: Point }
  | { readonly type: 'deposer'; readonly point: Point }
  | { readonly type: 'abandonner' }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
