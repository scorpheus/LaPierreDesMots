/**
 * Sous-chemin `@pierre/partage/voix` — contrat de finition v3 § 4.2.
 *
 * CONVENTION C1 (contrat des features v2 § 4.7) : le barillet `@pierre/partage` ne porte que
 * des TYPES ; toute VALEUR passe par un sous-chemin. `clipDe`, `aUnAudio`,
 * `couvertureConsignes`, `SEUIL_QC` et `LOCUTEURS` sont des valeurs — elles entrent donc ici,
 * jamais dans `index.ts`. Le coût réel au bundle est de quelques centaines d'octets : aucune
 * dépendance, aucune table de données, cinq fonctions de recherche linéaire.
 */

export type {
  Locuteur, CleAudio, RenduVoix, ClipVoix, ManifesteVoix, CouvertureAudio,
} from './manifeste.js';

export {
  LOCUTEURS, RENDU_PAR_DEFAUT, SEUIL_QC, MANIFESTE_VIDE,
  clipDe, aUnAudio, rendusDe, couvertureConsignes, lireManifeste, estLocuteur,
} from './manifeste.js';
