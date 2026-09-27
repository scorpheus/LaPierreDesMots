import { describe, expect, it } from 'vitest';
import { creerInstanceMaths, type FamilleMaths, type GesteMaths, type InstanceVallee } from '../../../partage/src/mathematiques/index.js';
import { descriptionGesteMaths } from '../../../client/src/mathematiques/description-geste.js';
import { creerProjetPonts } from '../../../partage/src/mathematiques/jeux/ponts/projets.js';
import { creerAlea } from '../../../partage/src/alea.js';

function instance(famille: FamilleMaths): InstanceVallee {
  return creerInstanceMaths({ profilId: 'enfant', generationMaths: 0, famille,
    niveau: 'decouverte', graine: 7, cleGeste: `test-${famille}` });
}

describe('description d’un geste mathématique pour l’enfant', () => {
  it('ne montre rien sans geste proposé ni pour un identifiant inconnu', () => {
    const pont = instance('MAT-PON-03');
    expect(descriptionGesteMaths(pont, null)).toBeNull();
    expect(descriptionGesteMaths(pont, { type: 'retirer', objetId: 'jeton:secret:0' })).toBeNull();
  });

  it('nomme les objets et les unités des 18 familles, sans identifiant technique', () => {
    const cas: readonly { famille: FamilleMaths; geste: (i: InstanceVallee) => GesteMaths; attendu: RegExp }[] = [
      { famille: 'MAT-PON-01', geste: () => ({ type: 'aligner-regle', origine: 17 }), attendu: /zéro.*17 cm/ },
      { famille: 'MAT-PON-02', geste: () => ({ type: 'placer-borne', valeur: 120, position: 120 }), attendu: /borne.*graduation 120/ },
      { famille: 'MAT-PON-03', geste: (i) => ({ type: 'placer-piece', objetId: i.famille === 'MAT-PON-03' ? i.parametres.pieces[0]!.id : '', position: 4 }), attendu: /pièce de .* cm.*4 cm/ },
      { famille: 'MAT-JAR-01', geste: () => ({ type: 'placer', objetId: 'dizaine', position: 0 }), attendu: /botte.*dix graines/ },
      { famille: 'MAT-JAR-02', geste: () => ({ type: 'placer', objetId: 'part-b', position: 0 }), attendu: /part.*plate-bande/ },
      { famille: 'MAT-JAR-03', geste: (i) => ({ type: 'placer', objetId: i.famille === 'MAT-JAR-03' ? `table:${i.parametres.categories[0]!.id}` : '', position: 7, destination: 'valeur' }), attendu: /7.*tableau/ },
      { famille: 'MAT-MOU-01', geste: () => ({ type: 'placer', objetId: 'pale:a:2', position: 0 }), attendu: /pale.*roue 3.*premier montage/ },
      { famille: 'MAT-MOU-02', geste: () => ({ type: 'placer', objetId: 'sac:a:0', position: 0 }), attendu: /mesure.*sac 1.*première distribution/ },
      { famille: 'MAT-MOU-03', geste: () => ({ type: 'placer', objetId: 'secteur-a', position: 0 }), attendu: /Ouvre une part.*premier réglage/ },
      { famille: 'MAT-MAR-01', geste: (i) => ({ type: 'placer', objetId: i.famille === 'MAT-MAR-01' ? i.parametres.pieces[0]!.id : '', position: 0, destination: 'caisse' }), attendu: /Place .* dans la caisse/ },
      { famille: 'MAT-MAR-02', geste: (i) => ({ type: 'placer', objetId: i.famille === 'MAT-MAR-02' ? i.parametres.pieces[0]!.id : '', position: 0, destination: 'rendu' }), attendu: /Place .* monnaie rendue/ },
      { famille: 'MAT-MAR-03', geste: (i) => ({ type: 'placer', objetId: i.famille === 'MAT-MAR-03' ? i.parametres.articles[0]!.id : '', position: 0, destination: 'panier' }), attendu: /Mets .* dans le panier/ },
      { famille: 'MAT-CHA-01', geste: () => ({ type: 'placer', objetId: 'sommet-2', position: 18 }), attendu: /sommet C.*point 1, 1/ },
      { famille: 'MAT-CHA-02', geste: () => ({ type: 'placer', objetId: 'face:a:2', position: 13 }), attendu: /face 3.*patron A.*case 1, 2/ },
      { famille: 'MAT-CHA-03', geste: () => ({ type: 'choisir', objetId: 'gauche' }), attendu: /plateau gauche/ },
      { famille: 'MAT-HOR-01', geste: () => ({ type: 'placer', objetId: 'aiguille-heures', position: 0 }), attendu: /petite aiguille.*12/ },
      { famille: 'MAT-HOR-02', geste: () => ({ type: 'choisir', objetId: 'arrivee:510' }), attendu: /08 h 30.*heure d’arrivée/ },
      { famille: 'MAT-HOR-03', geste: (i) => ({ type: 'choisir', objetId: i.famille === 'MAT-HOR-03' ? i.parametres.trajets[0]!.id : '' }), attendu: /trajet vers .*départ .*arrivée/ },
    ];
    for (const { famille, geste, attendu } of cas) {
      const i = instance(famille);
      const proposition = geste(i);
      const description = descriptionGesteMaths(i, proposition);
      expect(description, famille).toMatch(attendu);
      // « gauche » est aussi le libellé de la scène : seuls les codes structurés
      // doivent disparaître. Le nom et l'unité attendus sont vérifiés ci-dessus.
      if ('objetId' in proposition && /[:-]/u.test(proposition.objetId)) {
        expect(description, famille).not.toContain(proposition.objetId);
      }
    }
  });

  it('traduit les gestes de correction et les choix sans exposer leurs codes', () => {
    const cas: readonly [FamilleMaths, GesteMaths, string][] = [
      ['MAT-PON-02', { type: 'retirer', objetId: 'borne:120' }, 'borne posée sur 120'],
      ['MAT-JAR-01', { type: 'choisir', objetId: 'echanger-unites' }, 'Échange dix graines'],
      ['MAT-MOU-01', { type: 'retirer', objetId: 'roue:b' }, 'dernière roue'],
      ['MAT-MOU-02', { type: 'choisir', objetId: 'ajouter-sac' }, 'Ajoute un sac'],
      ['MAT-MAR-01', { type: 'choisir', objetId: 'convertir-centimes' }, 'deux pièces de 50 c'],
      ['MAT-MAR-03', { type: 'choisir', objetId: 'comparaison:egal' }, 'même reste'],
      ['MAT-CHA-03', { type: 'choisir', objetId: 'gauche' }, 'plateau gauche'],
      ['MAT-HOR-01', { type: 'choisir', objetId: 'apres-midi' }, 'après-midi'],
      ['MAT-HOR-02', { type: 'choisir', objetId: 'trajet:alternative' }, 'autre trajet'],
    ];
    for (const [famille, geste, morceau] of cas) {
      expect(descriptionGesteMaths(instance(famille), geste)).toContain(morceau);
    }
    const jardin = instance('MAT-JAR-03');
    if (jardin.famille !== 'MAT-JAR-03') throw new Error('Carnet attendu.');
    const [source, destination] = jardin.parametres.categories;
    const transfert = descriptionGesteMaths(jardin, { type: 'placer', objetId: `fruit:${source!.id}`,
      position: 0, destination: destination!.id });
    expect(transfert).toContain(`panier ${source!.id} vers le panier ${destination!.id}`);
    const balance = creerInstanceMaths({ profilId: 'enfant', generationMaths: 0, famille: 'MAT-CHA-03',
      niveau: 'exploration', graine: 7, cleGeste: 'test-poids' });
    const poids = balance.parametres.poids[0]!;
    expect(descriptionGesteMaths(balance, { type: 'placer', objetId: poids.id,
      position: 0, destination: 'gauche' })).toContain(`poids de ${poids.etiquette} sur le plateau gauche`);
  });

  it('nomme le morceau choisi par Gobi pendant la mesure du chemin', () => {
    const projet = creerProjetPonts('MAT-PON-P02', ['decouverte', 'decouverte', 'decouverte'],
      creerAlea(5), 'aide-trajet');
    const mesure = projet.etapes[1]!;
    expect(descriptionGesteMaths(mesure, { type: 'choisir', objetId: 'segment-a' })).toContain('morceau A');
    expect(descriptionGesteMaths(mesure, { type: 'choisir', objetId: 'segment-b' })).toContain('morceau B');
  });
});
