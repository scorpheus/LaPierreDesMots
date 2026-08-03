/**
 * Le moteur `attrape` monté isolément — annexe T § T1 : « un test par moteur pour : bonne
 * réponse, mauvaise réponse, aide de Gobi, double-tap rapide ».
 *
 * Le composant de L2-E est **contrôlé** (contrat v1 § 4.4) : il reçoit `etat` et `emettre`.
 * Le harnais ci-dessous referme la boucle avec le VRAI réducteur `moteurAttrape.reduire`, de
 * sorte que ce fichier teste l'assemblage réel logique + rendu, pas une maquette.
 *
 * PREMIER CAS, ET IL N'EST PAS DÉCORATIF : la fixture est validée par le schéma que le moteur
 * publie lui-même. Sans lui, un test pourrait passer sur un contenu qu'aucun exercice réel ne
 * pourra jamais avoir — c'est-à-dire ne rien prouver du tout.
 *
 * L'habillage n'est PAS fabriqué : il est lu sur disque, parmi les trois écrits pour ce
 * moteur. Un test qui invente son décor ne dit rien de celui qui atteint l'enfant.
 */
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

import { moteurAttrape } from '@partage/moteurs/attrape/moteur';
import { MoteurAttrape } from '@client/moteurs/attrape/MoteurAttrape';
import type {
  ActionAttrape,
  EtatAttrape,
} from '@partage/moteurs/attrape/types';
import type { Habillage } from '@pierre/partage';
import type { ServicesJeu } from '@client/moteurs/types';

import { aleaDeTest, horlogeDeTest, lireJson, servicesDeTest } from '../configuration/preparation.js';

const CHEMIN_HABILLAGE = 'contenu/habillages/clairiere/lucioles.habillage.json';

const habillage: Habillage = lireJson<Habillage>(CHEMIN_HABILLAGE);
const horloge = horlogeDeTest();
const alea = aleaDeTest();

/**
 * `ServicesJeu` gagne `haptique` et `retour` par L2-A, que `preparation.ts` (lot L-G, NON
 * réattribué par cette campagne) ne sait pas encore construire. On complète ici, et on passe
 * par une variable intermédiaire : assigner un littéral déclencherait le contrôle des
 * propriétés en trop tant que L2-A n'a pas rendu, et ce fichier ne compilerait ni avant, ni
 * après. Écart signalé dans le rapport de lot.
 */
function servicesJeuDeTest(): ServicesJeu {
  const assemble = {
    ...servicesDeTest(),
    haptique: { vibrer(): void {}, disponible: false },
    retour: {
      async depotCorrect(): Promise<void> {},
      async depotRefuse(): Promise<void> {},
      async palierFranchi(): Promise<void> {},
      reinitialiserSerie(): void {},
      animationsDesactivees: true,
    },
  };
  return assemble;
}

const services = servicesJeuDeTest();

import { contenuAttrape as contenu } from '../fixtures/moteurs/attrape.js';

/**
 * Le harnais expose le résumé et la progression en `data-*`. C'est volontaire : les
 * assertions portent alors sur ce que le composant DONNE À VOIR et sur ce que le moteur
 * CALCULE, jamais sur un état interne qu'aucun écran ne montrerait.
 */
function Harnais(): ReactElement {
  const [etat, setEtat] = useState<EtatAttrape>(() =>
    moteurAttrape.creerEtat({ contenu, habillage, alea, horloge }),
  );
  const emettre = useCallback((action: ActionAttrape) => {
    setEtat((precedent) => moteurAttrape.reduire(precedent, action, { alea, horloge }));
  }, []);

  const resume = moteurAttrape.resume(etat);
  const progression = moteurAttrape.progression(etat);

  return (
    <div
      data-harnais="oui"
      data-erreurs={String(resume.nbErreurs)}
      data-reussi={String(resume.reussi)}
      data-aide-resume={resume.aideUtilisee}
      data-etapes-finies={String(
        etat.etapes.filter((e) => e.finMs !== null).length,
      )}
      data-avancement={progression.avancement.toFixed(3)}
      data-confusion={
        etat.etapes
          .map((e) => (e.confusion === null ? '' : `${e.confusion.attendu}>${e.confusion.rendu}`))
          .filter((c) => c !== '')
          .join(',')
      }
    >
      {/* PRISES DU HARNAIS — R10. « Écouter » et « Gobi » ont quitté les moteurs : ils
          appartiennent à l'écran, qui monte les VRAIS (BoutonEcouter joue le clip et disparaît
          sans clip, D42 ; <Gobi> porte la même prise data-action="aide"). Les onze boutons que
          les moteurs rendaient étaient muets — leur onClick n'appelait jamais le service de
          voix. Ces deux prises-ci gardent les propriétés du RÉDUCTEUR, qui n'ont pas changé :
          réécouter ne coûte ni erreur ni palier (R15), l'aide s'escalade sans sauter. Elles
          sont nommées data-harnais-action pour qu'on ne les confonde jamais avec un contrôle
          du produit. */}
      <button
        type="button"
        data-harnais-action="ecouter"
        onClick={() => {
          emettre({ type: 'ecouterConsigne' } as never);
        }}
      />
      <button
        type="button"
        data-harnais-action="aide"
        onClick={() => {
          emettre({ type: 'demanderAide' } as never);
        }}
      />
      <MoteurAttrape
        contenu={contenu}
        habillage={habillage}
        etat={etat}
        emettre={emettre}
        services={services}
        animationsDesactivees
      />
    </div>
  );
}

/**
 * Tape sur les cibles, dans l'ordre. `fireEvent` et non `element.click()` : Testing Library
 * enveloppe l'événement dans `act()`, sans quoi React 19 ne vide pas sa file de rendu et le
 * DOM lu juste après serait celui d'AVANT le geste. Onze suites l'ont appris d'un coup.
 */
function taper(racine: HTMLElement, selecteurs: readonly string[]): void {
  for (const selecteur of selecteurs) {
    const cible = racine.querySelector<HTMLElement>(selecteur);
    expect(cible, `cible introuvable : ${selecteur}`).not.toBeNull();
    if (cible !== null) fireEvent.click(cible);
  }
}

function harnais(racine: HTMLElement): HTMLElement {
  const noeud = racine.querySelector<HTMLElement>('[data-harnais="oui"]');
  expect(noeud).not.toBeNull();
  return noeud as HTMLElement;
}

afterEach(() => {
  cleanup();
});

describe('moteur attrape', () => {
  it('le contenu de ce test est conforme au schéma que le moteur publie', () => {
    const ajv = new (Ajv2020 as unknown as {
      new (options?: Record<string, unknown>): { compile(s: unknown): (d: unknown) => boolean };
    })({ allErrors: true, strict: false });
    const valider = ajv.compile(moteurAttrape.schemaContenu);
    expect(valider(contenu)).toBe(true);
  });

  it('l’habillage lu sur disque déclare bien ce moteur', () => {
    expect(habillage.moteurs).toContain('attrape');
  });

  it('bonne réponse : l’étape avance, aucune erreur, aucun écran d’échec', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-cible="lettre-b"]']);
    const h = harnais(container);
    expect(h.getAttribute('data-erreurs')).toBe('0');
    expect(h.getAttribute('data-etapes-finies')).toBe('1');
    // R14, traduite mécaniquement : ce sélecteur ne doit JAMAIS rien trouver.
    expect(container.querySelector('[data-etat="echec"]')).toBeNull();
  });

  it('mauvaise réponse : une erreur comptée, rien de rouge, la tentative reste réussie', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-cible="lettre-d"]']);
    const h = harnais(container);
    expect(h.getAttribute('data-erreurs')).toBe('1');
    expect(h.getAttribute('data-reussi')).toBe('true');
    expect(container.querySelector('[data-etat="echec"]')).toBeNull();
    // D23 : un refus de lecture journalise l'étiquette attendue et celle qui a été lue.
    // Sans ce champ, le top 10 du dashboard serait vide et personne ne s'en apercevrait.
    expect(h.getAttribute('data-confusion')).toBe('b>d');
  });

  it('aide de Gobi : exactement le palier `indice`, jamais davantage', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-harnais-action="aide"]']);
    expect(container.querySelector('[data-moteur="attrape"]')?.getAttribute('data-aide')).toBe(
      'indice',
    );
    // Deuxième appel : l'escalade est monotone, elle ne saute pas au palier suivant.
    taper(container, ['[data-harnais-action="aide"]']);
    expect(container.querySelector('[data-moteur="attrape"]')?.getAttribute('data-aide')).toBe(
      'indice',
    );
  });

  it('double-tap : le second appui ne compte aucune erreur', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-cible="lettre-b"]', '[data-cible="lettre-b"]']);
    expect(harnais(container).getAttribute('data-erreurs')).toBe('0');
  });

  it('réécouter est gratuit : aucune erreur, aucun palier d’aide', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-harnais-action="ecouter"]', '[data-harnais-action="ecouter"]']);
    const h = harnais(container);
    expect(h.getAttribute('data-erreurs')).toBe('0');
    expect(h.getAttribute('data-aide-resume')).toBe('aucune');
  });
});
