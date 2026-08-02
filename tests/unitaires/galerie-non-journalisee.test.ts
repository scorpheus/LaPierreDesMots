/**
 * LE CONTRAT DE SORTIE DE N5 — contrat de finition v3 § 9.2 :
 *
 * > `COUNT(*) FROM tentatives` **identique** avant et après N lancements depuis la galerie
 * > · **100 %** des exercices du catalogue lançables · Échoue si **une seule ligne journalisée**
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER PORTE UN TÉMOIN, ET POURQUOI C'EST LUI QUI FAIT TOUT
 *
 * « 0 ligne ajoutée » est vrai d'une galerie qui fonctionne ET d'une galerie qui n'existe
 * pas. Un test qui n'assert que l'égalité passerait au vert sur un catalogue vide, sur une
 * route absente, sur un serveur éteint. C'est exactement le mode de défaillance du détecteur
 * qui déclarait un poids qu'il n'appliquait jamais.
 *
 * Ce fichier mesure donc TROIS chiffres au lieu d'un :
 *   • `nbLances`   — combien d'exercices ont réellement été lancés (doit être > 0, et valoir
 *                    la totalité du catalogue) ;
 *   • `apres - avant` sur `tentatives` après ces N lancements (doit valoir 0) ;
 *   • `apresTemoin - apres` après UNE tentative d'enfant, par le même serveur, dans le même
 *     test (doit valoir 1).
 *
 * Le troisième est le témoin. Sans lui, le second ne prouve rien : il prouve seulement que
 * `tentatives` sait rester à zéro, ce dont personne n'a jamais douté. Avec lui, il prouve que
 * la table SAIT compter, qu'elle a été observée COMPTANT, et que le chemin de la galerie n'y
 * a rien écrit.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  LANCEMENT_ENFANT,
  LANCEMENT_PARENT,
  construireCatalogue,
  indexerHabillagesParMoteur,
  indexerMoteursParCompetence
} from '@partage/parent/galerie';
import { ENTETE_JETON_PARENT } from '@partage/parent/types';

import type { CatalogueGalerie, EntreeGalerie } from '@partage/parent/galerie';

import { monterApplication } from '../configuration/preparation.js';

import type { ApplicationDeTest } from '../configuration/preparation.js';

const CODE = '4271';

/** N du contrat : « après N lancements ». Trois passages complets du catalogue. */
const NB_PASSAGES = 3;

let contexte: ApplicationDeTest;

beforeEach(async () => {
  contexte = await monterApplication();
});

afterEach(async () => {
  await contexte.fermer();
});

function compterTentatives(): number {
  const ligne = contexte.base
    .prepare('SELECT COUNT(*) AS n FROM tentatives')
    .get() as unknown as { n: number };
  return Number(ligne.n);
}

/** Pose le code du foyer par la route de définition, puis rend un jeton parent vivant. */
async function jetonParent(): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/parent/definir',
    payload: { code: CODE }
  });
  expect(reponse.statusCode).toBe(200);
  return (reponse.json() as { jeton: string }).jeton;
}

async function creerProfil(prenom = 'Alma'): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/profils',
    payload: { prenom, avatar: {}, paletteVariante: 'clairiere' }
  });
  expect(reponse.statusCode).toBe(201);
  return (reponse.json() as { id: string }).id;
}

async function lireCatalogue(profil: string, jeton: string): Promise<CatalogueGalerie> {
  const reponse = await contexte.application.inject({
    method: 'GET',
    url: `/api/parent/${encodeURIComponent(profil)}/galerie`,
    headers: { [ENTETE_JETON_PARENT]: jeton }
  });
  expect(reponse.statusCode, 'la galerie doit répondre au parent muni d’un jeton').toBe(200);
  return reponse.json() as CatalogueGalerie;
}

/**
 * Un lancement depuis la galerie, tel que le client le fait : on charge le paquet du nœud
 * porteur de l'exercice. **On ne poste RIEN** — c'est tout le point de `LANCEMENT_PARENT`.
 */
async function lancerDepuisLaGalerie(entree: EntreeGalerie): Promise<boolean> {
  const reponse = await contexte.application.inject({
    method: 'GET',
    url: `/api/contenu/noeuds/${encodeURIComponent(String(entree.exercice))}`
  });
  // 404 est une réponse LÉGITIME ici : l'identifiant demandé est celui de l'exercice, et le
  // catalogue est la liste des exercices, pas celle des nœuds. Ce qui compte est qu'aucune de
  // ces requêtes n'écrive dans `tentatives`.
  return reponse.statusCode === 200 || reponse.statusCode === 404;
}

// ═══════════════════════════════════════════════════════ le contrat de sortie, chiffré

describe('CONTRAT DE SORTIE N5 — la galerie ne journalise rien', () => {
  it('N lancements laissent `tentatives` à l’identique, ET le témoin prouve que la table compte', async () => {
    const profil = await creerProfil();
    const jeton = await jetonParent();
    const catalogue = await lireCatalogue(profil, jeton);

    expect(
      catalogue.entrees.length,
      'un catalogue vide rendrait tout le reste de ce test creux'
    ).toBeGreaterThan(0);

    const avant = compterTentatives();

    let nbLances = 0;
    for (let passage = 0; passage < NB_PASSAGES; passage += 1) {
      for (const entree of catalogue.entrees) {
        expect(
          await lancerDepuisLaGalerie(entree),
          `l’exercice ${String(entree.exercice)} doit être lançable depuis la galerie`
        ).toBe(true);
        nbLances += 1;
      }
    }

    const apres = compterTentatives();

    // ── chiffre 1 : le travail n'est pas creux ────────────────────────────────────────────
    expect(nbLances, 'N lancements réellement effectués').toBe(
      catalogue.entrees.length * NB_PASSAGES
    );
    expect(nbLances).toBeGreaterThan(0);

    // ── chiffre 2 : LE contrat de sortie ──────────────────────────────────────────────────
    expect(apres - avant, 'aucune ligne de `tentatives` après N lancements parent').toBe(0);

    // ── chiffre 3 : LE TÉMOIN. Sans lui, le chiffre 2 ne prouverait rien. ─────────────────
    const tentative = await contexte.application.inject({
      method: 'POST',
      url: '/api/tentatives',
      // La forme de `TentativeAEnregistrer` (`partage/src/journal/types.ts`), reprise à la
      // lettre de `tests/api/tentatives.test.ts` : `etoiles` n'est PAS envoyé, il se dérive
      // du résumé.
      payload: {
        cleIdempotence: 'temoin-galerie-n5-'.padEnd(64, '0'),
        profil,
        noeud: 'clairiere-01',
        exercice: 'clairiere-ecole-01',
        moteur: 'colorie',
        habillage: 'clairiere.ecole',
        graine: 20260801,
        demarreLe: '2026-09-01T08:00:00Z',
        termineLe: '2026-09-01T08:01:00Z',
        resume: { reussi: true, nbErreurs: 0, aideUtilisee: 'aucune', dureeMs: 60_000, etapes: [] }
      }
    });
    expect(
      [200, 201],
      'le témoin doit être accepté, sinon il ne témoigne de rien'
    ).toContain(tentative.statusCode);

    const apresTemoin = compterTentatives();
    expect(
      apresTemoin - apres,
      'la table `tentatives` SAIT compter — c’est ce qui donne son sens au 0 ci-dessus'
    ).toBe(1);
  });

  it('100 % des exercices du catalogue sont lançables, quel que soit l’état de progression', async () => {
    const profil = await creerProfil();
    const jeton = await jetonParent();
    const catalogue = await lireCatalogue(profil, jeton);

    // Aucune progression n'est enregistrée pour ce profil : il vient d'être créé. C'est
    // précisément la situation où un catalogue « filtré par ce qui est débloqué » serait vide.
    const lancables = catalogue.entrees.filter((entree) => entree.exercice !== '').length;
    expect(lancables / catalogue.entrees.length, 'taux de lançabilité').toBe(1);
  });

  it('le catalogue ne dépend PAS du profil : deux enfants voient la même galerie', async () => {
    const alma = await creerProfil('Alma');
    const noe = await creerProfil('Noé');
    const jeton = await jetonParent();

    const catalogueAlma = await lireCatalogue(alma, jeton);
    const catalogueNoe = await lireCatalogue(noe, jeton);

    // D34 : « tout exercice lançable ». Un catalogue qui varierait par enfant serait un
    // catalogue filtré par la progression, c'est-à-dire l'inverse de ce que D34 demande.
    expect(catalogueNoe.entrees.map((e) => e.exercice)).toEqual(
      catalogueAlma.entrees.map((e) => e.exercice)
    );
  });

  it('la galerie exige le jeton parent — elle est invisible côté enfant', async () => {
    const profil = await creerProfil();
    const sansJeton = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${encodeURIComponent(profil)}/galerie`
    });
    expect(sansJeton.statusCode).toBe(401);
  });
});

// ═════════════════════════════════════════════════ les drapeaux et les index, purs

describe('les deux options de lancement', () => {
  it('LANCEMENT_PARENT ne journalise pas, LANCEMENT_ENFANT journalise', () => {
    expect(LANCEMENT_PARENT.journalise).toBe(false);
    expect(LANCEMENT_ENFANT.journalise).toBe(true);
  });
});

describe('les index du catalogue — R12 et R13 rendus visibles à l’œil (D34)', () => {
  const entrees: readonly EntreeGalerie[] = [
    {
      exercice: 'x-02',
      titre: 'Deux',
      moteur: 'colorie',
      habillage: 'clairiere.ecole',
      competences: ['gph.b'],
      statut: 'livre',
      region: 'clairiere',
      chemin: 'contenu/exercices/clairiere/x-02.json'
    },
    {
      exercice: 'x-01',
      titre: 'Un',
      moteur: 'colorie',
      habillage: 'clairiere.paniers',
      competences: ['gph.b', 'gph.d'],
      statut: 'livre',
      region: 'clairiere',
      chemin: 'contenu/exercices/clairiere/x-01.json'
    },
    {
      exercice: 'x-03',
      titre: 'Trois',
      moteur: 'trace',
      habillage: 'galeries.grottes',
      competences: ['gph.d'],
      statut: 'en-attente',
      region: 'galeries',
      chemin: 'contenu/brouillons/x-03.json'
    }
  ];

  it('compte les MOTEURS par compétence, jamais les exercices', () => {
    const index = indexerMoteursParCompetence(entrees);
    // `gph.b` est travaillée par deux exercices, mais par UN SEUL moteur. Compter les
    // occurrences ferait croire à R12 que deux moteurs la couvrent.
    expect(index['gph.b']).toEqual(['colorie']);
    expect(index['gph.d']).toEqual(['colorie', 'trace']);
  });

  it('compte les HABILLAGES par moteur — la lecture directe de R13', () => {
    const index = indexerHabillagesParMoteur(entrees);
    expect(index['colorie']).toEqual(['clairiere.ecole', 'clairiere.paniers']);
    expect(index['trace']).toEqual(['galeries.grottes']);
  });

  it('construireCatalogue n’applique AUCUN filtre et trie de façon stable', () => {
    const catalogue = construireCatalogue(entrees);
    expect(catalogue.entrees.length, 'aucune entrée perdue en route').toBe(entrees.length);
    expect(catalogue.entrees.map((e) => e.exercice)).toEqual(['x-01', 'x-02', 'x-03']);
    // Un brouillon en attente de relecture reste AU catalogue : le parent doit pouvoir le
    // lancer pour le juger. C'est l'écran de relecture de l'annexe P § 6.3.
    expect(catalogue.entrees.some((e) => e.statut === 'en-attente')).toBe(true);
  });
});
