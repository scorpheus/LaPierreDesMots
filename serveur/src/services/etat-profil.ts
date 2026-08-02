/**
 * L'état réel d'un profil — lot H2, point 3 du brief.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * CE FICHIER EXISTE PARCE QU'UN BUG A ÉTÉ INVISIBLE
 *
 * Le 2026-08-02, le profil `prf-0fbbeba7fb27d3f7` (« Ezékiel ») portait en base :
 *
 *     progression_region : clairiere  pourcentage_colorie = 1  eclat_obtenu_le renseigné
 *                          galeries   pourcentage_colorie = 1  eclat_obtenu_le renseigné
 *     progression_noeud  : 3 nœuds terminés — clairiere-01, galeries-01, galeries-02
 *     contenu livré      : 18 nœuds — clairiere 6, galeries 12
 *
 * Deux régions à 100 % pour 3 nœuds joués sur 18, et **plus aucun monde cliquable sur la
 * carte**. Il a fallu une requête SQL écrite à la main pour voir ce que ce fichier affiche
 * maintenant en une ligne par région.
 *
 * D'où sa règle de forme, qui n'est pas négociable :
 *
 *   **aucun pourcentage n'est affiché sans son recalcul, et aucun recalcul sans son écart.**
 *
 * C'est la transposition à un écran de la règle d'agent : « si un agent doit recalculer, il
 * imprime les deux valeurs et l'écart ». Une seule des deux valeurs ne dit rien ; les deux
 * côte à côte disent tout, et immédiatement.
 * ═════════════════════════════════════════════════════════════════════════════════════════
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * SOURCES QUI FONT FOI, ET CE QUE CE FICHIER NE REFAIT PAS
 *
 * • `carteRecalculee` (`depots/monde.ts`) est **la** reconstruction de la carte depuis la
 *   progression. Ce fichier l'APPELLE ; il n'en écrit pas une seconde. Deux recalculs de la
 *   même grandeur dériveraient, et le jour où ils divergeraient personne ne saurait lequel
 *   croire.
 * • `progression_region` est lue telle quelle, sans correction. C'est justement la valeur
 *   suspecte : la corriger ici la rendrait invisible.
 * • Cet écran est **en lecture seule**. Il ne répare rien — la réparation est le lot H1, et
 *   elle se fait par migration, une fois, pas à chaque affichage. Un écran qui répare en
 *   affichant est un écran dont on ne peut plus se servir pour constater.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 */

import type { DatabaseSync } from 'node:sqlite';

import type { CodeRegion, Horodatage, IdNoeud, IdProfil } from '@pierre/partage';
import type {
  EtatProfil,
  EtatRegionProfil,
  TentativeRecente
} from '@pierre/partage/parent';
import { compterRegionsIncoherentes } from '@pierre/partage/parent';

import { carteRecalculee, chargerReferentielMonde } from '../depots/monde.js';
import { lireProfil } from '../depots/profils.js';

import type { ReferentielMonde } from '../depots/monde.js';

/** Combien de tentatives récentes le parent voit. Assez pour reconnaître une séance. */
export const NB_TENTATIVES_RECENTES = 10;

/**
 * Précision de comparaison des pourcentages.
 *
 * Un douzième vaut 0,08333… : comparer deux flottants sans arrondi ferait apparaître un écart
 * de 10⁻¹⁷ et l'écran annoncerait une incohérence là où il n'y en a pas. Six décimales
 * discriminent largement un dix-huitième d'un dix-septième, et c'est la précision déjà retenue
 * par `scripts/test-rejeu.mjs` pour la même raison.
 */
const DECIMALES = 6;

function arrondir(valeur: number): number {
  return Number(valeur.toFixed(DECIMALES));
}

function compter(base: DatabaseSync, table: string, profilId: string): number {
  const ligne = base
    .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE profil_id = ?`)
    .get(profilId) as unknown as { readonly n: number };
  return Number(ligne.n);
}

interface LigneRegionStockee {
  readonly region_code: string;
  readonly ouverte: number;
  readonly pourcentage_colorie: number;
  readonly eclat_obtenu_le: string | null;
}

interface LigneTentative {
  readonly noeud_id: string;
  readonly exercice_id: string;
  readonly moteur: string;
  readonly termine_le: string;
  readonly reussi: number;
  readonly etoiles: number;
  readonly nb_erreurs: number;
  readonly aide_utilisee: string;
}

/** Les dernières tentatives, la plus récente d'abord. Le journal, lu tel qu'il est écrit. */
export function dernieresTentatives(
  base: DatabaseSync,
  profilId: string,
  limite: number = NB_TENTATIVES_RECENTES
): readonly TentativeRecente[] {
  const lignes = base
    .prepare(
      `SELECT noeud_id, exercice_id, moteur, termine_le, reussi, etoiles, nb_erreurs, aide_utilisee
       FROM tentatives WHERE profil_id = ?
       ORDER BY termine_le DESC, id DESC
       LIMIT ?`
    )
    .all(profilId, limite) as unknown as LigneTentative[];

  return lignes.map((ligne) => ({
    noeud: String(ligne.noeud_id) as IdNoeud,
    exercice: String(ligne.exercice_id),
    moteur: String(ligne.moteur),
    termineLe: String(ligne.termine_le) as Horodatage,
    reussi: Number(ligne.reussi) === 1,
    etoiles: Number(ligne.etoiles),
    nbErreurs: Number(ligne.nb_erreurs),
    aideUtilisee: String(ligne.aide_utilisee)
  }));
}

/**
 * Les régions, stocké contre recalculé.
 *
 * Une région absente de `progression_region` est traitée à 0 % stocké, jamais ignorée : sur
 * une base neuve la table est vide, et masquer les régions ferait croire à un monde sans
 * régions plutôt qu'à un profil qui n'a rien joué.
 */
export function regionsDuProfil(
  base: DatabaseSync,
  profilId: string,
  referentiel: ReferentielMonde
): readonly EtatRegionProfil[] {
  const recalculee = carteRecalculee(base, profilId, referentiel);

  const stockees = new Map(
    (
      base
        .prepare(
          `SELECT region_code, ouverte, pourcentage_colorie, eclat_obtenu_le
           FROM progression_region WHERE profil_id = ?`
        )
        .all(profilId) as unknown as LigneRegionStockee[]
    ).map((ligne) => [String(ligne.region_code), ligne])
  );

  const termines = new Set(
    (
      base
        .prepare('SELECT noeud_id FROM progression_noeud WHERE profil_id = ?')
        .all(profilId) as unknown as { readonly noeud_id: string }[]
    ).map((ligne) => String(ligne.noeud_id))
  );

  return [...recalculee.regions]
    .sort((a, b) => a.ordre - b.ordre)
    .map((region) => {
      const stockee = stockees.get(String(region.region));
      const pourcentageStocke = arrondir(
        stockee === undefined ? 0 : Number(stockee.pourcentage_colorie)
      );
      const pourcentageRecalcule = arrondir(region.pourcentageColorie);

      return {
        region: region.region as CodeRegion,
        ordre: region.ordre,
        // L'ouverture affichée est celle de la BASE quand elle existe : c'est elle qui décide
        // de ce que l'enfant peut toucher, donc c'est elle que le parent doit lire.
        ouverte: stockee === undefined ? region.ouverte : Number(stockee.ouverte) === 1,
        pourcentageStocke,
        pourcentageRecalcule,
        ecart: arrondir(pourcentageStocke - pourcentageRecalcule),
        noeudsLivres: region.noeuds.length,
        noeudsTermines: region.noeuds.filter((noeud) => termines.has(String(noeud))).length,
        eclatObtenuLe:
          stockee?.eclat_obtenu_le === undefined || stockee.eclat_obtenu_le === null
            ? region.eclatObtenuLe
            : (String(stockee.eclat_obtenu_le) as Horodatage)
      };
    });
}

/**
 * L'état complet d'un profil. `null` quand le profil n'existe pas — la route en fait un 404,
 * jamais un état vide qui se lirait comme « cet enfant n'a rien fait ».
 */
export function etatDuProfil(
  base: DatabaseSync,
  profilId: string,
  racineContenu?: string
): EtatProfil | null {
  const profil = lireProfil(base, profilId);
  if (profil === null) {
    return null;
  }

  const referentiel =
    racineContenu === undefined
      ? chargerReferentielMonde()
      : chargerReferentielMonde(racineContenu);

  const regions = regionsDuProfil(base, profilId, referentiel);
  const noeudsLivres = regions.reduce((somme, region) => somme + region.noeudsLivres, 0);

  const etoiles = base
    .prepare(
      'SELECT COALESCE(SUM(etoiles), 0) AS n FROM progression_noeud WHERE profil_id = ?'
    )
    .get(profilId) as unknown as { readonly n: number };

  const stade = base
    .prepare('SELECT stade_code FROM stade_gobi WHERE profil_id = ?')
    .get(profilId) as unknown as { readonly stade_code: string } | undefined;

  return {
    profil: profilId as IdProfil,
    prenom: profil.prenom,
    creeLe: profil.creeLe,
    dernierAccesLe: profil.dernierAccesLe,

    noeudsTermines: compter(base, 'progression_noeud', profilId),
    noeudsLivres,
    etoilesObtenues: Number(etoiles.n),
    etoilesPossibles: noeudsLivres * 3,
    nbTentatives: compter(base, 'tentatives', profilId),
    nbEtapes: compter(base, 'etapes_tentative', profilId),

    regions,
    dernieresTentatives: dernieresTentatives(base, profilId),

    stadeGobi: stade === undefined ? null : String(stade.stade_code),
    nbFormesGobi: compter(base, 'formes_gobi', profilId),
    nbCompagnons: compter(base, 'compagnons', profilId),
    nbObjetsCampement: compter(base, 'campement', profilId),
    nbItemsLeitner: compter(base, 'items_leitner', profilId),

    regionsIncoherentes: compterRegionsIncoherentes(regions)
  };
}
