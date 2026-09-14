// Sélecteur de port — Lot 4 du portage Android (Docs/addendum-portage-android.md § 5). Point
// d'entrée STABLE conservé pour les 37 fichiers qui l'importent déjà : ce fichier ne parle plus
// lui-même réseau, il choisit UNE FOIS, au chargement du module, laquelle des deux
// implémentations de `PortApi` servir — `PortApiHttp` (mode LAN, `port-http.ts`) ou
// `PortApiLocal` (modes autonomes Android et PWA, `port-local.ts`, zéro réseau).
//
// L'IMPORT EST DYNAMIQUE, ET C'EST CE QUI GARDE LE BUDGET DE BUNDLE LAN INTACT (< 250 Ko gzip).
// `import.meta.env.MODE` est une CHAÎNE LITTÉRALE remplacée par Vite à la compilation : la
// branche jamais empruntée d'un `import()` dynamique dans un ternaire dont la condition est
// ainsi connue au build est éliminée par Rollup, imports compris — `port-local.ts` (donc
// `@capacitor-community/sqlite`, l'adaptateur SQLite, les référentiels embarqués) n'entre JAMAIS
// dans le bundle du mode LAN, exactement comme le mode autonome n'embarque jamais `port-http.ts`.
//
// LE TOP-LEVEL AWAIT EST SANS RISQUE POUR LES 37 IMPORTEURS : la spec ES modules garantit que
// l'évaluation de CE module (top-level await compris) se termine avant que tout module qui
// l'importe n'exécute sa propre première ligne. `port` est donc déjà résolu avant qu'aucun des
// exports ci-dessous ne puisse être appelé.
import type { PortApi } from './contrat.js';
import { creerFileTentatives } from './tentatives-en-attente.js';
import { ErreurReseau } from './commun.js';

export type { PaquetNoeudAttendu, DashboardParent } from './contrat.js';
export { ErreurReseau, calculerCleIdempotence, fermerZoneParent, jetonParentPose } from './commun.js';

const port: PortApi =
  import.meta.env.MODE === 'pwa'
    ? (await import('./port-local.js')).portLocal
    : import.meta.env.MODE === 'autonome'
    ? (await import('./port-local.js')).portLocal
    : (await import('./port-http.js')).portHttp;

const modeDonnees = import.meta.env.MODE === 'pwa' || import.meta.env.MODE === 'autonome'
  ? import.meta.env.MODE : 'lan';
const attentes = creerFileTentatives({
  prefixe: `pierre.tentatives-attente.v1:${modeDonnees}:${import.meta.env.BASE_URL}:`,
  stockage: () => {
    if (globalThis.localStorage === undefined) throw new Error('Le stockage local est indisponible.');
    return globalThis.localStorage;
  },
  envoyer: (tentative) => port.enregistrerTentative(tentative)
});

export const enregistrerTentative = attentes.enregistrer;
export const conserverTentativeTerminee = attentes.conserver;
export const reprendreTentativesEnAttente = attentes.reprendre;
export const viderTentativesEnAttente = attentes.vider;
export const remplacerDonneesAvecTentatives = attentes.remplacerDonnees;
export const lireMessageImportInterrompu = attentes.messageSuspension;

export const lireProfil: PortApi['lireProfil'] = async (id) => {
  try { return await port.lireProfil(id); }
  catch (cause) {
    if (cause instanceof ErreurReseau && cause.statut === 404) attentes.oublier(String(id));
    throw cause;
  }
};

function oublierApresEffacement(profil: string): void {
  try { attentes.oublier(profil); }
  catch (cause) {
    // Le serveur a confirmé l'effacement. La génération bloque aussi tout reliquat local.
    console.warn('[tentative] progression effacée, copie locale encore présente :', cause);
  }
}

export const reinitialiserProfilParent: PortApi['reinitialiserProfilParent'] = async (...arguments_) => {
  const rapport = await port.reinitialiserProfilParent(...arguments_);
  oublierApresEffacement(String(arguments_[0]));
  return rapport;
};
export const supprimerProfilParent: PortApi['supprimerProfilParent'] = async (...arguments_) => {
  const rapport = await port.supprimerProfilParent(...arguments_);
  oublierApresEffacement(String(arguments_[0]));
  return rapport;
};

export const {
  lireSante,
  listerProfils,
  creerProfil,
  lireProgression,
  lirePaquetNoeud,
  urlAsset,
  lireReglagesLecture,
  ecrireReglagesLecture,
  lireEssaiTypographie,
  lireMaitrise,
  lireRevisions,
  composerSortie,
  lireMonde,
  poserObjetCampement,
  noterVisitePointCampement,
  marquerOuvertureVue,
  ouvrirZoneParent,
  lireEtatPorteParent,
  definirCodeParent,
  lireGalerieParent,
  lireDashboardParent,
  lireExportCsv,
  trancherRelectureContenu,
  lireEtatProfilParent,
  apercuReinitialisationProfil,
  apercuSuppressionProfil
} = port;
