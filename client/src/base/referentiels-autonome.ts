/**
 * Référentiels embarqués au build — mode autonome uniquement (Lot 4 du portage Android,
 * Docs/addendum-portage-android.md § 6bis). Le serveur LIT ces fichiers sur disque via
 * `node:fs` (`serveur/src/referentiels/*.ts`) ; l'app autonome les EMBARQUE (imports JSON Vite,
 * résolus au build, aucune lecture disque à l'exécution). Le mode LAN ne référence jamais ce
 * fichier — `@pierre/partage/pedagogie` (BKT/Leitner/sélecteur) n'entre donc jamais dans son
 * bundle, exactement comme avant le portage.
 */

import { lireParametresPedagogie } from '@pierre/partage/pedagogie';
import type { ParametresPedagogie } from '@pierre/partage/pedagogie';
import { lireSeuilsCascade } from '@pierre/partage/recompenses';
import type { SeuilsCascade } from '@pierre/partage/recompenses';
import {
  campementDuDocument, compagnonsDuDocument, formesDuDocument, paralleleDuDocument,
  regionsDuDocument, stadesDuDocument
} from '@pierre/partage/monde';
import type { ReferentielMonde } from '@pierre/partage/base';

import parametresPedagogieBrut from '../../../contenu/referentiel/parametres-pedagogie.json' with { type: 'json' };
import parametresRecompensesBrut from '../../../contenu/referentiel/parametres-recompenses.json' with { type: 'json' };
import documentRegions from '../../../contenu/monde/regions.json' with { type: 'json' };
import documentStades from '../../../contenu/monde/gobi-stades.json' with { type: 'json' };
import documentCompagnons from '../../../contenu/monde/compagnons.json' with { type: 'json' };
import documentCampement from '../../../contenu/monde/campement.json' with { type: 'json' };

let parametresPedagogie: ParametresPedagogie | null = null;

/** Mémoïsé : ces valeurs ne changent pas en cours de partie (même discipline que le serveur). */
export function chargerParametresPedagogieAutonome(): ParametresPedagogie {
  parametresPedagogie ??= lireParametresPedagogie(parametresPedagogieBrut);
  return parametresPedagogie;
}

let seuilsCascade: SeuilsCascade | null = null;

export function chargerSeuilsCascadeAutonome(): SeuilsCascade {
  seuilsCascade ??= lireSeuilsCascade(parametresRecompensesBrut);
  return seuilsCascade;
}

let referentielMonde: ReferentielMonde | null = null;

export function chargerReferentielMondeAutonome(): ReferentielMonde {
  referentielMonde ??= {
    regions: regionsDuDocument(documentRegions),
    ouvertesEnParallele: paralleleDuDocument(documentRegions),
    stades: stadesDuDocument(documentStades),
    formes: formesDuDocument(documentStades),
    compagnons: compagnonsDuDocument(documentCompagnons),
    campement: campementDuDocument(documentCampement)
  };
  return referentielMonde;
}
