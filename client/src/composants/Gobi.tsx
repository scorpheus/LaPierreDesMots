// Gobi — bulle d'aide à trois paliers (contrat v1 § 5.6, v2 § 5.4) ET compagnon tamagotchi
// (D20, D24, D28, lot L2-F).
//
// RÈGLE NON NÉGOCIABLE (CLAUDE.md) : « l'aide de Gobi ne coûte rien et n'est jamais présentée
// comme un échec — elle change seulement le nombre d'étoiles. C'est l'enfant qui choisit sa
// difficulté. » Conséquences tenues ici :
//   — aucun mot négatif, aucune couleur rouge, aucune icône d'alerte ;
//   — le bouton d'appel est TOUJOURS disponible, jamais compté à l'écran, jamais grisé ;
//   — l'appel volontaire produit exactement le palier `indice` (§ 5.6), ni plus ni moins ;
//   — le niveau atteint est monotone croissant : il ne redescend jamais.
//
// CE QUE L2-F AJOUTE, et la règle qui le gouverne (D20) :
//
//   **Le corps ne change jamais, le cristal porte les déclinaisons.** Le corps est celui du
//   stade — cinq dessins pour toute la vie du jeu (D28) — et la forme active ne modifie QUE le
//   cristal. C'est ce qui rend 25 variantes productibles de façon cohérente : sans cette règle,
//   il faudrait 5 × 25 = 125 dessins, et la collection cesserait d'être lisible d'un coup d'œil.
//
//   Les cinq états d'animation de l'addendum § A.2 sont portés par `data-animation-gobi` et non
//   par cinq composants : `repos`, `joie`, `aide`, `hesitation`, `apparition`.
//
// COMPATIBILITÉ : les trois propriétés de la v1 (`aide`, `niveau`, `surDemande`) sont
// INCHANGÉES et restent obligatoires — `EcranNoeud` (L2-A) les passe telles quelles. Tout ce que
// L2-F ajoute est optionnel et retombe sur le comportement v1 quand rien n'est fourni.
//
// ── CE QUE M5 CHANGE, ET POURQUOI C'ÉTAIT LE DÉFAUT CENTRAL ────────────────────────────────
//
// L'inventaire du contrat du monde v4 § 1.2 mesure le défaut et le nomme sans détour :
// « La chaîne d'image a réussi et son résultat n'est pas branché. La canonique de Gobi est
// bonne, ses stades et animations sont produits, et l'écran montre un rond framboise. »
//
// Ce fichier dessinait en effet un `<circle fill="var(--framboise)">` de 24 unités, deux ronds
// pour les bras, deux ronds pour les yeux et des losanges bleus pour la crête. Le corps de la
// canonique validée par le père (D36) est **crème** `#FFDDA8`, sa fourrure est dentelée, et le
// **cœur de Pierre** — « la seule source lumineuse autorisée sur le personnage » — n'existait
// pas du tout dans le composant. Ce n'était pas un dessin plus pauvre que l'asset : c'était un
// autre personnage. Le Gobi que le père a validé n'avait jamais atteint l'écran.
//
// LE MOTIF DU DESSIN EN LIGNE EST CONSERVÉ, ET IL RESTE JUSTE : Gobi apparaît dans la bulle
// d'aide de CHAQUE exercice ; un `fetch` par montage coûterait une requête là où le budget vise
// une réponse sous 100 ms. Ce qui change, c'est la SOURCE de ce qui est dessiné. Le composant
// ne redessine plus de mémoire : `scripts/gobi-dessin.mjs` EXTRAIT les groupes des quinze SVG
// de `contenu/assets/gobi/` vers `gobi-dessin.gen.ts`, et c'est ce texte-là qui est monté.
// `node scripts/gobi-dessin.mjs --verifier` recompare les deux et sort en 1 s'ils divergent :
// « le dessin monté à l'écran est celui du fichier du stade » cesse d'être une promesse.
//
// Coût mesuré du module embarqué : 32 247 octets, **5 986 octets gzip** — 2,4 % d'un budget de
// bundle initial fixé à 250 Ko gzip. C'est ce que la règle « le corps ne change jamais » fait
// économiser : sans elle il aurait fallu embarquer 10 stades × 5 états = 50 dessins complets,
// et non 1 corps + 10 parures + 5 gestes.
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type {
  AideProposee, CheminAsset, CodeStadeGobi, EtatAnimationGobi, NiveauAide,
} from '@pierre/partage';
import { BoutonEcouter } from './BoutonEcouter.js';
import { GOBI_CORPS, GOBI_GESTE, GOBI_PARURE, GOBI_VUE } from './gobi-dessin.gen.js';

export interface ProprietesGobi {
  /** L'aide que le moteur propose, ou `null` quand il n'en propose aucune. */
  readonly aide: AideProposee | null;
  /** Palier atteint sur la tentative entière. Monotone croissant (§ 5.6). */
  readonly niveau: NiveauAide;
  /** Appel volontaire. Produit le palier `indice`, au même coût qu'un palier automatique. */
  readonly surDemande: () => void;
  /** Stade d'évolution (D28). `oeuf` par défaut : c'est le départ, jamais un manque. */
  readonly stade?: CodeStadeGobi;
  /** Le CRISTAL de la forme portée. `null` = crête de base. Jamais un corps complet (D20). */
  readonly cristal?: CheminAsset | null;
  /** Libellé de la forme portée, pour le lecteur d'écran. */
  readonly libelleForme?: string | null;
  /** L'un des 5 états de l'addendum § A.2. */
  readonly animation?: EtatAnimationGobi;
  /** Taille du dessin, en pixels. 64 dans la bulle d'aide, davantage au campement. */
  readonly taille?: number;
}

/** Ce que Gobi dit quand personne ne lui a rien demandé. Aucun de ces textes n'est un reproche. */
const INVITE_PAR_DEFAUT = 'Si tu veux, je peux t’aider. Ça ne coûte rien.';

/**
 * Le dessin monté, composé des groupes EXTRAITS des quinze SVG.
 *
 * L'ORDRE DES QUATRE GROUPES EST CELUI DES FICHIERS, et il porte l'empilement : le corps
 * d'abord (ombre au sol, pieds, fourrure, ventre, cœur de Pierre), la parure du stade
 * derrière/au-dessus de la tête, puis les bras, puis le visage — c'est le visage qui doit
 * rester au-dessus de tout, sinon un bras levé le recouvre.
 *
 * `dangerouslySetInnerHTML` est ici le contraire d'un raccourci : c'est ce qui garantit que le
 * DOM porte **les octets du fichier**, sans traduction ni réinterprétation en JSX. Le contenu
 * est une constante de compilation issue du dépôt, jamais une entrée d'utilisateur. C'est le
 * même mécanisme que `SceneSvg`, `ScenePlace`, `EcranCarte` et `TableauOuverture` emploient
 * déjà pour servir un habillage.
 */
function DessinDeGobi({
  stade,
  animation
}: {
  readonly stade: CodeStadeGobi;
  readonly animation: EtatAnimationGobi;
}): ReactElement {
  // MÉMORISÉ : `dangerouslySetInnerHTML` compare l'objet par référence. Un objet neuf à chaque
  // rendu ferait ré-analyser 4 Ko de balisage à chaque frappe de l'enfant sur l'exercice.
  const dessin = useMemo(
    () => ({
      __html: GOBI_CORPS + GOBI_PARURE[stade] + GOBI_GESTE[animation].bras + GOBI_GESTE[animation].visage
    }),
    [stade, animation]
  );
  return <g id="gobi-dessin" dangerouslySetInnerHTML={dessin} />;
}

export function Gobi({
  aide,
  niveau,
  surDemande,
  stade = 'oeuf',
  cristal = null,
  libelleForme = null,
  animation = 'repos',
  taille = 64
}: ProprietesGobi): ReactElement {
  const texte = aide?.texte ?? INVITE_PAR_DEFAUT;
  const parle = aide !== null && aide.texte !== null;

  return (
    <aside
      className="gobi"
      data-gobi-niveau={niveau}
      data-stade-gobi={stade}
      data-animation-gobi={animation}
      {...(libelleForme === null ? {} : { 'data-forme-gobi': libelleForme })}
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 1rem'
      }}
    >
      {/* Gobi lui-même : le dessin de la canonique (D36) — corps crème duveteux à contour
          dentelé, joues orangées, grands yeux ronds à deux reflets, et le cœur de Pierre
          rayonnant au ventre. Le corps ne change pas de stade en stade — seule la parure
          pousse, et seul le geste change d'un état d'animation à l'autre. */}
      <svg
        width={taille}
        height={taille}
        viewBox={GOBI_VUE}
        role="img"
        aria-label={
          libelleForme === null ? `Gobi, stade ${stade}` : `Gobi, stade ${stade}, forme ${libelleForme}`
        }
        focusable="false"
        style={{ overflow: 'visible' }}
      >
        <DessinDeGobi stade={stade} animation={animation} />
        {/* LE CRISTAL, et lui seul, porte la déclinaison (D20). Il se pose au sommet de la
            parure, comme le cristal que Gobi vient de gagner ; aucun corps de rechange n'est
            jamais chargé. Le cadre fait 64 unités sur les 200 du dessin : c'est l'échelle à
            laquelle un cristal de `contenu/assets/gobi/formes/` — dont le `viewBox` fait
            précisément 64 — se lit comme un cristal de la crête et non comme un badge posé
            dessus. */}
        {cristal === null ? null : (
          <image
            href={`/api/contenu/assets/${cristal}`}
            x="68"
            y="-8"
            width="64"
            height="64"
            data-cristal={cristal}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </svg>

      <div
        className="zone-lecture gobi-bulle"
        style={{
          flex: '1 1 auto',
          border: 'var(--epaisseur-trait) solid var(--trait)',
          borderRadius: 'var(--rayon-carte)',
          padding: '0.75rem 1rem'
        }}
      >
        <p style={{ margin: 0 }}>{texte}</p>
      </div>

      {/* Réécouter l'aide : R15 s'applique à Gobi comme au reste. */}
      {parle ? (
        <BoutonEcouter
          texte={texte}
          locuteur="gobi"
          libelle="Réécouter ce que dit Gobi"
        />
      ) : null}

      <button
        type="button"
        className="cible cible-secondaire"
        // `data-action="aide"` — la MÊME prise que les onze moteurs qui rendent leur propre
        // bouton d'aide. Ajoutée à l'intégration.
        //
        // Onze moteurs sur quatorze portaient cet attribut ; `colorie`, `place` et `trace`
        // n'en rendent aucun, parce que leur aide est portée par la COQUILLE — ce bouton-ci.
        // La QA des moteurs ne trouvait donc pas de bouton d'aide sur ces trois-là et les
        // SAUTAIT (`test.skip`), c'est-à-dire qu'elle ne vérifiait pas l'aide de Gobi
        // précisément sur le moteur `trace`, celui du `d` que le père n'a pas réussi à faire.
        //
        // « Ne jamais mettre un test en skip » (CLAUDE.md) : le remède n'était pas d'assouplir
        // le test mais de donner au bouton la prise que les autres avaient déjà.
        data-action="aide"
        onClick={surDemande}
        aria-label="Demander de l’aide à Gobi"
      >
        <span aria-hidden="true">?</span>
        <span>Gobi</span>
      </button>
    </aside>
  );
}
