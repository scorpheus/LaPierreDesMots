/**
 * Chargement (disque) des paramètres pédagogiques — extrait de l'ex-`depots/maitrise.ts` lors
 * du portage Android (Docs/addendum-portage-android.md § 3). `node:fs` est SERVEUR-SEUL : le
 * dépôt partagé (`@pierre/partage/base`) ne charge plus rien lui-même, il reçoit
 * `ParametresPedagogie` en paramètre.
 *
 * Le fichier est lu une fois et mémorisé : le relire à chaque tentative ferait dépendre la
 * pédagogie de l'état du disque au milieu d'une session. `lireParametresPedagogie` LÈVE plutôt
 * que de compléter — un paramètre manquant doit se voir au démarrage, pas dans trois semaines
 * dans une courbe (D13).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { ParametresPedagogie } from '@pierre/partage';
import { lireParametresPedagogie } from '@pierre/partage/pedagogie';

import { RACINE_DEPOT } from '../configuration.js';

/** Le fichier de parametres, seul endroit ou vivent les valeurs pedagogiques (C2, D13). */
export const CHEMIN_PARAMETRES_PEDAGOGIE = path.join(
  RACINE_DEPOT,
  'contenu',
  'referentiel',
  'parametres-pedagogie.json'
);

const CACHE_PARAMETRES = new Map<string, ParametresPedagogie>();

export function chargerParametresPedagogie(
  chemin: string = CHEMIN_PARAMETRES_PEDAGOGIE
): ParametresPedagogie {
  const memorise = CACHE_PARAMETRES.get(chemin);
  if (memorise !== undefined) {
    return memorise;
  }
  const parametres = lireParametresPedagogie(JSON.parse(readFileSync(chemin, 'utf8')));
  CACHE_PARAMETRES.set(chemin, parametres);
  return parametres;
}
