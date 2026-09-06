// Ces noms ne sont employés que dans les fonctions exécutées par le navigateur.
/* global document, Image, DOMPoint */
import { expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export async function lireProgressionPwa(page, moduleUrl, prenom) {
  return page.evaluate(async ({ moduleUrl, prenom }) => {
    const base = await (await import(moduleUrl)).ouvrirBaseNavigateur();
    const profil = await base.uneLigne('SELECT id FROM profils WHERE prenom = ?', [prenom]);
    return {
      tentatives: await base.lignes('SELECT * FROM tentatives WHERE profil_id = ? ORDER BY id', [profil.id]),
      progression: await base.lignes('SELECT * FROM progression_region WHERE profil_id = ? ORDER BY region_code', [profil.id]),
    };
  }, { moduleUrl, prenom });
}

/** Le JSON sert d'oracle de lecture seulement : aucune réponse ni tentative n'est injectée. */
export async function jouerUnExercicePwa(page, moduleUrl, prenom, options) {
  await page.waitForFunction(() => ['carte', 'ouverture', 'campement'].includes(document.querySelector('[data-ecran]')?.getAttribute('data-ecran')));
  if (await page.locator('[data-ecran="ouverture"]').count()) await page.locator('[data-passer="ouverture"]').click();
  if (await page.locator('[data-ecran="campement"]').count()) await page.locator('[data-vers="carte"]').click();
  await expect(page.locator('[data-ecran="carte"]')).toBeVisible();
  await page.locator('[data-depart="clairiere"]').click();
  await page.locator('[data-confirmer-depart]').click();
  return jouerExerciceEnCoursPwa(page, moduleUrl, prenom, options);
}

export async function jouerExerciceEnCoursPwa(page, moduleUrl, prenom, {
  lireProgression = lireProgressionPwa,
  toucher = (prise) => prise.tap(),
  toucherPoint = (point) => page.touchscreen.tap(point.x, point.y),
} = {}) {
  await expect(page.locator('[data-ecran="noeud"] [data-moteur]')).toBeVisible();
  const moteur = await page.locator('[data-moteur]').getAttribute('data-moteur');
  if (moteur === 'place' || moteur === 'colorie') {
    // Le moteur de repli apparaît avant le fetch du vrai décor : l'existence du moteur
    // ne permet pas encore de juger les images internes du SVG.
    await expect(page.locator('[data-moteur] svg image[data-fond-illustre]')).toHaveCount(1);
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
    await Promise.all([...document.querySelectorAll('[data-moteur] image')].map((image) => {
      const sonde = new Image();
      sonde.src = image.getAttribute('href') ?? image.getAttribute('xlink:href');
      return sonde.decode();
    }));
  });
  const id = await page.locator('[data-ecran="noeud"]').getAttribute('data-noeud');
  const exercice = readdirSync('contenu/exercices', { recursive: true }).filter((fichier) => fichier.endsWith('.json'))
    .map((fichier) => JSON.parse(readFileSync(join('contenu/exercices', fichier), 'utf8'))).find((exercice) => exercice.jeu.noeud === id);
  expect(['colorie', 'place', 'tri'], 'le pilote de recette sait jouer le premier moteur réellement proposé').toContain(exercice?.jeu.moteur);
  const avant = await lireProgression(page, moduleUrl, prenom);
  if (exercice.jeu.moteur === 'tri') {
    for (const element of [...exercice.jeu.contenu.elements].reverse()) {
      await toucher(page.locator(`[data-moteur="tri"] [data-element=${JSON.stringify(element.id)}]`));
      await toucher(page.locator(`[data-moteur="tri"] [data-receptacle=${JSON.stringify(element.receptacleAttendu)}]`));
    }
  } else if (exercice.jeu.moteur === 'place') {
    for (const consigne of exercice.jeu.contenu.consignes) for (const cible of consigne.depots) {
      await toucher(page.locator(`[data-reserve="place"] [data-element=${JSON.stringify(cible.element)}]`));
      const zone = page.locator(`[data-zone-cible=${JSON.stringify(cible.zone)}]`);
      await toucher(zone);
    }
  } else for (const consigne of exercice.jeu.contenu.consignes) for (const cible of consigne.cibles) {
    await toucher(page.locator(`[data-godet=${JSON.stringify(cible.couleur)}]`));
    const forme = page.locator(`path[data-region-source=${JSON.stringify(cible.region)}][data-active="oui"]`);
    await forme.scrollIntoViewIfNeeded();
    const point = await forme.evaluate((element) => {
      const b = element.getBBox();
      const m = element.getScreenCTM();
      const points = [];
      for (let y = 0; y < 41; y++) for (let x = 0; x < 41; x++) {
        const local = new DOMPoint(b.x + b.width * (x + .5) / 41, b.y + b.height * (y + .5) / 41);
        if (!element.isPointInFill(local)) continue;
        const p = local.matrixTransform(m);
        if (document.elementFromPoint(p.x, p.y) === element) points.push({ x: p.x, y: p.y, distance: Math.hypot(x - 20, y - 20) });
      }
      return points.sort((a, b) => a.distance - b.distance)[0];
    });
    expect(point, 'un pixel du dessin reçoit le vrai doigt').toBeDefined();
    await toucherPoint(point);
  }
  await expect(page.locator('[data-ecran="recompense"]')).toBeVisible();
  await expect.poll(async () => (await lireProgression(page, moduleUrl, prenom)).tentatives.length).toBeGreaterThan(avant.tentatives.length);
  return { noeud: id, ...(await lireProgression(page, moduleUrl, prenom)) };
}
