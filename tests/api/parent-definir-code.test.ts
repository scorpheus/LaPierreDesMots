/**
 * La PREMIÈRE DÉFINITION du code parent — lot N5, contrat de finition v3 § 1.8 et § 8.
 *
 * LE DÉFAUT QUE CE FICHIER GARDE, cité du contrat § 1.8 :
 *
 * > `POST /api/parent/ouvrir` **pose silencieusement le code du foyer au premier appel**.
 * > Un enfant curieux qui tape `1234` devient propriétaire du code parent, sans qu'un écran
 * > l'ait jamais demandé.
 *
 * Trois propriétés, et chacune correspond à une ligne du § 8 :
 *
 *   1. **`ouvrir` ne pose plus rien.** Sans code défini, il répond 404 `introuvable` — jamais
 *      200, jamais un jeton. C'est ce 404 que le client traduit en écran de définition.
 *   2. **`definir` pose le code, une fois.** Une seconde définition SANS jeton répond 409
 *      Conflict, jamais 200 et jamais un remplacement silencieux.
 *   3. **La redéfinition est possible AVEC le jeton.** « On ne détruit jamais un code
 *      existant — le parent serait enfermé dehors » (§ 7.3) : il faut donc un chemin qui
 *      permette d'en changer, et il passe par la preuve qu'on connaît l'ancien.
 *
 * `GET /api/parent/etat` est la route qui rend les deux cas distinguables du dehors :
 * « pas de code » et « code faux » ne sont pas la même situation, et un écran qui les
 * confond demande un code que personne n'a jamais posé.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENTETE_JETON_PARENT } from '@partage/parent/types';

import type { EtatPorteParent } from '@partage/parent/galerie';

import { monterApplication } from '../configuration/preparation.js';

import type { ApplicationDeTest } from '../configuration/preparation.js';

const CODE = '4271';
const AUTRE_CODE = '8350';

let contexte: ApplicationDeTest;

beforeEach(async () => {
  contexte = await monterApplication();
});

afterEach(async () => {
  await contexte.fermer();
});

function ouvrir(code: string) {
  return contexte.application.inject({
    method: 'POST',
    url: '/api/parent/ouvrir',
    payload: { code }
  });
}

function definir(code: string, jeton?: string) {
  return contexte.application.inject({
    method: 'POST',
    url: '/api/parent/definir',
    payload: { code },
    ...(jeton === undefined ? {} : { headers: { [ENTETE_JETON_PARENT]: jeton } })
  });
}

function etat() {
  return contexte.application.inject({ method: 'GET', url: '/api/parent/etat' });
}

// ────────────────────────────────────────────────────── 1. `ouvrir` ne pose plus le code

describe('POST /api/parent/ouvrir — la route ne pose plus le code en silence', () => {
  it('répond 404 « introuvable » tant qu’aucun code n’a été défini', async () => {
    const reponse = await ouvrir(CODE);
    expect(reponse.statusCode).toBe(404);
    expect((reponse.json() as { code: string }).code).toBe('introuvable');
  });

  it('N’A RIEN POSÉ : après ce 404, la porte reste sans code', async () => {
    await ouvrir(CODE);
    // LE CHIFFRE QUI ÉCHOUERAIT SI LE TRAVAIL ÉTAIT CREUX. Un `ouvrir` qui poserait encore le
    // code en répondant 404 laisserait exactement le défaut du § 1.8, invisible.
    const lignes = contexte.base
      .prepare('SELECT COUNT(*) AS n FROM code_parent')
      .get() as unknown as { n: number };
    expect(Number(lignes.n), 'aucune ligne de code_parent après un `ouvrir` refusé').toBe(0);
    expect(((await etat()).json() as EtatPorteParent).codeDefini).toBe(false);
  });

  it('un enfant qui tape 1234 ne devient propriétaire de rien', async () => {
    for (const essai of ['1234', '0000', '1111']) {
      expect((await ouvrir(essai)).statusCode).toBe(404);
    }
    expect(((await etat()).json() as EtatPorteParent).codeDefini).toBe(false);

    // Et le parent peut encore poser SON code : rien n’a été volé.
    expect((await definir(CODE)).statusCode).toBe(200);
    expect((await ouvrir(CODE)).statusCode).toBe(200);
    expect((await ouvrir('1234')).statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────── 2. `definir` pose, une fois

describe('POST /api/parent/definir', () => {
  it('pose le code et rend un jeton utilisable tout de suite', async () => {
    const reponse = await definir(CODE);
    expect(reponse.statusCode).toBe(200);
    const corps = reponse.json() as { jeton: string; expireLe: string };
    expect(corps.jeton.length).toBeGreaterThan(16);
    expect(Number.isNaN(Date.parse(corps.expireLe))).toBe(false);

    // Le jeton rendu est vivant : le parent n’a pas à retaper son code juste après l’avoir posé.
    const dashboard = await contexte.application.inject({
      method: 'GET',
      url: '/api/parent/inexistant/dashboard',
      headers: { [ENTETE_JETON_PARENT]: corps.jeton }
    });
    expect(dashboard.statusCode, 'le jeton de définition ouvre la zone').not.toBe(401);
  });

  it('refuse un code qui n’a pas quatre chiffres, et ne pose rien', async () => {
    for (const mauvais of ['12', '', 'abcd', '12345']) {
      expect((await definir(mauvais)).statusCode).toBe(400);
    }
    expect(((await etat()).json() as EtatPorteParent).codeDefini).toBe(false);
  });

  it('CONTRAT — une seconde définition SANS jeton répond 409, et le code d’origine survit', async () => {
    expect((await definir(CODE)).statusCode).toBe(200);

    const seconde = await definir(AUTRE_CODE);
    expect(seconde.statusCode).toBe(409);
    expect((seconde.json() as { code: string }).code).toBe('conflit');

    // La propriété qui compte : le code d’origine ouvre toujours, le prétendant n’ouvre pas.
    expect((await ouvrir(CODE)).statusCode).toBe(200);
    expect((await ouvrir(AUTRE_CODE)).statusCode).toBe(401);
  });

  it('la redéfinition AVEC jeton remplace le code, et l’ancien cesse d’ouvrir', async () => {
    const jeton = (await definir(CODE)).json() as { jeton: string };

    const redefinition = await definir(AUTRE_CODE, jeton.jeton);
    expect(redefinition.statusCode).toBe(200);

    expect((await ouvrir(AUTRE_CODE)).statusCode).toBe(200);
    expect((await ouvrir(CODE)).statusCode).toBe(401);
  });

  it('LA MIGRATION 009 EST RÉELLEMENT APPLIQUÉE — pas seulement présente sur le disque', () => {
    // ⚠ DÉFAUT DU PLAN GELÉ, gardé ici plutôt que raconté. Le contrat de finition v3 § 7.3
    // nomme le fichier `009_parent_definition.sql`. Le motif du lanceur de migrations
    // (`serveur/src/base/migrations.ts:27`) est `^(\d{3})_([a-z0-9-]+)\.sql$` : il n'accepte
    // PAS le souligné dans le nom, et « un fichier hors motif est ignoré EN SILENCE ».
    // Mesuré :
    //   009_parent_definition.sql  →  IGNOREE EN SILENCE
    //   009_parent-definition.sql  →  RECONNUE
    // Le fichier est donc écrit en `009_parent-definition.sql`, et CE CAS est ce qui empêche
    // qu'on le renomme un jour sans s'en apercevoir : une migration ignorée ne casse rien
    // jusqu'au premier `ALTER TABLE` manquant, très loin de la cause.
    const applique = contexte.base
      .prepare('SELECT nom FROM schema_migrations WHERE version = 9')
      .get() as unknown as { nom: string } | undefined;
    expect(applique, 'la migration 009 doit être dans `schema_migrations`').toBeDefined();
    expect(String(applique?.nom)).toBe('parent-definition');

    const colonnes = (
      contexte.base.prepare('PRAGMA table_info(code_parent)').all() as unknown as {
        name: string;
      }[]
    ).map((c) => String(c.name));
    expect(colonnes, 'la colonne du § 7.3 existe vraiment').toContain('defini_par');
  });

  it('consigne COMMENT le code a été posé — migration 009', async () => {
    await definir(CODE);
    const ligne = contexte.base
      .prepare('SELECT defini_par FROM code_parent WHERE id = 1')
      .get() as unknown as { defini_par: string };
    expect(String(ligne.defini_par)).toBe('ecran-definition');

    const jeton = (await ouvrir(CODE)).json() as { jeton: string };
    await definir(AUTRE_CODE, jeton.jeton);
    const apres = contexte.base
      .prepare('SELECT defini_par FROM code_parent WHERE id = 1')
      .get() as unknown as { defini_par: string };
    expect(String(apres.defini_par)).toBe('redefinition');
  });
});

// ──────────────────────────────────────────────────────────────── 3. l’état de la porte

describe('GET /api/parent/etat', () => {
  it('distingue « pas de code » de « code faux » — c’est toute sa raison d’être', async () => {
    const avant = (await etat()).json() as EtatPorteParent;
    expect(avant.codeDefini).toBe(false);
    expect(avant.nbEchecs).toBe(0);
    expect(avant.verrouilleJusqua).toBeNull();

    await definir(CODE);
    await ouvrir('9999');

    const apres = (await etat()).json() as EtatPorteParent;
    expect(apres.codeDefini).toBe(true);
    expect(apres.nbEchecs).toBe(1);
  });

  it('ne demande AUCUN jeton — sinon l’écran ne pourrait jamais savoir quoi afficher', async () => {
    // C'est la seule route de la zone parent qui s'ouvre sans jeton, et il le faut : le client
    // l'interroge AVANT d'avoir un code à taper. Elle ne rend aucune donnée de l'enfant.
    expect((await etat()).statusCode).toBe(200);
  });

  it('ne fuit ni le code, ni son sel, ni son empreinte', async () => {
    await definir(CODE);
    const brut = (await etat()).body;
    expect(brut).not.toContain(CODE);
    expect(brut.toLowerCase()).not.toContain('sel');
    expect(brut.toLowerCase()).not.toContain('empreinte');
  });
});
