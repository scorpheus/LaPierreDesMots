/**
 * Routes de contenu — `GET /api/contenu/noeuds/:id` et `GET /api/contenu/assets/*`
 * (contrat gelé § 3.3). `fastify.inject()`, base `:memory:`, dépôt de contenu EN MÉMOIRE,
 * aucun port ouvert, aucun accès disque hors des fixtures réelles du dépôt.
 *
 * ⚠ ÉCART DÉCLARÉ AU CONTRAT GELÉ — ce fichier ne figure pas à l'inventaire du § 1.7.
 * Il est ajouté parce que le contrat se contredit lui-même sur ce point :
 *   • l'annexe T § 7, reprise dans `vitest.config.ts`, exige **≥ 80 %** de couverture sur
 *     `serveur/src/routes/**\/*.ts` ;
 *   • le § 1.7 ne nomme aucun test pour `serveur/src/routes/contenu.ts`.
 * Mesuré avant ce fichier : `contenu.ts` était couvert à **39,8 % de lignes et 55 % de
 * branches**, et la zone entière retombait à 64,47 %. Or c'est la route qui sert le décor et
 * les consignes à l'enfant, et la seule barrière entre un exercice mal formé et son écran
 * (en-tête de `routes/contenu.ts`). Laisser un seuil impossible à tenir aurait été pire que
 * l'écart : un seuil qu'on ne peut pas atteindre finit par être baissé.
 * Écart consigné dans `Docs/ecarts-au-contrat-chaine-verifier.md`.
 *
 * Aucune assertion n'est assouplie ici, et rien n'est mis en `skip`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import type { Exercice, Habillage, Noeud } from '@pierre/partage';

import {
  CHEMIN_EXERCICE_ECOLE,
  CHEMIN_NOEUD_CLAIRIERE,
  CHEMIN_SVG_ECOLE,
  DOSSIER_MIGRATIONS,
  aleaDeTest,
  habillageEcole,
  horlogeDeTest,
  lireJson,
  lireTexte
} from '../configuration/preparation.js';

/** Les données réelles de la v1, relues à chaque cas pour qu'aucun ne salisse le suivant. */
const noeudReel = (): Noeud => lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE);
const exerciceReel = (): Exercice => lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE);
const svgReel = lireTexte(CHEMIN_SVG_ECOLE);

interface Montage {
  readonly application: FastifyInstance;
  readonly base: DatabaseSync;
  fermer(): Promise<void>;
}

/**
 * Monte l'application sur un contenu CHOISI par le cas.
 *
 * `monterApplication()` de `preparation.ts` sert un contenu fixe — parfait pour les profils et
 * les tentatives, inutilisable ici : la moitié des branches de cette route ne s'atteint qu'avec
 * un contenu volontairement incomplet (nœud sans exercice, exercice sans habillage, habillage
 * qui ne correspond pas). Le montage est donc local, et il fait les mêmes imports dynamiques.
 */
async function monter(contenuEnMemoire: Record<string, unknown>): Promise<Montage> {
  const [
    { construireApplication },
    { ouvrirBase },
    { appliquerMigrations },
    { creerBaseNodeSqlite },
    factices
  ] = await Promise.all([
    import('@serveur/application'),
    import('@serveur/base/connexion'),
    import('@serveur/base/migrations'),
    import('@serveur/base/adaptateur-node-sqlite'),
    import('@pierre/partage/factices')
  ]);

  const base = ouvrirBase(':memory:');
  const baseAsync = creerBaseNodeSqlite(base);
  const horloge = horlogeDeTest();
  await appliquerMigrations(baseAsync, DOSSIER_MIGRATIONS, horloge);

  const application = construireApplication({
    base: baseAsync,
    contenu: new factices.DepotContenuMemoire(contenuEnMemoire),
    horloge,
    alea: aleaDeTest(),
    racineClient: null
  });
  await application.ready();

  return {
    application,
    base,
    async fermer() {
      await application.close();
      base.close();
    }
  };
}

/** Le contenu complet et valide de la v1 — le cas nominal. */
function contenuComplet(): Record<string, unknown> {
  return {
    noeuds: [noeudReel()],
    exercices: [exerciceReel()],
    habillages: [habillageEcole()],
    assets: { 'habillages/clairiere/ecole.svg': svgReel }
  };
}

let montage: Montage | null = null;

async function ouvrir(contenuEnMemoire: Record<string, unknown>): Promise<FastifyInstance> {
  montage = await monter(contenuEnMemoire);
  return montage.application;
}

beforeEach(() => {
  montage = null;
});

afterEach(async () => {
  if (montage !== null) await montage.fermer();
  montage = null;
});

// ───────────────────────────────────────────────────────── GET /api/contenu/noeuds/:id

describe('GET /api/contenu/noeuds/:id', () => {
  it('rend le paquet complet — nœud, exercice et habillage en une seule requête', async () => {
    const application = await ouvrir(contenuComplet());
    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/noeuds/clairiere-01'
    });

    expect(reponse.statusCode).toBe(200);
    const paquet = reponse.json() as { noeud: Noeud; exercice: Exercice; habillage: Habillage };
    // « Tout ce qu'il faut pour jouer un nœud, en une seule requête » (contrat § 4, PaquetNoeud).
    expect(paquet.noeud.id).toBe('clairiere-01');
    expect(paquet.exercice.id).toBe('clairiere-ecole-01');
    expect(paquet.habillage.id).toBe('clairiere.ecole');
  });

  it('répond 404 sur un nœud inconnu, et non un corps vide', async () => {
    const application = await ouvrir(contenuComplet());
    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/noeuds/nulle-part-42'
    });

    expect(reponse.statusCode).toBe(404);
    // « Toute erreur répond `ErreurApi` » — contrat § 3.3.
    expect(reponse.json()).toMatchObject({ code: 'introuvable' });
  });

  it('répond 422 quand le nœud ne désigne aucun exercice', async () => {
    const noeud = { ...noeudReel() } as Record<string, unknown>;
    delete noeud['exercice'];
    const application = await ouvrir({ ...contenuComplet(), noeuds: [noeud] });

    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/noeuds/clairiere-01'
    });
    expect(reponse.statusCode).toBe(422);
    expect(reponse.json()).toMatchObject({ code: 'invalide' });
  });

  it('répond 404 quand l’exercice désigné est introuvable', async () => {
    const application = await ouvrir({ ...contenuComplet(), exercices: [] });
    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/noeuds/clairiere-01'
    });

    expect(reponse.statusCode).toBe(404);
    expect(String((reponse.json() as { message: string }).message)).toContain('clairiere-ecole-01');
  });

  it('REFUSE un exercice invalide plutôt que de le servir à l’enfant — 422', async () => {
    // Un `id` de région mal orthographié doit produire une erreur lisible ICI, pas une région
    // qui ne se colorie jamais devant l'enfant (en-tête de `serveur/src/routes/contenu.ts`).
    const exercice = exerciceReel() as unknown as Record<string, unknown>;
    delete exercice['competences'];
    (exercice as { titre?: unknown }).titre = 42;
    const application = await ouvrir({ ...contenuComplet(), exercices: [exercice] });

    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/noeuds/clairiere-01'
    });
    expect(reponse.statusCode).toBe(422);
    expect(reponse.json()).toMatchObject({ code: 'invalide' });
  });

  it('répond 404 quand l’habillage déclaré est introuvable', async () => {
    const application = await ouvrir({ ...contenuComplet(), habillages: [] });
    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/noeuds/clairiere-01'
    });

    expect(reponse.statusCode).toBe(404);
    expect(String((reponse.json() as { message: string }).message)).toContain('clairiere.ecole');
  });

  it('répond 422 quand le bloc « jeu » ne colle pas à l’habillage servi', async () => {
    // Même identifiant d'habillage, mais plus aucune des régions que l'exercice cible :
    // c'est exactement l'incohérence que `validerBlocJeu` existe pour attraper.
    const habillage = habillageEcole() as unknown as {
      id: string;
      scene: { calques: Array<{ role: string; regions: unknown[] }> };
    };
    const ampute = {
      ...habillage,
      scene: {
        ...habillage.scene,
        calques: habillage.scene.calques.map((calque) =>
          calque.role === 'coloriable' ? { ...calque, regions: [] } : calque
        )
      }
    };
    const application = await ouvrir({ ...contenuComplet(), habillages: [ampute] });

    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/noeuds/clairiere-01'
    });
    expect(reponse.statusCode).toBe(422);
    expect(reponse.json()).toMatchObject({ code: 'invalide' });
  });
});

// ───────────────────────────────────────────────────────── GET /api/contenu/assets/*

describe('GET /api/contenu/assets/*', () => {
  it('sert le SVG d’habillage avec son type MIME — contrat § 3.3', async () => {
    const application = await ouvrir(contenuComplet());
    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/assets/habillages/clairiere/ecole.svg'
    });

    expect(reponse.statusCode).toBe(200);
    expect(reponse.headers['content-type']).toContain('image/svg+xml');
    expect(reponse.body).toContain('calque-zones');
  });

  it('répond 404 sur un asset absent, sans jamais rendre un corps vide en 200', async () => {
    const application = await ouvrir(contenuComplet());
    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/assets/habillages/nulle-part.svg'
    });

    expect(reponse.statusCode).toBe(404);
    expect(reponse.json()).toMatchObject({ code: 'introuvable' });
  });

  it('répond 400 sur un chemin dont l’échappement est illisible', async () => {
    const application = await ouvrir(contenuComplet());
    // `%E0%A4%A` est une séquence tronquée : `decodeURIComponent` lève.
    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/assets/%E0%A4%A'
    });

    expect(reponse.statusCode).toBe(400);
    expect(reponse.json()).toMatchObject({ code: 'invalide' });
  });

  it('ne sort JAMAIS du dépôt de contenu — la traversée ne rend rien', async () => {
    const application = await ouvrir(contenuComplet());
    const reponse = await application.inject({
      method: 'GET',
      url: '/api/contenu/assets/..%2F..%2Fpackage.json'
    });

    // Le dépôt en mémoire ne connaît que ses clés : la traversée ne peut rien atteindre.
    // La garde de chemin de l'implantation disque est testée avec elle ; ce qui est vérifié
    // ici, c'est qu'aucune réponse 200 ne sort d'un chemin qui remonte.
    expect(reponse.statusCode).not.toBe(200);
  });
});
