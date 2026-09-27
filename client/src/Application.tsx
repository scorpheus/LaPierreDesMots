// Racine de composition du client — contrat technique v1 § 1.4 et § 11.2.
//
// Elle assemble, et ne décide de rien : les services et le magasin lui sont DONNÉS. C'est ce
// qui permet à `tests/composants/**` de monter l'application entière avec `VoixMuette`,
// `AudioMuet`, une horloge figée et une graine connue, sans toucher au code de production.
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { FournisseurJeu, chargerSeuilsCascade, useEtatJeu } from './etat/services.js';
import type { ContexteJeu } from './etat/services.js';
import type { MagasinJeu } from './etat/magasin.js';
import type { ServicesJeu } from './moteurs/types.js';
import { Particules } from './composants/Particules.js';
import { ErreurReseau, lireProfil, reprendreTentativesEnAttente } from './api/client.js';
import { lireProfilMemorise, oublierProfil } from './etat/profil-memorise.js';
import type { IdProfil } from '@pierre/partage';
import { FournisseurReglagesDuProfil } from './lecture/reglages-du-profil.js';
import { Routeur } from './routeur.js';
import { protegerChangementEcran } from './interaction/proteger-changement-ecran.js';
import { NotificationMiseAJourPwa } from './pwa/MiseAJourPwa.js';

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

/** Le téléchargement reste en fond ; proposer le redémarrage seulement hors activité. */
function MiseAJourHorsActivite(): ReactElement | null {
  const ecran = useEtatJeu((etat) => etat.ecran);
  return <NotificationMiseAJourPwa visible={ecran === 'profils' || ecran === 'campement' || ecran === 'carte'} />;
}

/** La reprise ne fabrique aucun gain : seuls les caches relus depuis le journal sont actualisés. */
function RepriseDesTentatives(): null {
  const profil = useEtatJeu((etat) => etat.profil);
  const ecran = useEtatJeu((etat) => etat.ecran);
  const file = useQueryClient();
  useEffect(() => {
    if (profil === null || (ecran !== 'campement' && ecran !== 'carte')) return undefined;
    let enCours = false;
    const actualiser = async (): Promise<void> => {
      await Promise.all([
        file.invalidateQueries({ queryKey: ['progression', String(profil.id)] }),
        file.invalidateQueries({ queryKey: ['monde', String(profil.id)] })
      ]);
    };
    const reprendre = (): void => {
      if (enCours) return;
      enCours = true;
      void reprendreTentativesEnAttente(profil).then(async (nombre) => {
        if (nombre === 0) return;
        await actualiser();
      }).catch(async (cause: unknown) => {
        console.warn('[tentative] reprise différée conservée :', cause);
        // Une première tentative peut avoir reçu son ACK avant qu'une suivante échoue.
        await actualiser();
      }).finally(() => { enCours = false; });
    };
    reprendre();
    window.addEventListener('online', reprendre);
    window.addEventListener('focus', reprendre);
    return () => {
      window.removeEventListener('online', reprendre);
      window.removeEventListener('focus', reprendre);
    };
  }, [profil, ecran, file]);
  return null;
}

export function Application({
  magasin,
  services,
  fileDAttente
}: ProprietesApplication): ReactElement {
  const [file] = useState(() => fileDAttente ?? creerFileDAttente());
  const [contexte] = useState<ContexteJeu>(() => ({ magasin, services }));
  const [erreurRestauration, fixerErreurRestauration] = useState<string | null>(null);
  const [numeroEssai, fixerNumeroEssai] = useState(0);
  useEffect(() => protegerChangementEcran(document), []);

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
  //   • l'échec de lecture conserve le profil et la sauvegarde, avec un nouvel essai possible ;
  //   • le nœud commencé et son plan sont relus avant de résoudre une URL profonde.
  // ══════════════════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (magasin.getState().ecran !== 'chargement') {
      return undefined;
    }
    const memorise = lireProfilMemorise();
    if (memorise === null) {
      magasin.setState({ hydratationRepriseLecture: 'terminee' });
      magasin.getState().naviguer('profils');
      return undefined;
    }
    let vivant = true;
    const restaurationEncoreDemandee = (): boolean =>
      vivant && magasin.getState().ecran === 'chargement' && lireProfilMemorise() === memorise;
    void lireProfil(memorise as IdProfil)
      .then(async (profil) => {
        if (!restaurationEncoreDemandee()) return;
        await magasin.getState().chargerProfilEtReprise(profil);
      })
      .catch((cause: unknown) => {
        if (!vivant || lireProfilMemorise() !== memorise) return;
        // Seul un profil réellement disparu est oublié par lireProfil (404). Un défaut
        // de lecture SQLite, de version ou de réseau conserve les données et permet de réessayer.
        if (cause instanceof ErreurReseau && cause.statut === 404) {
          oublierProfil();
          magasin.getState().naviguer('profils');
        } else {
          fixerErreurRestauration('Impossible de retrouver ta partie pour le moment.');
        }
      });
    return () => {
      vivant = false;
    };
  }, [magasin, numeroEssai]);

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

  if (erreurRestauration !== null) {
    return <main data-ecran="chargement" style={{ padding: '2rem' }}>
      <p role="alert">{erreurRestauration}</p>
      <button type="button" className="cible" onClick={() => {
        fixerErreurRestauration(null);
        fixerNumeroEssai((numero) => numero + 1);
      }}>Réessayer</button>
      <button type="button" className="cible" onClick={() => {
        fixerErreurRestauration(null);
        magasin.getState().naviguer('profils');
      }}>Choisir un autre joueur</button>
    </main>;
  }

  return (
    <QueryClientProvider client={file}>
      <FournisseurJeu valeur={contexte}>
        <RepriseDesTentatives />
        <MiseAJourHorsActivite />
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
