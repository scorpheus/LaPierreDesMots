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
import { useCallback, useMemo, useState } from "react";
import type { AnimationEvent as AnimationEventReact, CSSProperties, ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EtatMonde, IdNoeud, PointInteraction } from "@pierre/partage";
import { campementDuDocument, prochainStade, stadesDuDocument } from "@pierre/partage/monde";
// `DocumentCampement` et `StadeGobi` viennent du SOUS-CHEMIN : le barillet racine ne réexporte
// que les seize types du § 4.5 (convention C1), et `DocumentCampement` n'en fait pas partie.
import type { DocumentCampement, StadeGobi } from "@pierre/partage/monde";
import { lireMonde, lirePaquetNoeud, noterVisitePointCampement, urlAsset } from "../api/client.js";
import { Compagnon } from "../composants/Compagnon.js";
import { GalerieEvolutionsGobi } from "../composants/GalerieEvolutionsGobi.js";
import { Gobi } from "../composants/Gobi.js";
import { useEtatJeu, useMagasin } from "../etat/services.js";
import { Chaudron } from "../monde/Chaudron.js";
import { MurDesNoms } from "../monde/MurDesNoms.js";
import type { NomDuMur } from "../monde/MurDesNoms.js";
import { PastilleSortie } from "../monde/PastilleSortie.js";
import { PointLibre } from "../monde/PointLibre.js";
import { classeAnimation } from "../monde/animations-campement.js";
import type { AnimationCampement } from "../monde/animations-campement.js";
// La table des noms de région vit dans `EcranCoffre.tsx` — l'autre écran de ce même lot. Elle
// n'est pas hissée dans un module commun parce qu'aucun lot du contrat du monde v4 ne possède
// `client/src/monde/` : un lot ne s'accorde pas un fichier qu'un autre pourrait écrire. Sa
// place définitive est le référentiel des régions (M2), et c'est consigné en question ouverte.
import { NOM_DE_REGION } from "./EcranCoffre.js";
import "../styles/campement.css";

export interface ProprietesEcranCampement {
  /** Le référentiel du campement. Injecté par les tests ; chargé sinon. */
  readonly campement?: DocumentCampement | null;
  /** Le monde du profil. Injecté par les tests ; chargé sinon. */
  readonly monde?: EtatMonde | null;
  /** La table des stades. Injectée par les tests ; chargée sinon. */
  readonly stades?: readonly StadeGobi[] | null;
  readonly surAllerCarte?: () => void;
  readonly surAllerCoffre?: () => void;
  /** Entrée adulte câblée par le routeur quand elle est disponible. */
  readonly surAccesParent?: () => void;
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
  const reponse = await fetch(urlAsset(chemin), { headers: { Accept: "application/json" } });
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
  surAccesParent,
  surOuvrirChaudron,
  surRejouerOuverture,
}: ProprietesEcranCampement = {}): ReactElement {
  const magasin = useMagasin();
  const profil = useEtatJeu((etat) => etat.profil);
  const animationsDesactivees = useEtatJeu((etat) => etat.animationsDesactivees);
  const [objetAnime, fixerObjetAnime] = useState<{
    readonly id: string;
    readonly animation: AnimationCampement;
  } | null>(null);
  const [decouverte, fixerDecouverte] = useState<{
    readonly id: string;
    readonly libelle: string;
  } | null>(null);
  const [ouvertureChaudronEnCours, fixerOuvertureChaudronEnCours] = useState(false);
  const [messageOuvertureChaudron, fixerMessageOuvertureChaudron] = useState<string | null>(null);
  const [evolutionsGobiOuvertes, fixerEvolutionsGobiOuvertes] = useState(false);

  const requeteCampement = useQuery({
    queryKey: ["monde", "campement"],
    queryFn: async () => campementDuDocument(await chargerJson("monde/campement.json")),
    enabled: campementInjecte === null,
  });

  const requeteStades = useQuery({
    queryKey: ["monde", "stades"],
    queryFn: async () => stadesDuDocument(await chargerJson("monde/gobi-stades.json")),
    enabled: stadesInjectes === null,
  });

  const requeteMonde = useQuery({
    queryKey: ["monde", profil === null ? null : String(profil.id)],
    queryFn: () => {
      if (profil === null) {
        throw new Error("Monde demandé sans profil choisi.");
      }
      return lireMonde(profil.id);
    },
    enabled: mondeInjecte === null && profil !== null,
  });

  const campement = campementInjecte ?? requeteCampement.data ?? null;
  const monde = mondeInjecte ?? requeteMonde.data ?? null;
  const stades = stadesInjectes ?? requeteStades.data ?? [];

  // R27 — le catalogue des formes et `construireEtagere` ont suivi l'étagère au coffre. Les
  // garder ici aurait laissé un téléchargement et un calcul dont plus rien ne se sert : du code
  // mort qui porte un nom, exactement ce que le recensement des rappels vient de traquer.

  const points: readonly PointInteraction[] = campement?.points ?? [];
  const [largeurScene, hauteurScene] = dimensions(campement?.scene.viewBox ?? "0 0 1200 800");

  const finirAnimationObjet = useCallback(
    (evenement: AnimationEventReact<HTMLDivElement>): void => {
      if (evenement.target !== evenement.currentTarget) return;
      fixerObjetAnime(null);
    },
    [],
  );

  /**
   * R31/R11 — journalise la visite d'un point libre. GRATUIT : aucune étoile, aucun acquis,
   * et un échec réseau ne doit jamais se voir — le point a déjà réagi à l'écran (`PointLibre`)
   * quand cet appel part. `.catch` avale pour la même raison que `jouerEffet` juste au-dessus
   * dans ce composant : un geste sans conséquence pédagogique ne doit jamais lever d'erreur.
   */
  const noterVisite = useCallback(
    (point: PointInteraction): void => {
      if (profil === null) {
        return;
      }
      void noterVisitePointCampement(profil.id, point.id).catch(() => undefined);
    },
    [profil],
  );

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
    fixerOuvertureChaudronEnCours(true);
    fixerMessageOuvertureChaudron(null);
    void lirePaquetNoeud(noeudLibre)
      .then((paquet) => {
        magasin.getState().demarrerNoeud(paquet);
      })
      .catch(() => {
        // Le campement ne doit jamais laisser un tap sans réponse : si le serveur local a été
        // arrêté ou sert encore un contenu ancien, le chaudron explique quoi faire et reste
        // réessayable, sans afficher un écran d'erreur pédagogique.
        fixerOuvertureChaudronEnCours(false);
        fixerMessageOuvertureChaudron('Le chaudron est prêt. Réessaie de l’ouvrir.');
      });
  }, [magasin, noeudLibre, surOuvrirChaudron]);

  const allerCarte = useCallback((): void => {
    if (surAllerCarte === undefined) magasin.getState().naviguer("carte");
    else surAllerCarte();
  }, [magasin, surAllerCarte]);

  const allerCoffre = useCallback((): void => {
    surAllerCoffre?.();
  }, [surAllerCoffre]);

  const activerObjetUtile = useCallback(
    (point: PointInteraction): void => {
      if (point.id === "carte") allerCarte();
      else if (point.id === "coffre") allerCoffre();
      else if (point.id === "chaudron") ouvrirLeChaudron();
    },
    [allerCarte, allerCoffre, ouvrirLeChaudron],
  );

  /** Le mur des noms est bâti sur les formes de Gobi — voir la note PLACEHOLDER de `MurDesNoms`. */
  const noms: readonly NomDuMur[] = useMemo(
    () =>
      (monde?.gobi.formes ?? []).map((forme) => ({
        texte: String(forme.grapheme),
        libelle: forme.libelle,
        obtenuLe: forme.obtenueLe,
      })),
    [monde],
  );

  const stade = monde?.gobi.stade ?? "oeuf";
  const formeActive = monde?.gobi.formes.find((forme) => forme.grapheme === monde.gobi.formeActive);
  const suivant = useMemo(
    () => (monde === null || stades.length === 0 ? null : prochainStade(monde.gobi, stades)),
    [monde, stades],
  );

  // « On le rencontre à clairiere. » — c'est ce que cet écran écrivait, en rendant le CODE de
  // la région. Un identifiant technique n'est pas un mot : sans accent, sans majuscule, avec
  // des tirets, c'est exactement la chaîne qu'un lecteur de CE1 ne peut pas déchiffrer.
  const libelleRegion = useCallback(
    (code: string): string | undefined =>
      monde?.carte.regions.find((region) => String(region.region) === code) === undefined
        ? undefined
        : (NOM_DE_REGION[code] ?? code),
    [monde],
  );

  return (
    <main data-ecran="campement" className="campement-page">
      {/* ── LES SORTIES DU CAMPEMENT — R18 : ça se comprend sans lire ────────────────────────
          Le père n'a pas compris le campement. Le défaut mesuré n'était pas le décor, c'était
          la barre du haut : trois boutons techniques posés côte à côte. Chaque destination est
          maintenant une carte illustrée avec son emblème et une courte promesse. `data-pictogramme`
          reste comptable par `parcours-campement-sans-texte.spec.ts` ; le mot reste, pour
          l'adulte et le lecteur d'écran, sans être la seule prise. */}
      <header data-campement-sorties="oui" className="campement-entete">
        <div className="campement-introduction">
          <p className="campement-surtitre">Ton coin dans la forêt</p>
          <h1 className="titre campement-titre">Le campement</h1>
          <p className="campement-accroche">Touche les choses qui t’intriguent, ou pars quand tu veux.</p>
        </div>

        {/* D46 : le campement n'est JAMAIS sur le chemin obligatoire. On en repart en un tap. */}
        {profil === null ? null : (
          <PastilleSortie profil={profil} style={{ inlineSize: "100%" }} />
        )}

        <button
          type="button"
          className="cible action-campement action-campement--carte"
          data-vers="carte"
          data-pictogramme="carte"
          aria-label="Ouvrir la carte du monde"
          onClick={allerCarte}
        >
          <span
            aria-hidden="true"
            className="action-campement-vignette action-campement-vignette--carte"
            data-illustration-campement="carte"
            style={{ backgroundImage: `url(${urlAsset('assets/campement/campement-v6.png')})` }}
          >🗺️</span>
          <span data-action-campement-texte="nom">La carte</span>
          <span data-action-campement-texte="detail">Choisir un chemin</span>
        </button>

        <button
          type="button"
          className="cible action-campement action-campement--coffre"
          data-vers="coffre"
          data-pictogramme="coffre"
          aria-label="Ouvrir le coffre aux collections"
          onClick={allerCoffre}
        >
          <span
            aria-hidden="true"
            className="action-campement-vignette action-campement-vignette--coffre"
            data-illustration-campement="coffre"
            style={{ backgroundImage: `url(${urlAsset('assets/campement/campement-v6.png')})` }}
          >🧰</span>
          <span data-action-campement-texte="nom">Le coffre</span>
          <span data-action-campement-texte="detail">Mes trouvailles</span>
        </button>

        {/* D35, point 3 : l'histoire du début se rejoue à volonté, et seulement d'ici — jamais
            imposée une seconde fois. Le rappel vient du routeur (N4) ; sans lui, pas de bouton. */}
        {surRejouerOuverture === undefined ? null : (
          <button
            type="button"
            className="cible action-campement action-campement--histoire"
            data-vers="ouverture"
            data-pictogramme="ouverture"
            aria-label="Revoir l’histoire du début"
            onClick={surRejouerOuverture}
          >
            <span
              aria-hidden="true"
            className="action-campement-vignette action-campement-vignette--histoire"
            data-illustration-campement="histoire"
            style={{ backgroundImage: `url(${urlAsset('assets/campement/campement-v6.png')})` }}
          >📖</span>
            <span data-action-campement-texte="nom">Revoir l’histoire</span>
            <span data-action-campement-texte="detail">La Pierre raconte</span>
          </button>
        )}
      </header>

      <div data-campement-grille="oui" className="campement-grille">
        <div
          data-scene="campement"
          data-points={String(points.length)}
          className="campement-scene"
          style={{
            aspectRatio: `${String(largeurScene)} / ${String(hauteurScene)}`,
            "--campement-ratio": largeurScene / hauteurScene,
          } as CSSProperties & Record<"--campement-ratio", number>}
        >
          {campement === null ? null : (
            <img
              className="campement-decor"
              data-decor-campement="v6-raster"
              src={urlAsset(String(campement.scene.fichier))}
              alt=""
              decoding="sync"
              fetchPriority="high"
              draggable={false}
            />
          )}

          <div
            className={animationsDesactivees ? "campement-ambiant campement-ambiant--calme" : "campement-ambiant"}
            aria-hidden="true"
          >
            <span
              className="campement-sprite campement-sprite--feu"
              data-sprite-campement="feu"
              style={{ backgroundImage: `url(${urlAsset("assets/campement/animations/feu.png")})` }}
            />
            <span
              className="campement-sprite campement-sprite--papillon"
              data-sprite-campement="papillon"
              style={{ backgroundImage: `url(${urlAsset("assets/campement/animations/papillon.png")})` }}
            />
          </div>

          {objetAnime === null ? null : (() => {
            const point = points.find((candidat) => candidat.id === objetAnime.id);
            if (point === undefined) return null;
            const [x, y, largeur, hauteur] = point.zone;
            return (
              <div
                className={`campement-effet ${classeAnimation(objetAnime.animation)}`}
                data-effet-campement={objetAnime.id}
                aria-hidden="true"
                onAnimationEnd={finirAnimationObjet}
                style={{
                  insetInlineStart: `${String((x / largeurScene) * 100)}%`,
                  insetBlockStart: `${String((y / hauteurScene) * 100)}%`,
                  inlineSize: `${String((largeur / largeurScene) * 100)}%`,
                  blockSize: `${String((hauteur / hauteurScene) * 100)}%`,
                }}
              >
                {Array.from({ length: 6 }, (_, index) => (
                  <span key={index} data-etincelle="oui" className="campement-etincelle">
                    ✦
                  </span>
                ))}
              </div>
            );
          })()}
          {decouverte === null ? null : (
            <p className="campement-decouverte" data-decouverte={decouverte.id} aria-live="polite">
              <span aria-hidden="true">✨</span> Tu as trouvé {decouverte.libelle} !
            </p>
          )}
          {points.map((point) => (
            <PointLibre
              key={point.id}
              point={point}
              largeurScene={largeurScene}
              hauteurScene={hauteurScene}
              animationsDesactivees={animationsDesactivees}
              surVisite={noterVisite}
              surActiver={activerObjetUtile}
              surAnimerObjet={(objet, animation) => {
                fixerDecouverte({ id: objet.id, libelle: objet.libelle });
                fixerObjetAnime(animationsDesactivees ? null : { id: objet.id, animation });
              }}
            />
          ))}
        </div>

        <div className="campement-sections">
          <section className="panneau campement-gobi" aria-label="Gobi">
            <Gobi
              aide={null}
              niveau="aucune"
              surDemande={null}
              stade={stade}
              cristal={formeActive?.cristal ?? null}
              libelleForme={formeActive?.libelle ?? null}
              animation="repos"
              taille={96}
              surVoirEvolutions={() => {
                fixerEvolutionsGobiOuvertes(true);
              }}
            />
            {suivant === null ? null : (
              <p
                className="zone-lecture campement-gobi-progression"
                data-prochain-stade={suivant.stade.code}
                data-formes-restantes={String(suivant.formesRestantes)}
              >
                Encore {suivant.formesRestantes} forme(s) et Gobi deviendra « {suivant.stade.libelle}{" "}
                ».
              </p>
            )}
          </section>

          <MurDesNoms noms={noms} />

          <Chaudron
            {...(noeudLibre === null ? {} : { surOuvrir: ouvrirLeChaudron })}
            enChargement={campement === null || ouvertureChaudronEnCours}
            messageExterne={messageOuvertureChaudron}
            animationsDesactivees={animationsDesactivees}
          />

          <section
            className="panneau campement-compagnons"
            aria-label="Les compagnons"
          >
            <h2 className="panneau-titre campement-compagnons-titre">
              La bande
            </h2>
            <div className="campement-compagnons-liste">
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
        {surAccesParent === undefined ? null : (
          <footer className="campement-acces-parent">
            <button
              type="button"
              className="cible"
              data-acces-parent="oui"
              onClick={surAccesParent}
              aria-label="Ouvrir l’espace des parents"
            >
              <span aria-hidden="true">🔑</span>
              <span>Parents</span>
            </button>
          </footer>
        )}
      </div>

      {evolutionsGobiOuvertes && stades.length > 0 ? (
        <GalerieEvolutionsGobi
          stades={stades}
          stadeActuel={stade}
          surFermer={() => {
            fixerEvolutionsGobiOuvertes(false);
          }}
        />
      ) : null}
    </main>
  );
}
