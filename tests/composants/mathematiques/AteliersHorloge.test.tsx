import { useState, type ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { creerAlea } from '@pierre/partage';
import type { EtatManipulationMaths, GesteMaths } from '@pierre/partage/mathematiques';
import { appliquerGesteHorloge, genererHorloge, validerHorloge, type InstanceHorloge } from '../../../partage/src/mathematiques/jeux/horloge/index.js';
import { AteliersHorloge } from '@client/mathematiques/lieux/AteliersHorloge';

afterEach(()=>cleanup());
function monter(instance:InstanceHorloge){let courant=instance.etatInitial;const gestes:GesteMaths[]=[];
  function Support():ReactElement {const [etat,fixerEtat]=useState<EtatManipulationMaths>(instance.etatInitial);courant=etat;
    return <AteliersHorloge instance={instance} etat={etat} attente={false} surGeste={(g)=>{gestes.push(g);fixerEtat((avant)=>appliquerGesteHorloge(instance,avant,g));}}/>;}
  render(<Support/>);return {lire:()=>courant,gestes};}
describe('gestes de l’Horloge des Voyages',()=>{
  it('attend la pose de chaque aiguille sans afficher une heure inventée',()=>{
    const instance=genererHorloge('MAT-HOR-01','decouverte',creerAlea(1));monter(instance);
    const cadran=screen.getByRole('img',{name:'Cadran : deux aiguilles à poser'});
    expect(cadran.querySelectorAll('[data-aiguille]')).toHaveLength(0);
    fireEvent.click(within(screen.getByRole('group',{name:/Petite aiguille/u})).getByRole('button',{name:'2'}));
    expect(cadran.querySelectorAll('[data-aiguille]')).toHaveLength(1);
    expect(cadran.getAttribute('aria-label')).toBe('Cadran : grande aiguille à poser');
  });
  it('bouge deux vraies aiguilles puis demande le contexte après-midi',()=>{
    const instance=genererHorloge('MAT-HOR-01','defi',creerAlea(1),{arriveeMinutes:14*60+15});const jeu=monter(instance);
    expect(screen.getByRole('img',{name:/Cadran/u})).toBeTruthy();
    fireEvent.click(within(screen.getByRole('group',{name:/Petite aiguille/u})).getByRole('button',{name:'2'}));
    fireEvent.click(within(screen.getByRole('group',{name:/Grande aiguille/u})).getByRole('button',{name:'15'}));
    fireEvent.click(within(screen.getByRole('group',{name:'Moment de la journée'})).getByRole('button',{name:'matin'}));
    expect(validerHorloge(instance,jeu.lire()).statut).toBe('incorrecte');
    fireEvent.click(within(screen.getByRole('group',{name:'Moment de la journée'})).getByRole('button',{name:'après-midi'}));
    expect(validerHorloge(instance,jeu.lire()).statut).toBe('correcte');
  });
  it('place les rubans à la suite depuis la frise',()=>{
    const instance=genererHorloge('MAT-HOR-02','exploration',creerAlea(2),{departMinutes:480,dureeMinutes:45});const jeu=monter(instance);
    fireEvent.click(within(screen.getByRole('group',{name:/Choisis le départ du ruban A/u})).getByRole('button',{name:'08 h 00'}));
    const dureeA=instance.parametres.rubans[0]!;
    expect(screen.getByRole('img',{name:`Ruban A, de 08 h 00 à 08 h ${dureeA}, ${dureeA} minutes`})).toBeTruthy();
    fireEvent.click(within(screen.getByRole('group',{name:'Rubans à poser'})).getByRole('button',{name:/Ruban B/u}));
    const departB=480+instance.parametres.rubans[0]!;
    fireEvent.click(within(screen.getByRole('group',{name:/Choisis le départ du ruban B/u})).getByRole('button',{name:`08 h ${String(departB-480).padStart(2,'0')}`}));
    fireEvent.click(within(screen.getByRole('group',{name:/À quelle heure arrives-tu/u})).getByRole('button',{name:'08 h 45'}));
    expect(validerHorloge(instance,jeu.lire()).statut).toBe('correcte');
  });
  it('affiche un vrai tableau à lignes destination et colonnes moment',()=>{
    const instance=genererHorloge('MAT-HOR-03','decouverte',creerAlea(3));monter(instance);
    const tableau=screen.getByRole('table',{name:'Destination × moment de la journée'});
    expect(within(tableau).getByRole('columnheader',{name:'matin'})).toBeTruthy();
    expect(within(tableau).getByRole('rowheader',{name:'Jardin'})).toBeTruthy();
    expect(within(tableau).getByRole('button',{name:/Jardin, matin/u})).toBeTruthy();
  });
});
