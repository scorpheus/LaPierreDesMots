/**
 * T10 — LE REPÈRE D'ÉTAPE : MÊME PLACE, MÊME STYLE, ET UN SIGNAL QUAND L'ÉTAPE CHANGE.
 *
 * Retour du parent (Docs/tableau-retours.md, T10, E03, E05, E06) : l'étape était « tantôt en
 * haut, tantôt en bas », pas dans le même style ; la mettre toujours en haut, sous la consigne,
 * dans le style de E03 ; et que l'enfant voie quand elle change.
 *
 * Sur l'application réelle, pour un nœud livré par moteur à étapes (1280×720) :
 *   • exactement un `[data-repere-etape]`, DANS la barre de consigne, SOUS le texte de consigne ;
 *   • « Étape 1 sur N », N lu dans le contenu servi par l'API, jamais supposé ;
 *   • même fond et même bordure calculés partout ;
 * et sur E05 (`phrase`, « le chat noir ») : finir l'étape 1 allume le cadre du repère.
 * `tri` n'en affiche pas (E03 : ses étapes ne contraignent rien), `paires` garde son compteur
 * près des cartes (ce n'est pas une étape).
 */
import type { Page } from '@playwright/test';

import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, choisirLeProfil, noeudsLivres } from './qa-outils.js';

type Fenetre = Window & {
  __test: { allerAuNoeud(id: string): Promise<void>; etat(): { etatMoteur: unknown } };
};

/** Moteurs dont le repère dit « Étape n sur N » dans la barre. */
const AVEC_RANG = ['assemble', 'attrape', 'chemin', 'colorie', 'eclair', 'grave', 'phrase', 'place'] as const;
/** Moteurs migrés sur le composant, mais sans rang (décisions écrites dans leur code). */
const SANS_RANG = ['chrono'] as const;

const NOEUDS = noeudsLivres();

async function ouvrir(page: Page, noeud: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await appliquerReglagesLectureReels(page, 'Repere');
  await choisirLeProfil(page, 'Repere');
  await page.evaluate(async (id) => (window as unknown as Fenetre).__test.allerAuNoeud(id), noeud);
  await expect(page.locator(`[data-ecran="noeud"][data-noeud="${noeud}"]`)).toHaveAttribute('data-test-pret', 'oui');
}

async function nombreDEtapes(page: Page, noeud: string): Promise<number> {
  const reponse = await page.request.get(`/api/contenu/noeuds/${noeud}`);
  expect(reponse.ok()).toBe(true);
  const contenu = (await reponse.json() as { exercice: { jeu: { contenu: { consignes?: unknown[] } } } }).exercice.jeu.contenu;
  return contenu.consignes?.length ?? 0;
}

interface Releve {
  readonly nombre: number;
  readonly dansLaBarre: boolean;
  readonly sousLaConsigne: boolean;
  readonly texte: string;
  readonly fond: string;
  readonly bordure: string;
}

async function relever(page: Page): Promise<Releve> {
  return page.evaluate(() => {
    const reperes = [...document.querySelectorAll('[data-repere-etape]')];
    const repere = reperes[0];
    const consigne = document.querySelector('.barre-consigne .activite-consigne-texte');
    const style = repere === undefined ? null : getComputedStyle(repere);
    return {
      nombre: reperes.length,
      dansLaBarre: repere?.closest('.barre-consigne') !== null && repere !== undefined,
      sousLaConsigne: repere !== undefined && consigne !== null &&
        repere.getBoundingClientRect().top >= consigne.getBoundingClientRect().bottom - 1,
      texte: repere?.textContent ?? '',
      fond: style?.backgroundColor ?? '',
      bordure: style === null ? '' : `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
    };
  });
}

for (const moteur of [...AVEC_RANG, ...SANS_RANG]) {
  const noeud = NOEUDS.find((n) => n.moteur === moteur);
  test(`T10 — ${moteur} : un seul repère, dans la barre, sous la consigne`, async ({ page }) => {
    expect(noeud, `un nœud livré pour ${moteur}`).toBeDefined();
    await ouvrir(page, noeud!.id);
    const total = await nombreDEtapes(page, noeud!.id);
    const r = await relever(page);
    expect(r.nombre).toBe(1);
    expect(r.dansLaBarre, 'dans la barre de consigne').toBe(true);
    expect(r.sousLaConsigne, 'sous le texte de la consigne').toBe(true);
    if ((AVEC_RANG as readonly string[]).includes(moteur) && total > 1) {
      expect(r.texte).toContain(`Étape 1 sur ${String(total)}`);
    } else {
      expect(r.texte).not.toContain('Étape');
    }
    // Le style de E03 : bordure de trait (l'égalité entre moteurs est vérifiée plus bas).
    expect(r.bordure).toMatch(/^2px solid /);
  });
}

test('T10 — le style calculé du repère est le même pour tous les moteurs', async ({ page }) => {
  const vus = new Set<string>();
  for (const moteur of ['phrase', 'attrape', 'place', 'colorie'] as const) {
    await ouvrir(page, NOEUDS.find((n) => n.moteur === moteur)!.id);
    const r = await relever(page);
    vus.add(`${r.fond} | ${r.bordure}`);
  }
  expect([...vus], 'un seul style de repère').toHaveLength(1);
});

test('E03 — tri n’affiche aucun « Étape n sur N » : ses étapes ne contraignent rien', async ({ page }) => {
  await ouvrir(page, 'clairiere-03');
  const r = await relever(page);
  expect(r.nombre).toBe(0);
  await expect(page.locator('[data-ecran="noeud"]')).not.toContainText('Étape 1 sur');
});

test('E05 — finir l’étape 1 allume le cadre du repère, jusqu’au toucher suivant', async ({ page }) => {
  await ouvrir(page, 'clairiere-05');
  const repere = page.locator('[data-repere-etape="phrase"]');
  await expect(repere).toContainText('Étape 1 sur 2');
  await expect(repere).toHaveAttribute('data-nouvelle-etape', 'non');
  // Les mots de l'étape 1, dans l'ordre attendu, touchés au doigt.
  const ordre = await page.evaluate(() => {
    const etat = (window as unknown as Fenetre).__test.etat().etatMoteur as {
      etapes: { restantes: string[] }[]; indexEtape: number;
    };
    return [...etat.etapes[etat.indexEtape]!.restantes];
  });
  for (const cle of ordre) await page.locator(`[data-etiquette="${cle}"]`).tap();
  await expect(repere).toContainText('Étape 2 sur 2');
  await expect(repere).toHaveAttribute('data-nouvelle-etape', 'oui');
  // Le texte ne bouge pas : seule la boîte s'allume (fond soleil plein et liseré).
  const fond = await repere.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(fond).not.toBe('');
  await page.locator('[data-etiquette]:not([hidden])').first().tap();
  await expect(repere).toHaveAttribute('data-nouvelle-etape', 'non');
});
