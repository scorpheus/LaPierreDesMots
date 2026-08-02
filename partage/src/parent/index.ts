/**
 * Barillet du sous-chemin `@pierre/partage/parent` — lot L2-H.
 *
 * Chargé en **chunk différé** côté client (contrat § 4.7) : le dashboard n'existe qu'une fois
 * le code parent saisi, et rien de ce dossier n'a de raison d'entrer dans le bundle initial de
 * 250 Ko que l'enfant télécharge.
 */

export type {
  CodeExport,
  ConfusionAgregee,
  CouvertureRegion,
  DecisionRelecture,
  EntreeRelecture,
  OuvertureParent,
  PointLatence,
  ResumeDashboard,
  StatutRelecture,
  VerrouParent,
} from './types.js';

export { CODES_EXPORT, ENTETE_JETON_PARENT } from './types.js';

// ── AJOUT N5 — la galerie d'exercices de D34 (contrat de finition v3 § 5.10) ────────────────
// `galerie.ts` est un fichier NEUF du même dossier ; ce barillet est le seul chemin par lequel
// le client et le serveur l'atteignent. Le contrat § 4.5 ne liste pas ce fichier-ci en « M » —
// écart signalé au rapport de N5, et corrigé ici plutôt que laissé creux : des types déclarés
// qu'aucun barillet n'exporte sont des types que personne ne peut importer.
export type {
  CatalogueGalerie,
  EntreeGalerie,
  EtatPorteParent,
  OptionsLancement,
  StatutValidation,
} from './galerie.js';

export {
  LANCEMENT_ENFANT,
  LANCEMENT_PARENT,
  construireCatalogue,
  indexerHabillagesParMoteur,
  indexerMoteursParCompetence,
} from './galerie.js';

export {
  DUREE_VERROU_MS,
  ECART_ALERTE_COUVERTURE,
  ECHECS_AVANT_VERROU,
  LIMITE_TOP_CONFUSIONS,
  agregerConfusions,
  agregerLatences,
  croiserCouverture,
  jourEnNombre,
  mediane,
  quartiles,
  tendance,
} from './indicateurs.js';

// ── AJOUT H2 — remise à zéro d'un profil et état réel d'un profil ───────────────────────────
// `reinitialisation.ts` est un fichier NEUF du même dossier. Même raison qu'au bloc N5
// ci-dessus : un type que le barillet n'exporte pas est un type que personne ne peut importer.
export type {
  ApercuReinitialisation,
  EtatProfil,
  EtatRegionProfil,
  LigneRapportReinitialisation,
  PorteeReinitialisation,
  RapportReinitialisation,
  TentativeRecente,
} from './reinitialisation.js';

export {
  PORTEES_REINITIALISATION,
  TABLES_CONSERVEES_PAR_PROGRESSION,
  compterRegionsIncoherentes,
  confirmationValide,
  conservesParLaPortee,
  estPorteeReinitialisation,
  libellePortee,
  pertesDeLaPortee,
  porteeEfface,
  totalLignesEffacees,
} from './reinitialisation.js';
