import type {
  BilanParentMaths, CreerPartieMaths, CreerProjetMaths, EcrirePreferenceNiveauMaths, EcritureMaths, FamilleMaths, ManipulerPartieMaths,
  NiveauMaths, PreferenceNiveauMaths, ProjetMathsId, ProgressionProjetMaths, RepriseMaths, ResultatApiMaths,
  TentativeMaths, TerminerPartieMaths, ValidationMaths,
} from './types.js';
import type { ProgressionMathsLue, RecompenseMathsLue } from '../base/depots/mathematiques.js';

/** Les deux ports (HTTP et PWA) exposent les mêmes opérations et les mêmes conflits. */
export interface PortApiMaths {
  lireEtat(profilId: string): Promise<ResultatApiMaths<EtatMaths>>;
  choisirNiveau(commande: EcrirePreferenceNiveauMaths): Promise<ResultatApiMaths<PreferenceNiveauMaths>>;
  creerPartie(commande: CreerPartieMaths): Promise<ResultatApiMaths<ResultatPartieMaths>>;
  creerProjet(commande: CreerProjetMaths): Promise<ResultatApiMaths<ResultatProjetMaths>>;
  lirePartie(profilId: string, instanceId: string): Promise<ResultatApiMaths<RepriseMaths>>;
  manipuler(commande: ManipulerPartieMaths): Promise<ResultatApiMaths<ResultatPartieMaths>>;
  pause(commande: EcritureMaths): Promise<ResultatApiMaths<ResultatPartieMaths>>;
  terminer(commande: TerminerPartieMaths): Promise<ResultatApiMaths<ConclusionMaths>>;
  lireBilanParent(profilId: string): Promise<ResultatApiMaths<readonly BilanParentMaths[]>>;
}
export interface EtatMaths {
  readonly generationMaths: number;
  readonly preferencesNiveaux: Readonly<Record<FamilleMaths, PreferenceNiveauMaths>>;
  readonly reprise: RepriseMaths | null;
  readonly projetSuspendu: RepriseMaths | null;
  readonly progression: readonly ProgressionMathsLue[];
  readonly projets: readonly ProgressionProjetMaths[];
  readonly recompenses: readonly RecompenseMathsLue[];
  readonly tentatives: readonly TentativeMaths[];
}
export interface ResultatPartieMaths { readonly deja: boolean; readonly reprise: RepriseMaths }
export interface ResultatProjetMaths extends ResultatPartieMaths { readonly sessionId: string }
export interface ConclusionMaths {
  readonly deja: boolean;
  readonly reprise: RepriseMaths;
  readonly validation: ValidationMaths;
  readonly tentative: TentativeMaths | null;
  readonly recompenses: readonly RecompenseMathsLue[];
  readonly prochaineReprise: RepriseMaths | null;
}

/** La clé reste stable pendant les réémissions d'une même commande. */
export type TransitionMaths =
  | { readonly type: 'creer'; readonly commande: CreerPartieMaths }
  | { readonly type: 'creer-projet'; readonly commande: CreerProjetMaths }
  | { readonly type: 'reprendre'; readonly profilId: string; readonly instanceId: string }
  | { readonly type: 'manipuler'; readonly commande: ManipulerPartieMaths }
  | { readonly type: 'valider'; readonly commande: TerminerPartieMaths }
  | { readonly type: 'pause'; readonly commande: EcritureMaths }
  | { readonly type: 'changer'; readonly commande: EcritureMaths; readonly famille: FamilleMaths; readonly niveau: NiveauMaths }
  | { readonly type: 'terminer-projet'; readonly commande: EcritureMaths; readonly projetId: ProjetMathsId }
  | { readonly type: 'rejouer'; readonly profilId: string; readonly famille: FamilleMaths; readonly niveau: NiveauMaths; readonly cleGeste: string };

/** Une étape terminée ne peut redevenir inachevée ; un changement de niveau suspend son instance. */
export function transitionAutorisee(etat: 'absent' | 'en-cours' | 'suspendu' | 'termine', type: TransitionMaths['type']): boolean {
  switch (type) {
    case 'creer': return etat === 'absent' || etat === 'termine';
    case 'creer-projet': return etat === 'absent' || etat === 'termine';
    case 'reprendre': return etat === 'en-cours' || etat === 'suspendu';
    case 'manipuler':
    case 'valider':
    case 'pause': return etat === 'en-cours';
    case 'changer': return etat === 'en-cours' || etat === 'suspendu';
    case 'terminer-projet': return etat === 'en-cours';
    case 'rejouer': return etat === 'termine';
  }
}

/** Correspondance commune, indépendamment de l'adaptateur de transport. */
export const STATUT_HTTP_MATHS = {
  conflit: 409,
  absente: 404,
  stockage: 503,
  'instance-incompatible': 422,
  'requete-invalide': 400,
} as const;
