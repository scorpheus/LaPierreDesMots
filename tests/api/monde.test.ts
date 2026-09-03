/**
 * Les deux routes du monde et la projection qui les alimente — lot L2-F, annexe T § T2 et T3.
 *
 * Trois propriétés, et ce sont celles qui décident si la carte peut mentir :
 *
 * 1. **Étanchéité stricte entre profils** (v2 § 11). Le monde d'Alma n'apparaît jamais chez Noé.
 * 2. **Un acquis n'est jamais repris** (R14). On TENTE la régression — on réécrit la projection
 *    à la baisse, on rejoue la lecture — et on vérifie qu'elle n'a pas eu lieu. C'est la règle
 *    de dépôt du contrat § 6 (« MAX, jamais une affectation »), vérifiée et non supposée.
 * 3. **La carte se recalcule depuis le journal.** Aucune route n'écrit `progression_region` :
 *    elle se déduit de `progression_noeud`, elle-même déduite de `tentatives`.
 *
 * ⚠ **MONTAGE PROPRE AU LOT, et c'est délibéré.** `serveur/src/application.ts` appartient à L2-H,
 * qui branche les routes des cinq lots serveur (contrat § 5.2, inversion n° 3) : monter
 * l'application complète ferait dépendre CE fichier de quatre lots écrits en parallèle, et un
 * échec ne dirait plus rien de L2-F. Les cas ci-dessous montent donc les trois modules de routes
 * dont ils ont besoin — profils, tentatives, monde — sur une base migrée en mémoire. Le dernier
 * `describe` du fichier, et lui seul, vérifie le branchement chez L2-H.
 */
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';

import { enregistrerRoutesMonde } from '@serveur/routes/monde';
import { enregistrerRoutesProfils } from '@serveur/routes/profils';
import { enregistrerRoutesTentatives } from '@serveur/routes/tentatives';
import { chargerReferentielMonde } from '@serveur/referentiels/monde';
import { enregistrerFormeGobi } from '@pierre/partage/base';
import type { Base } from '@pierre/partage/base';
import { calculerEtoiles } from '@partage/etoiles';
import { lireSeuilsCascade } from '@pierre/partage/recompenses';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  DOSSIER_MIGRATIONS,
  INSTANT_DE_REFERENCE,
  RACINE_DEPOT,
  aleaDeTest,
  horlogeDeTest,
  lireJson
} from '../configuration/preparation.js';

/** L'application qui porte les trois modules de routes utiles au lot. */
let monde: FastifyInstance;
let base: DatabaseSync;
let baseAsync: Base;

const horloge = horlogeDeTest();

interface EtatMondeLu {
  readonly carte: {
    readonly ouvertesEnParallele: number;
    readonly regions: readonly {
      readonly region: string;
      readonly ordre: number;
      readonly ouverte: boolean;
      readonly pourcentageColorie: number;
      readonly eclatObtenuLe: string | null;
      readonly compagnon: string | null;
    }[];
  };
  readonly gobi: { readonly stade: string; readonly formes: readonly { grapheme: string }[] };
  readonly compagnons: readonly { readonly code: string; readonly rallieLe: string | null }[];
  readonly campement: readonly { readonly code: string; readonly placeLe: string | null }[];
}

beforeEach(async () => {
  const [{ ouvrirBase }, { appliquerMigrations }, { creerBaseNodeSqlite }, factices] = await Promise.all([
    import('@serveur/base/connexion'),
    import('@serveur/base/migrations'),
    import('@serveur/base/adaptateur-node-sqlite'),
    import('@pierre/partage/factices')
  ]);

  base = ouvrirBase(':memory:');
  baseAsync = creerBaseNodeSqlite(base);
  await appliquerMigrations(baseAsync, DOSSIER_MIGRATIONS, horloge);

  const contexteServeur = {
    base: baseAsync,
    contenu: new factices.DepotContenuMemoire({}),
    horloge,
    alea: aleaDeTest()
  };

  monde = Fastify({ logger: false });
  enregistrerRoutesProfils(monde, contexteServeur);
  enregistrerRoutesTentatives(monde, contexteServeur);
  enregistrerRoutesMonde(monde, contexteServeur);
  await monde.ready();
});

afterEach(async () => {
  await monde.close();
  base.close();
});

async function creerProfil(prenom = 'Alma'): Promise<string> {
  const reponse = await monde.inject({
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
 * Les nœuds de la Clairière et leur exercice, LUS SUR DISQUE.
 *
 * Cette table remplace le triplet `clairiere-01` / `clairiere-ecole-01` / `clairiere.ecole`
 * qui était écrit en dur dans le corps du helper, sous le commentaire « l'unique nœud livré de
 * la Clairière ». Ce n'est plus vrai : la v2 § 5.2 demande « 4 à 6 nœuds enchaînés » et le lot
 * C4 les a livrés. Un helper qui journalise UN nœud et s'appelle `terminerClairiere` mentirait
 * sur ce qu'il fait, et les trois cas qui l'appellent testeraient une région à 20 %.
 */
function noeudsDeLaClairiere(): readonly {
  readonly noeud: string;
  readonly exercice: string;
  readonly moteur: string;
  readonly habillage: string;
}[] {
  const parExercice = new Map<string, { moteur: string; habillage: string }>();
  for (const fichier of readdirSync(join(RACINE_DEPOT, 'contenu/exercices/clairiere'))) {
    if (!fichier.endsWith('.json')) continue;
    const exercice = lireJson<{
      readonly id: string;
      readonly jeu: { readonly moteur: string; readonly habillage: string };
    }>(`contenu/exercices/clairiere/${fichier}`);
    parExercice.set(exercice.id, {
      moteur: exercice.jeu.moteur,
      habillage: exercice.jeu.habillage
    });
  }

  return readdirSync(join(RACINE_DEPOT, 'contenu/noeuds'))
    .filter((fichier) => fichier.endsWith('.json'))
    .map((fichier) =>
      lireJson<{
        readonly id: string;
        readonly region: string;
        readonly ordre: number;
        readonly exercice: string;
      }>(`contenu/noeuds/${fichier}`)
    )
    .filter((noeud) => noeud.region === 'clairiere')
    .sort((gauche, droite) => gauche.ordre - droite.ordre)
    .map((noeud) => {
      const jeu = parExercice.get(noeud.exercice);
      expect(jeu, `le nœud ${noeud.id} cite un exercice absent : ${noeud.exercice}`).toBeDefined();
      return {
        noeud: noeud.id,
        exercice: noeud.exercice,
        moteur: jeu!.moteur,
        habillage: jeu!.habillage
      };
    });
}

/** Journalise une tentative à trois étoiles sur CHAQUE nœud livré de la Clairière. */
async function terminerClairiere(profilId: string): Promise<void> {
  const { createHash } = await import('node:crypto');
  const graine = 20260801;
  const etapes = noeudsDeLaClairiere();

  // Une région qui n'aurait plus de nœud rendrait ce helper silencieusement inopérant, et les
  // trois cas qui s'en servent passeraient sur un monde jamais recolorié.
  expect(etapes.length, 'la Clairière ne livre aucun nœud').toBeGreaterThan(0);

  for (const etape of etapes) {
    const reponse = await monde.inject({
      method: 'POST',
      url: '/api/tentatives',
      payload: {
        cleIdempotence: createHash('sha256')
          .update([profilId, etape.noeud, INSTANT_DE_REFERENCE, String(graine)].join('|'))
          .digest('hex'),
        profil: profilId,
        noeud: etape.noeud,
        exercice: etape.exercice,
        moteur: etape.moteur,
        habillage: etape.habillage,
        graine,
        demarreLe: INSTANT_DE_REFERENCE,
        termineLe: '2026-09-01T08:01:00Z',
        resume: { reussi: true, nbErreurs: 0, aideUtilisee: 'aucune', dureeMs: 60_000, etapes: [] }
      }
    });
    expect(reponse.statusCode, `tentative refusée sur ${etape.noeud}`).toBeLessThan(300);
  }
}

async function lireMondeHttp(profilId: string): Promise<EtatMondeLu> {
  const reponse = await monde.inject({ method: 'GET', url: `/api/profils/${profilId}/monde` });
  expect(reponse.statusCode).toBe(200);
  return reponse.json() as EtatMondeLu;
}

function region(etat: EtatMondeLu, code: string) {
  const trouvee = etat.carte.regions.find((entree) => entree.region === code);
  expect(trouvee, `la carte doit porter la région ${code}`).toBeDefined();
  return trouvee!;
}

describe('GET /api/profils/:id/monde', () => {
  // D38 — « Les deux régions sont ouvertes d'emblée », qui amende la v2 § 3.3
  // (`Docs/journal-des-decisions.md:740`). Ce cas exigeait UNE seule région ouverte : il
  // décrivait la règle abrogée, et il la gardait vivante jusque dans la réponse HTTP.
  // Les Galeries sont nommées explicitement — c'est la région que D38 vise, et un simple
  // `toHaveLength(2)` ne dirait pas LAQUELLE s'est ouverte.
  it('rend une carte neuve : la Clairière ET les Galeries ouvertes, les quatre autres voilées (D38)', async () => {
    const etat = await lireMondeHttp(await creerProfil());
    expect(etat.carte.regions).toHaveLength(6);
    expect(region(etat, 'clairiere').ouverte).toBe(true);
    expect(region(etat, 'galeries').ouverte).toBe(true);
    expect(region(etat, 'marais-jumeau').ouverte).toBe(false);
    expect(etat.carte.regions.filter((entree) => entree.ouverte)).toHaveLength(2);
    expect(etat.carte.regions.every((entree) => entree.eclatObtenuLe === null)).toBe(true);
  });

  it('rend Gobi au premier stade, sans aucune forme', async () => {
    const etat = await lireMondeHttp(await creerProfil());
    expect(etat.gobi.stade).toBe('oeuf');
    expect(etat.gobi.formes).toEqual([]);
  });

  it('rend les quatre compagnons, visibles et non ralliés', async () => {
    const etat = await lireMondeHttp(await creerProfil());
    expect(etat.compagnons.map((compagnon) => compagnon.code).sort()).toEqual([
      'bulle',
      'filou',
      'plume',
      'roc'
    ]);
    expect(etat.compagnons.every((compagnon) => compagnon.rallieLe === null)).toBe(true);
  });

  it('annote la carte du compagnon que chaque région porte', async () => {
    const etat = await lireMondeHttp(await creerProfil());
    expect(region(etat, 'clairiere').compagnon).toBe('filou');
    expect(region(etat, 'marais-jumeau').compagnon).toBeNull();
  });

  it('répond 404 sur un profil inconnu, jamais un monde vide', async () => {
    const reponse = await monde.inject({
      method: 'GET',
      url: '/api/profils/profil-qui-n-existe-pas/monde'
    });
    expect(reponse.statusCode).toBe(404);
  });
});

describe('la carte se recalcule depuis le journal', () => {
  it('recolorie la Clairière, lui pose son Éclat, et ouvre les deux régions suivantes', async () => {
    const profil = await creerProfil();
    await terminerClairiere(profil);

    const etat = await lireMondeHttp(profil);
    expect(region(etat, 'clairiere').pourcentageColorie).toBe(1);
    expect(region(etat, 'clairiere').eclatObtenuLe).not.toBeNull();
    expect(region(etat, 'galeries').ouverte).toBe(true);
    expect(region(etat, 'marais-jumeau').ouverte).toBe(true);
    expect(region(etat, 'foret-muette').ouverte).toBe(false);
  });

  it('rallie Filou et rapporte le fanion dès que la Clairière est terminée', async () => {
    const profil = await creerProfil();
    await terminerClairiere(profil);

    const etat = await lireMondeHttp(profil);
    expect(etat.compagnons.find((compagnon) => compagnon.code === 'filou')?.rallieLe).not.toBeNull();
    expect(etat.campement.find((objet) => objet.code === 'fanion-clairiere')?.placeLe).not.toBeNull();
  });

  it('est idempotent : deux lectures successives rendent exactement le même monde', async () => {
    const profil = await creerProfil();
    await terminerClairiere(profil);
    expect(await lireMondeHttp(profil)).toEqual(await lireMondeHttp(profil));
  });

  it('n’ouvre AUCUNE région pour une région sans nœud livré — 0 nœud n’est pas 100 %', async () => {
    const etat = await lireMondeHttp(await creerProfil());
    for (const code of ['marais-jumeau', 'foret-muette', 'volcan', 'cite-des-histoires']) {
      expect(region(etat, code).pourcentageColorie).toBe(0);
      expect(region(etat, code).eclatObtenuLe).toBeNull();
    }
  });
});

describe('un acquis n’est jamais repris — la régression est TENTÉE (R14)', () => {
  it('ne laisse pas `pourcentage_colorie` redescendre, même écrit à la main en base', async () => {
    const profil = await creerProfil();
    await terminerClairiere(profil);
    expect(region(await lireMondeHttp(profil), 'clairiere').pourcentageColorie).toBe(1);

    // On force la projection à la baisse, exactement ce qu'un bug de dépôt ferait.
    base
      .prepare(
        'UPDATE progression_region SET pourcentage_colorie = 0, eclat_obtenu_le = NULL ' +
          'WHERE profil_id = ? AND region_code = ?'
      )
      .run(profil, 'clairiere');

    const apres = await lireMondeHttp(profil);
    expect(region(apres, 'clairiere').pourcentageColorie).toBe(1);
    expect(region(apres, 'clairiere').eclatObtenuLe).not.toBeNull();
  });

  it('ne laisse pas le stade de Gobi redescendre, même écrit à la main en base', async () => {
    const profil = await creerProfil();
    const referentiel = chargerReferentielMonde();
    for (const forme of referentiel.formes.slice(0, 8)) {
      await enregistrerFormeGobi(baseAsync,profil, forme.grapheme, referentiel, horloge);
    }
    expect((await lireMondeHttp(profil)).gobi.stade).toBe('crete');

    // Régression tentée par les deux bouts : le stade ET la collection.
    base
      .prepare('UPDATE stade_gobi SET stade_code = ?, rang = 1 WHERE profil_id = ?')
      .run('oeuf', profil);
    base.prepare('DELETE FROM formes_gobi WHERE profil_id = ?').run(profil);

    // La projection a bien été forcée : sans le MAX du dépôt, la lecture rendrait « oeuf ».
    const etat = await lireMondeHttp(profil);
    expect(etat.gobi.formes).toEqual([]);
    expect(etat.gobi.stade).toBe('oeuf');
  });

  it('garde la première date d’obtention d’une forme rejouée', async () => {
    const profil = await creerProfil();
    const referentiel = chargerReferentielMonde();
    await enregistrerFormeGobi(baseAsync,profil, referentiel.formes[0]!.grapheme, referentiel, horloge);
    const premiere = base
      .prepare('SELECT obtenue_le FROM formes_gobi WHERE profil_id = ?')
      .get(profil) as { obtenue_le: string };

    await enregistrerFormeGobi(baseAsync,profil, referentiel.formes[0]!.grapheme, referentiel, horloge);
    const lignes = base
      .prepare('SELECT obtenue_le FROM formes_gobi WHERE profil_id = ?')
      .all(profil) as { obtenue_le: string }[];

    expect(lignes).toHaveLength(1);
    expect(lignes[0]!.obtenue_le).toBe(premiere.obtenue_le);
  });
});

describe('POST /api/profils/:id/campement', () => {
  it('pose un objet et rend le monde qui le porte', async () => {
    const profil = await creerProfil();
    const reponse = await monde.inject({
      method: 'POST',
      url: `/api/profils/${profil}/campement`,
      payload: { objet: 'fanion-clairiere' }
    });
    expect(reponse.statusCode).toBe(200);
    const etat = reponse.json() as EtatMondeLu;
    const objet = etat.campement.find((entree) => entree.code === 'fanion-clairiere');
    expect(objet?.placeLe).not.toBeNull();
  });

  it('est idempotent : reposer le même objet garde la première date', async () => {
    const profil = await creerProfil();
    const poser = () =>
      monde.inject({
        method: 'POST',
        url: `/api/profils/${profil}/campement`,
        payload: { objet: 'fanion-clairiere' }
      });
    const une = (await poser()).json() as EtatMondeLu;
    const deux = (await poser()).json() as EtatMondeLu;
    expect(deux.campement).toEqual(une.campement);
  });

  it('refuse un objet que le référentiel ne déclare pas, plutôt que d’écrire un code mort', async () => {
    const profil = await creerProfil();
    const reponse = await monde.inject({
      method: 'POST',
      url: `/api/profils/${profil}/campement`,
      payload: { objet: 'tresor-imaginaire' }
    });
    expect(reponse.statusCode).toBe(404);
  });

  it('refuse un corps sans champ « objet » avec une erreur typée', async () => {
    const profil = await creerProfil();
    const reponse = await monde.inject({
      method: 'POST',
      url: `/api/profils/${profil}/campement`,
      payload: { objets: ['fanion-clairiere'] }
    });
    expect(reponse.statusCode).toBe(400);
    expect((reponse.json() as Record<string, unknown>)['code']).toBeDefined();
  });
});

// Lot Q1 (garde `ecrivains-atteignables.test.ts`) — R31/R11 : `noterVisitePoint` existait déjà,
// juste et testé en isolation, et aucune route ne l'appelait. `points_visites` restait à 0 après
// 23 parties réelles (feuille-de-route-debug.md § 2). Ce bloc prouve la chaîne HTTP -> dépôt.
describe('POST /api/profils/:id/campement/points/:point', () => {
  it('journalise une visite, sans rien changer au reste du monde (geste gratuit)', async () => {
    const profil = await creerProfil();
    const avant = await lireMondeHttp(profil);

    const reponse = await monde.inject({
      method: 'POST',
      url: `/api/profils/${profil}/campement/points/tente`
    });
    expect(reponse.statusCode).toBe(204);

    const ligne = base
      .prepare('SELECT nb_visites FROM points_visites WHERE profil_id = ? AND point_code = ?')
      .get(profil, 'tente') as { readonly nb_visites: number } | undefined;
    expect(ligne?.nb_visites).toBe(1);

    // Gratuit : ni étoile, ni acquis, ni changement de la carte, de Gobi ou du campement.
    const apres = await lireMondeHttp(profil);
    expect(apres).toEqual(avant);
  });

  it('cumule les visites répétées du même point', async () => {
    const profil = await creerProfil();
    for (let fois = 0; fois < 3; fois += 1) {
      await monde.inject({ method: 'POST', url: `/api/profils/${profil}/campement/points/feu` });
    }
    const ligne = base
      .prepare('SELECT nb_visites FROM points_visites WHERE profil_id = ? AND point_code = ?')
      .get(profil, 'feu') as { readonly nb_visites: number } | undefined;
    expect(ligne?.nb_visites).toBe(3);
  });

  it('refuse un point que le référentiel ne déclare pas, plutôt que d’écrire un code mort', async () => {
    const profil = await creerProfil();
    const reponse = await monde.inject({
      method: 'POST',
      url: `/api/profils/${profil}/campement/points/point-imaginaire`
    });
    expect(reponse.statusCode).toBe(404);
  });

  it('rend 404 sur un profil inconnu', async () => {
    const reponse = await monde.inject({
      method: 'POST',
      url: `/api/profils/prf-inconnu/campement/points/tente`
    });
    expect(reponse.statusCode).toBe(404);
  });
});

describe('étanchéité stricte entre profils — v2 § 11', () => {
  it('le monde d’Alma n’apparaît jamais chez Noé', async () => {
    const alma = await creerProfil('Alma');
    const noe = await creerProfil('Noé');

    await terminerClairiere(alma);
    await monde.inject({
      method: 'POST',
      url: `/api/profils/${alma}/campement`,
      payload: { objet: 'fanion-clairiere' }
    });
    const referentiel = chargerReferentielMonde();
    await enregistrerFormeGobi(baseAsync,alma, referentiel.formes[0]!.grapheme, referentiel, horloge);

    const monsieurNoe = await lireMondeHttp(noe);
    expect(region(monsieurNoe, 'clairiere').pourcentageColorie).toBe(0);
    // Le témoin d'étanchéité était `galeries.ouverte === false`. D38 ouvre les Galeries pour
    // TOUT LE MONDE dès la première seconde : ce témoin ne distingue donc plus un profil neuf
    // d'un profil avancé, et il aurait été vert quoi qu'il arrive — un test qui ne mesure plus
    // rien. On le remplace par deux témoins que D38 ne touche pas et qui, eux, séparent
    // réellement les deux profils : Alma a obtenu l'Éclat de la Clairière, Noé n'a rien.
    expect(region(monsieurNoe, 'galeries').pourcentageColorie).toBe(0);
    expect(monsieurNoe.carte.regions.every((entree) => entree.eclatObtenuLe === null)).toBe(true);
    expect(monsieurNoe.gobi.formes).toEqual([]);
    expect(monsieurNoe.campement.every((objet) => objet.placeLe === null)).toBe(true);

    // Et le monde d'Alma, lui, n'a rien perdu au passage.
    const madameAlma = await lireMondeHttp(alma);
    expect(region(madameAlma, 'clairiere').pourcentageColorie).toBe(1);
    // ── LE CHIFFRE EST RECALCULÉ, JAMAIS RECOPIÉ — et il a changé pour une bonne raison ────
    //
    // Cette assertion attendait **1**. Elle mesurait l'ancien monde, où la cascade n'atteignait
    // jamais la base : seule l'injection manuelle d'`enregistrerFormeGobi`, deux lignes plus
    // haut, comptait. Le lot A1 a branché la cascade, et `terminerClairiere` fait maintenant
    // ce que fait un enfant : chaque nœud terminé donne ses étoiles, et chaque palier
    // intermédiaire attribue une forme de Gobi.
    //
    // On DÉRIVE donc l'attendu des seuils livrés et du barème, plutôt que de figer un nombre
    // qu'un recalibrage ferait mentir (« ces valeurs vivent en données parce qu'elles seront
    // recalibrées », `parametres-recompenses.json`).
    const seuils = lireSeuilsCascade(lireJson('contenu/referentiel/parametres-recompenses.json'));
    const etoilesParNoeud = calculerEtoiles({
      reussi: true,
      nbErreurs: 0,
      aideUtilisee: 'aucune',
      dureeMs: 60_000,
      etapes: []
    });
    const formesAttendues = Math.floor(
      (noeudsDeLaClairiere().length * etoilesParNoeud) / seuils.etoilesParIntermediaire
    );
    // Le palier intermédiaire n'attribue une forme que s'il est réglé sur ça : si le
    // référentiel change de nature, ce cas doit le dire au lieu de compter dans le vide.
    expect(seuils.natureIntermediaire, 'le palier intermédiaire n’attribue plus de forme').toBe(
      'forme-gobi'
    );
    expect(formesAttendues, 'aucun palier franchi : le cas ne mesurerait plus rien').toBeGreaterThan(
      1
    );
    // L'injection manuelle ci-dessus porte `referentiel.formes[0]`, que la cascade a déjà
    // attribuée : elle ne compte donc pas une seconde fois (les formes sont un ensemble).
    expect(madameAlma.gobi.formes).toHaveLength(formesAttendues);
  });
});

describe('montageApplicationComplete — inversion assumée du contrat § 5.2 n° 3', () => {
  /**
   * L2-H possède `serveur/src/application.ts` et y enregistre les routes des cinq lots serveur.
   * Ce cas est le SEUL du fichier qui en dépende. Il échoue tant que L2-H n'a pas branché
   * `enregistrerRoutesMonde` — c'est le comportement voulu : « un lot qui écrit une route sans
   * qu'elle soit branchée verrait son travail silencieusement absent ; ici, l'absence se voit ».
   */
  it('l’application complète sert `GET /api/profils/:id/monde`', async () => {
    const { monterApplication } = await import('../configuration/preparation.js');
    const complete = await monterApplication();
    try {
      const creation = await complete.application.inject({
        method: 'POST',
        url: '/api/profils',
        payload: {
          prenom: 'Alma',
          avatar: { forme: 'rond', couleur: 'lagon', accessoire: null },
          paletteVariante: 'clairiere'
        }
      });
      const profil = (creation.json() as { id: string }).id;
      const reponse = await complete.application.inject({
        method: 'GET',
        url: `/api/profils/${profil}/monde`
      });
      expect(reponse.statusCode).toBe(200);
    } finally {
      await complete.fermer();
    }
  });
});
