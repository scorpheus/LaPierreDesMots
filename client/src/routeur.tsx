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
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
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
import type { EntreeGalerie, OptionsLancement } from '@pierre/partage/parent';
import { lirePaquetNoeud, listerProfils, marquerOuvertureVue } from './api/client.js';
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
// AJOUT V1 — la visite des écrans et des exercices, en zone parent (R38).
import { VisiteDesEcrans } from './parent/VisiteDesEcrans.js';

/** Les 5 codes d'écran de § 7.1 vers les 4 routes. `chargement` partage la racine. */
const CHEMIN_PAR_ECRAN: Readonly<Record<CodeEcran, string>> = {
  chargement: '/',
  profils: '/',
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
  /**
   * AJOUT À L'INTÉGRATION — la galerie parent en plein écran (D34).
   *
   * Le contrat de finition v3 § 6.2 nomme cette route explicitement et la confie à N4 :
   * « Le contrat les nomme ici : `/ouverture` (N4), `/parent/galerie` et `/parent/definir`
   * (N5) ». N4 n'a ajouté que `/ouverture`. `client/src/ecrans/EcranGalerieParent.tsx` était
   * donc écrit, compilé, testé — et importé par personne :
   *
   *     $ grep -rn "EcranGalerieParent" client/src --include=*.tsx | grep -v son propre fichier
   *     (aucune sortie)
   *
   * C'est exactement le mode de défaillance que D10 nomme : « un contrat gelé n'oblige
   * personne tant qu'un fichier n'est pas nommé pour chaque morceau », et il revient à
   * l'orchestrateur de vérifier que chaque symbole déclaré a trouvé son propriétaire.
   *
   * `/parent/definir` n'est PAS ajoutée, et c'est mesuré, pas oublié : `EcranCodeParent`
   * rend `EcranDefinirCode` lui-même quand aucun code n'est posé
   * (`EcranCodeParent.tsx:45,157`). La porte est donc déjà complète, et une seconde route
   * vers le même écran ferait deux chemins pour un seul état.
   */
  parentGalerie: '/parent/galerie',
  /**
   * AJOUT V1 — la visite des écrans et des exercices (R38, `Docs/questions-en-attente.md` § J3).
   *
   * Même disposition que `parentGalerie` juste au-dessus : une route à elle seule, plutôt qu'un
   * onglet de plus dans `EcranDashboard`, parce que le bandeau « retour à la visite »
   * (`BandeauRetourVisite`, plus bas dans ce fichier) doit pouvoir y ramener depuis N'IMPORTE
   * QUELLE page — y compris une page de jeu, où aucun onglet de dashboard n'est monté.
   */
  parentVisite: '/parent/visite',
  /**
   * AJOUT V1, second correctif — la prévisualisation de « choix du joueur à suivre » depuis la
   * visite (R38).
   *
   * UNE ROUTE À PART, et pas un drapeau affiché par-dessus `parentVisite` : un booléen partagé
   * a été essayé d'abord (`useState` local à `HoteVisiteDesEcrans`, puis un magasin partagé
   * hors composant) et les DEUX ont produit un cul-de-sac, mesuré par l'orchestrateur — le
   * bandeau navigue vers `parentVisite`, LA ROUTE OÙ L'ON EST DÉJÀ pendant la prévisualisation,
   * donc TanStack Router ne remonte rien et aucun drapeau qui vivrait hors du routeur ne se
   * réinitialise. Une route SÉPARÉE n'a pas ce problème par construction : y revenir EST un
   * changement de chemin, donc une vraie navigation, donc un remontage garanti.
   */
  parentVisiteApercuProfil: '/parent/visite/quel-joueur',
  /**
   * AJOUT N4 — la séquence d'ouverture (D35, contrat de finition v3 § 4.4 et § 6.2).
   *
   * Frontière « N4 → N6 » du § 6.1 : c'est par cette constante que le campement rejoue
   * l'ouverture (D35, point 3). N6 l'importe, il ne réécrit pas le littéral.
   */
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

/**
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * LA SÉQUENCE D'OUVERTURE — D35, lot N4.
 *
 * ── L'ARBITRAGE, ET IL EST CONTRE-INTUITIF ──────────────────────────────────────────────────
 * La séquence est **OFFERTE, jamais imposée**. Elle ne se déclenche pas toute seule, ni au
 * premier lancement, ni jamais. Ce n'est pas une timidité : c'est D46, point 3, dans ses
 * termes — « **aucun écran intermédiaire obligatoire, NULLE PART**. Chaque écran qui
 * s'interpose entre l'envie de jouer et le jeu mange du temps de lecture. » D46 est la
 * décision la plus récente du dossier, et elle est sans exception.
 *
 * Deux conséquences, et il faut les regarder en face :
 *   • un enfant peut ne jamais voir le récit. C'est pourquoi l'entrée est en HAUT de la carte,
 *     nommée, et non rangée dans un menu ; et pourquoi le serveur enregistre `vue` — pour que
 *     le PARENT sache s'il doit lui montrer une fois. C'est le seul signal actionnable.
 *   • si l'usage montre que personne ne la lance, passer à un déclenchement automatique est
 *     UNE ligne ici — et on l'aura alors décidé sur une mesure, pas sur une intention.
 * Arbitrage consigné dans `Docs/questions-en-attente.md` (N4-3), avec sa contradiction.
 *
 * ── LE FETCH N'EST PLUS ICI ─────────────────────────────────────────────────────────────────
 * « Un seul fichier du client appelle le réseau, et c'est `api/client.ts` ». Ce bloc l'a
 * enfreint pendant tout le lot N4 pour une raison d'écrivain unique (§ historique ci-dessus) —
 * corrigé au Lot 4 du portage Android (Docs/addendum-portage-android.md § 6bis) :
 * `marquerOuvertureVue` vit désormais dans `client/src/api/contrat.ts`/`port-http.ts`/
 * `port-local.ts`, importée d'`api/client.ts` comme les 28 autres méthodes du port. Bénéfice
 * au-delà de la règle : cet appel fonctionne maintenant aussi en mode autonome (Android), où il
 * n'existe aucun serveur à interroger.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 */
function HoteOuverture(): ReactElement {
  const naviguer = useNavigate();
  const profil = useEtatJeu((etat) => etat.profil);

  return (
    <EcranOuverture
      surFin={(passee) => {
        if (profil !== null) {
          void marquerOuvertureVue(String(profil.id), passee);
        }
        // Une seule destination, et c'est la carte : le récit se termine sur « viens », donc
        // il rend la main sur le monde. Il n'y a jamais de retour en arrière depuis ici — un
        // récit qu'on quitte ne se re-propose pas, il se REJOUE, et c'est un autre geste.
        void naviguer({ to: CHEMIN_PAR_ECRAN.carte });
      }}
    />
  );
}

/**
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * `surRejouerOuverture` — CÂBLAGE MANQUANT, trouvé par le lot Q2 le 2026-08-02.
 *
 * Le fait, mesuré avant correction, sortie citée :
 *
 *     $ grep -rn "surRejouerOuverture" client/src
 *     client/src/ecrans/EcranCampement.tsx:58   (déclaration de la propriété)
 *     client/src/ecrans/EcranCampement.tsx:92   (déstructuration)
 *     client/src/ecrans/EcranCampement.tsx:234  (garde de rendu)
 *     client/src/ecrans/EcranCampement.tsx:241  (onClick)
 *     → AUCUNE ligne dans routeur.tsx
 *
 * `EcranCampement` ne rend son bouton « Revoir l'histoire » que si le rappel lui est donné —
 * « un bouton qui ne mènerait nulle part serait pire que son absence, et ce lot refuse d'en
 * poser un » (son propre en-tête). Personne ne le lui donnait : D35 point 3 — « rejouable ; un
 * enfant qui n'a pas suivi la première fois doit pouvoir y revenir SEUL » — restait sur le
 * papier côté campement, et le commentaire de `CHEMINS.ouverture`, vingt lignes plus haut dans
 * ce fichier, annonçait pourtant que « c'est par cette constante que le campement rejoue
 * l'ouverture ».
 *
 * Aucune suite ne pouvait le voir : `parcours-audit-tout-le-site.spec.ts` exige de chaque écran
 * UNE sortie, et le campement en avait deux. Un contrôle ABSENT ne se compte pas.
 *
 * L'ajout est de trois lignes et strictement additif : il n'invente aucune destination, il
 * emprunte `CHEMINS.ouverture`, déjà déclarée ici pour cet usage exact.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 */
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
    />
  );
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

/**
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * LE CHOIX DU JOUEUR À SUIVRE — la seconde impasse, et elle était sur le chemin NORMAL.
 *
 * Le fait mesuré : la porte de la zone parent est en pied de `EcranProfils`
 * (`data-acces-parent`), c'est-à-dire **avant** que le moindre profil ne soit choisi. Le père
 * a donc traversé `/parent`, tapé son code, atteint `/parent/dashboard` — et `profil` y valait
 * `null`. L'écran rendu était alors `EcranCodeParent` avec `surOuverture` et `surAbandon`
 * tous deux à `() => undefined` : **un pavé numérique dont les deux boutons de sortie ne font
 * rien**, et un dashboard qui n'apparaissait jamais. C'est exactement le « c'est quoi le code
 * pour aller sur l'espace parent et à quoi il sert ? » du retour.
 *
 * Les deux tests parent (`tests/e2e/parcours-parent.spec.ts`,
 * `tests/qualite/a11y-parent.spec.ts`) ne pouvaient pas le voir : tous deux appellent
 * `window.__test.chargerProfil()` avant d'ouvrir la porte, donc `profil` n'y est jamais `null`.
 * Le seul chemin qu'un humain emprunte est précisément celui qu'aucun test ne prenait.
 *
 * Le remède n'est pas de rendre la main au jeu — le parent voulait le suivi, pas le jeu — mais
 * de lui **demander de quel enfant il s'agit**. Le choix est LOCAL à la zone parent : appeler
 * `magasin.choisirProfil` poserait `ecran: 'carte'`, et le routeur, qui en est le miroir,
 * éjecterait le parent vers le jeu à l'instant même où il choisit.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 */
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

/**
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * LE CONTEXTE DE LA ZONE PARENT — profil suivi et visite en cours, partagés entre les hôtes.
 *
 * ── HISTORIQUE DES DEUX FAUSSES PISTES, ET POURQUOI AUCUNE DES DEUX NE TENAIT ─────────────────
 *
 * 1. `useState` LOCAL à chaque hôte (`HoteDashboard`, `HoteGalerieParent`, `HoteVisiteDesEcrans`).
 *    Mesuré : entrer par la porte du pied de l'accueil (AVANT tout choix de joueur — voir
 *    l'en-tête de `ChoixProfilParent`), choisir un enfant sur le dashboard, puis cliquer
 *    « Visite des écrans » retombait sur `ChoixProfilParent` — un SECOND choix, pour la MÊME
 *    session, parce que chaque hôte démonté-remonté reperd son `useState`.
 *
 * 2. Un magasin PARTAGÉ hors composant (`let` de module + `useSyncExternalStore`), pour
 *    survivre à la navigation d'un hôte vers l'autre. Ça a réglé le cas ci-dessus — mesuré,
 *    confirmé par l'orchestrateur, « les dix liens atteignent leur cible ». Mais soumis ensuite
 *    à `npm run verifier`, ce module a fait diverger `tests/modele/explorateur.tsx` : chaque
 *    « nouvelle session » de l'explorateur monte une `<Application>` FRAÎCHE et vide
 *    `localStorage`, en simulant un appareil neuf — mais un `let` de module ne se réinitialise
 *    PAS entre deux montages dans le même process Vitest, contrairement à un vrai rechargement
 *    de page. Le résidu d'une exploration antérieure fuyait dans la suivante : mesuré, sortie
 *    citée dans le rapport du lot — « rejeu de … attendu « choix-profil-parent », arrivé sur
 *    « dashboard » », puis toute une cascade de 40 « transitions non déclarées » qui étaient en
 *    réalité les tuiles de la visite, mal étiquetées `depuis: 'dashboard'` parce que le rejeu
 *    avait dérivé sans que l'explorateur puisse le savoir.
 *
 * ── LE REMÈDE : LE CONTEXTE REACT DE `Routeur`, PAS UN MODULE ─────────────────────────────────
 *
 * `Routeur` (fin de ce fichier) instancie ce contexte en `useState`, une fois par montage de
 * `<Application>`. Il se réinitialise donc exactement quand un vrai rechargement de page le
 * ferait ET exactement quand `tests/modele/explorateur.tsx` monte une session fraîche — les
 * DEUX bornes de remise à zéro coïncident enfin, parce que c'est la MÊME chose : une nouvelle
 * instance de l'arbre React.
 *
 * Coût assumé : `profilSuivi` ne survit plus à un rechargement de page en cours de visite (il
 * survivait avec le magasin de module). C'est un renoncement mineur — re-choisir une fois le
 * joueur après un F5 accidentel — face à un test qui garde une classe entière de régressions.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 */
interface ContexteZoneParent {
  readonly profilSuivi: Profil | null;
  readonly fixerProfilSuivi: (profil: Profil | null) => void;
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

  const rendreLaMainAuJeu = (): void => {
    void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
  };

  /**
   * R30 — lancer un exercice depuis la galerie parent.
   *
   * Deux précautions, et aucune n'est décorative :
   *
   *  1. **Le profil de SESSION est choisi si besoin.** Le parent est souvent entré par la porte
   *     du pied de l'écran des profils, donc sans avoir choisi de joueur : `profil` vient alors
   *     de `profilSuivi`, et le magasin de jeu, lui, n'a personne. Sans ce `choisirProfil`,
   *     l'écran de nœud s'ouvrirait sur un profil nul.
   *  2. **`options` est transmis tel quel**, et vaut toujours `LANCEMENT_PARENT` : la fiche n'a
   *     pas le choix de journaliser, et l'hôte ne le lui rend pas. C'est le magasin qui porte
   *     désormais le drapeau, et `data-journalise` le rend constatable.
   *
   * ⚠ GARDE ÉLARGIE À `== null` — trouvé en corrigeant V1, sur le même patron. `EntreeGalerie.
   * noeud` est typé `IdNoeud | null`, jamais `undefined` — mais `tests/modele/serveur-double.ts`
   * (le double de réseau de la QA Q2, hors de mon périmètre) construit ses entrées de catalogue
   * SANS poser cette clé du tout, via un `as never` qui contourne le type. `entree.noeud` y vaut
   * alors `undefined` à l'exécution, `=== null` ne l'attrape pas, et l'appel suivant partait sur
   * `GET /api/contenu/noeuds/undefined` — mesuré, sortie citée dans le rapport du lot (`404`,
   * rejet de promesse non intercepté). `== null` couvre les deux : c'est un garde-fou contre un
   * contenu réel tout aussi incomplet, pas seulement contre le double de test.
   */
  const lancerUnExercice = (entree: EntreeGalerie, options: OptionsLancement): void => {
    if (entree.noeud == null) {
      return;
    }
    if (profilDeSession === null && profilSuivi !== null) {
      magasin.getState().choisirProfil(profilSuivi);
    }
    void lirePaquetNoeud(entree.noeud).then((paquet) => {
      magasin.getState().demarrerNoeud(paquet, options);
    });
  };

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
      // AJOUT V1 — la porte d'entrée de la visite depuis le dashboard (R38).
      surAllerVisite={() => {
        void naviguer({ to: CHEMINS.parentVisite });
      }}
      // ── R30 — « le bouton lancer l'exercice, mais ça ne fait rien » ────────────────────
      //
      // Il ne faisait rien parce qu'AUCUN hôte ne fournissait `surLancerExercice`. Le rappel
      // était déclaré sur `EcranDashboard`, relayé jusqu'au bouton de `FicheExercice` — qui
      // se désactivait proprement, `disabled={surLancer === undefined}` — et le parent voyait
      // un bouton gris sans savoir pourquoi.
      //
      // Recensé par objet : 7 rappels optionnels sur 27 ne sont fournis nulle part. Le père en
      // a trouvé deux en jouant, celui-ci et le chaudron. Aucune recette ne pouvait les voir,
      // puisque chacune injecte elle-même les rappels dont elle a besoin et ne traverse donc
      // jamais le câblage réel.
      surLancerExercice={lancerUnExercice}
      // ── R29 — APRÈS LA SUPPRESSION, ON NE PEUT PLUS PARLER DE CE PROFIL ───────────────
      //
      // Sans ce rappel, le dashboard resterait affiché sur un compte qui n'existe plus :
      // chacune de ses requêtes rendrait 404 et le parent verrait une page d'erreurs. On le
      // ramène donc au choix du joueur, en oubliant AUSSI le profil de session s'il se trouve
      // que c'était le même — sinon le jeu rouvrirait sur un enfant effacé.
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

/**
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * LA VISITE DES ÉCRANS ET DES EXERCICES — R38, lot V1.
 *
 * Même repli que `HoteDashboard` et `HoteGalerieParent` juste au-dessus : sans profil, on rend
 * `ChoixProfilParent` plutôt qu'un écran vide — c'est d'ailleurs EXACTEMENT ce chemin qui fait
 * de « choix du joueur à suivre » un écran atteignable depuis la visite elle-même (§ « Les 11
 * écrans nommés » de `VisiteDesEcrans.tsx`) : y revenir sans profil choisi montre cet écran.
 *
 * Les rappels de navigation ci-dessous sont les SEULS endroits du dépôt qui savent comment
 * atteindre chacun des 13 écrans sans jouer — `VisiteDesEcrans.tsx` ne connaît, comme tous les
 * écrans, aucun chemin (voir son en-tête). C'est la même règle que `HoteCarte`, `HoteCampement`,
 * etc. plus haut dans ce fichier, appliquée une fois de plus.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 */
function HoteVisiteDesEcrans(): ReactElement {
  const naviguer = useNavigate();
  const magasin = useMagasin();
  const profilDeSession = useEtatJeu((etat) => etat.profil);
  // PARTAGÉ avec `HoteDashboard` et `HoteGalerieParent` — voir `FournisseurZoneParent`.
  const { profilSuivi, fixerProfilSuivi, demarrerVisite, terminerVisite } = useZoneParent();
  const profil = profilDeSession ?? profilSuivi;

  // La visite démarre dès que cet hôte est monté avec un profil connu — c'est CE geste qui
  // fait apparaître le bandeau sur tout ce qu'on ouvrira ensuite. `VisiteDesEcrans.tsx` ne le
  // déclenche plus lui-même : un composant purement présentatif, qui ne connaît ni chemin ni
  // état global, est plus facile à monter isolément (`tests/composants/**`).
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
      // « profils » — une simple navigation d'URL. Le routeur reconcilie lui-même l'écran du
      // magasin vers 'profils' (voir l'écouteur d'historique plus bas) SANS appeler
      // `quitterProfil()` : contrairement à `rendreLaMainAuJeu` de `HoteDashboard`, la visite
      // ne doit RIEN effacer — ni le profil de session, ni le profil mémorisé sur l'appareil.
      surAllerProfils={() => {
        void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
      }}
      // « carte » — `choisirProfil` pose `ecran: 'carte'` ET mémorise le joueur ; le routeur
      // pousse `/carte` tout seul (effet de `Routeur`, plus bas). C'est la SEULE des cinq
      // destinations qui veut vraiment `ecran: 'carte'` ; les quatre suivantes s'en passent —
      // voir DÉFAUT B ci-dessous.
      surAllerCarte={() => {
        magasin.getState().choisirProfil(profil);
      }}
      /**
       * ═════════════════════════════════════════════════════════════════════════════════════
       * DÉFAUT B, signalé par l'orchestrateur : « ouverture → visite-parent, il reste sur la
       * visite ». `HoteOuverture` ne renvoie nulle part de son propre chef (relu : aucune
       * condition « déjà vue » n'existe côté client, `lireOuverture` n'est même pas appelée) —
       * la vraie cause est ICI, une ligne au-dessus dans l'ancienne version.
       *
       * `choisirProfil(profil)` pose DEUX choses à la fois : le profil ET `ecran: 'carte'`. Ce
       * second effet poussait `/carte` sur l'historique (l'abonnement au magasin, plus bas dans
       * ce fichier) DANS LA MÊME TÂCHE JS que le `naviguer({ to: CHEMINS.ouverture })` qui
       * suivait — deux navigations tirées coup sur coup sur le MÊME objet d'historique, l'une
       * brute (`history.push`), l'autre via le routeur (`naviguer`, asynchrone). Une course, et
       * pas une supposition : `choisirProfil` est la SEULE des actions du magasin qui pose
       * `ecran`, donc le SEUL des cinq rappels de cet hôte à fabriquer une seconde navigation
       * que personne n'a demandée.
       *
       * Le remède ne devine pas où était la course, il la retire : `magasin.setState({ profil })`
       * pose le SEUL champ dont `EcranOuverture`/`EcranCampement`/`EcranCoffre` ont besoin
       * (ils lisent `useEtatJeu(etat => etat.profil)`), sans toucher `ecran` — donc sans
       * déclencher la moindre navigation concurrente. Une seule poussée d'historique par clic,
       * exactement comme `surAllerReglagesLecture` juste plus bas, qui n'a jamais montré ce
       * défaut parce qu'il ne posait déjà aucun profil.
       * ═════════════════════════════════════════════════════════════════════════════════════
       */
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
      // Même correctif qu'au-dessus : sans lui, un profil connu seulement par `profilSuivi`
      // (chemin de la porte du pied) laissait `EcranReglagesLecture` sans profil de session.
      surAllerReglagesLecture={() => {
        magasin.setState({ profil });
        void naviguer({ to: CHEMINS.reglagesLecture });
      }}
      surAllerCodeParent={() => {
        void naviguer({ to: CHEMINS.parent });
      }}
      // DÉFAUT A, sa forme définitive — voir l'en-tête de `CHEMINS.parentVisiteApercuProfil` :
      // une route à part, plutôt qu'un drapeau que ni un `useState` local ni un magasin partagé
      // n'ont réussi à faire survivre correctement au clic du bandeau global.
      surAllerChoixProfilParent={() => {
        void naviguer({ to: CHEMINS.parentVisiteApercuProfil });
      }}
      surAllerDashboard={() => {
        void naviguer({ to: CHEMINS.parentDashboard });
      }}
      surAllerGalerieParent={() => {
        void naviguer({ to: CHEMINS.parentGalerie });
      }}
      // ── R30, repris tel quel — même logique que `HoteDashboard.lancerUnExercice` ─────────
      //
      // `options` vaut toujours `LANCEMENT_PARENT` (posé par `FicheExercice`, jamais ici) :
      // rien de ce que le père joue depuis la visite n'entre dans le journal de l'enfant.
      // `choisirProfil` reste volontairement ICI (et pas `setState`) : lancer un exercice VEUT
      // `ecran: 'noeud'` juste après, et la navigation qui compte est celle que `demarrerNoeud`
      // posera — la brève étape par `'carte'` ne se voit jamais, `lirePaquetNoeud` est asynchrone.
      //
      // `== null` et non `=== null` : voir la même garde, avec sa mesure, sur
      // `HoteDashboard.lancerUnExercice` plus haut dans ce fichier.
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

/**
 * Le bandeau « retour à la visite » — R38, exigence n° 3 : « toujours atteignable, sur chaque
 * page ». Monté à la RACINE du routeur (voir `construireRouteur`) : il survole donc les 13
 * écrans, tous les moteurs, les deux panneaux — tout ce que `<Outlet />` peut rendre.
 *
 * ── POURQUOI IL S'ÉTEINT TOUT SEUL DÈS QU'UNE VRAIE PARTIE D'ENFANT COMMENCE ────────────────
 *
 * Le drapeau (`visiteEnCours`, `FournisseurZoneParent`) vit dans l'état React de `Routeur` —
 * réinitialisé à chaque montage de `<Application>`, donc à chaque vrai rechargement de page.
 * Mais TANT QUE l'onglet reste ouvert, il survit à toute navigation en son sein : si un parent
 * quitte la visite sans cliquer « Fermer » et que l'enfant reprend la MÊME tablette SANS
 * recharger, le bandeau resterait affiché PENDANT une vraie partie. `EtatMagasin.journalise`
 * vaut `true` par défaut et ne vaut `false` QUE pour un lancement `LANCEMENT_PARENT`
 * (contrat § R30) : dès qu'un nœud démarre journalisé (donc joué par l'enfant, par la carte),
 * on éteint le drapeau. Aucune écriture dans `magasin.ts` (propriété du lot A1) : on ne fait que
 * LIRE `journalise` et `ecran`, déjà publics via `useEtatJeu`.
 */
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
          // Naviguer suffit désormais : la prévisualisation vit sur SA PROPRE route
          // (`CHEMINS.parentVisiteApercuProfil`), donc y revenir EST un changement de chemin —
          // un vrai remontage de `HoteVisiteDesEcrans`, pas un drapeau à éteindre à la main.
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
  // AJOUT V1 — `<BandeauRetourVisite />` survole TOUT ce que `<Outlet />` rend, à la racine de
  // l'arbre de routes : c'est la seule façon de le rendre « toujours atteignable, sur chaque
  // page » sans le poser dans chacun des 13 écrans un par un.
  const routeRacine = createRootRoute({
    component: () => (
      <>
        <BandeauRetourVisite />
        <Outlet />
      </>
    )
  });

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
      component: HoteDashboard
    }),
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.parentGalerie,
      component: HoteGalerieParent
    }),
    // AJOUT V1 — la visite des écrans et des exercices (R38).
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.parentVisite,
      component: HoteVisiteDesEcrans
    }),
    // AJOUT V1, second correctif — la prévisualisation de « choix du joueur à suivre ».
    createRoute({
      getParentRoute: () => routeRacine,
      path: CHEMINS.parentVisiteApercuProfil,
      component: HoteApercuChoixProfilVisite
    })
  ]);

  return createRouter({
    routeTree: arbre,
    // TanStack retire cette base a l'entree et la remet a chaque navigation. Les routes du jeu
    // restent donc `/carte`, `/parent/dashboard`, etc. dans tout le code applicatif.
    basepath: import.meta.env.BASE_URL,
    /**
     * ══════════════════════════════════════════════════════════════════════════════════════
     * R21 / R22 — HISTORIQUE DU NAVIGATEUR, ET NON PLUS EN MÉMOIRE.
     *
     * L'ancien commentaire disait : « Historique EN MÉMOIRE, volontairement : le jeu est une
     * borne sur tablette. L'URL n'est ni partagée, ni mise en favori, ni rechargée à la main,
     * et un retour navigateur au milieu d'un exercice n'a aucun sens pour un enfant de 7 ans. »
     *
     * Le père a mesuré la conséquence en jouant, et elle est l'inverse de l'intention :
     *
     *     « quand on appuie dans le navigateur sur rafraîchir ou sur retour en arrière, ça
     *       enlève le site. Et ça, faudrait pouvoir revenir en arrière justement. »
     *
     * Un historique en mémoire n'écrit AUCUNE entrée dans celui du navigateur : le bouton
     * « retour » de la tablette sort donc du site, et le rafraîchissement repart de `/`.
     * L'hypothèse « l'enfant n'appuiera pas » était fausse — un enfant de 7 ans appuie sur
     * tout, et c'est précisément pour lui qu'un état sans issue est le pire des défauts.
     *
     * Avec l'historique du navigateur, « retour » remonte D'UN écran de jeu, et un
     * rafraîchissement recharge la page où l'on était (avec le bon joueur, voir R21).
     * ══════════════════════════════════════════════════════════════════════════════════════
     */
    history: createBrowserHistory(),
    defaultPreload: false
  });
}

export function Routeur(): ReactElement {
  const magasin = useMagasin();
  const [routeur] = useState(construireRouteur);

  useEffect(() => {
    const aller = (ecran: CodeEcran): void => {
      // Le banc local est autonome ; l'hydratation du joueur ne doit pas effacer son URL.
      if (estHoteLocal() && cheminInterne(routeur.history.location.pathname) === CHEMINS.debugRecompenses) return;
      const cible = CHEMIN_PAR_ECRAN[ecran];
      const ciblePublique = cheminPublic(cible);
      if (routeur.history.location.pathname !== ciblePublique) {
        routeur.history.push(ciblePublique);
      }
    };

    // Au chargement direct d'une URL profonde, le magasin n'a pas encore relu le joueur. Le
    // forcer immédiatement vers `/` effacerait chemin, recherche et fragment juste avant que
    // l'hydratation puisse confirmer l'écran. Une route connue reste donc en place pendant cet
    // unique état transitoire ; l'état suivant la conserve ou ramène normalement aux profils.
    const cheminAuDemarrage = cheminInterne(routeur.history.location.pathname);
    if (magasin.getState().ecran !== 'chargement' || !estRouteConnue(cheminAuDemarrage)) {
      aller(magasin.getState().ecran);
    }

    const arreterMagasin = magasin.subscribe((etat, precedent) => {
      if (etat.ecran !== precedent.ecran) {
        aller(etat.ecran);
      }
    });

    /**
     * ══════════════════════════════════════════════════════════════════════════════════════
     * R22 — LE MIROIR REGARDE MAINTENANT DANS LES DEUX SENS.
     *
     * Il ne suivait que le magasin. Un retour navigateur changeait donc l'URL SANS que le
     * magasin le sache : l'écran affiché redevenait la carte, et `etat.ecran` valait encore
     * `noeud`. Les deux se contredisaient, et la suite en découle —
     *
     *     if (etat.ecran !== precedent.ecran) aller(etat.ecran);
     *
     * — ne déclenche RIEN quand on repart vers le même code d'écran. Choisir une autre région
     * après un retour arrière ne poussait donc aucune navigation : le père voyait « le même
     * exercice ».
     *
     * On écoute donc aussi l'historique. Seuls les chemins que le magasin POSSÈDE sont
     * réconciliés : `/campement`, `/coffre` ou la zone parent ont leur propre route et ne
     * doivent pas être ramenés de force vers l'écran de jeu courant.
     * ══════════════════════════════════════════════════════════════════════════════════════
     */
    const cheminsDuMagasin = new Map<string, CodeEcran>(
      (Object.entries(CHEMIN_PAR_ECRAN) as readonly (readonly [CodeEcran, string])[]).map(
        ([ecran, chemin]) => [chemin, ecran]
      )
    );

    const arreterHistorique = routeur.history.subscribe(() => {
      const ecranDuChemin = cheminsDuMagasin.get(
        cheminInterne(routeur.history.location.pathname)
      );
      if (ecranDuChemin === undefined) return;
      if (magasin.getState().ecran !== ecranDuChemin) {
        magasin.getState().naviguer(ecranDuChemin);
      }
    });

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
