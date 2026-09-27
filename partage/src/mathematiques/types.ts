/** Contrats sérialisables de la Vallée des Nombres. Les versions font partie du journal. */
export type LieuMaths = 'jardin' | 'ponts' | 'moulin' | 'marche' | 'chantier' | 'horloge';
export type NiveauMaths = 'decouverte' | 'exploration' | 'defi';
export type FamilleMaths =
  | 'MAT-JAR-01' | 'MAT-JAR-02' | 'MAT-JAR-03'
  | 'MAT-PON-01' | 'MAT-PON-02' | 'MAT-PON-03'
  | 'MAT-MOU-01' | 'MAT-MOU-02' | 'MAT-MOU-03'
  | 'MAT-MAR-01' | 'MAT-MAR-02' | 'MAT-MAR-03'
  | 'MAT-CHA-01' | 'MAT-CHA-02' | 'MAT-CHA-03'
  | 'MAT-HOR-01' | 'MAT-HOR-02' | 'MAT-HOR-03';
export type ProjetMathsId =
  | 'MAT-FET-P01'
  | 'MAT-JAR-P01' | 'MAT-JAR-P02' | 'MAT-JAR-P03'
  | 'MAT-PON-P01' | 'MAT-PON-P02' | 'MAT-PON-P03'
  | 'MAT-MOU-P01' | 'MAT-MOU-P02' | 'MAT-MOU-P03'
  | 'MAT-MAR-P01' | 'MAT-MAR-P02' | 'MAT-MAR-P03'
  | 'MAT-CHA-P01' | 'MAT-CHA-P02' | 'MAT-CHA-P03'
  | 'MAT-HOR-P01' | 'MAT-HOR-P02' | 'MAT-HOR-P03';
export type AideMaths = 'aucune' | 'indice' | 'demonstration';

export interface SegmentConsigneMaths {
  readonly texte: string;
  /** Référence à un clip préproduit ; aucune synthèse à l'exécution. */
  readonly audio: string;
}
export interface ConsigneMaths {
  readonly segments: readonly SegmentConsigneMaths[];
  readonly texte: string;
}
export interface ContexteProjetMaths {
  readonly sessionId: string;
  readonly projetId: ProjetMathsId;
  readonly versionProjet: number;
  readonly etape: number;
  readonly variables: Readonly<Record<string, number>>;
  readonly plan: readonly EtapeProjetMaths[];
  readonly transformationId: string;
  readonly cadeauId: string | null;
  readonly cadeauType: 'souvenir' | 'objet' | 'fete' | null;
}
export interface EtapeProjetMaths {
  readonly rang: number;
  readonly famille: FamilleMaths;
  readonly niveau: NiveauMaths;
  readonly instanceId: string;
}
export interface InstanceMathsBase<F extends FamilleMaths = FamilleMaths, P = unknown, S = unknown> {
  readonly format: 1;
  readonly id: string;
  readonly famille: F;
  readonly niveau: NiveauMaths;
  readonly modeleId: string;
  readonly versionModele: number;
  readonly versionGenerateur: number;
  readonly graine: number;
  /** Opération, nombres et inconnue, sans position décorative. */
  readonly signature: string;
  readonly parametres: P;
  readonly stock: S;
  readonly etatInitial: EtatManipulationMaths;
  readonly consigne: ConsigneMaths;
  readonly unite: string;
  readonly aide: Readonly<Record<'indice' | 'demonstration', ConsigneMaths>>;
  readonly reglesValidation: Readonly<Record<string, unknown>>;
  readonly projet?: ContexteProjetMaths;
}

/** État logique persistant ; aucune coordonnée de pointeur ni frame d'animation. */
export interface EtatManipulationMaths {
  readonly objets: Readonly<Record<string, number | string | boolean | null>>;
  readonly placements: Readonly<Record<string, number | string>>;
  readonly selection: string | null;
  readonly historique: readonly EtatManipulationMaths[];
}
export type GesteMaths =
  | { readonly type: 'placer'; readonly objetId: string; readonly position: number; readonly destination?: string }
  | { readonly type: 'retirer'; readonly objetId: string }
  | { readonly type: 'aligner-regle'; readonly origine: number }
  | { readonly type: 'lire-longueur'; readonly valeur: number }
  | { readonly type: 'placer-borne'; readonly valeur: number; readonly position: number }
  | { readonly type: 'montrer-encadrement'; readonly inferieure: number; readonly superieure: number }
  | { readonly type: 'placer-piece'; readonly objetId: string; readonly position: number }
  | { readonly type: 'choisir'; readonly objetId: string }
  | { readonly type: 'annuler' }
  | { readonly type: 'ecouter'; readonly contenu: 'consigne' | 'indice' | 'demonstration' }
  | { readonly type: 'aide'; readonly niveau: 'indice' | 'demonstration' };
export interface ReponseMaths {
  readonly famille: FamilleMaths;
  /** La proposition complète est construite depuis l'état durable, jamais crue sur parole. */
  readonly valeur: unknown;
}
export type ValidationMaths =
  | { readonly statut: 'incomplete'; readonly raison: string }
  | { readonly statut: 'incorrecte'; readonly raison: string; readonly ecart?: number }
  | { readonly statut: 'correcte'; readonly solution: Readonly<Record<string, unknown>> };
export interface TentativeMaths {
  readonly id: string;
  readonly instanceId: string;
  /** Définition réellement jouée, conservée pour l'historique et l'export parent. */
  readonly definition?: {
    readonly modeleId: string; readonly versionModele: number;
    readonly versionGenerateur: number; readonly graine: number;
  };
  readonly termineLe?: string;
  readonly famille: FamilleMaths;
  readonly niveau: NiveauMaths;
  readonly projetId: ProjetMathsId | null;
  readonly erreursValidees: number;
  readonly aide: AideMaths;
  readonly solution: Readonly<Record<string, unknown>>;
  readonly etoiles: 1 | 2 | 3;
  readonly notions: readonly string[];
  readonly contexte: Readonly<Record<string, string | number>>;
}
export interface RepriseMaths<I extends InstanceMathsBase = InstanceMathsBase> {
  readonly profilId: string;
  readonly generationMaths: number;
  readonly revision: number;
  readonly instance: I;
  readonly etat: EtatManipulationMaths;
  readonly erreursValidees: number;
  readonly aide: AideMaths;
  readonly projet: ProjetMathsEnCours | null;
  readonly signaturesRecentes: Readonly<Partial<Record<FamilleMaths, readonly string[]>>>;
}
export interface ProjetMathsEnCours {
  readonly id: ProjetMathsId;
  readonly sessionId: string;
  readonly version: number;
  readonly variables: Readonly<Record<string, number>>;
  readonly plan: readonly EtapeProjetMaths[];
  readonly transformationId: string;
  readonly cadeauId: string | null;
  readonly cadeauType: 'souvenir' | 'objet' | 'fete' | null;
  readonly etapeCourante: number;
  readonly instances: readonly string[];
  readonly etoilesEtapes: readonly (1 | 2 | 3)[];
  readonly suspendu: boolean;
}
export interface RecompenseMaths {
  readonly projetId: ProjetMathsId;
  readonly cadeauId: string;
  readonly attribuee: boolean;
  readonly meilleuresEtoiles: 1 | 2 | 3;
}
export interface ProgressionProjetMaths {
  readonly projetId: ProjetMathsId;
  readonly etapesTerminees: number;
  readonly nombreEtapes: number;
  readonly transformationId: string;
  readonly termineLe: string | null;
}
export interface BilanParentMaths {
  readonly famille: FamilleMaths;
  readonly niveau: NiveauMaths;
  readonly statut: 'essaye' | 'reussi-avec-aide' | 'reussi-seul';
  readonly occasions: number;
  readonly reussites: number;
  readonly erreursValidees: number;
  readonly aides: number;
  readonly notions: readonly string[];
}

export interface EcritureMaths {
  readonly profilId: string;
  readonly generationMaths: number;
  readonly instanceId: string;
  readonly revisionAttendue: number;
  readonly cleGeste: string;
}
export interface PreferenceNiveauMaths {
  readonly niveau: NiveauMaths;
  readonly revision: number;
}
export interface EcrirePreferenceNiveauMaths {
  readonly profilId: string;
  readonly generationMaths: number;
  readonly famille: FamilleMaths;
  readonly niveau: NiveauMaths;
  readonly revisionAttendue: number;
  readonly cleGeste: string;
}
export interface CreerPartieMaths {
  readonly profilId: string;
  readonly generationMaths: number;
  readonly famille: FamilleMaths;
  readonly niveau: NiveauMaths;
  readonly graine: number;
  readonly cleGeste: string;
  readonly projetId?: ProjetMathsId;
}
export interface CreerProjetMaths {
  readonly profilId: string;
  readonly generationMaths: number;
  readonly cleGeste: string;
  readonly projetId: ProjetMathsId;
  readonly niveaux: readonly NiveauMaths[];
  readonly graine: number;
}
export interface ManipulerPartieMaths extends EcritureMaths { readonly geste: GesteMaths }
export interface TerminerPartieMaths extends EcritureMaths { readonly reponse: ReponseMaths }
export type ErreurApiMaths =
  | { readonly code: 'conflit'; readonly revisionCourante: number; readonly message?: string }
  | { readonly code: 'absente' | 'stockage' | 'instance-incompatible' | 'requete-invalide'; readonly message: string };
export type ResultatApiMaths<T> = { readonly ok: true; readonly valeur: T } | { readonly ok: false; readonly erreur: ErreurApiMaths };

/** Alias de compatibilité ; le contrat canonique est possédé par reprise-lecture. */
export type { InstantaneRepriseLecture as RepriseLectureVersionnee } from '../reprise-lecture/index.js';
