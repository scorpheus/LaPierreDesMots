import type { Page } from '@playwright/test';

/**
 * Allume la voix de Gobi comme le ferait le parent dans sa zone (réglage du foyer « Gobi parle »).
 *
 * Depuis le 9 oct. 2026, la parole est ÉTEINTE par défaut (décision du parent :
 * `client/src/services/voix-reglee.ts`). Les parcours qui jugent le bouton « Écouter » (R15, D42)
 * le jugent donc voix allumée, et l'allument explicitement AVANT le premier chargement.
 */
export async function allumerLaVoix(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const cle = 'pierre.reglages-parent';
    let reglages: Record<string, unknown> = {};
    try { reglages = JSON.parse(globalThis.localStorage.getItem(cle) ?? '{}') as Record<string, unknown>; } catch { reglages = {}; }
    globalThis.localStorage.setItem(cle, JSON.stringify({ ...reglages, boutonEcouter: true }));
  });
}
