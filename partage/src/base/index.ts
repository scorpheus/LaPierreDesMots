/**
 * Barillet du sous-chemin `@pierre/partage/base` — portage Android autonome.
 *
 * Isolé du barillet racine, même principe que `@pierre/partage/ton` : ce sous-chemin porte la
 * logique de persistance (dépôts SQL, migrations) et n'a de sens QUE pour un appelant qui a une
 * `Base` à lui fournir — le serveur (adaptateur `node:sqlite`) ou l'app Android autonome
 * (adaptateur `@capacitor-community/sqlite`). Un mode LAN qui ne construit qu'un `PortApiHttp`
 * n'importe jamais ce sous-chemin : le budget de bundle du client (< 250 Ko gzip) est intact.
 *
 * Voir Docs/addendum-portage-android.md.
 */

export type { Base, ResultatEcriture } from './contrat.js';

export type { FichierMigration, RapportMigration } from './migrations.js';
export { appliquerMigrations } from './migrations.js';

export { hacherSha256Hex } from './hachage.js';

export type { DemandeCreationProfil } from './depots/profils.js';
export {
  PALETTE_VARIANTE_PAR_DEFAUT, creerProfil, lireProfil, listerProfils, profilExiste, toucherProfil,
} from './depots/profils.js';

export { ecrireReglages, lireComparaison, lireEssaiOuvert, lireReglages, ouvrirEssai, reglagesPersonnalises } from './depots/reglages.js';

export { appliquerTentativeALaProgression, lireProgression, lireProgressionNoeud, recalculerProgression, recalculerToutesLesProgressions } from './depots/progression.js';

export type { EtapeAJournaliser, EtapeJournalisee } from './depots/etapes.js';
export { compterConfusions, compterEtapes, journaliserEtapes, listerEtapes } from './depots/etapes.js';

export { appliquerRevue, lireItem, lireItems, lireRevisionsDues, recalculerLeitner, revueReussie } from './depots/leitner.js';

export { appliquerObservation, lireMaitrise, lireMaitrises, observationDeLEtape, recalculerMaitrise, recalculerToutesLesMaitrises } from './depots/maitrise.js';

export { appliquerTentativeALaCascade, appliquerTentativeALaCascadeAvecGain, lireCascade, recalculerCascade, recalculerToutesLesCascades } from './depots/cascade.js';

export type { CodeParentStocke, OrigineCodeParent } from './depots/parent.js';
export {
  codeEstDefini, ecrireCodeParent, ecrireVerrou, lireCodeParent, lireEntreeRelecture,
  lireVerrou, listerRelecture, reinitialiserVerrou, trancherRelecture,
} from './depots/parent.js';

export type { ReferentielMonde } from './depots/monde.js';
export {
  carteRecalculee, ecrireProgressionRegion, enregistrerFormeGobi, enregistrerOuvertureVue,
  lireCampement, lireCarte, lireCompagnons, lireFormes, lireGobi, lireMonde, lireOuverture,
  noterVisitePoint, objetConnu, pointConnu, poserObjetCampement, reparerProgressionRegion,
} from './depots/monde.js';

export type {
  AlimentationPedagogique, ResultatEnregistrement, TentativeValidee,
} from './depots/tentatives.js';
export {
  compterTentatives, deriverCleIdempotence, enregistrerTentative, listerTentatives,
} from './depots/tentatives.js';

// ──────────────────────────────────── services (validation, sans E/S) — Lot 2 du portage Android
export type { CreationValidee, ValidationCreationProfil } from './services/profils.js';
export { validerCreationProfil } from './services/profils.js';

export type { ValidationTentative } from './services/tentatives.js';
export { validerTentative } from './services/tentatives.js';

export { NB_TENTATIVES_RECENTES, dernieresTentatives, etatDuProfil, regionsDuProfil } from './services/etat-profil.js';

export { confusionsDuProfil, couvertureDuProfil, latencesDuProfil, regionDuNoeud } from './services/indicateurs.js';

export type { RapportSuppression } from './services/reinitialisation-profil.js';
export {
  previsualiserReinitialisation, reinitialiserProfil, supprimerProfil,
  tablesNonVidees, tablesPorteusesDeProfil,
} from './services/reinitialisation-profil.js';

// ──────────────────────────────────── services (zone parent) — Lot 4 du portage Android
export { VERROU_VIERGE, appliquerEchec, deriverCode, estVerrouille, isoDepuisMs, selNeuf, verifierCode, versHex } from './services/code-parent.js';

export { BOM_UTF8, SEPARATEUR_CSV, cellule, construireExport, enCsv, estCodeExport, nomFichierExport } from './services/export-csv.js';
