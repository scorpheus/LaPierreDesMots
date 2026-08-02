/**
 * LE LOGICIEL VÉCU, PAS LE LOGICIEL NEUF — lot H1.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER REPRODUIT, ET POURQUOI AUCUNE AUTRE SUITE NE POUVAIT LE VOIR
 *
 * Toute la QA de ce dépôt monte une base VIERGE, joue, vérifie, jette. Elle ne rencontre donc
 * jamais un profil dont l'état a été écrit par une version ANTÉRIEURE du contenu — c'est-à-dire
 * la situation de tout joueur au bout de deux semaines.
 *
 * Le père l'a rencontrée. Profil réel `prf-0fbbeba7fb27d3f7`, mesuré dans `donnees/pierre.db` :
 *
 *     progression_region : clairiere  pourcentage_colorie = 1  eclat_obtenu_le renseigné
 *                          galeries   pourcentage_colorie = 1  eclat_obtenu_le renseigné
 *     progression_noeud  : 3 nœuds terminés — clairiere-01, galeries-01, galeries-02
 *     contenu livré      : 18 nœuds — clairiere 6, galeries 12
 *
 * Les deux régions se croyaient terminées à 100 % avec 3 nœuds sur 18 joués. Conséquence pour
 * l'enfant : **plus aucun monde cliquable sur la carte**, parce que `regionsOuvertes` ne
 * propose pas une région dont l'Éclat est posé, et que les deux régions suivantes ne portent
 * aucun nœud livré.
 *
 * ── CE FICHIER TESTE UNE SÉQUENCE, PAS UN ÉTAT ────────────────────────────────────────────
 * Écrire l'état fautif à la main en base prouverait seulement qu'on sait réparer ce qu'on
 * vient d'écrire. On rejoue donc la SÉQUENCE réelle, avec le seul mécanisme qui l'a produite :
 *
 *   1. le serveur tourne sur un référentiel de régions AMPUTÉ — la Clairière n'a qu'un nœud,
 *      les Galeries en ont deux, exactement l'état de `contenu/monde/regions.json` du jour où
 *      les Éclats ont été posés ;
 *   2. l'enfant joue ces trois nœuds, obtient ses deux Éclats — légitimement ;
 *   3. **le catalogue grandit** : le MÊME serveur, la MÊME base, le référentiel COURANT lu sur
 *      disque (6 + 12 nœuds) ;
 *   4. on relit la carte.
 *
 * ── LA SOURCE QUI FAIT FOI EST LUE, JAMAIS RECALCULÉE ─────────────────────────────────────
 * Le référentiel courant vient de `chargerReferentielMonde()`, donc de
 * `contenu/monde/regions.json`. Aucun compte de nœuds n'est écrit en littéral ici : les
 * dénominateurs attendus sont ceux du disque. Les tailles amputées (1 et 2), elles, SONT des
 * littéraux — ce sont les valeurs historiques mesurées sur la base du père, pas une donnée
 * courante.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';

import { regionsOuvertes } from '@pierre/partage/monde';
import type { EtatCarte } from '@pierre/partage';

import { chargerReferentielMonde, reparerProgressionRegion } from '@serveur/depots/monde';
import type { ReferentielMonde } from '@serveur/depots/monde';
import { enregistrerRoutesMonde } from '@serveur/routes/monde';
import { enregistrerRoutesProfils } from '@serveur/routes/profils';
import { enregistrerRoutesTentatives } from '@serveur/routes/tentatives';

import {
  DOSSIER_MIGRATIONS,
  INSTANT_DE_REFERENCE,
  RACINE_DEPOT,
  aleaDeTest,
  horlogeDeTest,
  lireJson
} from '../configuration/preparation.js';

/**
 * L'ÉTAT HISTORIQUE, mesuré sur `donnees/pierre.db` — combien de nœuds chaque région DÉCLARAIT
 * le jour où l'Éclat a été posé. Ce sont les seuls littéraux du fichier, et c'est voulu : une
 * valeur d'hier ne se lit pas dans le contenu d'aujourd'hui.
 */
const CATALOGUE_D_HIER: Readonly<Record<string, number>> = { clairiere: 1, galeries: 2 };

const TERMINE_LE = '2026-09-01T08:01:00Z';

let base: DatabaseSync;
let applicationHier: FastifyInstance;
let applicationAujourdHui: FastifyInstance;

const horloge = horlogeDeTest();

interface RegionLue {
  readonly region: string;
  readonly ordre: number;
  readonly ouverte: boolean;
  readonly pourcentageColorie: number;
  readonly eclatObtenuLe: string | null;
  readonly noeuds: readonly string[];
}
interface EtatMondeLu {
  readonly carte: {
    readonly ouvertesEnParallele: number;
    readonly regions: readonly RegionLue[];
  };
}

interface EtapeJouable {
  readonly noeud: string;
  readonly exercice: string;
  readonly moteur: string;
  readonly habillage: string;
}

// ────────────────────────────────────────────── le référentiel, courant puis rétrogradé

const REFERENTIEL_COURANT: ReferentielMonde = chargerReferentielMonde();

/**
 * Le référentiel tel qu'il était AVANT que le contenu ne grandisse.
 *
 * On tronque la liste `noeuds` déclarée, on ne la remplace pas : les nœuds d'hier sont les
 * PREMIERS de la liste d'aujourd'hui, comme dans le dépôt réel où les nœuds se sont ajoutés à
 * la suite. Toute autre troncature testerait une histoire qui n'a pas eu lieu.
 */
function referentielAmpute(
  source: ReferentielMonde,
  tailles: Readonly<Record<string, number>>
): ReferentielMonde {
  return {
    ...source,
    regions: source.regions.map((region) => {
      const taille = tailles[String(region.region)];
      return taille === undefined ? region : { ...region, noeuds: region.noeuds.slice(0, taille) };
    })
  };
}

const REFERENTIEL_D_HIER: ReferentielMonde = referentielAmpute(
  REFERENTIEL_COURANT,
  CATALOGUE_D_HIER
);

/** La liste `noeuds` COURANTE d'une région, lue sur disque via le référentiel. */
function noeudsCourants(code: string): readonly string[] {
  const region = REFERENTIEL_COURANT.regions.find((entree) => String(entree.region) === code);
  expect(region, `le référentiel courant ne déclare pas « ${code} »`).toBeDefined();
  return region!.noeuds.map(String);
}

// ────────────────────────────────────────────── de quoi journaliser une vraie tentative

function jeuParExercice(): ReadonlyMap<string, { moteur: string; habillage: string }> {
  const table = new Map<string, { moteur: string; habillage: string }>();
  const pile = [join(RACINE_DEPOT, 'contenu/exercices')];
  while (pile.length > 0) {
    const dossier = pile.pop()!;
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, entree.name);
      if (entree.isDirectory()) {
        pile.push(chemin);
        continue;
      }
      if (!entree.name.endsWith('.json')) continue;
      const exercice = lireJson<{ id: string; jeu: { moteur: string; habillage: string } }>(
        chemin.slice(RACINE_DEPOT.length).split('\\').join('/')
      );
      table.set(String(exercice.id), {
        moteur: String(exercice.jeu.moteur),
        habillage: String(exercice.jeu.habillage)
      });
    }
  }
  return table;
}

const JEUX = jeuParExercice();

function etapeDe(noeudId: string): EtapeJouable {
  const noeud = lireJson<{ id: string; exercice: string }>(`contenu/noeuds/${noeudId}.json`);
  const jeu = JEUX.get(String(noeud.exercice));
  expect(jeu, `le nœud ${noeudId} cite un exercice absent : ${noeud.exercice}`).toBeDefined();
  return {
    noeud: noeudId,
    exercice: String(noeud.exercice),
    moteur: jeu!.moteur,
    habillage: jeu!.habillage
  };
}

// ─────────────────────────────────────────────────────────────────────────── le montage

/**
 * Deux applications sur UNE SEULE base — c'est cela, « le catalogue a grandi ».
 *
 * `enregistrerRoutesMonde` reçoit son référentiel en argument (troisième paramètre, valeur par
 * défaut `chargerReferentielMonde()`). On monte donc deux serveurs qui ne diffèrent QUE par le
 * contenu qu'ils déclarent, sur la même base SQLite. C'est exactement ce que vit le père quand
 * il redémarre le serveur après avoir ajouté des nœuds : les données restent, le contenu change.
 */
beforeEach(async () => {
  const [{ ouvrirBase }, { appliquerMigrations }, factices] = await Promise.all([
    import('@serveur/base/connexion'),
    import('@serveur/base/migrations'),
    import('@pierre/partage/factices')
  ]);

  base = ouvrirBase(':memory:');
  appliquerMigrations(base, DOSSIER_MIGRATIONS, horloge);

  const contexte = {
    base,
    contenu: new factices.DepotContenuMemoire({}),
    horloge,
    alea: aleaDeTest()
  };

  applicationHier = Fastify({ logger: false });
  enregistrerRoutesProfils(applicationHier, contexte);
  enregistrerRoutesTentatives(applicationHier, contexte);
  enregistrerRoutesMonde(applicationHier, contexte, REFERENTIEL_D_HIER);
  await applicationHier.ready();

  applicationAujourdHui = Fastify({ logger: false });
  enregistrerRoutesMonde(applicationAujourdHui, contexte, REFERENTIEL_COURANT);
  await applicationAujourdHui.ready();
});

afterEach(async () => {
  await applicationHier.close();
  await applicationAujourdHui.close();
  base.close();
});

async function creerProfil(prenom = 'Ezékiel'): Promise<string> {
  const reponse = await applicationHier.inject({
    method: 'POST',
    url: '/api/profils',
    payload: {
      prenom,
      avatar: { forme: 'rond', couleur: 'lagon', accessoire: null },
      paletteVariante: 'clairiere'
    }
  });
  expect(reponse.statusCode).toBe(201);
  return (reponse.json() as { id: string }).id;
}

async function terminerNoeud(profilId: string, noeudId: string): Promise<void> {
  const { createHash } = await import('node:crypto');
  const etape = etapeDe(noeudId);
  const graine = 20260801;
  const reponse = await applicationHier.inject({
    method: 'POST',
    url: '/api/tentatives',
    payload: {
      cleIdempotence: createHash('sha256')
        .update([profilId, etape.noeud, String(graine)].join('|'))
        .digest('hex'),
      profil: profilId,
      noeud: etape.noeud,
      exercice: etape.exercice,
      moteur: etape.moteur,
      habillage: etape.habillage,
      graine,
      demarreLe: INSTANT_DE_REFERENCE,
      termineLe: TERMINE_LE,
      resume: { reussi: true, nbErreurs: 0, aideUtilisee: 'aucune', dureeMs: 60_000, etapes: [] }
    }
  });
  expect(reponse.statusCode, `tentative refusée sur ${noeudId}`).toBeLessThan(300);
}

async function carteDe(application: FastifyInstance, profilId: string): Promise<EtatCarte> {
  const reponse = await application.inject({
    method: 'GET',
    url: `/api/profils/${profilId}/monde`
  });
  expect(reponse.statusCode).toBe(200);
  return (reponse.json() as EtatMondeLu).carte as unknown as EtatCarte;
}

function region(carte: EtatCarte, code: string): RegionLue {
  const trouvee = carte.regions.find((entree) => String(entree.region) === code);
  expect(trouvee, `la carte doit porter la région ${code}`).toBeDefined();
  return trouvee as unknown as RegionLue;
}

/** La séquence complète : trois nœuds joués sous le catalogue d'hier. */
async function profilDuPere(): Promise<string> {
  const profil = await creerProfil();
  for (const noeud of ['clairiere-01', 'galeries-01', 'galeries-02']) {
    await terminerNoeud(profil, noeud);
  }
  return profil;
}

// ═══════════════════════════════════════════════════════════════════════════════ les cas

describe('la séquence qui a cassé la carte du père', () => {
  it('CONTRÔLE DE LA MESURE : le catalogue d’hier était bien PLUS PETIT qu’aujourd’hui', () => {
    // Sans ce cas, le fichier serait vrai par vacuité : si `contenu/monde/regions.json`
    // revenait un jour à 1 et 2 nœuds, « le catalogue grandit » ne se produirait plus et tous
    // les cas ci-dessous passeraient au vert sans rien avoir éprouvé.
    expect(noeudsCourants('clairiere').length).toBeGreaterThan(CATALOGUE_D_HIER['clairiere']!);
    expect(noeudsCourants('galeries').length).toBeGreaterThan(CATALOGUE_D_HIER['galeries']!);

    // Et les nœuds d'hier sont bien un PRÉFIXE de ceux d'aujourd'hui : la troncature raconte
    // la vraie histoire du dépôt.
    expect(noeudsCourants('clairiere').slice(0, 1)).toEqual(['clairiere-01']);
    expect(noeudsCourants('galeries').slice(0, 2)).toEqual(['galeries-01', 'galeries-02']);
  });

  it('REPRODUCTION : sous le catalogue d’hier, les deux Éclats sont obtenus légitimement', async () => {
    const profil = await profilDuPere();
    const hier = await carteDe(applicationHier, profil);

    expect(region(hier, 'clairiere').pourcentageColorie).toBe(1);
    expect(region(hier, 'clairiere').eclatObtenuLe).not.toBeNull();
    expect(region(hier, 'galeries').pourcentageColorie).toBe(1);
    expect(region(hier, 'galeries').eclatObtenuLe).not.toBeNull();
  });

  it('le pourcentage REDESCEND à la part réelle quand le catalogue grandit', async () => {
    const profil = await profilDuPere();
    await carteDe(applicationHier, profil);

    const aujourdHui = await carteDe(applicationAujourdHui, profil);
    expect(
      region(aujourdHui, 'clairiere').pourcentageColorie,
      '1 nœud terminé sur les 6 désormais déclarés'
    ).toBe(1 / noeudsCourants('clairiere').length);
    expect(
      region(aujourdHui, 'galeries').pourcentageColorie,
      '2 nœuds terminés sur les 12 désormais déclarés'
    ).toBe(2 / noeudsCourants('galeries').length);
  });

  it('AUCUN ACQUIS N’A DISPARU : les Éclats restent, les étoiles ne bougent pas (R14)', async () => {
    const profil = await profilDuPere();
    const hier = await carteDe(applicationHier, profil);
    const eclatsDHier = hier.regions.map((entree) => [
      String(entree.region),
      entree.eclatObtenuLe
    ]);
    const etoilesDHier = base
      .prepare('SELECT noeud_id, etoiles FROM progression_noeud WHERE profil_id = ? ORDER BY noeud_id')
      .all(profil);

    const aujourdHui = await carteDe(applicationAujourdHui, profil);

    expect(
      aujourdHui.regions.map((entree) => [String(entree.region), entree.eclatObtenuLe]),
      'un Éclat gagné reste gagné, même si la région compte maintenant plus de nœuds'
    ).toEqual(eclatsDHier);
    expect(
      base
        .prepare('SELECT noeud_id, etoiles FROM progression_noeud WHERE profil_id = ? ORDER BY noeud_id')
        .all(profil)
    ).toEqual(etoilesDHier);
  });

  it('LA CARTE OFFRE TOUJOURS UN MONDE CLIQUABLE, et il mène à un nœud jamais joué', async () => {
    const profil = await profilDuPere();
    await carteDe(applicationHier, profil);
    const aujourdHui = await carteDe(applicationAujourdHui, profil);

    // `regionsOuvertes` est la fonction que la carte ET la pastille de sortie appellent : c'est
    // elle, et elle seule, qui décide de ce que le doigt peut toucher.
    const ouvertes = regionsOuvertes(aujourdHui);
    expect(ouvertes.length, 'aucune région proposée = plus rien à toucher').toBeGreaterThan(0);

    const faits = new Set(
      (
        base
          .prepare('SELECT noeud_id FROM progression_noeud WHERE profil_id = ?')
          .all(profil) as unknown as { noeud_id: string }[]
      ).map((ligne) => String(ligne.noeud_id))
    );

    const jouables = ouvertes
      .map((code) => region(aujourdHui, String(code)))
      .filter((entree) => entree.noeuds.length > 0);
    expect(
      jouables.length,
      'une région proposée sans aucun nœud livré est une prise qui ne répond pas'
    ).toBeGreaterThan(0);

    const neufs = jouables.flatMap((entree) =>
      entree.noeuds.map(String).filter((noeud) => !faits.has(noeud))
    );
    expect(neufs.length, 'les nœuds ajoutés depuis doivent être atteignables').toBeGreaterThan(0);
  });

  it('la PROJECTION EN BASE est réparée, pas seulement la réponse HTTP', async () => {
    // Le tableau de bord parent (`serveur/src/services/indicateurs.ts`) lit
    // `progression_region.pourcentage_colorie` DIRECTEMENT, sans passer par le recalcul. Une
    // correction qui ne vivrait que dans la réponse HTTP lui laisserait le chiffre faux.
    const profil = await profilDuPere();
    await carteDe(applicationHier, profil);
    await carteDe(applicationAujourdHui, profil);

    const lignes = base
      .prepare(
        'SELECT region_code, pourcentage_colorie FROM progression_region WHERE profil_id = ?'
      )
      .all(profil) as unknown as { region_code: string; pourcentage_colorie: number }[];
    const parCode = new Map(lignes.map((ligne) => [String(ligne.region_code), ligne]));

    expect(parCode.get('clairiere')?.pourcentage_colorie).toBe(
      1 / noeudsCourants('clairiere').length
    );
    expect(parCode.get('galeries')?.pourcentage_colorie).toBe(
      2 / noeudsCourants('galeries').length
    );
  });
});

describe('la migration de réparation — sur une base déjà empoisonnée', () => {
  /** L'état EXACT de `donnees/pierre.db` avant H1, réécrit à la main dans la projection. */
  function empoisonner(profilId: string): void {
    base
      .prepare(
        'UPDATE progression_region SET pourcentage_colorie = 1 ' +
          'WHERE profil_id = ? AND region_code IN (?, ?)'
      )
      .run(profilId, 'clairiere', 'galeries');
  }

  it('la migration 010 est bien appliquée par le runner, et elle invalide le cache', () => {
    // Fait MÉCANIQUE, donc mesuré : la migration est-elle dans la table de suivi ?
    const suivi = base
      .prepare('SELECT version, nom FROM schema_migrations WHERE version = 10')
      .get() as unknown as { version: number; nom: string } | undefined;
    expect(suivi, 'la migration 010 doit être appliquée sur une base neuve').toBeDefined();
    expect(String(suivi!.nom)).toBe('recalcul-progression-region');
  });

  it('remet le pourcentage à la part réelle SANS retirer l’Éclat ni faire baisser une étoile', async () => {
    const profil = await profilDuPere();
    const hier = await carteDe(applicationHier, profil);
    const eclatClairiere = region(hier, 'clairiere').eclatObtenuLe;
    const etoiles = base
      .prepare('SELECT noeud_id, etoiles FROM progression_noeud WHERE profil_id = ? ORDER BY noeud_id')
      .all(profil);
    expect(eclatClairiere).not.toBeNull();

    // Le catalogue grandit, et la projection porte encore les valeurs d'hier.
    empoisonner(profil);

    const traites = reparerProgressionRegion(base, REFERENTIEL_COURANT);
    expect(traites, 'la réparation traite TOUS les profils, pas seulement le courant').toBe(1);

    const lignes = base
      .prepare(
        `SELECT region_code, ouverte, pourcentage_colorie, eclat_obtenu_le
         FROM progression_region WHERE profil_id = ?`
      )
      .all(profil) as unknown as {
      region_code: string;
      ouverte: number;
      pourcentage_colorie: number;
      eclat_obtenu_le: string | null;
    }[];
    const parCode = new Map(lignes.map((ligne) => [String(ligne.region_code), ligne]));

    expect(parCode.get('clairiere')?.pourcentage_colorie).toBe(
      1 / noeudsCourants('clairiere').length
    );
    expect(parCode.get('galeries')?.pourcentage_colorie).toBe(
      2 / noeudsCourants('galeries').length
    );
    expect(parCode.get('clairiere')?.eclat_obtenu_le, 'un Éclat gagné reste gagné (R14)').toBe(
      eclatClairiere
    );
    expect(parCode.get('clairiere')?.ouverte, 'une région ouverte ne se referme jamais').toBe(1);
    expect(
      base
        .prepare('SELECT noeud_id, etoiles FROM progression_noeud WHERE profil_id = ? ORDER BY noeud_id')
        .all(profil),
      'aucune étoile ne décroît'
    ).toEqual(etoiles);
  });

  it('est idempotente : un second passage ne change rien', async () => {
    const profil = await profilDuPere();
    await carteDe(applicationHier, profil);
    empoisonner(profil);

    reparerProgressionRegion(base, REFERENTIEL_COURANT);
    const apresUn = base
      .prepare('SELECT * FROM progression_region WHERE profil_id = ? ORDER BY region_code')
      .all(profil);
    reparerProgressionRegion(base, REFERENTIEL_COURANT);
    const apresDeux = base
      .prepare('SELECT * FROM progression_region WHERE profil_id = ? ORDER BY region_code')
      .all(profil);

    expect(apresDeux).toEqual(apresUn);
  });
});
