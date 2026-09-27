/** Jardin : graines, parts d'un même tout et données de récolte. */
import type { Alea } from '../../../alea.js';
import type {
  AideMaths, ContexteProjetMaths, EtatManipulationMaths, EtapeProjetMaths, GesteMaths,
  InstanceMathsBase, NiveauMaths, ValidationMaths,
} from '../../types.js';

export type FamilleJardin = 'MAT-JAR-01' | 'MAT-JAR-02' | 'MAT-JAR-03';
export type ProjetJardinId = 'MAT-JAR-P01' | 'MAT-JAR-P02' | 'MAT-JAR-P03';
export interface CategorieRecolte { readonly id: string; readonly quantite: number }
export type InstanceGraines = InstanceMathsBase<'MAT-JAR-01', {
  readonly cible: number; readonly stock: { readonly unites: number; readonly dizaines: number; readonly centaines: number };
  readonly echangeRequis: boolean; readonly decompositionsRequises: 1 | 2;
  readonly uniteObjet: 'graine' | 'fruit'; readonly caissesRequises: number | null;
}, readonly ('unite' | 'dizaine' | 'centaine')[]>;
export type InstancePartsJardin = InstanceMathsBase<'MAT-JAR-02', {
  readonly denominateur: number; readonly numerateur: number; readonly partsInitiales: number;
  readonly denominateurAlternative: number | null;
  readonly totalGraines: number | null; readonly grainesParPart: number | null;
  readonly representation?: 'bande' | 'disque';
}, readonly string[]>;
export type InstanceRecoltes = InstanceMathsBase<'MAT-JAR-03', {
  readonly categories: readonly CategorieRecolte[]; readonly transfertRequis: boolean;
  readonly total: number; readonly fruitsParUnite: 1 | 10; readonly lectureRequise: boolean;
}, readonly string[]>;
export type InstanceJardin = InstanceGraines | InstancePartsJardin | InstanceRecoltes;
export interface OptionsJardin {
  readonly cible?: number;
  readonly uniteObjet?: 'graine' | 'fruit';
  readonly caissesRequises?: number;
  readonly echangeRequis?: boolean;
  readonly denominateur?: number;
  readonly numerateur?: number;
  readonly partsInitiales?: number;
  readonly totalGraines?: number;
  readonly categories?: readonly CategorieRecolte[];
  readonly transfertRequis?: boolean;
  readonly fruitsParUnite?: 1 | 10;
}
export interface ProjetJardin {
  readonly projet: {
    readonly id: ProjetJardinId; readonly sessionId: string; readonly version: 1;
    readonly niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths];
    readonly variables: Readonly<Record<string, number>>;
    readonly plan: readonly [EtapeProjetMaths, EtapeProjetMaths, EtapeProjetMaths];
    readonly transformationId: string; readonly cadeauId: string | null;
    readonly cadeauType: 'souvenir' | 'objet' | null;
  };
  readonly id: ProjetJardinId; readonly sessionId: string; readonly version: 1;
  readonly niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths];
  readonly variables: Readonly<Record<string, number>>;
  readonly plan: readonly [EtapeProjetMaths, EtapeProjetMaths, EtapeProjetMaths];
  readonly transformationId: string; readonly cadeauId: string | null;
  readonly cadeauType: 'souvenir' | 'objet' | null;
  readonly instances: readonly [InstanceJardin, InstanceJardin, InstanceJardin];
  readonly etapes: readonly [InstanceJardin, InstanceJardin, InstanceJardin];
}

const VIDE: EtatManipulationMaths = { objets: {}, placements: {}, selection: null, historique: [] };
const NIVEAUX: readonly NiveauMaths[] = ['decouverte', 'exploration', 'defi'];
const entier = (alea: Alea, min: number, max: number): number => alea.entier(min, max + 1);
const valeur = (etat: EtatManipulationMaths, cle: string): number => {
  const v = etat.objets[cle]; return typeof v === 'number' && Number.isSafeInteger(v) ? v : 0;
};
const consigne = (texte: string) => ({ texte, segments: [] as const });

function base<F extends FamilleJardin, P, S>(famille: F, niveau: NiveauMaths, alea: Alea,
  parametres: P, stock: S, signature: string, texte: string, aide: string): InstanceMathsBase<F, P, S> {
  return {
    format: 1, id: `${famille.toLowerCase()}-${niveau}-${alea.graine.toString(16)}-${signature.replace(/[^a-z0-9]/giu, '-')}`,
    famille, niveau, modeleId: `${famille.toLowerCase()}-v1`, versionModele: 1,
    versionGenerateur: 1, graine: alea.graine, signature, parametres, stock,
    etatInitial: VIDE, consigne: consigne(texte), unite: famille === 'MAT-JAR-02' ? 'part' : 'objet',
    aide: { indice: consigne(aide), demonstration: consigne('Regarde un geste possible, puis essaie toi-même.') },
    reglesValidation: { version: 1, egaliteExacte: true },
  };
}

function graines(niveau: NiveauMaths, alea: Alea, options: OptionsJardin): InstanceGraines {
  const [min, max] = niveau === 'decouverte' ? [0, 99] : niveau === 'exploration' ? [100, 499] : [100, 1000];
  const cible = options.cible ?? entier(alea, min, max);
  if (!Number.isSafeInteger(cible) || cible < min || cible > max) throw new Error('Total de graines incompatible avec ce niveau.');
  const c = Math.floor(cible / 100), d = Math.floor((cible % 100) / 10), u = cible % 10;
  const stock = { unites: Math.min(99, u + 20), dizaines: Math.min(100, d + 20), centaines: Math.max(c, 10) };
  const uniteObjet = options.uniteObjet ?? 'graine';
  const caissesRequises = options.caissesRequises ?? null;
  if (!['graine', 'fruit'].includes(uniteObjet) || (caissesRequises !== null &&
      (!Number.isSafeInteger(caissesRequises) || caissesRequises < 1 ||
        caissesRequises > stock.dizaines || caissesRequises * 10 !== cible))) {
    throw new Error('Groupement de fruits incohérent.');
  }
  const parametres = { cible, stock, echangeRequis: options.echangeRequis ?? niveau !== 'decouverte',
    uniteObjet, caissesRequises,
    decompositionsRequises: niveau === 'defi' ? 2 as const : 1 as const };
  const instance = base('MAT-JAR-01', niveau, alea, parametres,
    ['unite', 'dizaine', 'centaine'] as const, `graines:${cible}:${niveau}`,
    cible === 0 ? 'Le plateau est vide. Montre zéro graine sans poser de graine.' :
      uniteObjet === 'fruit' ? `Range ${cible} fruits : dix fruits font une caisse. Montre ${caissesRequises ?? cible / 10} caisses de dix fruits.` :
        `Forme ${cible} graines avec des unités, des bottes de dix et des sacs de cent.`,
    uniteObjet === 'fruit' ? 'Dix fruits deviennent une caisse. Dix caisses deviennent une réserve.' :
      'Dix unités peuvent devenir une botte. Dix bottes peuvent devenir un sac.');
  return { ...instance, unite: uniteObjet,
    etatInitial: { ...VIDE, objets: { unites: 0, dizaines: 0, centaines: 0, echanges: 0, premiere: null } } };
}

const DENOMINATEURS: Readonly<Record<NiveauMaths, readonly number[]>> = {
  decouverte: [2, 4], exploration: [3, 5, 6], defi: [6, 8, 10],
};
function parts(niveau: NiveauMaths, alea: Alea, options: OptionsJardin): InstancePartsJardin {
  const denominateur = options.denominateur ?? alea.choisir(DENOMINATEURS[niveau]);
  if (!DENOMINATEURS[niveau].includes(denominateur)) throw new Error('Découpage du jardin incompatible avec ce niveau.');
  const numerateur = options.numerateur ?? (niveau === 'defi'
    ? 2 * entier(alea, 1, Math.floor((denominateur - 1) / 2))
    : entier(alea, 1, denominateur - 1));
  if (!Number.isSafeInteger(numerateur) || numerateur < 1 || numerateur > denominateur) {
    throw new Error('Nombre de parts du jardin invalide.');
  }
  const partsInitiales = options.partsInitiales ?? (niveau === 'exploration' ? Math.max(0, numerateur - 1) : 0);
  if (!Number.isSafeInteger(partsInitiales) || partsInitiales < 0 || partsInitiales > numerateur) {
    throw new Error('Complément de parts invalide.');
  }
  const denominateurAlternative = niveau === 'defi' ? denominateur / 2 : null;
  const numerateurAlternative = niveau === 'defi' ? numerateur / 2 : null;
  if (niveau === 'defi' && !Number.isInteger(numerateurAlternative)) {
    throw new Error('La seconde représentation doit être visible avec des parts entières.');
  }
  const totalGraines = options.totalGraines ?? null;
  const grainesParPart = totalGraines === null ? null : totalGraines / denominateur;
  if (totalGraines !== null && (!Number.isSafeInteger(totalGraines) || !Number.isSafeInteger(grainesParPart))) {
    throw new Error('Le stock de graines ne se répartit pas en parts égales.');
  }
  const parametres = { denominateur, numerateur, partsInitiales,
    denominateurAlternative, totalGraines, grainesParPart, representation: alea.choisir(['bande', 'disque'] as const) };
  const instance = base('MAT-JAR-02', niveau, alea, parametres,
    Array.from({ length: denominateur }, (_, i) => `part-${i}`),
    `jardin-parts:${numerateur}/${denominateur}:${partsInitiales}`,
    `Couvre ${numerateur} part${numerateur > 1 ? 's' : ''} sur ${denominateur} du même jardin.`,
    'Regarde le tout : chaque pièce couvre une part de même taille.');
  return { ...instance, versionGenerateur: 2, etatInitial: { ...VIDE, objets: { partsA: partsInitiales, partsB: 0 } } };
}

const NOMS = ['pommes', 'poires', 'prunes', 'cerises', 'noix'] as const;
function categoriesPourTotal(niveau: NiveauMaths, alea: Alea, totalFixe?: number,
  nombreForce?: number): readonly CategorieRecolte[] {
  const nombre = nombreForce ?? (niveau === 'decouverte' ? 2 : niveau === 'exploration' ? entier(alea, 3, 4) : entier(alea, 4, 5));
  const maximum = niveau === 'decouverte' ? 6 : niveau === 'exploration' ? 12 : 20;
  if (totalFixe !== undefined) {
    if (totalFixe < nombre || totalFixe > nombre * maximum) throw new Error('Total du carnet incompatible avec ce niveau.');
    const quantites = Array.from({ length: nombre }, () => 1);
    let restant = totalFixe - nombre;
    for (let index = 0; restant > 0; index = (index + 1) % nombre) {
      if (quantites[index]! < maximum) { quantites[index]! += 1; restant -= 1; }
    }
    return quantites.map((quantite, i) => ({ id: NOMS[i]!, quantite }));
  }
  const tirees = NOMS.slice(0, nombre).map((id) => ({ id, quantite: entier(alea, 1, maximum) }));
  const total = tirees.reduce((s, c) => s + c.quantite, 0);
  if (niveau === 'defi' && total >= 100) {
    tirees[0] = { ...tirees[0]!, quantite: tirees[0]!.quantite - (total - 99) };
  } else if (niveau === 'defi' && tirees.every((c) => c.quantite === 20)) {
    tirees[0] = { ...tirees[0]!, quantite: 19 };
  }
  return tirees;
}
function recoltes(niveau: NiveauMaths, alea: Alea, options: OptionsJardin): InstanceRecoltes {
  const categories = options.categories ?? categoriesPourTotal(niveau, alea);
  const min = niveau === 'decouverte' ? 2 : niveau === 'exploration' ? 3 : 4;
  const max = niveau === 'decouverte' ? 2 : niveau === 'exploration' ? 4 : 5;
  const limite = niveau === 'decouverte' ? 6 : niveau === 'exploration' ? 12 : 20;
  if (categories.length < min || categories.length > max || new Set(categories.map((c) => c.id)).size !== categories.length ||
      categories.some((c) => !Number.isSafeInteger(c.quantite) || c.quantite < 1 || c.quantite > limite)) {
    throw new Error('Inventaire de récolte incompatible avec ce niveau.');
  }
  const total = categories.reduce((s, c) => s + c.quantite, 0);
  if (niveau === 'defi' && total >= 100) throw new Error('Le carnet doit garder moins de cent fruits.');
  const fruitsParUnite = options.fruitsParUnite ?? 1;
  if (fruitsParUnite !== 1 && fruitsParUnite !== 10) throw new Error('Unité du carnet inconnue.');
  const transfertRequis = options.transfertRequis ?? niveau === 'defi';
  if (transfertRequis && categories.every((c) => c.quantite >= limite)) {
    throw new Error('Aucun panier ne peut recevoir le transfert demandé.');
  }
  const lectureRequise = niveau === 'defi';
  const parametres = { categories, transfertRequis, total, fruitsParUnite, lectureRequise };
  const objets: Record<string, number | string | null> = { transferts: 0, lecture: null };
  for (const categorie of categories) {
    objets[`panier:${categorie.id}`] = categorie.quantite;
    objets[`table:${categorie.id}`] = 0;
    objets[`barre:${categorie.id}`] = 0;
  }
  const instance = base('MAT-JAR-03', niveau, alea, parametres,
    categories.map((c) => c.id), `recoltes:${categories.map((c) => `${c.id}-${c.quantite}`).join(':')}`,
    fruitsParUnite === 1 ? `Compte les ${total} fruits et montre chaque panier dans le carnet.${lectureRequise ? ' Après tes gestes, choisis le panier le plus rempli.' : ''}` :
      `Compte ${total} caisses de dix fruits. Chaque case du tableau et chaque barre représentent une caisse, soit ${total * 10} fruits en tout.${lectureRequise ? ' Après tes gestes, choisis le panier qui a le plus de caisses.' : ''}`,
    fruitsParUnite === 1 ? 'Compte un fruit à la fois : chaque case du tableau vaut une barre.' :
      'Compte une caisse à la fois : une case et une barre valent dix fruits.');
  return { ...instance, unite: fruitsParUnite === 1 ? 'fruit' : 'caisse de dix fruits',
    etatInitial: { ...VIDE, objets } };
}

export function genererJardin(famille: FamilleJardin, niveau: NiveauMaths, alea: Alea,
  options: OptionsJardin = {}): InstanceJardin {
  if (!NIVEAUX.includes(niveau)) throw new Error('Niveau du jardin inconnu.');
  switch (famille) {
    case 'MAT-JAR-01': return graines(niveau, alea, options);
    case 'MAT-JAR-02': return parts(niveau, alea, options);
    case 'MAT-JAR-03': return recoltes(niveau, alea, options);
    default: throw new Error('Famille du jardin inconnue.');
  }
}

function memoriser(etat: EtatManipulationMaths, objets: EtatManipulationMaths['objets']): EtatManipulationMaths {
  return { ...etat, objets, historique: [...etat.historique,
    { objets: etat.objets, placements: etat.placements, selection: etat.selection, historique: [] }] };
}
function annuler(etat: EtatManipulationMaths): EtatManipulationMaths {
  const precedent = etat.historique.at(-1);
  return precedent === undefined ? etat : { ...precedent, historique: etat.historique.slice(0, -1) };
}

export function appliquerGesteJardin(instance: InstanceJardin, etat: EtatManipulationMaths,
  geste: GesteMaths): EtatManipulationMaths {
  if (geste.type === 'annuler') return annuler(etat);
  if (geste.type === 'aide' || geste.type === 'ecouter') return etat;
  if (instance.famille === 'MAT-JAR-01') {
    const o = { ...etat.objets };
    const cle = geste.type === 'placer' || geste.type === 'retirer' ? `${geste.objetId}s` : '';
    if (cle === 'unites' || cle === 'dizaines' || cle === 'centaines') {
      const borne = instance.parametres.stock[cle];
      const delta = geste.type === 'placer' ? 1 : -1;
      const suivant = valeur(etat, cle) + delta;
      if (suivant < 0 || suivant > borne) return etat;
      o[cle] = suivant;
      return memoriser(etat, o);
    }
    if (geste.type === 'choisir' && geste.objetId === 'echanger-unites' && valeur(etat, 'unites') >= 10 &&
        valeur(etat, 'dizaines') < instance.parametres.stock.dizaines) {
      o.unites = valeur(etat, 'unites') - 10; o.dizaines = valeur(etat, 'dizaines') + 1;
      o.echanges = valeur(etat, 'echanges') + 1;
      return memoriser(etat, o);
    }
    if (geste.type === 'choisir' && geste.objetId === 'echanger-dizaines' && valeur(etat, 'dizaines') >= 10 &&
        valeur(etat, 'centaines') < instance.parametres.stock.centaines) {
      o.dizaines = valeur(etat, 'dizaines') - 10; o.centaines = valeur(etat, 'centaines') + 1;
      o.echanges = valeur(etat, 'echanges') + 1;
      return memoriser(etat, o);
    }
    if (geste.type === 'choisir' && geste.objetId === 'defaire-dizaine' && valeur(etat, 'dizaines') >= 1 &&
        valeur(etat, 'unites') + 10 <= instance.parametres.stock.unites) {
      o.dizaines = valeur(etat, 'dizaines') - 1; o.unites = valeur(etat, 'unites') + 10;
      o.echanges = valeur(etat, 'echanges') + 1;
      return memoriser(etat, o);
    }
    if (geste.type === 'choisir' && geste.objetId === 'defaire-centaine' && valeur(etat, 'centaines') >= 1 &&
        valeur(etat, 'dizaines') + 10 <= instance.parametres.stock.dizaines) {
      o.centaines = valeur(etat, 'centaines') - 1; o.dizaines = valeur(etat, 'dizaines') + 10;
      o.echanges = valeur(etat, 'echanges') + 1;
      return memoriser(etat, o);
    }
    if (geste.type === 'choisir' && geste.objetId === 'garder-decomposition' &&
        sommeGraines(etat) === instance.parametres.cible && etat.objets.premiere === null &&
        !(instance.parametres.decompositionsRequises === 2 && instance.parametres.caissesRequises !== null &&
          valeur(etat, 'dizaines') === instance.parametres.caissesRequises &&
          valeur(etat, 'centaines') === 0 && valeur(etat, 'unites') === 0)) {
      o.premiere = `${valeur(etat, 'centaines')}:${valeur(etat, 'dizaines')}:${valeur(etat, 'unites')}`;
      o.centaines = 0; o.dizaines = 0; o.unites = 0;
      return memoriser(etat, o);
    }
    return etat;
  }
  if (instance.famille === 'MAT-JAR-02') {
    const cle = geste.type === 'placer' || geste.type === 'retirer'
      ? geste.objetId === 'part-a' ? 'partsA' : geste.objetId === 'part-b' ? 'partsB' : null : null;
    if (cle === null || (cle === 'partsB' && instance.parametres.denominateurAlternative === null)) return etat;
    const limite = cle === 'partsA' ? instance.parametres.denominateur : instance.parametres.denominateurAlternative!;
    const suivant = valeur(etat, cle) + (geste.type === 'placer' ? 1 : -1);
    return suivant < 0 || suivant > limite ? etat : memoriser(etat, { ...etat.objets, [cle]: suivant });
  }
  const categories = instance.parametres.categories;
  if (geste.type === 'choisir' && geste.objetId.startsWith('lecture:')) {
    const id = geste.objetId.slice('lecture:'.length);
    return categories.some((c) => c.id === id) ? memoriser(etat, { ...etat.objets, lecture: id }) : etat;
  }
  if (geste.type === 'placer' && geste.objetId.startsWith('fruit:')) {
    const source = geste.objetId.slice('fruit:'.length), destination = geste.destination;
    if (destination === undefined || source === destination ||
        !categories.some((c) => c.id === source) || !categories.some((c) => c.id === destination) ||
        valeur(etat, `panier:${source}`) < 1 ||
        valeur(etat, `panier:${destination}`) >= (instance.niveau === 'decouverte' ? 6 :
          instance.niveau === 'exploration' ? 12 : 20)) return etat;
    return memoriser(etat, { ...etat.objets,
      [`panier:${source}`]: valeur(etat, `panier:${source}`) - 1,
      [`panier:${destination}`]: valeur(etat, `panier:${destination}`) + 1,
      transferts: valeur(etat, 'transferts') + 1 });
  }
  if (geste.type === 'placer' || geste.type === 'retirer') {
    const cle = geste.objetId;
    if (!/^(table|barre):/u.test(cle) || !categories.some((c) => cle.endsWith(`:${c.id}`))) return etat;
    const id = cle.slice(cle.indexOf(':') + 1);
    if (geste.type === 'placer' && geste.destination === 'valeur') {
      return Number.isSafeInteger(geste.position) && geste.position >= 0 && geste.position <= 20 &&
        geste.position !== valeur(etat, cle) ? memoriser(etat, { ...etat.objets, [cle]: geste.position }) : etat;
    }
    const suivant = valeur(etat, cle) + (geste.type === 'placer' ? 1 : -1);
    return suivant < 0 || suivant > valeur(etat, `panier:${id}`) ? etat : memoriser(etat, { ...etat.objets, [cle]: suivant });
  }
  return etat;
}

function sommeGraines(etat: EtatManipulationMaths): number {
  return valeur(etat, 'centaines') * 100 + valeur(etat, 'dizaines') * 10 + valeur(etat, 'unites');
}
export function validerJardin(instance: InstanceJardin, etat: EtatManipulationMaths): ValidationMaths {
  if (instance.famille === 'MAT-JAR-01') {
    const somme = sommeGraines(etat), cible = instance.parametres.cible;
    if (somme < cible) return { statut: 'incomplete', raison: 'Il manque des graines sur le plateau.' };
    if (somme > cible) return { statut: 'incorrecte', raison: 'Le plateau contient trop de graines.', ecart: somme - cible };
    if (instance.parametres.echangeRequis && valeur(etat, 'echanges') === 0) {
      return { statut: 'incomplete', raison: 'Montre un échange de dix contre un.' };
    }
    if (instance.parametres.decompositionsRequises === 2) {
      const premiere = etat.objets.premiere;
      if (typeof premiere !== 'string') return { statut: 'incomplete', raison: 'Garde une première façon, puis cherche une autre.' };
      const seconde = `${valeur(etat, 'centaines')}:${valeur(etat, 'dizaines')}:${valeur(etat, 'unites')}`;
      if (premiere === seconde) return { statut: 'incorrecte', raison: 'La seconde façon doit changer les groupements.' };
      const nonCanonique = [premiere, seconde].some((forme) => {
        const [c, d, u] = forme.split(':').map(Number);
        return d! >= 10 || u! >= 10 || c! >= 10;
      });
      if (!nonCanonique) return { statut: 'incorrecte', raison: 'Cherche aussi une façon avec plus de dix bottes ou unités.' };
    }
    if (instance.parametres.caissesRequises !== null &&
        (valeur(etat, 'dizaines') !== instance.parametres.caissesRequises ||
          valeur(etat, 'centaines') !== 0 || valeur(etat, 'unites') !== 0)) {
      return { statut: 'incorrecte', raison: 'Les fruits doivent finir dans les caisses de dix.' };
    }
    return { statut: 'correcte', solution: { total: cible, centaines: valeur(etat, 'centaines'),
      dizaines: valeur(etat, 'dizaines'), unites: valeur(etat, 'unites') } };
  }
  if (instance.famille === 'MAT-JAR-02') {
    const p = instance.parametres, a = valeur(etat, 'partsA'), b = valeur(etat, 'partsB');
    const attenduB = p.denominateurAlternative === null ? 0 :
      p.numerateur * p.denominateurAlternative / p.denominateur;
    if (a < p.numerateur || (p.denominateurAlternative !== null && b < attenduB)) {
      return { statut: 'incomplete', raison: 'Il manque une part du même tout.' };
    }
    if (a * p.denominateur !== p.numerateur * p.denominateur ||
        (p.denominateurAlternative !== null && b * p.denominateur !== p.numerateur * p.denominateurAlternative)) {
      return { statut: 'incorrecte', raison: 'La surface couverte ne correspond pas à la part demandée.' };
    }
    return { statut: 'correcte', solution: { numerateur: p.numerateur, denominateur: p.denominateur,
      partsPosees: a, autreRepresentation: b } };
  }
  const p = instance.parametres;
  for (const categorie of p.categories) {
    const panier = valeur(etat, `panier:${categorie.id}`);
    const table = valeur(etat, `table:${categorie.id}`), barre = valeur(etat, `barre:${categorie.id}`);
    if (table < panier || barre < panier) return { statut: 'incomplete', raison: 'Le tableau et les barres attendent encore des fruits.' };
    if (table !== panier || barre !== panier) return { statut: 'incorrecte', raison: 'Le carnet ne montre pas le même nombre que le panier.' };
  }
  const total = p.categories.reduce((s, c) => s + valeur(etat, `panier:${c.id}`), 0);
  if (total !== p.total) return { statut: 'incorrecte', raison: 'Un fruit a été perdu entre les paniers.' };
  if (p.transfertRequis && valeur(etat, 'transferts') === 0) return { statut: 'incomplete', raison: 'Déplace un fruit et actualise le carnet.' };
  if (p.lectureRequise) {
    const lecture = etat.objets.lecture;
    if (typeof lecture !== 'string') return { statut: 'incomplete', raison: 'Choisis le panier le plus rempli sur le carnet actuel.' };
    const meilleur = Math.max(...p.categories.map((c) => valeur(etat, `panier:${c.id}`)));
    if (!p.categories.some((c) => c.id === lecture && valeur(etat, `panier:${c.id}`) === meilleur)) {
      return { statut: 'incorrecte', raison: 'Relis les barres après le déplacement des fruits.' };
    }
  }
  return { statut: 'correcte', solution: { total, categories: Object.fromEntries(p.categories.map((c) => [c.id, valeur(etat, `panier:${c.id}`)])) } };
}

/** Témoin hors énoncé ; le validateur n'appelle jamais cette fonction. */
export function construireTemoinJardin(instance: InstanceJardin): EtatManipulationMaths {
  if (instance.famille === 'MAT-JAR-01') {
    const cible = instance.parametres.cible, c = Math.floor(cible / 100), d = Math.floor((cible % 100) / 10), u = cible % 10;
    const caisses = instance.parametres.caissesRequises;
    return { ...VIDE, objets: { centaines: caisses === null ? c : 0, dizaines: caisses ?? d, unites: caisses === null ? u : 0,
      echanges: instance.parametres.echangeRequis ? 1 : 0,
      premiere: instance.parametres.decompositionsRequises === 2 ?
        caisses === null ? `${Math.max(0, c - 1)}:${d + 10}:${u}` : `${c}:${d}:${u}` : null } };
  }
  if (instance.famille === 'MAT-JAR-02') return { ...instance.etatInitial,
    objets: { partsA: instance.parametres.numerateur,
      partsB: instance.parametres.denominateurAlternative === null ? 0 :
        instance.parametres.numerateur * instance.parametres.denominateurAlternative / instance.parametres.denominateur } };
  const objets: Record<string, number | string | null> = { transferts: instance.parametres.transfertRequis ? 1 : 0,
    lecture: instance.parametres.lectureRequise ? instance.parametres.categories.reduce((a, b) =>
      a.quantite >= b.quantite ? a : b).id : null };
  for (const c of instance.parametres.categories) {
    objets[`panier:${c.id}`] = c.quantite; objets[`table:${c.id}`] = c.quantite; objets[`barre:${c.id}`] = c.quantite;
  }
  return { ...VIDE, objets };
}

function prochainGesteGraines(instance: InstanceGraines, etat: EtatManipulationMaths): GesteMaths | null {
  const p = instance.parametres;
  const c = Math.floor(p.cible / 100), d = Math.floor((p.cible % 100) / 10), u = p.cible % 10;
  const actuel = { centaines: valeur(etat, 'centaines'), dizaines: valeur(etat, 'dizaines'), unites: valeur(etat, 'unites') };
  const premier = etat.objets.premiere;
  if (p.decompositionsRequises === 2 && typeof premier !== 'string' && sommeGraines(etat) === p.cible) {
    if (p.caissesRequises !== null && actuel.centaines === 0 &&
        actuel.dizaines === p.caissesRequises && actuel.unites === 0) {
      return { type: 'choisir', objetId: 'echanger-dizaines' };
    }
    return { type: 'choisir', objetId: 'garder-decomposition' };
  }
  const premiereNonCanonique = typeof premier === 'string' && premier.split(':').some((v, index) =>
    index === 1 || index === 2 ? Number(v) >= 10 : false);
  const finalNonCanonique = p.decompositionsRequises === 2 && typeof premier === 'string' &&
    !premiereNonCanonique && p.caissesRequises === null;
  const desire = p.caissesRequises !== null && (p.decompositionsRequises !== 2 || typeof premier === 'string')
    ? { centaines: 0, dizaines: p.caissesRequises, unites: 0 }
    : finalNonCanonique && d > 0 ? { centaines: c, dizaines: d - 1, unites: u + 10 }
      : finalNonCanonique && c > 0 ? { centaines: c - 1, dizaines: d + 10, unites: u }
        : { centaines: c, dizaines: d, unites: u };
  if (actuel.centaines === desire.centaines && actuel.dizaines === desire.dizaines && actuel.unites === desire.unites) {
    if (p.echangeRequis && valeur(etat, 'echanges') === 0) {
      if (actuel.dizaines > 0 && actuel.unites + 10 <= p.stock.unites) return { type: 'choisir', objetId: 'defaire-dizaine' };
      if (actuel.centaines > 0 && actuel.dizaines + 10 <= p.stock.dizaines) return { type: 'choisir', objetId: 'defaire-centaine' };
    }
    return null;
  }
  if (actuel.centaines > desire.centaines && actuel.dizaines + 10 <= desire.dizaines &&
      actuel.dizaines + 10 <= p.stock.dizaines) return { type: 'choisir', objetId: 'defaire-centaine' };
  if (actuel.dizaines > desire.dizaines && actuel.unites + 10 <= desire.unites &&
      actuel.unites + 10 <= p.stock.unites) return { type: 'choisir', objetId: 'defaire-dizaine' };
  if (actuel.unites > desire.unites && actuel.dizaines < desire.dizaines && actuel.unites >= 10)
    return { type: 'choisir', objetId: 'echanger-unites' };
  if (actuel.dizaines > desire.dizaines && actuel.centaines < desire.centaines && actuel.dizaines >= 10)
    return { type: 'choisir', objetId: 'echanger-dizaines' };
  for (const [cle, id] of [['centaines', 'centaine'], ['dizaines', 'dizaine'], ['unites', 'unite']] as const) {
    if (actuel[cle] > desire[cle]) return { type: 'retirer', objetId: id };
  }
  for (const [cle, id] of [['centaines', 'centaine'], ['dizaines', 'dizaine'], ['unites', 'unite']] as const) {
    if (actuel[cle] < desire[cle]) return { type: 'placer', objetId: id, position: 0 };
  }
  return null;
}

/** Proposition d'un geste réversible ; aucune action n'est appliquée sans toucher de l'enfant. */
export function prochainGesteJardin(instance: InstanceJardin, etat: EtatManipulationMaths): GesteMaths | null {
  if (validerJardin(instance, etat).statut === 'correcte') return null;
  if (instance.famille === 'MAT-JAR-01') return prochainGesteGraines(instance, etat);
  if (instance.famille === 'MAT-JAR-02') {
    const p = instance.parametres;
    const objectifB = p.denominateurAlternative === null ? 0 :
      p.numerateur * p.denominateurAlternative / p.denominateur;
    for (const [cle, id, objectif] of [['partsA', 'part-a', p.numerateur],
      ['partsB', 'part-b', objectifB]] as const) {
      if (valeur(etat, cle) > objectif) return { type: 'retirer', objetId: id };
      if (valeur(etat, cle) < objectif) return { type: 'placer', objetId: id, position: 0 };
    }
    return null;
  }
  const p = instance.parametres;
  if (p.transfertRequis && valeur(etat, 'transferts') === 0) {
    const limite = instance.niveau === 'decouverte' ? 6 : instance.niveau === 'exploration' ? 12 : 20;
    const destination = p.categories.find((c) => valeur(etat, `panier:${c.id}`) < limite);
    const source = p.categories.find((c) => c.id !== destination?.id && valeur(etat, `panier:${c.id}`) > 1) ??
      p.categories.find((c) => c.id !== destination?.id && valeur(etat, `panier:${c.id}`) > 0);
    if (source !== undefined && destination !== undefined) {
      return { type: 'placer', objetId: `fruit:${source.id}`, destination: destination.id, position: 0 };
    }
  }
  for (const categorie of p.categories) {
    for (const colonne of ['table', 'barre'] as const) {
      const cle = `${colonne}:${categorie.id}`, objectif = valeur(etat, `panier:${categorie.id}`);
      if (valeur(etat, cle) !== objectif) return { type: 'placer', objetId: cle, position: objectif, destination: 'valeur' };
    }
  }
  if (p.lectureRequise) {
    const meilleur = Math.max(...p.categories.map((c) => valeur(etat, `panier:${c.id}`)));
    const categorie = p.categories.find((c) => valeur(etat, `panier:${c.id}`) === meilleur);
    return categorie === undefined ? null : { type: 'choisir', objetId: `lecture:${categorie.id}` };
  }
  return null;
}

export function proposerAideJardin(instance: InstanceJardin, _erreurs: number, aide: AideMaths,
  etat: EtatManipulationMaths = instance.etatInitial): { niveau: AideMaths; consigne: InstanceJardin['consigne'] | null; gestePropose: GesteMaths | null } {
  return { niveau: aide, consigne: aide === 'aucune' ? null : instance.aide[aide],
    gestePropose: aide === 'demonstration' ? prochainGesteJardin(instance, etat) : null };
}

export function estInstanceJardin(valeurBrute: unknown): valeurBrute is InstanceJardin {
  if (typeof valeurBrute !== 'object' || valeurBrute === null) return false;
  const v = valeurBrute as Record<string, unknown>;
  if (!(v.format === 1 && v.versionModele === 1 && (v.versionGenerateur === 1 || (v.famille === 'MAT-JAR-02' && v.versionGenerateur === 2)) &&
    typeof v.id === 'string' && v.id.length > 0 &&
    ['MAT-JAR-01', 'MAT-JAR-02', 'MAT-JAR-03'].includes(String(v.famille)) &&
    NIVEAUX.includes(v.niveau as NiveauMaths) &&
    typeof v.parametres === 'object' && v.parametres !== null &&
    typeof v.etatInitial === 'object' && v.etatInitial !== null)) return false;
  const p = v.parametres as Record<string, unknown>;
  const entierValide = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n);
  if (v.famille === 'MAT-JAR-01') {
    const stock = p.stock as Record<string, unknown> | null;
    return entierValide(p.cible) && stock !== null && typeof stock === 'object' &&
      entierValide(stock.unites) && entierValide(stock.dizaines) && entierValide(stock.centaines) &&
      typeof p.echangeRequis === 'boolean' && (p.decompositionsRequises === 1 || p.decompositionsRequises === 2) &&
      (p.uniteObjet === 'graine' || p.uniteObjet === 'fruit') &&
      (p.caissesRequises === null || entierValide(p.caissesRequises));
  }
  if (v.famille === 'MAT-JAR-02') {
    if (p.representation !== undefined && p.representation !== 'bande' && p.representation !== 'disque') return false;
    return entierValide(p.denominateur) && DENOMINATEURS[v.niveau as NiveauMaths].includes(p.denominateur as number) &&
      entierValide(p.numerateur) && (p.numerateur as number) >= 1 &&
      (p.numerateur as number) <= (p.denominateur as number) && entierValide(p.partsInitiales) &&
      (p.denominateurAlternative === null || entierValide(p.denominateurAlternative));
  }
  return Array.isArray(p.categories) && p.categories.length >= 2 && p.categories.length <= 5 &&
    p.categories.every((c: unknown) => typeof c === 'object' && c !== null &&
      typeof (c as CategorieRecolte).id === 'string' && entierValide((c as CategorieRecolte).quantite)) &&
    entierValide(p.total) && (p.fruitsParUnite === 1 || p.fruitsParUnite === 10) &&
    typeof p.lectureRequise === 'boolean' && typeof p.transfertRequis === 'boolean';
}

function famillesProjet(id: ProjetJardinId): readonly [FamilleJardin, FamilleJardin, FamilleJardin] {
  if (id === 'MAT-JAR-P01') return ['MAT-JAR-01', 'MAT-JAR-02', 'MAT-JAR-02'];
  if (id === 'MAT-JAR-P02') return ['MAT-JAR-03', 'MAT-JAR-01', 'MAT-JAR-03'];
  return ['MAT-JAR-02', 'MAT-JAR-03', 'MAT-JAR-02'];
}
function denominateurCommun(a: NiveauMaths, b: NiveauMaths): number | null {
  return [...DENOMINATEURS[a]].reverse().find((d) => DENOMINATEURS[b].includes(d)) ?? null;
}
export function verifierCombinaisonJardin(id: ProjetJardinId,
  niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths]): string | null {
  if (!NIVEAUX.includes(niveaux[0]) || !NIVEAUX.includes(niveaux[1]) || !NIVEAUX.includes(niveaux[2])) return 'Niveau inconnu.';
  if (id === 'MAT-JAR-P01' && (![4, 6, 8, 10].some((d) => DENOMINATEURS[niveaux[1]].includes(d) &&
      DENOMINATEURS[niveaux[2]].includes(d) && (niveaux[0] === 'decouverte' ? 24 : 240) % d === 0))) {
    return 'Les deux étapes de jardin demandent un même nombre de carrés et un partage exact des graines.';
  }
  if (id === 'MAT-JAR-P02' && ((niveaux[0] === 'decouverte') !== (niveaux[2] === 'decouverte'))) {
    return 'Le carnet des deux étapes doit garder les mêmes variétés de récolte.';
  }
  if (id === 'MAT-JAR-P03') {
    const d = denominateurCommun(niveaux[0], niveaux[2]);
    if (d === null) return 'Les deux parts du banquet demandent un même découpage du gâteau.';
    if (niveaux[1] === 'defi' && d === 4) return 'Le carnet Défi demande au moins quatre convives servis.';
  }
  return null;
}

export function creerProjetJardin(id: ProjetJardinId,
  niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths], alea: Alea, sessionId: string): ProjetJardin {
  if (!['MAT-JAR-P01', 'MAT-JAR-P02', 'MAT-JAR-P03'].includes(id) || !sessionId.trim()) throw new Error('Projet Jardin ou session inconnus.');
  const incompatibilite = verifierCombinaisonJardin(id, niveaux);
  if (incompatibilite !== null) throw new Error(incompatibilite);
  let instances: readonly [InstanceJardin, InstanceJardin, InstanceJardin];
  let variables: Record<string, number>;
  if (id === 'MAT-JAR-P01') {
    const totalGraines = niveaux[0] === 'decouverte' ? 24 : 240;
    const d = [4, 6, 8, 10].reverse().find((valeur) => DENOMINATEURS[niveaux[1]].includes(valeur) &&
      DENOMINATEURS[niveaux[2]].includes(valeur) && totalGraines % valeur === 0)!;
    const carresPlantes = niveaux[1] === 'defi' || niveaux[2] === 'defi' ? d - 2 : d - 1;
    const parCarre = totalGraines / d;
    instances = [genererJardin('MAT-JAR-01', niveaux[0], alea, { cible: totalGraines }),
      genererJardin('MAT-JAR-02', niveaux[1], alea, { denominateur: d, numerateur: carresPlantes, totalGraines }),
      genererJardin('MAT-JAR-02', niveaux[2], alea, { denominateur: d, numerateur: d,
        partsInitiales: carresPlantes, totalGraines })];
    variables = { totalGraines, partsEgales: d, grainesParCarre: parCarre, carresPlantes, carresTotaux: d };
  } else if (id === 'MAT-JAR-P02') {
    const fruitsParCaisse = 10;
    const nombreCaisses = niveaux[1] === 'decouverte' ? 1 : 12;
    const totalFruits = nombreCaisses * fruitsParCaisse;
    const fruitsParUnite: 1 | 10 = niveaux[1] === 'decouverte' ? 1 : 10;
    const categories = categoriesPourTotal(niveaux[0], alea, totalFruits / fruitsParUnite,
      niveaux[0] === 'decouverte' ? 2 : 4);
    instances = [genererJardin('MAT-JAR-03', niveaux[0], alea,
      { categories, transfertRequis: false, fruitsParUnite }),
      genererJardin('MAT-JAR-01', niveaux[1], alea, { cible: totalFruits,
        uniteObjet: 'fruit', caissesRequises: nombreCaisses, echangeRequis: true }),
      genererJardin('MAT-JAR-03', niveaux[2], alea,
        { categories, transfertRequis: niveaux[2] === 'defi', fruitsParUnite })];
    variables = { nombreCaisses, fruitsParCaisse, fruitsEnCaisse: 10,
      totalFruits, totalConserve: totalFruits };
  } else {
    const d = denominateurCommun(niveaux[0], niveaux[2])!;
    const partsServies = d === 4 ? 3 : d >= 6 ? 4 : Math.max(1, d - 1);
    const categories = categoriesPourTotal(niveaux[1], alea, partsServies,
      niveaux[1] === 'decouverte' ? 2 : niveaux[1] === 'exploration' ? 3 : 4);
    instances = [genererJardin('MAT-JAR-02', niveaux[0], alea, { denominateur: d, numerateur: partsServies }),
      genererJardin('MAT-JAR-03', niveaux[1], alea, { categories, transfertRequis: false }),
      genererJardin('MAT-JAR-02', niveaux[2], alea, { denominateur: d, numerateur: d,
        partsInitiales: partsServies })];
    variables = { denominateur: d, partChoisie: partsServies, convivesServis: partsServies,
      partsServies, partsComplementees: d - partsServies };
  }
  const familles = famillesProjet(id);
  const plan = familles.map((famille, rang) => ({ rang, famille, niveau: niveaux[rang]!, instanceId: `${sessionId}:${rang}` })) as unknown as
    readonly [EtapeProjetMaths, EtapeProjetMaths, EtapeProjetMaths];
  const transformationId = id === 'MAT-JAR-P01' ? 'jardin-carres-plantes' :
    id === 'MAT-JAR-P02' ? 'jardin-carnet-saisons' : 'jardin-table-fete';
  const cadeauId = id === 'MAT-JAR-P01' ? 'maths-souvenir-jardin' :
    id === 'MAT-JAR-P02' ? null : 'maths-objet-jardin';
  const cadeauType: 'souvenir' | 'objet' | null = id === 'MAT-JAR-P01' ? 'souvenir' : id === 'MAT-JAR-P02' ? null : 'objet';
  const contexte = (etape: number): ContexteProjetMaths => ({ sessionId, projetId: id, versionProjet: 1,
    etape, variables, plan, transformationId, cadeauId, cadeauType });
  const etapes = instances.map((instance, rang) => ({ ...instance, id: plan[rang]!.instanceId,
    projet: contexte(rang) })) as unknown as readonly [InstanceJardin, InstanceJardin, InstanceJardin];
  const projet = { id, sessionId, version: 1 as const, niveaux, variables, plan, transformationId,
    cadeauId, cadeauType };
  return { ...projet, projet, instances: etapes, etapes };
}
