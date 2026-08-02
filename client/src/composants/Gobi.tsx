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
 * Le corps, par stade. **DIX dessins depuis N3** (D43), et la crête est tout ce qui change :
 * le reste est identique d'un stade à l'autre (D28, point 1).
 *
 * Le corps est dessiné EN LIGNE parce que Gobi apparaît dans la bulle d'aide de chaque
 * exercice : un `fetch` par montage coûterait une requête là où le budget vise une réponse
 * sous 100 ms. C'est le seul motif de cette duplication, et elle a un prix — voir ci-dessous.
 *
 * MODIFIÉ PAR N3, HORS DE SON PÉRIMÈTRE DÉCLARÉ, ET C'EST SIGNALÉ. Le contrat de finition v3
 * § 5.7 fait passer `CodeStadeGobi` de 5 à 10 membres, mais son § 4.3 ne liste pas ce fichier
 * dans le lot. Or ce `Record` est exhaustif : à 5 clés pour 10 membres, **rien ne compile**,
 * et les vagues 2 et 3 seraient bloquées. Aucun des huit lots ne le possède — vérifié : le
 * contrat ne le cite nulle part —, donc il n'y a pas deux écrivains. Les dix crêtes sont
 * régénérées ensemble pour que le nombre de cristaux suive celui des SVG livrés
 * (`contenu/assets/gobi/stades/stade-{1..10}.svg`) : 1, 1, 1, 2, 3, 5, 6, 7, 8, 9. Les
 * conserver telles quelles aurait rendu la progression non monotone — `couronne` en aurait
 * porté plus que `equipe`, qui vient après.
 *
 * CE QUE CE FICHIER RESTE : une réduction. Elle double la donnée des SVG (convention C5) sans
 * qu'un test compare les deux, parce que l'un est un `path` de 64 unités et l'autre un dessin
 * de 200. Le seul lien vérifié est le NOMBRE de cristaux, ci-dessous.
 */
const CRETE_PAR_STADE: Readonly<Record<CodeStadeGobi, readonly string[]>> = {
  oeuf: ['M32,8 L37,12.9 L32,17 L27,12.9 Z'],
  fissure: ['M32,7 L37.5,12.5 L32,17 L26.5,12.5 Z', 'M32,6 L34.5,10 L32,14 L29.5,10 Z'],
  boule: ['M32,2 L39,10.3 L32,17 L25,10.3 Z'],
  'premier-cristal': [
    'M24,9.4 L28.5,14.3 L24,18.4 L19.5,14.3 Z',
    'M36,1.3 L43,10.1 L36,17.3 L29,10.1 Z'
  ],
  crete: [
    'M20,10.2 L25,15.7 L20,20.2 L15,15.7 Z',
    'M32,0 L39.5,9.3 L32,17 L24.5,9.3 Z',
    'M44,10.2 L49,15.7 L44,20.2 L39,15.7 Z'
  ],
  couronne: [
    'M13,18.3 L17,22.7 L13,26.3 L9,22.7 Z',
    'M22,7.2 L27.5,13.8 L22,19.2 L16.5,13.8 Z',
    'M32,-1 L39.5,8.9 L32,17 L24.5,8.9 Z',
    'M42,7.2 L47.5,13.8 L42,19.2 L36.5,13.8 Z',
    'M51,18.3 L55,22.7 L51,26.3 L47,22.7 Z'
  ],
  equipe: [
    'M11,22.4 L14.5,26.3 L11,29.4 L7.5,26.3 Z',
    'M20,9.2 L25,15.3 L20,20.2 L15,15.3 Z',
    'M28,0.3 L35,9.7 L28,17.3 L21,9.7 Z',
    'M37,1.5 L43.5,10.3 L37,17.5 L30.5,10.3 Z',
    'M45,9.8 L50,15.9 L45,20.8 L40,15.9 Z',
    'M53,22.4 L56.5,26.3 L53,29.4 L49.5,26.3 Z'
  ],
  besace: [
    'M10,25.4 L13.2,28.7 L10,31.4 L6.8,28.7 Z',
    'M17,12.3 L21.4,17.8 L17,22.3 L12.6,17.8 Z',
    'M25,3 L31,11.3 L25,18 L19,11.3 Z',
    'M32,-1 L39,8.9 L32,17 L25,8.9 Z',
    'M39,3 L45,11.3 L39,18 L33,11.3 Z',
    'M47,12.3 L51.4,17.8 L47,22.3 L42.6,17.8 Z',
    'M54,25.4 L57.2,28.7 L54,31.4 L50.8,28.7 Z'
  ],
  veilleur: [
    'M9,28.1 L12,31.4 L9,34.1 L6,31.4 Z',
    'M15,15.1 L19,20.1 L15,24.1 L11,20.1 Z',
    'M22,6.2 L27.2,13.3 L22,19.2 L16.8,13.3 Z',
    'M29,-0.8 L36,9.1 L29,17.2 L22,9.1 Z',
    'M36,1.3 L42.4,10.1 L36,17.3 L29.6,10.1 Z',
    'M43,6.7 L48.2,13.8 L43,19.7 L37.8,13.8 Z',
    'M49,15.1 L53,20.1 L49,24.1 L45,20.1 Z',
    'M55,28.1 L58,31.4 L55,34.1 L52,31.4 Z'
  ],
  gardien: [
    'M8,28.2 L11,32.1 L8,35.2 L5,32.1 Z',
    'M13,16.3 L17,21.8 L13,26.3 L9,21.8 Z',
    'M19,6.8 L24.4,14.5 L19,20.8 L13.6,14.5 Z',
    'M26,-0.2 L32.6,9.7 L26,17.8 L19.4,9.7 Z',
    'M33,-2 L40,8.4 L33,17 L26,8.4 Z',
    'M40,0.4 L46.6,10.3 L40,18.4 L33.4,10.3 Z',
    'M46,7.5 L51.4,15.2 L46,21.5 L40.6,15.2 Z',
    'M52,17.7 L56,23.2 L52,27.7 L48,23.2 Z',
    'M56,28.2 L59,32.1 L56,35.2 L53,32.1 Z'
  ]
};

/** Le corps est le MÊME pour les dix stades : c'est la règle, pas une économie. */
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
