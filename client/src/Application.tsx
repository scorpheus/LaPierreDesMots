// Racine de composition du client — contrat technique v1 § 1.4 et § 11.2.
//
// Elle assemble, et ne décide de rien : les services et le magasin lui sont DONNÉS. C'est ce
// qui permet à `tests/composants/**` de monter l'application entière avec `VoixMuette`,
// `AudioMuet`, une horloge figée et une graine connue, sans toucher au code de production.
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FournisseurJeu, chargerSeuilsCascade, useEtatJeu } from './etat/services.js';
import type { ContexteJeu } from './etat/services.js';
import type { MagasinJeu } from './etat/magasin.js';
import type { ServicesJeu } from './moteurs/types.js';
import { Particules } from './composants/Particules.js';
import { Routeur } from './routeur.js';

/**
 * Réglages de TanStack Query pour une application HORS-LIGNE servie sur le LAN.
 *
 * `networkMode: 'always'` est le point important : par défaut, TanStack Query suspend les
 * requêtes quand `navigator.onLine` est faux. Or la tablette est très souvent « hors ligne »
 * au sens du navigateur — c'est le mode de fonctionnement NORMAL du jeu — alors que le
 * serveur, lui, est joignable sur le réseau local. Sans ce réglage, l'application resterait
 * bloquée sur son écran de chargement chez l'enfant.
 */
function creerFileDAttente(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: 'always',
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000
      },
      mutations: { networkMode: 'always', retry: 0 }
    }
  });
}

export interface ProprietesApplication {
  readonly magasin: MagasinJeu;
  readonly services: ServicesJeu;
  /** Injectée par les tests ; construite ici sinon. */
  readonly fileDAttente?: QueryClient;
}

/**
 * La couche de particules, lue depuis le magasin.
 *
 * Composant séparé, et non un `useEtatJeu` dans `Application` : le contexte de jeu n'existe
 * qu'À L'INTÉRIEUR de `FournisseurJeu`, et `useEtatJeu` le lit. Le sortir remonterait
 * l'abonnement au-dessus du fournisseur, où il n'y a rien à lire.
 */
function CoucheParticules(): ReactElement | null {
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);
  return <Particules animationsDesactivees={animationsDesactivees} />;
}

export function Application({
  magasin,
  services,
  fileDAttente
}: ProprietesApplication): ReactElement {
  const [file] = useState(() => fileDAttente ?? creerFileDAttente());
  const [contexte] = useState<ContexteJeu>(() => ({ magasin, services }));

  // Sortie de l'écran de chargement : le magasin naît en `chargement` pour que rien ne
  // clignote avant que React n'ait monté. Un seul pas, et une seule fois.
  useEffect(() => {
    if (magasin.getState().ecran === 'chargement') {
      magasin.getState().naviguer('profils');
    }
  }, [magasin]);

  // Les seuils de la cascade sont **chargés au démarrage** (convention C2, D13) : ils vivent
  // en données, jamais dans le code, parce qu'ils seront recalibrés. Un magasin déjà pourvu
  // — c'est le cas des tests de composants — ne redemande rien.
  useEffect(() => {
    if (magasin.getState().seuils !== null) {
      return;
    }
    let vivant = true;
    void chargerSeuilsCascade().then((seuils) => {
      if (vivant && seuils !== null) {
        magasin.getState().fixerSeuils(seuils);
      }
    });
    return () => {
      vivant = false;
    };
  }, [magasin]);

  return (
    <QueryClientProvider client={file}>
      <FournisseurJeu valeur={contexte}>
        <Routeur />
        {/* En surimpression de tout, transparente aux doigts, absente si animations calmes. */}
        <CoucheParticules />
      </FournisseurJeu>
    </QueryClientProvider>
  );
}
