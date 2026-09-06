import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { moteurChemin } from '@partage/moteurs/chemin/moteur';
import type { ContenuChemin } from '@partage/moteurs/chemin/types';
import type { Habillage } from '@pierre/partage';
import { MoteurChemin } from '@client/moteurs/chemin/MoteurChemin';
import { aleaDeTest, horlogeDeTest, lireJson, servicesDeTest } from '../configuration/preparation.js';

const contenu = lireJson<{ jeu: { contenu: ContenuChemin } }>(
  'contenu/exercices/galeries/passage-chemin-01.json',
).jeu.contenu;
const habillage = lireJson<Habillage>('contenu/habillages/galeries/passage.habillage.json');
const alea = aleaDeTest();
const horloge = horlogeDeTest();
const contexte = { alea, horloge };
const services = { ...servicesDeTest(),
  haptique: { vibrer(): void {}, disponible: false },
  retour: { async depotCorrect(): Promise<void> {}, async depotRefuse(): Promise<void> {},
    async palierFranchi(): Promise<void> {}, reinitialiserSerie(): void {}, animationsDesactivees: true },
};
function Harnais() {
  const [etat, fixer] = useState(() => moteurChemin.creerEtat({ contenu, habillage, ...contexte }));
  return <MoteurChemin contenu={contenu} habillage={habillage} etat={etat}
    emettre={(action) => fixer((ancien) => moteurChemin.reduire(ancien, action, contexte))}
    services={services} animationsDesactivees />;
}
afterEach(cleanup);
function toucher(container: HTMLElement, id: string): void {
  const bouton = container.querySelector(`[data-case="${id}"]`);
  expect(bouton).not.toBeNull();
  fireEvent.click(bouton!);
}
function premiereEtape(container: HTMLElement): void {
  ['pierre-bol', 'pierre-bus', 'pierre-bec'].forEach((id) => toucher(container, id));
}

it('ne propose pas robe à la manche de bol : même lettre mais autre segment', () => {
  const { container } = render(<Harnais />);
  expect(container.querySelector('[data-case="pierre-bol"]')).not.toBeNull();
  expect(container.querySelector('[data-case="pierre-robe"]')).toBeNull();
  expect(container.querySelector('[data-case="pierre-dos"]')).not.toBeNull();
});

it('annonce le nouveau chemin et sa nouvelle lettre sans répéter une longue consigne', () => {
  const { container } = render(<Harnais />);
  expect(container.querySelector('[data-regle-courte]')?.textContent).toBe('Avec la lettre b');
  premiereEtape(container);
  expect(container.querySelector('[data-regle-courte]')?.textContent).toBe('Avec la lettre d');
  const annonce = container.querySelector('[data-annonce="chemin"]');
  expect(annonce?.getAttribute('aria-live')).toBe('polite');
  expect(annonce?.textContent).toContain('Nouveau chemin');
  expect(annonce?.textContent).toContain('2 / 4');
});

it('les anciennes coches ne marquent plus les réponses de la nouvelle lettre', () => {
  const { container } = render(<Harnais />);
  premiereEtape(container);
  const bol = container.querySelector<HTMLButtonElement>('[data-case="pierre-bol"]');
  expect(bol).not.toBeNull();
  expect(bol?.disabled).toBe(false);
  expect(bol?.textContent).not.toContain('✓');
  expect(bol?.getAttribute('data-franchie')).toBe('non');
  expect(container.querySelectorAll('[data-statut-chemin="parcourue"]')).toHaveLength(0);
});

it('un mot appris peut redevenir leurre : il est évalué sous la nouvelle règle', () => {
  let etat = moteurChemin.creerEtat({ contenu, habillage, ...contexte });
  for (const id of ['pierre-bol', 'pierre-bus', 'pierre-bec']) {
    etat = moteurChemin.reduire(etat, { type: 'avancer', caseVisee: id }, contexte);
  }
  const suite = moteurChemin.reduire(etat, { type: 'avancer', caseVisee: 'pierre-bol' }, contexte);
  expect(suite.dernierRefus?.motif).toBe('case-hors-parcours');
  expect(suite.etapes[1]?.nbErreurs).toBe(1);
  expect(suite.acquis).toEqual(etat.acquis); // Ne jamais reprendre l'acquis permanent.
});

it('calcule le mode de réponse sur les branches visibles de la manche', () => {
  const etat = moteurChemin.creerEtat({ contenu, habillage, ...contexte });
  // Départ c1 : bol, dos, dame. Robe est réservée au troisième segment.
  expect(etat.etapes[0]?.modeReponse).toBe('qcm-3');
});

it('conserve le rappel de position et le retour dans un emplacement réservé', () => {
  const { container } = render(<Harnais />);
  expect(container.querySelector('[data-retour-chemin]')).not.toBeNull();
  toucher(container, 'pierre-bol');
  expect(container.querySelector('[data-cible-chemin]')?.textContent).toContain('Tu es sur');
  expect(container.querySelector('[data-cible-chemin]')?.textContent).not.toContain('Départ');
});

it('retire l’indice après chaque pas et permet de demander le suivant sans nouvelle pénalité', () => {
  let etat = moteurChemin.creerEtat({ contenu, habillage, ...contexte });
  for (const id of ['pierre-bol', 'pierre-bus', 'pierre-bec']) {
    etat = moteurChemin.reduire(etat, { type: 'demanderAide' }, contexte);
    expect(etat.aide?.cible).toBe(id);
    expect(etat.etapes[0]?.niveauAide).toBe('indice');
    expect(etat.etapes[0]?.nbErreurs).toBe(0);
    etat = moteurChemin.reduire(etat, { type: 'avancer', caseVisee: id }, contexte);
    expect(etat.aide).toBeNull();
  }
  expect(etat.indexEtape).toBe(1);
  expect(etat.etapes[0]?.aideDemandee).toBe('indice');
});
