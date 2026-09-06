/**
 * Mélange visible des cibles Attrape.
 *
 * Ces cas montent les sept fiches livrées, et non une copie réduite : le défaut signalé par
 * le parent (cheval puis cochon aux premières cases) est un biais de la présentation réelle.
 * Le mélange est une décision de session, tirée une fois par l'Alea injecté ; il ne dépend ni
 * de l'ordre éditorial des cibles, ni de celui des consignes.
 */
import { StrictMode, useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { moteurAttrape } from '@partage/moteurs/attrape/moteur';
import { MoteurAttrape } from '@client/moteurs/attrape/MoteurAttrape';
import type { ServicesJeu } from '@client/moteurs/types';
import type {
  ActionAttrape,
  ContenuAttrape,
  EtatAttrape,
} from '@partage/moteurs/attrape/types';
import type { Alea, Habillage } from '@pierre/partage';

import { aleaDeTest, horlogeDeTest, lireJson, servicesDeTest } from '../configuration/preparation.js';

const FICHES_ATTRAPE = [
  'contenu/exercices/clairiere/lucioles-attrape-01.json',
  'contenu/exercices/foret-muette/feuilles-attrape-01.json',
  'contenu/exercices/foret-muette/feuilles-attrape-02.json',
  'contenu/exercices/marais-jumeau/poissons-attrape-01.json',
  'contenu/exercices/marais-jumeau/poissons-attrape-02.json',
  'contenu/exercices/volcan/etoiles-filantes-attrape-01.json',
  'contenu/exercices/volcan/etoiles-filantes-attrape-02.json',
] as const;

const HABILLAGES_PAR_ID: Readonly<Record<string, string>> = {
  'clairiere.lucioles': 'contenu/habillages/clairiere/lucioles.habillage.json',
  'foret.feuilles': 'contenu/habillages/foret-muette/feuilles.habillage.json',
  'marais.poissons': 'contenu/habillages/marais-jumeau/poissons.habillage.json',
  'volcan.etoiles-filantes': 'contenu/habillages/volcan/etoiles-filantes.habillage.json',
};

interface FicheAttrape {
  readonly id: string;
  readonly jeu: {
    readonly habillage: string;
    readonly contenu: ContenuAttrape;
  };
}

function servicesJeuDeTest(alea: Alea): ServicesJeu {
  return {
    ...servicesDeTest(),
    alea,
    haptique: { vibrer(): void {}, disponible: false },
    retour: {
      async depotCorrect(): Promise<void> {},
      async depotRefuse(): Promise<void> {},
      async palierFranchi(): Promise<void> {},
      reinitialiserSerie(): void {},
      animationsDesactivees: true,
    },
  };
}

function fiche(chemin: (typeof FICHES_ATTRAPE)[number]): { readonly contenu: ContenuAttrape; readonly habillage: Habillage } {
  const lue = lireJson<FicheAttrape>(chemin);
  const cheminHabillage = HABILLAGES_PAR_ID[lue.jeu.habillage];
  expect(cheminHabillage, `${chemin} ne pointe vers aucun habillage Attrape réel`).toBeDefined();
  return {
    contenu: lue.jeu.contenu,
    habillage: lireJson<Habillage>(cheminHabillage as string),
  };
}

function Harnais({ contenu, habillage, alea }: { readonly contenu: ContenuAttrape; readonly habillage: Habillage; readonly alea: Alea }): ReactElement {
  const horloge = useMemo(() => horlogeDeTest(), []);
  const services = useMemo(() => servicesJeuDeTest(alea), [alea]);
  const [etat, setEtat] = useState<EtatAttrape>(() =>
    moteurAttrape.creerEtat({ contenu, habillage, alea, horloge }),
  );
  const emettre = useCallback((action: ActionAttrape) => {
    setEtat((precedent) => moteurAttrape.reduire(precedent, action, { alea, horloge }));
  }, [alea, horloge]);

  return (
    <>
      <button type="button" data-harnais-action="aide" onClick={() => emettre({ type: 'demanderAide' })} />
      <MoteurAttrape
        contenu={contenu}
        habillage={habillage}
        etat={etat}
        emettre={emettre}
        services={services}
        animationsDesactivees
      />
    </>
  );
}

function ordreAffiche(racine: HTMLElement): string[] {
  return [...racine.querySelectorAll<HTMLElement>('[data-cible]')].map((cible) => {
    const id = cible.dataset['cible'];
    expect(id).toBeDefined();
    return id as string;
  });
}

/** Ordre spatial effectif des porteurs, ligne par ligne : c'est lui que l'enfant voit et tape. */
function ordreSpatial(racine: HTMLElement): string[] {
  return [...racine.querySelectorAll<HTMLButtonElement>('[data-cible]')]
    .map((bouton) => {
      const porteur = bouton.parentElement?.parentElement;
      const id = bouton.dataset['cible'];
      expect(porteur?.tagName).toBe('SPAN');
      expect(id).toBeDefined();
      return {
        id: id as string,
        x: Number.parseFloat(porteur?.style.insetInlineStart ?? 'NaN'),
        y: Number.parseFloat(porteur?.style.insetBlockStart ?? 'NaN'),
      };
    })
    .sort((gauche, droite) => gauche.y - droite.y || gauche.x - droite.x)
    .map((cible) => cible.id);
}

/** Le catalogue est canoniquement trié AVANT le tirage : l'édition ne choisit jamais la case 1. */
function ordreAttendu(contenu: ContenuAttrape, graine: number): string[] {
  return aleaDeTest(graine)
    .melanger([...contenu.cibles].sort((gauche, droite) => gauche.id.localeCompare(droite.id)))
    .map((cible) => cible.id);
}

/** Alea témoin : deux ouvertures de session reçoivent délibérément deux permutations distinctes. */
function aleaParSessions(): Alea & { readonly appelsMelange: () => number } {
  const base = aleaDeTest(801);
  let appels = 0;
  return {
    ...base,
    melanger<T>(elements: readonly T[]): T[] {
      appels += 1;
      return appels === 1 ? [...elements].reverse() : [...elements.slice(1), elements[0] as T];
    },
    appelsMelange(): number {
      return appels;
    },
  };
}

afterEach(() => {
  cleanup();
});

describe('MoteurAttrape — mélange de session', () => {
  it('mélange les cibles des sept fiches réelles avec l’Alea, sans perdre ni dupliquer de cible', () => {
    expect(FICHES_ATTRAPE).toHaveLength(7);
    for (const chemin of FICHES_ATTRAPE) {
      const { contenu, habillage } = fiche(chemin);
      const graine = 50_000 + contenu.cibles.length;
      const { container, unmount } = render(
        <Harnais contenu={contenu} habillage={habillage} alea={aleaDeTest(graine)} />,
      );
      expect(ordreAffiche(container), chemin).toEqual(ordreAttendu(contenu, graine));
      expect(ordreSpatial(container), `${chemin} : les positions de grille ne suivent pas le mélange`).toEqual(
        ordreAttendu(contenu, graine),
      );
      expect(ordreAffiche(container), `${chemin} : le tirage recopie l'ordre des données`).not.toEqual(
        contenu.cibles.map((cible) => cible.id),
      );
      unmount();
    }
  });

  it('donne la même permutation à une même graine malgré les ordres éditoriaux des cibles et des consignes', () => {
    const { contenu, habillage } = fiche(FICHES_ATTRAPE[0]);
    const reordonne: ContenuAttrape = {
      ...contenu,
      cibles: [...contenu.cibles].reverse(),
      consignes: [...contenu.consignes].reverse(),
    };
    const graine = 91_337;
    const premier = render(<Harnais contenu={contenu} habillage={habillage} alea={aleaDeTest(graine)} />);
    const ordrePremier = ordreAffiche(premier.container);
    const positionsPremieres = ordreSpatial(premier.container);
    premier.unmount();
    const second = render(<Harnais contenu={reordonne} habillage={habillage} alea={aleaDeTest(graine)} />);
    expect(ordrePremier).toEqual(ordreAffiche(second.container));
    expect(positionsPremieres).toEqual(ordreSpatial(second.container));
    expect(ordrePremier).toEqual(ordreAttendu(contenu, graine));
  });

  it('ne retire pas un nouveau mélange au rerender ni après une aide, mais le renouvelle à la session suivante', () => {
    const { contenu, habillage } = fiche(FICHES_ATTRAPE[0]);
    const alea = aleaParSessions();
    const vue = render(<Harnais contenu={contenu} habillage={habillage} alea={alea} />);
    const premiereSession = ordreAffiche(vue.container);
    vue.rerender(<Harnais contenu={contenu} habillage={habillage} alea={alea} />);
    fireEvent.click(vue.container.querySelector<HTMLElement>('[data-harnais-action="aide"]') as HTMLElement);
    expect(ordreAffiche(vue.container)).toEqual(premiereSession);
    expect(alea.appelsMelange()).toBe(1);
    vue.unmount();

    const suivante = render(<Harnais contenu={contenu} habillage={habillage} alea={alea} />);
    expect(ordreAffiche(suivante.container)).not.toEqual(premiereSession);
    expect(alea.appelsMelange()).toBe(2);
  });

  it('ne consomme l’Alea qu’une fois au montage sous StrictMode', () => {
    const { contenu, habillage } = fiche(FICHES_ATTRAPE[0]);
    const alea = aleaParSessions();
    render(
      <StrictMode>
        <Harnais contenu={contenu} habillage={habillage} alea={alea} />
      </StrictMode>,
    );
    expect(alea.appelsMelange()).toBe(1);
  });
});
