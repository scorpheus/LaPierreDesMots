/** Suivi d'une version entièrement installée ; seule une demande explicite la fait activer. */
export interface EtatMiseAJour {
  readonly phase: 'indisponible' | 'repos' | 'verification' | 'telechargement' | 'prete' | 'application' | 'erreur';
  readonly versionInstallee: string | null;
  readonly versionPrete: string | null;
  readonly message: string;
  readonly reportee: boolean;
}

interface ReponseWorker {
  readonly ok: boolean;
  readonly version?: string;
  readonly message?: string;
  readonly fenetres?: number;
}

interface OptionsSuivi {
  readonly conteneur: ServiceWorkerContainer;
  /** Prépare les activités puis appelle activer, ferme SQLite et recharge la page. */
  readonly redemarrer: (activer: () => Promise<void>) => Promise<void>;
  readonly dialoguer?: (worker: ServiceWorker, message: object) => Promise<ReponseWorker>;
}

const ETAT_INITIAL: EtatMiseAJour = {
  phase: 'indisponible', versionInstallee: null, versionPrete: null, message: '', reportee: false
};

function messageDe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** Le canal est borné et fermé aussi si l'ancien worker ne connaît pas encore ce protocole. */
function dialoguerAvecWorker(worker: ServiceWorker, message: object): Promise<ReponseWorker> {
  return new Promise((resoudre, rejeter) => {
    const canal = new MessageChannel();
    const fermer = (): void => {
      clearTimeout(expiration);
      canal.port1.close();
      canal.port2.close();
    };
    const expiration = setTimeout(() => {
      fermer();
      rejeter(new Error('La version du jeu ne répond pas. Réessaie dans un instant.'));
    }, 5_000);
    canal.port1.onmessage = (evenement: MessageEvent<unknown>) => {
      fermer();
      const reponse = evenement.data as Partial<ReponseWorker> | null;
      if (reponse === null || typeof reponse !== 'object' || typeof reponse.ok !== 'boolean') {
        rejeter(new Error('La réponse de mise à jour est invalide.'));
      } else resoudre(reponse as ReponseWorker);
    };
    try { worker.postMessage(message, [canal.port2]); }
    catch (cause) { fermer(); rejeter(cause); }
  });
}

/** Les effets navigateur sont injectés pour exercer les courses et les échecs de sauvegarde. */
export function creerSuiviMiseAJour(options: OptionsSuivi) {
  const { conteneur } = options;
  const dialoguer = options.dialoguer ?? dialoguerAvecWorker;
  let etat = ETAT_INITIAL;
  let inscription: ServiceWorkerRegistration | null = null;
  let verification: Promise<void> | null = null;
  let revision = 0;
  const abonnes = new Set<() => void>();
  const suivis = new Set<ServiceWorker>();
  const nettoyages: (() => void)[] = [];

  const publier = (suivant: Partial<EtatMiseAJour>): void => {
    etat = { ...etat, ...suivant };
    for (const abonne of abonnes) abonne();
  };
  const erreur = (cause: unknown): void => {
    publier({ phase: 'erreur', message: messageDe(cause) });
  };

  const lireVersionInstallee = async (): Promise<void> => {
    // Interroger le contrôleur de CETTE page, pas un manifeste distant qui décrit un autre build.
    const controleur = conteneur.controller;
    if (controleur === null) return;
    try {
      const reponse = await dialoguer(controleur, { type: 'pierre:version' });
      if (reponse.ok && typeof reponse.version === 'string' && etat.phase !== 'application') {
        publier({ versionInstallee: reponse.version });
      }
    } catch { /* Ancienne version sans protocole : aucune version distante inventée à sa place. */ }
  };

  const actualiser = async (): Promise<void> => {
    if (inscription === null || etat.phase === 'application') return;
    const lecture = ++revision;
    const prete = inscription.waiting;
    if (prete !== null && conteneur.controller !== null) {
      try {
        const reponse = await dialoguer(prete, { type: 'pierre:version' });
        if (lecture !== revision || inscription.waiting !== prete) return;
        if (!reponse.ok || typeof reponse.version !== 'string') throw new Error('La nouvelle version ne peut pas encore être activée.');
        publier({
          phase: 'prete', versionPrete: reponse.version, message: 'Une nouvelle version est prête.',
          reportee: etat.versionPrete === reponse.version && etat.reportee
        });
      } catch (cause) { if (lecture === revision) publier({ phase: 'erreur', message: messageDe(cause) }); }
    } else if (inscription.installing !== null) {
      publier({ phase: 'telechargement', message: 'Téléchargement de la version du jeu…' });
    } else {
      publier({ phase: 'repos', versionPrete: null, message: 'Le jeu est à jour.' });
    }
  };

  const suivreWorker = (worker: ServiceWorker | null): void => {
    if (worker === null || suivis.has(worker)) return;
    suivis.add(worker);
    const changement = (): void => {
      if (etat.phase === 'application') return;
      if (worker.state === 'redundant') {
        erreur(new Error('Le téléchargement n’a pas abouti. La version actuelle reste disponible. Réessaie avec Internet.'));
      } else void actualiser();
    };
    worker.addEventListener('statechange', changement);
    nettoyages.push(() => worker.removeEventListener('statechange', changement));
  };

  async function verifier(): Promise<void> {
    if (inscription === null || etat.phase === 'application') return;
    if (verification !== null) return verification;
    const cible = inscription;
    publier({ phase: 'verification', message: 'Recherche d’une mise à jour…' });
    verification = (async () => {
      try {
        await cible.update();
        suivreWorker(cible.installing);
        await actualiser();
      } catch (cause) { if (etat.phase !== 'application') erreur(cause); }
      finally { verification = null; }
    })();
    return verification;
  }

  function activer(worker: ServiceWorker, version: string): Promise<void> {
    return new Promise((resoudre, rejeter) => {
      if (inscription?.waiting !== worker || worker.state !== 'installed') {
        rejeter(new Error('Une autre version est maintenant prête. Vérifie à nouveau les mises à jour.'));
        return;
      }
      const controleurInitial = conteneur.controller;
      let terminee = false;
      let activationPossible = false;
      let expiration: ReturnType<typeof setTimeout>;
      const nettoyer = (): void => {
        terminee = true;
        clearTimeout(expiration);
        conteneur.removeEventListener('controllerchange', changement);
        worker.removeEventListener('statechange', changement);
      };
      const changement = (): void => {
        if (conteneur.controller !== null && conteneur.controller !== controleurInitial) {
          nettoyer();
          resoudre();
        } else if (worker.state === 'redundant' && inscription?.active === controleurInitial) {
          // Un worker remplacé avant activation ne pourra plus prendre le contrôle.
          nettoyer();
          rejeter(new Error('La version disponible a changé. Vérifie à nouveau les mises à jour.'));
        }
      };
      const demander = (): void => {
        changement();
        if (terminee || worker.state === 'redundant') return;
        void dialoguer(worker, { type: 'pierre:activer', version }).then((reponse) => {
          if (terminee) return;
          if (!reponse.ok && !activationPossible) {
            nettoyer();
            rejeter(new Error(reponse.message ?? 'L’activation a été refusée.'));
          } else {
            activationPossible = true;
            changement();
          }
        }).catch(() => {
          // Une réponse perdue ne prouve pas que skipWaiting a été refusé. L'ancien jeu
          // reste protégé : on réémet la même demande autorisée, sans reprendre les gestes.
          activationPossible = true;
        });
      };
      const patienter = (): void => {
        if (terminee) return;
        publier({ message: 'La mise à jour prend un peu de temps. La partie est enregistrée.' });
        expiration = setTimeout(patienter, 15_000);
        demander();
      };
      conteneur.addEventListener('controllerchange', changement);
      worker.addEventListener('statechange', changement);
      expiration = setTimeout(patienter, 15_000);
      demander();
    });
  }

  async function appliquer(): Promise<void> {
    if (etat.phase === 'application') return;
    const worker = inscription?.waiting;
    const version = etat.versionPrete;
    if (worker == null || version === null) return;
    ++revision; // Une vérification plus ancienne ne doit pas masquer le dialogue de protection.
    publier({ phase: 'application', message: 'Enregistrement de la partie et mise à jour…' });
    try {
      // Refuser un autre onglet avant même de suspendre le jeu. Le worker revérifie au geste.
      const reponse = await dialoguer(worker, { type: 'pierre:version' });
      if (!reponse.ok || reponse.version !== version || inscription?.waiting !== worker) {
        throw new Error('La version disponible a changé. Vérifie à nouveau les mises à jour.');
      }
      if (reponse.fenetres !== 1) throw new Error('Ferme les autres onglets du jeu, puis réessaie.');
      await options.redemarrer(() => activer(worker, version));
      // Le dialogue reste bloquant jusqu'au départ effectif de la page.
    } catch (cause) {
      if (inscription?.waiting !== worker) publier({ versionPrete: null });
      erreur(cause);
    }
  }

  const controleurChange = (): void => {
    if (etat.phase === 'application') return;
    void lireVersionInstallee();
    void actualiser();
  };

  return {
    lire: (): EtatMiseAJour => etat,
    ecouter(abonne: () => void): () => void { abonnes.add(abonne); return () => { abonnes.delete(abonne); }; },
    async suivre(nouvelleInscription: ServiceWorkerRegistration): Promise<void> {
      if (inscription === nouvelleInscription) return;
      inscription = nouvelleInscription;
      publier({ phase: 'repos' });
      const trouve = (): void => { suivreWorker(nouvelleInscription.installing); void actualiser(); };
      inscription.addEventListener('updatefound', trouve);
      conteneur.addEventListener('controllerchange', controleurChange);
      nettoyages.push(() => nouvelleInscription.removeEventListener('updatefound', trouve));
      suivreWorker(inscription.installing);
      await Promise.all([lireVersionInstallee(), actualiser()]);
    },
    verifier,
    appliquer,
    reporter(): void { publier({ reportee: true }); },
    signalerErreur: erreur,
    arreter(): void {
      ++revision;
      for (const nettoyer of nettoyages) nettoyer();
      conteneur.removeEventListener('controllerchange', controleurChange);
      abonnes.clear();
    }
  };
}

/** Aucun chargement du port SQLite dans les cibles LAN/Android ni lors d'une simple recherche. */
export async function redemarrerApresSauvegarde(activer: () => Promise<void>): Promise<void> {
  const { protegerSauvegardeActivites, viderTentativesEnAttente } = await import('../api/client.js');
  const { ouvrirBaseNavigateur } = await import('../base/adaptateur-sqlite-wasm.js');
  await protegerSauvegardeActivites(async () => {
    await viderTentativesEnAttente();
    const base = await ouvrirBaseNavigateur();
    await activer();
    // Tout le code de fermeture est chargé avant le changement de cache.
    try { await base.fermer(); }
    finally { window.location.reload(); }
  });
}

const suivi = import.meta.env.MODE === 'pwa' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator
  ? creerSuiviMiseAJour({ conteneur: navigator.serviceWorker, redemarrer: redemarrerApresSauvegarde })
  : null;

export const lireEtatMiseAJour = (): EtatMiseAJour => suivi?.lire() ?? ETAT_INITIAL;
export const ecouterMiseAJour = (abonne: () => void): (() => void) => suivi?.ecouter(abonne) ?? (() => undefined);
export const verifierMiseAJour = async (): Promise<void> => { await suivi?.verifier(); };
export const appliquerMiseAJour = async (): Promise<void> => { await suivi?.appliquer(); };
export const reporterMiseAJour = (): void => { suivi?.reporter(); };
export const suivreInscriptionPwa = async (inscription: ServiceWorkerRegistration): Promise<void> => { await suivi?.suivre(inscription); };
export const signalerErreurMiseAJour = (cause: unknown): void => { suivi?.signalerErreur(cause); };
