import type { Page } from '@playwright/test';
import { expect, test } from './invariants.js';
import { entrerDansLeNoeud, etatDuJeu, noeudsLivres, preparer } from './qa-outils.js';
import { lireEtatDom, toucherPrise } from './gestes-dom.js';

// Retour du parent du 9 oct. (tableau, E02) : le mot montré « a changé de place une seule fois ».
// Ce qui apparaît doit toujours apparaître au même endroit, d'une étape à l'autre.
// Retour suivant (E02) : une luciole se posait LÀ où le mot apparaît ; le mot passe au-dessus,
// mais la luciole, derrière, ne se touche plus. Aucune option ne recouvre la place du mot.
const NOEUDS_ECLAIR = noeudsLivres().filter((n) => n.moteur === 'eclair').map((n) => n.id).sort();

/** Les options visibles dont la boîte recoupe celle du mot montré (place réservée, même invisible). */
async function optionsSousLeMot(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const mot = document.querySelector('[data-plateau="eclair"]')?.getBoundingClientRect();
    if (mot === undefined) return [];
    return [...document.querySelectorAll<HTMLElement>('[data-option]')]
      .filter((o) => {
        const r = o.getBoundingClientRect();
        return r.width > 0 && Math.min(r.right, mot.right) - Math.max(r.left, mot.left) > 1 &&
          Math.min(r.bottom, mot.bottom) - Math.max(r.top, mot.top) > 1;
      })
      .map((o) => o.getAttribute('data-option') ?? '?');
  });
}

for (const noeud of NOEUDS_ECLAIR)
for (const [width, height] of [[1280, 720], [800, 1100], [1366, 768], [1920, 940], [1100, 700]] as const) {
  test(`éclair ${noeud} : le mot montré apparaît au même endroit, sans luciole dessous ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await preparer(page);
    await entrerDansLeNoeud(page, noeud);
    const racine = page.locator('[data-moteur="eclair"]');
    const flash = racine.locator('[data-plateau="eclair"]');
    const centres: string[] = [];
    const caches: string[] = [];
    const sousLeMot: string[] = [];
    const sansFond: string[] = [];
    // Borne de sécurité, jamais une attente.
    for (let tour = 0; tour < 20 && (await etatDuJeu(page)).ecran === 'noeud'; tour += 1) {
      const etat = await lireEtatDom(page);
      const attendu = etat.etapes?.[etat.indexEtape ?? 0]?.restantes[0];
      if (attendu === undefined) break;
      await toucherPrise(racine.locator('[data-action="pret"], [data-action="revoir"]'));
      await expect(flash).toHaveAttribute('data-visible', 'oui');
      // Retour du parent (E11) : le mot montré « n'a pas de fond derrière ». Il porte le fond jaune
      // des questions (T19), celui que le socle pose sur `data-theme-role="question"`.
      const fonds = await flash.evaluate(async (carte) => {
        // Les tests abrègent toute transition à 1 ms : on attend qu'elle soit finie (un état, pas une durée).
        await Promise.all(carte.getAnimations().map((a) => a.finished));
        const temoin = document.createElement('div');
        temoin.setAttribute('data-theme-role', 'question');
        document.body.append(temoin);
        const attendu = getComputedStyle(temoin).backgroundColor;
        temoin.remove();
        return { rendu: getComputedStyle(carte).backgroundColor, attendu };
      });
      if (fonds.rendu !== fonds.attendu) sansFond.push(`tour ${String(tour)} : ${fonds.rendu} au lieu de ${fonds.attendu}`);
      const boite = await flash.boundingBox();
      // Retour du parent : une luciole posée devant cachait le mot. Le mot montré est au-dessus de tout.
      const masque = await flash.locator('[data-lecture]').first().evaluate((mot) => {
        // Le mot ignore les touchers (`pointer-events: none`) : on le rend « touchable » le temps
        // de la mesure, pour que `elementFromPoint` dise ce qui est PEINT au-dessus.
        const porteurs = [mot.closest<HTMLElement>('[data-plateau="eclair"]'), mot.closest<HTMLElement>('[data-plateau="eclair"]')?.parentElement ?? null]
          .filter((e): e is HTMLElement => e !== null);
        const avant = porteurs.map((e) => e.style.pointerEvents);
        porteurs.forEach((e) => { e.style.pointerEvents = 'auto'; });
        const r = mot.getBoundingClientRect();
        const points = [[0.5, 0.5], [0.15, 0.3], [0.85, 0.3], [0.15, 0.7], [0.85, 0.7]] as const;
        const resultat = points.map(([px, py]) => document.elementFromPoint(r.left + r.width * px, r.top + r.height * py))
          .filter((e) => e === null || !e.closest('[data-plateau="eclair"]'))
          .map((e) => e === null ? 'rien' : (e.getAttribute('data-option') ?? e.className)).join(',');
        porteurs.forEach((e, i) => { e.style.pointerEvents = avant[i] ?? ''; });
        return resultat;
      });
      if (masque !== '') caches.push(`tour ${String(tour)} : ${masque}`);
      sousLeMot.push(...(await optionsSousLeMot(page)).map((o) => `tour ${String(tour)} : ${o}`));
      if (boite !== null) centres.push(`${Math.round(boite.x + boite.width / 2)},${Math.round(boite.y + boite.height / 2)}`);
      await expect(flash).toHaveAttribute('data-visible', 'non');
      await toucherPrise(racine.locator(`[data-option="${attendu}"]`));
    }
    expect(centres.length, 'plusieurs mots ont été montrés').toBeGreaterThan(1);
    expect(sousLeMot, 'aucune luciole n’est posée là où le mot apparaît').toEqual([]);
    expect(caches, 'le mot montré n’est caché par rien').toEqual([]);
    expect(sansFond, 'le mot montré porte le fond des questions').toEqual([]);
    expect(new Set(centres), `centres du mot montré : ${centres.join(' | ')}`).toEqual(new Set([centres[0]]));
  });
}
