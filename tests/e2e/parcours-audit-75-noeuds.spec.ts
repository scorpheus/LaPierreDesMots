/**
 * Campagne visuelle rapide des nœuds pédagogiques.
 *
 * Elle ne remplace pas les recettes de gestes : son but est de faire apparaître, sur chaque
 * écran initial, les défauts transversaux signalés par le parent (règle absente, cible hors
 * cadre, débordement vertical, cartes non centrées). Les captures vont dans bac-a-sable et ne
 * sont jamais des snapshots de référence.
 *
 * Lancer après `npm run construire:test` avec :
 * `npx playwright test tests/e2e/parcours-audit-75-noeuds.spec.ts --project=parcours`
 */
import { expect, test } from './invariants.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { choisirLeProfil, noeudsLivres, preparer } from './qa-outils.js';

const NOEUDS = noeudsLivres().filter((n) => n.progression);
const DOSSIER = resolve(process.cwd(), 'bac-a-sable', 'audit-75-noeuds');
const VUES = [
  { nom: 'pc-1920x1080', largeur: 1920, hauteur: 1080 },
  { nom: 'tablette-1920x1200', largeur: 1920, hauteur: 1200 },
] as const;

type Mesure = {
  id: string;
  moteur: string;
  vue: string;
  debordements: string[];
  horsCadre: string[];
  regle: string;
  cible: string;
};

async function stabiliserEtMesurer(page: Page, noeud: (typeof NOEUDS)[number], vue: string): Promise<Mesure> {
  await page.evaluate(async (id) => {
    const crochets = (window as Window & { __test?: { allerAuNoeud(id: string): Promise<void>; sauterAnimations(): void } }).__test;
    if (!crochets) throw new Error('crochets __test absents du bundle de campagne');
    crochets.sauterAnimations();
    await crochets.allerAuNoeud(id);
  }, noeud.id);
  await expect(page.locator('[data-ecran="noeud"]')).toBeVisible();
  const mesure = await page.evaluate(({ id, moteur, vue }) => {
    const largeur = window.innerWidth;
    const hauteur = window.innerHeight;
    const elements = [...document.querySelectorAll<HTMLElement>(
      '[data-ecran="noeud"] button, [data-ecran="noeud"] [role="button"], ' +
      '[data-ecran="noeud"] [data-plateau], [data-ecran="noeud"] [data-cartouche-tri], ' +
      '[data-ecran="noeud"] [data-cartouche-chrono], [data-ecran="noeud"] [data-cartouche-paires], ' +
      '[data-ecran="noeud"] [data-message-chemin]'
    )];
    const visibles = elements.filter((element) => {
      const r = element.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    });
    const debordements = visibles
      .filter((element) => {
        const r = element.getBoundingClientRect();
        return r.right > largeur + 1 || r.bottom > hauteur + 1 || r.left < -1 || r.top < -1;
      })
      .slice(0, 12)
      .map((element) => `${element.tagName.toLowerCase()}${element.dataset.moteur ? `[${element.dataset.moteur}]` : ''}`);
    const attr = (selector: string): string => document.querySelector(selector)?.textContent?.trim() ?? '';
    const selecteurCible: Readonly<Record<string, string>> = {
      assemble: '[data-plateau="mot"]',
      attrape: '[data-plateau="etape-attrape"]',
      chemin: '[data-message-chemin]',
      chrono: '[data-cartouche-chrono]',
      colorie: '[data-cible-colorie]',
      eclair: '[data-plateau="etape-eclair"]',
      grave: '[data-plateau="etape-grave"]',
      histoire: '[data-plateau="etape-histoire"]',
      paires: '[data-cartouche-paires]',
      phrase: '[data-plateau="etape-phrase"]',
      place: '[data-plateau="etape-place"]',
      trace: '[data-plateau="cible-trace"]',
      tri: '[data-cartouche-tri]',
    };
    const cibleElement = document.querySelector(selecteurCible[moteur] ?? '[data-plateau]');
    return {
      id, moteur, vue,
      debordements,
      horsCadre: [],
      regle: attr('[data-consigne]:not([hidden])'),
      cible: cibleElement?.textContent?.trim() || (cibleElement === null ? '' : '(repère visuel)'),
    } satisfies Mesure;
  }, { id: noeud.id, moteur: noeud.moteur, vue });
  return mesure;
}

test.describe('audit visuel rapide — 75 nœuds', () => {
  test('chaque nœud expose son écran initial aux deux résolutions', async ({ page }) => {
    test.slow();
    mkdirSync(DOSSIER, { recursive: true });
    await preparer(page, 'AuditVisuel');
    await choisirLeProfil(page, 'AuditVisuel');
    const mesures: Mesure[] = [];

    for (const vue of VUES) {
      await page.setViewportSize({ width: vue.largeur, height: vue.hauteur });
      for (const noeud of NOEUDS) {
        const mesure = await stabiliserEtMesurer(page, noeud, vue.nom);
        mesures.push(mesure);
        const nom = `${vue.nom}__${noeud.id}`;
        await page.screenshot({ path: resolve(DOSSIER, `${nom}.png`), fullPage: false, scale: 'css' });
      }
    }

    const erreurs = mesures.filter((m) => m.debordements.length > 0 || m.regle === '' || m.cible === '');
    writeFileSync(resolve(DOSSIER, 'mesures.json'), JSON.stringify({ total: mesures.length, erreurs, mesures }, null, 2));
    const cartes = mesures.map((m) => `<figure><img src="${m.vue}__${m.id}.png"><figcaption>${m.vue} · ${m.id} · ${m.moteur}</figcaption></figure>`).join('\n');
    writeFileSync(resolve(DOSSIER, 'planches-contact.html'), `<!doctype html><meta charset="utf-8"><title>Audit 75 nœuds</title><style>body{font-family:system-ui;background:#eee}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;background:white;padding:6px}img{display:block;width:100%;height:180px;object-fit:cover}figcaption{font-size:12px;margin-top:5px}</style><h1>Audit visuel — ${mesures.length} écrans</h1><main>${cartes}</main>`);
    expect(NOEUDS.length, 'le catalogue doit contenir 75 nœuds pédagogiques').toBe(75);
    expect(erreurs, 'règle, cible et débordements sont contrôlés dans mesures.json').toEqual([]);
  });
});
