import type { Alea } from '../../../alea.js';
import type { AideMaths, ConsigneMaths, EtatManipulationMaths, EtapeProjetMaths, GesteMaths, InstanceMathsBase, NiveauMaths, ProjetMathsEnCours, ValidationMaths } from '../../types.js';

export type FamilleHorloge = 'MAT-HOR-01' | 'MAT-HOR-02' | 'MAT-HOR-03';
export type ProjetHorlogeId = 'MAT-HOR-P01' | 'MAT-HOR-P02' | 'MAT-HOR-P03';
export type MomentJournee = 'matin' | 'apres-midi' | 'soir';
export interface TrajetHorloge { readonly id:string; readonly destination:string; readonly moment:MomentJournee; readonly departMinutes:number; readonly arriveeMinutes:number }
type Param01 = { readonly heure24:number; readonly minutes:number; readonly moment:MomentJournee; readonly heure12:number; readonly minutesDepuisMinuit:number };
type Param02 = { readonly departMinutes:number; readonly rubans:readonly number[]; readonly arriveeMinutes:number; readonly comparerDeuxTrajets:boolean; readonly arriveeAlternativeMinutes:number|null; readonly trajetLePlusRapide:'principal'|'alternative'|null };
type Param03 = { readonly destinations:readonly string[]; readonly moments:readonly MomentJournee[]; readonly trajets:readonly TrajetHorloge[]; readonly arriveeVoulueMinutes:number; readonly nombreAPlacer:number };
export type InstanceHorloge01 = InstanceMathsBase<'MAT-HOR-01',Param01,readonly string[]>;
export type InstanceHorloge02 = InstanceMathsBase<'MAT-HOR-02',Param02,readonly number[]>;
export type InstanceHorloge03 = InstanceMathsBase<'MAT-HOR-03',Param03,readonly TrajetHorloge[]>;
export type InstanceHorloge = InstanceHorloge01 | InstanceHorloge02 | InstanceHorloge03;
export interface OptionsHorloge { readonly departMinutes?:number; readonly arriveeMinutes?:number; readonly dureeMinutes?:number }
const VIDE:EtatManipulationMaths = { objets:{},placements:{},selection:null,historique:[] };
const NIVEAUX:readonly NiveauMaths[] = ['decouverte','exploration','defi'];
const MOMENTS:readonly MomentJournee[] = ['matin','apres-midi','soir'];
function consigne(phrase:string,cle:string):ConsigneMaths { return { texte:phrase, segments:[{ texte:phrase,audio:`maths/horloge/${cle}` }] }; }
function heure(minutes:number):string { return `${String(Math.floor(minutes/60)).padStart(2,'0')} h ${String(minutes%60).padStart(2,'0')}`; }
function moment(minutes:number):MomentJournee { return minutes < 12*60 ? 'matin' : minutes < 18*60 ? 'apres-midi' : 'soir'; }
function base<F extends FamilleHorloge,P,S>(famille:F,niveau:NiveauMaths,alea:Alea,parametres:P,stock:S,signature:string,phrase:string):InstanceMathsBase<F,P,S> {
  return { format:1,id:`${famille.toLowerCase()}-${niveau}-${alea.graine.toString(16)}-${signature.replace(/[^a-z0-9]/gi,'-')}`,
    famille,niveau,modeleId:`horloge-${famille.slice(-2)}-v1`,versionModele:1,versionGenerateur:1,graine:alea.graine,signature,
    parametres,stock,etatInitial:VIDE,consigne:consigne(phrase,`${famille}/consigne`),unite:'minute',
    aide:{ indice:consigne('Regarde les quarts d’heure et le moment de la journée.',`${famille}/indice`),
      demonstration:consigne('Gobi montre un repère sur la frise. À toi de placer.',`${famille}/demonstration`) },
    reglesValidation:{version:1,minutesEntieres:true,memeJournee:true} };
}
function verifierMinutes(v:number,pas:15|30|60,min:number,max:number):number {
  if (!Number.isSafeInteger(v) || v<min || v>max || v%pas!==0) throw new Error('Horaire incompatible avec le niveau de l’horloge.'); return v;
}
function creer01(niveau:NiveauMaths,alea:Alea,options:OptionsHorloge):InstanceHorloge01 {
  const pas = niveau === 'decouverte' ? 60 : 15;
  const valeur = options.arriveeMinutes ?? options.departMinutes ?? alea.entier(niveau === 'defi' ? 0 : 6, niveau === 'defi' ? 24 : 18)*60 + (pas===60 ? 0 : alea.entier(0,4)*15);
  verifierMinutes(valeur,pas,0,23*60+45);
  if(niveau==='decouverte'&&(valeur<60||valeur>=18*60)) throw new Error('Cadran Découverte hors matin ou après-midi.');
  if(niveau==='exploration'&&valeur>=18*60) throw new Error('Cadran Exploration hors matin ou après-midi.');
  const heure24=Math.floor(valeur/60),minutes=valeur%60,m=moment(valeur);
  const parametres={heure24,minutes,moment:m,heure12:heure24%12||12,minutesDepuisMinuit:valeur};
  return base('MAT-HOR-01',niveau,alea,parametres,['aiguille-heures','aiguille-minutes'],`cadran:${valeur}`,`Nous sommes ${m==='matin'?'le matin':m==='apres-midi'?'l’après-midi':'le soir'}. Place les aiguilles sur ${heure(valeur)}, puis choisis le moment de la journée.`);
}
function creer02(niveau:NiveauMaths,alea:Alea,options:OptionsHorloge):InstanceHorloge02 {
  const depart = options.departMinutes ?? (alea.entier(8,17)*60 + (niveau==='decouverte'?0:niveau==='exploration'?alea.entier(0,2)*30:alea.entier(0,4)*15));
  verifierMinutes(depart,niveau==='decouverte'?60:niveau==='exploration'?30:15,0,22*60);
  const choixRubans:readonly (readonly number[])[]=niveau==='decouverte'?[[15],[30]]:niveau==='exploration'?[[15,15],[15,30],[30,15],[30,30]]:
    [[15,15],[15,30],[30,15],[30,30],[15,60],[60,15],[30,60],[60,30],[60,60]];
  const compatibles=options.dureeMinutes===undefined?choixRubans:choixRubans.filter((rubans)=>rubans.reduce((a,b)=>a+b,0)===options.dureeMinutes);
  if(compatibles.length===0) throw new Error('Durée incompatible avec le niveau.');
  const rubans=[...alea.choisir(compatibles)];
  const duree=rubans.reduce((a,b)=>a+b,0);
  const arrivee=depart+duree; if (arrivee>=24*60) throw new Error('Le trajet sort de la journée.');
  const arriveeAlternativeMinutes=niveau==='defi'?arrivee+(duree===30?15:-15):null;
  const trajetLePlusRapide=niveau==='defi'?(duree===30?'principal':'alternative') as 'principal'|'alternative':null;
  const parametres={departMinutes:depart,rubans,arriveeMinutes:arrivee,comparerDeuxTrajets:niveau==='defi',arriveeAlternativeMinutes,trajetLePlusRapide};
  return base('MAT-HOR-02',niveau,alea,parametres,rubans,`rubans:${depart}:${rubans.join('+')}`,`Départ à ${heure(depart)}, ${moment(depart)==='matin'?'le matin':moment(depart)==='apres-midi'?'l’après-midi':'le soir'}. ${rubans.length===1?`Pose le ruban de ${rubans[0]} minutes`:`Pose les rubans de ${rubans[0]} et ${rubans[1]} minutes à la suite`}, puis indique l’arrivée.`);
}
function creer03(niveau:NiveauMaths,alea:Alea,options:OptionsHorloge):InstanceHorloge03 {
  const destinations=niveau==='decouverte'?['Jardin','Marché']:niveau==='exploration'?['Jardin','Marché','Moulin']:['Jardin','Marché','Moulin','Ponts'];
  const moments:MomentJournee[] = niveau==='decouverte'?['matin','apres-midi']:['matin','apres-midi','soir'];
  const nombre=niveau==='decouverte'?1:niveau==='exploration'?3:4;
  const cible = options.arriveeMinutes ?? alea.entier(9*4, (niveau==='decouverte'?17:21)*4+1)*15;
  verifierMinutes(cible,15,8*60,23*60+45);
  const dureeChoisie=options.dureeMinutes ?? alea.choisir([15,30,45,60]);
  const departChoisi=options.departMinutes ?? cible-dureeChoisie;
  verifierMinutes(departChoisi,15,0,cible-15);
  const trajets:TrajetHorloge[] = Array.from({length:nombre},(_,i) => {
    const depart=i===0?departChoisi:i===1?(moment(departChoisi)==='matin'?14*60:9*60):i===2?Math.max(8*60,departChoisi-60):19*60;
    const destination=destinations[i%destinations.length]!;
    return {id:`trajet-${i}`,destination,moment:moment(depart),departMinutes:depart,arriveeMinutes:depart+(i===0?dureeChoisie:i===1?30:60)};
  });
  const parametres={destinations,moments,trajets,arriveeVoulueMinutes:cible,nombreAPlacer:nombre};
  return { ...base('MAT-HOR-03',niveau,alea,parametres,trajets,`tableau:${cible}:${trajets.map((t)=>t.departMinutes).join(',')}`,`Place chaque trajet dans le tableau, selon le lieu et le moment de la journée. Pour arriver au plus tard à ${heure(cible)}, choisis le départ qui te permet d’arriver à l’heure.`), versionGenerateur:2 };
}
export function genererHorloge(famille:'MAT-HOR-01',niveau:NiveauMaths,alea:Alea,options?:OptionsHorloge):InstanceHorloge01;
export function genererHorloge(famille:'MAT-HOR-02',niveau:NiveauMaths,alea:Alea,options?:OptionsHorloge):InstanceHorloge02;
export function genererHorloge(famille:'MAT-HOR-03',niveau:NiveauMaths,alea:Alea,options?:OptionsHorloge):InstanceHorloge03;
export function genererHorloge(famille:FamilleHorloge,niveau:NiveauMaths,alea:Alea,options?:OptionsHorloge):InstanceHorloge;
export function genererHorloge(famille:FamilleHorloge,niveau:NiveauMaths,alea:Alea,options:OptionsHorloge={}):InstanceHorloge {
  if (!NIVEAUX.includes(niveau)) throw new Error('Niveau inconnu.');
  switch(famille) { case 'MAT-HOR-01':return creer01(niveau,alea,options);case 'MAT-HOR-02':return creer02(niveau,alea,options);case 'MAT-HOR-03':return creer03(niveau,alea,options);default:throw new Error('Famille d’horloge inconnue.'); }
}
function copier(etat:EtatManipulationMaths):EtatManipulationMaths { return {objets:{...etat.objets},placements:{...etat.placements},selection:etat.selection,historique:[]}; }
export function appliquerGesteHorloge(instance:InstanceHorloge,etat:EtatManipulationMaths,geste:GesteMaths):EtatManipulationMaths {
  if (geste.type==='annuler') { const precedent=etat.historique.at(-1);return precedent?{...precedent,historique:etat.historique.slice(0,-1)}:etat; }
  if (geste.type==='aide'||geste.type==='ecouter') return etat;
  const placements={...etat.placements},objets={...etat.objets};let selection=etat.selection;
  if (geste.type==='placer') {
    if (!Number.isSafeInteger(geste.position)) return etat;
    if (instance.famille==='MAT-HOR-01') {
      if (geste.objetId==='aiguille-heures'&&geste.position>=0&&geste.position<12) placements[geste.objetId]=geste.position;
      else if (geste.objetId==='aiguille-minutes'&&[0,15,30,45].includes(geste.position)) placements[geste.objetId]=geste.position;
      else return etat;
    } else if (instance.famille==='MAT-HOR-02') {
      if (!['ruban-a',...(instance.parametres.rubans.length===2?['ruban-b']:[])].includes(geste.objetId)||geste.position<0||geste.position>23*60+45||geste.position%15!==0) return etat;
      placements[geste.objetId]=geste.position;
    } else {
      const trajet=instance.parametres.trajets.find((t)=>t.id===geste.objetId);
      if (!trajet || !geste.destination || !instance.parametres.destinations.some((d)=>geste.destination!.startsWith(`${d}|`))) return etat;
      placements[geste.objetId]=geste.destination;
    }
  } else if (geste.type==='retirer') {
    if (!(geste.objetId in placements)) return etat;delete placements[geste.objetId];
  } else if (geste.type==='choisir') {
    if (instance.famille==='MAT-HOR-01'&&['matin','apres-midi','soir'].includes(geste.objetId)) selection=geste.objetId;
    else if (instance.famille==='MAT-HOR-02'&&/^arrivee:\d+$/.test(geste.objetId)) objets.arriveeMinutes=Number(geste.objetId.split(':')[1]);
    else if (instance.famille==='MAT-HOR-02'&&['trajet:principal','trajet:alternative'].includes(geste.objetId)) selection=geste.objetId.slice('trajet:'.length);
    else if (instance.famille==='MAT-HOR-03'&&instance.parametres.trajets.some((t)=>t.id===geste.objetId)) selection=geste.objetId;
    else return etat;
  } else return etat;
  return {objets,placements,selection,historique:[...etat.historique,copier(etat)]};
}
export const manipulerHorloge=appliquerGesteHorloge;
export function validerHorloge(instance:InstanceHorloge,etat:EtatManipulationMaths):ValidationMaths {
  if (instance.famille==='MAT-HOR-01') {
    if (etat.placements['aiguille-heures']===undefined||etat.placements['aiguille-minutes']===undefined||etat.selection===null) return {statut:'incomplete',raison:'Place les deux aiguilles et choisis le moment de la journée.'};
    if (etat.placements['aiguille-heures']!==instance.parametres.heure24%12||etat.placements['aiguille-minutes']!==instance.parametres.minutes||etat.selection!==instance.parametres.moment) return {statut:'incorrecte',raison:'Les aiguilles ou le moment de la journée ne correspondent pas.'};
    return {statut:'correcte',solution:{minutesDepuisMinuit:instance.parametres.minutesDepuisMinuit,moment:instance.parametres.moment}};
  }
  if (instance.famille==='MAT-HOR-02') {
    const a=etat.placements['ruban-a'],b=etat.placements['ruban-b'];
    if (a===undefined||(instance.parametres.rubans.length===2&&b===undefined)||etat.objets.arriveeMinutes===undefined) return {statut:'incomplete',raison:'Pose les rubans et indique l’arrivée.'};
    const d1=instance.parametres.rubans[0]!,d2=instance.parametres.rubans[1]??0;
    const direct=a===instance.parametres.departMinutes&&(d2===0?b===undefined:b===Number(a)+d1);
    const inverse=d2!==0&&b===instance.parametres.departMinutes&&a===Number(b)+d2;
    if ((!direct&&!inverse)||etat.objets.arriveeMinutes!==instance.parametres.arriveeMinutes) return {statut:'incorrecte',raison:'Les rubans doivent se suivre depuis le départ jusqu’à l’arrivée.'};
    if (instance.parametres.comparerDeuxTrajets&&etat.selection===null) return {statut:'incomplete',raison:'Compare les deux trajets et choisis le plus rapide.'};
    if (instance.parametres.comparerDeuxTrajets&&etat.selection!==instance.parametres.trajetLePlusRapide) return {statut:'incorrecte',raison:'Le trajet choisi n’arrive pas le premier.'};
    return {statut:'correcte',solution:{departMinutes:instance.parametres.departMinutes,dureeMinutes:d1+d2,arriveeMinutes:instance.parametres.arriveeMinutes}};
  }
  const trajets=instance.parametres.trajets;
  if (Object.keys(etat.placements).length<trajets.length||etat.selection===null) return {statut:'incomplete',raison:'Place chaque trajet et choisis un départ.'};
  if (Object.keys(etat.placements).length!==trajets.length||trajets.some((t)=>etat.placements[t.id]!==`${t.destination}|${t.moment}`)) return {statut:'incorrecte',raison:'Une case ne correspond pas à la destination et au moment.'};
  const choisi=trajets.find((t)=>t.id===etat.selection);
  if (!choisi||choisi.arriveeMinutes>instance.parametres.arriveeVoulueMinutes||choisi.departMinutes>=choisi.arriveeMinutes) return {statut:'incorrecte',raison:'Ce départ ne permet pas d’arriver à temps.'};
  return {statut:'correcte',solution:{trajetId:choisi.id,departMinutes:choisi.departMinutes,arriveeMinutes:choisi.arriveeMinutes}};
}
export function construireTemoinHorloge(instance:InstanceHorloge):EtatManipulationMaths {
  if (instance.famille==='MAT-HOR-01') return {objets:{},placements:{'aiguille-heures':instance.parametres.heure24%12,'aiguille-minutes':instance.parametres.minutes},selection:instance.parametres.moment,historique:[]};
  if (instance.famille==='MAT-HOR-02') return {objets:{arriveeMinutes:instance.parametres.arriveeMinutes},placements:instance.parametres.rubans.length===1?{'ruban-a':instance.parametres.departMinutes}:{'ruban-a':instance.parametres.departMinutes,'ruban-b':instance.parametres.departMinutes+instance.parametres.rubans[0]!},selection:instance.parametres.trajetLePlusRapide,historique:[]};
  const trajet=instance.parametres.trajets.find((t)=>t.arriveeMinutes<=instance.parametres.arriveeVoulueMinutes);
  if (!trajet) throw new Error('Tableau sans départ compatible.');
  return {objets:{},placements:Object.fromEntries(instance.parametres.trajets.map((t)=>[t.id,`${t.destination}|${t.moment}`])),selection:trajet.id,historique:[]};
}
export function proposerAideHorloge(instance:InstanceHorloge,erreursValidees:number,aideCourante:AideMaths,etat?:EtatManipulationMaths):{niveau:AideMaths;consigne:ConsigneMaths|null;gestePropose:GesteMaths|null} {
  const niveau:AideMaths=aideCourante==='demonstration'||erreursValidees>=3?'demonstration':aideCourante==='indice'||erreursValidees>=2?'indice':'aucune';
  const temoin=etat&&niveau==='demonstration'?construireTemoinHorloge(instance):null;
  const manque=temoin&&Object.entries(temoin.placements).find(([id,place])=>etat!.placements[id]!==place);
  let gestePropose:GesteMaths|null=manque?{type:'placer',objetId:manque[0],position:typeof manque[1]==='number'?manque[1]:0,destination:typeof manque[1]==='string'?manque[1]:undefined}:null;
  if(!gestePropose&&etat&&temoin&&instance.famille==='MAT-HOR-01'&&etat.selection!==temoin.selection) gestePropose={type:'choisir',objetId:temoin.selection!};
  if(!gestePropose&&etat&&temoin&&instance.famille==='MAT-HOR-02'&&etat.objets.arriveeMinutes!==temoin.objets.arriveeMinutes) gestePropose={type:'choisir',objetId:`arrivee:${temoin.objets.arriveeMinutes}`};
  if(!gestePropose&&etat&&temoin&&instance.famille==='MAT-HOR-02'&&etat.selection!==temoin.selection&&temoin.selection!==null) gestePropose={type:'choisir',objetId:`trajet:${temoin.selection}`};
  if(!gestePropose&&etat&&temoin&&instance.famille==='MAT-HOR-03'&&etat.selection!==temoin.selection&&temoin.selection!==null) gestePropose={type:'choisir',objetId:temoin.selection};
  return {niveau,consigne:niveau==='aucune'?null:instance.aide[niveau],gestePropose};
}
/** La version et la forme des paramètres sont contrôlées avant toute reprise. */
export function estInstanceHorloge(valeur:unknown):valeur is InstanceHorloge {
  if(typeof valeur!=='object'||valeur===null) return false;
  const i=valeur as Record<string,unknown>;
  if(i.format!==1||i.versionModele!==1||!(i.versionGenerateur===1||(i.famille==='MAT-HOR-03'&&i.versionGenerateur===2))||typeof i.id!=='string'||!i.id||typeof i.signature!=='string'||
    !NIVEAUX.includes(i.niveau as NiveauMaths)||!Number.isSafeInteger(i.graine)||typeof i.parametres!=='object'||i.parametres===null||
    !Array.isArray(i.stock)||typeof i.etatInitial!=='object'||i.etatInitial===null) return false;
  const p=i.parametres as Record<string,unknown>;
  if(i.famille==='MAT-HOR-01') return Number.isSafeInteger(p.heure24)&&Number.isSafeInteger(p.minutes)&&Number.isSafeInteger(p.minutesDepuisMinuit)&&MOMENTS.includes(p.moment as MomentJournee);
  if(i.famille==='MAT-HOR-02') return Number.isSafeInteger(p.departMinutes)&&Number.isSafeInteger(p.arriveeMinutes)&&Array.isArray(p.rubans)&&[1,2].includes(p.rubans.length)&&p.rubans.every((v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0)&&typeof p.comparerDeuxTrajets==='boolean';
  if(i.famille==='MAT-HOR-03') return Number.isSafeInteger(p.arriveeVoulueMinutes)&&Array.isArray(p.destinations)&&Array.isArray(p.moments)&&Array.isArray(p.trajets)&&p.trajets.every((v:unknown)=>typeof v==='object'&&v!==null&&typeof (v as TrajetHorloge).id==='string'&&Number.isSafeInteger((v as TrajetHorloge).departMinutes)&&Number.isSafeInteger((v as TrajetHorloge).arriveeMinutes));
  return false;
}
export function raisonIncompatibiliteProjetHorloge(projetId:ProjetHorlogeId,niveaux:readonly [NiveauMaths,NiveauMaths,NiveauMaths]):string|null {
  return projetId!=='MAT-HOR-P01'&&niveaux[1]==='decouverte'&&niveaux[2]==='decouverte'
    ? 'Niveaux incompatibles : les rubans Découverte de 15 ou 30 minutes ne produisent pas une heure entière pour le cadran final Découverte.' : null;
}
export function combinaisonsCompatiblesHorloge(projetId:ProjetHorlogeId):readonly (readonly [NiveauMaths,NiveauMaths,NiveauMaths])[] {
  return NIVEAUX.flatMap((a)=>NIVEAUX.flatMap((b)=>NIVEAUX.map((c)=>[a,b,c] as const).filter((n)=>raisonIncompatibiliteProjetHorloge(projetId,n)===null)));
}
export function creerProjetHorloge(projetId:ProjetHorlogeId,niveaux:readonly NiveauMaths[],alea:Alea,sessionId:string):{projet:ProjetMathsEnCours;instances:readonly [InstanceHorloge,InstanceHorloge,InstanceHorloge]} {
  if (!/^MAT-HOR-P0[123]$/.test(projetId)||niveaux.length!==3||niveaux.some((n)=>!NIVEAUX.includes(n))||!sessionId.trim()) throw new Error('Projet d’horloge invalide.');
  const ordre:readonly [FamilleHorloge,FamilleHorloge,FamilleHorloge]=projetId==='MAT-HOR-P01'?['MAT-HOR-01','MAT-HOR-02','MAT-HOR-03']:['MAT-HOR-03','MAT-HOR-02','MAT-HOR-01'];
  const choix=niveaux as readonly [NiveauMaths,NiveauMaths,NiveauMaths];
  const raison=raisonIncompatibiliteProjetHorloge(projetId,choix);if(raison) throw new Error(raison);
  const niveauRubans=choix[1];
  const niveauCadranFinal=projetId==='MAT-HOR-P01'?null:choix[2];
  const depart=10*60;
  const duree=niveauCadranFinal==='decouverte'?60:niveauRubans==='decouverte'?30:45;
  const arrivee=depart+duree;
  const variables={departMinutes:depart,dureeMinutes:duree,arriveeMinutes:arrivee};
  const brutes=ordre.map((famille,i)=>genererHorloge(famille,niveaux[i]!,alea,{departMinutes: famille==='MAT-HOR-01'?undefined:depart,arriveeMinutes: famille==='MAT-HOR-01'?(i===0?depart:arrivee):famille==='MAT-HOR-03'?arrivee:undefined,dureeMinutes:duree})) as [InstanceHorloge,InstanceHorloge,InstanceHorloge];
  const plan=brutes.map((v,i)=>({rang:i,famille:v.famille,niveau:v.niveau,instanceId:`${sessionId}:${i}`})) as [EtapeProjetMaths,EtapeProjetMaths,EtapeProjetMaths];
  const transformationId=`horloge-${projetId.slice(-3).toLowerCase()}`;
  const cadeauId=projetId==='MAT-HOR-P01'?'maths-souvenir-horloge':projetId==='MAT-HOR-P03'?'maths-objet-horloge':null;
  const cadeauType=projetId==='MAT-HOR-P01'?'souvenir' as const:projetId==='MAT-HOR-P03'?'objet' as const:null;
  const avecContexte=(v:InstanceHorloge,i:number):InstanceHorloge=>({...v,id:plan[i]!.instanceId,projet:{sessionId,projetId,versionProjet:1,etape:i,variables,plan,transformationId,cadeauId,cadeauType}});
  const instances:readonly [InstanceHorloge,InstanceHorloge,InstanceHorloge]=[avecContexte(brutes[0],0),avecContexte(brutes[1],1),avecContexte(brutes[2],2)];
  const projet:ProjetMathsEnCours={id:projetId,sessionId,version:1,variables,plan,transformationId,cadeauId,cadeauType,etapeCourante:0,instances:instances.map((v)=>v.id),etoilesEtapes:[],suspendu:false};
  return {projet,instances};
}
