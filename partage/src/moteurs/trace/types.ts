/**
 * Types du moteur `trace` — lot L2-C. Clôt le point ouvert O11.
 *
 * Contrat gelé : contrat-features-v2.md § 4.3.3, reproduit à la lettre.
 *
 * **Ce moteur est le plus important pour le besoin actuel de l'enfant** (D23 : « la pratique
 * du geste d'écriture accélère l'apprentissage de la lecture. C'est le levier le plus
 * directement exploitable ici »). Et il porte une exigence que rien d'autre ne porte :
 * **distinguer les axes**.
 *
 * DEUX ÉCARTS AU CONTRAT GELÉ, tous deux signalés au rapport :
 *   n° 1 — le bloc du § 4.3.3 n'importe pas `MotifRefusTrace`, qu'il utilise dans
 *          `RefusTrace`. L'import est ajouté ; il est `import type`, donc effacé.
 *   n° 2 — `EtatTrace` gagne `lettres` et `paire`, pour la même raison qu'`EtatPlace` gagne
 *          `zones` : `Moteur.reduire` ne reçoit pas le contenu. Détail sur `EtatTrace`.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { AxeMiroir, PaireMiroir } from '../../pedagogie/types.js';
import type { Point } from '../commun/geometrie.js';
import type { AideProposee, NiveauAide } from '../types.js';
import type { MotifRefusTrace } from './validation.js';

export type IdTrait = string;
export type CasseLettre = 'minuscule' | 'majuscule' | 'cursive';

export interface TraitLettre {
  readonly id: IdTrait;
  /** Ordre d'exécution, à partir de 1. Le `d` se trace rond puis hampe, jamais l'inverse. */
  readonly ordre: number;
  /** Chemin SVG du trait, en coordonnées `viewBox`. */
  readonly chemin: string;
  /**
   * Points échantillonnés le long du chemin, **dans le sens d'écriture**, au moins 8.
   * C'est le SENS qui distingue `b` de `d` sur un tracé, pas la forme finale.
   */
  readonly points: readonly Point[];
  readonly depart: Point;
  readonly arrivee: Point;
  /** « la grande barre », « le rond » — dit à voix haute au palier `indice`. */
  readonly libelle: string;
}

export interface ModeleLettre {
  readonly lettre: string;
  readonly casse: CasseLettre;
  readonly viewBox: string;
  readonly traits: readonly TraitLettre[];
  /** L'axe que CETTE lettre risque de confondre. `null` si aucune (D23). */
  readonly axeRisque: AxeMiroir | null;
}

export interface ContenuTrace {
  readonly lettres: readonly ModeleLettre[];
  /**
   * La paire travaillée. **UNE paire, donc UN axe.** Un exercice ne mélange jamais
   * `b`/`d` (gauche-droite) et `b`/`p` (haut-bas) : ce sont deux mécanismes différents, et un
   * enfant peut être gêné par l'un et pas par l'autre (D23, conséquence 1).
   */
  readonly paire: PaireMiroir | null;
  readonly consigne: string;
  readonly audio: CheminAsset | null;
  readonly consigneId: IdConsigne;
}

/**
 * L'aide du moteur `trace`, enrichie du LIBELLÉ du trait attendu.
 *
 * ÉCART AU CONTRAT GELÉ n° 6 — un champ ajouté, jamais retiré : `AideProposee` reste
 * satisfaite, et aucun autre lot n'a à connaître celui-ci.
 *
 * POURQUOI IL FAUT CE CHAMP. L'ordre des traits est imposé (`ordreEtapesImpose`), et l'ordre
 * du `d` est l'inverse de celui du `b` — le rond d'abord. Un enfant qui commence par la
 * grande barre reçoit un refus, et le seul retour à l'écran était « On recommence ce trait,
 * tranquillement. » : rien qui dise ce qu'il faut changer. `cible` porte l'identifiant du
 * trait (`d-panse`), que personne ne lit à voix haute ; `texte` est le texte à faire dire,
 * qui peut être une phrase entière. `libelle` porte le nom du trait — « le rond » — pour que
 * l'hôte puisse le nommer sans réinterpréter les deux autres champs.
 */
export interface AideTrace extends AideProposee {
  /** « le rond », « la grande barre » — le trait que l'enfant doit tracer MAINTENANT. */
  readonly libelle: string | null;
}

export interface EchantillonGeste {
  readonly point: Point;
  readonly instantMs: number;
}

export interface EtatTrait {
  readonly id: IdTrait;
  readonly termine: boolean;
  readonly nbEssais: number;
  /** Fraction des points du modèle franchis, 0 à 1. */
  readonly couverture: number;
}

export interface EtatTrace {
  readonly indexLettre: number;
  readonly indexTrait: number;
  readonly traits: readonly EtatTrait[];
  /**
   * ÉCART AU CONTRAT GELÉ n° 2 — deux champs AJOUTÉS à `EtatTrace`.
   *
   * `Moteur.reduire(etat, action, contexte)` ne reçoit pas le contenu (contrat v1 § 4.1,
   * `ContexteMoteur = { alea, horloge }`), et `evaluerTrait` a besoin du `ModeleLettre` et
   * du `TraitLettre` pour juger un geste. Les modèles vivent donc dans l'état ; `creerEtat`
   * les recopie une fois depuis `entree.contenu`, et ils ne changent plus.
   *
   * `paire` est là pour la même raison, et elle est **la donnée qui fait tout l'intérêt
   * pédagogique du moteur** : sans elle, `axeConfondu` n'aurait rien à comparer et
   * rendrait `null` partout — le moteur creux que le § 10.4 interdit nommément.
   *
   * Aucun autre lot ne lit les membres de `EtatTrace` (§ 5.1) : l'ajout ne casse aucune
   * frontière.
   */
  readonly lettres: readonly ModeleLettre[];
  readonly paire: PaireMiroir | null;
  readonly gesteEnCours: readonly EchantillonGeste[];
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  readonly aide: AideTrace | null;
  readonly dernierRefus: RefusTrace | null;
  /** L'axe effectivement confondu, quand il l'a été. Alimente le top 10 du dashboard (D23). */
  readonly axeConfondu: AxeMiroir | null;
  readonly demarreMs: number;
  readonly premiereActionMs: number | null;
  readonly derniereActionMs: number;
  readonly instantIndiceMs: number | null;
  readonly termineMs: number | null;
}

export interface RefusTrace {
  readonly trait: IdTrait;
  readonly motif: MotifRefusTrace;
  readonly instantMs: number;
}

export type ActionTrace =
  | { readonly type: 'commencerGeste'; readonly echantillon: EchantillonGeste }
  | { readonly type: 'prolongerGeste'; readonly echantillon: EchantillonGeste }
  | { readonly type: 'terminerGeste' }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
