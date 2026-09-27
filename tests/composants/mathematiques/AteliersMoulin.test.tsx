import { useState, type ReactElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { creerAlea } from '@pierre/partage';
import type { EtatManipulationMaths, GesteMaths } from '@pierre/partage/mathematiques';
import { appliquerGesteMoulin, genererMoulin, validerMoulin,
  type InstanceMoulin } from '../../../partage/src/mathematiques/jeux/moulin/index.js';
import { AteliersMoulin } from '@client/mathematiques/lieux/AteliersMoulin';

afterEach(() => cleanup());
function monter(instance: InstanceMoulin) {
  let courant = instance.etatInitial;
  const gestes: GesteMaths[] = [];
  function Support(): ReactElement {
    const [etat, fixer] = useState<EtatManipulationMaths>(instance.etatInitial);
    courant = etat;
    return <AteliersMoulin instance={instance} etat={etat} attente={false} surGeste={(geste) => {
      gestes.push(geste);
      fixer((avant) => appliquerGesteMoulin(instance, avant, geste));
    }} />;
  }
  render(<Support />);
  return { etat: () => courant, gestes };
}

describe('Ateliers du Moulin', () => {
  it('monte réellement deux groupes égaux, puis une pale retirée rend le montage incomplet', () => {
    const i = genererMoulin('MAT-MOU-01', 'decouverte', creerAlea(2),
      { premier: { roues: 2, pales: 3 }, second: null });
    const jeu = monter(i);
    for (let r = 1; r <= 2; r += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Ajouter une roue, Premier montage' }));
      for (let p = 0; p < 3; p += 1) fireEvent.click(screen.getByRole('button',
        { name: `Ajouter une pale, Premier montage, roue ${r}` }));
    }
    expect(validerMoulin(i, jeu.etat()).statut).toBe('correcte');
    fireEvent.click(screen.getByRole('button', { name: 'Retirer une pale, Premier montage, roue 2' }));
    expect(validerMoulin(i, jeu.etat()).statut).toBe('incomplete');
  });

  it('chaque versement vide le stock, un transfert inégal échoue et une reprise le corrige', () => {
    const i = genererMoulin('MAT-MOU-02', 'decouverte', creerAlea(3),
      { total: 6, sacs: 2, autreNombreDeSacs: null });
    const jeu = monter(i);
    expect(screen.getByRole('img', { name: 'Stock : 6 mesures' }).querySelectorAll('.moulin-mesure')).toHaveLength(6);
    expect(screen.getByRole('img', { name: 'Sac 1 : 0 mesures' }).querySelectorAll('.moulin-mesure')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Verser une mesure, Première distribution, sac 1' }));
    expect(screen.getByRole('img', { name: 'Stock : 5 mesures' }).querySelectorAll('.moulin-mesure')).toHaveLength(5);
    expect(screen.getByRole('img', { name: 'Sac 1 : 1 mesure' }).querySelectorAll('.moulin-mesure')).toHaveLength(1);
    for (let n = 1; n < 6; n += 1) fireEvent.click(screen.getByRole('button',
      { name: `Verser une mesure, Première distribution, sac ${(n % 2) + 1}` }));
    expect(screen.getByText('Stock : 0 mesures')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Stock : 0 mesures' }).querySelectorAll('.moulin-mesure')).toHaveLength(0);
    expect(screen.getByRole('img', { name: 'Sac 1 : 3 mesures' }).querySelectorAll('.moulin-mesure')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Sac 2 : 3 mesures' }).querySelectorAll('.moulin-mesure')).toHaveLength(3);
    expect(validerMoulin(i, jeu.etat()).statut).toBe('correcte');
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre une mesure, Première distribution, sac 1' }));
    expect(screen.getByRole('img', { name: 'Stock : 1 mesure' }).querySelectorAll('.moulin-mesure')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Verser une mesure, Première distribution, sac 2' }));
    expect(validerMoulin(i, jeu.etat()).statut).toBe('incorrecte');
    fireEvent.click(screen.getByRole('button', { name: 'Annuler mon geste' }));
    expect(jeu.etat().objets['stock:a']).toBe(1);
  });

  it('la variante sans nombre annoncé laisse ajouter et retirer des sacs avant de répartir', () => {
    const i = genererMoulin('MAT-MOU-02', 'exploration', creerAlea(3),
      { total: 6, sacs: 3, nombreSacsInconnu: true });
    const jeu = monter(i);
    expect(screen.queryByText('Sac 1 : 0 mesures')).toBeNull();
    for (let s = 1; s <= 3; s += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Ajouter un sac' }));
      for (let m = 0; m < 2; m += 1) fireEvent.click(screen.getByRole('button',
        { name: `Verser une mesure, Première distribution, sac ${s}` }));
    }
    expect(validerMoulin(i, jeu.etat()).statut).toBe('correcte');
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un sac' }));
    expect(validerMoulin(i, jeu.etat()).statut).toBe('incorrecte');
    fireEvent.click(screen.getByRole('button', { name: 'Retirer le dernier sac vide' }));
    expect(validerMoulin(i, jeu.etat()).statut).toBe('correcte');
  });

  it('règle deux découpages du même réservoir et permet de refermer un secteur', () => {
    const i = genererMoulin('MAT-MOU-03', 'defi', creerAlea(4),
      { denominateur: 8, numerateur: 4, initial: 0 });
    const jeu = monter(i);
    for (let n = 0; n < 4; n += 1) fireEvent.click(screen.getByRole('button',
      { name: 'Ouvrir une part, Premier réglage' }));
    for (let n = 0; n < 2; n += 1) fireEvent.click(screen.getByRole('button',
      { name: 'Ouvrir une part, Même réservoir, autre découpage' }));
    expect(validerMoulin(i, jeu.etat()).statut).toBe('correcte');
    expect(screen.getByRole('img', { name: '2 parts ouvertes sur 4' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer une part, Même réservoir, autre découpage' }));
    expect(validerMoulin(i, jeu.etat()).statut).toBe('incomplete');
  });
});
