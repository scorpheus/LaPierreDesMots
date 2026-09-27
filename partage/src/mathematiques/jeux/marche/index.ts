import type { Alea } from '../../../alea.js';
import type { AideMaths, ConsigneMaths, EtatManipulationMaths, EtapeProjetMaths, GesteMaths, InstanceMathsBase, NiveauMaths, ProjetMathsEnCours, ValidationMaths } from '../../types.js';

export type FamilleMarche = 'MAT-MAR-01' | 'MAT-MAR-02' | 'MAT-MAR-03';
export type ProjetMarcheId = 'MAT-MAR-P01' | 'MAT-MAR-P02' | 'MAT-MAR-P03';
export interface PieceMarche { readonly id: string; readonly centimes: number; readonly etiquette: string }
export interface ArticleMarche { readonly id: string; readonly besoin: string; readonly prixCentimes: number; readonly nom: string }
type Param01 = { readonly cibleCentimes: number; readonly echangeRequis: boolean; readonly conversionCentimesRequise:boolean; readonly deuxCompositions: boolean; readonly pieces: readonly PieceMarche[] };
type Param02 = { readonly prixCentimes: number; readonly donneMinimumCentimes: number; readonly donneMaximumCentimes: number; readonly renduMaximumCentimes: number; readonly deuxStrategies: boolean; readonly pieces: readonly PieceMarche[] };
type Param03 = { readonly budgetCentimes: number; readonly besoins: readonly string[]; readonly deuxPaniers: boolean; readonly articles: readonly ArticleMarche[] };
export type InstanceMarche01 = InstanceMathsBase<'MAT-MAR-01', Param01, readonly PieceMarche[]>;
export type InstanceMarche02 = InstanceMathsBase<'MAT-MAR-02', Param02, readonly PieceMarche[]>;
export type InstanceMarche03 = InstanceMathsBase<'MAT-MAR-03', Param03, readonly ArticleMarche[]>;
export type InstanceMarche = InstanceMarche01 | InstanceMarche02 | InstanceMarche03;
export interface OptionsMarche { readonly cibleCentimes?: number; readonly prixCentimes?: number; readonly budgetCentimes?: number; readonly coutPanierCentimes?: number; readonly echangeRequis?:boolean; readonly deuxPaniers?:boolean; readonly paiementExactAutorise?:boolean }

const VIDE: EtatManipulationMaths = { objets: {}, placements: {}, selection: null, historique: [] };
const NIVEAUX: readonly NiveauMaths[] = ['decouverte', 'exploration', 'defi'];
const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
const ETIQUETTES: Readonly<Record<number, string>> = { 1000: '10 €', 500: '5 €', 200: '2 €', 100: '1 €', 50: '50 c', 20: '20 c', 10: '10 c', 5: '5 c', 2: '2 c', 1: '1 c' };

function texte(phrase: string, cle: string): ConsigneMaths { return { texte: phrase, segments: [{ texte: phrase, audio: `maths/marche/${cle}` }] }; }
function montant(centimes: number): string { return `${(centimes / 100).toFixed(centimes % 100 === 0 ? 0 : 2).replace('.', ',')} €`; }
function entier(alea: Alea, min: number, max: number): number { return alea.entier(min, max + 1); }
function piece(id: string, centimes: number): PieceMarche { return { id, centimes, etiquette: ETIQUETTES[centimes]! }; }
function stock(niveau: NiveauMaths): PieceMarche[] {
  const denominations = niveau === 'decouverte' ? [1000,200,100] : niveau === 'exploration' ? DENOMINATIONS.filter((v) => v >= 100) : DENOMINATIONS;
  return denominations.flatMap((v) => Array.from({ length: v === 100 ? 12 : v === 1000 ? 8 : v < 100 ? 12 : 10 }, (_, i) => piece(`piece-${v}-${i}`, v)));
}
function verifierCentimes(valeur: number, min: number, max: number, entierEuros = false): number {
  if (!Number.isSafeInteger(valeur) || valeur < min || valeur > max || (entierEuros && valeur % 100 !== 0)) throw new Error('Montant incompatible avec le niveau du marché.');
  return valeur;
}
function base<F extends FamilleMarche, P, S>(famille: F, niveau: NiveauMaths, alea: Alea, parametres: P, reserve: S, signature: string, instruction: string): InstanceMathsBase<F, P, S> {
  return { format: 1, id: `${famille.toLowerCase()}-${niveau}-${alea.graine.toString(16)}-${signature.replace(/[^a-z0-9]/gi, '-')}`,
    famille, niveau, modeleId: `marche-${famille.slice(-2)}-v1`, versionModele: 1, versionGenerateur: 1,
    graine: alea.graine, signature, parametres, stock: reserve, etatInitial: VIDE, unite: 'centime',
    consigne: texte(instruction, `${famille}/consigne`),
    aide: { indice: texte('Regarde la valeur de chaque pièce ou étiquette, puis additionne.', `${famille}/indice`),
      demonstration: texte('Gobi montre une façon d’additionner. Essaie toi-même.', `${famille}/demonstration`) },
    reglesValidation: { version: 1, centimesEntiers: true } };
}
function creer01(niveau: NiveauMaths, alea: Alea, options: OptionsMarche): InstanceMarche01 {
  const cible = verifierCentimes(options.cibleCentimes ?? (niveau === 'decouverte' ? entier(alea, 1, 20) * 100 : niveau === 'exploration' ? entier(alea, 12, 90) * 100 : entier(alea, 10, 19) * 100 + entier(alea, 1, 3) * 25),
    niveau === 'exploration' ? 1000 : 100, niveau === 'exploration' ? 10000 : 2000, niveau !== 'defi');
  const pieces = stock(niveau);
  const parametres = { cibleCentimes: cible, echangeRequis: options.echangeRequis ?? niveau === 'exploration', conversionCentimesRequise:niveau==='defi', deuxCompositions: niveau === 'defi', pieces };
  return base('MAT-MAR-01', niveau, alea, parametres, pieces, `caisse:${cible}:echange=${parametres.echangeRequis}:centimes=${parametres.conversionCentimesRequise}`, `Forme ${montant(cible)} dans la caisse${parametres.echangeRequis ? ', puis échange dix pièces de 1 € contre un billet de 10 € sans changer la valeur' : ''}${parametres.conversionCentimesRequise?', et échange 100 centimes contre 1 €':''}${parametres.deuxCompositions ? '. Montre deux façons différentes' : ''}.`);
}
function creer02(niveau: NiveauMaths, alea: Alea, options: OptionsMarche): InstanceMarche02 {
  const prix = verifierCentimes(options.prixCentimes ?? (niveau === 'defi' ? entier(alea, 5, 17) * 100 + entier(alea, 1, 3) * 25 : entier(alea, 2, niveau === 'decouverte' ? 17 : 80) * 100), 100, niveau === 'exploration' ? 10000 : 2000, niveau !== 'defi');
  const donneMinimum = options.paiementExactAutorise || niveau === 'exploration' ? prix : niveau === 'defi' ? Math.min(2000, Math.ceil(prix / 100) * 100 + 100) : Math.ceil(prix / 1000) * 1000;
  const pieces = stock(niveau);
  const parametres = { prixCentimes: prix, donneMinimumCentimes: donneMinimum,
    donneMaximumCentimes:niveau==='exploration'?10000:2000,renduMaximumCentimes:niveau==='decouverte'?1000:niveau==='defi'?2000:10000,
    deuxStrategies: niveau === 'defi', pieces };
  return base('MAT-MAR-02', niveau, alea, parametres, pieces, `rendu:${prix}:${donneMinimum}`, `Le prix est ${montant(prix)}. Place les pièces données et celles à rendre sur leurs plateaux. La valeur donnée doit être au moins ${montant(donneMinimum)}.`);
}
function creer03(niveau: NiveauMaths, alea: Alea, options: OptionsMarche): InstanceMarche03 {
  const budget = verifierCentimes(options.budgetCentimes ?? entier(alea, 12, niveau === 'decouverte' ? 20 : niveau === 'exploration' ? 60 : 100) * 100,
    1000, niveau === 'decouverte' ? 2000 : niveau === 'exploration' ? 6000 : 10000, niveau !== 'defi');
  const cout = verifierCentimes(options.coutPanierCentimes ?? (niveau === 'defi' ? budget - 125 : budget - 200), 200, budget, niveau !== 'defi');
  const troisBesoins=niveau!=='decouverte';
  const a = Math.floor(cout / (troisBesoins?300:200)) * 100;
  const b = troisBesoins?Math.floor((cout-a)/200)*100:cout-a;
  const c = troisBesoins?cout-a-b:0;
  const variantesDePrix=niveau==='defi'&&options.coutPanierCentimes===undefined;
  const tous: ArticleMarche[] = [
    { id: 'fruit-a', besoin: 'fruit', prixCentimes: a, nom: 'Pommes' },
    { id: 'fruit-b', besoin: 'fruit', prixCentimes: variantesDePrix?a-50:a, nom: 'Poires' },
    { id: 'outil-a', besoin: 'outil', prixCentimes: b, nom: 'Panier' },
    { id: 'outil-b', besoin: 'outil', prixCentimes: variantesDePrix?b+25:b, nom: 'Sac' },
    { id: 'boisson-a', besoin: 'boisson', prixCentimes: c, nom: 'Jus' },
    { id: 'boisson-b', besoin: 'boisson', prixCentimes: c, nom: 'Eau' },
    { id: 'extra', besoin: 'extra', prixCentimes: Math.min(budget, b + 100), nom: 'Ruban' },
  ];
  const articles = niveau==='decouverte'?[tous[0]!,tous[1]!,tous[2]!]:niveau==='exploration'?[...tous.slice(0,5)]:tous;
  const parametres = { budgetCentimes: budget, besoins: troisBesoins?['fruit','outil','boisson']:['fruit','outil'], deuxPaniers: options.deuxPaniers ?? niveau === 'defi', articles };
  return base('MAT-MAR-03', niveau, alea, parametres, articles, `panier:${budget}:${cout}`, `Avec ${montant(budget)}, choisis un fruit, un contenant${troisBesoins?' et une boisson':''}${parametres.deuxPaniers ? ', puis montre deux paniers différents qui respectent le budget et compare leur reste' : ''}.`);
}
export function genererMarche(famille: 'MAT-MAR-01', niveau: NiveauMaths, alea: Alea, options?: OptionsMarche): InstanceMarche01;
export function genererMarche(famille: 'MAT-MAR-02', niveau: NiveauMaths, alea: Alea, options?: OptionsMarche): InstanceMarche02;
export function genererMarche(famille: 'MAT-MAR-03', niveau: NiveauMaths, alea: Alea, options?: OptionsMarche): InstanceMarche03;
export function genererMarche(famille: FamilleMarche, niveau: NiveauMaths, alea: Alea, options?: OptionsMarche): InstanceMarche;
export function genererMarche(famille: FamilleMarche, niveau: NiveauMaths, alea: Alea, options: OptionsMarche = {}): InstanceMarche {
  if (!NIVEAUX.includes(niveau)) throw new Error('Niveau inconnu.');
  switch (famille) { case 'MAT-MAR-01': return creer01(niveau, alea, options); case 'MAT-MAR-02': return creer02(niveau, alea, options); case 'MAT-MAR-03': return creer03(niveau, alea, options); default: throw new Error('Famille de marché inconnue.'); }
}
function copie(etat: EtatManipulationMaths): EtatManipulationMaths { return { objets: { ...etat.objets }, placements: { ...etat.placements }, selection: etat.selection, historique: [] }; }
function idsSur(etat: EtatManipulationMaths, destination: string): string[] { return Object.entries(etat.placements).filter(([, place]) => place === destination).map(([id]) => id); }
function somme(ids: readonly string[], pieces: readonly PieceMarche[]): number { return ids.reduce((total, id) => total + (pieces.find((p) => p.id === id)?.centimes ?? 0), 0); }
function signature(ids: readonly string[], pieces: readonly PieceMarche[]): string { return ids.map((id) => pieces.find((p) => p.id === id)?.centimes ?? -1).sort((a,b) => a-b).join(','); }
export function appliquerGesteMarche(instance: InstanceMarche, etat: EtatManipulationMaths, geste: GesteMaths): EtatManipulationMaths {
  if (geste.type === 'annuler') { const precedent = etat.historique.at(-1); return precedent ? { ...precedent, historique: etat.historique.slice(0,-1) } : etat; }
  if (geste.type === 'ecouter' || geste.type === 'aide') return etat;
  const objets = { ...etat.objets }, placements = { ...etat.placements }; let selection = etat.selection;
  if (geste.type === 'placer') {
    const autorise = instance.famille === 'MAT-MAR-03' ? instance.parametres.articles.some((a) => a.id === geste.objetId) && geste.destination === 'panier'
      : instance.parametres.pieces.some((p) => p.id === geste.objetId) && (geste.destination === 'caisse' || (instance.famille === 'MAT-MAR-02' && ['donne','rendu'].includes(geste.destination ?? '')));
    if (!autorise) return etat;
    placements[geste.objetId] = geste.destination!;
  } else if (geste.type === 'retirer') {
    if (!(geste.objetId in placements)) return etat;
    delete placements[geste.objetId];
  } else if (geste.type === 'choisir') {
    if (instance.famille === 'MAT-MAR-01' && geste.objetId === 'echanger') {
      const unes = idsSur(etat, 'caisse').filter((id) => instance.parametres.pieces.find((p) => p.id === id)?.centimes === 100).slice(0,10);
      const billet = instance.parametres.pieces.find((p) => p.centimes === 1000 && !(p.id in placements));
      if (unes.length !== 10 || !billet) return etat;
      for (const id of unes) delete placements[id]; placements[billet.id] = 'caisse'; objets.echangeEffectue = true;
    } else if (instance.famille === 'MAT-MAR-01' && geste.objetId === 'convertir-centimes') {
      const moities=idsSur(etat,'caisse').filter((id)=>instance.parametres.pieces.find((p)=>p.id===id)?.centimes===50).slice(0,2);
      const euro=instance.parametres.pieces.find((p)=>p.centimes===100&&!(p.id in placements));
      if(moities.length!==2||!euro) return etat;
      for(const id of moities) delete placements[id];placements[euro.id]='caisse';objets.conversionCentimesEffectuee=true;
    } else if (instance.famille === 'MAT-MAR-01' && geste.objetId === 'memoriser') {
      const ids = idsSur(etat, 'caisse'); if (somme(ids, instance.parametres.pieces) !== instance.parametres.cibleCentimes) return etat;
      objets.premiereComposition = signature(ids, instance.parametres.pieces);
      for (const id of ids) delete placements[id];
    } else if (instance.famille === 'MAT-MAR-03' && geste.objetId === 'memoriser') {
      const ids = idsSur(etat, 'panier'); if (!panierValide(instance, ids)) return etat;
      objets.premierPanier = [...ids].sort().join(','); for (const id of ids) delete placements[id];
      objets.premierCoutCentimes = ids.reduce((total,id)=>total+instance.parametres.articles.find((a)=>a.id===id)!.prixCentimes,0);
      delete objets.comparaisonReste;
    } else if (instance.famille === 'MAT-MAR-03' && ['comparaison:premier','comparaison:second','comparaison:egal'].includes(geste.objetId)) {
      objets.comparaisonReste = geste.objetId.slice('comparaison:'.length);
    } else if (instance.famille === 'MAT-MAR-02' && geste.objetId === 'memoriser') {
      const donne = idsSur(etat, 'donne'), rendu = idsSur(etat, 'rendu');
      if (!donne.length || somme(donne, instance.parametres.pieces) < instance.parametres.donneMinimumCentimes ||
          somme(donne, instance.parametres.pieces) > instance.parametres.donneMaximumCentimes || somme(rendu, instance.parametres.pieces) > instance.parametres.renduMaximumCentimes ||
          somme(donne, instance.parametres.pieces) - instance.parametres.prixCentimes !== somme(rendu, instance.parametres.pieces)) return etat;
      objets.premiereTransaction = `${signature(donne, instance.parametres.pieces)}|${signature(rendu, instance.parametres.pieces)}`;
      for (const id of [...donne, ...rendu]) delete placements[id];
    } else return etat;
    selection = geste.objetId;
  } else return etat;
  return { objets, placements, selection, historique: [...etat.historique, copie(etat)] };
}
export const manipulerMarche = appliquerGesteMarche;
function panierValide(instance: InstanceMarche03, ids: readonly string[]): boolean {
  const articles = ids.map((id) => instance.parametres.articles.find((a) => a.id === id));
  return articles.every((a) => a !== undefined) && instance.parametres.besoins.every((besoin) => articles.filter((a) => a?.besoin === besoin).length === 1)
    && articles.length === instance.parametres.besoins.length && articles.reduce((v,a) => v + a!.prixCentimes,0) <= instance.parametres.budgetCentimes;
}
export function validerMarche(instance: InstanceMarche, etat: EtatManipulationMaths): ValidationMaths {
  if (instance.famille === 'MAT-MAR-03') {
    const ids = idsSur(etat,'panier'); if (!ids.length) return { statut:'incomplete', raison:'Place les articles dans le panier.' };
    if (!panierValide(instance,ids)) return { statut:'incorrecte', raison:'Le panier doit remplir chaque besoin sans dépasser le budget.' };
    if (instance.parametres.deuxPaniers && typeof etat.objets.premierPanier !== 'string') return { statut:'incomplete', raison:'Mémorise un premier panier, puis compose-en un autre.' };
    if (instance.parametres.deuxPaniers && etat.objets.premierPanier === [...ids].sort().join(',')) return { statut:'incorrecte', raison:'Les deux paniers doivent être différents.' };
    const cout = ids.reduce((s,id) => s + instance.parametres.articles.find((a) => a.id === id)!.prixCentimes,0);
    if (instance.parametres.deuxPaniers) {
      if (!Number.isSafeInteger(etat.objets.premierCoutCentimes) || etat.objets.comparaisonReste===undefined) return { statut:'incomplete', raison:'Compare le reste des deux paniers.' };
      const premier=Number(etat.objets.premierCoutCentimes);
      const attendu=premier<cout?'premier':premier>cout?'second':'egal';
      if (etat.objets.comparaisonReste!==attendu) return { statut:'incorrecte', raison:'Compare les deux restes après les achats.' };
    }
    return { statut:'correcte', solution:{ articles:ids, coutCentimes:cout, resteCentimes:instance.parametres.budgetCentimes-cout } };
  }
  const pieces = instance.parametres.pieces;
  if (Object.keys(etat.placements).some((id) => !pieces.some((p) => p.id === id))) return { statut:'incorrecte', raison:'Une pièce inconnue est posée.' };
  if (instance.famille === 'MAT-MAR-01') {
    const ids = idsSur(etat,'caisse'); if (!ids.length) return { statut:'incomplete', raison:'Place des pièces dans la caisse.' };
    const total = somme(ids,pieces);
    if (total !== instance.parametres.cibleCentimes || Object.values(etat.placements).some((v) => v !== 'caisse')) return { statut:'incorrecte', raison:'La valeur de la caisse ne correspond pas à la somme demandée.', ecart:total-instance.parametres.cibleCentimes };
    if (instance.parametres.echangeRequis && etat.objets.echangeEffectue !== true) return { statut:'incomplete', raison:'Échange dix pièces de 1 € contre un billet de 10 €.' };
    if (instance.parametres.conversionCentimesRequise && etat.objets.conversionCentimesEffectuee!==true) return { statut:'incomplete', raison:'Échange 100 centimes contre une pièce de 1 €.' };
    if (instance.parametres.deuxCompositions && typeof etat.objets.premiereComposition !== 'string') return { statut:'incomplete', raison:'Mémorise une première composition.' };
    if (instance.parametres.deuxCompositions && etat.objets.premiereComposition === signature(ids,pieces)) return { statut:'incorrecte', raison:'Montre une autre composition de même valeur.' };
    return { statut:'correcte', solution:{ valeurCentimes:total, echange:etat.objets.echangeEffectue === true } };
  }
  const donne = idsSur(etat,'donne'), rendu = idsSur(etat,'rendu');
  if (!donne.length) return { statut:'incomplete', raison:'Place les pièces données.' };
  const sommeDonnee = somme(donne,pieces), sommeRendue = somme(rendu,pieces);
  if (sommeDonnee < instance.parametres.donneMinimumCentimes || sommeDonnee > instance.parametres.donneMaximumCentimes || sommeRendue > instance.parametres.renduMaximumCentimes || sommeDonnee - instance.parametres.prixCentimes !== sommeRendue || Object.values(etat.placements).some((v) => v !== 'donne' && v !== 'rendu')) return { statut:'incorrecte', raison:'La somme donnée moins le prix doit être égale à la monnaie rendue, dans les limites de la vente.', ecart:sommeDonnee-instance.parametres.prixCentimes-sommeRendue };
  if (instance.parametres.deuxStrategies && typeof etat.objets.premiereTransaction !== 'string') return { statut:'incomplete', raison:'Mémorise une première façon de payer et de rendre.' };
  if (instance.parametres.deuxStrategies && etat.objets.premiereTransaction === `${signature(donne,pieces)}|${signature(rendu,pieces)}`) return { statut:'incorrecte', raison:'Trouve une autre composition de pièces.' };
  return { statut:'correcte', solution:{ prixCentimes:instance.parametres.prixCentimes, donneCentimes:sommeDonnee, renduCentimes:sommeRendue } };
}

/** Témoins de recette séparés de l'instance et jamais transmis dans l'énoncé. */
export function construireTemoinMarche(instance: InstanceMarche): EtatManipulationMaths {
  if (instance.famille === 'MAT-MAR-03') {
    const ids = ['fruit-a','outil-a',...(instance.parametres.besoins.includes('boisson')?['boisson-a']:[])];
    const premier=['fruit-b',instance.parametres.articles.some((a)=>a.id==='outil-b')?'outil-b':'outil-a',...(instance.parametres.besoins.includes('boisson')?[instance.parametres.articles.some((a)=>a.id==='boisson-b')?'boisson-b':'boisson-a']:[])];
    const premierCout=premier.reduce((total,id)=>total+instance.parametres.articles.find((a)=>a.id===id)!.prixCentimes,0);
    const secondCout=ids.reduce((total,id)=>total+instance.parametres.articles.find((a)=>a.id===id)!.prixCentimes,0);
    return { objets:instance.parametres.deuxPaniers ? { premierPanier:[...premier].sort().join(','),premierCoutCentimes:premierCout,comparaisonReste:premierCout<secondCout?'premier':premierCout>secondCout?'second':'egal' } : {}, placements:Object.fromEntries(ids.map((id) => [id,'panier'])), selection:null, historique:[] };
  }
  const cible = instance.famille === 'MAT-MAR-01' ? instance.parametres.cibleCentimes : instance.parametres.donneMinimumCentimes;
  const pieces = instance.parametres.pieces;
  const prendre = (valeur: number, interdit: Set<string>): string[] => {
    let reste = valeur; const ids:string[] = [];
    for (const p of pieces) if (!interdit.has(p.id) && p.centimes <= reste) { ids.push(p.id); reste -= p.centimes; if (reste === 0) break; }
    if (reste !== 0) throw new Error('Stock de monnaie insuffisant.'); return ids;
  };
  if (instance.famille === 'MAT-MAR-01') {
    const conversion = instance.parametres.conversionCentimesRequise;
    const euroConverti = conversion ? pieces.find((piece) => piece.centimes === 100)! : null;
    const ids = conversion ? [euroConverti!.id, ...prendre(cible - 100, new Set([euroConverti!.id]))] : prendre(cible,new Set());
    return { objets:{ ...(instance.parametres.echangeRequis ? { echangeEffectue:true } : {}), ...(instance.parametres.conversionCentimesRequise?{conversionCentimesEffectuee:true}:{}), ...(instance.parametres.deuxCompositions ? { premiereComposition:'100,100,100,100,100,100,100,100,100,100' } : {}) }, placements:Object.fromEntries(ids.map((id) => [id,'caisse'])), selection:null, historique:[] };
  }
  const donne = prendre(cible,new Set()); const rendu = prendre(cible-instance.parametres.prixCentimes,new Set(donne));
  return { objets:instance.parametres.deuxStrategies ? { premiereTransaction:'autre composition' } : {}, placements:Object.fromEntries([...donne.map((id) => [id,'donne']),...rendu.map((id) => [id,'rendu'])]), selection:null,historique:[] };
}
function placementsPiecesAlternatifs(instance: InstanceMarche01 | InstanceMarche02, placements: EtatManipulationMaths['placements']): EtatManipulationMaths['placements'] {
  const resultat = { ...placements };
  for (const [id, destination] of Object.entries(placements)) {
    const valeur = instance.parametres.pieces.find((piece) => piece.id === id)?.centimes;
    if (valeur === undefined || valeur % 2 !== 0) continue;
    const moities = instance.parametres.pieces.filter((piece) => piece.centimes === valeur / 2 && !(piece.id in resultat)).slice(0, 2);
    if (moities.length !== 2) continue;
    delete resultat[id];
    resultat[moities[0]!.id] = destination;
    resultat[moities[1]!.id] = destination;
    return resultat;
  }
  return resultat;
}
function placementsPanierAlternatifs(instance: InstanceMarche03, placements: EtatManipulationMaths['placements']): EtatManipulationMaths['placements'] {
  const resultat = { ...placements };
  for (const id of Object.keys(placements)) {
    const article = instance.parametres.articles.find((entree) => entree.id === id);
    const autre = article && instance.parametres.articles.find((entree) => entree.besoin === article.besoin && !(entree.id in resultat));
    if (autre === undefined) continue;
    delete resultat[id]; resultat[autre.id] = 'panier';
    return resultat;
  }
  return resultat;
}
export function proposerAideMarche(instance: InstanceMarche, erreursValidees: number, aideCourante: AideMaths, etat?: EtatManipulationMaths): { niveau:AideMaths; consigne:ConsigneMaths|null; gestePropose:GesteMaths|null } {
  const niveau:AideMaths = aideCourante === 'demonstration' || erreursValidees >= 3 ? 'demonstration' : aideCourante === 'indice' || erreursValidees >= 2 ? 'indice' : 'aucune';
  if (etat && niveau === 'demonstration' && instance.famille === 'MAT-MAR-01' && instance.parametres.echangeRequis && etat.objets.echangeEffectue !== true) {
    const unes = idsSur(etat, 'caisse').filter((id) => instance.parametres.pieces.find((p) => p.id === id)?.centimes === 100);
    if (unes.length < 10) {
      const suivante = instance.parametres.pieces.find((p) => p.centimes === 100 && !(p.id in etat.placements));
      if (suivante) return { niveau, consigne: instance.aide[niveau], gestePropose: { type: 'placer', objetId: suivante.id, position: 0, destination: 'caisse' } };
    }
    return { niveau, consigne: instance.aide[niveau], gestePropose: { type: 'choisir', objetId: 'echanger' } };
  }
  if (etat && niveau === 'demonstration' && instance.famille === 'MAT-MAR-01' && instance.parametres.conversionCentimesRequise && etat.objets.conversionCentimesEffectuee !== true) {
    const moities = idsSur(etat, 'caisse').filter((id) => instance.parametres.pieces.find((p) => p.id === id)?.centimes === 50);
    if (moities.length < 2) {
      const suivante = instance.parametres.pieces.find((p) => p.centimes === 50 && !(p.id in etat.placements));
      if (suivante) return { niveau, consigne: instance.aide[niveau], gestePropose: { type: 'placer', objetId: suivante.id, position: 0, destination: 'caisse' } };
    }
    return { niveau, consigne: instance.aide[niveau], gestePropose: { type: 'choisir', objetId: 'convertir-centimes' } };
  }
  const temoin = etat && niveau === 'demonstration' ? construireTemoinMarche(instance) : null;
  const placementsCibles = temoin === null ? null : instance.famille === 'MAT-MAR-01' && instance.parametres.deuxCompositions && typeof etat!.objets.premiereComposition === 'string'
    ? placementsPiecesAlternatifs(instance, temoin.placements)
    : instance.famille === 'MAT-MAR-02' && instance.parametres.deuxStrategies && typeof etat!.objets.premiereTransaction === 'string'
      ? placementsPiecesAlternatifs(instance, temoin.placements)
      : instance.famille === 'MAT-MAR-03' && instance.parametres.deuxPaniers && typeof etat!.objets.premierPanier === 'string'
        ? placementsPanierAlternatifs(instance, temoin.placements) : temoin.placements;
  const manque = placementsCibles && Object.entries(placementsCibles).find(([id,place]) => etat!.placements[id] !== place);
  let gestePropose:GesteMaths|null = manque ? { type:'placer', objetId:manque[0], position:0, destination:String(manque[1]) } : null;
  if (!gestePropose && etat && instance.famille==='MAT-MAR-01' && instance.parametres.echangeRequis && etat.objets.echangeEffectue!==true) gestePropose={type:'choisir',objetId:'echanger'};
  if (!gestePropose && etat && instance.famille==='MAT-MAR-01' && instance.parametres.conversionCentimesRequise && etat.objets.conversionCentimesEffectuee!==true) gestePropose={type:'choisir',objetId:'convertir-centimes'};
  if (!gestePropose && etat && instance.famille==='MAT-MAR-01' && instance.parametres.deuxCompositions && typeof etat.objets.premiereComposition!=='string') gestePropose={type:'choisir',objetId:'memoriser'};
  if (!gestePropose && etat && instance.famille==='MAT-MAR-02' && instance.parametres.deuxStrategies && typeof etat.objets.premiereTransaction!=='string') gestePropose={type:'choisir',objetId:'memoriser'};
  if (!gestePropose && etat && instance.famille==='MAT-MAR-03' && instance.parametres.deuxPaniers && typeof etat.objets.premierPanier!=='string') gestePropose={type:'choisir',objetId:'memoriser'};
  if (!gestePropose && etat && instance.famille==='MAT-MAR-03' && instance.parametres.deuxPaniers && etat.objets.comparaisonReste===undefined) {
    const premier = Number(etat.objets.premierCoutCentimes);
    const second = idsSur(etat, 'panier').reduce((total, id) => total + (instance.parametres.articles.find((article) => article.id === id)?.prixCentimes ?? 0), 0);
    const comparaison = premier < second ? 'premier' : premier > second ? 'second' : 'egal';
    gestePropose = { type: 'choisir', objetId: `comparaison:${comparaison}` };
  }
  return { niveau, consigne:niveau === 'aucune' ? null : instance.aide[niveau], gestePropose };
}
/** Refuse une reprise déformée avant qu'elle ne puisse être manipulée ou créditée. */
export function estInstanceMarche(valeur: unknown): valeur is InstanceMarche {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const i=valeur as Record<string,unknown>;
  if (i.format!==1 || i.versionModele!==1 || i.versionGenerateur!==1 || typeof i.id!=='string' || !i.id ||
      typeof i.signature!=='string' || !NIVEAUX.includes(i.niveau as NiveauMaths) || !Number.isSafeInteger(i.graine) ||
      typeof i.parametres!=='object' || i.parametres===null || !Array.isArray(i.stock) ||
      typeof i.etatInitial!=='object' || i.etatInitial===null) return false;
  const p=i.parametres as Record<string,unknown>;
  const pieceValide=(v:unknown):boolean => typeof v==='object' && v!==null && typeof (v as PieceMarche).id==='string' && Number.isSafeInteger((v as PieceMarche).centimes) && (v as PieceMarche).centimes>0;
  if (i.famille==='MAT-MAR-01') return Number.isSafeInteger(p.cibleCentimes) && typeof p.echangeRequis==='boolean' && typeof p.conversionCentimesRequise==='boolean' && typeof p.deuxCompositions==='boolean' && Array.isArray(p.pieces) && p.pieces.every(pieceValide);
  if (i.famille==='MAT-MAR-02') return Number.isSafeInteger(p.prixCentimes) && Number.isSafeInteger(p.donneMinimumCentimes) && Number.isSafeInteger(p.donneMaximumCentimes) && Number.isSafeInteger(p.renduMaximumCentimes) && typeof p.deuxStrategies==='boolean' && Array.isArray(p.pieces) && p.pieces.every(pieceValide);
  if (i.famille==='MAT-MAR-03') return Number.isSafeInteger(p.budgetCentimes) && typeof p.deuxPaniers==='boolean' && Array.isArray(p.besoins) && p.besoins.every((v)=>typeof v==='string') && Array.isArray(p.articles) && p.articles.every((v:unknown)=>typeof v==='object'&&v!==null&&typeof (v as ArticleMarche).id==='string'&&typeof (v as ArticleMarche).besoin==='string'&&Number.isSafeInteger((v as ArticleMarche).prixCentimes));
  return false;
}

/** Les contraintes ne portent que sur les valeurs transmises entre étapes. */
export function raisonIncompatibiliteProjetMarche(projetId:ProjetMarcheId, niveaux:readonly [NiveauMaths,NiveauMaths,NiveauMaths]):string|null {
  const ordre:readonly [FamilleMarche,FamilleMarche,FamilleMarche]=projetId==='MAT-MAR-P02'?['MAT-MAR-03','MAT-MAR-01','MAT-MAR-02']:['MAT-MAR-01','MAT-MAR-03','MAT-MAR-02'];
  const niveauPanier=niveaux[ordre.indexOf('MAT-MAR-03')]!,niveauRendu=niveaux[ordre.indexOf('MAT-MAR-02')]!,niveauPaiement=niveaux[ordre.indexOf('MAT-MAR-01')]!;
  if(niveauRendu==='defi'&&niveauPanier!=='defi') return 'Niveaux incompatibles : le rendu en centimes exige un panier Défi.';
  if(projetId==='MAT-MAR-P02'&&niveauRendu==='defi'&&niveauPaiement!=='defi') return 'Niveaux incompatibles : payer un panier en centimes exige une caisse Défi.';
  return null;
}
export function combinaisonsCompatiblesMarche(projetId:ProjetMarcheId):readonly (readonly [NiveauMaths,NiveauMaths,NiveauMaths])[] {
  return NIVEAUX.flatMap((a)=>NIVEAUX.flatMap((b)=>NIVEAUX.map((c)=>[a,b,c] as const).filter((n)=>raisonIncompatibiliteProjetMarche(projetId,n)===null)));
}

export function creerProjetMarche(projetId: ProjetMarcheId, niveaux: readonly NiveauMaths[], alea: Alea, sessionId: string): { projet:ProjetMathsEnCours; instances:readonly [InstanceMarche,InstanceMarche,InstanceMarche] } {
  if (!/^MAT-MAR-P0[123]$/.test(projetId) || niveaux.length !== 3 || niveaux.some((n) => !NIVEAUX.includes(n)) || !sessionId.trim()) throw new Error('Projet de marché invalide.');
  const choix = niveaux as readonly [NiveauMaths,NiveauMaths,NiveauMaths];
  const ordre:readonly [FamilleMarche,FamilleMarche,FamilleMarche] = projetId === 'MAT-MAR-P02' ? ['MAT-MAR-03','MAT-MAR-01','MAT-MAR-02'] : ['MAT-MAR-01','MAT-MAR-03','MAT-MAR-02'];
  const raison=raisonIncompatibiliteProjetMarche(projetId,choix);if(raison) throw new Error(raison);
  const niveauPanier=choix[ordre.indexOf('MAT-MAR-03')]!, niveauRendu=choix[ordre.indexOf('MAT-MAR-02')]!;
  const capital = entier(alea, 15, 19) * 100;
  const cout = capital - (niveauPanier==='defi' && niveauRendu==='defi' ? 125 : 200);
  const variables:Readonly<Record<string,number>> = projetId === 'MAT-MAR-P01' ? { caisseCentimes:capital, depenseCentimes:cout } : projetId === 'MAT-MAR-P02' ? { panierCentimes:cout, donneCentimes:capital } : { capitalCentimes:capital, soldeCentimes:capital-cout };
  const creer = (famille:FamilleMarche, niveau:NiveauMaths):InstanceMarche => genererMarche(famille,niveau,alea,{ cibleCentimes:capital, budgetCentimes:capital, coutPanierCentimes:cout, prixCentimes:cout,
    echangeRequis:projetId==='MAT-MAR-P03'?true:undefined,deuxPaniers:projetId==='MAT-MAR-P02'?true:undefined,paiementExactAutorise:projetId==='MAT-MAR-P02'?true:undefined });
  const brutes = ordre.map((f,i) => creer(f,choix[i]!)) as [InstanceMarche,InstanceMarche,InstanceMarche];
  const plan = brutes.map((v,i) => ({ rang:i, famille:v.famille, niveau:v.niveau, instanceId:`${sessionId}:${i}` })) as [EtapeProjetMaths,EtapeProjetMaths,EtapeProjetMaths];
  const transformationId = `marche-${projetId.slice(-3).toLowerCase()}`;
  const cadeauId = projetId === 'MAT-MAR-P01' ? 'maths-souvenir-marche' : projetId === 'MAT-MAR-P03' ? 'maths-objet-marche' : null;
  const cadeauType = projetId === 'MAT-MAR-P01' ? 'souvenir' as const : projetId === 'MAT-MAR-P03' ? 'objet' as const : null;
  const avecContexte=(v:InstanceMarche,i:number):InstanceMarche => ({ ...v,id:plan[i]!.instanceId, projet:{ sessionId,projetId,versionProjet:1,etape:i,variables,plan,transformationId,cadeauId,cadeauType } });
  const instances:readonly [InstanceMarche,InstanceMarche,InstanceMarche]=[avecContexte(brutes[0],0),avecContexte(brutes[1],1),avecContexte(brutes[2],2)];
  const projet:ProjetMathsEnCours = { id:projetId,sessionId,version:1,variables,plan,transformationId,cadeauId,cadeauType,etapeCourante:0,instances:instances.map((v) => v.id),etoilesEtapes:[],suspendu:false };
  return { projet,instances };
}
