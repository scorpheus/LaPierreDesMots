/** Moulin : groupes de pales, distribution mesure par mesure et vanne du même réservoir. */
import type { Alea } from '../../../alea.js';
import type { AideMaths, ContexteProjetMaths, EtatManipulationMaths, EtapeProjetMaths, GesteMaths,
  InstanceMathsBase, NiveauMaths, ValidationMaths } from '../../types.js';

export type FamilleMoulin = 'MAT-MOU-01' | 'MAT-MOU-02' | 'MAT-MOU-03';
export type ProjetMoulinId = 'MAT-MOU-P01' | 'MAT-MOU-P02' | 'MAT-MOU-P03';
export interface Montage { readonly roues: number; readonly pales: number }
export type InstanceRoues = InstanceMathsBase<'MAT-MOU-01', {
  readonly premier: Montage; readonly secondRequis: boolean; readonly total: number;
}, readonly string[]>;
export type InstanceSacs = InstanceMathsBase<'MAT-MOU-02', {
  readonly total: number; readonly sacs: number; readonly autreNombreDeSacs: number | null;
  readonly mesuresParSac: number; readonly resteAnnonce: number; readonly nombreSacsInconnu: boolean;
}, readonly string[]>;
export type InstanceVanne = InstanceMathsBase<'MAT-MOU-03', {
  readonly denominateur: number; readonly numerateur: number; readonly initial: number;
  readonly autreDenominateur: number | null;
  readonly representation?: 'bande' | 'disque';
}, readonly string[]>;
export type InstanceMoulin = InstanceRoues | InstanceSacs | InstanceVanne;
export interface OptionsMoulin {
  readonly premier?: Montage; readonly second?: Montage | null; readonly total?: number;
  readonly sacs?: number; readonly autreNombreDeSacs?: number | null; readonly resteAnnonce?: number;
  readonly nombreSacsInconnu?: boolean;
  readonly denominateur?: number; readonly numerateur?: number; readonly initial?: number;
}
export interface ProjetMoulin {
  readonly projet: {
    readonly id: ProjetMoulinId; readonly sessionId: string; readonly version: 1;
    readonly niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths];
    readonly variables: Readonly<Record<string, number>>;
    readonly plan: readonly [EtapeProjetMaths, EtapeProjetMaths, EtapeProjetMaths];
    readonly transformationId: string; readonly cadeauId: string | null;
    readonly cadeauType: 'souvenir' | 'objet' | null;
  };
  readonly instances: readonly [InstanceMoulin, InstanceMoulin, InstanceMoulin];
  readonly etapes: readonly [InstanceMoulin, InstanceMoulin, InstanceMoulin];
}
const VIDE: EtatManipulationMaths = { objets: {}, placements: {}, selection: null, historique: [] };
const NIVEAUX: readonly NiveauMaths[] = ['decouverte', 'exploration', 'defi'];
const DENOMINATEURS: Readonly<Record<NiveauMaths, readonly number[]>> = {
  decouverte: [2, 4], exploration: [3, 5, 6], defi: [6, 8, 10],
};
const entier = (alea: Alea, min: number, max: number) => alea.entier(min, max + 1);
const nombre = (etat: EtatManipulationMaths, cle: string): number => {
  const n = etat.objets[cle]; return typeof n === 'number' && Number.isSafeInteger(n) ? n : 0;
};
const consigne = (texte: string) => ({ texte, segments: [] as const });
function base<F extends FamilleMoulin, P, S>(famille: F, niveau: NiveauMaths, alea: Alea,
  parametres: P, stock: S, signature: string, texte: string, aide: string): InstanceMathsBase<F, P, S> {
  return { format: 1, id: `${famille.toLowerCase()}-${niveau}-${alea.graine.toString(16)}-${signature.replace(/[^a-z0-9]/giu, '-')}`,
    famille, niveau, modeleId: `${famille.toLowerCase()}-v1`, versionModele: 1, versionGenerateur: 1,
    graine: alea.graine, signature, parametres, stock, etatInitial: VIDE, consigne: consigne(texte), unite: 'objet',
    aide: { indice: consigne(aide), demonstration: consigne('Regarde un groupe, puis essaie toi-même.') },
    reglesValidation: { version: 1, egaliteExacte: true } };
}
function montageValide(m: Montage, niveau: NiveauMaths): boolean {
  const minRoues = niveau === 'exploration' ? 3 : 2;
  const maxRoues = niveau === 'decouverte' ? 4 : 6;
  const maxPales = niveau === 'decouverte' ? 5 : 8;
  return Number.isSafeInteger(m.roues) && Number.isSafeInteger(m.pales) &&
    m.roues >= minRoues && m.roues <= maxRoues && m.pales >= 2 && m.pales <= maxPales &&
    (niveau !== 'defi' || m.roues * m.pales <= 60);
}
function roues(niveau: NiveauMaths, alea: Alea, options: OptionsMoulin): InstanceRoues {
  const tireRoues = entier(alea, niveau === 'exploration' ? 3 : 2, niveau === 'decouverte' ? 4 : 6);
  const tirePales = entier(alea, 2, niveau === 'decouverte' ? 5 : niveau === 'defi' ? 6 : 8);
  const premier = options.premier ?? { roues: tireRoues,
    pales: niveau === 'defi' && tireRoues === tirePales ? (tirePales === 6 ? 5 : tirePales + 1) : tirePales };
  const total = premier.roues * premier.pales;
  const second = options.second === undefined && niveau === 'defi'
    ? { roues: premier.pales, pales: premier.roues } : options.second ?? null;
  if (!montageValide(premier, niveau) || (second !== null && (!montageValide(second, niveau) ||
      second.roues * second.pales !== total ||
      (second.roues === premier.roues && second.pales === premier.pales)))) {
    throw new Error('Montages de roues incompatibles avec le niveau ou le total.');
  }
  const parametres = { premier, secondRequis: second !== null, total };
  const i = base('MAT-MOU-01', niveau, alea, parametres,
    ['roues', 'pales'] as const, `roues:${premier.roues}x${premier.pales}:${second !== null ? 'autre' : 'simple'}`,
    second === null ? `Monte ${premier.roues} roues avec ${premier.pales} pales sur chaque roue.` :
      `Monte ${premier.roues} roues de ${premier.pales} pales, puis un autre montage avec autant de pales.`,
    'Compte les pales d’une roue, puis les roues. Chaque roue du montage doit être identique.');
  return { ...i, etatInitial: { ...VIDE, objets: { 'roues:a': 0, 'roues:b': 0 } } };
}
function sacs(niveau: NiveauMaths, alea: Alea, options: OptionsMoulin): InstanceSacs {
  const nombreSacs = options.sacs ?? (niveau === 'defi' ? alea.choisir([2, 3, 4, 6]) :
    entier(alea, 2, niveau === 'decouverte' ? 4 : 6));
  const mesures = options.total ?? (niveau === 'defi' ? 12 * entier(alea, 1, 5) :
    nombreSacs * entier(alea, 2, niveau === 'decouverte' ? 5 : Math.floor(40 / nombreSacs)));
  const resteAnnonce = options.resteAnnonce ?? 0;
  const autre = options.autreNombreDeSacs === undefined && niveau === 'defi'
    ? [2, 3, 4, 5, 6].find((n) => n !== nombreSacs && mesures % n === 0) ?? null
    : options.autreNombreDeSacs ?? null;
  const nombreSacsInconnu = options.nombreSacsInconnu ?? (niveau === 'exploration' && entier(alea, 0, 1) === 1);
  const maximum = niveau === 'decouverte' ? 20 : niveau === 'exploration' ? 40 : 60;
  if (!Number.isSafeInteger(nombreSacs) || nombreSacs < 2 || nombreSacs > (niveau === 'decouverte' ? 4 : 6) ||
      !Number.isSafeInteger(mesures) || mesures < 4 || mesures > maximum ||
      !Number.isSafeInteger(resteAnnonce) || resteAnnonce < 0 || resteAnnonce >= nombreSacs ||
      (resteAnnonce !== 0 && niveau !== 'defi') || (mesures - resteAnnonce) % nombreSacs !== 0 ||
      (niveau === 'defi' && autre === null && resteAnnonce === 0) ||
      (nombreSacsInconnu && (niveau !== 'exploration' || autre !== null || resteAnnonce !== 0)) ||
      (autre !== null && (!Number.isSafeInteger(autre) || autre < 2 || autre > 6 ||
        autre === nombreSacs || mesures % autre !== 0 || resteAnnonce !== 0))) {
    throw new Error('Répartition de farine incompatible avec ce niveau.');
  }
  const parametres = { total: mesures, sacs: nombreSacs, autreNombreDeSacs: autre,
    mesuresParSac: (mesures - resteAnnonce) / nombreSacs, resteAnnonce, nombreSacsInconnu };
  const i = base('MAT-MOU-02', niveau, alea, parametres,
    Array.from({ length: mesures }, (_, j) => `mesure-${j}`),
    `sacs:${mesures}:${nombreSacs}:${autre ?? 0}:${resteAnnonce}`,
    nombreSacsInconnu ? `Tu as ${mesures} mesures. Mets ${parametres.mesuresParSac} mesures dans chaque sac. Combien de sacs te faut-il ?` :
      autre === null ? `Partage ${mesures} mesures entre ${nombreSacs} sacs, une mesure à la fois${resteAnnonce ? ` ; garde ${resteAnnonce} mesure au stock` : ''}.` :
      `Partage ${mesures} mesures entre ${nombreSacs} sacs, puis essaie ${autre} sacs avec le même stock.`,
    'Verse une mesure dans chaque sac à tour de rôle. Tu peux reprendre une mesure.');
  return { ...i, etatInitial: { ...VIDE, objets: { 'stock:a': mesures, 'stock:b': mesures,
    'nombreSacs:a': nombreSacsInconnu ? 0 : nombreSacs, 'nombreSacs:b': autre ?? 0 } } };
}
function vanne(niveau: NiveauMaths, alea: Alea, options: OptionsMoulin): InstanceVanne {
  const denominateur = options.denominateur ?? alea.choisir(DENOMINATEURS[niveau]);
  const numerateur = options.numerateur ?? (niveau === 'defi'
    ? 2 * entier(alea, 1, Math.floor((denominateur - 1) / 2))
    : entier(alea, 1, denominateur - 1));
  const initial = options.initial ?? (niveau === 'decouverte' ? 0 : Math.max(0, numerateur - 1));
  const autreDenominateur = niveau === 'defi' ? denominateur / 2 : null;
  const autreNumerateur = niveau === 'defi' ? numerateur / 2 : null;
  if (!DENOMINATEURS[niveau].includes(denominateur) || !Number.isSafeInteger(numerateur) ||
      numerateur < 1 || numerateur > denominateur || !Number.isSafeInteger(initial) ||
      initial < 0 || initial > denominateur ||
      (niveau === 'defi' && !Number.isInteger(autreNumerateur))) {
    throw new Error('Réglage de vanne incompatible avec ce niveau.');
  }
  const parametres = { denominateur, numerateur, initial, autreDenominateur, representation: alea.choisir(['bande', 'disque'] as const) };
  const i = base('MAT-MOU-03', niveau, alea, parametres,
    Array.from({ length: denominateur }, (_, j) => `secteur-${j}`),
    `vanne:${numerateur}/${denominateur}:${initial}`,
    `Règle la vanne sur ${numerateur} part${numerateur > 1 ? 's' : ''} sur ${denominateur} du même réservoir.`,
    'Les parts doivent être de même taille. Ajoute ou retire une part pour laisser passer plus ou moins d’eau.');
  return { ...i, versionGenerateur: 2, etatInitial: { ...VIDE, objets: { secteursA: initial, secteursB: 0 } } };
}
export function genererMoulin(famille: FamilleMoulin, niveau: NiveauMaths, alea: Alea,
  options: OptionsMoulin = {}): InstanceMoulin {
  if (!NIVEAUX.includes(niveau)) throw new Error('Niveau du moulin inconnu.');
  switch (famille) {
    case 'MAT-MOU-01': return roues(niveau, alea, options);
    case 'MAT-MOU-02': return sacs(niveau, alea, options);
    case 'MAT-MOU-03': return vanne(niveau, alea, options);
    default: throw new Error('Famille du moulin inconnue.');
  }
}
function enregistrer(etat: EtatManipulationMaths, objets: EtatManipulationMaths['objets']): EtatManipulationMaths {
  return { ...etat, objets, historique: [...etat.historique,
    { objets: etat.objets, placements: etat.placements, selection: etat.selection, historique: [] }] };
}
export function appliquerGesteMoulin(instance: InstanceMoulin, etat: EtatManipulationMaths,
  geste: GesteMaths): EtatManipulationMaths {
  if (geste.type === 'annuler') {
    const avant = etat.historique.at(-1);
    return avant === undefined ? etat : { ...avant, historique: etat.historique.slice(0, -1) };
  }
  if (geste.type === 'aide' || geste.type === 'ecouter') return etat;
  if (instance.famille === 'MAT-MOU-01') {
    if (geste.type === 'choisir' && /^roue:[ab]$/u.test(geste.objetId)) {
      const cote = geste.objetId.at(-1)!;
      if (cote === 'b' && !instance.parametres.secondRequis) return etat;
      const limiteRoues = cote === 'a' ? instance.parametres.premier.roues : 6;
      if (nombre(etat, `roues:${cote}`) >= limiteRoues) return etat;
      return enregistrer(etat, { ...etat.objets, [`roues:${cote}`]: nombre(etat, `roues:${cote}`) + 1 });
    }
    if ((geste.type === 'placer' || geste.type === 'retirer') && /^pale:[ab]:\d+$/u.test(geste.objetId)) {
      const [, cote, indexBrut] = geste.objetId.split(':');
      const index = Number(indexBrut);
      if ((cote === 'b' && !instance.parametres.secondRequis) || index >= nombre(etat, `roues:${cote}`)) return etat;
      const cle = geste.objetId, suivant = nombre(etat, cle) + (geste.type === 'placer' ? 1 : -1);
      if (suivant < 0 || suivant > (cote === 'a' ? instance.parametres.premier.pales : 8)) return etat;
      return enregistrer(etat, { ...etat.objets, [cle]: suivant });
    }
    if (geste.type === 'retirer' && /^roue:[ab]$/u.test(geste.objetId)) {
      const cote = geste.objetId.at(-1)!, r = nombre(etat, `roues:${cote}`);
      if (r === 0) return etat;
      return enregistrer(etat, { ...etat.objets, [`roues:${cote}`]: r - 1, [`pale:${cote}:${r - 1}`]: 0 });
    }
    return etat;
  }
  if (instance.famille === 'MAT-MOU-02') {
    if (instance.parametres.nombreSacsInconnu && geste.type === 'choisir' && geste.objetId === 'ajouter-sac') {
      const n = nombre(etat, 'nombreSacs:a');
      return n >= 6 ? etat : enregistrer(etat, { ...etat.objets, 'nombreSacs:a': n + 1 });
    }
    if (instance.parametres.nombreSacsInconnu && geste.type === 'retirer' && geste.objetId === 'dernier-sac') {
      const n = nombre(etat, 'nombreSacs:a');
      return n === 0 || nombre(etat, `sac:a:${n - 1}`) !== 0 ? etat :
        enregistrer(etat, { ...etat.objets, 'nombreSacs:a': n - 1 });
    }
    if ((geste.type !== 'placer' && geste.type !== 'retirer') || !/^sac:[ab]:\d+$/u.test(geste.objetId)) return etat;
    const [, cote, indexBrut] = geste.objetId.split(':');
    const maxSacs = cote === 'a' ? (instance.parametres.nombreSacsInconnu ? 6 : instance.parametres.sacs) :
      instance.parametres.autreNombreDeSacs;
    const index = Number(indexBrut);
    if (maxSacs === null || index >= maxSacs ||
        (cote === 'a' && index >= nombre(etat, 'nombreSacs:a'))) return etat;
    const cle = geste.objetId, delta = geste.type === 'placer' ? 1 : -1;
    const suivant = nombre(etat, cle) + delta, stock = nombre(etat, `stock:${cote}`) - delta;
    if (suivant < 0 || stock < 0 || stock > instance.parametres.total) return etat;
    return enregistrer(etat, { ...etat.objets, [cle]: suivant, [`stock:${cote}`]: stock });
  }
  if ((geste.type !== 'placer' && geste.type !== 'retirer') ||
      !['secteur-a', 'secteur-b'].includes(geste.objetId)) return etat;
  const cle = geste.objetId === 'secteur-a' ? 'secteursA' : 'secteursB';
  const limite = cle === 'secteursA' ? instance.parametres.denominateur : instance.parametres.autreDenominateur;
  if (limite === null) return etat;
  const suivant = nombre(etat, cle) + (geste.type === 'placer' ? 1 : -1);
  if (suivant < 0 || suivant > limite) return etat;
  return enregistrer(etat, { ...etat.objets, [cle]: suivant });
}
function verifierMontage(etat: EtatManipulationMaths, cote: 'a' | 'b', m: Montage): ValidationMaths | null {
  const r = nombre(etat, `roues:${cote}`);
  if (r < m.roues) return { statut: 'incomplete', raison: 'Il manque une roue.' };
  if (r > m.roues) return { statut: 'incorrecte', raison: 'Il y a trop de roues.' };
  for (let i = 0; i < r; i += 1) {
    const p = nombre(etat, `pale:${cote}:${i}`);
    if (p < m.pales) return { statut: 'incomplete', raison: 'Une roue attend encore des pales.' };
    if (p > m.pales) return { statut: 'incorrecte', raison: 'Une roue a trop de pales.' };
  }
  return null;
}
export function validerMoulin(instance: InstanceMoulin, etat: EtatManipulationMaths): ValidationMaths {
  if (instance.famille === 'MAT-MOU-01') {
    const p = instance.parametres, premier = verifierMontage(etat, 'a', p.premier);
    if (premier !== null) return premier;
    if (p.secondRequis) {
      const r = nombre(etat, 'roues:b');
      if (r < 2) return { statut: 'incomplete', raison: 'Il faut monter une autre organisation des roues.' };
      const pales = nombre(etat, 'pale:b:0');
      if (pales < 2) return { statut: 'incomplete', raison: 'La première roue attend des pales.' };
      for (let i = 1; i < r; i += 1) {
        const ici = nombre(etat, `pale:b:${i}`);
        if (ici < pales) return { statut: 'incomplete', raison: 'Chaque roue doit recevoir autant de pales.' };
        if (ici > pales) return { statut: 'incorrecte', raison: 'Les roues n’ont pas toutes le même nombre de pales.' };
      }
      if (r === p.premier.roues && pales === p.premier.pales) {
        return { statut: 'incorrecte', raison: 'Le second montage doit changer les groupes.' };
      }
      if (r * pales !== p.total) return { statut: 'incorrecte', raison: 'Les deux montages n’ont pas autant de pales.' };
    }
    return { statut: 'correcte', solution: { total: p.total, premier: p.premier,
      second: p.secondRequis ? { roues: nombre(etat, 'roues:b'), pales: nombre(etat, 'pale:b:0') } : null } };
  }
  if (instance.famille === 'MAT-MOU-02') {
    const p = instance.parametres;
    for (const [cote, sacsAttendus, reste] of [['a', p.sacs, p.resteAnnonce],
      ['b', p.autreNombreDeSacs, 0]] as const) {
      if (sacsAttendus === null) continue;
      if (cote === 'a' && p.nombreSacsInconnu && nombre(etat, 'nombreSacs:a') !== sacsAttendus) {
        return { statut: nombre(etat, 'stock:a') > 0 ? 'incomplete' : 'incorrecte',
          raison: 'Le nombre de sacs ne correspond pas à la quantité de mesures.' };
      }
      const attendu = (p.total - reste) / sacsAttendus;
      const stock = nombre(etat, `stock:${cote}`);
      if (stock > reste) return { statut: 'incomplete', raison: 'Il reste des mesures à distribuer.' };
      if (stock < reste) return { statut: 'incorrecte', raison: 'Le reste annoncé n’est pas respecté.' };
      for (let i = 0; i < sacsAttendus; i += 1) {
        const mesure = nombre(etat, `sac:${cote}:${i}`);
        if (mesure !== attendu) return { statut: 'incorrecte', raison: 'Les sacs ne contiennent pas la même quantité.' };
      }
    }
    return { statut: 'correcte', solution: { total: p.total, sacs: p.sacs, mesuresParSac: p.mesuresParSac,
      autreNombreDeSacs: p.autreNombreDeSacs, reste: p.resteAnnonce } };
  }
  const p = instance.parametres, a = nombre(etat, 'secteursA'), b = nombre(etat, 'secteursB');
  const attenduB = p.autreDenominateur === null ? 0 : p.numerateur * p.autreDenominateur / p.denominateur;
  if (a < p.numerateur || (p.autreDenominateur !== null && b < attenduB)) {
    return { statut: 'incomplete', raison: 'Le débit attend encore des secteurs.' };
  }
  if (a !== p.numerateur || (p.autreDenominateur !== null && b * p.denominateur !== a * p.autreDenominateur)) {
    return { statut: 'incorrecte', raison: 'Le débit ne correspond pas au réglage demandé.' };
  }
  return { statut: 'correcte', solution: { numerateur: p.numerateur, denominateur: p.denominateur,
    autreNumerateur: attenduB, autreDenominateur: p.autreDenominateur } };
}
function autreMontage(premier: Montage, total: number): Montage | null {
  return Array.from({ length: 5 }, (_, n) => n + 2)
    .map((roues) => ({ roues, pales: total / roues }))
    .find((m) => Number.isSafeInteger(m.pales) && m.pales >= 2 && m.pales <= 8 &&
      (m.roues !== premier.roues || m.pales !== premier.pales)) ?? null;
}

/** Témoin isolé des composants et jamais consulté par le validateur. */
export function construireTemoinMoulin(instance: InstanceMoulin): EtatManipulationMaths {
  if (instance.famille === 'MAT-MOU-01') {
    const premier = instance.parametres.premier;
    const second = instance.parametres.secondRequis ? autreMontage(premier, instance.parametres.total) : null;
    const o: Record<string, number> = { 'roues:a': premier.roues, 'roues:b': second?.roues ?? 0 };
    for (const [cote, montage] of [['a', premier], ['b', second]] as const) {
      if (montage !== null) for (let i = 0; i < montage.roues; i += 1) o[`pale:${cote}:${i}`] = montage.pales;
    }
    return { ...VIDE, objets: o };
  }
  if (instance.famille === 'MAT-MOU-02') {
    const p = instance.parametres, o: Record<string, number> = { 'stock:a': p.resteAnnonce,
      'stock:b': p.autreNombreDeSacs === null ? p.total : 0,
      'nombreSacs:a': p.sacs, 'nombreSacs:b': p.autreNombreDeSacs ?? 0 };
    for (const [cote, sacsAttendus, restant] of [['a', p.sacs, p.resteAnnonce], ['b', p.autreNombreDeSacs, 0]] as const) {
      if (sacsAttendus !== null) for (let i = 0; i < sacsAttendus; i += 1) o[`sac:${cote}:${i}`] = (p.total - restant) / sacsAttendus;
    }
    return { ...VIDE, objets: o };
  }
  return { ...VIDE, objets: { secteursA: instance.parametres.numerateur,
    secteursB: instance.parametres.autreDenominateur === null ? 0 :
      instance.parametres.numerateur * instance.parametres.autreDenominateur / instance.parametres.denominateur } };
}
function prochainGesteMontage(etat: EtatManipulationMaths, cote: 'a' | 'b', montage: Montage): GesteMaths | null {
  const rouesPosees = nombre(etat, `roues:${cote}`);
  if (rouesPosees > montage.roues) return { type: 'retirer', objetId: `roue:${cote}` };
  if (rouesPosees < montage.roues) return { type: 'choisir', objetId: `roue:${cote}` };
  for (let index = 0; index < montage.roues; index += 1) {
    const cle = `pale:${cote}:${index}`;
    if (nombre(etat, cle) > montage.pales) return { type: 'retirer', objetId: cle };
    if (nombre(etat, cle) < montage.pales) return { type: 'placer', objetId: cle, position: 0 };
  }
  return null;
}

/** Propose un seul geste, calculé depuis l'état durable. La proposition n'est jamais exécutée ici. */
export function prochainGesteMoulin(instance: InstanceMoulin, etat: EtatManipulationMaths): GesteMaths | null {
  if (validerMoulin(instance, etat).statut === 'correcte') return null;
  if (instance.famille === 'MAT-MOU-01') {
    const premier = prochainGesteMontage(etat, 'a', instance.parametres.premier);
    if (premier !== null) return premier;
    const second = instance.parametres.secondRequis ?
      autreMontage(instance.parametres.premier, instance.parametres.total) : null;
    return second === null ? null : prochainGesteMontage(etat, 'b', second);
  }
  if (instance.famille === 'MAT-MOU-02') {
    const p = instance.parametres;
    if (p.nombreSacsInconnu) {
      const sacsPoses = nombre(etat, 'nombreSacs:a');
      if (sacsPoses > p.sacs) {
        const dernier = `sac:a:${sacsPoses - 1}`;
        return nombre(etat, dernier) > 0 ? { type: 'retirer', objetId: dernier } :
          { type: 'retirer', objetId: 'dernier-sac' };
      }
      if (sacsPoses < p.sacs) return { type: 'choisir', objetId: 'ajouter-sac' };
    }
    for (const [cote, sacs, reste] of [['a', p.sacs, p.resteAnnonce],
      ['b', p.autreNombreDeSacs, 0]] as const) {
      if (sacs === null) continue;
      const parSac = (p.total - reste) / sacs;
      for (let index = 0; index < sacs; index += 1) {
        const cle = `sac:${cote}:${index}`;
        if (nombre(etat, cle) > parSac) return { type: 'retirer', objetId: cle };
      }
      for (let index = 0; index < sacs; index += 1) {
        const cle = `sac:${cote}:${index}`;
        if (nombre(etat, cle) < parSac && nombre(etat, `stock:${cote}`) > 0) {
          return { type: 'placer', objetId: cle, position: 0 };
        }
      }
    }
    return null;
  }
  const p = instance.parametres;
  const autre = p.autreDenominateur === null ? 0 : p.numerateur * p.autreDenominateur / p.denominateur;
  for (const [cle, id, objectif] of [['secteursA', 'secteur-a', p.numerateur],
    ['secteursB', 'secteur-b', autre]] as const) {
    if (nombre(etat, cle) > objectif) return { type: 'retirer', objetId: id };
    if (nombre(etat, cle) < objectif) return { type: 'placer', objetId: id, position: 0 };
  }
  return null;
}

export function proposerAideMoulin(instance: InstanceMoulin, _erreurs: number, aide: AideMaths,
  etat: EtatManipulationMaths = instance.etatInitial): { niveau: AideMaths; consigne: InstanceMoulin['consigne'] | null; gestePropose: GesteMaths | null } {
  return { niveau: aide, consigne: aide === 'aucune' ? null : instance.aide[aide],
    gestePropose: aide === 'demonstration' ? prochainGesteMoulin(instance, etat) : null };
}
export function estInstanceMoulin(brut: unknown): brut is InstanceMoulin {
  if (typeof brut !== 'object' || brut === null) return false;
  const v = brut as Record<string, unknown>;
  if (!(v.format === 1 && v.versionModele === 1 && (v.versionGenerateur === 1 || (v.famille === 'MAT-MOU-03' && v.versionGenerateur === 2)) &&
    typeof v.id === 'string' && v.id.length > 0 &&
    ['MAT-MOU-01', 'MAT-MOU-02', 'MAT-MOU-03'].includes(String(v.famille)) &&
    NIVEAUX.includes(v.niveau as NiveauMaths) && typeof v.parametres === 'object' &&
    v.parametres !== null && typeof v.etatInitial === 'object' && v.etatInitial !== null)) return false;
  const p = v.parametres as Record<string, unknown>;
  const entierValide = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n);
  const estMontage = (m: unknown): m is Montage => typeof m === 'object' && m !== null &&
    entierValide((m as Montage).roues) && entierValide((m as Montage).pales);
  if (v.famille === 'MAT-MOU-01') return estMontage(p.premier) &&
    typeof p.secondRequis === 'boolean' && entierValide(p.total);
  if (v.famille === 'MAT-MOU-02') return entierValide(p.total) && entierValide(p.sacs) &&
    (p.autreNombreDeSacs === null || entierValide(p.autreNombreDeSacs)) &&
    entierValide(p.mesuresParSac) && entierValide(p.resteAnnonce) && typeof p.nombreSacsInconnu === 'boolean';
  return (p.representation === undefined || p.representation === 'bande' || p.representation === 'disque') &&
    entierValide(p.denominateur) && DENOMINATEURS[v.niveau as NiveauMaths].includes(p.denominateur as number) &&
    entierValide(p.numerateur) && entierValide(p.initial) &&
    (p.autreDenominateur === null || entierValide(p.autreDenominateur));
}
export function verifierCombinaisonMoulin(_id: ProjetMoulinId,
  niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths]): string | null {
  return niveaux.every((niveau) => NIVEAUX.includes(niveau)) ? null : 'Niveau du moulin inconnu.';
}
function demiDenominateur(niveau: NiveauMaths): number {
  return niveau === 'decouverte' ? 2 : niveau === 'exploration' ? 6 : 8;
}
export function creerProjetMoulin(id: ProjetMoulinId,
  niveaux: readonly [NiveauMaths, NiveauMaths, NiveauMaths], alea: Alea, sessionId: string): ProjetMoulin {
  if (!['MAT-MOU-P01', 'MAT-MOU-P02', 'MAT-MOU-P03'].includes(id) || !sessionId.trim()) {
    throw new Error('Projet Moulin ou session inconnus.');
  }
  const incompatibilite = verifierCombinaisonMoulin(id, niveaux);
  if (incompatibilite !== null) throw new Error(incompatibilite);
  let instances: readonly [InstanceMoulin, InstanceMoulin, InstanceMoulin];
  let variables: Record<string, number>;
  if (id === 'MAT-MOU-P01') {
    const d = demiDenominateur(niveaux[1]);
    instances = [genererMoulin('MAT-MOU-01', niveaux[0], alea, { premier: { roues: 4, pales: 3 }, second: null }),
      genererMoulin('MAT-MOU-03', niveaux[1], alea, { denominateur: d, numerateur: d / 2 }),
      genererMoulin('MAT-MOU-02', niveaux[2], alea, { total: 12, sacs: 3, nombreSacsInconnu: false })];
    variables = { nombrePales: 12, pales: 12, debitNumerateur: d / 2,
      debitDenominateur: d, production: 12, farine: 12, sacs: 3 };
  } else if (id === 'MAT-MOU-P02') {
    instances = [genererMoulin('MAT-MOU-01', niveaux[0], alea, { premier: { roues: 4, pales: 3 }, second: null }),
      genererMoulin('MAT-MOU-01', niveaux[1], alea, { premier: { roues: 3, pales: 4 }, second: null }),
      genererMoulin('MAT-MOU-02', niveaux[2], alea, { total: 12, sacs: 3, nombreSacsInconnu: false })];
    variables = { premierRoues: 4, premierPales: 3, autresRoues: 3, autresPales: 4,
      totalPales: 12, mesuresProduites: 12, total: 12 };
  } else {
    const d = demiDenominateur(niveaux[0]);
    instances = [genererMoulin('MAT-MOU-03', niveaux[0], alea, { denominateur: d, numerateur: d / 2 }),
      genererMoulin('MAT-MOU-02', niveaux[1], alea, { total: 12, sacs: 3, nombreSacsInconnu: false }),
      genererMoulin('MAT-MOU-01', niveaux[2], alea, { premier: { roues: 4, pales: 3 },
        second: niveaux[2] === 'defi' ? { roues: 3, pales: 4 } : null })];
    variables = { debit: d / 2, debitNumerateur: d / 2, debitDenominateur: d,
      production: 12, sacs: 3,
      roues: 4, palesParRoue: 3 };
  }
  const familles: readonly [FamilleMoulin, FamilleMoulin, FamilleMoulin] = id === 'MAT-MOU-P01'
    ? ['MAT-MOU-01', 'MAT-MOU-03', 'MAT-MOU-02'] : id === 'MAT-MOU-P02'
      ? ['MAT-MOU-01', 'MAT-MOU-01', 'MAT-MOU-02'] : ['MAT-MOU-03', 'MAT-MOU-02', 'MAT-MOU-01'];
  const plan = familles.map((famille, rang) => ({ rang, famille, niveau: niveaux[rang]!,
    instanceId: `${sessionId}:${rang}` })) as unknown as readonly [EtapeProjetMaths, EtapeProjetMaths, EtapeProjetMaths];
  const transformationId = id === 'MAT-MOU-P01' ? 'moulin-roue-tourne' :
    id === 'MAT-MOU-P02' ? 'moulin-sacs-livres' : 'moulin-reserve-remplie';
  const cadeauId = id === 'MAT-MOU-P01' ? 'maths-souvenir-moulin' :
    id === 'MAT-MOU-P02' ? null : 'maths-objet-moulin';
  const cadeauType: 'souvenir' | 'objet' | null = id === 'MAT-MOU-P01' ? 'souvenir' :
    id === 'MAT-MOU-P02' ? null : 'objet';
  const contexte = (etape: number): ContexteProjetMaths => ({ sessionId, projetId: id,
    versionProjet: 1, etape, variables, plan, transformationId, cadeauId, cadeauType });
  const etapes = instances.map((instance, rang) => ({ ...instance, id: plan[rang]!.instanceId,
    projet: contexte(rang) })) as unknown as readonly [InstanceMoulin, InstanceMoulin, InstanceMoulin];
  const projet = { id, sessionId, version: 1 as const, niveaux, variables, plan, transformationId,
    cadeauId, cadeauType };
  return { projet, instances: etapes, etapes };
}
