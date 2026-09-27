import { useState, type ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { creerAlea } from '@pierre/partage';
import type { EtatManipulationMaths, GesteMaths } from '@pierre/partage/mathematiques';
import {
  appliquerGesteChantier, construireTemoinChantier, genererChantier, validerChantier,
  type InstanceChantier,
} from '../../../partage/src/mathematiques/jeux/chantier/index.js';
import { AteliersChantier } from '@client/mathematiques/lieux/AteliersChantier';

afterEach(() => cleanup());

function monter(instance: InstanceChantier): { lire: () => EtatManipulationMaths; gestes: GesteMaths[] } {
  let courant = instance.etatInitial;
  const gestes: GesteMaths[] = [];
  function Support(): ReactElement {
    const [etat, fixerEtat] = useState(instance.etatInitial);
    courant = etat;
    return <AteliersChantier instance={instance} etat={etat} attente={false} surGeste={(geste) => {
      gestes.push(geste);
      fixerEtat((avant) => appliquerGesteChantier(instance, avant, geste));
    }} />;
  }
  render(<Support />);
  return { lire: () => courant, gestes };
}

describe('ateliers du chantier', () => {
  it('déplace les quatre sommets sur une grille mesurée puis retire un sommet', () => {
    const instance = genererChantier('MAT-CHA-01', 'exploration', creerAlea(2), { largeur: 3, hauteur: 4 });
    const jeu = monter(instance);
    const points = [[2, 3], [5, 3], [5, 7], [2, 7]] as const;
    points.forEach(([x, y], i) => {
      fireEvent.click(within(screen.getByRole('group', { name: 'Sommets du plan' }))
        .getByRole('button', { name: new RegExp(`^Sommet ${'ABCD'[i]}`, 'u') }));
      fireEvent.click(screen.getByRole('button', { name: `Point ${x}, ${y}` }));
    });
    expect(validerChantier(instance, jeu.lire()).statut).toBe('correcte');
    expect(document.querySelector('polygon[stroke="#174f6a"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer le sommet D' }));
    expect(validerChantier(instance, jeu.lire()).statut).toBe('incomplete');
    expect(jeu.gestes.at(-1)).toEqual({ type: 'retirer', objetId: 'sommet-3' });
  });

  it('fait poser six faces sur un vrai patron et montre les trois vues de pliage après réussite', () => {
    const instance = genererChantier('MAT-CHA-02', 'decouverte', creerAlea(3));
    const jeu = monter(instance);
    const temoin = construireTemoinChantier(instance);
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(within(screen.getByRole('group', { name: 'Choisir une face' }))
        .getByRole('button', { name: new RegExp(`^Face ${i + 1}`, 'u') }));
      const position = temoin.placements[`face:a:${i}`] as number;
      fireEvent.click(screen.getByRole('button', {
        name: new RegExp(`^Patron A, case ${position % 6}, ${Math.floor(position / 6)}`, 'u'),
      }));
    }
    expect(validerChantier(instance, jeu.lire()).statut).toBe('correcte');
    expect(screen.getByRole('img', { name: /Pliage illustré du patron A/u })).toBeTruthy();
    expect(screen.getByText('1. À plat')).toBeTruthy();
    expect(screen.getByText('3. Cube fermé')).toBeTruthy();
  });

  it('en Défi distingue les deux grilles et ne réduit pas leur construction à un choix', () => {
    const instance = genererChantier('MAT-CHA-02', 'defi', creerAlea(3));
    monter(instance);
    expect(screen.getByRole('region', { name: 'Grille du patron A' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Grille du patron B' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Patron [AB], case/u })).toHaveLength(72);
  });

  it('compare les masses puis laisse déplacer chaque poids entre plateaux', () => {
    const d = genererChantier('MAT-CHA-03', 'decouverte', creerAlea(3));
    const comparaison = monter(d);
    const temoinD = construireTemoinChantier(d);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`Plateau ${temoinD.selection}`, 'u') }));
    expect(validerChantier(d, comparaison.lire()).statut).toBe('correcte');
    cleanup();
    const f = genererChantier('MAT-CHA-03', 'defi', creerAlea(3));
    const balance = monter(f);
    fireEvent.click(screen.getByRole('button', { name: 'Placer 1 kg à gauche' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Placer 500 g à droite' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Placer 300 g à droite' }));
    fireEvent.click(screen.getByRole('button', { name: 'Placer 200 g à droite' }));
    expect(validerChantier(f, balance.lire()).statut).toBe('correcte');
    fireEvent.click(screen.getByRole('button', { name: 'Retirer 200 g du plateau droite' }));
    expect(validerChantier(f, balance.lire()).statut).not.toBe('correcte');
  });
});
