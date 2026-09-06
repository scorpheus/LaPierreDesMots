/** Pilote les prises du navigateur, jamais le réducteur ni `__test.repondre`. */
import { expect, type Locator, type Page } from '@playwright/test';
import { etatDuJeu } from './qa-outils.js';

interface EtapeDom {
  readonly restantes: readonly string[];
}
export interface EtatGestesDom {
  readonly etapes?: readonly EtapeDom[];
  readonly indexEtape?: number;
  readonly indexConsigne?: number;
  readonly consignes?: readonly {
    readonly ciblesRestantes?: readonly { region: string; couleur: string }[];
    readonly depotsRestants?: readonly { element: string; zone: string }[];
  }[];
  readonly elements?: readonly { id: string; receptacleAttendu: string }[];
  readonly cartes?: readonly { id: string; paire: string }[];
  readonly trous?: readonly { id: string; attendu: string }[];
  readonly lettres?: readonly { traits: readonly { points: readonly (readonly [number, number])[] }[] }[];
  readonly indexLettre?: number;
  readonly indexTrait?: number;
  readonly recitVisible?: boolean;
  readonly remplissages?: Readonly<Record<string, string>>;
  readonly acquis?: Readonly<Record<string, string>>;
  readonly termineMs?: number | null;
}

export async function lireEtatDom(page: Page): Promise<EtatGestesDom> {
  return (await etatDuJeu(page)).etatMoteur as EtatGestesDom;
}

export function jalonDom(etat: EtatGestesDom): string {
  return JSON.stringify({
    etape: etat.indexEtape, consigne: etat.indexConsigne,
    restantes: etat.etapes?.map((etape) => etape.restantes),
    consignes: etat.consignes?.map((consigne) => ({
      cibles: consigne.ciblesRestantes, depots: consigne.depotsRestants,
    })), lettre: etat.indexLettre,
    trait: etat.indexTrait, termine: etat.termineMs,
  });
}

/** Le centre de la prise doit recevoir le doigt, même quand Playwright saurait trouver un bord. */
export async function toucherPrise(prise: Locator): Promise<void> {
  await expect(prise).toHaveCount(1);
  await expect(prise).toBeVisible();
  // Le clavier peut être remonté pendant une rotation. `tap(trial)` attend et résout de
  // nouveau le locator ; scrollIntoViewIfNeeded seul peut garder un ancien nœud détaché.
  await prise.tap({ trial: true, timeout: 5_000 });
  const interception = await prise.evaluate((element) => {
    const cadre = element.getBoundingClientRect();
    const x = cadre.left + cadre.width / 2;
    const y = cadre.top + cadre.height / 2;
    const dessus = document.elementFromPoint(x, y);
    return dessus === element || (dessus !== null && element.contains(dessus))
      ? null : `${element.outerHTML.slice(0, 160)} masqué par ${dessus?.outerHTML.slice(0, 160) ?? 'hors écran'}`;
  });
  expect(interception, 'la prise visible doit recevoir le doigt en son centre').toBeNull();
  await prise.tap({ timeout: 5_000 });
}

const selecteur = (attribut: string, id: string): string => `[${attribut}=${JSON.stringify(id)}]`;

/** Une feuille concave n'est pas un rectangle : choisir un pixel réellement rempli du chemin. */
export async function toucherForme(forme: Locator): Promise<void> {
  await expect(forme).toBeVisible();
  await forme.scrollIntoViewIfNeeded();
  const point = await forme.evaluate((element) => {
    const chemin = element as SVGGeometryElement;
    const cadre = chemin.getBBox();
    const matrice = chemin.getScreenCTM();
    if (matrice === null) return null;
    const candidats: { x: number; y: number; distance: number }[] = [];
    for (let ligne = 0; ligne < 41; ligne += 1) for (let colonne = 0; colonne < 41; colonne += 1) {
      const x = cadre.x + cadre.width * (colonne + 0.5) / 41;
      const y = cadre.y + cadre.height * (ligne + 0.5) / 41;
      const local = new DOMPoint(x, y);
      if (!chemin.isPointInFill(local)) continue;
      const ecran = local.matrixTransform(matrice);
      if (document.elementFromPoint(ecran.x, ecran.y) !== element) continue;
      candidats.push({ x: ecran.x, y: ecran.y, distance: Math.hypot(colonne - 20, ligne - 20) });
    }
    return candidats.sort((a, b) => a.distance - b.distance)[0] ?? null;
  });
  expect(point, 'un pixel du vrai motif doit être accessible, sans cliquer dans son rectangle vide').not.toBeNull();
  await forme.evaluate((element) => {
    document.documentElement.removeAttribute('data-qa-region-touchee');
    document.addEventListener('pointerdown', (evenement) => {
      const cible = evenement.target instanceof Element ? evenement.target : null;
      const sousDoigt = document.elementFromPoint(evenement.clientX, evenement.clientY);
      // La cible native peut être la racine SVG (ajustement tactile de Chromium).
      // Le pixel réellement touché doit néanmoins rester le vrai motif de CE dessin.
      const memeScene = cible !== null && element.closest('svg.pierre-scene')?.contains(cible);
      document.documentElement.setAttribute('data-qa-region-touchee', memeScene
        ? sousDoigt?.closest('[data-region-source]')?.getAttribute('data-region-source') ?? 'hors motif'
        : 'hors scène');
      document.documentElement.setAttribute('data-qa-contact', JSON.stringify({
        x: evenement.clientX, y: evenement.clientY, cible: cible?.outerHTML.slice(0, 220),
        sousDoigt: document.elementFromPoint(evenement.clientX, evenement.clientY)?.outerHTML.slice(0, 220),
        cadre: element.getBoundingClientRect().toJSON(), transform: getComputedStyle(element).transform,
      }));
    }, { capture: true, once: true });
    document.documentElement.setAttribute('data-qa-region-attendue', element.getAttribute('data-region-source') ?? '');
  });
  await forme.page().touchscreen.tap(point!.x, point!.y);
  const recu = await forme.page().locator('html').getAttribute('data-qa-region-touchee');
  const attendu = await forme.page().locator('html').getAttribute('data-qa-region-attendue');
  expect(recu, `le navigateur transmet le contact (${point!.x}, ${point!.y}) au motif visé : ${await forme.page().locator('html').getAttribute('data-qa-contact')}`).toBe(attendu);
}

export const MOTEURS_GESTES_DOM = [
  'assemble', 'attrape', 'chemin', 'chrono', 'colorie', 'eclair', 'grave',
  'histoire', 'libre', 'paires', 'phrase', 'place', 'trace', 'tri',
] as const;

/** Réponses connues de l'oracle, mais saisie uniquement par le navigateur réel. */
export async function jouerProchainGesteDom(page: Page, moteur: string, tour: number): Promise<void> {
  const etat = await lireEtatDom(page);
  const racine = page.locator(`[data-moteur=${JSON.stringify(moteur)}]`);
  const restantes = etat.etapes?.[etat.indexEtape ?? 0]?.restantes ?? [];
  // Parcourir le tri et les paires à rebours : l'ancien ordre caché ne doit pas revenir.
  const attendu = (moteur === 'tri' || moteur === 'paires')
    ? etat.etapes?.slice(etat.indexEtape ?? 0).flatMap((etape) => etape.restantes).at(-1)
    : restantes[0];
  const toucher = async (attribut: string, id: string | undefined): Promise<void> => {
    expect(id, `${moteur} : la réponse attendue existe`).toBeDefined();
    await toucherPrise(racine.locator(selecteur(attribut, id!)));
  };
  switch (moteur) {
    case 'assemble': await toucher('data-bloc', attendu); return;
    case 'attrape': await toucher('data-cible', attendu); return;
    case 'chemin': await toucher('data-case', attendu); return;
    case 'chrono': await toucher('data-vignette', attendu); return;
    case 'phrase': await toucher('data-etiquette', attendu); return;
    case 'grave': {
      await toucher('data-lettre', etat.trous?.find((trou) => trou.id === attendu)?.attendu);
      return;
    }
    case 'tri': {
      const element = etat.elements?.find((candidat) => candidat.id === attendu);
      await toucher('data-element', element?.id);
      await toucher('data-receptacle', element?.receptacleAttendu);
      return;
    }
    case 'paires': {
      const paire = etat.cartes?.filter((carte) => carte.paire === attendu) ?? [];
      expect(paire, 'chaque paire comporte deux cartes').toHaveLength(2);
      for (const carte of [...paire].reverse()) await toucher('data-carte', carte.id);
      return;
    }
    case 'colorie': {
      const cible = etat.consignes?.[etat.indexConsigne ?? 0]?.ciblesRestantes?.[0];
      expect(cible, 'la consigne désigne une région du dessin').toBeDefined();
      await toucher('data-godet', cible!.couleur);
      await toucherForme(racine.locator(`${selecteur('data-region-source', cible!.region)}[data-active="oui"]`));
      return;
    }
    case 'place': {
      const depot = etat.consignes?.[etat.indexConsigne ?? 0]?.depotsRestants?.[0];
      expect(depot, 'la consigne désigne un objet et sa destination').toBeDefined();
      await toucher('data-element', depot!.element);
      await toucher('data-zone-cible', depot!.zone);
      return;
    }
    case 'eclair': {
      await toucherPrise(racine.locator('[data-action="pret"], [data-action="revoir"]'));
      await expect(racine.locator('[data-plateau="eclair"]')).toHaveAttribute('data-visible', 'oui');
      // L'exposition est une vraie minuterie de l'interface, pas une action injectée au moteur.
      await expect(racine.locator('[data-plateau="eclair"]')).toHaveAttribute('data-visible', 'non');
      await toucher('data-option', attendu);
      return;
    }
    case 'histoire': {
      if (etat.recitVisible) await toucherPrise(racine.locator('[data-action="recit"]'));
      await toucher('data-option', attendu);
      return;
    }
    case 'trace': {
      const points = etat.lettres?.[etat.indexLettre ?? 0]?.traits[etat.indexTrait ?? 0]?.points;
      expect(points?.length, 'le trait possède un chemin à dessiner').toBeGreaterThan(1);
      const scene = racine.locator('svg[data-scene="trace"]');
      await scene.scrollIntoViewIfNeeded();
      const clients = await scene.evaluate((element, trajet) => {
        const matrice = (element as SVGSVGElement).getScreenCTM();
        if (matrice === null) throw new Error('La scène de tracé ne possède pas de transformation écran.');
        return trajet.map(([x, y]) => {
          const point = new DOMPoint(x, y).matrixTransform(matrice);
          return { x: point.x, y: point.y };
        });
      }, points!);
      const departAccessible = await scene.evaluate((element, point) => {
        const dessus = document.elementFromPoint(point.x, point.y);
        return dessus !== null && (dessus === element || element.contains(dessus));
      }, clients[0]!);
      expect(departAccessible, 'le départ du trait reçoit réellement le doigt').toBe(true);
      // Le protocole d'entrée du navigateur produit un vrai flux tactile (et son pointerType),
      // contrairement à dispatchEvent ou à une souris qui ne teste pas le défilement tactile.
      const session = await page.context().newCDPSession(page);
      try {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart', touchPoints: [{ ...clients[0]!, id: 1, radiusX: 6, radiusY: 6 }],
        });
        for (const point of clients.slice(1)) {
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove', touchPoints: [{ ...point, id: 1, radiusX: 6, radiusY: 6 }],
          });
        }
      } finally {
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
      }
      return;
    }
    case 'libre': {
      if (tour === 0) {
        await toucherPrise(racine.locator('[data-couleur]').first());
        await expect(racine.locator('[data-masque-raster]')).toHaveAttribute('data-masque-raster', 'pret');
        const toile = racine.locator('canvas[data-raster-couche="couleurs"]');
        await toile.scrollIntoViewIfNeeded();
        const point = await toile.evaluate((element) => {
          const canvas = element as HTMLCanvasElement;
          const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
          const boite = canvas.getBoundingClientRect();
          const echelle = Math.min(boite.width / canvas.width, boite.height / canvas.height);
          // Chercher une plage peignable, pas un centroïde arbitraire d'un autre objet.
          for (let y = 8; y < canvas.height - 8; y += 8) for (let x = 8; x < canvas.width - 8; x += 8) {
            if (![-8, 0, 8].every((dy) => [-8, 0, 8].every((dx) => pixels[((y + dy) * canvas.width + x + dx) * 4 + 3] === 255))) continue;
            const ecran = { x: boite.left + (boite.width - canvas.width * echelle) / 2 + x * echelle,
              y: boite.top + (boite.height - canvas.height * echelle) / 2 + y * echelle };
            if (document.elementFromPoint(ecran.x, ecran.y) === element) return ecran;
          }
          return null;
        });
        expect(point, 'le chaudron possède une vraie plage de pixels peignables').not.toBeNull();
        await page.touchscreen.tap(point!.x, point!.y);
        await expect.poll(async () => Object.keys((await lireEtatDom(page)).acquis ?? {}).length,
          { message: 'le pixel touché du chaudron doit réellement recevoir la couleur' }).toBeGreaterThan(0);
      }
      await toucherPrise(racine.locator('[data-action="terminer"]'));
      return;
    }
    default: throw new Error(`Aucun geste DOM défini pour ${moteur}.`);
  }
}
