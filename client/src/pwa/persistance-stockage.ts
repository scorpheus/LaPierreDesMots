/** État de la protection contre l'éviction automatique du stockage du navigateur. */
export type EtatPersistanceStockage =
  | 'durable'
  | 'non-garantie'
  | 'indisponible'
  | 'hors-pwa';

let demandeEnCours: Promise<EtatPersistanceStockage> | null = null;

async function demander(): Promise<EtatPersistanceStockage> {
  if (import.meta.env.MODE !== 'pwa') return 'hors-pwa';
  if (
    !('storage' in navigator) ||
    typeof navigator.storage.persisted !== 'function' ||
    typeof navigator.storage.persist !== 'function'
  ) {
    return 'indisponible';
  }

  try {
    if (await navigator.storage.persisted()) return 'durable';
    return (await navigator.storage.persist()) ? 'durable' : 'non-garantie';
  } catch {
    return 'indisponible';
  }
}

/**
 * Demande la persistance au plus une fois par chargement. Le navigateur reste seul décideur :
 * un refus n'empêche jamais de jouer et n'entraîne aucun repli hors de la base OPFS.
 */
export function demanderPersistanceStockage(): Promise<EtatPersistanceStockage> {
  demandeEnCours ??= demander();
  return demandeEnCours;
}
