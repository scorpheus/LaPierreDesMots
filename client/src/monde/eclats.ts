/**
 * LES SIX ÉCLATS DE PIERRE — un par région, distincts par la FORME et par la COULEUR.
 *
 * ══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUI A ÉTÉ MESURÉ, ET CE QUE J'AVAIS DIT DE FAUX
 *
 * J'avais annoncé au père qu'« aucun pictogramme d'Éclat n'existe dans le dépôt ». C'était
 * faux : `EcranCoffre.tsx` en portait un, `M24 3l13 15-5 19-8 10-8-10-5-19z`, doré à
 * `var(--soleil)` une fois gagné et en Grisaille tant qu'il ne l'est pas. Le vrai défaut était
 * plus fin et plus gênant : **les six régions portaient le même dessin dans la même couleur.**
 *
 * Un coffre où six trophées sont identiques ne dit pas ce qu'il reste à trouver. Or c'est
 * exactement ce que la v2 § 9.1 demande à cet écran : « jamais une case vide, jamais un
 * cadenas » — la case en creux montre CE QU'ON PEUT ENCORE GAGNER, et elle ne le montre pas si
 * les six creux sont indiscernables.
 *
 * ── POURQUOI DU SVG ÉCRIT, ET NON UNE IMAGE GÉNÉRÉE ───────────────────────────────────────
 * Trois raisons mesurées, aucune esthétique :
 *
 *  1. `filter: saturate(0)` grise la case non obtenue. Sur un dessin vectoriel dont les
 *     remplissages viennent des jetons de palette, le gris est EXACTEMENT la Grisaille du jeu.
 *     Sur un PNG généré, c'est le gris moyen de ce PNG-là, différent d'une région à l'autre.
 *  2. `potrace` est absent (`outils/bin/` ne contient que `tts`, vérifié le 2026-08-08) : une
 *     image générée resterait une image, sans régions colorables par le code. « La couleur
 *     vient du code, pas du modèle » (annexe P § 2) n'aurait plus de prise sur elle.
 *  3. Un pictogramme de 48 px n'a pas besoin d'un modèle de diffusion. Le coût d'une image,
 *     c'est sa reproductibilité : un verrou, une graine, un checkpoint, une passe de QC.
 *
 * Ce module n'interdit rien pour la suite : le jour où le père veut des Éclats dessinés, le
 * champ `asset` de `Case` existe déjà et prend le pas sur ces silhouettes.
 *
 * ── LES COULEURS SORTENT DU NUANCIER, JAMAIS D'AILLEURS ───────────────────────────────────
 * La palette du jeu compte quatre couleurs — soleil, framboise, menthe, lagon — et six régions.
 * Plutôt que d'en inventer deux (interdit sans validation, CLAUDE.md), on puise dans le
 * `--nuancier-*` que `global.css` déclare déjà pour le coloriage : ce sont des jetons du dépôt,
 * pas des valeurs neuves.
 * ══════════════════════════════════════════════════════════════════════════════════════════
 */

export interface Eclat {
  /** Silhouette en `viewBox="0 0 48 48"`, fermée, tracée à 4 px comme tout le jeu (v2 § 9.1). */
  readonly silhouette: string;
  /** Jeton de palette du remplissage, une fois l'Éclat gagné. */
  readonly teinte: string;
  /** Ce que l'Éclat évoque, dit à voix haute par la fiche (R28). Jamais du décoratif muet. */
  readonly evocation: string;
}

/**
 * Les six, dans l'ordre de la progression phonologique — qui est aussi l'ordre du monde.
 *
 * Chaque forme est tenue de rester DISCERNABLE À 48 px et en Grisaille : c'est le régime réel
 * de la case en creux, et une silhouette qui n'y survit pas ne sert à rien. La distinction
 * porte donc sur le contour — pointes, épaules, symétrie — jamais sur un détail intérieur.
 */
export const ECLATS: Readonly<Record<string, Eclat>> = {
  // Une pousse. La Clairière est la première région, celle qui s'ouvre.
  clairiere: {
    silhouette: 'M24 4C34 14 38 26 32 38L24 44L16 38C10 26 14 14 24 4Z',
    teinte: 'var(--menthe)',
    evocation: 'un bourgeon de pierre verte',
  },
  // Un fût hexagonal, haut et droit comme les troncs qu'on traverse sans bruit.
  'foret-muette': {
    silhouette: 'M24 4L38 12V32L24 44L10 32V12Z',
    teinte: 'var(--nuancier-vert)',
    evocation: 'une colonne de pierre sombre',
  },
  // DEUX pointes : le Marais est jumeau, et son Éclat le dit sans qu'on ait à l'écrire.
  'marais-jumeau': {
    silhouette: 'M14 6L22 24L18 42L8 26ZM34 6L40 26L30 42L26 24Z',
    teinte: 'var(--lagon)',
    evocation: 'deux pointes d’eau qui se répondent',
  },
  // Large et bas, taillé en galerie : on y descend, on n'y monte pas.
  galeries: {
    silhouette: 'M6 22L18 8H30L42 22L30 40H18Z',
    teinte: 'var(--nuancier-violet)',
    evocation: 'une pierre taillée sous la terre',
  },
  // Un éclat à quatre branches, comme une étincelle qui vient de partir.
  volcan: {
    silhouette: 'M24 4L31 17L44 24L31 31L24 44L17 31L4 24L17 17Z',
    teinte: 'var(--nuancier-orange)',
    evocation: 'une étincelle prise dans la pierre',
  },
  // Un losange haut, celui qu'on pose au sommet d'une tour de la Cité.
  'cite-des-histoires': {
    silhouette: 'M24 4L36 24L24 44L12 24Z',
    teinte: 'var(--framboise)',
    evocation: 'la pierre qui coiffe les toits',
  },
};

/**
 * L'Éclat d'une région, ou celui par défaut.
 *
 * Le repli n'est pas une précaution de style : une région ajoutée demain doit afficher QUELQUE
 * CHOSE plutôt que rien — « jamais une case vide » vaut aussi pour le code qui ne connaît pas
 * encore la région. `tests/unitaires/eclats-des-regions.test.ts` croise cette table avec les
 * régions réellement livrées, pour que le repli reste un filet et ne devienne pas l'usage.
 */
export function eclatDeRegion(region: string): Eclat {
  return (
    ECLATS[region] ?? {
      silhouette: 'M24 3l13 15-5 19-8 10-8-10-5-19z',
      teinte: 'var(--soleil)',
      evocation: 'un éclat de pierre',
    }
  );
}
