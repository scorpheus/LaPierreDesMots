/**
 * L'écran du calcul — premier jet (Docs/maths-calcul-premier-jet-2026-10-09.md).
 * Ce que l'enfant fait : toucher une réponse ou un chiffre, ou taper un chiffre au clavier.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { creerAlea, creerHorlogeFigee } from '@pierre/partage';
import { caseCourante, creerPartieCalcul, jouerCalcul, type EtatCalcul } from '@pierre/partage/mathematiques';
import { EcranCalcul, chiffreDuClavier } from '@client/mathematiques/calcul/EcranCalcul';
import { EntreeCalcul } from '@client/mathematiques/calcul/EntreeCalcul';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { servicesDeTest } from '../../configuration/preparation.js';

const GRAINE = 4242;

function retourDeTest() {
  return {
    depotCorrect: vi.fn(async (): Promise<void> => undefined),
    depotRefuse: vi.fn(async (): Promise<void> => undefined),
    palierFranchi: vi.fn(async (): Promise<void> => undefined),
    reinitialiserSerie: vi.fn(),
    animationsDesactivees: true,
  };
}

let retour = retourDeTest();

function monter(activite: 'gue' | 'pose', surQuitter = vi.fn()): { readonly surQuitter: ReturnType<typeof vi.fn> } {
  retour = retourDeTest();
  const services = {
    ...servicesDeTest(), alea: creerAlea(5), horloge: creerHorlogeFigee('2026-10-09T10:00:00.000Z'),
    haptique: { vibrer(): void {}, disponible: false }, retour,
  };
  render(
    <FournisseurJeu valeur={{ services, magasin: creerMagasin(services) }}>
      <EcranCalcul activite={activite} graine={GRAINE} stade="oeuf" surQuitter={surQuitter} />
    </FournisseurJeu>,
  );
  return { surQuitter };
}

/** La même partie que l'écran, rejouée hors écran pour connaître les réponses. */
function partie(activite: 'gue' | 'pose'): EtatCalcul {
  return creerPartieCalcul(activite, creerAlea(GRAINE));
}

/** Le même réducteur que l'écran, pour suivre la partie pas à pas. */
const suivant = (etat: EtatCalcul, chiffre: number): EtatCalcul => jouerCalcul(etat, { type: 'chiffre', chiffre });

const racine = (): HTMLElement => document.querySelector('[data-calcul]')!;
const touche = (chiffre: number): HTMLElement => document.querySelector(`[data-chiffre="${String(chiffre)}"]`)!;

afterEach(() => { cleanup(); });

describe('EcranCalcul — le gué', () => {
  it('monte sur le socle : scène, réserve, pied ; consigne affichée ; aucun bouton Vérifier', () => {
    monter('gue');
    const disposition = document.querySelector('[data-moteur="calcul"][data-socle="oui"]');
    expect(disposition).not.toBeNull();
    expect(disposition!.querySelector('.disposition-moteur__scene')).not.toBeNull();
    expect(disposition!.querySelector('.disposition-moteur__reserve')).not.toBeNull();
    expect(screen.getByText(/Trouve le nombre qui manque/u)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Vérifier|Effacer/u })).toBeNull();
  });

  it('aux tables, trois réponses à toucher ; la bonne fait sortir une pierre du gué', () => {
    monter('gue');
    const etape = partie('gue').etapes[0]!;
    if (etape.forme !== 'ligne' || etape.choix === null) throw new Error('attendu : tables à choisir');
    const cartes = document.querySelectorAll('[data-choix]');
    expect(cartes).toHaveLength(3);
    fireEvent.click(document.querySelector(`[data-choix="${String(etape.reponse)}"]`)!);
    expect(document.querySelector('[data-pierres-sorties]')!.getAttribute('data-pierres-sorties')).toBe('1');
    expect(document.querySelector('[data-retour-calcul]')!.getAttribute('data-retour-calcul')).toBe('etape-reussie');
  });

  it('une réponse fausse reste là, sans rouge ni échec, et Gobi dit « Pas encore »', () => {
    monter('gue');
    const etape = partie('gue').etapes[0]!;
    if (etape.forme !== 'ligne' || etape.choix === null) throw new Error('attendu : tables à choisir');
    const faux = etape.choix.find((n) => n !== etape.reponse)!;
    fireEvent.click(document.querySelector(`[data-choix="${String(faux)}"]`)!);
    expect(document.querySelector(`[data-choix="${String(faux)}"]`)!.getAttribute('data-essaye')).toBe('oui');
    expect(document.querySelectorAll('[data-choix]')).toHaveLength(3);
    expect(screen.getByText('Pas encore. Essaie un autre nombre.')).toBeTruthy();
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
    expect(document.querySelector('[data-pierres-sorties]')!.getAttribute('data-pierres-sorties')).toBe('0');
    expect(retour.depotRefuse).toHaveBeenCalledOnce();
  });

  it('le clavier physique répond aussi aux niveaux à choisir : rangée du haut en AZERTY (sans Maj) et pavé numérique', () => {
    monter('gue');
    const etape = partie('gue').etapes[0]!;
    const chiffres = [...String(etape.reponse)].map(Number);
    // La rangée du haut d'un clavier français sans Maj donne « & é " ' ( - è _ ç à » : on lit `code`.
    const azerty = ['à', '&', 'é', '"', "'", '(', '-', 'è', '_', 'ç'];
    chiffres.forEach((chiffre, rang) => {
      const code = rang === 0 ? `Digit${String(chiffre)}` : `Numpad${String(chiffre)}`;
      act(() => { fireEvent.keyDown(window, { code, key: rang === 0 ? azerty[chiffre]! : String(chiffre) }); });
    });
    expect(document.querySelector('[data-pierres-sorties]')!.getAttribute('data-pierres-sorties')).toBe('1');
  });

  it('au pavé, un chiffre faux n’est pas posé ; après trois, la bonne touche s’allume', () => {
    monter('gue');
    let etat = partie('gue');
    // Passer les 5 tables par leurs bonnes réponses.
    for (let i = 0; i < 5; i += 1) {
      const etape = etat.etapes[etat.index]!;
      fireEvent.click(document.querySelector(`[data-choix="${String(etape.reponse)}"]`)!);
      etat = jouerCalcul(etat, { type: 'choix', valeur: etape.reponse });
    }
    expect(document.querySelector('[data-plateau="pave-calcul"]')).not.toBeNull();
    expect(document.querySelectorAll('.calcul-touche')).toHaveLength(10);
    const etape = etat.etapes[5]!;
    const attendu = etape.cases[0]!.attendu;
    const faux = (attendu + 1) % 10;
    for (let i = 0; i < 3; i += 1) fireEvent.click(touche(faux));
    expect(document.querySelector('[data-case="trou-0"]')!.getAttribute('data-remplie')).toBe('non');
    expect(touche(attendu).getAttribute('data-montree')).toBe('oui');
    expect(document.querySelector('[data-gobi-niveau]')!.getAttribute('data-gobi-niveau')).toBe('demonstration');
  });
});

describe('EcranCalcul — la pierre à calcul', () => {
  it('l’addition posée se remplit par les unités ; au palier 2, la retenue s’écrit toute seule et Gobi la montre', () => {
    monter('pose');
    let etat = partie('pose');
    expect(document.querySelector('[data-case="resultat-u"]')!.getAttribute('data-marquee')).toBe('oui');
    // Deux additions sans retenue, puis les unités de la troisième.
    while (etat.index < 2 || caseCourante(etat)!.id === 'resultat-u') {
      const cible = caseCourante(etat)!;
      fireEvent.click(touche(cible.attendu));
      etat = suivant(etat, cible.attendu);
    }
    expect(document.querySelector('[data-case="retenue-d"]')!.textContent).toBe('1');
    expect(document.querySelector('[data-retenue-montree]')!.getAttribute('data-retenue-montree')).toBe('oui');
    expect(screen.getByText('Dix unités font une dizaine. Je pose la retenue en haut.')).toBeTruthy();
    expect(document.querySelector('[data-case="resultat-d"]')!.getAttribute('data-marquee')).toBe('oui');
  });

  it('finie, la pierre montre ses étoiles et propose d’en refaire une, sans écran d’échec', () => {
    const { surQuitter } = monter('pose');
    let etat = partie('pose');
    while (!etat.terminee) {
      const cible = caseCourante(etat)!;
      fireEvent.click(touche(cible.attendu));
      etat = suivant(etat, cible.attendu);
    }
    const reussite = document.querySelector('[data-calcul-reussite]')!;
    expect(reussite.getAttribute('data-etoiles')).toBe('3');
    expect(racine().getAttribute('data-calcul-termine')).toBe('oui');
    fireEvent.click(screen.getByRole('button', { name: 'Les nombres' }));
    expect(surQuitter).toHaveBeenCalledOnce();
  });
});

describe('EntreeCalcul et le clavier', () => {
  it('deux grandes pierres lancent chacune leur jeu', () => {
    const surChoix = vi.fn();
    const services = servicesDeTest();
    render(<FournisseurJeu valeur={{ services, magasin: creerMagasin(services) }}><EntreeCalcul surChoix={surChoix} /></FournisseurJeu>);
    fireEvent.click(document.querySelector('[data-calcul-entree="gue"]')!);
    fireEvent.click(document.querySelector('[data-calcul-entree="pose"]')!);
    expect(surChoix.mock.calls).toEqual([['gue'], ['pose']]);
  });

  it('chiffreDuClavier : rangée, pavé, AZERTY ; ignore les raccourcis', () => {
    const touche = (code: string, key: string, ctrlKey = false) => ({ code, key, ctrlKey, altKey: false, metaKey: false });
    expect(chiffreDuClavier(touche('Digit7', 'è'))).toBe(7);
    expect(chiffreDuClavier(touche('Numpad0', '0'))).toBe(0);
    expect(chiffreDuClavier(touche('KeyA', 'a'))).toBeNull();
    expect(chiffreDuClavier(touche('Digit5', '5', true))).toBeNull();
  });
});
