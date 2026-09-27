import { useState, type ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { creerAlea } from '@pierre/partage';
import { appliquerGestePont, genererPont, temoinsPont, validerPont } from '@pierre/partage/mathematiques';
import type { EtatManipulationMaths, GesteMaths, InstancePont, NiveauMaths } from '@pierre/partage/mathematiques';
import { Bornes, Regle, Tablier } from '@client/mathematiques/AteliersPonts';
import { creerProjetPonts } from '../../../partage/src/mathematiques/jeux/ponts/projets.js';

afterEach(() => cleanup());

function monter(instance: InstancePont,
  dessiner: (etat: EtatManipulationMaths, surGeste: (geste: GesteMaths) => void) => ReactElement) {
  let courant = instance.etatInitial;
  const gestes: GesteMaths[] = [];
  function Support(): ReactElement {
    const [etat, fixerEtat] = useState(instance.etatInitial);
    courant = etat;
    const geste = (action: GesteMaths): void => {
      gestes.push(action);
      fixerEtat((precedent) => appliquerGestePont(instance, precedent, action));
    };
    return dessiner(etat, geste);
  }
  render(<Support />);
  return { lire: () => courant, gestes };
}

describe('ateliers des trois ponts', () => {
  it('dessine la planche et le zéro choisi sur le même axe sans écrire la longueur sur la planche', () => {
    const instance = genererPont('MAT-PON-01', 'defi', creerAlea(64));
    monter(instance, (etat, surGeste) =>
      <Regle instance={instance} etat={etat} attente={false} surGeste={surGeste} />);
    const planche = document.querySelector<HTMLElement>('[data-planche-a-mesurer]');
    const regle = document.querySelector<HTMLElement>('.ponts-mesure-regle');
    expect(planche?.style.left).toBe(`${String(instance.parametres.origineCible * 32)}px`);
    expect(planche?.style.width).toBe(`${String(instance.parametres.longueurCible * 32)}px`);
    expect(planche?.textContent).toBe('');
    expect(regle?.getAttribute('data-zero-pose')).toBe('aucun');
    fireEvent.click(within(screen.getByRole('group', { name: 'Place le zéro de la règle' }))
      .getByRole('button', { name: String(instance.parametres.origineCible) }));
    expect(regle?.style.left).toBe(planche?.style.left);
    expect(regle?.getAttribute('data-zero-pose')).toBe(String(instance.parametres.origineCible));
    expect(screen.getByText(/Fais glisser le dessin ou les choix/u)).toBeTruthy();
    expect(document.querySelectorAll('.ponts-mesure-graduation')).toHaveLength(31);
    expect(document.querySelectorAll('.ponts-mesure-graduation')[1]?.textContent).toBe('');
  });

  it.each(['decouverte', 'exploration', 'defi'] as const)(
    'règle %s : une mauvaise origine échoue, puis la mesure et les planches choisies réussissent',
    (niveau: NiveauMaths) => {
      const instance = genererPont('MAT-PON-01', niveau, creerAlea(64));
      const jeu = monter(instance, (etat, surGeste) =>
        <Regle instance={instance} etat={etat} attente={false} surGeste={surGeste} />);
      const temoin = temoinsPont(instance)[0]!;
      const mauvaiseOrigine = instance.parametres.origineCible === 0 ? 1 : 0;
      fireEvent.click(within(screen.getByRole('group', { name: 'Place le zéro de la règle' }))
        .getByRole('button', { name: String(mauvaiseOrigine) }));
      const longueur = Number(temoin.objets.longueurLue);
      for (let dizaines = 0; dizaines < Math.floor(longueur / 10); dizaines += 1) {
        fireEvent.click(screen.getByRole('button', { name: 'Ajouter dix centimètres' }));
      }
      for (let unites = 0; unites < longueur % 10; unites += 1) {
        fireEvent.click(screen.getByRole('button', { name: 'Ajouter un centimètre' }));
      }
      for (const id of Object.keys(temoin.placements).filter((cle) => cle !== 'regle')) {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${id},`, 'u') }));
      }
      expect(validerPont(instance, jeu.lire()).statut).toBe('incorrecte');
      fireEvent.click(within(screen.getByRole('group', { name: 'Place le zéro de la règle' }))
        .getByRole('button', { name: String(instance.parametres.origineCible) }));
      expect(validerPont(instance, jeu.lire()).statut).toBe('correcte');
      const planche = Object.keys(temoin.placements).find((cle) => cle !== 'regle')!;
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${planche},`, 'u') }));
      expect(jeu.gestes.at(-1)).toEqual({ type: 'retirer', objetId: planche });
      expect(validerPont(instance, jeu.lire()).statut).not.toBe('correcte');
    },
  );

  it('P02 montre deux morceaux mesurables sans écrire leurs longueurs sur les bandes', () => {
    const projet = creerProjetPonts('MAT-PON-P02', ['decouverte', 'decouverte', 'decouverte'],
      creerAlea(13), 'p02-interface');
    const mesure = projet.etapes[1]!;
    if (mesure.famille !== 'MAT-PON-01') throw new Error('Mesure absente.');
    const jeu = monter(mesure, (etat, surGeste) =>
      <Regle instance={mesure} etat={etat} attente={false} surGeste={surGeste} />);
    expect(screen.getByRole('button', { name: /^Morceau A/u })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Morceau B/u })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Morceau A/u }));
    expect(jeu.gestes.at(-1)).toEqual({ type: 'choisir', objetId: 'segment-a' });
    expect(document.querySelector('.ponts-mesure-planche')?.textContent).toBe('');
    const origine = mesure.parametres.segmentsTrajet![0].origine;
    fireEvent.click(within(screen.getByRole('group', { name: 'Place le zéro pour A' }))
      .getByRole('button', { name: String(origine) }));
    expect(jeu.lire().placements['regle:segment-a']).toBe(origine);
    expect(validerPont(mesure, jeu.lire()).statut).toBe('incomplete');
    cleanup();
    const tablier = projet.etapes[2]!;
    if (tablier.famille !== 'MAT-PON-03') throw new Error('Tablier absent.');
    render(<Tablier instance={tablier} etat={tablier.etatInitial} attente={false} surGeste={() => {}} />);
    expect(screen.getByText(/morceaux mesurés font/u)).toBeTruthy();
    expect(screen.queryByText(`Rive : ${tablier.parametres.portee} cm`)).toBeNull();
  });

  it('P03 fait retirer le module abîmé avant de montrer le trou, et garde le module stable', () => {
    const projet = creerProjetPonts('MAT-PON-P03', ['decouverte', 'decouverte', 'decouverte'],
      creerAlea(11), 'p03-interface');
    const mesure = projet.etapes[0]!;
    const tablier = projet.etapes[1]!;
    if (mesure.famille !== 'MAT-PON-01' || tablier.famille !== 'MAT-PON-03') throw new Error('Réparation absente.');
    const vueMesure = render(<Regle instance={mesure} etat={mesure.etatInitial} attente={false} surGeste={() => {}} />);
    expect(vueMesure.container.querySelector('.ponts-mesure-restant')).toBeTruthy();
    expect(vueMesure.container.querySelector('[data-endommage="true"]')).toBeTruthy();
    vueMesure.unmount();
    const jeu = monter(tablier, (etat, surGeste) =>
      <Tablier instance={tablier} etat={etat} attente={false} surGeste={surGeste} />);
    expect(document.querySelector('.ponts-module-pose--abime')).toBeTruthy();
    expect(document.querySelector('.ponts-module-manquant')).toBeNull();
    expect(screen.getByTestId('piece-module-restant').hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByTestId('piece-module-endommage'));
    fireEvent.click(screen.getByRole('button', { name: /Retirer le module endommage/u }));
    expect(jeu.gestes.at(-1)).toEqual({ type: 'retirer', objetId: 'module-endommage' });
    expect(document.querySelector('.ponts-module-pose--abime')).toBeNull();
    expect(document.querySelector('.ponts-module-manquant')).toBeTruthy();
  });

  it.each(['decouverte', 'exploration', 'defi'] as const)(
    'bornes %s : valeur et position distinctes, retrait et encadrement libre',
    (niveau: NiveauMaths) => {
      const instance = genererPont('MAT-PON-02', niveau, creerAlea(31));
      const jeu = monter(instance, (etat, surGeste) =>
        <Bornes instance={instance} etat={etat} attente={false} surGeste={surGeste} />);
      const valeurs = instance.parametres.bornesAPoser;
      const premiere = valeurs[0]!;
      const mauvaisePosition = instance.parametres.graduations.find((n) => n !== premiere)!;
      const stock = () => within(screen.getByRole('group', { name: 'Nombre à porter' }));
      fireEvent.click(stock().getByRole('button', { name: String(premiere) }));
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Graduation ${mauvaisePosition}(?:,|$)`, 'u') }));
      for (const valeur of valeurs.slice(1)) {
        fireEvent.click(stock().getByRole('button', { name: String(valeur) }));
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Graduation ${valeur}(?:,|$)`, 'u') }));
      }
      expect(validerPont(instance, jeu.lire()).statut).toBe('incorrecte');
      fireEvent.click(screen.getByRole('button', { name: `Retirer la borne ${premiere}` }));
      fireEvent.click(stock().getByRole('button', { name: String(premiere) }));
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Graduation ${premiere}(?:,|$)`, 'u') }));
      if (niveau === 'defi') {
        expect(validerPont(instance, jeu.lire()).statut).toBe('incomplete');
        const { inferieure, superieure } = instance.parametres.encadrement;
        const mauvaise = instance.parametres.graduations.find((n) => n !== inferieure)!;
        fireEvent.click(within(screen.getByText('Avant').parentElement!)
          .getByRole('button', { name: String(mauvaise) }));
        fireEvent.click(within(screen.getByText('Après').parentElement!)
          .getByRole('button', { name: String(superieure) }));
        fireEvent.click(screen.getByRole('button', { name: 'Montrer mon encadrement' }));
        expect(validerPont(instance, jeu.lire()).statut).toBe('incorrecte');
        fireEvent.click(within(screen.getByText('Avant').parentElement!)
          .getByRole('button', { name: String(inferieure) }));
        fireEvent.click(screen.getByRole('button', { name: 'Montrer mon encadrement' }));
      }
      expect(validerPont(instance, jeu.lire()).statut).toBe('correcte');
      expect(jeu.gestes).toContainEqual({ type: 'placer-borne', valeur: premiere, position: mauvaisePosition });
    },
  );

  it.each(['decouverte', 'exploration', 'defi'] as const)(
    'tablier %s : placer à des positions distinctes, déplacer puis retirer sans position négative',
    (niveau: NiveauMaths) => {
      const instance = genererPont('MAT-PON-03', niveau, creerAlea(47));
      const jeu = monter(instance, (etat, surGeste) =>
        <Tablier instance={instance} etat={etat} attente={false} surGeste={surGeste} />);
      const temoin = temoinsPont(instance)[0]!;
      for (const id of Object.keys(instance.etatInitial.placements)) {
        fireEvent.click(screen.getByTestId(`piece-${id}`));
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Retirer le module`, 'u') }));
      }
      expect(screen.queryByTestId('tablier-position--1')).toBeNull();
      const pieces = Object.entries(temoin.placements);
      const [premiere] = pieces;
      if (premiere === undefined) throw new Error('Témoin sans module.');
      fireEvent.click(screen.getByTestId(`piece-${premiere[0]}`));
      fireEvent.click(screen.getByTestId('tablier-position-1'));
      expect(validerPont(instance, jeu.lire()).statut).not.toBe('correcte');
      fireEvent.click(screen.getByTestId(`tablier-position-${String(premiere[1])}`));
      for (const [id, position] of pieces.slice(1)) {
        fireEvent.click(screen.getByTestId(`piece-${id}`));
        fireEvent.click(screen.getByTestId(`tablier-position-${String(position)}`));
      }
      expect(validerPont(instance, jeu.lire()).statut).toBe('correcte');
      fireEvent.click(screen.getByTestId(`piece-${premiere[0]}`));
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Retirer le module`, 'u') }));
      expect(validerPont(instance, jeu.lire()).statut).not.toBe('correcte');
      expect(jeu.gestes).toContainEqual({ type: 'placer-piece', objetId: premiere[0], position: 1 });
    },
  );
});
