/**
 * Journal des tentatives — idempotence et append-only. Annexe T § T2, contrat § 6.3.
 *
 * Trois propriétés, et ce sont les trois qui décident si le dashboard parent aura un sens :
 *
 * 1. **Idempotence.** Rejouer le même `POST` (réseau capricieux, double tap) répond 200 avec
 *    `deja = true` et n'insère rien.
 * 2. **Append-only.** Aucun `UPDATE`, aucun `DELETE` n'est jamais écrit contre `tentatives` —
 *    vérifié en comptant les lignes, pas en lisant le code.
 * 3. **Un acquis n'est jamais repris.** `progression_noeud.etoiles` ne décroît jamais, et la
 *    projection reconstruite depuis le journal est identique à l'incrémentale.
 *
 * ⚠ Signalé au rapport de L-G : `TentativeAEnregistrer` et `ReponseTentative` sont nommés au
 * contrat § 11.1 sans être détaillés. Le corps ci-dessous reprend en camelCase les colonnes de
 * `tentatives` (contrat § 6.2), qui est la seule source qui fasse foi.
 */
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { INSTANT_DE_REFERENCE, monterApplication } from '../configuration/preparation.js';

import type { ApplicationDeTest } from '../configuration/preparation.js';

let contexte: ApplicationDeTest;

beforeEach(async () => {
  contexte = await monterApplication();
});

afterEach(async () => {
  await contexte.fermer();
});

async function creerProfil(prenom = 'Alma'): Promise<string> {
  const reponse = await contexte.application.inject({
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

/** `sha256(profil_id | noeud_id | demarre_le | graine)` — contrat § 6.3, calculée par le client. */
function cleIdempotence(profilId: string, noeudId: string, demarreLe: string, graine: number) {
  return createHash('sha256')
    .update([profilId, noeudId, demarreLe, String(graine)].join('|'))
    .digest('hex');
}

interface OptionsTentative {
  readonly profilId: string;
  readonly demarreLe?: string;
  readonly graine?: number;
  readonly etoiles?: number;
  readonly nbErreurs?: number;
  readonly aideUtilisee?: 'aucune' | 'indice' | 'demonstration';
}

/**
 * L'inverse exact de `calculerEtoiles` (`partage/src/etoiles.ts`, barème v2 § 6.2) :
 * ★ terminé — toujours acquise · ★★ terminé sans que Gobi n'intervienne · ★★★ terminé sans
 * erreur. Le compte y est **additif** : `1 + (sans aide) + (sans erreur)`.
 *
 * D'où le seul point qui compte ici : **deux étoiles demandent qu'un des deux critères tombe.**
 * Un résumé « réussi, zéro erreur, aucune aide » vaut TROIS étoiles, pas deux — c'est ce que
 * produisait la version précédente de ce fichier, et c'est ce qui faisait échouer « la route de
 * progression reflète le maximum ».
 */
function resumePourEtoiles(etoiles: number) {
  const commun = { dureeMs: 60_000, etapes: [] };
  if (etoiles >= 3) return { ...commun, reussi: true, nbErreurs: 0, aideUtilisee: 'aucune' as const };
  // Aide gratuite tenue (R15), une erreur payée : 1 + 1 + 0 = 2.
  if (etoiles === 2) return { ...commun, reussi: true, nbErreurs: 1, aideUtilisee: 'aucune' as const };
  // Les deux critères tombent : 1 + 0 + 0 = 1.
  if (etoiles === 1) return { ...commun, reussi: true, nbErreurs: 1, aideUtilisee: 'indice' as const };
  // Zéro étoile n'existe que si la tentative n'est pas réussie. Le moteur `colorie` ne peut
  // pas produire ce résumé (R14, contrat § 5.6) ; le serveur, lui, journalise ce qu'on lui
  // envoie sans le corriger (`serveur/src/routes/tentatives.ts`), et c'est ce que ce cas teste.
  return { ...commun, reussi: false, nbErreurs: 1, aideUtilisee: 'demonstration' as const };
}

function tentative(options: OptionsTentative) {
  const demarreLe = options.demarreLe ?? INSTANT_DE_REFERENCE;
  const graine = options.graine ?? 20260801;
  const nbErreurs = options.nbErreurs ?? 0;
  const aideUtilisee = options.aideUtilisee ?? 'aucune';
  // Les noms suivent `TentativeAEnregistrer` (contrat, `partage/src/journal/types.ts`) :
  // `profil`, `noeud`, `exercice`, et le `resume` qui porte SEUL reussi/nbErreurs/
  // aideUtilisee/dureeMs. La version initiale envoyait `profilId`/`noeudId`/`detail` et
  // dupliquait ces champs à plat — le serveur répondait 400 sur les 7 cas d'écriture.
  //
  // `etoiles` n'est volontairement PAS envoyé : le contrat le note « dérivé du résumé par
  // `calculerEtoiles`, jamais envoyé par le client ». Un client qui choisit ses propres
  // étoiles peut s'en attribuer trois sans rien réussir.
  const resume = resumePourEtoiles(options.etoiles ?? 3);

  return {
    cleIdempotence: cleIdempotence(options.profilId, 'clairiere-01', demarreLe, graine),
    profil: options.profilId,
    noeud: 'clairiere-01',
    exercice: 'clairiere-ecole-01',
    moteur: 'colorie',
    habillage: 'clairiere.ecole',
    graine,
    demarreLe,
    termineLe: '2026-09-01T08:01:00Z',
    // Un appelant qui détaille lui-même erreurs et aide décrit une tentative précise :
    // ses valeurs font foi, et les étoiles s'en déduisent.
    resume:
      options.aideUtilisee !== undefined || options.nbErreurs !== undefined
        ? { reussi: true, nbErreurs, aideUtilisee, dureeMs: 60_000, etapes: [] }
        : resume
  };
}

async function envoyer(corps: ReturnType<typeof tentative>) {
  return contexte.application.inject({ method: 'POST', url: '/api/tentatives', payload: corps });
}

function compterTentatives(): number {
  const ligne = contexte.base.prepare('SELECT COUNT(*) AS n FROM tentatives').get() as {
    n: number | bigint;
  };
  return Number(ligne.n);
}

function progressionEnBase(profilId: string) {
  return contexte.base
    .prepare('SELECT noeud_id, etoiles, nb_tentatives FROM progression_noeud WHERE profil_id = ?')
    .all(profilId) as Array<{ noeud_id: string; etoiles: number; nb_tentatives: number }>;
}

describe('POST /api/tentatives', () => {
  it('enregistre une tentative et la projette dans la progression', async () => {
    const profilId = await creerProfil();
    const reponse = await envoyer(tentative({ profilId }));

    expect([200, 201]).toContain(reponse.statusCode);
    expect(compterTentatives()).toBe(1);

    const projection = progressionEnBase(profilId);
    expect(projection).toHaveLength(1);
    expect(projection[0]!.noeud_id).toBe('clairiere-01');
    expect(projection[0]!.etoiles).toBe(3);
  });

  it('rejoué à l’identique : 200, `deja = true`, aucune insertion — contrat § 6.3', async () => {
    const profilId = await creerProfil();
    const corps = tentative({ profilId });

    const premier = await envoyer(corps);
    expect([200, 201]).toContain(premier.statusCode);
    expect(compterTentatives()).toBe(1);

    const second = await envoyer(corps);
    expect(second.statusCode).toBe(200);
    expect((second.json() as { deja: boolean }).deja).toBe(true);
    expect(compterTentatives()).toBe(1);
  });

  it('le double tap ne double pas le score', async () => {
    const profilId = await creerProfil();
    const corps = tentative({ profilId });
    await Promise.all([envoyer(corps), envoyer(corps), envoyer(corps)]);

    expect(compterTentatives()).toBe(1);
    expect(progressionEnBase(profilId)[0]!.nb_tentatives).toBe(1);
  });

  it('deux tentatives distinctes du même nœud sont deux lignes de journal', async () => {
    const profilId = await creerProfil();
    await envoyer(tentative({ profilId, demarreLe: '2026-09-01T08:00:00Z' }));
    await envoyer(tentative({ profilId, demarreLe: '2026-09-01T09:00:00Z' }));

    expect(compterTentatives()).toBe(2);
    expect(progressionEnBase(profilId)[0]!.nb_tentatives).toBe(2);
  });

  it('refuse une tentative rattachée à un profil inexistant', async () => {
    const reponse = await envoyer(tentative({ profilId: 'profil-fantome' }));
    expect(reponse.statusCode).toBeGreaterThanOrEqual(400);
    expect(compterTentatives()).toBe(0);
  });
});

describe('un acquis n’est jamais repris — contrat § 6.3, R14', () => {
  it('trois étoiles puis une étoile laissent la progression à trois', async () => {
    const profilId = await creerProfil();
    await envoyer(tentative({ profilId, demarreLe: '2026-09-01T08:00:00Z', etoiles: 3 }));
    await envoyer(
      tentative({
        profilId,
        demarreLe: '2026-09-01T09:00:00Z',
        etoiles: 1,
        nbErreurs: 12,
        aideUtilisee: 'demonstration'
      })
    );

    const projection = progressionEnBase(profilId);
    expect(projection[0]!.etoiles).toBe(3);
    expect(projection[0]!.nb_tentatives).toBe(2);
  });

  it('la route de progression reflète le maximum, pas la dernière tentative', async () => {
    const profilId = await creerProfil();
    await envoyer(tentative({ profilId, demarreLe: '2026-09-01T08:00:00Z', etoiles: 2 }));
    await envoyer(tentative({ profilId, demarreLe: '2026-09-01T09:00:00Z', etoiles: 0 }));

    const reponse = await contexte.application.inject({
      method: 'GET',
      url: `/api/profils/${profilId}/progression`
    });
    const progression = reponse.json() as Array<{ etoiles: number }>;
    expect(progression).toHaveLength(1);
    expect(progression[0]!.etoiles).toBe(2);
  });
});

describe('le journal fait foi — append-only', () => {
  it('aucune ligne de `tentatives` n’est jamais modifiée', async () => {
    const profilId = await creerProfil();
    const corps = tentative({ profilId, etoiles: 1, nbErreurs: 5, aideUtilisee: 'indice' });
    await envoyer(corps);

    const avant = contexte.base.prepare('SELECT * FROM tentatives').all();
    await envoyer(corps); // rejeu idempotent
    await envoyer(tentative({ profilId, demarreLe: '2026-09-01T10:00:00Z', etoiles: 3 }));
    const apres = contexte.base.prepare('SELECT * FROM tentatives').all();

    // La première ligne est strictement inchangée ; seules des lignes s'ajoutent.
    expect(apres.length).toBe(avant.length + 1);
    expect(apres[0]).toEqual(avant[0]);
  });

  it('la progression recalculée depuis le journal est identique à l’incrémentale', async () => {
    const profilId = await creerProfil();
    for (const [heure, etoiles] of [
      ['08', 1],
      ['09', 3],
      ['10', 2]
    ] as const) {
      await envoyer(
        tentative({ profilId, demarreLe: `2026-09-01T${heure}:00:00Z`, etoiles })
      );
    }
    const incrementale = progressionEnBase(profilId);

    const { recalculerProgression } = await import('@serveur/depots/progression');
    recalculerProgression(contexte.base, profilId);
    const recalculee = progressionEnBase(profilId);

    expect(recalculee).toEqual(incrementale);
    expect(recalculee[0]!.etoiles).toBe(3);
    expect(recalculee[0]!.nb_tentatives).toBe(3);
  });
});
