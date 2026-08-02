/**
 * `GET /api/parent/:profil/etat` — lot H2, point 3. Annexe T § T2.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════
 * LE TEST QUI GARDE LE RISQUE — et il rejoue l'ÉTAT RÉEL, pas un état inventé
 *
 * Le défaut du 2026-08-02 n'a échappé à 1478 tests unitaires, 186 E2E et 226 contrôles de
 * contenu que pour une raison : **la QA teste un logiciel neuf, jamais un logiciel vécu.**
 * Elle crée une base vierge, joue, vérifie, jette. Elle ne rencontre jamais un profil dont
 * l'état a été écrit par une version ANTÉRIEURE du contenu.
 *
 * `profilVecu()` produit exactement cet état, relevé sur `donnees/pierre.db` :
 *
 *     progression_region : clairiere  pourcentage_colorie = 1  eclat_obtenu_le renseigné
 *                          galeries   pourcentage_colorie = 1  eclat_obtenu_le renseigné
 *     progression_noeud  : clairiere-01, galeries-01, galeries-02
 *     contenu livré      : clairiere 6 nœuds, galeries 12 — 18 en tout
 *
 * C'est le seul semis de la suite qui écrit une projection SANS écrire le journal qui la
 * justifierait. Aucune route ne peut produire cet état, et c'est le sujet : il vient du temps
 * qui passe, pas d'une séquence d'appels.
 *
 * Le cas `CONTRAT DE SORTIE` ci-dessous exige `regionsIncoherentes === 2`. Il échouait avant
 * ce lot pour la raison mécanique la plus simple — la route n'existait pas, la requête rendait
 * 404 (sortie citée au rapport de H2).
 * ═════════════════════════════════════════════════════════════════════════════════════════
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENTETE_JETON_PARENT } from '@partage/parent/types';

import { INSTANT_DE_REFERENCE, monterApplication } from '../configuration/preparation.js';

import type { EtatProfil } from '@pierre/partage/parent';
import type { ApplicationDeTest } from '../configuration/preparation.js';

const CODE = '4271';
const PRENOM = 'Ezékiel';

/** Relevé sur `contenu/monde/regions.json` le 2026-08-02. Recompté par le premier cas. */
const NOEUDS_LIVRES_ATTENDUS = 18;

let contexte: ApplicationDeTest;

beforeEach(async () => {
  contexte = await monterApplication();
});

afterEach(async () => {
  await contexte.fermer();
});

async function jeton(): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/parent/definir',
    payload: { code: CODE }
  });
  expect(reponse.statusCode).toBe(200);
  return (reponse.json() as { jeton: string }).jeton;
}

async function creerProfil(prenom = PRENOM): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/profils',
    payload: { prenom, avatar: {}, paletteVariante: 'clairiere' }
  });
  expect(reponse.statusCode).toBe(201);
  return (reponse.json() as { id: string }).id;
}

async function lireEtat(profil: string, entetes: Record<string, string>): Promise<EtatProfil> {
  const reponse = await contexte.application.inject({
    method: 'GET',
    url: `/api/parent/${profil}/etat`,
    headers: entetes
  });
  expect(reponse.statusCode).toBe(200);
  return reponse.json() as EtatProfil;
}

/**
 * L'état vécu du 2026-08-02, écrit à la main : deux régions figées à 100 % par une version
 * antérieure du contenu, trois nœuds terminés, seize nœuds ajoutés depuis.
 */
function profilVecu(profil: string): void {
  const noeuds = ['clairiere-01', 'galeries-01', 'galeries-02'];
  for (const noeud of noeuds) {
    contexte.base
      .prepare('INSERT INTO progression_noeud VALUES (?, ?, ?, ?, ?)')
      .run(profil, noeud, 3, 1, INSTANT_DE_REFERENCE);
  }
  for (const region of ['clairiere', 'galeries']) {
    contexte.base
      .prepare('INSERT INTO progression_region VALUES (?, ?, ?, ?, ?)')
      .run(profil, region, 1, 1, INSTANT_DE_REFERENCE);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════

describe('GET /api/parent/:profil/etat — la porte', () => {
  it('refuse sans jeton parent', async () => {
    const profil = await creerProfil();
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${profil}/etat`
    });
    expect(reponse.statusCode).toBe(401);
  });

  it('répond 404 sur un profil inconnu, jamais un état vide', async () => {
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: '/api/parent/prf-inexistant/etat',
      headers: entetes
    });
    expect(reponse.statusCode).toBe(404);
  });
});

describe('GET /api/parent/:profil/etat — un profil neuf', () => {
  it('dit 0 nœud terminé sur les nœuds livrés, et aucune incohérence', async () => {
    const profil = await creerProfil();
    const etat = await lireEtat(profil, { [ENTETE_JETON_PARENT]: await jeton() });

    expect(etat.prenom).toBe(PRENOM);
    expect(etat.noeudsTermines).toBe(0);
    expect(etat.noeudsLivres).toBe(NOEUDS_LIVRES_ATTENDUS);
    expect(etat.etoilesObtenues).toBe(0);
    expect(etat.etoilesPossibles).toBe(NOEUDS_LIVRES_ATTENDUS * 3);
    expect(etat.nbTentatives).toBe(0);
    expect(etat.dernieresTentatives).toEqual([]);

    // Sur un profil neuf, stocké et recalculé valent tous deux 0 : l'écran ne doit alarmer
    // personne. Un écran qui crierait au loup sur une base vierge ne serait plus lu.
    expect(etat.regionsIncoherentes).toBe(0);
    for (const region of etat.regions) {
      expect(region.ecart, region.region).toBe(0);
    }
  });

  it('liste TOUTES les régions, y compris celles sans aucun nœud livré', async () => {
    const profil = await creerProfil();
    const etat = await lireEtat(profil, { [ENTETE_JETON_PARENT]: await jeton() });

    expect(etat.regions).toHaveLength(6);
    expect(etat.regions.map((r) => r.ordre)).toEqual([1, 2, 3, 4, 5, 6]);
    // Le total des nœuds livrés se RECOMPTE ici, il n'est pas repris d'un document.
    expect(etat.regions.reduce((n, r) => n + r.noeudsLivres, 0)).toBe(NOEUDS_LIVRES_ATTENDUS);
  });
});

describe('GET /api/parent/:profil/etat — le profil VÉCU du 2026-08-02', () => {
  it('CONTRAT DE SORTIE : deux régions mentent, et l’écran le dit — regionsIncoherentes = 2', async () => {
    const profil = await creerProfil();
    profilVecu(profil);
    const etat = await lireEtat(profil, { [ENTETE_JETON_PARENT]: await jeton() });

    expect(etat.regionsIncoherentes).toBe(2);

    const clairiere = etat.regions.find((r) => r.region === 'clairiere');
    expect(clairiere?.pourcentageStocke).toBe(1);
    expect(clairiere?.noeudsTermines).toBe(1);
    expect(clairiere?.noeudsLivres).toBe(6);
    // 1 nœud sur 6 : le recalcul vaut un sixième, et l'écart vaut le reste.
    expect(clairiere?.pourcentageRecalcule).toBeCloseTo(1 / 6, 6);
    expect(clairiere?.ecart).toBeCloseTo(5 / 6, 6);

    const galeries = etat.regions.find((r) => r.region === 'galeries');
    expect(galeries?.pourcentageStocke).toBe(1);
    expect(galeries?.noeudsTermines).toBe(2);
    expect(galeries?.noeudsLivres).toBe(12);
    expect(galeries?.pourcentageRecalcule).toBeCloseTo(2 / 12, 6);
    expect(galeries?.ecart).toBeCloseTo(10 / 12, 6);
  });

  it('l’écran CONSTATE et ne répare pas — la projection reste fausse après lecture', async () => {
    const profil = await creerProfil();
    profilVecu(profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    await lireEtat(profil, entetes);
    await lireEtat(profil, entetes);

    // Réparer en affichant rendrait l'écran inutilisable pour constater, et masquerait le
    // défaut au lot H1 qui doit le corriger PAR MIGRATION, une fois.
    const ligne = contexte.base
      .prepare(
        'SELECT pourcentage_colorie AS p FROM progression_region WHERE profil_id = ? AND region_code = ?'
      )
      .get(profil, 'clairiere') as unknown as { p: number };
    expect(Number(ligne.p)).toBe(1);

    // Et l'écran continue de le dire, autant de fois qu'on le lui demande.
    expect((await lireEtat(profil, entetes)).regionsIncoherentes).toBe(2);
  });

  it('après une remise à zéro, plus aucune région n’est incohérente', async () => {
    const profil = await creerProfil();
    profilVecu(profil);
    const entetes = { [ENTETE_JETON_PARENT]: await jeton() };

    expect((await lireEtat(profil, entetes)).regionsIncoherentes).toBe(2);

    const reponse = await contexte.application.inject({
      method: 'POST',
      url: `/api/parent/${profil}/reinitialiser`,
      payload: { portee: 'progression', confirmation: PRENOM },
      headers: entetes
    });
    expect(reponse.statusCode).toBe(200);

    const apres = await lireEtat(profil, entetes);
    expect(apres.regionsIncoherentes).toBe(0);
    expect(apres.noeudsTermines).toBe(0);
    expect(apres.regions.every((r) => r.pourcentageStocke === 0)).toBe(true);
  });
});

describe('GET /api/parent/:profil/etat — les dernières tentatives', () => {
  it('rend les plus récentes d’abord, avec ce qu’un parent y cherche', async () => {
    const profil = await creerProfil();
    for (const rang of [1, 2, 3]) {
      contexte.base
        .prepare(
          `INSERT INTO tentatives
             (id, cle_idempotence, profil_id, noeud_id, exercice_id, moteur, habillage, graine,
              demarre_le, termine_le, duree_ms, reussi, nb_erreurs, aide_utilisee, etoiles,
              detail_json)
           VALUES (?, ?, ?, 'clairiere-01', 'clairiere-ecole-01', 'colorie', 'clairiere.ecole',
                   1, ?, ?, 60000, 1, ?, 'indice', 2, '{}')`
        )
        .run(
          `tnt-${String(rang)}`,
          `cle-${String(rang)}`,
          profil,
          INSTANT_DE_REFERENCE,
          `2026-09-0${String(rang)}T08:00:00Z`,
          rang
        );
    }

    const etat = await lireEtat(profil, { [ENTETE_JETON_PARENT]: await jeton() });
    expect(etat.nbTentatives).toBe(3);
    expect(etat.dernieresTentatives).toHaveLength(3);
    expect(etat.dernieresTentatives[0]?.termineLe).toBe('2026-09-03T08:00:00Z');
    expect(etat.dernieresTentatives[0]?.nbErreurs).toBe(3);
    expect(etat.dernieresTentatives[0]?.moteur).toBe('colorie');
    expect(etat.dernieresTentatives[0]?.aideUtilisee).toBe('indice');
    expect(etat.dernieresTentatives.at(-1)?.termineLe).toBe('2026-09-01T08:00:00Z');
  });

  it('n’en rend jamais plus de dix — le parent lit une séance, pas un historique', async () => {
    const profil = await creerProfil();
    for (let rang = 1; rang <= 14; rang += 1) {
      contexte.base
        .prepare(
          `INSERT INTO tentatives
             (id, cle_idempotence, profil_id, noeud_id, exercice_id, moteur, habillage, graine,
              demarre_le, termine_le, duree_ms, reussi, nb_erreurs, aide_utilisee, etoiles,
              detail_json)
           VALUES (?, ?, ?, 'clairiere-01', 'clairiere-ecole-01', 'colorie', 'clairiere.ecole',
                   1, ?, ?, 60000, 1, 0, 'aucune', 3, '{}')`
        )
        .run(
          `tnt-${String(rang)}`,
          `cle-${String(rang)}`,
          profil,
          INSTANT_DE_REFERENCE,
          `2026-09-01T08:${String(rang).padStart(2, '0')}:00Z`
        );
    }

    const etat = await lireEtat(profil, { [ENTETE_JETON_PARENT]: await jeton() });
    expect(etat.nbTentatives).toBe(14);
    expect(etat.dernieresTentatives).toHaveLength(10);
  });
});
