/**
 * La zone parent de bout en bout — annexe T § T2 et § T3, contrat des features v2 § 5.3.
 *
 * Ce fichier porte **les deux chiffres du contrat de sortie de L2-H** (contrat § 10.4) :
 *
 *   • le nombre d'échecs avant verrou, MESURÉ par requêtes successives — il doit valoir 5 ;
 *   • le nombre de lignes du top 10 dont l'axe est nul — il doit valoir 0.
 *
 * Deux blocs, et leurs dépendances sont nommées :
 *   — « le verrou » ne touche que `006_parent.sql`, écrite par ce lot ;
 *   — « le dashboard » lit `etapes_tentative` (migration 003, L2-D) et `progression_region`
 *     (migration 005, L2-F). Il échoue tant que ces deux migrations ne sont pas là, et c'est
 *     voulu : un dashboard qui rendrait des listes vides sur une base incomplète serait creux.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENTETE_JETON_PARENT } from '@partage/parent/types';

import { monterApplication } from '../configuration/preparation.js';

import type { ApplicationDeTest } from '../configuration/preparation.js';

const CODE = '4271';

let contexte: ApplicationDeTest;

beforeEach(async () => {
  contexte = await monterApplication();
});

afterEach(async () => {
  await contexte.fermer();
});

async function ouvrir(code: string) {
  return contexte.application.inject({
    method: 'POST',
    url: '/api/parent/ouvrir',
    payload: { code }
  });
}

/**
 * MODIFIÉ N5 — pose le code du foyer par la route qui en a désormais la charge.
 *
 * Ce préambule appelait `ouvrir(CODE)` et comptait sur le fait que la première ouverture
 * posait le code. Le contrat de finition v3 § 1.8 a mesuré ce que cela produisait — « un
 * enfant curieux qui tape 1234 devient propriétaire du code parent » — et son § 8 le retire :
 * « `POST /api/parent/ouvrir` **cesse de poser le code**. Quand aucun code n'existe, il répond
 * **404** ».
 *
 * Le préambule change donc de route ; **aucune assertion de ce fichier n'a été touchée**, et
 * le cas qui affirmait l'ancien comportement est réécrit plus bas, à sa place, pour affirmer
 * le nouveau. Rien n'est mis en `skip`, rien n'est assoupli.
 */
async function poserLeCode(code = CODE) {
  return contexte.application.inject({
    method: 'POST',
    url: '/api/parent/definir',
    payload: { code }
  });
}

/** Pose le code du foyer et rend un jeton valable. */
async function jeton(): Promise<string> {
  const reponse = await poserLeCode();
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

// ────────────────────────────────────────────────────────────────────────────── le verrou

describe('POST /api/parent/ouvrir', () => {
  // REÉCRIT N5 — ce cas affirmait « pose le code du foyer au tout premier passage et rend un
  // jeton ». C'était la description fidèle du défaut mesuré au contrat de finition v3 § 1.8.
  // Le § 8 le retire : « `POST /api/parent/ouvrir` cesse de poser le code. Quand aucun code
  // n'existe, il répond 404 avec `ErreurApi.code = 'introuvable'` ». Le cas garde donc
  // désormais le comportement neuf, au même endroit, et `tests/api/parent-definir-code.test.ts`
  // garde tout le reste de la porte.
  it('NE pose PLUS le code au premier passage : 404, et rien n’est écrit', async () => {
    const reponse = await ouvrir(CODE);
    expect(reponse.statusCode).toBe(404);
    expect((reponse.json() as { code: string }).code).toBe('introuvable');

    const lignes = contexte.base
      .prepare('SELECT COUNT(*) AS n FROM code_parent')
      .get() as unknown as { n: number };
    expect(Number(lignes.n), 'aucun code posé en silence').toBe(0);
  });

  it('le code posé par `definir` rend un jeton utilisable', async () => {
    const reponse = await poserLeCode();
    expect(reponse.statusCode).toBe(200);
    const corps = reponse.json() as { jeton: string; expireLe: string };
    expect(corps.jeton.length).toBeGreaterThan(16);
    expect(Number.isNaN(Date.parse(corps.expireLe))).toBe(false);
  });

  it('accepte ensuite ce code et lui seul', async () => {
    await poserLeCode();
    expect((await ouvrir(CODE)).statusCode).toBe(200);
    expect((await ouvrir('9999')).statusCode).toBe(401);
  });

  it('refuse un code qui n’a pas quatre chiffres', async () => {
    await poserLeCode();
    const reponse = await ouvrir('12');
    expect(reponse.statusCode).toBe(400);
    expect((reponse.json() as { message: string }).message).toContain('4 chiffres');
  });

  it('CONTRAT DE SORTIE : le verrou se ferme au 5ᵉ échec, mesuré par requêtes', async () => {
    await poserLeCode();

    const statuts: number[] = [];
    for (let essai = 1; essai <= 6; essai += 1) {
      statuts.push((await ouvrir('0000')).statusCode);
    }

    // Le rang du premier 423 EST le nombre d'échecs avant verrou. On le calcule, on ne
    // l'affirme pas — et on vérifie qu'il vaut 5 (v2 § 11).
    const echecsAvantVerrou = statuts.indexOf(423) + 1;
    expect(echecsAvantVerrou).toBe(5);
    expect(statuts.slice(0, 4)).toEqual([401, 401, 401, 401]);
  });

  it('répond 423 et non 401 quand le verrou est actif, et dit quand ça rouvre', async () => {
    await poserLeCode();
    for (let essai = 1; essai <= 5; essai += 1) {
      await ouvrir('0000');
    }

    // Même le BON code se heurte au verrou : c'est ce qui le rend utile.
    const reponse = await ouvrir(CODE);
    expect(reponse.statusCode).toBe(423);
    const corps = reponse.json() as {
      code: string;
      message: string;
      details: { verrouilleJusqua: string };
    };
    expect(corps.code).toBe('conflit');
    expect(Number.isNaN(Date.parse(corps.details.verrouilleJusqua))).toBe(false);
    // Aucun reproche : le message dit quand réessayer.
    expect(corps.message).toContain('Reessaie');
  });

  it('un code juste remet le compteur à zéro : quatre échecs ne s’accumulent pas', async () => {
    await poserLeCode();
    for (let essai = 1; essai <= 4; essai += 1) {
      expect((await ouvrir('0000')).statusCode).toBe(401);
    }
    expect((await ouvrir(CODE)).statusCode).toBe(200);
    // Le compteur est reparti de zéro : quatre nouveaux échecs ne verrouillent toujours pas.
    for (let essai = 1; essai <= 4; essai += 1) {
      expect((await ouvrir('0000')).statusCode).toBe(401);
    }
    expect((await ouvrir(CODE)).statusCode).toBe(200);
  });

  it('un format invalide compte comme un échec — sinon le verrou serait contournable', async () => {
    await poserLeCode();
    for (let essai = 1; essai <= 4; essai += 1) {
      expect((await ouvrir('pasuncode')).statusCode).toBe(400);
    }
    expect((await ouvrir('pasuncode')).statusCode).toBe(423);
  });
});

// ─────────────────────────────────────────────────────────────────── la zone est protégée

describe('la zone parent exige le jeton', () => {
  it('refuse le dashboard sans jeton', async () => {
    const profil = await creerProfil();
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${profil}/dashboard`
    });
    expect(reponse.statusCode).toBe(401);
  });

  it('refuse l’export sans jeton', async () => {
    const profil = await creerProfil();
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${profil}/export/tentatives`
    });
    expect(reponse.statusCode).toBe(401);
  });

  it('refuse un jeton inventé', async () => {
    const profil = await creerProfil();
    await jeton();
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${profil}/dashboard`,
      headers: { [ENTETE_JETON_PARENT]: 'jeton-invente' }
    });
    expect(reponse.statusCode).toBe(401);
  });

  it('laisse passer le jeton dans `Authorization: Bearer` aussi', async () => {
    const profil = await creerProfil();
    const valeur = await jeton();
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${profil}/export/tentatives`,
      headers: { authorization: `Bearer ${valeur}` }
    });
    expect(reponse.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────── les exports

describe('GET /api/parent/:profil/export/:code', () => {
  it('rend un CSV à séparateur `;` avec le BOM UTF-8 qu’attend Excel FR', async () => {
    const profil = await creerProfil();
    const valeur = await jeton();
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${profil}/export/tentatives`,
      headers: { [ENTETE_JETON_PARENT]: valeur }
    });

    expect(reponse.statusCode).toBe(200);
    expect(reponse.headers['content-type']).toContain('text/csv');
    const corps = reponse.body;
    expect(corps.charCodeAt(0)).toBe(0xfeff);
    // En-têtes présents même sans une seule ligne : « rien à montrer » ≠ « export cassé ».
    expect(corps).toContain('noeud_id');
    expect(corps.split('\r\n')[0]).toContain(';');
  });

  it('répond 404 sur un export inconnu plutôt qu’un fichier vide', async () => {
    const profil = await creerProfil();
    const valeur = await jeton();
    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${profil}/export/tout`,
      headers: { [ENTETE_JETON_PARENT]: valeur }
    });
    expect(reponse.statusCode).toBe(404);
  });
});

// ───────────────────────────────────────────────────────────────────── la file de relecture

describe('POST /api/parent/relecture/:exercice', () => {
  it('refuse de trancher un exercice qui n’est pas dans la file', async () => {
    const valeur = await jeton();
    const reponse = await contexte.application.inject({
      method: 'POST',
      url: '/api/parent/relecture/exercice-fantome',
      headers: { [ENTETE_JETON_PARENT]: valeur },
      payload: { statut: 'valide' }
    });
    expect(reponse.statusCode).toBe(404);
  });

  it('refuse un statut hors du vocabulaire fermé', async () => {
    const valeur = await jeton();
    contexte.base
      .prepare(
        `INSERT INTO relecture_contenu (exercice_id, chemin, statut, deposee_le)
         VALUES ('brouillon-01', 'contenu/brouillons/niveau-2/brouillon-01.json',
                 'en-attente', '2026-09-01T08:00:00.000Z')`
      )
      .run();

    const reponse = await contexte.application.inject({
      method: 'POST',
      url: '/api/parent/relecture/brouillon-01',
      headers: { [ENTETE_JETON_PARENT]: valeur },
      payload: { statut: 'peut-etre' }
    });
    expect(reponse.statusCode).toBe(400);
  });

  it('valide un brouillon et garde la décision, motif compris', async () => {
    const valeur = await jeton();
    contexte.base
      .prepare(
        `INSERT INTO relecture_contenu (exercice_id, chemin, statut, deposee_le)
         VALUES ('brouillon-01', 'contenu/brouillons/niveau-2/brouillon-01.json',
                 'en-attente', '2026-09-01T08:00:00.000Z')`
      )
      .run();

    const reponse = await contexte.application.inject({
      method: 'POST',
      url: '/api/parent/relecture/brouillon-01',
      headers: { [ENTETE_JETON_PARENT]: valeur },
      payload: { statut: 'rejete', motif: 'Le mot « chrysanthème » n’est pas du CE1.' }
    });

    expect(reponse.statusCode).toBe(200);
    const entree = reponse.json() as { statut: string; motif: string; traiteeLe: string };
    expect(entree.statut).toBe('rejete');
    expect(entree.motif).toContain('CE1');
    // Horloge injectée, jamais l'heure réelle (annexe T § 2.2).
    expect(entree.traiteeLe).toContain('2026-09-01');
  });
});

// ───────────────────────────────────────── le dashboard (dépend des migrations 003 et 005)

describe('GET /api/parent/:profil/dashboard', () => {
  /** Journalise une étape brute dans `etapes_tentative` — table de L2-D, migration 003. */
  function journaliserEtape(
    profil: string,
    entree: {
      readonly rang: number;
      readonly competence: string;
      readonly latenceMs: number | null;
      readonly confAttendu?: string;
      readonly confRendu?: string;
      readonly confAxe?: string | null;
      readonly jour?: string;
    }
  ): void {
    const jour = entree.jour ?? '2026-09-01';
    const identifiant = `t-${profil}-${String(entree.rang)}`;
    contexte.base
      .prepare(
        `INSERT INTO tentatives (id, cle_idempotence, profil_id, noeud_id, exercice_id, moteur,
                                 habillage, graine, demarre_le, termine_le, duree_ms, reussi,
                                 nb_erreurs, aide_utilisee, etoiles, detail_json)
         VALUES (?, ?, ?, 'galeries-01', 'galeries-miroir-01', 'trace', 'galeries.cristal',
                 1, ?, ?, 1000, 1, 0, 'aucune', 3, '{}')
         ON CONFLICT (id) DO NOTHING`
      )
      .run(identifiant, identifiant, profil, `${jour}T08:00:00.000Z`, `${jour}T08:01:00.000Z`);

    contexte.base
      .prepare(
        `INSERT INTO etapes_tentative (id, tentative_id, profil_id, rang, identifiant, competence,
                                       mode_reponse, reussi, nb_erreurs, aide_utilisee, duree_ms,
                                       latence_ms, conf_attendu, conf_rendu, conf_axe, journalise_le)
         VALUES (?, ?, ?, ?, ?, ?, 'trace', 1, 0, 'aucune', 900, ?, ?, ?, ?, ?)`
      )
      .run(
        `e-${identifiant}-${String(entree.rang)}`,
        identifiant,
        profil,
        entree.rang,
        `etape-${String(entree.rang)}`,
        entree.competence,
        entree.latenceMs,
        entree.confAttendu ?? null,
        entree.confRendu ?? null,
        entree.confAxe ?? null,
        `${jour}T08:00:30.000Z`
      );
  }

  it('rend les quatre sections du résumé', async () => {
    const profil = await creerProfil();
    const valeur = await jeton();
    journaliserEtape(profil, { rang: 1, competence: 'gph.b', latenceMs: 1200 });

    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${profil}/dashboard`,
      headers: { [ENTETE_JETON_PARENT]: valeur }
    });

    expect(reponse.statusCode).toBe(200);
    const resume = reponse.json() as Record<string, unknown>;
    for (const section of ['latences', 'confusions', 'couverture', 'relecture']) {
      expect(Array.isArray(resume[section])).toBe(true);
    }
    expect(typeof resume['confusionsEcartees']).toBe('number');
  });

  it('CONTRAT DE SORTIE : aucune ligne du top n’a d’axe nul, et les écartées sont comptées', async () => {
    const profil = await creerProfil();
    const valeur = await jeton();

    journaliserEtape(profil, {
      rang: 1,
      competence: 'gph.b',
      latenceMs: 1500,
      confAttendu: 'b',
      confRendu: 'd',
      confAxe: 'gauche-droite'
    });
    journaliserEtape(profil, {
      rang: 2,
      competence: 'gph.b',
      latenceMs: 1400,
      confAttendu: 'b',
      confRendu: 'p',
      confAxe: 'haut-bas'
    });
    journaliserEtape(profil, {
      rang: 3,
      competence: 'gph.m',
      latenceMs: 1300,
      confAttendu: 'm',
      confRendu: 'n',
      confAxe: null
    });

    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${profil}/dashboard`,
      headers: { [ENTETE_JETON_PARENT]: valeur }
    });

    const resume = reponse.json() as {
      confusions: ReadonlyArray<{ axe: string | null }>;
      confusionsEcartees: number;
    };

    const sansAxe = resume.confusions.filter((ligne) => ligne.axe === null).length;
    expect(sansAxe).toBe(0);
    expect(resume.confusions).toHaveLength(2);
    expect(resume.confusionsEcartees).toBe(1);
  });

  it('la latence est une médiane par jour et par compétence, jamais une moyenne', async () => {
    const profil = await creerProfil();
    const valeur = await jeton();
    journaliserEtape(profil, { rang: 1, competence: 'gph.b', latenceMs: 900 });
    journaliserEtape(profil, { rang: 2, competence: 'gph.b', latenceMs: 1100 });
    journaliserEtape(profil, { rang: 3, competence: 'gph.b', latenceMs: 4000 });

    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${profil}/dashboard`,
      headers: { [ENTETE_JETON_PARENT]: valeur }
    });

    const resume = reponse.json() as {
      latences: ReadonlyArray<{ jour: string; medianeMs: number; nbMesures: number }>;
    };
    expect(resume.latences).toHaveLength(1);
    // Moyenne = 2000 ms ; la médiane vaut 1100 et ne bouge pas pour une session distraite.
    expect(resume.latences[0]?.medianeMs).toBe(1100);
    expect(resume.latences[0]?.nbMesures).toBe(3);
  });

  it('étanchéité stricte entre profils — v2 § 11', async () => {
    const alma = await creerProfil('Alma');
    const noe = await creerProfil('Noé');
    const valeur = await jeton();

    journaliserEtape(alma, {
      rang: 1,
      competence: 'gph.b',
      latenceMs: 1200,
      confAttendu: 'b',
      confRendu: 'd',
      confAxe: 'gauche-droite'
    });

    const chezNoe = await contexte.application.inject({
      method: 'GET',
      url: `/api/parent/${noe}/dashboard`,
      headers: { [ENTETE_JETON_PARENT]: valeur }
    });
    const resume = chezNoe.json() as {
      latences: readonly unknown[];
      confusions: readonly unknown[];
    };
    expect(resume.latences).toEqual([]);
    expect(resume.confusions).toEqual([]);
  });
});
