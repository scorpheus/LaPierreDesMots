/**
 * Le moteur `assemble` monté isolément — annexe T § T1 : « un test par moteur pour : bonne
 * réponse, mauvaise réponse, aide de Gobi, double-tap rapide ».
 *
 * Le composant de L2-E est **contrôlé** (contrat v1 § 4.4) : il reçoit `etat` et `emettre`.
 * Le harnais ci-dessous referme la boucle avec le VRAI réducteur `moteurAssemble.reduire`, de
 * sorte que ce fichier teste l'assemblage réel logique + rendu, pas une maquette.
 *
 * PREMIER CAS, ET IL N'EST PAS DÉCORATIF : la fixture est validée par le schéma que le moteur
 * publie lui-même. Sans lui, un test pourrait passer sur un contenu qu'aucun exercice réel ne
 * pourra jamais avoir — c'est-à-dire ne rien prouver du tout.
 *
 * L'habillage n'est PAS fabriqué : il est lu sur disque, parmi les trois écrits pour ce
 * moteur. Un test qui invente son décor ne dit rien de celui qui atteint l'enfant.
 */
import { readFileSync } from 'node:fs';
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';

import { moteurAssemble } from '@partage/moteurs/assemble/moteur';
import { MoteurAssemble } from '@client/moteurs/assemble/MoteurAssemble';
import type {
  ActionAssemble,
  EtatAssemble,
} from '@partage/moteurs/assemble/types';
import type { Habillage } from '@pierre/partage';
import type { ServicesJeu } from '@client/moteurs/types';

import { aleaDeTest, horlogeDeTest, lireJson, servicesDeTest } from '../configuration/preparation.js';

const CHEMIN_HABILLAGE = 'contenu/habillages/clairiere/collier.habillage.json';

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

import { contenuAssemble as contenu } from '../fixtures/moteurs/assemble.js';

/** Les déclarations d'un sélecteur dans une feuille (règles groupées comprises, commentaires ôtés). */
function bloc(css: string, selecteur: string): string {
  const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const corps: string[] = [];
  for (const m of sansCommentaires.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if ((m[1] ?? '').split(',').map((x) => x.trim()).includes(selecteur)) corps.push(m[2] ?? '');
  }
  return corps.join('\n');
}

/**
 * Le harnais expose le résumé et la progression en `data-*`. C'est volontaire : les
 * assertions portent alors sur ce que le composant DONNE À VOIR et sur ce que le moteur
 * CALCULE, jamais sur un état interne qu'aucun écran ne montrerait.
 */
function Harnais(): ReactElement {
  // Les actions réellement émises par le composant, dans l'ordre : prendre un bloc n'en émet
  // aucune (contrat assemble-pose-par-case § 2.1).
  const [actions, fixerActions] = useState<readonly ActionAssemble[]>([]);
  const [etat, setEtat] = useState<EtatAssemble>(() =>
    moteurAssemble.creerEtat({ contenu, habillage, alea, horloge }),
  );
  const emettre = useCallback((action: ActionAssemble) => {
    if (action.type === 'poser') fixerActions((precedentes) => [...precedentes, action]);
    setEtat((precedent) => moteurAssemble.reduire(precedent, action, { alea, horloge }));
  }, []);

  const resume = moteurAssemble.resume(etat);
  const progression = moteurAssemble.progression(etat);

  return (
    <div
      data-harnais="oui"
      data-poses={JSON.stringify(actions)}
      data-refus={etat.dernierRefus === null ? '' : etat.dernierRefus.motif}
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
      <MoteurAssemble
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

describe('moteur assemble', () => {
  it('le contenu de ce test est conforme au schéma que le moteur publie', () => {
    const ajv = new (Ajv2020 as unknown as {
      new (options?: Record<string, unknown>): { compile(s: unknown): (d: unknown) => boolean };
    })({ allErrors: true, strict: false });
    const valider = ajv.compile(moteurAssemble.schemaContenu);
    expect(valider(contenu)).toBe(true);
  });

  it('l’habillage lu sur disque déclare bien ce moteur', () => {
    expect(habillage.moteurs).toContain('assemble');
  });

  it('place la construction du mot sous l’image et la centre quelle que soit la largeur', () => {
    const { container } = render(<Harnais />);
    const bande = container.querySelector('[data-plateau="mot"]') as HTMLElement | null;
    const fentes = container.querySelector('[data-fentes="mot"]') as HTMLElement | null;
    expect(bande).not.toBeNull();
    expect(fentes).not.toBeNull();
    // La mise en page vit dans la feuille du moteur (assemble.css), pas dans des styles en ligne.
    const css = readFileSync('client/src/moteurs/assemble/assemble.css', 'utf8');
    expect(bande?.classList.contains('assemble-bande')).toBe(true);
    expect(fentes?.classList.contains('assemble-fentes')).toBe(true);
    expect(bloc(css, '.assemble-bande')).toMatch(/display:\s*flex/);
    expect(bloc(css, '.assemble-bande')).toMatch(/align-items:\s*center/);
    expect(bloc(css, '.assemble-bande')).toMatch(/text-align:\s*center/);
    expect(fentes?.getAttribute('data-alignement')).toBe('centre');
    expect(bloc(css, '.assemble-fentes')).toMatch(/justify-content:\s*center/);
    expect(bloc(css, '.assemble-fentes')).toMatch(/inline-size:\s*100%/);
  });

  it('bonne réponse : on prend le bloc, on le pose dans la case ; aucune erreur, aucun écran d’échec', () => {
    const { container } = render(<Harnais />);
    taper(container, [
      '[data-bloc="bloc-ta"]', '[data-case="0"]',
      '[data-bloc="bloc-pis"]', '[data-case="1"]',
    ]);
    const h = harnais(container);
    expect(h.getAttribute('data-erreurs')).toBe('0');
    expect(h.getAttribute('data-etapes-finies')).toBe('1');
    // R14, traduite mécaniquement : ce sélecteur ne doit JAMAIS rien trouver.
    expect(container.querySelector('[data-etat="echec"]')).toBeNull();
  });

  it('toucher un bloc le PREND : ni action, ni refus, ni erreur ; retoucher le repose', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-bloc="bloc-pis"]']);
    let h = harnais(container);
    expect(h.getAttribute('data-poses')).toBe('[]');
    expect(h.getAttribute('data-refus')).toBe('');
    expect(h.getAttribute('data-erreurs')).toBe('0');
    expect(container.querySelector('[data-bloc="bloc-pis"]')?.getAttribute('data-pris')).toBe('oui');
    // Un autre bloc : le bloc pris change, toujours rien d'émis.
    taper(container, ['[data-bloc="bloc-ta"]']);
    h = harnais(container);
    expect(h.getAttribute('data-poses')).toBe('[]');
    expect(container.querySelector('[data-bloc="bloc-pis"]')?.getAttribute('data-pris')).toBe('non');
    expect(container.querySelector('[data-bloc="bloc-ta"]')?.getAttribute('data-pris')).toBe('oui');
    // Retoucher le même bloc le repose dans la réserve.
    taper(container, ['[data-bloc="bloc-ta"]']);
    expect(container.querySelector('[data-bloc="bloc-ta"]')?.getAttribute('data-pris')).toBe('non');
    // Toucher une case sans bloc pris ne fait rien non plus.
    taper(container, ['[data-case="0"]']);
    h = harnais(container);
    expect(h.getAttribute('data-poses')).toBe('[]');
    expect(h.getAttribute('data-refus')).toBe('');
  });

  it('toucher un bloc puis une case émet `poser` avec le rang de la case', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-bloc="bloc-pis"]', '[data-case="1"]']);
    const h = harnais(container);
    expect(JSON.parse(h.getAttribute('data-poses') ?? '[]')).toEqual([
      { type: 'poser', bloc: 'bloc-pis', case: 1 },
    ]);
    // L'ordre de remplissage est libre : pis en case 2 d'abord est ACCEPTÉ.
    expect(h.getAttribute('data-refus')).toBe('');
    expect(h.getAttribute('data-erreurs')).toBe('0');
    expect(container.querySelector('[data-fentes="mot"]')?.getAttribute('data-restantes')).toBe('1');
  });

  it('mauvaise réponse : le bloc posé dans la mauvaise case compte une erreur et revient', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-bloc="bloc-bis"]', '[data-case="1"]']);
    const h = harnais(container);
    expect(h.getAttribute('data-erreurs')).toBe('1');
    expect(h.getAttribute('data-reussi')).toBe('true');
    expect(container.querySelector('[data-etat="echec"]')).toBeNull();
    // D23 : un refus de lecture journalise l'étiquette attendue (à CE rang) et celle qui a été lue.
    expect(h.getAttribute('data-confusion')).toBe('pis>bis');
    // R14 : rien ne se perd, le bloc revient dans la réserve, plus pris.
    expect(container.querySelector('[data-bloc="bloc-bis"]')?.getAttribute('data-pris')).toBe('non');
  });

  it('case occupée : refus sans erreur', () => {
    const { container } = render(<Harnais />);
    taper(container, [
      '[data-bloc="bloc-ta"]', '[data-case="0"]',
      '[data-bloc="bloc-pis"]', '[data-case="0"]',
    ]);
    const h = harnais(container);
    expect(h.getAttribute('data-refus')).toBe('case-occupee');
    expect(h.getAttribute('data-erreurs')).toBe('0');
  });

  it('aide de Gobi : exactement le palier `indice`, jamais davantage', () => {
    const { container } = render(<Harnais />);
    taper(container, ['[data-harnais-action="aide"]']);
    expect(container.querySelector('[data-moteur="assemble"]')?.getAttribute('data-aide')).toBe(
      'indice',
    );
    // Deuxième appel : l'escalade est monotone, elle ne saute pas au palier suivant.
    taper(container, ['[data-harnais-action="aide"]']);
    expect(container.querySelector('[data-moteur="assemble"]')?.getAttribute('data-aide')).toBe(
      'indice',
    );
  });

  it('double-tap : le second appui ne compte aucune erreur', () => {
    const { container } = render(<Harnais />);
    // Deux appuis sur le même bloc le prennent puis le reposent ; un double appui sur la case
    // ne pose rien deux fois.
    taper(container, ['[data-bloc="bloc-ta"]', '[data-bloc="bloc-ta"]']);
    taper(container, ['[data-bloc="bloc-ta"]', '[data-case="0"]', '[data-case="0"]']);
    taper(container, ['[data-bloc="bloc-pis"]', '[data-case="1"]']);
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
