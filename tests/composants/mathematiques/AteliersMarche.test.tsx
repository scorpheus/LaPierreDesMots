import { useState, type ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { creerAlea } from '@pierre/partage';
import type { EtatManipulationMaths, GesteMaths } from '@pierre/partage/mathematiques';
import { appliquerGesteMarche, genererMarche, validerMarche, type InstanceMarche } from '../../../partage/src/mathematiques/jeux/marche/index.js';
import { AteliersMarche } from '@client/mathematiques/lieux/AteliersMarche';

afterEach(()=>cleanup());
function monter(instance:InstanceMarche){
  let courant=instance.etatInitial;const gestes:GesteMaths[]=[];
  function Support():ReactElement {const [etat,fixerEtat]=useState<EtatManipulationMaths>(instance.etatInitial);courant=etat;
    return <AteliersMarche instance={instance} etat={etat} attente={false} surGeste={(g)=>{gestes.push(g);fixerEtat((avant)=>appliquerGesteMarche(instance,avant,g));}}/>;}
  render(<Support/>);return {lire:()=>courant,gestes};
}
describe('gestes du Marché des Échanges',()=>{
  it('sépare le choix d’une pièce, la caisse et le retrait',()=>{
    const instance=genererMarche('MAT-MAR-01','decouverte',creerAlea(1),{cibleCentimes:200});const jeu=monter(instance);
    fireEvent.click(screen.getByRole('button',{name:'2 €'}));
    expect(jeu.gestes).toHaveLength(0);
    fireEvent.click(screen.getByRole('button',{name:'Mettre dans la caisse'}));
    expect(validerMarche(instance,jeu.lire()).statut).toBe('correcte');
    fireEvent.click(within(screen.getByRole('region',{name:'Caisse'})).getByRole('button',{name:/Retirer 2 €/u}));
    expect(validerMarche(instance,jeu.lire()).statut).toBe('incomplete');
  });
  it('présente les trois plateaux et affiche le prix réel une seule fois, sans total vide à 0 €',()=>{
    const instance=genererMarche('MAT-MAR-02','decouverte',creerAlea(2),{prixCentimes:1700});monter(instance);
    expect(screen.getByRole('region',{name:'Donné'})).toBeTruthy();
    expect(screen.getByRole('region',{name:'Prix'})).toBeTruthy();
    expect(screen.getByRole('region',{name:'Rendu'})).toBeTruthy();
    const prix=screen.getByRole('region',{name:'Prix'});
    expect(prix.textContent).toContain('17 €');
    expect(prix.textContent).not.toContain('0 €');
    expect(screen.getAllByText('17 €')).toHaveLength(1);
  });
  it('déplace deux besoins vers le panier et affiche le reste en centimes',()=>{
    const instance=genererMarche('MAT-MAR-03','defi',creerAlea(3),{budgetCentimes:2000,coutPanierCentimes:1875});const jeu=monter(instance);
    fireEvent.click(screen.getByRole('button',{name:/^Pommes/u}));fireEvent.click(screen.getByRole('button',{name:/^Panier contenant/u}));fireEvent.click(screen.getByRole('button',{name:/^Jus/u}));
    expect(screen.getByText(/Reste :/u).textContent).toContain('1,25 €');
    expect(jeu.lire().placements['fruit-a']).toBe('panier');
    expect(validerMarche(instance,jeu.lire()).statut).toBe('incomplete');
  });
});
