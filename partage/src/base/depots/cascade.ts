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
 * La cascade compte un crédit par première réussite d'un nœud. Les champs `etoiles_*`
 * et la fonction pure `appliquerEtoiles` gardent leur nom historique pour la compatibilité
 * du stockage et de l'API ; ils ne portent plus la somme des étoiles de qualité.
 * Le rejeu retient la première réussite de chaque nœud, triée par date puis nœud.
 *
 * Porté sur le contrat `Base` — Docs/addendum-portage-android.md § 4. Le CHARGEMENT des seuils
 * (`contenu/referentiel/parametres-recompenses.json`, `node:fs`) reste côté serveur/autonome —
 * voir `serveur/src/referentiels/recompenses.ts` — et arrive désormais en PARAMÈTRE aux
 * fonctions incrémentales, qui ne le chargent plus elles-mêmes.
 */

import type { Horodatage } from '../../identifiants.js';
import type { EtatCascade, GainCascade, SeuilsCascade } from '../../recompenses/types.js';
import { ETAT_CASCADE_VIDE, appliquerEtoiles } from '../../recompenses/index.js';
import type { Base } from '../contrat.js';

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

// La même population alimente les crédits du rejeu et la date de l'incrémental.
// Les dates des appareils peuvent arriver hors ordre : la dernière requête reçue
// n'est pas nécessairement la dernière première réussite chronologique.
const SQL_PREMIERES_REUSSITES = `
SELECT noeud_id, MIN(termine_le) AS termine_le FROM tentatives
WHERE profil_id = ? AND reussi = 1 GROUP BY noeud_id
`;

/**
 * L'etat de cascade d'un profil. Un profil qui n'a rien joue rend `ETAT_CASCADE_VIDE` plutot
 * que `null` : il n'existe pas d'enfant « sans cascade », seulement un enfant qui commence.
 */
export async function lireCascade(base: Base, profilId: string): Promise<EtatCascade> {
  const ligne = await base.uneLigne<LigneCascade>(SQL_LECTURE, [profilId]);
  return ligne === undefined ? ETAT_CASCADE_VIDE : versEtat(ligne);
}

async function ecrire(base: Base, profilId: string, etat: EtatCascade): Promise<void> {
  await base.lancer(SQL_ECRITURE, [
    profilId,
    etat.etoilesTotal,
    etat.etoilesDepuisIntermediaire,
    etat.intermediairesTotal,
    etat.intermediairesDepuisRare,
    etat.raresTotal,
    etat.dernierPalierLe
  ]);
}

/**
 * Chemin incremental, RICHE. A appeler dans la MEME transaction que l'insertion de la
 * tentative, exactement comme `appliquerTentativeALaProgression`. L'appelant transmet
 * le crédit de première réussite (0 ou 1), jamais les étoiles de qualité de la tentative.
 *
 * Rend le `GainCascade` COMPLET (etat, paliers franchis, recompenses, jauges) — pas seulement
 * l'etat qui en resulte. Lot A1 (R31) : `depots/tentatives.ts` en a besoin pour savoir QUELS
 * paliers viennent d'etre franchis, afin d'attribuer une vraie forme de Gobi au palier
 * intermediaire, et pour rendre au client la meme richesse que celle qu'il calculait lui-meme
 * avant ce lot.
 */
export async function appliquerTentativeALaCascadeAvecGain(
  base: Base,
  profilId: string,
  credit: 0 | 1,
  seuils: SeuilsCascade,
  termineLe: Horodatage
): Promise<GainCascade> {
  const brut = appliquerEtoiles(await lireCascade(base, profilId), credit, seuils, termineLe);
  const derniere = await base.uneLigne<{ dernier_palier_le: string | null }>(
    `SELECT MAX(termine_le) AS dernier_palier_le FROM (${SQL_PREMIERES_REUSSITES})`,
    [profilId]
  );
  // Même avec zéro crédit, une réussite ancienne reçue en reprise peut corriger la
  // première date connue du nœud. Cela répare la projection sans célébrer de nouveau.
  const gain: GainCascade = {
    ...brut,
    etat: { ...brut.etat, dernierPalierLe: derniere?.dernier_palier_le ?? null }
  };
  await ecrire(base, profilId, gain.etat);
  return gain;
}

/**
 * Chemin incremental, comme ci-dessus, mais ne rend que l'ETAT — la forme que
 * `tests/unitaires/cascade.test.ts` attend depuis L2-A. Il délègue au même chemin de crédit.
 */
export async function appliquerTentativeALaCascade(
  base: Base,
  profilId: string,
  credit: 0 | 1,
  seuils: SeuilsCascade,
  termineLe: Horodatage
): Promise<EtatCascade> {
  return (await appliquerTentativeALaCascadeAvecGain(base, profilId, credit, seuils, termineLe)).etat;
}

/**
 * Reconstruit integralement la cascade d'un profil depuis `tentatives`.
 *
 * C'est le `RECALCULER` complet de l'annexe T § T2. Il efface la projection avant de la
 * reconstruire : la projection n'a aucune information que le journal ne porte pas, donc
 * l'effacer ne perd rien. Si un jour elle en avait une, ce serait une seconde source de
 * verite et le journal ne ferait plus foi.
 */
export async function recalculerCascade(
  base: Base,
  profilId: string,
  seuils: SeuilsCascade
): Promise<EtatCascade> {
  await base.lancer('DELETE FROM progression_cascade WHERE profil_id = ?', [profilId]);

  const lignes = await base.lignes<{ termine_le: string }>(
    `${SQL_PREMIERES_REUSSITES} ORDER BY termine_le, noeud_id`,
    [profilId]
  );

  let etat: EtatCascade = ETAT_CASCADE_VIDE;
  for (const ligne of lignes) {
    etat = appliquerEtoiles(
      etat,
      1,
      seuils,
      String(ligne.termine_le)
    ).etat;
  }

  if (lignes.length > 0) {
    await ecrire(base, profilId, etat);
  }
  return etat;
}

/** Recalcule la cascade de tous les profils. Rend le nombre de profils traites. */
export async function recalculerToutesLesCascades(base: Base, seuils: SeuilsCascade): Promise<number> {
  const lignes = await base.lignes<{ id: string }>('SELECT id FROM profils ORDER BY id');
  for (const ligne of lignes) {
    await recalculerCascade(base, String(ligne.id), seuils);
  }
  return lignes.length;
}
