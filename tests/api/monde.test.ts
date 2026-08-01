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
import { chargerReferentielMonde, enregistrerFormeGobi } from '@serveur/depots/monde';

import {
  DOSSIER_MIGRATIONS,
  INSTANT_DE_REFERENCE,
  aleaDeTest,
  horlogeDeTest
} from '../configuration/preparation.js';

/** L'application qui porte les trois modules de routes utiles au lot. */
let monde: FastifyInstance;
let base: DatabaseSync;

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

/** Journalise une tentative à trois étoiles sur l'unique nœud livré de la Clairière. */
async function terminerClairiere(profilId: string): Promise<void> {
  const { createHash } = await import('node:crypto');
  const graine = 20260801;
  const reponse = await monde.inject({
    method: 'POST',
    url: '/api/tentatives',
    payload: {
      cleIdempotence: createHash('sha256')
        .update([profilId, 'clairiere-01', INSTANT_DE_REFERENCE, String(graine)].join('|'))
        .digest('hex'),
      profil: profilId,
      noeud: 'clairiere-01',
      exercice: 'clairiere-ecole-01',
      moteur: 'colorie',
      habillage: 'clairiere.ecole',
      graine,
      demarreLe: INSTANT_DE_REFERENCE,
      termineLe: '2026-09-01T08:01:00Z',
      resume: { reussi: true, nbErreurs: 0, aideUtilisee: 'aucune', dureeMs: 60_000, etapes: [] }
    }
  });
  expect(reponse.statusCode).toBeLessThan(300);
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
  it('rend une carte neuve : la Clairière ouverte, les cinq autres voilées', async () => {
    const etat = await lireMondeHttp(await creerProfil());
    expect(etat.carte.regions).toHaveLength(6);
    expect(region(etat, 'clairiere').ouverte).toBe(true);
    expect(etat.carte.regions.filter((entree) => entree.ouverte)).toHaveLength(1);
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
      enregistrerFormeGobi(base, profil, forme.grapheme, referentiel, horloge);
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
    enregistrerFormeGobi(base, profil, referentiel.formes[0]!.grapheme, referentiel, horloge);
    const premiere = base
      .prepare('SELECT obtenue_le FROM formes_gobi WHERE profil_id = ?')
      .get(profil) as { obtenue_le: string };

    enregistrerFormeGobi(base, profil, referentiel.formes[0]!.grapheme, referentiel, horloge);
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
    enregistrerFormeGobi(base, alma, referentiel.formes[0]!.grapheme, referentiel, horloge);

    const monsieurNoe = await lireMondeHttp(noe);
    expect(region(monsieurNoe, 'clairiere').pourcentageColorie).toBe(0);
    expect(region(monsieurNoe, 'galeries').ouverte).toBe(false);
    expect(monsieurNoe.gobi.formes).toEqual([]);
    expect(monsieurNoe.campement.every((objet) => objet.placeLe === null)).toBe(true);

    // Et le monde d'Alma, lui, n'a rien perdu au passage.
    const madameAlma = await lireMondeHttp(alma);
    expect(region(madameAlma, 'clairiere').pourcentageColorie).toBe(1);
    expect(madameAlma.gobi.formes).toHaveLength(1);
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
