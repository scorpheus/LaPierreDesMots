import { CATALOGUE_MATHS } from './catalogue.js';
import type { FamilleMaths, GesteMaths, NiveauMaths } from './types.js';

const NIVEAUX: readonly string[] = ['decouverte', 'exploration', 'defi'];
const entier = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const texte = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function estFamilleMaths(v: unknown): v is FamilleMaths {
  return typeof v === 'string' && CATALOGUE_MATHS.some((f) => f.id === v);
}
export function estNiveauMaths(v: unknown): v is NiveauMaths {
  return typeof v === 'string' && NIVEAUX.includes(v);
}
export function estGraineMaths(v: unknown): v is number {
  return entier(v) && v >= 0 && v <= 0xffff_ffff;
}

/** Un corps HTTP inconnu ne peut jamais laisser entrer NaN, un ID vide ou un geste inconnu. */
export function estGesteMaths(brut: unknown): brut is GesteMaths {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return false;
  const g = brut as Record<string, unknown>;
  switch (g.type) {
    case 'placer': return texte(g.objetId) && entier(g.position) &&
      (g.destination === undefined || texte(g.destination));
    case 'placer-piece': return texte(g.objetId) && entier(g.position);
    case 'retirer':
    case 'choisir': return texte(g.objetId);
    case 'aligner-regle': return entier(g.origine);
    case 'lire-longueur': return entier(g.valeur);
    case 'placer-borne': return entier(g.valeur) && entier(g.position);
    case 'montrer-encadrement': return entier(g.inferieure) && entier(g.superieure) &&
      g.inferieure < g.superieure;
    case 'annuler': return true;
    case 'ecouter': return g.contenu === 'consigne' || g.contenu === 'indice' || g.contenu === 'demonstration';
    case 'aide': return g.niveau === 'indice' || g.niveau === 'demonstration';
    default: return false;
  }
}

export function decoderGesteMaths(brut: unknown): GesteMaths {
  if (!estGesteMaths(brut)) throw new Error('Geste mathématique invalide.');
  return brut;
}
