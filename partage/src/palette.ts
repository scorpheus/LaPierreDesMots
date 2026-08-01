/**
 * Jetons de couleur (v2 § 9.2) et nuancier de coloriage.
 *
 * « La couleur vient du code, pas du modèle » (annexe P § 2) : le SVG ne porte aucune couleur,
 * c'est l'application qui l'applique depuis ces deux tables. Elles sont donc **la** source des
 * couleurs du dépôt ; `client/src/styles/global.css` (lot L-D) en dérive ses variables CSS.
 *
 * Écart assumé n° 2 du contrat : le nuancier de coloriage est une **addition** à la direction
 * artistique, pas une révision. Les 7 jetons de la v2 § 9.2 sont repris à l'octet près, aucun
 * n'est modifié. Six couleurs du nuancier reprennent exactement un jeton, `brun` reprend la
 * couleur de cheveux de la v2 § 4.1, et quatre — `rouge`, `orange`, `vert`, `violet` — sont
 * nouvelles : **elles restent à valider** (contrat § 12, écart n° 2).
 */

/** Les sept jetons de la v2 § 9.2. `trait` et `parchemin` ne se surchargent jamais. */
export type JetonCouleur =
  | 'trait'
  | 'parchemin'
  | 'soleil'
  | 'framboise'
  | 'menthe'
  | 'lagon'
  | 'grisaille';

/** Les onze couleurs que l'enfant peut poser. Alignées sur l'énumération du contrat § 9.3. */
export type CouleurColoriage =
  | 'rouge'
  | 'orange'
  | 'jaune'
  | 'vert'
  | 'bleu'
  | 'violet'
  | 'rose'
  | 'brun'
  | 'noir'
  | 'blanc'
  | 'gris';

/** v2 § 9.2, sans une valeur de plus ni de moins. */
export const PALETTE: Readonly<Record<JetonCouleur, string>> = {
  trait: '#1B2440',
  parchemin: '#FFF6E3',
  soleil: '#FFC93C',
  framboise: '#FF5D8F',
  menthe: '#3DDC97',
  lagon: '#2FA8E0',
  grisaille: '#8E97A8',
};

/**
 * Le nuancier de coloriage. La colonne « origine » n'est pas décorative : elle dit lesquelles
 * de ces couleurs sont déjà validées et lesquelles sont une proposition.
 *
 * | couleur | origine |
 * |---|---|
 * | `jaune` | jeton `soleil` (v2 § 9.2) |
 * | `bleu` | jeton `lagon` (v2 § 9.2) |
 * | `rose` | jeton `framboise` (v2 § 9.2) |
 * | `noir` | jeton `trait` (v2 § 9.2) |
 * | `blanc` | jeton `parchemin` (v2 § 9.2) |
 * | `gris` | jeton `grisaille` (v2 § 9.2) |
 * | `brun` | cheveux châtains de la v2 § 4.1 |
 * | `rouge`, `orange`, `vert`, `violet` | **proposées**, aplats francs cernés de trait — à valider |
 */
export const NUANCIER: Readonly<Record<CouleurColoriage, string>> = {
  rouge: '#E03131',
  orange: '#F76707',
  jaune: '#FFC93C',
  vert: '#2FB344',
  bleu: '#2FA8E0',
  violet: '#8B5CF6',
  rose: '#FF5D8F',
  brun: '#7A5230',
  noir: '#1B2440',
  blanc: '#FFF6E3',
  gris: '#8E97A8',
};

/**
 * Hexadécimal d'une couleur de coloriage ou d'un jeton. Les deux ensembles de noms sont
 * disjoints, la levée d'ambiguïté est donc gratuite : le nuancier d'abord, la palette ensuite.
 *
 * `surcharges` porte la `VariantePalette.jetons` de l'habillage courant, le cas échéant
 * (contrat § 4.1). Un jeton non surchargé garde sa valeur v2.
 */
export function hexDeCouleur(
  couleur: CouleurColoriage | JetonCouleur,
  surcharges?: Readonly<Partial<Record<JetonCouleur, string>>>,
): string {
  if (couleur in NUANCIER) {
    return NUANCIER[couleur as CouleurColoriage];
  }
  const jeton = couleur as JetonCouleur;
  return surcharges?.[jeton] ?? PALETTE[jeton];
}
