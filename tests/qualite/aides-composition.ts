import type { Locator, Page } from '@playwright/test';

export interface DefautDeComposition {
  readonly cible: string;
  readonly raison: string;
}

const SELECTEUR_PRISE = [
  'button',
  '[role="button"]',
  '[role="application"]',
  '[data-cible-frappe="oui"]',
  // Les chemins coloriables sont la prise réellement sous le doigt. Le cercle transparent
  // voisin est volontairement clavier seul : il ne doit jamais rendre ce contrôle aveugle.
  '[data-region-source][data-active="oui"]',
].join(', ');
const SELECTEUR_GEOMETRIE = [
  '[data-ecran]',
  '[data-moteur]',
  SELECTEUR_PRISE,
  '[data-cible]',
  '[data-plateau]',
].join(', ');

/**
 * Attend une géométrie rendue, plutôt qu'un délai. Les images du décor et les polices changent
 * réellement la place libre des prises ; une mesure une image trop tôt ne dit donc rien.
 * Trois images consécutives doivent porter exactement les mêmes cadres. La borne est un nombre
 * d'images, non une durée : une interface qui ne se stabilise pas est un état non mesurable.
 */
export async function attendreGeometrieStable(page: Page): Promise<void> {
  // Le réseau honnêtement lent n'est pas une instabilité de composition. Playwright attend le
  // changement d'état `complete`, avec son délai de navigation borné, plutôt que douze images
  // de rendu qui condamneraient une vraie tablette à tort.
  await page.waitForFunction(
    () =>
      [...document.images].every((image) => image.complete) &&
      [...document.querySelectorAll('[data-masque-raster]')]
        .every((element) => element.getAttribute('data-masque-raster') === 'pret'),
    undefined,
    { timeout: 10_000 },
  );
  await page.evaluate(async (selecteurGeometrie) => {
    const attendreImage = (): Promise<void> => new Promise((resoudre) => requestAnimationFrame(() => resoudre()));
    await document.fonts.ready;
    const images = [...document.images];
    try {
      await Promise.all(images.map((image) => image.decode()));
    } catch {
      throw new Error('image cassée ou indécodable pendant son décodage');
    }
    // Le DOM peut gagner une image après le prévol : ses dimensions avant decode() ne
    // prouvent pas une ressource cassée. Le décodage doit précéder cette vérification.
    const cassees = images.filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0);
    if (cassees.length > 0) {
      throw new Error(`image cassée ou indécodable : ${cassees.map((image) => image.src).join(' · ')}`);
    }

    const empreinte = (): string => JSON.stringify({
      document: {
        largeur: document.documentElement.scrollWidth,
        hauteur: document.documentElement.scrollHeight,
        viewportLargeur: innerWidth,
        viewportHauteur: innerHeight,
      },
      elements: [...document.querySelectorAll<HTMLElement>(selecteurGeometrie)].map((element, rang) => {
        const boite = element.getBoundingClientRect();
        return [
          rang,
          element.getAttribute('data-ecran') ?? element.getAttribute('data-moteur') ??
            element.getAttribute('data-cible') ?? element.getAttribute('data-plateau') ?? element.tagName,
          Math.round(boite.left * 100) / 100,
          Math.round(boite.top * 100) / 100,
          Math.round(boite.width * 100) / 100,
          Math.round(boite.height * 100) / 100,
        ];
      }),
    });
    let precedente = '';
    let identiques = 0;
    for (let image = 0; image < 12; image += 1) {
      await attendreImage();
      const courante = empreinte();
      identiques = courante === precedente ? identiques + 1 : 0;
      precedente = courante;
      if (identiques >= 2) return;
    }
    throw new Error('géométrie instable après 12 images : aucun triplet de cadres identiques');
  }, SELECTEUR_GEOMETRIE);
}

/**
 * Cherche les vrais ancêtres qui rognent une prise. Un simple `isVisible()` ne voit pas un toit
 * opaque ni une zone SVG masquée : on recoupe avec les pixels réellement accessibles.
 */
export async function releverDefautsDeComposition(
  racine: Locator,
): Promise<readonly DefautDeComposition[]> {
  return racine.evaluate((noeud, selecteur) => {
    type Cadre = { left: number; top: number; right: number; bottom: number; width: number; height: number };
    const cadreDe = (element: Element): Cadre => {
      const r = element.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const intersection = (a: Cadre, b: Cadre): Cadre => {
      const left = Math.max(a.left, b.left);
      const top = Math.max(a.top, b.top);
      const right = Math.max(left, Math.min(a.right, b.right));
      const bottom = Math.max(top, Math.min(a.bottom, b.bottom));
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    const estAffiche = (element: HTMLElement): boolean => {
      const style = getComputedStyle(element);
      const r = cadreDe(element);
      return !element.hidden && element.closest('[hidden], [aria-hidden="true"]') === null &&
        style.display !== 'none' && style.visibility !== 'hidden' && r.width > 1 && r.height > 1;
    };
    const nommer = (element: HTMLElement): string =>
      (element.getAttribute('aria-label') ?? element.getAttribute('data-element') ??
        element.getAttribute('data-option') ?? element.getAttribute('data-cible') ??
        element.textContent ?? element.tagName).trim().replace(/\s+/gu, ' ').slice(0, 64);
    const estPriseClavierSeulement = (element: HTMLElement): boolean =>
      element instanceof SVGCircleElement &&
      element.getAttribute('role') === 'button' &&
      getComputedStyle(element).pointerEvents === 'none';
    const estTexteReserveAuLecteur = (texte: Text, limite: HTMLElement): boolean => {
      // Le motif usuel de texte accessible mais volontairement absent du décor (1 × 1 px,
      // `clip-path: inset(50%)`) ne doit pas être confondu avec un mot que l'enfant voit et
      // dont la fin serait coupée. Cette exception est volontairement étroite : un carton de
      // lecture de taille normale, même rogné par clip-path, continue d'être contrôlé ci-dessous.
      for (let parent = texte.parentElement; parent !== null; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        const boite = cadreDe(parent);
        if (
          boite.width <= 1 && boite.height <= 1 &&
          (/inset\(50%/u.test(style.clipPath) || /^rect\(0px[, ]+0px[, ]+0px[, ]+0px\)$/u.test(style.clip)) &&
          /(hidden|clip)/u.test(`${style.overflowX} ${style.overflowY}`)
        ) return true;
        if (parent === limite) return false;
      }
      return false;
    };
    const texteVisiblementRogne = (prise: HTMLElement, partieVisible: Cadre): boolean => {
      const arbre = document.createTreeWalker(prise, NodeFilter.SHOW_TEXT);
      let texte = arbre.nextNode();
      while (texte !== null) {
        if (texte.nodeValue?.trim() !== '' && !estTexteReserveAuLecteur(texte as Text, prise)) {
          const parent = texte.parentElement;
          if (parent !== null && parent.closest('[aria-hidden="true"]') === null) {
            const plage = document.createRange();
            plage.selectNodeContents(texte);
            for (const rectangle of [...plage.getClientRects()]) {
              if (rectangle.width < 1 || rectangle.height < 1) continue;
              // Chaque ligne effectivement composée est confrontée à la zone que le doigt peut
              // atteindre, puis aux sous-conteneurs qui rognent. Ainsi les ailes décoratives
              // absolues d'une luciole n'élargissent jamais artificiellement `scrollWidth`.
              let expose = intersection({
                left: rectangle.left,
                top: rectangle.top,
                right: rectangle.right,
                bottom: rectangle.bottom,
                width: rectangle.width,
                height: rectangle.height,
              }, partieVisible);
              for (let ancetre = parent; ancetre !== null && ancetre !== prise; ancetre = ancetre.parentElement) {
                const style = getComputedStyle(ancetre);
                if (/(hidden|clip|scroll|auto)/u.test(`${style.overflowX} ${style.overflowY}`)) {
                  expose = intersection(expose, cadreDe(ancetre));
                }
              }
              if (
                (rectangle.width > expose.width + 1 || rectangle.height > expose.height + 1)
              ) return true;
            }
          }
        }
        texte = arbre.nextNode();
      }
      return false;
    };
    const prises = [...noeud.querySelectorAll<HTMLElement>(selecteur)]
      .filter(estAffiche)
      // Dans les rendus raster, le cercle transparent reste une commande clavier/lecteur
      // d'écran ; le canvas, lui, reçoit le doigt à partir du masque. L'exclure ICI ne
      // disculpe aucun bouton HTML ni aucun vrai chemin SVG rendu non tactile.
      .filter((element) => !estPriseClavierSeulement(element))
      // Une prise SVG et son porteur ne constituent pas deux boutons superposés. On garde la
      // feuille de l'arbre des prises afin que le hit-test soit interprétable.
      .filter((element, _rang, toutes) => !toutes.some((autre) => autre !== element && autre.contains(element)));
    const defauts: DefautDeComposition[] = [];

    // La sonde explore les prises en faisant défiler ; elle ne doit pas laisser l'enfant
    // (ou la capture suivante) au bas d'un sous-conteneur après avoir mesuré sa dernière case.
    const defilements = [...document.querySelectorAll<HTMLElement>('*')]
      .filter((element) => element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)
      .map((element) => ({ element, gauche: element.scrollLeft, haut: element.scrollTop }));

    for (const prise of prises) {
      // Un élément plus bas sur une page longue est jouable : on le mesure APRÈS le scroll que
      // ferait Playwright ou un doigt. Un conteneur `hidden` ne peut pas le révéler et reste
      // donc signalé par l'intersection ci-dessous.
      // CSS autorise `scrollTop` sur `overflow: hidden`. Sans restauration, `scrollIntoView`
      // pourrait rendre artificiellement accessible une prise que le doigt ne peut pas atteindre.
      const ancetresCaches: Array<{ element: HTMLElement; gauche: number; haut: number }> = [];
      for (let parent = prise.parentElement; parent !== null; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (/(hidden|clip)/u.test(`${style.overflowX} ${style.overflowY}`)) {
          ancetresCaches.push({ element: parent, gauche: parent.scrollLeft, haut: parent.scrollTop });
        }
      }
      prise.scrollIntoView({ block: 'center', inline: 'nearest' });
      for (const { element, gauche, haut } of ancetresCaches) {
        element.scrollLeft = gauche;
        element.scrollTop = haut;
      }
      const boite = cadreDe(prise);
      let visible = intersection(boite, {
        left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight,
      });
      for (let parent = prise.parentElement; parent !== null; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (/(hidden|clip|scroll|auto)/u.test(`${style.overflowX} ${style.overflowY}`)) {
          visible = intersection(visible, cadreDe(parent));
        }
      }
      if (visible.width < 64 || visible.height < 64) {
        defauts.push({
          cible: nommer(prise),
          raison: `prise réellement visible trop petite ou rognée (${Math.round(visible.width)}×${Math.round(visible.height)} px)`,
        });
        continue;
      }

      // Pour une commande rectangulaire, le centre doit réellement recevoir le doigt : quatre
      // coins accessibles ne disculpent pas une carte dont le texte est sous un autre carton.
      // Une région dessinée peut être concave, donc sans remplissage au centre de son rectangle.
      // Pour elle seule, on conserve la recherche de pixels accessibles sur les cinq points.
      const margeX = Math.min(18, visible.width / 4);
      const margeY = Math.min(18, visible.height / 4);
      const points = [
        [visible.left + visible.width / 2, visible.top + visible.height / 2],
        [visible.left + margeX, visible.top + margeY],
        [visible.right - margeX, visible.top + margeY],
        [visible.left + margeX, visible.bottom - margeY],
        [visible.right - margeX, visible.bottom - margeY],
      ];
      const estAccessible = ([x, y]: number[]): boolean => {
        const dessus = document.elementFromPoint(x, y);
        return dessus !== null && (dessus === prise || prise.contains(dessus));
      };
      const pointsPris = points.filter(estAccessible).length;
      const formeDessinee = prise instanceof SVGGeometryElement;
      if (pointsPris === 0 || (!formeDessinee && !estAccessible(points[0]!))) {
        const dessus = document.elementFromPoint(visible.left + visible.width / 2, visible.top + visible.height / 2);
        defauts.push({
          cible: nommer(prise),
          raison: `prise masquée au hit-test par ${dessus?.tagName.toLowerCase() ?? 'aucun pixel'}`,
        });
      }

      if (texteVisiblementRogne(prise, visible)) {
        defauts.push({ cible: nommer(prise), raison: 'texte de la prise tronqué plutôt que défilable ou retourné' });
      }
    }
    for (const { element, gauche, haut } of defilements) {
      element.scrollLeft = gauche;
      element.scrollTop = haut;
    }
    return defauts;
  }, SELECTEUR_PRISE);
}

/** Réalise un tap Playwright et prouve que le vrai destinataire est bien la prise demandée. */
export async function taperLaPriseReelle(prise: Locator): Promise<void> {
  await prise.tap({ trial: true });
  await prise.evaluate((element) => {
    document.documentElement.setAttribute('data-qa-tap-recu', 'non');
    const noter = (evenement: Event): void => {
      if (evenement.target instanceof Node && (evenement.target === element || element.contains(evenement.target))) {
        document.documentElement.setAttribute('data-qa-tap-recu', 'oui');
      }
    };
    element.addEventListener('click', noter, { once: true, capture: true });
  });
  await prise.tap();
  const recu = await prise.page().locator('html').getAttribute('data-qa-tap-recu');
  await prise.page().locator('html').evaluate((element) => element.removeAttribute('data-qa-tap-recu'));
  if (recu !== 'oui') throw new Error('Le tap a été capturé par une autre couche que la prise demandée.');
}
