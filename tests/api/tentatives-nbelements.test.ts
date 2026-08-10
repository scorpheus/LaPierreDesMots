/**
 * LOT A1 — la perte silencieuse d'une tentative, gardée sur les QUATORZE moteurs.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT QUE CE FICHIER GARDE (Q-I14, mesuré dans le journal du serveur pendant la QA) :
 *
 *   [pierre] 500 sur POST /api/tentatives — Le mode « ordre » calcule p_devinette en 1/n! :
 *            « nbElements » doit être un entier >= 2, reçu null.
 *
 * `pDevinette` (D13) LÈVE pour `ordre` et `appariement` quand `nbElements` manque. L'appel
 * part de `alimenterPedagogie`, DANS la transaction qui vient d'insérer la tentative : la
 * transaction est annulée, la route rend 500, et **rien n'est enregistré** — ni la tentative,
 * ni les étoiles, ni la progression du nœud. L'écran de récompense s'affiche quand même.
 * « Le journal fait foi » : une tentative perdue est un acquis perdu, et R14 dit qu'un acquis
 * n'est jamais repris.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * CE FICHIER AUDITE LES **OBJETS**, PAS LES OCCURRENCES (leçon D48).
 *
 * Chercher `nbElements` dans les moteurs ne trouve que les moteurs qui le posent — c'est-à-dire
 * exactement ceux qui n'ont pas le défaut. La table `CAS` ci-dessous énumère donc les moteurs
 * qui DEVRAIENT le poser : elle est comparée à `moteursEnregistres()`, et un quinzième moteur
 * ajouté au registre sans cas fait échouer le premier test. Aucun compte n'est recopié.
 *
 * Chaque cas MONTE LE VRAI MOTEUR sur une fixture acceptée par le schéma que ce moteur publie,
 * prend son `resume()` — celui-là même que `EcranRecompense` envoie tel quel — et le POSTe.
 * Fabriquer le résumé à la main ne prouverait rien : c'est précisément le moteur qui oubliait
 * un champ.
 *
 * L'exercice envoyé est le même pour les quatorze (`clairiere-ecole-01`). Il ne sert qu'à une
 * chose ici : porter les compétences qui déclenchent l'alimentation pédagogique — sans elles,
 * `alimenterPedagogie` sort tout de suite et le défaut ne se reproduit pas. Ce test ne parle
 * pas de la justesse du contenu, il parle de la chaîne moteur → route → BKT.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  creerAlea,
  creerHorlogeFigee,
  moteursEnregistres,
  obtenirMoteur,
} from '@pierre/partage';

import {
  GRAINE_DE_TEST,
  INSTANT_DE_REFERENCE,
  RACINE_DEPOT,
  aleaDeTest,
  horlogeDeTest,
  lireJson,
} from '../configuration/preparation.js';

import { contenuAssemble } from '../fixtures/moteurs/assemble.js';
import { contenuAttrape } from '../fixtures/moteurs/attrape.js';
import { contenuChemin } from '../fixtures/moteurs/chemin.js';
import { contenuChrono } from '../fixtures/moteurs/chrono.js';
import { contenuEclair } from '../fixtures/moteurs/eclair.js';
import { contenuGrave } from '../fixtures/moteurs/grave.js';
import { contenuHistoire } from '../fixtures/moteurs/histoire.js';
import { contenuLibre } from '../fixtures/moteurs/libre.js';
import { contenuPaires } from '../fixtures/moteurs/paires.js';
import { contenuTri } from '../fixtures/moteurs/tri.js';

import type { DatabaseSync } from 'node:sqlite';
import type { Base } from '@pierre/partage/base';
import type { FastifyInstance } from 'fastify';
import type {
  Competence,
  Exercice,
  Habillage,
  ModeReponse,
  Noeud,
  ResumeEtape,
  ResumeTentative,
} from '@pierre/partage';

const DOSSIER_MIGRATIONS = join(RACINE_DEPOT, 'serveur', 'migrations') + sep;

/**
 * Les deux modes dont `p_devinette` vaut `1 / n!` (D13). C'est la MÊME liste que
 * `MODES_CALCULES` de `partage/src/pedagogie/bkt.ts` ; la recopier ici est délibéré : si
 * quelqu'un l'élargit d'un troisième mode sans le dire, le cas d'audit ci-dessous continuera
 * de ne surveiller que ces deux-là et le rapport le montrera par un compte figé.
 */
const MODES_CALCULES: readonly ModeReponse[] = ['ordre', 'appariement'];

const HABILLAGE_ECOLE = 'contenu/habillages/clairiere/ecole.habillage.json';
const HABILLAGE_PLACE = 'contenu/habillages/clairiere/ecole-place.habillage.json';
const HABILLAGE_TRACE = 'contenu/habillages/galeries/tracer-cristal.habillage.json';

interface ExerciceLu {
  readonly jeu: { readonly contenu: unknown };
}

function contenuDeLExercice(chemin: string): unknown {
  return lireJson<ExerciceLu>(chemin).jeu.contenu;
}

interface CasMoteur {
  readonly code: string;
  readonly contenu: unknown;
  readonly habillage: string;
}

/** Un cas par moteur ENREGISTRÉ. La complétude est vérifiée, jamais supposée. */
const CAS: readonly CasMoteur[] = [
  {
    code: 'attrape',
    contenu: contenuAttrape,
    habillage: 'contenu/habillages/clairiere/lucioles.habillage.json',
  },
  { code: 'tri', contenu: contenuTri, habillage: 'contenu/habillages/clairiere/paniers.habillage.json' },
  {
    code: 'assemble',
    contenu: contenuAssemble,
    habillage: 'contenu/habillages/clairiere/collier.habillage.json',
  },
  { code: 'chemin', contenu: contenuChemin, habillage: 'contenu/habillages/clairiere/lianes.habillage.json' },
  { code: 'eclair', contenu: contenuEclair, habillage: 'contenu/habillages/clairiere/luciole.habillage.json' },
  {
    code: 'paires',
    contenu: contenuPaires,
    habillage: 'contenu/habillages/cite-des-histoires/cartes.habillage.json',
  },
  {
    // Le contenu RÉEL du nœud `clairiere-05`, pas une fixture : c'est cet exercice-là que
    // l'enfant termine, et c'est lui qui faisait rendre 500 (Q-I14).
    code: 'phrase',
    contenu: contenuDeLExercice('contenu/exercices/clairiere/guirlande-phrase-01.json'),
    habillage: 'contenu/habillages/clairiere/guirlande.habillage.json',
  },
  {
    code: 'histoire',
    contenu: contenuHistoire,
    habillage: 'contenu/habillages/clairiere/veillee.habillage.json',
  },
  {
    code: 'chrono',
    contenu: contenuChrono,
    habillage: 'contenu/habillages/cite-des-histoires/pellicule.habillage.json',
  },
  { code: 'grave', contenu: contenuGrave, habillage: 'contenu/habillages/foret-muette/buee.habillage.json' },
  {
    code: 'colorie',
    contenu: contenuDeLExercice('contenu/exercices/clairiere/ecole-01.json'),
    habillage: HABILLAGE_ECOLE,
  },
  {
    code: 'libre',
    contenu: contenuLibre,
    habillage: 'contenu/habillages/campement/page-blanche.habillage.json',
  },
  {
    code: 'place',
    contenu: contenuDeLExercice('contenu/exercices/clairiere/ecole-02-place.json'),
    habillage: HABILLAGE_PLACE,
  },
  {
    code: 'trace',
    contenu: contenuDeLExercice('contenu/exercices/galeries/miroir-bd-01.json'),
    habillage: HABILLAGE_TRACE,
  },
];

/** Le résumé que le moteur produit RÉELLEMENT — celui qu'`EcranRecompense` envoie tel quel. */
function resumeDuMoteur(cas: CasMoteur): ResumeTentative {
  const moteur = obtenirMoteur(cas.code as never);
  const horloge = creerHorlogeFigee(INSTANT_DE_REFERENCE);
  const alea = creerAlea(GRAINE_DE_TEST);
  const habillage = lireJson<Habillage>(cas.habillage);
  const etat = moteur.creerEtat({ contenu: cas.contenu as never, habillage, alea, horloge });
  return moteur.resume(etat);
}

interface Harnais {
  readonly application: FastifyInstance;
  readonly base: DatabaseSync;
  readonly baseAsync: Base;
  fermer(): Promise<void>;
}

let contexte: Harnais;

async function monter(): Promise<Harnais> {
  const [
    { construireApplication },
    { ouvrirBase },
    { appliquerMigrations },
    { creerBaseNodeSqlite },
    factices
  ] = await Promise.all([
    import('@serveur/application'),
    import('@serveur/base/connexion'),
    import('@serveur/base/migrations'),
    import('@serveur/base/adaptateur-node-sqlite'),
    import('@pierre/partage/factices'),
  ]);

  const base = ouvrirBase(':memory:');
  const baseAsync = creerBaseNodeSqlite(base);
  const horloge = horlogeDeTest();
  await appliquerMigrations(baseAsync, DOSSIER_MIGRATIONS, horloge);

  const contenu = new factices.DepotContenuMemoire({
    exercices: [lireJson<Exercice>('contenu/exercices/clairiere/ecole-01.json')],
    noeuds: [lireJson<Noeud>('contenu/noeuds/clairiere-01.json')],
    habillages: [lireJson<Habillage>(HABILLAGE_ECOLE)],
    competences: lireJson<Competence[]>('contenu/referentiel/competences.json'),
  });

  const application = construireApplication({
    base: baseAsync,
    contenu,
    horloge,
    alea: aleaDeTest(),
    racineClient: null,
  });
  await application.ready();

  return {
    application,
    base,
    baseAsync,
    async fermer() {
      await application.close();
      base.close();
    },
  };
}

beforeEach(async () => {
  contexte = await monter();
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
      paletteVariante: 'clairiere',
    },
  });
  expect(reponse.statusCode).toBe(201);
  return (reponse.json() as { id: string }).id;
}

/** `sha256(profil | noeud | demarreLe | graine)` — contrat v1 § 6.3. */
function cleIdempotence(profil: string, noeud: string, demarreLe: string, graine: number): string {
  return createHash('sha256')
    .update([profil, noeud, demarreLe, String(graine)].join('|'))
    .digest('hex');
}

async function envoyer(profil: string, moteur: string, resume: ResumeTentative, jour = 1) {
  const demarreLe = `2026-09-0${String(jour)}T08:00:00.000Z`;
  const termineLe = `2026-09-0${String(jour)}T08:05:00.000Z`;
  return contexte.application.inject({
    method: 'POST',
    url: '/api/tentatives',
    payload: {
      cleIdempotence: cleIdempotence(profil, 'clairiere-01', demarreLe, GRAINE_DE_TEST),
      profil,
      noeud: 'clairiere-01',
      exercice: 'clairiere-ecole-01',
      moteur,
      habillage: 'clairiere.ecole',
      graine: GRAINE_DE_TEST,
      demarreLe,
      termineLe,
      resume,
    },
  });
}

// ───────────────────────────────────────────────────── l'audit couvre bien les quatorze

describe('A1 — l’audit porte sur les OBJETS : les quatorze moteurs, un par un', () => {
  it('un cas par moteur enregistré, sans trou ni doublon', () => {
    const declares = [...CAS.map((c) => c.code)].sort();
    const enregistres = [...moteursEnregistres()].sort();
    expect(declares, `cas : ${declares.join(', ')}`).toEqual(enregistres);
    expect(new Set(declares).size).toBe(declares.length);
  });

  it('tout moteur en mode `ordre` ou `appariement` RÉPOND `nbElements` — D13', () => {
    // C'EST LE CAS QUI ÉCHOUAIT. Avant le correctif : `assemble`, `chrono`, `paires` et
    // `phrase` rendaient `nbElements: undefined` sur toutes leurs étapes. Quatre moteurs,
    // là où Q-I14 n'en signalait qu'un et où le commentaire de `moteurs/types.ts` en
    // désignait deux autres — la leçon D48 en une ligne.
    //
    // Ce qu'on exige du MOTEUR, c'est un nombre vrai, pas un nombre confortable : le plancher
    // `n >= 2` de `pDevinette` est appliqué en aval par `journaliserEtapes`, et le cas suivant
    // le vérifie en base. Un moteur qui remonterait `2` là où le contenu en compte `1`
    // mentirait au journal, et le journal fait foi.
    const muets: string[] = [];
    const compte = new Map<string, number>();

    for (const cas of CAS) {
      for (const etape of resumeDuMoteur(cas).etapes) {
        if (!MODES_CALCULES.includes(etape.modeReponse)) continue;
        compte.set(cas.code, (compte.get(cas.code) ?? 0) + 1);
        const n = etape.nbElements;
        if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) {
          muets.push(`${cas.code}/${etape.identifiant} (${etape.modeReponse}) → ${String(n)}`);
        }
      }
    }

    // Contrat de sortie : un audit qui ne rencontrerait AUCUNE étape en mode calculé passerait
    // sans rien prouver. On exige de mesurer un travail réel, et sur les QUATRE moteurs connus.
    expect([...compte.keys()].sort(), 'moteurs en mode calculé effectivement traversés').toEqual([
      'assemble',
      'chrono',
      'paires',
      'phrase',
    ]);
    expect(muets, `étapes sans nbElements : ${muets.join(' · ')}`).toEqual([]);
  });

  it('sur le CONTENU RÉEL du dépôt, aucune étape en mode calculé ne descend sous 2', () => {
    // Les fixtures prouvent la mécanique ; seul le contenu réel prouve ce que l'enfant joue.
    // Ce cas ne fabrique aucune donnée : il ouvre `contenu/exercices/**`, monte le moteur que
    // chaque exercice déclare, et mesure. Il s'étend donc tout seul au contenu à venir.
    //
    // Pourquoi le plancher compte ici : `pDevinette` refuse `n < 2`, et `journaliserEtapes`
    // borne par `Math.max(2, n)`. Une étape à un seul élément passerait donc — mais elle
    // ferait inscrire `2` au journal là où le contenu en compte `1`. Ce n'est pas un plantage,
    // c'est pire : un `p_devinette` juste en apparence sur un item qui ne mesure rien.
    const exercices = readdirSync(join(RACINE_DEPOT, 'contenu', 'exercices'), {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entree) => entree.isFile() && entree.name.endsWith('.json'))
      .map((entree) => join(entree.parentPath, entree.name));

    const sousLePlancher: string[] = [];
    const mesures: string[] = [];

    for (const chemin of exercices) {
      const exercice = JSON.parse(readFileSync(chemin, 'utf8')) as {
        id: string;
        jeu: { moteur: string; contenu: unknown };
      };
      const cas = CAS.find((c) => c.code === exercice.jeu.moteur);
      if (cas === undefined) continue;

      const resume = resumeDuMoteur({ ...cas, contenu: exercice.jeu.contenu });
      for (const etape of resume.etapes) {
        if (!MODES_CALCULES.includes(etape.modeReponse)) continue;
        mesures.push(`${exercice.id}/${etape.identifiant}=${String(etape.nbElements)}`);
        if (typeof etape.nbElements !== 'number' || etape.nbElements < 2) {
          sousLePlancher.push(`${exercice.id}/${etape.identifiant} → ${String(etape.nbElements)}`);
        }
      }
    }

    // Contrat de sortie : si le dépôt ne portait aucun exercice en mode calculé, ce cas
    // passerait sans rien mesurer. On rend donc le compte visible et on exige qu'il soit réel.
    expect(mesures.length, 'aucun exercice réel en mode calculé : ce cas ne prouve rien')
      .toBeGreaterThan(0);
    expect(sousLePlancher, `mesuré : ${mesures.join(' · ')}`).toEqual([]);
  });

  it('un mode NON calculé ne se met pas à inventer un `nbElements`', () => {
    // Le symétrique du cas précédent : poser `nbElements` sur un `vrai-faux` ne changerait
    // rien à `p_devinette` (elle est tabulée) mais rendrait le journal fin mensonger.
    const parasites: string[] = [];
    for (const cas of CAS) {
      for (const etape of resumeDuMoteur(cas).etapes) {
        if (MODES_CALCULES.includes(etape.modeReponse)) continue;
        if (etape.nbElements !== null && etape.nbElements !== undefined) {
          parasites.push(`${cas.code}/${etape.identifiant} (${etape.modeReponse})`);
        }
      }
    }
    expect(parasites, `nbElements parasite : ${parasites.join(' · ')}`).toEqual([]);
  });
});

// ─────────────────────────────────────── la chaîne complète, moteur par moteur, en base

describe.each(CAS.map((cas) => [cas.code, cas] as const))(
  'le résumé du moteur %s traverse POST /api/tentatives',
  (code, cas) => {
    it('la tentative est journalisée, la progression et la maîtrise écrites en base', async () => {
      const profil = await creerProfil();
      const resume = resumeDuMoteur(cas);

      const reponse = await envoyer(profil, code, resume);

      // Avant le correctif : 500 pour `assemble`, `chrono`, `paires` et `phrase`.
      expect(
        reponse.statusCode,
        `${code} → ${String(reponse.statusCode)} ${reponse.payload.slice(0, 300)}`,
      ).toBe(201);

      // « Le journal fait foi » : la tentative, puis tout ce qui s'en recalcule.
      const { compterTentatives, compterEtapes, lireProgressionNoeud, lireMaitrises } =
        await import('@pierre/partage/base');

      expect(await compterTentatives(contexte.baseAsync, profil), `${code} : tentative perdue`).toBe(1);

      const progression = await lireProgressionNoeud(contexte.baseAsync, profil, 'clairiere-01');
      expect(progression, `${code} : aucune progression`).not.toBeNull();
      expect(progression?.nbTentatives).toBe(1);

      // Un moteur qui produit des étapes doit en journaliser autant, et faire avancer le BKT.
      //
      // ARBITRAGE Q-INT-4 — une réussite est imputée à TOUTES les compétences déclarées par
      // l'exercice, plus seulement à `competences[0]`. Le journal fin porte donc une ligne par
      // (étape × compétence). Auparavant trois compétences sur vingt-neuf ne pouvaient jamais
      // recevoir la moindre réussite, tout en étant comptées vertes par R12.
      //
      // L'attendu se DÉRIVE de l'exercice réellement servi : coder « × 3 » en dur ferait
      // recasser ce test au prochain exercice dont on change les compétences, et pour une
      // raison qui n'aurait rien à voir avec ce qu'il vérifie.
      if (resume.etapes.length > 0) {
        const exerciceServi = lireJson<Exercice>('contenu/exercices/clairiere/ecole-01.json');
        const nbCompetences = exerciceServi.competences.length;
        expect(await compterEtapes(contexte.baseAsync, profil), `${code} : journal fin vide`).toBe(
          resume.etapes.length * nbCompetences,
        );
        expect((await lireMaitrises(contexte.baseAsync, profil)).length, `${code} : BKT non alimenté`)
          .toBeGreaterThan(0);
      }

      // Le plancher de D13 vit ICI, dans le journal fin : `pDevinette` refuse `n < 2`, et
      // `journaliserEtapes` borne. C'est cette valeur-là que les DEUX chemins du BKT relisent,
      // l'incrémental comme le recalcul intégral — donc c'est elle qu'il faut vérifier.
      const { listerEtapes } = await import('@pierre/partage/base');
      for (const ligne of await listerEtapes(contexte.baseAsync, profil)) {
        if (MODES_CALCULES.includes(ligne.modeReponse)) {
          expect(ligne.nbElements, `${code}/${ligne.identifiant} : plancher D13`).toBeGreaterThanOrEqual(
            2,
          );
        } else {
          expect(ligne.nbElements, `${code}/${ligne.identifiant} : nbElements parasite`).toBeNull();
        }
      }

      // Et le recalcul intégral doit rester possible pour toujours : c'est lui qui prouve que
      // le journal n'a pas été empoisonné par une ligne que `pDevinette` refuserait (annexe T § T2).
      const { recalculerMaitrise } = await import('@pierre/partage/base');
      const { chargerParametresPedagogie } = await import('@serveur/referentiels/pedagogie');
      await expect(
        recalculerMaitrise(contexte.baseAsync, profil, chargerParametresPedagogie()),
      ).resolves.not.toThrow();
    });
  },
);

// ───────────────────────────────────────────────────────────── le filet, côté serveur

describe('A1 — filet : une étape mal formée ne fait plus perdre la tentative', () => {
  /** Une étape `ordre` SANS `nbElements`, exactement ce que `phrase` envoyait. */
  const etapeSansNbElements: Omit<ResumeEtape, 'nbElements'> = {
    identifiant: 'phrase-01',
    nbErreurs: 0,
    aideUtilisee: 'aucune',
    nbEcoutes: 0,
    dureeMs: 4_000,
    modeReponse: 'ordre',
    latenceMs: 1_800,
    confusion: null,
  };

  it('rend 201, journalise la tentative et sa progression, et écarte la seule étape fautive', async () => {
    const profil = await creerProfil();
    const resume = {
      reussi: true,
      nbErreurs: 0,
      aideUtilisee: 'aucune',
      dureeMs: 60_000,
      etapes: [
        etapeSansNbElements,
        { ...etapeSansNbElements, identifiant: 'phrase-02', modeReponse: 'colorie' },
      ],
    } as unknown as ResumeTentative;

    const reponse = await envoyer(profil, 'phrase', resume);
    expect(reponse.statusCode, reponse.payload.slice(0, 300)).toBe(201);

    const { compterTentatives, compterEtapes, listerEtapes, lireProgressionNoeud } =
      await import('@pierre/partage/base');

    expect(await compterTentatives(contexte.baseAsync, profil)).toBe(1);
    expect(await lireProgressionNoeud(contexte.baseAsync, profil, 'clairiere-01')).not.toBeNull();

    // L'étape saine est journalisée ; la fautive est ÉCARTÉE, jamais complétée d'un défaut
    // inventé — un `p_devinette` supposé ferait monter la maîtrise sur des réponses au hasard.
    //
    // Depuis Q-INT-4, l'étape saine produit une ligne par compétence déclarée. Ce que ce test
    // garde n'est PAS un nombre de lignes, c'est que **la fautive n'a laissé aucune trace** :
    // on l'exprime donc par les identifiants distincts présents, seule formulation qui reste
    // vraie quel que soit le nombre de compétences de l'exercice.
    const identifiants = new Set(
      (await listerEtapes(contexte.baseAsync, profil)).map((ligne) => ligne.identifiant),
    );
    expect([...identifiants]).toEqual(['phrase-02']);
    expect(await compterEtapes(contexte.baseAsync, profil)).toBeGreaterThan(0);
  });

  it('le recalcul intégral reste possible : le journal n’est jamais empoisonné', async () => {
    const profil = await creerProfil();
    await envoyer(
      profil,
      'phrase',
      {
        reussi: true,
        nbErreurs: 0,
        aideUtilisee: 'aucune',
        dureeMs: 60_000,
        etapes: [etapeSansNbElements],
      } as unknown as ResumeTentative,
    );

    const { recalculerMaitrise } = await import('@pierre/partage/base');
    const { chargerParametresPedagogie } = await import('@serveur/referentiels/pedagogie');
    // Une étape `ordre` sans `nbElements` inscrite au journal ferait lever `recalculerMaitrise`
    // à chaque appel, pour toujours : le rejeu (annexe T § T2) deviendrait impossible.
    await expect(
      recalculerMaitrise(contexte.baseAsync, profil, chargerParametresPedagogie()),
    ).resolves.not.toThrow();
  });
});
