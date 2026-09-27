import { CATALOGUE_MATHS, creerInstancesProjetMaths, trameProjetMaths,
  type FamilleMaths, type LieuMaths, type NiveauMaths, type ProjetMathsId } from '@pierre/partage/mathematiques';

export const LIEUX_MATHS = [
  { id: 'jardin', prefixe: 'JAR', nom: 'Jardin des graines', image: '🌱', histoire: 'Des graines attendent. Aide Gobi à faire pousser le jardin.' },
  { id: 'ponts', prefixe: 'PON', nom: 'Ponts des rives', image: '🪵', histoire: 'Un passage attend entre les deux rives. Construis-le avec Gobi.' },
  { id: 'moulin', prefixe: 'MOU', nom: 'Moulin des parts', image: '🌾', histoire: 'La roue est arrêtée. Prépare la farine pour les voisins.' },
  { id: 'marche', prefixe: 'MAR', nom: 'Marché du matin', image: '🍎', histoire: 'Les étals se réveillent. Prépare les paniers et les pièces.' },
  { id: 'chantier', prefixe: 'CHA', nom: 'Chantier des formes', image: '🧱', histoire: 'Des plans attendent sur la table. Aide Gobi à bâtir la tour.' },
  { id: 'horloge', prefixe: 'HOR', nom: 'Horloge des voyages', image: '🕰️', histoire: 'La grande horloge attend. Aide les amis à arriver à l’heure.' },
] as const;
export const NIVEAUX_MATHS: readonly NiveauMaths[] = ['decouverte', 'exploration', 'defi'];
export const NOM_NIVEAU_MATHS = { decouverte: 'Découvrir', exploration: 'Explorer', defi: 'Défi' } as const;
export function lieuFamille(famille: FamilleMaths): LieuMaths {
  return CATALOGUE_MATHS.find((f) => f.id === famille)!.lieu;
}
export function nomProjet(id: ProjetMathsId): string { return trameProjetMaths(id).titre; }
export function nomLieu(lieu: LieuMaths): string { return LIEUX_MATHS.find((l) => l.id === lieu)!.nom; }

/** Même fabrique que le service : une combinaison refusée s'explique avant le départ. */
export function incompatibiliteProjet(projetId: ProjetMathsId, niveaux: readonly NiveauMaths[]): string | null {
  try {
    creerInstancesProjetMaths({ profilId: 'choix', generationMaths: 0, cleGeste: 'choix', projetId,
      niveaux, graine: 0, sessionId: 'choix' });
    return null;
  } catch (cause) { return cause instanceof Error ? cause.message : 'Ces niveaux ne vont pas ensemble dans ce projet.'; }
}
export function premiersNiveaux(projetId: ProjetMathsId): readonly [NiveauMaths, NiveauMaths, NiveauMaths] {
  for (const a of NIVEAUX_MATHS) for (const b of NIVEAUX_MATHS) for (const c of NIVEAUX_MATHS) {
    if (incompatibiliteProjet(projetId, [a, b, c]) === null) return [a, b, c];
  }
  throw new Error(`Aucune combinaison jouable pour ${projetId}.`);
}
