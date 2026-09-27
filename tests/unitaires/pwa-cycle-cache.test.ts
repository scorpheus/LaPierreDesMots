/** Exécute le vrai worker, avec réseau et CacheStorage commandés, sans navigateur ni Internet. */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINE = 'https://jeu.example';
const BASE = '/LaPierreDesMots/';
const NOYAU = 'pierre-des-mots-pwa-noyau-courant';
const ANCIEN = 'pierre-des-mots-pwa-noyau-ancien';
const INDEX = `${BASE}index.html`;

interface ClientPwa {
  id: string;
  type: string;
  url: string;
}

const FENETRE: ClientPwa = { id: 'fenetre-jeu', type: 'window', url: `${ORIGINE}${BASE}parent` };

interface Evenement {
  request?: Request;
  data?: unknown;
  source?: ClientPwa | null;
  ports?: { postMessage(message: unknown): void }[];
  waitUntil(promesse: Promise<unknown>): void;
  respondWith(promesse: Promise<Response>): void;
}

function creerWorker(ressources: string[] = [INDEX]) {
  const contenus = new Map<string, Map<string, Response>>();
  const cle = (requete: Request | string): string =>
    new URL(typeof requete === 'string' ? requete : requete.url, ORIGINE).href;
  const ouvrir = async (nom: string) => {
    let entrees = contenus.get(nom);
    if (entrees === undefined) { entrees = new Map(); contenus.set(nom, entrees); }
    const cache = entrees;
    return {
      match: async (requete: Request | string) => cache.get(cle(requete))?.clone(),
      put: async (requete: Request | string, reponse: Response) => {
        // Consommer le corps fait aussi apparaître une panne après réception des en-têtes.
        const octets = await reponse.arrayBuffer();
        cache.set(cle(requete), new Response(octets, { status: reponse.status, headers: reponse.headers }));
      },
    };
  };
  const caches = {
    open: ouvrir,
    keys: async () => [...contenus.keys()],
    delete: vi.fn(async (nom: string) => contenus.delete(nom)),
    match: async (requete: Request | string) => {
      for (const nom of contenus.keys()) {
        const trouve = await (await ouvrir(nom)).match(requete);
        if (trouve !== undefined) return trouve;
      }
      return undefined;
    },
  };
  const ecouteurs = new Map<string, (evenement: Evenement) => void>();
  const clients = {
    claim: vi.fn(async () => undefined),
    matchAll: vi.fn(async (_options: { type: string; includeUncontrolled: boolean }): Promise<ClientPwa[]> => [FENETRE]),
  };
  const skipWaiting = vi.fn(async () => undefined);
  const reseau = vi.fn(async (requete: Request) => new Response(`courant:${requete.url}`));
  class RequeteLocale extends Request {
    constructor(entree: string | Request, options?: RequestInit) {
      super(typeof entree === 'string' ? new URL(entree, ORIGINE) : entree, options);
    }
  }
  const source = readFileSync('client/src/pwa/service-worker.js', 'utf8')
    .replace('__PIERRE_VERSION__', 'courant').replace('__PIERRE_BASE__', BASE)
    .replace('globalThis.__PIERRE_PRECACHE__', JSON.stringify(ressources));
  runInNewContext(source, {
    self: {
      location: { origin: ORIGINE }, clients, skipWaiting,
      addEventListener: (nom: string, ecouteur: (evenement: Evenement) => void) => ecouteurs.set(nom, ecouteur),
    },
    caches, Request: RequeteLocale, Response, Headers, URL, fetch: reseau,
    AbortController, setTimeout, clearTimeout,
  });
  return {
    caches, contenus, reseau, clients, skipWaiting,
    async envoyer(data: unknown, source: ClientPwa | null = FENETRE, avecPort = true) {
      const repondre = vi.fn<(message: unknown) => void>();
      let attente: Promise<unknown> | undefined;
      ecouteurs.get('message')?.({
        data, source, ports: avecPort ? [{ postMessage: repondre }] : [],
        waitUntil: (promesse) => { attente = promesse; }, respondWith: () => undefined,
      });
      await attente;
      return repondre;
    },
    async stocker(nom: string, url: string, texte: string) {
      await (await ouvrir(nom)).put(url, new Response(texte));
    },
    async installer() {
      let attente: Promise<unknown> | undefined;
      ecouteurs.get('install')!({ waitUntil: (p) => { attente = p; }, respondWith: () => undefined });
      await attente;
    },
    async activer() {
      let attente: Promise<unknown> | undefined;
      ecouteurs.get('activate')!({ waitUntil: (p) => { attente = p; }, respondWith: () => undefined });
      await attente;
    },
    async lire(url: string, navigation = false, plage?: string) {
      const request = new Request(new URL(url, ORIGINE), { headers: plage === undefined ? {} : { Range: plage } });
      if (navigation) Object.defineProperty(request, 'mode', { value: 'navigate' });
      let reponse: Promise<Response> | undefined;
      ecouteurs.get('fetch')!({ request, waitUntil: () => undefined, respondWith: (p) => { reponse = p; } });
      if (reponse === undefined) throw new Error('Requête non prise en charge');
      return reponse;
    },
  };
}

afterEach(() => vi.useRealTimers());

describe('isolation et remplacement du noyau PWA', () => {
  it('sert sa version pour les routes, les modules et les plages audio malgré un cache plus ancien', async () => {
    const worker = creerWorker();
    for (const url of [INDEX, `${BASE}jeu.js`, `${BASE}voix.opus`]) {
      await worker.stocker(ANCIEN, url, 'ancien');
      await worker.stocker(NOYAU, url, 'courant');
    }
    expect(await (await worker.lire(`${BASE}campement`, true)).text()).toBe('courant');
    expect(await (await worker.lire(`${BASE}jeu.js`)).text()).toBe('courant');
    const audio = await worker.lire(`${BASE}voix.opus`, false, 'bytes=0-2');
    expect(audio.status).toBe(206);
    expect(await audio.text()).toBe('cou');
    expect(worker.reseau).not.toHaveBeenCalled();
  });

  it('réessaie une panne réseau puis installe le noyau entier sans toucher à l’ancien', async () => {
    const worker = creerWorker([INDEX, `${BASE}jeu.js`]);
    await worker.stocker(ANCIEN, INDEX, 'ancien');
    worker.reseau.mockRejectedValueOnce(new TypeError('connexion interrompue'));
    await worker.installer();
    expect(await (await worker.caches.open(NOYAU)).match(INDEX)).toBeDefined();
    expect(await (await worker.caches.open(NOYAU)).match(`${BASE}jeu.js`)).toBeDefined();
    expect(await (await worker.caches.open(ANCIEN)).match(INDEX)).toBeDefined();
    expect(worker.caches.delete).not.toHaveBeenCalled();
  });

  it('réessaie aussi un 503 et une coupure du corps, mais refuse une ressource définitivement absente', async () => {
    const worker = creerWorker();
    worker.reseau.mockResolvedValueOnce(new Response('indisponible', { status: 503 }));
    worker.reseau.mockResolvedValueOnce(new Response(new ReadableStream({ start(c) { c.error(new TypeError('corps coupé')); } })));
    await worker.installer();
    expect(await (await worker.caches.open(NOYAU)).match(INDEX)).toBeDefined();

    const absent = creerWorker();
    await absent.stocker(ANCIEN, INDEX, 'ancien');
    absent.reseau.mockResolvedValue(new Response('absent', { status: 404 }));
    await expect(absent.installer()).rejects.toThrow(/404/u);
    expect(absent.reseau).toHaveBeenCalledTimes(1);
    expect(absent.contenus.has(NOYAU)).toBe(false);
    expect(absent.contenus.has(ANCIEN)).toBe(true);
  });

  it('borne une requête suspendue et conserve la version précédente après l’échec final', async () => {
    vi.useFakeTimers();
    const worker = creerWorker();
    await worker.stocker(ANCIEN, INDEX, 'ancien');
    worker.reseau.mockImplementation((requete) => new Promise((_resoudre, rejeter) => {
      requete.signal.addEventListener('abort', () => rejeter(new Error('réseau expiré')), { once: true });
    }));
    const termine = vi.fn();
    const installation = worker.installer().then(() => termine('réussite'), () => termine('échec'));
    await vi.runAllTimersAsync();
    expect(termine).toHaveBeenCalledWith('échec');
    expect(worker.reseau).toHaveBeenCalledTimes(3);
    expect(worker.contenus.has(ANCIEN)).toBe(true);
    expect(worker.contenus.has(NOYAU)).toBe(false);
    await installation;
  });

  it('attend la fin des écritures du lot avant de supprimer un cache incomplet', async () => {
    const worker = creerWorker([INDEX, `${BASE}jeu.js`]);
    let livrer!: (reponse: Response) => void;
    worker.reseau.mockImplementation((requete) => requete.url.endsWith('index.html')
      ? Promise.resolve(new Response('absent', { status: 404 }))
      : new Promise((resoudre) => { livrer = resoudre; }));
    let terminee = false;
    const installation = worker.installer().catch(() => { terminee = true; });
    // Vidage des microtâches, sans attente murale et sans ouvrir le téléchargement suspendu.
    for (let tour = 0; tour < 20; tour += 1) await Promise.resolve();
    expect(terminee).toBe(false);
    expect(worker.caches.delete).not.toHaveBeenCalled();
    livrer(new Response('module'));
    await installation;
    expect(worker.contenus.has(NOYAU)).toBe(false);
  });

  it('l’activation retire seulement les caches du jeu périmés', async () => {
    const worker = creerWorker();
    await worker.stocker(ANCIEN, INDEX, 'ancien');
    await worker.stocker(NOYAU, INDEX, 'courant');
    await worker.stocker('autre-application', '/autre/index.html', 'autre');
    await worker.activer();
    expect([...worker.contenus.keys()]).toEqual([NOYAU, 'autre-application']);
  });
});

describe('activation explicite de la mise à jour PWA', () => {
  it('laisse le worker installé en attente sans demande explicite', async () => {
    const worker = creerWorker();
    await worker.installer();
    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });

  it('répond avec sa version et compte aussi les fenêtres non contrôlées du jeu', async () => {
    const worker = creerWorker();
    worker.clients.matchAll.mockResolvedValue([
      FENETRE,
      { ...FENETRE, id: 'deuxieme', url: `${ORIGINE}${BASE}carte` },
      { ...FENETRE, id: 'autre-jeu', url: `${ORIGINE}/LaPierreDesMots-bis/` },
      { ...FENETRE, id: 'autre-origine', url: `https://ailleurs.example${BASE}` },
      { ...FENETRE, id: 'worker', type: 'worker' },
    ]);
    const repondre = await worker.envoyer({ type: 'pierre:version' });
    expect(repondre).toHaveBeenCalledExactlyOnceWith({ ok: true, version: 'courant', fenetres: 2 });
    expect(worker.clients.matchAll).toHaveBeenCalledExactlyOnceWith({ type: 'window', includeUncontrolled: true });
    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });

  it('active uniquement la version demandée par la seule fenêtre du jeu', async () => {
    const worker = creerWorker();
    worker.clients.matchAll.mockResolvedValue([
      FENETRE, { ...FENETRE, id: 'autre-page', url: `${ORIGINE}/autre/` },
    ]);
    const repondre = await worker.envoyer({ type: 'pierre:activer', version: 'courant' });
    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
    expect(repondre).toHaveBeenCalledExactlyOnceWith({ ok: true, version: 'courant' });
    expect(worker.clients.matchAll).toHaveBeenCalledExactlyOnceWith({ type: 'window', includeUncontrolled: true });
  });

  it('refuse une autre version sans forcer l’activation', async () => {
    const worker = creerWorker();
    const repondre = await worker.envoyer({ type: 'pierre:activer', version: 'ancienne' });
    expect(repondre).toHaveBeenCalledExactlyOnceWith({ ok: false, message: expect.stringMatching(/version/iu) });
    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });

  it.each([
    { nom: 'absente', source: null },
    { nom: 'un worker', source: { ...FENETRE, type: 'worker' } },
    { nom: 'une autre origine', source: { ...FENETRE, url: `https://ailleurs.example${BASE}` } },
    { nom: 'un autre chemin', source: { ...FENETRE, url: `${ORIGINE}/LaPierreDesMots-bis/` } },
  ])('refuse une source $nom', async ({ source }) => {
    const worker = creerWorker();
    const repondre = await worker.envoyer({ type: 'pierre:activer', version: 'courant' }, source);
    expect(repondre).toHaveBeenCalledExactlyOnceWith({ ok: false, message: expect.any(String) });
    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });

  it('demande de fermer les autres onglets avant de forcer l’activation', async () => {
    const worker = creerWorker();
    worker.clients.matchAll.mockResolvedValue([FENETRE, { ...FENETRE, id: 'deuxieme' }]);
    const repondre = await worker.envoyer({ type: 'pierre:activer', version: 'courant' });
    expect(repondre).toHaveBeenCalledExactlyOnceWith({
      ok: false, message: expect.stringMatching(/fermez les autres onglets/iu),
    });
    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });

  it('ignore les messages inconnus et toute activation sans port de réponse', async () => {
    const worker = creerWorker();
    for (const message of [null, 'pierre:activer', { type: 'autre:activer', version: 'courant' }]) {
      expect(await worker.envoyer(message)).not.toHaveBeenCalled();
    }
    expect(await worker.envoyer({ type: 'pierre:activer', version: 'courant' }, FENETRE, false)).not.toHaveBeenCalled();
    expect(worker.skipWaiting).not.toHaveBeenCalled();
    expect(worker.clients.matchAll).not.toHaveBeenCalled();
  });

  it('retourne une erreur si le navigateur ne peut pas inventorier les fenêtres', async () => {
    const worker = creerWorker();
    worker.clients.matchAll.mockRejectedValue(new Error('inventaire indisponible'));
    const repondre = await worker.envoyer({ type: 'pierre:activer', version: 'courant' });
    expect(repondre).toHaveBeenCalledExactlyOnceWith({ ok: false, message: expect.any(String) });
    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });
});
