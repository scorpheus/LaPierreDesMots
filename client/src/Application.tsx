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
import { lireProfil } from './api/client.js';
import { lireProfilMemorise, oublierProfil } from './etat/profil-memorise.js';
import type { IdProfil } from '@pierre/partage';
import { FournisseurReglagesDuProfil } from './lecture/reglages-du-profil.js';
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
export function creerFileDAttente(): QueryClient {
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

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // R21 — ON REPREND AVEC LE MÊME JOUEUR APRÈS UN RAFRAÎCHISSEMENT
  //
  // « quand on appuie sur rafraîchir ou sur retour en arrière, ça enlève le site… sinon on perd
  // carrément tout. » Les routes existaient toutes (`/carte`, `/noeud`, `/recompense`, …) et
  // l'URL suivait bien l'écran : ce n'est pas la route qui se perdait, c'est le JOUEUR. Mesuré :
  // `localStorage` ne servait qu'aux réglages du foyer, jamais au profil choisi.
  //
  // On relit donc l'identifiant retenu et on recharge le profil. Trois garde-fous, et chacun a
  // sa raison :
  //   • un identifiant périmé — profil effacé depuis — est OUBLIÉ plutôt que réessayé en boucle ;
  //   • l'échec réseau retombe sur le choix de profil, jamais sur un écran vide ;
  //   • l'exercice en cours n'est PAS restauré : son état vit dans le moteur, et le journal
  //     porte des tentatives, pas des frappes. On perd un exercice, jamais la partie.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (magasin.getState().ecran !== 'chargement') {
      return undefined;
    }
    const memorise = lireProfilMemorise();
    if (memorise === null) {
      magasin.getState().naviguer('profils');
      return undefined;
    }
    let vivant = true;
    void lireProfil(memorise as IdProfil)
      .then((profil) => {
        if (!vivant) return;
        magasin.getState().choisirProfil(profil);
      })
      .catch(() => {
        if (!vivant) return;
        // Profil disparu (base remise à zéro, autre appareil) : on oublie et on redemande.
        oublierProfil();
        magasin.getState().naviguer('profils');
      });
    return () => {
      vivant = false;
    };
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
        {/* Q7 — LE RÉGLAGE DE LECTURE DU PARENT ATTEINT TOUT CE QUI SE LIT.
            Il est DANS `FournisseurJeu` (il lit le profil courant) et AUTOUR du routeur (tout
            écran affiche du texte à déchiffrer). Avant le 2026-08-08, `FournisseurReglagesLecture`
            n'était monté nulle part : `useReglagesLecture()` rendait toujours les valeurs par
            défaut, et le réglage du parent ne changeait rien — pas même la consigne. */}
        <FournisseurReglagesDuProfil>
          <Routeur />
        </FournisseurReglagesDuProfil>
        {/* En surimpression de tout, transparente aux doigts, absente si animations calmes. */}
        <CoucheParticules />
      </FournisseurJeu>
    </QueryClientProvider>
  );
}
