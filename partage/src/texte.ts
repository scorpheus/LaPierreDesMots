/**
 * Normalisation de texte : accents, casse, ligatures, apostrophes, espaces.
 *
 * Le texte destiné à l'enfant utilise l'apostrophe typographique `’` (contrat § 0) ; toute
 * comparaison passe par ici, pour qu'un `'` tapé au clavier ne fasse jamais échouer une
 * égalité que l'œil juge vraie.
 */

/**
 * Signes diacritiques laissés par une décomposition NFD : la catégorie Unicode « marque
 * non espaçante », plus large et plus lisible que le seul bloc U+0300–U+036F.
 */
const DIACRITIQUES = /\p{Mn}/gu;

/** Apostrophes gauche, typographique, modificatrice, accent grave et accent aigu isolés. */
const APOSTROPHES = /[‘’ʼ`´]/g;

/** Toute suite d'espaces, y compris insécables et fine insécable. */
const ESPACES = /\s+/gu;

/**
 * Forme canonique d'un texte : minuscules, sans accent, ligatures dépliées, apostrophes
 * ramenées à `'`, espaces réduits à un seul, sans espace de bord.
 *
 * `normaliserTexte('  L’ÉCOLE   du   cœur ')` vaut `"l'ecole du coeur"`.
 */
export function normaliserTexte(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(APOSTROPHES, "'")
    .replace(ESPACES, ' ')
    .trim();
}

/** Vrai si les deux textes ont la même forme canonique. */
export function comparerNormalise(a: string, b: string): boolean {
  return normaliserTexte(a) === normaliserTexte(b);
}
