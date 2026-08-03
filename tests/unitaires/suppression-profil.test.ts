/**
 * SUPPRIMER UN COMPTE JOUEUR — R29, et la classe de défauts qu'il faut garder.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * « tu as créé plein de comptes de joueurs qui s'appellent Mesure, déjà il faudrait les enlever.
 * Et dans l'espace des parents, il faudrait pouvoir les supprimer en fait, supprimer un compte. »
 *
 * Le besoin est né d'un dégât que j'ai causé : **six profils « Mesure » écrits dans sa vraie
 * base**, par des sondes de mise en page qui pointaient sur le serveur de jeu au lieu d'une base
 * jetable. Un outil de mesure qui écrit dans les données du joueur n'est pas un outil de mesure.
 *
 * ── CE QUE CE FICHIER GARDE, ET QUI VA AU-DELÀ DE « ÇA MARCHE » ───────────────────────────────
 *
 *  1. **Aucune ligne orpheline.** C'est le risque réel d'une suppression : le profil disparaît de
 *     l'écran, ses tentatives restent en base, et le dashboard d'un AUTRE enfant se met à compter
 *     des lignes qui n'appartiennent à personne. La vérification énumère les tables porteuses de
 *     `profil_id` par le SCHÉMA, pas par une liste écrite ici — une liste écrite dérive.
 *
 *  2. **Le voisin est intact.** Une suppression qui emporterait le profil d'à côté serait
 *     catastrophique et invisible : il faut un second profil, peuplé, pour le voir.
 *
 *  3. **Les trois gardes mordent.** Sans jeton, sans confirmation, avec un prénom faux : rien ne
 *     doit être effacé. Et « rien » se vérifie en RECOMPTANT, jamais en lisant le code de retour.
 *
 *  4. **L'aperçu n'efface pas.** Un aperçu qui effacerait serait le pire défaut possible ici.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
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

async function jetonParent(): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/parent/definir',
    payload: { code: CODE }
  });
  expect(reponse.statusCode).toBe(200);
  return (reponse.json() as { jeton: string }).jeton;
}

async function creerProfil(prenom: string): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/profils',
    payload: { prenom, avatar: {}, paletteVariante: 'clairiere' }
  });
  expect(reponse.statusCode).toBe(201);
  return (reponse.json() as { id: string }).id;
}

/**
 * Les tables qui portent un `profil_id`, DÉCOUVERTES par le schéma.
 *
 * Écrire la liste ici en ferait une seconde source de vérité, qui dériverait de celle du service
 * au premier ajout de table — et le jour où elle dériverait, ce test rendrait vert un profil dont
 * des lignes survivent. C'est exactement le défaut que le service évite déjà.
 */
function tablesPorteuses(): readonly string[] {
  const tables = contexte.base
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    .all() as unknown as { name: string }[];
  return tables
    .map((table) => String(table.name))
    .filter((nom) => {
      const colonnes = contexte.base
        .prepare(`PRAGMA table_info(${nom})`)
        .all() as unknown as { name: string }[];
      return colonnes.some((colonne) => String(colonne.name) === 'profil_id');
    });
}

/** Combien de lignes portent ce profil, toutes tables confondues. */
function lignesDuProfil(profil: string): number {
  let total = 0;
  for (const table of tablesPorteuses()) {
    const ligne = contexte.base
      .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE profil_id = ?`)
      .get(profil) as unknown as { n: number };
    total += Number(ligne.n);
  }
  return total;
}

function profilExiste(profil: string): boolean {
  const ligne = contexte.base
    .prepare('SELECT COUNT(*) AS n FROM profils WHERE id = ?')
    .get(profil) as unknown as { n: number };
  return Number(ligne.n) > 0;
}

/** Peuple le profil, pour que l'effacement ait quelque chose à effacer. */
async function peupler(profil: string): Promise<void> {
  await contexte.application.inject({
    method: 'PUT',
    url: `/api/profils/${encodeURIComponent(profil)}/reglages`,
    payload: { police: 'andika', tailleTexte: 'moyen', interlettrage: 'normal' }
  });
}

function supprimer(
  profil: string,
  options: { jeton?: string; confirmation?: unknown; apercu?: boolean } = {}
): ReturnType<typeof contexte.application.inject> {
  return contexte.application.inject({
    method: 'DELETE',
    url: `/api/parent/${encodeURIComponent(profil)}`,
    ...(options.jeton === undefined
      ? {}
      : { headers: { [ENTETE_JETON_PARENT]: options.jeton } }),
    payload: {
      ...(options.confirmation === undefined ? {} : { confirmation: options.confirmation }),
      ...(options.apercu === true ? { apercu: true } : {})
    }
  });
}

describe('R29 — supprimer un compte joueur depuis la zone parent', () => {
  it('LE CAS NOMINAL — le profil disparaît, et AUCUNE ligne ne lui survit', async () => {
    const jeton = await jetonParent();
    const cible = await creerProfil('Mesure');
    await peupler(cible);

    // Contrôle de non-vacuité : sans lignes à effacer, « 0 ligne restante » ne prouverait rien.
    expect(
      lignesDuProfil(cible),
      'le profil n’a aucune ligne : l’effacement n’aurait rien à effacer et le test serait creux'
    ).toBeGreaterThan(0);

    const reponse = await supprimer(cible, { jeton, confirmation: 'Mesure' });
    expect(reponse.statusCode, reponse.body).toBe(200);

    const rapport = reponse.json() as { profilRetire: boolean; lignesEffaceesTotal: number };
    expect(rapport.profilRetire, 'le serveur n’affirme pas avoir retiré le profil').toBe(true);
    expect(rapport.lignesEffaceesTotal).toBeGreaterThan(0);

    // Et on RELIT la base, au lieu de croire le rapport qu'on vient de recevoir.
    expect(profilExiste(cible), 'la ligne de `profils` est toujours là').toBe(false);
    expect(
      lignesDuProfil(cible),
      'des lignes SURVIVENT au profil supprimé : elles n’appartiennent plus à personne et ' +
        'fausseront tout recalcul depuis le journal'
    ).toBe(0);
  });

  it('LE VOISIN EST INTACT — supprimer un compte n’en emporte pas un autre', async () => {
    // Le défaut qu'on ne verrait jamais avec un seul profil, et qui serait catastrophique.
    const jeton = await jetonParent();
    const cible = await creerProfil('Mesure');
    const voisin = await creerProfil('Ezékiel');
    await peupler(cible);
    await peupler(voisin);

    const avant = lignesDuProfil(voisin);
    expect(avant).toBeGreaterThan(0);

    expect((await supprimer(cible, { jeton, confirmation: 'Mesure' })).statusCode).toBe(200);

    expect(profilExiste(voisin), 'le profil voisin a disparu avec la cible').toBe(true);
    expect(lignesDuProfil(voisin), 'des lignes du voisin ont été emportées').toBe(avant);
  });

  it('SANS JETON, rien n’est effacé — et on le vérifie en recomptant', async () => {
    const cible = await creerProfil('Mesure');
    await peupler(cible);
    const avant = lignesDuProfil(cible);

    const reponse = await supprimer(cible, { confirmation: 'Mesure' });
    expect(reponse.statusCode).toBe(401);
    expect(profilExiste(cible)).toBe(true);
    expect(lignesDuProfil(cible), 'des lignes ont été effacées SANS jeton').toBe(avant);
  });

  it('SANS le prénom retapé, rien n’est effacé — 409, et la base intacte', async () => {
    const jeton = await jetonParent();
    const cible = await creerProfil('Mesure');
    await peupler(cible);
    const avant = lignesDuProfil(cible);

    expect((await supprimer(cible, { jeton })).statusCode).toBe(409);
    expect((await supprimer(cible, { jeton, confirmation: 'Mesur' })).statusCode).toBe(409);
    expect((await supprimer(cible, { jeton, confirmation: '' })).statusCode).toBe(409);

    expect(profilExiste(cible), 'le profil a été supprimé sans confirmation valide').toBe(true);
    expect(lignesDuProfil(cible)).toBe(avant);
  });

  it('L’APERÇU COMPTE SANS EFFACER — c’est ce que le parent voit avant de décider', async () => {
    const jeton = await jetonParent();
    const cible = await creerProfil('Mesure');
    await peupler(cible);
    const avant = lignesDuProfil(cible);

    const reponse = await supprimer(cible, { jeton, apercu: true });
    expect(reponse.statusCode, reponse.body).toBe(200);
    const apercu = reponse.json() as { lignes: readonly { lignesEffacees: number }[] };
    expect(
      apercu.lignes.reduce((somme, ligne) => somme + Number(ligne.lignesEffacees), 0),
      'l’aperçu annonce zéro ligne alors que le profil en a : il ne montre rien au parent'
    ).toBeGreaterThan(0);

    expect(profilExiste(cible), 'l’aperçu a SUPPRIMÉ le profil').toBe(true);
    expect(lignesDuProfil(cible), 'l’aperçu a effacé des lignes').toBe(avant);
  });

  it('un profil inconnu rend 404, jamais un succès silencieux', async () => {
    // « On n'efface jamais dans le vide en rendant un rapport vert » : le parent croirait avoir
    // supprimé un compte qu'il vient de mal désigner.
    const jeton = await jetonParent();
    const reponse = await supprimer('prf-inexistant', { jeton, confirmation: 'Peu importe' });
    expect(reponse.statusCode).toBe(404);
  });
});
