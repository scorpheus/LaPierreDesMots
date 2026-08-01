/**
 * L'erreur typée du projet. Une seule classe, un code fermé : c'est ce qui permet au serveur
 * de traduire une erreur métier en `ErreurApi` sans inspecter des messages de texte.
 */

export type CodeErreur =
  /** Le code de moteur demandé n'est pas enregistré (contrat § 4.2). */
  | 'moteur-inconnu'
  /** Deux moteurs différents revendiquent le même code. */
  | 'moteur-deja-enregistre'
  /** L'habillage ne déclare pas le moteur de l'exercice, ou n'est pas celui attendu. */
  | 'habillage-incompatible'
  /** Une cible désigne une région absente des calques coloriables de l'habillage. */
  | 'region-inconnue'
  /** Le contenu ne satisfait pas son schéma (enveloppe ou bloc moteur). */
  | 'contenu-invalide'
  | 'exercice-introuvable'
  | 'noeud-introuvable'
  | 'habillage-introuvable'
  | 'profil-introuvable'
  | 'asset-introuvable'
  /** Argument hors domaine : graine non finie, intervalle vide, durée négative… */
  | 'argument-invalide'
  /** Un fournisseur externe (voix, audio, LLM) n'est pas disponible. */
  | 'fournisseur-indisponible'
  /** Invariant interne rompu : c'est un défaut, pas une entrée fautive. */
  | 'etat-incoherent';

/**
 * Le type des détails est écrit en clair plutôt que nommé par un alias : un alias exporté de
 * plus élargirait la surface de `partage/` au-delà de ce que le contrat § 11.1 énumère, et un
 * alias non exporté ferait échouer l'émission des `.d.ts` (`composite: true`).
 */
export class ErreurPierre extends Error {
  readonly code: CodeErreur;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: CodeErreur,
    message?: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message ?? code);
    this.name = 'ErreurPierre';
    this.code = code;
    this.details = details ?? {};
    // Nécessaire pour que `instanceof` tienne quand la cible de compilation descend sous ES2015.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Vrai si `valeur` est une `ErreurPierre` portant exactement ce code. */
  static porteLeCode(valeur: unknown, code: CodeErreur): boolean {
    return valeur instanceof ErreurPierre && valeur.code === code;
  }
}
