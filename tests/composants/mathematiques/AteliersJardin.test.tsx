import { useState, type ReactElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { creerAlea } from '@pierre/partage';
import type { EtatManipulationMaths, GesteMaths } from '@pierre/partage/mathematiques';
import { appliquerGesteJardin, genererJardin, validerJardin,
  type InstanceJardin } from '../../../partage/src/mathematiques/jeux/jardin/index.js';
import { AteliersJardin } from '@client/mathematiques/lieux/AteliersJardin';

afterEach(() => cleanup());
function monter(instance: InstanceJardin) {
  let courant = instance.etatInitial;
  const gestes: GesteMaths[] = [];
  function Support(): ReactElement {
    const [etat, fixer] = useState<EtatManipulationMaths>(instance.etatInitial);
    courant = etat;
    return <AteliersJardin instance={instance} etat={etat} attente={false} surGeste={(geste) => {
      gestes.push(geste);
      fixer((avant) => appliquerGesteJardin(instance, avant, geste));
    }} />;
  }
  render(<Support />);
  return { etat: () => courant, gestes };
}

describe('Ateliers du Jardin', () => {
  it('le disque change de représentation tout en couvrant une part égale par geste', () => {
    const source = genererJardin('MAT-JAR-02', 'decouverte', creerAlea(3), { denominateur: 4, numerateur: 2 });
    if (source.famille !== 'MAT-JAR-02') throw new Error('Famille de test incorrecte.');
    const i = { ...source, parametres: { ...source.parametres, representation: 'disque' as const } };
    const jeu = monter(i);
    expect(document.querySelectorAll('[data-parts-egales="disque"] path')).toHaveLength(4);
    expect(document.querySelectorAll('[data-part-couverte="oui"]')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Couvrir une part de Première plate-bande' }));
    expect(document.querySelectorAll('[data-part-couverte="oui"]')).toHaveLength(1);
    expect(validerJardin(i, jeu.etat()).statut).not.toBe('correcte');
    fireEvent.click(screen.getByRole('button', { name: 'Couvrir une part de Première plate-bande' }));
    expect(document.querySelectorAll('[data-part-couverte="oui"]')).toHaveLength(2);
    expect(validerJardin(i, jeu.etat()).statut).toBe('correcte');
  });
  it('zéro reste un plateau vide ; ajouter puis retirer une graine change réellement la validation', () => {
    const i = genererJardin('MAT-JAR-01', 'decouverte', creerAlea(2), { cible: 0 });
    const jeu = monter(i);
    expect(validerJardin(i, jeu.etat()).statut).toBe('correcte');
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter graine' }));
    expect(validerJardin(i, jeu.etat()).statut).toBe('incorrecte');
    fireEvent.click(screen.getByRole('button', { name: 'Retirer graine' }));
    expect(validerJardin(i, jeu.etat()).statut).toBe('correcte');
    expect(jeu.gestes).toHaveLength(2);
  });

  it('le livre des saisons range dix fruits visibles dans une caisse', () => {
    const i = genererJardin('MAT-JAR-01', 'decouverte', creerAlea(2),
      { cible: 10, uniteObjet: 'fruit', caissesRequises: 1, echangeRequis: true });
    const jeu = monter(i);
    for (let n = 0; n < 10; n += 1) fireEvent.click(screen.getByRole('button', { name: 'Ajouter fruit' }));
    expect(validerJardin(i, jeu.etat()).statut).toBe('incomplete');
    fireEvent.click(screen.getByRole('button', { name: 'Échanger 10 fruits contre une caisse' }));
    expect(validerJardin(i, jeu.etat()).statut).toBe('correcte');
    expect(document.querySelectorAll('.jardin-caisse i')).toHaveLength(10);
  });

  it('une botte montre dix graines et un sac montre dix bottes de dix graines', () => {
    const i = genererJardin('MAT-JAR-01', 'exploration', creerAlea(12), { cible: 100 });
    monter(i);
    const botte = screen.getByRole('img', { name: '10 graines' });
    const sac = screen.getByRole('img', { name: '100 graines' });
    expect(botte.querySelectorAll('.jardin-dix i')).toHaveLength(10);
    expect(sac.querySelectorAll('.jardin-cent .jardin-dix')).toHaveLength(10);
    expect(sac.querySelectorAll('.jardin-cent .jardin-dix i')).toHaveLength(100);
  });

  it('les cases égales se couvrent une à une, et retirer la part complétée la retire du résultat', () => {
    const i = genererJardin('MAT-JAR-02', 'exploration', creerAlea(3),
      { denominateur: 5, numerateur: 3, partsInitiales: 2 });
    const jeu = monter(i);
    expect(validerJardin(i, jeu.etat()).statut).toBe('incomplete');
    fireEvent.click(screen.getByRole('button', { name: 'Couvrir une part de Première plate-bande' }));
    expect(validerJardin(i, jeu.etat()).statut).toBe('correcte');
    expect(screen.getByRole('img', { name: '3 parts couvertes sur 5' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer une part de Première plate-bande' }));
    expect(validerJardin(i, jeu.etat()).statut).toBe('incomplete');
  });

  it('le carnet suit un transfert, puis reconstruit tableau et barres depuis les paniers courants', () => {
    const i = genererJardin('MAT-JAR-03', 'defi', creerAlea(4), { categories: [
      { id: 'pommes', quantite: 1 }, { id: 'poires', quantite: 1 },
      { id: 'prunes', quantite: 1 }, { id: 'noix', quantite: 1 },
    ] });
    const jeu = monter(i);
    fireEvent.click(screen.getAllByRole('button', { name: 'Vers poires' })[0]!);
    expect(jeu.etat().objets['panier:pommes']).toBe(0);
    expect(jeu.etat().objets['panier:poires']).toBe(2);
    expect(validerJardin(i, jeu.etat()).statut).toBe('incomplete');
    for (const id of ['poires', 'prunes', 'noix']) {
      const quantite = Number(jeu.etat().objets[`panier:${id}`]);
      for (let n = 0; n < quantite; n += 1) {
        fireEvent.click(screen.getByRole('button', { name: `Ajouter une unité table ${id}` }));
        fireEvent.click(screen.getByRole('button', { name: `Ajouter une unité barre ${id}` }));
      }
    }
    expect(validerJardin(i, jeu.etat()).statut).toBe('incomplete');
    fireEvent.click(screen.getByRole('button', { name: 'Choisir poires comme panier le plus rempli' }));
    expect(validerJardin(i, jeu.etat()).statut).toBe('correcte');
    fireEvent.click(screen.getByRole('button', { name: 'Annuler mon geste' }));
    expect(validerJardin(i, jeu.etat()).statut).not.toBe('correcte');
  });

  it('le tableau marque des cases et la barre valide une seule hauteur au relâchement', () => {
    const i = genererJardin('MAT-JAR-03', 'decouverte', creerAlea(11), { categories: [
      { id: 'pommes', quantite: 4 }, { id: 'poires', quantite: 6 },
    ] });
    const jeu = monter(i);
    fireEvent.click(screen.getByRole('button', { name: 'Case 3 du tableau pommes' }));
    expect(jeu.etat().objets['table:pommes']).toBe(3);
    expect(screen.getByRole('button', { name: 'Case 3 du tableau pommes' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Case 4 du tableau pommes' }).getAttribute('aria-pressed')).toBe('false');
    const slider = screen.getByRole('slider', { name: 'Choisir hauteur barre pommes' });
    const gestesAvant = jeu.gestes.length;
    fireEvent.change(slider, { target: { value: '2' } });
    fireEvent.change(slider, { target: { value: '4' } });
    expect(jeu.gestes).toHaveLength(gestesAvant);
    fireEvent.pointerUp(slider);
    expect(jeu.gestes).toHaveLength(gestesAvant + 1);
    expect(jeu.etat().objets['barre:pommes']).toBe(4);
    expect(validerJardin(i, jeu.etat()).statut).toBe('incomplete');
    for (const [id, quantite] of [['pommes', 4], ['poires', 6]] as const) {
      fireEvent.click(screen.getByRole('button', { name: `Case ${quantite} du tableau ${id}` }));
      if (id !== 'pommes') {
        const barre = screen.getByRole('slider', { name: `Choisir hauteur barre ${id}` });
        fireEvent.change(barre, { target: { value: String(quantite) } });
        fireEvent.pointerUp(barre);
      }
    }
    expect(validerJardin(i, jeu.etat()).statut).toBe('correcte');
    fireEvent.click(screen.getByRole('button', { name: 'Case 4 du tableau pommes' }));
    expect(jeu.etat().objets['table:pommes']).toBe(3);
    expect(validerJardin(i, jeu.etat()).statut).toBe('incomplete');
  });

  it('le tableau garde vingt cases disponibles et les caisses ont un pluriel lisible', () => {
    const i = genererJardin('MAT-JAR-03', 'defi', creerAlea(13), { fruitsParUnite: 10, categories: [
      { id: 'pommes', quantite: 20 }, { id: 'poires', quantite: 1 },
      { id: 'prunes', quantite: 1 }, { id: 'noix', quantite: 1 },
    ] });
    const jeu = monter(i);
    expect(screen.getByText('Panier : 20 caisses de dix fruits')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Cases du tableau pommes' }).querySelectorAll('button')).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: 'Case 20 du tableau pommes' }));
    expect(jeu.etat().objets['table:pommes']).toBe(20);
  });
});
