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

export type { PaquetNoeudAttendu, DashboardParent } from './contrat.js';
export { ErreurReseau, calculerCleIdempotence, fermerZoneParent, jetonParentPose } from './commun.js';

const port: PortApi =
  import.meta.env.MODE === 'pwa'
    ? (await import('./port-local.js')).portLocal
    : import.meta.env.MODE === 'autonome'
    ? (await import('./port-local.js')).portLocal
    : (await import('./port-http.js')).portHttp;

export const {
  lireSante,
  listerProfils,
  creerProfil,
  lireProfil,
  lireProgression,
  lirePaquetNoeud,
  enregistrerTentative,
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
  reinitialiserProfilParent,
  apercuSuppressionProfil,
  supprimerProfilParent
} = port;
