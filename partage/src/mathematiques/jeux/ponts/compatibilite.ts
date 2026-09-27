import type { InstancePont } from './index.js';
import { estNiveauMaths, estGraineMaths } from '../../entrees.js';

/** Reprise : une version non reconnue est refusée avant tout geste ou crédit. */
export function estInstancePont(valeur: unknown): valeur is InstancePont {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const i = valeur as Record<string, unknown>;
  if (i.format !== 1 || i.versionModele !== 1 || i.versionGenerateur !== 1 ||
      typeof i.id !== 'string' || i.id === '' || typeof i.signature !== 'string' ||
      !estNiveauMaths(i.niveau) || !estGraineMaths(i.graine) || !Array.isArray(i.stock) ||
      typeof i.parametres !== 'object' || i.parametres === null ||
      typeof i.etatInitial !== 'object' || i.etatInitial === null) return false;
  const p = i.parametres as Record<string, unknown>;
  const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n);
  const piece = (v: unknown): boolean => typeof v === 'object' && v !== null &&
    typeof (v as Record<string, unknown>).id === 'string' && entier((v as Record<string, unknown>).longueur);
  if (i.famille === 'MAT-PON-01') {
    const segments = p.segmentsTrajet;
    const reparation = p.reparation && typeof p.reparation === 'object'
      ? p.reparation as Record<string, unknown> : null;
    return entier(p.origineCible) && entier(p.longueurCible) &&
      (p.nombrePlanches === 1 || p.nombrePlanches === 2) && Array.isArray(p.choix) && p.choix.every(piece) &&
      (segments === undefined || (Array.isArray(segments) && segments.length === 2 &&
        segments.every((s) => piece(s) && entier((s as Record<string, unknown>).origine)) &&
        entier(p.repereDestination))) &&
      (p.reparation === undefined || (reparation !== null &&
        entier(reparation.moduleRestantCm) && reparation.moduleEndommageId === 'module-endommage' &&
        entier(reparation.moduleEndommageCm)));
  }
  if (i.famille === 'MAT-PON-02') {
    const e = p.encadrement as Record<string, unknown> | undefined;
    return (p.pas === 1 || p.pas === 10 || p.pas === 100) && entier(p.reperePont) &&
      Array.isArray(p.graduations) && p.graduations.every(entier) &&
      Array.isArray(p.bornesAPoser) && p.bornesAPoser.every(entier) &&
      !!e && entier(e.inferieure) && entier(e.superieure) &&
      (p.porteeAVerifier === undefined || entier(p.porteeAVerifier));
  }
  if (i.famille === 'MAT-PON-03') {
    const reparation = p.reparation && typeof p.reparation === 'object'
      ? p.reparation as Record<string, unknown> : null;
    const trajet = p.trajet && typeof p.trajet === 'object'
      ? p.trajet as Record<string, unknown> : null;
    return entier(p.portee) && entier(p.nombrePiecesMinimum) && Array.isArray(p.pieces) && p.pieces.every(piece) &&
      (p.reparation === undefined || (reparation !== null && typeof reparation.moduleRestantId === 'string' &&
        reparation.moduleEndommageId === 'module-endommage' &&
        entier(reparation.moduleEndommageCm) && entier(reparation.manqueCm))) &&
      (p.trajet === undefined || (trajet !== null &&
        entier(trajet.longueurA) && entier(trajet.longueurB) && entier(trajet.repereDestination)));
  }
  return false;
}
