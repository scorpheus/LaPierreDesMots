/**
 * RETOUR PARENT E16 / E25 (12 oct.) — « les mots sont dans l'ordre, alignés et pas mélangés, il
 * faut faire comme dans la clairière ». Un seul moteur `tri`, donc un seul comportement : là où
 * la Clairière éparpille ses mots SUR LE DÉCOR, les Galeries doivent le faire aussi.
 *
 * Mesuré avant correction (sonde, 55 cas nœud × format, `bac-a-sable/tri-sonde-*.jsonl`) :
 *   - les Galeries tombaient en grille à tous les formats sauf un : leurs grottes-réceptacles sont
 *     en HAUT du décor, et la bande des mots, toujours prise AU-DESSUS des panneaux, y faisait
 *     64 px (`horsBornes` 8/8 et 12/12) ;
 *   - quand elles restaient sur le décor, les mots y étaient RANGÉS EN LIGNES (repli `lignes` de
 *     `deriverEmplacements`) : 5 à 7 mots sur la même ligne.
 *
 * Deux exigences, chacune mécanique :
 *   1. DISPOSITION — à chaque format où les deux nœuds de la Clairière obtiennent
 *      `data-disposition="decor"`, les deux nœuds des Galeries l'obtiennent aussi ;
 *   2. PAS DE RANGÉE — sur le décor, au plus ⌈n/3⌉ des n mots partagent la même ligne (centre
 *      vertical à 2 px près). Le seuil est celui que la Clairière validée respecte déjà quand elle
 *      pose ses mots sur les régions (3 ou 4 sur 12, mesuré) ; une rangée en lignes en aligne 5 à 7.
 */
import type { Page } from '@playwright/test';

import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud, noeudsLivres, preparer } from './qa-outils.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';
import { jalonDom, jouerProchainGesteDom, lireEtatDom, toucherPrise } from './gestes-dom.js';

const FORMATS = [
  { width: 800, height: 1100 },
  { width: 1100, height: 700 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 940 },
] as const;

const CLAIRIERE = ['clairiere-03', 'clairiere-12'] as const;
const GALERIES = ['galeries-04', 'galeries-13'] as const;

interface Releve {
  readonly disposition: string;
  readonly mots: number;
  /** Le plus grand nombre de mots dont les centres verticaux coïncident à 2 px près. */
  readonly alignes: number;
}

async function relever(page: Page, noeud: string, format: { width: number; height: number }): Promise<Releve> {
  await page.setViewportSize(format);
  await preparer(page);
  await entrerDansLeNoeud(page, noeud);
  const moteur = page.locator('[data-moteur="tri"]');
  await expect(moteur).toBeVisible();
  await attendreGeometrieStable(page);
  const lire = (): Promise<Releve> =>
    moteur.evaluate((racine) => {
      const centres = [...racine.querySelectorAll<HTMLElement>('[data-element]')].map((mot) => {
        const boite = mot.getBoundingClientRect();
        return boite.top + boite.height / 2;
      });
      const alignes = Math.max(0, ...centres.map((y) => centres.filter((autre) => Math.abs(autre - y) <= 2).length));
      return { disposition: racine.getAttribute('data-disposition') ?? '', mots: centres.length, alignes };
    });
  // Un ÉTAT, pas une durée : deux lectures successives identiques.
  let precedent = '';
  await expect
    .poll(async () => {
      const courant = JSON.stringify(await lire());
      const stable = courant === precedent;
      precedent = courant;
      return stable;
    })
    .toBe(true);
  return lire();
}

for (const format of FORMATS) {
  const nomFormat = `${String(format.width)}×${String(format.height)}`;
  test(`tri ${nomFormat} — les Galeries éparpillent leurs mots sur le décor comme la Clairière`, async ({ page }) => {
    const clairiere = new Map<string, Releve>();
    for (const noeud of CLAIRIERE) clairiere.set(noeud, await relever(page, noeud, format));
    const surLeDecor = [...clairiere.values()].every((releve) => releve.disposition === 'decor');

    const constats: string[] = [];
    for (const [noeud, releve] of clairiere) constats.push(`${noeud} ${releve.disposition} alignés ${String(releve.alignes)}/${String(releve.mots)}`);
    for (const noeud of GALERIES) {
      const releve = await relever(page, noeud, format);
      constats.push(`${noeud} ${releve.disposition} alignés ${String(releve.alignes)}/${String(releve.mots)}`);
    }
    test.info().annotations.push({ type: 'relevé', description: constats.join(' · ') });

    // 1. Disposition : la Clairière fait foi, format par format.
    expect(surLeDecor, `la Clairière n'obtient pas le décor en ${nomFormat} : ${constats.join(' · ')}`).toBe(true);
    const enGrille = constats.filter((ligne) => ligne.startsWith('galeries') && !ligne.includes(' decor '));
    expect(enGrille, `Galeries hors du décor en ${nomFormat}`).toEqual([]);

    // 2. Pas de rangée, sur les quatre nœuds — un seul comportement.
    const ranges = constats.filter((ligne) => {
      const [, alignes, mots] = /alignés (\d+)\/(\d+)/u.exec(ligne) ?? [];
      return Number(alignes) > Math.ceil(Number(mots) / 3);
    });
    expect(ranges, `mots rangés en ligne en ${nomFormat}`).toEqual([]);
  });
}

/**
 * Le semis dépend de la hauteur MESURÉE des panneaux, qui grandit quand leurs fentes se
 * remplissent. Garde : après un dépôt réussi, les mots qui restent ne bougent pas — un mot qui
 * saute pendant que l'enfant lit lui fait perdre sa place, et peut lui voler son toucher.
 */
for (const format of [{ width: 800, height: 1100 }, { width: 1280, height: 720 }] as const) {
  for (const noeud of [...CLAIRIERE, ...GALERIES, 'marais-jumeau-03'] as const) {
    test(`tri ${noeud} ${String(format.width)}×${String(format.height)} — les mots restants ne bougent pas après un dépôt`, async ({ page }) => {
      await page.setViewportSize(format);
      await preparer(page);
      await entrerDansLeNoeud(page, noeud);
      const moteur = page.locator('[data-moteur="tri"]');
      await attendreGeometrieStable(page);
      const positions = (): Promise<Record<string, string>> =>
        moteur.evaluate((racine) => Object.fromEntries(
          [...racine.querySelectorAll<HTMLElement>('.tri-mots [data-element]')]
            .filter((mot) => mot.getAttribute('data-range') !== 'oui' && !mot.hasAttribute('disabled'))
            .map((mot) => {
              const b = mot.getBoundingClientRect();
              return [mot.getAttribute('data-element') ?? '?', `${String(Math.round(b.left))},${String(Math.round(b.top))}`];
            }),
        ));
      const sauts: string[] = [];
      for (let depot = 0; depot < 4; depot += 1) {
        const etat = await lireEtatDom(page);
        const attendu = etat.etapes?.[etat.indexEtape ?? 0]?.restantes[0];
        if (attendu === undefined || (await moteur.getAttribute('data-termine')) === 'oui') break;
        const avant = await positions();
        const jalon = jalonDom(etat);
        await jouerProchainGesteDom(page, 'tri', depot);
        await expect.poll(async () => jalonDom(await lireEtatDom(page))).not.toBe(jalon);
        await attendreGeometrieStable(page);
        const apres = await positions();
        for (const [mot, position] of Object.entries(apres)) {
          if (avant[mot] !== undefined && avant[mot] !== position) sauts.push(`dépôt ${String(depot + 1)} : ${mot} ${avant[mot]} → ${position}`);
        }
      }
      expect(sauts, `disposition ${String(await moteur.getAttribute('data-disposition'))}`).toEqual([]);
    });
  }
}

/**
 * Décision du parent, 12 oct. 2026 (tableau T22) : « j'aime bien les paniers en haut, avec les mots
 * en dessous […] c'est plus lisible par rapport à ce qui est demandé. » Pour TOUS les tri, quel
 * que soit le décor : chaque panier (son critère compris) est au-dessus de chaque mot à ranger.
 */
const TOUS_LES_TRI = noeudsLivres().filter((n) => n.moteur === 'tri').map((n) => n.id).sort();
for (const format of [{ width: 800, height: 1100 }, { width: 1280, height: 720 }, { width: 1920, height: 940 }] as const) {
  test(`tri ${String(format.width)}×${String(format.height)} — les paniers en haut, les mots en dessous`, async ({ page }) => {
    const ecarts: string[] = [];
    for (const noeud of TOUS_LES_TRI) {
      await page.setViewportSize(format);
      await preparer(page);
      await entrerDansLeNoeud(page, noeud);
      await attendreGeometrieStable(page);
      const r = await page.locator('[data-moteur="tri"]').evaluate((racine) => {
        const bas = Math.max(...[...racine.querySelectorAll('.tri-panneau')].map((p) => p.getBoundingClientRect().bottom));
        const haut = Math.min(...[...racine.querySelectorAll('.tri-mots [data-element]')].map((m) => m.getBoundingClientRect().top));
        return { bas: Math.round(bas), haut: Math.round(haut), disposition: racine.getAttribute('data-disposition') };
      });
      if (!(r.bas <= r.haut)) ecarts.push(`${noeud} (${String(r.disposition)}) : bas des paniers ${String(r.bas)} > haut des mots ${String(r.haut)}`);
    }
    expect(ecarts).toEqual([]);
  });
}

/**
 * Prendre un mot ne bouge rien. Un mot pris passe en gras (il s'élargit) : si la disposition se
 * recalcule alors, les paniers et les autres mots glissent au moment même où le doigt va vers
 * le panier — le dépôt tombe à côté. Mesuré le 12 oct. : 2 gestes tactiles sur 44 perdus ainsi
 * (`parcours-tactile-exhaustif`), 0 sur 66 avant le semis. Avec la grande police (27 px,
 * interligne 2), là où la place manque le plus.
 */
for (const format of [{ width: 800, height: 1100 }, { width: 1100, height: 700 }, { width: 640, height: 360 }] as const) {
  test(`tri ${String(format.width)}×${String(format.height)} — prendre un mot ne déplace ni les mots ni les paniers`, async ({ page }) => {
    const sauts: string[] = [];
    for (const noeud of TOUS_LES_TRI) {
      await page.setViewportSize(format);
      const prenom = `Prise-${noeud}`;
      await appliquerReglagesLectureReels(page, prenom);
      await entrerDansLeNoeud(page, noeud, prenom);
      const moteur = page.locator('[data-moteur="tri"]');
      await attendreGeometrieStable(page);
      const releve = (): Promise<Record<string, string>> =>
        moteur.evaluate((racine) => Object.fromEntries(
          [...racine.querySelectorAll<HTMLElement>('[data-porte-element], .tri-panneau')].map((n, i) => {
            // Relatif au cadre du jeu : un défilement de la page n'est pas un déplacement.
            const o = racine.querySelector('.tri-cadre')?.getBoundingClientRect() ?? racine.getBoundingClientRect();
            const r = n.getBoundingClientRect();
            const b = { left: r.left - o.left, top: r.top - o.top, width: r.width, height: r.height };
            const cle = n.getAttribute('data-porte-element') ?? n.querySelector('[data-receptacle]')?.getAttribute('data-receptacle') ?? String(i);
            return [cle, `${String(Math.round(b.left + b.width / 2))},${String(Math.round(b.top + b.height / 2))}`];
          }),
        ));
      const avant = await releve();
      const disposition = await moteur.getAttribute('data-disposition');
      const etat = await lireEtatDom(page);
      // Le premier mot MONTRÉ : un exercice dense se joue par vagues (contrat du socle § 12), et les
      // mots des vagues suivantes sont dans l'état sans être encore à l'écran.
      const montres = new Set(await moteur.locator('[data-element]').evaluateAll(
        (noeuds) => noeuds.map((n) => n.getAttribute('data-element')),
      ));
      const mot = etat.elements?.find((element) => montres.has(element.id))?.id;
      if (mot === undefined) continue;
      await toucherPrise(moteur.locator(`[data-element=${JSON.stringify(mot)}]`));
      await expect(moteur.locator(`[data-element=${JSON.stringify(mot)}]`)).toHaveAttribute('data-saisi', 'oui');
      await attendreGeometrieStable(page);
      const apres = await releve();
      const bouges = Object.keys(avant).filter((cle) => cle !== mot && apres[cle] !== avant[cle]);
      if (bouges.length > 0) sauts.push(`${noeud} (${String(disposition)} → ${String(await moteur.getAttribute('data-disposition'))}) : ${String(bouges.length)} bougent`);
    }
    expect(sauts).toEqual([]);
  });
}
