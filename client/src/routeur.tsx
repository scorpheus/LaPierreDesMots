// Routeur — contrat technique v1 § 1.4, « 4 écrans, TanStack Router ».
//
// UN SEUL ÉCRIVAIN DE L'ÉCRAN COURANT : `EtatMagasin.ecran`. Le routeur en est le MIROIR.
// C'est la seule disposition qui garantit que `window.__test.etat().ecran` (§ 7.1) et
// l'attribut `data-ecran` (§ 10) disent toujours la même chose que ce qui est affiché — deux
// sources de navigation en produiraient trois versions différentes.
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
  createRouter
} from '@tanstack/react-router';
import type { CodeEcran } from '@pierre/partage';
import { EcranCarte } from './ecrans/EcranCarte.js';
import { EcranNoeud } from './ecrans/EcranNoeud.js';
import { EcranProfils } from './ecrans/EcranProfils.js';
import { EcranRecompense } from './ecrans/EcranRecompense.js';
import { useEtatJeu, useMagasin } from './etat/services.js';

/** Les 5 codes d'écran de § 7.1 vers les 4 routes. `chargement` partage la racine. */
const CHEMIN_PAR_ECRAN: Readonly<Record<CodeEcran, string>> = {
  chargement: '/',
  profils: '/',
  carte: '/carte',
  noeud: '/noeud',
  recompense: '/recompense'
};

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

// Type de retour volontairement inféré : `createRouter` est générique sur l'arbre de routes,
// et l'écrire à la main reviendrait à recopier cet arbre.
function construireRouteur() {
  const routeRacine = createRootRoute({ component: () => <Outlet /> });

  const arbre = routeRacine.addChildren([
    createRoute({ getParentRoute: () => routeRacine, path: '/', component: RacineOuProfils }),
    createRoute({ getParentRoute: () => routeRacine, path: '/carte', component: EcranCarte }),
    createRoute({ getParentRoute: () => routeRacine, path: '/noeud', component: EcranNoeud }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: '/recompense',
      component: EcranRecompense
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
