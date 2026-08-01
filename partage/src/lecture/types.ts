/**
 * Types de la couche de lecture — lot L2-B, contrat des features v2 § 4.2.
 *
 * Ce fichier est celui que le contrat gelé écrit **en entier** : il est repris à la lettre, y
 * compris ses commentaires normatifs. Sept autres lots compilent contre ces noms.
 *
 * Aucune valeur ici, uniquement des types : le sous-chemin `@pierre/partage/lecture` est chargé
 * PAR LE CLIENT (contrat § 4.7), et tout ce qui n'est pas effacé à la compilation pèse sur le
 * budget de 250 Ko gzip.
 */
import type { CodeCompetence, Horodatage, IdProfil } from '../identifiants.js';

/**
 * Les 5 polices de la v2 § 9.3, embarquées localement. **Aucun appel réseau à l'exécution.**
 *
 * `verdana` n'est PAS embarquée : c'est une police système propriétaire, qui ne peut pas être
 * redistribuée dans le dépôt. Elle est proposée et rendue par la pile système ; si elle est
 * absente, `polices.ts` retombe sur `andika`. C'est un écart assumé, § 8, n° 5.
 */
export type CodePolice = 'andika' | 'opendyslexic' | 'luciole' | 'belle-allure' | 'verdana';

export type FondLecture = 'parchemin' | 'sombre';

/**
 * Les réglages de lecture, **par profil** (D19, v2 § 9.3).
 *
 * L'espacement n'est pas un réglage à monter par défaut : un espacement large DÉGRADE la vitesse
 * des lecteurs rapides (Frontiers 2020, cité en D19). Il se mesure et se redescend à mesure que
 * l'enfant progresse — d'où `essai-typographie.ts`.
 */
export interface ReglagesLecture {
  readonly police: CodePolice;
  /** 16 à 40 px (v2 § 9.3). */
  readonly corpsPx: number;
  /** Interlettrage en em. Zorzi 2012 : +2,5 pt ≈ +0,10 em au corps 24 — le levier le plus prouvé. */
  readonly interlettrageEm: number;
  /** Espacement des mots, en em, ajouté à l'espace naturel. */
  readonly espacementMotsEm: number;
  /** Interligne, sans unité : multiple du corps. */
  readonly interligne: number;
  readonly colorationSyllabique: boolean;
  readonly surlignageLigneCourante: boolean;
  readonly regleDeLecture: boolean;
  readonly fond: FondLecture;
}

/** Bornes d'un réglage numérique. Une valeur hors bornes est RAMENÉE, jamais rejetée. */
export interface BorneReglage {
  readonly min: number;
  readonly max: number;
  readonly pas: number;
  readonly defaut: number;
}

export interface BornesReglages {
  readonly corpsPx: BorneReglage;
  readonly interlettrageEm: BorneReglage;
  readonly espacementMotsEm: BorneReglage;
  readonly interligne: BorneReglage;
}

/** Un morceau de mot, avec son rang : c'est le rang qui décide de la couleur alternée. */
export interface SegmentSyllabe {
  readonly texte: string;
  readonly rang: number;
  /**
   * `false` quand le découpage vient de la règle et non du lexique d'exceptions. La coloration
   * s'affiche quand même — mais le dashboard peut compter les cas incertains.
   */
  readonly certain: boolean;
}

// ------------------------------------------------------------------ protocole A/B de D19

/**
 * Un essai typographique : même compétence, même type d'item, **police alternée d'une session à
 * l'autre**. L'enfant ne voit jamais qu'on compare ; le parent voit les courbes.
 */
export interface EssaiTypographie {
  readonly id: string;
  readonly profil: IdProfil;
  readonly competence: CodeCompetence;
  /** Les deux bras comparés. Toujours exactement deux : une comparaison à trois n'est pas lisible. */
  readonly bras: readonly [ConfigurationBras, ConfigurationBras];
  readonly ouvertLe: Horodatage;
  readonly clotureLe: Horodatage | null;
}

export interface ConfigurationBras {
  readonly police: CodePolice;
  readonly interlettrageEm: number;
}

export interface ResultatBras {
  readonly configuration: ConfigurationBras;
  readonly nbTentatives: number;
  /** Latence de reconnaissance médiane — l'indicateur de D18. */
  readonly latenceMedianeMs: number;
  readonly tauxErreur: number;
}

export interface ComparaisonTypographie {
  readonly essai: EssaiTypographie;
  readonly resultats: readonly [ResultatBras, ResultatBras];
  /**
   * `null` tant que les deux bras n'ont pas au moins `tentativesMinParBras` mesures.
   * **Ne jamais conclure sur un bras à trois tentatives** : c'est ce que ce `null` protège.
   */
  readonly brasFavorable: ConfigurationBras | null;
}
