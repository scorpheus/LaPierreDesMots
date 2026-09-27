import { useState, type ReactElement } from 'react';
import type { EtatManipulationMaths, GesteMaths } from '@pierre/partage/mathematiques';
import type { InstanceMarche, PieceMarche } from '../../../../partage/src/mathematiques/jeux/marche/index.js';
import './ateliers-marche.css';

export interface ProprietesAteliersMarche { readonly instance:InstanceMarche; readonly etat:EtatManipulationMaths; readonly attente:boolean; readonly surGeste:(geste:GesteMaths)=>void }
function monnaie(centimes:number):string { return `${(centimes/100).toFixed(centimes%100===0?0:2).replace('.',',')} €`; }
function somme(ids:readonly string[],pieces:readonly PieceMarche[]):number { return ids.reduce((total,id)=>total+(pieces.find((p)=>p.id===id)?.centimes??0),0); }
function plateau(nom:string,destination:string,pieces:readonly PieceMarche[],etat:EtatManipulationMaths,attente:boolean,surGeste:(g:GesteMaths)=>void):ReactElement {
  const ids=Object.entries(etat.placements).filter(([,place])=>place===destination).map(([id])=>id);
  return <section className="marche-plateau" aria-label={nom} data-plateau={destination}><h3>{nom}</h3><strong>{monnaie(somme(ids,pieces))}</strong><div className="marche-jetons">
    {ids.map((id)=><button type="button" key={id} disabled={attente} onClick={()=>surGeste({type:'retirer',objetId:id})} aria-label={`Retirer ${pieces.find((p)=>p.id===id)?.etiquette??id} du plateau ${nom}`}>{pieces.find((p)=>p.id===id)?.etiquette}</button>)}
  </div></section>;
}
function nomBesoin(besoin:string):string { return besoin === 'outil' ? 'contenant' : besoin; }
function Monnaie({instance,etat,attente,surGeste}:ProprietesAteliersMarche):ReactElement {
  const [valeur,choisirValeur]=useState<number|null>(null);
  if (instance.famille==='MAT-MAR-03') throw new Error('Monnaie attend une activité de pièces.');
  const pieces=instance.parametres.pieces;
  const valeurs=[...new Set(pieces.map((p)=>p.centimes))];
  const ajouter=(destination:string)=>{
    if (valeur===null) return;
    const libre=pieces.find((p)=>p.centimes===valeur&&!(p.id in etat.placements));
    if (libre) surGeste({type:'placer',objetId:libre.id,position:0,destination});
  };
  const disponibles=(valeurPiece:number)=>pieces.filter((piece)=>piece.centimes===valeurPiece&&!(piece.id in etat.placements)).length;
  return <div className="marche-atelier" data-atelier={instance.famille}>
    <div className="marche-consigne"><h2>{instance.famille==='MAT-MAR-01'?'Former la caisse':'Rendre la monnaie'}</h2></div>
    <fieldset><legend>Choisis une pièce ou un billet</legend><div className="marche-choix">
      {valeurs.map((v)=>{ const nombre=disponibles(v); const etiquette=pieces.find((p)=>p.centimes===v)!.etiquette; return <button type="button" key={v} disabled={attente||nombre===0} aria-label={etiquette} aria-pressed={valeur===v} onClick={()=>choisirValeur(v)}><span aria-hidden="true">{etiquette}</span><small aria-hidden="true">{nombre} disponible{nombre>1?'s':''}</small></button>; })}
    </div>{instance.famille==='MAT-MAR-01'?<p className="marche-reserve">Réserve réelle : une valeur épuisée devient grisée.</p>:null}</fieldset>
    <div className="marche-plateaux">
      {instance.famille==='MAT-MAR-01' ? <>{plateau('Caisse','caisse',pieces,etat,attente,surGeste)}<button type="button" disabled={attente||valeur===null} onClick={()=>ajouter('caisse')}>Mettre dans la caisse</button></>
        : <>{plateau('Donné','donne',pieces,etat,attente,surGeste)}<section className="marche-plateau" aria-label="Prix" data-plateau="prix"><h3>Prix</h3><strong>{monnaie(instance.parametres.prixCentimes)}</strong></section>{plateau('Rendu','rendu',pieces,etat,attente,surGeste)}<button type="button" disabled={attente||valeur===null} onClick={()=>ajouter('donne')}>Ajouter au donné</button><button type="button" disabled={attente||valeur===null} onClick={()=>ajouter('rendu')}>Ajouter au rendu</button></>}
    </div>
    {instance.famille==='MAT-MAR-01'&&instance.parametres.echangeRequis&&<button type="button" disabled={attente} onClick={()=>surGeste({type:'choisir',objetId:'echanger'})}>Échanger dix pièces de 1 € contre un billet de 10 €</button>}
    {instance.famille==='MAT-MAR-01'&&instance.parametres.conversionCentimesRequise&&<button type="button" disabled={attente} onClick={()=>surGeste({type:'choisir',objetId:'convertir-centimes'})}>Échanger deux pièces de 50 c contre 1 €</button>}
    {instance.famille==='MAT-MAR-01'&&instance.parametres.deuxCompositions&&<button type="button" disabled={attente} onClick={()=>surGeste({type:'choisir',objetId:'memoriser'})}>Mémoriser ma première façon</button>}
    {instance.famille==='MAT-MAR-02'&&instance.parametres.deuxStrategies&&<button type="button" disabled={attente} onClick={()=>surGeste({type:'choisir',objetId:'memoriser'})}>Mémoriser ma première façon de payer et rendre</button>}
    {etat.objets.echangeEffectue===true&&<p>Échange fait : la valeur reste la même.</p>}
    {etat.objets.conversionCentimesEffectuee===true&&<p>100 centimes valent 1 €.</p>}
    {typeof etat.objets.premiereTransaction==='string'&&<p>Première façon gardée. Essaie une autre composition.</p>}
  </div>;
}
function Paniers({instance,etat,attente,surGeste}:ProprietesAteliersMarche):ReactElement {
  if (instance.famille!=='MAT-MAR-03') throw new Error('Le panier attend des articles.');
  const articles=instance.parametres.articles;
  const choisis=articles.filter((a)=>etat.placements[a.id]==='panier');
  const cout=choisis.reduce((s,a)=>s+a.prixCentimes,0);
  const reste=instance.parametres.budgetCentimes-cout;
  return <div className="marche-atelier" data-atelier={instance.famille}>
    <div className="marche-consigne"><h2>Préparer mes achats</h2></div>
    <p className="marche-budget">Budget : {monnaie(instance.parametres.budgetCentimes)} · {reste>=0?`Reste : ${monnaie(reste)}`:`Il manque ${monnaie(-reste)}`}</p>
    <div className="marche-articles">{articles.map((a)=><button type="button" key={a.id} disabled={attente} aria-pressed={etat.placements[a.id]==='panier'} onClick={()=>surGeste(etat.placements[a.id]==='panier'?{type:'retirer',objetId:a.id}:{type:'placer',objetId:a.id,position:0,destination:'panier'})}>
      <span>{a.nom}</span><small>{nomBesoin(a.besoin)} · {monnaie(a.prixCentimes)}</small>
    </button>)}</div>
    <section className="marche-plateau" aria-label="Mes achats"><h3>Mes achats</h3><p>{choisis.length?choisis.map((a)=>a.nom).join(', '):'Choisis tes articles.'}</p><strong>{monnaie(cout)}</strong></section>
    {instance.parametres.deuxPaniers&&<button type="button" disabled={attente} onClick={()=>surGeste({type:'choisir',objetId:'memoriser'})}>Mémoriser ce panier et en essayer un autre</button>}
    {typeof etat.objets.premierPanier==='string'&&<p>Premier panier gardé. Compose une autre solution.</p>}
    {typeof etat.objets.premierPanier==='string'&&<fieldset><legend>Après l’achat, quel panier laisse le plus d’argent ?</legend><div className="marche-choix">{[['premier','Premier panier'],['second','Second panier'],['egal','Même reste']] .map(([valeur,nom])=><button type="button" key={valeur} disabled={attente} aria-pressed={etat.objets.comparaisonReste===valeur} onClick={()=>surGeste({type:'choisir',objetId:`comparaison:${valeur}`})}>{nom}</button>)}</div></fieldset>}
  </div>;
}
export function AteliersMarche(proprietes:ProprietesAteliersMarche):ReactElement {
  return <section className="ateliers-marche" aria-label="Marché des Échanges">{proprietes.instance.famille==='MAT-MAR-03'?<Paniers {...proprietes}/>:<Monnaie {...proprietes}/>}</section>;
}
