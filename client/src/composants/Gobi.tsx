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
// Les SVG extraits ont servi de blockout, mais le parent a ensuite validé les rendus raster de
// production. Le composant sert désormais ces fichiers : dix stades au repos et cinq poses
// d'animation. Ils restent des assets locaux mis en cache par le navigateur ; aucun dessin de
// remplacement n'est inventé dans le code.
//
// ── CE QUE R46 ET R41 CHANGENT, ET LE DÉFAUT EXACT QU'ILS RÉPARENT ────────────────────────
//
// Ce fichier écrivait, à deux lignes d'intervalle :
//
//     const texte = aide?.texte ?? INVITE_PAR_DEFAUT;
//     const parle = aide !== null && aide.texte !== null;
//
// **Le `??` masquait la panne.** Les douze moteurs sur quatorze qui passent `texte: null`
// faisaient retomber la première ligne sur l'invitation — la MÊME chaîne qu'avant le tap. Le
// père a donc tapé sur « ? Gobi » et vu l'écran ne pas bouger d'un pixel, deux soirs de suite.
// Ce n'était pas une bulle vide (ce qui se serait vu) : c'était l'absence de changement, qui
// ne se voit pas. Un repli posé sur un champ qu'aucun émetteur ne remplit fait passer « rien
// à dire » pour « rien de nouveau à dire ».
//
// TROIS CHANGEMENTS, ET AUCUN N'EST COSMÉTIQUE :
//
//   1. **Le repli ne peut plus ressembler à une aide.** Dès qu'une aide est proposée, la bulle
//      porte SON texte ; l'invitation n'est plus jamais servie à sa place. L'état « aide sans
//      texte » n'est pas maquillé, il est NOMMÉ (`data-aide-source="manquant"`) et donc
//      comptable — et il est mesuré à zéro sur les 76 exercices livrés.
//   2. **`data-gobi-dit`** distingue l'invitation de l'aide dans le DOM. Même si deux textes
//      se ressemblaient, « avant » et « après » cessent d'être indiscernables pour un test.
//   3. **`surDemande` accepte `null`** — et alors le bouton ne s'affiche pas. C'est R41 : au
//      campement il valait `() => undefined`, un bouton présent qui ne répond pas. D42 a déjà
//      arbitré cette forme-là pour le bouton « écouter » : « un bouton qui ne répond pas casse
//      la confiance plus sûrement qu'un bouton absent ». La propriété reste OBLIGATOIRE — en
//      la rendant seulement optionnelle, un appelant pourrait l'oublier ; en la rendant
//      nullable, il doit trancher.
import type { ReactElement } from 'react';
import type {
  AideProposee, CheminAsset, CodeCompagnon, CodeStadeGobi, EtatAnimationGobi, NiveauAide,
} from '@pierre/partage';
import type { AideResolue } from './aide-de-gobi.js';
import { BoutonEcouter } from './BoutonEcouter.js';
import { urlAsset } from '../api/client.js';
import { GOBI_VUE } from './gobi-dessin.gen.js';

export interface ProprietesGobi {
  /** L'aide que le moteur propose, ou `null` quand il n'en propose aucune. */
  readonly aide: AideProposee | null;
  /** Palier atteint sur la tentative entière. Monotone croissant (§ 5.6). */
  readonly niveau: NiveauAide;
  /**
   * Appel volontaire. Produit le palier `indice`, au même coût qu'un palier automatique.
   *
   * **`null` = Gobi n'a rien à proposer ICI, et le bouton ne s'affiche pas** (R41). Jamais
   * optionnelle : chaque appelant doit trancher, et un oubli ne peut pas se glisser.
   */
  readonly surDemande: (() => void) | null;
  /**
   * R46 — l'aide RÉSOLUE par la coquille : le texte à montrer ET le clip qui le dit.
   *
   * **Un seul objet, jamais trois propriétés.** Le texte, la clé et leur provenance doivent
   * s'accorder ; les passer séparément, c'est trois occasions de les faire diverger — et une
   * bulle qui montrerait un texte pendant que le haut-parleur en dit un autre serait un
   * mensonge de plus, exactement du genre que R46 répare.
   *
   * Absent : Gobi retombe sur `aide.texte`, le comportement d'avant R46 — c'est ce qui garde
   * les appelants qui n'ont pas de consigne à offrir (le campement) valides sans rien feindre.
   */
  readonly aideResolue?: AideResolue | null;
  /** Stade d'évolution (D28). `oeuf` par défaut : c'est le départ, jamais un manque. */
  readonly stade?: CodeStadeGobi;
  /** Le CRISTAL de la forme portée. `null` = crête de base. Jamais un corps complet (D20). */
  readonly cristal?: CheminAsset | null;
  /** Libellé de la forme portée, pour le lecteur d'écran. */
  readonly libelleForme?: string | null;
  /** Compagnon qui porte réellement l'aide de la sortie ; absent = Gobi. */
  readonly compagnon?: Readonly<{
    readonly code: CodeCompagnon;
    readonly libelle: string;
    readonly asset: CheminAsset;
  }> | null;
  /** L'un des 5 états de l'addendum § A.2. */
  readonly animation?: EtatAnimationGobi;
  /** Taille du dessin, en pixels. 64 dans la bulle d'aide, davantage au campement. */
  readonly taille?: number;
}

/** Ce que Gobi dit quand personne ne lui a rien demandé. Aucun de ces textes n'est un reproche. */
const INVITE_PAR_DEFAUT = 'Si tu veux, je peux t’aider. Ça ne coûte rien.';

/**
 * Le dessin monté vient des rendus raster validés de production, servis en WebP 512 px.
 */
/**
 * EXPORTÉ pour R6 — l'écran d'évolution montre Gobi en grand, sans le panneau d'aide.
 *
 * `Gobi` est le compagnon COMPLET : dessin, bulle, bouton d'aide, bouton de réécoute. Le
 * réutiliser tel quel dans l'écran d'évolution y ferait apparaître un bouton « Gobi, aide-moi »
 * au milieu d'une célébration — et il faudrait lui inventer un `surDemande` qui ne mène nulle
 * part. On exporte donc le DESSIN seul, qui est ce dont l'évolution a besoin.
 *
 * Il rend un `<g>` : il vit dans un `<svg viewBox={GOBI_VUE}>`, jamais à la racine.
 */
const RANG_PAR_STADE: Readonly<Record<CodeStadeGobi, number>> = {
  oeuf: 1,
  fissure: 2,
  boule: 3,
  'premier-cristal': 4,
  crete: 5,
  couronne: 6,
  equipe: 7,
  besace: 8,
  veilleur: 9,
  gardien: 10,
};

export function DessinDeGobi({
  stade,
  animation
}: {
  readonly stade: CodeStadeGobi;
  readonly animation: EtatAnimationGobi;
}): ReactElement {
  const asset =
    animation === 'repos'
      ? `assets/gobi/stades/stade-${String(RANG_PAR_STADE[stade])}.webp`
      : `assets/gobi/animation/${animation}.webp`;

  return (
    <g id="gobi-dessin" data-dessin-gobi-raster={asset}>
      <image
        href={urlAsset(asset)}
        x="0"
        y="0"
        width="200"
        height="200"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      />
    </g>
  );
}

export function Gobi({
  aide,
  niveau,
  surDemande,
  aideResolue = null,
  stade = 'oeuf',
  cristal = null,
  libelleForme = null,
  compagnon = null,
  animation = 'repos',
  taille = 64
}: ProprietesGobi): ReactElement {
  // ── R46 — LA RÉSOLUTION EST EXPLICITE, ET SES TROIS ISSUES SONT NOMMÉES ─────────────────
  //
  // Aucun `??` ne saute par-dessus le cas qui compte. `texteDeLAide` vaut `null` UNIQUEMENT
  // quand une aide est proposée sans que personne ait su dire quoi — un état qui ne doit pas
  // exister, et qui est désormais publié sous `data-aide-source="manquant"` au lieu d'être
  // repeint en invitation.
  const resolue: AideResolue | null =
    aide === null
      ? null
      : (aideResolue ??
        // Appelant sans coquille de nœud : on n'invente rien, on republie ce que le moteur a
        // dit — et `manquant` quand il n'a rien dit, au lieu de repeindre le trou en invitation.
        (aide.texte !== null && aide.texte !== ''
          ? { texte: aide.texte, cle: null, source: 'strategie' as const }
          : { texte: null, cle: null, source: 'manquant' as const }));

  const texteDeLAide = resolue === null ? null : resolue.texte;
  const source = resolue === null ? null : resolue.source;

  // L'invitation ne sert QUE quand Gobi n'a rien proposé. Elle ne remplace jamais une aide :
  // c'est exactement le repli qui a permis au défaut de survivre trois campagnes.
  const texte = texteDeLAide ?? INVITE_PAR_DEFAUT;

  return (
    <aside
      className="gobi"
      {...(compagnon === null ? {} : { 'data-aideur': compagnon.code })}
      data-gobi-niveau={niveau}
      // « Gobi parle-t-il, ou attend-il ? » — la distinction que le DOM ne portait pas, et
      // sans laquelle « avant le tap » et « après le tap » étaient indiscernables pour un
      // test comme pour l'œil.
      data-gobi-dit={aide === null ? 'invite' : 'aide'}
      {...(source === null ? {} : { 'data-aide-source': source })}
      {...(aide === null ? {} : { 'data-aide-code': aide.code })}
      {...(aide?.cible === null || aide?.cible === undefined ? {} : { 'data-aide-cible': aide.cible })}
      data-stade-gobi={stade}
      data-animation-gobi={animation}
      aria-label={compagnon === null ? 'Aide de Gobi' : `Aide de ${compagnon.libelle}`}
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
      {compagnon === null ? <svg
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
            jamais chargé. Le cadre fait 64 unités sur les 200 du dessin : le PNG carré est
            contenu dans cette boîte et se lit comme un cristal de la crête, pas comme un badge
            posé dessus. */}
        {cristal === null ? null : (
          <image
            href={urlAsset(String(cristal))}
            x="68"
            y="-8"
            width="64"
            height="64"
            data-cristal={cristal}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </svg> : (
        <span className="compagnon-portrait compagnon-portrait--aide" data-aideur={compagnon.code}>
          <img src={urlAsset(compagnon.asset)} alt="" draggable={false} />
        </span>
      )}

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

      {/* ── Réécouter l'aide : R15 s'applique à Gobi comme au reste ────────────────────────
          Le garde `parle` a disparu, et il était la moitié du défaut : il exigeait
          `aide.texte !== null`, ce qu'aucun des douze moteurs ne fournissait — mais surtout,
          AUCUNE `cle` n'était passée, donc `aUnClip(null)` valait `false` et le bouton était
          de toute façon injoignable, y compris sur `trace` et `libre` qui portent un texte.
          Mesuré dans le DOM monté, avant correction : « Écouter=ABSENT » sur les quatre cas.

          Un seul garde subsiste, et c'est le bon : `BoutonEcouter` interroge le MANIFESTE
          (D42). Rendre le bouton ici quand il n'y a pas de clip serait recréer le bouton muet
          que D42 interdit ; le cacher quand il y en a un serait taire une aide qui existe.
          Un seul objet sait — celui qui joue le son. */}
      {aide === null ? null : (
        <BoutonEcouter
          texte={texte}
          cle={resolue?.cle ?? null}
          locuteur={compagnon?.code ?? 'gobi'}
          libelle={`Réécouter ce que dit ${compagnon?.libelle ?? 'Gobi'}`}
        />
      )}

      {/* ── R41 — LE BOUTON N'EXISTE QUE LÀ OÙ IL RÉPOND ───────────────────────────────────
          « quand j'appuie sur le bouton "? gobi" ça ne fait rien » — au campement, où
          `surDemande` valait `() => undefined`. Un bouton fourni avec du néant est invisible
          au détecteur de rappels morts, qui cherche les rappels NON fournis. Il ne l'est plus
          au type : `null` est une valeur qu'on écrit, et qu'on lit. */}
      {surDemande === null ? null : (
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
        aria-label={`Demander de l’aide à ${compagnon?.libelle ?? 'Gobi'}`}
      >
        <span aria-hidden="true">?</span>
        <span>{compagnon?.libelle ?? 'Gobi'}</span>
      </button>
      )}
    </aside>
  );
}
