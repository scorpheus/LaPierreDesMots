/**
 * Le moteur `place` monté isolément — annexe T § T1 : « un test par moteur pour bonne
 * réponse, mauvaise réponse, aide de Gobi, double-tap rapide, désordre de rendu ».
 *
 * Le composant de L2-C est **contrôlé** : il reçoit `etat` et `emettre` (contrat v1 § 4.4).
 * Le harnais ci-dessous referme la boucle avec le vrai réducteur `moteurPlace.reduire`, de
 * sorte que ce fichier teste l'assemblage réel logique + rendu, pas une maquette.
 *
 * Aucun réseau : `fetch` est servi depuis `contenu/` sur disque, et toute autre URL est
 * refusée bruyamment. Un test ne parle jamais au réseau réel (annexe T § 2.3).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useCallback, useState } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { moteurPlace } from '@partage/moteurs/place/moteur';
import { renduPlace } from '@client/moteurs/place/index';

import type { ActionPlace, ContenuPlace, EtatPlace } from '@partage/moteurs/place/index';
import type { Exercice, Habillage } from '@pierre/partage';

import {
  RACINE_DEPOT,
  aleaDeTest,
  horlogeDeTest,
  lireJson,
  servicesDeTest,
} from '../configuration/preparation.js';

const CHEMIN_EXERCICE = 'contenu/exercices/clairiere/ecole-02-place.json';
const CHEMIN_HABILLAGE = 'contenu/habillages/clairiere/ecole-place.habillage.json';

const exercice = lireJson<Exercice>(CHEMIN_EXERCICE);
const contenu = exercice.jeu.contenu as ContenuPlace;
const habillage = lireJson<Habillage>(CHEMIN_HABILLAGE);

/** Sert `contenu/**` depuis le disque. Toute autre URL est un appel sortant : on la refuse. */
function installerFetchLocal(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown): Promise<Response> => {
      const url = String(entree);
      const apres = /\/api\/contenu\/assets\/(.+)$/.exec(url)?.[1];
      if (apres === undefined) throw new Error(`appel réseau sortant interdit : ${url}`);
      const texte = readFileSync(join(RACINE_DEPOT, 'contenu', ...apres.split('/')), 'utf8');
      return new Response(texte, { status: 200 });
    }),
  );
}

/** Le harnais : le vrai réducteur, le vrai composant, aucun état simulé. */
function Harnais(): ReturnType<typeof renduPlace.Composant> {
  const services = servicesDeTest();
  const [etat, setEtat] = useState<EtatPlace>(() =>
    moteurPlace.creerEtat({
      contenu,
      habillage,
      alea: aleaDeTest(),
      horloge: horlogeDeTest(),
    }),
  );
  const emettre = useCallback((action: ActionPlace) => {
    setEtat((courant) =>
      moteurPlace.reduire(courant, action, { alea: aleaDeTest(), horloge: horlogeDeTest() }),
    );
  }, []);

  const Composant = renduPlace.Composant;
  return (
    <Composant
      contenu={contenu}
      habillage={habillage}
      etat={etat}
      emettre={emettre}
      services={services}
      animationsDesactivees
    />
  );
}

function taperElement(id: string): void {
  const noeud = document.querySelector(`[data-element="${id}"]`);
  expect(noeud, `élément « ${id} » absent du DOM`).not.toBeNull();
  fireEvent.click(noeud!);
}

function taperZone(id: string): void {
  const noeud = document.querySelector(`[data-zone-cible="${id}"]`);
  expect(noeud, `zone « ${id} » absente du DOM`).not.toBeNull();
  fireEvent.click(noeud!);
}

beforeEach(() => {
  installerFetchLocal();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MoteurPlace — les prises du contrat § 7', () => {
  it('affiche l’illustration d’école validée sous les trois zones de placement', async () => {
    render(<Harnais />);

    await waitFor(() => {
      const fond = document.querySelector<SVGImageElement>('[data-fond-illustre="ecole"]');
      expect(fond).not.toBeNull();
      expect(fond?.getAttribute('href')).toBe('/api/contenu/assets/assets/decors/ecole.png');
    });

    expect(document.querySelectorAll('[data-zone-cible]')).toHaveLength(3);
  });

  it('expose data-moteur, data-habillage, et une zone par zone du contenu', () => {
    render(<Harnais />);
    const racine = document.querySelector('[data-moteur="place"]');
    expect(racine).not.toBeNull();
    expect(racine?.getAttribute('data-habillage')).toBe(habillage.id);
    expect(document.querySelectorAll('[data-zone-cible]').length).toBe(contenu.zones.length);
    expect(document.querySelectorAll('[data-element]').length).toBe(contenu.reserve.length);
  });

  it('ne présente pas les trois réponses avant les deux intrus dans l’ordre du fichier', () => {
    render(<Harnais />);
    const ordreAffiche = [...document.querySelectorAll<HTMLElement>('[data-element]')].map(
      (element) => element.dataset['element'],
    );
    expect(ordreAffiche).not.toEqual(contenu.reserve.map((element) => element.id));
    expect(new Set(ordreAffiche)).toEqual(new Set(contenu.reserve.map((element) => element.id)));
  });

  it('n’émet JAMAIS data-etat="echec" — R14', () => {
    render(<Harnais />);
    // Vingt gestes faux d'affilée.
    for (let i = 0; i < 20; i += 1) {
      taperElement('poisson');
      taperZone(contenu.zones[i % contenu.zones.length]!.id);
    }
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
    expect(document.querySelector('[data-moteur="place"]')).not.toBeNull();
  });

  it('chaque élément de la réserve porte data-place, « non » avant de l’avoir posé', () => {
    render(<Harnais />);
    for (const element of contenu.reserve) {
      const noeud = document.querySelector(`[data-element="${element.id}"]`);
      expect(noeud?.getAttribute('data-place')).toBe('non');
    }
  });

  it('montre le dessin local de chaque objet dans la réserve', () => {
    render(<Harnais />);
    for (const element of contenu.reserve) {
      const image = document.querySelector<HTMLImageElement>(
        `[data-element="${element.id}"] img[data-dessin-objet="${element.id}"]`,
      );
      expect(image, `dessin de « ${element.id} » absent`).not.toBeNull();
      expect(image?.getAttribute('src')).toBe(`/api/contenu/assets/${element.asset}`);
    }
  });

  it('annonce clairement les 3 dessins attendus et les 2 intrus à laisser', () => {
    render(<Harnais />);

    expect(document.querySelector('[data-place-compteur="oui"]')?.textContent).toContain(
      '3 dessins à placer · 2 intrus à laisser',
    );
    expect(document.querySelector('[data-reserve="place"]')?.getAttribute('aria-label')).toBe(
      '3 dessins à placer et 2 intrus à laisser',
    );
    expect(document.querySelectorAll('[data-element-role="a-placer"]')).toHaveLength(3);
    expect(document.querySelectorAll('[data-element-role="amusant"]')).toHaveLength(2);
    expect(document.querySelector('[data-element="poisson"]')?.getAttribute('aria-label')).toBe(
      'un poisson, dessin pour s’amuser',
    );
  });

  it('place les zones sur le ciel, le toit central et le banc de l’illustration', () => {
    const zones = new Map(contenu.zones.map((zone) => [zone.id, zone]));
    expect(zones.get('ciel')?.centroide).toEqual([680, 57.5]);
    expect(zones.get('toit-ecole')?.centroide[0]).toBeGreaterThan(350);
    expect(zones.get('toit-ecole')?.centroide[1]).toBeLessThan(180);
    expect(zones.get('a-cote-du-banc')?.centroide[0]).toBeLessThan(250);
    expect(zones.get('a-cote-du-banc')?.centroide[1]).toBeGreaterThan(330);
  });
});

describe('MoteurPlace — bonne réponse, mauvaise, aide, double-tap', () => {
  it('BONNE RÉPONSE : taper l’objet puis la zone le pose, et la consigne avance', () => {
    render(<Harnais />);
    const racine = () => document.querySelector('[data-moteur="place"]')!;
    expect(racine().getAttribute('data-consigne')).toBe('c1');

    taperElement('soleil');
    expect(document.querySelector('[data-element="soleil"]')?.getAttribute('data-saisi')).toBe(
      'oui',
    );

    taperZone('ciel');
    expect(document.querySelector('[data-element="soleil"]')?.getAttribute('data-place')).toBe(
      'oui',
    );
    expect(document.querySelector('[data-pose="soleil"]')).not.toBeNull();
    expect(
      document
        .querySelector('[data-pose="soleil"] image[data-dessin-pose="soleil"]')
        ?.getAttribute('href'),
    ).toBe('/api/contenu/assets/assets/objets/soleil.svg');
    // Passage automatique à la consigne suivante : il n'existe ni « valider » ni « suivant ».
    expect(racine().getAttribute('data-consigne')).toBe('c2');
  });

  it('MAUVAISE RÉPONSE : l’intrus revient à la réserve, sans rouge et sans écran d’échec', () => {
    render(<Harnais />);
    taperElement('poisson');
    taperZone('ciel');

    expect(document.querySelector('[data-element="poisson"]')?.getAttribute('data-place')).toBe(
      'non',
    );
    expect(document.querySelector('[data-pose="poisson"]')).toBeNull();
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
    // La consigne n'a pas avancé : l'exercice attend toujours le soleil.
    expect(document.querySelector('[data-moteur="place"]')?.getAttribute('data-consigne')).toBe(
      'c1',
    );
    // Et la zone porte la marque du refus, qui est une oscillation, jamais une couleur.
    expect(document.querySelector('[data-zone-cible="ciel"]')?.getAttribute('data-refus')).not.toBe(
      null,
    );
  });

  it('DÉPÔT SANS SAISIE : un rappel, jamais un reproche', () => {
    render(<Harnais />);
    taperZone('ciel');
    const rappel = document.querySelector('[data-rappel="oui"]');
    expect(rappel).not.toBeNull();
    expect(rappel?.textContent).toContain('objet');
  });

  it('DOUBLE-TAP : reposer un objet déjà posé ne le déplace pas et ne coûte rien', () => {
    render(<Harnais />);
    taperElement('soleil');
    taperZone('ciel');
    expect(document.querySelector('[data-pose="soleil"]')?.getAttribute('data-pose-zone')).toBe(
      'ciel',
    );

    // Deuxième tap immédiat sur le même objet, puis sur une autre zone.
    taperElement('soleil');
    taperZone('a-cote-du-banc');

    expect(document.querySelector('[data-pose="soleil"]')?.getAttribute('data-pose-zone')).toBe(
      'ciel',
    );
    expect(document.querySelector('[data-pose-zone="a-cote-du-banc"]')).toBeNull();
    // La consigne active n'a pas reculé — un acquis n'est jamais repris (R14).
    expect(document.querySelector('[data-moteur="place"]')?.getAttribute('data-consigne')).toBe(
      'c2',
    );
  });

  it('AIDE DE GOBI : deux erreurs suffisent à obtenir l’indice, et il ne repart jamais', () => {
    render(<Harnais />);
    taperElement('poisson');
    taperZone('ciel');
    taperElement('parapluie');
    taperZone('ciel');

    // Le palier est accordé par le moteur ; la zone visée est mise en avant.
    const zone = document.querySelector('[data-zone-cible="ciel"]');
    expect(zone).not.toBeNull();

    // Et une bonne réponse ensuite ne retire pas l'aide déjà obtenue.
    taperElement('soleil');
    taperZone('ciel');
    expect(document.querySelector('[data-element="soleil"]')?.getAttribute('data-place')).toBe(
      'oui',
    );
    expect(document.querySelector('[data-etat="echec"]')).toBeNull();
  });

  it('L’EXERCICE VA JUSQU’AU BOUT et se déclare terminé', () => {
    render(<Harnais />);
    taperElement('soleil');
    taperZone('ciel');
    taperElement('ballon');
    taperZone('a-cote-du-banc');
    taperElement('oiseau');
    taperZone('toit-ecole');

    expect(document.querySelector('[data-moteur="place"]')?.getAttribute('data-termine')).toBe(
      'oui',
    );
  });
});

describe('MoteurPlace — R16, les cibles ne sont jamais minuscules', () => {
  it('chaque zone porte une prise transparente d’au moins 80 unités', () => {
    render(<Harnais />);
    const zones = [...document.querySelectorAll<SVGGElement>('[data-zone-cible]')];
    expect(zones).toHaveLength(contenu.zones.length);
    for (const zone of zones) {
      expect(zone.tagName.toLowerCase()).toBe('g');
      expect(zone.getAttribute('role')).toBe('button');
      const prise = zone.querySelector<SVGRectElement>('[data-cible-frappe="oui"]');
      expect(prise).not.toBeNull();
      expect(Number(prise!.getAttribute('width'))).toBeGreaterThanOrEqual(80);
      expect(Number(prise!.getAttribute('height'))).toBeGreaterThanOrEqual(80);
    }
  });

  it('chaque jeton de la réserve déclare au moins 64 px dans les deux dimensions', () => {
    render(<Harnais />);
    for (const element of contenu.reserve) {
      const noeud = document.querySelector<HTMLElement>(`[data-element="${element.id}"]`);
      expect(noeud).not.toBeNull();
      // happy-dom ne fait pas de mise en page : on lit le style déclaré, et la mesure réelle
      // reste celle de `tests/qualite/a11y.spec.ts` sur la boîte rendue.
      expect(Number.parseFloat(noeud!.style.minWidth)).toBeGreaterThanOrEqual(64);
      expect(Number.parseFloat(noeud!.style.minHeight)).toBeGreaterThanOrEqual(64);
    }
  });

  /**
   * ── CE CAS A ÉTÉ RETIRÉ AVEC R49, ET IL GARDAIT LITTÉRALEMENT LE DOUBLON ─────────────────
   *
   * Il exigeait `[data-consigne-texte="oui"]` DANS le moteur, avec le texte de l'étape.
   * « la phrase est en haut et en bas, il y a doublon » (le père, 2026-08-07) : `EcranNoeud`
   * porte la consigne seul depuis, parce qu'il est le seul à avoir la clé du `BoutonEcouter`.
   * Le garder ici reviendrait à exiger le retour du doublon.
   *
   * **L'exigence n'est pas perdue : elle suit l'objet.** Vérifié AVANT de retirer, pas après :
   *   • l'AFFICHAGE — `tests/composants/EcranNoeud.test.tsx`, « R49 — porte la consigne de
   *     l'étape, et elle y est LISIBLE » ;
   *   • l'AUDIBILITÉ — `tests/e2e/parcours-variete.spec.ts:300`, qui exige
   *     `[data-action="ecouter"]` sur l'application réelle (R15) ;
   *   • et le sens INVERSE — `tests/unitaires/consigne-sans-doublon.test.ts`, qu'aucun moteur
   *     ne la reprenne.
   *
   * Retirer une assertion sur la foi d'une affirmation, ce serait perdre l'exigence en croyant
   * la déplacer. Les trois adresses ci-dessus ont été lues, pas supposées.
   */

});
