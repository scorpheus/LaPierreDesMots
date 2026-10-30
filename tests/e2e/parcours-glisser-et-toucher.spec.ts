/**
 * T11 — GLISSER ET TOUCHER, LES DEUX, PARTOUT OÙ L'ON DÉPLACE QUELQUE CHOSE.
 *
 * Retour du parent (Docs/tableau-retours.md, T11 et E05) : « pour les paniers (E03), on peut
 * glisser le mot ou toucher le mot puis le panier, les deux marchent. Pour E05, il faut
 * toucher les lettres alors qu'on a envie de les glisser à leur place. »
 *
 * ── CE QUE LA SONDE A MESURÉ AVANT CETTE GARDE (bac-a-sable/socle-etape/gestes3) ──────────
 * Dans `phrase`, pendant un glisser au doigt comme à la souris, le mot est bien « en vol »
 * (`data-glisse="oui"`) mais la ligne de la phrase n'est JAMAIS survolée (`data-survolee`
 * reste `non`) et rien n'arrive au réducteur. Cause : `useCibleDeDepot` était appelé dans le
 * corps du moteur, c'est-à-dire AU-DESSUS du `DndContext` que ce même moteur rend. La cible
 * s'inscrivait donc auprès d'un contexte vide. Même défaut dans `assemble` et `chrono`.
 * Aucun test de composant ne pouvait le voir : happy-dom ne mesure aucune boîte, donc aucun
 * glisser n'y aboutit jamais, avec ou sans le défaut.
 *
 * ── LE PROTOCOLE ──────────────────────────────────────────────────────────────────────────
 * Pour chaque moteur qui déplace un objet, sur un nœud livré :
 *   • GLISSER : un vrai geste au doigt (évènements tactiles CDP, soumis au `touch-action`),
 *     de la BONNE pièce vers la BONNE place ; la réussite se lit dans l'état du moteur.
 *   • TOUCHER : la bonne pièce, puis sa place quand le moteur en demande une.
 * La bonne réponse est lue dans l'état du moteur, jamais devinée : un refus ne prouverait que
 * l'arrivée du geste, pas qu'il sert à jouer.
 */
import type { CDPSession, Page } from '@playwright/test';

import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, choisirLeProfil } from './qa-outils.js';

type Fenetre = Window & { __test: { allerAuNoeud(id: string): Promise<void>; etat(): { etatMoteur: unknown } } };

/** Ce que le moteur attend maintenant : la pièce, sa place (si le moteur en demande une), et la clé de réussite. */
interface Coup {
  readonly piece: string;
  readonly place: string | null;
  /** Évaluée dans la page : vraie quand ce coup est acquis dans l'état du moteur. */
  readonly acquis: string;
}

interface Cas {
  readonly moteur: string;
  readonly noeud: string;
  /** Sélecteur de la zone où l'on dépose quand le moteur ne demande pas de place précise. */
  readonly zone: string | null;
  /** Calcule le coup attendu, dans la page, depuis l'état du moteur. */
  readonly coup: (etat: unknown) => Coup;
}

/* Ces fonctions sont sérialisées et exécutées dans la page : elles ne capturent rien. */

function coupDOrdre(attribut: string): (etat: unknown) => Coup {
  return new Function('etat', `
    const e = etat; const cle = e.etapes[e.indexEtape].restantes[0];
    return { piece: '[${attribut}="' + cle + '"]', place: null, acquis: 'acquis.' + cle };
  `) as (etat: unknown) => Coup;
}

const CAS: readonly Cas[] = [
  // E05, le cas du retour : « le chat noir ».
  { moteur: 'phrase', noeud: 'clairiere-05', zone: '[data-fentes="phrase"]', coup: coupDOrdre('data-etiquette') },
  {
    // Contrat assemble-pose-par-case (12 oct. 2026) : le bloc se pose DANS sa case — la case se
    // touche, ou reçoit le glisser. L'ancienne « ligne du mot » n'est plus une cible.
    moteur: 'assemble', noeud: 'cite-des-histoires-09', zone: null,
    coup: new Function('etat', `
      const e = etat.etapes[etat.indexEtape]; const cle = e.restantes[0];
      return { piece: '[data-bloc="' + cle + '"]', place: '[data-case="' + e.solution.indexOf(cle) + '"]', acquis: 'acquis.' + cle };
    `) as (etat: unknown) => Coup,
  },
  { moteur: 'chrono', noeud: 'cite-des-histoires-03', zone: '[data-fentes="histoire"]', coup: coupDOrdre('data-vignette') },
  {
    moteur: 'tri', noeud: 'clairiere-03', zone: null,
    coup: new Function('etat', `
      const id = etat.etapes[etat.indexEtape].restantes[0];
      const el = etat.elements.find((x) => x.id === id);
      return { piece: '[data-element="' + id + '"]', place: '[data-receptacle="' + el.receptacleAttendu + '"]', acquis: 'acquis.' + id };
    `) as (etat: unknown) => Coup,
  },
  {
    moteur: 'place', noeud: 'clairiere-04', zone: null,
    coup: new Function('etat', `
      const d = etat.consignes[etat.indexConsigne].depotsRestants[0];
      return { piece: '[data-reserve="place"] [data-element="' + d.element + '"]', place: '[data-zone-cible="' + d.zone + '"]', acquis: 'place.' + d.element };
    `) as (etat: unknown) => Coup,
  },
  {
    moteur: 'paires', noeud: 'foret-muette-02', zone: null,
    coup: new Function('etat', `
      const paire = etat.etapes[etat.indexEtape].restantes[0];
      const [a, b] = etat.cartes.filter((c) => c.paire === paire);
      return { piece: '[data-carte="' + a.id + '"]', place: '[data-carte="' + b.id + '"]', acquis: 'acquis.' + paire };
    `) as (etat: unknown) => Coup,
  },
  {
    moteur: 'grave', noeud: 'foret-muette-06', zone: '[data-mot-central]',
    coup: new Function('etat', `
      const trou = etat.etapes[etat.indexEtape].restantes[0];
      const lettre = etat.trous.find((t) => t.id === trou).attendu;
      return { piece: '[data-lettre="' + lettre + '"]', place: null, acquis: 'acquis.' + trou };
    `) as (etat: unknown) => Coup,
  },
];

async function ouvrir(page: Page, noeud: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await appliquerReglagesLectureReels(page, 'Gestes');
  await choisirLeProfil(page, 'Gestes');
  await page.evaluate(async (id) => (window as unknown as Fenetre).__test.allerAuNoeud(id), noeud);
  await expect(page.locator(`[data-ecran="noeud"][data-noeud="${noeud}"]`)).toHaveAttribute('data-test-pret', 'oui');
}

async function coupAttendu(page: Page, cas: Cas): Promise<Coup> {
  return page.evaluate((source) => {
    const calcul = new Function('etat', `return (${source})(etat);`) as (e: unknown) => Coup;
    return calcul((window as unknown as Fenetre).__test.etat().etatMoteur);
  }, cas.coup.toString());
}

/** Vrai quand la clé de réussite (« acquis.x » ou « place.x ») est posée dans l'état du moteur. */
async function estAcquis(page: Page, cle: string): Promise<boolean> {
  return page.evaluate((chemin) => {
    const etat = (window as unknown as Fenetre).__test.etat().etatMoteur as Record<string, unknown>;
    const [champ, id] = chemin.split('.') as [string, string];
    if (champ === 'place') {
      const places = etat['places'];
      return JSON.stringify(places ?? null).includes(`"${id}"`);
    }
    const table = etat[champ] as Record<string, unknown> | undefined;
    return table !== undefined && table[id] !== undefined;
  }, cle);
}

async function centre(page: Page, selecteur: string): Promise<{ x: number; y: number }> {
  const boite = await page.locator(selecteur).first().boundingBox();
  expect(boite, `${selecteur} doit être à l’écran`).not.toBeNull();
  return { x: boite!.x + boite!.width / 2, y: boite!.y + boite!.height / 2 };
}

/** Un glisser au doigt : touchStart, vingt déplacements image par image, touchEnd. */
async function glisserAuDoigt(page: Page, cdp: CDPSession, de: { x: number; y: number }, a: { x: number; y: number }): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [de] });
  for (let pas = 1; pas <= 20; pas += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: de.x + ((a.x - de.x) * pas) / 20, y: de.y + ((a.y - de.y) * pas) / 20 }],
    });
    await page.evaluate(() => new Promise<void>((resoudre) => requestAnimationFrame(() => resoudre())));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

for (const cas of CAS) {
  test.describe(`T11 — ${cas.moteur} (${cas.noeud})`, () => {
    test('glisser la pièce à sa place, au doigt', async ({ page }) => {
      await ouvrir(page, cas.noeud);
      const coup = await coupAttendu(page, cas);
      const destination = coup.place ?? cas.zone;
      expect(destination, 'une place ou une zone de dépôt').not.toBeNull();
      const cdp = await page.context().newCDPSession(page);
      await glisserAuDoigt(page, cdp, await centre(page, coup.piece), await centre(page, destination!));
      await expect.poll(() => estAcquis(page, coup.acquis), { message: `${coup.piece} glissé sur ${destination!}` }).toBe(true);
    });

    test('toucher la pièce, puis sa place', async ({ page }) => {
      await ouvrir(page, cas.noeud);
      const coup = await coupAttendu(page, cas);
      await page.locator(coup.piece).first().tap();
      if (coup.place !== null) await page.locator(coup.place).first().tap();
      await expect.poll(() => estAcquis(page, coup.acquis), { message: `${coup.piece} touché` }).toBe(true);
    });
  });
}
