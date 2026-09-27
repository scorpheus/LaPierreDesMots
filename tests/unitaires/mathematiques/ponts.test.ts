import { describe, expect, it } from 'vitest';
import { creerAlea } from '../../../partage/src/alea.js';
import {
  creerProjetPremiereTraversee,
  genererPont,
  manipulerPont,
  validerPont,
  proposerAidePont,
  choisirPontSansRepetition,
  temoinsPont,
  COMBINAISONS_PON_P01,
  prochainGestePont,
  COMBINAISONS_PON_P02,
} from '../../../partage/src/mathematiques/jeux/ponts/index.js';
import { COMBINAISONS_PON_P03, creerProjetPonts } from '../../../partage/src/mathematiques/jeux/ponts/projets.js';

describe('Ponts des Rives', () => {
  it('génère une instance stable, soluble et dans chaque domaine', () => {
    for (const famille of ['MAT-PON-01', 'MAT-PON-02', 'MAT-PON-03'] as const) {
      for (const niveau of ['decouverte', 'exploration', 'defi'] as const) {
        for (let graine = 0; graine < 32; graine += 1) {
          const instance = genererPont(famille, niveau, creerAlea(graine));
          expect(instance).toEqual(genererPont(famille, niveau, creerAlea(graine)));
          expect(instance.famille).toBe(famille);
          expect(instance.niveau).toBe(niveau);
          expect(temoinsPont(instance).length).toBeGreaterThan(0);
          expect(validerPont(instance, temoinsPont(instance)[0]!).statut).toBe('correcte');
        }
      }
    }
  });

  it('distingue un geste libre, une proposition incomplète et une erreur de longueur', () => {
    const instance = genererPont('MAT-PON-01', 'decouverte', creerAlea(3));
    expect(validerPont(instance, instance.etatInitial).statut).toBe('incomplete');
    const etat = manipulerPont(instance, instance.etatInitial, { type: 'aligner-regle', origine: instance.parametres.origineCible });
    expect(etat).not.toBe(instance.etatInitial);
    expect(validerPont(instance, etat).statut).toBe('incomplete');
    const faux = manipulerPont(instance, etat, { type: 'lire-longueur', valeur: instance.parametres.longueurCible - 1 });
    const choisi = manipulerPont(instance, faux, { type: 'choisir', objetId: instance.parametres.choix[0]!.id });
    expect(validerPont(instance, choisi).statut).toBe('incorrecte');
    expect(manipulerPont(instance, choisi, { type: 'annuler' })).toEqual(faux);
  });

  it('refuse la mauvaise borne même au bon emplacement, et la valeur juste à une mauvaise graduation', () => {
    const instance = genererPont('MAT-PON-02', 'decouverte', creerAlea(7));
    const attendu = instance.parametres.bornesAPoser[0]!;
    const autre = instance.parametres.graduations.find((v) => v !== attendu)!;
    const faux = manipulerPont(instance, instance.etatInitial, { type: 'placer-borne', valeur: autre, position: attendu });
    expect(validerPont(instance, faux).statut).toBe('incorrecte');
    const decale = manipulerPont(instance, instance.etatInitial, { type: 'placer-borne', valeur: attendu, position: autre });
    expect(validerPont(instance, decale).statut).toBe('incorrecte');
  });

  it('en Défi, demande de montrer les deux repères qui encadrent la borne', () => {
    const instance = genererPont('MAT-PON-02', 'defi', creerAlea(17));
    const bon = temoinsPont(instance)[0]!;
    const sansJustification = { ...bon, objets: {} };
    expect(validerPont(instance, sansJustification).statut).toBe('incomplete');
    const mauvais = manipulerPont(instance, sansJustification, {
      type: 'montrer-encadrement', inferieure: instance.parametres.graduations[0]!, superieure: instance.parametres.graduations[1]!,
    });
    if (instance.parametres.graduations[0] !== instance.parametres.encadrement.inferieure ||
        instance.parametres.graduations[1] !== instance.parametres.encadrement.superieure) {
      expect(validerPont(instance, mauvais).statut).toBe('incorrecte');
    }
    expect(validerPont(instance, bon).statut).toBe('correcte');
  });

  it('accepte deux assemblages mathématiquement distincts et refuse trou ou chevauchement', () => {
    const instance = genererPont('MAT-PON-03', 'defi', creerAlea(11));
    const [premier, second] = temoinsPont(instance);
    expect(premier).toBeDefined();
    expect(second).toBeDefined();
    expect(premier).not.toEqual(second);
    expect(validerPont(instance, premier! ).statut).toBe('correcte');
    expect(validerPont(instance, second! ).statut).toBe('correcte');
    expect(prochainGestePont(instance, second!)).toBeNull();
    const [piece] = Object.keys(premier!.placements);
    const trou = { ...premier!, placements: { ...premier!.placements, [piece!]: (premier!.placements[piece!] as number) + 1 } };
    expect(validerPont(instance, trou).statut).toBe('incorrecte');
  });

  it('transmet la longueur mesurée au tablier et au repère du projet', () => {
    for (const niveau of ['decouverte', 'exploration', 'defi'] as const) {
      const projet = creerProjetPremiereTraversee(niveau, creerAlea(19), `session-${niveau}`);
      expect(projet.etapes.map((e) => e.famille)).toEqual(['MAT-PON-01', 'MAT-PON-03', 'MAT-PON-02']);
      expect(projet.etapes[0]!.parametres.longueurCible).toBe(projet.variables.porteeCm);
      expect(projet.etapes[1]!.parametres.portee).toBe(projet.variables.porteeCm);
      expect(projet.etapes[2]!.parametres.reperePont).toBe(projet.variables.reperePont);
    }
  });

  it('respecte les difficultés indépendantes et refuse leur intersection vide', () => {
    expect(COMBINAISONS_PON_P01).toHaveLength(21);
    const projet = creerProjetPremiereTraversee(['exploration', 'decouverte', 'defi'], creerAlea(4), 'session-mixte');
    expect(projet.niveaux).toEqual(['exploration', 'decouverte', 'defi']);
    expect(projet.variables.porteeCm).toBeGreaterThanOrEqual(5);
    expect(projet.variables.porteeCm).toBeLessThanOrEqual(12);
    expect(() => creerProjetPremiereTraversee(['decouverte', 'defi', 'decouverte'], creerAlea(4), 'session-vide')).toThrow();
  });

  it('tire séparément la portée et le numéro de borne, puis fige le plan et le cadeau', () => {
    const projets = Array.from({ length: 16 }, (_, graine) =>
      creerProjetPremiereTraversee('exploration', creerAlea(graine), `session-${graine}`));
    expect(projets.some((p) => p.variables.reperePont !== p.variables.porteeCm * 10)).toBe(true);
    for (const projet of projets) {
      expect(projet.etapes[2].parametres.bornesAPoser).toContain(projet.variables.reperePont);
      expect(projet.plan.map((e) => e.instanceId)).toEqual(projet.etapes.map((e) => e.id));
      expect(projet.etapes.every((e) => e.projet?.sessionId === projet.sessionId)).toBe(true);
      expect(projet.cadeauType).toBe('souvenir');
    }
  });

  it('démarre PON-03 Exploration avec trois modules et un remplacement nécessaire', () => {
    for (let graine = 0; graine < 16; graine += 1) {
      const instance = genererPont('MAT-PON-03', 'exploration', creerAlea(graine));
      expect(Object.keys(instance.etatInitial.placements)).toHaveLength(3);
      expect(validerPont(instance, instance.etatInitial).statut).toBe('incorrecte');
      const bon = temoinsPont(instance)[0]!;
      const moduleARetirer = Object.keys(instance.etatInitial.placements).find((id) => !(id in bon.placements))!;
      const moduleAAjouter = Object.keys(bon.placements).find((id) => !(id in instance.etatInitial.placements))!;
      const ajouteSansRetirer = manipulerPont(instance, instance.etatInitial, {
        type: 'placer-piece', objetId: moduleAAjouter, position: bon.placements[moduleAAjouter] as number,
      });
      expect(validerPont(instance, ajouteSansRetirer).statut).toBe('incorrecte');
      const retire = manipulerPont(instance, instance.etatInitial, { type: 'retirer', objetId: moduleARetirer });
      const remplace = manipulerPont(instance, retire, { type: 'placer-piece', objetId: moduleAAjouter, position: bon.placements[moduleAAjouter] as number });
      expect(validerPont(instance, remplace).statut).toBe('correcte');
      expect(manipulerPont(instance, retire, { type: 'annuler' })).toEqual(instance.etatInitial);
    }
  });

  it('demande en PON-01 Défi une combinaison raccordée après mesure', () => {
    const instance = genererPont('MAT-PON-01', 'defi', creerAlea(22));
    const bon = temoinsPont(instance)[0]!;
    expect(Object.keys(bon.placements).filter((id) => id !== 'regle')).toHaveLength(2);
    expect(validerPont(instance, bon).statut).toBe('correcte');
    const planche = Object.keys(bon.placements).find((id) => id !== 'regle')!;
    const trou = { ...bon, placements: { ...bon.placements, [planche]: (bon.placements[planche] as number) + 1 } };
    expect(validerPont(instance, trou).statut).toBe('incorrecte');
  });

  it('propose une aide sans enregistrer une erreur ni changer la réponse', () => {
    const instance = genererPont('MAT-PON-03', 'decouverte', creerAlea(5));
    const avant = structuredClone(instance);
    const aide = proposerAidePont(instance, 2, 'aucune');
    expect(aide.niveau).toBe('indice');
    expect(instance).toEqual(avant);
    expect(proposerAidePont(instance, 3, aide.niveau).niveau).toBe('demonstration');
    const geste = prochainGestePont(instance, instance.etatInitial);
    expect(geste).not.toBeNull();
    const guide = proposerAidePont(instance, 3, 'aucune', instance.etatInitial);
    expect(guide.gestePropose).toEqual(geste);
    expect(instance.etatInitial).toEqual(avant.etatInitial);
  });

  it('évite les cinq signatures récentes sans boucle infinie', () => {
    const premier = genererPont('MAT-PON-01', 'decouverte', creerAlea(1));
    const choisi = choisirPontSansRepetition('MAT-PON-01', 'decouverte', creerAlea(2), [premier.signature]);
    expect(choisi.instance.signature).not.toBe(premier.signature);
    expect(choisi.signaturesRecentes).toHaveLength(2);
  });

  it('P02 mesure deux morceaux par des gestes séparés puis transmet leur somme au tablier', () => {
    for (const niveaux of COMBINAISONS_PON_P02) {
      const projet = creerProjetPonts('MAT-PON-P02', niveaux, creerAlea(31), `p02-${niveaux.join('-')}`);
      const [bornes, mesure, tablier] = projet.etapes;
      if (bornes?.famille !== 'MAT-PON-02' || mesure?.famille !== 'MAT-PON-01' || tablier?.famille !== 'MAT-PON-03') {
        throw new Error('Ordre P02 invalide.');
      }
      const morceaux = mesure.parametres.segmentsTrajet!;
      expect(morceaux).toHaveLength(2);
      expect(mesure.parametres.repereDestination).toBe(bornes.parametres.reperePont);
      expect(tablier.parametres.portee).toBe(morceaux[0].longueur + morceaux[1].longueur);
      expect(projet.variables.longueurA).toBe(morceaux[0].longueur);
      expect(projet.variables.longueurB).toBe(morceaux[1].longueur);
      expect(projet.variables.longueursTrajet).toBe(tablier.parametres.portee);
      let etat = mesure.etatInitial;
      etat = manipulerPont(mesure, etat, { type: 'choisir', objetId: morceaux[0].id });
      etat = manipulerPont(mesure, etat, { type: 'aligner-regle', origine: morceaux[0].origine });
      etat = manipulerPont(mesure, etat, { type: 'lire-longueur', valeur: morceaux[0].longueur });
      expect(validerPont(mesure, etat).statut).toBe('incomplete');
      etat = manipulerPont(mesure, etat, { type: 'choisir', objetId: morceaux[1].id });
      etat = manipulerPont(mesure, etat, { type: 'aligner-regle', origine: morceaux[1].origine });
      etat = manipulerPont(mesure, etat, { type: 'lire-longueur', valeur: morceaux[1].longueur + 1 });
      expect(validerPont(mesure, etat).statut).toBe('incorrecte');
      etat = manipulerPont(mesure, etat, { type: 'lire-longueur', valeur: morceaux[1].longueur });
      expect(validerPont(mesure, etat).statut).toBe('correcte');
      expect(validerPont(tablier, temoinsPont(tablier)[0]!).statut).toBe('correcte');
    }
    expect(() => creerProjetPonts('MAT-PON-P02', ['decouverte', 'defi', 'decouverte'],
      creerAlea(1), 'incompatible')).toThrow(/Deux morceaux/u);
  });

  it('P03 garde le module stable, répare le trou de deux façons et vérifie la portée réelle', () => {
    for (const niveaux of COMBINAISONS_PON_P03) {
      const projet = creerProjetPonts('MAT-PON-P03', niveaux, creerAlea(17), `p03-${niveaux.join('-')}`);
      const [mesure, tablier, bornes] = projet.etapes;
      if (mesure?.famille !== 'MAT-PON-01' || tablier?.famille !== 'MAT-PON-03' || bornes?.famille !== 'MAT-PON-02') {
        throw new Error('Ordre P03 invalide.');
      }
      const reparer = tablier.parametres.reparation!;
      expect(mesure.parametres.longueurCible).toBe(reparer.manqueCm);
      expect(mesure.parametres.origineCible).toBe(projet.variables.moduleRestantCm);
      expect(tablier.etatInitial.placements['module-restant']).toBe(0);
      expect(projet.variables.moduleRestantCm + projet.variables.manqueCm).toBe(tablier.parametres.portee);
      expect(bornes.parametres.porteeAVerifier).toBe(tablier.parametres.portee);
      expect(bornes.parametres.reperePont).toBe(tablier.parametres.portee);
      expect(validerPont(tablier, tablier.etatInitial).statut).toBe('incomplete');
      expect(tablier.etatInitial.placements['module-endommage']).toBe(projet.variables.moduleRestantCm);
      expect(prochainGestePont(tablier, tablier.etatInitial)).toEqual({ type: 'retirer', objetId: 'module-endommage' });
      expect(manipulerPont(tablier, tablier.etatInitial,
        { type: 'retirer', objetId: 'module-restant' })).toBe(tablier.etatInitial);
      const retire = manipulerPont(tablier, tablier.etatInitial,
        { type: 'retirer', objetId: 'module-endommage' });
      expect(retire.placements['module-endommage']).toBeUndefined();
      expect(validerPont(tablier, retire).statut).toBe('incomplete');
      expect(manipulerPont(tablier, retire, { type: 'annuler' })).toEqual(tablier.etatInitial);
      const [solutionA, solutionB] = temoinsPont(tablier);
      expect(solutionA).toBeDefined();
      expect(solutionB).toBeDefined();
      expect(validerPont(tablier, solutionA!).statut).toBe('correcte');
      expect(validerPont(tablier, solutionB!).statut).toBe('correcte');
      let repare = retire;
      for (const [objetId, position] of Object.entries(solutionA!.placements)) {
        if (objetId !== 'module-restant') repare = manipulerPont(tablier, repare,
          { type: 'placer-piece', objetId, position: Number(position) });
      }
      expect(validerPont(tablier, repare).statut).toBe('correcte');
      const avecAbime = { ...solutionA!, placements: { ...solutionA!.placements,
        'module-endommage': projet.variables.moduleRestantCm } };
      expect(validerPont(tablier, avecAbime).statut).not.toBe('correcte');
      const sansRestant = { ...solutionA!, placements: { ...solutionA!.placements } };
      delete (sansRestant.placements as Record<string, number>)['module-restant'];
      expect(validerPont(tablier, sansRestant).statut).not.toBe('correcte');
      const fausseBorne = { ...temoinsPont(bornes)[0]!, placements: {
        ...temoinsPont(bornes)[0]!.placements, [`borne:${bornes.parametres.reperePont}`]:
          bornes.parametres.reperePont - bornes.parametres.pas,
      } };
      expect(validerPont(bornes, fausseBorne).statut).toBe('incorrecte');
    }
  });
});
