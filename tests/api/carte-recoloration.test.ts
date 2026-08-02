/**
 * LE POURCENTAGE DE RECOLORATION, SUR UNE PROGRESSION RÉELLE — lot A2.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER MESURE, ET CE QUE `tests/api/monde.test.ts` NE POUVAIT PAS VOIR
 *
 * `contenu/monde/regions.json` le dit de lui-même : « `noeuds` … c'est lui qui fait le
 * pourcentage de recoloration ». Ce pourcentage est TROIS choses à la fois pour l'enfant (v2
 * § 3.2) : la barre de progression, la récompense, et la justification narrative. S'il ment,
 * les trois mentent ensemble.
 *
 * Le lot L2-F vérifiait déjà les deux BORNES — 0 % sur un profil neuf, 100 % après
 * `terminerClairiere()`. Ces deux cas sont exacts et ils restent en place. Mais ils ne peuvent
 * pas voir ce qui se passe ENTRE : une région dont le pourcentage sauterait de 0 à 100 au
 * premier nœud les passerait tous les deux au vert. C'est exactement l'état qu'a produit le
 * défaut du contrat § 1.5 — `regions.json` ne citait qu'un nœud sur cinq, donc terminer le
 * premier exercice affichait **100 %** et posait l'Éclat, alors que quatre nœuds restaient à
 * jouer et devenaient injouables.
 *
 * D'où ce fichier, qui parcourt la progression **cran par cran, de 0 à N**, à travers le vrai
 * HTTP, et exige la part exacte à chaque cran. Le cas « un nœud terminé n'est pas 100 % » est
 * la traduction opposable du défaut du père : « dans la clairière je n'ai eu qu'un exercice ».
 *
 * ── LA SOURCE QUI FAIT FOI EST LUE, JAMAIS RECALCULÉE ─────────────────────────────────────
 * Le dénominateur attendu vient de `contenu/monde/regions.json` — la liste `noeuds` de la
 * région. Il n'est PAS recompté depuis `contenu/noeuds/`, et il n'est pas écrit en littéral :
 * ce fichier vérifie que l'application divise par la liste déclarée, pas que la liste déclarée
 * soit juste. **C'est `tests/unitaires/noeuds-regions.test.ts` et le contrôle M6.2 de
 * `test:contenu` qui gardent la justesse de la liste elle-même** ; les deux sont nécessaires,
 * et le second serait aveugle sans le premier.
 *
 * ── MONTAGE PROPRE AU LOT ─────────────────────────────────────────────────────────────────
 * Même parti que `tests/api/monde.test.ts`, et pour la même raison : on monte les trois
 * modules de routes utiles (profils, tentatives, monde) sur une base migrée en mémoire, plutôt
 * que l'application complète qui ferait dépendre ce fichier de lots écrits en parallèle.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';

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

let application: FastifyInstance;
let base: DatabaseSync;

const horloge = horlogeDeTest();

/** Un horodatage de fin FIXE. Aucun `Date.now`, aucun `new Date` : la règle vaut aussi ici. */
const TERMINE_LE = '2026-09-01T08:01:00Z';

interface RegionLue {
  readonly region: string;
  readonly ouverte: boolean;
  readonly pourcentageColorie: number;
  readonly eclatObtenuLe: string | null;
}
interface EtatMondeLu {
  readonly carte: { readonly regions: readonly RegionLue[] };
}

interface EtapeJouable {
  readonly noeud: string;
  readonly exercice: string;
  readonly moteur: string;
  readonly habillage: string;
}

// ────────────────────────────────────────────────── les sources qui font foi, LUES sur disque

/** La liste `noeuds` DÉCLARÉE par `regions.json` — c'est elle qui fait le dénominateur. */
function noeudsDeclares(code: string): readonly string[] {
  const document = lireJson<{
    regions: ReadonlyArray<{ region: string; noeuds: readonly string[] }>;
  }>('contenu/monde/regions.json');
  const region = document.regions.find((entree) => entree.region === code);
  expect(region, `regions.json ne déclare pas la région « ${code} »`).toBeDefined();
  return region!.noeuds.map(String);
}

/** `id` d'exercice → le couple moteur × habillage que la tentative doit citer. */
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
      const exercice = lireJson<{
        id: string;
        jeu: { moteur: string; habillage: string };
      }>(chemin.slice(RACINE_DEPOT.length).split('\\').join('/'));
      table.set(String(exercice.id), {
        moteur: String(exercice.jeu.moteur),
        habillage: String(exercice.jeu.habillage)
      });
    }
  }
  return table;
}

/**
 * Les nœuds d'une région, DANS L'ORDRE DÉCLARÉ par `regions.json`, prêts à être journalisés.
 *
 * L'ordre du document est celui que la carte propose ; jouer dans un autre ordre testerait un
 * parcours que l'enfant ne peut pas suivre.
 */
function etapesDe(code: string): readonly EtapeJouable[] {
  const jeux = jeuParExercice();
  return noeudsDeclares(code).map((id) => {
    const noeud = lireJson<{ id: string; region: string; exercice: string }>(
      `contenu/noeuds/${id}.json`
    );
    expect(noeud.region, `${id} n’appartient pas à ${code}`).toBe(code);
    const jeu = jeux.get(String(noeud.exercice));
    expect(jeu, `le nœud ${id} cite un exercice absent : ${noeud.exercice}`).toBeDefined();
    return { noeud: id, exercice: String(noeud.exercice), moteur: jeu!.moteur, habillage: jeu!.habillage };
  });
}

// ────────────────────────────────────────────────────────────────────────── le montage

beforeEach(async () => {
  const [{ ouvrirBase }, { appliquerMigrations }, factices] = await Promise.all([
    import('@serveur/base/connexion'),
    import('@serveur/base/migrations'),
    import('@pierre/partage/factices')
  ]);

  base = ouvrirBase(':memory:');
  appliquerMigrations(base, DOSSIER_MIGRATIONS, horloge);

  const contexteServeur = {
    base,
    contenu: new factices.DepotContenuMemoire({}),
    horloge,
    alea: aleaDeTest()
  };

  application = Fastify({ logger: false });
  enregistrerRoutesProfils(application, contexteServeur);
  enregistrerRoutesTentatives(application, contexteServeur);
  enregistrerRoutesMonde(application, contexteServeur);
  await application.ready();
});

afterEach(async () => {
  await application.close();
  base.close();
});

async function creerProfil(prenom = 'Alma'): Promise<string> {
  const reponse = await application.inject({
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

/**
 * Journalise UNE tentative à trois étoiles sur un nœud.
 *
 * `variante` distingue deux passages sur le MÊME nœud : la clé d'idempotence les sépare, ce qui
 * permet de vérifier qu'un nœud rejoué ne compte pas deux fois dans le pourcentage.
 */
async function terminerNoeud(profilId: string, etape: EtapeJouable, variante = 0): Promise<void> {
  const { createHash } = await import('node:crypto');
  const graine = 20260801;
  const reponse = await application.inject({
    method: 'POST',
    url: '/api/tentatives',
    payload: {
      cleIdempotence: createHash('sha256')
        .update([profilId, etape.noeud, String(variante), String(graine)].join('|'))
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
  expect(reponse.statusCode, `tentative refusée sur ${etape.noeud}`).toBeLessThan(300);
}

async function lireRegion(profilId: string, code: string): Promise<RegionLue> {
  const reponse = await application.inject({
    method: 'GET',
    url: `/api/profils/${profilId}/monde`
  });
  expect(reponse.statusCode).toBe(200);
  const etat = reponse.json() as EtatMondeLu;
  const region = etat.carte.regions.find((entree) => entree.region === code);
  expect(region, `la carte doit porter la région ${code}`).toBeDefined();
  return region!;
}

// ═════════════════════════════════════════════════════════════════════════════ les cas

describe('le pourcentage affiché est la part des nœuds RÉELLEMENT terminés', () => {
  const CLAIRIERE = etapesDe('clairiere');

  it('CONTRÔLE DE LA MESURE : le dénominateur déclaré est bien celui des nœuds livrés', () => {
    // ── SANS CE CAS, TOUT LE FICHIER SERAIT VRAI PAR VACUITÉ. ──────────────────────────────
    // Les cas ci-dessous tirent leur dénominateur de `regions.json`. Sous le défaut du § 1.5
    // — la Clairière ne citant que `clairiere-01` — ils auraient donc vérifié « 0/1 puis 1/1 »
    // et seraient tous passés au VERT, pendant que l'enfant voyait 100 % après un exercice et
    // cinq nœuds devenus injouables. Un test qui lit sa référence dans le fichier qu'il devrait
    // juger ne juge rien.
    //
    // On oppose donc ici les DEUX populations, comme le contrôle M6.2 de `test:contenu` :
    // la liste déclarée, et les fichiers de `contenu/noeuds/` qui se disent de cette région.
    const livres = readdirSync(join(RACINE_DEPOT, 'contenu/noeuds'))
      .filter((fichier) => fichier.endsWith('.json'))
      .map((fichier) => lireJson<{ id: string; region: string }>(`contenu/noeuds/${fichier}`))
      .filter((noeud) => noeud.region === 'clairiere')
      .map((noeud) => String(noeud.id))
      .sort();

    expect(
      CLAIRIERE.map((etape) => etape.noeud).sort(),
      'regions.json et contenu/noeuds/ ne décrivent pas la même Clairière : le pourcentage ' +
        'affiché est faux, et les cas suivants le vérifieraient contre la mauvaise référence'
    ).toEqual(livres);

    // Et R13 en demande 4 à 6 : avec un seul nœud, 0/1 et 1/1 sont les deux bornes que L2-F
    // vérifiait déjà, et il n'y aurait aucun cran entre elles à mesurer.
    expect(CLAIRIERE.length).toBeGreaterThanOrEqual(4);
  });

  it('progresse d’un cran EXACT par nœud terminé, de 0 à 100 %', async () => {
    // Un profil neuf par cran : `pourcentage_colorie` ne décroît jamais (R14), donc mesurer
    // 3 nœuds puis 2 sur le même profil rendrait 3 les deux fois — le test croirait mesurer.
    for (let faits = 0; faits <= CLAIRIERE.length; faits += 1) {
      const profil = await creerProfil(`Alma-${String(faits)}`);
      for (const etape of CLAIRIERE.slice(0, faits)) {
        await terminerNoeud(profil, etape);
      }
      const region = await lireRegion(profil, 'clairiere');
      expect(
        region.pourcentageColorie,
        `${String(faits)} nœud(s) terminé(s) sur ${String(CLAIRIERE.length)}`
      ).toBe(faits / CLAIRIERE.length);
    }
  });

  it('UN nœud terminé n’est PAS 100 % — le défaut du § 1.5, vu depuis l’enfant', async () => {
    // Quand `regions.json` ne citait qu'un nœud sur cinq, terminer le premier exercice
    // affichait 100 %, posait l'Éclat, et rendait les quatre autres injouables. C'est le
    // « dans la clairière je n'ai eu qu'un exercice » du père, traduit en assertion.
    const profil = await creerProfil();
    await terminerNoeud(profil, CLAIRIERE[0]!);

    const region = await lireRegion(profil, 'clairiere');
    expect(region.pourcentageColorie).toBe(1 / CLAIRIERE.length);
    expect(region.pourcentageColorie).toBeLessThan(1);
    expect(region.eclatObtenuLe, 'l’Éclat ne se pose qu’à 100 %').toBeNull();
  });

  it('l’Éclat n’arrive qu’au DERNIER nœud, jamais avant', async () => {
    const profil = await creerProfil();
    for (const [rang, etape] of CLAIRIERE.entries()) {
      await terminerNoeud(profil, etape);
      const region = await lireRegion(profil, 'clairiere');
      const dernier = rang === CLAIRIERE.length - 1;
      expect(region.eclatObtenuLe === null, `après ${String(rang + 1)} nœud(s)`).toBe(!dernier);
    }
  });

  it('rejouer le même nœud ne le compte pas deux fois', async () => {
    // Le dénominateur est la liste déclarée ; le numérateur compte des NŒUDS distincts, pas
    // des tentatives. Deux passages sur le premier nœud ne valent pas deux nœuds faits.
    const profil = await creerProfil();
    await terminerNoeud(profil, CLAIRIERE[0]!, 0);
    await terminerNoeud(profil, CLAIRIERE[0]!, 1);

    expect((await lireRegion(profil, 'clairiere')).pourcentageColorie).toBe(1 / CLAIRIERE.length);
  });

  it('le dénominateur est bien la liste déclarée par `regions.json`', async () => {
    // La vérification qui relie le pourcentage à sa source : on termine TOUS les nœuds
    // déclarés et on exige exactement 100 %. Un nœud livré et non déclaré ne pourrait pas
    // faire descendre ce chiffre — c'est le contrôle M6.2 de `test:contenu` qui l'attrape —,
    // mais un nœud DÉCLARÉ et non livré ferait échouer ce cas ici même.
    const profil = await creerProfil();
    for (const etape of CLAIRIERE) await terminerNoeud(profil, etape);

    const region = await lireRegion(profil, 'clairiere');
    expect(region.pourcentageColorie).toBe(1);
    expect(region.eclatObtenuLe).not.toBeNull();
  });
});

describe('la recoloration ne déborde pas d’une région sur l’autre', () => {
  const CLAIRIERE = etapesDe('clairiere');
  const GALERIES = etapesDe('galeries');

  it('terminer les Galeries ne recolorie pas la Clairière, et réciproquement', async () => {
    const profil = await creerProfil();
    for (const etape of GALERIES) await terminerNoeud(profil, etape);

    expect((await lireRegion(profil, 'galeries')).pourcentageColorie).toBe(1);
    expect((await lireRegion(profil, 'clairiere')).pourcentageColorie).toBe(0);

    for (const etape of CLAIRIERE) await terminerNoeud(profil, etape);
    expect((await lireRegion(profil, 'clairiere')).pourcentageColorie).toBe(1);
  });

  it('une tentative sur un nœud qu’aucune région ne déclare ne peint rien', async () => {
    // Un nœud inconnu de `regions.json` doit rester sans effet sur la carte plutôt que d'être
    // rattaché à une région par proximité de nom. `clairiere-99` commence par « clairiere ».
    const profil = await creerProfil();
    await terminerNoeud(profil, { ...CLAIRIERE[0]!, noeud: 'clairiere-99' });

    const region = await lireRegion(profil, 'clairiere');
    expect(region.pourcentageColorie).toBe(0);
    expect(region.eclatObtenuLe).toBeNull();
  });

  it('les quatre régions sans nœud livré restent à 0 % — 0 nœud n’est jamais 100 %', async () => {
    const profil = await creerProfil();
    for (const etape of CLAIRIERE) await terminerNoeud(profil, etape);

    for (const code of ['marais-jumeau', 'foret-muette', 'volcan', 'cite-des-histoires']) {
      const region = await lireRegion(profil, code);
      expect(region.pourcentageColorie, code).toBe(0);
      expect(region.eclatObtenuLe, code).toBeNull();
    }
  });
});
