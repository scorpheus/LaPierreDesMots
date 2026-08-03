/**
 * Types du moteur `histoire` — lot L2-E.
 *
 * Lire un texte court, puis répondre. Vrai/faux et QCM (niveaux 2 à 4 du corpus).
 *
 * **Le vrai/faux n'a PAS de moteur à lui** (§ 8, n° 6) : c'est une variante de réponse d'ici.
 * Il est le format le moins informatif du corpus (`p_devinette = 0,50`) et le plus fréquent ;
 * lui donner un moteur lui donnerait un statut qu'il n'a pas mérité, et le retirer coûterait
 * une réécriture. Ici, il se retire d'une ligne de contenu.
 *
 * Ce fichier ne contient QUE des types. Contrat gelé : contrat-features-v2.md § 4.8.
 */

import type { CheminAsset, IdConsigne } from '../../identifiants.js';
import type { ConfusionObservee, ModeReponse } from '../../pedagogie/types.js';
import type { AideProposee, NiveauAide } from '../types.js';

export type IdOptionHistoire = string;

export interface OptionHistoire {
  readonly id: IdOptionHistoire;
  readonly libelle: string;
  /** L'affirmation que cette option fait confondre avec la bonne, `null` sinon. */
  readonly confusionAvec: string | null;
}

export interface QuestionHistoire {
  readonly id: IdConsigne;
  readonly texte: string;
  readonly audio: CheminAsset | null;
  /** Deux options = vrai/faux ; trois ou quatre = QCM. Le mode s'en DÉDUIT. */
  readonly options: readonly IdOptionHistoire[];
  readonly reponse: IdOptionHistoire;
  readonly motsCles: readonly string[];
}

export interface ContenuHistoire {
  readonly titre: string;
  /**
   * Le récit. Il est affiché par `ZoneDeLecture` (L2-B) et **jamais animé** : « le décor
   * s'agite, le texte jamais » (v2 § 9.3).
   */
  readonly recit: string;
  readonly audioRecit: CheminAsset | null;
  readonly questions: readonly QuestionHistoire[];
  readonly options: readonly OptionHistoire[];
  readonly competence: string;
}

export type MotifRefusHistoire =
  | 'option-fausse'
  | 'option-hors-question'
  | 'question-deja-repondue'
  | 'option-inconnue';

export interface RefusHistoire {
  readonly option: IdOptionHistoire | null;
  readonly motif: MotifRefusHistoire;
  readonly instantMs: number;
}

export interface EtatEtapeHistoire {
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

export interface EtatHistoire {
  readonly indexEtape: number;
  readonly etapes: readonly EtatEtapeHistoire[];
  readonly options: readonly OptionHistoire[];
  readonly competence: string;
  /** Clé = `IdOptionHistoire`, valeur = `'juste'`. */
  readonly acquis: Readonly<Record<string, string>>;
  /** Le récit reste consultable pendant les questions : relire est gratuit (R15). */
  readonly recitVisible: boolean;
  readonly niveauAide: NiveauAide;
  readonly aide: AideProposee | null;
  readonly dernierRefus: RefusHistoire | null;
  readonly demarreMs: number;
  readonly termineMs: number | null;
}

export type ActionHistoire =
  | { readonly type: 'repondre'; readonly option: IdOptionHistoire }
  /** Revenir au récit. GRATUIT et sans limite (R15). */
  | { readonly type: 'basculerRecit' }
  | { readonly type: 'ecouterConsigne' }
  | { readonly type: 'demanderAide' }
  | { readonly type: 'battementHorloge' };
