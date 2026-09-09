import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { lireCascade, recalculerCascade } from '@pierre/partage/base';
import type { EtatMonde, ReponseTentative } from '@pierre/partage';
import { chargerSeuilsCascade } from '@serveur/referentiels/recompenses.js';
import {
  INSTANT_DE_REFERENCE, lireJson, monterApplication,
} from '../configuration/preparation.js';
import type { ApplicationDeTest } from '../configuration/preparation.js';

let contexte: ApplicationDeTest;
let profil: string;
let numeroTentative: number;

beforeEach(async () => {
  contexte = await monterApplication();
  numeroTentative = 0;
  const creation = await contexte.application.inject({
    method: 'POST', url: '/api/profils',
    payload: {
      prenom: 'Alma', avatar: { forme: 'rond', couleur: 'lagon', accessoire: null },
      paletteVariante: 'clairiere',
    },
  });
  expect(creation.statusCode).toBe(201);
  profil = (creation.json() as { id: string }).id;
});

afterEach(async () => { await contexte.fermer(); });

async function jouer(
  noeud: string, reussi = true, aide = false, termineLe = '2026-09-01T08:01:00Z'
): Promise<ReponseTentative> {
  numeroTentative += 1;
  const graine = numeroTentative;
  const definition = lireJson<{ exercice: string }>(`contenu/noeuds/${noeud}.json`);
  const exercice = lireJson<{ jeu: { moteur: string; habillage: string } }>(
    `contenu/exercices/clairiere/${definition.exercice.replace('clairiere-', '')}.json`
  );
  const reponse = await contexte.application.inject({
    method: 'POST', url: '/api/tentatives',
    payload: {
      cleIdempotence: createHash('sha256')
        .update([profil, noeud, INSTANT_DE_REFERENCE, String(graine)].join('|')).digest('hex'),
      profil, noeud, exercice: definition.exercice, moteur: exercice.jeu.moteur,
      habillage: exercice.jeu.habillage, graine, demarreLe: INSTANT_DE_REFERENCE,
      termineLe,
      resume: {
        reussi, nbErreurs: aide || !reussi ? 1 : 0,
        aideUtilisee: aide ? 'demonstration' : 'aucune', dureeMs: 60_000, etapes: [],
      },
    },
  });
  expect(reponse.statusCode).toBe(201);
  return reponse.json() as ReponseTentative;
}

async function monde(): Promise<EtatMonde> {
  const reponse = await contexte.application.inject({ method: 'GET', url: `/api/profils/${profil}/monde` });
  expect(reponse.statusCode).toBe(200);
  return reponse.json() as EtatMonde;
}

describe('Cascade — un crédit par nœud réussi pour la première fois', () => {
  it('cinq réussites distinctes rapportent une forme, quelle que soit leur qualité', async () => {
    for (let rang = 1; rang <= 5; rang += 1) {
      await jouer(`clairiere-${String(rang).padStart(2, '0')}`, true, rang % 2 === 0);
      const cascade = await lireCascade(contexte.baseAsync, profil);
      expect(cascade.etoilesTotal).toBe(rang);
      expect((await monde()).gobi.formes).toHaveLength(rang === 5 ? 1 : 0);
    }
    expect((await lireCascade(contexte.baseAsync, profil)).intermediairesTotal).toBe(1);
  });

  it('rejouer avec une autre clé améliore les étoiles sans redonner de crédit', async () => {
    await jouer('clairiere-01', true, true);
    const avant = await lireCascade(contexte.baseAsync, profil);
    const reprise = await jouer('clairiere-01');
    expect(reprise.gainCascade.paliersFranchis).toEqual([]);
    expect(reprise.gainCascade.recompenses).toEqual([]);
    expect(await lireCascade(contexte.baseAsync, profil)).toEqual(avant);
    const progression = contexte.base.prepare(
      'SELECT etoiles, nb_tentatives FROM progression_noeud WHERE profil_id = ? AND noeud_id = ?'
    ).get(profil, 'clairiere-01');
    expect(progression).toMatchObject({ etoiles: 3, nb_tentatives: 2 });
  });

  it('un échec ne consomme pas le crédit de la future réussite', async () => {
    await jouer('clairiere-01', false);
    expect((await lireCascade(contexte.baseAsync, profil)).etoilesTotal).toBe(0);
    const clairiere = (await monde()).carte.regions.find((region) => region.region === 'clairiere');
    expect(clairiere).toMatchObject({ pourcentageColorie: 0, eclatObtenuLe: null });
    await jouer('clairiere-01');
    expect((await lireCascade(contexte.baseAsync, profil)).etoilesTotal).toBe(1);
    await jouer('clairiere-01', false);
    expect((await lireCascade(contexte.baseAsync, profil)).etoilesTotal).toBe(1);
  });

  it('le recalcul retrouve les crédits uniques et conserve les récompenses acquises', async () => {
    await jouer('clairiere-01', false);
    for (let rang = 1; rang <= 5; rang += 1) {
      await jouer(`clairiere-${String(rang).padStart(2, '0')}`);
    }
    await jouer('clairiere-01');
    const incremental = await lireCascade(contexte.baseAsync, profil);
    expect(incremental.etoilesTotal).toBe(5);
    expect(await recalculerCascade(contexte.baseAsync, profil, chargerSeuilsCascade())).toEqual(incremental);

    // Un ancien cache pouvait compter trois points par réussite. Sa réparation ne retire
    // jamais les formes et le stade déjà offerts par l'ancienne règle.
    contexte.base.prepare('UPDATE progression_cascade SET etoiles_total = 125 WHERE profil_id = ?').run(profil);
    contexte.base.prepare('INSERT INTO formes_gobi VALUES (?, ?, ?)').run(profil, 'e', INSTANT_DE_REFERENCE);
    const acquis = (await monde()).gobi;
    expect(await recalculerCascade(contexte.baseAsync, profil, chargerSeuilsCascade())).toEqual(incremental);
    expect((await monde()).gobi).toEqual(acquis);
  });

  it('des premières réussites reçues hors ordre gardent la même date que le recalcul', async () => {
    await jouer('clairiere-01', true, false, '2026-09-01T10:00:00Z');
    await jouer('clairiere-02', true, false, '2026-09-01T09:00:00Z');
    const incremental = await lireCascade(contexte.baseAsync, profil);
    expect(incremental.etoilesTotal).toBe(2);
    expect(incremental.dernierPalierLe).toBe('2026-09-01T10:00:00Z');
    expect(await recalculerCascade(contexte.baseAsync, profil, chargerSeuilsCascade())).toEqual(incremental);
  });

  it('une réussite antérieure reçue en reprise corrige la date sans crédit ni célébration', async () => {
    await jouer('clairiere-01', true, false, '2026-09-01T10:00:00Z');
    const reprise = await jouer('clairiere-01', true, false, '2026-09-01T09:00:00Z');
    expect(reprise.gainCascade.paliersFranchis).toEqual([]);
    expect(reprise.gainCascade.recompenses).toEqual([]);
    const incremental = await lireCascade(contexte.baseAsync, profil);
    expect(incremental.etoilesTotal).toBe(1);
    expect(incremental.dernierPalierLe).toBe('2026-09-01T09:00:00Z');
    expect(await recalculerCascade(contexte.baseAsync, profil, chargerSeuilsCascade())).toEqual(incremental);
  });
});
