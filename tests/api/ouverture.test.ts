/**
 * La séquence d'ouverture — sa donnée, son schéma, sa table et ses deux routes.
 * Lot N4, contrat de finition v3 § 7.1 et § 8 (D35).
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE ALORS QUE LE § 4.4 NE LE LISTE PAS
 *
 * Le § 4.4 confie à N4 la migration `007_ouverture.sql` et l'écriture de `ouverture_vue` dans
 * `serveur/src/depots/monde.ts`, et ne lui accorde aucun fichier de test pour les couvrir. Or
 * la convention C4 exige de chaque livrable un chiffre qui échoue si le travail est creux, et
 * la boucle de travail du projet impose « le test d'abord, qui échoue pour la bonne raison ».
 * Une migration livrée sans test est une table dont personne n'a jamais vérifié qu'elle
 * s'applique — et une migration modifiée après coup est une erreur bloquante, donc on ne la
 * corrige pas plus tard.
 *
 * Ce fichier ne peut avoir de second écrivain : il porte le nom de l'objet de N4. L'écart au
 * § 0 est signalé au rapport plutôt que dissimulé.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * MONTAGE PROPRE AU LOT, pour la même raison que `tests/api/monde.test.ts` : monter
 * l'application complète ferait dépendre ce fichier des sept autres lots écrits en parallèle,
 * et un échec ne dirait plus rien de N4.
 */
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';

import {
  CHEMINS_OUVERTURE,
  ORDRE_TABLEAUX,
  OUVERTURE_JAMAIS_VUE,
  ouvertureAJouerSeule,
  sequenceDuDocument
} from '@pierre/partage/ouverture';
import type { EtatOuverture } from '@pierre/partage/ouverture';

import { enregistrerRoutesMonde, validerFinOuverture } from '@serveur/routes/monde';
import { enregistrerRoutesProfils } from '@serveur/routes/profils';
import { enregistrerOuvertureVue, lireOuverture } from '@pierre/partage/base';
import type { Base, ReferentielMonde } from '@pierre/partage/base';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  DOSSIER_MIGRATIONS,
  RACINE_DEPOT,
  aleaDeTest,
  horlogeDeTest,
  lireJson
} from '../configuration/preparation.js';

let application: FastifyInstance;
let base: DatabaseSync;
let baseAsync: Base;

const horloge = horlogeDeTest();

/**
 * Un referentiel VIDE, injecte plutot que charge — et c'est une decision, pas un raccourci.
 *
 * `enregistrerRoutesMonde` charge `contenu/monde/` par defaut : les six regions, les stades de
 * Gobi, les compagnons, le campement. Les deux routes d'ouverture n'en lisent AUCUN. En laissant
 * le chargement se faire, ce fichier echouerait des qu'un autre lot touche `gobi-stades.json` —
 * mesure a l'appui, il l'a fait pendant l'ecriture de N4 :
 *
 *   → Stade 1 : code inconnu « fissure ».   (N3 livrait ses 10 stades de D43)
 *
 * Un echec de N3 qui fait rougir la suite de N4 ne dit plus rien de N4. « Un echec ne dirait
 * plus rien du lot » est la raison meme du montage propre annonce en tete de fichier ; on la
 * pousse jusqu'au bout.
 */
const REFERENTIEL_VIDE = {
  regions: [],
  ouvertesEnParallele: 2,
  stades: [],
  formes: [],
  compagnons: [],
  campement: { scene: { fichier: '', viewBox: '0 0 1 1' }, points: [], objets: [] }
} as unknown as ReferentielMonde;

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

  const contexte = {
    base: baseAsync,
    contenu: new factices.DepotContenuMemoire({}),
    horloge,
    alea: aleaDeTest()
  };

  application = Fastify({ logger: false });
  enregistrerRoutesProfils(application, contexte);
  enregistrerRoutesMonde(application, contexte, REFERENTIEL_VIDE);
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

describe('007_ouverture.sql — la migration s’applique et la table existe', () => {
  it('crée `ouverture_vue`, en mode STRICT, avec ses deux contraintes', () => {
    const table = base
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'ouverture_vue'")
      .get() as unknown as { readonly sql: string } | undefined;

    expect(table).toBeDefined();
    // Mesuré sur le schéma réel, pas sur le fichier source : c'est ce que SQLite a retenu.
    expect(table?.sql).toMatch(/STRICT/u);
    expect(table?.sql).toMatch(/passee IN \(0, 1\)/u);
    expect(table?.sql).toMatch(/nb_rejeux >= 0/u);
  });

  it('refuse une ligne orpheline — la clé étrangère vers `profils` mord', () => {
    // `PRAGMA foreign_keys = ON` est posé à l'ouverture de la connexion (contrat v1 § 6.1).
    // Sans lui, un profil supprimé laisserait des lignes d'ouverture fantômes.
    expect(() => {
      base
        .prepare('INSERT INTO ouverture_vue (profil_id, vue_le, passee) VALUES (?, ?, ?)')
        .run('profil-qui-n-existe-pas', '2026-09-01T08:00:00.000Z', 0);
    }).toThrow();
  });
});

describe('le dépôt — R14 : un acquis n’est jamais repris', () => {
  it('un profil neuf n’a jamais vu la séquence, et rien n’est écrit pour lui', async () => {
    const profil = await creerProfil();
    expect(await lireOuverture(baseAsync, profil)).toEqual(OUVERTURE_JAMAIS_VUE);

    const lignes = base
      .prepare('SELECT COUNT(*) AS n FROM ouverture_vue')
      .get() as unknown as { readonly n: number };
    expect(Number(lignes.n)).toBe(0);
  });

  it('« passée » ne repasse JAMAIS à vrai une fois la séquence vue en entier', async () => {
    const profil = await creerProfil();

    // L'enfant saute le récit la première fois.
    expect((await enregistrerOuvertureVue(baseAsync, profil, true, horloge)).passee).toBe(true);
    // Puis il le regarde en entier. C'est un acquis.
    expect((await enregistrerOuvertureVue(baseAsync, profil, false, horloge)).passee).toBe(false);
    // Il le saute de nouveau : la réponse au parent — « l'a-t-il vue ? » — reste OUI.
    expect((await enregistrerOuvertureVue(baseAsync, profil, true, horloge)).passee).toBe(false);
  });

  it('garde la PREMIÈRE date, et compte les rejeux au-delà du premier passage', async () => {
    const profil = await creerProfil();

    await enregistrerOuvertureVue(baseAsync, profil, false, horloge);
    const premiere = base
      .prepare('SELECT vue_le FROM ouverture_vue WHERE profil_id = ?')
      .get(profil) as unknown as { readonly vue_le: string };

    const apresDeux = await enregistrerOuvertureVue(baseAsync, profil, false, horlogeDeTest('2027-01-01T10:00:00Z'));
    const apresTrois = await enregistrerOuvertureVue(baseAsync, profil, false, horlogeDeTest('2027-02-01T10:00:00Z'));

    expect(apresDeux.nbRejeux).toBe(1);
    expect(apresTrois.nbRejeux).toBe(2);

    const finale = base
      .prepare('SELECT vue_le FROM ouverture_vue WHERE profil_id = ?')
      .get(profil) as unknown as { readonly vue_le: string };
    // Le jour de la découverte n'est jamais réécrit par un rejeu.
    expect(String(finale.vue_le)).toBe(String(premiere.vue_le));
  });

  it('étanchéité entre profils — le récit d’Alma n’apparaît jamais chez Noé', async () => {
    const alma = await creerProfil('Alma');
    const noe = await creerProfil('Noé');

    await enregistrerOuvertureVue(baseAsync, alma, false, horloge);

    expect((await lireOuverture(baseAsync, alma)).vue).toBe(true);
    expect(await lireOuverture(baseAsync, noe)).toEqual(OUVERTURE_JAMAIS_VUE);
  });
});

describe('les deux routes du § 8', () => {
  it('GET rend `vue: false` pour un profil neuf', async () => {
    const profil = await creerProfil();
    const reponse = await application.inject({
      method: 'GET',
      url: CHEMINS_OUVERTURE.pour(profil)
    });
    expect(reponse.statusCode).toBe(200);
    expect(reponse.json<EtatOuverture>()).toEqual(OUVERTURE_JAMAIS_VUE);
  });

  it('POST enregistre, et GET le relit', async () => {
    const profil = await creerProfil();

    const poste = await application.inject({
      method: 'POST',
      url: CHEMINS_OUVERTURE.pour(profil),
      payload: { passee: true }
    });
    expect(poste.statusCode).toBe(200);
    expect(poste.json<EtatOuverture>()).toEqual({ vue: true, passee: true, nbRejeux: 0 });

    const relu = await application.inject({
      method: 'GET',
      url: CHEMINS_OUVERTURE.pour(profil)
    });
    expect(relu.json<EtatOuverture>()).toEqual({ vue: true, passee: true, nbRejeux: 0 });
  });

  it('répond 404 sur un profil inconnu, jamais 500', async () => {
    for (const methode of ['GET', 'POST'] as const) {
      const reponse = await application.inject({
        method: methode,
        url: CHEMINS_OUVERTURE.pour('profil-inconnu'),
        payload: methode === 'POST' ? { passee: false } : undefined
      });
      expect(reponse.statusCode).toBe(404);
    }
  });

  it('refuse un `passee` mal typé, mais accepte son absence', async () => {
    const profil = await creerProfil();

    const mauvais = await application.inject({
      method: 'POST',
      url: CHEMINS_OUVERTURE.pour(profil),
      payload: { passee: 'oui' }
    });
    expect(mauvais.statusCode).toBe(400);

    const sansChamp = await application.inject({
      method: 'POST',
      url: CHEMINS_OUVERTURE.pour(profil),
      payload: {}
    });
    expect(sansChamp.statusCode).toBe(200);
    expect(sansChamp.json<EtatOuverture>().passee).toBe(false);
  });
});

describe('la validation du corps, en isolation', () => {
  it('traite l’absence de corps comme « vue, non passée »', () => {
    expect(validerFinOuverture(undefined)).toEqual({ ok: true, passee: false });
    expect(validerFinOuverture(null)).toEqual({ ok: true, passee: false });
    expect(validerFinOuverture({})).toEqual({ ok: true, passee: false });
  });

  it('refuse ce qui n’est pas un booléen', () => {
    expect(validerFinOuverture({ passee: 1 }).ok).toBe(false);
    expect(validerFinOuverture({ passee: 'true' }).ok).toBe(false);
    expect(validerFinOuverture('passee').ok).toBe(false);
  });
});

describe('les deux chemins ne sont écrits QU’UNE fois (convention C5)', () => {
  it('la forme construite et la forme paramétrée décrivent la même route', () => {
    expect(CHEMINS_OUVERTURE.motif).toBe('/api/profils/:id/ouverture');
    expect(CHEMINS_OUVERTURE.pour('abc')).toBe('/api/profils/abc/ouverture');
    // Le client (`routeur.tsx`) et le serveur (`routes/monde.ts`) importent tous deux CETTE
    // table. Un renommage ici ne compile plus des deux côtés — c'est le but.
    expect(CHEMINS_OUVERTURE.pour('a/b')).toBe('/api/profils/a%2Fb/ouverture');
  });
});

describe('contenu/schemas/ouverture.schema.json — la donnée livrée', () => {
  async function valideur() {
    const { default: Ajv2020 } = await import('ajv/dist/2020.js');
    const construire = Ajv2020 as unknown as new (o?: Record<string, unknown>) => {
      compile(schema: unknown): ((donnees: unknown) => boolean) & { errors?: unknown };
    };
    return new construire({ allErrors: true, strict: false }).compile(
      lireJson('contenu/schemas/ouverture.schema.json')
    );
  }

  it('`contenu/monde/ouverture.json` satisfait son schéma', async () => {
    const valider = await valideur();
    const ok = valider(lireJson('contenu/monde/ouverture.json'));
    expect(JSON.stringify(valider.errors ?? [])).toBe('[]');
    expect(ok).toBe(true);
  });

  it('REFUSE un `passableDesMs` non nul — D35 point 3 est gelé dans le schéma', async () => {
    // Le jour où quelqu'un voudra « juste deux secondes pour poser l'ambiance », le fichier
    // refusera de se charger. C'est la seule façon qu'une règle de conception survive à une
    // bonne intention.
    const valider = await valideur();
    const document = lireJson<Record<string, unknown>>('contenu/monde/ouverture.json');
    expect(valider({ ...document, passableDesMs: 1500 })).toBe(false);
  });

  it('REFUSE un récit amputé — les cinq tableaux de D35 sont exigés', async () => {
    const valider = await valideur();
    const document = lireJson<{ tableaux: unknown[] }>('contenu/monde/ouverture.json');
    expect(valider({ ...document, tableaux: document.tableaux.slice(0, 3) })).toBe(false);
  });

  it('REFUSE une `cleAudio` qui serait un chemin de fichier', async () => {
    // La résolution passe par la CLÉ du manifeste de N2, jamais par un chemin (§ 5.4). Un
    // `.opus` glissé ici résoudrait dans le vide et D42 masquerait le bouton partout.
    const valider = await valideur();
    const document = lireJson<{ tableaux: Record<string, unknown>[] }>(
      'contenu/monde/ouverture.json'
    );
    const abime = document.tableaux.map((tableau, rang) =>
      rang === 0 ? { ...tableau, cleAudio: 'audio/ouverture/pierre.opus' } : tableau
    );
    expect(valider({ ...document, tableaux: abime })).toBe(false);
  });

  it('les cinq décors déclarés existent sur disque', () => {
    const document = lireJson<{ tableaux: readonly { readonly asset: string }[] }>(
      'contenu/monde/ouverture.json'
    );
    for (const tableau of document.tableaux) {
      expect(existsSync(join(RACINE_DEPOT, 'contenu', tableau.asset)), tableau.asset).toBe(true);
    }
  });
});

describe('sequenceDuDocument — aucun repli silencieux', () => {
  const document = () =>
    lireJson<Record<string, unknown>>('contenu/monde/ouverture.json');

  it('lit le document livré et rend les cinq tableaux dans l’ordre du récit', () => {
    const lue = sequenceDuDocument(document());
    expect(lue.tableaux.map((tableau) => tableau.code)).toEqual([...ORDRE_TABLEAUX]);
    expect(lue.passableDesMs).toBe(0);
  });

  it('LÈVE sur un récit amputé — un monde à moitié chargé ne se voit pas', () => {
    // Même motif que `chargerReferentielMonde` : une ouverture à trois tableaux raconterait une
    // histoire qui s'arrête AVANT que l'enfant n'apprenne qu'il peut agir. C'est exactement le
    // défaut que D35 corrige, réintroduit par la porte de derrière.
    const brut = document() as { tableaux: unknown[] };
    expect(() => sequenceDuDocument({ ...brut, tableaux: brut.tableaux.slice(0, 3) })).toThrow(
      /ordre du récit/u
    );
  });

  it('LÈVE sur un `passableDesMs` non nul — D35 point 3 n’est pas négociable en données', () => {
    expect(() => sequenceDuDocument({ ...document(), passableDesMs: 800 })).toThrow(
      /passableDesMs/u
    );
  });

  it('LÈVE sur un tableau inconnu, un champ manquant, un document vide', () => {
    const brut = document() as { tableaux: Record<string, unknown>[] };
    expect(() =>
      sequenceDuDocument({
        ...brut,
        tableaux: brut.tableaux.map((t, r) => (r === 0 ? { ...t, code: 'epilogue' } : t))
      })
    ).toThrow(/n'est pas un tableau connu/u);

    expect(() =>
      sequenceDuDocument({
        ...brut,
        tableaux: brut.tableaux.map((t, r) => (r === 1 ? { ...t, texte: '' } : t))
      })
    ).toThrow(/texte/u);

    expect(() => sequenceDuDocument(null)).toThrow(/document/u);
    expect(() => sequenceDuDocument({ passableDesMs: 0 })).toThrow(/tableaux/u);
  });
});

describe('ouvertureAJouerSeule — l’interrupteur de l’arbitrage N4-1', () => {
  /*
   * Cette fonction est EXPORTÉE ET DÉLIBÉRÉMENT NON APPELÉE. Elle n'est pas du code mort :
   * c'est le point de retour de l'arbitrage N4-1 (`Docs/questions-en-attente.md`), qui a
   * tranché que la séquence est offerte et jamais imposée — D46 point 3, « aucun écran
   * intermédiaire obligatoire, nulle part ».
   *
   * On la teste pour que « revenir en arrière est une ligne » soit vrai. Un interrupteur de
   * secours jamais essayé n'est pas un interrupteur de secours.
   */
  it('ne jouerait la séquence que sur le chemin de la CARTE, jamais sur celui du jeu', () => {
    expect(ouvertureAJouerSeule(OUVERTURE_JAMAIS_VUE, 'carte')).toBe(true);
    // D46 point 1 : « partir en sortie doit se faire en un tap, sans traverser le hub ». La
    // pastille de sortie de N6 mène droit à un nœud ; rien ne s'y interpose, jamais.
    expect(ouvertureAJouerSeule(OUVERTURE_JAMAIS_VUE, 'noeud')).toBe(false);
    expect(ouvertureAJouerSeule(OUVERTURE_JAMAIS_VUE, 'autre')).toBe(false);
  });

  it('ne la rejouerait jamais toute seule une fois vue — R14', () => {
    const vue = { vue: true, passee: true, nbRejeux: 0 };
    expect(ouvertureAJouerSeule(vue, 'carte')).toBe(false);
  });
});
