/**
 * Le singe — 5 000 taps aléatoires sur l'ensemble de l'application. Annexe T § T3.
 *
 * Trois assertions, et la troisième est la vraie raison d'être du test :
 *   • aucune exception non capturée ;
 *   • aucun écran blanc ;
 *   • **aucun état sans issue** — à tout instant, au moins un élément interactif est présent.
 *
 * « Le blocage sans issue est le pire bug possible sur une appli d'enfant : il ne saura pas le
 * décrire, il arrêtera simplement de jouer. »
 *
 * Le hasard vient de `Alea`, jamais de `Math.random` : un échec du singe doit être rejouable
 * à l'identique en relançant avec la même graine (annexe T § 6, interdictions).
 */
import { expect, test } from '@playwright/test';

import { creerAlea } from '@pierre/partage';

import type { Page } from '@playwright/test';

/** Contrat § 1.7 et annexe T § T3 : 5 000. Abaissable en local pour une boucle courte. */
const NB_TAPS = Number(process.env['PIERRE_SINGE_TAPS'] ?? 5_000);
const TAILLE_LOT = 100;
const GRAINE = Number(process.env['ATELIER_GRAINE'] ?? 20260801);

interface CrochetsTest {
  chargerProfil(fixture: unknown): Promise<void>;
  sauterAnimations(): void;
  graine(n: number): void;
  figerHorloge(instant: string): void;
}
type FenetreTest = Window & { __test: CrochetsTest };

/** Ce que le singe ne doit jamais rencontrer. */
interface Sante {
  readonly aUnEcran: boolean;
  readonly texteVisible: number;
  readonly interactifs: number;
  readonly echecs: number;
}

const SELECTEUR_INTERACTIF = [
  'button:not([disabled])',
  '[role="button"]',
  'a[href]',
  'input',
  'select',
  '[data-godet]',
  '[data-region-svg]',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

async function mesurerSante(page: Page): Promise<Sante> {
  return page.evaluate((selecteur) => {
    return {
      aUnEcran: document.querySelector('[data-ecran]') !== null,
      texteVisible: (document.body.innerText ?? '').trim().length,
      interactifs: document.querySelectorAll(selecteur).length,
      echecs: document.querySelectorAll('[data-etat="echec"]').length
    };
  }, SELECTEUR_INTERACTIF);
}

test.describe('le singe', () => {
  test.slow();

  test(`${NB_TAPS} taps aléatoires ne produisent ni exception, ni écran blanc, ni impasse`, async ({
    page
  }, infos) => {
    const exceptions: string[] = [];
    page.on('pageerror', (erreur) => exceptions.push(String(erreur)));

    const largeur = infos.project.use.viewport?.width ?? 1920;
    const hauteur = infos.project.use.viewport?.height ?? 1200;

    await page.goto('/');
    await page.waitForFunction(() => (window as FenetreTest).__test !== undefined);
    await page.evaluate((graine) => {
      const crochets = (window as FenetreTest).__test;
      crochets.sauterAnimations();
      crochets.graine(graine);
      crochets.figerHorloge('2026-09-01T08:00:00Z');
    }, GRAINE);

    const alea = creerAlea(GRAINE);
    let tapsJoues = 0;

    while (tapsJoues < NB_TAPS) {
      const lot: Array<[number, number]> = [];
      const taille = Math.min(TAILLE_LOT, NB_TAPS - tapsJoues);
      for (let i = 0; i < taille; i += 1) {
        lot.push([Math.floor(alea.flottant() * largeur), Math.floor(alea.flottant() * hauteur)]);
      }

      await page.evaluate((points) => {
        for (const [x, y] of points) {
          const cible = document.elementFromPoint(x, y);
          if (!cible) continue;
          const options = {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            pointerType: 'touch',
            isPrimary: true
          } as PointerEventInit;
          cible.dispatchEvent(new PointerEvent('pointerdown', options));
          cible.dispatchEvent(new PointerEvent('pointerup', options));
          cible.dispatchEvent(new MouseEvent('click', options));
        }
      }, lot);

      tapsJoues += taille;

      const sante = await mesurerSante(page);
      const contexte = `après ${tapsJoues} taps (graine ${GRAINE})`;

      expect(exceptions, `aucune exception non capturée ${contexte}`).toEqual([]);
      expect(sante.aUnEcran, `un écran est toujours monté ${contexte}`).toBe(true);
      expect(sante.texteVisible, `aucun écran blanc ${contexte}`).toBeGreaterThan(0);
      expect(
        sante.interactifs,
        `aucun état sans issue : au moins un élément interactif ${contexte}`
      ).toBeGreaterThan(0);
      expect(sante.echecs, `R14 : aucun état d’échec ${contexte}`).toBe(0);
    }

    expect(tapsJoues).toBe(NB_TAPS);
  });
});
