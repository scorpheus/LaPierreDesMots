import type { FamilleMaths, LieuMaths, NiveauMaths } from './types.js';

/** Paramètres éditoriaux V1. Le catalogue décrit les 54 domaines, pas leurs moteurs. */
export interface DomaineMaths {
  readonly bornes: string;
  readonly representation: string;
  readonly operation: string;
  readonly contraintes: readonly string[];
  readonly exclusions: readonly string[];
  readonly outilNeutre: string;
  readonly aideGobi: string;
  readonly secours: string;
  readonly signature: string;
  readonly notions: readonly string[];
}
export interface FamilleCatalogueMaths {
  readonly id: FamilleMaths;
  readonly lieu: LieuMaths;
  readonly titre: string;
  readonly niveaux: Readonly<Record<NiveauMaths, DomaineMaths>>;
}
type Entree = readonly [string, string, string, string, string];
const definir = (bornes: string, representation: string, operation: string, contraintes: string,
  exclusions: string, outilNeutre: string, aideGobi: string, notion: string): DomaineMaths => ({
  bornes, representation, operation,
  contraintes: contraintes.split('; '), exclusions: exclusions.split('; '), outilNeutre, aideGobi,
  secours: 'Instance de secours versionnée, du même niveau et validée avant publication.',
  signature: `${operation} | nombres normalisés | inconnue`, notions: [notion],
});
const famille = (
  id: FamilleMaths, lieu: LieuMaths, titre: string, outil: string, aide: string, notion: string,
  d: Entree, e: Entree, f: Entree,
): FamilleCatalogueMaths => ({
  id, lieu, titre,
  niveaux: {
    decouverte: definir(...d, outil, aide, notion),
    exploration: definir(...e, outil, aide, notion),
    defi: definir(...f, outil, aide, notion),
  },
});

export const CATALOGUE_MATHS: readonly FamilleCatalogueMaths[] = [
  famille('MAT-JAR-01', 'jardin', 'Bottes de graines', 'Plateau, annuler, tableau C/D/U', 'Échange dix contre un', 'math.numeration.decomposition',
    ['0–99', 'objets isolés puis dizaines', 'décomposer', 'accueil 0–10 isolés; plateau vide pour zéro', 'pas de stock manquant'],
    ['100–499', 'centaines, dizaines, unités', 'échanger et décomposer', 'un échange demandé', 'pas de résultat >499'],
    ['100–1000', 'plusieurs décompositions', 'échanger et décomposer', 'au moins deux décompositions; stock borné; une non canonique', 'pas de résultat >1000']),
  famille('MAT-JAR-02', 'jardin', 'Plates-bandes à partager', 'Superposition du tout, pièces, quadrillage', 'Superposer les parts égales', 'math.fractions.meme-tout',
    ['dénominateur 2 ou 4', 'même tout partagé', 'couvrir ou compléter', 'parts égales', 'pas de parts inégales'],
    ['dénominateur 3, 5 ou 6', 'un tout visible', 'part non unitaire ou complément', 'somme ≤1', 'pas de tout différent'],
    ['dénominateur 6, 8 ou 10', 'deux représentations', 'comparer ou additionner', 'même tout; même dénominateur si somme; résultat ≤1', 'pas de fraction >1']),
  famille('MAT-JAR-03', 'jardin', 'Carnet des récoltes', 'Jetons, grille unité, inventaire', 'Compter une barre à la fois', 'math.donnees.tableau',
    ['2 catégories, 1–6 chacune', 'barres unité', 'construire', 'catégories distinctes', 'pas de barre non unitaire'],
    ['3–4 catégories, 1–12 chacune', 'panier, tableau, barres', 'transférer et lire', 'total cohérent', 'pas de catégorie indistincte'],
    ['4–5 catégories, 1–20 chacune, total <100', 'panier, tableau, barres', 'transférer puis comparer', 'égalités possibles; total actualisé', 'pas de total ≥100']),
  famille('MAT-PON-01', 'ponts', 'Planches à mesurer', 'Règle virtuelle, bande de report, annuler', 'Montrer le zéro puis reporter', 'math.longueurs.mesure',
    ['2–8 unités cm', 'origine indiquée, deux planches', 'mesurer et comparer', 'égalité exacte; origine commune', 'pas de longueur déduite des pixels'],
    ['5–15 unités cm', 'origine à poser', 'mesurer puis reporter', 'égalité exacte; extrémités jointes', 'pas de longueur déduite des pixels'],
    ['8–25 unités cm', 'plusieurs planches', 'mesurer puis composer', 'combinaison de même portée; extrémités jointes', 'pas de trou ni chevauchement']),
  famille('MAT-PON-02', 'ponts', 'Pierres de la rive', 'Demi-droite graduée, repères révélables', 'Poser deux repères puis intercaler', 'math.nombres.graduations',
    ['0–30, pas 1', 'fenêtre de cinq graduations', 'placer une borne', 'valeur et position exactes', 'pas de borne hors fenêtre'],
    ['≤300, pas 10', 'fenêtre de cinq graduations', 'placer deux bornes', 'une borne manquante; ordre exact', 'pas de borne hors fenêtre'],
    ['≤1000, pas 1, 10 ou 100', 'fenêtre de cinq graduations', 'intercaler et justifier', 'échelle explicite; deux bornes', 'pas de borne hors fenêtre']),
  famille('MAT-PON-03', 'ponts', 'Tablier modulable', 'Bande de mesure, inventaire, annuler', 'Conserver la longueur par assemblage', 'math.longueurs.composition',
    ['5–12 unités cm', 'deux modules', 'assembler', 'somme exacte; stock suffisant', 'pas de trou ni chevauchement'],
    ['10–25 unités cm', 'trois modules', 'retirer et remplacer', 'somme exacte; stock suffisant', 'pas de trou ni chevauchement'],
    ['15–40 unités cm', 'stock borné', 'chercher plusieurs compositions', 'deux assemblages distincts; somme exacte', 'pas de permutation seule comme second assemblage']),
  famille('MAT-MOU-01', 'moulin', 'Roues et pales', 'Jetons et grille rectangulaire', 'Montrer un groupe égal', 'math.calcul.groupes-egaux',
    ['2–4 roues, 2–5 pales', 'roues dessinées', 'compter par groupes', 'groupes égaux', 'pas de groupe inégal'],
    ['3–6 groupes, 2–8 pales', 'dessin puis addition', 'addition répétée', 'groupes égaux', 'pas de résultat hors domaine'],
    ['total ≤60', 'deux organisations', 'comparer des groupements', 'deux organisations si annoncé', 'pas de résultat >60']),
  famille('MAT-MOU-02', 'moulin', 'Sacs du meunier', 'Bacs, compteur, retour de mesure', 'Distribuer également', 'math.partage.exact',
    ['4–20 mesures, 2–4 sacs', 'mesures isolées', 'partager exactement', 'total divisible par sacs', 'pas de reste tacite'],
    ['≤40 mesures, 2–6 sacs', 'mesures et sacs', 'partager ou trouver sacs', 'partage exact annoncé', 'pas de reste tacite'],
    ['≤60 mesures', 'deux répartitions', 'comparer partages', 'reste seulement si modèle annoncé', 'pas de diviseur nul']),
  famille('MAT-MOU-03', 'moulin', 'Réservoir fractionné', 'Disque, secteurs superposables', 'Montrer le même réservoir', 'math.fractions.meme-tout',
    ['dénominateur 2 ou 4', 'même tout', 'régler puis compléter', 'parts égales', 'pas de tout différent'],
    ['dénominateur 3, 5 ou 6', 'secteurs', 'ajouter ou retirer', 'même dénominateur; résultat 0–1', 'pas de résultat >1'],
    ['dénominateur 6, 8 ou 10', 'deux réglages', 'comparer', 'équivalence visuelle simple; résultat ≤1', 'pas de résultat >1']),
  famille('MAT-MAR-01', 'marche', 'Monnaie du marché', 'Porte-monnaie, tri, somme', 'Montrer un échange de valeur égale', 'math.monnaie.composition',
    ['1–20 € entiers', 'pièces 1, 2 € et billet 10 €', 'composer une somme', 'centimes entiers internes', 'pas de monnaie indisponible'],
    ['1–100 € entiers', 'pièces et billets', 'composer et échanger', 'un échange de valeur égale', 'pas de monnaie indisponible'],
    ['≤20 € avec centimes', 'pièces et billets', 'composer de deux façons', '100 c = 1 €', 'pas de calcul flottant']),
  famille('MAT-MAR-02', 'marche', 'Rendre la monnaie', 'Plateaux donné, prix, rendu', 'Comparer donné et prix', 'math.monnaie.rendu',
    ['prix/donné ≤20 €, rendu ≤10 €', 'trois plateaux', 'soustraire', 'stock de rendu garanti', 'pas de rendu négatif'],
    ['prix/donné ≤100 €', 'trois plateaux', 'payer exactement ou rendre', 'rendu positif si requis', 'pas de rendu négatif'],
    ['prix ≤20 € avec centimes', 'pièces fictives', 'rendre de deux façons', 'centimes entiers', 'pas de calcul flottant']),
  famille('MAT-MAR-03', 'marche', 'Panier sous budget', 'Panier, étiquettes, dépense', 'Comparer panier et budget', 'math.monnaie.budget',
    ['budget ≤20 €', 'trois articles', 'choisir deux', 'au moins une solution', 'pas de panier impossible'],
    ['budget ≤60 €', 'trois besoins', 'choisir', 'au moins une combinaison admissible', 'pas de panier impossible'],
    ['budget ≤100 €', 'deux paniers', 'comparer restes', 'deux paniers distincts admissibles', 'pas de reste négatif']),
  famille('MAT-CHA-01', 'chantier', 'Plan sur quadrillage', 'Grille, règle, équerre, annuler', 'Montrer les côtés', 'math.geometrie.rectangle',
    ['côtés 2–6 carreaux', 'modèle visible', 'construire carré ou rectangle', 'grille logique', 'pas de forme hors grille'],
    ['côtés 2–10 carreaux', 'cotes annoncées', 'construire orientation libre', 'dimensions exactes', 'pas de forme hors grille'],
    ['côtés ≤12', 'rectangle ou deux figures', 'réviser après changement de cote', 'dimensions exactes', 'pas de forme hors grille']),
  famille('MAT-CHA-02', 'chantier', 'Patrons du cube', 'Faces numérotées, pliage', 'Déplier et vérifier', 'math.geometrie.cube',
    ['six faces', 'cube manipulable', 'reconnaître et compter', 'six faces distinctes', 'pas de face absente'],
    ['deux patrons de six carrés', 'pliage illustré', 'choisir un patron valide', 'pliage déterministe', 'pas de patron impossible présenté comme valide'],
    ['six carrés', 'placements autorisés', 'assembler puis comparer', 'deux patrons valides distincts', 'pas de simple rotation comme seconde solution']),
  famille('MAT-CHA-03', 'chantier', 'Balance du chantier', 'Balance et poids étiquetés', 'Comparer les plateaux', 'math.masses.equivalence',
    ['100–900 g', 'deux masses', 'comparer', 'grammes entiers', 'pas de masse négative'],
    ['≤1000 g, 2–4 poids', 'balance', 'équilibrer', 'stock suffisant', 'pas de masse >1000 g'],
    ['≤1 kg', 'deux décompositions', 'équilibrer et convertir', '1 kg = 1000 g', 'pas de masse >1000 g']),
  famille('MAT-HOR-01', 'horloge', 'Cadran de la journée', 'Cadran, quarts, frise', 'Relier cadran et journée', 'math.temps.heure',
    ['1–12 h entières', 'cadran avec matin/après-midi', 'lire', 'contexte explicite', 'pas d’ambiguïté matin/soir'],
    ['heures, demies, quarts', 'cadran et 24 h', 'traduire', 'contexte explicite', 'pas d’ambiguïté matin/soir'],
    ['0–23 h, quarts', 'scène de journée', 'traduire dans les deux sens', 'contexte explicite', 'pas d’ambiguïté matin/soir']),
  famille('MAT-HOR-02', 'horloge', 'Rubans de durée', 'Frise, rubans, annuler', 'Reporter une durée', 'math.temps.duree',
    ['départ heure entière, 15 ou 30 min', 'frise même journée', 'ajouter durée', 'arrivée même journée', 'pas de franchissement de jour'],
    ['départ heure ou demi-heure, deux rubans 15/30 min', 'frise au quart', 'additionner durées', 'arrivée au quart', 'pas de franchissement de jour'],
    ['quarts d’heure, total 30–120 min', 'deux parcours', 'comparer durées', 'arrivée même journée', 'pas de franchissement de jour']),
  famille('MAT-HOR-03', 'horloge', 'Tableau des trajets', 'Tableau à double entrée, frise', 'Montrer ligne et colonne', 'math.donnees.double-entree',
    ['2×2', 'destinations et moments', 'lire puis placer', 'case cohérente', 'pas de case absente'],
    ['jusqu’à 3×3', 'ligne et colonne', 'choisir départ', 'départ compatible', 'pas de case absente'],
    ['jusqu’à 4×3', 'deux horaires', 'comparer', 'arrivée demandée', 'pas de case absente']),
] as const;

export function domaineMaths(familleId: FamilleMaths, niveau: NiveauMaths): DomaineMaths {
  const entree = CATALOGUE_MATHS.find((f) => f.id === familleId);
  if (!entree) throw new Error(`Famille mathématique inconnue : ${familleId}`);
  return entree.niveaux[niveau];
}
