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

/* Une matrice courte autour des dimensions usuelles ET des seuils CSS. Les deux valeurs 899/901
   empêchent notamment qu'un correctif ne fonctionne qu'exactement sur les quatre captures de la
   campagne générale. Ces formats ne rejouent que les trois écrans de coque. */
const FORMATS_COQUE = [
  { nom: 'petit téléphone portrait', largeur: 320, hauteur: 568 },
  { nom: 'téléphone portrait étroit', largeur: 360, hauteur: 640 },
  { nom: 'téléphone portrait courant', largeur: 390, hauteur: 844 },
  { nom: 'téléphone portrait large', largeur: 412, hauteur: 915 },
  { nom: 'petit téléphone paysage', largeur: 568, hauteur: 320 },
  { nom: 'téléphone paysage étroit', largeur: 640, hauteur: 360 },
  { nom: 'téléphone paysage courant', largeur: 844, hauteur: 390 },
  { nom: 'téléphone paysage large', largeur: 915, hauteur: 412 },
  { nom: 'juste sous le seuil compact', largeur: 899, hauteur: 700 },
  { nom: 'juste au-dessus du seuil compact', largeur: 901, hauteur: 700 },
  { nom: 'fenêtre PC réduite', largeur: 800, hauteur: 600 },
  { nom: 'bureau plein écran', largeur: 1920, hauteur: 1080 },
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
  /* Chaque cas traverse les 89 écrans. Les quatre lancer en parallèle après les campagnes axe et
     latence peut affamer un seul serveur jusqu'au délai de 240 s, alors qu'ils terminent ensemble
     en moins d'une minute à froid. En série, chaque mesure dispose du navigateur qu'elle juge et
     le résultat ne dépend plus de la contention laissée par la phase précédente. */
  test.describe.configure({ mode: 'serial' });

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

test.describe('responsive — la coque ne garde pas les proportions tablette sur téléphone', () => {
  const recettesCoque = recettesDEcrans().filter((recette) =>
    ['profils', 'carte', 'campement'].includes(recette.attendu),
  );

  for (const format of FORMATS_COQUE) {
    test(`${format.nom} — navigation compacte et texte proportionné`, async ({ page }) => {
      await page.setViewportSize({ width: format.largeur, height: format.hauteur });
      for (const recette of recettesCoque) {
        await recette.aller(page);
        await expect(page.locator(`[data-ecran="${recette.attendu}"]`)).toBeVisible();
        await defautsDe(page, recette.nom);

        const mesure = await page.evaluate((ecran) => {
          const selecteurEntete =
            ecran === 'profils' ? '.entete-profils' :
            ecran === 'carte' ? '.entete-carte' : '.campement-entete';
          const entete = document.querySelector<HTMLElement>(selecteurEntete);
          const tailles = [...(entete?.querySelectorAll<HTMLElement>('button, h1') ?? [])]
            .map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
          return {
            hauteurEntete: entete?.getBoundingClientRect().height ?? 0,
            plusGrandePolice: Math.max(0, ...tailles),
          };
        }, recette.attendu);

        const compact = format.largeur <= 900 || format.hauteur <= 520;
        const hauteurMaximale = compact
          ? recette.attendu === 'campement' ? 125 : recette.attendu === 'profils' ? 110 : 82
          : recette.attendu === 'campement' ? 205 : recette.attendu === 'profils' ? 150 : 105;
        expect(
          mesure.hauteurEntete,
          `${recette.nom} : l’en-tête occupe trop de hauteur sur ${format.nom}`,
        ).toBeLessThanOrEqual(hauteurMaximale);
        expect(
          mesure.plusGrandePolice,
          `${recette.nom} : la typographie de navigation reste dimensionnée pour une tablette`,
        ).toBeLessThanOrEqual(compact ? 32 : 68);
      }
    });
  }
});
