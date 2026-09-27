import { describe, expect, it } from 'vitest';
import { creerAlea } from '../../../partage/src/alea.js';
import { appliquerGesteJardin, construireTemoinJardin, creerProjetJardin, estInstanceJardin,
  genererJardin, proposerAideJardin, validerJardin, verifierCombinaisonJardin } from '../../../partage/src/mathematiques/jeux/jardin/index.js';

const niveaux = ['decouverte', 'exploration', 'defi'] as const;
const familles = ['MAT-JAR-01', 'MAT-JAR-02', 'MAT-JAR-03'] as const;

describe('Jardin des pousses', () => {
  it('génère 9 modèles déterministes et solubles, sans témoin dans l’instance', () => {
    for (const famille of familles) for (const niveau of niveaux) for (let graine = 0; graine < 24; graine += 1) {
      const i = genererJardin(famille, niveau, creerAlea(graine));
      expect(i).toEqual(genererJardin(famille, niveau, creerAlea(graine)));
      expect(estInstanceJardin(i)).toBe(true);
      expect(JSON.stringify(i)).not.toContain('solutionTemoin');
      expect(validerJardin(i, construireTemoinJardin(i)).statut).toBe('correcte');
    }
    expect(estInstanceJardin({ format: 2, famille: 'MAT-JAR-01' })).toBe(false);
  });

  it('montre zéro avec un plateau vide ; échanges et deux décompositions restent réversibles', () => {
    const zero = genererJardin('MAT-JAR-01', 'decouverte', creerAlea(2), { cible: 0 });
    expect(validerJardin(zero, zero.etatInitial).statut).toBe('correcte');
    const i = genererJardin('MAT-JAR-01', 'defi', creerAlea(3), { cible: 120 });
    let etat = i.etatInitial;
    for (let n = 0; n < 12; n += 1) etat = appliquerGesteJardin(i, etat, { type: 'placer', objetId: 'dizaine', position: 0 });
    expect(validerJardin(i, etat).statut).not.toBe('correcte');
    etat = appliquerGesteJardin(i, etat, { type: 'choisir', objetId: 'garder-decomposition' });
    expect(etat.objets.premiere).toBe('0:12:0');
    expect(validerJardin(i, etat).statut).toBe('incomplete');
    etat = appliquerGesteJardin(i, etat, { type: 'placer', objetId: 'centaine', position: 0 });
    for (let n = 0; n < 20; n += 1) etat = appliquerGesteJardin(i, etat, { type: 'placer', objetId: 'unite', position: 0 });
    const avantEchange = etat;
    etat = appliquerGesteJardin(i, etat, { type: 'choisir', objetId: 'echanger-unites' });
    expect(validerJardin(i, etat).statut).toBe('correcte');
    expect(appliquerGesteJardin(i, etat, { type: 'annuler' })).toEqual(avantEchange);
  });

  it('une part de trop et une représentation inégale ne valident pas le même tout', () => {
    const i = genererJardin('MAT-JAR-02', 'defi', creerAlea(5), { denominateur: 8, numerateur: 6 });
    let etat = i.etatInitial;
    for (let n = 0; n < 6; n += 1) etat = appliquerGesteJardin(i, etat, { type: 'placer', objetId: 'part-a', position: 0 });
    for (let n = 0; n < 2; n += 1) etat = appliquerGesteJardin(i, etat, { type: 'placer', objetId: 'part-b', position: 0 });
    expect(validerJardin(i, etat).statut).toBe('incomplete');
    etat = appliquerGesteJardin(i, etat, { type: 'placer', objetId: 'part-b', position: 0 });
    expect(validerJardin(i, etat).statut).toBe('correcte');
    etat = appliquerGesteJardin(i, etat, { type: 'placer', objetId: 'part-b', position: 0 });
    expect(validerJardin(i, etat).statut).toBe('incorrecte');
  });

  it('un transfert change le panier ; tableau et barres doivent suivre la donnée courante', () => {
    const i = genererJardin('MAT-JAR-03', 'defi', creerAlea(7), {
      categories: [{ id: 'pommes', quantite: 3 }, { id: 'poires', quantite: 3 },
        { id: 'prunes', quantite: 2 }, { id: 'noix', quantite: 2 }],
    });
    let etat = construireTemoinJardin(i);
    etat = { ...etat, objets: { ...etat.objets, transferts: 0 } };
    expect(validerJardin(i, etat).statut).toBe('incomplete');
    const avant = etat;
    etat = appliquerGesteJardin(i, etat, { type: 'placer', objetId: 'fruit:pommes', destination: 'poires', position: 0 });
    expect(validerJardin(i, etat).statut).not.toBe('correcte');
    expect(appliquerGesteJardin(i, etat, { type: 'annuler' })).toEqual(avant);
    etat = appliquerGesteJardin(i, etat, { type: 'retirer', objetId: 'table:pommes' });
    etat = appliquerGesteJardin(i, etat, { type: 'retirer', objetId: 'barre:pommes' });
    etat = appliquerGesteJardin(i, etat, { type: 'placer', objetId: 'table:poires', position: 0 });
    etat = appliquerGesteJardin(i, etat, { type: 'placer', objetId: 'barre:poires', position: 0 });
    expect(validerJardin(i, etat).statut).toBe('incorrecte');
    etat = appliquerGesteJardin(i, etat, { type: 'choisir', objetId: 'lecture:poires' });
    expect(validerJardin(i, etat).statut).toBe('correcte');
  });

  it('les trois projets figent unités, quantités, étapes et cadeaux selon les trois niveaux', () => {
    for (const niveau of niveaux) {
      const choix = [niveau, niveau, niveau] as const;
      for (const id of ['MAT-JAR-P01', 'MAT-JAR-P02', 'MAT-JAR-P03'] as const) {
        expect(verifierCombinaisonJardin(id, choix)).toBeNull();
        const p = creerProjetJardin(id, choix, creerAlea(13), `jardin-${id}-${niveau}`);
        expect(p.instances.map((i) => i.id)).toEqual(p.projet.plan.map((e) => e.instanceId));
        expect(p.instances.every((i, rang) => i.projet?.etape === rang)).toBe(true);
        expect(p.instances.every((i) => validerJardin(i, construireTemoinJardin(i)).statut === 'correcte')).toBe(true);
        expect(p.projet.cadeauId).toBe(id.endsWith('P02') ? null : id.endsWith('P01') ? 'maths-souvenir-jardin' : 'maths-objet-jardin');
        if (id === 'MAT-JAR-P01') {
          const total = p.projet.variables.totalGraines!;
          expect(total % p.projet.variables.carresTotaux!).toBe(0);
          expect(p.projet.variables.grainesParCarre! * p.projet.variables.carresTotaux!).toBe(total);
          expect(p.instances[0]!.parametres).toMatchObject({ cible: total });
        }
        if (id === 'MAT-JAR-P02') {
          const [recolte, graines, carnet] = p.instances;
          expect(graines!.parametres).toMatchObject({ cible: p.projet.variables.totalFruits });
          if (recolte?.famille !== 'MAT-JAR-03' || carnet?.famille !== 'MAT-JAR-03') throw new Error('Carnet attendu.');
          expect(recolte.parametres.categories).toEqual(carnet.parametres.categories);
          expect(p.projet.variables.nombreCaisses! * p.projet.variables.fruitsParCaisse!).toBe(p.projet.variables.totalFruits);
          expect(recolte.unite).toBe(niveau === 'decouverte' ? 'fruit' : 'caisse de dix fruits');
        }
      }
    }
    expect(verifierCombinaisonJardin('MAT-JAR-P03', ['decouverte', 'exploration', 'exploration'])).not.toBeNull();
    expect(proposerAideJardin(genererJardin('MAT-JAR-01', 'exploration', creerAlea(4)), 0, 'demonstration').gestePropose).not.toBeNull();
  });

  it('une aide demandée mène les neuf modèles à réussite en moins de 128 gestes, même après sérialisation', () => {
    for (const famille of familles) for (const niveau of niveaux) for (const graine of [0, 7, 31]) {
      const instance = genererJardin(famille, niveau, creerAlea(graine));
      let etat = instance.etatInitial;
      for (let gesteNumero = 0; gesteNumero < 128 && validerJardin(instance, etat).statut !== 'correcte'; gesteNumero += 1) {
        const geste = proposerAideJardin(instance, 0, 'demonstration', etat).gestePropose;
        expect(geste, `${famille}/${niveau}/${graine}, geste ${gesteNumero}`).not.toBeNull();
        const suivant = appliquerGesteJardin(instance, etat, geste!);
        expect(suivant, `${famille}/${niveau}/${graine}, geste ${gesteNumero}`).not.toEqual(etat);
        etat = JSON.parse(JSON.stringify(suivant)) as typeof etat;
      }
      expect(validerJardin(instance, etat).statut, `${famille}/${niveau}/${graine}`).toBe('correcte');
    }
  });

  it('le Défi garde le domaine jusqu’à 99 unités et permet une saisie directe des dix valeurs', () => {
    const instance = genererJardin('MAT-JAR-03', 'defi', creerAlea(83), { categories: [
      { id: 'pommes', quantite: 19 }, { id: 'poires', quantite: 20 },
      { id: 'prunes', quantite: 20 }, { id: 'cerises', quantite: 20 }, { id: 'noix', quantite: 20 },
    ] });
    if (instance.famille !== 'MAT-JAR-03') throw new Error('Carnet attendu.');
    expect(instance.parametres.total).toBe(99);
    let etat = appliquerGesteJardin(instance, instance.etatInitial,
      { type: 'placer', objetId: 'barre:pommes', position: 20, destination: 'valeur' });
    expect(validerJardin(instance, etat).statut).not.toBe('correcte');
    for (let n = 0; n < 128 && validerJardin(instance, etat).statut !== 'correcte'; n += 1) {
      const geste = proposerAideJardin(instance, 0, 'demonstration', etat).gestePropose;
      expect(geste).not.toBeNull();
      etat = appliquerGesteJardin(instance, etat, geste!);
    }
    expect(validerJardin(instance, etat).statut).toBe('correcte');
  });
});
