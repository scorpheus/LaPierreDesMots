// Le port `Api` — Lot 4 du portage Android (Docs/addendum-portage-android.md § 3-5).
//
// Reprend EXACTEMENT les signatures aujourd'hui exportées par `client/src/api/client.ts` : deux
// implémentations doivent être interchangeables sans qu'aucun composant ni hook TanStack Query
// n'ait à changer une ligne. `PortApiHttp` (mode LAN, `port-http.ts`) parle réseau ;
// `PortApiLocal` (mode autonome, `port-local.ts`) appelle les services de `@pierre/partage/base`
// en direct, zéro réseau. `client.ts` choisit laquelle charger au démarrage.
import type { CreationProfil, IdExercice, IdNoeud, IdProfil, PaquetNoeud, Profil, ProgressionNoeud, ReponseSante, ReponseTentative, TentativeAEnregistrer } from '@pierre/partage';
import type { ComparaisonTypographie, ReglagesLecture } from '@pierre/partage/lecture';
import type { CodeCompagnon, EtatMaitrise, ItemLeitner, PlanSortie } from '@pierre/partage/pedagogie';
import type { CodeObjetCampement, EtatMonde } from '@pierre/partage/monde';
import type {
  ApercuReinitialisation,
  ApercuSuppression,
  CatalogueGalerie,
  CodeExport,
  DecisionRelecture,
  EntreeRelecture,
  EtatPorteParent,
  EtatProfil,
  OuvertureParent,
  PorteeReinitialisation,
  RapportReinitialisation,
  RapportSuppressionProfil,
  ResumeDashboard
} from '@pierre/partage/parent';

export type PaquetNoeudAttendu = PaquetNoeud;

export interface DashboardParent extends ResumeDashboard {
  readonly confusionsEcartees: number;
}

export interface PortApi {
  lireSante(): Promise<ReponseSante>;

  listerProfils(): Promise<readonly Profil[]>;
  creerProfil(creation: CreationProfil): Promise<Profil>;
  lireProfil(id: IdProfil): Promise<Profil>;
  lireProgression(id: IdProfil): Promise<readonly ProgressionNoeud[]>;
  lirePaquetNoeud(id: IdNoeud): Promise<PaquetNoeudAttendu>;
  enregistrerTentative(tentative: TentativeAEnregistrer): Promise<ReponseTentative>;
  urlAsset(cheminRelatif: string): string;

  lireReglagesLecture(id: IdProfil): Promise<ReglagesLecture>;
  ecrireReglagesLecture(id: IdProfil, reglages: Partial<ReglagesLecture>): Promise<ReglagesLecture>;
  lireEssaiTypographie(id: IdProfil): Promise<ComparaisonTypographie | null>;

  lireMaitrise(id: IdProfil): Promise<readonly EtatMaitrise[]>;
  lireRevisions(id: IdProfil): Promise<readonly ItemLeitner[]>;
  composerSortie(
    id: IdProfil,
    demande: { readonly region: string; readonly compagnon: CodeCompagnon | null }
  ): Promise<PlanSortie>;

  lireMonde(id: IdProfil): Promise<EtatMonde>;
  poserObjetCampement(id: IdProfil, objet: CodeObjetCampement): Promise<EtatMonde>;
  /**
   * R31 / R11 — la visite d'un point d'interaction libre du campement. Gratuit et sans retour
   * utile : un échec ne doit jamais faire échouer le geste à l'écran (`PointLibre`, v2 § 3.4).
   */
  noterVisitePointCampement(id: IdProfil, point: string): Promise<void>;

  /**
   * Marque la séquence d'ouverture vue et/ou passée. Sans réponse à traduire à l'écran — un
   * échec ne coûte RIEN à l'enfant (routeur.tsx) : c'est pourquoi le port ne fait pas mieux que
   * l'appelant, il avale déjà ses propres erreurs.
   */
  marquerOuvertureVue(id: IdProfil, passee: boolean): Promise<void>;

  // ── zone parent — voir Docs/addendum-portage-android.md § 6bis pour ce qui est stubbé
  // en mode autonome (protection par code, galerie) et pourquoi.
  ouvrirZoneParent(code: string): Promise<OuvertureParent>;
  lireEtatPorteParent(): Promise<EtatPorteParent>;
  definirCodeParent(code: string): Promise<OuvertureParent>;
  lireGalerieParent(profil: IdProfil): Promise<CatalogueGalerie>;
  lireDashboardParent(profil: IdProfil): Promise<DashboardParent>;
  lireExportCsv(profil: IdProfil, code: CodeExport): Promise<string>;
  trancherRelectureContenu(exercice: IdExercice, decision: DecisionRelecture): Promise<EntreeRelecture>;
  lireEtatProfilParent(profil: IdProfil): Promise<EtatProfil>;
  apercuReinitialisationProfil(
    profil: IdProfil,
    portee: PorteeReinitialisation
  ): Promise<ApercuReinitialisation>;
  reinitialiserProfilParent(
    profil: IdProfil,
    portee: PorteeReinitialisation,
    confirmation: string
  ): Promise<RapportReinitialisation>;
  apercuSuppressionProfil(profil: IdProfil): Promise<ApercuSuppression>;
  supprimerProfilParent(profil: IdProfil, confirmation: string): Promise<RapportSuppressionProfil>;
}
