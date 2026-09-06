/**
 * Types du moteur `chemin` — lot L2-E.
 *
 * Tracer une route en enchaînant les bonnes cases. Chaque case porte une étiquette à lire ;
 * on n'avance que sur une case VOISINE de la case courante, ce qui rend le geste sans
 * exigence de précision (R16) : la case hors de portée est ignorée, elle ne punit pas.
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { FormeConsigne } from '../colorie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdCase = string;

export interface CaseChemin {
  readonly id: IdCase;
  /** L'étiquette écrite sur la case. C'est ce qui se déchiffre. */
  readonly libelle: string;
  readonly position: readonly [number, number];
  /** Les cases atteignables depuis celle-ci. La relation doit être symétrique. */
  readonly voisines: readonly IdCase[];
  readonly confusionAvec: string | null;
}

export interface ConsigneChemin {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly forme: FormeConsigne;
  readonly audio: CheminAsset | null;
  /** La case de départ, où le pion est posé sans que rien ne soit compté. */
  readonly depart: IdCase;
  /** Chaque case à franchir, **dans l'ordre**. */
  readonly parcours: readonly IdCase[];
  readonly motsCles: readonly string[];
}

export interface ContenuChemin {
  readonly consignes: readonly ConsigneChemin[];
  readonly cases: readonly CaseChemin[];
  readonly competence: string;
}

export type MotifRefusChemin =
  | 'case-hors-parcours'  // voisine, mais pas la bonne — erreur de lecture
  | 'case-non-adjacente'  // hors de portée : un geste, pas un contresens
  | 'case-deja-franchie'
  | 'case-inconnue';

export interface RefusChemin {
  readonly caseVisee: IdCase | null;
  readonly motif: MotifRefusChemin;
  readonly instantMs: number;
}

export interface EtatEtapeChemin {
  /** `identifiant`, et non `id` : c'est le nom qu'`EtapeGenerique` (L2-C) impose. */
  readonly identifiant: IdConsigne;
  /** Ce qu'il reste à faire sur cette étape. Vide = étape close. */
  readonly restantes: readonly string[];
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
  readonly modeReponse: ModeReponse;
  /**
   * Toujours `null` : la `p_devinette` de ce mode est TABULÉE (D13), jamais calculée en
   * 1/n!. Le champ est REQUIS par `EtapeGenerique` — chaque moteur doit répondre, y compris
   * par `null` assumé (correctif A1, Q-I14).
   */
  readonly nbElements: number | null;
  readonly confusion: ConfusionObservee | null;
}

export interface EtatChemin {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapeChemin[];
  readonly cases: readonly CaseChemin[];
  readonly competence: string;
  /** Clé = `IdCase`, valeur = le rang de franchissement, en base 1. */
  readonly acquis: Readonly<Record<string, string>>;
  /** La case de départ de chaque étape, dans l'ordre des étapes. */
  readonly departs: readonly IdCase[];
  /** La case où se trouve le pion. Détermine les voisines atteignables. */
  readonly position: IdCase | null;
  /** Visites du chemin courant uniquement ; les acquis de lecture restent permanents. */
  readonly visiteesEtape: readonly IdCase[];
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusChemin | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionChemin =
  | { readonly type: 'avancer'; readonly caseVisee: IdCase }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
