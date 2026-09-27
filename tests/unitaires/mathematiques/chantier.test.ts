import { describe, expect, it } from 'vitest';
import { creerAlea } from '../../../partage/src/alea.js';
import {
  appliquerGesteChantier, COMBINAISONS_CHANTIER, construireTemoinChantier,
  creerProjetChantier, estInstanceChantier, genererChantier, PATRONS_CUBE_V1,
  prochainGesteChantier, proposerAideChantier, validerChantier,
} from '../../../partage/src/mathematiques/jeux/chantier/index.js';
import type { EtatManipulationMaths, NiveauMaths } from '../../../partage/src/mathematiques/types.js';

const NIVEAUX: readonly NiveauMaths[] = ['decouverte', 'exploration', 'defi'];
const vide: EtatManipulationMaths = { objets: {}, placements: {}, selection: null, historique: [] };
const faceEtat = (points: readonly (readonly [number, number])[], plateau: 'a' | 'b' = 'a'): EtatManipulationMaths => ({
  ...vide, placements: Object.fromEntries(points.map(([x, y], i) => [`face:${plateau}:${i}`, y * 6 + x])),
});

describe('Chantier des Formes', () => {
  it('produit dans les neuf domaines des instances déterministes et solubles', () => {
    for (const famille of ['MAT-CHA-01', 'MAT-CHA-02', 'MAT-CHA-03'] as const) {
      for (const niveau of NIVEAUX) {
        for (let graine = 0; graine < 32; graine += 1) {
          const instance = genererChantier(famille, niveau, creerAlea(graine));
          expect(instance).toEqual(genererChantier(famille, niveau, creerAlea(graine)));
          expect(estInstanceChantier(structuredClone(instance))).toBe(true);
          expect(validerChantier(instance, construireTemoinChantier(instance)).statut).toBe('correcte');
          expect(instance.versionGenerateur).toBe(1);
          if (instance.famille === 'MAT-CHA-01') {
            const maximum = niveau === 'decouverte' ? 6 : niveau === 'exploration' ? 10 : 12;
            expect(instance.parametres.largeur).toBeGreaterThanOrEqual(2);
            expect(instance.parametres.hauteur).toBeGreaterThanOrEqual(2);
            expect(instance.parametres.largeur).toBeLessThanOrEqual(maximum);
            expect(instance.parametres.hauteur).toBeLessThanOrEqual(maximum);
          }
          if (instance.famille === 'MAT-CHA-03') {
            expect(instance.parametres.masseCible).toBeLessThanOrEqual(niveau === 'decouverte' ? 900 : 1000);
            if (niveau === 'decouverte') {
              expect(instance.parametres.masseGauche).toBeGreaterThanOrEqual(100);
              expect(instance.parametres.masseDroite).toBeLessThanOrEqual(900);
            }
          }
        }
      }
    }
  });

  it('mesure un vrai rectangle, accepte translation et permutation, refuse un losange', () => {
    const instance = genererChantier('MAT-CHA-01', 'exploration', creerAlea(4), { largeur: 3, hauteur: 4 });
    const placer = (points: readonly (readonly [number, number])[]): EtatManipulationMaths => ({ ...vide,
      placements: Object.fromEntries(points.map(([x, y], i) => [`sommet-${i}`, y * 17 + x])) });
    expect(validerChantier(instance, vide).statut).toBe('incomplete');
    expect(validerChantier(instance, placer([[2, 3], [5, 3], [5, 7], [2, 7]])).statut).toBe('correcte');
    expect(validerChantier(instance, placer([[9, 1], [9, 5], [6, 5], [6, 1]])).statut).toBe('correcte');
    expect(validerChantier(instance, placer([[2, 3], [5, 4], [4, 8], [1, 7]])).statut).toBe('incorrecte');
    expect(validerChantier(instance, placer([[2, 3], [5, 3], [5, 6], [2, 6]])).statut).toBe('incorrecte');
  });

  it('en Défi, impose de modifier le plan initial quand une cote change', () => {
    const instance = genererChantier('MAT-CHA-01', 'defi', creerAlea(5), { largeur: 2, hauteur: 5 });
    expect(validerChantier(instance, instance.etatInitial).statut).toBe('incorrecte');
    const suivant = prochainGesteChantier(instance, instance.etatInitial);
    expect(suivant?.type).toBe('retirer');
    expect(validerChantier(instance, construireTemoinChantier(instance)).statut).toBe('correcte');
  });

  it('classe les 35 hexominos et valide le pliage des 11 patrons dans les rotations et miroirs', () => {
    expect(PATRONS_CUBE_V1.valides).toHaveLength(11);
    expect(PATRONS_CUBE_V1.contreExemples).toHaveLength(24);
    const instance = genererChantier('MAT-CHA-02', 'exploration', creerAlea(9));
    for (const cle of PATRONS_CUBE_V1.valides) {
      const points = cle.split(';').map((p) => p.split(',').map(Number) as [number, number]);
      const tourne = points.map(([x, y]) => [5 - y, x] as const);
      const miroir = points.map(([x, y]) => [5 - x, y] as const);
      expect(validerChantier(instance, faceEtat(points)).statut).toBe('correcte');
      expect(validerChantier(instance, faceEtat(tourne)).statut).toBe('correcte');
      expect(validerChantier(instance, faceEtat(miroir)).statut).toBe('correcte');
    }
    for (const cle of PATRONS_CUBE_V1.contreExemples) {
      const points = cle.split(';').map((p) => p.split(',').map(Number) as [number, number]);
      expect(validerChantier(instance, faceEtat(points)).statut).toBe('incorrecte');
    }
    expect(validerChantier(instance, faceEtat([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 0]])).statut).toBe('incorrecte');
  });

  it('compte six faces en Découverte et demande deux patrons distincts en Défi', () => {
    const d = genererChantier('MAT-CHA-02', 'decouverte', creerAlea(2));
    expect(validerChantier(d, d.etatInitial).statut).toBe('incomplete');
    expect(validerChantier(d, construireTemoinChantier(d)).statut).toBe('correcte');
    const f = genererChantier('MAT-CHA-02', 'defi', creerAlea(2));
    const a = faceEtat(f.parametres.modele);
    const identique = { ...a, placements: { ...a.placements,
      ...Object.fromEntries(f.parametres.modele.map(([x, y], i) => [`face:b:${i}`, y * 6 + x])) } };
    expect(validerChantier(f, identique).statut).toBe('incorrecte');
    expect(validerChantier(f, construireTemoinChantier(f)).statut).toBe('correcte');
  });

  it('compare les masses et garde les gestes réversibles', () => {
    const d = genererChantier('MAT-CHA-03', 'decouverte', creerAlea(8));
    const mauvais = d.parametres.masseGauche! > d.parametres.masseDroite! ? 'droite' : 'gauche';
    const etat = appliquerGesteChantier(d, d.etatInitial, { type: 'choisir', objetId: mauvais });
    expect(validerChantier(d, etat).statut).toBe('incorrecte');
    expect(appliquerGesteChantier(d, etat, { type: 'annuler' })).toEqual(d.etatInitial);
    const juste = appliquerGesteChantier(d, d.etatInitial, { type: 'choisir', objetId: mauvais === 'gauche' ? 'droite' : 'gauche' });
    expect(validerChantier(d, juste).statut).toBe('correcte');
  });

  it('équilibre avec des poids entiers, rejette le gramme manquant et accepte deux compositions de 1 kg', () => {
    const e = genererChantier('MAT-CHA-03', 'exploration', creerAlea(7));
    const temoinE = construireTemoinChantier(e);
    expect(e.parametres.masseCible).toBeLessThanOrEqual(1000);
    expect(Object.keys(temoinE.placements)).toHaveLength(3);
    expect(validerChantier(e, temoinE).statut).toBe('correcte');
    const sansPoids = { ...temoinE, placements: Object.fromEntries(Object.entries(temoinE.placements).slice(1)) };
    expect(validerChantier(e, sansPoids).statut).not.toBe('correcte');
    const f = genererChantier('MAT-CHA-03', 'defi', creerAlea(7));
    const temoinF = construireTemoinChantier(f);
    expect(f.parametres.masseCible).toBe(1000);
    expect(validerChantier(f, temoinF).statut).toBe('correcte');
    const sansKg = { ...temoinF, placements: { ...temoinF.placements, 'poids-0': 'droite' } };
    expect(validerChantier(f, sansKg).statut).not.toBe('correcte');
    const autre = { ...vide, placements: {
      'poids-0': 'droite', 'poids-4': 'gauche', 'poids-5': 'gauche', 'poids-6': 'gauche',
    } };
    expect(validerChantier(f, autre).statut).toBe('correcte');
  });

  it('propose une aide explicite sans faire le geste et protège les placements du stock', () => {
    const instance = genererChantier('MAT-CHA-02', 'defi', creerAlea(3));
    const avant = structuredClone(instance.etatInitial);
    expect(proposerAideChantier(instance, 2, 'aucune').niveau).toBe('indice');
    const aide = proposerAideChantier(instance, 3, 'aucune', instance.etatInitial);
    expect(aide.niveau).toBe('demonstration');
    expect(aide.gestePropose).toEqual(prochainGesteChantier(instance, instance.etatInitial));
    expect(instance.etatInitial).toEqual(avant);
    expect(appliquerGesteChantier(instance, instance.etatInitial,
      { type: 'placer', objetId: 'face:a:0', position: 99 })).toBe(instance.etatInitial);
  });

  it('déclare les 27 tuples compatibles et transmet les quantités de chaque projet', () => {
    for (const id of ['MAT-CHA-P01', 'MAT-CHA-P02', 'MAT-CHA-P03'] as const) {
      expect(COMBINAISONS_CHANTIER[id]).toHaveLength(27);
      for (const niveaux of COMBINAISONS_CHANTIER[id]) {
        const { projet, instances } = creerProjetChantier(id, niveaux, creerAlea(12), `${id}:${niveaux.join('-')}`);
        expect(instances.map((i) => i.famille)).toEqual(projet.plan.map((e) => e.famille));
        expect(instances.map((i) => i.niveau)).toEqual(niveaux);
        expect(instances.map((i) => i.id)).toEqual(projet.plan.map((e) => e.instanceId));
        expect(instances.every((i) => i.projet?.sessionId === projet.sessionId)).toBe(true);
        expect(instances.every((i) => validerChantier(i, construireTemoinChantier(i)).statut === 'correcte')).toBe(true);
        if (id === 'MAT-CHA-P01') {
          expect(projet.variables.nombreBlocs).toBe(((projet.variables.dimensions as number) % 100) * 2);
          expect(projet.variables.masseGrammes).toBe((projet.variables.nombreBlocs as number) * 100);
          expect(instances[1]!.famille === 'MAT-CHA-02' && instances[1]!.parametres.nombreBlocs).toBe(projet.variables.nombreBlocs);
          expect(instances[2]!.famille === 'MAT-CHA-03' && instances[2]!.parametres.masseCible).toBe(projet.variables.masseGrammes);
          expect(projet.cadeauId).toBe('maths-souvenir-chantier');
        } else if (id === 'MAT-CHA-P02') {
          expect(instances[0]!.famille).toBe('MAT-CHA-02');
          expect(instances[2]!.famille === 'MAT-CHA-01' && instances[2]!.parametres.figure).toBe('carre');
          expect(projet.variables.base).toBe(2);
          expect(instances[1]!.famille === 'MAT-CHA-03' && instances[1]!.parametres.masseCible).toBe(projet.variables.masseGrammes);
          expect(projet.cadeauId).toBeNull();
        } else {
          expect(projet.variables.contrepoidsGrammes).toBe((projet.variables.blocs as number) * 100);
          expect(instances[1]!.famille === 'MAT-CHA-02' && instances[1]!.parametres.nombreBlocs).toBe(projet.variables.blocs);
          expect(instances[2]!.famille === 'MAT-CHA-03' && instances[2]!.parametres.masseCible).toBe(projet.variables.contrepoidsGrammes);
          expect(projet.cadeauId).toBe('maths-objet-chantier');
        }
      }
    }
    expect(() => creerProjetChantier('MAT-CHA-P01', ['defi', 'non', 'decouverte'] as never,
      creerAlea(1), 'session')).toThrow();
  });
});
