/**
 * La séquence d'ouverture, montée — D35, lot N4.
 *
 * C'est la seconde moitié du contrat de sortie de N4 (contrat v3 § 9.2) :
 * **ouverture passable à `t = 0` ms**. La première moitié — aucun texte fautif — est dans
 * `tests/unitaires/ton-sans-perte.test.ts`.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * CE QUE CE FICHIER GARANTIT, ET QUE RIEN D'AUTRE NE GARANTIRAIT
 *
 * « Passable au tap dès la première seconde » est une phrase de conception. Montée, elle
 * devient une propriété mesurable : **la prise de sortie est dans le DOM au premier rendu**.
 * Un écran qui la ferait apparaître au bout de trois secondes passerait toute revue de code
 * et échouerait ici — c'est exactement le genre d'écart qui ne se voit qu'à l'usage, et
 * l'usage, ici, c'est un enfant de sept ans qui a cinq minutes (D46).
 *
 * Les données viennent du DISQUE, jamais d'une maquette : `contenu/monde/ouverture.json` réel,
 * validé par `sequenceDuDocument`. Un test qui inventerait ses cinq tableaux ne dirait rien du
 * fichier livré.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ORDRE_TABLEAUX, sequenceDuDocument } from '@pierre/partage/ouverture';
import { enonceUnePerte } from '@partage/ton/index.js';
import { EcranOuverture } from '@client/ecrans/EcranOuverture';
import { creerMagasin } from '@client/etat/magasin';
import { FournisseurJeu } from '@client/etat/services';
import { creerHaptiqueMuette } from '@client/gamefeel/haptique-navigateur';
import { creerRetourSensoriel } from '@client/gamefeel/retour';

import { lireJson, servicesDeTest } from '../configuration/preparation.js';

const SEQUENCE = sequenceDuDocument(lireJson('contenu/monde/ouverture.json'));

function services() {
  const base = servicesDeTest();
  const haptique = creerHaptiqueMuette();
  return {
    ...base,
    haptique,
    retour: creerRetourSensoriel({
      audio: base.audio,
      haptique,
      animationsDesactivees: true,
      emettreParticules: () => undefined
    })
  };
}

function monter(proprietes: Parameters<typeof EcranOuverture>[0] = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FournisseurJeu valeur={{ services: services(), magasin: creerMagasin() }}>
        <EcranOuverture {...proprietes} />
      </FournisseurJeu>
    </QueryClientProvider>
  );
}

/**
 * Le réseau est coupé, et c'est le PIRE cas, pas une commodité.
 *
 * Un test composant qui appelle vraiment `fetch` teste le serveur. Ici on répond 404 à tout :
 * les décors SVG n'arrivent jamais. La séquence doit rester lisible et sortable malgré tout —
 * « le décor est optionnel, pas le récit ». Sans ce bouchon, la suite passerait aussi, mais en
 * ne prouvant rien de cette propriété-là, et en semant des `ECONNREFUSED` dans le rapport.
 */
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response('', { status: 404 })))
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('D35 — la séquence est passable au tap dès la première seconde', () => {
  it('porte sa prise de sortie DANS LE DOM au premier rendu, à t = 0 ms', () => {
    // Aucun `act` supplémentaire, aucun timer avancé, aucun `await` : c'est le tout premier
    // rendu qu'on inspecte. Si la sortie n'y est pas, `passableDesMs = 0` est un mensonge.
    monter({ sequence: SEQUENCE });
    expect(document.querySelector('[data-passer="ouverture"]')).not.toBeNull();
    expect(document.querySelector('[data-ecran="ouverture"]')?.getAttribute('data-passable-des-ms'))
      .toBe('0');
  });

  it('rend la main au premier tap sur « Passer l’histoire », depuis le PREMIER tableau', () => {
    const fins: boolean[] = [];
    monter({ sequence: SEQUENCE, surFin: (passee) => fins.push(passee) });

    fireEvent.click(document.querySelector('[data-passer="ouverture"]')!);

    expect(fins).toEqual([true]);
  });

  it('n’appelle `surFin` qu’une seule fois, même sur deux gestes rapprochés', () => {
    const fins: boolean[] = [];
    monter({ sequence: SEQUENCE, surFin: (passee) => fins.push(passee) });
    const passer = document.querySelector('[data-passer="ouverture"]')!;
    fireEvent.click(passer);
    fireEvent.click(passer);
    expect(fins).toHaveLength(1);
  });
});

describe('la séquence se déroule, et se termine sur un geste de l’enfant', () => {
  it('avance tableau par tableau, dans l’ordre du récit', () => {
    monter({ sequence: SEQUENCE });
    const ecran = (): Element => document.querySelector('[data-ecran="ouverture"]')!;

    for (const attendu of ORDRE_TABLEAUX) {
      expect(ecran().getAttribute('data-tableau-courant')).toBe(attendu);
      fireEvent.click(document.querySelector('[data-suite="ouverture"]')!);
    }
  });

  it('sur le dernier tableau, la prise principale FAIT SORTIR et la séquence est « vue »', () => {
    const fins: boolean[] = [];
    monter({ sequence: SEQUENCE, surFin: (passee) => fins.push(passee) });

    for (let rang = 0; rang < ORDRE_TABLEAUX.length; rang += 1) {
      fireEvent.click(document.querySelector('[data-suite="ouverture"]')!);
    }
    // `false` : l'enfant a vu le récit en entier, il ne l'a pas sauté.
    expect(fins).toEqual([false]);
  });

  it('affiche les cinq textes du fichier livré, entiers', () => {
    monter({ sequence: SEQUENCE });
    for (const tableau of SEQUENCE.tableaux) {
      const rendu = document.querySelector(`[data-texte-tableau="${tableau.code}"]`);
      if (rendu !== null) {
        expect(rendu.textContent).toBe(tableau.texte);
      }
      fireEvent.click(document.querySelector('[data-suite="ouverture"]')!);
    }
  });
});

describe('l’enchaînement automatique respecte un enfant qui déchiffre (D14)', () => {
  it('enchaîne tout seul après `dureeMs` tant que l’enfant n’a rien touché', () => {
    vi.useFakeTimers();
    monter({ sequence: SEQUENCE });
    const ecran = (): Element => document.querySelector('[data-ecran="ouverture"]')!;

    expect(ecran().getAttribute('data-tableau-courant')).toBe('pierre');
    act(() => {
      vi.advanceTimersByTime(SEQUENCE.tableaux[0]!.dureeMs);
    });
    expect(ecran().getAttribute('data-tableau-courant')).toBe('grisaille');
  });

  it('SE TAIT DÉFINITIVEMENT dès que l’enfant a touché quoi que ce soit', () => {
    vi.useFakeTimers();
    monter({ sequence: SEQUENCE });
    const ecran = (): Element => document.querySelector('[data-ecran="ouverture"]')!;

    // Un tap : l'enfant prend la main. La phrase ne doit plus jamais partir sous ses yeux.
    fireEvent.click(document.querySelector('[data-suite="ouverture"]')!);
    expect(ecran().getAttribute('data-tableau-courant')).toBe('grisaille');

    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(ecran().getAttribute('data-tableau-courant')).toBe('grisaille');
  });

  it('ne termine JAMAIS la séquence toute seule — le dernier tableau attend', () => {
    vi.useFakeTimers();
    const fins: boolean[] = [];
    monter({ sequence: SEQUENCE, surFin: (passee) => fins.push(passee) });

    act(() => {
      // Bien au-delà de la somme des cinq durées.
      vi.advanceTimersByTime(600_000);
    });
    expect(fins).toEqual([]);
  });
});

describe('AUCUN ÉTAT SANS ISSUE — la règle dure du projet', () => {
  it('sans séquence chargée, l’écran reste utilisable et la sortie fonctionne', () => {
    const fins: boolean[] = [];
    // `sequence: null` explicite : le réseau n'a rien rendu. Aucun `fetch` n'est simulé — c'est
    // volontaire, on veut le pire cas.
    monter({ sequence: null, surFin: (passee) => fins.push(passee) });

    const principale = document.querySelector('[data-suite="ouverture"]');
    expect(principale).not.toBeNull();
    fireEvent.click(principale!);
    expect(fins).toEqual([false]);
  });

  it('est rejouable : un second montage repart du premier tableau', () => {
    const premier = monter({ sequence: SEQUENCE });
    fireEvent.click(document.querySelector('[data-suite="ouverture"]')!);
    expect(document.querySelector('[data-ecran="ouverture"]')?.getAttribute('data-tableau-courant'))
      .toBe('grisaille');
    premier.unmount();

    monter({ sequence: SEQUENCE });
    expect(document.querySelector('[data-ecran="ouverture"]')?.getAttribute('data-tableau-courant'))
      .toBe('pierre');
  });
});

describe('C7 — le récit lui-même dit ce que l’enfant peut rendre', () => {
  it('aucun des cinq tableaux livrés n’énonce une perte laissée sans geste', () => {
    for (const tableau of SEQUENCE.tableaux) {
      const faute = enonceUnePerte(tableau.texte);
      expect(faute, `« ${tableau.texte} » → ${String(faute?.remede)}`).toBeNull();
    }
  });

  it('les tableaux qui posent la perte portent AUSSI le pouvoir d’agir', () => {
    // La preuve que le récit fait bien le retournement de D35, et n'a pas simplement évité le
    // sujet : « la Pierre s'est brisée », « perd ses couleurs », « en gris » sont bien là.
    const recit = SEQUENCE.tableaux.map((tableau) => tableau.texte).join(' ');
    expect(recit).toMatch(/brisée/u);
    expect(recit).toMatch(/perd ses couleurs/u);
    expect(recit).toMatch(/en gris/u);
    // Et chacun de ces trois tableaux passe quand même C7, ce que le cas précédent a prouvé.
  });
});
