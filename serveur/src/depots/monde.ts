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
 * ════════════════════════════════════════════════════════════════════════════════════════════
 * H1 — `pourcentage_colorie` EST UN CACHE, PAS UN ACQUIS. Ce fichier disait le contraire.
 *
 * L'en-tete affirmait « `progression_region.pourcentage_colorie` en MAX(ancien, nouveau) », et
 * `lireCarte` doublait ce MAX SQL d'un `Math.max` en JavaScript. Le recalcul etait donc fait
 * puis JETE : la valeur stockee gagnait toujours. La table n'etait pas une projection, c'etait
 * une seconde source de verite, plus collante que le journal.
 *
 * Ce que cela a coute, mesure sur `donnees/pierre.db`, profil reel `prf-0fbbeba7fb27d3f7` :
 *
 *     progression_region : clairiere pourcentage_colorie = 1 · galeries pourcentage_colorie = 1
 *     progression_noeud  : 3 nœuds termines sur les 18 livres
 *
 * Les deux regions se croyaient terminees a 100 % avec 3 nœuds joues sur 18, parce que le
 * pourcentage avait ete fige quand chaque region n'en declarait qu'un ou deux. Consequence :
 * plus aucun monde cliquable sur la carte.
 *
 * LA REGLE, DESORMAIS — une colonne, une nature, et elles ne se melangent plus :
 *
 * | colonne               | nature | ecriture                    | peut-elle baisser ? |
 * |-----------------------|--------|-----------------------------|---------------------|
 * | `pourcentage_colorie` | CACHE  | affectation directe          | OUI — c'est le recalcul |
 * | `eclat_obtenu_le`     | ACQUIS | `COALESCE(ancien, nouveau)` | jamais (R14)        |
 * | `ouverte`             | ACQUIS | `MAX(ancien, nouveau)`      | jamais (R14)        |
 *
 * Un Eclat gagne reste gagne meme si la region compte desormais plus de nœuds ; c'est le
 * POURCENTAGE qui se recalcule. Et `enCours` (@pierre/partage/monde) ne se fonde plus sur
 * l'Eclat mais sur la recoloration, sans quoi une region close hier resterait close pour
 * toujours avec seize nœuds neufs dedans.
 *
 * `tests/api/progression-vecue.test.ts` rejoue la SEQUENCE : jouer sous un catalogue amputé,
 * faire grandir le catalogue, relire la carte.
 * ════════════════════════════════════════════════════════════════════════════════════════════
 *
 * UNE SEULE ECRITURE RESTE MONOTONE PAR MAX DE RANG, et elle ne l'est pas negociable (R14) :
 * `stade_gobi` en `MAX(rang_ancien, rang_nouveau)`.
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
import { OUVERTURE_JAMAIS_VUE } from '@pierre/partage/ouverture';
import type { EtatOuverture } from '@pierre/partage/ouverture';
import {
  ajouterForme,
  appliquerEclat,
  campementDuDocument,
  carteInitiale,
  compagnonParRegion,
  compagnonsDuDocument,
  compagnonsDuProfil,
  formeActiveDe,
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

  // Une region ou l'enfant a DEJA termine un nœud reste ouverte, quoi qu'il arrive ensuite au
  // referentiel. `ouvrirCeQuiDoitLEtre` n'ouvre que par la fenetre de parallelisme ; si un jour
  // le contenu se reordonne, cette ligne garantit qu'on ne referme pas sous les doigts de
  // l'enfant une region ou il a joue. Elle ne peut RIEN fermer : c'est un `||`.
  const recoloriees: EtatRegion[] = neuve.regions.map((region) => {
    const peinte = recalculerRecoloration(region, termines);
    return peinte.pourcentageColorie > 0 ? { ...peinte, ouverte: true } : peinte;
  });

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

/**
 * Ecrit la projection `progression_region`.
 *
 * Trois colonnes, deux natures — voir la table de l'en-tete de ce fichier :
 *   * `ouverte` et `eclat_obtenu_le` sont des ACQUIS : MAX et COALESCE, ils ne baissent jamais ;
 *   * `pourcentage_colorie` est un CACHE : **affectation directe**, il vaut toujours ce que le
 *     recalcul vient de rendre depuis `progression_noeud` et le contenu COURANT.
 *
 * Le `MAX` qui etait ici figeait la valeur du jour ou elle avait ete ecrite. Seize nœuds
 * ajoutes plus tard ne pouvaient plus la faire bouger, et deux regions restaient a 100 % avec
 * trois nœuds joues sur dix-huit.
 */
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
       pourcentage_colorie = excluded.pourcentage_colorie,
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

/**
 * Relit la carte depuis la projection, apres l'avoir recalculee et ecrite.
 *
 * Le RECALCUL fait foi pour le pourcentage ; la projection ne sert plus qu'a rapporter les deux
 * ACQUIS que le journal seul ne sait pas reproduire — l'ouverture d'une region et la date de son
 * Eclat, qui dependent du catalogue tel qu'il etait ce jour-la.
 *
 * Le `Math.max(recalcul, valeur stockee)` qui etait ici annulait le recalcul chaque fois qu'il
 * rendait moins. C'etait la seconde moitie du defaut H1 : meme le MAX SQL retire, cette ligne
 * seule aurait suffi a maintenir 100 % sur une region de trois nœuds joues sur dix-huit.
 */
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
        // CACHE : la valeur qui vient d'etre recalculee, sans arbitrage avec la stockee.
        pourcentageColorie: region.pourcentageColorie,
        eclatObtenuLe:
          region.eclatObtenuLe ??
          (ligne.eclat_obtenu_le === null ? null : (String(ligne.eclat_obtenu_le) as Horodatage))
      };
    })
  };
}

/**
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LA MIGRATION DE REPARATION — H1.
 *
 * `serveur/migrations/010_recalcul-progression-region.sql` INVALIDE le cache (elle met le
 * pourcentage a 0 pour tous les profils) ; elle ne peut pas faire mieux, parce que le
 * denominateur d'une region — sa liste `noeuds` — vit dans `contenu/monde/regions.json` et
 * qu'aucun ordre SQL ne lit un fichier JSON.
 *
 * C'est donc ici que la reparation se termine, et il faut qu'elle se termine quelque part :
 * `serveur/src/services/indicateurs.ts` lit `progression_region.pourcentage_colorie` DIRECTEMENT
 * pour le tableau de bord du parent, sans passer par `lireCarte`. Sans cet appel, un parent qui
 * ouvre sa page avant que l'enfant n'ouvre la carte lirait 0 % partout.
 *
 * `serveur/src/index.ts` l'appelle une fois, apres les migrations et avant d'ecouter.
 *
 * IDEMPOTENT et SANS PERTE : elle passe par `lireCarte`, donc par les memes ecritures que
 * n'importe quelle lecture de carte — les Eclats et les ouvertures sont preserves par COALESCE
 * et MAX, et aucune etoile n'est touchee (`progression_noeud` n'est ni lue en ecriture ni
 * effacee ici). Rend le nombre de profils traites.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
export function reparerProgressionRegion(
  base: DatabaseSync,
  referentiel: ReferentielMonde = chargerReferentielMonde(),
): number {
  const lignes = base.prepare('SELECT id FROM profils ORDER BY id').all() as unknown as {
    readonly id: string;
  }[];
  for (const ligne of lignes) {
    lireCarte(base, String(ligne.id), referentiel);
  }
  return lignes.length;
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

/**
 * L'etat de Gobi pour ce profil, stade recalcule et ecrit.
 *
 * `formeActive` est une PROJECTION, exactement comme `stade` : recalculee depuis `formes` a
 * chaque lecture, jamais stockee. Avant ce lot, ce champ ne valait jamais que `null`
 * (`Docs/decision-aide-de-gobi.md`) — Gobi ne portait donc jamais le cristal que l'enfant venait
 * de gagner. `formeActiveDe` (partage/monde/gobi.ts) retient la forme la plus RECENTE ; aucune
 * colonne de plus n'est necessaire, `formes_gobi.obtenue_le` porte deja toute l'information.
 */
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
  const formes = lireFormes(base, profilId, referentiel);
  const gobi: EtatGobi = {
    ...depart,
    stade: (ligne?.stade_code ?? depart.stade) as EtatGobi['stade'],
    formes,
    formeActive: formeActiveDe(formes)
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
  const formesActuelles = lireFormes(base, profilId, referentiel);
  const courant: EtatGobi = {
    ...gobiInitial(referentiel.stades),
    stade: lireGobi(base, profilId, referentiel, horloge).stade,
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

// ──────────────────────────────────────────────────── la sequence d'ouverture (N4, D35)

interface LigneOuverture {
  readonly vue_le: string;
  readonly passee: number;
  readonly nb_rejeux: number;
}

/**
 * Ce que le serveur sait de la sequence d'ouverture pour ce profil.
 *
 * Aucune ligne = jamais vue, et c'est l'etat de depart de tout profil neuf. On ne cree PAS de
 * ligne a la creation du profil : une table dont l'absence de ligne a un sens est plus simple
 * a relire qu'une table peuplee de zeros, et elle donne le meme resultat.
 */
export function lireOuverture(base: DatabaseSync, profilId: string): EtatOuverture {
  const ligne = base
    .prepare('SELECT vue_le, passee, nb_rejeux FROM ouverture_vue WHERE profil_id = ?')
    .get(profilId) as unknown as LigneOuverture | undefined;

  if (ligne === undefined) {
    return OUVERTURE_JAMAIS_VUE;
  }
  return {
    vue: true,
    passee: Number(ligne.passee) === 1,
    nbRejeux: Number(ligne.nb_rejeux)
  };
}

/**
 * Enregistre que la sequence a ete vue. Idempotent au sens de R14 : **un acquis n'est jamais
 * repris**.
 *
 * Trois proprietes, et chacune corrige une facon de mentir au parent :
 *
 *   1. `vue_le` garde sa PREMIERE date. Rejouer le recit n'efface pas le jour ou l'enfant l'a
 *      decouvert.
 *   2. `passee` ne repasse JAMAIS de 0 a 1. Un enfant qui a regarde l'histoire en entier une
 *      fois l'a vue, meme s'il la saute les fois suivantes — c'est la question a laquelle le
 *      parent veut une reponse (« l'a-t-il vue ? »), et `MIN` la garde juste.
 *   3. `nb_rejeux` compte les passages AU-DELA du premier. Un enfant qui y revient seul est le
 *      signal que D35 esperait ; il merite d'etre compte, pas ecrase.
 */
export function enregistrerOuvertureVue(
  base: DatabaseSync,
  profilId: string,
  passee: boolean,
  horloge: Horloge,
): EtatOuverture {
  base
    .prepare(
      `INSERT INTO ouverture_vue (profil_id, vue_le, passee, nb_rejeux)
       VALUES (?, ?, ?, 0)
       ON CONFLICT (profil_id) DO UPDATE SET
         passee    = MIN(ouverture_vue.passee, excluded.passee),
         nb_rejeux = ouverture_vue.nb_rejeux + 1`
    )
    .run(profilId, String(horodatage(horloge)), passee ? 1 : 0);

  return lireOuverture(base, profilId);
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
