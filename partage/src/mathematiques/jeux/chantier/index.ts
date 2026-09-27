import type { Alea } from '../../../alea.js';
import type {
  AideMaths, ConsigneMaths, EtatManipulationMaths, EtapeProjetMaths, GesteMaths,
  InstanceMathsBase, NiveauMaths, ProjetMathsEnCours, ValidationMaths,
} from '../../types.js';

export type FamilleChantier = 'MAT-CHA-01' | 'MAT-CHA-02' | 'MAT-CHA-03';
type Point = readonly [number, number];
type Poids = { readonly id: string; readonly grammes: number; readonly etiquette: string };
export type InstanceChantier01 = InstanceMathsBase<'MAT-CHA-01', {
  readonly largeur: number; readonly hauteur: number; readonly grille: number;
  readonly figure: 'carre' | 'rectangle'; readonly planInitial: readonly Point[] | null;
}, readonly []>;
export type InstanceChantier02 = InstanceMathsBase<'MAT-CHA-02', {
  readonly grille: 6; readonly modele: readonly Point[];
  readonly contreExemple: readonly Point[]; readonly nombrePatrons: 1 | 2;
  readonly versionBibliotheque: 1; readonly nombreBlocs: number | null;
}, readonly []>;
export type InstanceChantier03 = InstanceMathsBase<'MAT-CHA-03', {
  readonly masseCible: number; readonly masseGauche: number | null;
  readonly masseDroite: number | null; readonly poids: readonly Poids[];
  readonly nombrePoidsMinimum: number;
}, readonly Poids[]>;
export type InstanceChantier = InstanceChantier01 | InstanceChantier02 | InstanceChantier03;
export type ProjetChantierId = 'MAT-CHA-P01' | 'MAT-CHA-P02' | 'MAT-CHA-P03';
export type ProjetChantier = ProjetMathsEnCours & { readonly id: ProjetChantierId; readonly version: 1 };

const VIDE: EtatManipulationMaths = { objets: {}, placements: {}, selection: null, historique: [] };
const NIVEAUX: readonly NiveauMaths[] = ['decouverte', 'exploration', 'defi'];
const FAMILLES: readonly FamilleChantier[] = ['MAT-CHA-01', 'MAT-CHA-02', 'MAT-CHA-03'];
const VERSION_MODELE = 1;
const VERSION_GENERATEUR = 1;
const GRILLE_PLAN = 17;
const bornesPlan: Readonly<Record<NiveauMaths, number>> = { decouverte: 6, exploration: 10, defi: 12 };
const consigne = (texte: string, audio: string): ConsigneMaths => ({ texte, segments: [{ texte, audio }] });
const entier = (alea: Alea, min: number, max: number): number => alea.entier(min, max + 1);
const entierValide = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const cellule = ([x, y]: Point, grille: number): number => y * grille + x;
const point = (position: number, grille: number): Point => [position % grille, Math.floor(position / grille)];

function base<F extends FamilleChantier, P, S>(famille: F, niveau: NiveauMaths, alea: Alea,
  parametres: P, stock: S, signature: string, modeleId: string, texte: string, unite: string,
  aide: { indice: string; demonstration: string }): InstanceMathsBase<F, P, S> {
  return {
    format: 1, id: `${famille.toLowerCase()}-${niveau}-${alea.graine.toString(16)}-${signature.replace(/[^a-z0-9]/gi, '-')}`,
    famille, niveau, modeleId, versionModele: VERSION_MODELE, versionGenerateur: VERSION_GENERATEUR,
    graine: alea.graine, signature, parametres, stock, etatInitial: VIDE,
    consigne: consigne(texte, `maths/${modeleId}/consigne`), unite,
    aide: {
      indice: consigne(aide.indice, `maths/${modeleId}/indice`),
      demonstration: consigne(aide.demonstration, `maths/${modeleId}/demonstration`),
    },
    reglesValidation: { version: 1, egaliteExacte: true },
  };
}

function tourner(p: Point, rotation: number): Point {
  const [x, y] = p;
  if (rotation === 0) return [x, y];
  if (rotation === 1) return [-y, x];
  if (rotation === 2) return [-x, -y];
  return [y, -x];
}
function normaliser(points: readonly Point[]): string {
  return Array.from({ length: 8 }, (_, variante) => {
    const transformes = points.map((p) => tourner(variante < 4 ? p : [-p[0], p[1]] as const, variante % 4));
    const minX = Math.min(...transformes.map((p) => p[0]));
    const minY = Math.min(...transformes.map((p) => p[1]));
    return transformes.map(([x, y]) => `${x - minX},${y - minY}`).sort().join(';');
  }).sort()[0]!;
}
function lireForme(cle: string): Point[] {
  return cle.split(';').map((p) => p.split(',').map(Number) as unknown as Point);
}
type Vecteur = readonly [number, number, number];
type Orientation = { readonly droite: Vecteur; readonly bas: Vecteur; readonly normale: Vecteur };
const neg = ([x, y, z]: Vecteur): Vecteur => [-x, -y, -z];
const cleVecteur = (v: Vecteur): string => v.join(',');
const DEPART: Orientation = { droite: [1, 0, 0], bas: [0, 1, 0], normale: [0, 0, 1] };
function plierVoisin(o: Orientation, dx: number, dy: number): Orientation {
  if (dx === 1) return { droite: neg(o.normale), bas: o.bas, normale: o.droite };
  if (dx === -1) return { droite: o.normale, bas: o.bas, normale: neg(o.droite) };
  if (dy === 1) return { droite: o.droite, bas: neg(o.normale), normale: o.bas };
  return { droite: o.droite, bas: o.normale, normale: neg(o.bas) };
}
/** Pliage combinatoire : chaque carré doit recevoir une face différente du cube. */
function facesPliees(points: readonly Point[]): readonly string[] | null {
  if (points.length !== 6 || new Set(points.map((p) => p.join(','))).size !== 6) return null;
  const orientations = new Map<string, Orientation>();
  const depart = points[0]!;
  orientations.set(depart.join(','), DEPART);
  const file: Point[] = [depart];
  while (file.length > 0) {
    const courant = file.shift()!;
    const o = orientations.get(courant.join(','))!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const voisin: Point = [courant[0] + dx, courant[1] + dy];
      const cle = voisin.join(',');
      if (!points.some((p) => p[0] === voisin[0] && p[1] === voisin[1])) continue;
      const suivant = plierVoisin(o, dx, dy);
      const connu = orientations.get(cle);
      if (connu && (cleVecteur(connu.normale) !== cleVecteur(suivant.normale) ||
        cleVecteur(connu.droite) !== cleVecteur(suivant.droite))) return null;
      if (!connu) { orientations.set(cle, suivant); file.push(voisin); }
    }
  }
  if (orientations.size !== 6) return null;
  const faces = points.map((p) => cleVecteur(orientations.get(p.join(','))!.normale));
  return new Set(faces).size === 6 ? faces : null;
}

/** Les 35 hexominos libres sont classés une fois par le pliage exact, en 11 patrons et 24 contre-exemples. */
function construireBibliotheque(): { readonly valides: readonly string[]; readonly contreExemples: readonly string[] } {
  let formes = new Set(['0,0']);
  for (let taille = 1; taille < 6; taille += 1) {
    const suivantes = new Set<string>();
    for (const forme of formes) {
      const points = lireForme(forme);
      for (const [x, y] of points) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          if (!points.some((p) => p[0] === x + dx && p[1] === y + dy)) {
            suivantes.add(normaliser([...points, [x + dx, y + dy]]));
          }
        }
      }
    }
    formes = suivantes;
  }
  const valides = [...formes].filter((forme) => facesPliees(lireForme(forme)) !== null).sort();
  const contreExemples = [...formes].filter((forme) => facesPliees(lireForme(forme)) === null).sort();
  if (valides.length !== 11 || contreExemples.length !== 24) throw new Error('Bibliothèque de patrons de cube incohérente.');
  return { valides, contreExemples };
}
export const PATRONS_CUBE_V1 = construireBibliotheque();
const FORMES_VALIDES = new Set(PATRONS_CUBE_V1.valides);

function creerPlan(niveau: NiveauMaths, alea: Alea, options: { largeur?: number; hauteur?: number; carre?: boolean; reviser?: boolean } = {}): InstanceChantier01 {
  const limite = bornesPlan[niveau];
  const largeur = options.largeur ?? entier(alea, 2, limite);
  const hauteur = options.hauteur ?? (options.carre ? largeur : entier(alea, 2, limite));
  if (!entierValide(largeur) || !entierValide(hauteur) || largeur < 2 || hauteur < 2 ||
      largeur > limite || hauteur > limite || (options.carre && largeur !== hauteur)) {
    throw new Error('Dimensions du plan hors niveau.');
  }
  const figure: 'carre' | 'rectangle' = largeur === hauteur ? 'carre' : 'rectangle';
  const largeurInitiale = largeur === 2 ? 3 : largeur - 1;
  const planInitial: readonly Point[] | null = niveau === 'defi' || options.reviser
    ? [[1, 1], [1 + largeurInitiale, 1],
      [1 + largeurInitiale, 1 + hauteur], [1, 1 + hauteur]] : null;
  const b = base('MAT-CHA-01', niveau, alea, { largeur, hauteur, grille: GRILLE_PLAN, figure, planInitial },
    [] as const, `tracer:${largeur}x${hauteur}:${figure}`, 'chantier-plan-v1',
    planInitial ? `Le côté du plan a changé. Révise le tracé : ${largeur} sur ${hauteur} carreaux.`
      : `Trace un ${figure === 'carre' ? 'carré' : 'rectangle'} de ${largeur} sur ${hauteur} carreaux.`,
    'carreau', { indice: 'Compte les carreaux de chaque côté avec la règle.',
      demonstration: 'Vérifie les quatre angles droits avec l’équerre, puis déplace un sommet.' });
  return { ...b, etatInitial: planInitial ? { ...VIDE, placements: Object.fromEntries(planInitial.map((p, i) =>
    [`sommet-${i}`, cellule(p, GRILLE_PLAN)])) } : VIDE };
}
function creerPatron(niveau: NiveauMaths, alea: Alea, options: { patron?: number; nombreBlocs?: number } = {}): InstanceChantier02 {
  const numero = options.patron ?? entier(alea, 0, PATRONS_CUBE_V1.valides.length - 1);
  if (!entierValide(numero) || numero < 0 || numero >= PATRONS_CUBE_V1.valides.length) throw new Error('Patron hors bibliothèque.');
  const modele = lireForme(PATRONS_CUBE_V1.valides[numero]!);
  const nombreBlocs = options.nombreBlocs ?? null;
  if (nombreBlocs !== null && (!entierValide(nombreBlocs) || nombreBlocs < 1 || nombreBlocs > 144)) {
    throw new Error('Nombre de blocs du chantier invalide.');
  }
  const contreExemple = lireForme(alea.choisir(PATRONS_CUBE_V1.contreExemples));
  const nombrePatrons = niveau === 'defi' ? 2 : 1;
  const b = base('MAT-CHA-02', niveau, alea,
    { grille: 6 as const, modele, contreExemple, nombrePatrons: nombrePatrons as 1 | 2,
      versionBibliotheque: 1 as const, nombreBlocs },
    [] as const, `plier:cube:6:${niveau}`, 'chantier-patron-v1',
    niveau === 'decouverte' ? 'Pose les six faces du cube sur le modèle, puis regarde son pliage.'
      : niveau === 'exploration' ? 'Construis un patron avec six carrés. Compare les deux modèles puis plie-le.'
        : 'Construis deux patrons différents avec six carrés chacun, puis compare leur pliage.',
    'face', { indice: 'Une face doit toucher une autre face par un côté entier.',
      demonstration: 'Déplie le cube : ses six faces doivent se retrouver sans se couvrir.' });
  return b;
}
function creerBalance(niveau: NiveauMaths, alea: Alea, options: { masse?: number } = {}): InstanceChantier03 {
  if (niveau === 'decouverte') {
    const masseGauche = options.masse ?? entier(alea, 100, 900);
    if (!entierValide(masseGauche) || masseGauche < 100 || masseGauche > 900) throw new Error('Masse hors niveau.');
    const ecart = masseGauche <= 800 ? 100 : -100;
    const masseDroite = masseGauche + ecart;
    return base('MAT-CHA-03', niveau, alea,
      { masseCible: masseGauche, masseGauche, masseDroite, poids: [], nombrePoidsMinimum: 0 },
      [] as const, `comparer:${masseGauche}:${masseDroite}`, 'chantier-balance-v1',
      'Regarde les deux masses. Quel plateau est le plus lourd ?', 'g',
      { indice: 'Lis les grammes inscrits sur chaque plateau.', demonstration: 'Compare les centaines de grammes.' });
  }
  const masseCible = options.masse ?? (niveau === 'defi' ? 1000 : entier(alea, 300, 900));
  if (!entierValide(masseCible) || masseCible < 100 || masseCible > 1000 ||
      (niveau === 'defi' && masseCible !== 1000)) throw new Error('Masse hors niveau.');
  let poids: Poids[];
  let nombrePoidsMinimum: number;
  if (niveau === 'exploration') {
    const a = Math.floor(masseCible / 3 / 50) * 50;
    const b = Math.floor((masseCible - a) / 2 / 50) * 50;
    const c = masseCible - a - b;
    poids = [a, b, c, Math.min(1000, c + 100)].map((grammes, i) =>
      ({ id: `poids-${i}`, grammes, etiquette: `${grammes} g` }));
    nombrePoidsMinimum = 3;
  } else {
    poids = [1000, 500, 300, 200, 500, 250, 250].map((grammes, i) =>
      ({ id: `poids-${i}`, grammes, etiquette: i === 0 ? '1 kg' : `${grammes} g` }));
    nombrePoidsMinimum = 1;
  }
  const b = base('MAT-CHA-03', niveau, alea,
    { masseCible, masseGauche: niveau === 'exploration' ? masseCible : null,
      masseDroite: null, poids, nombrePoidsMinimum }, poids,
    `equilibrer:${masseCible}:${niveau === 'defi' ? 'deux-compositions' : 'une-composition'}`,
    'chantier-balance-v1', niveau === 'defi'
      ? 'Place 1 kg et une autre façon de faire 1 000 g sur les deux plateaux.'
      : `Équilibre la charge de ${masseCible} g avec les poids.`, 'g',
    { indice: 'Additionne les masses inscrites sur les poids posés.',
      demonstration: 'Un kilogramme pèse autant que mille grammes. Cherche des groupes de poids égaux.' });
  return b;
}

export function genererChantier(famille: 'MAT-CHA-01', niveau: NiveauMaths, alea: Alea,
  options?: { largeur?: number; hauteur?: number; carre?: boolean; reviser?: boolean }): InstanceChantier01;
export function genererChantier(famille: 'MAT-CHA-02', niveau: NiveauMaths, alea: Alea,
  options?: { patron?: number; nombreBlocs?: number }): InstanceChantier02;
export function genererChantier(famille: 'MAT-CHA-03', niveau: NiveauMaths, alea: Alea,
  options?: { masse?: number }): InstanceChantier03;
export function genererChantier(famille: FamilleChantier, niveau: NiveauMaths, alea: Alea,
  options?: { largeur?: number; hauteur?: number; carre?: boolean; reviser?: boolean; patron?: number; nombreBlocs?: number; masse?: number }): InstanceChantier;
export function genererChantier(famille: FamilleChantier, niveau: NiveauMaths, alea: Alea,
  options: { largeur?: number; hauteur?: number; carre?: boolean; reviser?: boolean; patron?: number; nombreBlocs?: number; masse?: number } = {}): InstanceChantier {
  if (!NIVEAUX.includes(niveau)) throw new Error('Niveau du chantier inconnu.');
  if (famille === 'MAT-CHA-01') return creerPlan(niveau, alea, options);
  if (famille === 'MAT-CHA-02') return creerPatron(niveau, alea, options);
  if (famille === 'MAT-CHA-03') return creerBalance(niveau, alea, options);
  throw new Error('Famille du chantier inconnue.');
}

function copier(etat: EtatManipulationMaths): EtatManipulationMaths {
  return { objets: { ...etat.objets }, placements: { ...etat.placements }, selection: etat.selection, historique: [] };
}
export function appliquerGesteChantier(instance: InstanceChantier, etat: EtatManipulationMaths,
  geste: GesteMaths): EtatManipulationMaths {
  if (geste.type === 'annuler') {
    const precedent = etat.historique.at(-1);
    return precedent ? { ...precedent, historique: etat.historique.slice(0, -1) } : etat;
  }
  if (geste.type === 'ecouter' || geste.type === 'aide') return etat;
  const placements = { ...etat.placements };
  let selection = etat.selection;
  if (geste.type === 'placer') {
    if (!entierValide(geste.position)) return etat;
    if (instance.famille === 'MAT-CHA-01') {
      if (!/^sommet-[0-3]$/.test(geste.objetId) || geste.position < 0 ||
          geste.position >= instance.parametres.grille ** 2) return etat;
      placements[geste.objetId] = geste.position;
    } else if (instance.famille === 'MAT-CHA-02') {
      if (!/^face:[ab]:[0-5]$/.test(geste.objetId) ||
          (instance.niveau !== 'defi' && geste.objetId.startsWith('face:b:')) ||
          geste.position < 0 || geste.position >= 36) return etat;
      placements[geste.objetId] = geste.position;
    } else {
      if (!instance.parametres.poids.some((p) => p.id === geste.objetId) ||
          (geste.destination !== 'gauche' && geste.destination !== 'droite')) return etat;
      placements[geste.objetId] = geste.destination;
    }
  } else if (geste.type === 'retirer') {
    if (!(geste.objetId in placements)) return etat;
    delete placements[geste.objetId];
  } else if (geste.type === 'choisir') {
    if (instance.famille !== 'MAT-CHA-03' || instance.niveau !== 'decouverte' ||
        (geste.objetId !== 'gauche' && geste.objetId !== 'droite')) return etat;
    selection = geste.objetId;
  } else return etat;
  if (selection === etat.selection && Object.keys(placements).length === Object.keys(etat.placements).length &&
      Object.keys(placements).every((id) => placements[id] === etat.placements[id])) return etat;
  return { objets: { ...etat.objets }, placements, selection,
    historique: [...etat.historique, copier(etat)] };
}
export const manipulerChantier = appliquerGesteChantier;

function validerPlan(instance: InstanceChantier01, etat: EtatManipulationMaths): ValidationMaths {
  const positions = Array.from({ length: 4 }, (_, i) => etat.placements[`sommet-${i}`]);
  if (positions.some((p) => p === undefined)) return { statut: 'incomplete', raison: 'Place les quatre sommets du plan.' };
  if (Object.keys(etat.placements).length !== 4 || positions.some((p) => !entierValide(p) || p < 0 || p >= instance.parametres.grille ** 2)) {
    return { statut: 'incorrecte', raison: 'Le plan contient un point hors du quadrillage.' };
  }
  const [a, b, c, d] = positions.map((p) => point(p as number, instance.parametres.grille)) as [Point, Point, Point, Point];
  const ab: Point = [b[0] - a[0], b[1] - a[1]];
  const ad: Point = [d[0] - a[0], d[1] - a[1]];
  const produit = ab[0] * ad[0] + ab[1] * ad[1];
  const ab2 = ab[0] ** 2 + ab[1] ** 2;
  const ad2 = ad[0] ** 2 + ad[1] ** 2;
  if (produit !== 0 || ab2 === 0 || ad2 === 0 || c[0] !== b[0] + ad[0] || c[1] !== b[1] + ad[1]) {
    return { statut: 'incorrecte', raison: 'Les côtés doivent se rejoindre avec quatre angles droits.' };
  }
  const { largeur, hauteur } = instance.parametres;
  if (!((ab2 === largeur ** 2 && ad2 === hauteur ** 2) ||
        (ab2 === hauteur ** 2 && ad2 === largeur ** 2))) {
    return { statut: 'incorrecte', raison: 'Les côtés ne mesurent pas les longueurs annoncées.' };
  }
  return { statut: 'correcte', solution: { sommets: [a, b, c, d], largeur, hauteur } };
}
function formePosee(etat: EtatManipulationMaths, plateau: 'a' | 'b'): Point[] | null {
  const positions = Array.from({ length: 6 }, (_, i) => etat.placements[`face:${plateau}:${i}`]);
  if (positions.some((p) => p === undefined)) return null;
  if (positions.some((p) => !entierValide(p) || p < 0 || p >= 36)) return [];
  return positions.map((p) => point(p as number, 6));
}
function validerPatron(instance: InstanceChantier02, etat: EtatManipulationMaths): ValidationMaths {
  const a = formePosee(etat, 'a');
  const b = instance.niveau === 'defi' ? formePosee(etat, 'b') : null;
  if (!a || (instance.niveau === 'defi' && !b)) return { statut: 'incomplete', raison: 'Pose les six faces de chaque patron.' };
  if (Object.keys(etat.placements).length !== 6 * instance.parametres.nombrePatrons ||
      a.length !== 6 || (b && b.length !== 6)) {
    return { statut: 'incorrecte', raison: 'Chaque patron a besoin de six carrés distincts.' };
  }
  const cleA = normaliser(a);
  const cleB = b ? normaliser(b) : null;
  if (instance.niveau === 'decouverte' && cleA !== normaliser(instance.parametres.modele)) {
    return { statut: 'incorrecte', raison: 'Retrouve les six faces du modèle.' };
  }
  if (!FORMES_VALIDES.has(cleA) || facesPliees(a) === null ||
      (b && (!FORMES_VALIDES.has(cleB!) || facesPliees(b) === null))) {
    return { statut: 'incorrecte', raison: 'Au pliage, des faces se couvrent ou restent séparées.' };
  }
  if (b && cleA === cleB) return { statut: 'incorrecte', raison: 'Construis deux patrons de formes différentes.' };
  return { statut: 'correcte', solution: { patrons: cleB ? [cleA, cleB] : [cleA],
    pliage: cleB ? [facesPliees(a), facesPliees(b!)] : [facesPliees(a)] } };
}
function validerBalance(instance: InstanceChantier03, etat: EtatManipulationMaths): ValidationMaths {
  const p = instance.parametres;
  if (instance.niveau === 'decouverte') {
    if (etat.selection === null) return { statut: 'incomplete', raison: 'Choisis le plateau le plus lourd.' };
    const attendu = p.masseGauche! > p.masseDroite! ? 'gauche' : 'droite';
    return etat.selection === attendu
      ? { statut: 'correcte', solution: { plusLourd: attendu, masses: [p.masseGauche, p.masseDroite] } }
      : { statut: 'incorrecte', raison: 'Compare les grammes inscrits sur les deux plateaux.' };
  }
  const entrees = Object.entries(etat.placements);
  if (entrees.length < p.nombrePoidsMinimum || (instance.niveau === 'defi' && entrees.length < 2)) {
    return { statut: 'incomplete', raison: 'Pose les poids sur la balance.' };
  }
  if (entrees.some(([id, cote]) => !p.poids.some((poids) => poids.id === id) ||
      (cote !== 'gauche' && cote !== 'droite'))) {
    return { statut: 'incorrecte', raison: 'Un poids posé ne vient pas du stock.' };
  }
  const gauche = entrees.filter(([, cote]) => cote === 'gauche');
  const droite = entrees.filter(([, cote]) => cote === 'droite');
  const somme = (poses: typeof entrees): number => poses.reduce((n, [id]) =>
    n + p.poids.find((poids) => poids.id === id)!.grammes, 0);
  const masseGauche = p.masseGauche ?? somme(gauche);
  const masseDroite = somme(droite);
  if (instance.niveau === 'defi' && (gauche.length === 0 || droite.length === 0)) {
    return { statut: 'incomplete', raison: 'Compose une masse sur chaque plateau.' };
  }
  if (masseGauche !== p.masseCible || masseDroite !== p.masseCible ||
      (instance.niveau === 'exploration' && gauche.length > 0) ||
      (instance.niveau === 'defi' && !entrees.some(([id]) => p.poids.find((poids) => poids.id === id)?.etiquette === '1 kg'))) {
    return { statut: 'incorrecte', raison: 'Les deux plateaux ne portent pas la même masse cible.', ecart: masseGauche - masseDroite };
  }
  if (instance.niveau === 'defi') {
    const signature = (poses: typeof entrees) => poses.map(([id]) => p.poids.find((poids) => poids.id === id)!.grammes).sort((a, b) => a - b).join('+');
    if (signature(gauche) === signature(droite)) return { statut: 'incorrecte', raison: 'Cherche deux décompositions différentes.' };
  }
  return { statut: 'correcte', solution: { masseGrammes: p.masseCible,
    gauche: gauche.map(([id]) => id), droite: droite.map(([id]) => id) } };
}
/** L'oracle lit l'état construit, jamais le témoin. */
export function validerChantier(instance: InstanceChantier, etat: EtatManipulationMaths): ValidationMaths {
  if (instance.famille === 'MAT-CHA-01') return validerPlan(instance, etat);
  if (instance.famille === 'MAT-CHA-02') return validerPatron(instance, etat);
  return validerBalance(instance, etat);
}

/** Témoin de génération réservé aux contrôles et à la désignation d'un geste d'aide. */
export function construireTemoinChantier(instance: InstanceChantier): EtatManipulationMaths {
  if (instance.famille === 'MAT-CHA-01') {
    const { largeur, hauteur, grille } = instance.parametres;
    const sommets: readonly Point[] = [[1, 1], [1 + largeur, 1], [1 + largeur, 1 + hauteur], [1, 1 + hauteur]];
    return { ...VIDE, placements: Object.fromEntries(sommets.map((p, i) => [`sommet-${i}`, cellule(p, grille)])) };
  }
  if (instance.famille === 'MAT-CHA-02') {
    const formes = instance.niveau === 'defi'
      ? [instance.parametres.modele, lireForme(PATRONS_CUBE_V1.valides.find((s) => s !== normaliser(instance.parametres.modele))!)]
      : [instance.parametres.modele];
    const placements: Record<string, number> = {};
    formes.forEach((forme, plateau) => forme.forEach((p, i) => { placements[`face:${plateau === 0 ? 'a' : 'b'}:${i}`] = cellule(p, 6); }));
    return { ...VIDE, placements };
  }
  if (instance.niveau === 'decouverte') return { ...VIDE,
    selection: instance.parametres.masseGauche! > instance.parametres.masseDroite! ? 'gauche' : 'droite' };
  const poids = instance.parametres.poids;
  if (instance.niveau === 'exploration') return { ...VIDE,
    placements: Object.fromEntries(poids.slice(0, 3).map((p) => [p.id, 'droite'])) };
  return { ...VIDE, placements: Object.fromEntries(poids.slice(0, 4).map((p, i) =>
    [p.id, i === 0 ? 'gauche' : 'droite'])) };
}

export function prochainGesteChantier(instance: InstanceChantier, etat: EtatManipulationMaths): GesteMaths | null {
  if (validerChantier(instance, etat).statut === 'correcte') return null;
  const temoin = construireTemoinChantier(instance);
  if (instance.famille === 'MAT-CHA-03' && instance.niveau === 'decouverte') {
    return { type: 'choisir', objetId: temoin.selection! };
  }
  const mauvais = Object.keys(etat.placements).find((id) => etat.placements[id] !== temoin.placements[id]);
  if (mauvais) return { type: 'retirer', objetId: mauvais };
  const manquant = Object.keys(temoin.placements).find((id) => etat.placements[id] === undefined);
  if (!manquant) return null;
  const valeur = temoin.placements[manquant]!;
  return { type: 'placer', objetId: manquant, position: typeof valeur === 'number' ? valeur : 0,
    ...(typeof valeur === 'string' ? { destination: valeur } : {}) };
}
export function proposerAideChantier(instance: InstanceChantier, erreursValidees: number, aideCourante: AideMaths,
  etat?: EtatManipulationMaths): { niveau: AideMaths; consigne: ConsigneMaths | null; gestePropose: GesteMaths | null } {
  const niveau: AideMaths = aideCourante === 'demonstration' || erreursValidees >= 3 ? 'demonstration'
    : aideCourante === 'indice' || erreursValidees >= 2 ? 'indice' : 'aucune';
  return { niveau, consigne: niveau === 'aucune' ? null : instance.aide[niveau],
    gestePropose: niveau === 'demonstration' && etat ? prochainGesteChantier(instance, etat) : null };
}

export function estInstanceChantier(valeur: unknown): valeur is InstanceChantier {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const i = valeur as Record<string, unknown>;
  if (i.format !== 1 || i.versionModele !== 1 || i.versionGenerateur !== 1 ||
      !FAMILLES.includes(i.famille as FamilleChantier) || !NIVEAUX.includes(i.niveau as NiveauMaths) ||
      typeof i.id !== 'string' || i.id === '' || typeof i.signature !== 'string' ||
      !entierValide(i.graine) || typeof i.parametres !== 'object' || i.parametres === null ||
      !Array.isArray(i.stock) || typeof i.etatInitial !== 'object' || i.etatInitial === null) return false;
  const p = i.parametres as Record<string, unknown>;
  if (i.famille === 'MAT-CHA-01') return entierValide(p.largeur) && entierValide(p.hauteur) &&
    p.largeur >= 2 && p.hauteur >= 2 && p.largeur <= bornesPlan[i.niveau as NiveauMaths] &&
    p.hauteur <= bornesPlan[i.niveau as NiveauMaths] && p.grille === GRILLE_PLAN;
  if (i.famille === 'MAT-CHA-02') return p.grille === 6 && p.versionBibliotheque === 1 &&
    Array.isArray(p.modele) && p.modele.length === 6 &&
    p.modele.every((v: unknown) => Array.isArray(v) && v.length === 2 && v.every(entierValide)) &&
    FORMES_VALIDES.has(normaliser(p.modele as Point[])) &&
    p.nombrePatrons === (i.niveau === 'defi' ? 2 : 1) &&
    (p.nombreBlocs === null || (entierValide(p.nombreBlocs) && p.nombreBlocs > 0 && p.nombreBlocs <= 144));
  return entierValide(p.masseCible) && p.masseCible >= 100 && p.masseCible <= 1000 &&
    Array.isArray(p.poids) && p.poids.every((v: unknown) => typeof v === 'object' && v !== null &&
      typeof (v as Poids).id === 'string' && entierValide((v as Poids).grammes));
}

export const COMBINAISONS_CHANTIER: Readonly<Record<ProjetChantierId, readonly (readonly [NiveauMaths, NiveauMaths, NiveauMaths])[]>> = {
  'MAT-CHA-P01': NIVEAUX.flatMap((a) => NIVEAUX.flatMap((b) => NIVEAUX.map((c) => [a, b, c] as const))),
  'MAT-CHA-P02': NIVEAUX.flatMap((a) => NIVEAUX.flatMap((b) => NIVEAUX.map((c) => [a, b, c] as const))),
  'MAT-CHA-P03': NIVEAUX.flatMap((a) => NIVEAUX.flatMap((b) => NIVEAUX.map((c) => [a, b, c] as const))),
};

export function creerProjetChantier(projetId: ProjetChantierId,
  choix: NiveauMaths | readonly [NiveauMaths, NiveauMaths, NiveauMaths], alea: Alea, sessionId: string): {
  readonly projet: ProjetChantier; readonly instances: readonly [InstanceChantier, InstanceChantier, InstanceChantier];
} {
  if (typeof sessionId !== 'string' || sessionId.trim() === '') throw new Error('Session de projet manquante.');
  const niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths] = typeof choix === 'string'
    ? [choix, choix, choix] : choix;
  if (!COMBINAISONS_CHANTIER[projetId]?.some((c) => c.every((v, i) => v === niveaux[i]))) {
    throw new Error('Combinaison de niveaux incompatible pour le chantier.');
  }
  let instances: readonly [InstanceChantier, InstanceChantier, InstanceChantier];
  let variables: Record<string, number>;
  if (projetId === 'MAT-CHA-P01') {
    const largeur = 2;
    const hauteur = niveaux[2] === 'defi' ? 5 : 3;
    const nombreBlocs = largeur * hauteur;
    const masseGrammes = nombreBlocs * 100;
    variables = { dimensions: largeur * 100 + hauteur, nombreBlocs, masseGrammes };
    instances = [creerPlan(niveaux[0], alea, { largeur, hauteur }), creerPatron(niveaux[1], alea, { nombreBlocs }),
      creerBalance(niveaux[2], alea, { masse: masseGrammes })];
  } else if (projetId === 'MAT-CHA-P02') {
    const patron = entier(alea, 0, PATRONS_CUBE_V1.valides.length - 1);
    const baseCarree = 2;
    const masseGrammes = niveaux[1] === 'defi' ? 1000 : 800;
    variables = { patron, masseGrammes, base: baseCarree };
    instances = [creerPatron(niveaux[0], alea, { patron, nombreBlocs: baseCarree ** 2 }),
      creerBalance(niveaux[1], alea, { masse: masseGrammes }),
      creerPlan(niveaux[2], alea, { largeur: baseCarree, hauteur: baseCarree, carre: true })];
  } else {
    const largeur = 2;
    const hauteur = niveaux[2] === 'defi' ? 5 : 3;
    const blocs = largeur * hauteur;
    const contrepoidsGrammes = blocs * 100;
    variables = { dimensions: largeur * 100 + hauteur, blocs, contrepoidsGrammes };
    instances = [creerPlan(niveaux[0], alea, { largeur, hauteur, reviser: true }),
      creerPatron(niveaux[1], alea, { nombreBlocs: blocs }),
      creerBalance(niveaux[2], alea, { masse: contrepoidsGrammes })];
  }
  const plan: readonly [EtapeProjetMaths, EtapeProjetMaths, EtapeProjetMaths] = instances.map((instance, rang) =>
    ({ rang, famille: instance.famille, niveau: instance.niveau, instanceId: `${sessionId}:${rang}` })) as unknown as
    readonly [EtapeProjetMaths, EtapeProjetMaths, EtapeProjetMaths];
  const transformationId = projetId === 'MAT-CHA-P01' ? 'chantier-atelier-repare'
    : projetId === 'MAT-CHA-P02' ? 'chantier-tour-debout' : 'chantier-toit-colore';
  const cadeauId = projetId === 'MAT-CHA-P01' ? 'maths-souvenir-chantier'
    : projetId === 'MAT-CHA-P03' ? 'maths-objet-chantier' : null;
  const cadeauType = projetId === 'MAT-CHA-P01' ? 'souvenir' as const
    : projetId === 'MAT-CHA-P03' ? 'objet' as const : null;
  const projet: ProjetChantier = { id: projetId, sessionId, version: 1, variables,
    plan, transformationId, cadeauId, cadeauType, etapeCourante: 0,
    instances: plan.map((e) => e.instanceId), etoilesEtapes: [], suspendu: false };
  const avecContexte = instances.map((instance, etape) => ({ ...instance, id: plan[etape]!.instanceId,
    projet: { sessionId, projetId, versionProjet: 1, etape, variables, plan,
      transformationId, cadeauId, cadeauType } })) as unknown as
      readonly [InstanceChantier, InstanceChantier, InstanceChantier];
  return { projet, instances: avecContexte };
}
