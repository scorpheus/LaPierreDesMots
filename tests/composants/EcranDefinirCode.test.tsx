/**
 * LA PREMIÈRE DÉFINITION DU CODE PARENT, MONTÉE — `data-ecran="code-parent"`,
 * `data-parent-mode="definition"`. Lot QA-2.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE LE PLAN DEMANDE : « idem » — une sortie, un pavé à cibles ≥ 64 px.
 *
 * Ce fichier garde en plus les deux décisions d'écran qui, si elles se perdaient, rouvriraient
 * chacune un défaut déjà payé :
 *
 *   1. **LES CHIFFRES EN CLAIR.** Décision n° 1 de `EcranDefinirCode.tsx` : il n'y a rien à
 *      protéger d'un regard tant que le code n'existe pas, et « un code mal tapé qu'on ne voit
 *      pas enfermerait le parent dehors de sa propre maison ». Basculer cet écran sur les
 *      pastilles de l'écran d'ouverture serait invisible en revue de code et coûterait, un
 *      jour, un foyer verrouillé. Le test lit les chiffres à l'écran.
 *
 *   2. **LE MÊME CONTRAT DOM QUE LA PORTE.** `data-ecran="code-parent"`, `data-parent="code"`,
 *      `data-touche`, `data-valider="code-parent"` : quatre suites déjà livrées traversent
 *      cette porte, et elles ne doivent pas savoir laquelle des deux moitiés est rendue. Seul
 *      `data-parent-mode` distingue.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enonceUnePerte } from '@partage/ton/index.js';

const poses: string[] = [];
let reponseDefinition: 'ok' | 409 | 500 = 'ok';
/** Retient la résolution pour observer l'écran PENDANT l'envoi. */
let retenirEnvoi = false;

vi.mock('@client/api/client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const Erreur = original['ErreurReseau'] as new (
    statut: number,
    cheminAppele: string,
    message: string,
    corps?: unknown
  ) => Error;
  return {
    ...original,
    definirCodeParent: (code: string) => {
      poses.push(code);
      if (retenirEnvoi) {
        return new Promise(() => undefined);
      }
      if (reponseDefinition === 'ok') {
        return Promise.resolve({ jeton: 'jeton-de-test' });
      }
      return Promise.reject(
        new Erreur(reponseDefinition, '/api/parent/definir', 'refus')
      );
    }
  };
});

const { EcranDefinirCode } = await import('@client/ecrans/EcranDefinirCode');
const { HORS_ECRAN, exigerCibles64, exigerUneSortieQuiRepond } = await import(
  './exigences-ecrans.js'
);

const definitions: number[] = [];
const abandons: number[] = [];

function monter(redefinition = false): void {
  render(
    <EcranDefinirCode
      surDefinition={() => definitions.push(1)}
      surAbandon={() => abandons.push(1)}
      redefinition={redefinition}
    />
  );
}

function taper(code: string): void {
  for (const chiffre of code) {
    fireEvent.click(document.querySelector(`[data-touche="${chiffre}"]`)!);
  }
}

function poser(): void {
  fireEvent.click(document.querySelector('[data-valider="code-parent"]')!);
}

beforeEach(() => {
  poses.length = 0;
  definitions.length = 0;
  abandons.length = 0;
  reponseDefinition = 'ok';
  retenirEnvoi = false;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('les chiffres sont EN CLAIR, et c’est une décision, pas un oubli', () => {
  it('affiche chaque chiffre tapé, et le déclare par `data-code-en-clair`', () => {
    monter();
    expect(
      document.querySelector('[data-code-en-clair]')?.getAttribute('data-code-en-clair')
    ).toBe('oui');

    taper('2607');
    const cases = [...document.querySelectorAll('[data-code-en-clair] span')].map(
      (span) => span.textContent
    );
    console.log(`[QA-2 · definir-code] chiffres visibles : ${cases.join('')}`);
    expect(cases).toEqual(['2', '6', '0', '7']);
    // L'étiquette accessible les épelle : le parent qui n'y voit pas les entend.
    expect(document.querySelector('[data-code-en-clair]')?.getAttribute('aria-label')).toBe(
      'Code choisi : 2 6 0 7'
    );
  });

  it('« Effacer » remet à zéro sans rien poser', () => {
    monter();
    taper('1234');
    fireEvent.click(
      [...document.querySelectorAll('button')].find(
        (bouton) => bouton.textContent === 'Effacer'
      )!
    );
    expect(document.querySelector('[data-code-longueur]')?.getAttribute('data-code-longueur'))
      .toBe('0');
    expect(poses).toEqual([]);
  });

  it('désactive le pavé une fois les quatre chiffres saisis, puis le réactive après Effacer', () => {
    monter();
    taper('1234');
    expect(
      [...document.querySelectorAll<HTMLButtonElement>('[data-touche]')].every(
        (bouton) => bouton.disabled
      )
    ).toBe(true);

    fireEvent.click(
      [...document.querySelectorAll('button')].find(
        (bouton) => bouton.textContent === 'Effacer'
      )!
    );
    expect(
      [...document.querySelectorAll<HTMLButtonElement>('[data-touche]')].every(
        (bouton) => !bouton.disabled
      )
    ).toBe(true);
  });
});

describe('le même contrat DOM que la porte — vu du dehors, c’est la même serrure', () => {
  it('porte les quatre prises de `EcranCodeParent`, plus son seul attribut neuf', () => {
    monter();
    expect(document.querySelector('[data-ecran="code-parent"]')).not.toBeNull();
    expect(document.querySelector('[data-parent="code"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-touche]')).toHaveLength(10);
    expect(document.querySelector('[data-valider="code-parent"]')).not.toBeNull();
    expect(
      document.querySelector('[data-parent-mode]')?.getAttribute('data-parent-mode')
    ).toBe('definition');
    // Aucun verrou ici : il n'y a pas de code à rater.
    expect(document.querySelector('[data-verrou]')?.getAttribute('data-verrou')).toBe('inactif');
  });

  it('le titre change entre POSER et CHANGER — le mécanisme, non', () => {
    monter(false);
    expect(document.querySelector('h1')?.textContent).toContain('Choisis le code');
    cleanup();
    monter(true);
    expect(document.querySelector('h1')?.textContent).toContain('Changer le code');
    expect(document.querySelectorAll('[data-touche]')).toHaveLength(10);
  });
});

describe('poser un code, et ne jamais enfermer personne', () => {
  it('envoie EXACTEMENT le code choisi, puis rend la main', async () => {
    monter();
    taper('2607');
    poser();
    await waitFor(() => {
      expect(poses).toEqual(['2607']);
    });
    expect(definitions).toHaveLength(1);
  });

  it('la sortie existe PENDANT l’envoi — aucun état sans issue', () => {
    retenirEnvoi = true;
    monter();
    taper('2607');
    poser();
    // L'envoi ne se résoudra jamais : c'est l'instant où l'écran est le plus figé.
    expect(document.body.textContent).toContain('On enregistre');
    const retour = [...document.querySelectorAll('button')].find(
      (bouton) => bouton.textContent === 'Retour au jeu'
    );
    // Le message dit exactement ce que `toBeDefined` mesure — une PRÉSENCE. Que ce bouton
    // mène réellement ailleurs est mesuré trois lignes plus bas, par le clic et `abandons` :
    // c'est là qu'est la propriété, et un message ne doit pas la promettre avant elle.
    expect(retour, 'le bouton « Retour au jeu » n’est plus rendu pendant l’envoi').toBeDefined();
    expect(retour!.disabled, 'la sortie est désactivée pendant l’envoi').toBe(false);
    fireEvent.click(retour!);
    expect(abandons).toHaveLength(1);
  });

  it('un 409 DIT quoi faire, sans reproche et sans perte', async () => {
    reponseDefinition = 409;
    monter();
    taper('2607');
    poser();
    await waitFor(() => {
      expect(document.querySelector('[role="status"]')).not.toBeNull();
    });
    const message = document.querySelector('[role="status"]')!.textContent ?? '';
    console.log(`[QA-2 · definir-code] message 409 : « ${message} »`);
    expect(message).toContain('existe déjà');
    expect(enonceUnePerte(message), 'le message énonce une perte').toBeNull();
    expect(definitions, 'le code a été considéré comme posé malgré le 409').toHaveLength(0);
    expect(document.querySelectorAll('[data-etat="echec"]')).toHaveLength(0);
  });

  it('une panne réseau propose de réessayer, elle ne bloque rien', async () => {
    reponseDefinition = 500;
    monter();
    taper('2607');
    poser();
    await waitFor(() => {
      expect(document.querySelector('[role="status"]')).not.toBeNull();
    });
    expect(document.querySelector('[role="status"]')!.textContent).toContain('On réessaie');
    // Le pavé est de nouveau vivant : on peut retaper tout de suite.
    expect(document.querySelector<HTMLButtonElement>('[data-touche="1"]')!.disabled).toBe(false);
  });
});

describe('l’exigence commune des dix écrans', () => {
  it('AU MOINS un objet tapable mène ailleurs — essayés un par un', async () => {
    const rapport = await exigerUneSortieQuiRepond(
      'definir-code',
      () => {
        monter();
        return {
          racine: document.body,
          aQuitte: () => abandons.length > 0 || definitions.length > 0
        };
      },
      () => {
        abandons.length = 0;
        definitions.length = 0;
        cleanup();
      }
    );
    expect(rapport.repondent.length).toBeGreaterThanOrEqual(1);
  });

  it('les 13 cibles déclarent toutes leur taille (R16)', () => {
    monter();
    const rapport = exigerCibles64('definir-code', document.body, HORS_ECRAN);
    expect(rapport.population).toBeGreaterThanOrEqual(13);
  });
});
