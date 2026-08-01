/**
 * Le monde d'un profil : carte, Gobi, compagnons, campement — lot L2-F.
 *
 * **Toutes les tables de `005_monde.sql` sont des PROJECTIONS**, jamais des sources de verite.
 * `progression_region` se recalcule integralement depuis `progression_noeud`, elle-meme
 * recalculable depuis `tentatives` (CLAUDE.md, « le journal fait foi »). `stade_gobi` se
 * recalcule depuis `formes_gobi`. Les deux seules tables qui portent une information que le
 * journal n'a pas sont `formes_gobi` et `campement` : ce sont des acquis, on les ecrit une fois
 * et on ne les reprend jamais.
 *
 * DEUX ECRITURES MONOTONES, et elles ne sont pas negociables (R14) :
 *   * `progression_region.pourcentage_colorie` en `MAX(ancien, nouveau)` ;
 *   * `stade_gobi` en `MAX(rang_ancien, rang_nouveau)`.
 * `tests/api/monde.test.ts` tente la regression et verifie qu'elle n'a pas eu lieu.
 *
 * Le REFERENTIEL (six regions, stades, compagnons, campement) n'est pas en base : c'est du
 * contenu, il vit dans `contenu/monde/*.json`. Il est lu une fois et memoise par dossier, parce
 * qu'il ne change pas en cours d'execution et qu'une lecture disque par requete serait payee sur
 * la tablette de l'enfant.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { DatabaseSync } from 'node:sqlite';

import type {
  CodeCompagnon, CodeRegion, Compagnon, EtatCarte, EtatGobi, EtatMonde, EtatRegion, FormeGobi,
  Horloge, Horodatage, ObjetCampement, StadeGobi,
} from '@pierre/partage';
import {
  ajouterForme,
  appliquerEclat,
  campementDuDocument,
  carteInitiale,
  compagnonParRegion,
  compagnonsDuDocument,
  compagnonsDuProfil,
  formesDuDocument,
  gobiInitial,
  ouvrirCeQuiDoitLEtre,
  paralleleDuDocument,
  recalculerRecoloration,
  regionsDuDocument,
  stadeApresFormes,
  stadesDuDocument,
} from '@pierre/partage/monde';
import type {
  DefinitionCompagnon, DefinitionRegion, DocumentCampement, FormeDeclaree,
} from '@pierre/partage/monde';

import { RACINE_DEPOT, horodatage } from '../configuration.js';

/** Tout ce que `contenu/monde/` declare, lu et valide d'un bloc. */
export interface ReferentielMonde {
  readonly regions: readonly DefinitionRegion[];
  readonly ouvertesEnParallele: number;
  readonly stades: readonly StadeGobi[];
  readonly formes: readonly FormeDeclaree[];
  readonly compagnons: readonly DefinitionCompagnon[];
  readonly campement: DocumentCampement;
}

const cache = new Map<string, ReferentielMonde>();

function lireJson(dossier: string, fichier: string): unknown {
  return JSON.parse(readFileSync(path.join(dossier, 'monde', fichier), 'utf8')) as unknown;
}

/**
 * Charge `contenu/monde/`. Memoise par dossier — les tests qui passent un dossier different
 * obtiennent bien leur propre referentiel.
 *
 * Aucun repli silencieux : un fichier absent ou invalide leve. Un monde a moitie charge
 * afficherait une carte a trois regions sans que personne ne s'en apercoive.
 */
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

// ─────────────────────────────────────────────────────────────────── lignes SQL

interface LigneRegion {
  readonly region_code: string;
  readonly ouverte: number;
  readonly pourcentage_colorie: number;
  readonly eclat_obtenu_le: string | null;
}

interface LigneForme {
  readonly grapheme_code: string;
  readonly obtenue_le: string;
}

interface LigneCompagnon {
  readonly code: string;
  readonly rallie_le: string;
}

interface LigneObjet {
  readonly objet_code: string;
  readonly place_le: string;
}

// ─────────────────────────────────────────────────────────────────── la carte

/** Les nœuds que ce profil a deja termines, lus dans la projection de progression. */
function noeudsTermines(base: DatabaseSync, profilId: string): readonly string[] {
  const lignes = base
    .prepare('SELECT noeud_id FROM progression_noeud WHERE profil_id = ?')
    .all(profilId) as unknown as { readonly noeud_id: string }[];
  return lignes.map((ligne) => String(ligne.noeud_id));
}

/**
 * Reconstruit la carte INTEGRALEMENT depuis la progression par nœud.
 *
 * Trois etapes, dans cet ordre, et l'ordre compte :
 *   1. carte neuve — seule la premiere region est ouverte ;
 *   2. recoloration de chaque region depuis ses nœuds termines ;
 *   3. Eclat pose sur toute region entierement recoloriee, dans l'ordre de progression, ce qui
 *      ouvre la suivante.
 *
 * Une region SANS nœud livre reste a 0 % : elle ne peut pas obtenir son Eclat par accident,
 * ce qui ouvrirait toute la carte le jour ou l'on ajoute une region vide au referentiel.
 */
export function carteRecalculee(
  base: DatabaseSync,
  profilId: string,
  referentiel: ReferentielMonde,
): EtatCarte {
  const termines = noeudsTermines(base, profilId);
  const compagnons = compagnonParRegion(referentiel.compagnons);
  const neuve = carteInitiale(referentiel.regions, referentiel.ouvertesEnParallele, compagnons);

  const recoloriees: EtatRegion[] = neuve.regions.map((region) =>
    recalculerRecoloration(region, termines)
  );

  // L'Eclat est date par le dernier acces connu au nœud le plus recent de la region ; a defaut,
  // par la date d'acces du profil. On ne fabrique JAMAIS d'horodatage : il vient de la base.
  const datesParNoeud = new Map(
    (
      base
        .prepare('SELECT noeud_id, dernier_le FROM progression_noeud WHERE profil_id = ?')
        .all(profilId) as unknown as { readonly noeud_id: string; readonly dernier_le: string }[]
    ).map((ligne) => [String(ligne.noeud_id), String(ligne.dernier_le)])
  );

  let carte: EtatCarte = ouvrirCeQuiDoitLEtre({ ...neuve, regions: recoloriees });

  for (const region of [...carte.regions].sort((a, b) => a.ordre - b.ordre)) {
    if (region.pourcentageColorie < 1 || region.noeuds.length === 0) {
      continue;
    }
    const quand = region.noeuds
      .map((noeud) => datesParNoeud.get(String(noeud)) ?? '')
      .filter((date) => date !== '')
      .sort()
      .at(-1);
    if (quand === undefined) {
      continue;
    }
    carte = appliquerEclat(carte, region.region, quand);
  }

  return carte;
}

/** Ecrit la projection `progression_region` en MAX — un acquis n'est jamais repris (R14). */
export function ecrireProgressionRegion(
  base: DatabaseSync,
  profilId: string,
  carte: EtatCarte,
): void {
  const requete = base.prepare(
    `INSERT INTO progression_region
       (profil_id, region_code, ouverte, pourcentage_colorie, eclat_obtenu_le)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (profil_id, region_code) DO UPDATE SET
       ouverte             = MAX(progression_region.ouverte, excluded.ouverte),
       pourcentage_colorie = MAX(progression_region.pourcentage_colorie,
                                 excluded.pourcentage_colorie),
       eclat_obtenu_le     = COALESCE(progression_region.eclat_obtenu_le,
                                      excluded.eclat_obtenu_le)`
  );
  for (const region of carte.regions) {
    requete.run(
      profilId,
      String(region.region),
      region.ouverte ? 1 : 0,
      region.pourcentageColorie,
      region.eclatObtenuLe
    );
  }
}

/** Relit la carte depuis la projection, apres l'avoir recalculee et ecrite. */
export function lireCarte(
  base: DatabaseSync,
  profilId: string,
  referentiel: ReferentielMonde,
): EtatCarte {
  const recalculee = carteRecalculee(base, profilId, referentiel);
  ecrireProgressionRegion(base, profilId, recalculee);

  const lignes = base
    .prepare(
      `SELECT region_code, ouverte, pourcentage_colorie, eclat_obtenu_le
       FROM progression_region WHERE profil_id = ?`
    )
    .all(profilId) as unknown as LigneRegion[];
  const parCode = new Map(lignes.map((ligne) => [String(ligne.region_code), ligne]));

  return {
    ouvertesEnParallele: recalculee.ouvertesEnParallele,
    regions: recalculee.regions.map((region) => {
      const ligne = parCode.get(String(region.region));
      if (ligne === undefined) {
        return region;
      }
      return {
        ...region,
        ouverte: Number(ligne.ouverte) === 1,
        pourcentageColorie: Math.max(region.pourcentageColorie, Number(ligne.pourcentage_colorie)),
        eclatObtenuLe:
          region.eclatObtenuLe ??
          (ligne.eclat_obtenu_le === null ? null : (String(ligne.eclat_obtenu_le) as Horodatage))
      };
    })
  };
}

// ─────────────────────────────────────────────────────────────────── Gobi

/** Les formes obtenues, jointes au referentiel pour retrouver leur cristal et leur libelle. */
export function lireFormes(
  base: DatabaseSync,
  profilId: string,
  referentiel: ReferentielMonde,
): readonly FormeGobi[] {
  const lignes = base
    .prepare('SELECT grapheme_code, obtenue_le FROM formes_gobi WHERE profil_id = ? ORDER BY obtenue_le, grapheme_code')
    .all(profilId) as unknown as LigneForme[];
  const declarees = new Map(referentiel.formes.map((forme) => [forme.grapheme, forme]));

  return lignes.map((ligne) => {
    const grapheme = String(ligne.grapheme_code);
    const declaree = declarees.get(grapheme);
    return {
      grapheme,
      libelle: declaree?.libelle ?? `Gobi-${grapheme.toUpperCase()}`,
      cristal: declaree?.cristal ?? 'assets/gobi/cristal-base.svg',
      obtenueLe: String(ligne.obtenue_le) as Horodatage
    };
  });
}

/** Ecrit le stade en MAX de rang. C'est ici que « l'evolution est irreversible » devient du SQL. */
function ecrireStade(
  base: DatabaseSync,
  profilId: string,
  gobi: EtatGobi,
  referentiel: ReferentielMonde,
  quand: string,
): EtatGobi {
  const code = stadeApresFormes(gobi, referentiel.stades);
  const stade = referentiel.stades.find((entree) => entree.code === code);
  if (stade === undefined) {
    return gobi;
  }

  base
    .prepare(
      `INSERT INTO stade_gobi (profil_id, stade_code, rang, atteint_le)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (profil_id) DO UPDATE SET
         stade_code = CASE WHEN excluded.rang > stade_gobi.rang
                           THEN excluded.stade_code ELSE stade_gobi.stade_code END,
         rang       = MAX(stade_gobi.rang, excluded.rang),
         atteint_le = CASE WHEN excluded.rang > stade_gobi.rang
                           THEN excluded.atteint_le ELSE stade_gobi.atteint_le END`
    )
    .run(profilId, stade.code, stade.rang, quand);

  const ligne = base
    .prepare('SELECT stade_code FROM stade_gobi WHERE profil_id = ?')
    .get(profilId) as unknown as { readonly stade_code: string } | undefined;

  return { ...gobi, stade: (ligne?.stade_code ?? stade.code) as EtatGobi['stade'] };
}

/** L'etat de Gobi pour ce profil, stade recalcule et ecrit. */
export function lireGobi(
  base: DatabaseSync,
  profilId: string,
  referentiel: ReferentielMonde,
  horloge: Horloge,
): EtatGobi {
  const ligne = base
    .prepare('SELECT stade_code FROM stade_gobi WHERE profil_id = ?')
    .get(profilId) as unknown as { readonly stade_code: string } | undefined;

  const depart = gobiInitial(referentiel.stades);
  const gobi: EtatGobi = {
    ...depart,
    stade: (ligne?.stade_code ?? depart.stade) as EtatGobi['stade'],
    formes: lireFormes(base, profilId, referentiel)
  };

  return ecrireStade(base, profilId, gobi, referentiel, String(horodatage(horloge)));
}

/**
 * Journalise une forme obtenue. Idempotent : un graphème deja obtenu garde sa premiere date.
 *
 * C'est le point d'entree du palier intermediaire de D25 (« tous les ~5 : une forme de Gobi »).
 * Il est expose au depot et non a une route : aucune route n'en donne encore, et en inventer une
 * qui n'est pas au § 5.3 du contrat serait un fichier de plus que personne n'a demande.
 */
export function enregistrerFormeGobi(
  base: DatabaseSync,
  profilId: string,
  grapheme: string,
  referentiel: ReferentielMonde,
  horloge: Horloge,
): EtatGobi {
  const quand = String(horodatage(horloge));
  base
    .prepare(
      `INSERT INTO formes_gobi (profil_id, grapheme_code, obtenue_le) VALUES (?, ?, ?)
       ON CONFLICT (profil_id, grapheme_code) DO NOTHING`
    )
    .run(profilId, grapheme, quand);

  const declaree = referentiel.formes.find((forme) => forme.grapheme === grapheme);
  const courant: EtatGobi = {
    ...gobiInitial(referentiel.stades),
    stade: lireGobi(base, profilId, referentiel, horloge).stade,
    formes: lireFormes(base, profilId, referentiel)
  };

  const apres =
    declaree === undefined
      ? courant
      : ajouterForme(courant, declaree, quand as Horodatage, referentiel.stades);

  return ecrireStade(base, profilId, apres, referentiel, quand);
}

// ────────────────────────────────────────────────────── compagnons et campement

export function lireCompagnons(
  base: DatabaseSync,
  profilId: string,
  referentiel: ReferentielMonde,
): readonly Compagnon[] {
  const lignes = base
    .prepare('SELECT code, rallie_le FROM compagnons WHERE profil_id = ?')
    .all(profilId) as unknown as LigneCompagnon[];
  const rallies = new Map<CodeCompagnon, Horodatage>(
    lignes.map((ligne) => [String(ligne.code) as CodeCompagnon, String(ligne.rallie_le) as Horodatage])
  );
  return compagnonsDuProfil(referentiel.compagnons, rallies);
}

/**
 * Les objets du campement : ceux qui sont DECLARES, avec leur date de depot quand ils y sont.
 *
 * Un objet non rapporte n'est pas cache — il est visible et vide, comme le reste du monde en
 * Grisaille. « Un monde a moitie colorie appelle qu'on le termine » (v2 § 3.2).
 */
export function lireCampement(
  base: DatabaseSync,
  profilId: string,
  referentiel: ReferentielMonde,
): readonly ObjetCampement[] {
  const lignes = base
    .prepare('SELECT objet_code, place_le FROM campement WHERE profil_id = ?')
    .all(profilId) as unknown as LigneObjet[];
  const poses = new Map(
    lignes.map((ligne) => [String(ligne.objet_code), String(ligne.place_le) as Horodatage])
  );

  return referentiel.campement.objets.map((objet) => ({
    code: objet.code,
    libelle: objet.libelle,
    asset: objet.asset,
    region: objet.region as CodeRegion,
    placeLe: poses.get(String(objet.code)) ?? null
  }));
}

/** Vrai si le referentiel connait cet objet. Une route ne pose jamais un objet inconnu. */
export function objetConnu(referentiel: ReferentielMonde, code: string): boolean {
  return referentiel.campement.objets.some((objet) => String(objet.code) === code);
}

/**
 * Pose un objet au campement. Idempotent : la PREMIERE date de depot fait foi, un second appel
 * ne la reecrit pas — un acquis n'est jamais repris (R14).
 */
export function poserObjetCampement(
  base: DatabaseSync,
  profilId: string,
  code: string,
  horloge: Horloge,
): void {
  base
    .prepare(
      `INSERT INTO campement (profil_id, objet_code, place_le) VALUES (?, ?, ?)
       ON CONFLICT (profil_id, objet_code) DO NOTHING`
    )
    .run(profilId, code, String(horodatage(horloge)));
}

/** Compte une visite sur un point d'interaction. Sert a varier les reactions, jamais a noter. */
export function noterVisitePoint(
  base: DatabaseSync,
  profilId: string,
  point: string,
  horloge: Horloge,
): void {
  base
    .prepare(
      `INSERT INTO points_visites (profil_id, point_code, nb_visites, derniere_le)
       VALUES (?, ?, 1, ?)
       ON CONFLICT (profil_id, point_code) DO UPDATE SET
         nb_visites  = points_visites.nb_visites + 1,
         derniere_le = excluded.derniere_le`
    )
    .run(profilId, point, String(horodatage(horloge)));
}

// ─────────────────────────────────────────────────────────────────── le monde entier

/** `EtatMonde` complet : c'est exactement ce que rend `GET /api/profils/:id/monde`. */
export function lireMonde(
  base: DatabaseSync,
  profilId: string,
  referentiel: ReferentielMonde,
  horloge: Horloge,
): EtatMonde {
  return {
    carte: lireCarte(base, profilId, referentiel),
    gobi: lireGobi(base, profilId, referentiel, horloge),
    compagnons: lireCompagnons(base, profilId, referentiel),
    campement: lireCampement(base, profilId, referentiel)
  };
}
