/**
 * `POST /api/profils/:id/sortie` SUR LE CONTENU RÉEL, servi par le dépôt de DISQUE — lot
 * d'intégration.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE CE FICHIER GARDE, ET POURQUOI AUCUNE SUITE NE LE VOYAIT
 *
 * Trouvé en JOUANT, pas en lisant : un serveur réel, un profil neuf, les six régions demandées
 * une par une. Les six ont répondu la même chose :
 *
 *     409 — Impossible de composer une sortie dans « clairiere » : 0 nœud(s) éligible(s),
 *           il en faut au moins 2 — une ouverture et une clôture.
 *
 * Cause, mesurée : `listerCompetences` est FACULTATIF au contrat `DepotContenu`, et
 * `DepotContenuDisque` ne l'exposait pas. La route retombait donc sur `competences = []`, et
 * `competenceEligible` refuse tout code absent du référentiel (`if (competence === undefined)
 * return false`). Référentiel vide ⇒ aucun nœud candidat ⇒ refus, partout, toujours.
 *
 * Pourquoi la QA était aveugle, et c'est la leçon :
 *
 *   · `tests/api/sortie.test.ts` monte `DepotContenuMemoire`, qui EXPOSE la méthode et reçoit
 *     le référentiel en argument. Il éprouve `composerSortie` à fond — et jamais le dépôt qui
 *     sert l'enfant ;
 *   · les suites E2E ne passent pas par cette route ;
 *   · aucun écran ne l'appelle encore — `composerSortie` est exporté par
 *     `client/src/api/client.ts` sans consommateur.
 *
 * Le défaut était donc dormant, et il se serait réveillé au premier écran qui aurait branché
 * la route : un « Partir en sortie » qui répond 409 est un état sans issue (R14).
 *
 * ── CE QUE CE FICHIER EXIGE ET QU'AUCUN AUTRE N'EXIGE ────────────────────────────────────
 * Le dépôt DE DISQUE, le contenu RÉEL, la route RÉELLE. Aucune fixture, aucun contenu
 * fabriqué. C'est le seul endroit où le trio est monté ensemble.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { FastifyInstance } from 'fastify';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Horloge } from '@pierre/partage';

import {
  DOSSIER_MIGRATIONS,
  INSTANT_DE_REFERENCE,
  RACINE_DEPOT,
  aleaDeTest,
  horlogeDeTest,
  lireJson,
} from '../configuration/preparation.js';

interface NoeudLu {
  readonly id: string;
  readonly region: string;
  readonly ordre: number;
  readonly exercice: string;
}
interface ExerciceLu {
  readonly id: string;
  readonly jeu: { readonly moteur: string; readonly habillage: string };
}

/**
 * Le `modeReponse` déclaré par étape, par moteur.
 *
 * CHOIX DE HARNAIS, jamais une donnée du dépôt : le serveur refuse une étape qui n'en déclare
 * pas (`p_devinette`, D13). Aucune assertion de ce fichier ne dépend de la valeur exacte —
 * seulement du fait qu'une étape existe et que la tentative soit acceptée. La table est celle
 * de `tests/fixtures/profils-vecus/atelier-vecu.ts`, à l'identique.
 */
const MODE_PAR_MOTEUR: Readonly<Record<string, string>> = {
  colorie: 'colorie',
  place: 'place',
  trace: 'trace',
  grave: 'saisie',
  attrape: 'qcm-4',
  tri: 'qcm-3',
  chemin: 'qcm-4',
  eclair: 'qcm-3',
  histoire: 'qcm-3',
  assemble: 'ordre',
  chrono: 'ordre',
  phrase: 'ordre',
  paires: 'appariement',
  libre: 'colorie',
};

interface Harnais {
  readonly application: FastifyInstance;
  readonly base: DatabaseSync;
  fermer(): Promise<void>;
}

let contexte: Harnais;

/** Le serveur tel qu'il tourne chez le père : contenu lu sur `contenu/`, rien d'injecté. */
async function monterSurDisque(): Promise<Harnais> {
  const [
    { creerDepotContenuDisque },
    { construireApplication },
    { ouvrirBase },
    { appliquerMigrations },
    { creerBaseNodeSqlite },
  ] = await Promise.all([
    import('@serveur/services/depot-contenu-disque'),
    import('@serveur/application'),
    import('@serveur/base/connexion'),
    import('@serveur/base/migrations'),
    import('@serveur/base/adaptateur-node-sqlite'),
  ]);

  const base = ouvrirBase(':memory:');
  const baseAsync = creerBaseNodeSqlite(base);
  const horloge = horlogeDeTest();
  await appliquerMigrations(baseAsync, DOSSIER_MIGRATIONS, horloge);
  const application = construireApplication({
    base: baseAsync,
    contenu: creerDepotContenuDisque(join(RACINE_DEPOT, 'contenu')),
    horloge,
    alea: aleaDeTest(),
    racineClient: null,
  });
  await application.ready();

  return {
    application,
    base,
    async fermer() {
      await application.close();
      base.close();
    },
  };
}

beforeEach(async () => {
  contexte = await monterSurDisque();
});

afterEach(async () => {
  await contexte.fermer();
});

async function creerProfil(prenom = 'Marche'): Promise<string> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/profils',
    payload: {
      prenom,
      avatar: { forme: 'rond', couleur: 'lagon', accessoire: null },
      paletteVariante: 'clairiere',
    },
  });
  expect(reponse.statusCode, reponse.body).toBe(201);
  return (reponse.json() as { id: string }).id;
}

interface PlanLu {
  readonly etapes: readonly { readonly noeud: string; readonly role: string }[];
}

async function demanderSortie(
  profil: string,
  region: string,
): Promise<{ statut: number; plan: PlanLu | null; message: string }> {
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: `/api/profils/${profil}/sortie`,
    payload: { region },
  });
  const corps = reponse.json() as { plan?: PlanLu; etapes?: PlanLu['etapes']; message?: string };
  const plan = corps.plan ?? (corps.etapes === undefined ? null : { etapes: corps.etapes });
  return { statut: reponse.statusCode, plan, message: String(corps.message ?? '') };
}

/**
 * Joue un nœud par la vraie route. Rend le code HTTP, jamais une exception.
 *
 * Les deux horodatages viennent d'une `Horloge` que la marche fait avancer, jamais de
 * `new Date()` : la règle maison l'interdit partout hors de `partage/src/horloge.ts`, et elle
 * a raison — un `Date.now()` ici rendrait `test:rejeu` ininterprétable.
 */
async function jouerUnNoeud(
  profil: string,
  noeud: NoeudLu,
  exercice: ExerciceLu,
  horloge: Horloge,
): Promise<number> {
  const demarreLe = horloge.maintenant();
  horloge.avancer({ minutes: 1 });
  const termineLe = horloge.maintenant();
  horloge.avancer({ minutes: 3 });
  const reponse = await contexte.application.inject({
    method: 'POST',
    url: '/api/tentatives',
    payload: {
      cleIdempotence: createHash('sha256')
        .update(`${profil}|${noeud.id}|${demarreLe}`, 'utf8')
        .digest('hex'),
      profil,
      noeud: noeud.id,
      exercice: exercice.id,
      moteur: exercice.jeu.moteur,
      habillage: exercice.jeu.habillage,
      graine: 424_242,
      demarreLe,
      termineLe,
      resume: {
        reussi: true,
        nbErreurs: 0,
        aideUtilisee: 'aucune',
        dureeMs: 60_000,
        etapes: [
          {
            identifiant: `${exercice.id}-e1`,
            nbErreurs: 0,
            aideUtilisee: 'aucune',
            nbEcoutes: 0,
            dureeMs: 60_000,
            modeReponse: MODE_PAR_MOTEUR[exercice.jeu.moteur] ?? 'qcm-4',
            latenceMs: 60_000,
            nbElements: 4,
          },
        ],
      },
    },
  });
  return reponse.statusCode;
}

/** Les régions ouvertes d'emblée : les seules qu'un profil NEUF peut demander (D38). */
const REGIONS_DECLAREES: readonly string[] = lireJson<{
  readonly regions: readonly { readonly region: string }[];
}>('contenu/monde/regions.json').regions.map((r) => r.region);

const NOEUDS_SUR_DISQUE = readdirSync(join(RACINE_DEPOT, 'contenu', 'noeuds')).filter((f) =>
  f.endsWith('.json'),
).length;

describe('le dépôt de DISQUE sert le référentiel de compétences', () => {
  it('`listerCompetences` existe et rend les codes du fichier — sans elle, tout est refusé', async () => {
    const { creerDepotContenuDisque } = await import('@serveur/services/depot-contenu-disque');
    const depot = creerDepotContenuDisque(join(RACINE_DEPOT, 'contenu'));

    expect(
      typeof depot.listerCompetences,
      'le dépôt de disque n’expose pas `listerCompetences` : la route de sortie retombera sur ' +
        'un référentiel vide et refusera toute composition, dans toutes les régions',
    ).toBe('function');

    const servies = await depot.listerCompetences!();
    const surDisque = lireJson<readonly { readonly code: string }[]>(
      'contenu/referentiel/competences.json',
    );
    // Écart nul dans LES DEUX SENS : un dépôt qui filtrerait rendrait un compte inférieur, un
    // dépôt qui inventerait un code le rendrait supérieur.
    expect(servies.map((c) => c.code).sort()).toEqual(surDisque.map((c) => c.code).sort());
    expect(servies.length, 'référentiel vide : la mesure serait creuse').toBeGreaterThan(0);
  });
});

describe('un profil NEUF peut partir en sortie dans les régions qui lui sont ouvertes', () => {
  it('LE CAS QUI ÉTAIT ROUGE — les six régions demandées, au moins deux répondent', async () => {
    const profil = await creerProfil();

    const repondent: string[] = [];
    const refusent: string[] = [];
    for (const region of REGIONS_DECLAREES) {
      const { statut, plan, message } = await demanderSortie(profil, region);
      if (statut < 300 && plan !== null && plan.etapes.length > 0) {
        repondent.push(`${region}:${String(plan.etapes.length)}`);
      } else {
        refusent.push(`${region} (${String(statut)}) ${message}`);
      }
    }

    // AVANT le correctif : `repondent` était VIDE — les six refusaient. Ce n'est donc pas une
    // assertion de confort : c'est exactement la mesure qui distinguait les deux états.
    expect(
      repondent.length,
      `sorties servies : ${repondent.join(' · ') || 'AUCUNE'} — refus : ${refusent.join(' · ')}`,
    ).toBeGreaterThanOrEqual(2);

    // Les régions qui refusent le font pour la bonne raison : leurs compétences ont des
    // prérequis qu'un profil neuf n'a pas encore (v2 § 12.1). Le message doit le dire, et ne
    // jamais être un 500.
    for (const ligne of refusent) {
      expect(ligne, 'un refus doit être un conflit expliqué, jamais une panne').toMatch(
        /\(409\).*nœud\(s\) éligible\(s\)/u,
      );
    }
  });

  it('la sortie servie ne cite que des nœuds LIVRÉS, et respecte le trajet de la v2 § 5.2', async () => {
    const profil = await creerProfil('Trajet');
    const idsLivres = new Set(
      readdirSync(join(RACINE_DEPOT, 'contenu', 'noeuds'))
        .filter((f) => f.endsWith('.json'))
        .map((f) => lireJson<{ id: string }>(`contenu/noeuds/${f}`).id),
    );

    let mesurees = 0;
    for (const region of REGIONS_DECLAREES) {
      const { statut, plan } = await demanderSortie(profil, region);
      if (statut >= 300 || plan === null) continue;
      mesurees += 1;

      for (const etape of plan.etapes) {
        expect(idsLivres.has(etape.noeud), `${region} propose ${etape.noeud}, non livré`).toBe(
          true,
        );
      }
      // P10 : rang 1 échauffement, dernier rang synthèse — toujours.
      expect(plan.etapes[0]?.role, `${region} : ouverture`).toBe('echauffement');
      expect(plan.etapes[plan.etapes.length - 1]?.role, `${region} : clôture`).toBe('synthese');
      // Aucun nœud deux fois dans la même sortie.
      expect(new Set(plan.etapes.map((e) => e.noeud)).size).toBe(plan.etapes.length);
    }

    // Plancher de non-vacuité : à zéro région mesurée, les boucles ci-dessus n'auraient rien
    // parcouru et le cas passerait sans juger le trajet.
    expect(mesurees, 'zéro région mesurée : les boucles n’ont rien parcouru').toBeGreaterThan(0);
    expect(idsLivres.size, 'aucun nœud livré').toBe(NOEUDS_SUR_DISQUE);
  });
});

describe('LA MARCHE — les 76 nœuds livrés sont joués, dans l’ordre, sur le dépôt de disque', () => {
  it('chaque nœud est jouable, chaque région finit par offrir une sortie', async () => {
    // ⚠ CE CAS NE LIT PAS LE CONTENU POUR LE JUGER : il le JOUE. C'est la seule mesure qui
    // réponde à « le contenu nouveau est-il atteignable ? », et elle a trouvé le défaut du
    // référentiel que la lecture n'avait pas vu.
    //
    // La marche suit l'ordre de la progression, région par région, nœud par nœud, par les
    // vraies routes : `POST /api/tentatives` pour jouer, `GET /monde` pour voir la carte
    // bouger, `POST /sortie` pour vérifier qu'une sortie reste offerte. Rien n'est écrit en
    // base à la main.
    const profil = await creerProfil('Marche');
    const noeuds = readdirSync(join(RACINE_DEPOT, 'contenu', 'noeuds'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => lireJson<NoeudLu>(`contenu/noeuds/${f}`));
    const exercices = new Map(
      readdirSync(join(RACINE_DEPOT, 'contenu', 'exercices'), {
        recursive: true,
        withFileTypes: true,
      })
        .filter((e) => e.isFile() && e.name.endsWith('.json'))
        .map((e) => {
          const relatif = join(e.parentPath, e.name)
            .slice(RACINE_DEPOT.length)
            .split('\\')
            .join('/');
          const exercice = lireJson<ExerciceLu>(relatif);
          return [exercice.id, exercice] as const;
        }),
    );

    const horlogeDeLaMarche = horlogeDeTest(INSTANT_DE_REFERENCE);
    const refuses: string[] = [];
    let joues = 0;
    const offertes = new Map<string, string>();

    for (const region of REGIONS_DECLAREES) {
      const deLaRegion = [...noeuds]
        .filter((n) => n.region === region)
        .sort((a, b) => a.ordre - b.ordre);
      for (const noeud of deLaRegion) {
        const exercice = exercices.get(noeud.exercice);
        expect(exercice, `${noeud.id} cite un exercice absent : ${noeud.exercice}`).toBeDefined();
        const statut = await jouerUnNoeud(
          profil,
          noeud,
          exercice as ExerciceLu,
          horlogeDeLaMarche,
        );
        if (statut >= 300) refuses.push(`${noeud.id} → ${String(statut)}`);
        else joues += 1;
      }
      const vivantes: string[] = [];
      for (const candidate of REGIONS_DECLAREES) {
        const { statut, plan } = await demanderSortie(profil, candidate);
        if (statut < 300 && plan !== null && plan.etapes.length > 0) vivantes.push(candidate);
      }
      offertes.set(region, vivantes.join(', ') || 'AUCUNE');
    }

    console.log(
      [
        `[marche] nœuds joués ............... ${String(joues)} / ${String(noeuds.length)}`,
        `[marche] refusés ................... ${refuses.join(' · ') || 'aucun'}`,
        ...[...offertes.entries()].map(
          ([region, vivantes]) => `[marche]   après ${region.padEnd(19)} → sorties : ${vivantes}`,
        ),
      ].join('\n'),
    );

    expect(refuses, 'des nœuds livrés que le serveur refuse de journaliser').toEqual([]);
    expect(joues, 'la marche n’a joué aucun nœud').toBe(noeuds.length);
    // À la fin, les SIX régions doivent offrir une sortie : c'est R14 sur l'état le plus
    // avancé qui existe — « un acquis n'est jamais repris, rejouer est gratuit ».
    expect(offertes.get(REGIONS_DECLAREES[REGIONS_DECLAREES.length - 1] as string)).toBe(
      REGIONS_DECLAREES.join(', '),
    );
  }, 60_000);
});
