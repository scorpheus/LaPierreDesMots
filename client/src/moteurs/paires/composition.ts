/** Composer les formes sans trier les réponses : chaque sous-liste garde son mélange initial. */
export function composerCartesPaires<T extends { readonly face: string; readonly asset: unknown }>(
  cartes: readonly T[],
): { readonly cartes: readonly T[]; readonly mixte: boolean } {
  const images = cartes.filter((carte) => carte.face === 'image' && carte.asset !== null);
  const textes = cartes.filter((carte) => carte.face !== 'image' || carte.asset === null);
  if (images.length !== textes.length || images.length === 0) return { cartes, mixte: false };
  // Aucune lecture des identifiants de paire : les voisines ne donnent pas la solution.
  return { cartes: textes.flatMap((texte, index) => [texte, images[index]!]), mixte: true };
}
