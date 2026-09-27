import type { FamilleMaths, NiveauMaths } from '@pierre/partage/mathematiques';
import { estFamilleMaths, estNiveauMaths } from '@pierre/partage/mathematiques';

/** Préférence locale : elle ne modifie jamais le journal ni les acquis de l’enfant. */
export interface ConseilParentMaths {
  readonly famille: FamilleMaths;
  readonly niveau: NiveauMaths;
  readonly generationMaths: number;
}
export interface StockageConseilParent {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}
export type StatutConseilParent = 'enregistre' | 'efface' | 'indisponible';

function cle(profilId: string, generationMaths: number): string {
  return `pierre.conseil-parent-maths.v1:${profilId}:${String(generationMaths)}`;
}
function stockageParDefaut(): StockageConseilParent | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
export function lireConseilParentMaths(profilId: string, generationMaths: number, stockage = stockageParDefaut()): ConseilParentMaths | null {
  if (stockage === null) return null;
  try {
    const valeur: unknown = JSON.parse(stockage.getItem(cle(profilId, generationMaths)) ?? 'null');
    if (typeof valeur !== 'object' || valeur === null) return null;
    const conseil = valeur as Partial<ConseilParentMaths>;
    return estFamilleMaths(conseil.famille) && estNiveauMaths(conseil.niveau) && conseil.generationMaths === generationMaths
      ? conseil as ConseilParentMaths : null;
  } catch { return null; }
}
export function enregistrerConseilParentMaths(profilId: string, conseil: ConseilParentMaths, stockage = stockageParDefaut()): StatutConseilParent {
  if (stockage === null) return 'indisponible';
  try { stockage.setItem(cle(profilId, conseil.generationMaths), JSON.stringify(conseil)); return 'enregistre'; } catch { return 'indisponible'; }
}
export function effacerConseilParentMaths(profilId: string, generationMaths: number, stockage = stockageParDefaut()): StatutConseilParent {
  if (stockage === null) return 'indisponible';
  try { stockage.removeItem(cle(profilId, generationMaths)); return 'efface'; } catch { return 'indisponible'; }
}
