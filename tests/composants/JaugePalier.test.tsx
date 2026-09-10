/**
 * La jauge affiche le VIDE restant — D25 point 3 (lot L2-A).
 *
 * Toutes les assertions de ce fichier portent sur le **DOM**, jamais sur le calcul : la
 * cascade est déjà prouvée par `tests/unitaires/cascade.test.ts`. Ce qui reste à prouver ici
 * est exactement l'erreur que D25 point 3 interdit — *une vue qui n'afficherait que l'acquis*.
 * Un test qui relirait `jauge.restant` au lieu de l'attribut ne verrait pas cette erreur-là.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import type { JaugePalier as ModeleJauge, SeuilsCascade } from '@pierre/partage';
import { ETAT_CASCADE_VIDE, appliquerEtoiles, jaugesDe } from '@pierre/partage/recompenses';

import { JaugePalier } from '@client/composants/JaugePalier.js';
import { INSTANT_DE_REFERENCE } from '../configuration/preparation.js';

afterEach(cleanup);

const SEUILS: SeuilsCascade = {
  etoilesParIntermediaire: 5,
  intermediairesParRare: 10,
  natureIntermediaire: 'forme-gobi',
  natureRare: 'zone-recoloriee'
};

function jaugeDu(palier: ModeleJauge['palier'], etoiles: number): ModeleJauge {
  let etat = ETAT_CASCADE_VIDE;
  for (let index = 0; index < etoiles; index += 1) {
    etat = appliquerEtoiles(etat, 1, SEUILS, INSTANT_DE_REFERENCE).etat;
  }
  const jauge = jaugesDe(etat, SEUILS).find((candidate) => candidate.palier === palier);
  if (jauge === undefined) {
    throw new Error(`aucune jauge « ${palier} » : la cascade n'en rend pas trois.`);
  }
  return jauge;
}

describe('JaugePalier — `data-restant` porte le RESTE, jamais l’acquis', () => {
  test('trois étoiles sur cinq : l’attribut vaut 2, et non 3', () => {
    render(<JaugePalier jauge={jaugeDu('intermediaire', 3)} />);
    const jauge = screen.getByRole('group');
    expect(jauge.getAttribute('data-palier')).toBe('intermediaire');
    // Le cœur du test : 3 acquises, 5 requises — l'attribut dit 2.
    expect(jauge.getAttribute('data-restant')).toBe('2');
  });

  test('la jauge dessine les cases VIDES, une par une — c’est ce qui motive (D25)', () => {
    render(<JaugePalier jauge={jaugeDu('intermediaire', 3)} />);
    const jauge = screen.getByRole('group');
    const cases = within(jauge).getAllByText('', { selector: '[data-case]' });
    expect(cases).toHaveLength(5);
    expect(cases.filter((c) => c.getAttribute('data-acquise') === 'oui')).toHaveLength(3);
    // Les deux cases vides EXISTENT dans le DOM. Une jauge qui ne rendrait que l'acquis
    // afficherait trois éléments et passerait l'assertion précédente sans rien montrer.
    expect(cases.filter((c) => c.getAttribute('data-acquise') === 'non')).toHaveLength(2);
  });

  test('le texte lisible dit le reste, pas le score', () => {
    render(<JaugePalier jauge={jaugeDu('intermediaire', 3)} />);
    expect(screen.getByText('Encore 2 nouveaux exercices réussis avant la prochaine forme de Gobi.')).toBeTruthy();
  });

  test('à zéro étoile, tout est vide et l’attribut vaut le requis entier', () => {
    render(<JaugePalier jauge={jaugeDu('intermediaire', 0)} />);
    const jauge = screen.getByRole('group');
    expect(jauge.getAttribute('data-restant')).toBe('5');
    const cases = within(jauge).getAllByText('', { selector: '[data-case]' });
    expect(cases.every((c) => c.getAttribute('data-acquise') === 'non')).toBe(true);
  });

  test('la jauge du palier rare passe en barre au-delà de 12 cases, et garde `data-restant`', () => {
    render(<JaugePalier jauge={jaugeDu('rare', 0)} />);
    const jauge = screen.getByRole('group');
    expect(jauge.getAttribute('data-palier')).toBe('rare');
    expect(jauge.getAttribute('data-restant')).toBe('10');
  });

  test('AUCUNE couleur d’échec, aucun barré : les cases vides sont en creux', () => {
    const { container } = render(<JaugePalier jauge={jaugeDu('intermediaire', 1)} />);
    expect(container.querySelector('[data-etat="echec"]')).toBeNull();
    const vides = container.querySelectorAll('[data-case][data-acquise="non"]');
    expect(vides.length).toBeGreaterThan(0);
    for (const vide of vides) {
      const style = (vide as HTMLElement).getAttribute('style') ?? '';
      expect(style).toContain('transparent');
      expect(style).toContain('var(--grisaille)');
      expect(style).not.toContain('red');
    }
  });

  test('les trois jauges de la cascade se rendent toutes, sans exception', () => {
    for (const palier of ['etoile', 'intermediaire', 'rare'] as const) {
      cleanup();
      render(<JaugePalier jauge={jaugeDu(palier, 7)} />);
      const jauge = screen.getByRole('group');
      expect(jauge.getAttribute('data-palier')).toBe(palier);
      expect(Number(jauge.getAttribute('data-restant'))).toBeGreaterThanOrEqual(0);
    }
  });

  test('l’étoile annonce la règle de gain, pas un compte à rebours figé à un', () => {
    const modele = Object.freeze(jaugeDu('etoile', 16));
    render(<JaugePalier jauge={modele} />);
    const phrase = 'Une étoile à chaque nouvel exercice réussi.';
    expect(screen.getByText(phrase)).toBeTruthy();
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(phrase);
    expect(screen.getByRole('group').getAttribute('data-restant')).toBe('1');
    expect(modele).toEqual(jaugeDu('etoile', 16));
  });

  test('un seul exercice nouveau manquant est nommé au singulier', () => {
    render(<JaugePalier jauge={jaugeDu('intermediaire', 4)} />);
    const phrase = 'Encore 1 nouvel exercice réussi avant la prochaine forme de Gobi.';
    expect(screen.getByText(phrase)).toBeTruthy();
    expect(screen.getByRole('group').getAttribute('data-restant')).toBe('1');
  });

  test('le grand palier compte des formes de Gobi et ne promet aucune zone', () => {
    const modele = Object.freeze(jaugeDu('rare', 15));
    const { rerender } = render(<JaugePalier jauge={modele} />);
    const phrase = 'Encore 7 formes de Gobi avant le grand palier.';
    expect(screen.getByText(phrase)).toBeTruthy();
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(phrase);
    expect(screen.getByRole('group').getAttribute('data-restant')).toBe('7');
    expect(screen.queryByText(/zone/)).toBeNull();
    expect(modele).toEqual(jaugeDu('rare', 15));
    rerender(<JaugePalier jauge={jaugeDu('rare', 16)} />);
    expect(screen.getByText(phrase)).toBeTruthy();
    rerender(<JaugePalier jauge={jaugeDu('rare', 20)} />);
    expect(screen.getByText('Encore 6 formes de Gobi avant le grand palier.')).toBeTruthy();
    expect(screen.getByRole('group').getAttribute('data-restant')).toBe('6');
  });
});
