/**
 * Chargement (disque) des seuils de la cascade — extrait de l'ex-`depots/cascade.ts` lors du
 * portage Android (Docs/addendum-portage-android.md § 3). `node:fs` est SERVEUR-SEUL : le dépôt
 * partagé (`@pierre/partage/base`) ne charge plus rien lui-même, `enregistrerTentative` reçoit
 * désormais `SeuilsCascade` en paramètre.
 *
 * Seul endroit ou les seuils vivent (D25, convention C2) : lu et validé une fois par chemin, mis
 * en cache. `lireSeuilsCascade` LÈVE plutôt que de compléter un parametre manquant.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { SeuilsCascade } from '@pierre/partage';
import { lireSeuilsCascade } from '@pierre/partage/recompenses';

import { RACINE_DEPOT } from '../configuration.js';

export const CHEMIN_PARAMETRES_RECOMPENSES = path.join(
  RACINE_DEPOT,
  'contenu',
  'referentiel',
  'parametres-recompenses.json'
);

const CACHE_SEUILS = new Map<string, SeuilsCascade>();

export function chargerSeuilsCascade(chemin: string = CHEMIN_PARAMETRES_RECOMPENSES): SeuilsCascade {
  const memorise = CACHE_SEUILS.get(chemin);
  if (memorise !== undefined) {
    return memorise;
  }
  const seuils = lireSeuilsCascade(JSON.parse(readFileSync(chemin, 'utf8')));
  CACHE_SEUILS.set(chemin, seuils);
  return seuils;
}
