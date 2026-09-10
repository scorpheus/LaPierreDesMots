/**
 * Composition réelle des exercices : cibles réellement touchables, texte non rogné et continuité
 * d'un exercice déjà engagé quand la tablette pivote. Ce fichier ne remplace pas la matrice
 * responsive générale : il vérifie ce que celle-ci ne peut pas démontrer avec `isVisible()`.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '../harnais-serveur.js';
import {
  appliquerReglagesLectureReels,
  entrerDansLeNoeud,
  moteursDeclares,
  noeudsLivres,
  preparerSansProfil,
} from '../e2e/qa-outils.js';
import {
  attendreGeometrieStable,
  releverDefautsDeComposition,
  taperLaPriseReelle,
} from './aides-composition.js';

import type { Page } from '@playwright/test';

const TABLETTE_PORTRAIT = { width: 800, height: 1100 };
const TABLETTE_PAYSAGE = { width: 1017, height: 640 };
const DOSSIER_CAPTURES = join(process.cwd(), 'bac-a-sable', 'qa-finition-2026-09-05');
const MOTEURS_A_CAPTURER = new Set(['chrono', 'place', 'chemin']);

const PRISE_PAR_MOTEUR: Readonly<Record<string, string>> = {
  assemble: '[data-porte-bloc] button:not([hidden])',
  attrape: 'button[data-cible]:not([hidden])',
  chemin: 'button[data-atteignable="oui"]',
  chrono: 'button[data-vignette]:not([hidden])',
  // Le cercle des prises est clavier seul (`pointer-events: none`) ; le doigt atteint le
  // chemin du décor qui porte réellement la région active.
  colorie: 'path[data-region-source][data-active="oui"]',
  eclair: 'button[data-action="pret"], button[data-option]',
  grave: '[data-plateau="clavier"] button',
  histoire: 'button[data-action="recit"], button[data-option]',
  libre: '[data-plateau="nuancier"] button[data-couleur]',
  paires: '[data-plateau="cartes"] button',
  phrase: '[data-plateau="etiquettes"] button',
  place: '[data-reserve="place"] button[data-element]',
  trace: '[data-scene="trace"]',
  tri: '[data-plateau="elements"] button[data-element]',
};

function temoinsParMoteur(): ReadonlyMap<string, readonly string[]> {
  const resultat = new Map<string, string[]>();
  const exercicesVus = new Map<string, Set<string>>();
  for (const noeud of noeudsLivres()) {
    const deja = resultat.get(noeud.moteur) ?? [];
    const vus = exercicesVus.get(noeud.moteur) ?? new Set<string>();
    // Deux recettes de contenu distinctes quand elles existent : le moteur est le même, mais
    // nombre de cartes, libellés et décor peuvent changer la géométrie.
    if (!vus.has(noeud.exercice) && deja.length < 2) {
      resultat.set(noeud.moteur, [...deja, noeud.id]);
      exercicesVus.set(noeud.moteur, new Set([...vus, noeud.exercice]));
    }
  }
  return resultat;
}

async function verifierEtat(page: Page, moteur: string, etat: string): Promise<void> {
  const racine = page.locator(`[data-moteur="${moteur}"]`);
  await expect(racine, `${moteur} doit rester monté (${etat})`).toBeVisible();
  await attendreGeometrieStable(page);
  expect(
    await releverDefautsDeComposition(racine),
    `${moteur} — défauts de composition dans l’état ${etat}`,
  ).toEqual([]);
  if (moteur === 'place') {
    const recouvrements = await racine.evaluate((element) => {
      const carton = element.querySelector('[data-plateau="etape-place"]')!.getBoundingClientRect();
      return ['[data-scene="place"]', '[data-reserve="place"]'].filter((selecteur) => {
        const cible = element.querySelector(selecteur)!.getBoundingClientRect();
        return Math.min(carton.right, cible.right) > Math.max(carton.left, cible.left) + 1 &&
          Math.min(carton.bottom, cible.bottom) > Math.max(carton.top, cible.top) + 1;
      });
    });
    expect(recouvrements, 'le cartouche de placement ne masque ni le dessin ni les cartes').toEqual([]);
    const texteDeReserve = await racine.evaluate((element) => {
      const reserve = element.querySelector('[data-reserve="place"]')!.getBoundingClientRect();
      const compteur = element.querySelector('[data-place-compteur]')!.getBoundingClientRect();
      return { auDessus: reserve.top - compteur.top, auDessous: compteur.bottom - reserve.bottom };
    });
    expect(texteDeReserve.auDessus, 'le titre de la réserve ne remonte pas sous le cartouche précédent').toBeLessThanOrEqual(1);
    expect(texteDeReserve.auDessous, 'le titre reste dans la hauteur réservée à son groupe').toBeLessThanOrEqual(1);
    if ((page.viewportSize()?.width ?? 0) > 900 && (page.viewportSize()?.width ?? 0) > (page.viewportSize()?.height ?? 0)) {
      const rangs = await racine.locator('[data-reserve="place"] > button').evaluateAll((cartes) =>
        [...new Set(cartes.map((carte) => Math.round(carte.getBoundingClientRect().top)))].length,
      );
      expect(rangs, 'les cinq dessins tiennent sur deux rangées dans la réserve paysage').toBe(2);
    }
  }
}

async function prendreEtVerifier(page: Page, moteur: string, etat: string): Promise<void> {
  const racine = page.locator(`[data-moteur="${moteur}"]`);
  const selecteur = PRISE_PAR_MOTEUR[moteur];
  if (selecteur === undefined) throw new Error(`Prise réelle non déclarée pour « ${moteur} ».`);
  const prise = racine.locator(selecteur).filter({ visible: true }).first();
  await expect(prise, `${moteur} doit offrir une prise réelle (${etat})`).toBeVisible();
  await taperLaPriseReelle(prise);
}

async function capturerCompositionSiDemandee(
  page: Page,
  moteur: string,
  orientation: 'portrait' | 'paysage',
): Promise<void> {
  if (!MOTEURS_A_CAPTURER.has(moteur)) return;
  mkdirSync(DOSSIER_CAPTURES, { recursive: true });
  const pleinePage = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight + 1,
  );
  await page.screenshot({
    path: join(DOSSIER_CAPTURES, `composition-${moteur}-${orientation}.png`),
    fullPage: pleinePage,
  });
}

test.describe('composition des exercices — anti-faux-verts de la sonde', () => {
  test('CONTRÔLE NÉGATIF — un toit opaque et un carton tronqué sont vus', async ({ page }) => {
    await page.setContent(`
      <main data-fixture="masque">
        <button style="position:fixed;left:40px;top:40px;width:100px;height:64px">toucher</button>
        <div style="position:fixed;left:40px;top:40px;width:100px;height:64px;background:#123;z-index:2"></div>
        <button style="position:fixed;left:40px;top:130px;width:90px;height:64px;overflow:hidden;white-space:nowrap">lecture vraiment longue</button>
      </main>
    `);
    const masques = await releverDefautsDeComposition(page.locator('[data-fixture="masque"]'));
    expect(masques.some((defaut) => defaut.raison.includes('masquée au hit-test'))).toBe(true);
    expect(masques.some((defaut) => defaut.raison.includes('texte de la prise tronqué'))).toBe(true);
  });

  test('CONTRÔLE NÉGATIF — une prise dont seul le centre est couvert reste signalée', async ({ page }) => {
    await page.setContent(`
      <main data-fixture="centre-couvert" style="position:relative;width:100px;height:80px">
        <button style="position:absolute;inset:0;width:100px;height:80px">mot</button>
        <div style="position:absolute;left:40px;top:30px;width:20px;height:20px;background:white"></div>
      </main>
    `);
    const racine = page.locator('[data-fixture="centre-couvert"]');
    const defauts = await releverDefautsDeComposition(racine);
    expect(defauts.some((defaut) => defaut.raison.includes('masquée au hit-test'))).toBe(true);
    await racine.locator('div').evaluate((element) => element.remove());
    expect(await releverDefautsDeComposition(racine)).toEqual([]);
  });

  test('CONTRÔLE NÉGATIF — une prise hors d’un overflow hidden reste signalée après tentative de scroll', async ({ page }) => {
    await page.setContent(`
      <main data-fixture="rogne" style="position:relative;width:180px;height:70px;overflow:hidden">
        <button style="position:absolute;top:90px;width:160px;height:64px">prise hors cadre</button>
      </main>
    `);
    const defauts = await releverDefautsDeComposition(page.locator('[data-fixture="rogne"]'));
    expect(defauts.some((defaut) => defaut.raison.includes('rognée'))).toBe(true);
    expect(await page.locator('[data-fixture="rogne"]').evaluate((element) => element.scrollTop)).toBe(0);
  });

  test('CONTRÔLE NÉGATIF — une image cassée interdit toute mesure', async ({ page }) => {
    await page.setContent('<main data-moteur="temoin"><img src="data:image/png;base64,ceci-n-est-pas-un-png"></main>');
    await expect(attendreGeometrieStable(page)).rejects.toThrow('image cassée ou indécodable');
  });

  test('CONTRÔLE POSITIF — une image paresseuse hors écran garde son cadre sans bloquer la mesure', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 200 });
    await page.setContent(`
      <main data-moteur="temoin" style="position:relative;height:1000px">
        <img loading="lazy" width="88" height="88" style="position:absolute;top:800px"
          src="http://127.0.0.1/image-paresseuse-hors-ecran.png">
      </main>
    `);
    await page.locator('img').evaluate((image) => {
      Object.defineProperty(image, 'complete', { configurable: true, value: false });
    });
    await attendreGeometrieStable(page);
    expect(await page.locator('img').evaluate((image) => {
      const boite = image.getBoundingClientRect();
      return { largeur: boite.width, hauteur: boite.height, complete: (image as HTMLImageElement).complete };
    })).toEqual({ largeur: 88, hauteur: 88, complete: false });
  });

  test('CONTRÔLE NÉGATIF — une géométrie qui bouge ne devient pas stable par hasard', async ({ page }) => {
    await page.setContent(`
      <style>
        @keyframes derive { from { transform: translateX(0); } to { transform: translateX(50px); } }
        [data-moteur="instable"] { animation: derive 1s linear infinite alternate; }
      </style>
      <main data-moteur="instable"><button style="min-height:64px">prise mouvante</button></main>
    `);
    await expect(attendreGeometrieStable(page)).rejects.toThrow('géométrie instable');
  });

  test('CONTRÔLE POSITIF — un chemin SVG visible est mesuré, son cercle clavier seul ne l’est pas', async ({ page }) => {
    await page.setContent(`
      <svg data-fixture="svg" viewBox="0 0 240 120" style="width:240px;height:120px">
        <path data-region-source="feuille" data-active="oui" d="M10 10 H210 V110 H10 Z" fill="#5a8" style="pointer-events:fill" />
        <circle data-cible-frappe="oui" role="button" aria-label="Feuille au clavier" cx="110" cy="60" r="32" style="pointer-events:none" />
      </svg>
    `);
    const chemin = page.locator('path[data-region-source="feuille"][data-active="oui"]');
    expect(await releverDefautsDeComposition(page.locator('[data-fixture="svg"]'))).toEqual([]);
    await taperLaPriseReelle(chemin);
  });

  test('CONTRÔLE POSITIF — le texte lecteur-écran et les ailes décoratives ne sont pas une troncature', async ({ page }) => {
    await page.setContent(`
      <style>
        .luciole-temoin { position:relative;width:180px;height:80px;overflow:visible; }
        .luciole-temoin::after { content:"";position:absolute;right:-42px;top:10px;width:36px;height:54px; }
        .texte-lecteur { position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap; }
      </style>
      <main data-fixture="luciole">
        <button class="luciole-temoin">lune<span class="texte-lecteur">luciole lumineuse</span></button>
      </main>
    `);
    expect(await releverDefautsDeComposition(page.locator('[data-fixture="luciole"]'))).toEqual([]);
  });

  test('CONTRÔLE POSITIF — une page longue normalement défilable et son image chargée passent', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 400 });
    await page.setContent(`
      <main data-fixture="sain" style="position:relative;height:1500px">
        <img alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL2nwAAAABJRU5ErkJggg==">
        <button style="box-sizing:border-box;position:absolute;top:1380px;width:220px;height:64px;white-space:normal">lecture vraiment longue</button>
      </main>
    `);
    await attendreGeometrieStable(page);
    const sain = page.locator('[data-fixture="sain"]');
    const defilementAvant = await page.evaluate(() => scrollY);
    expect(await releverDefautsDeComposition(sain)).toEqual([]);
    expect(await page.evaluate(() => scrollY), 'la mesure rend le défilement à son état initial').toBe(defilementAvant);
    await taperLaPriseReelle(sain.locator('button'));
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  });
});

test.describe('composition des exercices — lecture agrandie et rotation en cours', () => {
  const moteurs = moteursDeclares();
  const temoins = temoinsParMoteur();

  test('l’inventaire des prises est exactement l’union CodeMoteur et chaque moteur a deux recettes si le contenu le permet', () => {
    expect(Object.keys(PRISE_PAR_MOTEUR).sort()).toEqual([...moteurs].sort());
    expect([...temoins.keys()].sort()).toEqual([...moteurs].sort());
    for (const moteur of moteurs) {
      expect(temoins.get(moteur), `aucune recette jouable pour ${moteur}`).toBeDefined();
    }
  });

  for (const moteur of moteurs) {
    test(`${moteur} — prises, cartons et décor restent jouables après rotation`, async ({ page }) => {
      test.setTimeout(90_000);
      const prenom = `Composition-${moteur}`;
      await page.setViewportSize(TABLETTE_PORTRAIT);
      await appliquerReglagesLectureReels(page, prenom);

      for (const [index, noeud] of (temoins.get(moteur) ?? []).entries()) {
        if (index > 0) {
          // `entrerDansLeNoeud` choisit une carte déjà rendue sur l'écran profils. Après le
          // témoin précédent, elle n'existe plus : revenir réellement aux profils évite de
          // confondre la continuité de partie avec une seconde recette indépendante.
          await preparerSansProfil(page);
          await expect(page.locator('[data-ecran="profils"]')).toBeVisible();
          await expect(page.locator('[data-profil]').filter({ hasText: prenom }).first()).toBeVisible();
        }
        await entrerDansLeNoeud(page, noeud, prenom);
        await verifierEtat(page, moteur, `${noeud}, portrait avant geste`);
        if (index === 0) await capturerCompositionSiDemandee(page, moteur, 'portrait');
        await prendreEtVerifier(page, moteur, `${noeud}, portrait`);
        await verifierEtat(page, moteur, `${noeud}, portrait après geste`);

        await page.setViewportSize(TABLETTE_PAYSAGE);
        await verifierEtat(page, moteur, `${noeud}, paysage après rotation`);
        if (index === 0) await capturerCompositionSiDemandee(page, moteur, 'paysage');
        await prendreEtVerifier(page, moteur, `${noeud}, paysage`);
        await verifierEtat(page, moteur, `${noeud}, paysage après second geste`);

        await page.setViewportSize(TABLETTE_PORTRAIT);
      }
    });
  }
});

test('la sonde décode une image ajoutée entre le prévol et la mesure', async ({ page }) => {
  await page.route('http://127.0.0.1/qa-image-tardive.png', (route) => route.fulfill({
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64'),
  }));
  await page.setContent('<main data-ecran="temoin">Image tardive</main>');
  await page.evaluate(() => {
    const policesPretes = document.fonts.ready;
    Object.defineProperty(document.fonts, 'ready', { configurable: true, get() {
      if (document.querySelector('img') === null) {
        const image = document.createElement('img');
        image.src = 'http://127.0.0.1/qa-image-tardive.png';
        document.querySelector('main')!.append(image);
      }
      return policesPretes;
    } });
  });
  await attendreGeometrieStable(page);
  expect(await page.locator('img').evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(1);
});

test('histoire — la question ne rétrécit pas le profil 27 px en téléphone portrait', async ({ page }) => {
  const noeud = noeudsLivres().find((candidate) => candidate.moteur === 'histoire');
  if (noeud === undefined) throw new Error('Aucun nœud histoire livré : la garde de lecture serait vacante.');
  const prenom = 'Composition-histoire-telephone';
  await page.setViewportSize({ width: 360, height: 640 });
  await appliquerReglagesLectureReels(page, prenom);
  await entrerDansLeNoeud(page, noeud.id, prenom);
  await attendreGeometrieStable(page);
  const mesure = await page.locator('[data-moteur="histoire"] [data-cible-histoire="oui"]').evaluate((element) => {
    const style = getComputedStyle(element);
    return { corps: Number.parseFloat(style.fontSize), interligne: Number.parseFloat(style.lineHeight) };
  });
  expect(mesure.corps, 'la question à déchiffrer doit conserver le corps du profil, pas 1 rem').toBeGreaterThanOrEqual(26.5);
  expect(mesure.interligne, 'la question doit conserver l’interligne 2 du profil').toBeGreaterThanOrEqual(53);
});
