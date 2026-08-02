// L'étagère des formes de Gobi — D44, lot N6, contrat de finition v3 § 4.6.
//
// « Les formes se collectionnent sur une étagère À CASES VIDES VISIBLES. »
//
// Ce composant existe pour UNE raison, et elle est mesurable : rendre le VIDE. `EcranCoffre`
// (L2-F) ne rendait la section « formes » qu'à partir de `monde.gobi.formes`, c'est-à-dire des
// formes DÉJÀ gagnées : un enfant qui n'en avait aucune voyait une phrase, et un enfant qui en
// avait trois voyait trois vignettes — jamais les vingt-deux qui restent. « Ce qui motive,
// c'est de voir la case suivante encore vide » (D25, point 3) n'était donc pas tenu ici.
//
// La liste vient de `construireEtagere`, qui garantit `cases.length === nbTotal` : ce composant
// ne peut pas filtrer le vide, il n'a pas de liste où le vide serait absent. Il n'y a aucune
// branche `if (obtenue)` autour d'une case — seulement autour de son remplissage.
//
// Trois règles portées ici :
//   1. **Rien n'est caché, rien n'est cadenassé.** Une case vide est la MÊME case, en Grisaille.
//      C'est le principe déjà posé par `EcranCoffre.tsx:52` ; on l'étend, on ne l'invente pas.
//   2. **Rien ne se tape.** L'étagère est un album, pas un menu : aucun `<button>`, aucune
//      action, donc rien à rater (R14).
//   3. **Le compte se lit sans compter.** `data-cases-total`, `data-cases-obtenues` et
//      `data-cases-vides` sont posés sur la racine, pour l'enfant comme pour la recette.
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formesDuDocument } from '@pierre/partage/monde';
import type { CaseEtagere, CatalogueFormes, Etagere as ModeleEtagere } from '@pierre/partage/monde';
import { urlAsset } from '../api/client.js';

export interface ProprietesEtagere {
  /** L'étagère complète, cases vides comprises. Construite par `construireEtagere`. */
  readonly etagere: ModeleEtagere;
  /** Le titre de la section. Le campement et le coffre n'annoncent pas la même chose. */
  readonly titre?: string;
}

/** Le contour d'une case : plein quand elle est gagnée, en creux sinon. Jamais de cadenas. */
function Vignette({ une }: { readonly une: CaseEtagere }): ReactElement {
  return (
    <li
      data-case-etagere={String(une.grapheme)}
      data-rang={String(une.rang)}
      data-obtenue={une.obtenue ? 'oui' : 'non'}
      aria-label={
        une.obtenue
          ? `${une.libelle}, gagnée`
          : `${une.libelle}, case ${String(une.rang)} encore libre`
      }
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem',
        inlineSize: '7rem',
        minBlockSize: '7.5rem',
        padding: '0.5rem',
        borderRadius: 'var(--rayon-carte, 12px)',
        // La case vide garde le MÊME contour, en pointillé : l'emplacement se voit, il ne
        // s'ouvre pas. Jamais de cadenas, jamais de rouge (R14).
        border: une.obtenue
          ? 'var(--epaisseur-trait) solid var(--trait)'
          : 'var(--epaisseur-trait) dashed var(--trait)',
        backgroundColor: une.obtenue ? 'var(--parchemin)' : 'transparent'
        // `opacity` et `filter` ne sont PLUS ici — voir l'encadré sur le libellé, plus bas.
      }}
    >
      {une.obtenue ? (
        <img
          src={urlAsset(String(une.cristal))}
          alt=""
          width={48}
          height={48}
          aria-hidden="true"
        />
      ) : (
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          aria-hidden="true"
          focusable="false"
          // ── LE CREUX EST SUR LE DESSIN, PLUS SUR TOUTE LA CASE ────────────────────────
          // `opacity: 0.6` et `saturate(0)` portaient sur le `<li>` entier, donc AUSSI sur
          // le libellé. Mesuré par axe-core, une fois que l'audit a11y a réellement atteint
          // le campement : `#767c8c` sur `#fff6e3`, **ratio 3,88 pour 4,5 exigé**, sur les
          // 25 cases vides de l'étagère et les 37 du coffre.
          //
          // Le nom de la forme est justement ce que l'enfant doit pouvoir LIRE pour savoir
          // ce qu'il lui reste à trouver : c'est le texte le plus utile de l'écran, et
          // c'était le moins lisible. D44 demande que la case vide se VOIE « en creux » —
          // elle parle du dessin, pas de son étiquette.
          style={{ opacity: 0.6, filter: 'saturate(0)' }}
        >
          {/* Le même cristal, en silhouette. La forme de ce qui viendra se remplir. */}
          <path
            d="M24,4 L44,24 L24,44 L4,24 Z"
            fill="var(--grisaille)"
            stroke="var(--trait)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeDasharray="5 4"
          />
        </svg>
      )}
      <span style={{ fontSize: '0.9rem', textAlign: 'center' }}>{une.libelle}</span>
    </li>
  );
}

export function Etagere({ etagere, titre = 'L’étagère de Gobi' }: ProprietesEtagere): ReactElement {
  const vides = etagere.nbTotal - etagere.nbObtenues;

  return (
    <section
      data-etagere="oui"
      data-cases-total={String(etagere.nbTotal)}
      data-cases-obtenues={String(etagere.nbObtenues)}
      data-cases-vides={String(vides)}
      aria-label={titre}
    >
      <h2 className="titre" style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
        <span aria-hidden="true" data-pictogramme="etagere" style={{ marginInlineEnd: '0.5rem' }}>
          🗄️
        </span>
        {titre} — {etagere.nbObtenues} sur {etagere.nbTotal}
      </h2>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.6rem'
        }}
      >
        {etagere.cases.map((une) => (
          <Vignette key={`${String(une.rang)}-${String(une.grapheme)}`} une={une} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Le CATALOGUE des formes, lu une fois et partagé par le campement et le coffre.
 *
 * Il vit ici plutôt que dans chaque écran pour une raison de convention C5 : deux écrans qui
 * liraient chacun `gobi-stades.json` en feraient deux lectures à faire diverger.
 *
 * ⚠ LA CLÉ N'EST PAS `['monde', 'stades']`, ET C'EST DÉLIBÉRÉ — défaut mesuré, pas supposé.
 * `EcranCampement` emploie déjà cette clé pour une requête dont la fonction rend un
 * `StadeGobi[]`, pas le document brut. Partager la clé pour économiser un téléchargement
 * faisait lire à `formesDuDocument` un TABLEAU de stades : `document['formes']` valait alors
 * `undefined`, la fonction rendait `[]` — sans lever — et l'étagère s'affichait avec ZÉRO case.
 * Mesuré dans le vrai navigateur : `parcours-campement-sans-texte.spec.ts` comptait
 * `[data-case-etagere] = 0` alors que le fichier en déclare 25. Deux formes de données sous
 * une même clé de cache est un bug silencieux ; un second téléchargement d'un fichier local
 * de quelques kilo-octets ne l'est pas.
 */
export function useCatalogueFormes(): CatalogueFormes {
  const requete = useQuery({
    queryKey: ['monde', 'catalogue-formes'],
    queryFn: async () => {
      const reponse = await fetch(urlAsset('monde/gobi-stades.json'), {
        headers: { Accept: 'application/json' }
      });
      if (!reponse.ok) {
        throw new Error(`Catalogue des formes introuvable (réponse ${String(reponse.status)}).`);
      }
      return (await reponse.json()) as unknown;
    },
    // Un fichier de contenu servi en local : il ne change pas pendant une partie, et le
    // réessayer trois fois quand le serveur est absent ne fait qu'allonger le silence.
    retry: false,
    staleTime: Number.POSITIVE_INFINITY
  });

  // Jamais d'écran vide, jamais d'erreur : tant que le catalogue n'est pas là, l'étagère est
  // simplement vide de cases. Elle se remplira au rendu suivant.
  return { formes: requete.data === undefined ? [] : formesDuDocument(requete.data) };
}
