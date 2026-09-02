import type { IdRegionSvg, RegionColoriable } from '@pierre/partage';

/** Clé compacte et stable d'un pixel RGB, indépendante de la casse du manifeste. */
function cleRgb(rouge: number, vert: number, bleu: number): number {
  return ((rouge & 0xff) << 16) | ((vert & 0xff) << 8) | (bleu & 0xff);
}

function rgbDepuisHex(hex: string): number | null {
  if (!/^#[0-9a-f]{6}$/iu.test(hex)) return null;
  return Number.parseInt(hex.slice(1), 16);
}

/**
 * Construit l'index opposable du masque. Une couleur ne peut nommer qu'une région : sinon un
 * même tap aurait deux sens possibles et le rendu dépendrait de l'ordre du JSON.
 */
export function indexerRegionsDuMasque(
  regions: readonly RegionColoriable[],
): ReadonlyMap<number, IdRegionSvg> {
  const index = new Map<number, IdRegionSvg>();
  for (const region of regions) {
    const couleur = region.couleurMasque;
    if (couleur === undefined) {
      throw new Error(`Région « ${String(region.id)} » sans couleur de masque.`);
    }
    const cle = rgbDepuisHex(couleur);
    if (cle === null) {
      throw new Error(`Couleur de masque invalide pour « ${String(region.id)} » : ${couleur}.`);
    }
    if (index.has(cle)) {
      throw new Error(`La couleur de masque ${couleur} est déjà attribuée à une autre région.`);
    }
    index.set(cle, region.id);
  }
  return index;
}

/** Résout un pixel du masque. Alpha nul et couleur inconnue désignent le décor non coloriable. */
export function regionAuPixel(
  index: ReadonlyMap<number, IdRegionSvg>,
  rouge: number,
  vert: number,
  bleu: number,
  alpha: number,
): IdRegionSvg | null {
  if (alpha === 0) return null;
  return index.get(cleRgb(rouge, vert, bleu)) ?? null;
}
