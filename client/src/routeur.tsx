// Les écrans de jeu synchronisent le magasin et l’historique du navigateur.
// Les pages complémentaires conservent leur URL ; les pages parent passent par la porte à code.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react';
import {
  Outlet,
  RouterProvider,
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useRouterState
} from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { CodeEcran, Profil } from '@pierre/partage';
import type { EntreeGalerie, OptionsLancement, RapportReinitialisation } from '@pierre/partage/parent';
import { jetonParentPose, lirePaquetNoeud, lireProfil, listerProfils, marquerOuvertureVue } from './api/client.js';
import { EcranCampement } from './ecrans/EcranCampement.js';
import { EcranChaudron } from './ecrans/EcranChaudron.js';
import { EcranCarte } from './ecrans/EcranCarte.js';
import { EcranCodeParent } from './ecrans/EcranCodeParent.js';
import { EcranCoffre } from './ecrans/EcranCoffre.js';
import { EcranDashboard } from './ecrans/EcranDashboard.js';
import { EcranDebugRecompenses } from './ecrans/EcranDebugRecompenses.js';
import { EcranGalerieParent } from './ecrans/EcranGalerieParent.js';
import { EcranNoeud } from './ecrans/EcranNoeud.js';
import { EcranOuverture } from './ecrans/EcranOuverture.js';
import { EcranProfils } from './ecrans/EcranProfils.js';
import { EcranRecompense } from './ecrans/EcranRecompense.js';
import { EcranReglagesLecture } from './ecrans/EcranReglagesLecture.js';
import { useEtatJeu, useMagasin } from './etat/services.js';
import { memoriserProfil } from './etat/profil-memorise.js';
import { VisiteDesEcrans } from './parent/VisiteDesEcrans.js';

/** Les écrans pilotés par le magasin. `chargement` partage la racine avec les profils. */
const CHEMIN_PAR_ECRAN: Readonly<Record<CodeEcran, string>> = {
  chargement: '/',
  profils: '/',
  campement: '/campement',
  carte: '/carte',
  noeud: '/noeud',
  recompense: '/recompense'
};

/** Base publique du routeur : `/` en LAN, `/LaPierreDesMots/` sur GitHub Pages. */
const BASE_ROUTEUR = import.meta.env.BASE_URL.replace(/\/$/u, '');

function cheminPublic(cheminInterne: string): string {
  if (BASE_ROUTEUR === '') return cheminInterne;
  return cheminInterne === '/' ? `${BASE_ROUTEUR}/` : `${BASE_ROUTEUR}${cheminInterne}`;
}

function cheminInterne(cheminPublicActuel: string): string {
  if (BASE_ROUTEUR === '') return cheminPublicActuel;
  if (cheminPublicActuel === BASE_ROUTEUR || cheminPublicActuel === `${BASE_ROUTEUR}/`) return '/';
  return cheminPublicActuel.startsWith(`${BASE_ROUTEUR}/`)
    ? cheminPublicActuel.slice(BASE_ROUTEUR.length)
    : cheminPublicActuel;
}

function estRouteConnue(chemin: string): boolean {
  return (
    Object.values(CHEMIN_PAR_ECRAN).includes(chemin) ||
    Object.values(CHEMINS).includes(chemin as (typeof CHEMINS)[keyof typeof CHEMINS])
  );
}

function estHoteLocal(): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

/**
 * Les chemins que le magasin ne connaît pas. Déclarés ici, une seule fois, plutôt qu'écrits en
 * littéral dans chaque `navigate` : c'est la table des routes que le contrat demande.
 */
export const CHEMINS = {
  debugRecompenses: '/debug/recompenses',
  campement: '/campement',
  chaudron: '/chaudron',
  coffre: '/coffre',
  reglagesLecture: '/reglages-lecture',
  parent: '/parent',
  parentDashboard: '/parent/dashboard',
  parentGalerie: '/parent/galerie',
  parentVisite: '/parent/visite',
  parentVisiteApercuProfil: '/parent/visite/quel-joueur',
  ouverture: '/ouverture'
} as const;

/** Écran d'attente. L'enfant ne voit jamais une page vide. */
function EcranChargement(): ReactElement {
  return (
    <main data-ecran="chargement" style={{ padding: '2rem' }}>
      <h1 className="titre" style={{ fontSize: '2rem' }}>
        La Pierre s’allume…
      </h1>
    </main>
  );
}

/** Racine : le choix de profil, précédé de l'attente tant que rien n'est chargé. */
function RacineOuProfils(): ReactElement {
  const ecran = useEtatJeu((etat) => etat.ecran);
  const naviguer = useNavigate();
  if (ecran === 'chargement') return <EcranChargement />;
  return (
    <EcranProfils
      // La porte de la zone parent. L'écran ne connaît aucun chemin ; il reçoit un rappel,
      // exactement comme les cinq autres hôtes de ce fichier.
      surAccesParent={() => {
        void naviguer({ to: CHEMINS.parent });
      }}
    />
  );
}

// ─────────────────────────────────────────────── les hôtes qui câblent la navigation
//
// Les écrans ne connaissent AUCUN chemin : ils reçoivent des rappels. C'est ce qui les garde
// montables isolément dans `tests/composants/`, sans routeur au-dessus.

function HoteCarte(): ReactElement {
  const naviguer = useNavigate();
  return (
    <EcranCarte
      surAllerCampement={() => {
        void naviguer({ to: CHEMINS.campement });
      }}
      surVoirOuverture={() => {
        void naviguer({ to: CHEMINS.ouverture });
      }}
    />
  );
}

/** Le récit est optionnel, mémorise sa lecture et rend la main au campement. */
function HoteOuverture(): ReactElement {
  const naviguer = useNavigate();
  const profil = useEtatJeu((etat) => etat.profil);

  return (
    <EcranOuverture
      surFin={(passee) => {
        if (profil !== null) {
          void marquerOuvertureVue(String(profil.id), passee);
        }
        // La fin du récit rejoint le campement ; sa réécoute reste proposée depuis ce lieu.
        void naviguer({ to: CHEMINS.campement });
      }}
    />
  );
}

/** Le campement câble ses destinations réelles, dont la réécoute du récit. */
function HoteCampement(): ReactElement {
  const naviguer = useNavigate();
  return (
    <EcranCampement
      surAllerCarte={() => {
        void naviguer({ to: CHEMIN_PAR_ECRAN.carte });
      }}
      surAllerCoffre={() => {
        void naviguer({ to: CHEMINS.coffre });
      }}
      surOuvrirChaudron={() => {
        // Le chaudron est une activité libre du campement. Il ne passe pas par `demarrerNoeud`.
        void naviguer({ to: CHEMINS.chaudron });
      }}
      surRejouerOuverture={() => {
        void naviguer({ to: CHEMINS.ouverture });
      }}
      surAccesParent={() => {
        void naviguer({ to: CHEMINS.parent });
      }}
    />
  );
}

/** Aucun hôte ne lit un profil partiel pendant la restauration de la session. */
function RacineRouteur(): ReactElement {
  const chemin = useRouterState({ select: (etat) => cheminInterne(etat.location.pathname) });
  const bancLocal = estHoteLocal() && chemin === CHEMINS.debugRecompenses;
  const indisponible = useEtatJeu((etat) => (!bancLocal && etat.ecran === 'chargement')
    || (chemin === '/noeud' && (etat.profil === null || etat.paquet === null || etat.moteur === null))
    || (chemin === '/recompense' && (etat.profil === null || etat.paquet === null || etat.resume === null)));
  if (indisponible) return <EcranChargement />;
  return <><BandeauRetourVisite /><Outlet /></>;
}

/** Un lien profond conserve sa destination, mais ne constitue jamais une ouverture parent. */
function RouteParent({ children }: { readonly children: ReactNode }): ReactElement {
  const [autorisee, fixerAutorisee] = useState(jetonParentPose);
  const naviguer = useNavigate();
  if (!autorisee || !jetonParentPose()) {
    return <EcranCodeParent
      surOuverture={() => { fixerAutorisee(jetonParentPose()); }}
      surAbandon={() => { void naviguer({ to: CHEMIN_PAR_ECRAN.profils }); }}
    />;
  }
  return <>{children}</>;
}

function HoteChaudron(): ReactElement {
  const naviguer = useNavigate();
  return <EcranChaudron surRetour={() => { void naviguer({ to: CHEMINS.campement }); }} />;
}

function HoteRecompense(): ReactElement {
  const naviguer = useNavigate();
  return (
    <EcranRecompense
      surFinSortie={() => {
        void naviguer({ to: CHEMINS.campement });
      }}
    />
  );
}

function HoteCoffre(): ReactElement {
  const naviguer = useNavigate();
  return (
    <EcranCoffre
      surRetour={() => {
        void naviguer({ to: CHEMINS.campement });
      }}
    />
  );
}

function HoteReglagesLecture(): ReactElement {
  const naviguer = useNavigate();
  return (
    <EcranReglagesLecture
      surFermeture={() => {
        void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
      }}
    />
  );
}

function HoteCodeParent(): ReactElement {
  const naviguer = useNavigate();
  return (
    <EcranCodeParent
      surOuverture={() => {
        void naviguer({ to: CHEMINS.parentDashboard });
      }}
      surAbandon={() => {
        void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
      }}
    />
  );
}

/** Le parent choisit un profil local à sa zone, sans démarrer une partie enfant. */
function ChoixProfilParent({
  surChoix,
  surRetour
}: {
  readonly surChoix: (profil: Profil) => void;
  readonly surRetour: () => void;
}): ReactElement {
  const profils = useQuery({ queryKey: ['profils'], queryFn: listerProfils, staleTime: 0 });
  const liste = profils.data ?? [];

  return (
    <main
      data-ecran="choix-profil-parent"
      data-parent="choix-profil"
      style={{
        padding: '2rem',
        display: 'grid',
        gap: '1.5rem',
        justifyItems: 'center',
        maxInlineSize: '40rem',
        marginInline: 'auto'
      }}
    >
      <h1 className="titre" style={{ fontSize: '2rem', margin: 0 }}>
        Quel joueur veux-tu suivre&nbsp;?
      </h1>

      {profils.isPending ? <p style={{ margin: 0 }}>On cherche les joueurs…</p> : null}
      {profils.isError ? (
        <p style={{ margin: 0, textAlign: 'center' }}>
          Les joueurs n’arrivent pas. Vérifie que la Pierre tourne, puis réessaie.
        </p>
      ) : null}
      {!profils.isPending && !profils.isError && liste.length === 0 ? (
        <p style={{ margin: 0, textAlign: 'center' }}>
          Aucun joueur n’existe encore. Crée-en un depuis l’écran d’accueil.
        </p>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
        {liste.map((profil) => (
          <button
            key={String(profil.id)}
            type="button"
            className="cible"
            data-suivre-profil={String(profil.id)}
            onClick={() => surChoix(profil)}
            style={{ fontSize: '1.25rem', paddingInline: '1.5rem' }}
          >
            Voir le suivi de {String(profil.prenom)}
          </button>
        ))}
      </div>

      {/* La sortie existe TOUJOURS — chargement, erreur, liste vide comprises : c'est la
          seule façon qu'aucune de ces trois branches ne devienne une impasse à son tour. */}
      <button type="button" className="cible cible-secondaire" onClick={surRetour}>
        Retour au jeu
      </button>
    </main>
  );
}

/** Le contexte partage profil et visite entre les hôtes, puis se réinitialise au remontage. */
interface ContexteZoneParent {
  readonly profilSuivi: Profil | null;
  readonly fixerProfilSuivi: Dispatch<SetStateAction<Profil | null>>;
  readonly visiteEnCours: boolean;
  readonly demarrerVisite: () => void;
  readonly terminerVisite: () => void;
}

const ContexteZoneParentReact = createContext<ContexteZoneParent | null>(null);

function useZoneParent(): ContexteZoneParent {
  const contexte = useContext(ContexteZoneParentReact);
  if (contexte === null) {
    throw new Error('`FournisseurZoneParent` manquant au-dessus de ce composant.');
  }
  return contexte;
}

function FournisseurZoneParent({ children }: { readonly children: ReactNode }): ReactElement {
  const [profilSuivi, fixerProfilSuivi] = useState<Profil | null>(null);
  const [visiteEnCours, fixerVisiteEnCours] = useState(false);

  const valeur = useMemo<ContexteZoneParent>(
    () => ({
      profilSuivi,
      fixerProfilSuivi,
      visiteEnCours,
      demarrerVisite: () => {
        fixerVisiteEnCours(true);
      },
      terminerVisite: () => {
        fixerVisiteEnCours(false);
      }
    }),
    [profilSuivi, visiteEnCours]
  );

  return (
    <ContexteZoneParentReact.Provider value={valeur}>{children}</ContexteZoneParentReact.Provider>
  );
}

function HoteDashboard(): ReactElement {
  const naviguer = useNavigate();
  const magasin = useMagasin();
  const profilDeSession = useEtatJeu((etat) => etat.profil);
  // Le profil suivi par le PARENT. Distinct de celui du jeu, et volontairement : la zone
  // parent « n'emprunte ni le magasin de session, ni les écrans de jeu » (`EcranDashboard`).
  // PARTAGÉ entre les hôtes via `FournisseurZoneParent` — voir l'en-tête ci-dessus.
  const { profilSuivi, fixerProfilSuivi } = useZoneParent();
  const profil = profilDeSession ?? profilSuivi;
  const [relecture, fixerRelecture] = useState<{
    id: Profil['id']; session: boolean; erreur: string | null;
  } | null>(null);
  const monte = useRef(true);
  useEffect(() => { monte.current = true; return () => { monte.current = false; }; }, []);

  const relireApresEffacement = async (id: Profil['id'], session: boolean): Promise<void> => {
    fixerRelecture({ id, session, erreur: null });
    try {
      const frais = await lireProfil(id);
      if (frais.id !== id || frais.generationProgression === undefined) {
        throw new Error('Le profil rechargé ne confirme pas la nouvelle progression.');
      }
      if (!monte.current) return;
      fixerProfilSuivi((suivi) => suivi === null || suivi.id === id ? frais : suivi);
      if (session && magasin.getState().profil === null) magasin.setState({ profil: frais });
      fixerRelecture(null);
    } catch {
      if (monte.current) fixerRelecture({ id, session,
        erreur: 'La remise à zéro est faite. Le profil doit être rechargé avant de rejouer.' });
    }
  };

  const apresReinitialisation = (rapport: RapportReinitialisation): Promise<void> => {
    const id = rapport.profil as Profil['id'];
    const session = magasin.getState().profil?.id === id;
    fixerProfilSuivi((suivi) => suivi?.id === id ? null : suivi);
    if (session) {
      // Le résumé reste celui de l'ancienne partie : on l'abandonne, on ne le régénère pas.
      // On conserve l'écran parent ; aucun changement d'URL intermédiaire vers les profils.
      magasin.setState({ profil: null, sortie: null, paquet: null, moteur: null, codeMoteur: null,
        etatMoteur: null, progression: null, aide: null, resume: null, etoiles: null,
        demarreLe: null, termineLe: null, tentativeEnvoyee: false, erreurConservation: null,
        cascade: magasin.getInitialState().cascade, dernierGain: null, serie: 0 });
    }
    return relireApresEffacement(id, session);
  };

  const rendreLaMainAuJeu = (): void => {
    void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
  };

  /** Le lancement parent installe le profil de session et préserve ses options non journalisées. */
  const lancerUnExercice = (entree: EntreeGalerie, options: OptionsLancement): void => {
    if (entree.noeud == null) {
      return;
    }
    if (profilDeSession === null && profilSuivi !== null) {
      magasin.getState().choisirProfil(profilSuivi);
    }
    const profilDuDepart = magasin.getState().profil;
    if (profilDuDepart === null) return;
    void lirePaquetNoeud(entree.noeud).then((paquet) => {
      if (magasin.getState().profil !== profilDuDepart) return;
      magasin.getState().demarrerNoeud(paquet, options);
    });
  };

  if (relecture !== null) {
    return <main className="dashboard-parent" data-ecran="dashboard">
      <p role="status">{relecture.erreur ?? 'La remise à zéro est faite. On recharge le profil…'}</p>
      {relecture.erreur === null ? null : <button type="button" className="cible"
        onClick={() => { void relireApresEffacement(relecture.id, relecture.session); }}>
        Recharger le profil
      </button>}
      <button type="button" className="cible cible-secondaire" onClick={rendreLaMainAuJeu}>
        Retour au choix du joueur
      </button>
    </main>;
  }

  if (profil === null) {
    return <ChoixProfilParent surChoix={fixerProfilSuivi} surRetour={rendreLaMainAuJeu} />;
  }

  return (
    <>
    <EcranDashboard
      profil={profil.id}
      prenom={profil.prenom}
      surSortie={rendreLaMainAuJeu}
      surGaleriePleinEcran={() => {
        void naviguer({ to: CHEMINS.parentGalerie });
      }}
      surAllerVisite={() => {
        void naviguer({ to: CHEMINS.parentVisite });
      }}
      surLancerExercice={lancerUnExercice}
      surProfilReinitialise={apresReinitialisation}
      surProfilSupprime={() => {
        fixerProfilSuivi(null);
        if (profilDeSession !== null) {
          magasin.getState().quitterProfil();
        }
        void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
      }}
    />
    {estHoteLocal() && <p style={{ padding: '1rem', textAlign: 'center' }}>
      <button type="button" className="cible" onClick={() => {
        void naviguer({ to: CHEMINS.debugRecompenses });
      }}>Tester les récompenses sans enregistrer</button>
    </p>}
    </>
  );
}

/**
 * La galerie parent en plein écran — D34, route du contrat de finition v3 § 6.2.
 *
 * Le dashboard porte déjà la galerie en ONGLET (choix de N5, pour qu'elle soit atteignable
 * sans dépendre d'une route). Les deux coexistent et servent deux usages distincts : l'onglet
 * pour jeter un œil sans quitter le suivi, le plein écran pour parcourir un catalogue qui
 * grandit. Ils rendent le MÊME `GalerieExercices` avec le MÊME catalogue — il n'y a pas deux
 * chemins de données, il y a deux portes sur le même, et `EcranGalerieParent` le dit dans son
 * propre en-tête.
 *
 * Le profil suivi est celui de la session. Sans profil, on ne bloque pas : on rend la main au
 * choix du joueur, qui est un écran avec sortie — jamais un écran vide.
 */
function HoteGalerieParent(): ReactElement {
  const naviguer = useNavigate();
  const profilDeSession = useEtatJeu((etat) => etat.profil);
  // PARTAGÉ avec `HoteDashboard` et `HoteVisiteDesEcrans` — voir `FournisseurZoneParent`.
  const { profilSuivi, fixerProfilSuivi } = useZoneParent();
  const profil = profilDeSession ?? profilSuivi;

  const retourAuSuivi = (): void => {
    void naviguer({ to: CHEMINS.parentDashboard });
  };

  if (profil === null) {
    return (
      <ChoixProfilParent
        surChoix={fixerProfilSuivi}
        surRetour={() => {
          void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
        }}
      />
    );
  }

  return <EcranGalerieParent profil={profil.id} surRetour={retourAuSuivi} />;
}

/** La visite garde son profil local et délègue les chemins à cet hôte. */
function HoteVisiteDesEcrans(): ReactElement {
  const naviguer = useNavigate();
  const magasin = useMagasin();
  const profilDeSession = useEtatJeu((etat) => etat.profil);
  // PARTAGÉ avec `HoteDashboard` et `HoteGalerieParent` — voir `FournisseurZoneParent`.
  const { profilSuivi, fixerProfilSuivi, demarrerVisite, terminerVisite } = useZoneParent();
  const profil = profilDeSession ?? profilSuivi;

  // Le bandeau reste actif tant que cette visite garde la main.
  useEffect(() => {
    if (profil !== null) {
      demarrerVisite();
    }
  }, [profil, demarrerVisite]);

  if (profil === null) {
    return (
      <ChoixProfilParent
        surChoix={fixerProfilSuivi}
        surRetour={() => {
          void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
        }}
      />
    );
  }

  return (
    <VisiteDesEcrans
      profil={profil}
      // La visite ne doit pas effacer le profil de session ni celui mémorisé.
      surAllerProfils={() => {
        void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
      }}
      // Poser le profil puis naviguer une seule fois : choisirProfil ouvre le campement.
      surAllerCarte={() => {
        magasin.setState({ profil });
        memoriserProfil(String(profil.id));
        void naviguer({ to: CHEMIN_PAR_ECRAN.carte });
      }}
      surAllerOuverture={() => {
        magasin.setState({ profil });
        void naviguer({ to: CHEMINS.ouverture });
      }}
      surAllerCampement={() => {
        magasin.setState({ profil });
        void naviguer({ to: CHEMINS.campement });
      }}
      surAllerCoffre={() => {
        magasin.setState({ profil });
        void naviguer({ to: CHEMINS.coffre });
      }}
      // Les réglages lisent le profil de session.
      surAllerReglagesLecture={() => {
        magasin.setState({ profil });
        void naviguer({ to: CHEMINS.reglagesLecture });
      }}
      surAllerCodeParent={() => {
        void naviguer({ to: CHEMINS.parent });
      }}
      surAllerChoixProfilParent={() => {
        void naviguer({ to: CHEMINS.parentVisiteApercuProfil });
      }}
      surAllerDashboard={() => {
        void naviguer({ to: CHEMINS.parentDashboard });
      }}
      surAllerGalerieParent={() => {
        void naviguer({ to: CHEMINS.parentGalerie });
      }}
      // Les options de la visite empêchent toute écriture dans le journal enfant.
      surLancerExercice={(entree, options) => {
        if (entree.noeud == null) {
          return;
        }
        if (profilDeSession === null) {
          magasin.getState().choisirProfil(profil);
        }
        void lirePaquetNoeud(entree.noeud).then((paquet) => {
          magasin.getState().demarrerNoeud(paquet, options);
        });
      }}
      surFermerLaVisite={() => {
        terminerVisite();
        void naviguer({ to: CHEMINS.parentDashboard });
      }}
    />
  );
}

/**
 * La prévisualisation de « choix du joueur à suivre » depuis la visite — sa route dédiée. Voir
 * l'en-tête de `CHEMINS.parentVisiteApercuProfil` pour le pourquoi de cette forme.
 *
 * Les deux sorties ramènent au MÊME endroit, la visite elle-même — `surChoix` comme `surRetour`,
 * volontairement : choisir un joueur ici ne fait qu'informer `profilSuivi` (partagé), il n'y a
 * rien de plus à faire que revenir. `ChoixProfilParent` ne connaît toujours aucun chemin ; c'est
 * cet hôte, comme tous les autres de ce fichier, qui les lui fournit.
 */
function HoteApercuChoixProfilVisite(): ReactElement {
  const naviguer = useNavigate();
  const { fixerProfilSuivi } = useZoneParent();
  const retour = (): void => {
    void naviguer({ to: CHEMINS.parentVisite });
  };
  return (
    <ChoixProfilParent
      surChoix={(profil) => {
        fixerProfilSuivi(profil);
        retour();
      }}
      surRetour={retour}
    />
  );
}

/** Le bandeau de visite disparaît dès qu’une partie enfant journalisée commence. */
function BandeauRetourVisite(): ReactElement | null {
  const { visiteEnCours, terminerVisite } = useZoneParent();
  const chemin = useRouterState({ select: (etat) => cheminInterne(etat.location.pathname) });
  const journalise = useEtatJeu((etat) => etat.journalise);
  const ecran = useEtatJeu((etat) => etat.ecran);
  const naviguer = useNavigate();

  useEffect(() => {
    if (visiteEnCours && ecran === 'noeud' && journalise) {
      terminerVisite();
    }
  }, [visiteEnCours, ecran, journalise, terminerVisite]);

  if (!visiteEnCours || chemin === CHEMINS.parentVisite) {
    return null;
  }

  return (
    <div
      data-bandeau-visite="oui"
      style={{
        position: 'fixed',
        insetBlockEnd: '1rem',
        insetInlineStart: '1rem',
        zIndex: 9999
      }}
    >
      <button
        type="button"
        className="cible cible-appel"
        data-retour-visite
        onClick={() => {
          void naviguer({ to: CHEMINS.parentVisite });
        }}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
      >
        ← Retour à la visite
      </button>
    </div>
  );
}

// Type de retour volontairement inféré : `createRouter` est générique sur l'arbre de routes,
// et l'écrire à la main reviendrait à recopier cet arbre.
function construireRouteur() {
  // Le bandeau de visite entoure toutes les routes.
  const routeRacine = createRootRoute({ component: RacineRouteur });

  const arbre = routeRacine.addChildren([
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.debugRecompenses,
      component: () => estHoteLocal()
        ? <EcranDebugRecompenses exercicesInitiaux={Number(new URLSearchParams(window.location.search).get('exercices') ?? '23')} />
        : <RacineOuProfils />
    }),
    createRoute({ getParentRoute: () => routeRacine, path: '/', component: RacineOuProfils }),
    createRoute({ getParentRoute: () => routeRacine, path: '/carte', component: HoteCarte }),
    createRoute({ getParentRoute: () => routeRacine, path: '/noeud', component: EcranNoeud }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: '/recompense',
      component: HoteRecompense
    }),
    // ── les cinq routes de la campagne v2 ───────────────────────────────────────────────
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.campement,
      component: HoteCampement
    }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.chaudron,
      component: HoteChaudron
    }),
    // ── la route de la campagne de finition v3 ─────────────────────────────────────────
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.ouverture,
      component: HoteOuverture
    }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.coffre,
      component: HoteCoffre
    }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.reglagesLecture,
      component: HoteReglagesLecture
    }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.parent,
      component: HoteCodeParent
    }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.parentDashboard,
      component: () => <RouteParent><HoteDashboard /></RouteParent>
    }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.parentGalerie,
      component: () => <RouteParent><HoteGalerieParent /></RouteParent>
    }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.parentVisite,
      component: () => <RouteParent><HoteVisiteDesEcrans /></RouteParent>
    }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.parentVisiteApercuProfil,
      component: () => <RouteParent><HoteApercuChoixProfilVisite /></RouteParent>
    })
  ]);

  return createRouter({
    routeTree: arbre,
    // TanStack retire cette base a l'entree et la remet a chaque navigation. Les routes du jeu
    // restent donc `/carte`, `/parent/dashboard`, etc. dans tout le code applicatif.
    basepath: import.meta.env.BASE_URL,
    // Le bouton retour et les URL profondes utilisent le même historique.
    history: createBrowserHistory(),
    defaultPreload: false
  });
}

export function Routeur(): ReactElement {
  const magasin = useMagasin();
  const [routeur] = useState(construireRouteur);

  useEffect(() => {
    // Une navigation d'URL met à jour le magasin sans provoquer une seconde navigation.
    let synchronisation = false;
    const cheminsDuMagasin = new Map<string, CodeEcran>(
      (Object.entries(CHEMIN_PAR_ECRAN) as readonly (readonly [CodeEcran, string])[]).map(
        ([ecran, chemin]) => [chemin, ecran]
      )
    );
    const cheminActuel = (): string => cheminInterne(routeur.history.location.pathname);
    const estBancLocal = (): boolean => estHoteLocal() && cheminActuel() === CHEMINS.debugRecompenses;
    const fixerEcran = (ecran: CodeEcran): void => {
      if (magasin.getState().ecran === ecran) return;
      synchronisation = true;
      try { magasin.getState().naviguer(ecran); }
      finally { synchronisation = false; }
    };
    const aller = (ecran: CodeEcran, remplacer = false): void => {
      if (estBancLocal()) return;
      const cible = cheminPublic(CHEMIN_PAR_ECRAN[ecran]);
      if (routeur.history.location.pathname !== cible) {
        if (remplacer) routeur.history.replace(cible);
        else routeur.history.push(cible);
      }
    };
    const lireHistorique = (restauration = false): void => {
      const etat = magasin.getState();
      if (etat.ecran === 'chargement' || estBancLocal()) return;
      const chemin = cheminActuel();
      const parent = chemin === CHEMINS.parent || chemin.startsWith(`${CHEMINS.parent}/`);
      const connue = estRouteConnue(chemin) && chemin !== CHEMINS.debugRecompenses;
      const manqueExercice = (chemin === '/noeud' && (etat.paquet === null || etat.moteur === null))
        || (chemin === '/recompense' && (etat.paquet === null || etat.resume === null));
      if (!connue || manqueExercice || (etat.profil === null && !parent && chemin !== '/')) {
        const repli = etat.profil === null ? 'profils' : 'campement';
        fixerEcran(repli);
        aller(repli, true);
        return;
      }
      // À la racine, restaurer le joueur ouvre son campement. Les URL stables restent exactes,
      // y compris recherche et fragment. Les pages parent gardent leur porte à code.
      if (restauration && chemin === '/' && etat.profil !== null) {
        aller(etat.ecran, true);
        return;
      }
      const ecran = cheminsDuMagasin.get(chemin);
      if (ecran !== undefined) fixerEcran(ecran);
    };

    const arreterMagasin = magasin.subscribe((etat, precedent) => {
      if (synchronisation || etat.ecran === precedent.ecran) return;
      if (precedent.ecran === 'chargement') lireHistorique(true);
      else aller(etat.ecran);
    });
    const arreterHistorique = routeur.history.subscribe(() => { lireHistorique(); });
    // L'hydratation peut avoir fini avant cet effet ; la même réconciliation traite les deux ordres.
    lireHistorique(true);
    return () => {
      arreterMagasin();
      arreterHistorique();
    };
  }, [magasin, routeur]);

  // `FournisseurZoneParent` ENVELOPPE le routeur, pas l'inverse : `profilSuivi` et
  // `visiteEnCours` doivent survivre à CHAQUE navigation entre les routes de la zone parent,
  // et une instance neuve à chaque montage de `Routeur` — donc de `<Application>` — est
  // exactement la portée voulue. Voir l'en-tête de `FournisseurZoneParent`.
  return (
    <FournisseurZoneParent>
      <RouterProvider router={routeur} />
    </FournisseurZoneParent>
  );
}
