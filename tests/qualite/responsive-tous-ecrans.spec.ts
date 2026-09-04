/**
 * Garde responsive court : toutes les recettes, quatre cadres CSS, quatre cas Playwright.
 *
 * La recette R20 historique reste volontairement stricte sur la tablette paysage de référence.
 * Ici, le téléphone a le droit de défiler verticalement : ce qui est interdit est de perdre une
 * commande, de la rogner dans un ancêtre non défilable ou de faire déborder la page sur le côté.
 */
import { expect, test } from '../harnais-serveur.js';

import { recettesDEcrans } from '../e2e/qa-outils.js';

import type { Page } from '@playwright/test';

const FORMATS = [
  { nom: 'tablette portrait', largeur: 720, hauteur: 1017 },
  { nom: 'tablette paysage avec navigateur', largeur: 1017, hauteur: 640 },
  { nom: 'téléphone portrait', largeur: 360, hauteur: 640 },
  { nom: 'téléphone paysage', largeur: 640, hauteur: 360 },
] as const;

interface DefautResponsive {
  readonly ecran: string;
  readonly raison: string;
}

async function defautsDe(page: Page, ecran: string): Promise<DefautResponsive[]> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((image) => !image.complete)
        .map(async (image) => new Promise<void>((resoudre) => {
          image.addEventListener('load', () => resoudre(), { once: true });
          image.addEventListener('error', () => resoudre(), { once: true });
          if (image.complete) resoudre();
        })),
    );
    // Deux frames garantissent que le redimensionnement consécutif au décodage des images a
    // traversé style, layout et peinture. Ce n'est pas une attente chronométrée : la sonde
    // attend l'état du navigateur qu'elle est précisément venue mesurer.
    await new Promise<void>((resoudre) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resoudre()));
    });
  });
  return page.evaluate((nomEcran) => {
    const defauts: DefautResponsive[] = [];
    const racine = document.documentElement;
    if (racine.scrollWidth > racine.clientWidth + 1) {
      defauts.push({
        ecran: nomEcran,
        raison: `page plus large que le viewport (${String(racine.scrollWidth)} > ${String(racine.clientWidth)})`,
      });
    }

    const controles = [...document.querySelectorAll<HTMLElement>('button, [role="button"], a, input')];
    for (const controle of controles) {
      const style = getComputedStyle(controle);
      const masqueSemantiquement =
        controle.hidden ||
        controle.closest('[hidden], [aria-hidden="true"]') !== null ||
        style.display === 'none' ||
        style.visibility === 'hidden';
      if (masqueSemantiquement) continue;

      const nom = (controle.getAttribute('aria-label') ?? controle.textContent ?? controle.tagName)
        .trim()
        .replace(/\s+/gu, ' ')
        .slice(0, 55);
      const boite = controle.getBoundingClientRect();
      const estDansSvg = controle.namespaceURI === 'http://www.w3.org/2000/svg';
      if (boite.width < 1 || boite.height < 1) {
        defauts.push({ ecran: nomEcran, raison: `commande sans surface : « ${nom} »` });
        continue;
      }

      for (let parent = controle.parentElement; parent !== null; parent = parent.parentElement) {
        const styleParent = getComputedStyle(parent);
        const rogneX = styleParent.overflowX === 'hidden' || styleParent.overflowX === 'clip';
        const rogneY = styleParent.overflowY === 'hidden' || styleParent.overflowY === 'clip';
        if (!rogneX && !rogneY) continue;
        const cadre = parent.getBoundingClientRect();
        /* Une grande région SVG peut légitimement continuer hors du viewBox : sa partie visible
           reste une cible. Un bouton HTML, lui, doit être présenté en entier. */
        const rogne = estDansSvg
          ? (rogneX && (boite.right <= cadre.left + 1 || boite.left >= cadre.right - 1)) ||
            (rogneY && (boite.bottom <= cadre.top + 1 || boite.top >= cadre.bottom - 1))
          : (rogneX && (boite.left < cadre.left - 1 || boite.right > cadre.right + 1)) ||
            (rogneY && (boite.top < cadre.top - 1 || boite.bottom > cadre.bottom + 1));
        if (rogne) {
          defauts.push({
            ecran: nomEcran,
            raison: `commande rognée : « ${nom} » par ${parent.tagName.toLowerCase()}${parent.className === '' ? '' : `.${String(parent.className).replace(/\s+/gu, '.')}`} (${String(Math.round(boite.left))},${String(Math.round(boite.top))},${String(Math.round(boite.width))}×${String(Math.round(boite.height))} dans ${String(Math.round(cadre.left))},${String(Math.round(cadre.top))},${String(Math.round(cadre.width))}×${String(Math.round(cadre.height))})`,
          });
          break;
        }
      }
    }
    return defauts;
  }, ecran);
}

test.describe('responsive — aucune commande ne disparaît', () => {
  for (const format of FORMATS) {
    test(`${format.nom} — tous les écrans restent utilisables`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: format.largeur, height: format.hauteur });
      const defauts: DefautResponsive[] = [];
      for (const recette of recettesDEcrans()) {
        await recette.aller(page);
        await expect(page.locator(`[data-ecran="${recette.attendu}"]`)).toBeVisible();
        defauts.push(...(await defautsDe(page, recette.nom)));
      }
      expect(
        defauts,
        `${format.nom} (${String(format.largeur)}×${String(format.hauteur)} CSS) : défauts responsive`,
      ).toEqual([]);
    });
  }
});
