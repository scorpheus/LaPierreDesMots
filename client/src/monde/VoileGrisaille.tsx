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
  animationsDesactivees = false
}: ProprietesVoileGrisaille): ReactElement {
  const borne = Math.min(1, Math.max(0, opacite));

  return (
    <g
      data-voile="grisaille"
      data-voile-opacite={borne.toFixed(2)}
      data-voile-region={forme}
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    >
      <style>{IMAGES_CLES_BRUME}</style>
      <g clipPath={`url(#clip-${forme})`} opacity={borne}>
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
