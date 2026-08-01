/**
 * Modèle de langage, derrière une interface — annexe T § 2.3.
 *
 * Fournisseur retenu : llama.cpp local sur le port 8001 (décision D5). Il est **absent par
 * construction** en test : `LlmScripte` rend des réponses fixes, et rien dans le jeu ne doit
 * dépendre de sa disponibilité — le LLM sert à produire du contenu, jamais à faire jouer.
 */

export interface DemandeLLM {
  /** Consigne de système. `null` quand le modèle n'en prend pas. */
  readonly systeme?: string | null;
  /** L'invite proprement dite. */
  readonly invite: string;
  /** 0 = déterministe. Une valeur par défaut basse est de mise pour du contenu. */
  readonly temperature?: number;
  /** Plafond de jetons produits. */
  readonly maxJetons?: number;
  /** Graine du modèle, pour la reproductibilité (`Alea.graine` en général). */
  readonly graine?: number;
}

export interface ReponseLLM {
  readonly texte: string;
  /** Nom du modèle qui a répondu, journalisé avec le contenu produit. */
  readonly modele: string;
  readonly jetonsProduits: number;
  readonly dureeMs: number;
}

export interface FournisseurLLM {
  completer(demande: DemandeLLM): Promise<ReponseLLM>;
  /** Faux quand le serveur local ne répond pas. L'appelant doit alors se replier, pas planter. */
  readonly disponible: boolean;
}
