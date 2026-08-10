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
 * RÈGLE H1 — `pourcentage_colorie` EST UN CACHE, PAS UN ACQUIS :
 *
 * | colonne               | nature | ecriture                    | peut-elle baisser ? |
 * |-----------------------|--------|-----------------------------|---------------------|
 * | `pourcentage_colorie` | CACHE  | affectation directe          | OUI — c'est le recalcul |
 * | `eclat_obtenu_le`     | ACQUIS | `COALESCE(ancien, nouveau)` | jamais (R14)        |
 * | `ouverte`             | ACQUIS | `MAX(ancien, nouveau)`      | jamais (R14)        |
 *
 * UNE SEULE ECRITURE RESTE MONOTONE PAR MAX DE RANG (R14) : `stade_gobi` en
 * `MAX(rang_ancien, rang_nouveau)`.
 *
 * Porté sur le contrat `Base` — Docs/addendum-portage-android.md § 4. Le REFERENTIEL (six
 * regions, stades, compagnons, campement) n'est pas en base — c'est du contenu, il vit dans
 * `contenu/monde/*.json`. Son CHARGEMENT (`node:fs`) est sorti de ce fichier — voir
 * `serveur/src/referentiels/monde.ts` — et `ReferentielMonde` arrive en PARAMÈTRE partout où
 * il l'était déjà : ce fichier ne l'a jamais chargé lui-même, à l'exception de
 * `reparerProgressionRegion`, dont la valeur par défaut disparaît ci-dessous (une IO en valeur
 * par défaut n'est pas portable).
 */

import type { CodeRegion, Horodatage } from '../../identifiants.js';
import type { CodeCompagnon } from '../../pedagogie/types.js';
import type {
  Compagnon, EtatCarte, EtatGobi, EtatMonde, EtatRegion, FormeGobi, ObjetCampement, StadeGobi,
} from '../../monde/types.js';
import type { EtatOuverture } from '../../ouverture/types.js';
import { OUVERTURE_JAMAIS_VUE } from '../../ouverture/index.js';
import {
  ajouterForme, formeActiveDe, gobiInitial, stadeApresFormes,
} from '../../monde/gobi.js';
import type { FormeDeclaree } from '../../monde/gobi.js';
import type { DocumentCampement } from '../../monde/campement.js';
import {
  appliquerEclat, carteInitiale, ouvrirCeQuiDoitLEtre, recalculerRecoloration,
} from '../../monde/carte.js';
import type { DefinitionRegion } from '../../monde/carte.js';
import { compagnonParRegion, compagnonsDuProfil } from '../../monde/compagnons.js';
import type { DefinitionCompagnon } from '../../monde/compagnons.js';
import type { Horloge } from '../../horloge.js';
import type { Base } from '../contrat.js';

/** Tout ce que `contenu/monde/` declare, deja lu et valide — le chargement est ailleurs. */
export interface ReferentielMonde {
  readonly regions: readonly DefinitionRegion[];
  readonly ouvertesEnParallele: number;
  readonly stades: readonly StadeGobi[];
  readonly formes: readonly FormeDeclaree[];
  readonly compagnons: readonly DefinitionCompagnon[];
  readonly campement: DocumentCampement;
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
async function noeudsTermines(base: Base, profilId: string): Promise<readonly string[]> {
  const lignes = await base.lignes<{ noeud_id: string }>(
    'SELECT noeud_id FROM progression_noeud WHERE profil_id = ?',
    [profilId]
  );
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
 */
export async function carteRecalculee(
  base: Base,
  profilId: string,
  referentiel: ReferentielMonde,
): Promise<EtatCarte> {
  const termines = await noeudsTermines(base, profilId);
  const compagnons = compagnonParRegion(referentiel.compagnons);
  const neuve = carteInitiale(referentiel.regions, referentiel.ouvertesEnParallele, compagnons);

  const recoloriees: EtatRegion[] = neuve.regions.map((region) => {
    const peinte = recalculerRecoloration(region, termines);
    return peinte.pourcentageColorie > 0 ? { ...peinte, ouverte: true } : peinte;
  });

  const datesLignes = await base.lignes<{ noeud_id: string; dernier_le: string }>(
    'SELECT noeud_id, dernier_le FROM progression_noeud WHERE profil_id = ?',
    [profilId]
  );
  const datesParNoeud = new Map(
    datesLignes.map((ligne) => [String(ligne.noeud_id), String(ligne.dernier_le)])
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

/**
 * Ecrit la projection `progression_region` — voir la table de nature en tete de fichier.
 */
export async function ecrireProgressionRegion(base: Base, profilId: string, carte: EtatCarte): Promise<void> {
  const sql = `INSERT INTO progression_region
       (profil_id, region_code, ouverte, pourcentage_colorie, eclat_obtenu_le)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (profil_id, region_code) DO UPDATE SET
       ouverte             = MAX(progression_region.ouverte, excluded.ouverte),
       pourcentage_colorie = excluded.pourcentage_colorie,
       eclat_obtenu_le     = COALESCE(progression_region.eclat_obtenu_le,
                                      excluded.eclat_obtenu_le)`;
  for (const region of carte.regions) {
    await base.lancer(sql, [
      profilId,
      String(region.region),
      region.ouverte ? 1 : 0,
      region.pourcentageColorie,
      region.eclatObtenuLe
    ]);
  }
}

/** Relit la carte depuis la projection, apres l'avoir recalculee et ecrite. */
export async function lireCarte(base: Base, profilId: string, referentiel: ReferentielMonde): Promise<EtatCarte> {
  const recalculee = await carteRecalculee(base, profilId, referentiel);
  await ecrireProgressionRegion(base, profilId, recalculee);

  const lignes = await base.lignes<LigneRegion>(
    `SELECT region_code, ouverte, pourcentage_colorie, eclat_obtenu_le
     FROM progression_region WHERE profil_id = ?`,
    [profilId]
  );
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
        pourcentageColorie: region.pourcentageColorie,
        eclatObtenuLe:
          region.eclatObtenuLe ??
          (ligne.eclat_obtenu_le === null ? null : (String(ligne.eclat_obtenu_le) as Horodatage))
      };
    })
  };
}

/**
 * La migration de reparation H1 : invalide le cache de pourcentage puis le fait recalculer par
 * `lireCarte`. `referentiel` est desormais REQUIS — le charger par defaut ferait une IO cachee
 * dans une signature qui doit rester portable.
 */
export async function reparerProgressionRegion(base: Base, referentiel: ReferentielMonde): Promise<number> {
  const lignes = await base.lignes<{ id: string }>('SELECT id FROM profils ORDER BY id');
  for (const ligne of lignes) {
    await lireCarte(base, String(ligne.id), referentiel);
  }
  return lignes.length;
}

// ─────────────────────────────────────────────────────────────────── Gobi

/** Les formes obtenues, jointes au referentiel pour retrouver leur cristal et leur libelle. */
export async function lireFormes(base: Base, profilId: string, referentiel: ReferentielMonde): Promise<readonly FormeGobi[]> {
  const lignes = await base.lignes<LigneForme>(
    'SELECT grapheme_code, obtenue_le FROM formes_gobi WHERE profil_id = ? ORDER BY obtenue_le, grapheme_code',
    [profilId]
  );
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
async function ecrireStade(
  base: Base,
  profilId: string,
  gobi: EtatGobi,
  referentiel: ReferentielMonde,
  quand: string,
): Promise<EtatGobi> {
  const code = stadeApresFormes(gobi, referentiel.stades);
  const stade = referentiel.stades.find((entree) => entree.code === code);
  if (stade === undefined) {
    return gobi;
  }

  await base.lancer(
    `INSERT INTO stade_gobi (profil_id, stade_code, rang, atteint_le)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (profil_id) DO UPDATE SET
       stade_code = CASE WHEN excluded.rang > stade_gobi.rang
                         THEN excluded.stade_code ELSE stade_gobi.stade_code END,
       rang       = MAX(stade_gobi.rang, excluded.rang),
       atteint_le = CASE WHEN excluded.rang > stade_gobi.rang
                         THEN excluded.atteint_le ELSE stade_gobi.atteint_le END`,
    [profilId, stade.code, stade.rang, quand]
  );

  const ligne = await base.uneLigne<{ stade_code: string }>(
    'SELECT stade_code FROM stade_gobi WHERE profil_id = ?',
    [profilId]
  );

  return { ...gobi, stade: (ligne?.stade_code ?? stade.code) as EtatGobi['stade'] };
}

/** L'etat de Gobi pour ce profil, stade recalcule et ecrit. */
export async function lireGobi(
  base: Base,
  profilId: string,
  referentiel: ReferentielMonde,
  horloge: Horloge,
): Promise<EtatGobi> {
  const ligne = await base.uneLigne<{ stade_code: string }>(
    'SELECT stade_code FROM stade_gobi WHERE profil_id = ?',
    [profilId]
  );

  const depart = gobiInitial(referentiel.stades);
  const formes = await lireFormes(base, profilId, referentiel);
  const gobi: EtatGobi = {
    ...depart,
    stade: (ligne?.stade_code ?? depart.stade) as EtatGobi['stade'],
    formes,
    formeActive: formeActiveDe(formes)
  };

  return ecrireStade(base, profilId, gobi, referentiel, String(horloge.maintenant()));
}

/**
 * Journalise une forme obtenue. Idempotent : un graphème deja obtenu garde sa premiere date.
 */
export async function enregistrerFormeGobi(
  base: Base,
  profilId: string,
  grapheme: string,
  referentiel: ReferentielMonde,
  horloge: Horloge,
): Promise<EtatGobi> {
  const quand = String(horloge.maintenant());
  await base.lancer(
    `INSERT INTO formes_gobi (profil_id, grapheme_code, obtenue_le) VALUES (?, ?, ?)
     ON CONFLICT (profil_id, grapheme_code) DO NOTHING`,
    [profilId, grapheme, quand]
  );

  const declaree = referentiel.formes.find((forme) => forme.grapheme === grapheme);
  const formesActuelles = await lireFormes(base, profilId, referentiel);
  const courant: EtatGobi = {
    ...gobiInitial(referentiel.stades),
    stade: (await lireGobi(base, profilId, referentiel, horloge)).stade,
    formes: formesActuelles,
    formeActive: formeActiveDe(formesActuelles)
  };

  const apres =
    declaree === undefined
      ? courant
      : ajouterForme(courant, declaree, quand as Horodatage, referentiel.stades);

  return ecrireStade(base, profilId, apres, referentiel, quand);
}

// ────────────────────────────────────────────────────── compagnons et campement

export async function lireCompagnons(base: Base, profilId: string, referentiel: ReferentielMonde): Promise<readonly Compagnon[]> {
  const lignes = await base.lignes<LigneCompagnon>(
    'SELECT code, rallie_le FROM compagnons WHERE profil_id = ?',
    [profilId]
  );
  const rallies = new Map<CodeCompagnon, Horodatage>(
    lignes.map((ligne) => [String(ligne.code) as CodeCompagnon, String(ligne.rallie_le) as Horodatage])
  );
  return compagnonsDuProfil(referentiel.compagnons, rallies);
}

/** Les objets du campement : ceux qui sont DECLARES, avec leur date de depot quand ils y sont. */
export async function lireCampement(base: Base, profilId: string, referentiel: ReferentielMonde): Promise<readonly ObjetCampement[]> {
  const lignes = await base.lignes<LigneObjet>(
    'SELECT objet_code, place_le FROM campement WHERE profil_id = ?',
    [profilId]
  );
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

/** Vrai si le referentiel connait ce point d'interaction. Meme garde-fou que `objetConnu`. */
export function pointConnu(referentiel: ReferentielMonde, id: string): boolean {
  return referentiel.campement.points.some((point) => String(point.id) === id);
}

/** Pose un objet au campement. Idempotent : la PREMIERE date de depot fait foi (R14). */
export async function poserObjetCampement(base: Base, profilId: string, code: string, horloge: Horloge): Promise<void> {
  await base.lancer(
    `INSERT INTO campement (profil_id, objet_code, place_le) VALUES (?, ?, ?)
     ON CONFLICT (profil_id, objet_code) DO NOTHING`,
    [profilId, code, String(horloge.maintenant())]
  );
}

// ──────────────────────────────────────────────────── la sequence d'ouverture (N4, D35)

interface LigneOuverture {
  readonly vue_le: string;
  readonly passee: number;
  readonly nb_rejeux: number;
}

/** Ce que le serveur sait de la sequence d'ouverture pour ce profil. */
export async function lireOuverture(base: Base, profilId: string): Promise<EtatOuverture> {
  const ligne = await base.uneLigne<LigneOuverture>(
    'SELECT vue_le, passee, nb_rejeux FROM ouverture_vue WHERE profil_id = ?',
    [profilId]
  );
  if (ligne === undefined) {
    return OUVERTURE_JAMAIS_VUE;
  }
  return {
    vue: true,
    passee: Number(ligne.passee) === 1,
    nbRejeux: Number(ligne.nb_rejeux)
  };
}

/** Enregistre que la sequence a ete vue. Idempotent au sens de R14 (voir en-tete du fichier). */
export async function enregistrerOuvertureVue(
  base: Base,
  profilId: string,
  passee: boolean,
  horloge: Horloge,
): Promise<EtatOuverture> {
  await base.lancer(
    `INSERT INTO ouverture_vue (profil_id, vue_le, passee, nb_rejeux)
     VALUES (?, ?, ?, 0)
     ON CONFLICT (profil_id) DO UPDATE SET
       passee    = MIN(ouverture_vue.passee, excluded.passee),
       nb_rejeux = ouverture_vue.nb_rejeux + 1`,
    [profilId, String(horloge.maintenant()), passee ? 1 : 0]
  );

  return lireOuverture(base, profilId);
}

/** Compte une visite sur un point d'interaction. Sert a varier les reactions, jamais a noter. */
export async function noterVisitePoint(base: Base, profilId: string, point: string, horloge: Horloge): Promise<void> {
  await base.lancer(
    `INSERT INTO points_visites (profil_id, point_code, nb_visites, derniere_le)
     VALUES (?, ?, 1, ?)
     ON CONFLICT (profil_id, point_code) DO UPDATE SET
       nb_visites  = points_visites.nb_visites + 1,
       derniere_le = excluded.derniere_le`,
    [profilId, point, String(horloge.maintenant())]
  );
}

// ─────────────────────────────────────────────────────────────────── le monde entier

/** `EtatMonde` complet : c'est exactement ce que rend `GET /api/profils/:id/monde`. */
export async function lireMonde(base: Base, profilId: string, referentiel: ReferentielMonde, horloge: Horloge): Promise<EtatMonde> {
  return {
    carte: await lireCarte(base, profilId, referentiel),
    gobi: await lireGobi(base, profilId, referentiel, horloge),
    compagnons: await lireCompagnons(base, profilId, referentiel),
    campement: await lireCampement(base, profilId, referentiel)
  };
}
