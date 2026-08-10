/**
 * Chargement (disque) du référentiel du monde — extrait de l'ex-`depots/monde.ts` lors du
 * portage Android (Docs/addendum-portage-android.md § 3). `node:fs` est SERVEUR-SEUL : le dépôt
 * partagé (`@pierre/partage/base`) reçoit désormais `ReferentielMonde` en paramètre partout,
 * il ne le charge plus lui-même.
 *
 * Le REFERENTIEL (six regions, stades, compagnons, campement) n'est pas en base : c'est du
 * contenu, il vit dans `contenu/monde/*.json`. Il est lu une fois et memoise par dossier.
 * Aucun repli silencieux : un fichier absent ou invalide leve. Un monde a moitie charge
 * afficherait une carte a trois regions sans que personne ne s'en apercoive.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { ReferentielMonde } from '@pierre/partage/base';
import {
  campementDuDocument, compagnonsDuDocument, formesDuDocument, paralleleDuDocument,
  regionsDuDocument, stadesDuDocument,
} from '@pierre/partage/monde';

import { RACINE_DEPOT } from '../configuration.js';

const cache = new Map<string, ReferentielMonde>();

function lireJson(dossier: string, fichier: string): unknown {
  return JSON.parse(readFileSync(path.join(dossier, 'monde', fichier), 'utf8')) as unknown;
}

export function chargerReferentielMonde(
  racineContenu: string = path.join(RACINE_DEPOT, 'contenu'),
): ReferentielMonde {
  const enCache = cache.get(racineContenu);
  if (enCache !== undefined) {
    return enCache;
  }

  const documentRegions = lireJson(racineContenu, 'regions.json');
  const documentStades = lireJson(racineContenu, 'gobi-stades.json');
  const documentCompagnons = lireJson(racineContenu, 'compagnons.json');
  const documentCampement = lireJson(racineContenu, 'campement.json');

  const referentiel: ReferentielMonde = {
    regions: regionsDuDocument(documentRegions),
    ouvertesEnParallele: paralleleDuDocument(documentRegions),
    stades: stadesDuDocument(documentStades),
    formes: formesDuDocument(documentStades),
    compagnons: compagnonsDuDocument(documentCompagnons),
    campement: campementDuDocument(documentCampement)
  };

  cache.set(racineContenu, referentiel);
  return referentiel;
}
