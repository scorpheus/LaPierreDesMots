import { describe, expect, it } from 'vitest';
import { creerAlea } from '../../../partage/src/alea.js';
import { appliquerGesteMoulin, construireTemoinMoulin, creerProjetMoulin, estInstanceMoulin,
  genererMoulin, proposerAideMoulin, validerMoulin } from '../../../partage/src/mathematiques/jeux/moulin/index.js';

const familles = ['MAT-MOU-01', 'MAT-MOU-02', 'MAT-MOU-03'] as const;
const niveaux = ['decouverte', 'exploration', 'defi'] as const;

describe('Moulin des Roues', () => {
  it('génère 9 modèles stables et solubles sur plusieurs graines', () => {
    for (const famille of familles) for (const niveau of niveaux) for (let graine = 0; graine < 24; graine += 1) {
      const i = genererMoulin(famille, niveau, creerAlea(graine));
      expect(i).toEqual(genererMoulin(famille, niveau, creerAlea(graine)));
      expect(estInstanceMoulin(i)).toBe(true);
      expect(JSON.stringify(i)).not.toContain('solutionTemoin');
      expect(validerMoulin(i, construireTemoinMoulin(i)).statut).toBe('correcte');
    }
    expect(estInstanceMoulin({ format: 2, famille: 'MAT-MOU-01' })).toBe(false);
  });

  it('monte des groupes égaux et accepte une autre factorisation réelle', () => {
    const i = genererMoulin('MAT-MOU-01', 'defi', creerAlea(6), {
      premier: { roues: 4, pales: 3 }, second: { roues: 3, pales: 4 },
    });
    let etat = i.etatInitial;
    for (let r = 0; r < 4; r += 1) {
      etat = appliquerGesteMoulin(i, etat, { type: 'choisir', objetId: 'roue:a' });
      for (let p = 0; p < 3; p += 1) etat = appliquerGesteMoulin(i, etat, { type: 'placer', objetId: `pale:a:${r}`, position: 0 });
    }
    expect(validerMoulin(i, etat).statut).toBe('incomplete');
    for (let r = 0; r < 2; r += 1) {
      etat = appliquerGesteMoulin(i, etat, { type: 'choisir', objetId: 'roue:b' });
      for (let p = 0; p < 6; p += 1) etat = appliquerGesteMoulin(i, etat, { type: 'placer', objetId: `pale:b:${r}`, position: 0 });
    }
    expect(validerMoulin(i, etat).statut).toBe('correcte');
    const retire = appliquerGesteMoulin(i, etat, { type: 'retirer', objetId: 'pale:b:1' });
    expect(validerMoulin(i, retire).statut).not.toBe('correcte');
    expect(appliquerGesteMoulin(i, retire, { type: 'annuler' })).toEqual(etat);
  });

  it('une mesure par geste conserve le stock et distingue un partage inégal', () => {
    const i = genererMoulin('MAT-MOU-02', 'defi', creerAlea(8), { total: 12, sacs: 3, autreNombreDeSacs: 4 });
    let etat = i.etatInitial;
    for (let n = 0; n < 12; n += 1) {
      etat = appliquerGesteMoulin(i, etat, { type: 'placer', objetId: `sac:a:${n % 3}`, position: 0 });
    }
    expect(nombreEtat(etat, 'stock:a')).toBe(0);
    expect(validerMoulin(i, etat).statut).toBe('incomplete');
    for (let n = 0; n < 12; n += 1) {
      etat = appliquerGesteMoulin(i, etat, { type: 'placer', objetId: `sac:b:${n % 4}`, position: 0 });
    }
    expect(validerMoulin(i, etat).statut).toBe('correcte');
    etat = appliquerGesteMoulin(i, etat, { type: 'retirer', objetId: 'sac:a:0' });
    etat = appliquerGesteMoulin(i, etat, { type: 'placer', objetId: 'sac:a:1', position: 0 });
    expect(validerMoulin(i, etat).statut).toBe('incorrecte');
    expect(nombreEtat(etat, 'stock:a')).toBe(0);
  });

  it('en Exploration, le nombre de sacs se construit sans être annoncé', () => {
    const i = genererMoulin('MAT-MOU-02', 'exploration', creerAlea(5),
      { total: 6, sacs: 3, nombreSacsInconnu: true });
    expect(i.consigne.texte).toContain('Combien de sacs');
    let etat = i.etatInitial;
    for (let sac = 0; sac < 3; sac += 1) {
      etat = appliquerGesteMoulin(i, etat, { type: 'choisir', objetId: 'ajouter-sac' });
      for (let mesure = 0; mesure < 2; mesure += 1) {
        etat = appliquerGesteMoulin(i, etat, { type: 'placer', objetId: `sac:a:${sac}`, position: 0 });
      }
    }
    expect(validerMoulin(i, etat).statut).toBe('correcte');
    const unDeTrop = appliquerGesteMoulin(i, etat, { type: 'choisir', objetId: 'ajouter-sac' });
    expect(validerMoulin(i, unDeTrop).statut).toBe('incorrecte');
    const retabli = appliquerGesteMoulin(i, unDeTrop, { type: 'retirer', objetId: 'dernier-sac' });
    expect(retabli.objets).toEqual(etat.objets);
    expect(validerMoulin(i, retabli).statut).toBe('correcte');
  });

  it('la vanne compare les parts du même réservoir et accepte l’annulation', () => {
    const i = genererMoulin('MAT-MOU-03', 'defi', creerAlea(9), { denominateur: 8, numerateur: 4, initial: 0 });
    let etat = i.etatInitial;
    for (let n = 0; n < 4; n += 1) etat = appliquerGesteMoulin(i, etat, { type: 'placer', objetId: 'secteur-a', position: 0 });
    for (let n = 0; n < 3; n += 1) etat = appliquerGesteMoulin(i, etat, { type: 'placer', objetId: 'secteur-b', position: 0 });
    expect(validerMoulin(i, etat).statut).toBe('incorrecte');
    const corrige = appliquerGesteMoulin(i, etat, { type: 'retirer', objetId: 'secteur-b' });
    expect(validerMoulin(i, corrige).statut).toBe('correcte');
    expect(appliquerGesteMoulin(i, corrige, { type: 'annuler' })).toEqual(etat);
  });

  it('les trois projets transmettent la production et les cadeaux sans perdre le niveau choisi', () => {
    for (const niveau of niveaux) for (const id of ['MAT-MOU-P01', 'MAT-MOU-P02', 'MAT-MOU-P03'] as const) {
      const p = creerProjetMoulin(id, [niveau, niveau, niveau], creerAlea(19), `moulin-${id}-${niveau}`);
      expect(p.instances.map((i) => i.id)).toEqual(p.projet.plan.map((e) => e.instanceId));
      expect(p.instances.every((i) => i.niveau === niveau)).toBe(true);
      expect(p.instances.every((i) => validerMoulin(i, construireTemoinMoulin(i)).statut === 'correcte')).toBe(true);
      expect(p.projet.cadeauId).toBe(id.endsWith('P02') ? null : id.endsWith('P01') ? 'maths-souvenir-moulin' : 'maths-objet-moulin');
      if (id === 'MAT-MOU-P01') {
        expect(p.instances[0]!.parametres).toMatchObject({ total: p.projet.variables.farine });
        expect(p.instances[2]!.parametres).toMatchObject({ total: p.projet.variables.farine });
      }
      if (id === 'MAT-MOU-P02') {
        expect(p.projet.variables.premierRoues! * p.projet.variables.premierPales!).toBe(p.projet.variables.total);
        expect(p.projet.variables.autresRoues! * p.projet.variables.autresPales!).toBe(p.projet.variables.total);
      }
    }
    expect(proposerAideMoulin(genererMoulin('MAT-MOU-02', 'decouverte', creerAlea(3)), 0, 'demonstration').gestePropose).not.toBeNull();
  });

  it('l’aide demandée conduit les neuf modèles à réussite en moins de 128 gestes durables', () => {
    for (const famille of familles) for (const niveau of niveaux) for (const graine of [0, 7, 31]) {
      const instance = genererMoulin(famille, niveau, creerAlea(graine));
      let etat = instance.etatInitial;
      for (let gesteNumero = 0; gesteNumero < 128 && validerMoulin(instance, etat).statut !== 'correcte'; gesteNumero += 1) {
        const geste = proposerAideMoulin(instance, 0, 'demonstration', etat).gestePropose;
        expect(geste, `${famille}/${niveau}/${graine}, geste ${gesteNumero}`).not.toBeNull();
        const suivant = appliquerGesteMoulin(instance, etat, geste!);
        expect(suivant, `${famille}/${niveau}/${graine}, geste ${gesteNumero}`).not.toEqual(etat);
        etat = JSON.parse(JSON.stringify(suivant)) as typeof etat;
      }
      expect(validerMoulin(instance, etat).statut, `${famille}/${niveau}/${graine}`).toBe('correcte');
    }
  });
});

function nombreEtat(etat: { objets: Readonly<Record<string, number | string | boolean | null>> }, cle: string): number {
  const n = etat.objets[cle]; return typeof n === 'number' ? n : 0;
}
