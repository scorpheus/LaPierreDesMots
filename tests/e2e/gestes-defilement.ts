import type { CDPSession, Page } from '@playwright/test';

/** Un balayage natif, soumis au touch-action de la prise et à ses capteurs de glisser. */
export async function balayerAuDoigt(page: Page, cdp: CDPSession, x: number, y: number, distance: number): Promise<void> {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  // Interpolation d'un vrai geste, ralenti avant de lever le doigt pour éviter une longue
  // inertie. Les frames portent les positions du geste, pas une attente de chargement.
  for (let pas = 1; pas <= 16; pas += 1) {
    const progression = 1 - (1 - pas / 16) ** 3;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - distance * progression }] });
    await page.evaluate(() => new Promise<void>((resoudre) => requestAnimationFrame(() => resoudre())));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
