/**
 * Préparation commune aux trois projets Vitest — lot L-G.
 *
 * Déclaré en `setupFiles` par `vitest.config.ts`. Il fait exactement trois choses, dans cet
 * ordre, avant chaque test :
 *
 * 1. **Enregistrer les moteurs.** `initialiserRegistreMoteurs()` est idempotent (contrat
 *    § 4.3) et doit avoir été appelé par « la racine de composition du client, du serveur et
 *    de chaque test ». Le faire ici est la seule façon qu'aucun fichier de test ne l'oublie.
 * 2. **Figer l'horloge.** Aucun test ne lit l'heure réelle. L'instant de référence est
 *    celui de l'annexe T § 2.2, repris à la lettre.
 * 3. **Fixer la graine.** `ATELIER_GRAINE` vaut pour le code qui lit l'environnement ; les
 *    tests qui injectent leur propre `Alea` utilisent `GRAINE_DE_TEST`.
 *
 * Ce fichier est aussi un module ordinaire : les suites y puisent leurs constantes et leurs
 * petits assembleurs de fixtures. Le contrat gelé § 1.7 n'accorde à L-G aucun autre fichier
 * de soutien, et l'interdiction de créer un fichier non listé (§ 0) prime — tout l'outillage
 * partagé des tests vit donc ici.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * HYPOTHÈSES — le contrat gelé nomme ces symboles (§ 11.1) sans en donner la signature.
 * Elles sont reprises telles quelles dans le rapport de L-G comme défauts du contrat.
 *   • `horloge.figer(instantIso)` et `horloge.avancer(duree)` — forme de l'annexe T § 2.2.
 *   • `creerHorlogeFigee(instantIso): Horloge`.
 *   • `creerAlea(graine): Alea`, `Alea.flottant(): number` dans [0, 1).
 * Si L-B a retenu d'autres noms, ces tests échouent **à l'exécution** et le disent : c'est le
 * comportement voulu. Aucune assertion n'a été assouplie pour masquer l'écart.
 * ────────────────────────────────────────────────────────────────────────────────────────
 */
import { readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { beforeEach } from 'vitest';

import { creerAlea, creerHorlogeFigee, horloge, initialiserRegistreMoteurs } from '@pierre/partage';
import { AudioMuet, VoixMuette } from '@pierre/partage/factices';

import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import type { Alea, Habillage, Horloge } from '@pierre/partage';

/** Instant de référence de toute la suite — annexe T § 2.2, cité à la lettre. */
export const INSTANT_DE_REFERENCE = '2026-09-01T08:00:00Z';

/** Graine de référence de toute la suite. Identique à celle de `playwright.config.ts`. */
export const GRAINE_DE_TEST = 20260801;

/**
 * Racine du dépôt.
 *
 * On NE passe PAS par `new URL('../../', import.meta.url)` : sous Vitest le module est
 * transformé et `import.meta.url` n'est pas garanti être une URL `file:` — d'où
 * « The URL must be of scheme file », qui faisait échouer les 10 fichiers de test au
 * chargement, avant même qu'un seul cas ne s'exécute.
 *
 * `vitest.config.ts` fixe `root` sur la racine du dépôt et Vitest s'y place : `process.cwd()`
 * est donc stable et vaut pour les deux environnements (`node` et `happy-dom`).
 */
export const RACINE_DEPOT = resolve(process.cwd()) + sep;

initialiserRegistreMoteurs();

process.env['ATELIER_GRAINE'] = String(GRAINE_DE_TEST);

beforeEach(() => {
  // Idempotent : le registre refuse-t-il un doublon ? Il ne doit pas (contrat § 4.3).
  initialiserRegistreMoteurs();
  horloge.figer(INSTANT_DE_REFERENCE);
});

// ─────────────────────────────────────────────────────────────── petits assembleurs

/** Une horloge figée neuve, indépendante du singleton, pour les tests qui la font avancer. */
export function horlogeDeTest(instant: string = INSTANT_DE_REFERENCE): Horloge {
  return creerHorlogeFigee(instant);
}

/** Un `Alea` neuf sur la graine de référence. */
export function aleaDeTest(graine: number = GRAINE_DE_TEST): Alea {
  return creerAlea(graine);
}

/**
 * Les services de jeu, entièrement muets — annexe T § 2.3.
 * La suite complète tourne sans son, sans binaire Piper, sans Ollama.
 */
export function servicesDeTest(): {
  alea: Alea;
  horloge: Horloge;
  voix: VoixMuette;
  audio: AudioMuet;
} {
  return {
    alea: aleaDeTest(),
    horloge: horlogeDeTest(),
    voix: new VoixMuette(),
    audio: new AudioMuet()
  };
}

/** Lit un fichier du dépôt, en texte brut, depuis un chemin relatif à la racine. */
export function lireTexte(cheminRelatif: string): string {
  // `join` et non `new URL` : RACINE_DEPOT est désormais un chemin système, pas une URL.
  return readFileSync(join(RACINE_DEPOT, cheminRelatif), 'utf8');
}

/** Lit un fichier du dépôt, en JSON, depuis un chemin relatif à la racine. */
export function lireJson<T = unknown>(cheminRelatif: string): T {
  return JSON.parse(lireTexte(cheminRelatif)) as T;
}

// ───────────────────────────────────────────── chemins des données de la v1 (lot L-F)

export const CHEMIN_EXERCICE_ECOLE = 'contenu/exercices/clairiere/ecole-01.json';
export const CHEMIN_HABILLAGE_ECOLE = 'contenu/habillages/clairiere/ecole.habillage.json';
export const CHEMIN_SVG_ECOLE = 'contenu/habillages/clairiere/ecole.svg';
export const CHEMIN_NOEUD_CLAIRIERE = 'contenu/noeuds/clairiere-01.json';
export const CHEMIN_COMPETENCES = 'contenu/referentiel/competences.json';
export const CHEMIN_SCHEMA_EXERCICE = 'contenu/schemas/exercice.schema.json';

/** L'habillage réel de la v1, lu sur disque. Les tests ne fabriquent pas de faux décor. */
export function habillageEcole(): Habillage {
  return lireJson<Habillage>(CHEMIN_HABILLAGE_ECOLE);
}

// ──────────────────────────────────────────────────────── montage de l'application (T2)

/** Dossier des migrations, en chemin absolu — `appliquerMigrations` l'exige (contrat § 6.4). */
export const DOSSIER_MIGRATIONS = join(RACINE_DEPOT, 'serveur', 'migrations') + sep;

export interface ApplicationDeTest {
  readonly application: FastifyInstance;
  readonly base: DatabaseSync;
  fermer(): Promise<void>;
}

/**
 * Monte l'application Fastify sur une base `:memory:` migrée, une horloge figée et un dépôt
 * de contenu en mémoire chargé des données réelles de la v1.
 *
 * Les imports sont **dynamiques** : ce fichier sert aussi de `setupFiles` aux projets
 * `unitaires` et `composants`, qui n'ont rien à faire de Fastify ni de `node:sqlite`.
 */
export async function monterApplication(): Promise<ApplicationDeTest> {
  const [{ construireApplication }, { ouvrirBase }, { appliquerMigrations }, factices] =
    await Promise.all([
      import('@serveur/application'),
      import('@serveur/base/connexion'),
      import('@serveur/base/migrations'),
      import('@pierre/partage/factices')
    ]);

  const base = ouvrirBase(':memory:');
  const horlogeApplication = horlogeDeTest();
  appliquerMigrations(base, DOSSIER_MIGRATIONS, horlogeApplication);

  // ⚠ Hypothèse de L-G : le contrat § 11.2 exporte `DepotContenuMemoire` et le type
  // `ContenuEnMemoire` sans en donner la forme. On passe les trois collections de la v1 ;
  // si le constructeur n'attend rien, l'argument est simplement ignoré.
  const contenu = new factices.DepotContenuMemoire({
    exercices: [lireJson(CHEMIN_EXERCICE_ECOLE)],
    noeuds: [lireJson(CHEMIN_NOEUD_CLAIRIERE)],
    habillages: [habillageEcole()],
    competences: lireJson(CHEMIN_COMPETENCES)
  });

  const application = construireApplication({
    base,
    contenu,
    horloge: horlogeApplication,
    alea: aleaDeTest(),
    racineClient: null
  });
  await application.ready();

  return {
    application,
    base,
    async fermer() {
      await application.close();
      base.close();
    }
  };
}
