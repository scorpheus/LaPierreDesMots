import { useState, type ReactElement } from 'react';
import type { EtatManipulationMaths, GesteMaths } from '@pierre/partage/mathematiques';
import type { InstanceHorloge } from '../../../../partage/src/mathematiques/jeux/horloge/index.js';
import './ateliers-horloge.css';

export interface ProprietesAteliersHorloge { readonly instance:InstanceHorloge; readonly etat:EtatManipulationMaths; readonly attente:boolean; readonly surGeste:(geste:GesteMaths)=>void }
function heure(minutes:number):string { return `${String(Math.floor(minutes/60)).padStart(2,'0')} h ${String(minutes%60).padStart(2,'0')}`; }
function nomMoment(moment:string):string { return moment==='apres-midi'?'après-midi':moment; }
function Cadran({instance,etat,attente,surGeste}:ProprietesAteliersHorloge):ReactElement {
  if (instance.famille!=='MAT-HOR-01') throw new Error('Cadran attendu.');
  const heures=typeof etat.placements['aiguille-heures']==='number'?etat.placements['aiguille-heures']:0;
  const minutes=typeof etat.placements['aiguille-minutes']==='number'?etat.placements['aiguille-minutes']:0;
  const heuresPosees=etat.placements['aiguille-heures']!==undefined;
  const minutesPosees=etat.placements['aiguille-minutes']!==undefined;
  const etiquette=!heuresPosees&&!minutesPosees?'Cadran : deux aiguilles à poser':!heuresPosees?'Cadran : petite aiguille à poser':!minutesPosees?'Cadran : grande aiguille à poser':`Cadran réglé sur ${heures===0?12:heures} h ${String(minutes).padStart(2,'0')}${etat.selection?`, ${nomMoment(etat.selection)}`:''}`;
  const angleHeures=(Number(heures)+Number(minutes)/60)*30,angleMinutes=Number(minutes)*6;
  return <div className="horloge-atelier" data-atelier={instance.famille}>
    <svg className="horloge-cadran" viewBox="0 0 240 240" role="img" aria-label={etiquette}>
      <circle cx="120" cy="120" r="108" fill="#fff9e9" stroke="#704923" strokeWidth="5"/>
      {Array.from({length:12},(_,i)=>{const a=(i*30-90)*Math.PI/180;return <g key={i}><line x1={120+Math.cos(a)*91} y1={120+Math.sin(a)*91} x2={120+Math.cos(a)*100} y2={120+Math.sin(a)*100} stroke="#704923" strokeWidth="3"/><text x={120+Math.cos(a)*73} y={125+Math.sin(a)*73} textAnchor="middle" fontSize="16">{i===0?12:i}</text></g>;})}
      {heuresPosees&&<line data-aiguille="heures" x1="120" y1="120" x2={120+Math.sin(angleHeures*Math.PI/180)*51} y2={120-Math.cos(angleHeures*Math.PI/180)*51} stroke="#4e6b46" strokeWidth="8" strokeLinecap="round"/>}
      {minutesPosees&&<line data-aiguille="minutes" x1="120" y1="120" x2={120+Math.sin(angleMinutes*Math.PI/180)*78} y2={120-Math.cos(angleMinutes*Math.PI/180)*78} stroke="#a85c30" strokeWidth="5" strokeLinecap="round"/>}
      <circle cx="120" cy="120" r="6" fill="#382719"/>
    </svg>
    <fieldset><legend>Petite aiguille : heure</legend><div className="horloge-choix">{Array.from({length:12},(_,i)=><button type="button" key={i} disabled={attente} aria-pressed={heures===i&&etat.placements['aiguille-heures']!==undefined} onClick={()=>surGeste({type:'placer',objetId:'aiguille-heures',position:i})}>{i===0?12:i}</button>)}</div></fieldset>
    <fieldset><legend>Grande aiguille : minutes</legend><div className="horloge-choix">{[0,15,30,45].map((v)=><button type="button" key={v} disabled={attente} aria-pressed={minutes===v&&etat.placements['aiguille-minutes']!==undefined} onClick={()=>surGeste({type:'placer',objetId:'aiguille-minutes',position:v})}>{String(v).padStart(2,'0')}</button>)}</div></fieldset>
    <fieldset><legend>Moment de la journée</legend><div className="horloge-choix">{['matin','apres-midi','soir'].map((v)=><button type="button" key={v} disabled={attente} aria-pressed={etat.selection===v} onClick={()=>surGeste({type:'choisir',objetId:v})}>{nomMoment(v)}</button>)}</div></fieldset>
  </div>;
}
function Rubans({instance,etat,attente,surGeste}:ProprietesAteliersHorloge):ReactElement {
  if (instance.famille!=='MAT-HOR-02') throw new Error('Rubans attendus.');
  const p=instance.parametres;
  const [ruban,choisirRuban]=useState<'ruban-a'|'ruban-b'>('ruban-a');
  const positions=Array.from({length:9},(_,i)=>p.departMinutes+i*15).filter((v)=>v<24*60);
  const arrivees=Array.from({length:9},(_,i)=>p.departMinutes+(i+1)*15).filter((v)=>v<24*60);
  const finFrise=Math.max(p.departMinutes+120,...p.rubans.map((d,i)=>Number(etat.placements[i===0?'ruban-a':'ruban-b']??p.departMinutes)+d));
  const reperes=Array.from({length:(finFrise-p.departMinutes)/15+1},(_,i)=>p.departMinutes+i*15);
  return <div className="horloge-atelier" data-atelier={instance.famille}>
    <div className="horloge-frise">
      <div className="horloge-frise-interieur" style={{width:`${reperes.length*6}rem`}}>
        <div className="horloge-reperes" role="img" aria-label={`Frise partant de ${heure(p.departMinutes)}`}>{reperes.map((v)=><span key={v}><i/> {heure(v)}</span>)}</div>
        {p.rubans.map((d,i)=>{const depart=etat.placements[i===0?'ruban-a':'ruban-b'];return <div className="horloge-piste" key={i}>{typeof depart==='number'&&<div className={`horloge-ruban horloge-ruban--${i}`} role="img" aria-label={`Ruban ${i===0?'A':'B'}, de ${heure(depart)} à ${heure(depart+d)}, ${d} minutes`} style={{left:`${(depart-p.departMinutes)/15*6+3}rem`,width:`${d/15*6}rem`}}>{i===0?'A':'B'} · {d} min</div>}</div>;})}
      </div>
    </div>
    <fieldset><legend>Rubans à poser</legend><div className="horloge-choix">{p.rubans.map((d,i)=><button type="button" key={i} disabled={attente} aria-pressed={ruban===`ruban-${i===0?'a':'b'}`} onClick={()=>choisirRuban(i===0?'ruban-a':'ruban-b')}>Ruban {i===0?'A':'B'} · {d} min</button>)}</div></fieldset>
    <fieldset><legend>Choisis le départ du ruban {ruban==='ruban-a'?'A':'B'}</legend><div className="horloge-choix">{positions.map((v)=><button type="button" key={v} disabled={attente} aria-pressed={etat.placements[ruban]===v} onClick={()=>surGeste({type:'placer',objetId:ruban,position:v})}>{heure(v)}</button>)}</div></fieldset>
    <p>Ruban A : {etat.placements['ruban-a']===undefined?'à poser':heure(Number(etat.placements['ruban-a']))}{p.rubans.length===2&&<> · Ruban B : {etat.placements['ruban-b']===undefined?'à poser':heure(Number(etat.placements['ruban-b']))}</>}</p>
    <fieldset><legend>À quelle heure arrives-tu ?</legend><div className="horloge-choix">{arrivees.map((v)=><button type="button" key={v} disabled={attente} aria-pressed={etat.objets.arriveeMinutes===v} onClick={()=>surGeste({type:'choisir',objetId:`arrivee:${v}`})}>{heure(v)}</button>)}</div></fieldset>
    {p.comparerDeuxTrajets&&p.arriveeAlternativeMinutes!==null&&<fieldset><legend>Quel trajet arrive en premier ?</legend><div className="horloge-choix"><button type="button" disabled={attente} aria-pressed={etat.selection==='principal'} onClick={()=>surGeste({type:'choisir',objetId:'trajet:principal'})}>Mes rubans{typeof etat.objets.arriveeMinutes==='number'?` · arrivée choisie ${heure(etat.objets.arriveeMinutes)}`:''}</button><button type="button" disabled={attente} aria-pressed={etat.selection==='alternative'} onClick={()=>surGeste({type:'choisir',objetId:'trajet:alternative'})}>Autre trajet · arrivée {heure(p.arriveeAlternativeMinutes)}</button></div></fieldset>}
  </div>;
}
function Tableau({instance,etat,attente,surGeste}:ProprietesAteliersHorloge):ReactElement {
  if (instance.famille!=='MAT-HOR-03') throw new Error('Tableau attendu.');
  const p=instance.parametres;
  const [trajet,choisirTrajet]=useState<string|null>(null);
  return <div className="horloge-atelier" data-atelier={instance.famille}>
    <fieldset><legend>Trajets à classer</legend><div className="horloge-choix">{p.trajets.map((t)=><button type="button" key={t.id} disabled={attente} aria-pressed={trajet===t.id} onClick={()=>choisirTrajet(t.id)}>{t.destination} · départ {heure(t.departMinutes)} · arrivée {heure(t.arriveeMinutes)}</button>)}</div></fieldset>
    <div className="horloge-tableau-wrap"><table className="horloge-tableau"><caption>Destination × moment de la journée</caption><thead><tr><th scope="col">Destination</th>{p.moments.map((m)=><th key={m} scope="col">{nomMoment(m)}</th>)}</tr></thead><tbody>{p.destinations.map((d)=><tr key={d}><th scope="row">{d}</th>{p.moments.map((m)=>{const poses=p.trajets.filter((t)=>etat.placements[t.id]===`${d}|${m}`);return <td key={m}><button type="button" disabled={attente||trajet===null} aria-label={`${d}, ${nomMoment(m)}${poses.length?`, ${poses.map((t)=>t.id).join(', ')} posé`:''}`} onClick={()=>trajet&&surGeste({type:'placer',objetId:trajet,position:0,destination:`${d}|${m}`})}>{poses.length?poses.map((t)=>heure(t.departMinutes)).join(', '):'Placer'}</button></td>;})}</tr>)}</tbody></table></div>
    <fieldset><legend>Choisis un trajet qui arrive au plus tard à {heure(p.arriveeVoulueMinutes)}</legend><div className="horloge-choix">{p.trajets.map((t)=><button type="button" key={t.id} disabled={attente} aria-pressed={etat.selection===t.id} onClick={()=>surGeste({type:'choisir',objetId:t.id})}>{t.destination} · {heure(t.departMinutes)} → {heure(t.arriveeMinutes)}</button>)}</div></fieldset>
  </div>;
}
export function AteliersHorloge(proprietes:ProprietesAteliersHorloge):ReactElement {
  return <section className="ateliers-horloge" aria-label="Horloge des Voyages">{proprietes.instance.famille==='MAT-HOR-01'?<Cadran {...proprietes}/>:proprietes.instance.famille==='MAT-HOR-02'?<Rubans {...proprietes}/>:<Tableau {...proprietes}/>}</section>;
}
