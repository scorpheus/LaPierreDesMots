/**
 * LE SOCLE PHONOLOGIQUE — la forme commune des vingt fichiers de `contenu/brouillons/phonologie/`.
 *
 * Contrat du monde v4 § 3.6, la **seule interface nouvelle du plan**. Propriétaire : M3.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI ELLE EXISTE — le motif est mesuré, pas supposé.
 *
 * Les sept brouillons livrés par le lot N8 portaient **sept formes différentes** : `items`,
 * `paires`, `motsA`/`motsB`, `consonnes`/`voyelles`, `axe`/`lettres`. Aucune n'était typée.
 * Treize fichiers de plus sans forme commune auraient rendu M1 et M2 illisibles : chaque lot
 * de contenu aurait dû redécouvrir, fichier par fichier, où sont les mots.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE N'EST PAS — et c'est ce qui la garde honnête.
 *
 * Ce n'est **pas** un schéma d'exercice. Un socle phonologique n'atteint jamais l'enfant : il
 * est la matière première que M1 et M2 transforment en exercices, et il vit dans
 * `contenu/brouillons/`, dossier ignoré par git et fermé par la relecture parent
 * (annexe P § 6.4, CLAUDE.md). D'où `statut`, qui ne vaut `'valide'` qu'après un geste humain.
 *
 * Ce n'est **pas** un objet que le client charge. Aucun code d'application ne l'importe
 * aujourd'hui : il type ce que `scripts/generer-phonologie.mjs` projette sur disque, et il
 * donne à M1 et M2 un contrat de lecture stable. Le jour où un moteur voudra lire un socle,
 * il n'aura rien à négocier.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LES DEUX CHAMPS QUI REFUSENT DE MENTIR
 *
 * `compte` est **remesuré par le générateur** au moment d'écrire, jamais recopié d'un décompte
 * fait à la main. Un fichier dont le `compte` déclaré diffère de son contenu réel est
 * exactement le défaut que CLAUDE.md nomme — « un détecteur qui déclare un poids qu'il
 * n'applique jamais ».
 *
 * `couvertureCE1` porte le taux **et la liste nominative** des mots hors échelle. Nommer un
 * mot hors lexique coûte une ligne ; le taire coûte un vocabulaire que personne n'a relu.
 */
import type { CheminAsset, CodeCompetence, CodeRegion } from '../identifiants.js';

/** Une unité phonologique enseignable : un graphème, une syllabe, un mot outil, un mot, une paire. */
export type NatureUnite = 'grapheme' | 'syllabe' | 'mot-outil' | 'mot' | 'paire';

/**
 * Ce qu'un brouillon porte, tel que `scripts/valider-brouillons.mjs` le lit pour décider s'il
 * confronte `forme` au lexique.
 *
 * Trois valeurs seulement, et c'est volontairement plus pauvre que `NatureUnite` : « mi »,
 * « pa », « fé » sont des syllabes justes qui ne seront jamais dans une liste de vocabulaire.
 * Sans ce champ, le contrôle lexical n'aurait que deux issues, toutes deux fausses — refuser
 * cinquante syllabes correctes, ou laisser passer n'importe quelle suite de lettres.
 */
export type NatureDesFormes = 'grapheme' | 'syllabe' | 'mot';

/**
 * La phrase que Gobi dit pour faire retenir un graphème.
 *
 * **Six mots au plus, et jamais une règle orthographique écrite.** L'enfant ne lit pas la
 * mnémonique — il l'entend (R15). Une règle écrite serait du texte de plus à déchiffrer au
 * moment précis où il bute sur une lettre.
 */
export interface Mnemonique {
  readonly phrase: string;
  /** L'image qui la porte, ou `null` tant qu'aucun asset ne l'illustre. */
  readonly asset: CheminAsset | null;
}

/** Une unité du socle : la forme travaillée, et tout ce qui permet de la faire travailler. */
export interface UnitePhonologique {
  readonly forme: string;
  readonly nature: NatureUnite;
  /**
   * Les mots où l'unité se rencontre. **Tous passés au contrôle de couverture CE1**, et le
   * générateur refuse d'écrire si l'un d'eux n'y est pas.
   */
  readonly motsPorteurs: readonly string[];
  /** L'autre membre d'une paire minimale ou d'une opposition, quand il y en a un. */
  readonly opposeA: string | null;
  readonly mnemonique: Mnemonique | null;
}

/**
 * Le taux de couverture lexicale, et ce qu'il cache si on ne le lit pas en entier.
 *
 * `taux` seul serait une conclusion flatteuse : un lot qui ajoute au lexique tous les mots
 * qu'il emploie atteint 100 % par construction. `inscritsParLeLot` est donc obligatoire — il
 * dit combien d'entrées le lexique a gagnées pour que ce 100 % existe.
 */
export interface CouvertureCE1 {
  /** Entre 0 et 1, remesuré à l'écriture. */
  readonly taux: number;
  /** Les mots que le lexique ne porte pas. **Nommés un par un**, jamais résumés en un compte. */
  readonly horsEchelle: readonly string[];
  /** Les mots que ce lot a dû inscrire au lexique pour que `taux` vaille 1. */
  readonly inscritsParLeLot: readonly string[];
}

/** Un fichier de socle phonologique, tel qu'il est projeté dans `contenu/brouillons/phonologie/`. */
export interface SoclePhonologique {
  /** `brouillon-non-jouable` tant que la relecture parent n'a pas eu lieu (annexe P § 6.4). */
  readonly statut: 'brouillon-non-jouable' | 'valide';
  readonly region: CodeRegion;
  /** Identifiant court de l'unité dans sa région, ex. `nasale-on`. */
  readonly unite: string;
  /** Rang dans la progression de la région. Deux socles d'une même région ne le partagent pas. */
  readonly rang: number;
  readonly libelle: string;
  /** Le code du référentiel que ce socle alimente. Toujours l'un des 30. */
  readonly competence: CodeCompetence;
  /** Le point ouvert que ce socle solde. Vaut `O10` partout aujourd'hui. */
  readonly pointOuvert: string;
  readonly natureDesFormes: NatureDesFormes;
  readonly source: string;
  readonly items: readonly UnitePhonologique[];
  /** REMESURÉ par le générateur, jamais affirmé. Le lot échoue si l'écart est non nul. */
  readonly compte: Readonly<Record<string, number>>;
  readonly couvertureCE1: CouvertureCE1;
  /** Ce qu'un humain doit encore décider. **Jamais vide** : sans reste à faire, ce serait un exercice. */
  readonly aFaireALaMain: readonly string[];
}
