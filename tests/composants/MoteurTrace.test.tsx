/**
 * Le moteur `trace` monté isolément — annexe T § T1, plus le cas propre à ce moteur : **le
 * geste interrompu**.
 *
 * Le harnais referme la boucle avec le vrai réducteur `moteurTrace.reduire` : ce fichier
 * teste l'assemblage réel logique + rendu, pas une maquette.
 *
 * L'ASSERTION QUI COMPTE LE PLUS ICI est `data-axe` : **un seul axe, jamais deux** (D23).
 * Un attribut qui porterait « gauche-droite haut-bas » ferait passer un test naïf et rendrait
 * le top 10 du dashboard illisible.
 */
import { useCallback, useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { moteurTrace } from '@partage/moteurs/trace/moteur';
import { renduTrace } from '@client/moteurs/trace/index';
import { reechantillonner } from '@client/moteurs/trace/echantillonnage';

import type {
  ActionTrace,
  ContenuTrace,
  EchantillonGeste,
  EtatTrace,
  ModeleLettre,
} from '@partage/moteurs/trace/index';
import type { Exercice, Habillage } from '@pierre/partage';

import {
  aleaDeTest,
  horlogeDeTest,
  lireJson,
  servicesDeTest,
} from '../configuration/preparation.js';

const CHEMIN_BD = 'contenu/exercices/galeries/miroir-bd-01.json';
const CHEMIN_BP = 'contenu/exercices/galeries/miroir-bp-01.json';
const CHEMIN_HABILLAGE = 'contenu/habillages/galeries/tracer-cristal.habillage.json';
const CHEMIN_LETTRES = 'contenu/modeles-lettres/minuscules.json';

const contenuBd = (lireJson<Exercice>(CHEMIN_BD).jeu.contenu as unknown) as ContenuTrace;
const contenuBp = (lireJson<Exercice>(CHEMIN_BP).jeu.contenu as unknown) as ContenuTrace;
const habillage = lireJson<Habillage>(CHEMIN_HABILLAGE);
const parLettre = new Map(
  lireJson<{ lettres: ModeleLettre[] }>(CHEMIN_LETTRES).lettres.map((l) => [l.lettre, l]),
);

/**
 * `getBoundingClientRect` de happy-dom rend des zéros : le composant retomberait alors sur
 * les coordonnées brutes du pointeur. On installe une boîte de 420 × 672 px — exactement le
 * `min(100%, 420px)` du composant sur un `viewBox` 100 × 160 —, de sorte que la conversion
 * px → `viewBox` testée ici soit celle qui tournera sur la tablette.
 */
function installerBoite(): void {
  const noeud = document.querySelector('[data-scene="trace"]');
  expect(noeud).not.toBeNull();
  (noeud as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 420, height: 672, right: 420, bottom: 672, x: 0, y: 0 }) as DOMRect;
}

function Harnais(proprietes: { readonly contenu: ContenuTrace }): ReturnType<
  typeof renduTrace.Composant
> {
  const { contenu } = proprietes;
  const services = servicesDeTest();
  const [etat, setEtat] = useState<EtatTrace>(() =>
    moteurTrace.creerEtat({ contenu, habillage, alea: aleaDeTest(), horloge: horlogeDeTest() }),
  );
  const emettre = useCallback((action: ActionTrace) => {
    setEtat((courant) =>
      moteurTrace.reduire(courant, action, { alea: aleaDeTest(), horloge: horlogeDeTest() }),
    );
  }, []);

  const Composant = renduTrace.Composant;
  return (
    <Composant
      contenu={contenu}
      habillage={habillage}
      etat={etat}
      emettre={emettre}
      services={services}
      animationsDesactivees
    />
  );
}

/** Convertit un point `viewBox` (100 × 160) en pixels clients, boîte 420 × 672. */
function enPixels(point: readonly [number, number]): { clientX: number; clientY: number } {
  return { clientX: (point[0] / 100) * 420, clientY: (point[1] / 160) * 672 };
}

/** Joue un geste au doigt sur la scène : contact, déplacements, relâchement. */
function tracerGeste(points: readonly (readonly [number, number])[], relacher = true): void {
  const scene = document.querySelector('[data-scene="trace"]')!;
  const [premier, ...suite] = points;
  fireEvent.pointerDown(scene, { pointerId: 1, ...enPixels(premier!) });
  for (const point of suite) {
    fireEvent.pointerMove(scene, { pointerId: 1, ...enPixels(point) });
  }
  if (relacher) fireEvent.pointerUp(scene, { pointerId: 1 });
}

afterEach(() => {
  cleanup();
});

describe('MoteurTrace — data-axe porte UN axe, jamais deux (D23)', () => {
  it('l’exercice b/d annonce gauche-droite, et rien d’autre', () => {
    render(<Harnais contenu={contenuBd} />);
    const racine = document.querySelector('[data-moteur="trace"]')!;
    const axe = racine.getAttribute('data-axe');
    expect(axe).toBe('gauche-droite');
    expect(axe!.split(/\s+/).length).toBe(1);
  });

  it('l’exercice b/p annonce haut-bas, et rien d’autre', () => {
    render(<Harnais contenu={contenuBp} />);
    const axe = document.querySelector('[data-moteur="trace"]')!.getAttribute('data-axe');
    expect(axe).toBe('haut-bas');
    expect(axe!.split(/\s+/).length).toBe(1);
  });

  it('un trait par trait de la lettre, avec son état', () => {
    render(<Harnais contenu={contenuBd} />);
    const traits = document.querySelectorAll('[data-trait]');
    expect(traits.length).toBe(contenuBd.lettres[0]!.traits.length);
    const etats = [...traits].map((t) => t.getAttribute('data-trait-etat'));
    expect(etats).toContain('en-cours');
    expect(etats.every((e) => e === 'a-tracer' || e === 'en-cours' || e === 'trace')).toBe(true);
  });
});

describe('MoteurTrace — bonne réponse, mauvaise, aide, geste interrompu', () => {
  it('BONNE RÉPONSE : le trait suivi correctement passe à « trace »', () => {
    render(<Harnais contenu={contenuBd} />);
    installerBoite();
    const trait = contenuBd.lettres[0]!.traits[0]!;
    tracerGeste(trait.points);

    const rendu = document.querySelector(`[data-trait="${trait.id}"]`);
    expect(rendu?.getAttribute('data-trait-etat')).toBe('trace');
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
  });

  it('MAUVAISE RÉPONSE : tracer le d au lieu du b journalise l’AXE, sans écran d’échec', () => {
    render(<Harnais contenu={contenuBd} />);
    installerBoite();
    const attendu = contenuBd.lettres[0]!.traits[0]!;
    const jumeau = parLettre.get('d')!.traits.find((t) => t.libelle === attendu.libelle)!;
    tracerGeste(jumeau.points);

    const racine = document.querySelector('[data-moteur="trace"]')!;
    expect(racine.getAttribute('data-axe-confondu')).toBe('gauche-droite');
    expect(document.querySelector(`[data-trait="${attendu.id}"]`)?.getAttribute('data-trait-etat'))
      .toBe('en-cours');
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
    // Le message est un encouragement, jamais un reproche.
    expect(document.body.textContent).toContain('tranquillement');
  });

  it('l’exercice b/p ne journalise JAMAIS gauche-droite, même sur un geste raté', () => {
    render(<Harnais contenu={contenuBp} />);
    installerBoite();
    const attendu = contenuBp.lettres[0]!.traits[0]!;
    const jumeau = parLettre.get('p')!.traits.find((t) => t.libelle === attendu.libelle)!;
    tracerGeste(jumeau.points);

    const confondu = document
      .querySelector('[data-moteur="trace"]')!
      .getAttribute('data-axe-confondu');
    expect(confondu).not.toBe('gauche-droite');
  });

  it('GESTE INTERROMPU : un doigt qui quitte la scène ne laisse aucun état bloqué', () => {
    render(<Harnais contenu={contenuBd} />);
    installerBoite();
    const trait = contenuBd.lettres[0]!.traits[0]!;
    // On commence le trait, puis le doigt sort — `pointerleave` termine le geste.
    tracerGeste(trait.points.slice(0, 3), false);
    fireEvent.pointerLeave(document.querySelector('[data-scene="trace"]')!, { pointerId: 1 });

    // Rien n'est validé, rien n'est bloqué, et le trait reste jouable.
    expect(document.querySelector(`[data-trait="${trait.id}"]`)?.getAttribute('data-trait-etat'))
      .toBe('en-cours');
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();

    // Et on peut le refaire correctement juste après.
    tracerGeste(trait.points);
    expect(document.querySelector(`[data-trait="${trait.id}"]`)?.getAttribute('data-trait-etat'))
      .toBe('trace');
  });

  it('AIDE : le libellé du trait attendu est disponible pour Gobi, jamais seulement écrit', () => {
    render(<Harnais contenu={contenuBd} />);
    const libelle = document.querySelector('[data-trait-libelle="oui"]');
    expect(libelle?.textContent).toBe(contenuBd.lettres[0]!.traits[0]!.libelle);
    // ── LES TROIS LIGNES SUR LA CONSIGNE ONT ÉTÉ RETIRÉES AVEC R49 ────────────────────────
    //
    // Elles exigeaient `[data-consigne-texte="oui"]` DANS le moteur — c'est-à-dire le doublon
    // que le père a signalé (« la phrase est en haut et en bas »). `EcranNoeud` la porte seul.
    // Ce cas-ci garde ce qui lui appartient vraiment : le libellé du trait pour Gobi.
    //
    // L'exigence a suivi l'objet : affichage chez `EcranNoeud.test.tsx` (« R49 »), audibilité
    // chez `parcours-variete.spec.ts:300` (R15), non-retour chez `consigne-sans-doublon.test.ts`.
  });

  it('L’EXERCICE VA JUSQU’AU BOUT, les deux lettres tracées', () => {
    render(<Harnais contenu={contenuBd} />);
    installerBoite();
    for (const lettre of contenuBd.lettres) {
      for (const trait of lettre.traits) {
        installerBoite();
        tracerGeste(trait.points);
      }
    }
    expect(document.querySelector('[data-moteur="trace"]')?.getAttribute('data-termine')).toBe(
      'oui',
    );
  });
});

describe('reechantillonner — la mesure ne dépend pas de la vitesse du doigt', () => {
  const trait = parLettre.get('b')!.traits[0]!;

  function geste(nbPoints: number): readonly EchantillonGeste[] {
    const depart = trait.depart;
    const arrivee = trait.arrivee;
    return Array.from({ length: nbPoints }, (_, i) => {
      const f = i / (nbPoints - 1);
      return {
        point: [
          depart[0] + (arrivee[0] - depart[0]) * f,
          depart[1] + (arrivee[1] - depart[1]) * f,
        ] as readonly [number, number],
        instantMs: i * 5,
      };
    });
  }

  it('un doigt lent et un doigt rapide rendent le MÊME tracé rééchantillonné', () => {
    const lent = reechantillonner(geste(200), 5);
    const rapide = reechantillonner(geste(12), 5);
    expect(lent.length).toBe(rapide.length);
    lent.forEach((e, i) => {
      expect(e.point[0]).toBeCloseTo(rapide[i]!.point[0], 6);
      expect(e.point[1]).toBeCloseTo(rapide[i]!.point[1], 6);
    });
  });

  it('conserve toujours le premier et le dernier échantillon', () => {
    const brut = geste(37);
    const lisse = reechantillonner(brut, 5);
    expect(lisse[0]!.point[0]).toBeCloseTo(brut[0]!.point[0], 6);
    expect(lisse[lisse.length - 1]!.point[1]).toBeCloseTo(brut[brut.length - 1]!.point[1], 6);
  });

  it('un pas absurde ne fige rien : le geste est rendu tel quel', () => {
    const brut = geste(10);
    expect(reechantillonner(brut, 0)).toBe(brut);
    expect(reechantillonner(brut, -3)).toBe(brut);
  });
});
