import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { appliquerEtoiles, ETAT_CASCADE_VIDE } from '@pierre/partage/recompenses';
import { CascadeRecompense } from '@client/composants/CascadeRecompense';
import { INSTANT_DE_REFERENCE, lireJson } from '../configuration/preparation.js';
import type { SeuilsCascade } from '@pierre/partage';

afterEach(cleanup);
const seuils = lireJson<SeuilsCascade>('contenu/referentiel/parametres-recompenses.json');

it('le grand palier descend à chaque exercice inédit, traverse une forme et conserve les reprises', () => {
  let gain = appliquerEtoiles(ETAT_CASCADE_VIDE, 0, seuils, INSTANT_DE_REFERENCE);
  for (let index = 0; index < 23; index += 1) gain = appliquerEtoiles(gain.etat, 1, seuils, INSTANT_DE_REFERENCE);
  const { rerender } = render(<CascadeRecompense gain={gain} />);
  const verifier = (restant: number) => {
    const texte = `Encore ${restant} ${restant === 1 ? 'nouvel exercice réussi' : 'nouveaux exercices réussis'} avant le grand palier.`;
    expect(screen.getByText(texte)).toBeTruthy();
    expect(screen.getByRole('group', { name: texte }).getAttribute('data-restant')).toBe(String(restant));
  };
  verifier(27);
  for (const restant of [26, 25]) {
    gain = appliquerEtoiles(gain.etat, 1, seuils, INSTANT_DE_REFERENCE);
    rerender(<CascadeRecompense gain={gain} />);
    verifier(restant);
  }
  const avant = structuredClone(gain.etat);
  gain = appliquerEtoiles(gain.etat, 0, seuils, INSTANT_DE_REFERENCE);
  rerender(<CascadeRecompense gain={gain} />);
  verifier(25);
  expect(gain.etat).toEqual(avant);
  expect(gain.recompenses).toEqual([]);
  for (let index = 0; index < 24; index += 1) gain = appliquerEtoiles(gain.etat, 1, seuils, INSTANT_DE_REFERENCE);
  rerender(<CascadeRecompense gain={gain} />);
  verifier(1);
  gain = appliquerEtoiles(gain.etat, 1, seuils, INSTANT_DE_REFERENCE);
  rerender(<CascadeRecompense gain={gain} />);
  verifier(50);
  expect(gain.paliersFranchis).toContain('rare');
  expect(gain.etat.raresTotal).toBe(1);
});
