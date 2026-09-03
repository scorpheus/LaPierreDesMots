/**
 * Le moteur `tri` monté isolément — annexe T § T1 : « un test par moteur pour : bonne
 * réponse, mauvaise réponse, aide de Gobi, double-tap rapide ».
 *
 * Le composant de L2-E est **contrôlé** (contrat v1 § 4.4) : il reçoit `etat` et `emettre`.
 * Le harnais ci-dessous referme la boucle avec le VRAI réducteur `moteurTri.reduire`, de
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

import { moteurTri } from '@partage/moteurs/tri/moteur';
import { MoteurTri } from '@client/moteurs/tri/MoteurTri';
import type {
  ActionTri,
  ContenuTri,
  EtatTri,
} from '@partage/moteurs/tri/types';
import type { Exercice, Habillage } from '@pierre/partage';
import type { ServicesJeu } from '@client/moteurs/types';

import { aleaDeTest, horlogeDeTest, lireJson, servicesDeTest } from '../configuration/preparation.js';

const CHEMIN_HABILLAGE = 'contenu/habillages/clairiere/paniers.habillage.json';

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

import { contenuTri as contenu } from '../fixtures/moteurs/tri.js';

const exercicePaniersVoyelles = lireJson<Exercice>(
  'contenu/exercices/clairiere/paniers-voyelles-01.json',
);
const contenuPaniersVoyelles = exercicePaniersVoyelles.jeu.contenu as ContenuTri;

/**
 * Le harnais expose le résumé et la progression en `data-*`. C'est volontaire : les
 * assertions portent alors sur ce que le composant DONNE À VOIR et sur ce que le moteur
 * CALCULE, jamais sur un état interne qu'aucun écran ne montrerait.
 */
function Harnais({ contenuTest = contenu }: { readonly contenuTest?: ContenuTri } = {}): ReactElement {
  const [etat, setEtat] = useState<EtatTri>(() =>
    moteurTri.creerEtat({ contenu: contenuTest, habillage, alea, horloge }),
  );
  const emettre = useCallback((action: ActionTri) => {
    setEtat((precedent) => moteurTri.reduire(precedent, action, { alea, horloge }));
  }, []);

  const resume = moteurTri.resume(etat);
  const progression = moteurTri.progression(etat);

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
      data-index-etape={String(etat.indexEtape)}
      data-acquis={String(Object.keys(etat.acquis).length)}
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
      <MoteurTri
        contenu={contenuTest}
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

describe('moteur tri', () => {
  it('le contenu de ce test est conforme au schéma que le moteur publie', () => {
    const ajv = new (Ajv2020 as unknown as {
      new (options?: Record<string, unknown>): { compile(s: unknown): (d: unknown) => boolean };
    })({ allErrors: true, strict: false });
    const valider = ajv.compile(moteurTri.schemaContenu);
    expect(valider(contenu)).toBe(true);
  });

  it('l’habillage lu sur disque déclare bien ce moteur', () => {
    expect(habillage.moteurs).toContain('tri');
  });

  it('bonne réponse : l’étape avance, aucune erreur, aucun écran d’échec', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-element="mot-loup"]', '[data-receptacle="panier-ou"]']);
    const h = harnais(container);
    expect(h.getAttribute('data-erreurs')).toBe('0');
    expect(h.getAttribute('data-etapes-finies')).toBe('1');
    // R14, traduite mécaniquement : ce sélecteur ne doit JAMAIS rien trouver.
    expect(container.querySelector('[data-etat="echec"]')).toBeNull();
  });

  it('mauvaise réponse : une erreur comptée, rien de rouge, la tentative reste réussie', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-element="mot-loup"]', '[data-receptacle="panier-on"]']);
    const h = harnais(container);
    expect(h.getAttribute('data-erreurs')).toBe('1');
    expect(h.getAttribute('data-reussi')).toBe('true');
    expect(container.querySelector('[data-etat="echec"]')).toBeNull();
    // D23 : un refus de lecture journalise l'étiquette attendue et celle qui a été lue.
    // Sans ce champ, le top 10 du dashboard serait vide et personne ne s'en apercevrait.
    expect(h.getAttribute('data-confusion')).toBe('loup>long');
  });

  it('aide de Gobi : exactement le palier `indice`, jamais davantage', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-harnais-action="aide"]']);
    expect(container.querySelector('[data-moteur="tri"]')?.getAttribute('data-aide')).toBe(
      'indice',
    );
    // Deuxième appel : l'escalade est monotone, elle ne saute pas au palier suivant.
    taper(container, ['[data-harnais-action="aide"]']);
    expect(container.querySelector('[data-moteur="tri"]')?.getAttribute('data-aide')).toBe(
      'indice',
    );
  });

  it('double-tap : le second appui ne compte aucune erreur', () => {
    const { container } = render(<Harnais />);
    taper(container, [
      '[data-element="mot-loup"]',
      '[data-receptacle="panier-ou"]',
      '[data-element="mot-loup"]',
      '[data-receptacle="panier-ou"]',
    ]);
    expect(harnais(container).getAttribute('data-erreurs')).toBe('0');
  });

  it('réécouter est gratuit : aucune erreur, aucun palier d’aide', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-harnais-action="ecouter"]', '[data-harnais-action="ecouter"]']);
    const h = harnais(container);
    expect(h.getAttribute('data-erreurs')).toBe('0');
    expect(h.getAttribute('data-aide-resume')).toBe('aucune');
  });

  it('accepte rat dès la consigne du a puis saute les lots déjà rangés', () => {
    const { container } = render(<Harnais contenuTest={contenuPaniersVoyelles} />);

    // `rat`, `sac` et `banane` figurent dans les lots suivants du JSON, mais répondent déjà
    // exactement à « les mots où tu lis un a ». Ils ne doivent pas être des boutons morts.
    for (const id of ['mot-rat', 'mot-sac', 'mot-banane', 'mot-chat', 'mot-papa', 'mot-lac']) {
      taper(container, [`[data-element="${id}"]`, '[data-receptacle="panier-du-a"]']);
    }
    expect(harnais(container).getAttribute('data-acquis')).toBe('6');
    expect(harnais(container).getAttribute('data-index-etape')).toBe('1');

    for (const id of ['mot-fil', 'mot-ville', 'mot-pic', 'mot-lit', 'mot-riz', 'mot-midi']) {
      taper(container, [`[data-element="${id}"]`, '[data-receptacle="panier-du-i"]']);
    }
    expect(harnais(container).getAttribute('data-acquis')).toBe('12');
    expect(container.querySelector('[data-moteur="tri"]')?.getAttribute('data-termine')).toBe('oui');
    expect(harnais(container).getAttribute('data-erreurs')).toBe('0');
  });
});
