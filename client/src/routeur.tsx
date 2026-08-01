// Routeur — contrat technique v1 § 1.4, étendu par le contrat des features v2 § 3.6 (L2-F).
//
// UN SEUL ÉCRIVAIN DE L'ÉCRAN COURANT : `EtatMagasin.ecran`. Le routeur en est le MIROIR.
// C'est la seule disposition qui garantit que `window.__test.etat().ecran` (§ 7.1) et
// l'attribut `data-ecran` (§ 10) disent toujours la même chose que ce qui est affiché — deux
// sources de navigation en produiraient trois versions différentes.
//
// ⚠ DÉFAUT DU CONTRAT GELÉ, signalé au rapport de L2-F et contourné ici sans le trahir.
// `CodeEcran` (`partage/src/testabilite/surface.ts`) ne porte QUE les cinq codes de la v1 —
// `chargement`, `profils`, `carte`, `noeud`, `recompense`. Or le contrat des features v2 confie
// à L2-F « la table des routes complète, y compris celles de L2-B et L2-H », c'est-à-dire cinq
// écrans de plus. Et `surface.ts` **n'est attribué à aucun lot au § 3** : personne n'a le droit
// d'y ajouter un code.
//
// Conséquence, assumée et écrite : les cinq écrans nouveaux sont des ROUTES sans code d'écran.
//   * les cinq écrans de la v1 restent pilotés par `EtatMagasin.ecran`, exactement comme avant —
//     `window.__test.etat().ecran` continue donc de dire la vérité pour tout ce qu'il connaît ;
//   * les cinq nouveaux se rejoignent par une navigation explicite (`useNavigate`), et leur
//     `data-ecran` reste l'unique prise des tests E2E.
// Rien n'est cassé, rien n'est inventé dans un fichier d'un autre lot. Le jour où `CodeEcran`
// s'élargira, il n'y aura qu'à ajouter les entrées à `CHEMIN_PAR_ECRAN`.
//
// Historique EN MÉMOIRE, volontairement : le jeu est une borne sur tablette. L'URL n'est ni
// partagée, ni mise en favori, ni rechargée à la main, et un retour navigateur au milieu d'un
// exercice n'a aucun sens pour un enfant de 7 ans. Les tests E2E ouvrent `/` et pilotent tout
// par `window.__test`.
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate
} from '@tanstack/react-router';
import type { CodeEcran } from '@pierre/partage';
import { EcranCampement } from './ecrans/EcranCampement.js';
import { EcranCarte } from './ecrans/EcranCarte.js';
import { EcranCodeParent } from './ecrans/EcranCodeParent.js';
import { EcranCoffre } from './ecrans/EcranCoffre.js';
import { EcranDashboard } from './ecrans/EcranDashboard.js';
import { EcranNoeud } from './ecrans/EcranNoeud.js';
import { EcranProfils } from './ecrans/EcranProfils.js';
import { EcranRecompense } from './ecrans/EcranRecompense.js';
import { EcranReglagesLecture } from './ecrans/EcranReglagesLecture.js';
import { useEtatJeu, useMagasin } from './etat/services.js';

/** Les 5 codes d'écran de § 7.1 vers les 4 routes. `chargement` partage la racine. */
const CHEMIN_PAR_ECRAN: Readonly<Record<CodeEcran, string>> = {
  chargement: '/',
  profils: '/',
  carte: '/carte',
  noeud: '/noeud',
  recompense: '/recompense'
};

/**
 * Les chemins que le magasin ne connaît pas. Déclarés ici, une seule fois, plutôt qu'écrits en
 * littéral dans chaque `navigate` : c'est la table des routes que le contrat demande.
 */
export const CHEMINS = {
  campement: '/campement',
  coffre: '/coffre',
  reglagesLecture: '/reglages-lecture',
  parent: '/parent',
  parentDashboard: '/parent/dashboard'
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
  return ecran === 'chargement' ? <EcranChargement /> : <EcranProfils />;
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
    />
  );
}

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

function HoteDashboard(): ReactElement {
  const naviguer = useNavigate();
  const profil = useEtatJeu((etat) => etat.profil);

  // La zone parent n'a de sens qu'avec un profil choisi ; sans lui, on rend la main au jeu
  // plutôt que d'afficher un dashboard vide.
  if (profil === null) {
    return <EcranCodeParent surOuverture={() => undefined} surAbandon={() => undefined} />;
  }

  return (
    <EcranDashboard
      profil={profil.id}
      prenom={profil.prenom}
      surSortie={() => {
        void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
      }}
    />
  );
}

// Type de retour volontairement inféré : `createRouter` est générique sur l'arbre de routes,
// et l'écrire à la main reviendrait à recopier cet arbre.
function construireRouteur() {
  const routeRacine = createRootRoute({ component: () => <Outlet /> });

  const arbre = routeRacine.addChildren([
    createRoute({ getParentRoute: () => routeRacine, path: '/', component: RacineOuProfils }),
    createRoute({ getParentRoute: () => routeRacine, path: '/carte', component: HoteCarte }),
    createRoute({ getParentRoute: () => routeRacine, path: '/noeud', component: EcranNoeud }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: '/recompense',
      component: EcranRecompense
    }),
    // ── les cinq routes de la campagne v2 ───────────────────────────────────────────────
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.campement,
      component: HoteCampement
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
      component: HoteDashboard
    })
  ]);

  return createRouter({
    routeTree: arbre,
    history: createMemoryHistory({ initialEntries: ['/'] }),
    defaultPreload: false
  });
}

export function Routeur(): ReactElement {
  const magasin = useMagasin();
  const [routeur] = useState(construireRouteur);

  useEffect(() => {
    const aller = (ecran: CodeEcran): void => {
      const cible = CHEMIN_PAR_ECRAN[ecran];
      if (routeur.history.location.pathname !== cible) {
        routeur.history.push(cible);
      }
    };

    aller(magasin.getState().ecran);

    return magasin.subscribe((etat, precedent) => {
      if (etat.ecran !== precedent.ecran) {
        aller(etat.ecran);
      }
    });
  }, [magasin, routeur]);

  return <RouterProvider router={routeur} />;
}
