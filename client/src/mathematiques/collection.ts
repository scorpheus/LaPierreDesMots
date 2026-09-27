type LieuMaths = 'jardin' | 'ponts' | 'moulin' | 'marche' | 'chantier' | 'horloge';
type CategorieCollection = 'souvenir' | 'objet' | 'fete';

export interface CollectibleMaths {
  readonly cadeauId: string;
  readonly lieu: LieuMaths | 'fete';
  readonly categorie: CategorieCollection;
  readonly nom: string;
  readonly provenance: string;
  readonly forme: 'graine' | 'galet' | 'plume' | 'ruban' | 'caillou' | 'perle' | 'arrosoir' | 'planchette' | 'roue' | 'panier' | 'brique' | 'aiguille' | 'lanterne';
}

const LIEUX: readonly LieuMaths[] = ['jardin', 'ponts', 'moulin', 'marche', 'chantier', 'horloge'];
const NOMS_LIEUX: Readonly<Record<LieuMaths, string>> = {
  jardin: 'le Jardin des graines', ponts: 'les Ponts des rives', moulin: 'le Moulin des parts',
  marche: 'le Marché du matin', chantier: 'le Chantier des formes', horloge: 'l’Horloge des voyages',
};

const SOUVENIRS: Readonly<Record<LieuMaths, readonly [string, CollectibleMaths['forme']]>> = {
  jardin: ['Graine de lune', 'graine'], ponts: ['Galet mesureur', 'galet'], moulin: ['Plume du vent', 'plume'],
  marche: ['Ruban du marché', 'ruban'], chantier: ['Caillou solide', 'caillou'], horloge: ['Perle d’heure', 'perle'],
};
const OBJETS: Readonly<Record<LieuMaths, readonly [string, CollectibleMaths['forme']]>> = {
  jardin: ['Arrosoir à gouttes', 'arrosoir'], ponts: ['Planchette à repères', 'planchette'], moulin: ['Roue à compter', 'roue'],
  marche: ['Panier à nombres', 'panier'], chantier: ['Brique à signes', 'brique'], horloge: ['Aiguille dorée', 'aiguille'],
};

/** Les treize emplacements promis : deux par lieu et la lanterne de la fête. */
export const COLLECTIBLES_MATHS: readonly CollectibleMaths[] = [
  ...LIEUX.flatMap((lieu) => {
    const [nomSouvenir, formeSouvenir] = SOUVENIRS[lieu];
    const [nomObjet, formeObjet] = OBJETS[lieu];
    return [
      { cadeauId: `maths-souvenir-${lieu}`, lieu, categorie: 'souvenir' as const, nom: nomSouvenir,
        provenance: `Le premier projet dans ${NOMS_LIEUX[lieu]}.`, forme: formeSouvenir },
      { cadeauId: `maths-objet-${lieu}`, lieu, categorie: 'objet' as const, nom: nomObjet,
        provenance: `Le troisième projet dans ${NOMS_LIEUX[lieu]}.`, forme: formeObjet },
    ];
  }),
  { cadeauId: 'maths-souvenir-fete', lieu: 'fete', categorie: 'fete', nom: 'Lanterne de fête',
    provenance: 'Les trois défis finaux de la Vallée.', forme: 'lanterne' },
];

export function nomCadeauMaths(cadeauId: string): string {
  return COLLECTIBLES_MATHS.find((piece) => piece.cadeauId === cadeauId)?.nom ?? 'Un souvenir du projet';
}
