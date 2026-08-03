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
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate
} from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { CodeEcran, Profil } from '@pierre/partage';
import { listerProfils } from './api/client.js';
import { EcranCampement } from './ecrans/EcranCampement.js';
import { EcranCarte } from './ecrans/EcranCarte.js';
import { EcranCodeParent } from './ecrans/EcranCodeParent.js';
import { EcranCoffre } from './ecrans/EcranCoffre.js';
import { EcranDashboard } from './ecrans/EcranDashboard.js';
import { EcranGalerieParent } from './ecrans/EcranGalerieParent.js';
import { EcranNoeud } from './ecrans/EcranNoeud.js';
import { EcranOuverture } from './ecrans/EcranOuverture.js';
import { EcranProfils } from './ecrans/EcranProfils.js';
import { EcranRecompense } from './ecrans/EcranRecompense.js';
import { EcranReglagesLecture } from './ecrans/EcranReglagesLecture.js';
import { useEtatJeu, useMagasin } from './etat/services.js';
// AJOUT N4 — la table des chemins de la sequence, ecrite UNE fois dans `partage` et lue par le
// client comme par le serveur (convention C5 : aucune donnee en deux exemplaires).
import { CHEMINS_OUVERTURE } from '@pierre/partage/ouverture';

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
 * ── LE FETCH EST ICI, ET IL NE DEVRAIT PAS Y ÊTRE ───────────────────────────────────────────
 * « Un seul fichier du client appelle le réseau, et c'est `api/client.ts` ». Cette règle est
 * juste et ce bloc l'enfreint. Motif, mesuré et non supposé : `client/src/api/client.ts` est
 * en cours d'écriture par **N5** au moment où N4 travaille (`lireEtatPorteParent`,
 * `definirCodeParent` y sont apparus pendant ce lot). Le § 4.4 n'attribue ce fichier à
 * personne, et « un seul écrivain par fichier » est une règle ABSOLUE, alors que la règle du
 * module réseau unique est une règle d'architecture. On paie la moins chère des deux.
 *
 * **À faire à l'intégration** : déplacer `lireOuverture` et `marquerOuvertureVue` dans
 * `client/src/api/client.ts`, et le chemin dans `CHEMINS_API` (possédé par N5, § 8). Signalé
 * au rapport de N4.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 */
async function marquerOuvertureVue(profil: string, passee: boolean): Promise<void> {
  // Un échec réseau ne coûte RIEN à l'enfant : il a vu l'histoire, elle reste rejouable, et la
  // seule perte est une ligne de suivi pour le parent. On ne l'informe donc de rien.
  await fetch(CHEMINS_OUVERTURE.pour(profil), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ passee })
  }).catch(() => undefined);
}

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
      surRejouerOuverture={() => {
        void naviguer({ to: CHEMINS.ouverture });
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

function HoteDashboard(): ReactElement {
  const naviguer = useNavigate();
  const profilDeSession = useEtatJeu((etat) => etat.profil);
  // Le profil suivi par le PARENT. Distinct de celui du jeu, et volontairement : la zone
  // parent « n'emprunte ni le magasin de session, ni les écrans de jeu » (`EcranDashboard`).
  const [profilSuivi, fixerProfilSuivi] = useState<Profil | null>(null);
  const profil = profilDeSession ?? profilSuivi;

  const rendreLaMainAuJeu = (): void => {
    void naviguer({ to: CHEMIN_PAR_ECRAN.profils });
  };

  if (profil === null) {
    return <ChoixProfilParent surChoix={fixerProfilSuivi} surRetour={rendreLaMainAuJeu} />;
  }

  return (
    <EcranDashboard
      profil={profil.id}
      prenom={profil.prenom}
      surSortie={rendreLaMainAuJeu}
      surGaleriePleinEcran={() => {
        void naviguer({ to: CHEMINS.parentGalerie });
      }}
    />
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
  const [profilSuivi, fixerProfilSuivi] = useState<Profil | null>(null);
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
    })
  ]);

  return createRouter({
    routeTree: arbre,
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
      const cible = CHEMIN_PAR_ECRAN[ecran];
      if (routeur.history.location.pathname !== cible) {
        routeur.history.push(cible);
      }
    };

    aller(magasin.getState().ecran);

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
      const ecranDuChemin = cheminsDuMagasin.get(routeur.history.location.pathname);
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

  return <RouterProvider router={routeur} />;
}
