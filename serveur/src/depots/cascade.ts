/**
 * Projection `progression_cascade` — recalculable, jamais source de verite (lot L2-A).
 *
 * Meme discipline que `progression.ts` du socle v1, et pour la meme raison : « le journal fait
 * foi ». Deux chemins qui doivent rendre EXACTEMENT le meme etat :
 *
 * - `appliquerTentativeALaCascade` — incremental, dans la transaction de la tentative ;
 * - `recalculerCascade`            — reconstruction integrale depuis `tentatives`.
 *
 * L'egalite des deux est le test T2 « Recalculs » de l'annexe T § T2, et elle n'est pas
 * obtenue par hasard : les DEUX passent par la meme fonction pure `appliquerEtoiles`
 * (`@pierre/partage/recompenses`). Le SQL ne recalcule rien de la cascade, il ne fait que la
 * ranger — c'est la seule facon d'eviter une seconde source de verite sur les seuils.
 *
 * Ordre de rejeu : `ORDER BY termine_le, id`. Les horodatages sont ISO 8601 UTC, donc leur
 * ordre lexicographique est leur ordre chronologique ; `id` departage deux tentatives closes
 * a la meme milliseconde, ce que l'horloge figee des tests produit systematiquement.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import type {
  EtatCascade, GainCascade, Horodatage, NombreEtoiles, SeuilsCascade
} from '@pierre/partage';
import { ETAT_CASCADE_VIDE, appliquerEtoiles, lireSeuilsCascade } from '@pierre/partage/recompenses';

import { RACINE_DEPOT } from '../configuration.js';

interface LigneCascade {
  readonly etoiles_total: number;
  readonly etoiles_depuis_inter: number;
  readonly intermediaires_total: number;
  readonly intermediaires_depuis_rare: number;
  readonly rares_total: number;
  readonly dernier_palier_le: string | null;
}

function versEtat(ligne: LigneCascade): EtatCascade {
  return {
    etoilesTotal: Number(ligne.etoiles_total),
    etoilesDepuisIntermediaire: Number(ligne.etoiles_depuis_inter),
    intermediairesTotal: Number(ligne.intermediaires_total),
    intermediairesDepuisRare: Number(ligne.intermediaires_depuis_rare),
    raresTotal: Number(ligne.rares_total),
    dernierPalierLe: ligne.dernier_palier_le === null ? null : String(ligne.dernier_palier_le)
  };
}

const SQL_LECTURE = `
SELECT etoiles_total, etoiles_depuis_inter, intermediaires_total,
       intermediaires_depuis_rare, rares_total, dernier_palier_le
FROM progression_cascade
WHERE profil_id = ?
`;

const SQL_ECRITURE = `
INSERT INTO progression_cascade (
  profil_id, etoiles_total, etoiles_depuis_inter, intermediaires_total,
  intermediaires_depuis_rare, rares_total, dernier_palier_le
) VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (profil_id) DO UPDATE SET
  etoiles_total              = excluded.etoiles_total,
  etoiles_depuis_inter       = excluded.etoiles_depuis_inter,
  intermediaires_total       = excluded.intermediaires_total,
  intermediaires_depuis_rare = excluded.intermediaires_depuis_rare,
  rares_total                = excluded.rares_total,
  dernier_palier_le          = excluded.dernier_palier_le
`;

/**
 * Le fichier des seuils de la cascade — seul endroit ou ils vivent (D25, convention C2).
 *
 * Lot A1 (R31) : jusqu'ici, seul le CLIENT les chargeait (`client/src/etat/services.ts`), pour
 * calculer la cascade lui-meme. Le serveur doit desormais faire ce calcul dans la transaction du
 * POST — il lui faut donc sa propre lecture, sur le meme fichier, avec la meme discipline que
 * `chargerParametresPedagogie` (`depots/maitrise.ts`) : lu et valide une fois par chemin, mis en
 * cache, et `lireSeuilsCascade` LEVE plutot que de completer un parametre manquant.
 */
export const CHEMIN_PARAMETRES_RECOMPENSES = path.join(
  RACINE_DEPOT,
  'contenu',
  'referentiel',
  'parametres-recompenses.json'
);

const CACHE_SEUILS = new Map<string, SeuilsCascade>();

export function chargerSeuilsCascade(
  chemin: string = CHEMIN_PARAMETRES_RECOMPENSES
): SeuilsCascade {
  const memorise = CACHE_SEUILS.get(chemin);
  if (memorise !== undefined) {
    return memorise;
  }
  const seuils = lireSeuilsCascade(JSON.parse(readFileSync(chemin, 'utf8')));
  CACHE_SEUILS.set(chemin, seuils);
  return seuils;
}

/**
 * L'etat de cascade d'un profil. Un profil qui n'a rien joue rend `ETAT_CASCADE_VIDE` plutot
 * que `null` : il n'existe pas d'enfant « sans cascade », seulement un enfant qui commence.
 */
export function lireCascade(base: DatabaseSync, profilId: string): EtatCascade {
  const ligne = base.prepare(SQL_LECTURE).get(profilId) as unknown as LigneCascade | undefined;
  return ligne === undefined ? ETAT_CASCADE_VIDE : versEtat(ligne);
}

function ecrire(base: DatabaseSync, profilId: string, etat: EtatCascade): void {
  base
    .prepare(SQL_ECRITURE)
    .run(
      profilId,
      etat.etoilesTotal,
      etat.etoilesDepuisIntermediaire,
      etat.intermediairesTotal,
      etat.intermediairesDepuisRare,
      etat.raresTotal,
      etat.dernierPalierLe
    );
}

/**
 * Chemin incremental, RICHE. A appeler dans la MEME transaction que l'insertion de la
 * tentative, exactement comme `appliquerTentativeALaProgression`.
 *
 * Rend le `GainCascade` COMPLET (etat, paliers franchis, recompenses, jauges) — pas seulement
 * l'etat qui en resulte. Lot A1 (R31) : `depots/tentatives.ts` en a besoin pour savoir QUELS
 * paliers viennent d'etre franchis, afin d'attribuer une vraie forme de Gobi au palier
 * intermediaire (`enregistrerFormeGobi`, qui existait deja et n'etait appelee par personne), et
 * pour rendre au client la meme richesse que celle qu'il calculait lui-meme avant ce lot.
 */
export function appliquerTentativeALaCascadeAvecGain(
  base: DatabaseSync,
  profilId: string,
  etoiles: NombreEtoiles,
  seuils: SeuilsCascade,
  termineLe: Horodatage
): GainCascade {
  const gain = appliquerEtoiles(lireCascade(base, profilId), etoiles, seuils, termineLe);
  ecrire(base, profilId, gain.etat);
  return gain;
}

/**
 * Chemin incremental, comme ci-dessus, mais ne rend que l'ETAT — la forme que
 * `tests/unitaires/cascade.test.ts` attend depuis L2-A. INCHANGEE par le lot A1 : elle delegue
 * simplement a `appliquerTentativeALaCascadeAvecGain`, rien de son comportement ne bouge.
 */
export function appliquerTentativeALaCascade(
  base: DatabaseSync,
  profilId: string,
  etoiles: NombreEtoiles,
  seuils: SeuilsCascade,
  termineLe: Horodatage
): EtatCascade {
  return appliquerTentativeALaCascadeAvecGain(base, profilId, etoiles, seuils, termineLe).etat;
}

/**
 * Reconstruit integralement la cascade d'un profil depuis `tentatives`.
 *
 * C'est le `RECALCULER` complet de l'annexe T § T2. Il efface la projection avant de la
 * reconstruire : la projection n'a aucune information que le journal ne porte pas, donc
 * l'effacer ne perd rien. Si un jour elle en avait une, ce serait une seconde source de
 * verite et le journal ne ferait plus foi.
 */
export function recalculerCascade(
  base: DatabaseSync,
  profilId: string,
  seuils: SeuilsCascade
): EtatCascade {
  base.prepare('DELETE FROM progression_cascade WHERE profil_id = ?').run(profilId);

  const lignes = base
    .prepare(
      `SELECT etoiles, termine_le FROM tentatives
       WHERE profil_id = ? ORDER BY termine_le, id`
    )
    .all(profilId) as unknown as { etoiles: number; termine_le: string }[];

  let etat: EtatCascade = ETAT_CASCADE_VIDE;
  for (const ligne of lignes) {
    etat = appliquerEtoiles(
      etat,
      Number(ligne.etoiles) as NombreEtoiles,
      seuils,
      String(ligne.termine_le)
    ).etat;
  }

  if (lignes.length > 0) {
    ecrire(base, profilId, etat);
  }
  return etat;
}

/** Recalcule la cascade de tous les profils. Rend le nombre de profils traites. */
export function recalculerToutesLesCascades(base: DatabaseSync, seuils: SeuilsCascade): number {
  const lignes = base.prepare('SELECT id FROM profils ORDER BY id').all() as unknown as {
    id: string;
  }[];
  for (const ligne of lignes) {
    recalculerCascade(base, String(ligne.id), seuils);
  }
  return lignes.length;
}
