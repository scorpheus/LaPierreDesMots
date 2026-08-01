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
