/**
 * LE HARNAIS D'ISOLATION — un serveur NEUF par cas de test. Lot P1.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * LE CONSTAT QUI COMMANDE CE FICHIER
 *
 * `playwright.config.ts` portait `workers: 1` et `fullyParallel: false` sur une machine à
 * 32 cœurs, et le réglage avait une BONNE raison : les 372 cas partageaient UN serveur et UNE
 * base. Les paralléliser tels quels, c'était laisser un cas créer un profil pendant qu'un
 * autre les compte.
 *
 * La leçon n'est pas « il ne faut pas paralléliser », c'est **« il ne faut pas partager »**.
 * Ce fichier supprime le partage au lieu de sérialiser ses conséquences : chaque cas parle à
 * un processus serveur qui vient de naître, avec sa base `:memory:` vierge et son `Alea`
 * rembobiné sur `ATELIER_GRAINE`. Deux cas ne peuvent alors plus se voir, quel que soit
 * l'ordre dans lequel l'ordonnanceur les distribue — et c'est cette dernière propriété qui
 * compte : **le verdict ne dépend plus de la planification.**
 *
 * ── CE N'EST PAS UNE PRÉCAUTION THÉORIQUE : LA POLLUTION ÉTAIT DÉJÀ LÀ, ET DOCUMENTÉE ──────
 *
 * `tests/e2e/qa-outils.ts:295` la raconte, mesurée, avant tout parallélisme :
 *
 *     « l'audit "aucun élément interactif mort" tape tout ce qu'il trouve sur les douze écrans
 *       de nœud, termine donc des exercices, et les Galeries se refermaient avant que le cas
 *       D38 ne les cherche […] La QA se polluait elle-même. »
 *
 * et `qa-outils.ts:310` cite le contrôle positif désarmé par cette même fuite :
 *
 *     ce fichier SEUL ......................... 11 passed
 *     parcours-nominal.spec.ts puis ce fichier .  1 failed, 14 passed
 *
 * Un serveur par cas rend ces deux défauts **impossibles par construction**, au lieu de les
 * contourner par des prénoms distincts. Aucune assertion n'est touchée, aucune n'est
 * assouplie : on ne change que ce que le cas TROUVE en arrivant — rien.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ── POURQUOI LE COÛT EST NUL, ET C'EST MESURÉ ──────────────────────────────────────────────
 *
 * Un serveur coûte **327 ms** au démarrage (médiane de 8 lancements à froid,
 * `bac-a-sable/p1-parallelisme/mesurer-demarrage.mjs`). Payé 372 fois en série, ce serait
 * deux minutes ajoutées. Il n'est jamais payé en série : le vivier **préchauffe le serveur
 * suivant pendant que le cas courant tourne**. Quand le cas d'après le réclame, il est déjà
 * en écoute. Le seul démarrage qui coûte vraiment est le tout premier de chaque travailleur.
 *
 * ── POURQUOI PLUS AUCUN `webServer` DANS LA CONFIGURATION ──────────────────────────────────
 *
 * `webServer` ne sait démarrer qu'UN serveur, sur UN port fixe. Trois conséquences, dont la
 * troisième mordait déjà :
 *   1. il ne peut pas donner un serveur par cas — c'est la raison principale ;
 *   2. `reuseExistingServer: false` fait ÉCHOUER toute la campagne si le port 8080 est occupé,
 *      et 8080 est le port sur lequel le père fait tourner le jeu pour son enfant ;
 *   3. deux campagnes lancées en parallèle (D10) se disputaient ce port.
 * Le port est désormais **réservé par le noyau** (`listen(0)`), donc jamais deviné, jamais en
 * conflit — ni avec le père, ni avec une campagne voisine.
 *
 * ── CE QUI EST INTERDIT ICI ────────────────────────────────────────────────────────────────
 *
 * Aucun `Date.now()`, aucun `new Date()`, aucun `Math.random()`. Les bornes de patience sont
 * des COMPTEURS de tentatives, jamais des durées : une QA non déterministe est une QA qu'on
 * finit par ignorer (CLAUDE.md). Et l'attente du serveur attend un ÉTAT — une réponse 200 de
 * `/api/sante` — jamais un délai (annexe T § 6).
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

import { test as base } from '@playwright/test';

import type { ChildProcess } from 'node:child_process';

/** Racine du dépôt, absolue : ce fichier vit dans `tests/`. */
const RACINE = fileURLToPath(new URL('..', import.meta.url));

/**
 * Graine fixée, partagée par le serveur, le client et les recettes.
 *
 * Reprise de `playwright.config.ts` — c'est la MÊME valeur qu'avant le lot P1, lue au même
 * endroit (`ATELIER_GRAINE`). Un serveur neuf par cas la rembobine à chaque fois : c'est un
 * gain de reproductibilité, pas une dérive.
 */
const GRAINE = process.env['ATELIER_GRAINE'] ?? '20260801';

/**
 * Nombre maximal de sondages de `/api/sante` avant d'abandonner un démarrage.
 *
 * Un COMPTEUR, pas un délai : la règle non négociable de CLAUDE.md interdit l'horloge, et une
 * borne en nombre d'essais est de toute façon plus honnête — elle ne dépend pas de la charge
 * de la machine au moment où on la lit. À 5 ms de cadence, 4 000 essais couvrent très
 * largement les 327 ms mesurés, même sous 16 travailleurs.
 */
const SONDAGES_MAX = 4_000;

/** Cadence de sondage, en millisecondes. Ce n'est pas une attente : c'est un pas de boucle. */
const PAS_DE_SONDAGE_MS = 5;

/** Un démarrage peut échouer sur une course de port ; on réessaie, mais pas indéfiniment. */
const DEMARRAGES_MAX = 3;

/** Un serveur du vivier : son port, son adresse de base, et de quoi l'éteindre. */
export interface ServeurIsole {
  readonly port: number;
  readonly url: string;
  arreter: () => Promise<void>;
  /** Recrée uniquement la base mémoire de recette, sans changer l'adresse du navigateur. */
  reinitialiser: () => Promise<void>;
}

/**
 * Réserve un port LIBRE auprès du noyau, puis le rend.
 *
 * On ne DEVINE pas un port (`8080 + indice`) : deux campagnes parallèles devineraient le même.
 * Le noyau, lui, sait lequel est libre. La fenêtre entre la fermeture de la sonde et l'écoute
 * du serveur est étroite mais réelle — `demarrerServeur` réessaie donc, et c'est la seule
 * raison d'être de `DEMARRAGES_MAX`.
 */
async function reserverPort(): Promise<number> {
  return new Promise<number>((resoudre, rejeter) => {
    const sonde = createServer();
    sonde.once('error', rejeter);
    sonde.listen(0, '127.0.0.1', () => {
      const adresse = sonde.address();
      const port = typeof adresse === 'object' && adresse !== null ? adresse.port : 0;
      sonde.close(() => {
        if (port === 0) {
          rejeter(new Error('P1 : le noyau n’a pas rendu de port libre.'));
          return;
        }
        resoudre(port);
      });
    });
  });
}

/** Un pas de boucle de sondage. Ce n'est pas `waitForTimeout` : la CONDITION est un état. */
async function pas(): Promise<void> {
  return new Promise<void>((resoudre) => {
    setTimeout(resoudre, PAS_DE_SONDAGE_MS);
  });
}

/**
 * Attend que le serveur RÉPONDE — pas qu'un délai s'écoule.
 *
 * Rend `false` si le processus est mort avant d'écouter (port pris, migration en échec) :
 * l'appelant réessaiera sur un autre port plutôt que de faire échouer un cas innocent.
 */
async function attendreEnEcoute(port: number, fils: ChildProcess): Promise<boolean> {
  for (let essai = 0; essai < SONDAGES_MAX; essai += 1) {
    if (fils.exitCode !== null || fils.signalCode !== null) {
      return false;
    }
    try {
      const reponse = await fetch(`http://127.0.0.1:${String(port)}/api/sante`);
      if (reponse.ok) {
        // Le corps est lu et jeté : sans cela l'agent HTTP garde la connexion ouverte, et le
        // serveur ne se ferme pas proprement à l'extinction.
        await reponse.text();
        return true;
      }
    } catch {
      // Le serveur n'écoute pas encore. C'est l'état normal des premiers sondages.
    }
    await pas();
  }
  return false;
}

/**
 * Démarre UN serveur, base `:memory:`, `Alea` rembobiné, client de test servi.
 *
 * L'environnement est celui que `playwright.config.ts` posait dans `webServer.env` avant P1,
 * à une variable près : `PIERRE_HOTE` vaut `127.0.0.1` au lieu de `0.0.0.0`. Un serveur de
 * test n'a aucune raison d'être joignable depuis le LAN, et 372 processus qui ouvrent une
 * écoute publique feraient clignoter le pare-feu de la machine à chaque campagne.
 */
async function demarrerInstance(portImpose?: number): Promise<Omit<ServeurIsole, 'reinitialiser'>> {
  let derniereRaison = 'inconnue';

  for (let tentative = 0; tentative < DEMARRAGES_MAX; tentative += 1) {
    const port = portImpose ?? await reserverPort();
    const fils = spawn(process.execPath, ['serveur/dist/index.js'], {
      cwd: RACINE,
      env: {
        ...process.env,
        PIERRE_PORT: String(port),
        PIERRE_HOTE: '127.0.0.1',
        // Base éphémère, propre au cas : aucune recette ne touche `donnees/pierre.db`.
        PIERRE_BASE: ':memory:',
        PIERRE_CONTENU: 'contenu',
        // Contrat § 7.3 : en test on sert `client/dist-test/`, jamais `client/dist/`.
        PIERRE_CLIENT: 'client/dist-test',
        ATELIER_GRAINE: GRAINE
      },
      stdio: 'ignore'
    });

    const sorti = new Promise<void>((resoudre) => {
      fils.once('exit', () => {
        resoudre();
      });
    });

    if (await attendreEnEcoute(port, fils)) {
      return {
        port,
        url: `http://127.0.0.1:${String(port)}`,
        arreter: async () => {
          if (fils.exitCode === null && fils.signalCode === null) {
            fils.kill();
          }
          await sorti;
        }
      };
    }

    derniereRaison =
      fils.exitCode === null
        ? `aucune réponse de /api/sante après ${String(SONDAGES_MAX)} sondages sur le port ${String(port)}`
        : `le processus serveur s’est arrêté (code ${String(fils.exitCode)}) sur le port ${String(port)}`;
    fils.kill();
    await sorti;
  }

  throw new Error(
    `P1 : impossible de démarrer un serveur isolé après ${String(DEMARRAGES_MAX)} tentatives — ` +
      `${derniereRaison}. Vérifier que \`serveur/dist/index.js\` et \`client/dist-test/\` ` +
      'existent (`npm run typescript` puis `npm run construire:test`).'
  );
}

/**
 * LE VIVIER — un serveur toujours prêt, et le suivant déjà en train de naître.
 *
 * C'est tout le secret du coût nul : `prendre()` rend le serveur préchauffé ET relance
 * immédiatement un préchauffage. Le démarrage du serveur du cas n+1 se déroule pendant que le
 * cas n joue, c'est-à-dire pendant plusieurs centaines de millisecondes de navigateur.
 */
async function demarrerServeur(): Promise<ServeurIsole> {
  let courant = await demarrerInstance();
  const { port, url } = courant;
  return {
    port, url,
    arreter: () => courant.arreter(),
    reinitialiser: async () => {
      await courant.arreter();
      courant = await demarrerInstance(port);
    },
  };
}

class Vivier {
  #suivant: Promise<ServeurIsole> | null = null;
  #ferme = false;

  precharger(): void {
    if (this.#ferme || this.#suivant !== null) return;
    // L'échec est capté à `prendre()` ; ici, on ne veut surtout pas d'un rejet non traité.
    const promesse = demarrerServeur();
    promesse.catch(() => {
      /* signalé au cas qui le réclamera */
    });
    this.#suivant = promesse;
  }

  async prendre(): Promise<ServeurIsole> {
    this.precharger();
    const attendu = this.#suivant;
    this.#suivant = null;
    let serveur: ServeurIsole;
    try {
      serveur = await attendu!;
    } finally {
      // Réchauffage du suivant, y compris après un échec : un démarrage raté sur une course de
      // port ne doit pas condamner le reste du travailleur.
      this.precharger();
    }
    return serveur;
  }

  async vider(): Promise<void> {
    this.#ferme = true;
    const reste = this.#suivant;
    this.#suivant = null;
    if (reste === null) return;
    try {
      await (await reste).arreter();
    } catch {
      /* le préchauffage avait déjà échoué : rien à éteindre */
    }
  }
}

interface FixturesTravailleur {
  readonly vivier: Vivier;
}

interface FixturesCas {
  readonly serveurIsole: ServeurIsole;
  /**
   * `baseURL` est REDÉFINIE ici, et c'est le pivot de tout le dispositif.
   *
   * `context`, `page` et `request` en dépendent : les rediriger vers le serveur du cas suffit
   * à ce qu'AUCUNE recette n'ait à changer une seule ligne. Toutes naviguent déjà en relatif
   * (`page.goto('/')`, `request.post('/api/profils')`) — vérifié par énumération :
   * `grep -rn "8080\|localhost:" tests/**\/*.ts` ne rend aucune URL de navigation.
   */
  readonly baseURL: string;
}

/**
 * `test`, avec l'isolation par cas. À importer À LA PLACE de `@playwright/test`.
 *
 * Les recettes de `tests/e2e/` ne l'importent pas directement : elles passent par
 * `tests/e2e/invariants.ts`, qui étend ce harnais et y ajoute la sentinelle. Les suites
 * `tests/qualite/` et `tests/visuel/` l'importent, elles, en direct.
 */
export const test = base.extend<FixturesCas, FixturesTravailleur>({
  vivier: [
    // Le motif vide est OBLIGATOIRE ici, ce n'est pas un tic de style : Playwright analyse la
    // signature du fixateur pour en déduire ses dépendances, et refuse tout net un paramètre
    // nommé — « First argument must use the object destructuring pattern: _fixateurs »,
    // sortie citée. `no-empty-pattern` est donc désactivé sur cette ligne, et sur elle seule.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const vivier = new Vivier();
      // Le premier serveur du travailleur commence à naître avant même le premier cas.
      vivier.precharger();
      await use(vivier);
      await vivier.vider();
    },
    { scope: 'worker' }
  ],

  serveurIsole: async ({ vivier }, use) => {
    const serveur = await vivier.prendre();
    await use(serveur);
    await serveur.arreter();
  },

  baseURL: async ({ serveurIsole }, use) => {
    await use(serveurIsole.url);
  }
});

export { expect } from '@playwright/test';
