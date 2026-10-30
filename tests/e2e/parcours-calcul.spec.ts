/**
 * Le calcul, joué de bout en bout comme l'enfant (premier jet,
 * Docs/maths-calcul-premier-jet-2026-10-09.md) : un gué entier et une pierre à calcul entière,
 * au doigt ET au clavier physique, sur les quatre formats visés. À chaque état mesuré, la page
 * ne défile pas (contrat du socle, S2 : 0 px aux formats tablette et PC) et rien de ce qu'il
 * faut voir ou toucher ne sort de l'écran (S1) ni n'est recouvert (S10).
 */
import { expect, test } from './invariants.js';
import { appliquerReglagesLectureReels, choisirLeProfil } from './qa-outils.js';
import { jouerEtape, mesurerEcranCalcul, ouvrirCalcul, reponseCourante, type MesureEcran } from './calcul-outils.js';

const FORMATS = [
  { nom: 'tablette-portrait', largeur: 800, hauteur: 1100 },
  { nom: 'tablette-paysage', largeur: 1280, hauteur: 720 },
  { nom: 'pc-portable', largeur: 1366, hauteur: 768 },
  { nom: 'pc-grand', largeur: 1920, hauteur: 1080 },
] as const;

function tientALEcran(mesure: MesureEcran, etat: string): void {
  expect(mesure.defilementVertical, `${etat} ${mesure.format} : défilement vertical`).toBe(0);
  expect(mesure.defilementHorizontal, `${etat} ${mesure.format} : défilement horizontal`).toBe(0);
  expect(mesure.horsEcran, `${etat} ${mesure.format} : hors de l’écran`).toEqual([]);
  expect(mesure.recouvertes, `${etat} ${mesure.format} : commandes recouvertes`).toEqual([]);
  expect(mesure.plusPetiteCible, `${etat} ${mesure.format} : ${mesure.ciblePlusPetite}`).toBeGreaterThanOrEqual(64);
}

for (const format of FORMATS) {
  test(`calcul : un gué et une addition posée, au doigt et au clavier, sans défilement en ${format.nom}`, async ({ page }) => {
    await page.setViewportSize({ width: format.largeur, height: format.hauteur });
    const prenom = `Calcul ${format.nom}`;
    await appliquerReglagesLectureReels(page, prenom);
    await choisirLeProfil(page, prenom);

    // ── Le gué : 5 tables à choisir, puis 7 égalités au pavé ─────────────────────────────
    await ouvrirCalcul(page, 'gue');
    tientALEcran(await mesurerEcranCalcul(page), 'gué, réponses à choisir');
    for (let i = 0; i < 5; i += 1) await jouerEtape(page, i % 2 === 0 ? 'doigt' : 'clavier');
    await expect(page.locator('[data-plateau="pave-calcul"]')).toBeVisible();
    tientALEcran(await mesurerEcranCalcul(page), 'gué, pavé');
    for (let i = 0; i < 7; i += 1) await jouerEtape(page, i % 2 === 0 ? 'clavier' : 'doigt');
    await expect(page.locator('[data-calcul-reussite]')).toBeVisible();
    await expect(page.locator('[data-calcul-reussite]')).toHaveAttribute('data-etoiles', '3');
    tientALEcran(await mesurerEcranCalcul(page), 'gué, réussite');

    // ── La pierre à calcul : une erreur, qui ne coûte qu'une étoile et n'affiche aucun échec ──
    await page.locator('[data-vers="vallee"]').click();
    await page.locator('[data-calcul-entree="pose"]').click();
    await expect(page.locator('[data-calcul="pose"]')).toBeVisible();
    const premiere = await reponseCourante(page);
    await page.locator(`[data-chiffre="${String((premiere.chiffres[0]! + 1) % 10)}"]`).tap();
    await expect(page.locator('[data-retour-calcul="pas-encore"]')).toBeVisible();
    await expect(page.locator('[data-case="resultat-u"]')).toHaveAttribute('data-remplie', 'non');
    await jouerEtape(page, 'doigt');
    await jouerEtape(page, 'clavier');
    // Troisième addition : les unités, puis la retenue s'écrit toute seule et Gobi la montre.
    const troisieme = await reponseCourante(page);
    await page.keyboard.press(`Digit${String(troisieme.chiffres[0])}`);
    await expect(page.locator('[data-retenue-montree="oui"] [data-case="retenue-d"]')).toHaveText('1');
    tientALEcran(await mesurerEcranCalcul(page), 'pierre, retenue montrée');
    await page.locator(`[data-chiffre="${String(troisieme.chiffres[1])}"]`).tap();
    await jouerEtape(page, 'doigt');
    await expect(page.locator('[data-calcul-reussite]')).toHaveAttribute('data-etoiles', '2');
    tientALEcran(await mesurerEcranCalcul(page), 'pierre, réussite');
  });
}
