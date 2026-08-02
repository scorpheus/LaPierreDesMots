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
import type { EtatMonde, PointInteraction } from '@pierre/partage';
import {
  campementDuDocument, construireEtagere, prochainStade, stadesDuDocument
} from '@pierre/partage/monde';
// `DocumentCampement` et `StadeGobi` viennent du SOUS-CHEMIN : le barillet racine ne réexporte
// que les seize types du § 4.5 (convention C1), et `DocumentCampement` n'en fait pas partie.
import type { DocumentCampement, FormeDeclaree, StadeGobi } from '@pierre/partage/monde';
import { lireMonde, urlAsset } from '../api/client.js';
import { Compagnon } from '../composants/Compagnon.js';
import { Gobi } from '../composants/Gobi.js';
import { useEtatJeu, useMagasin } from '../etat/services.js';
import { Chaudron } from '../monde/Chaudron.js';
import { Etagere, useCatalogueFormes } from '../monde/Etagere.js';
import { MurDesNoms } from '../monde/MurDesNoms.js';
import type { NomDuMur } from '../monde/MurDesNoms.js';
import { PastilleSortie } from '../monde/PastilleSortie.js';
import { PointLibre } from '../monde/PointLibre.js';

export interface ProprietesEcranCampement {
  /** Le référentiel du campement. Injecté par les tests ; chargé sinon. */
  readonly campement?: DocumentCampement | null;
  /** Le monde du profil. Injecté par les tests ; chargé sinon. */
  readonly monde?: EtatMonde | null;
  /** La table des stades. Injectée par les tests ; chargée sinon. */
  readonly stades?: readonly StadeGobi[] | null;
  readonly surAllerCarte?: () => void;
  readonly surAllerCoffre?: () => void;
  /** Ouvre le coloriage libre. Absent tant qu'aucun nœud `libre` n'est livré (L2-E). */
  readonly surOuvrirChaudron?: () => void;
  /**
   * Rejoue la séquence d'ouverture — D35, point 3.
   *
   * Le rappel vient du routeur, qui est le seul à connaître `CHEMINS.ouverture` (lot N4,
   * contrat v3 § 6.2 : `routeur.tsx` appartient à N4). Tant que N4 ne l'a pas câblé, le bouton
   * n'est simplement pas rendu : un bouton qui ne mènerait nulle part serait pire que son
   * absence, et ce lot refuse d'en poser un.
   */
  readonly surRejouerOuverture?: () => void;
  /**
   * Le catalogue des formes, injecté par les tests. Lu par requête sinon — c'est le même
   * fichier que `stades`, et la même clé de requête : il n'est téléchargé qu'une fois.
   */
  readonly catalogueFormes?: { readonly formes: readonly FormeDeclaree[] } | null;
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
  catalogueFormes: catalogueInjecte = null,
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

  // Le catalogue des formes — la même clé de requête que `stades`, donc le même téléchargement.
  const catalogueCharge = useCatalogueFormes();
  const catalogue = catalogueInjecte ?? catalogueCharge;

  /**
   * L'étagère, cases vides comprises — D44.
   *
   * C'est la réponse à « le père n'a pas compris le campement » : le mur des noms grave ce qui
   * est acquis, l'étagère montre ce qui reste. Sans elle, le campement ne disait nulle part
   * combien de formes il y a en tout, donc ne donnait aucune raison d'y revenir.
   */
  const etagere = useMemo(
    () => construireEtagere(catalogue, monde?.gobi.formes ?? []),
    [catalogue, monde]
  );

  const points: readonly PointInteraction[] = campement?.points ?? [];
  const [largeurScene, hauteurScene] = dimensions(campement?.scene.viewBox ?? '0 0 1200 800');

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

  const libelleRegion = useCallback(
    (code: string): string | undefined =>
      monde?.carte.regions.find((region) => String(region.region) === code) === undefined
        ? undefined
        : code,
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

      {/* ── le décor et ses points d'interaction : la prise de R11 ─────────────────────── */}
      <div
        data-scene="campement"
        data-points={String(points.length)}
        style={{
          position: 'relative',
          inlineSize: '100%',
          maxInlineSize: '1200px',
          aspectRatio: `${String(largeurScene)} / ${String(hauteurScene)}`,
          backgroundImage:
            campement === null ? 'none' : `url(${urlAsset(String(campement.scene.fichier))})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundColor: 'var(--parchemin)',
          borderRadius: 'var(--rayon-carte)'
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

      {/* ── Gobi, au campement : le stade se VOIT, c'est tout l'intérêt de D28 ─────────── */}
      <section aria-label="Gobi">
        <Gobi
          aide={null}
          niveau="aucune"
          surDemande={() => undefined}
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
      <Etagere etagere={etagere} titre="L’étagère de Gobi" />

      <MurDesNoms noms={noms} />

      <Chaudron surOuvrir={surOuvrirChaudron} animationsDesactivees={animationsDesactivees} />

      <section aria-label="Les compagnons">
        <h2 className="titre" style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
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
    </main>
  );
}
