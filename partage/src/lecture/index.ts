/**
 * Barillet du sous-chemin `@pierre/partage/lecture` — lot L2-B.
 *
 * Ce sous-chemin est chargé PAR LE CLIENT (contrat des features v2 § 4.7) : la zone de lecture
 * applique les réglages à l'écran. Sa surface reste donc étroite, et tout ce qui pèse — les
 * fichiers WOFF2, le repli système, les `@font-face` — vit côté client, jamais ici.
 *
 * Surface publiée : les 10 types et les 8 valeurs du § 10.1, plus `POLICES`, la liste ordonnée
 * des cinq codes, dont l'écran de réglages de ce même lot a besoin pour engendrer ses choix.
 * Signalé au rapport : c'est le seul symbole que L2-B publie au-delà du § 4.2.
 */

export type {
  CodePolice,
  FondLecture,
  ReglagesLecture,
  BorneReglage,
  BornesReglages,
  SegmentSyllabe,
  EssaiTypographie,
  ConfigurationBras,
  ResultatBras,
  ComparaisonTypographie,
} from './types.js';

export {
  REGLAGES_PAR_DEFAUT,
  BORNES_REGLAGES,
  POLICES,
  normaliserReglages,
  variablesCss,
} from './defauts.js';

export { decouperSyllabes } from './syllabation.js';

export { TENTATIVES_MIN_PAR_BRAS, brasDeSession, comparer } from './essai-typographie.js';
