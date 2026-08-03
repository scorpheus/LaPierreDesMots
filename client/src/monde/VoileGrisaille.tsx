// Le voile de Grisaille — v2 § 3.1, § 3.2 et § 9.4, lot L2-F. Repris par S4.
//
// « La Grisaille n'est pas un méchant. C'est un brouillard, une absence. Il n'y a pas de vilain
// à combattre, pas de menace, pas de peur — juste un monde éteint qu'on rallume. »
//
// Deux conséquences tenues ici, et ce sont des règles de conception, pas des effets :
//
//   1. **Une région voilée n'est pas un SECOND asset.** C'est la même forme, sous un voile.
//      « Une zone grise n'est pas un filtre sur une image colorée, c'est l'état par défaut d'un
//      SVG dont les remplissages ne sont pas assignés » — ici la couleur est bien dans le
//      fichier, mais le principe demeure : un seul asset, deux états.
//   2. **Le voile ne fait jamais peur.** Aucun noir, aucune ombre menaçante : `--grisaille`
//      seule, et un mouvement lent que `prefers-reduced-motion` supprime (D21, garde-fou 2).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════
// CE QUE S4 A CORRIGÉ, ET POURQUOI CE N'ÉTAIT PAS COSMÉTIQUE
//
// Ce composant posait `<use href="#clairiere" fill="var(--grisaille)" stroke="none"/>`.
// L'intention était juste ; le rendu était l'inverse exact de l'intention.
//
// En SVG, `<use>` CLONE l'élément référencé. Un attribut de présentation porté par le clone
// l'emporte sur la valeur HÉRITÉE du `<use>` : `#clairiere` porte `fill="#3DDC97"` en dur, donc
// le clone reste vert et `fill="var(--grisaille)"` ne s'applique jamais. Le « voile » redessinait
// donc chaque territoire DANS SA PROPRE COULEUR, par-dessus ses ornements.
//
// Ce n'est pas une nuance : c'est la mécanique entière du jeu qui disparaissait. « Un monde gris
// que l'enfant rallume » (CLAUDE.md) — la carte n'a jamais montré un seul pixel gris, et une
// région voilée se distinguait d'une région terminée par l'ABSENCE de ses ornements, c'est-à-dire
// par le signal opposé à celui qu'on voulait.
//
// Mesuré, jamais supposé — `node bac-a-sable/s4-carte/mesurer-voile.mjs`, voile à 100 %,
// pixel lu au centre de chaque territoire dans Chrome :
//
//   clairiere          → #3DDC97   écart à --grisaille 167   saturation 159
//   galeries           → #2FA8E0   écart à --grisaille 168   saturation 177
//   marais-jumeau      → #8FD6F2   écart à --grisaille 138   saturation  99
//   foret-muette       → #C98B4B   écart à --grisaille 164   saturation 126
//   volcan             → #C0453A   écart à --grisaille 242   saturation 134
//   cite-des-histoires → #FFC93C   écart à --grisaille 271   saturation 195
//   régions dont le voile plein N EST PAS gris : 6 / 6
//
// ── LA CORRECTION, ET POURQUOI CELLE-CI ───────────────────────────────────────────────────────
// Le voile ne REMPLIT plus une copie de la région : il DÉCOUPE une plaque de Grisaille à la
// silhouette de la région, par `clip-path: url(#clip-<région>)`. Ces `clipPath` existent déjà
// dans `carte-monde-v3.svg` — ce sont eux qui détourent les signes d'ambiance, et
// `scripts/verifier-carte-monde.mjs` vérifie déjà les six.
//
// La plaque n'hérite de rien et ne clone rien : sa couleur ne peut donc plus être écrasée par
// l'asset, quelle que soit la retouche future du dessin. C'est la même famille de correction que
// « les régions coloriables sont les régions fermées de la vectorisation » : correct par
// construction, pas par vigilance.
//
// ── ET LE BROUILLARD BOUGE ENFIN SANS DÉPLACER LA RÉGION ──────────────────────────────────────
// L'ancienne animation portait `translateX(6px) scale(1.02)` sur le `<use>` : c'est la SILHOUETTE
// qui glissait, découvrant un liseré de couleur au bord. Avec un découpage, glisser la plaque
// glisserait aussi son découpage — le gris se décalerait de son territoire.
//
// Le mouvement est donc passé À L'INTÉRIEUR du découpage : deux nappes claires dérivent en sens
// contraires sous la plaque, et le bord de la région ne bouge pas d'un pixel. « Le décor s'agite,
// le texte jamais » (v2 § 9.3) — et ici, la frontière non plus.
// ══════════════════════════════════════════════════════════════════════════════════════════════
import type { ReactElement } from 'react';

import { QUANTILES_RALLUMAGE } from './rallumage.gen.js';

/**
 * Les images-clés du brouillard, portées PAR CE COMPOSANT et non par `styles/global.css`.
 *
 * Deux raisons, et la seconde est la vraie : `global.css` appartient à un autre lot (un seul
 * écrivain par fichier), et une `animation` qui pointe vers des images-clés absentes ne fait
 * rien **en silence** — exactement le défaut « un détecteur qui déclare un poids qu'il
 * n'applique jamais ». Redéclarer les mêmes images-clés est sans effet en CSS : le composant
 * peut être monté six fois sans dommage.
 *
 * Le garde-fou `prefers-reduced-motion` vise `[data-voile="grisaille"] *` et non plus
 * `> use` : le sélecteur d'origine ne désignait plus rien après la correction, et une règle
 * qui ne s'applique à rien est le mode de défaillance silencieux qu'on veut éviter.
 */
const IMAGES_CLES_BRUME = `
@keyframes pierre-brume-aller {
  from { transform: translateX(-16px); opacity: 0.20; }
  to   { transform: translateX(16px);  opacity: 0.12; }
}
@keyframes pierre-brume-retour {
  from { transform: translateX(14px);  opacity: 0.12; }
  to   { transform: translateX(-14px); opacity: 0.20; }
}
@media (prefers-reduced-motion: reduce) {
  [data-voile="grisaille"] * { animation: none !important; }
}
`;

/**
 * Les nappes de brume, en unités `viewBox` — `[cx, cy, rx, ry]`.
 *
 * Elles couvrent TOUT le parchemin, pas la région : le composant ne connaît pas la silhouette
 * qu'il voile, et n'a pas à la connaître. Le découpage se charge de n'en montrer que la part
 * qui tombe sur le territoire. Chaque région attrape donc une portion différente du même
 * brouillard — ce qui est exactement ce qu'on veut d'un brouillard.
 */
const NAPPES: readonly (readonly [number, number, number, number])[] = [
  [280, 210, 400, 190],
  [940, 250, 380, 200],
  [300, 590, 420, 200],
  [920, 610, 400, 190]
];

/**
 * Densité de la nappe la plus dense. **Réglée par la mesure, pas à l'œil** — la brume éclaircit
 * le gris, et trop de brume rend une région voilée aussi pâle que le parchemin qui l'entoure.
 *
 * Mesuré au centre des six territoires, voile plein
 * (`node bac-a-sable/s4-carte/mesurer-voile.mjs --corrige --nappe=…`). « Gris » se juge à la
 * CHROMA (max − min des composantes), jamais à la distance au jeton : la brume éclaircit sans
 * colorer. Repères : `--grisaille` a une chroma de 26, les six territoires peints de 99 à 195.
 *
 *   nappe   teintes rendues            chroma    contraste au parchemin
 *   0,42    #BDBFC1 … #CDCCC9           4 – 13    43 – 73   ← trop pâle, le voile s'efface
 *   0,24    #A9AEB6 … #B5B7BC           7 – 18    64 – 83
 *   0,18    #9AA1AE … #ABB0B8          13 – 20    71 – 86   ← retenu
 *   0,12    #969DAC … #A3A8B3          16 – 22    79 – 90   ← brume presque invisible
 *
 * Les images-clés font respirer l'opacité entre 0,12 et 0,20 : la bande mesurée ci-dessus reste
 * donc vraie pendant toute l'animation, et pas seulement sur l'image d'arrêt.
 */
const DENSITE_NAPPE = 0.18;

/**
 * La plaque de Grisaille. Débordement volontaire du `viewBox` `0 0 1200 800` : le découpage la
 * borne, et un composant qui n'a pas à connaître les dimensions de la scène ne peut pas se
 * tromper dessus.
 */
const PLAQUE = { x: -400, y: -400, largeur: 2000, hauteur: 1600 } as const;

/**
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * LE RALLUMAGE PAR PALIERS — arbitrage du père, 2026-08-03, sur retour de jeu réel.
 *
 * LE DÉFAUT, MESURÉ SUR SA BASE, PAS SUPPOSÉ. Le voile s'effaçait par une opacité linéaire,
 * `opacite = 1 - pourcentageColorie`. Relevé dans `donnees/pierre.db` après son premier
 * exercice :
 *
 *   clairiere : pourcentage_colorie = 0,0833  (1 nœud sur 12)
 *   voile      : opacité = 1 − 0,0833 = 0,917
 *
 * Un exercice réussi levait **8 % d'un voile gris uniforme**. Personne ne voit ça. Son mot
 * exact : « j'ai fait un peu de clairiere, 2/12 écrit en bas, je ne vois aucun changement au
 * gris de la clairiere ». La promesse centrale du jeu — « chaque mini-jeu réussi recolorie une
 * portion de décor », qui est SIMULTANÉMENT la barre de progression, la récompense et la
 * justification narrative (v2 § 3.2) — était exacte dans la base et invisible à l'écran.
 *
 * Ce n'est pas un défaut de rendu : c'est la boucle de récompense qui ne se fermait pas.
 *
 * ── CE QU'IL A TRANCHÉ ────────────────────────────────────────────────────────────────────────
 * « rallume une zone dans la clairiere ça se voit mieux. les 12 paliers c'est bien ». Donc : on
 * GARDE les N paliers (N = le nombre de nœuds de la région, 12 en Clairière, 14 aux Galeries),
 * et chaque palier rallume une ZONE ENTIÈRE au lieu d'éclaircir tout le territoire d'un
 * douzième.
 *
 * ── LA FORME DU RALLUMAGE, ET POURQUOI CELLE-CI ───────────────────────────────────────────────
 * Le halo naît à l'ANCRE de la région — le marqueur que l'enfant vient de taper — et s'étend.
 * Un découpage en bandes aurait aussi « rallumé une zone », mais une bande n'a aucun rapport
 * avec le geste : ici la lumière part de l'endroit où il a joué, et c'est lisible sans une
 * phrase d'explication (R18).
 *
 * ── LE RAYON EST MESURÉ, PAS CALCULÉ — ET LA PREMIÈRE LOI ÉTAIT FAUSSE ────────────────────────
 * Première tentative, écrite puis jetée : `rayon = R·√(k/N)`, qui donne une aire de DISQUE
 * constante. Elle avait l'air juste — l'aire d'un disque va comme le carré du rayon, la racine
 * compense. Mesurée sur les six silhouettes
 * (`node bac-a-sable/diag-particules/mesurer-aire-rallumee.mjs`), elle donnait :
 *
 *   clairiere          palier 1 = 19,5 %   palier 12 = 0,0 %
 *   galeries           palier 1 = 23,3 %   palier 14 = 0,0 %
 *   foret-muette       palier 1 = 24,1 %   palier 12 = 0,0 %
 *   cite-des-histoires palier 1 = 15,5 %   palier 14 = 0,0 %
 *
 * Le disque couvrait tout le territoire bien avant le dernier palier : **les huit derniers
 * exercices de la Clairière n'auraient rien rallumé.** C'est le défaut qu'on corrige, déplacé de
 * la première moitié du parcours vers la seconde — et invisible à la relecture, parce qu'une
 * aire de disque constante RESSEMBLE à une part de territoire constante.
 *
 * Il n'existe pas de formule fermée pour un polygone concave dont l'ancre n'est pas le centre.
 * La loi est donc une TABLE MESURÉE : `rallumage.gen.ts` porte, par région, les quantiles de
 * distance de l'ancre à ses points intérieurs. Le quantile à 25 % **est** le rayon qui contient
 * le quart du territoire — la promesse devient vraie par construction.
 *
 * Portées relevées (dernier quantile) : 147 à 162 unités. Bien en deçà des 192 de la première
 * loi, qui visait le coin de la boîte englobante — un coin qu'aucune silhouette n'atteint.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 */

/**
 * Le bord du halo est FONDU, pas net. Un disque à bord franc lit comme un défaut d'affichage ;
 * un dégradé lit comme de la brume qui se dissipe. La bande fondue occupe les 22 derniers
 * pourcents du rayon.
 */
const BORD_FONDU = 0.78;

export interface ProprietesVoileGrisaille {
  /**
   * Code de la région à voiler. Le voile découpe `#clip-<forme>`, le `clipPath` que
   * `carte-monde-v3.svg` déclare pour chaque territoire — le même qui détoure ses ornements,
   * donc le voile couvre EXACTEMENT ce que le dessin remplit.
   */
  readonly forme: string;
  /** 0 = région entièrement rallumée, 1 = région entièrement voilée. */
  readonly opacite: number;
  readonly animationsDesactivees?: boolean;
  /**
   * Nombre total de paliers de la région — c'est-à-dire son nombre de nœuds. Absent ou nul :
   * le composant retombe sur le voile uniforme piloté par `opacite` seul, et c'est ce que font
   * les cas de test qui ne s'intéressent qu'à la Grisaille elle-même.
   */
  readonly paliers?: number;
  /** Nombre de paliers déjà franchis. Borné à `[0, paliers]`. */
  readonly franchis?: number;
  /**
   * Centre du rallumage, en unités `viewBox` — l'ancre du marqueur de la région. Requis dès que
   * `paliers` est fourni : sans lui le halo naîtrait en (0,0), hors de tout territoire, et le
   * rallumage ne se verrait nulle part.
   */
  readonly centre?: readonly [number, number];
}

/**
 * Rayon du halo pour un palier donné, en unités `viewBox`.
 *
 * Exporté parce que c'est la LOI du rallumage : un test doit pouvoir la confronter à la
 * silhouette réelle sans passer par le rendu — happy-dom ne calcule ni masque ni dégradé.
 *
 * Interpolation LINÉAIRE entre deux quantiles : la table en compte 21, donc un pas de 5 % de
 * territoire, et la part visée par un palier tombe presque toujours entre deux points.
 *
 * Région inconnue de la table — un territoire ajouté au décor sans que le générateur ait été
 * relancé : on rend 0, c'est-à-dire **aucun rallumage**, jamais un rayon inventé. Un halo faux
 * rallumerait la mauvaise part du monde sans que rien ne le signale ; un halo absent se voit
 * au premier exercice joué.
 */
export function rayonDuPalier(franchis: number, paliers: number, forme: string): number {
  if (paliers <= 0) return 0;
  const quantiles = QUANTILES_RALLUMAGE[forme];
  if (quantiles === undefined || quantiles.length < 2) return 0;

  const part = Math.min(1, Math.max(0, franchis / paliers));
  const position = part * (quantiles.length - 1);
  const bas = Math.floor(position);
  const haut = Math.min(quantiles.length - 1, bas + 1);
  const fraction = position - bas;
  return (quantiles[bas] as number) * (1 - fraction) + (quantiles[haut] as number) * fraction;
}

/**
 * Le voile lui-même. À poser DANS le `<svg>` du parchemin, après le décor qu'il couvre.
 *
 * `pointerEvents: none` : le voile ne mange jamais le tap. Une région voilée reste touchable —
 * l'enfant peut toujours demander à voir ce qu'il y a dessous, ça ne coûte rien.
 */
export function VoileGrisaille({
  forme,
  opacite,
  animationsDesactivees = false,
  paliers = 0,
  franchis = 0,
  centre
}: ProprietesVoileGrisaille): ReactElement {
  // ── L'OPACITÉ N'EST PLUS CE QUI RALLUME ─────────────────────────────────────────────────────
  // Elle reste le pilote du voile UNIFORME (repli, et cas de test du lot S4), mais dès que la
  // région déclare ses paliers, la Grisaille garde sa densité PLEINE et c'est le halo qui la
  // retire. Les deux mécanismes se cumuleraient sinon : un territoire à moitié rallumé serait
  // en plus à moitié transparent, et on retomberait sur l'éclaircissement invisible qu'on
  // corrige ici.
  const parPaliers = paliers > 0 && centre !== undefined;
  const borne = parPaliers ? 1 : Math.min(1, Math.max(0, opacite));

  const franchisBorne = Math.min(paliers, Math.max(0, Math.trunc(franchis)));
  const rayon = parPaliers ? rayonDuPalier(franchisBorne, paliers, forme) : 0;

  // Région terminée : le voile ne rend RIEN. Pas un groupe vide à opacité nulle — un `<g>` qui
  // ne se voit pas reste un `<g>` qu'on finira par croire actif, et le mode de défaillance de
  // ce fichier a toujours été « l'intention se lit dans le code, le rendu dit l'inverse ».
  const identifiantMasque = `masque-rallumage-${forme}`;

  return (
    <g
      data-voile="grisaille"
      data-voile-opacite={borne.toFixed(2)}
      data-voile-region={forme}
      data-voile-paliers={parPaliers ? String(paliers) : undefined}
      data-voile-franchis={parPaliers ? String(franchisBorne) : undefined}
      // Le contrat de sortie MESURABLE du rallumage : le rayon effectif, en unités `viewBox`.
      // C'est ce nombre qu'un test relève pour prouver que la douzième réussite rallume la même
      // aire que la première — « 14 particules au maximum » avait déjà cette forme.
      data-voile-rayon={parPaliers ? rayon.toFixed(1) : undefined}
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    >
      <style>{IMAGES_CLES_BRUME}</style>
      {parPaliers ? (
        <defs>
          {/*
            LE HALO EST UN MASQUE, PAS UN DISQUE POSÉ PAR-DESSUS.

            Un disque couleur parchemin masquerait le territoire au lieu de le découvrir : on
            verrait une tache beige, pas la Clairière verte. Le masque, lui, RETIRE la
            Grisaille — ce qui apparaît dessous est le dessin en couleur, déjà là depuis le
            début. C'est la même loi que « la couleur vient du code » : un seul asset, deux
            états, jamais un second dessin.
          */}
          <radialGradient id={`${identifiantMasque}-degrade`}>
            <stop offset="0%" stopColor="#000000" />
            <stop offset={`${String(Math.round(BORD_FONDU * 100))}%`} stopColor="#000000" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </radialGradient>
          <mask id={identifiantMasque}>
            <rect
              x={PLAQUE.x}
              y={PLAQUE.y}
              width={PLAQUE.largeur}
              height={PLAQUE.hauteur}
              fill="#FFFFFF"
            />
            <circle
              data-voile-halo="rallumage"
              cx={centre[0]}
              cy={centre[1]}
              r={rayon}
              fill={`url(#${identifiantMasque}-degrade)`}
              // La croissance du rayon est une TRANSITION, pas une `animation` : elle ne se
              // joue qu'au changement de valeur, donc exactement quand l'enfant revient de son
              // exercice — et le garde-fou `prefers-reduced-motion` du lot S4, qui coupe les
              // `animation`, n'a pas à la connaître. `animationsDesactivees` la coupe ici.
              style={
                animationsDesactivees
                  ? undefined
                  : { transition: 'r 900ms cubic-bezier(.16, 1, .3, 1)' }
              }
            />
          </mask>
        </defs>
      ) : null}
      <g
        clipPath={`url(#clip-${forme})`}
        opacity={borne}
        {...(parPaliers ? { mask: `url(#${identifiantMasque})` } : {})}
      >
        <rect
          data-voile-plaque="grisaille"
          x={PLAQUE.x}
          y={PLAQUE.y}
          width={PLAQUE.largeur}
          height={PLAQUE.hauteur}
          fill="var(--grisaille)"
        />
        {NAPPES.map(([cx, cy, rx, ry], rang) => (
          <ellipse
            // Les nappes sont posées une fois pour toutes et jamais réordonnées : l'index est
            // ici une position dans un dessin, pas l'identité d'une donnée.
            key={`nappe-${String(rang)}`}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="var(--parchemin)"
            opacity={rang % 2 === 0 ? DENSITE_NAPPE : DENSITE_NAPPE * 0.57}
            style={
              animationsDesactivees
                ? undefined
                : {
                    animation: `${
                      rang % 2 === 0 ? 'pierre-brume-aller' : 'pierre-brume-retour'
                    } ${String(11 + rang * 2)}s ease-in-out infinite alternate`
                  }
            }
          />
        ))}
      </g>
    </g>
  );
}
