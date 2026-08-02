/**
 * Types du moteur `libre` — lot L2-E.
 *
 * Coloriage sans consigne. **C'est la sortie de secours à un tap, sans culpabilité**
 * (v2 § 5.4) : il n'y a rien à réussir, donc rien à rater.
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { IdRegionSvg } from '../../identifiants.js';
import type { CouleurColoriage } from '../../palette.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export interface ContenuLibre {
  /** Les régions coloriables offertes. Toutes, toujours : rien n'est verrouillé. */
  readonly regions: readonly IdRegionSvg[];
  readonly nuancierAutorise: readonly CouleurColoriage[];
  /** Étiquette du journal. Aucune compétence n'est évaluée par ce moteur. */
  readonly competence: string;
}

/**
 * **L'union vide, et c'est le propos.** `libre` est le seul moteur sans validation (§ 4.8) :
 * aucun geste ne peut être refusé, donc il n'existe aucun motif de refus. Écrire ce type à
 * `never` plutôt que de l'omettre rend la propriété opposable au compilateur — un `case` de
 * refus ajouté un jour par mégarde ne compilerait pas.
 */
export type MotifRefusLibre = never;

export interface EtatEtapeLibre {
  /** `identifiant`, et non `id` : c'est le nom qu'`EtapeGenerique` (L2-C) impose. */
  readonly identifiant: string;
  /** Ce qu'il reste à faire sur cette étape. Vide = étape close. */
  readonly restantes: readonly string[];
  readonly nbErreurs: number;
  readonly niveauAide: NiveauAide;
  readonly nbEcoutes: number;
  readonly debutMs: number;
  readonly finMs: number | null;
  readonly premiereActionMs: number | null;
  readonly derniereActionMs: number;
  readonly instantIndiceMs: number | null;
  readonly modeReponse: ModeReponse;
  /**
   * Toujours `null` : la `p_devinette` de ce mode est TABULÉE (D13), jamais calculée en
   * 1/n!. Le champ est REQUIS par `EtapeGenerique` — chaque moteur doit répondre, y compris
   * par `null` assumé (correctif A1, Q-I14).
   */
  readonly nbElements: number | null;
  readonly confusion: ConfusionObservee | null;
}

export interface EtatLibre {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapeLibre[];
  readonly regions: readonly IdRegionSvg[];
  readonly nuancierAutorise: readonly CouleurColoriage[];
  readonly competence: string;
  /** Clé = `IdRegionSvg`, valeur = la `CouleurColoriage` posée. Repeindre est permis. */
  readonly acquis: Readonly<Record<string, string>>;
  readonly couleurChoisie: CouleurColoriage | null;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  /** Toujours `null`. Le champ existe pour l'uniformité des onze moteurs. */
  readonly dernierRefus: null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionLibre =
  | { readonly type: 'choisirCouleur'; readonly couleur: CouleurColoriage }
  | { readonly type: 'colorier'; readonly region: IdRegionSvg }
  /** L'enfant décide qu'il a fini. C'est le seul moteur où il décide de la fin. */
  | { readonly type: 'terminer' }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
