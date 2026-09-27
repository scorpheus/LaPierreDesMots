import { creerAlea, type Alea } from '../../../alea.js';
import type {
  AideMaths, ConsigneMaths, EtatManipulationMaths, GesteMaths, InstanceMathsBase,
  NiveauMaths, ValidationMaths, EtapeProjetMaths,
} from '../../types.js';

export type FamillePont = 'MAT-PON-01' | 'MAT-PON-02' | 'MAT-PON-03';
type ChoixPlanche = { readonly id: string; readonly longueur: number; readonly origine: number };
type Piece = { readonly id: string; readonly longueur: number };

export type InstancePont01 = InstanceMathsBase<'MAT-PON-01', {
  readonly origineCible: number;
  readonly longueurCible: number;
  readonly choix: readonly ChoixPlanche[];
  readonly nombrePlanches: number;
  readonly segmentsTrajet?: readonly [ChoixPlanche, ChoixPlanche];
  readonly repereDestination?: number;
  readonly reparation?: { readonly moduleRestantCm: number; readonly moduleEndommageId: 'module-endommage';
    readonly moduleEndommageCm: number };
}, readonly ChoixPlanche[]>;
export type InstancePont02 = InstanceMathsBase<'MAT-PON-02', {
  readonly pas: 1 | 10 | 100;
  readonly graduations: readonly number[];
  readonly bornesAPoser: readonly number[];
  readonly reperePont: number;
  readonly encadrement: { readonly inferieure: number; readonly superieure: number };
  readonly porteeAVerifier?: number;
}, readonly number[]>;
export type InstancePont03 = InstanceMathsBase<'MAT-PON-03', {
  readonly portee: number;
  readonly pieces: readonly Piece[];
  readonly nombrePiecesMinimum: number;
  readonly reparation?: { readonly moduleRestantId: string; readonly moduleEndommageId: 'module-endommage';
    readonly moduleEndommageCm: number; readonly manqueCm: number };
  readonly trajet?: { readonly longueurA: number; readonly longueurB: number; readonly repereDestination: number };
}, readonly Piece[]>;
export type InstancePont = InstancePont01 | InstancePont02 | InstancePont03;
export type ProjetPremiereTraversee = {
  readonly id: 'MAT-PON-P01';
  readonly sessionId: string;
  readonly version: 1;
  readonly niveau: NiveauMaths | null;
  readonly niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths];
  readonly variables: { readonly porteeCm: number; readonly reperePont: number };
  readonly plan: readonly [EtapeProjetMaths, EtapeProjetMaths, EtapeProjetMaths];
  readonly transformationId: string;
  readonly cadeauId: string;
  readonly cadeauType: 'souvenir';
  readonly etapes: readonly [InstancePont01, InstancePont03, InstancePont02];
};

const VIDE: EtatManipulationMaths = { objets: {}, placements: {}, selection: null, historique: [] };
const NIVEAUX: readonly NiveauMaths[] = ['decouverte', 'exploration', 'defi'];
const BORNES_01: Readonly<Record<NiveauMaths, readonly [number, number]>> = {
  decouverte: [2, 8], exploration: [5, 15], defi: [8, 25],
};
const BORNES_03: Readonly<Record<NiveauMaths, readonly [number, number]>> = {
  decouverte: [5, 12], exploration: [10, 25], defi: [15, 40],
};
export const COMBINAISONS_PON_P01: readonly (readonly [NiveauMaths, NiveauMaths, NiveauMaths])[] = NIVEAUX.flatMap((n01) =>
  NIVEAUX.flatMap((n03) => {
    const min = Math.max(BORNES_01[n01][0], BORNES_03[n03][0]);
    const max = Math.min(BORNES_01[n01][1], BORNES_03[n03][1]);
    return min > max ? [] : NIVEAUX.map((n02) => [n01, n03, n02] as const);
  }));
/** P02 : chaque morceau relève de la mesure 01 ; leur somme relève du tablier 03. */
export const COMBINAISONS_PON_P02: readonly (readonly [NiveauMaths, NiveauMaths, NiveauMaths])[] = NIVEAUX.flatMap((n02) =>
  NIVEAUX.flatMap((n01) => NIVEAUX.filter((n03) =>
    2 * BORNES_01[n01][0] <= BORNES_03[n03][1] &&
    2 * BORNES_01[n01][1] >= BORNES_03[n03][0])
    .map((n03) => [n02, n01, n03] as const)));
const VERSION_MODELE = 1;
const VERSION_GENERATEUR = 1;

function consigne(texte: string, audio: string): ConsigneMaths {
  return { texte, segments: [{ texte, audio }] };
}
function numerique(morceaux: readonly (string | number)[], prefixe: string, gobi = false): ConsigneMaths {
  const segments = morceaux.map((morceau, rang) => ({
    texte: String(morceau),
    audio: typeof morceau === 'number' ? `maths/${gobi ? 'gobi/' : ''}nombres/${morceau}` : `maths/${prefixe}/segment-${rang}`,
  }));
  return { texte: segments.map((s) => s.texte).join(''), segments };
}

function base<F extends FamillePont, P, S>(
  famille: F, niveau: NiveauMaths, alea: Alea, parametres: P, stock: S,
  signature: string, modeleId: string, instruction: ConsigneMaths,
): InstanceMathsBase<F, P, S> {
  const id = `${famille.toLowerCase()}-${niveau}-${alea.graine.toString(16)}-${signature.replace(/[^a-z0-9]/gi, '-')}`;
  return {
    format: 1, id, famille, niveau, modeleId,
    versionModele: VERSION_MODELE, versionGenerateur: VERSION_GENERATEUR,
    graine: alea.graine, signature, parametres, stock, etatInitial: VIDE,
    consigne: instruction, unite: famille === 'MAT-PON-02' ? 'nombre' : 'cm',
    aide: {
      indice: consigne('Regarde les repères.', `maths/${modeleId}/indice`),
      demonstration: consigne('Observe le geste de Gobi, puis essaie.', `maths/${modeleId}/demonstration`),
    },
    reglesValidation: { version: 1, egaliteExacte: true },
  };
}

function entier(alea: Alea, min: number, max: number): number {
  return alea.entier(min, max + 1);
}

function longueurPont01(niveau: NiveauMaths, alea: Alea, cible?: number): number {
  const [min, max] = niveau === 'decouverte' ? [2, 8] : niveau === 'exploration' ? [5, 15] : [8, 25];
  if (cible !== undefined) {
    if (!Number.isInteger(cible) || cible < min! || cible > max!) throw new Error('Portée hors niveau MAT-PON-01.');
    return cible;
  }
  return entier(alea, min!, max!);
}

function creerPont01(niveau: NiveauMaths, alea: Alea, longueurFixee?: number): InstancePont01 {
  const longueurCible = longueurPont01(niveau, alea, longueurFixee);
  const origineCible = niveau === 'decouverte' ? 0 : entier(alea, 1, 4);
  const nombrePlanches = niveau === 'defi' ? 2 : 1;
  const partage = niveau === 'defi' ? Math.max(2, Math.floor(longueurCible / 2)) : longueurCible;
  const bonnes = nombrePlanches === 2
    ? [{ id: 'planche-a', longueur: partage, origine: 4 }, { id: 'planche-b', longueur: longueurCible - partage, origine: 1 }]
    : [{ id: 'planche-a', longueur: longueurCible, origine: 3 }];
  const distracteurs = [
    { id: 'planche-c', longueur: Math.max(1, longueurCible - 1), origine: 2 },
    { id: 'planche-d', longueur: longueurCible + 1, origine: 5 },
  ];
  const choix = alea.melanger([...bonnes, ...distracteurs]);
  const parametres = { origineCible, longueurCible, choix, nombrePlanches };
  const signature = `mesurer:${longueurCible}:${nombrePlanches}`;
  const instance = base('MAT-PON-01', niveau, alea, parametres, choix, signature, 'ponts-planches-v1',
    numerique(['Mesure la portée de ', longueurCible, nombrePlanches === 1
      ? ' centimètres et retrouve une planche de même longueur.'
      : ' centimètres et retrouve des planches de même longueur.'],
      nombrePlanches === 1 ? 'ponts-planches-v1-une' : 'ponts-planches-v1-plusieurs'));
  return { ...instance, aide: {
    indice: consigne('Pose le zéro de la règle au début de la planche.', 'maths/ponts-planches-v1/indice'),
    demonstration: numerique(['La longueur du pont est de ', longueurCible,
      ' centimètres. Cherche des pièces mises bout à bout.'], 'ponts-planches-v1-demo', true),
  } };
}

/** Deux morceaux visibles et mesurables séparément ; la somme reste à construire par l'enfant. */
export function creerMesureTrajetPont(niveau: NiveauMaths, alea: Alea, longueurA: number, longueurB: number,
  repereDestination: number): InstancePont01 {
  longueurPont01(niveau, alea, longueurA);
  longueurPont01(niveau, alea, longueurB);
  const segmentsTrajet: readonly [ChoixPlanche, ChoixPlanche] = [
    { id: 'segment-a', longueur: longueurA, origine: niveau === 'decouverte' ? 0 : 2 },
    { id: 'segment-b', longueur: longueurB, origine: niveau === 'decouverte' ? 0 : 3 },
  ];
  const parametres = { origineCible: 0, longueurCible: longueurA + longueurB,
    choix: [] as readonly ChoixPlanche[], nombrePlanches: 2, segmentsTrajet, repereDestination };
  return { ...base('MAT-PON-01', niveau, alea, parametres, segmentsTrajet,
    `trajet:${longueurA}+${longueurB}:borne=${repereDestination}`, 'ponts-planches-v1',
    consigne('Mesure chaque morceau du chemin. Combien font-ils mis bout à bout ?', 'maths/ponts-planches-v1/trajet')),
    aide: { indice: consigne('Choisis un morceau et place le zéro de la règle à son départ.', 'maths/ponts-planches-v1/trajet-indice'),
      demonstration: consigne('Mesure les deux morceaux, puis ajoute leurs longueurs.', 'maths/ponts-planches-v1/trajet-demo') } };
}

export function creerMesureManquePont(niveau: NiveauMaths, alea: Alea, manqueCm: number,
  moduleRestantCm: number): InstancePont01 {
  const instance = creerPont01(niveau, alea, manqueCm);
  const moduleEndommageCm = manqueCm;
  return { ...instance, parametres: { ...instance.parametres, origineCible: moduleRestantCm,
    reparation: { moduleRestantCm, moduleEndommageId: 'module-endommage' as const, moduleEndommageCm } },
    consigne: consigne('Un module du pont est abîmé. Mesure sa longueur pour préparer son remplacement.',
      'maths/ponts-planches-v1/manque'),
    aide: { indice: consigne('Place le zéro au début du module abîmé.', 'maths/ponts-planches-v1/manque-indice'),
      demonstration: numerique(['Le module abîmé mesure ', manqueCm,
        ' centimètres. Trouve les planches qui auront la même longueur.'], 'ponts-planches-v1-manque-demo', true) } };
}

function creerPont02(niveau: NiveauMaths, alea: Alea, repereFixe?: number, pasFixe?: 1 | 10 | 100): InstancePont02 {
  const pas: 1 | 10 | 100 = pasFixe ?? (niveau === 'decouverte' ? 1 : niveau === 'exploration' ? 10 : alea.choisir([1, 10, 100] as const));
  const maximum = niveau === 'decouverte' ? 30 : niveau === 'exploration' ? 300
    : pas === 1 ? 30 : pas === 10 ? 300 : 1000;
  const rangMax = Math.floor(maximum / pas);
  const rangCentre = repereFixe === undefined
    ? entier(alea, 1, rangMax - 1)
    : repereFixe / pas;
  if (!Number.isInteger(rangCentre) || rangCentre < 1 || rangCentre >= rangMax) throw new Error('Repère incompatible avec le niveau MAT-PON-02.');
  const premierRang = Math.max(0, Math.min(rangCentre - 2, rangMax - 4));
  const graduations = Array.from({ length: 5 }, (_, i) => (premierRang + i) * pas);
  const reperePont = rangCentre * pas;
  const encadrement = { inferieure: reperePont - pas, superieure: reperePont + pas };
  const autreBorne = graduations.find((v) => v > reperePont) ?? graduations.find((v) => v < reperePont)!;
  const bornesAPoser = niveau === 'decouverte' ? [reperePont] : [reperePont, autreBorne];
  const parametres = { pas, graduations, bornesAPoser, reperePont, encadrement };
  const signature = `placer:${pas}:${bornesAPoser.join(',')}:inconnue=${reperePont}`;
  const instance = base('MAT-PON-02', niveau, alea, parametres, bornesAPoser, signature, 'ponts-bornes-v1',
    numerique(bornesAPoser.length === 1
      ? ['Place la borne ', bornesAPoser[0]!, ' sur la rive graduée de ', pas, ' en ', pas, '.']
      : ['Place les bornes ', bornesAPoser[0]!, ' et ', bornesAPoser[1]!, ' sur la rive graduée de ', pas, ' en ', pas, '.'],
      bornesAPoser.length === 1 ? 'ponts-bornes-v1-une' : 'ponts-bornes-v1-deux'));
  return { ...instance, aide: {
    indice: numerique(['Compte de ', pas, ' en ', pas, ' sur la rive.'], 'ponts-bornes-v1-indice', true),
    demonstration: numerique(['La borne ', reperePont, ' se place entre ', encadrement.inferieure,
      ' et ', encadrement.superieure, '.'], 'ponts-bornes-v1-demo', true),
  } };
}

export function creerVerificationPont(niveau: NiveauMaths, alea: Alea, portee: number): InstancePont02 {
  const pas: 1 | 10 = niveau === 'decouverte' ? 1 : 10;
  const instance = creerPont02(niveau, alea, portee, pas);
  const autreBorne = instance.parametres.bornesAPoser[1];
  return { ...instance, parametres: { ...instance.parametres, porteeAVerifier: portee },
    consigne: autreBorne === undefined
      ? numerique(['Place la borne ', portee,
        ' pour vérifier que le pont réparé atteint l’autre rive.'], 'ponts-bornes-v1-verification')
      : numerique(['Place la borne ', portee, ' du pont réparé, puis la borne ', autreBorne,
        ' sur la rive.'], 'ponts-bornes-v1-verification') };
}

function placementDePieces(pieces: readonly Piece[]): EtatManipulationMaths {
  let position = 0;
  const placements: Record<string, number> = {};
  for (const piece of pieces) {
    placements[piece.id] = position;
    position += piece.longueur;
  }
  return { ...VIDE, placements };
}

/** Oracle de test hors instance sauvegardée ; aucune solution n'est envoyée dans l'énoncé. */
export function temoinsPont(instance: InstancePont): readonly EtatManipulationMaths[] {
  if (instance.famille === 'MAT-PON-01') {
    if (instance.parametres.segmentsTrajet) {
      const [a, b] = instance.parametres.segmentsTrajet;
      return [{ ...VIDE, placements: { [`regle:${a.id}`]: a.origine, [`regle:${b.id}`]: b.origine },
        objets: { [`longueurLue:${a.id}`]: a.longueur, [`longueurLue:${b.id}`]: b.longueur } }];
    }
    const { choix, longueurCible, nombrePlanches, origineCible } = instance.parametres;
    const combinaisons = nombrePlanches === 1
      ? choix.filter((p) => p.longueur === longueurCible).map((p) => [p])
      : choix.flatMap((a, i) => choix.slice(i + 1)
        .filter((b) => a.longueur + b.longueur === longueurCible).map((b) => [a, b]));
    return combinaisons.map((pieces) => ({
      objets: { longueurLue: longueurCible },
      placements: { regle: origineCible, ...placementDePieces(pieces).placements },
      selection: null, historique: [],
    }));
  }
  if (instance.famille === 'MAT-PON-02') {
    const { bornesAPoser, encadrement } = instance.parametres;
    return [{ ...VIDE,
      objets: instance.niveau === 'defi'
        ? { borneInferieure: encadrement.inferieure, borneSuperieure: encadrement.superieure } : {},
      placements: Object.fromEntries(bornesAPoser.map((v) => [`borne:${v}`, v])),
    }];
  }
  const { pieces, portee, nombrePiecesMinimum, reparation } = instance.parametres;
  const vues = new Set<string>();
  const temoins: EtatManipulationMaths[] = [];
  for (let masque = 1; masque < (1 << pieces.length); masque += 1) {
    const choisis = pieces.filter((_, i) => (masque & (1 << i)) !== 0);
    if (choisis.length < nombrePiecesMinimum || choisis.reduce((s, p) => s + p.longueur, 0) !== portee ||
        (reparation && (!choisis.some((p) => p.id === reparation.moduleRestantId) ||
          choisis.some((p) => p.id === reparation.moduleEndommageId)))) continue;
    const signature = choisis.map((p) => p.longueur).sort((a, b) => a - b).join('+');
    if (vues.has(signature)) continue;
    vues.add(signature);
    temoins.push(placementDePieces(choisis));
  }
  return temoins;
}

function creerPont03(niveau: NiveauMaths, alea: Alea, porteeFixee?: number): InstancePont03 {
  const [min, max] = niveau === 'decouverte' ? [5, 12] : niveau === 'exploration' ? [10, 25] : [15, 40];
  const portee = porteeFixee ?? entier(alea, min!, max!);
  if (!Number.isInteger(portee) || portee < min! || portee > max!) throw new Error('Portée hors niveau MAT-PON-03.');
  let pieces: Piece[];
  let nombrePiecesMinimum: number;
  if (niveau === 'decouverte') {
    const a = entier(alea, 2, portee - 2);
    pieces = [{ id: 'module-a', longueur: a }, { id: 'module-b', longueur: portee - a }, { id: 'module-c', longueur: portee + 1 }];
    nombrePiecesMinimum = 2;
  } else if (niveau === 'exploration') {
    const a = entier(alea, 2, portee - 4);
    const b = entier(alea, 2, portee - a - 2);
    const c = portee - a - b;
    pieces = [{ id: 'module-a', longueur: a }, { id: 'module-b', longueur: b }, { id: 'module-c', longueur: c }, { id: 'module-d', longueur: c + 1 }];
    nombrePiecesMinimum = 3;
  } else {
    const a = entier(alea, 2, portee - 3);
    const autre = Array.from({ length: portee - 3 }, (_, i) => i + 2)
      .find((valeur) => valeur !== a && valeur !== portee - a)!;
    pieces = [
      { id: 'module-a', longueur: a }, { id: 'module-b', longueur: portee - a },
      { id: 'module-c', longueur: autre }, { id: 'module-d', longueur: portee - autre },
    ];
    nombrePiecesMinimum = 2;
  }
  const parametres = { portee, pieces, nombrePiecesMinimum };
  const signature = `assembler:${portee}:${nombrePiecesMinimum}:inconnue=composition`;
  const etatInitial = niveau === 'exploration'
    ? placementDePieces([pieces[0]!, pieces[1]!, pieces[3]!]) : VIDE;
  const instance = base('MAT-PON-03', niveau, alea, parametres, pieces, signature, 'ponts-tablier-v1',
      niveau === 'exploration'
        ? numerique(['Retire un module et remplace-le pour franchir ', portee, ' centimètres.'], 'ponts-tablier-v1-remplacement')
        : numerique(['Assemble des modules pour franchir ', portee, ' centimètres.'], 'ponts-tablier-v1'));
  return { ...instance, etatInitial, aide: {
    indice: consigne(niveau === 'exploration' ? 'Retire le module qui dépasse, puis regarde le stock.'
      : 'Additionne les longueurs des modules.', niveau === 'exploration'
        ? 'maths/ponts-tablier-v1/indice-remplacement' : 'maths/ponts-tablier-v1/indice'),
    demonstration: numerique(['Le tablier doit mesurer ', portee, ' centimètres.'], 'ponts-tablier-v1-demo', true),
  } };
}

/** Un module stable demeure au départ ; deux paires distinctes réparent le même trou. */
export function creerReparationPont(niveau: NiveauMaths, alea: Alea, portee: number,
  moduleRestantCm: number): InstancePont03 {
  const [min, max] = BORNES_03[niveau];
  const manqueCm = portee - moduleRestantCm;
  if (!Number.isInteger(portee) || portee < min || portee > max || manqueCm < 6 || moduleRestantCm < 2) {
    throw new Error('Réparation incompatible avec le niveau MAT-PON-03.');
  }
  const pieces: readonly Piece[] = [
    { id: 'module-restant', longueur: moduleRestantCm },
    { id: 'module-endommage', longueur: manqueCm },
    { id: 'module-a', longueur: 2 }, { id: 'module-b', longueur: manqueCm - 2 },
    { id: 'module-c', longueur: 3 }, { id: 'module-d', longueur: manqueCm - 3 },
  ];
  const reparation = { moduleRestantId: 'module-restant', moduleEndommageId: 'module-endommage' as const,
    moduleEndommageCm: manqueCm, manqueCm };
  const parametres = { portee, pieces, nombrePiecesMinimum: 3, reparation };
  const etatInitial = placementDePieces([pieces[0]!, pieces[1]!]);
  return { ...base('MAT-PON-03', niveau, alea, parametres, pieces,
    `reparer:${moduleRestantCm}+${manqueCm}`, 'ponts-tablier-v1',
    consigne('Retire le module abîmé. Garde l’autre module en place et répare le trou avec deux modules.',
      'maths/ponts-tablier-v1/reparer')),
    etatInitial,
    aide: { indice: consigne('Retire le module abîmé. Le premier module reste. Essaie deux modules dans le trou.',
      'maths/ponts-tablier-v1/reparer-indice'),
      demonstration: consigne('Retire le module abîmé, puis place deux modules bout à bout après le module qui reste.',
        'maths/ponts-tablier-v1/reparer-demo') } };
}

export function creerTablierTrajetPont(niveau: NiveauMaths, alea: Alea, longueurA: number,
  longueurB: number, repereDestination: number): InstancePont03 {
  const instance = creerPont03(niveau, alea, longueurA + longueurB);
  return { ...instance, parametres: { ...instance.parametres,
    trajet: { longueurA, longueurB, repereDestination } },
    consigne: consigne('Assemble un tablier aussi long que les deux morceaux du chemin mis bout à bout.',
      'maths/ponts-tablier-v1/trajet'),
    aide: { indice: consigne('Ajoute les deux longueurs que tu as mesurées.', 'maths/ponts-tablier-v1/trajet-indice'),
      demonstration: consigne('Place les modules bout à bout, jusqu’à la longueur des deux morceaux.',
        'maths/ponts-tablier-v1/trajet-demo') } };
}

export function genererPont(famille: 'MAT-PON-01', niveau: NiveauMaths, alea: Alea, options?: { longueurFixee?: number }): InstancePont01;
export function genererPont(famille: 'MAT-PON-02', niveau: NiveauMaths, alea: Alea, options?: { repereFixe?: number; pasFixe?: 1 | 10 | 100 }): InstancePont02;
export function genererPont(famille: 'MAT-PON-03', niveau: NiveauMaths, alea: Alea, options?: { porteeFixee?: number }): InstancePont03;
export function genererPont(famille: FamillePont, niveau: NiveauMaths, alea: Alea, options?: { longueurFixee?: number; repereFixe?: number; pasFixe?: 1 | 10 | 100; porteeFixee?: number }): InstancePont;
export function genererPont(famille: FamillePont, niveau: NiveauMaths, alea: Alea, options: { longueurFixee?: number; repereFixe?: number; pasFixe?: 1 | 10 | 100; porteeFixee?: number } = {}): InstancePont {
  if (!NIVEAUX.includes(niveau)) throw new Error('Niveau inconnu.');
  switch (famille) {
    case 'MAT-PON-01': return creerPont01(niveau, alea, options.longueurFixee);
    case 'MAT-PON-02': return creerPont02(niveau, alea, options.repereFixe, options.pasFixe);
    case 'MAT-PON-03': return creerPont03(niveau, alea, options.porteeFixee);
    default: throw new Error('Famille de pont inconnue.');
  }
}

function copierEtat(etat: EtatManipulationMaths): EtatManipulationMaths {
  return { objets: { ...etat.objets }, placements: { ...etat.placements }, selection: etat.selection, historique: [] };
}

/** Un geste confirmé produit un nouvel état sérialisable. Écouter ne change rien. */
export function appliquerGestePont(instance: InstancePont, etat: EtatManipulationMaths, geste: GesteMaths): EtatManipulationMaths {
  if (geste.type === 'annuler') {
    const precedent = etat.historique.at(-1);
    return precedent ? { ...precedent, historique: etat.historique.slice(0, -1) } : etat;
  }
  if (geste.type === 'ecouter') return etat;
  if (geste.type === 'aide') return etat;
  const avant = copierEtat(etat);
  const objets = { ...etat.objets };
  const placements = { ...etat.placements };
  let selection = etat.selection;
  switch (geste.type) {
    case 'aligner-regle':
      if (instance.famille !== 'MAT-PON-01' || !entierLogique(geste.origine)) return etat;
      if (instance.parametres.segmentsTrajet) {
        if (!instance.parametres.segmentsTrajet.some((p) => p.id === selection)) return etat;
        placements[`regle:${selection}`] = geste.origine;
      } else placements.regle = geste.origine;
      break;
    case 'lire-longueur':
      if (instance.famille !== 'MAT-PON-01' || !entierLogique(geste.valeur)) return etat;
      if (instance.parametres.segmentsTrajet) {
        if (!instance.parametres.segmentsTrajet.some((p) => p.id === selection)) return etat;
        objets[`longueurLue:${selection}`] = geste.valeur;
      } else objets.longueurLue = geste.valeur;
      break;
    case 'choisir':
      if (instance.famille !== 'MAT-PON-01') return etat;
      if (instance.parametres.segmentsTrajet) {
        if (!instance.parametres.segmentsTrajet.some((p) => p.id === geste.objetId)) return etat;
        selection = geste.objetId;
        break;
      }
      if (!instance.parametres.choix.some((p) => p.id === geste.objetId)) return etat;
      selection = geste.objetId;
      placements[geste.objetId] = Object.keys(placements)
        .filter((id) => id !== 'regle')
        .reduce((total, id) => total + (instance.parametres.choix.find((p) => p.id === id)?.longueur ?? 0), 0);
      break;
    case 'placer-borne':
      if (instance.famille !== 'MAT-PON-02' || !entierLogique(geste.valeur) || !entierLogique(geste.position)) return etat;
      placements[`borne:${geste.valeur}`] = geste.position;
      break;
    case 'montrer-encadrement':
      if (instance.famille !== 'MAT-PON-02' || !entierLogique(geste.inferieure) || !entierLogique(geste.superieure)) return etat;
      objets.borneInferieure = geste.inferieure;
      objets.borneSuperieure = geste.superieure;
      break;
    case 'placer-piece':
    case 'placer':
      if (instance.famille !== 'MAT-PON-03' || !entierLogique(geste.position) ||
          !instance.parametres.pieces.some((p) => p.id === geste.objetId)) return etat;
      if (instance.parametres.reparation?.moduleRestantId === geste.objetId ||
          instance.parametres.reparation?.moduleEndommageId === geste.objetId) return etat;
      placements[geste.objetId] = geste.position;
      break;
    case 'retirer':
      if (instance.famille === 'MAT-PON-03' && instance.parametres.reparation?.moduleRestantId === geste.objetId) return etat;
      if (!(geste.objetId in placements)) return etat;
      delete placements[geste.objetId];
      break;
    default: return etat;
  }
  return { objets, placements, selection, historique: [...etat.historique, avant] };
}
export const manipulerPont = appliquerGestePont;

function entierLogique(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isSafeInteger(valeur);
}

/** Oracle distinct du générateur : ne lit jamais solutionTemoin. */
export function validerPont(instance: InstancePont, etat: EtatManipulationMaths): ValidationMaths {
  if (instance.famille === 'MAT-PON-01') {
    if (instance.parametres.segmentsTrajet) {
      const segments = instance.parametres.segmentsTrajet;
      const touches = segments.filter((p) => etat.placements[`regle:${p.id}`] !== undefined &&
        etat.objets[`longueurLue:${p.id}`] !== undefined);
      if (touches.length < 2) return { statut: 'incomplete', raison: 'Mesure les deux morceaux du chemin.' };
      if (Object.keys(etat.placements).length !== 2 || Object.keys(etat.objets).length !== 2 ||
          segments.some((p) => etat.placements[`regle:${p.id}`] !== p.origine ||
            etat.objets[`longueurLue:${p.id}`] !== p.longueur)) {
        return { statut: 'incorrecte', raison: 'Le zéro ou la longueur d’un morceau ne correspond pas.' };
      }
      return { statut: 'correcte', solution: { longueursCm: segments.map((p) => p.longueur),
        totalCm: segments[0].longueur + segments[1].longueur } };
    }
    const { origineCible, longueurCible, choix, nombrePlanches } = instance.parametres;
    const choisis = Object.keys(etat.placements).filter((id) => id !== 'regle');
    if (etat.placements.regle === undefined || etat.objets.longueurLue === undefined || choisis.length < nombrePlanches) {
      return { statut: 'incomplete', raison: 'Aligne la règle, lis la longueur et choisis les planches.' };
    }
    const pieces = choisis.map((id) => choix.find((p) => p.id === id));
    const total = pieces.reduce((s, p) => s + (p?.longueur ?? 0), 0);
    const segments = choisis.map((id) => ({ debut: etat.placements[id], piece: choix.find((p) => p.id === id) }))
      .sort((a, b) => Number(a.debut) - Number(b.debut));
    let bout = 0;
    const joints = segments.every(({ debut, piece }) => {
      if (debut !== bout || piece === undefined) return false;
      bout += piece.longueur;
      return true;
    });
    if (etat.placements.regle !== origineCible || etat.objets.longueurLue !== longueurCible ||
        choisis.length !== nombrePlanches || pieces.some((p) => p === undefined) || !joints || total !== longueurCible) {
      return { statut: 'incorrecte', raison: 'La mesure ou la portée des planches ne rejoint pas la rive.', ecart: total - longueurCible };
    }
    return { statut: 'correcte', solution: { longueurCm: longueurCible, planches: choisis } };
  }
  if (instance.famille === 'MAT-PON-02') {
    const { graduations, bornesAPoser, encadrement } = instance.parametres;
    const entrees = Object.entries(etat.placements);
    if (entrees.length < bornesAPoser.length) return { statut: 'incomplete', raison: 'Place les bornes demandées.' };
    if (entrees.length !== bornesAPoser.length || entrees.some(([id, position]) => {
      const valeur = Number(id.slice('borne:'.length));
      return !id.startsWith('borne:') || !bornesAPoser.includes(valeur) || !graduations.includes(valeur) || !entierLogique(position) || position !== valeur;
    })) return { statut: 'incorrecte', raison: 'Une borne ne correspond pas à sa graduation.' };
    if (instance.niveau === 'defi') {
      if (etat.objets.borneInferieure === undefined || etat.objets.borneSuperieure === undefined) {
        return { statut: 'incomplete', raison: 'Montre les deux repères autour de la borne.' };
      }
      if (etat.objets.borneInferieure !== encadrement.inferieure ||
          etat.objets.borneSuperieure !== encadrement.superieure) {
        return { statut: 'incorrecte', raison: 'Ces repères n’encadrent pas la borne demandée.' };
      }
    }
    return { statut: 'correcte', solution: { bornes: [...bornesAPoser] } };
  }
  const { portee, pieces, nombrePiecesMinimum, reparation } = instance.parametres;
  const entrees = Object.entries(etat.placements);
  if (reparation && reparation.moduleEndommageId in etat.placements) {
    return { statut: 'incomplete', raison: 'Retire le module abîmé avant de réparer le pont.' };
  }
  if (entrees.length === 0) return { statut: 'incomplete', raison: 'Pose au moins un module.' };
  if (reparation && entrees.length < nombrePiecesMinimum &&
      entrees.every(([id, position]) => pieces.some((piece) => piece.id === id) && entierLogique(position)) &&
      etat.placements[reparation.moduleRestantId] === 0) {
    return { statut: 'incomplete', raison: 'Ajoute deux modules dans le trou du pont.' };
  }
  const segments = entrees.map(([id, debut]) => ({ piece: pieces.find((p) => p.id === id), debut }));
  if (segments.length < nombrePiecesMinimum || segments.some(({ piece, debut }) => piece === undefined || !entierLogique(debut)) ||
      (reparation && (etat.placements[reparation.moduleRestantId] !== 0 || segments.length !== 3))) {
    return { statut: 'incorrecte', raison: 'Le tablier ne possède pas les bons modules.' };
  }
  segments.sort((a, b) => (a.debut as number) - (b.debut as number));
  let bout = 0;
  for (const { piece, debut } of segments) {
    if (debut !== bout) return { statut: 'incorrecte', raison: 'Les modules ont un trou ou un chevauchement.' };
    bout += piece!.longueur;
  }
  if (bout !== portee) return { statut: 'incorrecte', raison: 'Le tablier ne rejoint pas l’autre rive.', ecart: bout - portee };
  return { statut: 'correcte', solution: { longueurCm: bout, modules: segments.map((s) => s.piece!.id) } };
}

/** Gobi désigne un prochain geste ; seule l'action de l'enfant modifiera l'état. */
export function prochainGestePont(instance: InstancePont, etat: EtatManipulationMaths): GesteMaths | null {
  if (validerPont(instance, etat).statut === 'correcte') return null;
  if (instance.famille === 'MAT-PON-03' && instance.parametres.reparation &&
      instance.parametres.reparation.moduleEndommageId in etat.placements) {
    return { type: 'retirer', objetId: instance.parametres.reparation.moduleEndommageId };
  }
  const temoin = temoinsPont(instance)[0];
  if (!temoin) return null;
  if (instance.famille === 'MAT-PON-01') {
    if (instance.parametres.segmentsTrajet) {
      for (const morceau of instance.parametres.segmentsTrajet) {
        if (etat.selection !== morceau.id && (etat.placements[`regle:${morceau.id}`] !== morceau.origine ||
            etat.objets[`longueurLue:${morceau.id}`] !== morceau.longueur)) {
          return { type: 'choisir', objetId: morceau.id };
        }
        if (etat.placements[`regle:${morceau.id}`] !== morceau.origine) {
          return { type: 'aligner-regle', origine: morceau.origine };
        }
        if (etat.objets[`longueurLue:${morceau.id}`] !== morceau.longueur) {
          return { type: 'lire-longueur', valeur: morceau.longueur };
        }
      }
      return null;
    }
    const { origineCible, longueurCible } = instance.parametres;
    if (etat.placements.regle !== origineCible) return { type: 'aligner-regle', origine: origineCible };
    if (etat.objets.longueurLue !== longueurCible) return { type: 'lire-longueur', valeur: longueurCible };
    const mauvais = Object.keys(etat.placements).find((id) => id !== 'regle' && etat.placements[id] !== temoin.placements[id]);
    if (mauvais) return { type: 'retirer', objetId: mauvais };
    const manquant = Object.keys(temoin.placements).find((id) => id !== 'regle' && etat.placements[id] === undefined);
    return manquant ? { type: 'choisir', objetId: manquant } : null;
  }
  if (instance.famille === 'MAT-PON-02') {
    const mauvais = Object.keys(etat.placements).find((id) => etat.placements[id] !== temoin.placements[id]);
    if (mauvais) return { type: 'retirer', objetId: mauvais };
    const manquant = instance.parametres.bornesAPoser.find((v) => etat.placements[`borne:${v}`] === undefined);
    if (manquant !== undefined) return { type: 'placer-borne', valeur: manquant, position: manquant };
    if (instance.niveau === 'defi' &&
        (etat.objets.borneInferieure !== instance.parametres.encadrement.inferieure ||
         etat.objets.borneSuperieure !== instance.parametres.encadrement.superieure)) {
      return { type: 'montrer-encadrement', ...instance.parametres.encadrement };
    }
    return null;
  }
  const mauvais = Object.keys(etat.placements).find((id) => etat.placements[id] !== temoin.placements[id]);
  if (mauvais) return { type: 'retirer', objetId: mauvais };
  const manquant = Object.keys(temoin.placements).find((id) => etat.placements[id] === undefined);
  return manquant ? { type: 'placer-piece', objetId: manquant, position: temoin.placements[manquant] as number } : null;
}

export function proposerAidePont(instance: InstancePont, erreursValidees: number, aideCourante: AideMaths,
  etat?: EtatManipulationMaths): { niveau: AideMaths; consigne: ConsigneMaths | null; gestePropose: GesteMaths | null } {
  const niveau: AideMaths = aideCourante === 'demonstration' || erreursValidees >= 3 ? 'demonstration'
    : aideCourante === 'indice' || erreursValidees >= 2 ? 'indice' : 'aucune';
  return {
    niveau, consigne: niveau === 'aucune' ? null : instance.aide[niveau],
    gestePropose: niveau === 'demonstration' && etat ? prochainGestePont(instance, etat) : null,
  };
}

/** Historique persistant fourni par l'appelant, limité aux cinq dernières signatures. */
export function choisirPontSansRepetition(famille: FamillePont, niveau: NiveauMaths, alea: Alea, signaturesRecentes: readonly string[]): {
  readonly instance: InstancePont; readonly signaturesRecentes: readonly string[]; readonly repetitionInevitable: boolean;
} {
  const recentes = signaturesRecentes.slice(-5);
  let candidat: InstancePont | undefined;
  for (let essai = 0; essai < 12; essai += 1) {
    const graine = alea.entier(0, 0x1_0000_0000);
    const instance = genererPont(famille, niveau, creerAlea(graine));
    candidat = instance;
    if (!recentes.includes(instance.signature)) break;
  }
  if (!candidat) throw new Error('Sélection sans candidat.');
  return { instance: candidat, signaturesRecentes: [...recentes, candidat.signature].slice(-5), repetitionInevitable: recentes.includes(candidat.signature) };
}

export function creerProjetPremiereTraversee(
  choix: NiveauMaths | readonly [NiveauMaths, NiveauMaths, NiveauMaths], alea: Alea, sessionId: string,
): ProjetPremiereTraversee {
  if (typeof sessionId !== 'string' || sessionId.trim() === '') throw new Error('Session de projet manquante.');
  const niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths] = typeof choix === 'string'
    ? [choix, choix, choix] : choix;
  if (!COMBINAISONS_PON_P01.some((c) => c.every((v, i) => v === niveaux[i]))) {
    throw new Error('Combinaison de niveaux incompatible pour la première traversée.');
  }
  const [n01, n03, n02] = niveaux;
  const min = Math.max(BORNES_01[n01][0], BORNES_03[n03][0]);
  const max = Math.min(BORNES_01[n01][1], BORNES_03[n03][1]);
  const porteeCm = entier(alea, min, max);
  const a = creerPont01(n01, alea, porteeCm);
  const b = creerPont03(n03, alea, porteeCm);
  const c = creerPont02(n02, alea);
  const reperePont = c.parametres.reperePont;
  const plan: readonly [EtapeProjetMaths, EtapeProjetMaths, EtapeProjetMaths] = [
    { rang: 0, famille: a.famille, niveau: n01, instanceId: `${sessionId}:0` },
    { rang: 1, famille: b.famille, niveau: n03, instanceId: `${sessionId}:1` },
    { rang: 2, famille: c.famille, niveau: n02, instanceId: `${sessionId}:2` },
  ];
  const variables = { porteeCm, reperePont };
  const transformationId = 'ponts-premiere-traversee';
  const cadeauId = 'maths-souvenir-ponts';
  const cadeauType = 'souvenir' as const;
  const contexte = (etape: number) => ({
    sessionId, projetId: 'MAT-PON-P01' as const, versionProjet: 1, etape,
    variables, plan, transformationId, cadeauId, cadeauType,
  });
  return {
    id: 'MAT-PON-P01', sessionId, version: 1,
    niveau: n01 === n03 && n03 === n02 ? n01 : null,
    niveaux, variables, plan, transformationId, cadeauId, cadeauType,
    etapes: [
      { ...a, id: plan[0].instanceId, projet: contexte(0) },
      { ...b, id: plan[1].instanceId, projet: contexte(1) },
      { ...c, id: plan[2].instanceId, projet: contexte(2) },
    ],
  };
}
