/**
 * `assemble` — on pose un bloc DANS une case (contrat Docs/assemble-pose-par-case-2026-10-12.md).
 *
 * Retour du parent, tableau E19 (galeries-07, « Les stalagmites à empiler ») : toucher le
 * deuxième bloc ne doit pas dire non ; mettre *che* en case 2 avant *mar* en case 1 est
 * accepté. Vrais gestes du navigateur : `click()` et glisser à la souris, jamais d'action
 * émise à la main.
 */
import type { Locator, Page } from '@playwright/test';

import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, entrerDansLeNoeud } from './qa-outils.js';
import { attendreGeometrieStable } from '../qualite/aides-composition.js';

async function ouvrir(page: Page): Promise<Locator> {
  await page.setViewportSize({ width: 1366, height: 768 });
  await appliquerReglagesLectureReels(page, 'PoseParCase');
  await entrerDansLeNoeud(page, 'galeries-07', 'PoseParCase');
  const moteur = page.locator('[data-moteur="assemble"]');
  await expect(moteur).toBeVisible();
  await attendreGeometrieStable(page);
  return moteur;
}

/** La solution de l'étape courante, lue dans les cases (dans l'ordre des cases). */
async function solution(moteur: Locator): Promise<string[]> {
  return moteur.locator('[data-fentes="mot"] [data-fente]').evaluateAll((noeuds) =>
    noeuds.map((n) => n.getAttribute('data-fente') ?? ''),
  );
}

const bloc = (moteur: Locator, id: string): Locator => moteur.locator(`[data-bloc="${id}"]`);
const caseNo = (moteur: Locator, rang: number): Locator => moteur.locator(`[data-case="${String(rang)}"]`);

test.describe('assemble — pose par case, au doigt', () => {
  test('toucher un bloc ne juge rien : pas de refus, pas de pose', async ({ page }) => {
    const moteur = await ouvrir(page);
    const [, second] = await solution(moteur);
    await bloc(moteur, second!).click();
    await expect(bloc(moteur, second!)).toHaveAttribute('data-pris', 'oui');
    await expect(moteur.locator('[data-refus-texte="non"]')).toBeVisible();
    await expect(moteur.locator('[data-fentes="mot"]')).toHaveAttribute('data-restantes', '2');
    // Retoucher le repose.
    await bloc(moteur, second!).click();
    await expect(bloc(moteur, second!)).toHaveAttribute('data-pris', 'non');
  });

  test('le deuxième bloc posé en case 2 d’abord est accepté, puis le premier en case 1', async ({ page }) => {
    const moteur = await ouvrir(page);
    const etapeDepart = await moteur.getAttribute('data-etape');
    const [premier, second] = await solution(moteur);
    await bloc(moteur, second!).click();
    await caseNo(moteur, 1).click();
    await expect(moteur.locator('[data-fentes="mot"]')).toHaveAttribute('data-restantes', '1');
    await expect(moteur.locator('[data-refus-texte="non"]')).toBeVisible();
    await expect(bloc(moteur, second!)).toBeHidden();
    await bloc(moteur, premier!).click();
    await caseNo(moteur, 0).click();
    // L'étape est finie : le moteur passe tout seul à la suivante, sans refus ni erreur.
    await expect(moteur).not.toHaveAttribute('data-etape', etapeDepart!);
    await expect(moteur.locator('[data-refus-texte="non"]')).toBeVisible();
  });

  test('un bloc posé dans la mauvaise case est refusé avec bienveillance et revient', async ({ page }) => {
    const moteur = await ouvrir(page);
    const [, second] = await solution(moteur);
    await bloc(moteur, second!).click();
    await caseNo(moteur, 0).click();
    await expect(moteur.locator('[data-refus-texte="oui"] [data-message-refus="oui"]')).toHaveText(
      'On cherche la syllabe qui vient à cette place-là.',
    );
    await expect(moteur.locator('[data-fentes="mot"]')).toHaveAttribute('data-restantes', '2');
    await expect(bloc(moteur, second!)).toBeVisible();
    await expect(bloc(moteur, second!)).toHaveAttribute('data-pris', 'non');
  });

  test('glisser le deuxième bloc sur la case 2 : même pose que le toucher', async ({ page }) => {
    const moteur = await ouvrir(page);
    const [, second] = await solution(moteur);
    const depart = await bloc(moteur, second!).boundingBox();
    const arrivee = await caseNo(moteur, 1).boundingBox();
    expect(depart).not.toBeNull();
    expect(arrivee).not.toBeNull();
    await page.mouse.move(depart!.x + depart!.width / 2, depart!.y + depart!.height / 2);
    await page.mouse.down();
    await page.mouse.move(arrivee!.x + arrivee!.width / 2, arrivee!.y + arrivee!.height / 2, { steps: 20 });
    await page.mouse.up();
    await expect(moteur.locator('[data-fentes="mot"]')).toHaveAttribute('data-restantes', '1');
    await expect(bloc(moteur, second!)).toBeHidden();
    await expect(moteur.locator('[data-refus-texte="non"]')).toBeVisible();
  });
});
