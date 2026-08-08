// Le campement — le hub, v2 § 3.4. Lot L2-F.
//
// « Hub central, à la Adibou. On y revient entre les sorties. Éléments cliquables : la tente,
// le feu, la carte, le coffre, le mur des noms, le chaudron, la lunette, et une trentaine
// d'objets de décor sans autre fonction que de réagir quand on les touche. »
//
// **CET ÉCRAN EST LA PRISE DE R11.** Les points d'interaction ne sont pas écrits ici : ils sont
// déclarés dans `contenu/monde/campement.json`, mesurés par `auditerCampement`, et rendus un par
// un par `PointLibre`. Ajouter un point ne demande pas une ligne de code — c'est la même règle
// que « zéro ligne de code pour ajouter un habillage » (v2 § 7), appliquée au décor du hub.
//
// Trois règles portées ici :
//   1. **Rien ne se rate au campement.** Aucun `data-etat="echec"`, aucun compte, aucune étoile.
//   2. **Rien n'est caché.** Un compagnon non rallié, un objet non rapporté : visibles et gris.
//      « Un monde à moitié colorié appelle qu'on le termine » (v2 § 3.2).
//   3. **Jamais d'écran vide.** Tant que le monde n'est pas arrivé, le campement affiche son
//      décor et ses points ; c'est le monde qui est optionnel, pas le décor.
import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { EtatMonde, IdNoeud, PointInteraction } from '@pierre/partage';
import {
  campementDuDocument, prochainStade, stadesDuDocument
} from '@pierre/partage/monde';
// `DocumentCampement` et `StadeGobi` viennent du SOUS-CHEMIN : le barillet racine ne réexporte
// que les seize types du § 4.5 (convention C1), et `DocumentCampement` n'en fait pas partie.
import type { DocumentCampement, StadeGobi } from '@pierre/partage/monde';
import { lireMonde, lirePaquetNoeud, urlAsset } from '../api/client.js';
import { Compagnon } from '../composants/Compagnon.js';
import { Gobi } from '../composants/Gobi.js';
import { useEtatJeu, useMagasin } from '../etat/services.js';
import { Chaudron } from '../monde/Chaudron.js';
import { MurDesNoms } from '../monde/MurDesNoms.js';
import type { NomDuMur } from '../monde/MurDesNoms.js';
import { PastilleSortie } from '../monde/PastilleSortie.js';
import { PointLibre } from '../monde/PointLibre.js';
// La table des noms de région vit dans `EcranCoffre.tsx` — l'autre écran de ce même lot. Elle
// n'est pas hissée dans un module commun parce qu'aucun lot du contrat du monde v4 ne possède
// `client/src/monde/` : un lot ne s'accorde pas un fichier qu'un autre pourrait écrire. Sa
// place définitive est le référentiel des régions (M2), et c'est consigné en question ouverte.
import { NOM_DE_REGION } from './EcranCoffre.js';

export interface ProprietesEcranCampement {
  /** Le référentiel du campement. Injecté par les tests ; chargé sinon. */
  readonly campement?: DocumentCampement | null;
  /** Le monde du profil. Injecté par les tests ; chargé sinon. */
  readonly monde?: EtatMonde | null;
  /** La table des stades. Injectée par les tests ; chargée sinon. */
  readonly stades?: readonly StadeGobi[] | null;
  readonly surAllerCarte?: () => void;
  readonly surAllerCoffre?: () => void;
  /**
   * ── R25 — LE CHAUDRON NE MIJOTAIT PAS, IL N'ÉTAIT PAS BRANCHÉ ──────────────────────────────
   *
   * « Le chaudron dans le campement devrait fonctionner directement, je ne sais pas ce qu'il
   * attend, ce qu'il mijote. »
   *
   * Il attendait un rappel que **personne ne lui donnait**. `surOuvrirChaudron` était déclaré
   * ici, relayé jusqu'au bouton de `Chaudron.tsx`, et absent de `HoteCampement` dans le
   * routeur : le composant retombait alors sur son message d'attente, « Le chaudron mijote
   * encore » — la phrase même que le père a lue.
   *
   * Recensé par objet plutôt que par occurrence (`bac-a-sable/rappels-morts/auditer.mjs`), ce
   * défaut n'était pas isolé : **7 rappels optionnels sur 27 ne sont fournis nulle part**, et
   * le père en a trouvé deux en jouant. Le bouton s'affiche, il se désactive même proprement,
   * et rien ne signale qu'il ne mène à rien.
   *
   * Ce rappel devient donc un OVERRIDE de test, plus un prérequis : l'écran sait ouvrir le
   * chaudron tout seul, comme `EcranCarte` sait entrer dans un nœud. La destination vient du
   * contenu (`campement.coloriageLibre`), jamais d'ici.
   */
  readonly surOuvrirChaudron?: (noeud: IdNoeud) => void;
  /**
   * Rejoue la séquence d'ouverture — D35, point 3.
   *
   * Le rappel vient du routeur, qui est le seul à connaître `CHEMINS.ouverture` (lot N4,
   * contrat v3 § 6.2 : `routeur.tsx` appartient à N4). Tant que N4 ne l'a pas câblé, le bouton
   * n'est simplement pas rendu : un bouton qui ne mènerait nulle part serait pire que son
   * absence, et ce lot refuse d'en poser un.
   */
  readonly surRejouerOuverture?: () => void;
}

/** `0 0 1200 800` → `[1200, 800]`. Retombe sur le gabarit par défaut si la chaîne est illisible. */
function dimensions(viewBox: string): readonly [number, number] {
  const morceaux = viewBox.trim().split(/\s+/u).map(Number);
  const largeur = morceaux[2];
  const hauteur = morceaux[3];
  return Number.isFinite(largeur) && Number.isFinite(hauteur) && largeur! > 0 && hauteur! > 0
    ? [largeur!, hauteur!]
    : [1200, 800];
}

async function chargerJson(chemin: string): Promise<unknown> {
  const reponse = await fetch(urlAsset(chemin), { headers: { Accept: 'application/json' } });
  if (!reponse.ok) {
    throw new Error(`Contenu introuvable : ${chemin} (réponse ${String(reponse.status)}).`);
  }
  return (await reponse.json()) as unknown;
}

export function EcranCampement({
  campement: campementInjecte = null,
  monde: mondeInjecte = null,
  stades: stadesInjectes = null,
  surAllerCarte,
  surAllerCoffre,
  surOuvrirChaudron,
  surRejouerOuverture
}: ProprietesEcranCampement = {}): ReactElement {
  const magasin = useMagasin();
  const profil = useEtatJeu((etat) => etat.profil);
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);

  const requeteCampement = useQuery({
    queryKey: ['monde', 'campement'],
    queryFn: async () => campementDuDocument(await chargerJson('monde/campement.json')),
    enabled: campementInjecte === null
  });

  const requeteStades = useQuery({
    queryKey: ['monde', 'stades'],
    queryFn: async () => stadesDuDocument(await chargerJson('monde/gobi-stades.json')),
    enabled: stadesInjectes === null
  });

  const requeteMonde = useQuery({
    queryKey: ['monde', profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) {
        throw new Error('Monde demandé sans profil choisi.');
      }
      return lireMonde(profil.id);
    },
    enabled: mondeInjecte === null && profil !== null
  });

  const campement = campementInjecte ?? requeteCampement.data ?? null;
  const monde = mondeInjecte ?? requeteMonde.data ?? null;
  const stades = stadesInjectes ?? requeteStades.data ?? [];

  // R27 — le catalogue des formes et `construireEtagere` ont suivi l'étagère au coffre. Les
  // garder ici aurait laissé un téléchargement et un calcul dont plus rien ne se sert : du code
  // mort qui porte un nom, exactement ce que le recensement des rappels vient de traquer.

  const points: readonly PointInteraction[] = campement?.points ?? [];
  const [largeurScene, hauteurScene] = dimensions(campement?.scene.viewBox ?? '0 0 1200 800');

  /**
   * R25 — LE CHAUDRON OUVRE SON NŒUD, ET IL SAIT LE FAIRE SEUL.
   *
   * Même geste que `EcranCarte.entrer` : on lit le paquet, on le donne au magasin, et le
   * routeur suit — il est le miroir de l'écran, pas son maître. C'est pour ça qu'aucune route
   * n'est nommée ici, et que rien ne casse si un hôte n'injecte rien.
   *
   * `surOuvrirChaudron` reste accepté en OVERRIDE — c'est ainsi que les recettes l'observent
   * sans traverser le réseau. Il n'est plus un prérequis : c'est justement de l'avoir été qui
   * laissait le bouton inerte.
   *
   * Rendu `undefined` quand le contenu ne déclare aucun nœud libre : `Chaudron` retombe alors
   * sur son message calme, jamais sur un écran d'erreur (R14).
   */
  const noeudLibre = campement?.coloriageLibre ?? null;
  const ouvrirLeChaudron = useCallback(() => {
    if (noeudLibre === null) {
      return;
    }
    if (surOuvrirChaudron !== undefined) {
      surOuvrirChaudron(noeudLibre);
      return;
    }
    void lirePaquetNoeud(noeudLibre).then((paquet) => {
      magasin.getState().demarrerNoeud(paquet);
    });
  }, [magasin, noeudLibre, surOuvrirChaudron]);

  /** Le mur des noms est bâti sur les formes de Gobi — voir la note PLACEHOLDER de `MurDesNoms`. */
  const noms: readonly NomDuMur[] = useMemo(
    () =>
      (monde?.gobi.formes ?? []).map((forme) => ({
        texte: String(forme.grapheme),
        libelle: forme.libelle,
        obtenuLe: forme.obtenueLe
      })),
    [monde]
  );

  const stade = monde?.gobi.stade ?? 'oeuf';
  const formeActive = monde?.gobi.formes.find(
    (forme) => forme.grapheme === monde.gobi.formeActive
  );
  const suivant = useMemo(
    () =>
      monde === null || stades.length === 0 ? null : prochainStade(monde.gobi, stades),
    [monde, stades]
  );

  // « On le rencontre à clairiere. » — c'est ce que cet écran écrivait, en rendant le CODE de
  // la région. Un identifiant technique n'est pas un mot : sans accent, sans majuscule, avec
  // des tirets, c'est exactement la chaîne qu'un lecteur de CE1 ne peut pas déchiffrer.
  const libelleRegion = useCallback(
    (code: string): string | undefined =>
      monde?.carte.regions.find((region) => String(region.region) === code) === undefined
        ? undefined
        : (NOM_DE_REGION[code] ?? code),
    [monde]
  );

  return (
    <main
      data-ecran="campement"
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      {/* ── LES SORTIES DU CAMPEMENT — R18 : ça se comprend sans lire ────────────────────────
          Le père n'a pas compris le campement. Le défaut mesuré n'était pas le décor, c'était
          la barre du haut : trois mots posés côte à côte, sans image, dans la police de lecture.
          Chaque destination porte désormais un PICTOGRAMME de 2,75 rem au-dessus de son mot —
          `data-pictogramme` le rend comptable, et `parcours-campement-sans-texte.spec.ts`
          échoue si une seule destination en manque. Le mot reste, pour l'adulte et pour le
          lecteur d'écran ; il n'est plus la seule prise. */}
      <header
        data-campement-sorties="oui"
        style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}
      >
        <h1 className="titre" style={{ fontSize: '2.25rem', margin: 0 }}>
          Le campement
        </h1>

        {/* D46 : le campement n'est JAMAIS sur le chemin obligatoire. On en repart en un tap. */}
        {profil === null ? null : <PastilleSortie profil={profil} style={{ inlineSize: '11rem' }} />}

        <button
          type="button"
          className="cible"
          data-vers="carte"
          data-pictogramme="carte"
          aria-label="Ouvrir la carte du monde"
          onClick={() => {
            if (surAllerCarte === undefined) {
              magasin.getState().naviguer('carte');
            } else {
              surAllerCarte();
            }
          }}
          style={{ flexDirection: 'column', gap: '0.35rem', inlineSize: '11rem' }}
        >
          <span aria-hidden="true" style={{ fontSize: '2.75rem', lineHeight: 1 }}>
            🗺️
          </span>
          <span>La carte</span>
        </button>

        <button
          type="button"
          className="cible"
          data-vers="coffre"
          data-pictogramme="coffre"
          aria-label="Ouvrir le coffre aux collections"
          onClick={surAllerCoffre}
          style={{ flexDirection: 'column', gap: '0.35rem', inlineSize: '11rem' }}
        >
          <span aria-hidden="true" style={{ fontSize: '2.75rem', lineHeight: 1 }}>
            🧰
          </span>
          <span>Le coffre</span>
        </button>

        {/* D35, point 3 : l'histoire du début se rejoue à volonté, et seulement d'ici — jamais
            imposée une seconde fois. Le rappel vient du routeur (N4) ; sans lui, pas de bouton. */}
        {surRejouerOuverture === undefined ? null : (
          <button
            type="button"
            className="cible"
            data-vers="ouverture"
            data-pictogramme="ouverture"
            aria-label="Revoir l’histoire du début"
            onClick={surRejouerOuverture}
            style={{ flexDirection: 'column', gap: '0.35rem', inlineSize: '11rem' }}
          >
            <span aria-hidden="true" style={{ fontSize: '2.75rem', lineHeight: 1 }}>
              📖
            </span>
            <span>Revoir l’histoire</span>
          </button>
        )}
      </header>

      {/* ── R20 — LA LARGEUR ÉTAIT PERDUE, ET C'EST ELLE QUI MANQUAIT ─────────────────────
          « sur une tablette il y a largement de la place et il y a besoin de scroller alors
          qu'il n'y a pas besoin, et clairement c'est pas bien placé. »

          Mesuré au campement, profil de la QA chargé : 1 815 px de contenu dans un cadre de
          1 200, soit 615 px à faire défiler. Le détail par bloc disait où :

              header 144 · scène 8 · Gobi 253 · étagère 298 · rapporté 246
              mur des noms 110 · chaudron 243 · compagnons 297

          Aucun bloc n'était trop grand. Ils étaient huit, EMPILÉS EN UNE SEULE COLONNE sur un
          écran large de 1 920 px : la moitié de la tablette ne servait à rien. Le défaut
          n'était pas une hauteur, c'était une largeur inutilisée — et c'est exactement ce que
          le père décrivait.

          `auto-fit` et non un nombre de colonnes en dur : la tablette est en paysage, mais le
          jeu se sert aussi en portrait et sur un écran de bureau. Une seule colonne reste
          possible quand la place manque, et rien n'est jamais coupé. */}
      <div
        data-campement-grille="oui"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(30rem, 1fr))',
          gap: '1.5rem',
          alignContent: 'start',
          alignItems: 'start'
        }}
      >
        {/* ── le décor et ses points d'interaction : la prise de R11 ───────────────────────

            `maxBlockSize` mesuré, pas choisi, à l'origine : sans borne, le décor prenait 405 px
            dans sa colonne et poussait toute la grille. Il faisait 8 px AVANT R20 (`aspect-ratio`
            ne s'appliquait pas dans la colonne souple d'alors) : le borner l'a rendu visible ET
            tenu, mais ce n'était pas encore la bonne mesure du bon obstacle.

            R20 avait aussi mesuré la pleine largeur, et l'avait rejetée : « 1 862 px contre
            1 578 — il gagne alors une rangée à lui seul. » CETTE MESURE ÉTAIT JUSTE, ET ELLE
            L'EST RESTÉE. Le 2026-08-07 j'ai cru le contraire — une reproduction isolée du bloc
            CSS (`bac-a-sable/r40-campement/harnais.html`) laissait penser que R27 (étagère de
            Gobi partie au coffre, -298 px) avait éteint le problème. Une simulation par mutation
            de style en direct l'a semblé confirmer : 0 px de débordement annoncés. **Construit
            pour de vrai, le débordement était de 820 px** — la mesure de R20 était juste, la
            mienne mesurait un DOM que le navigateur n'aurait jamais construit depuis le code.
            Leçon qui dépasse ce fichier : une CSS poussée à l'exécution ne reproduit pas une CSS
            écrite dans la source, dès qu'une grille recalcule ses pistes. Seul le build fait foi.

            Décomposé (recalcul de grille sur des mesures réelles, cross-validé à 4 px près
            contre les 820 mesurés) : CE N'ÉTAIT PAS LE DÉCOR QUI COÛTAIT CHER. Dans sa colonne,
            sa rangée partagée avec Gobi et le butin faisait déjà 392 px, gouvernée par le
            butin (« Ce que tu as rapporté ») — le décor, à 380 px, n'y ajoutait RIEN. En pleine
            largeur il perd ce partage et expose sa hauteur entière (768-800 px, calculée depuis
            la largeur de grille réelle et `largeurScene`/`hauteurScene`) : `débordement(paysage)
            = H + 20 px`, formule vérifiée exacte sur H = 800 → 820.

            ── R40 — LE CADRE ET L'IMAGE AVAIENT DEUX RAPPORTS DIFFÉRENTS ────────────────────
            « pour le campement, l'image ne remplit pas la largeur, et du coup le tour noir et
            les petits carrés jaunes qui clignotent ne correspondent pas à l'image. »

            Cause, mesurée dans `bac-a-sable/r40-campement/harnais.html` (reproduction isolée
            de ce même bloc CSS, écarts cités en pixels — ce constat-là ne dépendait d'aucune
            grille et reste valide) : `inlineSize: '100%'` fixait une largeur DÉFINIE,
            indépendante de `maxBlockSize`. `aspect-ratio` calculait alors une hauteur que
            `maxBlockSize` écrêtait sans jamais revenir corriger la largeur — le cadre prenait
            un rapport 4,53 pour un décor à 1,5, `background-size: contain` lettrait l'image de
            403 px de chaque côté, et un point à 620 px dans le décor (le chaudron) se
            retrouvait projeté à 334 px de sa cible réelle.

            Poser `inlineSize`/`blockSize` à `auto` laisse le NAVIGATEUR résoudre `aspect-ratio`
            conjointement avec `maxInlineSize` — c'est l'algorithme natif de « letterbox fit »,
            le même qui régit un `<img>` sous contrainte de ses axes. Le cadre ne peut alors PLUS
            avoir un rapport différent de `largeurScene / hauteurScene`. Mesuré après correctif,
            mêmes trois points : écart maximal 2,9 px, contre 387 px avant — au repos, dans le
            halo de 6 px du toucher (R11, ligne 138 de `PointLibre.tsx`).

            ── R40 — PLEINE LARGEUR, POUR DE VRAI CETTE FOIS ─────────────────────────────────
            « c'est tout petit, ça devrait prendre toute la largeur de la page » — le père, en
            revoyant le campement à 380 px de haut. Le chiffrage ci-dessus a désigné le butin
            (392 px, seul panneau à gouverner la rangée que le décor quittait) plutôt que Gobi
            ou le mur des noms (0 px d'économie chacun, ils ne dominaient déjà pas leur rangée).
            Le père a tranché : « déplace le butin dans le coffre, ce n'est pas grave le
            défilement dans cet écran. » Il y est déjà — voir plus bas dans ce fichier, avant
            la section Gobi — même donnée, même dessin, vérifié avant d'écrire.

            `grid-column: 1 / -1` — LE MÊME mécanisme que « La bande » plus bas dans ce fichier,
            une seule façon de sortir un enfant de `data-campement-grille`. Plus de
            `maxBlockSize` : `maxInlineSize: '1200px'` (résolution native de `campement.svg`)
            et `aspect-ratio` suffisent seuls, sans second maximum concurrent.

            LE DÉFILEMENT EST ACCEPTÉ ICI, PAR LE PÈRE, POUR CET ÉCRAN SEULEMENT — ce n'est
            **pas** une dette qui traîne : `tests/qualite/mise-en-page-tablette.spec.ts` porte
            l'exemption nommée (même mécanisme que `dashboard`/`galerie-parent`), tenue par la
            campagne QA, pas par ce fichier. L'AUTRE grief de R20 reste, lui, sans exception :
            aucune commande du campement ne doit devenir hors d'atteinte — voir le contrat de
            sortie du lot qui a posé ce commentaire pour la mesure qui le prouve. Et le
            recouvrement entre points, lui, s'éteint pour de bon dès que le décor dépasse
            640 px de large (`1200 × 64 / 120`, écart minimal entre deux zones de
            `campement.json`) : la pleine largeur (1 152-1 200 px) le dépasse largement, quelle
            que soit la hauteur — ce grief-là ne demandait que la largeur, jamais la hauteur. */}
        <div
        data-scene="campement"
        data-points={String(points.length)}
        style={{
          position: 'relative',
          inlineSize: 'auto',
          blockSize: 'auto',
          maxInlineSize: '1200px',
          aspectRatio: `${String(largeurScene)} / ${String(hauteurScene)}`,
          backgroundImage:
            campement === null ? 'none' : `url(${urlAsset(String(campement.scene.fichier))})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundColor: 'var(--parchemin)',
          borderRadius: 'var(--rayon-carte)',
          // ── LA CASE DE BD (M8) ────────────────────────────────────────────────────────
          // Le décor était servi sans cadre : il se fondait dans le fond parchemin de la
          // page, et le campement ressemblait à une image posée sur un document. Cerné du
          // trait et posé sur son ombre en aplat, c'est une CASE — le registre que l'enfant
          // lit déjà dans ses BD (v2 § 9.1). `overflow: hidden` fait suivre le décor au
          // rayon du cadre plutôt que de laisser ses angles dépasser.
          border: 'var(--epaisseur-trait) solid var(--trait)',
          boxShadow: 'var(--ombre-bd)',
          overflow: 'hidden',
          // ── PLEINE LARGEUR — R40, voir le commentaire au-dessus du décor. Même mécanisme
          // que la section « La bande » plus bas : une seule façon de sortir un enfant de
          // `data-campement-grille`, pas deux.
          gridColumn: '1 / -1'
        }}
      >
        {points.map((point) => (
          <PointLibre
            key={point.id}
            point={point}
            largeurScene={largeurScene}
            hauteurScene={hauteurScene}
            animationsDesactivees={animationsDesactivees}
          />
        ))}
      </div>

      {/* ── Gobi, au campement : le stade se VOIT, c'est tout l'intérêt de D28 ───────────

          ── R41 — LE BOUTON « ? GOBI » NE S'AFFICHE PLUS ICI, ET C'EST UNE DÉCISION ────────

          « quand j'appuie sur le bouton "? gobi" ça ne fait rien. » Cause exacte, mesurée :
          cette ligne passait `surDemande={() => undefined}`. Un rappel FOURNI avec du néant —
          invisible au détecteur de rappels morts, qui cherche les rappels non fournis. C'était
          le SEUL de tout `client/src` (recensement par objet, commentaires dépouillés : 1
          rappel de propriété inerte, 5 `.catch` légitimes).

          DEUX ISSUES POSSIBLES, ET VOICI POURQUOI C'EST CELLE-CI.

          Les trois paliers d'aide sont définis RELATIVEMENT À UNE ÉTAPE d'exercice (v2 § 5.4) :
          `indice` = « Gobi relit la consigne », `demonstration` = « la cible s'anime ». Au
          campement il n'y a ni consigne, ni cible, ni étape, ni erreur — il n'y a rien à
          réussir et donc rien à aider. Câbler le bouton ici obligerait à inventer un concept
          d'aide qui n'existe nulle part dans les specs, et à lui écrire des clips que la
          chaîne voix n'a pas produits : le manifeste porte onze répliques `campement/<point>`,
          qui NOMMENT les points du décor (« la carte du monde », « le chaudron à couleurs ») —
          ce sont des étiquettes, pas une aide.

          D42 a déjà arbitré cette forme exacte, pour le bouton « écouter », et son motif vaut
          ici sans changer un mot : « un bouton qui ne répond pas casse la confiance plus
          sûrement qu'un bouton absent ». Le troisième terme — un bouton qui existe et ne
          répond pas — est le pire des trois, et c'est celui qu'on retire.

          CE QUI N'EST PAS PERDU : l'aide n'a jamais vécu ici. Elle est dans les exercices, où
          le bouton est toujours là, jamais grisé, jamais compté (R15), et où R46 vient de la
          rendre lisible ET audible. Gobi reste au campement comme COMPAGNON — c'est son stade
          qu'on y vient voir (D28), pas son aide. */}
      <section className="panneau" aria-label="Gobi">
        <Gobi
          aide={null}
          niveau="aucune"
          surDemande={null}
          stade={stade}
          cristal={formeActive?.cristal ?? null}
          libelleForme={formeActive?.libelle ?? null}
          animation="repos"
          taille={96}
        />
        {suivant === null ? null : (
          // La jauge montre le VIDE restant, jamais seulement l'acquis (D25, point 3).
          <p
            className="zone-lecture"
            data-prochain-stade={suivant.stade.code}
            data-formes-restantes={String(suivant.formesRestantes)}
            style={{ padding: '0.5rem 0.75rem', maxInlineSize: '32rem' }}
          >
            Encore {suivant.formesRestantes} forme(s) et Gobi deviendra « {suivant.stade.libelle} ».
          </p>
        )}
      </section>

      {/* L'étagère : l'album des formes, cases vides comprises (D44). Elle est posée AVANT le
          mur des noms parce qu'elle répond à la question que le mur ne répond pas — « combien
          y en a-t-il en tout ? ». Le mur grave l'acquis, l'étagère montre le reste. */}
      {/* ── R27 — L'ÉTAGÈRE DE GOBI A QUITTÉ LE CAMPEMENT ────────────────────────────────
          « Dans le coffre, il y a aussi les Gobi. Je pense qu'il faut les laisser dans le
          coffre, ça sert à rien de les mettre dans le campement. Dans le coffre, c'est bien. »

          Elle était rendue aux DEUX endroits, à l'identique. Le campement est le hub — ce
          qu'on y fait ; le coffre est l'album — ce qu'on y garde. Une collection montrée deux
          fois ne double pas l'envie, elle dilue le rôle des deux écrans.

          Effet mesuré sur la dette R20, et il est le bienvenu : l'étagère occupait 298 px sur
          les 1 578 du campement, gaps compris. Son retrait n'est pas une correction de mise en
          page — c'en est le résultat, pas la cause. */}

      {/* ── R40 — LE BUTIN A QUITTÉ LE CAMPEMENT, MÊME ARBITRAGE QUE L'ÉTAGÈRE (R27) ──────────
          « Ce que tu as rapporté » vivait ici depuis le lot S5 (six objets, un par région,
          servis par le serveur, dessinés par `DessinButin`). Il vit AUSSI au coffre depuis M8
          (`EcranCoffre.tsx:301`, section « Les objets du campement », même source
          `monde?.campement`, même dessin `DessinButin` — vérifié avant d'écrire cette ligne,
          pas supposé : le coffre le dit lui-même en commentaire, « les deux écrans montrent le
          même objet, jamais deux »). Un panneau à deux endroits identiques, exactement le
          diagnostic de R27 sur l'étagère de Gobi.

          Ce qui a changé cette fois : c'est un CHIFFRAGE, pas une préférence, qui a désigné ce
          panneau. Le décor en pleine largeur débordait de 820 px (mesuré sur le vrai build,
          voir le commentaire du décor plus haut) ; sur les cinq panneaux du campement, seul
          celui-ci gouvernait la rangée que le décor a quittée — 392 px, plus que le décor
          lui-même n'y coûtait. Le retirer libère exactement cette rangée, gratuitement pour
          Gobi et le mur des noms qui la partageaient sans jamais la dominer.

          Rien n'est perdu : le père a tranché lui-même, « déplace le butin dans le coffre » —
          il y est déjà, à l'identique, depuis M8. */}
      <MurDesNoms noms={noms} />

      <Chaudron
        {...(noeudLibre === null ? {} : { surOuvrir: ouvrirLeChaudron })}
        animationsDesactivees={animationsDesactivees}
      />

      <section className="panneau" aria-label="Les compagnons" style={{ gridColumn: '1 / -1' }}>
        <h2 className="panneau-titre" style={{ fontSize: '1.5rem' }}>
          La bande
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {(monde?.compagnons ?? []).map((compagnon) => (
            <Compagnon
              key={compagnon.code}
              compagnon={compagnon}
              libelleRegion={libelleRegion(String(compagnon.region))}
            />
          ))}
        </div>
      </section>
      </div>
    </main>
  );
}
