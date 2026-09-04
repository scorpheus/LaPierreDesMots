/**
 * Garde responsive court : toutes les recettes, quatre cadres CSS, quatre cas Playwright.
 *
 * La recette R20 historique reste volontairement stricte sur la tablette paysage de référence.
 * Ici, le téléphone a le droit de défiler verticalement : ce qui est interdit est de perdre une
 * commande, de la rogner dans un ancêtre non défilable ou de faire déborder la page sur le côté.
 */
import { expect, test } from '../harnais-serveur.js';

import {
  entrerDansLeNoeud,
  moteursDeclares,
  noeudsLivres,
  preparer,
  recettesDEcrans,
} from '../e2e/qa-outils.js';

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

async function appliquerReglagesLectureReels(page: Page, prenom = 'Responsive'): Promise<void> {
  await preparer(page, prenom);
  const profilId = await page.locator('[data-profil]').first().getAttribute('data-profil');
  expect(profilId, 'le profil de la recette doit exposer son identifiant').not.toBeNull();
  const reponse = await page.request.put(`/api/profils/${profilId!}/reglages`, {
    data: {
      police: 'andika',
      corpsPx: 27,
      interlettrageEm: 0.06,
      espacementMotsEm: 0.08,
      interligne: 2,
      colorationSyllabique: false,
      surlignageLigneCourante: false,
      regleDeLecture: false,
      fond: 'parchemin',
    },
  });
  expect(reponse.ok(), 'les réglages réels de la capture doivent être appliqués').toBe(true);
}

/**
 * Un parcours qui ouvre 89 recettes prouve leur atteignabilité, pas leur composition. Chaque
 * moteur déclare donc ici ses pièces indispensables. L'inventaire est comparé à `CodeMoteur` :
 * ajouter un quinzième moteur sans lui donner de sonde fait échouer la QA au lieu de produire un
 * nouveau faux vert.
 */
const SONDES_PAR_MOTEUR: Readonly<Record<string, readonly string[]>> = {
  assemble: ['[data-plateau="blocs"]', '[data-plateau="mot"]'],
  attrape: ['[data-plateau="etape-attrape"]', '[data-plateau="cibles"]', '[data-plateau="controles"]'],
  chemin: ['[data-plateau="cases"]', '[data-message-chemin="oui"]'],
  chrono: ['[data-plateau="vignettes"]', '[data-plateau="histoire"]', '[data-fente]'],
  colorie: ['svg.pierre-scene', '.pierre-palette', '[data-cible-colorie]'],
  eclair: ['[data-plateau="etape-eclair"]', '[data-plateau="commande-eclair"]', '[data-plateau="options"]'],
  grave: ['[data-mot-central="oui"]', '[data-plateau="clavier"]'],
  histoire: ['[data-plateau="recit"]', '[data-plateau="etape-histoire"]', '[data-plateau="options"]'],
  libre: ['[data-plateau="nuancier"]', '[data-plateau="regions"]'],
  paires: ['[data-plateau="cartes"]'],
  phrase: ['[data-plateau="modele"]', '[data-plateau="etiquettes"]', '[data-plateau="phrase"]'],
  place: ['[data-plateau="etape-place"]', '[data-scene="place"]', '[data-zone-cible]', '[data-reserve="place"]'],
  trace: ['[data-plateau="cible-trace"]', '[data-scene="trace"]'],
  tri: ['[data-plateau="elements"]', '[data-plateau="receptacles"]'],
};

async function defautsDe(page: Page, ecran: string): Promise<DefautResponsive[]> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resoudre) => {
          image.addEventListener('load', () => resoudre(), { once: true });
          image.addEventListener('error', () => resoudre(), { once: true });
          if (image.complete) resoudre();
        });
      }
      if (image.naturalWidth > 0) await image.decode().catch(() => undefined);
    }));
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

    const ecranCourant = document.querySelector<HTMLElement>('[data-ecran]');
    if (ecranCourant !== null && ecranCourant.scrollWidth > ecranCourant.clientWidth + 1) {
      defauts.push({
        ecran: nomEcran,
        raison: `écran avec sous-scroll horizontal (${String(ecranCourant.scrollWidth)} > ${String(ecranCourant.clientWidth)})`,
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

    const sceneColorie = document.querySelector<SVGSVGElement>('[data-moteur="colorie"] > svg.pierre-scene');
    if (sceneColorie !== null && innerHeight <= 520) {
      const boite = sceneColorie.getBoundingClientRect();
      if (boite.height < 160 || boite.width < Math.min(200, innerWidth * 0.35)) {
        defauts.push({
          ecran: nomEcran,
          raison: `dessin de coloriage illisible en paysage court (${String(Math.round(boite.width))}×${String(Math.round(boite.height))} px)`,
        });
      }
    }

    const recompense = document.querySelector<HTMLElement>('[data-ecran="recompense"]');
    if (recompense !== null && (innerWidth <= 700 || innerHeight <= 700)) {
      const actionPrincipale = recompense.querySelector<HTMLElement>('.action-recompense--principale');
      const boite = actionPrincipale?.getBoundingClientRect();
      if (boite === undefined || boite.top < 0 || boite.bottom > innerHeight + 1) {
        defauts.push({
          ecran: nomEcran,
          raison: boite === undefined
            ? 'récompense sans action principale'
            : `action principale de récompense hors du premier écran (y=${String(Math.round(boite.top))}–${String(Math.round(boite.bottom))})`,
        });
      }
    }

    const enteteReglages = document.querySelector<HTMLElement>('[data-ecran="reglages-lecture"] .reglages-entete');
    if (enteteReglages !== null && (innerWidth <= 700 || innerHeight <= 700)) {
      const hauteurMaximale = innerWidth > innerHeight ? 90 : 150;
      if (enteteReglages.getBoundingClientRect().height > hauteurMaximale) {
        defauts.push({
          ecran: nomEcran,
          raison: `en-tête des réglages surdimensionné (${String(Math.round(enteteReglages.getBoundingClientRect().height))} px)`,
        });
      }
    }

    const chrono = document.querySelector<HTMLElement>('[data-moteur="chrono"]');
    if (chrono !== null) {
      const boite = (element: Element): DOMRect => element.getBoundingClientRect();
      const visibles = (selecteur: string): Element[] =>
        [...chrono.querySelectorAll(selecteur)].filter((element) => {
          const cadre = boite(element);
          return cadre.width > 0 && cadre.height > 0 && getComputedStyle(element).display !== 'none';
        });
      const intersection = (a: DOMRect, b: DOMRect): number =>
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const cartes = visibles('[data-vignette]');
      const fentes = visibles('[data-fente]');
      const cartouche = chrono.querySelector('[data-cartouche-chrono="etape"]');
      const recouvrements = [
        ...cartes.flatMap((carte) =>
          fentes.map((fente) => intersection(boite(carte), boite(fente))),
        ),
        ...(cartouche === null
          ? []
          : cartes.map((carte) => intersection(boite(cartouche), boite(carte)))),
      ].filter((surface) => surface > 1);
      if (recouvrements.length > 0) {
        defauts.push({
          ecran: nomEcran,
          raison: `${String(recouvrements.length)} recouvrement(s) entre repère, cartes et frise du récit`,
        });
      }
      const hauteurMaxFente = Math.max(0, ...fentes.map((fente) => boite(fente).height));
      if (hauteurMaxFente > 140) {
        defauts.push({
          ecran: nomEcran,
          raison: `frise du récit surdimensionnée (${String(Math.round(hauteurMaxFente))} px de haut)`,
        });
      }
      if (innerWidth <= 900 && innerWidth < innerHeight && cartes.length > 0) {
        const largeurMinCarte = Math.min(...cartes.map((carte) => boite(carte).width));
        const largeurAttendue = Math.min(480, boite(chrono).width - 48);
        if (largeurMinCarte < largeurAttendue) {
          defauts.push({
            ecran: nomEcran,
            raison: `phrase narrative tassée dans ${String(Math.round(largeurMinCarte))} px ` +
              `(minimum ${String(Math.round(largeurAttendue))} px en portrait)`,
          });
        }
      }
    }

    const tri = document.querySelector<HTMLElement>('[data-moteur="tri"]');
    if (tri !== null && innerWidth <= 900) {
      const mots = [...tri.querySelectorAll<HTMLElement>('[data-element][data-range="non"]')]
        .filter((mot) => {
          const cadre = mot.getBoundingClientRect();
          return cadre.width > 0 && cadre.height > 0;
        });
      const receptacles = [...tri.querySelectorAll<HTMLElement>('[data-receptacle]')];
      const intersection = (a: DOMRect, b: DOMRect): number =>
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const motsSuperposes = mots.flatMap((mot, index) =>
        mots.slice(index + 1).map((autre) =>
          intersection(mot.getBoundingClientRect(), autre.getBoundingClientRect()),
        ),
      ).filter((surface) => surface > 1);
      const motsSurReceptacle = mots.flatMap((mot) =>
        receptacles.map((receptacle) =>
          intersection(mot.getBoundingClientRect(), receptacle.getBoundingClientRect()),
        ),
      ).filter((surface) => surface > 1);
      const lignes: number[] = [];
      for (const mot of mots) {
        const y = mot.getBoundingClientRect().top;
        if (!lignes.some((haut) => Math.abs(haut - y) <= 8)) lignes.push(y);
      }
      const populationMaximale = Math.max(
        0,
        ...lignes.map((haut) =>
          mots.filter((mot) => Math.abs(mot.getBoundingClientRect().top - haut) <= 8).length,
        ),
      );
      if (motsSuperposes.length > 0 || motsSurReceptacle.length > 0) {
        defauts.push({
          ecran: nomEcran,
          raison: `${String(motsSuperposes.length)} mot(s) superposé(s), ` +
            `${String(motsSurReceptacle.length)} mot(s) posé(s) sur un panier`,
        });
      }
      if (populationMaximale > 4) {
        defauts.push({
          ecran: nomEcran,
          raison: `${String(populationMaximale)} mots tassés sur la même ligne de tri`,
        });
      }
    }

    const eclair = document.querySelector<HTMLElement>('[data-moteur="eclair"]');
    if (eclair !== null && innerWidth <= 900) {
      const barre = eclair.querySelector<HTMLElement>('.eclair-barre-superieure');
      const etape = eclair.querySelector<HTMLElement>('[data-plateau="etape-eclair"]');
      const commande = eclair.querySelector<HTMLElement>('[data-plateau="commande-eclair"]');
      const boiteBarre = barre?.getBoundingClientRect();
      const boiteEtape = etape?.getBoundingClientRect();
      const boiteCommande = commande?.getBoundingClientRect();
      if ((boiteBarre?.height ?? Number.POSITIVE_INFINITY) > 112) {
        defauts.push({
          ecran: nomEcran,
          raison: `barre du mot flash surdimensionnée (${String(Math.round(boiteBarre?.height ?? 0))} px)`,
        });
      }
      if (
        boiteEtape !== undefined &&
        boiteCommande !== undefined &&
        Math.min(boiteEtape.right, boiteCommande.right) - Math.max(boiteEtape.left, boiteCommande.left) > 1
      ) {
        defauts.push({ ecran: nomEcran, raison: 'repère et commande du mot flash se recouvrent' });
      }
    }
    return defauts;
  }, ecran);
}

test.describe('responsive — aucune commande ne disparaît', () => {
  /* Les recettes sont découpées en lots : le raccordement des grands décors raster a rendu le cas
     monolithique plus long que son délai, puis le test a accusé l'écran suivant sans même l'avoir
     ouvert. Chaque lot garde un navigateur et une limite propres. La série reste séquentielle pour
     ne pas affamer le serveur ; `RESPONSIVE_LOT=2` permet une itération courte sur un seul tiers. */
  test.describe.configure({ mode: 'serial' });

  const tailleLot = 30;
  const filtreLot = Number.parseInt(process.env.RESPONSIVE_LOT ?? '', 10);
  const lots = Array.from(
    { length: Math.ceil(recettesDEcrans().length / tailleLot) },
    (_, index) => ({
      numero: index + 1,
      recettes: recettesDEcrans().slice(index * tailleLot, (index + 1) * tailleLot),
    }),
  ).filter((lot) => !Number.isFinite(filtreLot) || filtreLot === lot.numero);

  for (const format of FORMATS) {
    lots.forEach((lot) => {
      test(`${format.nom} — écrans du lot ${String(lot.numero)} restent utilisables`, async ({ page }) => {
        test.setTimeout(150_000);
        await page.setViewportSize({ width: format.largeur, height: format.hauteur });
        const defauts: DefautResponsive[] = [];
        for (const recette of lot.recettes) {
          await recette.aller(page);
          await expect(page.locator(`[data-ecran="${recette.attendu}"]`)).toBeVisible();
          defauts.push(...(await defautsDe(page, recette.nom)));
        }
        expect(
          defauts,
          `${format.nom} (${String(format.largeur)}×${String(format.hauteur)} CSS), lot ${String(lot.numero)} : défauts responsive`,
        ).toEqual([]);
      });
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
            campement: ecran === 'campement' ? (() => {
              const scene = document.querySelector<HTMLElement>('[data-scene="campement"]');
              const grille = document.querySelector<HTMLElement>('[data-campement-grille="oui"]');
              const boite = scene?.getBoundingClientRect();
              return {
                largeurScene: boite?.width ?? 0,
                basScene: boite?.bottom ?? 0,
                rapportScene: boite === undefined || boite.height === 0 ? 0 : boite.width / boite.height,
                debordementHorizontal:
                  grille === null ? 0 : Math.max(0, grille.scrollWidth - grille.clientWidth),
              };
            })() : null,
            carte: ecran === 'carte' ? (() => {
              const scene = document.querySelector<HTMLElement>('[data-scene-adaptative="carte"]');
              const destinations = document.querySelector<HTMLElement>('.destinations-carte');
              const titreDestinations = destinations?.querySelector<HTMLElement>('h2');
              const boiteScene = scene?.getBoundingClientRect();
              const boiteDestinations = destinations?.getBoundingClientRect();
              const hauteursDeparts = [...(destinations?.querySelectorAll<HTMLElement>('[data-depart]') ?? [])]
                .map((depart) => depart.getBoundingClientRect().height);
              return {
                partCarte: (boiteScene?.width ?? 0) / innerWidth,
                sousScroll: destinations === null
                  ? 0
                  : Math.max(0, destinations.scrollHeight - destinations.clientHeight),
                corpsTitre: titreDestinations === null
                  ? 0
                  : Number.parseFloat(getComputedStyle(titreDestinations).fontSize),
                espaceAvantDestinations:
                  boiteScene === undefined || boiteDestinations === undefined
                    ? 0
                    : Math.max(0, boiteDestinations.top - boiteScene.bottom),
                plusGrandDepart: Math.max(0, ...hauteursDeparts),
              };
            })() : null,
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

        if (mesure.campement !== null) {
          expect(
            mesure.campement.debordementHorizontal,
            `${recette.nom} : le campement ne doit pas devenir un panorama à faire défiler`,
          ).toBe(0);
          expect(
            mesure.campement.largeurScene,
            `${recette.nom} : la scène entière doit tenir dans le viewport`,
          ).toBeLessThanOrEqual(format.largeur);
          expect(
            mesure.campement.rapportScene,
            `${recette.nom} : la scène et ses zones tactiles doivent garder le rapport du PNG`,
          ).toBeCloseTo(1586 / 992, 2);
          if (format.largeur > format.hauteur && format.hauteur <= 520) {
            expect(
              mesure.campement.basScene,
              `${recette.nom} : le campement entier doit rester visible en paysage court`,
            ).toBeLessThanOrEqual(format.hauteur + 1);
          }
        }

        if (mesure.carte !== null) {
          expect(
            mesure.carte.sousScroll,
            `${recette.nom} : les destinations ne doivent pas capturer le scroll de la page`,
          ).toBe(0);
          if (format.largeur > format.hauteur) {
            expect(
              mesure.carte.partCarte,
              `${recette.nom} : la carte doit rester le héros en paysage`,
            ).toBeGreaterThanOrEqual(0.5);
          }
          expect(
            mesure.carte.corpsTitre,
            `${recette.nom} : « Où veux-tu aller ? » ne doit pas dominer la carte`,
          ).toBeLessThanOrEqual(compact ? 20 : 28);
          expect(
            mesure.carte.espaceAvantDestinations,
            `${recette.nom} : aucun grand vide ne doit séparer la carte de ses destinations`,
          ).toBeLessThanOrEqual(32);
          if (format.largeur > format.hauteur && format.hauteur <= 520) {
            expect(
              mesure.carte.plusGrandDepart,
              `${recette.nom} : un départ ne doit pas devenir un panneau géant en paysage court`,
            ).toBeLessThanOrEqual(80);
          }
        }
      }
    });
  }
});

test.describe('responsive — chacun des moteurs a une sonde de composition sur la tablette réelle', () => {
  const moteurs = moteursDeclares();
  const noeudParMoteur = new Map<string, string>();
  for (const noeud of noeudsLivres()) {
    if (!noeudParMoteur.has(noeud.moteur)) noeudParMoteur.set(noeud.moteur, noeud.id);
  }

  test('l’inventaire des sondes est exactement celui de CodeMoteur', () => {
    expect(Object.keys(SONDES_PAR_MOTEUR).sort()).toEqual([...moteurs].sort());
    expect([...noeudParMoteur.keys()].sort(), 'chaque moteur déclaré doit avoir un nœud jouable').toEqual(
      [...moteurs].sort(),
    );
  });

  for (const moteur of moteurs) {
    test(`${moteur} — ses plateaux structurants restent visibles avec le profil enfant`, async ({ page }) => {
      const noeud = noeudParMoteur.get(moteur);
      const sondes = SONDES_PAR_MOTEUR[moteur];
      if (noeud === undefined || sondes === undefined) {
        throw new Error(`Sonde responsive incomplète pour le moteur « ${moteur} ».`);
      }
      const prenom = `Responsive-${moteur}`;
      await page.setViewportSize({ width: 800, height: 1100 });
      await appliquerReglagesLectureReels(page, prenom);
      await entrerDansLeNoeud(page, noeud, prenom);
      await expect(page.locator(`[data-moteur="${moteur}"]`)).toBeVisible();

      const defauts = await defautsDe(page, `${noeud} (${moteur}, profil enfant)`);
      expect(defauts, 'aucune commande ne doit être coupée, masquée ou rejetée hors écran').toEqual([]);

      const mesures = await page.locator(`[data-moteur="${moteur}"]`).evaluate((racine, selecteurs) => {
        const cadreRacine = racine.getBoundingClientRect();
        return selecteurs.map((selecteur) => {
          const candidats = [...racine.querySelectorAll<HTMLElement>(selecteur)];
          const visibles = candidats.filter((element) => {
            const style = getComputedStyle(element);
            const cadre = element.getBoundingClientRect();
            return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden' &&
              cadre.width > 1 && cadre.height > 1;
          });
          const horsLargeur = visibles.filter((element) => {
            const cadre = element.getBoundingClientRect();
            return cadre.left < cadreRacine.left - 1 || cadre.right > cadreRacine.right + 1;
          }).length;
          return { selecteur, trouves: candidats.length, visibles: visibles.length, horsLargeur };
        });
      }, sondes);

      expect(
        mesures.filter((mesure) => mesure.trouves === 0),
        'chaque pièce déclarée par la sonde doit exister dans le moteur',
      ).toEqual([]);
      expect(
        mesures.filter((mesure) => mesure.visibles === 0),
        'chaque pièce structurante doit avoir au moins une occurrence visible au premier écran',
      ).toEqual([]);
      expect(
        mesures.filter((mesure) => mesure.horsLargeur > 0),
        'aucun plateau structurant ne doit déborder latéralement de son moteur',
      ).toEqual([]);
    });
  }
});

test('photo tablette — le coloriage de la maîtresse garde le dessin comme zone principale', async ({ page }) => {
  const prenom = 'Photo-Maitresse-Colorie';
  await page.setViewportSize({ width: 800, height: 1100 });
  await appliquerReglagesLectureReels(page, prenom);
  await entrerDansLeNoeud(page, 'clairiere-01', prenom);
  const moteur = page.locator('[data-moteur="colorie"]');
  await expect(moteur).toBeVisible();
  expect(await defautsDe(page, 'clairiere-01, coloriage de la maîtresse')).toEqual([]);

  const mesure = await moteur.evaluate((racine) => {
    const scene = racine.querySelector<SVGSVGElement>('svg.pierre-scene');
    const palette = racine.querySelector<HTMLElement>('.pierre-palette');
    const cible = racine.querySelector<SVGGraphicsElement>('[data-region-svg][data-active="oui"]');
    const boiteRacine = racine.getBoundingClientRect();
    const boiteScene = scene?.getBoundingClientRect();
    const boitePalette = palette?.getBoundingClientRect();
    const boiteCible = cible?.getBoundingClientRect();
    return {
      largeurRacine: boiteRacine.width,
      largeurScene: boiteScene?.width ?? 0,
      hauteurScene: boiteScene?.height ?? 0,
      hauteurPalette: boitePalette?.height ?? Number.POSITIVE_INFINITY,
      paletteSousScene: boiteScene !== undefined && boitePalette !== undefined &&
        boitePalette.top >= boiteScene.bottom - 1,
      cibleVisible: boiteCible !== undefined && boiteCible.width >= 44 && boiteCible.height >= 44 &&
        boiteScene !== undefined && boiteCible.left >= boiteScene.left - 1 && boiteCible.right <= boiteScene.right + 1 &&
        boiteCible.top >= boiteScene.top - 1 && boiteCible.bottom <= boiteScene.bottom + 1,
    };
  });

  if (process.env['PIERRE_CAPTURE_RESPONSIVE'] === '1') {
    await page.screenshot({
      path: 'bac-a-sable/colorie-maitresse-tablette.png',
      fullPage: false,
      scale: 'css',
    });
  }

  expect(mesure.largeurScene, 'le décor de l’école doit occuper la largeur utile').toBeGreaterThanOrEqual(
    mesure.largeurRacine * 0.82,
  );
  expect(mesure.hauteurScene, 'la maîtresse et les zones à peindre doivent rester identifiables').toBeGreaterThanOrEqual(340);
  expect(mesure.hauteurPalette, 'la palette ne doit pas repousser le dessin hors de l’écran').toBeLessThanOrEqual(250);
  expect(mesure.paletteSousScene, 'la palette et le dessin doivent rester disjoints').toBe(true);
  expect(mesure.cibleVisible, 'la cible active doit conserver une vraie surface dans le décor').toBe(true);
});

test('photo tablette — le placement sur l’école garde scène, cible et réserve lisibles', async ({ page }) => {
  const prenom = 'Photo-Maitresse-Place';
  await page.setViewportSize({ width: 800, height: 1100 });
  await appliquerReglagesLectureReels(page, prenom);
  await entrerDansLeNoeud(page, 'clairiere-04', prenom);
  const moteur = page.locator('[data-moteur="place"]');
  await expect(moteur).toBeVisible();
  expect(await defautsDe(page, 'clairiere-04, placement sur l’école')).toEqual([]);

  const mesure = await moteur.evaluate((racine) => {
    const scene = racine.querySelector<SVGSVGElement>('[data-scene="place"]');
    const etape = racine.querySelector<HTMLElement>('[data-plateau="etape-place"]');
    const reserve = racine.querySelector<HTMLElement>('[data-reserve="place"]');
    const cible = racine.querySelector<SVGGraphicsElement>('[data-zone-cible]');
    const boiteRacine = racine.getBoundingClientRect();
    const boiteScene = scene?.getBoundingClientRect();
    const boiteEtape = etape?.getBoundingClientRect();
    const boiteReserve = reserve?.getBoundingClientRect();
    const boiteCible = cible?.getBoundingClientRect();
    return {
      largeurRacine: boiteRacine.width,
      largeurScene: boiteScene?.width ?? 0,
      hauteurScene: boiteScene?.height ?? 0,
      hauteurEtape: boiteEtape?.height ?? Number.POSITIVE_INFINITY,
      reserveSousScene: boiteScene !== undefined && boiteReserve !== undefined &&
        boiteReserve.top >= boiteScene.bottom - 1,
      cibleVisible: boiteCible !== undefined && boiteCible.width >= 44 && boiteCible.height >= 44 &&
        boiteScene !== undefined && boiteCible.left >= boiteScene.left - 1 && boiteCible.right <= boiteScene.right + 1 &&
        boiteCible.top >= boiteScene.top - 1 && boiteCible.bottom <= boiteScene.bottom + 1,
    };
  });

  if (process.env['PIERRE_CAPTURE_RESPONSIVE'] === '1') {
    await page.screenshot({
      path: 'bac-a-sable/place-maitresse-tablette.png',
      fullPage: false,
      scale: 'css',
    });
  }

  expect(mesure.largeurScene, 'l’école doit rester le plateau principal').toBeGreaterThanOrEqual(
    mesure.largeurRacine * 0.82,
  );
  expect(mesure.hauteurScene, 'les trois zones de placement doivent rester reconnaissables').toBeGreaterThanOrEqual(340);
  expect(mesure.hauteurEtape, 'le rappel d’étape ne doit pas devenir une bulle géante').toBeLessThanOrEqual(112);
  expect(mesure.reserveSousScene, 'la réserve ne doit pas recouvrir le décor').toBe(true);
  expect(mesure.cibleVisible, 'la première zone de placement doit rester une vraie cible').toBe(true);
});

test('photo tablette — le récit à remettre en ordre garde trois zones lisibles et disjointes', async ({
  page,
}) => {
  /* Reproduction du 4 septembre : Galaxy Tab en portrait, barres du navigateur déjà retirées,
     et réglages de lecture réellement enregistrés pour l'enfant. La matrice générale passait
     parce qu'elle ne croisait que le corps par défaut avec des critères d'atteignabilité. */
  await page.setViewportSize({ width: 720, height: 1017 });
  const prenom = 'Photo-Chrono';
  await appliquerReglagesLectureReels(page, prenom);
  await entrerDansLeNoeud(page, 'galeries-09', prenom);
  await expect(page.locator('[data-moteur="chrono"]')).toBeVisible();
  await defautsDe(page, 'galeries-09');

  const mesure = await page.locator('[data-moteur="chrono"]').evaluate((racine) => {
    const boite = (element: Element): DOMRect => element.getBoundingClientRect();
    const visibles = (selecteur: string): Element[] =>
      [...racine.querySelectorAll(selecteur)].filter((element) => {
        const cadre = boite(element);
        return cadre.width > 0 && cadre.height > 0 && getComputedStyle(element).display !== 'none';
      });
    const intersection = (a: DOMRect, b: DOMRect): number =>
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

    const cartes = visibles('[data-vignette]');
    const fentes = visibles('[data-fente]');
    const cartouche = racine.querySelector('[data-cartouche-chrono="etape"]');
    const recouvrements = [
      ...cartes.flatMap((carte) =>
        fentes.map((fente) => intersection(boite(carte), boite(fente))),
      ),
      ...(cartouche === null
        ? []
        : cartes.map((carte) => intersection(boite(cartouche), boite(carte)))),
    ].filter((surface) => surface > 1);
    const cadreRacine = boite(racine);
    return {
      nbCartes: cartes.length,
      nbFentes: fentes.length,
      largeurRacine: Math.round(cadreRacine.width),
      largeurMinCarte: Math.round(Math.min(...cartes.map((carte) => boite(carte).width))),
      hauteurMaxFente: Math.round(Math.max(...fentes.map((fente) => boite(fente).height))),
      recouvrements,
    };
  });

  if (process.env['PIERRE_CAPTURE_RESPONSIVE'] === '1') {
    await page.screenshot({
      path: 'bac-a-sable/chrono-tablette-portrait-apres.png',
      fullPage: false,
      scale: 'css',
    });
  }

  expect(mesure.nbCartes, 'les trois images du triplet doivent être visibles').toBe(3);
  expect(mesure.nbFentes, 'les trois places de l’histoire doivent être visibles').toBe(3);
  expect(
    mesure.largeurMinCarte,
    `à ${String(mesure.largeurRacine)} px, une phrase narrative ne doit pas être tassée dans un tiers de l'écran`,
  ).toBeGreaterThanOrEqual(Math.min(480, mesure.largeurRacine - 48));
  expect(
    mesure.hauteurMaxFente,
    'une place vide doit annoncer un rang, pas réserver la hauteur d’une carte illustrée entière',
  ).toBeLessThanOrEqual(140);
  expect(mesure.recouvrements, 'cartouche, cartes et places doivent rester disjoints').toEqual([]);
});

test('photo tablette — le tri ne tasse pas six mots sur une seule ligne', async ({ page }) => {
  /* La capture réelle fait 800 px de large : elle se trouve précisément entre le téléphone de
     la matrice (720 px) et le paysage (1 017 px). À cette largeur, six mots en corps 27 entraient
     de force sur une rangée et plusieurs cibles des lots suivants finissaient masquées. */
  await page.setViewportSize({ width: 800, height: 1100 });
  const prenom = 'Photo-Tri';
  await appliquerReglagesLectureReels(page, prenom);
  await entrerDansLeNoeud(page, 'galeries-13', prenom);
  const moteur = page.locator('[data-moteur="tri"]');
  await expect(moteur).toBeVisible();
  await defautsDe(page, 'galeries-13');

  const mesure = await moteur.evaluate((racine) => {
    const mots = [...racine.querySelectorAll<HTMLElement>('[data-element][data-range="non"]')]
      .filter((mot) => {
        const boite = mot.getBoundingClientRect();
        return boite.width > 0 && boite.height > 0;
      });
    const lignes: number[] = [];
    for (const mot of mots) {
      const y = mot.getBoundingClientRect().top;
      const ligne = lignes.findIndex((haut) => Math.abs(haut - y) <= 8);
      if (ligne < 0) lignes.push(y);
    }
    const populationParLigne = lignes.map((haut) =>
      mots.filter((mot) => Math.abs(mot.getBoundingClientRect().top - haut) <= 8).length,
    );
    const boiteRacine = racine.getBoundingClientRect();
    const motsMasques = mots.filter((mot) => {
      const boite = mot.getBoundingClientRect();
      const x = Math.min(innerWidth - 1, Math.max(0, boite.left + boite.width / 2));
      const y = Math.min(innerHeight - 1, Math.max(0, boite.top + boite.height / 2));
      const dessus = document.elementFromPoint(x, y);
      return (
        boite.left < boiteRacine.left - 1 ||
        boite.right > boiteRacine.right + 1 ||
        dessus === null ||
        (dessus !== mot && !mot.contains(dessus))
      );
    });
    return {
      nbMots: mots.length,
      populationMaximale: Math.max(0, ...populationParLigne),
      motsMasques: motsMasques.map((mot) => mot.getAttribute('data-element')),
    };
  });

  if (process.env['PIERRE_CAPTURE_RESPONSIVE'] === '1') {
    await page.screenshot({
      path: 'bac-a-sable/tri-tablette-portrait-apres.png',
      fullPage: false,
      scale: 'css',
    });
  }

  expect(mesure.nbMots, 'le plateau doit garder tous les mots encore disponibles').toBeGreaterThan(0);
  expect(
    mesure.populationMaximale,
    'à 800 px avec la grande police, une ligne ne doit pas devenir un ruban de six mots',
  ).toBeLessThanOrEqual(4);
  expect(mesure.motsMasques, 'chaque mot doit rester réellement atteignable au doigt').toEqual([]);
});

test('photo tablette — la commande de lecture ne masque pas le décor', async ({ page }) => {
  /* Deuxième capture réelle : le statut héritait du corps 27 ET de l'interligne 2. À 800 px,
     le point de rupture compact ne s'activait pas et quatre mots devenaient cinq lignes. */
  await page.setViewportSize({ width: 800, height: 1100 });
  const prenom = 'Photo-Eclair';
  await appliquerReglagesLectureReels(page, prenom);
  await entrerDansLeNoeud(page, 'galeries-14', prenom);
  const moteur = page.locator('[data-moteur="eclair"]');
  await expect(moteur).toBeVisible();
  await defautsDe(page, 'galeries-14');

  const mesure = await moteur.evaluate((racine) => {
    const barre = racine.querySelector<HTMLElement>('.eclair-barre-superieure');
    const etape = racine.querySelector<HTMLElement>('[data-plateau="etape-eclair"]');
    const commande = racine.querySelector<HTMLElement>('[data-plateau="commande-eclair"]');
    const boiteRacine = racine.getBoundingClientRect();
    const boiteBarre = barre?.getBoundingClientRect();
    const boiteEtape = etape?.getBoundingClientRect();
    const boiteCommande = commande?.getBoundingClientRect();
    return {
      hauteurRacine: boiteRacine.height,
      hauteurBarre: boiteBarre?.height ?? Number.POSITIVE_INFINITY,
      hauteurEtape: boiteEtape?.height ?? Number.POSITIVE_INFINITY,
      recouvrementHorizontal:
        boiteEtape === undefined || boiteCommande === undefined
          ? Number.POSITIVE_INFINITY
          : Math.max(0, Math.min(boiteEtape.right, boiteCommande.right) - Math.max(boiteEtape.left, boiteCommande.left)),
    };
  });

  if (process.env['PIERRE_CAPTURE_RESPONSIVE'] === '1') {
    await page.screenshot({
      path: 'bac-a-sable/eclair-tablette-portrait-apres.png',
      fullPage: false,
      scale: 'css',
    });
  }

  expect(
    mesure.hauteurBarre,
    `le statut et la commande ne doivent pas couvrir ${String(Math.round(mesure.hauteurBarre))} px du décor`,
  ).toBeLessThanOrEqual(112);
  expect(mesure.hauteurEtape, 'le repère d’étape doit rester une information compacte').toBeLessThanOrEqual(96);
  expect(mesure.recouvrementHorizontal, 'statut et commande doivent rester disjoints').toBe(0);
});

test('tablette paysage — le coffre confie le défilement à son écran, pas à ses collections', async ({ page }) => {
  const recette = recettesDEcrans().find((candidate) => candidate.attendu === 'coffre');
  if (recette === undefined) throw new Error('Recette du coffre absente');

  await page.setViewportSize({ width: 1017, height: 640 });
  await recette.aller(page);
  await expect(page.locator('[data-ecran="coffre"]')).toBeVisible();

  const sousScrolls = await page.locator('.collections-coffre, .collection-coffre').evaluateAll(
    (elements) => elements.map((element) => {
      const noeud = element as HTMLElement;
      return Math.max(0, noeud.scrollHeight - noeud.clientHeight);
    }),
  );
  expect(Math.max(0, ...sousScrolls)).toBe(0);
});
