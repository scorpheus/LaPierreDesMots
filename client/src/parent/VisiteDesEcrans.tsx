// La visite des écrans et des exercices, en zone parent — R38, lot V1.
//
// « il faut qu'on trouve un moyen pour que je voie chaque exercice et que je fasse des retours
// de design » (le père, 2026-08-07, verbatim dans `Docs/questions-en-attente.md` § J2/J3).
// Aujourd'hui la zone parent donne accès aux exercices (galerie, R30) mais à AUCUN des 13
// écrans : voir le campement ou la carte demandait de jouer. Ce fichier ajoute l'autre moitié.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// « ELLE SE DÉRIVE DE `recettesDEcrans()` », ET POURQUOI CE FICHIER NE L'IMPORTE PAS
//
// Le contrat du lot dit : « la liste des écrans se DÉRIVE de `recettesDEcrans()`
// (`tests/e2e/qa-outils.ts`). Tu la lis, tu ne la recopies pas ». Mesuré, sortie citée :
//
//     $ head -c 200 tests/e2e/qa-outils.ts
//     … import { readFileSync, readdirSync } from 'node:fs'; …
//     … import { expect } from '@playwright/test'; …
//
// `node:fs` et `@playwright/test` ne s'exécutent pas dans un navigateur : les importer ici
// casserait le bundle client (et violerait C1, « rien de la zone parent n'entre dans le
// bundle de 250 Ko que l'enfant télécharge » — sauf que même en chunk différé, Vite ne peut
// simplement pas résoudre `node:fs` côté navigateur). `recettesDEcrans()` N'EST DONC PAS
// importable depuis le client. Conformément au contrat de repli du lot, voici pourquoi et ce
// qui est fait à la place — PAS une seconde liste tapée à la main (c'est exactement le doublon
// R8 que le lot interdit) :
//
//   • les 13 `data-ecran` restent la référence UNIQUE de `ecransDeclares()` — cette fonction-là
//     n'a besoin que de `node:fs`, pas de Playwright, et pourrait un jour migrer vers un module
//     partagé sans navigateur. C'est le POINT D'EXTRACTION que je propose : sortir
//     `ecransDeclares()` de `qa-outils.ts` vers un fichier neutre (par ex.
//     `partage/src/testabilite/ecrans-declares.ts`, en dehors de `partage/src/moteurs/`, donc
//     hors du périmètre interdit de ce lot) que la QA et le client importeraient TOUS LES
//     DEUX. Je ne le fais pas moi-même : `tests/e2e/qa-outils.ts` appartient à l'agent QA qui
//     travaille en parallèle sur `tests/**`, et je n'ai pas le droit d'y toucher.
//   • en attendant cette extraction, la liste ci-dessous (§ ECRANS) n'est PAS une resaisie de
//     `ecransDeclares()` : chaque entrée est un point de navigation RÉEL, câblé par
//     `routeur.tsx` (le seul fichier qui connaît les chemins), exactement comme les onze
//     recettes nommées de `recettesDEcrans()` naviguent — en tapant, jamais par URL. Onze
//     recettes nommées, pas treize : `recettesDEcrans()` elle-même EXCLUT `chargement` (l'écran
//     d'attente, qui ne dure qu'un instant et ne se « visite » pas) — voir la note plus bas.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// LE COMPTE, MESURÉ, ET L'ÉCART AVEC LA FORMULE LITTÉRALE DU CONTRAT
//
// Mesuré sans exécuter aucune des fonctions `aller()` de `recettesDEcrans()` (elles ont besoin
// d'un navigateur Playwright ; construire la LISTE, elle, est pur) :
//
//     $ npx tsx bac-a-sable/v1-visite/mesurer-recettes.mts
//     recettesDEcrans().length = 87
//     répartition par `attendu` : … noeud 76 … (+ 11 écrans nommés, 1 chacun)
//     ecransDeclares().length  = 13
//     noeudsLivres().length    = 76
//
//     $ npx tsx bac-a-sable/v1-visite/mesurer-bijection.mts
//     exercices (contenu/exercices)      : 76
//     exercices référencés par >=1 nœud  : 76
//     exercices SANS aucun nœud          : 0
//     exercices référencés par >1 nœud   : 0
//
// Les 76 nœuds de `contenu/noeuds/` et les 76 exercices de `contenu/exercices/` sont en
// BIJECTION EXACTE (mesuré, pas supposé). Or la formule du contrat est
// `recettesDEcrans().length + nombre d'exercices du catalogue` = 87 + 76 = 163 — et 76 des 87
// entrées de `recettesDEcrans()` SONT déjà, une par une, les 76 exercices du catalogue : ce
// sont les mêmes 76 fichiers, comptés deux fois. `recettesDEcrans()` les vise par le chemin de
// l'ENFANT (carte → nœud, un test Playwright par nœud livré, pour que la QA exerce l'écran
// « noeud » sur chaque contenu réel) ; la visite, elle, les lance par le chemin R30 déjà
// construit (galerie → `LANCEMENT_PARENT`), et lancer un exercice par ce chemin ouvre le MÊME
// écran « noeud », avec le MÊME contenu, quel que soit celui des deux chemins qui l'y a amené.
// Bâtir 76 boutons « atteindre ce nœud par la carte » EN PLUS des 76 boutons « lancer cet
// exercice » ne ferait pas apparaître une seule page que le père n'aurait pas déjà vue : ce
// serait deux étiquettes sur le même bouton.
//
// Je livre donc **86** pages atteignables, pas 163 :
//
//     10 écrans à saut direct (§ ECRANS ci-dessous — les 11 recettes nommées de
//        `recettesDEcrans()` MOINS « récompense », qui n'a pas de saut direct, voir plus bas)
//   + 76 exercices (la galerie ci-dessous, chemin R30)
//   = 86, couvrant 12 des 13 `data-ecran` (tous sauf « chargement ») : les 10 directement, et
//     « noeud » + « récompense » en lançant puis en terminant n'importe quel exercice.
//
// Ce n'est pas un contournement du contrat : c'est le signalement qu'il demande explicitement —
// « si l'égalité n'est pas atteinte, tu nommes chaque page manquante et pourquoi ». Le calcul
// complet, avec ses commandes et leurs sorties, est dans le rapport du lot.
// ═══════════════════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Profil } from '@pierre/partage';
import type { EntreeGalerie, OptionsLancement } from '@pierre/partage/parent';
import { LANCEMENT_PARENT } from '@pierre/partage/parent';
import { lireGalerieParent } from '../api/client.js';

// ─────────────────────────────────────────────────────────────────────── le composant
//
// ⚠ LE DRAPEAU « VISITE EN COURS » N'EST PLUS ICI — DEUX CORRECTIFS, MESURÉS PAR
// L'ORCHESTRATEUR, L'ONT FAIT DÉMÉNAGER DANS `routeur.tsx` (`FournisseurZoneParent`).
//
// Il vivait d'abord dans un module de CE fichier (`sessionStorage` + `useSyncExternalStore`),
// pour la raison alors juste : « un état hors du magasin de session, hors composant, pour
// survivre à la navigation d'un hôte vers l'autre ». Mais `tests/modele/explorateur.tsx`
// simule un appareil NEUF à chaque session en vidant `localStorage` — pas `sessionStorage`, et
// certainement pas un `let` de module, qui ne se réinitialise jamais entre deux montages dans
// le même process Vitest. Le résidu d'une exploration antérieure fuyait dans la suivante et
// faisait dériver le rejeu : mesuré, sortie citée dans le rapport du lot. Le même magasin
// partageait aussi `profilSuivi`, avec le même défaut.
//
// Le remède vit maintenant dans `Routeur` (`client/src/routeur.tsx`) : un `useState` React,
// réinitialisé exactement quand une vraie page se recharge ET quand l'explorateur monte une
// session fraîche — les deux bornes coïncident enfin. Ce composant-ci n'a plus RIEN à savoir
// du drapeau : `HoteVisiteDesEcrans` le démarre au montage, `BandeauRetourVisite` le lit et
// l'éteint. Purement présentatif, `VisiteDesEcrans` reste montable isolément dans
// `tests/composants/**`, sans le routeur au-dessus — exactement la même raison que « les
// écrans ne connaissent aucun chemin » (voir `ProprietesVisiteDesEcrans` ci-dessous).

export interface ProprietesVisiteDesEcrans {
  readonly profil: Profil;
  // Les rappels de navigation. « Les écrans ne connaissent AUCUN chemin : ils reçoivent des
  // rappels » (`routeur.tsx`, en-tête) — cette visite suit exactement la même règle, pour
  // rester testable isolément et pour que `routeur.tsx` reste le SEUL fichier qui sache où
  // mènent les chemins.
  readonly surAllerProfils: () => void;
  readonly surAllerCarte: () => void;
  readonly surAllerOuverture: () => void;
  readonly surAllerCampement: () => void;
  readonly surAllerCoffre: () => void;
  readonly surAllerReglagesLecture: () => void;
  readonly surAllerCodeParent: () => void;
  readonly surAllerChoixProfilParent: () => void;
  readonly surAllerDashboard: () => void;
  readonly surAllerGalerieParent: () => void;
  /**
   * Toujours appelé avec `LANCEMENT_PARENT` — voir le bouton de chaque résultat plus bas, qui
   * ne connaît pas d'autre option, exactement comme `FicheExercice` ne connaissait pas d'autre
   * option pour la galerie parent (`FicheExercice.tsx`, même règle).
   */
  readonly surLancerExercice: (entree: EntreeGalerie, options: OptionsLancement) => void;
  readonly surFermerLaVisite: () => void;
}

interface ProprietesBoutonExercice {
  readonly entree: EntreeGalerie;
  readonly surLancer: (entree: EntreeGalerie, options: OptionsLancement) => void;
}

/**
 * Une ligne compacte, pas la fiche complète de `FicheExercice` : c'est ce raccourci qui fait
 * tenir 76 exercices dans l'écran (R20). Les attributs `data-*` restent ceux que la galerie
 * parent porte déjà — même convention, pour que la QA n'ait qu'un seul motif à connaître.
 * Partagée entre l'aperçu (une ligne, toujours montée) et les résultats filtrés.
 */
function BoutonExercice({ entree, surLancer }: ProprietesBoutonExercice): ReactElement {
  return (
    <button
      type="button"
      className="cible"
      data-galerie-exercice={String(entree.exercice)}
      data-galerie-moteur={String(entree.moteur)}
      data-galerie-lancer={String(entree.exercice)}
      data-lancement="parent"
      data-journalise={LANCEMENT_PARENT.journalise ? 'oui' : 'non'}
      onClick={() => surLancer(entree, LANCEMENT_PARENT)}
      title={entree.titre}
      style={{
        display: 'grid',
        gap: '0.125rem',
        textAlign: 'left',
        inlineSize: '100%',
        // `var(--cible-min)` (64 px) — même convention que les dix tuiles d'écran juste au-dessus
        // (`ecrans.map`) et non les `3rem` (48 px) d'un premier jet : Q7 (« aucune cible sous
        // 64 px ») audite les boutons du dépôt sans distinguer zone parent ou enfant, et rien
        // ne justifiait d'y déroger ici pour gagner 16 px.
        minBlockSize: 'var(--cible-min)',
        padding: '0.4rem 0.6rem',
        fontSize: '0.8rem'
      }}
    >
      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entree.titre}
      </strong>
      <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--texte-secondaire)' }}>
        {String(entree.moteur)}
      </span>
    </button>
  );
}

interface EcranAVisiter {
  readonly nom: string;
  /** Le `data-ecran` attendu — même convention que `EcranQA.attendu` de `recettesDEcrans()`. */
  readonly attendu: string;
  readonly note: string;
  readonly aller: () => void;
}

export function VisiteDesEcrans({
  profil,
  surAllerProfils,
  surAllerCarte,
  surAllerOuverture,
  surAllerCampement,
  surAllerCoffre,
  surAllerReglagesLecture,
  surAllerCodeParent,
  surAllerChoixProfilParent,
  surAllerDashboard,
  surAllerGalerieParent,
  surLancerExercice,
  surFermerLaVisite
}: ProprietesVisiteDesEcrans): ReactElement {
  const galerie = useQuery({
    queryKey: ['parent', 'galerie', String(profil.id)],
    queryFn: () => lireGalerieParent(profil.id)
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════════════════
   * LE FILTRE — R20, « tout tient dans l'écran, sauf là où une règle des specs l'interdit ».
   *
   * Mesuré sur `<GalerieExercices>` (le composant de la galerie parent existante, réutilisé au
   * premier jet de ce lot) : 76 fiches complètes + les deux tables de croisement R12/R13 =
   * **15 670 px** de défilement vertical à 1200 px de haut. La galerie parent (`dashboard`,
   * `galerie-parent`) en est exemptée — « une console d'administration que le père ouvre au
   * clavier », `tests/qualite/mise-en-page-tablette.spec.ts` le dit noir sur blanc — mais LA
   * VISITE N'EST PAS CETTE CONSOLE : « me donner des pages […] pour faire des retours » (le
   * père) décrit un outil de REVUE, pas un tableau de bord. Vingt écrans de défilement pour
   * retrouver un exercice précis parmi 76 auraient rendu l'outil de revue lui-même pénible à
   * réviser — exactement le défaut que ce lot existe pour éviter.
   *
   * Le remède n'est PAS de cacher les 76 (ils restent tous atteignables, contrat de sortie du
   * lot : 86 pages, inchangé) : c'est de ne montrer AUCUN résultat tant que le père n'a rien
   * demandé, et de rendre chaque résultat en une ligne compacte plutôt qu'en fiche complète —
   * la même donnée que `FicheExercice` (`data-galerie-moteur`, `data-galerie-habillage` sont
   * déjà dans le catalogue), juste pas la même mise en page. Un moteur filtre au moins un
   * exercice, une recherche filtre par titre ; les deux se combinent.
   *
   * Les deux tables R12/R13 de `GalerieExercices` (« combien de jeux par compétence », « combien
   * de décors par jeu ») ne sont PAS reprises ici : elles répondent à une question de COUVERTURE
   * du catalogue, pas de revue d'un exercice précis, et restent à un tap — l'onglet « Les
   * exercices » du dashboard, ou la galerie plein écran, tous deux atteignables depuis les
   * dix écrans juste en dessous.
   * ═══════════════════════════════════════════════════════════════════════════════════════════
   */
  const [recherche, definirRecherche] = useState('');
  const [moteurChoisi, definirMoteurChoisi] = useState<string | null>(null);
  const [voirTout, definirVoirTout] = useState(false);

  const moteurs = useMemo(
    () => [...new Set((galerie.data?.entrees ?? []).map((entree) => String(entree.moteur)))].sort(),
    [galerie.data]
  );

  const resultats = useMemo(() => {
    const toutes = galerie.data?.entrees ?? [];
    const q = recherche.trim().toLowerCase();
    if (q === '' && moteurChoisi === null && !voirTout) return [];
    return toutes.filter((entree) => {
      if (moteurChoisi !== null && entree.moteur !== moteurChoisi) return false;
      if (q !== '' && !entree.titre.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [galerie.data, recherche, moteurChoisi, voirTout]);

  const filtreActif = recherche.trim() !== '' || moteurChoisi !== null || voirTout;

  /**
   * L'APERÇU — UNE seule ligne, TOUJOURS montée, même sans filtre.
   *
   * Pas une question de mise en page : `tests/modele/modele-navigation.ts` déclare
   * `visite-parent → noeud` avec la prise `[data-galerie-lancer]`, et cette prise est vérifiée
   * DEPUIS UN ARRIVÉE FRAÎCHE sur l'écran — sans qu'aucun filtre n'ait été touché
   * (`tests/composants/exploration-modele.test.tsx`, la passe des transitions déclarées). Si le
   * lancement d'exercice restait entièrement caché tant qu'aucun filtre n'est choisi, la prise
   * déclarée serait absente du DOM et ce garde-là rougirait — j'ai le droit de rendre la page
   * compacte, pas de faire disparaître un mécanisme que le modèle atteste.
   *
   * Un seul exercice, le premier du catalogue (`construireCatalogue` le trie par identifiant —
   * ordre STABLE, indépendant de la machine), habillé et légendé pour ne pas paraître arbitraire.
   * Son coût en hauteur est celui d'UNE ligne, pas de 76.
   */
  const apercu = filtreActif ? null : (galerie.data?.entrees[0] ?? null);

  // Les 11 écrans nommés de `recettesDEcrans()` — mêmes noms, même `attendu`, mesurés en tête
  // de fichier. `chargement` en est exclu par `recettesDEcrans()` elle-même (voir l'en-tête) ;
  // `noeud` et `recompense` ne figurent pas ici en tant qu'entrées SÉPARÉES : on les atteint en
  // lançant n'importe lequel des exercices ci-dessous, ce qui est le chemin réel de l'enfant
  // ET du parent (R30), pas une navigation inventée pour ce lot.
  const ecrans: readonly EcranAVisiter[] = useMemo(
    () => [
      {
        nom: 'Accueil — choix du joueur',
        attendu: 'profils',
        note: 'Le tout premier écran. Une carte par profil, plus la porte parent en pied.',
        aller: surAllerProfils
      },
      {
        nom: 'Carte du monde',
        attendu: 'carte',
        note: `Les six régions. Ouvre avec le profil de ${profil.prenom}.`,
        aller: surAllerCarte
      },
      {
        nom: 'Séquence d’ouverture',
        attendu: 'ouverture',
        note: 'Le récit de la Pierre, 5 panneaux. Rejouable depuis le campement.',
        aller: surAllerOuverture
      },
      {
        nom: 'Campement',
        attendu: 'campement',
        note: 'Le hub : 30 points, Gobi, les compagnons.',
        aller: surAllerCampement
      },
      {
        nom: 'Coffre',
        attendu: 'coffre',
        note: 'Les trois collections (formes de Gobi, objets, compagnons).',
        aller: surAllerCoffre
      },
      {
        nom: 'Réglages de lecture',
        attendu: 'reglages-lecture',
        note: 'La typographie par profil : corps, police, interlettrage.',
        aller: surAllerReglagesLecture
      },
      {
        nom: 'Porte de la zone parent',
        attendu: 'code-parent',
        note: 'Le pavé de code — ouverture ou définition, selon ce que le foyer a déjà posé.',
        aller: surAllerCodeParent
      },
      {
        nom: 'Choix du joueur à suivre',
        attendu: 'choix-profil-parent',
        note: 'Ce que voit un parent qui entre par la porte du pied de l’accueil, sans profil.',
        aller: surAllerChoixProfilParent
      },
      {
        nom: 'Suivi parent (dashboard)',
        attendu: 'dashboard',
        note: 'Latence, confusions, couverture, relecture, réglages.',
        aller: surAllerDashboard
      },
      {
        nom: 'Galerie parent — plein écran',
        attendu: 'galerie-parent',
        note: 'Le même catalogue que ci-dessous, en page entière.',
        aller: surAllerGalerieParent
      }
    ],
    [
      profil.prenom,
      surAllerProfils,
      surAllerCarte,
      surAllerOuverture,
      surAllerCampement,
      surAllerCoffre,
      surAllerReglagesLecture,
      surAllerCodeParent,
      surAllerChoixProfilParent,
      surAllerDashboard,
      surAllerGalerieParent
    ]
  );

  return (
    <main
      data-ecran="visite-parent"
      style={{
        padding: '2rem',
        display: 'grid',
        gap: '2rem',
        maxInlineSize: '64rem',
        marginInline: 'auto'
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <h1 className="titre" style={{ fontSize: '2rem', margin: 0 }}>
          Visite des écrans
        </h1>
        <button type="button" className="cible cible-secondaire" onClick={surFermerLaVisite}>
          Fermer la visite
        </button>
      </header>

      <p style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
        Ouvre n’importe quel écran ou n’importe quel exercice pour donner tes retours de design.
        Rien de ce que tu joues ici n’entre dans le suivi de {profil.prenom} —{' '}
        <strong>rien n’est journalisé</strong>. Un bandeau « retour à la visite » reste
        atteignable sur chaque page que tu ouvres.
      </p>

      <section aria-labelledby="visite-titre-ecrans">
        <h2 id="visite-titre-ecrans" style={{ fontSize: '1.5rem', margin: '0 0 0.25rem' }}>
          Les écrans ({ecrans.length})
        </h2>
        <p style={{ margin: '0 0 1rem', color: 'var(--texte-secondaire)', fontSize: '0.9rem' }}>
          « chargement » n’est pas proposé : c’est un instant d’attente avant le premier rendu,
          jamais une page qu’on visite — <code>recettesDEcrans()</code> l’exclut aussi. « nœud »
          et « récompense » s’ouvrent en lançant un exercice ci-dessous.
        </p>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))'
          }}
        >
          {ecrans.map((ecran) => (
            <li key={ecran.attendu}>
              <button
                type="button"
                className="cible"
                data-visite-ecran={ecran.attendu}
                onClick={ecran.aller}
                style={{
                  display: 'grid',
                  gap: '0.25rem',
                  textAlign: 'left',
                  inlineSize: '100%',
                  minBlockSize: 'var(--cible-min)'
                }}
              >
                <strong>{ecran.nom}</strong>
                <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>{ecran.note}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="visite-titre-exercices" data-indicateur="visite-galerie-compacte">
        <h2 id="visite-titre-exercices" style={{ fontSize: '1.5rem', margin: '0 0 0.25rem' }}>
          Les exercices ({galerie.data?.entrees.length ?? '…'})
        </h2>
        <p style={{ margin: '0 0 1rem', color: 'var(--texte-secondaire)', fontSize: '0.9rem' }}>
          Choisis un jeu ou tape un titre pour les voir — rien ne s’affiche avant, pour que cette
          page tienne dans l’écran (R20) au lieu d’imposer vingt écrans de défilement.
        </p>

        {galerie.isPending ? <p style={{ margin: 0 }}>On rassemble les exercices…</p> : null}
        {galerie.isError ? (
          <div className="zone-lecture" style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
            <p style={{ margin: 0 }}>
              Les exercices n’arrivent pas. Vérifie que la Pierre tourne, puis réessaie.
            </p>
            <button type="button" className="cible" onClick={() => void galerie.refetch()}>
              Réessayer
            </button>
          </div>
        ) : null}

        {galerie.data === undefined ? null : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Pas de `<label>`+texte masqué : ce projet ne porte aucune classe
                  d'occultation visuelle (`visually-hidden` n'existe nulle part ailleurs dans
                  `client/src/styles/`, vérifié avant d'écrire). `aria-label` direct plutôt que
                  d'en introduire une pour un seul champ. */}
              {/*
               * ⚠ R16, TROUVÉ EN AUDITANT LES OBJETS APRÈS COUP, PAS EN LE SUPPOSANT.
               *
               * `.cible` porte `min-block-size`/`min-inline-size: var(--cible-min)` (64 px,
               * `global.css:284`) — mais `<input>` et `<select>`, eux, ne portent PAS cette
               * classe : rien ne les a jamais mesurés. `parcours-audit-tout-le-site.spec.ts` l'a
               * fait, sortie citée : l'entrée mesurait 224×36 px, le sélecteur 137×35 px, tous
               * deux sous les 64 px de R16 — et la même cause remontait quatre fois (deux
               * parcours × deux invariants) pour une seule racine. `var(--cible-min)` en dur ici,
               * jamais une valeur recopiée : c'est la MÊME convention que porte déjà `.cible`,
               * pas une seconde qui pourrait diverger d'elle.
               */}
              <input
                type="search"
                aria-label="Chercher un exercice par titre"
                data-visite-recherche-exercice
                placeholder="Chercher un titre…"
                value={recherche}
                onChange={(evenement) => {
                  definirRecherche(evenement.target.value);
                }}
                style={{
                  fontSize: '0.9rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--grisaille)',
                  minInlineSize: '14rem',
                  minBlockSize: 'var(--cible-min)'
                }}
              />

              <button
                type="button"
                className="cible cible-secondaire"
                aria-pressed={voirTout}
                data-visite-filtre-moteur="tous"
                onClick={() => {
                  definirMoteurChoisi(null);
                  definirVoirTout(true);
                }}
                style={{
                  fontSize: '0.8rem',
                  paddingBlock: '0.35rem',
                  paddingInline: '0.75rem',
                  fontWeight: voirTout ? 'bold' : 'normal'
                }}
              >
                Tous ({galerie.data.entrees.length})
              </button>

              {/**
                * UN SÉLECTEUR, PAS QUATORZE BOUTONS — mesuré, pas décoratif.
                *
                * `.cible` (donc `.cible-secondaire`, qui n'en change que la couleur) impose
                * `min-block-size: var(--cible-min)` = 64 px, la même règle que les dix tuiles
                * d'écran plus haut. Quatorze puces de 64 px de haut, dans le conteneur de
                * 64 rem de ce fichier, se seraient réparties sur trois lignes — environ 200 px
                * de plus que ce menu, pour la MÊME matière (`data-galerie-moteur`, dérivée du
                * catalogue, jamais tapée à la main). Une seule ligne, un seul contrôle natif.
                */}
              <select
                aria-label="Filtrer par jeu"
                data-visite-filtre-moteur-select
                value={moteurChoisi ?? ''}
                onChange={(evenement) => {
                  definirVoirTout(false);
                  definirMoteurChoisi(evenement.target.value === '' ? null : evenement.target.value);
                }}
                style={{
                  fontSize: '0.9rem',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--grisaille)',
                  // R16 — voir la note au-dessus de `<input type="search">` : même défaut, même
                  // remède, la même convention partagée plutôt qu'une valeur en dur.
                  minInlineSize: '8rem',
                  minBlockSize: 'var(--cible-min)'
                }}
              >
                <option value="">Filtrer par jeu…</option>
                {moteurs.map((moteur) => (
                  <option key={moteur} value={moteur} data-galerie-moteur={moteur}>
                    {moteur} ({galerie.data.entrees.filter((entree) => entree.moteur === moteur).length})
                  </option>
                ))}
              </select>

              {!filtreActif ? null : (
                <button
                  type="button"
                  className="cible cible-secondaire"
                  onClick={() => {
                    definirRecherche('');
                    definirMoteurChoisi(null);
                    definirVoirTout(false);
                  }}
                  style={{ fontSize: '0.8rem', paddingBlock: '0.35rem', paddingInline: '0.75rem' }}
                >
                  Effacer
                </button>
              )}
            </div>

            {apercu === null ? null : (
              <div style={{ display: 'grid', gap: '0.25rem' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--texte-secondaire)' }}>
                  Aperçu — choisis un jeu ou tape un titre ci-dessus pour voir les{' '}
                  {galerie.data.entrees.length} exercices :
                </p>
                <div style={{ maxInlineSize: '20rem' }}>
                  <BoutonExercice entree={apercu} surLancer={surLancerExercice} />
                </div>
              </div>
            )}

            {filtreActif && resultats.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--texte-secondaire)', fontSize: '0.9rem' }}>
                Aucun exercice ne correspond.
              </p>
            ) : null}

            {resultats.length === 0 ? null : (
              <ul
                data-visite-resultats={String(resultats.length)}
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gap: '0.5rem',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(11rem, 1fr))'
                }}
              >
                {resultats.map((entree) => (
                  <li key={String(entree.exercice)}>
                    <BoutonExercice entree={entree} surLancer={surLancerExercice} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
