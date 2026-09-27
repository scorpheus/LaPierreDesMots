import { describe,expect,it } from 'vitest';
import { creerAlea } from '../../../partage/src/alea.js';
import { appliquerGesteMarche, combinaisonsCompatiblesMarche, construireTemoinMarche, creerProjetMarche, genererMarche, proposerAideMarche, validerMarche } from '../../../partage/src/mathematiques/jeux/marche/index.js';

describe('Marché des Échanges',()=>{
  it('guide chaque famille et niveau jusqu’à une vraie réussite après des gestes persistés',()=>{
    for(const famille of ['MAT-MAR-01','MAT-MAR-02','MAT-MAR-03'] as const)
      for(const niveau of ['decouverte','exploration','defi'] as const) for(const graine of [0,1,2]) {
        const instance=genererMarche(famille,niveau,creerAlea(graine));
        let etat=instance.etatInitial;
        for(let rang=0;rang<128&&validerMarche(instance,etat).statut!=='correcte';rang++) {
          const geste=proposerAideMarche(instance,0,'demonstration',etat).gestePropose;
          if(!geste) break;
          etat=JSON.parse(JSON.stringify(appliquerGesteMarche(instance,etat,geste)));
        }
        expect(validerMarche(instance,etat).statut,`${famille}/${niveau}/${graine}`).toBe('correcte');
      }
  });
  it('garde une vente soluble à la borne de 20 euros en Défi',()=>{
    for(const prixCentimes of [1900,1975,2000]) {
      const instance=genererMarche('MAT-MAR-02','defi',creerAlea(1),{prixCentimes});
      expect(instance.parametres.donneMinimumCentimes).toBeLessThanOrEqual(2000);
      expect(validerMarche(instance,construireTemoinMarche(instance)).statut).toBe('correcte');
    }
  });
  it('génère les trois familles et niveaux de manière stable, soluble, en centimes entiers',()=>{
    for(const famille of ['MAT-MAR-01','MAT-MAR-02','MAT-MAR-03'] as const) for(const niveau of ['decouverte','exploration','defi'] as const) for(let graine=0;graine<16;graine++){
      const instance=genererMarche(famille,niveau,creerAlea(graine));
      expect(instance).toEqual(genererMarche(famille,niveau,creerAlea(graine)));
      expect(validerMarche(instance,construireTemoinMarche(instance)).statut).toBe('correcte');
      if(instance.famille==='MAT-MAR-01') expect(Number.isSafeInteger(instance.parametres.cibleCentimes)).toBe(true);
      if(instance.famille==='MAT-MAR-02') expect(Number.isSafeInteger(instance.parametres.prixCentimes)).toBe(true);
      if(instance.famille==='MAT-MAR-03') expect(instance.parametres.articles.every((a)=>Number.isSafeInteger(a.prixCentimes))).toBe(true);
    }
  });
  it('additionne la valeur de la caisse et impose un échange sans perte',()=>{
    const instance=genererMarche('MAT-MAR-01','exploration',creerAlea(7),{cibleCentimes:1200});
    let etat=instance.etatInitial;
    for(const p of instance.parametres.pieces.filter((p)=>p.centimes===100).slice(0,10)) etat=appliquerGesteMarche(instance,etat,{type:'placer',objetId:p.id,position:0,destination:'caisse'});
    const deux=instance.parametres.pieces.find((p)=>p.centimes===200)!;
    etat=appliquerGesteMarche(instance,etat,{type:'placer',objetId:deux.id,position:0,destination:'caisse'});
    expect(validerMarche(instance,etat).statut).toBe('incomplete');
    const avant=structuredClone(etat);
    etat=appliquerGesteMarche(instance,etat,{type:'choisir',objetId:'echanger'});
    expect(validerMarche(instance,etat).statut).toBe('correcte');
    expect(appliquerGesteMarche(instance,etat,{type:'annuler'})).toEqual(avant);
  });
  it('garde les pièces de Découverte et convertit cent centimes en Défi',()=>{
    const debut=genererMarche('MAT-MAR-01','decouverte',creerAlea(1));
    expect([...new Set(debut.parametres.pieces.map((p)=>p.centimes))].sort((a,b)=>a-b)).toEqual([100,200,1000]);
    const defi=genererMarche('MAT-MAR-01','defi',creerAlea(2),{cibleCentimes:1025});
    let etat=defi.etatInitial;
    for(const p of defi.parametres.pieces.filter((p)=>p.centimes===50).slice(0,2)) etat=appliquerGesteMarche(defi,etat,{type:'placer',objetId:p.id,position:0,destination:'caisse'});
    etat=appliquerGesteMarche(defi,etat,{type:'choisir',objetId:'convertir-centimes'});
    expect(etat.objets.conversionCentimesEffectuee).toBe(true);
    expect(Object.keys(etat.placements).map((id)=>defi.parametres.pieces.find((p)=>p.id===id)?.centimes)).toEqual([100]);
  });
  it('refuse un rendu arithmétiquement faux même si le nombre de pièces paraît bon',()=>{
    const instance=genererMarche('MAT-MAR-02','decouverte',creerAlea(1),{prixCentimes:1700});
    expect(instance.parametres.donneMinimumCentimes).toBe(2000);
    let etat=appliquerGesteMarche(instance,instance.etatInitial,{type:'placer',objetId:instance.parametres.pieces.find((p)=>p.centimes===1000)!.id,position:0,destination:'donne'});
    const autre=instance.parametres.pieces.filter((p)=>p.centimes===1000)[1]!;
    etat=appliquerGesteMarche(instance,etat,{type:'placer',objetId:autre.id,position:0,destination:'donne'});
    const faux=appliquerGesteMarche(instance,etat,{type:'placer',objetId:instance.parametres.pieces.find((p)=>p.centimes===200)!.id,position:0,destination:'rendu'});
    expect(validerMarche(instance,faux).statut).toBe('incorrecte');
    const bon=appliquerGesteMarche(instance,faux,{type:'placer',objetId:instance.parametres.pieces.find((p)=>p.centimes===100)!.id,position:0,destination:'rendu'});
    expect(validerMarche(instance,bon).statut).toBe('correcte');
  });
  it('exige les besoins et deux paniers distincts en défi',()=>{
    const instance=genererMarche('MAT-MAR-03','defi',creerAlea(3));
    let etat=instance.etatInitial;
    for(const id of ['fruit-a','outil-a']) etat=appliquerGesteMarche(instance,etat,{type:'placer',objetId:id,position:0,destination:'panier'});
    expect(validerMarche(instance,etat).statut).toBe('incorrecte');
    etat=appliquerGesteMarche(instance,etat,{type:'placer',objetId:'boisson-a',position:0,destination:'panier'});
    expect(validerMarche(instance,etat).statut).toBe('incomplete');
    etat=appliquerGesteMarche(instance,etat,{type:'choisir',objetId:'memoriser'});
    for(const id of ['fruit-a','outil-a','boisson-a']) etat=appliquerGesteMarche(instance,etat,{type:'placer',objetId:id,position:0,destination:'panier'});
    expect(validerMarche(instance,etat).statut).toBe('incorrecte');
    etat=appliquerGesteMarche(instance,etat,{type:'retirer',objetId:'fruit-a'});
    etat=appliquerGesteMarche(instance,etat,{type:'placer',objetId:'fruit-b',position:0,destination:'panier'});
    expect(validerMarche(instance,etat).statut).toBe('incomplete');
    etat=appliquerGesteMarche(instance,etat,{type:'choisir',objetId:'comparaison:second'});
    expect(validerMarche(instance,etat).statut).toBe('correcte');
  });
  it('présente trois articles en Découverte et trois besoins en Exploration',()=>{
    const debut=genererMarche('MAT-MAR-03','decouverte',creerAlea(3));
    const suite=genererMarche('MAT-MAR-03','exploration',creerAlea(3));
    expect(debut.parametres.articles).toHaveLength(3);
    expect(debut.parametres.besoins).toEqual(['fruit','outil']);
    expect(suite.parametres.besoins).toEqual(['fruit','outil','boisson']);
    expect(validerMarche(suite,{...construireTemoinMarche(suite),placements:{'fruit-a':'panier','outil-a':'panier'}}).statut).toBe('incorrecte');
  });
  it('en Défi, garde la première transaction et exige une autre décomposition de même rendu',()=>{
    const instance=genererMarche('MAT-MAR-02','defi',creerAlea(4),{prixCentimes:1700});
    const premiere=construireTemoinMarche(instance);
    const memorisee=appliquerGesteMarche(instance,premiere,{type:'choisir',objetId:'memoriser'});
    expect(memorisee.objets.premiereTransaction).toBeTypeOf('string');
    let identique=memorisee;
    for(const [id,destination] of Object.entries(premiere.placements)) identique=appliquerGesteMarche(instance,identique,{type:'placer',objetId:id,position:0,destination:String(destination)});
    expect(validerMarche(instance,identique).statut).toBe('incorrecte');
    const deux=Object.entries(identique.placements).find(([id,destination])=>destination==='donne'&&instance.parametres.pieces.find((p)=>p.id===id)?.centimes===200)![0];
    let autre=appliquerGesteMarche(instance,identique,{type:'retirer',objetId:deux});
    const libres=instance.parametres.pieces.filter((p)=>p.centimes===100&&!(p.id in autre.placements)).slice(0,2);
    for(const p of libres) autre=appliquerGesteMarche(instance,autre,{type:'placer',objetId:p.id,position:0,destination:'donne'});
    expect(validerMarche(instance,autre).statut).toBe('correcte');
  });
  it('transmet capital, panier et solde dans les trois projets sans cadeau intermédiaire',()=>{
    for(const id of ['MAT-MAR-P01','MAT-MAR-P02','MAT-MAR-P03'] as const) for(const niveau of ['decouverte','exploration','defi'] as const){
      const {projet,instances}=creerProjetMarche(id,[niveau,niveau,niveau],creerAlea(5),`session-${id}-${niveau}`);
      expect(instances.map((i)=>i.famille)).toEqual(id==='MAT-MAR-P02'?['MAT-MAR-03','MAT-MAR-01','MAT-MAR-02']:['MAT-MAR-01','MAT-MAR-03','MAT-MAR-02']);
      expect(instances.every((i,n)=>i.id===projet.plan[n]?.instanceId&&i.projet?.variables===projet.variables)).toBe(true);
      expect(instances.every((i)=>validerMarche(i,construireTemoinMarche(i)).statut==='correcte')).toBe(true);
      const caisse=instances.find((i)=>i.famille==='MAT-MAR-01');
      const panier=instances.find((i)=>i.famille==='MAT-MAR-03');
      const rendu=instances.find((i)=>i.famille==='MAT-MAR-02');
      if(caisse?.famille==='MAT-MAR-01'&&panier?.famille==='MAT-MAR-03'&&rendu?.famille==='MAT-MAR-02') {
        expect(caisse.parametres.cibleCentimes).toBe(panier.parametres.budgetCentimes);
        const prixTransmis=id==='MAT-MAR-P01'?projet.variables.depenseCentimes:id==='MAT-MAR-P02'?projet.variables.panierCentimes:projet.variables.capitalCentimes!-projet.variables.soldeCentimes!;
        expect(rendu.parametres.prixCentimes).toBe(prixTransmis);
      }
      expect(projet.cadeauType).toBe(id==='MAT-MAR-P02'?null:id==='MAT-MAR-P03'?'objet':'souvenir');
    }
  });
  it('nomme les incompatibilités mixtes qui casseraient la transmission des centimes',()=>{
    expect(combinaisonsCompatiblesMarche('MAT-MAR-P01')).toHaveLength(21);
    expect(combinaisonsCompatiblesMarche('MAT-MAR-P02')).toHaveLength(19);
    expect(combinaisonsCompatiblesMarche('MAT-MAR-P03')).toHaveLength(21);
    expect(()=>creerProjetMarche('MAT-MAR-P01',['decouverte','exploration','defi'],creerAlea(1),'mixte')).toThrow('rendu en centimes exige un panier Défi');
    expect(()=>creerProjetMarche('MAT-MAR-P02',['defi','exploration','defi'],creerAlea(1),'mixte')).toThrow('payer un panier en centimes exige une caisse Défi');
  });
  it('garde l’aide gratuite et un témoin distinct de l’état de l’enfant',()=>{
    const instance=genererMarche('MAT-MAR-03','decouverte',creerAlea(2));const copie=structuredClone(instance);
    expect(proposerAideMarche(instance,3,'aucune',instance.etatInitial).gestePropose).not.toBeNull();
    expect(instance).toEqual(copie);
  });
});
