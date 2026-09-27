import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Exercice, Habillage, Noeud } from '@pierre/partage';
import type { InstantaneRepriseLecture } from '@pierre/partage/reprise-lecture';
import { ecrireRepriseLecture, lireRepriseLecture } from '@partage/base/depots/reprise-lecture';
import { reinitialiserProfil } from '@partage/base/services/reinitialisation-profil';
import { CHEMIN_EXERCICE_ECOLE, CHEMIN_NOEUD_CLAIRIERE, habillageEcole,
  horlogeDeTest, lireJson, monterApplication } from '../configuration/preparation.js';
import type { ApplicationDeTest } from '../configuration/preparation.js';

const PROFIL = 'profil-parite-lecture' as InstantaneRepriseLecture['profil'];
const INSTANT = '2026-09-01T08:00:00.000Z';
const horloge = horlogeDeTest(INSTANT);
let local: ApplicationDeTest;
let http: ApplicationDeTest;

function instantane(): InstantaneRepriseLecture {
  const exercice = lireJson<Exercice>(CHEMIN_EXERCICE_ECOLE);
  const noeud = lireJson<Noeud>(CHEMIN_NOEUD_CLAIRIERE);
  const habillage: Habillage = habillageEcole();
  return {
    versionContrat: 1, profil: PROFIL, generationProgression: 0, revision: 0,
    sortie: null, rangSortie: null, paquet: { exercice, noeud, habillage },
    codeMoteur: exercice.jeu.moteur, versionMoteur: 1, graine: 17,
    etatMoteur: { indexConsigne: 0, remplissages: {}, nbErreurs: 0, niveauAide: 'aucune' },
    demarreLe: INSTANT, journalise: true, serie: 0,
    resume: null, etoiles: null, termineLe: null, tentativeEnvoyee: false,
    erreurConservation: null, suspenduLeMs: 1_790_416_800_000,
  };
}

beforeEach(async () => {
  local = await monterApplication();
  http = await monterApplication();
  for (const contexte of [local, http]) {
    contexte.base.prepare(`INSERT INTO profils
      (id, prenom, avatar_json, palette_variante, cree_le, dernier_acces_le)
      VALUES (?, 'Alma', '{}', 'clairiere', ?, ?)`).run(PROFIL, INSTANT, INSTANT);
  }
});
afterEach(async () => { await Promise.all([local.fermer(), http.fermer()]); });

describe('reprise lecture : dépôt local et route HTTP', () => {
  it('garde le paquet exact après un reset maths et refuse l’ancienne génération lecture', async () => {
    const paquet = instantane();
    const revisionLocale = await ecrireRepriseLecture(local.baseAsync, horloge, paquet, null);
    const ecritureHttp = await http.application.inject({
      method: 'POST', url: `/api/profils/${PROFIL}/reprise-lecture`,
      payload: { instantane: paquet, revisionAttendue: null },
    });
    expect(ecritureHttp.statusCode).toBe(200);
    expect(ecritureHttp.json()).toEqual({ revision: revisionLocale });
    const repriseLocale = await lireRepriseLecture(local.baseAsync, PROFIL);
    const repriseHttp = await http.application.inject({
      method: 'GET', url: `/api/profils/${PROFIL}/reprise-lecture`,
    });
    expect(repriseHttp.statusCode).toBe(200);
    expect(repriseHttp.json()).toEqual(repriseLocale);

    await Promise.all([
      reinitialiserProfil(local.baseAsync, PROFIL, 'maths', horloge),
      reinitialiserProfil(http.baseAsync, PROFIL, 'maths', horloge),
    ]);
    expect(await lireRepriseLecture(local.baseAsync, PROFIL)).toEqual(repriseLocale);
    expect((await http.application.inject({
      method: 'GET', url: `/api/profils/${PROFIL}/reprise-lecture`,
    })).json()).toEqual(repriseLocale);
    expect(local.base.prepare(`SELECT generation_progression, generation_maths
      FROM profils WHERE id = ?`).get(PROFIL))
      .toEqual({ generation_progression: 0, generation_maths: 1 });

    await Promise.all([
      reinitialiserProfil(local.baseAsync, PROFIL, 'lecture', horloge),
      reinitialiserProfil(http.baseAsync, PROFIL, 'lecture', horloge),
    ]);
    await expect(ecrireRepriseLecture(local.baseAsync, horloge, paquet, null))
      .rejects.toMatchObject({ code: 'generation-perimee' });
    const ancienne = await http.application.inject({
      method: 'POST', url: `/api/profils/${PROFIL}/reprise-lecture`,
      payload: { instantane: paquet, revisionAttendue: null },
    });
    expect(ancienne.statusCode).toBe(409);
    expect(ancienne.json()).toMatchObject({ code: 'generation-perimee' });
  });
});
