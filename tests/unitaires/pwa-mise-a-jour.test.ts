import { afterEach, describe, expect, it, vi } from 'vitest';
import { creerSuiviMiseAJour, redemarrerApresSauvegarde } from '../../client/src/pwa/mise-a-jour.js';

const sauvegarde = vi.hoisted(() => ({
  proteger: vi.fn(async (operation: () => Promise<void>) => operation()),
  vider: vi.fn(async () => undefined),
  fermer: vi.fn(async () => undefined)
}));
vi.mock('../../client/src/api/client.js', () => ({
  protegerSauvegardeActivites: sauvegarde.proteger, viderTentativesEnAttente: sauvegarde.vider
}));
vi.mock('../../client/src/base/adaptateur-sqlite-wasm.js', () => ({
  ouvrirBaseNavigateur: async () => ({ fermer: sauvegarde.fermer })
}));

function differer<T>() {
  let resoudre!: (valeur: T) => void;
  let rejeter!: (cause: Error) => void;
  const promesse = new Promise<T>((oui, non) => { resoudre = oui; rejeter = non; });
  return { promesse, resoudre, rejeter };
}

function atelier(avecAttente = true) {
  const ancien = Object.assign(new EventTarget(), { state: 'activated', postMessage: vi.fn() }) as unknown as ServiceWorker;
  const nouveau = Object.assign(new EventTarget(), { state: 'installed', postMessage: vi.fn() }) as unknown as ServiceWorker;
  const conteneur = Object.assign(new EventTarget(), { controller: ancien }) as unknown as ServiceWorkerContainer;
  const update = vi.fn(async () => undefined);
  const inscription = Object.assign(new EventTarget(), {
    waiting: avecAttente ? nouveau : null, installing: null, active: ancien, update
  }) as unknown as ServiceWorkerRegistration;
  const recharger = vi.fn();
  const redemarrer = vi.fn(async (activer: () => Promise<void>) => { await activer(); recharger(); });
  let fenetres = 1;
  const dialoguer = vi.fn(async (worker: ServiceWorker, message: object) => {
    const commande = message as { type: string; version?: string };
    if (commande.type === 'pierre:activer') {
      Object.defineProperty(conteneur, 'controller', { value: worker, configurable: true });
      Object.defineProperty(inscription, 'waiting', { value: null, configurable: true });
      conteneur.dispatchEvent(new Event('controllerchange'));
      return { ok: true, version: 'v2', fenetres };
    }
    return { ok: true, version: worker === ancien ? 'v1' : 'v2', fenetres };
  });
  const suivi = creerSuiviMiseAJour({ conteneur, redemarrer, dialoguer });
  return { ancien, nouveau, conteneur, inscription, update, recharger, redemarrer, dialoguer, suivi,
    plusieursFenetres: () => { fenetres = 2; } };
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('mise à jour disponible sans interruption du jeu', () => {
  it('détecte une version déjà en attente et lit la version réellement utilisée sans activer', async () => {
    const a = atelier();
    await a.suivi.suivre(a.inscription);
    expect(a.suivi.lire()).toMatchObject({ phase: 'prete', versionInstallee: 'v1', versionPrete: 'v2' });
    expect(a.redemarrer).not.toHaveBeenCalled();
    expect(a.dialoguer.mock.calls.every(([, message]) => (message as { type: string }).type === 'pierre:version')).toBe(true);
    a.suivi.arreter();
  });

  it('suit un téléchargement découvert après ouverture et conserve le report pendant les recherches', async () => {
    const a = atelier(false);
    await a.suivi.suivre(a.inscription);
    Object.defineProperty(a.inscription, 'installing', { value: a.nouveau, configurable: true });
    a.inscription.dispatchEvent(new Event('updatefound'));
    expect(a.suivi.lire().phase).toBe('telechargement');
    Object.defineProperty(a.inscription, 'installing', { value: null });
    Object.defineProperty(a.inscription, 'waiting', { value: a.nouveau });
    a.nouveau.dispatchEvent(new Event('statechange'));
    await vi.waitFor(() => expect(a.suivi.lire().phase).toBe('prete'));
    a.suivi.reporter();
    await a.suivi.verifier();
    expect(a.suivi.lire().reportee).toBe(true);
    expect(a.redemarrer).not.toHaveBeenCalled();
    a.suivi.arreter();
  });

  it('réunit les recherches concurrentes et reste utilisable après une panne réseau', async () => {
    const a = atelier(false);
    await a.suivi.suivre(a.inscription);
    const recherche = differer<void>();
    a.update.mockReturnValueOnce(recherche.promesse);
    const premiere = a.suivi.verifier();
    const seconde = a.suivi.verifier();
    recherche.rejeter(new Error('hors connexion'));
    await Promise.all([premiere, seconde]);
    expect(a.update).toHaveBeenCalledTimes(1);
    expect(a.suivi.lire()).toMatchObject({ phase: 'erreur', versionInstallee: 'v1' });
    expect(a.recharger).not.toHaveBeenCalled();
    await a.suivi.verifier();
    expect(a.suivi.lire().phase).toBe('repos');
    a.suivi.arreter();
  });

  it('ne propose pas la première installation comme une mise à jour', async () => {
    const a = atelier();
    Object.defineProperty(a.conteneur, 'controller', { value: null, configurable: true });
    await a.suivi.suivre(a.inscription);
    expect(a.suivi.lire().versionPrete).toBeNull();
    expect(a.redemarrer).not.toHaveBeenCalled();
    a.suivi.arreter();
  });

  it('ne redémarre qu’une fois sur double clic et garde la protection pendant la sauvegarde', async () => {
    const a = atelier();
    await a.suivi.suivre(a.inscription);
    const ecriture = differer<void>();
    a.redemarrer.mockImplementationOnce(async (activer) => { await ecriture.promesse; await activer(); a.recharger(); });
    const premiere = a.suivi.appliquer();
    await a.suivi.appliquer();
    await vi.waitFor(() => expect(a.redemarrer).toHaveBeenCalledTimes(1));
    expect(a.suivi.lire().phase).toBe('application');
    expect(a.recharger).not.toHaveBeenCalled();
    ecriture.resoudre();
    await premiere;
    expect(a.recharger).toHaveBeenCalledTimes(1);
    expect(a.suivi.lire().phase).toBe('application');
    a.suivi.arreter();
  });

  it('refuse plusieurs fenêtres et les écritures non confirmées sans changer de contrôleur', async () => {
    const a = atelier();
    await a.suivi.suivre(a.inscription);
    a.plusieursFenetres();
    await a.suivi.appliquer();
    expect(a.suivi.lire().message).toMatch(/autres onglets/u);
    expect(a.redemarrer).not.toHaveBeenCalled();
    const b = atelier();
    await b.suivi.suivre(b.inscription);
    b.redemarrer.mockRejectedValueOnce(new Error('activité non confirmée'));
    await b.suivi.appliquer();
    expect(b.suivi.lire()).toMatchObject({ phase: 'erreur', versionPrete: 'v2' });
    expect(b.conteneur.controller).toBe(b.ancien);
    expect(b.recharger).not.toHaveBeenCalled();
    a.suivi.arreter(); b.suivi.arreter();
  });

  it('une recherche qui échoue pendant l’application ne retire pas sa protection', async () => {
    const a = atelier();
    await a.suivi.suivre(a.inscription);
    const recherche = differer<void>();
    const sauvegarder = differer<void>();
    a.update.mockReturnValueOnce(recherche.promesse);
    a.redemarrer.mockImplementationOnce(async () => sauvegarder.promesse);
    const verification = a.suivi.verifier();
    const application = a.suivi.appliquer();
    recherche.rejeter(new Error('réseau coupé'));
    await verification;
    expect(a.suivi.lire().phase).toBe('application');
    sauvegarder.resoudre();
    await application;
    a.suivi.arreter();
  });

  it('garde la partie protégée si une activation acceptée prend plus de quinze secondes', async () => {
    vi.useFakeTimers();
    const a = atelier();
    await a.suivi.suivre(a.inscription);
    a.dialoguer.mockImplementation(async () => ({ ok: true, version: 'v2', fenetres: 1 }));
    const application = a.suivi.appliquer();
    await vi.advanceTimersByTimeAsync(31_000);
    expect(a.suivi.lire().phase).toBe('application');
    expect(a.recharger).not.toHaveBeenCalled();
    Object.defineProperty(a.conteneur, 'controller', { value: a.nouveau });
    a.conteneur.dispatchEvent(new Event('controllerchange'));
    await application;
    expect(a.recharger).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    a.suivi.arreter();
  });

  it('refuse une version remplacée pendant la sauvegarde sans attendre un contrôleur impossible', async () => {
    const a = atelier();
    await a.suivi.suivre(a.inscription);
    a.redemarrer.mockImplementationOnce(async (activer) => {
      Object.defineProperty(a.nouveau, 'state', { value: 'redundant' });
      Object.defineProperty(a.inscription, 'waiting', { value: null });
      await activer();
      a.recharger();
    });
    await a.suivi.appliquer();
    expect(a.suivi.lire().phase).toBe('erreur');
    expect(a.recharger).not.toHaveBeenCalled();
    expect(a.conteneur.controller).toBe(a.ancien);
    a.suivi.arreter();
  });

  it('sort proprement si le worker disparaît avant acceptation avec l’ancien toujours actif', async () => {
    const a = atelier();
    await a.suivi.suivre(a.inscription);
    a.dialoguer.mockImplementation(async (_worker, message) => {
      if ((message as { type: string }).type === 'pierre:activer') {
        Object.defineProperty(a.nouveau, 'state', { value: 'redundant' });
        a.nouveau.dispatchEvent(new Event('statechange'));
        throw new Error('worker remplacé');
      }
      return { ok: true, version: 'v2', fenetres: 1 };
    });
    await a.suivi.appliquer();
    expect(a.suivi.lire().phase).toBe('erreur');
    expect(a.recharger).not.toHaveBeenCalled();
    a.suivi.arreter();
  });
});

describe('ordre de protection de la progression avant rechargement', () => {
  it('attend la sauvegarde, puis l’activation et la fermeture SQLite avant le reload', async () => {
    const ordre: string[] = [];
    const ecriture = differer<void>();
    sauvegarde.vider.mockImplementationOnce(async () => { await ecriture.promesse; ordre.push('sauvegarde'); });
    sauvegarde.fermer.mockImplementationOnce(async () => { ordre.push('fermeture'); });
    vi.stubGlobal('window', { location: { reload: () => ordre.push('reload') } });
    const operation = redemarrerApresSauvegarde(async () => { ordre.push('activation'); });
    await vi.waitFor(() => expect(sauvegarde.vider).toHaveBeenCalled());
    expect(ordre).toEqual([]);
    ecriture.resoudre();
    await operation;
    expect(ordre).toEqual(['sauvegarde', 'activation', 'fermeture', 'reload']);
    expect(sauvegarde.proteger).toHaveBeenCalledTimes(1);
  });

  it('conserve la base ouverte et la version actuelle si la sauvegarde échoue', async () => {
    const activer = vi.fn(async () => undefined);
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    sauvegarde.vider.mockRejectedValueOnce(new Error('écriture refusée'));
    await expect(redemarrerApresSauvegarde(activer)).rejects.toThrow('écriture refusée');
    expect(activer).not.toHaveBeenCalled();
    expect(sauvegarde.fermer).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
