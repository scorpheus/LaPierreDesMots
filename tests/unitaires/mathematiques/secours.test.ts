import { describe, expect, it } from 'vitest';
import { appliquerGesteMaths, CATALOGUE_MATHS, choisirInstanceMaths, creerInstanceMaths, estInstanceMaths, proposerAideMaths, validerMaths, type CreerPartieMaths } from '../../../partage/src/mathematiques/index.js';
import { couvertureSecoursMaths, graineSecoursMaths } from '../../../partage/src/mathematiques/secours.js';

describe('instances maths de secours', () => {
  it('référence exactement un couple éditorial par famille et niveau', () => {
    const couverture = couvertureSecoursMaths();
    expect(couverture).toHaveLength(54);
    expect(new Set(couverture)).toHaveLength(54);
    for (const famille of CATALOGUE_MATHS) for (const niveau of ['decouverte', 'exploration', 'defi'] as const) {
      const instance = creerInstanceMaths({ profilId: 'secours', generationMaths: 0, cleGeste: 'secours', famille: famille.id, niveau,
        graine: graineSecoursMaths(famille.id, niveau) });
      expect(estInstanceMaths(instance)).toBe(true);
      expect(instance.famille).toBe(famille.id);
      expect(instance.niveau).toBe(niveau);
    }
  });
  it('ne transforme pas une commande malformée en secours', () => {
    expect(() => creerInstanceMaths({ profilId: 'secours', generationMaths: 0, cleGeste: 'secours', famille: 'MAT-PON-01', niveau: 'defi', graine: -1 })).toThrow();
    expect(() => creerInstanceMaths({ profilId: 'secours', generationMaths: 0, cleGeste: 'secours', famille: 'inconnue' as never, niveau: 'defi', graine: 1 })).toThrow();
  });
  it('revient à la vraie graine de secours après douze rejets internes, puis reste jouable', () => {
    const commande = { profilId: 'secours', generationMaths: 0, cleGeste: 'secours', famille: 'MAT-PON-01' as const, niveau: 'decouverte' as const, graine: 77 };
    const graine = graineSecoursMaths(commande.famille, commande.niveau);
    let appels = 0;
    const generer = (demande: CreerPartieMaths) => {
      appels += 1;
      if (demande.graine !== graine) throw new Error('rejet interne');
      return creerInstanceMaths(demande);
    };
    const instance = choisirInstanceMaths(commande, [], generer);
    expect(appels).toBe(13);
    expect(instance.graine).toBe(graine);
    let etat = instance.etatInitial;
    for (let rang = 0; rang < 64 && validerMaths(instance, etat).statut !== 'correcte'; rang += 1) {
      const geste = proposerAideMaths(instance, 'demonstration', etat).gestePropose;
      if (geste === null) break;
      etat = appliquerGesteMaths(instance, etat, geste);
    }
    expect(validerMaths(instance, etat).statut).toBe('correcte');
  });
  it('garde le dernier candidat valide même s’il est récent et explique l’échec du secours', () => {
    const commande = { profilId: 'secours', generationMaths: 0, cleGeste: 'secours', famille: 'MAT-PON-01' as const, niveau: 'decouverte' as const, graine: 77 };
    const valide = creerInstanceMaths({ ...commande, graine: 1 });
    const dernier = choisirInstanceMaths(commande, [valide.signature], () => valide);
    expect(dernier).toBe(valide);
    expect(() => choisirInstanceMaths(commande, [], () => { throw new Error('rejet interne'); })).toThrow('secours maths');
  });
});
