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
import { campementDuDocument, prochainStade, stadesDuDocument } from '@pierre/partage/monde';
// `DocumentCampement` et `StadeGobi` viennent du SOUS-CHEMIN : le barillet racine ne réexporte
// que les seize types du § 4.5 (convention C1), et `DocumentCampement` n'en fait pas partie.
import type { DocumentCampement, StadeGobi } from '@pierre/partage/monde';
import { lireMonde, urlAsset } from '../api/client.js';
import { Compagnon } from '../composants/Compagnon.js';
import { Gobi } from '../composants/Gobi.js';
import { useEtatJeu, useMagasin } from '../etat/services.js';
import { Chaudron } from '../monde/Chaudron.js';
import { MurDesNoms } from '../monde/MurDesNoms.js';
import type { NomDuMur } from '../monde/MurDesNoms.js';
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
  surOuvrirChaudron
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
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 className="titre" style={{ fontSize: '2.25rem', margin: 0 }}>
          Le campement
        </h1>
        <button
          type="button"
          className="cible cible-appel"
          data-vers="carte"
          aria-label="Ouvrir la carte du monde"
          onClick={() => {
            if (surAllerCarte === undefined) {
              magasin.getState().naviguer('carte');
            } else {
              surAllerCarte();
            }
          }}
        >
          La carte
        </button>
        <button
          type="button"
          className="cible"
          data-vers="coffre"
          aria-label="Ouvrir le coffre aux collections"
          onClick={surAllerCoffre}
        >
          Le coffre
        </button>
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
