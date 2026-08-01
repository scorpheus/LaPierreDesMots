/**
 * Le barillet : la surface inter-lots de `@pierre/partage` — contrat § 11.1.
 *
 * Cette liste **est** le contrat. Un lot qui a besoin d'un symbole absent d'ici a trouvé un
 * défaut du contrat ; il le signale, il ne l'ajoute pas de son propre chef.
 *
 * Ni `./contenu/validation.js` ni `./fournisseurs/factices.js` ne sont réexportés : Ajv et les
 * journaux de test entreraient dans le bundle client et feraient sauter le budget de 250 Ko
 * gzip (contrat § 3.1). Ils ont leurs propres sous-chemins,
 * `@pierre/partage/validation` et `@pierre/partage/factices`.
 */

export type { Alea } from './alea.js';
export { creerAlea, graineParDefaut } from './alea.js';

export type { Horloge, DureeSimulee } from './horloge.js';
export { creerHorloge, creerHorlogeFigee, horloge } from './horloge.js';

export type {
  IdProfil, IdNoeud, IdExercice, IdHabillage, IdRegionSvg, IdConsigne, IdTentative,
  CodeCompetence, CodeRegion, CodeMoteur, Horodatage, CheminAsset
} from './identifiants.js';

export type { JetonCouleur, CouleurColoriage } from './palette.js';
export { PALETTE, NUANCIER, hexDeCouleur } from './palette.js';

export { normaliserTexte, comparerNormalise } from './texte.js';

export type { CodeErreur } from './erreurs.js';
export { ErreurPierre } from './erreurs.js';

export type { FournisseurVoix, DemandeVoix, Locuteur } from './fournisseurs/voix.js';
export type { FournisseurAudio, CodeEffet, CanalAudio } from './fournisseurs/audio.js';
export type { FournisseurLLM, DemandeLLM, ReponseLLM } from './fournisseurs/llm.js';
export type { DepotContenu } from './fournisseurs/depot-contenu.js';

export type {
  Moteur, MoteurQuelconque, EntreeMoteur, ContexteMoteur, ProgressionMoteur,
  ResumeTentative, ResumeEtape, NiveauAide, AideProposee, CodeAideGobi,
  CapacitesMoteur, SchemaJson,
  Habillage, SceneHabillage, CalqueHabillage, RoleCalque, RegionColoriable,
  VariantePalette, TimingsHabillage, SonsHabillage
} from './moteurs/types.js';

export { enregistrerMoteur, obtenirMoteur, moteursEnregistres, estMoteurEnregistre }
  from './moteurs/registre.js';
export { MOTEURS, initialiserRegistreMoteurs } from './moteurs/tous.js';

export type {
  Exercice, OrigineExercice, BlocJeu, BaremeEtoiles,
  Noeud, TempsNoeud, Competence, FamilleCompetence
} from './contenu/types.js';

export type { Tentative, TentativeAEnregistrer, NombreEtoiles } from './journal/types.js';
export { calculerEtoiles } from './etoiles.js';

export type {
  Profil, ConfigurationAvatar, CreationProfil, PaquetNoeud, ProgressionNoeud,
  ReponseTentative, ReponseSante, ErreurApi, CodeErreurApi
} from './api/contrats.js';
export { CHEMINS_API } from './api/contrats.js';

export type {
  SurfaceTest, FixtureProfil, EntreeProgressionTest, EtatTestSerialisable, CodeEcran
} from './testabilite/surface.js';

// --- Moteur `colorie` -------------------------------------------------------
// Ces six symboles étaient importés par le client depuis `@pierre/partage` sans que le
// barillet ne les réexporte : le contrat § 11.1 les avait omis. `DELAIS_AIDE` et
// `regionSousLeDoigt` sont des VALEURS, pas des types — sans elles l'ESM échoue au link et
// le client ne démarre ni en dev, ni en E2E, ni en test composant.
// Coût de bundle nul : `moteurColorie` entre déjà par `moteurs/tous.js`.
export type {
  ConsigneColorie, ContenuColorie, EtatColorie, ActionColorie
} from './moteurs/colorie/types.js';
export { DELAIS_AIDE, regionSousLeDoigt } from './moteurs/colorie/validation.js';

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Additions de la campagne v2 — contrat des features v2 § 4.7. Écrites par L2-D, qui possède
// ce fichier pour toute la campagne.
//
// **CONVENTION C1 — types uniquement, aucune `export const`, aucune fonction.**
// Les types sont effacés à la compilation ; une valeur, non. Le budget de 250 Ko gzip
// (v2 § 13.5) ne survit pas à l'entrée d'Ajv, du BKT et du sélecteur dans le bundle client :
// c'est mesuré par `scripts/verifier-bundle.mjs`. Toute VALEUR nouvelle passe par un
// sous-chemin (`@pierre/partage/pedagogie`, `/miroir`, `/lecture`, `/recompenses`, `/monde`,
// `/parent`), jamais par ce barillet.
//
// Inversion de dépendance assumée (§ 5.2, n° 2) : ce fichier réexporte des types de sept
// autres lots et ne compile donc qu'une fois les sept rendus. C'est le prix d'un barillet
// unique — le prix inverse, sept barillets concurrents, serait sept sources de vérité sur la
// surface publique.
// ═══════════════════════════════════════════════════════════════════════════════════════════

export type { FournisseurHaptique, CodeVibration } from './fournisseurs/haptique.js';

export type {
  CodePalier, NatureRecompense, SeuilsCascade, EtatCascade,
  JaugePalier, RecompenseObtenue, GainCascade,
} from './recompenses/types.js';

export type {
  CodePolice, FondLecture, ReglagesLecture, BorneReglage, BornesReglages,
  SegmentSyllabe, EssaiTypographie, ConfigurationBras, ResultatBras, ComparaisonTypographie,
} from './lecture/types.js';

export type {
  ModeReponse, AxeMiroir, PaireMiroir, ConfusionObservee,
  ParametresBkt, CritereAcquis, EtatMaitrise, ObservationTentative,
  NumeroBoite, IdItemLeitner, ParametresLeitner, ItemLeitner,
  RoleNoeudSortie, CodeCompagnon, EtapeSortie, PlanSortie,
  ContraintesSelecteur, EntreeSelecteur, NoeudCandidat, ParametresPedagogie,
} from './pedagogie/types.js';

export type {
  CodeGrapheme, IdPointInteraction, CodeObjetCampement,
  CodeStadeGobi, StadeGobi, FormeGobi, EtatGobi, EtatAnimationGobi,
  CodeReaction, PointInteraction, ObjetCampement, AuditCampement,
  EtatRegion, EtatCarte, Compagnon, EtatMonde,
} from './monde/types.js';

export type {
  PointLatence, ConfusionAgregee, CouvertureRegion, StatutRelecture,
  EntreeRelecture, VerrouParent, ResumeDashboard, CodeExport,
} from './parent/types.js';

export type {
  DelaisAide, EtatAidable, EtapeGenerique, Point, Polygone,
} from './moteurs/commun/index.js';

export type {
  ContenuPlace, ConsignePlace, ElementPlacable, ZoneCible, DepotAttendu,
  RelationSpatiale, EtatPlace, ActionPlace, MotifRefusPlace, DecisionDepot,
} from './moteurs/place/index.js';

export type {
  ContenuTrace, ModeleLettre, TraitLettre, CasseLettre, EchantillonGeste,
  EtatTrace, ActionTrace, MotifRefusTrace, DecisionTrait,
} from './moteurs/trace/index.js';

// ═══════════════════════════════════════════════════════════════════════════════════════════
// DÉFAUT DU CONTRAT GELÉ — soldé à l'intégration. Les onze moteurs de L2-E (§ 4.8).
//
// Le § 4.7 fige les additions au barillet et n'y met que `place` et `trace` (L2-C). Or le
// § 4.8 fait écrire à L2-E, pour chacun des onze autres moteurs, un
// `client/src/moteurs/<x>/index.ts` typé `MoteurRendu<Contenu<X>, Etat<X>, Action<X>>` — et
// le client ne peut nommer ces trois types que par `@pierre/partage`, seule surface que
// `partage/package.json` lui ouvre. Mesuré, sortie citée :
//
//   $ npx tsc -b 2>&1 | grep -c "has no exported member"
//   66            # 33 symboles absents, cités deux fois chacun (index.ts et Moteur<X>.tsx)
//
// Sans ces lignes, **les onze moteurs de la campagne ne compilent pas** et l'application
// reste à un seul moteur : la promesse de variété (R12, R13) tombe entière.
//
// C'est exactement le défaut déjà soldé plus haut pour `colorie` (§ 11.1 du contrat v1
// l'avait omis de la même façon), et le remède est le même. **Coût de bundle : nul.** Ce
// sont des types, effacés à la compilation — la convention C1 (« types uniquement, aucune
// valeur ») est respectée à la lettre.
// ═══════════════════════════════════════════════════════════════════════════════════════════

export type { ContenuAttrape, EtatAttrape, ActionAttrape } from './moteurs/attrape/types.js';
export type { ContenuTri, EtatTri, ActionTri } from './moteurs/tri/types.js';
export type { ContenuAssemble, EtatAssemble, ActionAssemble } from './moteurs/assemble/types.js';
export type { ContenuChemin, EtatChemin, ActionChemin } from './moteurs/chemin/types.js';
export type { ContenuEclair, EtatEclair, ActionEclair } from './moteurs/eclair/types.js';
export type { ContenuPaires, EtatPaires, ActionPaires } from './moteurs/paires/types.js';
export type { ContenuPhrase, EtatPhrase, ActionPhrase } from './moteurs/phrase/types.js';
export type { ContenuHistoire, EtatHistoire, ActionHistoire } from './moteurs/histoire/types.js';
export type { ContenuChrono, EtatChrono, ActionChrono } from './moteurs/chrono/types.js';
export type { ContenuGrave, EtatGrave, ActionGrave } from './moteurs/grave/types.js';
export type { ContenuLibre, EtatLibre, ActionLibre } from './moteurs/libre/types.js';
