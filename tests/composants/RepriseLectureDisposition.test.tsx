import { useCallback, useState } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { creerAlea, creerHorlogeFigee } from '@pierre/partage';
import type { Exercice, Habillage } from '@pierre/partage';
import { moteurAttrape } from '@partage/moteurs/attrape/moteur';
import type { ActionAttrape, ContenuAttrape, EtatAttrape } from '@partage/moteurs/attrape/types';
import { moteurPlace } from '@partage/moteurs/place/moteur';
import type { ActionPlace, ContenuPlace, EtatPlace } from '@partage/moteurs/place/types';
import { MoteurAttrape } from '@client/moteurs/attrape/MoteurAttrape';
import { MoteurPlace } from '@client/moteurs/place/MoteurPlace';
import { decoderEtatLecture, encoderEtatLecture } from '@pierre/partage/reprise-lecture';
import { lireJson, servicesDeTest } from '../configuration/preparation.js';

const horloge = creerHorlogeFigee('2026-09-26T10:00:00.000Z');
const retour = {
  depotCorrect: vi.fn(async () => undefined), depotRefuse: vi.fn(async () => undefined),
  palierFranchi: vi.fn(async () => undefined), reinitialiserSerie: vi.fn(),
  animationsDesactivees: true,
};

function services(graine: number) {
  return { ...servicesDeTest(), alea: creerAlea(graine), horloge,
    haptique: { vibrer: () => undefined, disponible: false }, retour };
}

function ordre(racine: HTMLElement, selecteur: string): string[] {
  return [...racine.querySelectorAll<HTMLElement>(selecteur)].map((element) =>
    element.dataset[selecteur === '[data-cible]' ? 'cible' : 'element'] ?? '');
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('disposition conservée après fermeture', () => {
  it('Attrape reprend les mêmes cibles sans nouveau tirage', () => {
    const exercice = lireJson<Exercice>('contenu/exercices/clairiere/lucioles-attrape-01.json');
    const contenu = exercice.jeu.contenu as ContenuAttrape;
    const habillage = lireJson<Habillage>('contenu/habillages/clairiere/lucioles.habillage.json');
    const premierServices = services(17);
    let sauvegarde: EtatAttrape | null = null;
    const initial = moteurAttrape.creerEtat({ contenu, habillage,
      alea: premierServices.alea, horloge });
    function Harnais({ etatInitial, graine }: { etatInitial: EtatAttrape; graine: number }) {
      const jeu = services(graine);
      const [etat, fixerEtat] = useState(etatInitial);
      const emettre = useCallback((action: ActionAttrape) => {
        fixerEtat((courant) => {
          const suivant = moteurAttrape.reduire(courant, action,
            { alea: jeu.alea, horloge });
          sauvegarde = suivant;
          return suivant;
        });
      }, [jeu.alea]);
      return <MoteurAttrape contenu={contenu} habillage={habillage} etat={etat}
        emettre={emettre} services={jeu} animationsDesactivees />;
    }
    const premiere = render(<Harnais etatInitial={initial} graine={17} />);
    const attendu = ordre(premiere.container, '[data-cible]');
    expect(sauvegarde?.ordreAffichage).toEqual(attendu);
    premiere.unmount();
    const restaure = decoderEtatLecture(encoderEtatLecture(sauvegarde)) as EtatAttrape;
    const seconde = render(<Harnais etatInitial={restaure} graine={91} />);
    expect(ordre(seconde.container, '[data-cible]')).toEqual(attendu);
  });

  it('Place reprend la même réserve sans nouveau tirage', () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('asset local absent du test'); }));
    const exercice = lireJson<Exercice>('contenu/exercices/clairiere/ecole-02-place.json');
    const contenu = exercice.jeu.contenu as ContenuPlace;
    const habillage = lireJson<Habillage>('contenu/habillages/clairiere/ecole-place.habillage.json');
    const premierServices = services(17);
    let sauvegarde: EtatPlace | null = null;
    const initial = moteurPlace.creerEtat({ contenu, habillage,
      alea: premierServices.alea, horloge });
    function Harnais({ etatInitial, graine }: { etatInitial: EtatPlace; graine: number }) {
      const jeu = services(graine);
      const [etat, fixerEtat] = useState(etatInitial);
      const emettre = useCallback((action: ActionPlace) => {
        fixerEtat((courant) => {
          const suivant = moteurPlace.reduire(courant, action,
            { alea: jeu.alea, horloge });
          sauvegarde = suivant;
          return suivant;
        });
      }, [jeu.alea]);
      return <MoteurPlace contenu={contenu} habillage={habillage} etat={etat}
        emettre={emettre} services={jeu} animationsDesactivees />;
    }
    const premiere = render(<Harnais etatInitial={initial} graine={17} />);
    const attendu = ordre(premiere.container, '[data-element]');
    expect(sauvegarde?.reserveMelangee?.map((element) => element.id)).toEqual(attendu);
    premiere.unmount();
    const restaure = decoderEtatLecture(encoderEtatLecture(sauvegarde)) as EtatPlace;
    const seconde = render(<Harnais etatInitial={restaure} graine={91} />);
    expect(ordre(seconde.container, '[data-element]')).toEqual(attendu);
  });
});
