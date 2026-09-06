import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContenuGrave, Habillage } from '@pierre/partage';
import type { ConsigneGrave } from '@partage/moteurs/grave/types';
import { moteurGrave } from '@partage/moteurs/grave/moteur';
import { MoteurGrave } from '@client/moteurs/grave/MoteurGrave';
import { aleaDeTest, horlogeDeTest, lireJson, RACINE_DEPOT, servicesDeTest } from '../configuration/preparation.js';

// Le décor est vérifié en navigateur ; ici, aucun chargement réseau pour tester le texte.
vi.mock('@client/habillages/SceneDecor', () => ({ SceneDecor: () => null }));

const dossier = join(RACINE_DEPOT, 'contenu/exercices');
const fiches = readdirSync(dossier, { recursive: true })
  .filter((nom) => typeof nom === 'string' && nom.endsWith('.json'))
  .map((nom) => lireJson<{ id: string; jeu: { moteur: string; contenu: ContenuGrave } }>(join('contenu/exercices', String(nom))))
  .filter((fiche) => fiche.jeu.moteur === 'grave');
const habillage = lireJson<Habillage>('contenu/habillages/volcan/sable.habillage.json');
const services = {
  ...servicesDeTest(),
  haptique: { vibrer(): void {}, disponible: false },
  retour: {
    async depotCorrect(): Promise<void> {}, async depotRefuse(): Promise<void> {},
    async palierFranchi(): Promise<void> {}, reinitialiserSerie(): void {}, animationsDesactivees: true,
  },
};

function Harnais({ contenu }: { contenu: ContenuGrave }) {
  const [horloge] = useState(horlogeDeTest);
  const [alea] = useState(aleaDeTest);
  const [etat, modifier] = useState(() => moteurGrave.creerEtat({ contenu, habillage, horloge, alea }));
  return <MoteurGrave contenu={contenu} habillage={habillage} etat={etat}
    emettre={(action) => modifier((avant) => moteurGrave.reduire(avant, action, { horloge, alea }))}
    services={services} animationsDesactivees />;
}

function contenuPour(consigne: ConsigneGrave, base: ContenuGrave): ContenuGrave {
  return { ...base, consignes: [consigne] };
}

function motVisible(container: HTMLElement): string {
  // Le DOM contient aussi une copie pour lecteur d'écran ; ne pas la compter deux fois.
  return [...container.querySelectorAll('[data-mot-central="oui"] .syllabe')]
    .map((segment) => segment.textContent).join('');
}

afterEach(cleanup);

describe('les lettres réellement affichées, pas seulement la réussite du réducteur', () => {
  it('recense les cinq fiches et leurs 29 mots réels', () => {
    expect(fiches).toHaveLength(5);
    expect(fiches.flatMap((fiche) => fiche.jeu.contenu.consignes)).toHaveLength(29);
  });

  it.each([
    ['volcan-sable-grave-01', 'bateau', 'bat___', 'eau'],
    ['volcan-sable-grave-02', 'bille', 'b___e', 'ill'],
  ])('%s masque tout le groupe dans %s, puis l’insère une seule fois', (id, mot, masque, reponse) => {
    const contenu = fiches.find((fiche) => fiche.id === id)!.jeu.contenu;
    const consigne = contenu.consignes.find((item) => item.mot === mot)!;
    const { container } = render(<Harnais contenu={contenuPour(consigne, contenu)} />);
    const central = () => motVisible(container);
    expect(central()).toBe(masque);
    fireEvent.click(container.querySelector(`[data-lettre="${reponse}"]`)!);
    expect(central()).toBe(mot);
    expect(container.querySelector('[data-moteur="grave"]')?.getAttribute('data-termine')).toBe('oui');
  });

  for (const fiche of fiches) {
    it.each(fiche.jeu.contenu.consignes)(`${fiche.id} : $mot redevient exactement le mot du contenu`, (consigne) => {
      const { container } = render(<Harnais contenu={contenuPour(consigne, fiche.jeu.contenu)} />);
      for (const trou of consigne.trous) {
        fireEvent.click(container.querySelector(`[data-lettre="${trou.attendu}"]`)!);
      }
      // Oracle indépendant : le mot de la fiche, jamais le texte produit par un helper de rendu.
      expect(motVisible(container)).toBe(consigne.mot);
    });
  }

  it('conserve les lettres hors des deux trous, même avec plusieurs groupes', () => {
    const base = fiches[0]!.jeu.contenu;
    const consigne = { ...base.consignes[0]!, mot: 'chapeau', trous: [
      { id: 'debut', position: 0, attendu: 'ch' }, { id: 'fin', position: 4, attendu: 'eau' },
    ] };
    const { container } = render(<Harnais contenu={{ ...contenuPour(consigne, base), clavier: ['ch', 'eau', 'o'] }} />);
    const central = () => motVisible(container);
    expect(central()).toBe('__ap___');
    fireEvent.click(container.querySelector('[data-lettre="ch"]')!);
    expect(central()).toBe('chap___');
    fireEvent.click(container.querySelector('[data-lettre="eau"]')!);
    expect(central()).toBe('chapeau');
  });
});
