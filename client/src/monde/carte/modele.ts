import type { CodeRegion, EtatRegion, IdNoeud } from '@pierre/partage';

export const ANCRES_CARTE: readonly (readonly [CodeRegion, number, number, string])[] = [
  ['clairiere', 600, 690, 'La Clairière'],
  ['galeries', 990, 560, 'Les Galeries'],
  ['marais-jumeau', 1040, 370, 'Le Marais Jumeau'],
  ['foret-muette', 990, 150, 'La Forêt Muette'],
  ['volcan', 165, 590, 'Le Volcan'],
  ['cite-des-histoires', 160, 395, 'La Cité des Histoires']
];

export const SVG_CARTE = 'habillages/carte/carte-monde-v3.svg';
export const RASTER_CARTE = 'assets/decors/carte-six-regions.png';
export const ANCRE_CONCLUSION = [600, 470] as const;

/** Décors d'activité validés, employés ici comme aperçu de chaque région. */
export const DECOR_REGION: Readonly<Record<CodeRegion, string>> = {
  clairiere: 'habillages/clairiere/collier.svg',
  galeries: 'habillages/galeries/cristal.svg',
  'marais-jumeau': 'habillages/marais-jumeau/brume.svg',
  'foret-muette': 'habillages/foret-muette/bestiaire.svg',
  volcan: 'habillages/volcan/coulee.svg',
  'cite-des-histoires': 'habillages/cite-des-histoires/banniere.svg'
};

export interface DestinationRegion {
  readonly region: EtatRegion;
  readonly libelle: string;
  readonly noeud: IdNoeud | null;
  readonly rang: number;
  /** Étape mise en avant par le parcours réel. */
  readonly conseillee: boolean;
  /** Nœuds réellement acquis pour ce profil ; aucune déduction par position. */
  readonly noeudsAcquis: ReadonlySet<string>;
  /** La région est ouverte dans le monde ou entièrement acquise et donc revisitable. */
  readonly jouable: boolean;
}

export function libelleDeRegion(code: CodeRegion): string {
  return ANCRES_CARTE.find(([ancre]) => ancre === code)?.[3] ?? String(code);
}

export function interieurDuSvg(texte: string): string {
  return texte.replace(/^[\s\S]*?<svg[^>]*>/u, '').replace(/<\/svg>\s*$/u, '');
}
