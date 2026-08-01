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
import type { ReactElement } from 'react';
import type {
  AideProposee, CheminAsset, CodeStadeGobi, EtatAnimationGobi, NiveauAide,
} from '@pierre/partage';
import { BoutonEcouter } from './BoutonEcouter.js';

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
 * Le corps, par stade. Cinq dessins, et **c'est tout ce qui change du corps** : la crête de
 * cristaux pousse, le reste est identique d'un stade à l'autre (D28, point 1).
 *
 * PLACEHOLDER — ces silhouettes doublent volontairement, en très simplifié, les cinq SVG de
 * `contenu/assets/gobi/`. Le corps est dessiné EN LIGNE parce que Gobi apparaît dans la bulle
 * d'aide de chaque exercice : un `fetch` par montage coûterait une requête là où le budget vise
 * une réponse sous 100 ms. La forme canonique n'est pas validée (D7, D31 étape A).
 */
const CRETE_PAR_STADE: Readonly<Record<CodeStadeGobi, readonly string[]>> = {
  oeuf: ['M32,2 L38,14 L32,20 L26,14 Z'],
  boule: ['M32,0 L40,14 L32,22 L24,14 Z'],
  crete: ['M20,8 L26,20 L20,26 L14,20 Z', 'M32,0 L40,14 L32,22 L24,14 Z', 'M44,8 L50,20 L44,26 L38,20 Z'],
  equipe: [
    'M18,8 L25,20 L18,27 L11,20 Z',
    'M32,-2 L41,14 L32,23 L23,14 Z',
    'M46,8 L53,20 L46,27 L39,20 Z'
  ],
  gardien: [
    'M10,16 L15,25 L10,31 L5,25 Z',
    'M20,6 L27,19 L20,26 L13,19 Z',
    'M32,-4 L42,13 L32,23 L22,13 Z',
    'M44,6 L51,19 L44,26 L37,19 Z',
    'M54,16 L59,25 L54,31 L49,25 Z'
  ]
};

/** Le corps est le MÊME pour les cinq stades : c'est la règle, pas une économie. */
function CorpsDeGobi({ stade }: { readonly stade: CodeStadeGobi }): ReactElement {
  return (
    <g id="gobi-dessin">
      <circle cx="32" cy="40" r="24" fill="var(--framboise)" stroke="var(--trait)" strokeWidth="4" />
      <path
        d="M32,32 C42,32 48,40 48,48 C48,56 40,62 32,62 C24,62 16,56 16,48 C16,40 22,32 32,32 Z"
        fill="#FFC0D6"
        stroke="var(--trait)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* D24 : deux bras courts et robustes. Il peut montrer, tendre, applaudir. */}
      <circle cx="9" cy="46" r="7" fill="var(--framboise)" stroke="var(--trait)" strokeWidth="3.5" />
      <circle cx="55" cy="46" r="7" fill="var(--framboise)" stroke="var(--trait)" strokeWidth="3.5" />
      <circle cx="24" cy="36" r="6" fill="var(--parchemin)" stroke="var(--trait)" strokeWidth="2.5" />
      <circle cx="40" cy="36" r="6" fill="var(--parchemin)" stroke="var(--trait)" strokeWidth="2.5" />
      <circle cx="25" cy="37" r="2.8" fill="var(--trait)" />
      <circle cx="41" cy="37" r="2.8" fill="var(--trait)" />
      <path
        d="M25,48 C29,54 35,54 39,48 C36,58 28,58 25,48 Z"
        fill="var(--trait)"
        stroke="var(--trait)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g id="gobi-crete">
        {CRETE_PAR_STADE[stade].map((d) => (
          <path
            key={d}
            d={d}
            fill="#2FA8E0"
            stroke="var(--trait)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </g>
  );
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
      {/* Gobi lui-même : une bouille framboise à structure cristalline, jamais un panneau
          d'avertissement. Le corps ne change pas de stade en stade — seule la crête pousse. */}
      <svg
        width={taille}
        height={taille}
        viewBox="0 0 64 64"
        role="img"
        aria-label={
          libelleForme === null ? `Gobi, stade ${stade}` : `Gobi, stade ${stade}, forme ${libelleForme}`
        }
        focusable="false"
        style={{ overflow: 'visible' }}
      >
        <CorpsDeGobi stade={stade} />
        {/* LE CRISTAL, et lui seul, porte la déclinaison (D20). Il se superpose à la crête ;
            aucun corps de rechange n'est jamais chargé. */}
        {cristal === null ? null : (
          <image
            href={`/api/contenu/assets/${cristal}`}
            x="20"
            y="-6"
            width="24"
            height="24"
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
        onClick={surDemande}
        aria-label="Demander de l’aide à Gobi"
      >
        <span aria-hidden="true">?</span>
        <span>Gobi</span>
      </button>
    </aside>
  );
}
