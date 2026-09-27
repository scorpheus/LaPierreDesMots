import { describe,expect,it } from 'vitest';
import { creerAlea } from '../../../partage/src/alea.js';
import { appliquerGesteHorloge, combinaisonsCompatiblesHorloge, construireTemoinHorloge, creerProjetHorloge, genererHorloge, proposerAideHorloge, validerHorloge } from '../../../partage/src/mathematiques/jeux/horloge/index.js';

describe('Horloge des Voyages',()=>{
  it('change réellement les horaires des trajets libres selon la graine',()=>{
    for(const niveau of ['decouverte','exploration','defi'] as const) {
      const horaires=new Set(Array.from({length:32},(_,graine)=>
        genererHorloge('MAT-HOR-03',niveau,creerAlea(graine)).signature));
      expect(horaires.size).toBeGreaterThan(5);
    }
  });
  it('génère neuf domaines solubles et déterministes',()=>{
    for(const famille of ['MAT-HOR-01','MAT-HOR-02','MAT-HOR-03'] as const) for(const niveau of ['decouverte','exploration','defi'] as const) for(let graine=0;graine<16;graine++){
      const instance=genererHorloge(famille,niveau,creerAlea(graine));
      expect(instance).toEqual(genererHorloge(famille,niveau,creerAlea(graine)));
      expect(validerHorloge(instance,construireTemoinHorloge(instance)).statut).toBe('correcte');
    }
  });
  it('refuse un cadran qui montre 2 h 15 sans après-midi pour 14 h 15',()=>{
    const instance=genererHorloge('MAT-HOR-01','defi',creerAlea(1),{arriveeMinutes:14*60+15});
    const bon=construireTemoinHorloge(instance);
    expect(bon.placements['aiguille-heures']).toBe(2);
    expect(bon.placements['aiguille-minutes']).toBe(15);
    expect(validerHorloge(instance,{...bon,selection:'matin'}).statut).toBe('incorrecte');
    expect(validerHorloge(instance,bon).statut).toBe('correcte');
  });
  it('accepte les deux ordres de rubans et refuse une jonction trouée',()=>{
    const instance=genererHorloge('MAT-HOR-02','exploration',creerAlea(2),{departMinutes:8*60+30,dureeMinutes:45});
    const bon=construireTemoinHorloge(instance);
    const inverse={...bon,placements:{'ruban-b':8*60+30,'ruban-a':8*60+30+instance.parametres.rubans[1]!}};
    expect(validerHorloge(instance,inverse).statut).toBe('correcte');
    expect(validerHorloge(instance,{...bon,placements:{...bon.placements,'ruban-b':9*60+15}}).statut).toBe('incorrecte');
    expect(bon.objets.arriveeMinutes).toBe(9*60+15);
  });
  it('garde la durée Découverte à un seul ruban de 15 ou 30 minutes',()=>{
    const instance=genererHorloge('MAT-HOR-02','decouverte',creerAlea(2),{departMinutes:8*60,dureeMinutes:30});
    expect(instance.parametres.rubans).toEqual([30]);
    const quart=genererHorloge('MAT-HOR-02','decouverte',creerAlea(2),{departMinutes:8*60,dureeMinutes:15});
    expect(quart.parametres.rubans).toEqual([15]);
    expect(validerHorloge(quart,construireTemoinHorloge(quart)).statut).toBe('correcte');
    expect(()=>genererHorloge('MAT-HOR-02','decouverte',creerAlea(2),{departMinutes:8*60,dureeMinutes:60})).toThrow('Durée incompatible');
  });
  it('borne les rubans Exploration à 15/30 et Défi à 15/30/60',()=>{
    for(const niveau of ['exploration','defi'] as const) for(let graine=0;graine<32;graine++){
      const instance=genererHorloge('MAT-HOR-02',niveau,creerAlea(graine));
      expect(instance.parametres.rubans).toHaveLength(2);
      expect(instance.parametres.rubans.every((v)=>niveau==='exploration'?[15,30].includes(v):[15,30,60].includes(v))).toBe(true);
      expect(instance.parametres.rubans.reduce((a,b)=>a+b,0)).toBe(instance.parametres.arriveeMinutes-instance.parametres.departMinutes);
    }
    expect(()=>genererHorloge('MAT-HOR-02','exploration',creerAlea(1),{departMinutes:8*60,dureeMinutes:75})).toThrow('Durée incompatible');
    expect(()=>genererHorloge('MAT-HOR-02','defi',creerAlea(1),{departMinutes:8*60,dureeMinutes:105})).toThrow('Durée incompatible');
  });
  it('vérifie les deux critères du tableau et une arrivée chronologique compatible',()=>{
    const instance=genererHorloge('MAT-HOR-03','defi',creerAlea(4));
    const bon=construireTemoinHorloge(instance);
    const premier=instance.parametres.trajets[0]!;
    const mauvaisMoment=premier.moment==='soir'?'matin':'soir';
    expect(validerHorloge(instance,{...bon,placements:{...bon.placements,[premier.id]:`${premier.destination}|${mauvaisMoment}`}}).statut).toBe('incorrecte');
    const tard=instance.parametres.trajets.find((t)=>t.arriveeMinutes>instance.parametres.arriveeVoulueMinutes);
    if(tard) expect(validerHorloge(instance,{...bon,selection:tard.id}).statut).toBe('incorrecte');
  });
  it('propage départ, durée et arrivée selon les trois trames et niveaux indépendants',()=>{
    for(const id of ['MAT-HOR-P01','MAT-HOR-P02','MAT-HOR-P03'] as const) for(const niveau of ['decouverte','exploration','defi'] as const){
      if(id!=='MAT-HOR-P01'&&niveau==='decouverte') {
        expect(()=>creerProjetHorloge(id,[niveau,niveau,niveau],creerAlea(7),`session-${id}-${niveau}`)).toThrow('cadran final Découverte');
        continue;
      }
      const {projet,instances}=creerProjetHorloge(id,[niveau,niveau,niveau],creerAlea(7),`session-${id}-${niveau}`);
      expect(projet.variables.arriveeMinutes).toBe(projet.variables.departMinutes+projet.variables.dureeMinutes);
      expect(instances.every((i,n)=>i.id===projet.plan[n]?.instanceId&&i.projet?.variables===projet.variables)).toBe(true);
      expect(instances.every((i)=>validerHorloge(i,construireTemoinHorloge(i)).statut==='correcte')).toBe(true);
      expect(projet.cadeauType).toBe(id==='MAT-HOR-P02'?null:id==='MAT-HOR-P03'?'objet':'souvenir');
    }
  });
  it('adapte les projets mixtes seulement lorsque leurs niveaux permettent une arrivée entière',()=>{
    expect(combinaisonsCompatiblesHorloge('MAT-HOR-P01')).toHaveLength(27);
    expect(combinaisonsCompatiblesHorloge('MAT-HOR-P02')).toHaveLength(24);
    expect(combinaisonsCompatiblesHorloge('MAT-HOR-P03')).toHaveLength(24);
    const {instances}=creerProjetHorloge('MAT-HOR-P02',['decouverte','exploration','decouverte'],creerAlea(3),'mixte-compatible');
    expect(instances[1].famille).toBe('MAT-HOR-02');
    if(instances[1].famille==='MAT-HOR-02') expect(instances[1].parametres.rubans).toEqual([30,30]);
    expect(()=>creerProjetHorloge('MAT-HOR-P02',['defi','decouverte','decouverte'],creerAlea(3),'mixte-incompatible')).toThrow('rubans Découverte de 15 ou 30 minutes');
  });
  it('annule un geste et propose une aide sans déplacer les objets',()=>{
    const instance=genererHorloge('MAT-HOR-01','decouverte',creerAlea(1));
    const etat=appliquerGesteHorloge(instance,instance.etatInitial,{type:'placer',objetId:'aiguille-heures',position:3});
    expect(appliquerGesteHorloge(instance,etat,{type:'annuler'})).toEqual(instance.etatInitial);
    const copie=structuredClone(instance);
    expect(proposerAideHorloge(instance,3,'aucune',instance.etatInitial).gestePropose).not.toBeNull();
    expect(instance).toEqual(copie);
  });
});
